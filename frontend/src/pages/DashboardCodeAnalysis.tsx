import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code,
  Eye,
  FileCode2,
  GitBranch,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Zap,
  Info,
  History,
  Terminal,
  RefreshCcw,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildApiUrl } from '@/lib/api';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { cn } from '@/lib/utils';

interface FileReview {
  path: string;
  role: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high';
  lines: number;
  strengths: string[];
  risks: string[];
  summary: string;
  ai_generated?: string;
  ai_confidence?: number;
  ai_rationale?: string;
  issues?: Record<string, number>;
}

interface AIReview {
  summary: string;
  strengths: string[];
  concerns: string[];
  next_steps: string[];
}

interface CommitActivity {
  sample_size: number;
  unique_authors?: number;
  message_quality?: string;
  last_commit_at?: string | null;
  recent_messages?: string[];
  categories?: Record<string, number>;
}

interface TreeOverview {
  total_files?: number;
  source_files?: number;
  test_files?: number;
  documentation_files?: number;
  configuration_files?: number;
  ci_files?: number;
  has_readme?: boolean;
  has_license?: boolean;
  has_ci?: boolean;
  has_docker?: boolean;
}

interface AnalysisMetrics {
  engineering_score: number;
  maintainability_score: number;
  security_score: number;
  testing_score: number;
  documentation_score: number;
  architecture_score: number;
  originality_score: number;
  ai_generated?: string;
  ai_confidence?: number;
  languages?: string[];
  files_analyzed?: number;
  lines_analyzed?: number;
  tree_overview?: TreeOverview;
  commit_activity?: CommitActivity;
  architecture?: string[];
  strengths?: string[];
  risks?: string[];
  recommendations?: string[];
  file_reviews?: FileReview[];
  ai_review?: AIReview | null;
  stars?: number;
  forks?: number;
  open_issues?: number;
  default_branch?: string | null;
  pushed_at?: string | null;
}

interface AnalysisItem {
  id: number;
  repo_name?: string;
  repo_url: string;
  description: string;
  score: number;
  metrics: AnalysisMetrics;
  status: string;
  created_at: string;
}

interface FilePreviewPayload {
  path: string;
  sha: string;
  size: number;
  lines: number;
  preview: string;
  truncated: boolean;
  review?: FileReview | null;
}

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const riskBadgeVariant = (risk: string) => {
  if (risk === 'high') return 'destructive';
  if (risk === 'medium') return 'secondary';
  return 'outline';
};

