const mongoose = require('mongoose');

const UmkleideSettingSchema = new mongoose.Schema({
  images: [{
    filename: String,
    originalName: String,
    active: { type: Boolean, default: true }
  }],
  interval: { type: Number, default: 10 }
});

UmkleideSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ images: [], interval: 10 });
  }
  return settings;
};

module.exports = mongoose.model('UmkleideSetting', UmkleideSettingSchema);
