const { clamp } = require('./scoring');

const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.java', '.kt', '.go', '.rb', '.php',
  '.cs', '.cpp', '.cc', '.c', '.h', '.hpp', '.rs', '.swift', '.scala', '.sql', '.vue', '.svelte',
  '.html', '.css', '.scss', '.sass', '.less', '.json', '.yml', '.yaml', '.md', '.sh',
]);

const TEXT_EXTENSIONS = new Set([
  ...SOURCE_EXTENSIONS,
  '.txt', '.env', '.gitignore', '.dockerignore', '.toml', '.ini', '.lock',
]);

const MAX_PREVIEW_CHARS = 3200;
const MAX_REVIEW_FILES = 5;

const normalizeGithubInput = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }

  const sshNormalized = trimmed.replace(/^git@github\.com:/i, 'https://github.com/');
  if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+(?:\.git)?$/i.test(sshNormalized)) {
    return `https://github.com/${sshNormalized.replace(/\.git$/i, '')}`;
  }
  if (/^[a-z0-9_.-]+$/i.test(sshNormalized)) {
    return `https://github.com/${sshNormalized}`;
  }

  return sshNormalized.replace(/\.git$/i, '').replace(/\/+$/, '');
};

const parseGithubTarget = (value) => {
  const normalized = normalizeGithubInput(value);
  if (!normalized) {
    throw new Error('GitHub repository or profile URL is required');
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Enter a valid GitHub repository or profile URL');
  }

  if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) {
    throw new Error('Only github.com URLs are supported');
  }

  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 1) {
    throw new Error('Enter a GitHub repository or profile URL');
  }

  if (parts.length === 1) {
    return {
      type: 'profile',
      owner: parts[0],
      url: `https://github.com/${parts[0]}`,
    };
  }

  return {
    type: 'repo',
    owner: parts[0],
    repo: parts[1],
    url: `https://github.com/${parts[0]}/${parts[1]}`,
  };
};

const extractGithubUsername = (value) => {
  try {
    return parseGithubTarget(value).owner;
  } catch {
    return '';
  }
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const githubRequest = async (apiPath, options = {}) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SkillSense-AI',
  };
  
  if (process.env.GITHUB_TOKEN && !options.noToken) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let response = await fetch(`https://api.github.com${apiPath}`, { headers });

  // Fallback: If token is bad (401), try once without it
  if (response.status === 401 && process.env.GITHUB_TOKEN && !options.noToken) {
    console.warn('GitHub Token is invalid (401). Retrying without token...');
    return githubRequest(apiPath, { ...options, noToken: true });
  }

  if (options.allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await safeJson(response);
    const rateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';
    if (rateLimited) {
      throw new Error('GitHub API rate limit reached. Add a valid GITHUB_TOKEN or try again later.');
    }
    throw new Error(payload?.message || `GitHub request failed with status ${response.status}`);
  }

  return safeJson(response);
};

const listUserRepos = async (owner) =>
  (await githubRequest(`/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`)) || [];

const buildGithubProfileStats = (repos) => {
  const languageCounts = repos.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {});

  const original = repos.filter((repo) => !repo.fork).length;
  const forked = repos.filter((repo) => repo.fork).length;
  const total = original + forked;

  return {
    top_languages: Object.entries(languageCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value })),
    original,
    forked,
    fork_ratio: total ? Number((forked / total).toFixed(2)) : 0,
  };
};

const selectBestRepo = (repos) =>
  [...repos]
    .sort((left, right) => {
      const leftForkPenalty = left.fork ? 1 : 0;
      const rightForkPenalty = right.fork ? 1 : 0;
      if (leftForkPenalty !== rightForkPenalty) {
        return leftForkPenalty - rightForkPenalty;
      }
      const leftPushedAt = new Date(left.pushed_at || 0).getTime();
      const rightPushedAt = new Date(right.pushed_at || 0).getTime();
      if (leftPushedAt !== rightPushedAt) {
        return rightPushedAt - leftPushedAt;
      }
      if ((left.stargazers_count || 0) !== (right.stargazers_count || 0)) {
        return (right.stargazers_count || 0) - (left.stargazers_count || 0);
      }
      return (right.size || 0) - (left.size || 0);
    })
    .find((repo) => !repo.archived && !repo.disabled) || null;

