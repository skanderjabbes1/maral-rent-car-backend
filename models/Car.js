const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, required: true }, // <-- New field: Sedan, SUV, Hatchback, Van, Pickup, Convertible
  pricePerDay: { type: Number, required: true },
  fuelType: { type: String, required: true }, // Petrol, Diesel, Hybrid, Electric
  mileage: { type: Number, required: true },
  transmission: { type: String, required: true }, // Automatic, Manual
  features: [{ type: String }], // Air Conditioning, GPS, Bluetooth, etc.
  color: { type: String },
  imageUrl: { type: String },
  isAvailable: { type: Boolean, default: true },
  seatCount: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);