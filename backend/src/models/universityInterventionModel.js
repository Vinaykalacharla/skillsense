const mongoose = require('mongoose');

const universityInterventionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    reason: { type: String, default: '' },
    action: { type: String, default: '' },
    status: { type: String, enum: ['planned', 'in_progress', 'completed', 'escalated'], default: 'planned' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    note: { type: String, default: '' },
    recommended_action: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UniversityIntervention', universityInterventionSchema);
