import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import {
  TrendingUp, Flame, Target, Loader2, ChevronDown,
  AlertTriangle, CheckCircle, BarChart3, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { buildApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProgressResponse {
  series: Array<Record<string, number | string>>;
  streak: number;
  milestones: Record<string, number>;
}

interface SimResult {
  tier: string; tier_label: string; probability: number;
  benchmark: Record<string, number>; current: Record<string, number>;
  gaps: { metric: string; current: number; required: number; gap: number }[];
  tips: string[];
}

const TIER_OPTIONS = [
  { key: 'faang',   label: 'FAANG / Tier-1',           color: 'from-rose-500 to-pink-600' },
  { key: 'product', label: 'Product / Tier-2',          color: 'from-amber-500 to-orange-500' },
  { key: 'service', label: 'Service / Tier-3',          color: 'from-sky-500 to-cyan-500' },
  { key: 'startup', label: 'Startups',                  color: 'from-emerald-500 to-green-500' },
];

const METRIC_COLORS: Record<string, string> = {
  coding_skill_index: '#818cf8',
  communication_score: '#34d399',
  authenticity_score: '#fb923c',
  placement_ready: '#38bdf8',
};

const METRIC_LABELS: Record<string, string> = {
  coding_skill_index: 'Coding',
  communication_score: 'Communication',
  authenticity_score: 'Authenticity',
  placement_ready: 'Placement Ready',
};

function GaugeDial({ value, color }: { value: number; color: string }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div className="relative w-40 h-20 overflow-hidden mx-auto">
      <svg viewBox="0 0 160 80" className="w-full h-full">
        <path d="M10 80 A70 70 0 0 1 150 80" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
        <path d="M10 80 A70 70 0 0 1 150 80"
          fill="none"
          stroke={`url(#gaugeGrad)`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 220} 220`}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <g transform={`translate(80,80) rotate(${angle})`}>
          <line x1="0" y1="-4" x2="0" y2="-55" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
          <circle r="5" fill="hsl(var(--foreground))" />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-0">
        <span className="text-2xl font-extrabold">{value}<span className="text-base font-normal text-muted-foreground">%</span></span>
      </div>
    </div>
  );
}

export default function DashboardProgress() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [simTier, setSimTier] = useState('product');
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [goalScore, setGoalScore] = useState(90);
  const [goalDays, setGoalDays] = useState(60);
  const token = useRef(localStorage.getItem('accessToken') || '');

  useEffect(() => {
    fetch(buildApiUrl('/api/skills/progress/'), { headers: { Authorization: `Bearer ${token.current}` } })
      .then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  const simulate = useCallback(async () => {
    setSimLoading(true);
    try {
      const r = await fetch(buildApiUrl('/api/skills/progress/simulate/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: simTier }),
      });
      setSimResult(await r.json());
    } catch { /* ignore */ } finally { setSimLoading(false); }
  }, [simTier]);

  useEffect(() => { simulate(); }, [simulate]);

  // Build goal projection overlay
  const seriesWithGoal = (data?.series || []).map((point, idx, arr) => {
    const progress = idx / Math.max(arr.length - 1, 1);
    const latest = Number(arr[arr.length - 1]?.placement_ready || 60);
    const projected = latest + (goalScore - latest) * (progress + 1 / arr.length) * (arr.length / Math.max(goalDays / 7, 1));
    return { ...point, goal_trajectory: Math.min(100, Math.round(projected)) };
  });

  const tierOption = TIER_OPTIONS.find((t) => t.key === simTier) || TIER_OPTIONS[1];

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6 space-y-6 max-w-6xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-1">Progress Dashboard</h1>
            <p className="text-muted-foreground">Track your growth, simulate placement odds, and project your trajectory</p>
          </motion.div>

          {/* Metric cards */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data?.milestones || {
              'Placement readiness': 0, 'Coding index': 0, Communication: 0, Authenticity: 0
            }).map(([key, value], i) => (
              <div key={key} className="glass-card p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-muted-foreground mb-1">{key}</p>
                  <p className="text-3xl font-extrabold">{Math.round(Number(value) || 0)}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: Object.values(METRIC_COLORS)[i] }}
                      initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                  </div>
                </div>
              </div>
            ))}
            <div className="glass-card p-4 col-span-2 md:col-span-1 flex items-center gap-3 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
              <Flame className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-extrabold">{data?.streak ?? 0}</p>
                <p className="text-xs text-muted-foreground">Day streak</p>
              </div>
            </div>
          </motion.div>

          {/* Trend Chart + Goal Tracker */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Score Trend</h2>
                <p className="text-xs text-muted-foreground">All indices over time with goal projection</p>
              </div>
              <div className="flex items-center gap-3 bg-muted/40 rounded-2xl px-4 py-2 border border-border/40">
                <Target className="w-4 h-4 text-primary" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Target:</label>
                  <input type="number" value={goalScore} min={1} max={100}
                    onChange={(e) => setGoalScore(Math.min(100, Math.max(1, Number(e.target.value))))}
                    className="w-14 bg-transparent text-sm font-bold text-center focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">in</label>
                  <input type="number" value={goalDays} min={7} max={365}
                    onChange={(e) => setGoalDays(Math.max(7, Number(e.target.value)))}
                    className="w-14 bg-transparent text-sm font-bold text-center focus:outline-none" />
                  <label className="text-xs text-muted-foreground">days</label>
                </div>
              </div>
            </div>
            <div className="h-72">
              {seriesWithGoal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No trend data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesWithGoal} margin={{ right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {Object.entries(METRIC_COLORS).map(([key, color]) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} name={METRIC_LABELS[key]} />
                    ))}
                    <Line type="monotone" dataKey="goal_trajectory" stroke="#f472b6" strokeWidth={2}
                      strokeDasharray="6 4" dot={false} name="Goal trajectory" />
                    <ReferenceLine y={goalScore} stroke="#f472b6" strokeDasharray="4 3" opacity={0.6}
                      label={{ value: `Goal: ${goalScore}`, fill: '#f472b6', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Placement Simulator */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Placement Probability Simulator</h2>
            </div>

            {/* Tier selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {TIER_OPTIONS.map((t) => (
                <button key={t.key} onClick={() => setSimTier(t.key)}
                  className={cn('rounded-2xl p-3 text-sm font-medium border transition-all duration-200 text-left',
                    simTier === t.key ? `bg-gradient-to-br ${t.color} text-white border-transparent` : 'bg-muted/30 border-border/50 hover:border-primary/30')}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Gauge */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/20 border border-border/40">
                {simLoading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{simResult?.tier_label}</p>
                    <GaugeDial value={simResult?.probability ?? 0} color={tierOption.color} />
                    <p className="text-sm text-muted-foreground mt-3">
                      Estimated placement probability
                    </p>
                    <Button onClick={simulate} disabled={simLoading} variant="outline" size="sm" className="mt-3 gap-2 rounded-xl">
                      <BarChart3 className="w-4 h-4" /> Recalculate
                    </Button>
                  </>
                )}
              </div>

              {/* Gap Analysis */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Gap Analysis vs {simResult?.tier_label}</p>
                {(simResult?.gaps || []).map((g) => (
                  <div key={g.metric} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{g.metric}</span>
                      <span className="text-rose-400 font-semibold">−{g.gap} pts</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                      <div className="h-full bg-primary/30 rounded-full" style={{ width: `${g.required}%` }} />
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                        style={{ width: `${g.current}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>You: {g.current}</span><span>Required: {g.required}</span>
                    </div>
                  </div>
                ))}
                {simResult?.gaps.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    <CheckCircle className="w-4 h-4" /> You meet all benchmarks for {simResult?.tier_label}!
                  </div>
                )}

                {/* Tips */}
                <div className="space-y-2 pt-2">
                  {(simResult?.tips || []).map((tip, i) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
