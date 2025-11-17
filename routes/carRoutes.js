const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

// Create a new car (with validation)
router.post('/', async (req, res) => {
  try {
    const {
      brand, model, year, type, pricePerDay, fuelType,
      mileage, transmission, features, color, imageUrl, seatCount
    } = req.body;

    // LOG THE BODY FOR DEBUGGING
    console.log('Request body:', req.body);

    // Validate required fields (type included!)
    if (
      !brand ||
      !model ||
      !year ||
      !type ||
      !pricePerDay ||
      !fuelType ||
      !mileage ||
      !transmission
    ) {
      return res.status(400).json({ error: "All required fields must be provided." });
    }
    if (typeof year !== 'number' || year < 1980 || year > new Date().getFullYear() + 2) {
      return res.status(400).json({ error: "Year must be a valid number." });
    }
    if (typeof pricePerDay !== 'number' || pricePerDay <= 0) {
      return res.status(400).json({ error: "Price per day must be a positive number." });
    }
    if (typeof mileage !== 'number' || mileage < 0) {
      return res.status(400).json({ error: "Mileage must be a non-negative number." });
    }
    if (seatCount !== undefined && (typeof seatCount !== 'number' || seatCount < 1 || seatCount > 20)) {
      return res.status(400).json({ error: "Seat count must be between 1 and 20." });
    }

    const car = new Car({
      brand,
      model,
      year,
      type,
      pricePerDay,
      fuelType,
      mileage,
      transmission,
      features: features || [],
      color,
      imageUrl: imageUrl || "",
      seatCount,
      isAvailable: true
    });

    await car.save();
    res.status(201).json(car);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all cars WITH smart search and normal filters
router.get('/', async (req, res) => {
  try {
    let filter = {};

    // SMART SEARCH: match any words (case-insensitive) in brand OR model
    if (req.query.search) {
      const words = req.query.search.split(/\s+/).filter(Boolean);
      filter.$or = [
        ...words.map(word => ({ brand: new RegExp(word, 'i') })),
        ...words.map(word => ({ model: new RegExp(word, 'i') }))
      ];
    } else {
      // Case-insensitive filtering for brand/model (exact value)
      if (req.query.brand)
        filter.brand = new RegExp(`^${req.query.brand}$`, 'i');
      if (req.query.model)
        filter.model = new RegExp(`^${req.query.model}$`, 'i');
    }

    if (req.query.year)
      filter.year = Number(req.query.year);

    if (req.query.color)
      filter.color = req.query.color;

    if (req.query.transmission)
      filter.transmission = req.query.transmission;

    if (req.query.fuelType)
      filter.fuelType = req.query.fuelType;

    if (req.query.seatCount)
      filter.seatCount = Number(req.query.seatCount);

    if (req.query.priceMin || req.query.priceMax) {
      filter.pricePerDay = {};
      if (req.query.priceMin) filter.pricePerDay.$gte = Number(req.query.priceMin);
      if (req.query.priceMax) filter.pricePerDay.$lte = Number(req.query.priceMax);
    }

    if (req.query.mileageMin || req.query.mileageMax) {
      filter.mileage = {};
      if (req.query.mileageMin) filter.mileage.$gte = Number(req.query.mileageMin);
      if (req.query.mileageMax) filter.mileage.$lte = Number(req.query.mileageMax);
    }

    if (req.query.features) {
      filter.features = { $all: req.query.features.split(',') };
    }

    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    const cars = await Car.find(filter);
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single car by ID
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: "Car not found." });
    res.json(car);
  } catch (error) {
    res.status(500).json({ error: "Invalid car ID." });
  }
});

// Update car
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const car = await Car.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!car) return res.status(404).json({ error: "Car not found." });
    res.json(car);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete car
router.delete('/:id', async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) return res.status(404).json({ error: "Car not found." });
    res.json({ message: "Car deleted." });
  } catch (error) {
    res.status(500).json({ error: "Invalid car ID." });
  }
});

module.exports = router;