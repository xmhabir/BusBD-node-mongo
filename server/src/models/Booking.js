const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    seatNumber: { type: String, required: true }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['card', 'bkash', 'nagad', 'rocket', 'cash'],
        required: true
    },
    transactionId: { type: String },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, default: 0 }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    tripSchedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TripSchedule',
        required: true,
        index: true
    },
    operator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Operator',
        required: true,
        index: true
    },
    passengers: [passengerSchema],
    seats: [{ type: String }],
    contactInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String }
    },
    pricing: {
        baseFare: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        serviceFee: { type: Number, default: 0 },
        goodsFare: { type: Number, default: 0 }
    },
    totalAmount: { type: Number, required: true },
    payment: paymentSchema,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'reserved'],
        default: 'pending',
        index: true
    },
    expiresAt: { type: Date },
    boardingPoint: { type: String },
    droppingPoint: { type: String },
    pickupPlace: { type: String },
    remarks: { type: String },
    cancelledAt: { type: Date },
    cancelReason: { type: String }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Generate booking ID before saving
bookingSchema.pre('save', async function (next) {
    if (!this.bookingId) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.bookingId = `BUS${dateStr}${random}`;
    }
    next();
});

// Indexes for common queries
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ 'payment.status': 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
