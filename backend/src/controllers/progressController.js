const asyncHandler = require('express-async-handler');
const PerformancePoint = require('../models/performancePointModel');

const formatPoint = (point) => ({
  date: point.date.toISOString().split('T')[0],
  coding_skill_index: Math.round(point.coding_skill_index || 0),
  communication_score: Math.round(point.communication_score || 0),
  authenticity_score: Math.round(point.authenticity_score || 0),
  placement_ready: Math.round(point.placement_ready || 0),
});

const buildFallbackSeries = () => {
  const baseDate = Date.now();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(baseDate - (6 - index) * 24 * 60 * 60 * 1000);
    const placement = 55 + index * 3;
    const coding = 50 + index * 2;
    const communication = 48 + index * 2;
    const authenticity = 52 + index * 2;
    return {
      date: date.toISOString().split('T')[0],
      placement_ready: Math.min(100, placement),
      coding_skill_index: Math.min(100, coding),
      communication_score: Math.min(100, communication),
      authenticity_score: Math.min(100, authenticity),
    };
  });
};

const computeStreak = (points) => {
  if (!points.length) {
    return 0;
  }
  let streak = 0;
  let lastDate = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i];
    const meetsThreshold = (point.placement_ready || 0) >= 60;
    if (!meetsThreshold) {
      break;
    }
    if (lastDate === null) {
      streak += 1;
      lastDate = point.date;
      continue;
    }
    const gapDays = (lastDate - point.date) / (24 * 60 * 60 * 1000);
    if (gapDays <= 1.5) {
      streak += 1;
      lastDate = point.date;
      continue;
    }
    break;
  }
  return streak;
};

const buildMilestones = (latest) => {
  if (!latest) {
    return {};
  }
  return {
    'Placement readiness': latest.placement_ready,
    'Coding index': latest.coding_skill_index,
    Communication: latest.communication_score,
    'Authenticity': latest.authenticity_score,
  };
};

const getProgress = asyncHandler(async (req, res) => {
  const points = await PerformancePoint.find({ user: req.user._id }).sort({ date: 1 });
  const series = points.map(formatPoint);
  const outputSeries = series.length ? series : buildFallbackSeries();
  const streak = computeStreak(points);
  const latest = outputSeries[outputSeries.length - 1];
  const milestones = buildMilestones(latest);
  res.json({
    series: outputSeries,
    streak,
    milestones,
  });
});

module.exports = {
  getProgress,
};
