const { callAi } = require('./aiClient');

const generateProfileAnalysis = async (user) => {
  const systemPrompt = `You are an expert technical career coach and talent analyst. 
Your goal is to provide a concise, high-impact analysis of a student's technical profile based on their resume, GitHub stats, and LeetCode performance.
Format your response as a professional summary with specific strengths and areas for improvement.
Be encouraging but objective. Use the data provided.`;

  const prompt = `Student Profile Data:
- Name: ${user.full_name || user.username}
- College: ${user.college || 'Not specified'}
- Course: ${user.course || 'Not specified'}
- Branch: ${user.branch || 'Not specified'}
- CGPA: ${user.cgpa || 'Not specified'}
- Skills: ${user.student_skills?.join(', ') || 'None listed'}
- GitHub Stats: Original: ${user.github_stats?.original || 0}, Forked: ${user.github_stats?.forked || 0}, Languages: ${user.github_stats?.top_languages?.map(l => l.name).join(', ') || 'N/A'}
- LeetCode Stats: Total Solved: ${user.leetcode_stats?.total_solved || 0}, Ranking: ${user.leetcode_stats?.ranking || 'N/A'}

Generate a professional analysis in JSON format:
{
  "summary": "2-3 sentences overview of the candidate's potential.",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["area 1", "area 2"],
  "placement_readiness": "High/Medium/Low based on data.",
  "action_plan": ["step 1", "step 2"]
}`;

  try {
    const analysis = await callAi(prompt, systemPrompt);
    return analysis;
  } catch (error) {
    console.error('Error generating profile analysis:', error);
    return null;
  }
};

module.exports = { generateProfileAnalysis };
