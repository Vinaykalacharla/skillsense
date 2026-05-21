import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import {
  CheckCircle2, Circle, ChevronRight, Sparkles, ExternalLink,
  Loader2, Target, Layers, Rocket, RefreshCw, BookOpen, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Resource { label: string; url: string; }
interface RoadmapItem {
  _id: string; id: string; title: string; description: string;
  status: 'pending' | 'in_progress' | 'completed';
  phase: number; estimated_days: number; resources: Resource[]; ai_generated: boolean;
}

const PHASE_META = [
  { label: 'Foundation', icon: Layers, color: 'from-violet-500 to-purple-600', ring: 'ring-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  { label: 'Application', icon: Target, color: 'from-sky-500 to-cyan-600',    ring: 'ring-sky-500/30',    bg: 'bg-sky-500/10',    text: 'text-sky-400' },
  { label: 'Interview Prep', icon: Rocket, color: 'from-emerald-500 to-green-600', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
];

const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager', 'Android Developer', 'iOS Developer'];
const SENIORITY = ['Entry Level (0-1 yr)', 'Junior (1-3 yrs)', 'Mid Level (3-5 yrs)', 'Senior (5+ yrs)'];

export default function DashboardRoadmap() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [role, setRole] = useState(ROLES[0]);
  const [seniority, setSeniority] = useState(SENIORITY[0]);
  const token = useRef(localStorage.getItem('accessToken') || '');

  const load = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/skills/roadmap/'), { headers: { Authorization: `Bearer ${token.current}` } });
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch { setItems([]); }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(buildApiUrl('/api/skills/roadmap/generate/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_role: role, seniority: seniority.split(' (')[0] }),
      });
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch { /* keep existing */ } finally { setGenerating(false); }
  };

  const toggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await fetch(buildApiUrl(`/api/skills/roadmap/${id}/toggle/`), {
        method: 'POST', headers: { Authorization: `Bearer ${token.current}` },
      });
      const updated = await res.json();
      setItems((prev) => prev.map((it) => (it._id === id || it.id === id) ? { ...it, status: updated.status } : it));
    } catch { /* ignore */ } finally { setToggling(null); }
  };

  const phases = [1, 2, 3];
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6 max-w-5xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-1">
                  Learning Roadmap
                </h1>
                <p className="text-muted-foreground">AI-crafted placement path tailored to your profile</p>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="text-muted-foreground">{completedCount}/{totalCount} done</span>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
                </div>
                <span className="text-primary font-semibold">{progress}%</span>
              </div>
            </div>
          </motion.div>

          {/* Generator Controls */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-5 mb-8 border border-primary/20">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Target Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Seniority</label>
                <select value={seniority} onChange={(e) => setSeniority(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {SENIORITY.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Button onClick={generate} disabled={generating} className="gap-2 px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white border-0">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate AI Roadmap'}
              </Button>
              <Button variant="ghost" size="icon" onClick={load} title="Refresh" className="rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Phase Timeline */}
          {items.length === 0 && !generating ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
              <p className="text-muted-foreground text-lg">Select a role and generate your AI roadmap above</p>
            </motion.div>
          ) : generating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">Crafting your personalized roadmap with AI...</p>
            </div>
          ) : (
            <div className="space-y-10">
              {phases.map((phaseNum) => {
                const meta = PHASE_META[phaseNum - 1];
                const PhaseIcon = meta.icon;
                const phaseItems = items.filter((it) => it.phase === phaseNum);
                if (!phaseItems.length) return null;
                const phaseDone = phaseItems.filter((it) => it.status === 'completed').length;
                const isPhaseUnlocked = phaseNum === 1 || items.filter((it) => it.phase === phaseNum - 1).every((it) => it.status === 'completed');

                return (
                  <motion.div key={phaseNum} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: phaseNum * 0.1 }}>
                    {/* Phase Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn('w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center', meta.color)}>
                        <PhaseIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">Phase {phaseNum}: {meta.label}</span>
                          {!isPhaseUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{phaseDone}/{phaseItems.length} milestones complete</p>
                      </div>
                      <div className={cn('ml-auto text-xs font-semibold px-3 py-1 rounded-full', meta.bg, meta.text)}>
                        {Math.round((phaseDone / phaseItems.length) * 100)}%
                      </div>
                    </div>

                    {/* Timeline Items */}
                    <div className="relative pl-6">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-3">
                        {phaseItems.map((item, idx) => {
                          const itemId = item._id || item.id;
                          const isDone = item.status === 'completed';
                          const isTogglingThis = toggling === itemId;
                          const isExpanded = expanded === itemId;

                          return (
                            <motion.div key={itemId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06 }}
                              className={cn('relative rounded-2xl border transition-all duration-300 overflow-hidden',
                                isDone ? 'bg-primary/5 border-primary/30' : 'bg-card/40 border-border/60 hover:border-primary/30',
                                !isPhaseUnlocked && 'opacity-50 pointer-events-none'
                              )}>
                              {/* Timeline dot */}
                              <div className={cn('absolute -left-[25px] top-5 w-3.5 h-3.5 rounded-full border-2 border-background z-10',
                                isDone ? 'bg-primary' : 'bg-muted')}>
                              </div>

                              <button className="w-full text-left p-4 flex items-start gap-3"
                                onClick={() => setExpanded(isExpanded ? null : itemId)}>
                                <button onClick={(e) => { e.stopPropagation(); toggle(itemId); }}
                                  className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform">
                                  {isTogglingThis ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                  ) : isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn('font-semibold', isDone && 'line-through text-muted-foreground')}>{item.title}</span>
                                    {item.ai_generated && (
                                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" /> AI
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto">~{item.estimated_days}d</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                                </div>
                                <ChevronRight className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform', isExpanded && 'rotate-90')} />
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                    className="px-4 pb-4 border-t border-border/40">
                                    {item.resources?.length > 0 && (
                                      <div className="pt-3">
                                        <p className="text-xs text-muted-foreground mb-2 font-medium">Resources</p>
                                        <div className="flex flex-wrap gap-2">
                                          {item.resources.map((r, ri) => (
                                            <a key={ri} href={r.url} target="_blank" rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-xs bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-lg text-primary transition-colors">
                                              {r.label} <ExternalLink className="w-3 h-3" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
