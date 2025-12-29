const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { forceDeleteLock, getAllTripLocks, clearTripLocks, redis } = require('../services/redisService');
const { forceUnlockSeat, releaseExpiredLocks, atomicBookSeat, atomicUnlockSeat, atomicReleaseSeat } = require('../services/seatService');
const {
    getMonthlyRevenueByOperator,
    getDashboardStats,
    getRevenueByDateRange,
    getPopularRoutes,
    getBookingTrends
} = require('../services/analyticsService');
const User = require('../models/User');
const Operator = require('../models/Operator');
const Booking = require('../models/Booking');
const TripSchedule = require('../models/TripSchedule');

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await getDashboardStats();
        const revenueByOperator = await getMonthlyRevenueByOperator();
        const popularRoutes = await getPopularRoutes(5);

        res.json({
            success: true,
            data: {
                stats,
                revenueByOperator,
                popularRoutes
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load dashboard' });
    }
});

/**
 * GET /api/admin/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', async (req, res) => {
    try {
        const { startDate, endDate, operatorId } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();

        const [dailyRevenue, operatorRevenue] = await Promise.all([
            getRevenueByDateRange(start, end, operatorId),
            getMonthlyRevenueByOperator()
        ]);

        res.json({
            success: true,
            data: { dailyRevenue, operatorRevenue }
        });
    } catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get revenue data' });
    }
});

/**
 * GET /api/admin/analytics/trends
 * Get booking trends
 */
router.get('/analytics/trends', async (req, res) => {
    try {
        const [hourlyTrends, popularRoutes] = await Promise.all([
            getBookingTrends(),
            getPopularRoutes(10)
        ]);

        res.json({
            success: true,
            data: { hourlyTrends, popularRoutes }
        });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ success: false, message: 'Failed to get trends' });
    }
});

/**
 * POST /api/admin/force-unlock
 * Force unlock a seat (bypass user check)
 */
router.post('/force-unlock', async (req, res) => {
    try {
        const { tripId, seatNumber } = req.body;

        if (!tripId || !seatNumber) {
            return res.status(400).json({
                success: false,
                message: 'tripId and seatNumber are required'
            });
        }

        // Remove Redis lock
        await forceDeleteLock(tripId, seatNumber);

        // Update MongoDB
        const { success } = await forceUnlockSeat(tripId, seatNumber);

        // Broadcast via socket
        if (req.io) {
            req.io.to(`trip:${tripId}`).emit('seat_unlocked', {
                seatNumber,
                forcedBy: 'admin',
                adminId: req.user._id
            });
        }

        res.json({
            success: true,
            message: `Seat ${seatNumber} force unlocked`,
            dbUpdated: success
        });
    } catch (error) {
        console.error('Force unlock error:', error);
        res.status(500).json({ success: false, message: 'Failed to force unlock' });
    }
});

/**
 * GET /api/admin/locks/:tripId
 * Get all locks for a trip
 */
router.get('/locks/:tripId', async (req, res) => {
    try {
        const locks = await getAllTripLocks(req.params.tripId);

        res.json({
            success: true,
            data: {
                tripId: req.params.tripId,
                locks,
                count: locks.length
            }
        });
    } catch (error) {
        console.error('Get locks error:', error);
        res.status(500).json({ success: false, message: 'Failed to get locks' });
    }
});

/**
 * DELETE /api/admin/locks/:tripId
 * Clear all locks for a trip
 */
router.delete('/locks/:tripId', async (req, res) => {
    try {
        const cleared = await clearTripLocks(req.params.tripId);

        res.json({
            success: true,
            message: `Cleared ${cleared} locks for trip`,
            clearedCount: cleared
        });
    } catch (error) {
        console.error('Clear locks error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear locks' });
    }
});

/**
 * POST /api/admin/cleanup-locks
 * Release expired locks across all trips
 */
router.post('/cleanup-locks', async (req, res) => {
    try {
        const { expiryMinutes = 10 } = req.body;
        const released = await releaseExpiredLocks(expiryMinutes);

        res.json({
            success: true,
            message: `Released ${released} expired locks`,
            releasedCount: released
        });
    } catch (error) {
        console.error('Cleanup locks error:', error);
        res.status(500).json({ success: false, message: 'Failed to cleanup locks' });
    }
});

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;

        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
});

/**
 * GET /api/admin/operators
 * List all operators
 */
router.get('/operators', async (req, res) => {
    try {
        const operators = await Operator.find()
            .sort({ name: 1 })
            .lean();

        res.json({ success: true, data: { operators } });
    } catch (error) {
        console.error('Get operators error:', error);
        res.status(500).json({ success: false, message: 'Failed to get operators' });
    }
});

/**
 * GET /api/admin/schedules
 * Get all trip schedules
 */
