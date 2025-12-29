const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    logo: { type: String },
    description: { type: String },
    contact: {
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String }
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    bankDetails: {
        accountName: { type: String },
        accountNumber: { type: String },
        bankName: { type: String },
        routingNumber: { type: String }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total buses
operatorSchema.virtual('buses', {
    ref: 'Bus',
    localField: '_id',
    foreignField: 'operator'
});

module.exports = mongoose.model('Operator', operatorSchema);