const encodeRepoPath = (value) => value.split('/').map((part) => encodeURIComponent(part)).join('/');

const getExtension = (filePath) => {
  const index = filePath.lastIndexOf('.');
  return index === -1 ? '' : filePath.slice(index).toLowerCase();
};

const basename = (filePath) => {
  const pieces = filePath.split('/');
  return pieces[pieces.length - 1] || filePath;
};

const isIgnoredPath = (filePath) =>
  /(node_modules|dist|build|coverage|vendor|\.next|\.nuxt|target|bin|obj|out)\//i.test(filePath);

const isTestFile = (filePath) => /(^|\/)(__tests__|tests?|spec)\//i.test(filePath) || /\.(test|spec)\./i.test(filePath);

const isDocumentationFile = (filePath) => {
  const name = basename(filePath).toLowerCase();
  return /^readme/i.test(name) || /^license/i.test(name) || filePath.startsWith('docs/') || /\.(md|mdx|rst|txt)$/i.test(name);
};

const isConfigFile = (filePath) => {
  const name = basename(filePath).toLowerCase();
  return (
    /^package(-lock)?\.json$/.test(name) ||
    /^tsconfig(\..+)?\.json$/.test(name) ||
    /^vite\.config\./.test(name) ||
    /^webpack\.config\./.test(name) ||
    /^tailwind\.config\./.test(name) ||
    /^docker-compose/.test(name) ||
    /^\.env/.test(name) ||
    /\.(ya?ml|toml|ini)$/.test(name)
  );
};

const isCIFile = (filePath) => filePath.startsWith('.github/workflows/') || /(circleci|gitlab-ci|azure-pipelines)/i.test(filePath);

const isDockerFile = (filePath) => /^dockerfile$/i.test(basename(filePath)) || /^docker-compose/i.test(basename(filePath));

const isTextFilePath = (filePath) => {
  const name = basename(filePath).toLowerCase();
  const ext = getExtension(filePath);
  return TEXT_EXTENSIONS.has(ext) || ['dockerfile', '.gitignore', '.dockerignore'].includes(name);
};

const isSourceFile = (filePath) => {
  if (isIgnoredPath(filePath) || isTestFile(filePath) || isDocumentationFile(filePath)) {
    return false;
  }
  const ext = getExtension(filePath);
  return SOURCE_EXTENSIONS.has(ext);
};

const inferFileRole = (filePath) => {
  if (isTestFile(filePath)) {
    return 'test';
  }
  if (/(^|\/)(pages|components|ui|views)\//i.test(filePath)) {
    return 'ui';
  }
  if (/(^|\/)(controllers|routes|services|api|hooks)\//i.test(filePath)) {
    return 'service';
  }
  if (/(^|\/)(models|schema|db|config)\//i.test(filePath)) {
    return 'data';
  }
  return 'source';
};

const analyzeTree = (treeEntries) => {
  const blobs = (treeEntries || []).filter((entry) => entry.type === 'blob');
  const sourceFiles = blobs.filter((entry) => isSourceFile(entry.path));
  const testFiles = blobs.filter((entry) => isTestFile(entry.path));
  const docFiles = blobs.filter((entry) => isDocumentationFile(entry.path));
  const configFiles = blobs.filter((entry) => isConfigFile(entry.path));
  const ciFiles = blobs.filter((entry) => isCIFile(entry.path));
  const dockerFiles = blobs.filter((entry) => isDockerFile(entry.path));

  return {
    total_files: blobs.length,
    source_files: sourceFiles.length,
    test_files: testFiles.length,
    documentation_files: docFiles.length,
    configuration_files: configFiles.length,
    ci_files: ciFiles.length,
    has_readme: docFiles.some((entry) => /^readme/i.test(basename(entry.path))),
    has_license: docFiles.some((entry) => /^license/i.test(basename(entry.path))),
    has_ci: ciFiles.length > 0,
    has_docker: dockerFiles.length > 0,
    source_blob_entries: sourceFiles,
  };
};