router.get('/schedules', async (req, res) => {
    try {
        const { page = 1, limit = 50, date, origin, destination, coachNumber } = req.query;

        const query = {};
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            query.departureTime = { $gte: searchDate, $lt: nextDay };
        }
        if (origin) query['route.origin'] = { $regex: origin, $options: 'i' };
        if (destination) query['route.destination'] = { $regex: destination, $options: 'i' };

        if (coachNumber) {
            // Find buses validation matching the coach number (registration number)
            const buses = await require('../models/Bus').find({
                registrationNumber: { $regex: coachNumber, $options: 'i' }
            }).select('_id');
            const busIds = buses.map(b => b._id);
            query.bus = { $in: busIds };
        }

        const schedules = await TripSchedule.find(query)
            .populate('bus', 'busType amenities registrationNumber busNumber seatLayout')
            .populate('operator', 'name')
            .sort({ departureTime: 1 }) // Closest trips first
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        const total = await TripSchedule.countDocuments(query);

        res.json({
            success: true,
            data: {
                schedules,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ success: false, message: 'Failed to get schedules' });
    }
});

/**
 * GET /api/admin/sales
 * Get all sales/bookings with detailed info
 */
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate, userId, operatorId, tripId, page = 1, limit = 50 } = req.query;

        const query = {};

        // Trip filter
        if (tripId) query.tripSchedule = tripId;

        // Date filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // User filter
        if (userId) query.user = userId;

        // Operator filter
        if (operatorId) query.operator = operatorId;

        // Valid status only? Or all? Usually sales report includes valid sales.
        // Let's include everything but maybe filter out 'pending' if they are old/abandoned?
        // For now, return all to give full visibility, or filter by status if requested.
        // If query.status is passed, use it, otherwise default to "completed/confirmed" usually?
        // User asked for "sell", implying successful transactions.
        // Let's default to confirmed/completed if no status specified, to show actual revenue.
        // query.status = { $in: ['confirmed', 'completed'] }; 
        // Actually, let's allow filtering or show all if specifically asked.
        if (req.query.status) {
            query.status = req.query.status;
        } else {
            // Default to showing actual sales (confirmed/completed) + cancelled (for records)
            query.status = { $in: ['confirmed', 'completed', 'cancelled'] };
        }

        const bookings = await Booking.find(query)
            .populate('user', 'name email phone')
            .populate({
                path: 'tripSchedule',
                select: 'route departureTime',
                populate: { path: 'bus', select: 'busType registrationNumber' }
            })
            .populate('operator', 'name')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            data: {
                sales: bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ success: false, message: 'Failed to get sales report' });
    }
});

/**
 * GET /api/admin/bookings/:id
 * Get single booking details
 */
router.get('/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate({
                path: 'tripSchedule',
                select: 'route departureTime',
                populate: { path: 'bus', select: 'busType registrationNumber' }
            })
            .populate('operator', 'name')
            .lean();

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({
            success: true,
            data: { booking }
        });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to get booking details' });
    }
});

/**
     * PUT /api/admin/bookings/:id
     * Update booking details (Contact Info)
     */
