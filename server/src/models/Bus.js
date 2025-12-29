const mongoose = require('mongoose');

const seatLayoutSchema = new mongoose.Schema({
  rows: { type: Number, required: true },
  columns: { type: Number, required: true },
  layout: [[{ type: String, enum: ['seat', 'aisle', 'empty'] }]],
  seatLabels: { type: Map, of: String }
}, { _id: false });

const busSchema = new mongoose.Schema({
  registrationNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    trim: true,
    uppercase: true
  },
  operator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Operator', 
    required: true, 
    index: true 
  },
  busType: { 
    type: String, 
    enum: ['AC', 'Non-AC', 'Sleeper', 'Semi-Sleeper'], 
    required: true 
  },
  model: { type: String },
  totalSeats: { type: Number, required: true, min: 1 },
  seatLayout: { type: seatLayoutSchema, required: true },
  amenities: [{ 
    type: String, 
    enum: ['wifi', 'charging', 'tv', 'blanket', 'water', 'snacks'] 
  }],
  images: [{ type: String }],
  isActive: { type: Boolean, default: true, index: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

busSchema.virtual('availableSeats').get(function() {
  return this.totalSeats;
});

module.exports = mongoose.model('Bus', busSchema);
