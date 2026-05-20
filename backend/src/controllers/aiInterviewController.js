const asyncHandler = require('express-async-handler');
const AiInterviewSession = require('../models/aiInterviewSessionModel');
const { callAi } = require('../utils/aiClient');

const QUESTION_LIBRARY = [
  {
    question: 'Tell me about a project that showcases your ownership.',
    difficulty: 'medium',
    competency: 'ownership',
    panelist: 'Hiring Manager',
    evaluation_focus: 'ownership',
  },
  {
    question: 'Walk me through how you debug a tough production issue.',
    difficulty: 'medium',
    competency: 'problem solving',
    panelist: 'System Lead',
    evaluation_focus: 'problem_solving',
  },
  {
    question: 'How do you make sure your teammates understand your trade-offs?',
    difficulty: 'medium',
    competency: 'communication',
    panelist: 'Engineering Manager',
    evaluation_focus: 'communication',
  },
  {
    question: 'Share how you built something from scratch with measurable impact.',
    difficulty: 'hard',
    competency: 'architecture',
    panelist: 'Architect',
    evaluation_focus: 'architecture',
  },
];

const buildDefaults = (user) => ({
  target_role: 'Software Engineer',
  seniority: 'new_grad',
  company_style: 'product',
  interview_mode: 'mixed',
  focus_areas: ['problem solving', 'communication', 'system design'],
  question_count: 6,
  answer_time_sec: 120,
  max_followups: 3,
  headline: user.linkedin_headline || user.full_name || user.username,
});

const toNumericId = (value) => {
  if (!value) return Date.now();
  const hex = value.toString();
  return Number.parseInt(hex.slice(-6), 16) || Number.parseInt(hex, 16) || Date.now();
};

const buildQuestions = (profile) => {
  const targetCount = profile.question_count || 6;
  const queue = [];
  let idx = 0;
  while (queue.length < targetCount) {
    const template = QUESTION_LIBRARY[idx % QUESTION_LIBRARY.length];
    queue.push({
      ...template,
      question: `${template.question} (Q${queue.length + 1})`,
      evaluation_focus: profile.focus_areas[idx % profile.focus_areas.length] || template.evaluation_focus,
    });
    idx += 1;
  }
  return queue;
};

const generateQuestionsWithAi = async (profile) => {
  const targetCount = profile.question_count || 6;
  try {
    const systemPrompt = `You are an elite technical interviewer. Generate a structured list of interview questions.
You must return a JSON object with a single key "questions" which is an array of objects.
Each object in the array must contain:
- question (string: the actual question)
- difficulty (string: "easy", "medium", or "hard")
- competency (string: a single category like "coding", "architecture", "problem solving", "communication", "leadership")
- panelist (string: name/role of the panelist asking it, e.g. "System Lead", "Hiring Manager", "Product Manager", "Architect")
- evaluation_focus (string: what this question evaluates, e.g. "scalability", "star methodology", "data structures", "teamwork")

Generate exactly the number of questions requested (${targetCount}), customized for:
Role: ${profile.target_role || 'Software Engineer'}
Seniority: ${profile.seniority || 'new_grad'}
Company Style: ${profile.company_style || 'product'}
Mode: ${profile.interview_mode || 'mixed'}
Focus Areas: ${(profile.focus_areas || []).join(', ')}

Ensure the questions are challenging, professional, and diverse. Do not return any text before or after the JSON.`;

    const prompt = `Generate exactly ${targetCount} interview questions for a ${profile.seniority} ${profile.target_role} role.`;
    
    const response = await callAi(prompt, systemPrompt);
    if (response && Array.isArray(response.questions) && response.questions.length > 0) {
      return response.questions.map((q, idx) => ({
        ...q,
        question: q.question.includes(`(Q${idx + 1})`) ? q.question : `${q.question} (Q${idx + 1})`,
      }));
    }
  } catch (err) {
    console.error('AI question generation failed, falling back to library:', err);
  }
  
  return buildQuestions(profile);
};

