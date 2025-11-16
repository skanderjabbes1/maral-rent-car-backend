const mongoose = require('mongoose');
require('dotenv').config();
const Car = require('./models/Car');

const carTypes = {
  'Civic': 'Sedan',
  'Accord': 'Sedan',
  'CR-V': 'SUV',
  'Pilot': 'SUV',
  'Camry': 'Sedan',
  'RAV4': 'SUV',
  'Corolla': 'Sedan',
};

async function updateCarsWithType() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/maral-rent-car', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const cars = await Car.find({});
    console.log(`Found ${cars.length} cars`);

    let updated = 0;

    for (const car of cars) {
      if (car.type) {
        console.log(`⏭️  Skipping ${car.brand} ${car.model} - already has type: ${car.type}`);
        continue;
      }

      let carType = carTypes[car.model] || 'Sedan';

      car.type = carType;
      await car.save();
      updated++;
      console.log(`✅ Updated ${car.brand} ${car.model} (${car.year}) → Type: ${carType}`);
    }

    console.log(`\n✅ Update complete! ${updated} cars updated.`);
    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.connection.close();
  }
}

updateCarsWithType();
