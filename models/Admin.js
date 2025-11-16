const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  superAdmin: { type: Boolean, default: false },
  notes: { type: String }
});

module.exports = mongoose.model('Admin', adminSchema);