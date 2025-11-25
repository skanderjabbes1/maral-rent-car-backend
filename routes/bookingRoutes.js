const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// Create a new booking: supports guest (name/email) OR logged-in user
router.post('/', async (req, res) => {
  try {
    const { car, user, name, email, phone, startDate, endDate, totalPrice } = req.body;

    // Always required:
    if (!car || !startDate || !endDate || !totalPrice) {
      return res.status(400).json({ error: "Required: car, startDate, endDate, totalPrice." });
    }

    // Require user id OR guest info
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
      id: user || undefined,        // Always save user id at top-level for filtering!
      name: guestName || undefined,
      email: guestEmail || undefined,
      phone: phone || undefined,
      startDate,
      endDate,
      totalPrice
    });
    await booking.save();

    // === Notification: Booking created ===
    await Notification.create({
      user: user || undefined,
      type: 'booking',
      message: `Booking #${booking._id} created for car ${theCar.brand} ${theCar.model} (${startDate} to ${endDate}).`
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List all bookings (optional filter by car, user, or guest email)
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.query.car) filter.car = req.query.car;
    if (req.query.email) filter.email = req.query.email;

    if (req.query.user) {
      // Filter by BOTH possible cases: user field or top-level id field
      filter.$or = [
        { user: req.query.user }, // for Mongoose ref
        { id: req.query.user }    // for top-level id
      ];
    }

    const bookings = await Booking.find(filter)
      .populate({ path: 'car' })
      .populate({ path: 'user', select: '-password' });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'car' })
      .populate({ path: 'user', select: '-password' });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel a booking (with notification)
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // === Notification: Booking canceled ===
    await Notification.create({
      user: booking.user || undefined,
      type: 'cancel',
      message: `Booking #${booking._id} for car ${booking.car} was canceled.`
    });

    res.json({ message: 'Booking cancelled.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;