const evaluateAnswer = async (message, questionContext = '') => {
  const wordCount = message.split(/\s+/).filter(Boolean).length;
  
  if (wordCount < 5) {
    return {
      word_count: wordCount,
      points: 5,
      sentiment: 'neutral',
      strength: 'Direct response',
      improvement: 'Provide more detail and examples',
      quality_score: 25,
      coach_summary: 'The response is too brief. Try to explain your experiences and engineering choices in more detail.',
      rubric: {
        communication: 2,
        technical_depth: 1,
        problem_solving: 2
      },
      red_flags: ['Extremely brief response']
    };
  }

  try {
    const systemPrompt = `You are an expert technical interviewer. Evaluate the candidate's response to an interview question.
Return a JSON object with:
- points (number 5-20 based on depth, relevance, and accuracy)
- sentiment (string: "positive", "neutral", "negative")
- strength (string: one key strength of the answer)
- improvement (string: one specific way to improve)
- quality_score (number 0-100: overall grade of this specific response)
- coach_summary (string: 2-3 sentences explaining your grade and how to improve)
- rubric (object: sub-metric scores out of 10, containing "communication", "technical_depth", "problem_solving")
- red_flags (array of strings: any red flags like "poor communication", "factual error", or empty if none)

Focus on evidence of ownership, technical clarity, and impact.`;

    const prompt = `Question/Context: ${questionContext}\nCandidate's Answer: ${message}`;
    
    const analysis = await callAi(prompt, systemPrompt);
    return {
      ...analysis,
      word_count: wordCount,
    };
  } catch (error) {
    console.error('AI evaluation failed, falling back to heuristic:', error);
    const points = Math.min(20, Math.max(5, Math.round(wordCount * 0.9)));
    return {
      word_count: wordCount,
      points,
      sentiment: wordCount > 12 ? 'positive' : 'neutral',
      strength: 'Clear ownership signal',
      improvement: 'Add measurable outcomes',
      quality_score: Math.min(100, points * 5),
      coach_summary: 'Decent attempt. Try structuring your response using the STAR method for maximum impact.',
      rubric: {
        communication: Math.min(10, Math.round(points / 2)),
        technical_depth: Math.min(10, Math.round(points / 2.2)),
        problem_solving: Math.min(10, Math.round(points / 2))
      },
      red_flags: []
    };
  }
};