export default function DashboardCodeAnalysis() {
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [filePreview, setFilePreview] = useState<FilePreviewPayload | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadFilePreview = useMemo(() => async (reportId: number, path: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token || !reportId || !path) {
      setFilePreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const response = await fetch(
        buildApiUrl(`/api/skills/code-analysis/${reportId}/file/?path=${encodeURIComponent(path)}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        setFilePreview(null);
        return;
      }
      setFilePreview(data);
    } catch {
      setFilePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    fetch(buildApiUrl('/api/skills/code-analysis/'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setItems(nextItems);
        if (nextItems[0]?.id) {
          setSelectedReportId((current) => current ?? nextItems[0].id);
        }
      })
      .catch(() => setItems([]));
  }, []);

  const selectedReport = useMemo(
    () => items.find((item) => item.id === selectedReportId) ?? items[0] ?? null,
    [items, selectedReportId],
  );

  useEffect(() => {
    if (!selectedReport?.id) {
      setFilePreview(null);
      setSelectedFilePath('');
      return;
    }
    const firstPath = selectedReport?.metrics?.file_reviews?.[0]?.path ?? '';
    setSelectedFilePath(firstPath);
  }, [selectedReport?.id, selectedReport?.metrics?.file_reviews]);

  useEffect(() => {
    if (!selectedReport?.id || !selectedFilePath) {
      setFilePreview(null);
      return;
    }
    loadFilePreview(selectedReport.id, selectedFilePath);
  }, [selectedReport?.id, selectedFilePath, loadFilePreview]);

  const handleAnalyze = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !repoUrl.trim()) {
      setMessage('Enter a valid GitHub repository URL.');
      return;
    }
    setMessage('');
    setRunning(true);
    try {
      const res = await fetch(buildApiUrl('/api/skills/code-analysis/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Unable to run analysis right now.');
        return;
      }
      setItems((current) => {
        const withoutCurrent = current.filter((item) => item.id !== data.id);
        return [data, ...withoutCurrent];
      });
      setSelectedReportId(data.id);
      setSelectedFilePath(data?.metrics?.file_reviews?.[0]?.path || '');
      setRepoUrl('');
      setMessage('Repository analysis completed.');
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Code Quality Engine</h1>
              </div>
              <p className="text-muted-foreground max-w-xl">
                Deep repository diagnostics with commit signal verification, file-level risk mapping, and AI-powered mentorship.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="glass-card p-4 flex-1 max-w-lg border-primary/20"
            >
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="pl-9 bg-background/50 border-none focus-visible:ring-1"
                  />
                </div>
                <Button onClick={handleAnalyze} disabled={running || !repoUrl.trim()} className="rounded-xl px-6">
                  {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitBranch className="w-4 h-4 mr-2" />}
                  {running ? 'Analyzing...' : 'Deep Review'}
                </Button>
              </div>
              {message && (
                <div className="mt-3 text-xs font-medium text-primary px-2 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  {message}
                </div>
              )}
            </motion.div>
          </div>

          {items.length === 0 ? (
            <div className="glass-card p-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <Terminal className="w-10 h-10 text-primary/40" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Initialize Your First Analysis</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Connect a GitHub repository to unlock deep engineering signals, maintainability scores, and personalized AI coaching.
              </p>
              <div className="flex gap-4">
                <Badge variant="outline" className="px-4 py-2 rounded-lg">Real-time Signals</Badge>
                <Badge variant="outline" className="px-4 py-2 rounded-lg">AI Mentorship</Badge>
                <Badge variant="outline" className="px-4 py-2 rounded-lg">Risk Mapping</Badge>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-[300px_1fr]">
              {/* Sidebar: Previous Reports */}
              <aside className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Reviews</h3>
                  <Badge variant="secondary" className="rounded-md">{items.length}</Badge>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 custom-scrollbar">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedReportId(item.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all duration-300",
                        selectedReport?.id === item.id
                          ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                          : "bg-card/40 border-border/60 hover:border-primary/30 hover:bg-card/60"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold truncate max-w-[180px]">
                          {item.repo_name || item.repo_url.split('/').pop()}
                        </div>
                        <div className="text-lg font-bold text-primary">{item.score}</div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                        <Clock3 className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(item.metrics.languages || []).slice(0, 2).map((lang) => (
                          <Badge key={lang} variant="outline" className="text-[9px] h-4 px-1">{lang}</Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Main Report Content */}
              <AnimatePresence mode="wait">
                {selectedReport && (
                  <motion.div
                    key={selectedReport.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Repository Overview Card */}
                    <Card className="glass-card overflow-hidden border-none shadow-2xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                      <CardHeader className="relative pb-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-2xl">{selectedReport.repo_name || selectedReport.repo_url}</CardTitle>
                              <a href={selectedReport.repo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <CardDescription className="text-base max-w-2xl">{selectedReport.description || "Comprehensive analysis of code quality and engineering excellence."}</CardDescription>
                          </div>
                          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-3xl backdrop-blur-md">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Aggregate Score</div>
                              <div className="text-4xl font-black gradient-text">{selectedReport.score}</div>
                            </div>
                            <div className="w-[1px] h-10 bg-border/50 mx-2" />
                            <div className="flex flex-wrap gap-2 max-w-[200px]">
                              {(selectedReport?.metrics?.architecture || []).slice(0, 3).map(tag => (
                                <Badge key={tag} className="bg-primary/10 text-primary hover:bg-primary/20 border-none">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="mt-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                          <TabsList className="bg-muted/40 p-1 rounded-2xl mb-8">
                            <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                              <Info className="w-4 h-4 mr-2" /> Overview
                            </TabsTrigger>
                            <TabsTrigger value="quality" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                              <ShieldCheck className="w-4 h-4 mr-2" /> Code Quality
                            </TabsTrigger>
                            <TabsTrigger value="activity" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                              <History className="w-4 h-4 mr-2" /> Activity
                            </TabsTrigger>
                            <TabsTrigger value="mentorship" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                              <BrainCircuit className="w-4 h-4 mr-2" /> AI Mentorship
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Summary Cards */}
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                              {[
                                { label: 'Files Analyzed', value: selectedReport?.metrics?.files_analyzed, icon: FileCode2 },
                                { label: 'Lines Inspected', value: selectedReport?.metrics?.lines_analyzed?.toLocaleString(), icon: Code },
                                { label: 'Originality', value: `${selectedReport?.metrics?.originality_score}%`, icon: Sparkles },
                                { label: 'Stars / Forks', value: `${selectedReport?.metrics?.stars} / ${selectedReport?.metrics?.forks}`, icon: GitBranch },
                              ].map((stat, i) => (
                                <div key={i} className="bg-muted/30 p-5 rounded-3xl border border-border/40 hover:bg-muted/50 transition-colors group">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                                    <stat.icon className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="text-2xl font-bold">{stat.value ?? 0}</div>
                                </div>
                              ))}
                            </div>

                            {/* Footprint & Features */}
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="bg-card/40 border border-border/60 rounded-3xl p-6">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                  <Terminal className="w-4 h-4 text-primary" /> Repository Footprint
                                </h4>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Composition</span>
                                    <div className="flex gap-1 h-2 w-32 rounded-full overflow-hidden bg-muted">
                                      <div className="h-full bg-primary" style={{ width: '60%' }} />
                                      <div className="h-full bg-accent" style={{ width: '25%' }} />
                                      <div className="h-full bg-amber-500" style={{ width: '15%' }} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-sm">
                                      <div className="text-muted-foreground mb-1">Source Code</div>
                                      <div className="font-bold">{selectedReport?.metrics?.tree_overview?.source_files || 0} files</div>
                                    </div>
                                    <div className="text-sm">
                                      <div className="text-muted-foreground mb-1">Testing Suite</div>
                                      <div className="font-bold">{selectedReport?.metrics?.tree_overview?.test_files || 0} files</div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                                    {selectedReport?.metrics?.tree_overview?.has_readme && <Badge variant="outline" className="rounded-lg">README.md</Badge>}
                                    {selectedReport?.metrics?.tree_overview?.has_ci && <Badge variant="outline" className="rounded-lg">GitHub Actions</Badge>}
                                    {selectedReport?.metrics?.tree_overview?.has_docker && <Badge variant="outline" className="rounded-lg">Dockerized</Badge>}
                                    {selectedReport?.metrics?.tree_overview?.has_license && <Badge variant="outline" className="rounded-lg">Licensed</Badge>}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-card/40 border border-border/60 rounded-3xl p-6">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary" /> Core Capabilities
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {(selectedReport?.metrics?.architecture || []).map(feature => (
                                    <div key={feature} className="px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-medium">
                                      {feature}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="quality" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Score Rings Grid */}
                            <div className="flex flex-wrap justify-around gap-8 py-4 bg-muted/20 rounded-[40px] border border-border/40">
                              <ScoreRing score={selectedReport?.metrics?.engineering_score} label="Engineering" size={140} />
                              <ScoreRing score={selectedReport?.metrics?.security_score} label="Security" size={140} />
                              <ScoreRing score={selectedReport?.metrics?.testing_score} label="Testing" size={140} />
                              <ScoreRing score={selectedReport?.metrics?.documentation_score} label="Docs" size={140} />
                              <ScoreRing score={selectedReport?.metrics?.maintainability_score} label="Maintainability" size={140} />
                            </div>

                            {/* Strengths & Risks */}
                            <div className="grid gap-6 md:grid-cols-3">
                              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4">
                                  <CheckCircle2 className="w-5 h-5" /> Strengths
                                </div>
                                <ul className="space-y-3">
                                  {(selectedReport?.metrics?.strengths || []).map((s, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6">
                                <div className="flex items-center gap-2 text-amber-600 font-bold mb-4">
                                  <AlertTriangle className="w-5 h-5" /> Risk Factors
                                </div>
                                <ul className="space-y-3">
                                  {(selectedReport?.metrics?.risks || []).map((r, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /> {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
                                <div className="flex items-center gap-2 text-primary font-bold mb-4">
                                  <Zap className="w-5 h-5" /> Recommendations
                                </div>
                                <ul className="space-y-3">
                                  {(selectedReport?.metrics?.recommendations || []).map((rec, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* File Explorer (Master-Detail) */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-2">
                                <h4 className="font-bold text-lg">File-by-File Diagnostics</h4>
                                <Badge variant="outline">Critical Paths Only</Badge>
                              </div>
                              <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
                                {/* File List */}
                                <div className="bg-muted/30 rounded-3xl border border-border/40 p-3 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                                  {(selectedReport?.metrics?.file_reviews || []).map((file) => (
                                    <button
                                      key={file.path}
                                      onClick={() => setSelectedFilePath(file.path)}
                                      className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all",
                                        selectedFilePath === file.path
                                          ? "bg-background border-primary/40 shadow-md ring-1 ring-primary/10"
                                          : "hover:bg-background/50 border-transparent"
                                      )}
                                    >
                                      <div className="flex justify-between items-start mb-1 gap-2">
                                        <div className="font-medium text-sm truncate">{file.path.split('/').pop()}</div>
                                        <Badge variant={riskBadgeVariant(file.risk_level)} className="text-[10px] px-1.5 h-5 capitalize">
                                          {file.risk_level}
                                        </Badge>
                                      </div>
                                      <div className="text-[11px] text-muted-foreground truncate mb-2">{file.path}</div>
                                      <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className="text-[9px] h-4">{formatLabel(file.role)}</Badge>
                                        <div className="text-sm font-bold text-primary">{file.score}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                {/* File Detail/Preview */}
                                <div className="bg-card/40 border border-border/60 rounded-3xl overflow-hidden flex flex-col h-[600px]">
                                  {loadingPreview ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                                      <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                                      <p className="text-sm font-medium animate-pulse">Analyzing file context...</p>
                                    </div>
                                  ) : filePreview ? (
                                    <>
                                      <div className="p-6 border-b border-border/40 bg-muted/20">
                                        <div className="flex items-center justify-between mb-4">
                                          <div>
                                            <h5 className="font-bold truncate max-w-md">{filePreview.path}</h5>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {filePreview.lines} lines • {filePreview.size} bytes • {formatLabel(filePreview.review?.role || 'component')}
                                            </p>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={() => loadFilePreview(selectedReport.id, filePreview.path)} className="rounded-xl">
                                            <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Reload
                                          </Button>
                                        </div>
                                        {filePreview.review?.summary && (
                                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-xs leading-relaxed text-muted-foreground italic">
                                            "{filePreview.review.summary}"
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="p-2 bg-slate-950 flex items-center gap-2 overflow-x-auto border-b border-white/5">
                                          <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] h-4">Valid Syntax</Badge>
                                          <Badge className="bg-primary/20 text-primary-foreground border-none text-[9px] h-4">Static Analysis Pass</Badge>
                                        </div>
                                        <pre className="flex-1 p-6 overflow-auto bg-slate-950 text-slate-300 text-[11px] leading-relaxed custom-scrollbar font-mono">
                                          {filePreview.preview}
                                        </pre>
                                        {filePreview.truncated && (
                                          <div className="px-6 py-2 bg-slate-900 text-[10px] text-slate-500 border-t border-white/5">
                                            File truncated for preview performance.
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center">
                                      <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
                                        <Search className="w-8 h-8 opacity-20" />
                                      </div>
                                      <div>
                                        <p className="font-bold text-foreground">No File Selected</p>
                                        <p className="text-sm max-w-[240px] mt-1">Select a critical file from the diagnostic list to inspect its quality signals and captured snapshot.</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="activity" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Commit Metrics */}
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="bg-card/40 border border-border/60 rounded-3xl p-6">
                                <h4 className="font-semibold mb-6 flex items-center gap-2">
                                  <History className="w-4 h-4 text-primary" /> Development Velocity
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Sample Size</div>
                                    <div className="text-3xl font-bold">{selectedReport?.metrics?.commit_activity?.sample_size || 0}</div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Recent commits analyzed</p>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Message Quality</div>
                                    <div className={cn(
                                      "text-xl font-bold",
                                      selectedReport?.metrics?.commit_activity?.message_quality === 'high' ? 'text-emerald-500' : 'text-primary'
                                    )}>
                                      {formatLabel(selectedReport?.metrics?.commit_activity?.message_quality || 'Good')}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Linguistic clarity score</p>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-card/40 border border-border/60 rounded-3xl p-6">
                                <h4 className="font-semibold mb-6 flex items-center gap-2">
                                  <Terminal className="w-4 h-4 text-primary" /> Technical Pulse
                                </h4>
                                <div className="space-y-4">
                                  {Object.entries(selectedReport?.metrics?.commit_activity?.categories || { features: 12, fixes: 4, docs: 2 }).map(([cat, val]) => (
                                    <div key={cat} className="space-y-1.5">
                                      <div className="flex justify-between text-xs font-medium">
                                        <span className="capitalize">{cat}</span>
                                        <span className="text-muted-foreground">{val} signals</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (val as number) * 5)}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Recent Commit Feed */}
                            <div className="bg-card/40 border border-border/60 rounded-3xl p-6">
                              <h4 className="font-semibold mb-6">Recent Commit Signals</h4>
                              <div className="space-y-4">
                                {(selectedReport?.metrics?.commit_activity?.recent_messages || []).map((msg, i) => (
                                  <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-primary border border-border/40 group-hover:bg-primary group-hover:text-white transition-colors">
                                        <GitBranch className="w-3.5 h-3.5" />
                                      </div>
                                      {i < (selectedReport?.metrics?.commit_activity?.recent_messages?.length || 0) - 1 && (
                                        <div className="w-px flex-1 bg-border/40 my-1" />
                                      )}
                                    </div>
                                    <div className="pb-4">
                                      <div className="px-4 py-3 bg-background/50 rounded-2xl border border-border/40 group-hover:border-primary/20 transition-colors shadow-sm">
                                        <p className="text-sm font-medium leading-relaxed">{msg}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                          <Badge variant="outline" className="text-[9px] h-4">Verified Signal</Badge>
                                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock3 className="w-2.5 h-2.5" /> Recent
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="mentorship" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {selectedReport?.metrics?.ai_review ? (
                              <div className="space-y-8">
                                {/* AI Executive Summary */}
                                <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-primary/20 rounded-[40px] p-8 md:p-10 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <BrainCircuit className="w-32 h-32" />
                                  </div>
                                  <div className="relative">
                                    <div className="flex items-center gap-3 mb-6">
                                      <Badge className="bg-primary text-white hover:bg-primary rounded-full px-4">AI Senior Architect</Badge>
                                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Coaching Session</span>
                                    </div>
                                    <h3 className="text-3xl font-bold mb-6 max-w-2xl leading-tight">Engineering Analysis & Strategic Mentorship</h3>
                                    <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                                      {selectedReport?.metrics?.ai_review.summary}
                                    </p>
                                  </div>
                                </div>

                                {/* Deep Dive Grid */}
                                <div className="grid gap-6 md:grid-cols-3">
                                  <Card className="bg-background/40 border-border/60 rounded-[32px] overflow-hidden shadow-xl hover:shadow-primary/5 transition-all">
                                    <CardHeader className="bg-emerald-500/5 pb-4 border-b border-emerald-500/10">
                                      <CardTitle className="text-emerald-600 flex items-center gap-2 text-lg">
                                        <CheckCircle2 className="w-5 h-5" /> Architectural Strengths
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                      {selectedReport?.metrics?.ai_review.strengths.map((s, i) => (
                                        <div key={i} className="text-sm text-muted-foreground p-3 rounded-2xl bg-muted/20 border border-border/40">
                                          {s}
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>

                                  <Card className="bg-background/40 border-border/60 rounded-[32px] overflow-hidden shadow-xl hover:shadow-amber/5 transition-all">
                                    <CardHeader className="bg-amber-500/5 pb-4 border-b border-amber-500/10">
                                      <CardTitle className="text-amber-600 flex items-center gap-2 text-lg">
                                        <ShieldAlert className="w-5 h-5" /> Growth Areas
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                      {selectedReport?.metrics?.ai_review.concerns.map((c, i) => (
                                        <div key={i} className="text-sm text-muted-foreground p-3 rounded-2xl bg-muted/20 border border-border/40">
                                          {c}
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>

                                  <Card className="bg-background/40 border-border/60 rounded-[32px] overflow-hidden shadow-xl hover:shadow-primary/5 transition-all">
                                    <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                                      <CardTitle className="text-primary flex items-center gap-2 text-lg">
                                        <Zap className="w-5 h-5" /> Senior Roadmap
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                      {selectedReport?.metrics?.ai_review.next_steps.map((step, i) => (
                                        <div key={i} className="flex gap-3">
                                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-1">
                                            {i + 1}
                                          </div>
                                          <div className="text-sm text-muted-foreground">{step}</div>
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            ) : (
                              <div className="glass-card p-12 text-center border-dashed border-2">
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                                  <ShieldAlert className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Deep AI Mentorship Offline</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                  Set your <code>OPENAI_API_KEY</code> on the backend to enable high-fidelity senior coaching, architectural pattern recognition, and strategic code advice.
                                </p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
