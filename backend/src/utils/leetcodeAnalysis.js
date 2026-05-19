
const normalizeLeetcodeUsername = (value) => {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  
  // Extract username from URL if provided
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes('leetcode.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      // Handle https://leetcode.com/username/
      // Handle https://leetcode.com/u/username/
      if (parts[0] === 'u' && parts[1]) {
        return parts[1];
      }
      return parts[0] || '';
    }
  } catch (e) {
    // Not a URL, assume it's a username or a partial path
  }
  
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (parts.length > 1 && parts[parts.length - 2] === 'u') {
      return lastPart;
    }
    return lastPart;
  }
  
  return trimmed;
};

const leetcodeRequest = async (username) => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
          reputation
          starRating
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
    }
  `;

  try {
    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SkillSense-AI',
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('LeetCode API error:', error);
    return null;
  }
};

const analyzeLeetcodeTarget = async (input) => {
  console.log(`Analyzing LeetCode target: "${input}"`);
  const username = normalizeLeetcodeUsername(input);
  console.log(`Normalized LeetCode username: "${username}"`);
  
  if (!username) return null;

  const data = await leetcodeRequest(username);
  if (!data || !data.matchedUser) {
    console.error(`LeetCode data not found for user: ${username}`);
    return null;
  }

  const { matchedUser, userContestRanking } = data;
  console.log(`LeetCode data received for ${username}. SubmitStats:`, JSON.stringify(matchedUser.submitStats));
  
  const submissions = matchedUser.submitStats?.acSubmissionNum || [];
  
  const stats = {
    username: matchedUser.username,
    ranking: matchedUser.profile?.ranking || 0,
    total_solved: submissions.find(s => s.difficulty === 'All')?.count || 0,
    easy_solved: submissions.find(s => s.difficulty === 'Easy')?.count || 0,
    medium_solved: submissions.find(s => s.difficulty === 'Medium')?.count || 0,
    hard_solved: submissions.find(s => s.difficulty === 'Hard')?.count || 0,
    contest_rating: userContestRanking?.rating || 0,
    contest_count: userContestRanking?.attendedContestsCount || 0,
    top_percentage: userContestRanking?.topPercentage || 0,
  };

  console.log(`Final LeetCode stats for ${username}:`, JSON.stringify(stats));

  // Calculate a LeetCode specific signal for scoring (0-100)
  let signal = 0;
  if (stats.total_solved > 0) {
    signal += Math.min(30, (stats.total_solved / 100) * 30);
    if (stats.total_solved > 100) {
      signal += Math.min(30, ((stats.total_solved - 100) / 200) * 30);
    }
    if (stats.total_solved > 300) {
      signal += Math.min(30, ((stats.total_solved - 300) / 500) * 30);
    }
  }
  if (stats.contest_count > 0) {
    signal += Math.min(10, stats.contest_count * 2);
  }

  return {
    stats,
    signal: Math.round(signal),
  };
};

module.exports = {
  analyzeLeetcodeTarget,
  normalizeLeetcodeUsername,
};
