// First, let's create a new schema for storing quarterly ELO stats
// Create a new file: models/QuarterlyELO.js

const mongoose = require('mongoose');

const QuarterlyELOSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  quarter: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  startELO: {
    type: Number,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure uniqueness of user-year-quarter combination
QuarterlyELOSchema.index({ user: 1, year: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('QuarterlyELO', QuarterlyELOSchema);