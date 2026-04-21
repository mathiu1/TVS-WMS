const mongoose = require('mongoose');

const autocompleteOptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['vehicle', 'vendor', 'location'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique combination of type and value to prevent duplicates
autocompleteOptionSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('AutocompleteOption', autocompleteOptionSchema);
