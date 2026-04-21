const mongoose = require('mongoose');
const UnloadingRecord = require('../server/models/UnloadingRecord');
const AutocompleteOption = require('../server/models/AutocompleteOption');
require('dotenv').config({ path: '../server/.env' });

async function sync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const records = await UnloadingRecord.find();
    console.log(`Syncing suggestions from ${records.length} records...`);

    const options = new Map();

    records.forEach(r => {
      if (r.vehicleNumber) options.set(`vehicle:${r.vehicleNumber.toUpperCase()}`, { type: 'vehicle', value: r.vehicleNumber.toUpperCase() });
      if (r.vendors) {
        r.vendors.forEach(v => {
          if (v.vendorName) options.set(`vendor:${v.vendorName}`, { type: 'vendor', value: v.vendorName });
          if (v.storageLocation) options.set(`location:${v.storageLocation}`, { type: 'location', value: v.storageLocation });
        });
      }
    });

    const values = Array.from(options.values());
    if (values.length > 0) {
      const operations = values.map(opt => ({
        updateOne: {
          filter: { type: opt.type, value: opt.value },
          update: { $set: opt },
          upsert: true
        }
      }));
      await AutocompleteOption.bulkWrite(operations);
      console.log(`Successfully synced ${values.length} unique suggestions.`);
    } else {
      console.log('No records found to sync.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

sync();
