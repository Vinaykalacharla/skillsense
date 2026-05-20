const { callAi } = require('./aiClient');

/**
 * Generates a detailed ATS score and improvement analysis for a student's resume
 * @param {string} resumeText - The extracted text of the resume
 * @param {object} user - User metadata (branch, course, skills) for context
 */
const generateAtsReport = async (resumeText, user = {}) => {
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      error: 'Resume text is too short or empty for ATS analysis.',
      ats_score: 0,
      breakdown: { formatting: 0, keywords: 0, structure: 0 },
      checklist: [],
      missing_keywords: [],
      improvements: { header: [], summary: [], experience: [], skills: [], formatting: [] }
    };
  }

  const systemPrompt = `You are a premium, state-of-the-art AI resume reviewer and ATS (Applicant Tracking System) parser expert.
Your task is to analyze the provided resume text against modern ATS standards for tech and engineering roles.
Evaluate the resume objectively, identify issues, calculate an overall score (0-100), breakdown scores (formatting, keywords, structure), and provide highly specific, actionable advice on EXACTLY what changes the student should make.

You must return a valid JSON object matching the exact schema specified in the prompt. Do not add any text before or after the JSON.`;

  const studentContext = `
Student Background Context (if available):
- Course: ${user.course || 'Engineering/Tech'}
- Branch/Major: ${user.branch || 'Computer Science/IT'}
- Skills listed on profile: ${user.student_skills?.join(', ') || 'N/A'}
- GitHub: ${user.github_link || 'Not linked'}
- LinkedIn: ${user.linkedin_link || 'Not linked'}
`;

  const prompt = `
Resume Text:
"""
${resumeText.substring(0, 8000)}
"""
${studentContext}

Analyze the resume text for ATS compatibility and construct a detailed report in the following JSON format:
{
  "ats_score": number, // Overall score out of 100
  "breakdown": {
    "formatting": number, // Formatting score out of 100
    "keywords": number, // Keyword optimization score out of 100
    "structure": number // Structural integrity score out of 100
  },
  "checklist": [
    {
      "id": "single_column",
      "label": "Single-Column Layout Recommended",
      "passed": true/false,
      "details": "Explanation of whether the layout appears to be single-column and parseable, or if it has complex multi-column elements."
    },
    {
      "id": "no_images",
      "label": "No Tables, Images, or Graphs",
      "passed": true/false,
      "details": "Checking if any tables, charts, diagrams, or icons are present which could fail older parser engines."
    },
    {
      "id": "standard_headers",
      "label": "Standard Section Headings",
      "passed": true/false,
      "details": "Verify if the resume uses standard headings like 'Experience', 'Education', 'Projects', and 'Skills' rather than creative but non-standard titles."
    },
    {
      "id": "contact_info",
      "label": "Contact Info & Profile Links",
      "passed": true/false,
      "details": "Check if email, phone number, and standard professional links (GitHub, LinkedIn) are clearly listed."
    },
    {
      "id": "selectable_text",
      "label": "Selectable text",
      "passed": true/false,
      "details": "Assuming true for parsed text, but check if text looks corrupted or has un-parseable Unicode characters."
    }
  ],
  "missing_keywords": ["keyword1", "keyword2", "keyword3"], // 5 to 10 highly relevant developer, framework, tool, or methodology keywords missing in the resume but standard for their profile branch (e.g. Docker, RESTful APIs, Git, Agile, TypeScript, CI/CD, Jest)
  "improvements": {
    "header": [
      {
        "issue": "Brief description of the issue in the header/links section",
        "suggestion": "Highly specific recommendation on what changes they should make (e.g., 'Add your GitHub profile URL in the format github.com/username')"
      }
    ],
    "summary": [
      {
        "issue": "Brief description of issue with the summary/objective",
        "suggestion": "Highly specific recommendation on what changes to make (e.g., 'Keep your summary under 3 sentences and focus on technical specializations rather than soft skills')"
      }
    ],
    "experience": [
      {
        "issue": "Brief description of issue in project/experience descriptions",
        "suggestion": "Highly specific recommendation on what changes to make (e.g., 'Rewrite the bullet points using the STAR method (Situation, Task, Action, Result) and include metrics like percentages or durations')"
      }
    ],
    "skills": [
      {
        "issue": "Brief description of issue with the skills section",
        "suggestion": "Highly specific recommendation on what changes to make (e.g., 'Group your skills into categories like Frontend, Backend, Languages, and Tools rather than a long un-grouped list')"
      }
    ],
    "formatting": [
      {
        "issue": "Brief description of any other layout, date format, or page count issue",
        "suggestion": "Highly specific recommendation on what changes to make (e.g., 'Format all dates in standard MM/YYYY - MM/YYYY or MM/YYYY - Present format to ensure date calculators parse them correctly')"
      }
    ]
  }
}

Ensure all suggestions are constructive, encouraging, and tell the student EXACTLY what action/edit they need to take. Do not output anything other than this JSON.`;

  try {
    const report = await callAi(prompt, systemPrompt);
    report.analyzed_at = new Date().toISOString();
    return report;
  } catch (error) {
    console.error('Error generating ATS report:', error);
    return {
      error: 'Failed to complete AI-driven ATS analysis. Please try again.',
      ats_score: 0,
      breakdown: { formatting: 0, keywords: 0, structure: 0 },
      checklist: [],
      missing_keywords: [],
      improvements: { header: [], summary: [], experience: [], skills: [], formatting: [] }
    };
  }
};

module.exports = { generateAtsReport };
