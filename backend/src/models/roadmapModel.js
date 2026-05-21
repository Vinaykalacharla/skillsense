const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    label: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    phase: { type: Number, default: 1 },
    estimated_days: { type: Number, default: 3 },
    resources: { type: [resourceSchema], default: [] },
    ai_generated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoadmapItem', itemSchema);
