import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import {
  Search, Filter, BookOpen, CheckCircle2, Bookmark, ChevronDown,
  ChevronRight, Sparkles, Loader2, Lightbulb, Trophy, Star,
  BarChart3, Flame, RefreshCw, Eye, EyeOff, Tag, Building2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string; category: string; topic: string; difficulty: 'easy' | 'medium' | 'hard';
  companies: string[]; title: string; description: string;
  hint: string; sample_answer: string; tags: string[];
  status: 'practiced' | 'bookmarked' | 'skipped' | null;
}
interface Followup { question: string; purpose: string; difficulty: string; }
interface Stats { total: number; practiced: number; bookmarked: number; breakdown: { category: string; total: number; practiced: number }[]; }

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',           label: 'All',            color: 'from-slate-500 to-slate-600',     bg: 'bg-slate-500/10', text: 'text-slate-400' },
  { key: 'dsa',           label: 'DSA',             color: 'from-violet-500 to-purple-600',   bg: 'bg-violet-500/10', text: 'text-violet-400' },
  { key: 'system_design', label: 'System Design',   color: 'from-sky-500 to-cyan-600',        bg: 'bg-sky-500/10',    text: 'text-sky-400' },
  { key: 'behavioral',    label: 'Behavioral',      color: 'from-emerald-500 to-green-600',   bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { key: 'hr',            label: 'HR',              color: 'from-rose-500 to-pink-600',       bg: 'bg-rose-500/10',   text: 'text-rose-400' },
];

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

const DIFF_STYLE: Record<string, string> = {
  easy:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15  text-amber-400  border-amber-500/30',
  hard:   'bg-rose-500/15   text-rose-400   border-rose-500/30',
};

