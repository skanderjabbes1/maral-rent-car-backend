const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Car = require('../models/Car');

// Create a new booking: supports guest (name/email) OR logged-in user (user)
router.post('/', async (req, res) => {
  try {
    const { car, user, name, email, phone, startDate, endDate, totalPrice } = req.body;

    // Always required:
    if (!car || !startDate || !endDate || !totalPrice) {
      return res.status(400).json({ error: "Required: car, startDate, endDate, totalPrice." });
    }

    // Require user id OR guest info
    // Prevent empty string submissions for name/email
    const guestName = typeof name === 'string' ? name.trim() : '';
    const guestEmail = typeof email === 'string' ? email.trim() : '';
    if (!user && (!guestName || !guestEmail)) {
      return res.status(400).json({ error: "Either user must be provided, or guest name/email." });
    }

    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      return res.status(400).json({ error: "Invalid start or end date." });
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: "End date must be after start date." });
    }

    const theCar = await Car.findById(car);
    if (!theCar) return res.status(400).json({ error: "Car does not exist." });

    // Prevent overlapping bookings for the car
    const overlap = await Booking.findOne({
      car,
      $or: [
        { startDate: { $lt: endDate, $gte: startDate } },
        { endDate: { $gt: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });
    if (overlap) return res.status(400).json({ error: "Car already booked for those dates." });

    // Make booking, supporting guest or user
    const booking = new Booking({
      car,
      user: user || undefined,
      name: guestName || undefined,
      email: guestEmail || undefined,
      phone: phone || undefined,
      startDate,
      endDate,
      totalPrice
    });
    await booking.save();

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List all bookings (with optional filter by car, user, or guest email)
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.query.car) filter.car = req.query.car;
    if (req.query.user) filter.user = req.query.user;
    if (req.query.email) filter.email = req.query.email;
    const bookings = await Booking.find(filter)
      .populate({ path: 'car' })
      .populate({ path: 'user', select: '-password' });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel a booking
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ message: 'Booking cancelled.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;