const generateFinalVerdict = async (answers, profile) => {
  if (!answers || !answers.length) {
    return {
      strengths: ['Started session'],
      improvements: ['Complete the questions to see analysis'],
      red_flags: [],
      next_steps: ['Answer mock questions to build signal'],
      readiness_score: 20,
      recommendation: 'Needs Practice',
      competency_scores: {
        communication: 20,
        'problem solving': 20
      },
      highlights: []
    };
  }

  try {
    const transcriptSummaryText = answers.map((ans, idx) => {
      return `Q${idx + 1}: ${ans.question}\nA: ${ans.answer}\nScore: ${ans.points}/20. Strength: ${ans.analysis?.strength || ''}. Improvement: ${ans.analysis?.improvement || ''}.`;
    }).join('\n\n');

    const focusAreas = profile.focus_areas || ['problem solving', 'communication'];
    const competencyKeys = focusAreas.map(f => `"${f}"`).join(', ');

    const systemPrompt = `You are the lead panel reviewer at a top tech company. Evaluate the candidate's complete interview transcript.
Return a JSON object with:
- readiness_score (number: overall placement readiness 0-100)
- strengths (array of strings: 2-3 specific strengths shown in their answers)
- improvements (array of strings: 2-3 specific areas they need to work on)
- red_flags (array of strings: any potential red flags, or empty if none)
- next_steps (array of strings: 2-3 actionable advice steps for preparation)
- competency_scores (object: mapping of focus areas to scores between 20-100, e.g. if focus areas are [${competencyKeys}], return scores for these keys)
- highlights (array of strings: 1-2 notable positive moments or details from the transcript)
- recommendation (string: one of "Strong Hire", "Hire", "Needs Practice", or "Not Ready")

Be objective, constructive, and base your analysis strictly on the candidate's answers.`;

    const prompt = `Interview Target:
Role: ${profile.target_role}
Seniority: ${profile.seniority}
Company Style: ${profile.company_style}

Transcript Details:
${transcriptSummaryText}`;

    const verdict = await callAi(prompt, systemPrompt);
    if (verdict && typeof verdict.readiness_score === 'number') {
      return verdict;
    }
  } catch (err) {
    console.error('Failed to generate AI final verdict, falling back:', err);
  }

  const totalPoints = answers.reduce((sum, a) => sum + (a.points || 0), 0);
  const maxPoints = answers.length * 20;
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 40;
  const readiness = Math.min(100, Math.max(20, percentage));
  
  return {
    strengths: [`${profile.target_role || 'Software Engineer'} communication`],
    improvements: ['Structure answers with impact and metrics'],
    red_flags: readiness < 60 ? ['Answers were brief'] : [],
    next_steps: ['Review transcript and rehearse follow-ups'],
    readiness_score: readiness,
    recommendation: readiness >= 75 ? 'Hire' : 'Needs Practice',
    competency_scores: (profile.focus_areas || []).reduce((acc, focus) => {
      acc[focus] = readiness;
      return acc;
    }, {}),
    highlights: [`Completed ${answers.length} questions`],
  };
};

const buildSummary = (answers, questions, profile, score) => {
  const readiness = Math.min(100, Math.max(20, score));
  return {
    strengths: [`${profile.target_role || 'Software Engineer'} communication`],
    improvements: ['Structure answers with impact and metrics'],
    red_flags: readiness < 60 ? ['Needs more practice'] : [],
    next_steps: ['Review transcript and rehearse follow-ups'],
    readiness_score: readiness,
    recommendation: readiness >= 75 ? 'Ready for recruiter review' : 'Practice more mock interviews',
    competency_scores: {
      communication: Math.min(100, readiness + 5),
      problem_solving: Math.min(100, readiness),
      authenticity: Math.min(100, readiness - 5),
    },
    highlights: [`Focused on ${profile.focus_areas?.[0] || 'problem solving'}`],
  };
};

const buildMetrics = (score) => [
  { label: 'Confidence', value: Math.min(100, score + 8), color: 'primary' },
  { label: 'Clarity', value: Math.min(100, score + 3), color: 'accent' },
  { label: 'Impact', value: Math.max(10, Math.min(100, score - 2)), color: 'primary' },
];

const buildFeedback = (analysis) => [
  { type: 'strength', text: analysis.strength },
  { type: 'improvement', text: analysis.improvement },
];

const buildTips = (answers, summary) =>
  summary.next_steps.length
    ? summary.next_steps
    : answers.length
      ? ['Keep practicing to improve pacing']
      : ['Start the interview to generate signals'];

const buildHistoryPayload = async (user) => {
  const sessions = await AiInterviewSession.find({ user: user._id, status: 'completed' })
    .sort({ updatedAt: -1 })
    .limit(6);
  return sessions.map((session) => {
    const summary = session.summary || {};
    return {
      id: toNumericId(session._id),
      status: session.status,
      score: Math.round(summary.readiness_score || session.score || 0),
      answered: (session.answers || []).length,
      questions: (session.questions || []).length,
      started_at: session.createdAt?.toISOString() || null,
      completed_at: session.completed_at?.toISOString() || null,
      strengths: (summary.strengths || []).slice(0, 2),
      improvements: (summary.improvements || []).slice(0, 2),
      target_role: session.session_profile?.target_role,
      interview_mode: session.session_profile?.interview_mode,
      readiness_score: summary.readiness_score ?? 0,
      recommendation: summary.recommendation,
    };
  });
};

