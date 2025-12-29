const Booking = require('../models/Booking');
const TripSchedule = require('../models/TripSchedule');
const mongoose = require('mongoose');

/**
 * Get monthly revenue by operator for current month
 */
async function getMonthlyRevenueByOperator() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return await Booking.aggregate([
        {
            $match: {
                status: { $in: ['confirmed', 'completed'] },
                'payment.status': 'completed',
                createdAt: { $gte: startOfMonth }
            }
        },
        {
            $lookup: {
                from: 'operators',
                localField: 'operator',
                foreignField: '_id',
                as: 'operatorInfo'
            }
        },
        { $unwind: '$operatorInfo' },
        {
            $group: {
                _id: '$operator',
                operatorName: { $first: '$operatorInfo.name' },
                operatorCode: { $first: '$operatorInfo.code' },
                totalRevenue: { $sum: '$totalAmount' },
                bookingCount: { $sum: 1 },
                avgTicketPrice: { $avg: '$totalAmount' },
                passengerCount: { $sum: { $size: '$passengers' } }
            }
        },
        {
            $project: {
                _id: 1,
                operatorName: 1,
                operatorCode: 1,
                totalRevenue: { $round: ['$totalRevenue', 2] },
                bookingCount: 1,
                avgTicketPrice: { $round: ['$avgTicketPrice', 2] },
                passengerCount: 1
            }
        },
        { $sort: { totalRevenue: -1 } }
    ]);
}

/**
 * Get revenue for a specific date range
 */
async function getRevenueByDateRange(startDate, endDate, operatorId = null) {
    const match = {
        status: { $in: ['confirmed', 'completed'] },
        'payment.status': 'completed',
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (operatorId) {
        match.operator = new mongoose.Types.ObjectId(operatorId);
    }

    return await Booking.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                revenue: { $sum: '$totalAmount' },
                bookings: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

/**
 * Get dashboard summary stats
 */
async function getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
        todayBookings,
        monthlyRevenue,
        activeTrips,
        totalOperators
    ] = await Promise.all([
        Booking.countDocuments({
            createdAt: { $gte: today },
            status: { $in: ['confirmed', 'completed'] }
        }),
        Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth },
                    status: { $in: ['confirmed', 'completed'] },
                    'payment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]),
        TripSchedule.countDocuments({
            status: { $in: ['scheduled', 'boarding', 'in-progress'] },
            departureTime: { $gte: today }
        }),
        mongoose.model('Operator').countDocuments({ isActive: true })
    ]);

    return {
        todayBookings,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        activeTrips,
        totalOperators
    };
}

/**
 * Get popular routes
 */
async function getPopularRoutes(limit = 10) {
    return await Booking.aggregate([
        {
            $match: {
                status: { $in: ['confirmed', 'completed'] }
            }
        },
        {
            $lookup: {
                from: 'tripschedules',
                localField: 'tripSchedule',
                foreignField: '_id',
                as: 'trip'
            }
        },
        { $unwind: '$trip' },
        {
            $group: {
                _id: {
                    origin: '$trip.route.origin',
                    destination: '$trip.route.destination'
                },
                bookingCount: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
            }
        },
        { $sort: { bookingCount: -1 } },
        { $limit: limit },
        {
            $project: {
                route: { $concat: ['$_id.origin', ' → ', '$_id.destination'] },
                origin: '$_id.origin',
                destination: '$_id.destination',
                bookingCount: 1,
                revenue: { $round: ['$revenue', 2] }
            }
        }
    ]);
}

/**
 * Get booking trends (hourly distribution)
 */
async function getBookingTrends() {
    return await Booking.aggregate([
        {
            $match: {
                status: { $in: ['confirmed', 'completed'] }
            }
        },
        {
            $group: {
                _id: { $hour: '$createdAt' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                hour: '$_id',
                bookings: '$count'
            }
        }
    ]);
}

module.exports = {
    getMonthlyRevenueByOperator,
    getRevenueByDateRange,
    getDashboardStats,
    getPopularRoutes,
    getBookingTrends
};
