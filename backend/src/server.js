const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const accountsRoutes = require('./routes/accountsRoutes');
const skillsRoutes = require('./routes/skillsRoutes');
const contentRoutes = require('./routes/contentRoutes');
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const universityRoutes = require('./routes/universityRoutes');
const codeAnalysisRoutes = require('./routes/codeAnalysisRoutes');
const progressRoutes = require('./routes/progressRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const { ensureSampleUsers } = require('./utils/seedSampleUsers');

[
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
});

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity in dev/prod transition, or configure properly
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const parseOrigin = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};
const buildAllowedOrigins = (value) => {
  const parsed = parseOrigin(value);
  if (!parsed) {
    return [];
  }

  const allowed = new Set([parsed.origin]);
  if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    const localPorts = new Set([parsed.port, '4173', '5173', '8080', '8081'].filter(Boolean));
    for (const host of ['localhost', '127.0.0.1']) {
      for (const port of localPorts) {
        allowed.add(`${parsed.protocol}//${host}:${port}`);
      }
    }
  }

  return [...allowed];
};
const allowedOrigins = new Set(buildAllowedOrigins(frontendUrl));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadDirs = [
  path.join(__dirname, '..', 'uploads', 'resumes'),
  path.join(__dirname, '..', 'uploads', 'media'),
  path.join(__dirname, '..', 'uploads', 'batches'),
];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/test-resume-parsing', async (req, res) => {
  const resumeDir = path.join(__dirname, '..', 'uploads', 'resumes');
  if (!fs.existsSync(resumeDir)) {
    return res.status(404).json({ error: 'Resume directory not found' });
  }

  const files = fs.readdirSync(resumeDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    return res.status(404).json({ error: 'No PDF resumes found in uploads/resumes' });
  }

  const { parseResume } = require('./utils/resumeParser');
  const filePath = path.join(resumeDir, files[0]);
  
  try {
    const details = await parseResume(filePath);
    res.json({
      file: files[0],
      details
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.use('/api/accounts', accountsRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/skills', codeAnalysisRoutes);
app.use('/api/skills', progressRoutes);
app.use('/api/skills', aiInterviewRoutes);
app.use('/api/skills', recruiterRoutes);
app.use('/api/skills', universityRoutes);
app.use('/api/content', contentRoutes);

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get(/(.*)/, (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'API route not found' });
      }
    });
  }
} else {
  app.get('/', (req, res) => {
    return res.json({
      name: 'SkillSense AI API',
      status: 'ok',
      health: '/health',
      frontend: frontendUrl,
    });
  });
}

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Global Error Logger
app.use((err, req, res, next) => {
  console.error(`\n--- ERROR ${new Date().toISOString()} ---`);
  console.error(`Path: ${req.path}`);
  console.error(`Method: ${req.method}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error(`------------------------------------------\n`);
  errorHandler(err, req, res, next);
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await ensureSampleUsers();
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