const buildSessionState = (session, defaults) => ({
  total_questions: (session.questions || []).length,
  current_index: session.current_index ?? 0,
  current_question: session.questions?.[session.current_index]?.question || null,
  current_difficulty: session.questions?.[session.current_index]?.difficulty || null,
  current_competency: session.questions?.[session.current_index]?.competency || null,
  current_panelist: session.questions?.[session.current_index]?.panelist || null,
  current_focus: session.questions?.[session.current_index]?.evaluation_focus || null,
  score: session.score ?? 0,
  answer_time_sec: defaults.answer_time_sec || 120,
});

const buildSessionPayload = async (user, session) => {
  const setup_defaults = buildDefaults(user);
  const history = await buildHistoryPayload(user);
  if (!session) {
    return {
      status: 'idle',
      transcript: [],
      feedback: [],
      metrics: [],
      tips: [],
      history,
      session_profile: setup_defaults,
      summary: {},
      latest_analysis: {},
      setup_defaults,
      answers: [],
      questions: [],
      ...buildSessionState({ questions: [], current_index: 0, score: 0 }, setup_defaults),
    };
  }
  const summary = session.summary || {};
  const latest_analysis = session.latest_analysis || {};
  return {
    status: session.status,
    transcript: session.transcript || [],
    feedback: session.feedback || [],
    metrics: session.metrics || buildMetrics(session.score || 0),
    tips: session.tips || buildTips(session.answers || [], summary),
    history,
    session_profile: session.session_profile || setup_defaults,
    summary,
    latest_analysis,
    setup_defaults,
    updated_at: session.updatedAt?.toISOString(),
    answers: session.answers || [],
    questions: session.questions || [],
    ...buildSessionState(session, session.session_profile || setup_defaults),
  };
};

const getInterviewSession = asyncHandler(async (req, res) => {
  const session = await AiInterviewSession.findOne({ user: req.user._id }).sort({ updatedAt: -1 });
  const payload = await buildSessionPayload(req.user, session);
  res.json(payload);
});

