const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const buildDefaultBreakdown = () => ({
  coding_skill_index: {
    problem_solving: 28,
    architecture: 22,
    testing: 20,
  },
  communication_score: {
    clarity: 24,
    articulation: 22,
    collaboration: 18,
  },
  authenticity_score: {
    honesty: 25,
    ownership: 15,
    grit: 20,
  },
  placement_ready: {
    readiness: 30,
    evidence: 20,
  },
});

const deriveBreakdown = (scores) => ({
  coding_skill_index: {
    problem_solving: clamp(Math.round((scores.coding_skill_index / 100) * 50)),
    architecture: clamp(Math.round((scores.coding_skill_index / 100) * 35)),
    testing: clamp(Math.round((scores.coding_skill_index / 100) * 45)),
  },
  communication_score: {
    clarity: clamp(Math.round((scores.communication_score / 100) * 35)),
    articulation: clamp(Math.round((scores.communication_score / 100) * 35)),
    collaboration: clamp(Math.round((scores.communication_score / 100) * 25)),
  },
  authenticity_score: {
    honesty: clamp(Math.round((scores.authenticity_score / 100) * 40)),
    ownership: clamp(Math.round((scores.authenticity_score / 100) * 40)),
    grit: clamp(Math.round((scores.authenticity_score / 100) * 30)),
  },
  placement_ready: {
    readiness: clamp(Math.round((scores.placement_ready / 100) * 55)),
    evidence: clamp(Math.round((scores.placement_ready / 100) * 40)),
  },
});

const deriveGithubInsights = (user) => {
  const stats = user.github_stats || {};
  const languages = Array.isArray(stats.top_languages)
    ? stats.top_languages.map((item) => [item.name ?? item.language ?? 'Unknown', item.value ?? 0])
    : [];

  return {
    top_languages: languages,
    forked: stats.forked ?? 0,
    original: stats.original ?? 0,
    fork_ratio: stats.fork_ratio ?? 0,
  };
};

const deriveScores = (user) => {
  const skillCount = (user.student_skills ?? []).length;
  const linkSignals = [user.github_link, user.leetcode_link, user.linkedin_link].filter(Boolean).length;
  
  // GitHub Analysis Integration
  const githubOriginal = Number(user.github_stats?.original) || 0;
  const githubLanguages = Array.isArray(user.github_stats?.top_languages) ? user.github_stats.top_languages.length : 0;
  // Weight GitHub signals
  const githubBaseSignal = Math.min(25, githubOriginal * 5 + githubLanguages * 3);
  
  // LeetCode Analysis Integration
  const leetcodeSolved = Number(user.leetcode_stats?.total_solved) || 0;
  const leetcodeRating = Number(user.leetcode_stats?.contest_rating) || 0;
  const leetcodeSignal = Math.min(35, (leetcodeSolved / 10) + (leetcodeRating > 0 ? 10 : 0));

  // Coding Score: Base 40 + skills + links + GitHub + LeetCode
  let coding = clamp(40 + (skillCount * 3) + (linkSignals * 2) + githubBaseSignal + leetcodeSignal, 40, 98);
  
  // Communication Score: Base 45 + LinkedIn signals + profile completeness
  let communication = clamp(
    45 + 
    (Number(user.linkedin_skill_count) || 0) * 1.5 + 
    (user.linkedin_headline ? 5 : 0) + 
    (user.linkedin_about ? 10 : 0) +
    (linkSignals * 2), 
    40, 
    95
  );

  // Blend in mock interview score if available
  if (typeof user.latest_interview_score === 'number' && user.latest_interview_score > 0) {
    // 1. Blend communication (interview is a direct indicator, weight 30%)
    communication = clamp(Math.round(communication * 0.7 + user.latest_interview_score * 0.3), 40, 98);

    // 2. Blend coding (if technical/system_design mode, weight 20%. If mixed mode, weight 10%)
    const mode = user.latest_interview_mode || 'mixed';
    const codingWeight = (mode === 'technical' || mode === 'system_design') ? 0.20 : (mode === 'mixed' ? 0.10 : 0);
    if (codingWeight > 0) {
      coding = clamp(Math.round(coding * (1 - codingWeight) + user.latest_interview_score * codingWeight), 40, 98);
    }
  }
  
  // Authenticity Score: Base 50 + verification + links + GitHub originality
  const authenticity = clamp(
    (user.profile_verified ? 80 : 60) + 
    (linkSignals * 4) + 
    Math.min(10, githubOriginal * 2), 
    40, 
    100
  );
  
  // Placement Ready: Weighted average
  const placement = clamp(
    Math.round((coding * 0.45 + communication * 0.35 + authenticity * 0.2)),
    40,
    98
  );

  return {
    coding_skill_index: coding,
    communication_score: communication,
    authenticity_score: authenticity,
    placement_ready: placement,
  };
};


module.exports = {
  clamp,
  buildDefaultBreakdown,
  deriveBreakdown,
  deriveGithubInsights,
  deriveScores,
};
