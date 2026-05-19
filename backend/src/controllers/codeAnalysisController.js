const asyncHandler = require('express-async-handler');
const CodeAnalysisReport = require('../models/codeAnalysisReportModel');
const Activity = require('../models/activityModel');
const { analyzeGithubTarget, extractGithubUsername } = require('../utils/githubAnalysis');
const { deriveBreakdown, deriveScores } = require('../utils/scoring');

const toNumericId = (value) => {
  if (!value) {
    return Date.now();
  }
  const hex = value.toString();
  const parsed = Number.parseInt(hex.slice(-6), 16);
  if (Number.isNaN(parsed)) {
    return Math.abs(Number(hex.slice(-6)) || Date.now());
  }
  return parsed;
};

const ensureNumericId = async (doc) => {
  if (doc.numeric_id) {
    return doc.numeric_id;
  }
  const nextId = toNumericId(doc._id);
  doc.numeric_id = nextId;
  await doc.save().catch(() => null);
  return nextId;
};

const formatReport = async (report) => {
  if (!report) {
    return null;
  }
  await ensureNumericId(report);
  return {
    id: report.numeric_id,
    repo_name: report.repo_name || report.repo_url,
    repo_url: report.repo_url,
    description: report.description,
    score: report.score,
    metrics: report.metrics,
    status: report.status,
    created_at: report.createdAt?.toISOString() || new Date().toISOString(),
  };
};

const listCodeAnalyses = asyncHandler(async (req, res) => {
  const reports = await CodeAnalysisReport.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(12);
  const items = await Promise.all(reports.map((report) => formatReport(report)));
  res.json({ items: items.filter(Boolean) });
});

const createCodeAnalysis = asyncHandler(async (req, res) => {
  const repoUrl = (req.body.repo_url || '').trim();
  if (!repoUrl) {
    res.status(400);
    throw new Error('Repository URL is required');
  }

  const analyses = await analyzeGithubTarget(repoUrl);
  const reports = [];

  for (const analysis of analyses) {
    const report = await CodeAnalysisReport.create({
      user: req.user._id,
      repo_url: analysis.repo_url,
      repo_name: analysis.repo_name,
      description: analysis.description,
      score: analysis.score,
      metrics: analysis.metrics,
    });
    reports.push(report);

    // Only update user stats from the first/best repo to avoid inconsistent state in one go
    if (reports.length === 1) {
      req.user.github_stats = analysis.profile_stats;
      req.user.last_analyzed_at = new Date();

      const inferredProfileUsername = extractGithubUsername(req.user.github_link) || extractGithubUsername(analysis.repo_url);
      if (!req.user.github_link && inferredProfileUsername) {
        req.user.github_link = `https://github.com/${inferredProfileUsername}`;
      }

      req.user.scores = deriveScores(req.user);
      req.user.breakdown = deriveBreakdown(req.user.scores);
      await req.user.save();

      await Activity.create({
        user: req.user._id,
        activity_type: 'github_analysis',
        title: 'GitHub repository review completed',
        description: `${analysis.repo_name} scored ${analysis.score}/100 from live GitHub signals.`,
        status: 'completed',
      }).catch(() => null);
    }
  }

  // Return the first report (most relevant) to the frontend
  res.status(201).json(await formatReport(reports[0]));
});

const getCodeAnalysisFilePreview = asyncHandler(async (req, res) => {
  const reportId = Number(req.params.reportId) || null;
  if (!reportId) {
    res.status(400);
    throw new Error('Report id is required');
  }
  const report = await CodeAnalysisReport.findOne({ numeric_id: reportId, user: req.user._id });
  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }
  const files = (report.metrics?.file_reviews || []).map((item) => ({ ...item }));
  const requestedPath = (req.query.path || '').toString();
  const review = files.find((item) => item.path === requestedPath) || files[0] || null;
  if (!review) {
    res.status(404);
    throw new Error('File review not found');
  }
  res.json({
    path: review.path,
    sha: review.sha || '',
    size: review.size || review.lines * 96,
    lines: review.lines,
    preview: review.content_preview || review.summary,
    truncated: Boolean(review.truncated),
    review,
  });
});

module.exports = {
  listCodeAnalyses,
  createCodeAnalysis,
  getCodeAnalysisFilePreview,
};
