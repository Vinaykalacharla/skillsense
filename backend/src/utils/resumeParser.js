const fs = require('fs');
const pdf = require('pdf-parse');
const { callAi } = require('./aiClient');

const extractTextFromFile = async (filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path provided to extractTextFromFile:', filePath);
      return '';
    }

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return '';
    }

    const dataBuffer = fs.readFileSync(filePath);
    const extension = filePath.split('.').pop().toLowerCase();

    if (extension === 'pdf') {
      try {
        // Handle the newer class-based API (pdf-parse 2.x)
        if (typeof pdf === 'object' && pdf.PDFParse) {
          const parser = new pdf.PDFParse({ data: dataBuffer });
          const result = await parser.getText();
          return result.text;
        }
        
        // Handle the classic function-based API (pdf-parse 1.x)
        if (typeof pdf === 'function') {
          const data = await pdf(dataBuffer);
          return data.text;
        }

        // Fallback for some other variants
        const data = await pdf(dataBuffer);
        return data.text;
      } catch (err) {
        console.error('Error extracting PDF text:', err);
        return '';
      }
    } else if (extension === 'txt') {
      return dataBuffer.toString();
    } else {
      // Fallback for other text-based extensions
      return dataBuffer.toString();
    }
  } catch (err) {
    console.error('Unhandled error in extractTextFromFile:', err);
    return '';
  }
};

const parseResume = async (filePath) => {
  try {
    console.log(`Starting resume parsing for: ${filePath}`);
    const extractedText = await extractTextFromFile(filePath);
    console.log(`Extracted ${extractedText.length} characters from resume.`);

    if (!extractedText || extractedText.trim().length < 50) {
      console.error('Resume extraction failed or text too short');
      return null;
    }

    // DEBUG: Save extracted text to a file for verification
    try {
      const debugPath = filePath + '.txt';
      fs.writeFileSync(debugPath, extractedText);
      console.log('DEBUG: Extracted text saved to:', debugPath);
    } catch (e) {
      console.error('DEBUG: Failed to save debug text:', e);
    }

    // REGEX FALLBACKS for critical fields
    const githubMatch = extractedText.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
    const leetcodeMatch = extractedText.match(/leetcode\.com\/u\/([a-zA-Z0-9_-]+)/i) || extractedText.match(/leetcode\.com\/([a-zA-Z0-9_-]+)/i);
    const linkedinMatch = extractedText.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    const cgpaMatch = extractedText.match(/(?:C\.?G\.?P\.?A\.?|GPA|Pointer)[:\s]+(\d+(?:\.\d+)?)/i);

    const systemPrompt = `You are an expert AI resume parser. 
Extract the following information from the resume text into a VALID JSON object.
Rules:
1. Return ONLY the JSON object.
2. Use null if a field is not found.
3. Extract college/university name, course/degree, branch/major, CGPA (as a number, e.g., 8.5), year of study, skills (as an array), and professional links (GitHub, LeetCode, LinkedIn, etc.).
4. For links, return the FULL URL if found.
5. If you find multiple colleges, use the most recent one.
6. For skills, extract technical skills, programming languages, and tools.
7. Pay special attention to links like github.com/username and leetcode.com/username.`;

    const prompt = `RESUME TEXT:
"""
${extractedText.substring(0, 8000)}
"""

Extract the details in this JSON format:
{
  "full_name": "string",
  "college": "string",
  "course": "string",
  "branch": "string",
  "year_of_study": "string",
  "cgpa": number,
  "student_skills": ["skill1", "skill2"],
  "github_link": "url",
  "leetcode_link": "url",
  "linkedin_link": "url",
  "codechef_link": "url",
  "hackerrank_link": "url",
  "codeforces_link": "url",
  "gfg_link": "url",
  "linkedin_headline": "string",
  "linkedin_about": "string"
}`;

    let result = await callAi(prompt, systemPrompt);
    console.log('AI Resume Parsing Result:', JSON.stringify(result, null, 2));

    if (!result) result = {};

    // Apply regex fallbacks if AI missed them
    if (!result.github_link && githubMatch) result.github_link = `https://github.com/${githubMatch[1]}`;
    if (!result.leetcode_link && leetcodeMatch) result.leetcode_link = `https://leetcode.com/${leetcodeMatch[1]}`;
    if (!result.linkedin_link && linkedinMatch) result.linkedin_link = `https://linkedin.com/in/${linkedinMatch[1]}`;
    if (!result.cgpa && cgpaMatch) result.cgpa = parseFloat(cgpaMatch[1]);

    return result;
  } catch (error) {
    console.error('Error parsing resume:', error);
    return null;
  }
};

module.exports = { parseResume, extractTextFromFile };
