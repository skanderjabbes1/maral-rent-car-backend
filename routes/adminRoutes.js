const express = require('express');
const router = express.Router();
const User = require('../models/User');

// List all admins (NEW)
router.get('/', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote user to admin
router.post('/promote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") return res.status(400).json({ error: "User is already admin." });

    user.role = "admin";
    await user.save();
    res.json({ message: "User promoted to admin.", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Demote admin to user
router.post('/demote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role !== "admin") return res.status(400).json({ error: "User is not an admin." });

    user.role = "user";
    await user.save();
    res.json({ message: "Admin demoted to user.", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin dashboard route
router.get('/dashboard', async (req, res) => {
  // Add admin authentication middleware before this route in app.js if needed
  res.json({ message: "Welcome, admin! You can manage cars, bookings, and users here." });
});

module.exports = router;