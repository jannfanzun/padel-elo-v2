const mongoose = require('mongoose');

const PadelScheduleSchema = new mongoose.Schema({
  // Array von Spielern für den Spieltag
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  // Spieltag - wann beginnt es (Datum + Uhrzeit)
  startTime: {
    type: Date,
    required: true
  },

  // Ist der Spielplan gerade aktiv/veröffentlicht?
  isPublished: {
    type: Boolean,
    default: false
  },

  // Wann wurde veröffentlicht
  publishedAt: {
    type: Date,
    default: null
  },

  // Wer hat veröffentlicht
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Wer hat den Spielplan erstellt
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Court-Namen für diese Spielplan
  // z.B. ["Puma", "fin.cube", "Swica", ...]
  courtNames: [
    {
      type: String,
      default: null
    }
  ],

  // Ob die Spieler manuell sortiert wurden (nicht nach ELO)
  // Wenn true, werden Spieler in der gespeicherten Reihenfolge angezeigt:
  // [Court1_Team1_P1, Court1_Team1_P2, Court1_Team2_P1, Court1_Team2_P2, Court2_Team1_P1, ...]
  manualOrder: {
    type: Boolean,
    default: false
  }
});

// Middleware zum Aktualisieren von updatedAt
PadelScheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index für schnellere Abfragen
PadelScheduleSchema.index({ isPublished: 1, publishedAt: -1 });
PadelScheduleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PadelSchedule', PadelScheduleSchema);
