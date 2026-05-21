const asyncHandler = require('express-async-handler');
const Question = require('../models/questionModel');
const QuestionProgress = require('../models/questionProgressModel');
const { callAi } = require('../utils/aiClient');

// ─── Seed Data ───────────────────────────────────────────────────────────────
const SEED_QUESTIONS = [
  // DSA
  { category: 'dsa', topic: 'Arrays', difficulty: 'easy', companies: ['Amazon', 'Google'], title: 'Two Sum', description: 'Given an array of integers and a target sum, return indices of the two numbers that add up to the target. Each input has exactly one solution and you may not use the same element twice.', hint: 'Use a hash map to store complements as you iterate.', sample_answer: 'Iterate through the array. For each element, check if (target - element) exists in the map. If yes, return both indices. Otherwise, store element → index in the map. Time: O(n), Space: O(n).', tags: ['hash-map', 'array', 'searching'] },
  { category: 'dsa', topic: 'Arrays', difficulty: 'medium', companies: ['Microsoft', 'Meta'], title: 'Product of Array Except Self', description: 'Given an integer array, return an array where each element is the product of all other elements. You must solve it without division and in O(n) time.', hint: 'Use prefix products from left and suffix products from right.', sample_answer: 'Build a prefix array (running product left to right) and a suffix array (right to left). The answer at index i is prefix[i-1] * suffix[i+1].', tags: ['array', 'prefix-sum'] },
  { category: 'dsa', topic: 'Arrays', difficulty: 'hard', companies: ['Google', 'Apple'], title: 'Trapping Rain Water', description: 'Given n non-negative integers representing an elevation map, compute how much water it can trap after raining.', hint: 'Use two pointers starting from both ends, tracking max heights seen so far.', sample_answer: 'Two pointers l=0, r=n-1. Track maxL and maxR. Water at each position = min(maxL, maxR) - height[i]. Move the pointer with the smaller max inward.', tags: ['two-pointers', 'array', 'stack'] },
  { category: 'dsa', topic: 'Trees', difficulty: 'easy', companies: ['Amazon', 'Meta'], title: 'Maximum Depth of Binary Tree', description: 'Given the root of a binary tree, return its maximum depth — the number of nodes along the longest path from root to a leaf.', hint: 'Think recursively: depth = 1 + max(left depth, right depth).', sample_answer: 'Base case: if node is null, return 0. Recursively return 1 + max(maxDepth(root.left), maxDepth(root.right)). Time: O(n), Space: O(h).', tags: ['tree', 'dfs', 'recursion'] },
  { category: 'dsa', topic: 'Trees', difficulty: 'medium', companies: ['Google', 'Microsoft'], title: 'Binary Tree Level Order Traversal', description: 'Given the root of a binary tree, return the level-order traversal of its nodes\' values (i.e., from left to right, level by level).', hint: 'Use a queue (BFS). Process all nodes at the current level before moving to the next.', sample_answer: 'Use a queue initialized with root. At each level, record its size, dequeue that many nodes, add their values to the current level list, and enqueue their children.', tags: ['tree', 'bfs', 'queue'] },
  { category: 'dsa', topic: 'Dynamic Programming', difficulty: 'medium', companies: ['Amazon', 'Apple'], title: 'Climbing Stairs', description: 'You are climbing a staircase with n steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?', hint: 'This is essentially Fibonacci. dp[i] = dp[i-1] + dp[i-2].', sample_answer: 'Base: dp[1]=1, dp[2]=2. For i from 3 to n: dp[i] = dp[i-1] + dp[i-2]. Return dp[n]. Time: O(n), Space: O(1) with two variables.', tags: ['dp', 'fibonacci', 'memoization'] },
  { category: 'dsa', topic: 'Dynamic Programming', difficulty: 'hard', companies: ['Google', 'Meta'], title: 'Longest Increasing Subsequence', description: 'Given an integer array, return the length of the longest strictly increasing subsequence.', hint: 'O(n log n) solution uses patience sorting with binary search.', sample_answer: 'Maintain a tails array. For each number, binary search for the first tail ≥ number, replace it (or append if none found). The length of tails is the answer. O(n log n).', tags: ['dp', 'binary-search', 'greedy'] },
  { category: 'dsa', topic: 'Graphs', difficulty: 'medium', companies: ['Meta', 'Uber'], title: 'Number of Islands', description: 'Given a 2D binary grid of "1"s (land) and "0"s (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.', hint: 'DFS or BFS — flood fill each unvisited land cell and count how many floods you start.', sample_answer: 'Iterate over each cell. When you find a "1", increment count and DFS/BFS to mark all connected "1"s as visited ("0"). Return count.', tags: ['graph', 'dfs', 'bfs', 'flood-fill'] },
  { category: 'dsa', topic: 'Sliding Window', difficulty: 'medium', companies: ['Amazon', 'Google'], title: 'Longest Substring Without Repeating Characters', description: 'Given a string s, find the length of the longest substring without repeating characters.', hint: 'Use a sliding window with a set to track characters in the current window.', sample_answer: 'Maintain left pointer and a character set. Expand right; if char already in set, shrink from left until removed. Track max window size throughout.', tags: ['sliding-window', 'hash-set', 'string'] },
  { category: 'dsa', topic: 'Linked Lists', difficulty: 'easy', companies: ['Microsoft', 'Apple'], title: 'Reverse a Linked List', description: 'Given the head of a singly linked list, reverse the list and return the reversed list.', hint: 'Track previous, current, and next pointers as you iterate.', sample_answer: 'Initialize prev=null, curr=head. In each step: save next=curr.next, point curr.next=prev, advance prev=curr, curr=next. Return prev. Time O(n), Space O(1).', tags: ['linked-list', 'pointer-manipulation'] },

  // System Design
  { category: 'system_design', topic: 'Scalability', difficulty: 'medium', companies: ['Google', 'Amazon'], title: 'Design a URL Shortener', description: 'Design a system like bit.ly that converts long URLs into short aliases. Handle billions of URLs, ~100M DAU, and sub-100ms latency for redirections.', hint: 'Think about: hash generation (MD5/base62), DB schema, caching layer, and analytics.', sample_answer: 'Use base62 encoding of a 7-char ID (56B URLs). Write to a SQL DB with sharding by ID. Cache hot URLs in Redis with 24h TTL. CDN for global latency. Rate limiting per user.', tags: ['hashing', 'caching', 'database', 'cdn'] },
  { category: 'system_design', topic: 'Distributed Systems', difficulty: 'hard', companies: ['Meta', 'Netflix'], title: 'Design a News Feed System', description: 'Design the newsfeed system for a social network (like Facebook/Twitter) that serves personalized, real-time post feeds for 500M+ users.', hint: 'Consider push vs pull models, fanout on write vs fanout on read, and ranking algorithms.', sample_answer: 'Use fanout-on-write for users with <500 followers (push to pre-computed feed cache). For celebrities, use fanout-on-read. Store feeds in Redis sorted sets by timestamp. Rank with ML.', tags: ['fanout', 'caching', 'message-queue', 'ranking'] },
  { category: 'system_design', topic: 'Storage', difficulty: 'hard', companies: ['Google', 'Dropbox'], title: 'Design Google Drive / Dropbox', description: 'Design a file storage system supporting upload, download, sync across devices, and sharing for 1B+ users. Handle files up to 50GB.', hint: 'Chunk files for upload. Think about deduplication using content hashing.', sample_answer: 'Split files into 4MB chunks, upload each with MD5 checksum. Store chunks in blob storage (S3). Metadata in SQL. Deduplicate by chunk hash. Delta sync sends only changed chunks.', tags: ['blob-storage', 'chunking', 'sync', 'deduplication'] },
  { category: 'system_design', topic: 'Messaging', difficulty: 'medium', companies: ['WhatsApp', 'Slack'], title: 'Design a Chat Application', description: 'Design a real-time chat system supporting 1:1 and group messages, online/offline presence, and message history for 100M DAU.', hint: 'WebSockets for real-time delivery. Think about message ordering and guaranteed delivery.', sample_answer: 'WebSocket connections managed by session servers. Messages stored in Cassandra (sorted by timestamp per conversation). Use Kafka for fanout. Presence tracked in Redis with TTL.', tags: ['websockets', 'kafka', 'cassandra', 'presence'] },
  { category: 'system_design', topic: 'Search', difficulty: 'hard', companies: ['Google', 'LinkedIn'], title: 'Design a Search Autocomplete System', description: 'Design a real-time search typeahead system that shows top-K suggestions as the user types, with < 100ms latency for 10M QPS.', hint: 'Use a Trie for prefix matching. Think about how to aggregate and rank suggestions globally.', sample_answer: 'Build a trie of top search terms (from log mining). Cache top-10 completions per prefix in Redis. For global ranking, aggregate via batch MapReduce daily. Serve via CDN edge nodes.', tags: ['trie', 'caching', 'mapreduce', 'cdn'] },

  // Behavioral
  { category: 'behavioral', topic: 'Leadership', difficulty: 'medium', companies: ['Amazon', 'Google', 'Microsoft'], title: 'Tell me about a time you led a team through a difficult project', description: 'Describe a situation where you took initiative to lead others through a challenging technical or team situation. How did you handle conflicts, deadlines, or resource constraints?', hint: 'Use the STAR format: Situation, Task, Action, Result. Quantify outcomes where possible.', sample_answer: 'Structure: (S) Project context and why it was difficult. (T) Your role and ownership. (A) Specific steps you took — team alignment, technical decisions, unblocking others. (R) Outcome with measurable impact.', tags: ['star', 'leadership', 'teamwork'] },
  { category: 'behavioral', topic: 'Conflict Resolution', difficulty: 'medium', companies: ['Meta', 'Apple'], title: 'Describe a time you disagreed with your manager or senior engineer', description: 'Tell me about a situation where you had a professional disagreement. How did you handle it and what was the result?', hint: 'Show you can be assertive yet respectful. Emphasize data-driven reasoning and eventual alignment.', sample_answer: 'Acknowledge the disagreement clearly. Explain how you presented data/evidence for your position. Describe how you listened to their reasoning. Share how you both reached a decision, even if it wasn\'t yours.', tags: ['star', 'conflict', 'communication'] },
  { category: 'behavioral', topic: 'Failure', difficulty: 'medium', companies: ['Amazon', 'Google'], title: 'Tell me about a time you failed', description: 'Describe a significant professional or academic failure. What happened, and what did you learn from it?', hint: 'Be genuine — interviewers want to see self-awareness and growth, not a "failure that was secretly a success".', sample_answer: 'State the failure clearly without deflecting blame. Describe the impact honestly. Focus 60% of your answer on what you learned and specifically changed afterward.', tags: ['star', 'growth-mindset', 'self-awareness'] },
  { category: 'behavioral', topic: 'Achievement', difficulty: 'easy', companies: ['Any'], title: 'What is your greatest professional achievement?', description: 'Share a project or accomplishment you are most proud of in your academic or professional career. Why does it stand out?', hint: 'Pick something with measurable impact and that shows skills relevant to the role.', sample_answer: 'Choose an achievement with: clear context, a specific challenge you solved, your direct contribution (not team\'s), and a quantifiable result (e.g., "reduced load time by 40%").', tags: ['star', 'impact', 'ownership'] },

  // HR
  { category: 'hr', topic: 'Self Introduction', difficulty: 'easy', companies: ['Any'], title: 'Tell me about yourself', description: 'Give a concise, compelling professional introduction covering your background, key skills, and why you are interested in this role.', hint: 'Keep it 90 seconds max. Follow: Present → Past → Future structure.', sample_answer: 'Start with your current status (final year CS student / current role). Highlight 2-3 key technical strengths with a quick win. Mention why this specific company/role excites you. End with enthusiasm.', tags: ['introduction', 'self-pitch'] },
  { category: 'hr', topic: 'Motivation', difficulty: 'easy', companies: ['Any'], title: 'Why do you want to work at this company?', description: 'Demonstrate genuine interest in the company — its products, culture, technology, or mission. Avoid generic answers.', hint: 'Research the company\'s recent launches, tech blog posts, or engineering challenges before the interview.', sample_answer: 'Reference specific products you use and appreciate. Mention a technical blog post or open-source project. Connect to your personal goals and how this role accelerates them.', tags: ['motivation', 'company-research'] },
  { category: 'hr', topic: 'Salary', difficulty: 'medium', companies: ['Any'], title: 'What are your salary expectations?', description: 'Handle the salary discussion professionally without anchoring too low or unrealistically high.', hint: 'Research market rates on Glassdoor/Levels.fyi. Give a range, not a single number.', sample_answer: 'Say you\'ve researched market rates for this role and location, and your expectation is $X-$Y based on your skills and experience. Ask if that aligns with their budget.', tags: ['negotiation', 'compensation'] },
  { category: 'hr', topic: 'Strengths & Weaknesses', difficulty: 'easy', companies: ['Any'], title: 'What is your biggest weakness?', description: 'Answer honestly while showing self-awareness and active effort to improve. Never say "I work too hard" — interviewers see through it.', hint: 'Pick a real weakness that is not core to the role. Show you have a concrete improvement plan.', sample_answer: 'Name a genuine weakness (e.g., "I sometimes over-engineer solutions"). Explain how you recognized it. Describe the specific steps you\'ve taken to address it (e.g., "I now time-box designs to 30 minutes").', tags: ['self-awareness', 'growth'] },
  { category: 'hr', topic: 'Career Goals', difficulty: 'easy', companies: ['Any'], title: 'Where do you see yourself in 5 years?', description: 'Articulate realistic, ambitious career goals while showing alignment with the company\'s growth opportunities.', hint: 'Tie your growth trajectory to skills you will develop in this role. Show you want to grow with the company.', sample_answer: 'In 2 years I aim to become a strong individual contributor owning key features. In 5 years, I see myself in a tech lead or senior engineer role, mentoring others and driving architecture decisions.', tags: ['career-planning', 'ambition'] },
];

