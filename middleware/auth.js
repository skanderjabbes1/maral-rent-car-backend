const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth middleware: checks for valid token and attaches user object to req
const auth = async (req, res, next) => {
  // Accept token from header, supports "Authorization: Bearer TOKEN"
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Authorization middleware: only allows admins access
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin resource. Access denied.' });
};

module.exports = { auth, admin };