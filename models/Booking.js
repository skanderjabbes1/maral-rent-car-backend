const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  car:      { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For logged-in users, optional
  name:     { type: String },         // For guests, required if no user
  email:    { type: String },         // For guests, required if no user
  phone:    { type: String },         // Optional
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  totalPrice:  { type: Number, required: true },
  status:      { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
