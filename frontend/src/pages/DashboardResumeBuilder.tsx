import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildApiUrl } from '@/lib/api';
import {
  Download,
  FileText,
  Link2,
  Sparkles,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Loader2,
  Save,
  Briefcase,
  GraduationCap,
  Award,
  Layers,
  Check,
  RefreshCcw,
} from 'lucide-react';

interface ResumeContact {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

interface ResumeEducation {
  college: string;
  course: string;
  branch: string;
  year_of_study: string;
  cgpa: string | number;
}

interface ResumeSkill {
  name: string;
  category: string;
}

interface ResumeProject {
  title: string;
  description: string;
  link?: string;
  technologies?: string;
}

interface ResumeExperience {
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface ResumePreview {
  template: 'modern' | 'minimalist' | 'corporate' | 'creative';
  full_name: string;
  headline: string;
  summary: string;
  contact: ResumeContact;
  education: ResumeEducation;
  skills: ResumeSkill[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  achievements: string[];
}

export default function DashboardResumeBuilder() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ResumePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [optimizingField, setOptimizingField] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState('personal');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/student');
      return;
    }

    fetch(buildApiUrl('/api/skills/resume-builder/'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'Unable to load resume builder.');
        }
        return res.json();
      })
      .then((payload: ResumePreview) => {
        // Ensure sub-arrays exist
        const sanitized = {
          ...payload,
          template: payload.template || 'modern',
          contact: payload.contact || { email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
          education: payload.education || { college: '', course: '', branch: '', year_of_study: '', cgpa: '' },
          skills: payload.skills || [],
          projects: payload.projects || [],
          experience: payload.experience || [],
          achievements: payload.achievements || [],
        };
        setPreview(sanitized);
        setError('');
      })
      .catch((fetchError: unknown) => {
        setPreview(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load resume builder.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async (updatedPreview: ResumePreview = preview!) => {
    if (!updatedPreview) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch(buildApiUrl('/api/skills/resume-builder/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPreview),
      });
      if (!response.ok) {
        throw new Error('Failed to save resume.');
      }
      const data = await response.json();
      setPreview(data);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save resume.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    setDownloading(true);
    try {
      const response = await fetch(buildApiUrl('/api/skills/resume-builder/pdf/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Unable to generate resume PDF.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(preview?.full_name || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to generate resume PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOptimizeField = async (
    text: string,
    type: 'summary' | 'experience' | 'project',
    fieldId: string,
    onSuccess: (optimized: string) => void
  ) => {
    if (!text || text.trim().length < 5) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setOptimizingField(fieldId);
    try {
      const response = await fetch(buildApiUrl('/api/skills/resume-builder/optimize/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, type }),
      });
      if (!response.ok) {
        throw new Error('Failed to optimize text.');
      }
      const data = await response.json();
      if (data.optimized_text) {
        onSuccess(data.optimized_text);
      }
    } catch (optError) {
      alert(optError instanceof Error ? optError.message : 'Unable to optimize text.');
    } finally {
      setOptimizingField(null);
    }
  };

  const updatePreviewField = (updates: Partial<ResumePreview>) => {
    if (!preview) return;
    const updated = { ...preview, ...updates };
    setPreview(updated);
  };

  const updateContactField = (updates: Partial<ResumeContact>) => {
    if (!preview) return;
    const updated = { ...preview, contact: { ...preview.contact, ...updates } };
    setPreview(updated);
  };

  const updateEducationField = (updates: Partial<ResumeEducation>) => {
    if (!preview) return;
    const updated = { ...preview, education: { ...preview.education, ...updates } };
    setPreview(updated);
  };

  // Experience management
  const handleUpdateExperience = (index: number, updates: Partial<ResumeExperience>) => {
    if (!preview) return;
    const updatedExp = [...preview.experience];
    updatedExp[index] = { ...updatedExp[index], ...updates };
    updatePreviewField({ experience: updatedExp });
  };

  const handleAddExperience = () => {
    if (!preview) return;
    const newExp: ResumeExperience = {
      company: 'New Company',
      role: 'Software Engineer',
      location: 'Remote',
      start_date: '01/2025',
      end_date: 'Present',
      description: 'Optimized system efficiency, collaborated with developers, and solved bugs.',
    };
    updatePreviewField({ experience: [...preview.experience, newExp] });
  };

  const handleRemoveExperience = (index: number) => {
    if (!preview) return;
    const updatedExp = preview.experience.filter((_, i) => i !== index);
    updatePreviewField({ experience: updatedExp });
  };

  // Projects management
  const handleUpdateProject = (index: number, updates: Partial<ResumeProject>) => {
    if (!preview) return;
    const updatedProjs = [...preview.projects];
    updatedProjs[index] = { ...updatedProjs[index], ...updates };
    updatePreviewField({ projects: updatedProjs });
  };

  const handleAddProject = () => {
    if (!preview) return;
    const newProj: ResumeProject = {
      title: 'New Project',
      description: 'Developed an innovative full stack application resolving real-world problems.',
      link: '',
      technologies: 'React, Node.js, Express, MongoDB',
    };
    updatePreviewField({ projects: [...preview.projects, newProj] });
  };

  const handleRemoveProject = (index: number) => {
    if (!preview) return;
    const updatedProjs = preview.projects.filter((_, i) => i !== index);
    updatePreviewField({ projects: updatedProjs });
  };

  // Skills management
  const handleAddSkill = (name: string, category: string = 'Technical Skills') => {
    if (!preview || !name.trim()) return;
    if (preview.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    updatePreviewField({
      skills: [...preview.skills, { name: name.trim(), category }],
    });
  };

  const handleRemoveSkill = (index: number) => {
    if (!preview) return;
    updatePreviewField({
      skills: preview.skills.filter((_, i) => i !== index),
    });
  };

  // Achievements management
  const handleAddAchievement = (text: string) => {
    if (!preview || !text.trim()) return;
    updatePreviewField({
      achievements: [...preview.achievements, text.trim()],
    });
  };

  const handleRemoveAchievement = (index: number) => {
    if (!preview) return;
    updatePreviewField({
      achievements: preview.achievements.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardSidebar />

      <div className="pl-[260px]">
        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Premium Resume Engine
              </div>
              <h1 className="mt-4 text-3xl font-bold">Interactive Resume Builder</h1>
              <p className="text-muted-foreground">
                Polish your engineering achievements with AI optimization and choose from 4 designer templates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => handleSave()}
                disabled={saving || loading || !preview}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={handleDownload} disabled={downloading || loading || !preview} className="rounded-xl px-5">
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>
          </motion.div>

          {loading ? (
            <div className="glass-card p-12 text-center text-muted-foreground flex flex-col items-center gap-3 justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Fetching and preparing your premium resume sandbox...</span>
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center text-destructive flex items-center justify-center flex-col gap-4">
              <p className="font-semibold">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCcw className="w-4 h-4 mr-2" /> Reload Sandbox
              </Button>
            </div>
          ) : preview ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
              
              {/* LEFT COLUMN: EDIT PANEL */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Template / Style Selection Header */}
                <Card className="glass-card border-primary/10">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-muted-foreground mb-4 uppercase">
                      Select Style Template
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'modern', label: 'Modern Accent', desc: 'Sleek, colored headers' },
                        { id: 'minimalist', label: 'Minimalist', desc: 'Classic academic serif' },
                        { id: 'corporate', label: 'Corporate Tech', desc: 'Left-aligned, clean grids' },
                        { id: 'creative', label: 'Creative Column', desc: 'Dynamic split layout' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => updatePreviewField({ template: t.id as any })}
                          className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-300 ${
                            preview.template === t.id
                              ? 'bg-primary/10 border-primary shadow-lg ring-1 ring-primary/20'
                              : 'bg-card/40 border-border hover:border-primary/20 hover:bg-card/60'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full mb-1">
                            <span className="font-semibold text-sm capitalize">{t.label}</span>
                            {preview.template === t.id && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Navigation Tabs */}
                <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
                  <TabsList className="bg-muted/40 p-1 rounded-xl w-full grid grid-cols-4 mb-6">
                    <TabsTrigger value="personal" className="rounded-lg text-xs md:text-sm">Profile</TabsTrigger>
                    <TabsTrigger value="experience" className="rounded-lg text-xs md:text-sm">Experience</TabsTrigger>
                    <TabsTrigger value="projects" className="rounded-lg text-xs md:text-sm">Projects</TabsTrigger>
                    <TabsTrigger value="skills" className="rounded-lg text-xs md:text-sm">Skills & Edu</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Profile & Contact */}
                  <TabsContent value="personal" className="space-y-4 focus-visible:outline-none">
                    <Card className="glass-card border-none">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="text-primary w-5 h-5" />
                          <h3 className="font-bold text-lg">Header Information</h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                            <Input
                              value={preview.full_name || ''}
                              onChange={(e) => updatePreviewField({ full_name: e.target.value })}
                              placeholder="e.g. Alex Mercer"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Professional Headline</label>
                            <Input
                              value={preview.headline || ''}
                              onChange={(e) => updatePreviewField({ headline: e.target.value })}
                              placeholder="e.g. Full Stack Engineer"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                            <Input
                              value={preview.contact?.email || ''}
                              onChange={(e) => updateContactField({ email: e.target.value })}
                              placeholder="e.g. alex@example.com"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                            <Input
                              value={preview.contact?.phone || ''}
                              onChange={(e) => updateContactField({ phone: e.target.value })}
                              placeholder="e.g. +91 9876543210"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Location</label>
                            <Input
                              value={preview.contact?.location || ''}
                              onChange={(e) => updateContactField({ location: e.target.value })}
                              placeholder="e.g. Bangalore, India"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">LinkedIn Link</label>
                            <Input
                              value={preview.contact?.linkedin || ''}
                              onChange={(e) => updateContactField({ linkedin: e.target.value })}
                              placeholder="linkedin.com/in/alex"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">GitHub Link</label>
                            <Input
                              value={preview.contact?.github || ''}
                              onChange={(e) => updateContactField({ github: e.target.value })}
                              placeholder="github.com/alex"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Portfolio Website</label>
                            <Input
                              value={preview.contact?.website || ''}
                              onChange={(e) => updateContactField({ website: e.target.value })}
                              placeholder="alex.dev"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-border/40">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Professional Summary</label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/10 text-xs px-2 h-7 rounded-lg"
                              onClick={() =>
                                handleOptimizeField(preview.summary, 'summary', 'summary', (polished) =>
                                  updatePreviewField({ summary: polished })
                                )
                              }
                              disabled={optimizingField === 'summary'}
                            >
                              {optimizingField === 'summary' ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              AI Polish Summary
                            </Button>
                          </div>
                          <Textarea
                            value={preview.summary || ''}
                            onChange={(e) => updatePreviewField({ summary: e.target.value })}
                            placeholder="Brief professional background summary..."
                            rows={4}
                            className="bg-background/40"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 2: Work Experience */}
                  <TabsContent value="experience" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Briefcase className="text-primary w-5 h-5" /> Work Experience
                      </h3>
                      <Button onClick={handleAddExperience} size="sm" className="rounded-lg">
                        <Plus className="w-4 h-4 mr-1" /> Add Job
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {preview.experience.length === 0 ? (
                        <div className="glass-card p-6 text-center text-muted-foreground">
                          No work experience added. Click "Add Job" to start.
                        </div>
                      ) : (
                        preview.experience.map((exp, index) => (
                          <Card key={index} className="glass-card border-none overflow-hidden relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExperience(index)}
                              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            <CardContent className="p-6 space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Company</label>
                                  <Input
                                    value={exp.company || ''}
                                    onChange={(e) => handleUpdateExperience(index, { company: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Role / Title</label>
                                  <Input
                                    value={exp.role || ''}
                                    onChange={(e) => handleUpdateExperience(index, { role: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Location</label>
                                  <Input
                                    value={exp.location || ''}
                                    onChange={(e) => handleUpdateExperience(index, { location: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</label>
                                  <Input
                                    value={exp.start_date || ''}
                                    onChange={(e) => handleUpdateExperience(index, { start_date: e.target.value })}
                                    placeholder="MM/YYYY"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">End Date</label>
                                  <Input
                                    value={exp.end_date || ''}
                                    onChange={(e) => handleUpdateExperience(index, { end_date: e.target.value })}
                                    placeholder="MM/YYYY or Present"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Job Description / Achievements</label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:bg-primary/10 text-xs px-2 h-7 rounded-lg"
                                    onClick={() =>
                                      handleOptimizeField(exp.description, 'experience', `exp-${index}`, (polished) =>
                                        handleUpdateExperience(index, { description: polished })
                                      )
                                    }
                                    disabled={optimizingField === `exp-${index}`}
                                  >
                                    {optimizingField === `exp-${index}` ? (
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    AI Optimize Bullets
                                  </Button>
                                </div>
                                <Textarea
                                  value={exp.description || ''}
                                  onChange={(e) => handleUpdateExperience(index, { description: e.target.value })}
                                  placeholder="Use bullet points beginning with action verbs. Describe tasks and numerical outcomes..."
                                  rows={4}
                                  className="bg-background/40"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab 3: Projects */}
                  <TabsContent value="projects" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Layers className="text-primary w-5 h-5" /> Projects & Code Evidence
                      </h3>
                      <Button onClick={handleAddProject} size="sm" className="rounded-lg">
                        <Plus className="w-4 h-4 mr-1" /> Add Project
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {preview.projects.length === 0 ? (
                        <div className="glass-card p-6 text-center text-muted-foreground">
                          No projects added. Click "Add Project" to start.
                        </div>
                      ) : (
                        preview.projects.map((proj, index) => (
                          <Card key={index} className="glass-card border-none overflow-hidden relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveProject(index)}
                              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            <CardContent className="p-6 space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Project Title</label>
                                  <Input
                                    value={proj.title || ''}
                                    onChange={(e) => handleUpdateProject(index, { title: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Technologies Used</label>
                                  <Input
                                    value={proj.technologies || ''}
                                    onChange={(e) => handleUpdateProject(index, { technologies: e.target.value })}
                                    placeholder="e.g. React, Docker, Python"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Project Link / Repo URL</label>
                                <Input
                                  value={proj.link || ''}
                                  onChange={(e) => handleUpdateProject(index, { link: e.target.value })}
                                  placeholder="https://github.com/user/project"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Description & Key Contributions</label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:bg-primary/10 text-xs px-2 h-7 rounded-lg"
                                    onClick={() =>
                                      handleOptimizeField(proj.description, 'project', `proj-${index}`, (polished) =>
                                        handleUpdateProject(index, { description: polished })
                                      )
                                    }
                                    disabled={optimizingField === `proj-${index}`}
                                  >
                                    {optimizingField === `proj-${index}` ? (
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    AI Optimize Description
                                  </Button>
                                </div>
                                <Textarea
                                  value={proj.description || ''}
                                  onChange={(e) => handleUpdateProject(index, { description: e.target.value })}
                                  placeholder="Briefly state the goal, your actions, and metrics achieved..."
                                  rows={4}
                                  className="bg-background/40"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab 4: Skills, Education & Achievements */}
                  <TabsContent value="skills" className="space-y-4 focus-visible:outline-none">
                    {/* Education Card */}
                    <Card className="glass-card border-none">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                          <GraduationCap className="text-primary w-5 h-5" /> Education History
                        </h3>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">University / Institution Name</label>
                          <Input
                            value={preview.education?.college || ''}
                            onChange={(e) => updateEducationField({ college: e.target.value })}
                            placeholder="e.g. Stanford University"
                          />
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Course / Degree</label>
                            <Input
                              value={preview.education?.course || ''}
                              onChange={(e) => updateEducationField({ course: e.target.value })}
                              placeholder="e.g. Bachelor of Technology"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Branch / Major</label>
                            <Input
                              value={preview.education?.branch || ''}
                              onChange={(e) => updateEducationField({ branch: e.target.value })}
                              placeholder="e.g. Computer Science"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Graduation Year</label>
                            <Input
                              value={preview.education?.year_of_study || ''}
                              onChange={(e) => updateEducationField({ year_of_study: e.target.value })}
                              placeholder="e.g. 2026"
                            />
                          </div>
                        </div>

                        <div className="w-1/3 space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">CGPA / Grade</label>
                          <Input
                            value={preview.education?.cgpa ?? ''}
                            onChange={(e) => updateEducationField({ cgpa: e.target.value })}
                            placeholder="e.g. 9.1"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Skills Config */}
                    <Card className="glass-card border-none">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                          <Plus className="text-primary w-5 h-5" /> Skills Management
                        </h3>

                        <div className="flex gap-2">
                          <Input
                            id="new-skill-input"
                            placeholder="Add skill tag (e.g. Python, Docker)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.currentTarget;
                                handleAddSkill(target.value);
                                target.value = '';
                              }
                            }}
                          />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const input = document.getElementById('new-skill-input') as HTMLInputElement;
                              if (input && input.value) {
                                handleAddSkill(input.value);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {preview.skills.map((skill, sIdx) => (
                            <Badge
                              key={`${skill.name}-${sIdx}`}
                              variant="secondary"
                              className="px-3 py-1 bg-primary/5 hover:bg-destructive/10 hover:text-destructive group border-primary/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                              onClick={() => handleRemoveSkill(sIdx)}
                            >
                              {skill.name}
                              <Trash2 className="w-3 h-3 text-muted-foreground group-hover:text-destructive shrink-0" />
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Achievements Config */}
                    <Card className="glass-card border-none">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                          <Award className="text-primary w-5 h-5" /> Achievements
                        </h3>

                        <div className="flex gap-2">
                          <Input
                            id="new-achievement-input"
                            placeholder="Add highlight (e.g. Rank 15 at Hackathon)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.currentTarget;
                                handleAddAchievement(target.value);
                                target.value = '';
                              }
                            }}
                          />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const input = document.getElementById('new-achievement-input') as HTMLInputElement;
                              if (input && input.value) {
                                handleAddAchievement(input.value);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2 pt-2">
                          {preview.achievements.map((ach, aIdx) => (
                            <div
                              key={aIdx}
                              className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background/50 hover:bg-destructive/5 hover:border-destructive/30 transition-all group"
                            >
                              <span className="text-sm font-medium">{ach}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAchievement(aIdx)}
                                className="w-7 h-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>

              {/* RIGHT COLUMN: INTERACTIVE VISUAL LIVE PREVIEW */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="sticky top-6 space-y-4"
              >
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Live Render Preview
                  </h3>
                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full capitalize">
                    {preview.template} Mode
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[850px] custom-scrollbar flex justify-center">
                  
                  {/* High-fidelity paper canvas matching PDFKit layout and styled using CSS */}
                  <div
                    className={`bg-white text-slate-800 shadow-2xl p-10 min-h-[842px] w-[595px] select-none text-[12px] leading-relaxed transition-all duration-300 ${
                      preview.template === 'minimalist' ? 'font-serif' : 'font-sans'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                    }}
                  >
                    
                    {/* Modern Template Style */}
                    {preview.template === 'modern' && (
                      <div className="space-y-6 text-slate-700">
                        {/* Accent Banner */}
                        <div className="h-1.5 w-full bg-blue-500 rounded-full" />
                        
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-slate-900 leading-tight">{preview.full_name || 'Alex Mercer'}</h2>
                          <p className="text-blue-500 font-medium text-sm mt-1">{preview.headline || 'Software Engineer'}</p>
                          <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap justify-center gap-x-2 gap-y-1">
                            {preview.contact?.email && <span>{preview.contact.email}</span>}
                            {preview.contact?.phone && <span>• {preview.contact.phone}</span>}
                            {preview.contact?.location && <span>• {preview.contact.location}</span>}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 flex flex-wrap justify-center gap-x-2">
                            {preview.contact?.linkedin && <span>LinkedIn: {preview.contact.linkedin}</span>}
                            {preview.contact?.github && <span>• GitHub: {preview.contact.github}</span>}
                            {preview.contact?.website && <span>• Web: {preview.contact.website}</span>}
                          </div>
                        </div>

                        {/* Professional Summary */}
                        {preview.summary && (
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Professional Summary</h3>
                            <p className="text-justify text-[11px] leading-relaxed">{preview.summary}</p>
                          </div>
                        )}

                        {/* Education */}
                        {preview.education?.college && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Education</h3>
                            <div>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-slate-900">{preview.education.college}</span>
                                <span className="text-[10px] font-medium text-slate-500">{preview.education.year_of_study}</span>
                              </div>
                              <div className="flex justify-between items-baseline text-[11px]">
                                <span>{[preview.education.course, preview.education.branch].filter(Boolean).join(', ')}</span>
                                {preview.education.cgpa && <span className="font-semibold text-blue-500">CGPA: {preview.education.cgpa}</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {preview.experience.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Work Experience</h3>
                            {preview.experience.map((exp, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-slate-900">{exp.role}</span>
                                  <span className="text-[10px] font-medium text-slate-500">{exp.start_date} - {exp.end_date}</span>
                                </div>
                                <div className="text-[10px] text-blue-500 font-semibold">{exp.company} • {exp.location}</div>
                                <p className="text-justify text-[11px] text-slate-600 whitespace-pre-line">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Projects */}
                        {preview.projects.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Projects</h3>
                            {preview.projects.map((proj, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-slate-900">{proj.title}</span>
                                  {proj.link && <span className="text-[10px] text-blue-500 underline truncate max-w-[180px]">{proj.link}</span>}
                                </div>
                                <p className="text-justify text-[11px] text-slate-600 whitespace-pre-line">{proj.description}</p>
                                {proj.technologies && (
                                  <div className="text-[10px] text-slate-500 font-medium">Tech Stack: {proj.technologies}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Skills */}
                        {preview.skills.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Technical Skills</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                              {preview.skills.map((s, idx) => (
                                <span key={idx} className="bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Achievements */}
                        {preview.achievements.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-blue-500 border-b border-slate-100 pb-1 uppercase tracking-wider">Achievements</h3>
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                              {preview.achievements.map((ach, idx) => (
                                <li key={idx}>{ach}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Minimalist Template Style */}
                    {preview.template === 'minimalist' && (
                      <div className="space-y-6 text-stone-800">
                        {/* Header */}
                        <div className="text-center space-y-1">
                          <h2 className="text-2xl font-bold tracking-tight text-stone-900 uppercase font-serif">{preview.full_name}</h2>
                          <p className="text-stone-600 font-medium italic text-xs">{preview.headline}</p>
                          <div className="text-[10px] text-stone-500 space-x-2">
                            {preview.contact?.email && <span>{preview.contact.email}</span>}
                            {preview.contact?.phone && <span>|  {preview.contact.phone}</span>}
                            {preview.contact?.location && <span>|  {preview.contact.location}</span>}
                          </div>
                          <div className="text-[10px] text-stone-500 space-x-2">
                            {preview.contact?.linkedin && <span>LinkedIn: {preview.contact.linkedin}</span>}
                            {preview.contact?.github && <span>|  GitHub: {preview.contact.github}</span>}
                          </div>
                          <div className="border-b border-stone-300 pb-2 pt-1" />
                        </div>

                        {/* Professional Summary */}
                        {preview.summary && (
                          <div className="space-y-1">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Professional Summary</h3>
                            <p className="text-justify text-[11px] leading-relaxed text-stone-700">{preview.summary}</p>
                          </div>
                        )}

                        {/* Education */}
                        {preview.education?.college && (
                          <div className="space-y-2">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Education</h3>
                            <div className="space-y-1">
                              <div className="flex justify-between items-baseline font-bold text-stone-900">
                                <span>{preview.education.college}</span>
                                <span className="text-[10px] font-normal text-stone-500 italic">{preview.education.year_of_study}</span>
                              </div>
                              <div className="flex justify-between items-baseline text-[11px]">
                                <span>{[preview.education.course, preview.education.branch].filter(Boolean).join(', ')}</span>
                                {preview.education.cgpa && <span className="font-semibold italic">CGPA: {preview.education.cgpa}</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {preview.experience.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Experience</h3>
                            {preview.experience.map((exp, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-stone-900">{exp.role}</span>
                                  <span className="text-[10px] font-medium text-stone-500 italic">{exp.start_date} - {exp.end_date}</span>
                                </div>
                                <div className="text-[10px] text-stone-600 font-semibold">{exp.company} - {exp.location}</div>
                                <p className="text-justify text-[10.5px] text-stone-700 whitespace-pre-line">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Projects */}
                        {preview.projects.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Projects</h3>
                            {preview.projects.map((proj, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-stone-900">{proj.title}</span>
                                  {proj.link && <span className="text-[10px] text-stone-500 underline max-w-[180px]">{proj.link}</span>}
                                </div>
                                <p className="text-justify text-[10.5px] text-stone-700 whitespace-pre-line">{proj.description}</p>
                                {proj.technologies && (
                                  <div className="text-[9.5px] text-stone-600 font-medium italic">Technologies: {proj.technologies}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Skills */}
                        {preview.skills.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Technical Skills</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {preview.skills.map((s, idx) => (
                                <span key={idx} className="text-[10.5px] text-stone-700 font-medium">
                                  • {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Achievements */}
                        {preview.achievements.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-[11px] font-bold text-stone-900 border-b border-stone-200 pb-0.5 tracking-widest uppercase">Achievements</h3>
                            <ul className="space-y-1 text-[10.5px] text-stone-700">
                              {preview.achievements.map((ach, idx) => (
                                <li key={idx}>• {ach}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Corporate Template Style */}
                    {preview.template === 'corporate' && (
                      <div className="space-y-6 text-slate-700">
                        {/* Header */}
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">{preview.full_name}</h2>
                          <p className="text-teal-600 font-medium text-sm mt-0.5 italic">{preview.headline}</p>
                          <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-x-3">
                            {preview.contact?.email && <span>{preview.contact.email}</span>}
                            {preview.contact?.phone && <span>|  {preview.contact.phone}</span>}
                            {preview.contact?.location && <span>|  {preview.contact.location}</span>}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500 flex flex-wrap gap-x-3">
                            {preview.contact?.linkedin && <span>LinkedIn: {preview.contact.linkedin}</span>}
                            {preview.contact?.github && <span>|  GitHub: {preview.contact.github}</span>}
                          </div>
                          <div className="h-0.5 w-full bg-teal-600 rounded-full mt-3" />
                        </div>

                        {/* Summary */}
                        {preview.summary && (
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Professional Summary</h3>
                            <p className="text-justify text-[11px] leading-relaxed">{preview.summary}</p>
                          </div>
                        )}

                        {/* Experience */}
                        {preview.experience.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Experience</h3>
                            {preview.experience.map((exp, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-slate-900">{exp.role}</span>
                                  <span className="text-[10px] font-bold text-slate-500">{exp.start_date} - {exp.end_date}</span>
                                </div>
                                <div className="text-[10px] text-teal-600 font-medium italic">{exp.company} -- {exp.location}</div>
                                <p className="text-justify text-[10.5px] text-slate-600 whitespace-pre-line">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Projects */}
                        {preview.projects.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Projects</h3>
                            {preview.projects.map((proj, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-slate-900">{proj.title}</span>
                                  {proj.link && <span className="text-[10px] text-teal-600 underline max-w-[180px]">{proj.link}</span>}
                                </div>
                                <p className="text-justify text-[10.5px] text-slate-600 whitespace-pre-line">{proj.description}</p>
                                {proj.technologies && (
                                  <div className="text-[9.5px] text-teal-600 font-medium italic">Technologies: {proj.technologies}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Education */}
                        {preview.education?.college && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Education</h3>
                            <div>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-slate-900">{preview.education.college}</span>
                                <span className="text-[10px] font-medium text-slate-500">{preview.education.year_of_study}</span>
                              </div>
                              <div className="flex justify-between items-baseline text-[11px]">
                                <span>{[preview.education.course, preview.education.branch].filter(Boolean).join(', ')}</span>
                                {preview.education.cgpa && <span className="font-semibold text-teal-600">CGPA: {preview.education.cgpa}</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {preview.skills.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Skills</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {preview.skills.map((s, idx) => (
                                <span key={idx} className="text-[10.5px] text-slate-700 font-medium">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Achievements */}
                        {preview.achievements.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Achievements</h3>
                            <ul className="list-disc list-inside space-y-1 text-[10.5px] text-slate-600">
                              {preview.achievements.map((ach, idx) => (
                                <li key={idx}>{ach}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Creative Template Style */}
                    {preview.template === 'creative' && (
                      <div className="grid grid-cols-[150px_1fr] gap-6 text-slate-700 min-h-[762px]">
                        
                        {/* Sidebar */}
                        <div className="bg-slate-50 border-r border-slate-100 p-4 -ml-10 -my-10 space-y-6 text-[10.5px]">
                          <div className="space-y-2">
                            <h4 className="font-bold text-indigo-600 tracking-wider text-xs uppercase border-b border-slate-200 pb-1">Contact</h4>
                            <div className="space-y-2 text-slate-600">
                              {preview.contact?.email && <div className="truncate">{preview.contact.email}</div>}
                              {preview.contact?.phone && <div>{preview.contact.phone}</div>}
                              {preview.contact?.location && <div>{preview.contact.location}</div>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-indigo-600 tracking-wider text-xs uppercase border-b border-slate-200 pb-1">Links</h4>
                            <div className="space-y-2 text-slate-600 truncate">
                              {preview.contact?.linkedin && <div>LinkedIn:<br/><span className="text-[9px] text-slate-500">{preview.contact.linkedin}</span></div>}
                              {preview.contact?.github && <div>GitHub:<br/><span className="text-[9px] text-slate-500">{preview.contact.github}</span></div>}
                            </div>
                          </div>

                          {preview.skills.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-bold text-indigo-600 tracking-wider text-xs uppercase border-b border-slate-200 pb-1">Skills</h4>
                              <div className="flex flex-col gap-1.5">
                                {preview.skills.map((s, idx) => (
                                  <span key={idx} className="font-medium text-slate-700">
                                    • {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Main body */}
                        <div className="space-y-6 py-2">
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{preview.full_name}</h2>
                            <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">{preview.headline}</p>
                          </div>

                          {preview.summary && (
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Profile</h3>
                              <p className="text-justify text-[11px] leading-relaxed text-slate-600">{preview.summary}</p>
                            </div>
                          )}

                          {preview.experience.length > 0 && (
                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Work Experience</h3>
                              {preview.experience.map((exp, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-slate-900 text-[11px]">{exp.role}</span>
                                    <span className="text-[10px] font-medium text-slate-400 italic">{exp.start_date} - {exp.end_date}</span>
                                  </div>
                                  <div className="text-[10px] text-indigo-600 font-semibold">{exp.company} • {exp.location}</div>
                                  <p className="text-justify text-[10.5px] text-slate-500 whitespace-pre-line">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {preview.projects.length > 0 && (
                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Projects</h3>
                              {preview.projects.map((proj, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-slate-900 text-[11px]">{proj.title}</span>
                                    {proj.link && <span className="text-[9.5px] text-indigo-600 underline truncate max-w-[150px]">{proj.link}</span>}
                                  </div>
                                  <p className="text-justify text-[10.5px] text-slate-500 whitespace-pre-line">{proj.description}</p>
                                  {proj.technologies && (
                                    <div className="text-[9.5px] text-indigo-500 font-medium italic">Tech Stack: {proj.technologies}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {preview.education?.college && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Education</h3>
                              <div>
                                <div className="flex justify-between items-baseline">
                                  <span className="font-bold text-slate-900">{preview.education.college}</span>
                                  <span className="text-[10px] font-medium text-slate-400">{preview.education.year_of_study}</span>
                                </div>
                                <div className="flex justify-between items-baseline text-[10.5px] text-slate-500">
                                  <span>{[preview.education.course, preview.education.branch].filter(Boolean).join(', ')}</span>
                                  {preview.education.cgpa && <span className="font-semibold text-indigo-600">CGPA: {preview.education.cgpa}</span>}
                                </div>
                              </div>
                            </div>
                          )}

                          {preview.achievements.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-0.5 uppercase tracking-wide">Achievements</h3>
                              <ul className="list-disc list-inside space-y-1 text-[10.5px] text-slate-500">
                                {preview.achievements.map((ach, idx) => (
                                  <li key={idx}>{ach}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </motion.div>

            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
