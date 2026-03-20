const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    unique: true,
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
  },
  invoiceCount: {
    type: Number,
    required: [true, 'Invoice count is required'],
    min: 0,
    default: 1,
  },
  partsCount: {
    type: Number,
    required: [true, 'Parts count is required'],
    min: 0,
    default: 0,
  },
  storageLocation: {
    type: String,
    trim: true,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
});

const unloadingRecordSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
    },
    locationName: {
      type: String,
      trim: true,
    },
    vendors: {
      type: [vendorSchema],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one vendor entry is required',
      },
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tvs_user',
      required: true,
    },
  },
  { timestamps: true }
);

// Index for analytics queries
unloadingRecordSchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('UnloadingRecord', unloadingRecordSchema);
