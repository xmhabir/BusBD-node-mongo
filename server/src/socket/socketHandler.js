const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { lockSeatInRedis, unlockSeatInRedis, extendLock, LOCK_TTL_SECONDS } = require('../services/redisService');
const { atomicLockSeat, atomicUnlockSeat, releaseExpiredLocks } = require('../services/seatService');

function initializeSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware (Optional Auth)
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            const guestId = socket.handshake.auth.guestId;

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
            } else if (guestId) {
                // Guest session
                socket.user = {
                    id: guestId,
                    role: 'guest',
                    name: 'Guest User'
                };
            }

            // Allow connection even without token (Guest mode)
            next();
        } catch (err) {
            // Even if token is invalid, let them connect as guest? 
            // Or fail? Better to fail if they TRIED to send a token but it's bad.
            // But for simplicity/robustness, let's treat invalid token as guest.
            console.warn('Socket auth failed, proceeding as guest:', err.message);
            next();
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.user ? socket.user.id : 'Guest'} (${socket.id})`);

        // Join a trip room to receive updates
        socket.on('join_trip', (tripId) => {
            socket.join(`trip:${tripId}`);
            console.log(`👤 User ${socket.user ? socket.user.id : 'Guest'} joined trip:${tripId}`);
        });

        // Leave a trip room
        socket.on('leave_trip', (tripId) => {
            socket.leave(`trip:${tripId}`);
            console.log(`👤 User ${socket.user ? socket.user.id : 'Guest'} left trip:${tripId}`);
        });

        // CLIENT SELECT SEAT - Main seat locking flow
        socket.on('client_select_seat', async ({ tripId, seatNumber }) => {
            console.log(`Select request: Seat ${seatNumber}, Trip ${tripId}, User ${socket.user?.id}`);
            if (!socket.user) {
                socket.emit('seat_lock_failed', {
                    seatNumber,
                    reason: 'Connection error: Identity missing',
                    code: 'IDENTITY_MISSING'
                });
                return;
            }
            const userId = socket.user.id;

            try {
                // Step 1: Try Redis lock first (fast cache layer)
                const redisLocked = await lockSeatInRedis(tripId, seatNumber, userId);

                if (!redisLocked) {
                    socket.emit('seat_lock_failed', {
                        seatNumber,
                        reason: 'Seat is currently being selected by another user',
                        code: 'ALREADY_LOCKED'
                    });
                    return;
                }

                // Step 2: Atomic MongoDB update (persistence layer)
                const { success: dbLocked } = await atomicLockSeat(tripId, seatNumber, userId);

                if (!dbLocked) {
                    // Rollback Redis lock
                    await unlockSeatInRedis(tripId, seatNumber, userId);

                    socket.emit('seat_lock_failed', {
                        seatNumber,
                        reason: 'Seat is no longer available',
                        code: 'NOT_AVAILABLE'
                    });
                    return;
                }

                // Step 3: Broadcast to all clients in trip room
                io.to(`trip:${tripId}`).emit('seat_locked', {
                    seatNumber,
                    lockedBy: userId,
                    expiresAt: Date.now() + (LOCK_TTL_SECONDS * 1000),
                    expiresIn: LOCK_TTL_SECONDS
                });

                // Confirm to the user who locked
                socket.emit('seat_lock_success', {
                    seatNumber,
                    expiresIn: LOCK_TTL_SECONDS,
                    message: `Seat ${seatNumber} locked for 30 seconds`
                });

                console.log(`🔒 Seat ${seatNumber} locked by user ${userId} on trip ${tripId}`);

            } catch (error) {
                console.error('Seat lock error:', error);
                socket.emit('seat_lock_failed', {
                    seatNumber,
                    reason: 'Server error occurred',
                    code: 'SERVER_ERROR'
                });
            }
        });

        // CLIENT RELEASE SEAT
        socket.on('client_release_seat', async ({ tripId, seatNumber }) => {
            console.log(`Checking release for seat ${seatNumber} on trip ${tripId}. Socket User:`, socket.user?.id);
            if (!socket.user) return; // Just ignore if guest tries to release
            const userId = socket.user.id;

            try {
                // Unlock in Redis
                const redisRes = await unlockSeatInRedis(tripId, seatNumber, userId);
                console.log(`Redis unlock result for ${seatNumber}:`, redisRes);

                // Unlock in MongoDB
                const dbRes = await atomicUnlockSeat(tripId, seatNumber, userId);
                console.log(`DB unlock result for ${seatNumber}:`, dbRes.success);

                if (!dbRes.success) {
                    console.warn(`Failed to unlock in DB. Locked by match? TripId match?`);
                    // Do NOT broadcast if we didn't unlock anything
                    return;
                }

                // Broadcast to all clients
                io.to(`trip:${tripId}`).emit('seat_unlocked', {
                    seatNumber,
                    releasedBy: userId
                });

                socket.emit('seat_release_success', { seatNumber });

                console.log(`🔓 Seat ${seatNumber} released by user ${userId} on trip ${tripId}`);

            } catch (error) {
                console.error('Seat release error:', error);
                socket.emit('seat_release_failed', {
                    seatNumber,
                    reason: 'Failed to release seat'
                });
            }
        });

        // EXTEND LOCK - Keep seat locked while user is still active
        socket.on('extend_lock', async ({ tripId, seatNumber }) => {
            if (!socket.user) return;
            const userId = socket.user.id;

            try {
                const extended = await extendLock(tripId, seatNumber, userId);

                if (extended) {
                    socket.emit('lock_extended', {
                        seatNumber,
                        expiresIn: LOCK_TTL_SECONDS
                    });
                } else {
                    socket.emit('lock_extend_failed', {
                        seatNumber,
                        reason: 'Lock not found or not owned by you'
                    });
                }
            } catch (error) {
                console.error('Lock extend error:', error);
            }
        });

        // SEAT BOOKED - Notify all users when booking is confirmed
        socket.on('seat_booked', ({ tripId, seatNumbers, status = 'booked' }) => {
            io.to(`trip:${tripId}`).emit('seats_booked', {
                seatNumbers,
                status,
                bookedBy: socket.user ? socket.user.id : 'system'
            });
        });

        // Disconnect handling
        socket.on('disconnect', (reason) => {
            console.log(`🔌 User disconnected: ${socket.user ? socket.user.id : 'Guest'} (${reason})`);
        });

        // Error handling
        socket.on('error', (error) => {
            console.error(`Socket error for user ${socket.user ? socket.user.id : 'Guest'}:`, error);
        });
    });

    // Background Cleanup Job: Every 10 seconds, clear locks older than 30 seconds
    setInterval(async () => {
        try {
            // expiryMinutes = 30 / 60 = 0.5
            const releasedTrips = await releaseExpiredLocks(0.5);

            for (const { tripId, seatNumbers } of releasedTrips) {
                console.log(`🧹 Cleanup: Released ${seatNumbers.length} seats on trip ${tripId}`);

                // Notify everyone in this trip room about the unlocked seats
                seatNumbers.forEach(seatNumber => {
                    io.to(`trip:${tripId}`).emit('seat_unlocked', {
                        seatNumber,
                        releasedBy: 'system' // System cleanup
                    });
                });

                // Also trigger a global refresh for this specific trip
                io.to(`trip:${tripId}`).emit('seats_updated', { tripId });
            }
        } catch (error) {
            console.error('Cleanup job error:', error);
        }
    }, 10000);

    return io;
}

module.exports = { initializeSocket };