const ensureSeeded = async () => {
  const count = await Question.countDocuments({ is_seed: true });
  if (count === 0) {
    await Question.insertMany(SEED_QUESTIONS);
    console.log(`[QuestionBank] Seeded ${SEED_QUESTIONS.length} questions.`);
  }
};

// ─── List Questions ───────────────────────────────────────────────────────────
const listQuestions = asyncHandler(async (req, res) => {
  await ensureSeeded();

  const { category, difficulty, topic, company, search } = req.query;
  const filter = {};
  if (category && category !== 'all')    filter.category   = category;
  if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
  if (topic && topic !== 'all')          filter.topic      = { $regex: topic, $options: 'i' };
  if (company)   filter.companies = { $in: [new RegExp(company, 'i')] };
  if (search)    filter.$or = [
    { title:       { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
    { tags:        { $in:   [new RegExp(search, 'i')] } },
  ];

  const questions = await Question.find(filter).sort({ category: 1, difficulty: 1, createdAt: 1 });

  // Attach per-user progress
  const userProgress = await QuestionProgress.find({ user: req.user._id });
  const progressMap = {};
  userProgress.forEach((p) => { progressMap[String(p.question)] = p.status; });

  const items = questions.map((q) => ({
    id: q._id,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty,
    companies: q.companies,
    title: q.title,
    description: q.description,
    hint: q.hint,
    sample_answer: q.sample_answer,
    tags: q.tags,
    status: progressMap[String(q._id)] || null,
  }));

  // Build stats summary
  const total   = items.length;
  const practiced = Object.values(progressMap).filter((s) => s === 'practiced').length;
  const bookmarked = Object.values(progressMap).filter((s) => s === 'bookmarked').length;

  res.json({ items, stats: { total, practiced, bookmarked } });
});

// ─── Mark Question Status ─────────────────────────────────────────────────────
const markQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'practiced' | 'bookmarked' | 'skipped' | null (remove)

  if (status === null || status === 'remove') {
    await QuestionProgress.deleteOne({ user: req.user._id, question: id });
    return res.json({ success: true, status: null });
  }

  const allowed = ['practiced', 'bookmarked', 'skipped'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  await QuestionProgress.findOneAndUpdate(
    { user: req.user._id, question: id },
    { status, practiced_at: new Date() },
    { upsert: true, new: true }
  );

  res.json({ success: true, status });
});

// ─── AI Follow-up Questions ───────────────────────────────────────────────────
const getFollowups = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error('Question not found');
  }

  const prompt = `You are a senior technical interviewer at a top tech company.

Based on this interview question:
Title: "${question.title}"
Category: ${question.category}
Topic: ${question.topic}
Description: ${question.description}

Generate exactly 4 realistic follow-up questions an interviewer would ask to go deeper.
Respond ONLY with a valid JSON array, no extra text:
[
  {
    "question": "<follow-up question text>",
    "purpose": "<why an interviewer asks this — one sentence>",
    "difficulty": "easy"|"medium"|"hard"
  }
]`;

  let followups = [];
  try {
    const raw = await callAi(prompt, { temperature: 0.5 });
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      followups = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    }
  } catch (err) {
    console.error('Follow-up AI failed:', err.message);
  }

  if (!followups.length) {
    followups = [
      { question: `How would you optimize your solution for ${question.title}?`, purpose: 'Tests depth of understanding and engineering trade-offs.', difficulty: 'medium' },
      { question: 'What edge cases should we handle?', purpose: 'Evaluates thoroughness and defensive thinking.', difficulty: 'easy' },
      { question: 'How would this scale to 10x the input size?', purpose: 'Tests scalability awareness.', difficulty: 'hard' },
      { question: 'Can you walk me through the time and space complexity?', purpose: 'Checks algorithmic analysis skills.', difficulty: 'medium' },
    ];
  }

  res.json({ followups });
});

