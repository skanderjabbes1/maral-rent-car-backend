const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { auth, admin } = require('../middleware/auth');

// Helper to shape user response without password
const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

// ===================== PUBLIC AUTH ROUTES ===================== //

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const user = new User({ name, email, password, phone });
    await user.save();

    res.status(201).json({
      message: 'Registration successful. You can now log in.',
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// Get current logged-in user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== PASSWORD FLOWS ===================== //

// Logged-in user: change password (current + new + confirm)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'All password fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword; // pre-save hook hashes it
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Failed to change password.' });
  }
});

// Forgot password: request reset link by email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset link has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // 👇 use frontend URL instead of backend host
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase}/reset-password/${resetToken}`;

    res.json({
      message: 'If an account with that email exists, a reset link has been generated.',
      resetLink,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message || 'Failed to process forgot password.' });
  }
});

// Reset password using token (logged out)
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmNewPassword } = req.body;

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'New password and confirmation are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password.' });
  }
});

// ===================== ADMIN USER MANAGEMENT ===================== //

// Get all users (admin only)
router.get('/', auth, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users.map(buildUserResponse));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    const user = new User({
      name,
      email,
      password,
      phone: phone || '',
      role: role === 'admin' ? 'admin' : 'user',
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully.',
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(400).json({ error: error.message || 'Failed to create user.' });
  }
});

// Update user (admin only, can set new password too)
router.patch('/:id', auth, admin, async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Email change + uniqueness check
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: 'Email already used by another account.' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role === 'admin' ? 'admin' : 'user';

    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      user.password = password;
    }

    await user.save();

    res.json({
      message: 'User updated successfully.',
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(400).json({ error: error.message || 'Failed to update user.' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    if (req.user && req.user._id.toString() === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete user.' });
  }
});

module.exports = router;