router.put('/bookings/:id', async (req, res) => {
    try {
        const { contactInfo, boardingPoint, droppingPoint, pickupPlace } = req.body;

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    'contactInfo.name': contactInfo.name,
                    'contactInfo.phone': contactInfo.phone,
                    'contactInfo.email': contactInfo.email,
                    'contactInfo.address': contactInfo.address,
                    boardingPoint,
                    droppingPoint,
                    pickupPlace
                }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({
            success: true,
            data: { booking },
            message: 'Booking updated successfully'
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to update booking' });
    }
});

/**
 * POST /api/admin/bookings/manage
 * Manage existing booking (Partial Cancel, Convert to Sale, specific seat actions)
 */
router.post('/bookings/manage', async (req, res) => {
    try {
        const { action, bookingId, seatNumbers } = req.body; // seatNumbers is array of seats to act on
        const userId = req.user._id;

        if (!['cancel', 'sell'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const booking = await Booking.findById(bookingId).populate('tripSchedule');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const trip = await TripSchedule.findById(booking.tripSchedule._id);
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Validate seats belong to this booking
        const invalidSeats = seatNumbers.filter(s => !booking.seats.includes(s));
        if (invalidSeats.length > 0) {
            return res.status(400).json({ success: false, message: `Seats ${invalidSeats.join(', ')} do not belong to this booking` });
        }

        const isFullAction = booking.seats.length === seatNumbers.length;

        // ACTION: SELL (Convert to Confirmed)
        if (action === 'sell') {
            if (isFullAction) {
                // Simple Update
                booking.status = 'confirmed';
                booking.payment.status = 'completed';
                booking.payment.method = 'cash'; // Default for admin sell
                booking.expiresAt = null; // Clear expiry
                await booking.save();

                // Update Seat Statuses
                for (const seatNum of seatNumbers) {
                    await atomicBookSeat(trip._id, seatNum, userId, booking._id, {
                        status: 'sold',
                        bookedBy: booking.user,
                        soldBy: userId,
                        expiry: null
                    });
                }
            } else {
                // SPLIT BOOKING
                // 1. Create New Booking for Sold Seats
                // Calculate Pro-rated Price
                const seatCount = seatNumbers.length;
                const baseFare = trip.fare.base * seatCount;
                const tax = trip.fare.tax * seatCount;
                const serviceFee = Math.round(baseFare * 0.05);
                const totalAmount = baseFare + tax + serviceFee;

                // Generate new Booking ID manually to satisfy required validator
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newBookingId = `BUS${dateStr}${random}`;

                const newBookingData = {
                    ...booking.toObject(),
                    _id: undefined, // New ID
                    bookingId: newBookingId,
                    seats: seatNumbers,
                    status: 'confirmed',
                    payment: { method: 'cash', status: 'completed' },
                    expiresAt: null,
                    totalAmount,
                    pricing: {
                        baseFare, tax, serviceFee, discount: 0
                    },
                    createdAt: undefined, updatedAt: undefined,
                    __v: undefined
                };

                // Allow mongoose to generate bookingId via pre-save
                const newBooking = await Booking.create(newBookingData);

                // 2. Update Old Booking (Remove Seats)
                const remainingSeats = booking.seats.filter(s => !seatNumbers.includes(s));
                const remainingCount = remainingSeats.length;

                if (remainingCount === 0) {
                    // Should have been caught by isFullAction, but just in case
                    await Booking.findByIdAndDelete(booking._id);
                } else {
                    booking.seats = remainingSeats;
                    // Update Price
                    booking.pricing.baseFare = trip.fare.base * remainingCount;
                    booking.pricing.tax = trip.fare.tax * remainingCount;
                    booking.pricing.serviceFee = Math.round(booking.pricing.baseFare * 0.05);
                    booking.totalAmount = booking.pricing.baseFare + booking.pricing.tax + booking.pricing.serviceFee;
                    await booking.save();
                }

                // 3. Update Seat Statuses to point to NEW booking
                for (const seatNum of seatNumbers) {
                    await atomicBookSeat(trip._id, seatNum, userId, newBooking._id, {
                        status: 'sold',
                        bookedBy: booking.user,
                        soldBy: userId,
                        expiry: null
                    });
                }
            }
        }
        // ACTION: CANCEL (Release)
        else if (action === 'cancel') {
            if (trip.waybill && trip.waybill.isGenerated) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot cancel seats after waybill has been issued. Bus is on the way.'
                });
            }
            // specific logic needed here: 
            // atomicUnlockSeat actually releases it to "available". 

            // Update Seat Statuses (Release)
            for (const seatNum of seatNumbers) {
                await atomicReleaseSeat(trip._id, seatNum); // Admin release
            }

            if (isFullAction) {
                await Booking.findByIdAndDelete(booking._id);
            } else {
                // Update Old Booking (Remove Seats)
                const remainingSeats = booking.seats.filter(s => !seatNumbers.includes(s));
                booking.seats = remainingSeats;
                // Update Price
                const remainingCount = remainingSeats.length;
                booking.pricing.baseFare = trip.fare.base * remainingCount;
                booking.pricing.tax = trip.fare.tax * remainingCount;
                booking.pricing.serviceFee = Math.round(booking.pricing.baseFare * 0.05);
                booking.totalAmount = booking.pricing.baseFare + booking.pricing.tax + booking.pricing.serviceFee;
                await booking.save();
            }
        }

        // Notify socket
        if (req.io) {
            req.io.to(`trip:${trip._id}`).emit('seats_updated', { tripId: trip._id });
            // Better to emit specific event, but polling/refresh logic might rely on this
        }

        res.json({
            success: true,
            message: 'Booking updated successfully',
            data: {
                booking: action === 'sell' && !isFullAction ? newBooking : booking
            }
        });

    } catch (error) {
        console.error('Manage booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to manage booking: ' + error.message });
    }
});

/**
 * GET /api/admin/metrics
 * Get internal metrics (for Caddy exposure)
 */
router.get('/metrics', async (req, res) => {
    try {
        const [userCount, bookingCount, tripCount, redisInfo] = await Promise.all([
            User.countDocuments(),
            Booking.countDocuments(),
            TripSchedule.countDocuments(),
            redis.info('stats')
        ]);

        res.json({
            success: true,
            data: {
                users: userCount,
                bookings: bookingCount,
                trips: tripCount,
                redis: redisInfo,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        });
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get metrics' });
    }
});

/**
 * POST /api/admin/schedules/:id/waybill
 * Issue waybill for a trip
 */
router.post('/schedules/:id/waybill', async (req, res) => {
    try {
        const { driver, supervisor, helper, busNumber } = req.body;

        const trip = await TripSchedule.findById(req.params.id);
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        trip.waybill = {
            staff: { driver, supervisor, helper, busNumber },
            isGenerated: true,
            issuedAt: new Date()
        };

        await trip.save();

        if (req.io) {
            req.io.to(`trip:${trip._id}`).emit('waybill_generated', {
                tripId: trip._id,
                staff: trip.waybill.staff
            });
        }

        res.json({ success: true, message: 'Waybill generated successfully', data: { waybill: trip.waybill } });
    } catch (error) {
        console.error('Waybill error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate waybill' });
    }
});

module.exports = router;
