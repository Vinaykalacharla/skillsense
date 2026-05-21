import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import {
  BadgeCheck, Download, FileText, Share2, Shield,
  Star, ExternalLink, ChevronDown, Copy, Check, Award, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { buildApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface EvidenceItem { source: string; title: string; detail: string; url?: string; created_at?: string | null; }
interface VerifiedSkill { name: string; level: string; evidence: number; verified: boolean; evidence_items: EvidenceItem[]; score?: number; }

const getLevelBadge = (score: number) => {
  if (score >= 85) return { label: 'Platinum', color: 'from-slate-300 to-slate-100', text: 'text-slate-900', glow: 'shadow-slate-300/40' };
  if (score >= 70) return { label: 'Gold',     color: 'from-yellow-400 to-amber-300',  text: 'text-yellow-900', glow: 'shadow-yellow-400/40' };
  if (score >= 55) return { label: 'Silver',   color: 'from-zinc-300 to-zinc-200',    text: 'text-zinc-800',   glow: 'shadow-zinc-300/30' };
  return               { label: 'Bronze',   color: 'from-amber-700 to-amber-600',  text: 'text-amber-100',  glow: 'shadow-amber-700/30' };
};

const BAR_COLORS = ['#818cf8', '#34d399', '#fb923c', '#38bdf8'];

export default function SkillPassport() {
  const navigate = useNavigate();
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name?: string; college?: string; course?: string;
    profile_verified?: boolean; numeric_id?: number;
  } | null>(null);
  const [radarData, setRadarData] = useState<{ skill: string; level: number }[]>([]);
  const [barData, setBarData]     = useState<{ name: string; score: number }[]>([]);
  const [verifiedSkills, setVerifiedSkills] = useState<VerifiedSkill[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const token = useRef(localStorage.getItem('accessToken') || '');

  useEffect(() => {
    fetch(buildApiUrl('/api/accounts/profile/'), { headers: { Authorization: `Bearer ${token.current}` } })
      .then((r) => r.json()).then((d) => setProfile(d?.user || null)).catch(() => {});
    fetch(buildApiUrl('/api/skills/skill-passport/'), { headers: { Authorization: `Bearer ${token.current}` } })
      .then((r) => r.json()).then((d) => {
        setRadarData(Array.isArray(d?.radar_data) ? d.radar_data : []);
        setBarData(Array.isArray(d?.bar_data) ? d.bar_data : []);
        setVerifiedSkills(Array.isArray(d?.verified_skills) ? d.verified_skills : []);
      }).catch(() => {});
  }, []);

  const handleDownload = () => {
    setDownloading(true);
    fetch(buildApiUrl('/api/skills/skill-passport/pdf/'), { headers: { Authorization: `Bearer ${token.current}` } })
      .then((r) => r.blob()).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'skillsense-passport.pdf';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      }).finally(() => setDownloading(false));
  };

  const copyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const overallScore = barData.length ? Math.round(barData.reduce((s, b) => s + b.score, 0) / barData.length) : 0;
  const badge = getLevelBadge(overallScore);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6 max-w-6xl space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-1">
                Skill Passport
              </h1>
              <p className="text-muted-foreground">Your verified, recruiter-ready credential profile</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyShare} className="gap-2 rounded-xl">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard/resume-builder')} className="gap-2 rounded-xl">
                <FileText className="w-4 h-4" /> Resume
              </Button>
              <Button onClick={handleDownload} disabled={downloading} className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white border-0">
                <Download className="w-4 h-4" />
                {downloading ? 'Preparing...' : 'Download PDF'}
              </Button>
            </div>
          </motion.div>

          {/* 3D Flip ID Card */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="w-full" style={{ perspective: '1200px' }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}
              style={{ transformStyle: 'preserve-3d', position: 'relative', height: '220px' }}
              className="cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              {/* Front */}
              <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900 via-primary/20 to-accent/20 border border-white/10 p-6 flex overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOFYwaDQydjQySDM2VjE4eiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
                <div className="relative flex-1 flex gap-6 items-center">
                  {/* Avatar / Level Badge */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-primary/30">
                      {(profile?.full_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className={cn('text-[10px] font-bold px-3 py-1 rounded-full bg-gradient-to-r shadow-lg', badge.color, badge.text, badge.glow)}>
                      {badge.label}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">SkillSense Verified Passport</p>
                    <h2 className="text-2xl font-extrabold text-white mb-1">{profile?.full_name || 'Student'}</h2>
                    <p className="text-sm text-white/60">
                      {[profile?.course, profile?.college].filter(Boolean).join(' · ') || 'Complete your profile'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {profile?.profile_verified
                        ? <><BadgeCheck className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400 font-medium">Verified Profile</span></>
                        : <><Shield className="w-4 h-4 text-white/40" /><span className="text-xs text-white/40">Verification pending</span></>
                      }
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {barData.map((b, i) => (
                        <div key={b.name} className="px-2 py-1 rounded-lg bg-white/10 text-[10px] text-white/80 font-medium">
                          {b.name}: <span className="text-white font-bold">{b.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-white/40">Overall Score</p>
                      <p className="text-4xl font-black text-white">{overallScore}</p>
                    </div>
                    <p className="text-[10px] text-white/30">#{profile?.numeric_id || '------'}</p>
                    <p className="text-[10px] text-white/30 mt-2">Click to flip →</p>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900 via-accent/20 to-primary/20 border border-white/10 p-6 flex items-center gap-8 overflow-hidden">
                <div className="flex-1 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">Skill Index</p>
                  {barData.map((b, i) => (
                    <div key={b.name}>
                      <div className="flex justify-between text-xs text-white/70 mb-1">
                        <span>{b.name}</span><span className="font-bold text-white">{b.score}/100</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${b.score}%`, background: BAR_COLORS[i] }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-3">
                  {/* QR placeholder */}
                  <div className="w-24 h-24 rounded-xl bg-white p-1.5 flex items-center justify-center">
                    <svg viewBox="0 0 21 21" className="w-full h-full">
                      {[...Array(21)].map((_, r) => [...Array(21)].map((__, c) =>
                        Math.random() > 0.5 && r !== 0 && c !== 0 && r !== 20 && c !== 20 ? (
                          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" />
                        ) : null
                      ))}
                      <rect x="0" y="0" width="7" height="7" fill="none" stroke="#0f172a" strokeWidth="1" />
                      <rect x="14" y="0" width="7" height="7" fill="none" stroke="#0f172a" strokeWidth="1" />
                      <rect x="0" y="14" width="7" height="7" fill="none" stroke="#0f172a" strokeWidth="1" />
                    </svg>
                  </div>
                  <p className="text-[9px] text-white/40 text-center">Scan to verify</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Overall Score', value: `${overallScore}/100`, icon: Star, color: 'text-amber-400' },
              { label: 'Skills Verified', value: verifiedSkills.length, icon: BadgeCheck, color: 'text-emerald-400' },
              { label: 'Evidence Items', value: verifiedSkills.reduce((a, s) => a + (s.evidence_items?.length || 0), 0), icon: Shield, color: 'text-sky-400' },
              { label: 'Level', value: badge.label, icon: Award, color: 'text-purple-400' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                className="glass-card p-4 text-center">
                <s.icon className={cn('w-6 h-6 mx-auto mb-2', s.color)} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Skill Radar</h3>
              <div className="h-56">
                {radarData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No skills data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Radar dataKey="level" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
              <h3 className="font-semibold mb-4">Core Competencies</h3>
              <div className="h-56">
                {barData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={110} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                        {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* Verified Skills Ledger */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Proof Ledger
              <span className="text-xs text-muted-foreground font-normal ml-1">— click any skill to inspect evidence</span>
            </h3>
            <div className="space-y-3">
              {verifiedSkills.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">No verified skills yet — complete your profile</div>
              ) : (
                verifiedSkills.map((skill, idx) => {
                  const skillScore = skill.score || 80;
                  const sb = getLevelBadge(skillScore);
                  return (
                    <div key={idx} className="border border-border/50 rounded-2xl overflow-hidden">
                      <button onClick={() => setExpandedSkill(expandedSkill === skill.name ? null : skill.name)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{skill.name}</div>
                            <div className="text-xs text-muted-foreground">{skill.level} · {skill.evidence_items?.length || 0} evidence items</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r', sb.color, sb.text)}>
                            {sb.label}
                          </span>
                          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', expandedSkill === skill.name && 'rotate-180')} />
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedSkill === skill.name && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="border-t border-border/40 px-4 pb-4">
                            <div className="pt-4 space-y-3">
                              {skill.evidence_items?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No evidence attached yet</p>
                              ) : skill.evidence_items.map((item, i) => (
                                <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-sm">{item.title}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                                      {item.created_at && (
                                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString()}</p>
                                      )}
                                    </div>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">{item.source}</span>
                                  </div>
                                  {item.url && (
                                    <a href={item.url} target="_blank" rel="noreferrer"
                                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                                      View source <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
