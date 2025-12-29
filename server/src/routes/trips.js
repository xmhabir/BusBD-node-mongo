const express = require('express');
const router = express.Router();
const TripSchedule = require('../models/TripSchedule');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { getSeatStatus } = require('../services/seatService');
const { getAllTripLocks } = require('../services/redisService');

/**
 * GET /api/trips/search
 * Search for trips
 */
router.get('/search', async (req, res) => {
    try {
        const { origin, destination, date, passengers = 1 } = req.query;

        if (!origin || !destination || !date) {
            return res.status(400).json({
                success: false,
                message: 'Origin, destination, and date are required'
            });
        }

        const searchDate = new Date(date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const trips = await TripSchedule.find({
            'route.origin': { $regex: new RegExp(origin, 'i') },
            'route.destination': { $regex: new RegExp(destination, 'i') },
            departureTime: { $gte: searchDate, $lt: nextDay },
            status: 'scheduled',
            availableSeats: { $gte: parseInt(passengers) }
        })
            .populate('bus', 'busType amenities totalSeats')
            .populate('operator', 'name logo rating')
            .sort({ departureTime: 1 })
            .lean();

        res.json({
            success: true,
            data: {
                trips,
                count: trips.length
            }
        });
    } catch (error) {
        console.error('Trip search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search trips'
        });
    }
});

/**
 * GET /api/trips/:id
 * Get single trip details
 */
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const trip = await TripSchedule.findById(req.params.id)
            .populate('bus', 'busType amenities seatLayout totalSeats images')
            .populate('operator', 'name logo rating contact')
            .lean();

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        // Get real-time lock status from Redis
        const redisLocks = await getAllTripLocks(req.params.id);

        // Enhance seat data with real-time lock info
        const enhancedSeats = trip.seats.map(seat => {
            const redisLock = redisLocks.find(l => l.seatNumber === seat.seatNumber);
            return {
                ...seat,
                isLockedInRealtime: !!redisLock,
                lockTTL: redisLock?.ttl || null
            };
        });

        res.json({
            success: true,
            data: {
                trip: { ...trip, seats: enhancedSeats }
            }
        });
    } catch (error) {
        console.error('Get trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trip details'
        });
    }
});

/**
 * GET /api/trips/:id/seats
 * Get seat availability for a trip
 */
router.get('/:id/seats', async (req, res) => {
    try {
        const seatStatus = await getSeatStatus(req.params.id);

        if (!seatStatus) {
            return res.status(404).json({
                success: false,
                message: 'Trip not found'
            });
        }

        // Get real-time locks
        const redisLocks = await getAllTripLocks(req.params.id);

        res.json({
            success: true,
            data: {
                ...seatStatus,
                realTimeLocks: redisLocks
            }
        });
    } catch (error) {
        console.error('Get seats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get seat status'
        });
    }
});

/**
 * GET /api/trips/popular
 * Get popular/featured trips
 */
router.get('/featured/list', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const trips = await TripSchedule.find({
            status: 'scheduled',
            departureTime: { $gte: today },
            availableSeats: { $gt: 0 }
        })
            .populate('bus', 'busType amenities')
            .populate('operator', 'name logo rating')
            .sort({ departureTime: 1 })
            .limit(10)
            .lean();

        res.json({
            success: true,
            data: { trips }
        });
    } catch (error) {
        console.error('Get featured trips error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get featured trips'
        });
    }
});

module.exports = router;
