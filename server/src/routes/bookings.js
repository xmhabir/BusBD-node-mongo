const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const TripSchedule = require('../models/TripSchedule');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { atomicBookSeat, atomicUnlockSeat } = require('../services/seatService');
const { unlockSeatInRedis } = require('../services/redisService');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation Errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', optionalAuth, [
    body('tripId').isMongoId(),
    body('seats').isArray({ min: 1 }),
    // body('passengers').isArray({ min: 1 }), // Make optional to allow auto-generation
    body('contactInfo.name').trim().notEmpty(),
    // body('contactInfo.email').isEmail(), // Optional email handling moved to logic
    body('contactInfo.phone').trim().notEmpty()
], validate, async (req, res) => {
    try {
        const { tripId, seats, passengers, contactInfo, boardingPoint, droppingPoint, pickupPlace, type, expiry, address, goodsFare, discount } = req.body;
        const userId = req.user ? req.user._id : null;

        console.log(`Booking Request: Trip ${tripId}, User ${userId}, Seats ${seats}, Type ${type}`);

        // Get trip details
        const trip = await TripSchedule.findById(tripId).populate('operator');
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Calculate pricing
        // Assuming fare is per seat
        let baseFarePerSeat = trip.fare.base || 0;

        // Dynamic Pricing logic based on stops
        if (boardingPoint || droppingPoint) {
            const stops = trip.route.stops || [];
            let bFare = 0;
            let dFare = trip.fare.base;

            if (boardingPoint && boardingPoint !== trip.route.origin) {
                const stop = stops.find(s => s.name === boardingPoint);
                if (stop) bFare = stop.fare || 0;
            }

            if (droppingPoint && droppingPoint !== trip.route.destination) {
                const stop = stops.find(s => s.name === droppingPoint);
                if (stop) dFare = stop.fare || trip.fare.base;
            }

            const calculatedFare = Math.abs(dFare - bFare);
            if (calculatedFare > 0) {
                baseFarePerSeat = calculatedFare;
            }
        }

        const taxPerSeat = trip.fare.tax || 0;
        const discountPerSeat = trip.fare.discount || 0;

        const baseFareTotal = baseFarePerSeat * seats.length;
        const taxTotal = taxPerSeat * seats.length;
        const discountTotal = discountPerSeat * seats.length;

        // Service fee: 5% of base fare (example logic)
        const serviceFee = Math.round(baseFareTotal * 0.05);

        const totalAmount = baseFareTotal + taxTotal - (discount || discountTotal) + serviceFee + (Number(goodsFare) || 0);

        const pricing = {
            baseFare: baseFareTotal,
            tax: taxTotal,
            discount: discount || discountTotal,
            serviceFee: serviceFee,
            goodsFare: Number(goodsFare) || 0
        };

        // Generate booking ID
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingId = `BUS${dateStr}${random}`;

        // Initialize booking data
        const bookingData = {
            bookingId,
            tripSchedule: tripId,
            operator: trip.operator._id,
            seats: seats,
            totalAmount,
            pricing,
            contactInfo: {
                name: contactInfo.name,
                phone: contactInfo.phone,
                email: contactInfo.email || contactInfo.email || `guest-${contactInfo.phone}@example.com`,
                address: address || contactInfo.address || ''
            },
            passengers: (passengers && passengers.length > 0) ? passengers : seats.map(s => ({
                name: contactInfo.name,
                seatNumber: s
            })),
            boardingPoint,
            droppingPoint,
            pickupPlace,
            status: type === 'sell' ? 'confirmed' : 'reserved',
            payment: { method: 'cash', status: type === 'sell' ? 'completed' : 'pending' },
            expiresAt: type === 'sell' ? null : (expiry ? new Date(expiry) : new Date(Date.now() + 30 * 60 * 1000))
        };

        if (userId) {
            bookingData.user = userId;
        }

        // Create booking
        let booking = await Booking.create(bookingData);

        // Book each seat atomically
        const bookedSeats = [];
        for (const seatNum of seats) {
            const seatUpdateDetails = {
                status: type === 'sell' ? 'sold' : 'booked',
                bookedBy: userId,
                soldBy: type === 'sell' ? userId : null,
                expiry: bookingData.expiresAt
            };

            const seatUpdate = await atomicBookSeat(
                trip._id,
                seatNum,
                userId,
                booking._id,
                seatUpdateDetails
            );

            if (!seatUpdate.success) {
                // Rollback - delete booking and release previously booked seats
                await Booking.findByIdAndDelete(booking._id);

                // Release already booked seats
                for (const previouslyBookedSeat of bookedSeats) {
                    await atomicUnlockSeat(tripId, previouslyBookedSeat, userId);
                }

                return res.status(409).json({
                    success: false,
                    message: `Failed to book seat ${seatNum}. It may no longer be available.`
                });
            }

            bookedSeats.push(seatNum);
            // Clear Redis lock (if any was set by a prior selection process)
            // Note: redisService unlockSeatInRedis expects (tripId, seatNumber, userId)
            await unlockSeatInRedis(tripId, seatNum, userId);
        }

        // Broadcast booking via socket
        if (req.io) {
            req.io.to(`trip:${tripId}`).emit('seats_booked', { seatNumbers: seats });
        }

        res.status(201).json({
            success: true,
            message: type === 'sell' ? 'Seats sold successfully' : 'Booking created successfully',
            data: {
                booking
            }
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking: ' + error.message });
    }
});

/**
 * GET /api/bookings
 * Get user's bookings
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = { user: req.user._id };
        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .populate({
                path: 'tripSchedule',
                select: 'route departureTime arrivalTime',
                populate: { path: 'operator', select: 'name logo' }
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Booking.countDocuments(query);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get bookings' });
    }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id
        })
            .populate({
                path: 'tripSchedule',
                populate: [
                    { path: 'bus', select: 'busType registrationNumber amenities' },
                    { path: 'operator', select: 'name logo contact' }
                ]
            })
            .lean();

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, data: { booking } });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to get booking' });
    }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
    try {
        const { reason } = req.body;

        const query = {
            _id: req.params.id,
            status: { $in: ['pending', 'confirmed'] }
        };

        // If not admin, restrict to own bookings
        const isAdmin = ['super-admin', 'operator-admin'].includes(req.user.role);
        if (!isAdmin) {
            query.user = req.user._id;
        }

        const booking = await Booking.findOne(query);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found or cannot be cancelled' });
        }

        // Update booking status
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancelReason = reason;
        await booking.save();

        // Release seats in trip
        for (const seatNumber of booking.seats) {
            await TripSchedule.updateOne(
                { _id: booking.tripSchedule, 'seats.seatNumber': seatNumber },
                {
                    $set: {
                        'seats.$.status': 'available',
                        'seats.$.bookedBy': null,
                        'seats.$.bookingId': null
                    },
                    $inc: { availableSeats: 1 }
                }
            );

            // Broadcast via socket
            if (req.io) {
                req.io.to(`trip:${booking.tripSchedule}`).emit('seat_unlocked', {
                    seatNumber,
                    forcedBy: 'admin_cancel'
                });
            }
        }

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: { booking }
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel booking' });
    }
});

module.exports = router;
