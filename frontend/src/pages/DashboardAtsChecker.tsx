import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { Button } from '@/components/ui/button';
import { buildApiUrl } from '@/lib/api';
import {
  Sparkles,
  UploadCloud,
  FileSearch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Check,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

interface ImprovementItem {
  issue: string;
  suggestion: string;
}

interface AtsReport {
  ats_score: number;
  breakdown: {
    formatting: number;
    keywords: number;
    structure: number;
  };
  checklist: ChecklistItem[];
  missing_keywords: string[];
  improvements: {
    header: ImprovementItem[];
    summary: ImprovementItem[];
    experience: ImprovementItem[];
    skills: ImprovementItem[];
    formatting: ImprovementItem[];
  };
  analyzed_at?: string;
}

interface UserProfile {
  full_name?: string;
  username?: string;
  course?: string;
  branch?: string;
  resume_document?: {
    filename: string;
    download_path: string;
  };
  ats_report?: AtsReport;
}

export default function DashboardAtsChecker() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('experience');

  const scanSteps = [
    'Uploading resume document...',
    'Extracting content and parsing text...',
    'Analyzing layout and formatting compatibility...',
    'Evaluating keyword optimization & industry density...',
    'Generating actionable change recommendations...'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/student');
      return;
    }
    setLoading(true);
    fetch(buildApiUrl('/api/accounts/profile/'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data) => {
        setProfile(data?.user || null);
        if (data?.user?.ats_report) {
          setReport(data.user.ats_report);
        }
      })
      .catch((err) => {
        setError(err.message || 'Unable to fetch user details.');
      })
      .finally(() => setLoading(false));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const validateFile = (file: File) => {
    const validExtensions = ['pdf', 'txt', 'docx'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !validExtensions.includes(fileExt)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return false;
    }
    setError('');
    return true;
  };

  const startAtsAnalysis = async (useExisting = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (!useExisting && !selectedFile) {
      setError('Please select or upload a resume file first.');
      return;
    }

    setScanning(true);
    setError('');
    setScanStep(0);

    // Dynamic step ticking animation for visual wow effect
    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);

    try {
      const formData = new FormData();
      if (!useExisting && selectedFile) {
        formData.append('resume', selectedFile);
      }

      const res = await fetch(buildApiUrl('/api/accounts/ats-check/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to complete ATS check.');
      }

      const finalReport = await res.json();
      setReport(finalReport);
      
      // Update profile locally to display the newly checked resume
      fetchProfile();
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setScanning(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="pl-[260px]">
        <main className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <FileCheck className="h-3.5 w-3.5" />
                ATS Scanner
              </div>
              <h1 className="mt-4 text-3xl font-bold">ATS Score Checker</h1>
              <p className="text-muted-foreground">
                Audit your resume format, keyword density, and structural readiness using expert AI constraints.
              </p>
            </div>
            {report && (
              <Button
                variant="outline"
                className="self-start lg:self-auto border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => {
                  setReport(null);
                  setSelectedFile(null);
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Upload & Scan New
              </Button>
            )}
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Loading Screen / Scanning Progress */}
          {scanning && (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-dashed border-accent/30 border-b-accent animate-spin [animation-duration:3s]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSearch className="w-8 h-8 text-primary animate-bounce" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyzing Resume...</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Our AI Agent is scanning your resume formatting constraints, parsing section details, and matching technology keywords.
              </p>
              
              {/* Progress Steps Log */}
              <div className="w-full max-w-md bg-card/40 border border-border/60 rounded-2xl p-4 text-left space-y-3">
                {scanSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    {scanStep > idx ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : scanStep === idx ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted/30 shrink-0" />
                    )}
                    <span className={scanStep === idx ? 'text-foreground font-medium' : scanStep > idx ? 'text-muted-foreground line-through' : 'text-muted-foreground/60'}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* main conditional panels */}
          {!scanning && (
            <AnimatePresence mode="wait">
              {/* Scan Entry Board */}
              {!report ? (
                <motion.div
                  key="scan-entry"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid lg:grid-cols-[1.5fr_1fr] gap-6"
                >
                  {/* File Upload drag and drop */}
                  <div
                    className={`glass-card p-10 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer ${
                      dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/60 hover:border-primary/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center mb-6">
                      <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Upload your resume</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                      Drag & drop your file here, or click to browse. Supports PDF, DOCX, or TXT formats (Max 5MB).
                    </p>

                    <input
                      id="resume-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                    />

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('resume-file-input')?.click()}
                      >
                        Choose File
                      </Button>
                      
                      {selectedFile && (
                        <Button onClick={() => startAtsAnalysis(false)} className="w-full sm:w-auto">
                          Analyze Uploaded Resume
                        </Button>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="mt-6 flex items-center gap-2 border border-border/60 bg-card/60 px-4 py-2 rounded-xl text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground/60">
                          ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Profile resume actions */}
                  <div className="space-y-6">
                    <div className="glass-card p-6 flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex items-center gap-2 text-primary font-semibold mb-3">
                          <FileText className="w-5 h-5" />
                          Resume on Profile
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          You uploaded a resume during your profile registration. You can run the AI ATS analyzer directly on this file.
                        </p>
                      </div>

                      {profile?.resume_document ? (
                        <div className="border border-border/60 rounded-2xl bg-card/30 p-4 mb-4">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="truncate">{profile.resume_document.filename}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Ready for parsing analysis</p>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border/60 rounded-2xl p-4 mb-4 text-center text-sm text-muted-foreground">
                          No resume found on profile. Upload one on the left.
                        </div>
                      )}

                      <Button
                        disabled={!profile?.resume_document}
                        onClick={() => startAtsAnalysis(true)}
                        className="w-full"
                      >
                        <FileSearch className="w-4 h-4 mr-2" />
                        Analyze Current Resume
                      </Button>
                    </div>

                    <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                      <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Why run an ATS check?
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          Over 95% of large companies use ATS filters.
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          Format compatibility errors block up to 60% of applications.
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          Keyword matching score assesses your relevance to recruitment indexes.
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Report results page */
                <motion.div
                  key="scan-results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Top Stats Overview */}
                  <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
                    {/* Score ring */}
                    <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Overall ATS score</h3>
                      <ScoreRing score={report.ats_score} size={150} strokeWidth={12} label="Score" />
                      <div className="mt-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getScoreColor(report.ats_score)}`}>
                          {report.ats_score >= 80 ? 'Excellent Match' : report.ats_score >= 60 ? 'Needs Improvement' : 'Critical Formatting Blockers'}
                        </span>
                      </div>
                      {report.analyzed_at && (
                        <p className="text-[10px] text-muted-foreground mt-4">
                          Analyzed on: {new Date(report.analyzed_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Breakdown progress and checklist */}
                    <div className="glass-card p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold mb-4 text-lg">Category Metrics</h3>
                        <div className="space-y-4">
                          {/* Formatting Score */}
                          <div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1.5">
                              <span>Layout & Parseability Compatibility</span>
                              <span className="font-medium text-foreground">{report.breakdown.formatting}/100</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreBarColor(report.breakdown.formatting)}`}
                                style={{ width: `${report.breakdown.formatting}%` }}
                              />
                            </div>
                          </div>

                          {/* Keywords Score */}
                          <div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1.5">
                              <span>Skill Keyword Match Density</span>
                              <span className="font-medium text-foreground">{report.breakdown.keywords}/100</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreBarColor(report.breakdown.keywords)}`}
                                style={{ width: `${report.breakdown.keywords}%` }}
                              />
                            </div>
                          </div>

                          {/* Structure Score */}
                          <div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1.5">
                              <span>Structural Section Integrity</span>
                              <span className="font-medium text-foreground">{report.breakdown.structure}/100</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreBarColor(report.breakdown.structure)}`}
                                style={{ width: `${report.breakdown.structure}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Layout checklists */}
                      <div className="mt-6 border-t border-border/50 pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {report.checklist.map((item) => (
                          <div
                            key={item.id}
                            className={`rounded-xl border p-2 flex flex-col justify-between text-center ${
                              item.passed ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-rose-500/10 bg-rose-500/5'
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-muted-foreground truncate" title={item.label}>
                              {item.label}
                            </span>
                            <div className="flex items-center justify-center mt-1.5">
                              {item.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Missing Keywords and Suggestions */}
                  <div className="grid lg:grid-cols-[1fr_2.2fr] gap-6">
                    {/* Missing Keywords */}
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h4 className="font-semibold text-md">Missing Critical Keywords</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Adding these industry keywords / technology tags based on your specialization will boost your resume score matching factor:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {report.missing_keywords && report.missing_keywords.length > 0 ? (
                          report.missing_keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 text-xs font-semibold"
                            >
                              + {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">All critical keywords detected!</span>
                        )}
                      </div>
                    </div>

                    {/* Section Suggestions (Accordion) */}
                    <div className="glass-card p-6">
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        What changes you should make
                      </h4>

                      <div className="space-y-4">
                        {/* 1. Header Suggestions */}
                        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/25">
                          <button
                            onClick={() => toggleSection('header')}
                            className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-card/40 transition-colors"
                          >
                            <span>Header & Contact Information</span>
                            {expandedSection === 'header' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedSection === 'header' && (
                            <div className="p-4 border-t border-border/50 space-y-3 bg-background/25">
                              {report.improvements.header.length === 0 ? (
                                <p className="text-xs text-emerald-500">✓ Excellent header links! All standard URLs found.</p>
                              ) : (
                                report.improvements.header.map((item, i) => (
                                  <div key={i} className="text-xs space-y-1">
                                    <div className="font-bold text-foreground">Issue: {item.issue}</div>
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                      <span>{item.suggestion}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Objective/Summary */}
                        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/25">
                          <button
                            onClick={() => toggleSection('summary')}
                            className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-card/40 transition-colors"
                          >
                            <span>Professional Summary / Objective</span>
                            {expandedSection === 'summary' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedSection === 'summary' && (
                            <div className="p-4 border-t border-border/50 space-y-3 bg-background/25">
                              {report.improvements.summary.length === 0 ? (
                                <p className="text-xs text-emerald-500">✓ Objective/Summary is well structured.</p>
                              ) : (
                                report.improvements.summary.map((item, i) => (
                                  <div key={i} className="text-xs space-y-1">
                                    <div className="font-bold text-foreground">Issue: {item.issue}</div>
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                      <span>{item.suggestion}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Experience & Projects */}
                        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/25">
                          <button
                            onClick={() => toggleSection('experience')}
                            className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-card/40 transition-colors"
                          >
                            <span>Work Experience & Project Description details</span>
                            {expandedSection === 'experience' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedSection === 'experience' && (
                            <div className="p-4 border-t border-border/50 space-y-3 bg-background/25">
                              {report.improvements.experience.length === 0 ? (
                                <p className="text-xs text-emerald-500">✓ Projects and experience bullet points look great.</p>
                              ) : (
                                report.improvements.experience.map((item, i) => (
                                  <div key={i} className="text-xs space-y-1">
                                    <div className="font-bold text-foreground">Issue: {item.issue}</div>
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                      <span>{item.suggestion}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* 4. Skills section */}
                        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/25">
                          <button
                            onClick={() => toggleSection('skills')}
                            className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-card/40 transition-colors"
                          >
                            <span>Skills layout & Categorization</span>
                            {expandedSection === 'skills' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedSection === 'skills' && (
                            <div className="p-4 border-t border-border/50 space-y-3 bg-background/25">
                              {report.improvements.skills.length === 0 ? (
                                <p className="text-xs text-emerald-500">✓ Skills section formatting is clean.</p>
                              ) : (
                                report.improvements.skills.map((item, i) => (
                                  <div key={i} className="text-xs space-y-1">
                                    <div className="font-bold text-foreground">Issue: {item.issue}</div>
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                      <span>{item.suggestion}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* 5. Formatting & Layout */}
                        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/25">
                          <button
                            onClick={() => toggleSection('formatting')}
                            className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-card/40 transition-colors"
                          >
                            <span>Document Formatting, Fonts & General Guidelines</span>
                            {expandedSection === 'formatting' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedSection === 'formatting' && (
                            <div className="p-4 border-t border-border/50 space-y-3 bg-background/25">
                              {report.improvements.formatting.length === 0 ? (
                                <p className="text-xs text-emerald-500">✓ Document is perfectly formatted for standard ATS scanners.</p>
                              ) : (
                                report.improvements.formatting.map((item, i) => (
                                  <div key={i} className="text-xs space-y-1">
                                    <div className="font-bold text-foreground">Issue: {item.issue}</div>
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                      <span>{item.suggestion}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