// ─── Daily Challenge ──────────────────────────────────────────────────────────
const getDailyChallenge = asyncHandler(async (req, res) => {
  await ensureSeeded();
  // Pick a deterministic daily question based on day-of-year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const count = await Question.countDocuments();
  const skip = dayOfYear % count;
  const question = await Question.findOne().skip(skip);
  if (!question) { res.status(404); throw new Error('No questions available'); }

  const userProg = await QuestionProgress.findOne({ user: req.user._id, question: question._id });

  res.json({
    id: question._id,
    category: question.category,
    topic: question.topic,
    difficulty: question.difficulty,
    companies: question.companies,
    title: question.title,
    description: question.description,
    hint: question.hint,
    sample_answer: question.sample_answer,
    tags: question.tags,
    status: userProg?.status || null,
  });
});

// ─── Stats ─────────────────────────────────────────────────────────────────────
const getQuestionStats = asyncHandler(async (req, res) => {
  await ensureSeeded();
  const total = await Question.countDocuments();
  const userProgress = await QuestionProgress.find({ user: req.user._id });
  const practiced  = userProgress.filter((p) => p.status === 'practiced').length;
  const bookmarked = userProgress.filter((p) => p.status === 'bookmarked').length;

  // Category breakdown
  const categories = ['dsa', 'system_design', 'behavioral', 'hr'];
  const breakdown = await Promise.all(
    categories.map(async (cat) => {
      const catTotal = await Question.countDocuments({ category: cat });
      const catIds   = (await Question.find({ category: cat }, '_id')).map((q) => String(q._id));
      const catDone  = userProgress.filter((p) => p.status === 'practiced' && catIds.includes(String(p.question))).length;
      return { category: cat, total: catTotal, practiced: catDone };
    })
  );

  res.json({ total, practiced, bookmarked, breakdown });
});

module.exports = { listQuestions, markQuestion, getFollowups, getDailyChallenge, getQuestionStats };
