const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seatNumber: { type: String, required: true },
    status: {
        type: String,
        enum: ['available', 'locked', 'booked', 'sold'],
        default: 'available',
        index: true
    },
    lockedBy: {
        type: mongoose.Schema.Types.Mixed, // Allow ObjectId (User) or String (Guest)
        // ref: 'User', // Disabled to prevent casting errors with Guest IDs
        default: null
    },
    lockedAt: { type: Date, default: null },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    soldBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    bookingExpiry: { type: Date, default: null },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    price: { type: Number }
}, { _id: false });

const stopSchema = new mongoose.Schema({
    name: { type: String, required: true },
    arrivalTime: { type: Date },
    departureTime: { type: Date },
    order: { type: Number, required: true },
    fare: { type: Number, default: 0 } // Fare from origin to this stop
}, { _id: false });

const tripScheduleSchema = new mongoose.Schema({
    bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true,
        index: true
    },
    operator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Operator',
        required: true,
        index: true
    },
    route: {
        origin: { type: String, required: true, index: true },
        destination: { type: String, required: true, index: true },
        distance: { type: Number },
        stops: [stopSchema]
    },
    departureTime: { type: Date, required: true, index: true },
    arrivalTime: { type: Date, required: true },
    fare: {
        base: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 }
    },
    seats: [seatSchema],
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    status: {
        type: String,
        enum: ['scheduled', 'boarding', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    cancellationPolicy: {
        refundPercentage: { type: Number, default: 80 },
        cutoffHours: { type: Number, default: 24 }
    },
    waybill: {
        staff: {
            driver: { type: String },
            supervisor: { type: String },
            helper: { type: String },
            busNumber: { type: String }
        },
        issuedAt: { type: Date },
        isGenerated: { type: Boolean, default: false }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for common queries
tripScheduleSchema.index({ 'route.origin': 1, 'route.destination': 1, departureTime: 1 });
tripScheduleSchema.index({ operator: 1, departureTime: 1 });
tripScheduleSchema.index({ status: 1, departureTime: 1 });

// Virtual for total fare calculation
tripScheduleSchema.virtual('totalFare').get(function () {
    return this.fare.base + this.fare.tax - this.fare.discount;
});

// Pre-save hook to update availableSeats
tripScheduleSchema.pre('save', function (next) {
    if (this.seats && this.seats.length > 0) {
        this.availableSeats = this.seats.filter(seat => seat.status === 'available').length;
    }
    next();
});

module.exports = mongoose.model('TripSchedule', tripScheduleSchema);
