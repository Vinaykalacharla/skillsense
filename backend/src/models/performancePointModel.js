const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    coding_skill_index: { type: Number, default: 0 },
    communication_score: { type: Number, default: 0 },
    authenticity_score: { type: Number, default: 0 },
    placement_ready: { type: Number, default: 0 },
  },
  { timestamps: true }
);

performanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PerformancePoint', performanceSchema);
