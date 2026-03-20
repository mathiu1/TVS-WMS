const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const UnloadingRecord = require('./models/UnloadingRecord');
const Counter = require('./models/Counter');
const connectDB = require('./config/db');

const USERS_TO_CREATE = [
  'harinath', 'akash', 'ajay', 'premkumar', 'jegathish',
  'sathish', 'karthik', 'vinoth', 'kaviya', 'senthil'
];

const LOCATIONS = [
  'WAREHOUSE-A', 'WAREHOUSE-B', 'WAREHOUSE-C', 'WAREHOUSE-D',
  'LOADING-DOCK-1', 'LOADING-DOCK-2', 'LOADING-DOCK-3', 'LOADING-DOCK-4',
  'YARD-NORTH', 'YARD-SOUTH', 'YARD-EAST', 'YARD-WEST',
  'BAY-01', 'BAY-02', 'BAY-03', 'BAY-04', 'BAY-05', 'BAY-06', 'BAY-07', 'BAY-08', 'BAY-09', 'BAY-10',
  'ZONE-RED', 'ZONE-BLUE', 'ZONE-GREEN', 'ZONE-YELLOW', 'ZONE-ORANGE', 'ZONE-PURPLE', 'ZONE-CYAN', 'ZONE-MAGENTA'
];
const VENDOR_NAMES = ['TVS Logistics', 'Express Cargo', 'Apex Parts', 'Swift Delivery', 'Global Motors', 'Reliable Spares'];

const getNextVendorId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { id: 'vendorId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = counter.seq.toString();
  if (seqStr.length < 4) {
    return seqStr.padStart(4, '0');
  }
  return seqStr;
};

const seed = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    const createdUsers = [];

    // 1. Create Users
    for (const name of USERS_TO_CREATE) {
      let user = await User.findOne({ email: `${name}@tvs.in` });
      if (!user) {
        user = await User.create({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: `${name}@tvs.in`,
          password: 'password123',
          role: 'employee'
        });
        console.log(`Created user: ${user.name}`);
      } else {
        console.log(`User already exists: ${user.name}`);
      }
      createdUsers.push(user);
    }

    // 2. Generate 150 Reports (15 per user)
    console.log('Generating 150 reports across varied locations...');
    let totalReports = 0;

    for (const user of createdUsers) {
      for (let i = 0; i < 15; i++) {
        const vendorCount = Math.floor(Math.random() * 3) + 1; // 1-3 vendors per record
        const vendors = [];

        for (let v = 0; v < vendorCount; v++) {
          const vId = await getNextVendorId();
          vendors.push({
            vendorId: vId,
            vendorName: VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)],
            invoiceCount: Math.floor(Math.random() * 10) + 1,
            partsCount: Math.floor(Math.random() * 100) + 10,
            storageLocation: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
            images: ['https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg']
          });
        }

        // Random date within last 2 weeks
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 14));
        date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const vehiclePrefix = ['TN', 'KA', 'PY', 'KL'];
        const vNumber = `${vehiclePrefix[Math.floor(Math.random() * vehiclePrefix.length)]} ${Math.floor(Math.random() * 99)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(1000 + Math.random() * 9000)}`;

        await UnloadingRecord.create({
          vehicleNumber: vNumber,
          locationName: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
          vendors,
          employee: user._id,
          createdAt: date,
          updatedAt: date
        });
        totalReports++;
      }
    }

    console.log(`Successfully seeded ${totalReports} reports!`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
