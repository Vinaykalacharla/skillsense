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
    return {
      date: date.toISOString().split('T')[0],
      placement_ready: Math.min(100, 55 + index * 3),
      coding_skill_index: Math.min(100, 50 + index * 2),
      communication_score: Math.min(100, 48 + index * 2),
      authenticity_score: Math.min(100, 52 + index * 2),
    };
  });
};

const computeStreak = (points) => {
  if (!points.length) return 0;
  let streak = 0;
  let lastDate = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i];
    if ((point.placement_ready || 0) < 60) break;
    if (lastDate === null) {
      streak += 1;
      lastDate = point.date;
      continue;
    }
    const gapDays = (lastDate - point.date) / (24 * 60 * 60 * 1000);
    if (gapDays <= 1.5) {
      streak += 1;
      lastDate = point.date;
    } else {
      break;
    }
  }
  return streak;
};

const buildMilestones = (latest) => {
  if (!latest) return {};
  return {
    'Placement readiness': latest.placement_ready,
    'Coding index': latest.coding_skill_index,
    Communication: latest.communication_score,
    Authenticity: latest.authenticity_score,
  };
};

const getProgress = asyncHandler(async (req, res) => {
  const points = await PerformancePoint.find({ user: req.user._id }).sort({ date: 1 });
  const series = points.map(formatPoint);
  const outputSeries = series.length ? series : buildFallbackSeries();
  const streak = computeStreak(points);
  const latest = outputSeries[outputSeries.length - 1];
  const milestones = buildMilestones(latest);
  res.json({ series: outputSeries, streak, milestones });
});

const TIER_BENCHMARKS = {
  faang:   { label: 'FAANG / Tier-1',           coding: 92, communication: 88, authenticity: 85, placement: 90 },
  product: { label: 'Product Companies / Tier-2', coding: 78, communication: 75, authenticity: 72, placement: 76 },
  service: { label: 'Service Companies / Tier-3', coding: 62, communication: 60, authenticity: 58, placement: 60 },
  startup: { label: 'Startups',                  coding: 70, communication: 72, authenticity: 68, placement: 68 },
};

const simulatePlacement = asyncHandler(async (req, res) => {
  const tier = (req.body.tier || 'product').toLowerCase();
  const benchmark = TIER_BENCHMARKS[tier] || TIER_BENCHMARKS.product;
  const scores = req.user.scores || {};

  const coding       = Math.round(scores.coding_skill_index  || 60);
  const communication = Math.round(scores.communication_score || 60);
  const authenticity  = Math.round(scores.authenticity_score  || 60);
  const placement     = Math.round(scores.placement_ready     || 60);

  const codingProb  = Math.min(1, coding        / benchmark.coding);
  const commProb    = Math.min(1, communication  / benchmark.communication);
  const authProb    = Math.min(1, authenticity   / benchmark.authenticity);
  const overallProb = Math.min(1, placement      / benchmark.placement);

  const probability = Math.round(
    (codingProb * 0.35 + commProb * 0.25 + authProb * 0.20 + overallProb * 0.20) * 100
  );

  const gaps = [];
  if (coding        < benchmark.coding)        gaps.push({ metric: 'Coding Skill',   current: coding,        required: benchmark.coding,        gap: benchmark.coding        - coding });
  if (communication < benchmark.communication) gaps.push({ metric: 'Communication',  current: communication, required: benchmark.communication,  gap: benchmark.communication  - communication });
  if (authenticity  < benchmark.authenticity)  gaps.push({ metric: 'Authenticity',   current: authenticity,  required: benchmark.authenticity,   gap: benchmark.authenticity   - authenticity });

  const tips = gaps.slice(0, 3).map((g) => {
    if (g.metric === 'Coding Skill')   return `Solve ${Math.ceil(g.gap / 3)} more LeetCode problems and run a GitHub analysis to close the ${g.gap}-point coding gap.`;
    if (g.metric === 'Communication')  return `Complete ${Math.ceil(g.gap / 8)} more mock interview sessions to improve communication by ${g.gap} points.`;
    return `Verify your profile and add LinkedIn endorsements to close the ${g.gap}-point authenticity gap.`;
  });

  if (tips.length === 0) tips.push('Great scores! Apply widely and practice system design interviews.');

  res.json({ tier, tier_label: benchmark.label, probability, benchmark, current: { coding, communication, authenticity, placement }, gaps, tips });
});

module.exports = { getProgress, simulatePlacement };