const handleInterviewAction = asyncHandler(async (req, res) => {
  const action = req.body.action;
  if (!action) {
    res.status(400);
    throw new Error('Action required');
  }
  if (action === 'start') {
    const profile = {
      target_role: req.body.target_role || 'Software Engineer',
      seniority: req.body.seniority || 'new_grad',
      company_style: req.body.company_style || 'product',
      interview_mode: req.body.interview_mode || 'mixed',
      focus_areas: Array.isArray(req.body.focus_areas) && req.body.focus_areas.length
        ? req.body.focus_areas
        : ['problem solving', 'communication'],
      question_count: Number(req.body.question_count) || 6,
      answer_time_sec: Number(req.body.answer_time_sec) || 120,
      max_followups: Number(req.body.max_followups) || 3,
    };
    await AiInterviewSession.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'completed', completed_at: new Date(), updatedAt: new Date() },
    );
    const questions = await generateQuestionsWithAi(profile);
    const transcript = [];
    if (questions.length) {
      transcript.push({
        speaker: 'AI',
        text: questions[0].question,
        difficulty: questions[0].difficulty,
        panelist: questions[0].panelist,
        competency: questions[0].competency,
        question_index: 0,
        evaluation_focus: questions[0].evaluation_focus,
      });
    }
    const session = await AiInterviewSession.create({
      user: req.user._id,
      status: 'active',
      transcript,
      session_profile: profile,
      setup_defaults: profile,
      questions,
      answers: [],
      current_index: 0,
      score: 0,
    });
    return res.json(await buildSessionPayload(req.user, session));
  }

  const session = await AiInterviewSession.findOne({ user: req.user._id, status: 'active' }).sort({ updatedAt: -1 });
  if (!session) {
    res.status(400);
    throw new Error('No active interview session');
  }

  if (action === 'respond') {
    const message = (req.body.message || '').trim();
    if (!message) {
      res.status(400);
      throw new Error('Message required');
    }
    const questions = session.questions || [];
    if (!questions.length) {
      res.status(400);
      throw new Error('No questions available');
    }
    const index = session.current_index ?? 0;
    if (index >= questions.length) {
      res.status(400);
      throw new Error('Interview already completed');
    }
    const current = questions[index];
    const analysis = await evaluateAnswer(message, current.question);
    const answers = [...(session.answers || []), {
      question: current.question,
      difficulty: current.difficulty,
      competency: current.competency,
      panelist: current.panelist,
      answer: message,
      word_count: analysis.word_count,
      points: analysis.points,
      analysis,
    }];
    const transcript = [...(session.transcript || [])];
    transcript.push({
      speaker: 'You',
      text: message,
      difficulty: current.difficulty,
      panelist: current.panelist,
      competency: current.competency,
      question_index: index,
    });
    session.score = Math.min(100, (session.score || 0) + analysis.points);
    session.answers = answers;
    const nextIndex = index + 1;
    if (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];
      transcript.push({
        speaker: 'AI',
        text: nextQuestion.question,
        difficulty: nextQuestion.difficulty,
        panelist: nextQuestion.panelist,
        competency: nextQuestion.competency,
        question_index: nextIndex,
        evaluation_focus: nextQuestion.evaluation_focus,
      });
      session.current_index = nextIndex;
      
      const summary = buildSummary(answers, questions, session.session_profile || buildDefaults(req.user), session.score || 0);
      session.summary = summary;
      session.metrics = buildMetrics(session.score || 0);
      session.feedback = buildFeedback(analysis);
      session.tips = buildTips(answers, summary);
    } else {
      session.status = 'completed';
      session.completed_at = new Date();
      session.current_index = questions.length;
      transcript.push({
        speaker: 'AI',
        text: 'Interview completed. Thank you!',
        difficulty: 'summary',
        panelist: 'AI Review Board',
        competency: 'summary',
        question_index: index,
      });
      
      const finalVerdictSummary = await generateFinalVerdict(answers, session.session_profile || buildDefaults(req.user));
      session.score = finalVerdictSummary.readiness_score || session.score;
      session.summary = finalVerdictSummary;
      session.metrics = buildMetrics(session.score || 0);
      session.feedback = buildFeedback(analysis);
      session.tips = buildTips(answers, finalVerdictSummary);
    }
    session.latest_analysis = analysis;
    session.transcript = transcript;
    await session.save();
    return res.json(await buildSessionPayload(req.user, session));
  }

  if (action === 'finish') {
    const answers = session.answers || [];
    const finalVerdictSummary = await generateFinalVerdict(answers, session.session_profile || buildDefaults(req.user));
    session.score = finalVerdictSummary.readiness_score || session.score;
    const transcript = [...(session.transcript || [])];
    if (!transcript.length || transcript[transcript.length - 1]?.difficulty !== 'summary') {
      transcript.push({
        speaker: 'AI',
        text: `Session closed. Recommendation: ${finalVerdictSummary.recommendation || 'Keep practicing'}.`,
        difficulty: 'summary',
        panelist: 'AI Review Board',
        competency: 'summary',
        question_index: session.current_index || session.questions.length,
      });
    }
    session.status = 'completed';
    session.completed_at = new Date();
    session.summary = finalVerdictSummary;
    session.metrics = buildMetrics(session.score || 0);
    session.tips = buildTips(answers, finalVerdictSummary);
    session.transcript = transcript;
    session.current_index = session.questions.length;
    await session.save();
    return res.json(await buildSessionPayload(req.user, session));
  }

  res.status(400);
  throw new Error('Invalid action');
});

module.exports = {
  getInterviewSession,
  handleInterviewAction,
};
