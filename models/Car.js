const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, required: true }, // <-- CRITICAL: must be present!
  pricePerDay: { type: Number, required: true },
  fuelType: { type: String, required: true },
  mileage: { type: Number, required: true },
  transmission: { type: String, required: true },
  features: [{ type: String }], // Air Conditioning, GPS, Bluetooth, etc.
  color: { type: String },
  imageUrl: { type: String },
  isAvailable: { type: Boolean, default: true },
  seatCount: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);