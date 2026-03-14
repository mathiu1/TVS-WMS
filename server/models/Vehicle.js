const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    arrivalDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['arrived', 'unloading', 'completed'],
      default: 'arrived',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
