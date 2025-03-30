const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  team1: [
    {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      eloBeforeGame: {
        type: Number,
        required: true
      },
      eloAfterGame: {
        type: Number,
        required: true
      },
      eloChange: {
        type: Number,
        required: true
      }
    }
  ],
  team2: [
    {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      eloBeforeGame: {
        type: Number,
        required: true
      },
      eloAfterGame: {
        type: Number,
        required: true
      },
      eloChange: {
        type: Number,
        required: true
      }
    }
  ],
  score: {
    team1: {
      type: Number,
      required: true,
      min: 0,
      max: 7
    },
    team2: {
      type: Number,
      required: true,
      min: 0,
      max: 7
    }
  },
  teamElo: {
    team1: {
      type: Number,
      required: true
    },
    team2: {
      type: Number,
      required: true
    }
  },
  winner: {
    type: String,
    enum: ['team1', 'team2'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Add indexes for faster queries
GameSchema.index({ createdAt: -1 });
GameSchema.index({ 'team1.player': 1 });
GameSchema.index({ 'team2.player': 1 });

module.exports = mongoose.model('Game', GameSchema);