const selectFilesForReview = (treeOverview) =>
  [...(treeOverview.source_blob_entries || [])]
    .filter((entry) => isTextFilePath(entry.path))
    .sort((left, right) => {
      const leftPriority = /(src|app|frontend\/src|backend\/src|pages|components|controllers|routes)/i.test(left.path) ? 1 : 0;
      const rightPriority = /(src|app|frontend\/src|backend\/src|pages|components|controllers|routes)/i.test(right.path) ? 1 : 0;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }
      return (right.size || 0) - (left.size || 0);
    })
    .slice(0, MAX_REVIEW_FILES);

const decodeGithubContent = (filePayload) => {
  if (!filePayload || filePayload.type !== 'file' || filePayload.encoding !== 'base64' || !filePayload.content) {
    return '';
  }
  const content = Buffer.from(filePayload.content, 'base64').toString('utf8');
  return /\u0000/.test(content) ? '' : content;
};

const countMatches = (content, expression) => (content.match(expression) || []).length;

const summarizeCommitQuality = (messages) => {
  if (!messages.length) {
    return 'Unknown';
  }
  const conventionalCount = messages.filter((message) => /^(feat|fix|docs|test|refactor|chore|build|ci)(\(.+\))?:/i.test(message)).length;
  const averageLength = messages.reduce((sum, message) => sum + message.length, 0) / messages.length;
  if (conventionalCount / messages.length >= 0.6 || averageLength >= 28) {
    return 'Strong';
  }
  if (averageLength >= 18) {
    return 'Good';
  }
  return 'Mixed';
};

