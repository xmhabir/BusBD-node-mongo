const TripSchedule = require('../models/TripSchedule');
const mongoose = require('mongoose');

/**
 * Atomically lock a seat - prevents double-booking race conditions
 * Uses $elemMatch to find and update only if seat is 'available'
 */
async function atomicLockSeat(tripId, seatNumber, userId) {
    // Check if already locked by THIS user - if so, it's a success (idempotent)
    const existingLock = await TripSchedule.findOne({
        _id: tripId,
        seats: {
            $elemMatch: {
                seatNumber: seatNumber,
                status: 'locked',
                lockedBy: getUserIdQuery(userId)
            }
        }
    });

    if (existingLock) {
        return {
            success: true,
            trip: existingLock
        };
    }

    const result = await TripSchedule.findOneAndUpdate(
        {
            _id: tripId,
            seats: {
                $elemMatch: {
                    seatNumber: seatNumber,
                    status: 'available'
                }
            }
        },
        {
            $set: {
                'seats.$.status': 'locked',
                'seats.$.lockedBy': userId,
                'seats.$.lockedAt': new Date()
            },
            $inc: { availableSeats: -1 }
        },
        { new: true, runValidators: true }
    );

    return {
        success: result !== null,
        trip: result
    };
}

// Helper to safely get ID queries
const getUserIdQuery = (userId) => {
    const queries = [userId];
    if (mongoose.Types.ObjectId.isValid(userId)) {
        queries.push(new mongoose.Types.ObjectId(userId));
        queries.push(userId.toString());
    }
    return { $in: queries };
};

/**
 * Atomically unlock a seat - only the user who locked it can unlock
 */
async function atomicUnlockSeat(tripId, seatNumber, userId) {
    const result = await TripSchedule.findOneAndUpdate(
        {
            _id: tripId,
            seats: {
                $elemMatch: {
                    seatNumber: seatNumber,
                    status: 'locked',
                    lockedBy: getUserIdQuery(userId)
                }
            }
        },
        {
            $set: {
                'seats.$.status': 'available',
                'seats.$.lockedBy': null,
                'seats.$.lockedAt': null
            },
            $inc: { availableSeats: 1 }
        },
        { new: true }
    );

    return {
        success: result !== null,
        trip: result
    };
}

/**
 * Atomically book a seat - only if currently locked by this user
 */
async function atomicBookSeat(tripId, seatNumber, userId, bookingId, details = {}) {
    const { status = 'booked', soldBy = null, expiry = null } = details;

    const result = await TripSchedule.findOneAndUpdate(
        {
            _id: tripId,
            seats: {
                $elemMatch: {
                    seatNumber: seatNumber,
                    $or: [
                        { status: 'locked', lockedBy: getUserIdQuery(userId) },
                        { status: 'available' },
                        { status: 'booked', bookedBy: getUserIdQuery(userId) }
                    ]
                }
            }
        },
        {
            $set: {
                'seats.$.status': status,
                'seats.$.bookedBy': userId,
                'seats.$.bookingId': bookingId,
                'seats.$.soldBy': soldBy,
                'seats.$.bookingExpiry': expiry
            }
        },
        { new: true }
    );

    return {
        success: result !== null,
        trip: result
    };
}

/**
 * Force unlock a seat (Admin only) - bypass user check
 */
async function forceUnlockSeat(tripId, seatNumber) {
    const result = await TripSchedule.findOneAndUpdate(
        {
            _id: tripId,
            'seats.seatNumber': seatNumber,
            'seats.status': { $in: ['locked'] }
        },
        {
            $set: {
                'seats.$.status': 'available',
                'seats.$.lockedBy': null,
                'seats.$.lockedAt': null
            },
            $inc: { availableSeats: 1 }
        },
        { new: true }
    );

    return {
        success: result !== null,
        trip: result
    };
}

/**
 * Get seat status for a trip
 */
async function getSeatStatus(tripId) {
    const trip = await TripSchedule.findById(tripId)
        .select('seats availableSeats totalSeats')
        .lean();

    if (!trip) return null;

    return {
        totalSeats: trip.totalSeats,
        availableSeats: trip.availableSeats,
        seats: trip.seats.map(seat => ({
            seatNumber: seat.seatNumber,
            status: seat.status,
            isLocked: seat.status === 'locked',
            isBooked: seat.status === 'booked'
        }))
    };
}

/**
 * Release expired locks (cleanup job)
 */
async function releaseExpiredLocks(expiryMinutes = 10) {
    const now = new Date();
    const lockExpiryTime = new Date(now.getTime() - expiryMinutes * 60 * 1000);

    // Release locks
    const lockResult = await TripSchedule.updateMany(
        {
            'seats.status': 'locked',
            'seats.lockedAt': { $lt: lockExpiryTime }
        },
        {
            $set: {
                'seats.$[elem].status': 'available',
                'seats.$[elem].lockedBy': null,
                'seats.$[elem].lockedAt': null,
                'seats.$[elem].bookingId': null
            }
        },
        {
            arrayFilters: [
                { 'elem.status': 'locked', 'elem.lockedAt': { $lt: lockExpiryTime } }
            ]
        }
    );

    // Release expired bookings (reserved seats)
    const bookingResult = await TripSchedule.updateMany(
        {
            'seats.status': 'booked',
            'seats.bookingExpiry': { $lt: now, $ne: null }
        },
        {
            $set: {
                'seats.$[elem].status': 'available',
                'seats.$[elem].bookedBy': null,
                'seats.$[elem].bookingId': null,
                'seats.$[elem].bookingExpiry': null
            }
        },
        {
            arrayFilters: [
                { 'elem.status': 'booked', 'elem.bookingExpiry': { $lt: now, $ne: null } }
            ]
        }
    );

    return (lockResult.modifiedCount || 0) + (bookingResult.modifiedCount || 0);
}

/**
 * Atomically release a booked/sold seat (For cancellations)
 */
async function atomicReleaseSeat(tripId, seatNumber) {
    const result = await TripSchedule.findOneAndUpdate(
        {
            _id: tripId,
            seats: {
                $elemMatch: {
                    seatNumber: seatNumber,
                    status: { $in: ['booked', 'sold', 'locked'] }
                }
            }
        },
        {
            $set: {
                'seats.$.status': 'available',
                'seats.$.lockedBy': null,
                'seats.$.lockedAt': null,
                'seats.$.bookedBy': null,
                'seats.$.bookingId': null,
                'seats.$.soldBy': null,
                'seats.$.bookingExpiry': null
            },
            $inc: { availableSeats: 1 }
        },
        { new: true }
    );

    return {
        success: result !== null,
        trip: result
    };
}

module.exports = {
    atomicLockSeat,
    atomicUnlockSeat,
    atomicBookSeat,
    forceUnlockSeat,
    getSeatStatus,
    releaseExpiredLocks,
    atomicReleaseSeat
};
