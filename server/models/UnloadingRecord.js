const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  partNumber: {
    type: String,
    required: [true, 'Part number is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 1,
  },
});

const unloadingRecordSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    locationName: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    parts: {
      type: [partSchema],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one part is required',
      },
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one proof image is required',
      },
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tvs_user',
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
  },
  { timestamps: true }
);

// Index for analytics queries
unloadingRecordSchema.index({ employee: 1, createdAt: -1 });

module.exports = mongoose.model('UnloadingRecord', unloadingRecordSchema);