const classifyCommitMessage = (message) => {
  const normalized = (message || '').toLowerCase();
  if (/^feat[:( ]/.test(normalized) || /\badd(ed)?\b/.test(normalized)) {
    return 'feature';
  }
  if (/^fix[:( ]/.test(normalized) || /\bbug\b/.test(normalized)) {
    return 'fix';
  }
  if (/^docs?[:( ]/.test(normalized)) {
    return 'docs';
  }
  if (/^test[:( ]/.test(normalized)) {
    return 'test';
  }
  if (/^refactor[:( ]/.test(normalized)) {
    return 'refactor';
  }
  if (/^(chore|build|ci)[:( ]/.test(normalized)) {
    return 'chore';
  }
  return 'other';
};

const buildCommitActivity = (commits, repo) => {
  const messages = (commits || [])
    .map((commit) => commit?.commit?.message?.split('\n')[0]?.trim())
    .filter(Boolean);
  const categories = messages.reduce((acc, message) => {
    const key = classifyCommitMessage(message);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const authors = new Set(
    (commits || [])
      .map((commit) => commit?.author?.login || commit?.commit?.author?.name)
      .filter(Boolean)
  );

  return {
    sample_size: messages.length,
    unique_authors: authors.size,
    message_quality: summarizeCommitQuality(messages),
    last_commit_at: repo?.pushed_at || commits?.[0]?.commit?.author?.date || null,
    recent_messages: messages.slice(0, 4),
    categories,
  };
};

const buildFileReview = (entry, filePayload) => {
  const content = decodeGithubContent(filePayload);
  const lines = content ? content.split(/\r?\n/).length : Math.max(1, Math.round((entry.size || 0) / 48));
  const complexitySignals = content ? countMatches(content, /\b(if|for|while|switch|case|catch|await)\b/g) : 0;
  const importSignals = content ? countMatches(content, /\b(import|require)\b/g) : 0;
  const commentSignals = content ? countMatches(content, /(\/\/|\/\*|# )/g) : 0;
  const todoSignals = content ? countMatches(content, /\b(TODO|FIXME|HACK)\b/g) : 0;
  const longLineSignals = content
    ? content.split(/\r?\n/).filter((line) => line.length > 140).length
    : 0;

  let score = 82;
  if (lines > 260) {
    score -= 10;
  }
  if (lines > 420) {
    score -= 8;
  }
  score -= Math.min(12, complexitySignals);
  score -= Math.min(8, longLineSignals);
  score -= Math.min(6, todoSignals * 2);
  score += Math.min(5, Math.round(commentSignals / 6));
  score += Math.min(4, Math.round(importSignals / 8));
  if (isTestFile(entry.path)) {
    score += 6;
  }
  score = clamp(Math.round(score), 45, 97);

  const riskLevel = score < 60 || lines > 450
    ? 'high'
    : score < 75 || lines > 250
    ? 'medium'
    : 'low';

  const strengths = [];
  if (lines <= 220) {
    strengths.push('Scoped file size keeps the module easier to review');
  }
  if (commentSignals > 0) {
    strengths.push('Includes inline documentation or intent-revealing comments');
  }
  if (importSignals > 0) {
    strengths.push('Builds on reusable modules instead of inlining everything');
  }
  if (isTestFile(entry.path)) {
    strengths.push('Directly contributes automated test coverage');
  }
  if (strengths.length === 0) {
    strengths.push('Structure is readable enough for a quick engineering pass');
  }

  const risks = [];
  if (lines > 260) {
    risks.push('Large file size will make maintenance and testing harder');
  }
  if (complexitySignals > 10) {
    risks.push('Control-flow density suggests logic that should be split or simplified');
  }
  if (todoSignals > 0) {
    risks.push('TODO or FIXME markers indicate unfinished work in the reviewed file');
  }
  if (longLineSignals > 0) {
    risks.push('Very long lines reduce readability and often hide dense logic');
  }
  if (risks.length === 0) {
    risks.push('No major structural risk was detected in this sampled file');
  }

  const summary = `${basename(entry.path)} scored ${score}/100 from size, structure, and readability heuristics.`;

  return {
    path: entry.path,
    role: inferFileRole(entry.path),
    score,
    risk_level: riskLevel,
    lines,
    strengths,
    risks,
    summary,
    ai_generated: 'heuristic',
    ai_confidence: Number((0.58 + score / 250).toFixed(2)),
    ai_rationale: `Heuristic review considered file size, control-flow density, inline documentation, and maintenance signals for ${entry.path}.`,
    issues: {
      complexity_signals: complexitySignals,
      todo_markers: todoSignals,
      long_lines: longLineSignals,
    },
    sha: filePayload?.sha || '',
    size: filePayload?.size || entry.size || 0,
    truncated: content.length > MAX_PREVIEW_CHARS,
    content_preview: content ? content.slice(0, MAX_PREVIEW_CHARS) : summary,
  };
};

const buildArchitectureTags = (repo, languages, treeOverview) => {
  const tags = [];
  const languageTags = (languages || []).slice(0, 3);
  languageTags.forEach((language) => tags.push(language));
  if (treeOverview.has_ci) {
    tags.push('CI');
  }
  if (treeOverview.test_files > 0) {
    tags.push('Tests');
  }
  if (treeOverview.has_docker) {
    tags.push('Docker');
  }
  if ((repo.topics || []).some((topic) => /react/i.test(topic)) || (languages || []).includes('TypeScript')) {
    tags.push('Frontend');
  }
  if (treeOverview.configuration_files > 0) {
    tags.push('Configured');
  }
  return [...new Set(tags)].slice(0, 6);
};

const buildRecommendations = (treeOverview, commitActivity, fileReviews, repo) => {
  const items = [];
  if (treeOverview.test_files === 0) {
    items.push('Add automated tests around the main product flows or service layer.');
  }
  if (!treeOverview.has_ci) {
    items.push('Add a CI workflow for linting and tests on every push.');
  }
  if (fileReviews.some((review) => review.risk_level === 'high')) {
    items.push('Break down the largest files into smaller modules or hooks.');
  }
  if (!treeOverview.has_readme) {
    items.push('Add a README that explains setup, architecture, and run commands.');
  }
  if (repo.fork) {
    items.push('Show more original implementation work to improve originality confidence.');
  }
  if ((commitActivity.sample_size || 0) < 3) {
    items.push('Push work in smaller, more regular increments to create clearer engineering history.');
  }
  return items.slice(0, 4);
};

const buildStrengths = (treeOverview, commitActivity, repo, languages) => {
  const items = [];
  if (treeOverview.has_readme) {
    items.push('Repository includes top-level documentation.');
  }
  if (treeOverview.test_files > 0) {
    items.push(`Detected ${treeOverview.test_files} test files in the default branch.`);
  }
  if ((commitActivity.sample_size || 0) >= 5) {
    items.push('Recent commit history provides enough signal for engineering review.');
  }
  if ((languages || []).length >= 2) {
    items.push('Technology stack is broad enough to show more than one engineering surface.');
  }
  if (!repo.fork) {
    items.push('Repository appears to be original rather than a fork.');
  }
  return items.slice(0, 4);
};

const buildRisks = (treeOverview, commitActivity, fileReviews, repo) => {
  const items = [];
  if (treeOverview.test_files === 0) {
    items.push('No test files were detected in the analyzed branch.');
  }
  if (!treeOverview.has_ci) {
    items.push('No CI workflow was found, so quality checks depend on manual discipline.');
  }
  if (fileReviews.some((review) => review.risk_level === 'high')) {
    items.push('At least one sampled file has high maintenance risk due to size or complexity.');
  }
  if ((commitActivity.sample_size || 0) < 3) {
    items.push('Recent commit history is sparse, which lowers confidence in cadence and ownership.');
  }
  if (repo.fork) {
    items.push('The repository is a fork, so originality signals are weaker.');
  }
  return items.slice(0, 4);
};

const buildMetrics = ({ repo, languagesPayload, treeOverview, commitActivity, fileReviews, profileStats }) => {
  const sortedLanguages = Object.entries(languagesPayload || {}).sort((left, right) => right[1] - left[1]);
  const languages = sortedLanguages.map(([name]) => name).slice(0, 6);

  const averageFileScore = fileReviews.length
    ? Math.round(fileReviews.reduce((sum, review) => sum + review.score, 0) / fileReviews.length)
    : 68;
  const testingScore = clamp(
    48 + Math.min(28, treeOverview.test_files * 7) + (treeOverview.has_ci ? 8 : 0),
    35,
    96
  );
  const documentationScore = clamp(
    45 + (treeOverview.has_readme ? 22 : 0) + (treeOverview.documentation_files > 1 ? 10 : 0) + (treeOverview.has_license ? 6 : 0),
    35,
    95
  );
  const architectureScore = clamp(
    55 + Math.min(18, treeOverview.configuration_files * 3) + Math.min(10, languages.length * 2) + (treeOverview.has_docker ? 5 : 0),
    40,
    96
  );
  const securityScore = clamp(
    58 + (treeOverview.has_ci ? 10 : 0) + (treeOverview.has_license ? 4 : 0) + (treeOverview.has_docker ? 3 : 0) - Math.min(8, repo.open_issues_count || 0),
    45,
    94
  );
  const originalityBase = repo.fork ? 48 : 72;
  const originalityScore = clamp(
    originalityBase + Math.min(10, Math.round((repo.stargazers_count || 0) / 10)) + Math.round((1 - (profileStats?.fork_ratio || 0)) * 8),
    35,
    96
  );
  const maintainabilityScore = clamp(
    averageFileScore + (treeOverview.test_files > 0 ? 4 : 0) + (treeOverview.has_readme ? 3 : 0),
    40,
    97
  );
  const engineeringScore = clamp(
    Math.round(
      maintainabilityScore * 0.28 +
      testingScore * 0.18 +
      documentationScore * 0.15 +
      architectureScore * 0.18 +
      securityScore * 0.11 +
      originalityScore * 0.10
    ),
    40,
    98
  );

  const strengths = buildStrengths(treeOverview, commitActivity, repo, languages);
  const risks = buildRisks(treeOverview, commitActivity, fileReviews, repo);
  const recommendations = buildRecommendations(treeOverview, commitActivity, fileReviews, repo);

  return {
    engineering_score: engineeringScore,
    maintainability_score: maintainabilityScore,
    security_score: securityScore,
    testing_score: testingScore,
    documentation_score: documentationScore,
    architecture_score: architectureScore,
    originality_score: originalityScore,
    ai_generated: 'heuristic',
    ai_confidence: 0.76,
    languages,
    files_analyzed: fileReviews.length,
    lines_analyzed: fileReviews.reduce((sum, review) => sum + (review.lines || 0), 0),
    tree_overview: {
      total_files: treeOverview.total_files,
      source_files: treeOverview.source_files,
      test_files: treeOverview.test_files,
      documentation_files: treeOverview.documentation_files,
      configuration_files: treeOverview.configuration_files,
      ci_files: treeOverview.ci_files,
      has_readme: treeOverview.has_readme,
      has_license: treeOverview.has_license,
      has_ci: treeOverview.has_ci,
      has_docker: treeOverview.has_docker,
    },
    commit_activity: commitActivity,
    architecture: buildArchitectureTags(repo, languages, treeOverview),
    strengths,
    risks,
    recommendations,
    file_reviews: fileReviews,
    ai_review: {
      summary: `${repo.full_name} scored ${engineeringScore}/100 from live GitHub repository signals, sampled files, commit history, and project structure.`,
      strengths,
      concerns: risks,
      next_steps: recommendations,
    },
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    open_issues: repo.open_issues_count || 0,
    default_branch: repo.default_branch || 'main',
    pushed_at: repo.pushed_at || null,
  };
};

const analyzeSingleRepo = async (repo, allRepos = []) => {
  const [languagesPayload, commits, treePayload] = await Promise.all([
    githubRequest(`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/languages`),
    githubRequest(`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/commits?per_page=20`),
    githubRequest(`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/git/trees/${encodeURIComponent(repo.default_branch || 'main')}?recursive=1`),
  ]);

  const treeOverview = analyzeTree(treePayload?.tree || []);
  const commitActivity = buildCommitActivity(commits || [], repo);
  const profileStats = buildGithubProfileStats(allRepos.length ? allRepos : [repo]);
  const reviewEntries = selectFilesForReview(treeOverview);
  const filePayloads = await Promise.all(
    reviewEntries.map((entry) =>
      githubRequest(
        `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/contents/${encodeRepoPath(entry.path)}?ref=${encodeURIComponent(repo.default_branch || 'main')}`,
        { allow404: true }
      )
    )
  );
  const fileReviews = reviewEntries.map((entry, index) => buildFileReview(entry, filePayloads[index]));
  const metrics = buildMetrics({
    repo,
    languagesPayload,
    treeOverview,
    commitActivity,
    fileReviews,
    profileStats,
  });

  return {
    repo_url: repo.html_url,
    repo_name: repo.full_name,
    description: repo.description || `Live GitHub analysis for ${repo.full_name}.`,
    score: metrics.engineering_score,
    metrics,
    profile_stats: profileStats,
  };
};

const analyzeGithubTarget = async (input) => {
  console.log(`Analyzing GitHub target: "${input}"`);
  const target = parseGithubTarget(input);
  console.log(`Parsed target:`, JSON.stringify(target));

  const owner = (target.owner || '').trim();
  const repoName = (target.repo || '').trim();

  if (target.type === 'repo') {
    const repo = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`);
    const repos = await listUserRepos(owner || repo.owner?.login);
    return [await analyzeSingleRepo(repo, repos)];
  }

  // Profile mode: analyze top 5 repos sorted by originality, popularity, and recent push dates
  const allRepos = await listUserRepos(owner);
  if (!allRepos || allRepos.length === 0) {
    throw new Error('No public GitHub repositories were found for this profile.');
  }

  const topRepos = [...allRepos]
    .filter((r) => !r.archived && !r.disabled)
    .sort((left, right) => {
      // 1. Prioritize original repos over forks
      const leftForkPenalty = left.fork ? 1 : 0;
      const rightForkPenalty = right.fork ? 1 : 0;
      if (leftForkPenalty !== rightForkPenalty) {
        return leftForkPenalty - rightForkPenalty;
      }
      // 2. Prioritize repositories with stars and forks (popular ones)
      const leftPopularity = (left.stargazers_count || 0) + (left.forks_count || 0) * 2;
      const rightPopularity = (right.stargazers_count || 0) + (right.forks_count || 0) * 2;
      if (leftPopularity !== rightPopularity) {
        return rightPopularity - leftPopularity;
      }
      // 3. Fall back to push date (recent activity)
      const leftPushedAt = new Date(left.pushed_at || 0).getTime();
      const rightPushedAt = new Date(right.pushed_at || 0).getTime();
      return rightPushedAt - leftPushedAt;
    })
    .slice(0, 5);

  const results = [];
  for (const repo of topRepos) {
    try {
      results.push(await analyzeSingleRepo(repo, allRepos));
    } catch (err) {
      console.error(`Failed to analyze repo ${repo.full_name}:`, err);
    }
  }

  if (results.length === 0) {
    throw new Error('Unable to analyze any repositories for this profile.');
  }

  return results;
};

module.exports = {
  analyzeGithubTarget,
  extractGithubUsername,
  parseGithubTarget,
  normalizeGithubInput,
};