const CAT_META: Record<string, { color: string; bg: string; text: string }> = {
  dsa:           { color: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  system_design: { color: 'from-sky-500 to-cyan-600',      bg: 'bg-sky-500/10',    text: 'text-sky-400' },
  behavioral:    { color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  hr:            { color: 'from-rose-500 to-pink-600',     bg: 'bg-rose-500/10',   text: 'text-rose-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardQuestionBank() {
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [daily, setDaily]               = useState<Question | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showHint, setShowHint]         = useState(false);
  const [showAnswer, setShowAnswer]     = useState(false);
  const [followups, setFollowups]       = useState<Followup[]>([]);
  const [fupLoading, setFupLoading]     = useState(false);
  const [marking, setMarking]           = useState<string | null>(null);

  // Filters
  const [category, setCategory]   = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [search, setSearch]         = useState('');

  const token = useRef(localStorage.getItem('accessToken') || '');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all')   params.set('category', category);
      if (difficulty !== 'all') params.set('difficulty', difficulty);
      if (search.trim())        params.set('search', search.trim());

      const [qRes, sRes, dRes] = await Promise.all([
        fetch(buildApiUrl(`/api/skills/questions/?${params}`), { headers: { Authorization: `Bearer ${token.current}` } }),
        fetch(buildApiUrl('/api/skills/questions/stats/'),      { headers: { Authorization: `Bearer ${token.current}` } }),
        fetch(buildApiUrl('/api/skills/questions/daily/'),      { headers: { Authorization: `Bearer ${token.current}` } }),
      ]);
      const qData = await qRes.json();
      const sData = await sRes.json();
      const dData = await dRes.json();
      setQuestions(Array.isArray(qData.items) ? qData.items : []);
      setStats(sData);
      setDaily(dData?.id ? dData : null);
    } catch { setQuestions([]); } finally { setLoading(false); }
  }, [category, difficulty, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selected = questions.find((q) => q.id === selectedId) || null;

  const openQuestion = (q: Question) => {
    setSelectedId(q.id);
    setShowHint(false);
    setShowAnswer(false);
    setFollowups([]);
  };

  const mark = async (id: string, status: string | null) => {
    setMarking(id);
    try {
      const r = await fetch(buildApiUrl(`/api/skills/questions/${id}/mark/`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status ?? 'remove' }),
      });
      const d = await r.json();
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, status: d.status } : q));
      if (daily?.id === id) setDaily((prev) => prev ? { ...prev, status: d.status } : prev);
    } finally { setMarking(null); }
  };

  const loadFollowups = async (id: string) => {
    setFupLoading(true);
    setFollowups([]);
    try {
      const r = await fetch(buildApiUrl(`/api/skills/questions/${id}/followups/`), { headers: { Authorization: `Bearer ${token.current}` } });
      const d = await r.json();
      setFollowups(Array.isArray(d.followups) ? d.followups : []);
    } finally { setFupLoading(false); }
  };

  const progressPct = stats ? Math.round((stats.practiced / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6 max-w-7xl">

          {/* ── Header ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-1">
                  Question Bank
                </h1>
                <p className="text-muted-foreground">Master DSA, System Design, Behavioral & HR with daily practice</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2 rounded-xl">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </motion.div>

          {/* ── Stats Bar ──────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4 col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-extrabold">{stats?.practiced ?? 0}<span className="text-sm text-muted-foreground font-normal">/{stats?.total ?? 0}</span></p>
                  <p className="text-xs text-muted-foreground">Practiced</p>
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-sky-400 flex-shrink-0" />
              <div><p className="text-2xl font-extrabold">{stats?.bookmarked ?? 0}</p><p className="text-xs text-muted-foreground">Bookmarked</p></div>
            </div>
            {stats?.breakdown?.slice(0, 2).map((b) => {
              const meta = CAT_META[b.category] || CAT_META.dsa;
              const pct = Math.round((b.practiced / Math.max(b.total, 1)) * 100);
              return (
                <div key={b.category} className="glass-card p-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={cn('font-semibold capitalize', meta.text)}>{b.category.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{b.practiced}/{b.total}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full bg-gradient-to-r', meta.color)} style={{ width: `${pct}%`, transition: 'width 0.8s' }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{pct}% done</p>
                </div>
              );
            })}
          </motion.div>

          {/* ── Daily Challenge ────────────────────────────────── */}
          {daily && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-5 mb-6 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 cursor-pointer hover:border-amber-500/40 transition-colors"
              onClick={() => openQuestion(daily)}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-0.5">Daily Challenge</p>
                    <p className="font-semibold">{daily.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{daily.category.replace('_', ' ')} · {daily.difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {daily.status === 'practiced' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  <span className={cn('text-xs px-2 py-1 rounded-full border', DIFF_STYLE[daily.difficulty])}>
                    {daily.difficulty}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-6">
            {/* ── LEFT: Filters + List ───────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Category Tabs */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="flex gap-2 flex-wrap mb-4">
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
                      category === c.key
                        ? `bg-gradient-to-r ${c.color} text-white border-transparent shadow-lg`
                        : 'bg-card/40 border-border/60 text-muted-foreground hover:border-primary/30')}>
                    {c.label}
                    {stats?.breakdown?.find((b) => b.category === c.key) && (
                      <span className="ml-1.5 text-[10px] opacity-70">
                        {stats.breakdown.find((b) => b.category === c.key)?.total}
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>

              {/* Search + Difficulty */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}
                className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions, topics, tags..."
                    className="pl-9 rounded-xl bg-card/40 border-border/60" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all capitalize',
                        difficulty === d
                          ? d === 'all' ? 'bg-primary text-primary-foreground border-primary' : `border ${DIFF_STYLE[d]} opacity-100`
                          : 'bg-card/40 border-border/60 text-muted-foreground hover:border-primary/30')}>
                      {d}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Question List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No questions match your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, idx) => {
                    const meta = CAT_META[q.category] || CAT_META.dsa;
                    const isSelected = q.id === selectedId;
                    return (
                      <motion.div key={q.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                        onClick={() => openQuestion(q)}
                        className={cn('rounded-2xl border cursor-pointer transition-all duration-200 group',
                          isSelected ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5' : 'border-border/60 bg-card/40 hover:border-primary/30 hover:bg-card/60')}>
                        <div className="p-4 flex items-center gap-3">
                          {/* Status indicator */}
                          <div className="flex-shrink-0">
                            {q.status === 'practiced' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : q.status === 'bookmarked' ? (
                              <Bookmark className="w-5 h-5 text-sky-400 fill-sky-400" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/50 transition-colors" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{q.title}</span>
                              {q.companies.slice(0, 2).map((c) => (
                                <span key={c} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded hidden md:inline">
                                  {c}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('text-[10px] font-medium', meta.text)}>{q.topic}</span>
                              <span className="text-muted-foreground text-[10px]">·</span>
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', DIFF_STYLE[q.difficulty])}>
                                {q.difficulty}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', isSelected && 'rotate-90')} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT: Question Detail Panel ──────────────────── */}
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div key={selected.id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="w-[420px] flex-shrink-0 space-y-4 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">

                  {/* Header */}
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', CAT_META[selected.category]?.bg, CAT_META[selected.category]?.text)}>
                            {selected.category.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={cn('text-[10px] px-2 py-1 rounded-full border', DIFF_STYLE[selected.difficulty])}>
                            {selected.difficulty}
                          </span>
                        </div>
                        <h2 className="font-bold text-lg leading-tight">{selected.title}</h2>
                        <p className="text-xs text-muted-foreground mt-1">{selected.topic}</p>
                      </div>
                      <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Companies */}
                    {selected.companies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                        {selected.companies.map((c) => (
                          <span key={c} className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-lg">{c}</span>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                        {selected.tags.map((t) => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg">#{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Button size="sm"
                        onClick={() => mark(selected.id, selected.status === 'practiced' ? null : 'practiced')}
                        disabled={marking === selected.id}
                        className={cn('gap-1.5 rounded-xl flex-1 text-xs', selected.status === 'practiced' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0' : '')}>
                        {marking === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {selected.status === 'practiced' ? 'Practiced ✓' : 'Mark Practiced'}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => mark(selected.id, selected.status === 'bookmarked' ? null : 'bookmarked')}
                        disabled={marking === selected.id}
                        className={cn('gap-1.5 rounded-xl text-xs', selected.status === 'bookmarked' && 'border-sky-500 text-sky-400 bg-sky-500/10')}>
                        <Bookmark className={cn('w-3.5 h-3.5', selected.status === 'bookmarked' && 'fill-sky-400')} />
                        {selected.status === 'bookmarked' ? 'Saved' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  {/* Hint */}
                  <div className="glass-card p-4">
                    <button onClick={() => setShowHint(!showHint)} className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                        <Lightbulb className="w-4 h-4" /> Hint
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showHint && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {showHint && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                          {selected.hint || 'No hint available for this question.'}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sample Answer */}
                  <div className="glass-card p-4">
                    <button onClick={() => setShowAnswer(!showAnswer)} className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                        {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showAnswer ? 'Hide Answer' : 'View Sample Answer'}
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showAnswer && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {showAnswer && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3 whitespace-pre-wrap">
                          {selected.sample_answer || 'No sample answer available.'}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* AI Follow-ups */}
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Sparkles className="w-4 h-4 text-primary" /> AI Follow-up Questions
                      </div>
                      <Button size="sm" variant="outline" onClick={() => loadFollowups(selected.id)} disabled={fupLoading}
                        className="gap-1.5 text-xs rounded-xl h-7 px-3">
                        {fupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {followups.length ? 'Regenerate' : 'Generate'}
                      </Button>
                    </div>

                    {fupLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : followups.length > 0 ? (
                      <div className="space-y-3">
                        {followups.map((f, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="p-3 rounded-xl bg-muted/30 border border-border/40">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-snug">{f.question}</p>
                              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border flex-shrink-0', DIFF_STYLE[f.difficulty] || DIFF_STYLE.medium)}>
                                {f.difficulty}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5 italic">{f.purpose}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Click Generate to get AI-crafted follow-up questions
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
