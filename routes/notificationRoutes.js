const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Dummy auth: lets all requests through for testing.
const dummyAuth = (req, res, next) => {
  // Optionally you can simulate a user/admin:
  req.user = {
    _id: '6567fcbff7b0aef364962e9c', // supply a real user _id for fully working demo/testing
    role: 'user'
  };
  next();
};

// Get latest notifications (user sees their own, admin sees all)
router.get('/', dummyAuth, async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const query = isAdmin ? {} : { user: req.user._id };
  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(25);
  res.json(notifications);
});

// Mark notifications as seen
router.put('/seen', dummyAuth, async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, seen: false },
    { $set: { seen: true } }
  );
  res.json({ success: true });
});

module.exports = router;