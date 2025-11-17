require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- ROUTES ---
const carRoutes = require('./routes/carRoutes');
app.use('/api/cars', carRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admins', adminRoutes);

// NEW: notifications API route
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// --- Optional: base route for quick API test ---
app.get('/', (req, res) => {
  res.send('Maral Rent Car API is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚗 Server running on port ${PORT}`);
});