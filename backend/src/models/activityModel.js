const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity_type: { type: String, default: 'github_analysis' },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['completed', 'pending', 'processing'], default: 'completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillActivity', activitySchema);
