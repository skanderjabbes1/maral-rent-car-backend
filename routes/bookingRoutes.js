const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const Notification = require('../models/Notification');
const { auth, admin } = require('../middleware/auth');

// Create a new booking: supports guest (name/email) OR logged-in user
router.post('/', async (req, res) => {
  try {
    const { car, user, name, email, phone, startDate, endDate, totalPrice } = req.body;

    if (!car || !startDate || !endDate || !totalPrice) {
      return res.status(400).json({ error: "Required: car, startDate, endDate, totalPrice." });
    }

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

    const booking = new Booking({
      car,
      user: user || undefined,
      id: user || undefined,        // for easier filtering
      name: guestName || undefined,
      email: guestEmail || undefined,
      phone: phone || undefined,
      startDate,
      endDate,
      totalPrice
    });
    await booking.save();

    await Notification.create({
      user: user || undefined,
      type: 'booking',
      message: `Booking #${booking._id} created for car ${theCar.brand} ${theCar.model} (${startDate} to ${endDate}).`
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(400).json({ error: error.message });
  }
});

// List bookings (optionally filter by user, car, email)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.car) filter.car = req.query.car;
    if (req.query.email) filter.email = req.query.email;

    if (req.query.user) {
      filter.$or = [
        { user: req.query.user },
        { id: req.query.user }
      ];
    }

    const bookings = await Booking.find(filter)
      .populate('car')
      .populate({ path: 'user', select: '-password' });

    res.json(bookings);
  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific booking
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('car')
      .populate({ path: 'user', select: '-password' });

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a booking (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const carId = booking.car;
    const status = booking.status;

    await booking.deleteOne();

    // If this booking was confirmed, re-evaluate car availability
    if (status === 'confirmed' && carId) {
      const hasOtherConfirmed = await Booking.findOne({
        car: carId,
        status: 'confirmed'
      });

      const car = await Car.findById(carId);
      if (car) {
        car.isAvailable = !hasOtherConfirmed;
        await car.save();
      }
    }

    await Notification.create({
      user: booking.user || undefined,
      type: 'cancel',
      message: `Booking #${booking._id} was deleted by admin.`,
    });

    res.json({ message: 'Booking deleted successfully.' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (admin only) and keep car availability in sync
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const booking = await Booking.findById(req.params.id).populate('car');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    booking.status = status;
    await booking.save();

    if (booking.car) {
      if (status === 'confirmed') {
        booking.car.isAvailable = false;
        await booking.car.save();
      } else if (status === 'cancelled' || status === 'completed') {
        const hasOtherConfirmed = await Booking.findOne({
          car: booking.car._id,
          status: 'confirmed',
          _id: { $ne: booking._id },
        });

        booking.car.isAvailable = !hasOtherConfirmed;
        await booking.car.save();
      }
    }

    res.json({ message: `Booking status updated to ${status}.`, booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: error.message || 'Server error.' });
  }
});

module.exports = router;