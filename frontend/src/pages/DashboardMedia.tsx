import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import {
  Video, Music, Upload, Loader2, Mic, Square, Play, Pause,
  RotateCcw, Sparkles, CheckCircle, AlertCircle, Activity,
  Gauge, Waveform, MessageSquare, TrendingUp, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AIAnalysis {
  score: number; pace_wpm: number; filler_count: number;
  filler_words: string[]; critique: string;
  strengths: string[]; improvements: string[];
  analyzed_at: string;
}
interface MediaItem {
  id: string; title: string; media_type: 'video' | 'audio';
  status: string; file_url: string; created_at: string;
  ai_analysis: AIAnalysis | null;
}

function ScoreRing({ score }: { score: number }) {
  const r = 36, circ = 2 * Math.PI * r;
  const pct = (score / 100) * circ;
  const color = score >= 75 ? '#34d399' : score >= 55 ? '#fb923c' : '#f43f5e';
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${pct} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold">{score}</span>
        <span className="text-[9px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function DashboardMedia() {
  const [items, setItems]         = useState<MediaItem[]>([]);
  const [title, setTitle]         = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selected, setSelected]   = useState<string | null>(null);

  // Recorder state
  const [recording, setRecording]   = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [recorded, setRecorded]     = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const token      = useRef(localStorage.getItem('accessToken') || '');

  const load = useCallback(async () => {
    try {
      const r = await fetch(buildApiUrl('/api/skills/media/'), { headers: { Authorization: `Bearer ${token.current}` } });
      const d = await r.json();
      setItems(Array.isArray(d?.items) ? d.items : []);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // -- Recorder --
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mediaType === 'video' ? { video: true, audio: true } : { audio: true }
      );
      streamRef.current = stream;
      if (mediaType === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mediaType === 'video' ? 'video/webm' : 'audio/webm' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaType === 'video' ? 'video/webm' : 'audio/webm' });
        setRecorded(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        if (videoRef.current) videoRef.current.srcObject = null;
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(200);
      mediaRef.current = mr;
      setRecording(true);
      setRecDuration(0);
      timerRef.current = setInterval(() => setRecDuration((d) => d + 1), 1000);
    } catch (err) {
      alert('Camera/mic permission denied. Please allow access and try again.');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discardRecording = () => {
    setRecorded(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setRecDuration(0);
  };

  const fmtDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // -- Upload --
  const handleUpload = async (sourceBlob?: Blob) => {
    const uploadFile = sourceBlob ? new File([sourceBlob], `recording.${mediaType === 'video' ? 'webm' : 'webm'}`, { type: sourceBlob.type }) : file;
    if (!uploadFile) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', uploadFile);
    form.append('media_type', mediaType);
    if (title.trim()) form.append('title', title.trim());
    else form.append('title', `${mediaType === 'video' ? 'Video' : 'Audio'} Recording ${new Date().toLocaleDateString()}`);
    try {
      const r = await fetch(buildApiUrl('/api/skills/media/'), {
        method: 'POST', headers: { Authorization: `Bearer ${token.current}` }, body: form,
      });
      if (r.ok) {
        const d = await r.json();
        setItems((prev) => [d, ...prev]);
        setTitle(''); setFile(null); discardRecording();
      }
    } finally { setUploading(false); }
  };

  const analyze = async (id: string) => {
    setAnalyzing(id);
    try {
      const r = await fetch(buildApiUrl(`/api/skills/media/${id}/analyze/`), {
        method: 'POST', headers: { Authorization: `Bearer ${token.current}` },
      });
      const d = await r.json();
      setItems((prev) => prev.map((it) => (it.id === id || String(it.id) === id) ? { ...it, ai_analysis: d.ai_analysis } : it));
    } finally { setAnalyzing(null); }
  };

  const selectedItem = items.find((it) => String(it.id) === selected);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6 max-w-6xl space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-1">
              Media Studio
            </h1>
            <p className="text-muted-foreground">Record, upload, and get AI coaching on your presentations</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Recorder + Uploader */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">

              {/* Type Toggle */}
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Recording Type</p>
                <div className="flex gap-2 mb-4">
                  {(['video', 'audio'] as const).map((t) => (
                    <button key={t} onClick={() => setMediaType(t)}
                      className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        mediaType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/50 hover:border-primary/30')}>
                      {t === 'video' ? <Video className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Camera Preview */}
                {mediaType === 'video' && (
                  <div className="rounded-xl bg-black overflow-hidden mb-4 aspect-video relative">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {!recording && !previewUrl && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40">
                        <Video className="w-12 h-12" />
                      </div>
                    )}
                    {recording && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        REC {fmtDuration(recDuration)}
                      </div>
                    )}
                  </div>
                )}

                {mediaType === 'audio' && recording && (
                  <div className="rounded-xl bg-muted/30 p-4 mb-4 flex items-center gap-3">
                    <Mic className="w-5 h-5 text-red-400 animate-pulse" />
                    <div className="flex-1 flex gap-0.5 h-8 items-end">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="flex-1 bg-primary rounded-sm"
                          style={{ height: `${Math.random() * 100}%`, animation: `pulse ${0.3 + Math.random() * 0.5}s infinite alternate` }} />
                      ))}
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">{fmtDuration(recDuration)}</span>
                  </div>
                )}

                {/* Preview recorded clip */}
                {previewUrl && (
                  <div className="rounded-xl bg-muted/30 p-3 mb-4">
                    {mediaType === 'video'
                      ? <video src={previewUrl} controls className="w-full rounded-lg max-h-40" />
                      : <audio src={previewUrl} controls className="w-full" />
                    }
                  </div>
                )}

                {/* Recorder Controls */}
                <div className="flex gap-2">
                  {!recording && !recorded && (
                    <Button onClick={startRecording} className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white border-0">
                      <Mic className="w-4 h-4" /> Start Recording
                    </Button>
                  )}
                  {recording && (
                    <Button onClick={stopRecording} variant="outline" className="flex-1 gap-2 border-red-500 text-red-400 hover:bg-red-500/10">
                      <Square className="w-4 h-4" /> Stop
                    </Button>
                  )}
                  {recorded && (
                    <>
                      <Button onClick={() => handleUpload(recorded)} disabled={uploading} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent text-white border-0">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Recording
                      </Button>
                      <Button variant="ghost" size="icon" onClick={discardRecording} className="text-muted-foreground hover:text-destructive">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div className="glass-card p-4 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Or Upload a File</p>
                <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
                <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs cursor-pointer" />
                <Button onClick={() => handleUpload()} disabled={uploading || !file} className="w-full gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </motion.div>

            {/* Right: Library */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Media Library</h2>
                <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Video className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No media yet — record or upload above</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
                  {items.map((item) => {
                    const isSelected = String(item.id) === selected;
                    const isAnalyzing = analyzing === String(item.id);
                    return (
                      <div key={String(item.id)}
                        className={cn('rounded-2xl border transition-all duration-200 overflow-hidden',
                          isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-card/40 hover:border-primary/30')}>
                        <button className="w-full text-left p-4" onClick={() => setSelected(isSelected ? null : String(item.id))}>
                          <div className="flex items-start gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              item.media_type === 'video' ? 'bg-violet-500/15' : 'bg-sky-500/15')}>
                              {item.media_type === 'video' ? <Video className="w-5 h-5 text-violet-400" /> : <Music className="w-5 h-5 text-sky-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(item.created_at).toLocaleDateString()} · {item.media_type}
                              </p>
                            </div>
                            {item.ai_analysis && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-extrabold text-primary">{item.ai_analysis.score}</p>
                                <p className="text-[9px] text-muted-foreground">AI Score</p>
                              </div>
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              className="border-t border-border/40">
                              <div className="p-4 space-y-4">
                                {/* Media player */}
                                <div className="rounded-xl overflow-hidden bg-black/20">
                                  {item.media_type === 'video'
                                    ? <video src={item.file_url} controls className="w-full max-h-36" />
                                    : <audio src={item.file_url} controls className="w-full" />}
                                </div>

                                {/* AI Analysis */}
                                {!item.ai_analysis ? (
                                  <Button onClick={() => analyze(String(item.id))} disabled={isAnalyzing}
                                    className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-white border-0">
                                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isAnalyzing ? 'Analyzing speech...' : 'Run AI Speech Coach'}
                                  </Button>
                                ) : (
                                  <div className="space-y-3">
                                    {/* Score + Metrics */}
                                    <div className="flex gap-4">
                                      <ScoreRing score={item.ai_analysis.score} />
                                      <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-xl bg-muted/30 text-center">
                                          <p className="text-xs text-muted-foreground">Pace (WPM)</p>
                                          <p className="text-lg font-bold">{item.ai_analysis.pace_wpm}</p>
                                          <p className={cn('text-[9px]', item.ai_analysis.pace_wpm >= 120 && item.ai_analysis.pace_wpm <= 160 ? 'text-emerald-400' : 'text-amber-400')}>
                                            {item.ai_analysis.pace_wpm >= 120 && item.ai_analysis.pace_wpm <= 160 ? 'Ideal' : item.ai_analysis.pace_wpm < 120 ? 'Too slow' : 'Too fast'}
                                          </p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-muted/30 text-center">
                                          <p className="text-xs text-muted-foreground">Filler Words</p>
                                          <p className="text-lg font-bold">{item.ai_analysis.filler_count}</p>
                                          <p className={cn('text-[9px]', item.ai_analysis.filler_count <= 5 ? 'text-emerald-400' : 'text-rose-400')}>
                                            {item.ai_analysis.filler_count <= 5 ? 'Low' : 'High'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Filler words */}
                                    {item.ai_analysis.filler_words?.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1.5">Detected Fillers</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.ai_analysis.filler_words.map((w) => (
                                            <span key={w} className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">"{w}"</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Critique */}
                                    <div className="p-3 rounded-xl bg-muted/20 text-xs text-muted-foreground italic">
                                      <MessageSquare className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                                      {item.ai_analysis.critique}
                                    </div>

                                    {/* Strengths & Improvements */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-[10px] text-emerald-400 font-semibold mb-1.5 uppercase tracking-wide">Strengths</p>
                                        <ul className="space-y-1">
                                          {item.ai_analysis.strengths.map((s, i) => (
                                            <li key={i} className="flex gap-1.5 text-[10px] text-muted-foreground">
                                              <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />{s}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-amber-400 font-semibold mb-1.5 uppercase tracking-wide">Improve</p>
                                        <ul className="space-y-1">
                                          {item.ai_analysis.improvements.map((s, i) => (
                                            <li key={i} className="flex gap-1.5 text-[10px] text-muted-foreground">
                                              <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />{s}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>

                                    <Button onClick={() => analyze(String(item.id))} disabled={isAnalyzing}
                                      variant="outline" size="sm" className="w-full gap-2 text-xs rounded-xl">
                                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                      Re-analyze
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
