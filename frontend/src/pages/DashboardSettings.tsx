import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Download, Save, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildApiUrl } from '@/lib/api';

interface Profile {
  full_name?: string;
  gender?: string;
  phone_number?: string;
  college?: string;
  course?: string;
  branch?: string;
  year_of_study?: string;
  cgpa?: string;
  student_skills?: string;
  github_link?: string;
  leetcode_link?: string;
  linkedin_link?: string;
  codechef_link?: string;
  hackerrank_link?: string;
  codeforces_link?: string;
  gfg_link?: string;
  linkedin_headline?: string;
  linkedin_experience_count?: string | number;
  linkedin_skill_count?: string | number;
  linkedin_cert_count?: string | number;
  linkedin_about?: string;
  resume_document?: {
    filename: string;
  };
}

export default function DashboardSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    fetch(buildApiUrl('/api/accounts/profile/'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data?.user || null))
      .catch(() => setProfile(null));
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !profile) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/accounts/profile/update/'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data?.user || profile);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadResume = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !profile?.resume_document) {
      return;
    }
    setDownloadingResume(true);
    try {
      const res = await fetch(buildApiUrl('/api/skills/resume/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Unable to download resume.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = profile.resume_document.filename || 'resume';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingResume(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const handleSyncFromResume = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(buildApiUrl('/api/accounts/sync-from-resume/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data?.user || profile);
      }
    } finally {
      setSyncing(false);
    }
  };

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">Profile and preferences</p>
            </div>
            <Button 
              variant="outline" 
              className="border-primary/50 text-primary hover:bg-primary/10"
              onClick={handleSyncFromResume}
              disabled={syncing}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Syncing...' : 'AI Sync from Resume'}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-6"
          >
            {profile ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Full name"
                    value={profile.full_name || ''}
                    onChange={(e) => updateProfile({ full_name: e.target.value })}
                  />
                  <Input
                    placeholder="Gender"
                    value={profile.gender || ''}
                    onChange={(e) => updateProfile({ gender: e.target.value })}
                  />
                  <Input
                    placeholder="Phone number"
                    value={profile.phone_number || ''}
                    onChange={(e) => updateProfile({ phone_number: e.target.value })}
                  />
                  <Input
                    placeholder="College"
                    value={profile.college || ''}
                    onChange={(e) => updateProfile({ college: e.target.value })}
                  />
                  <Input
                    placeholder="Course"
                    value={profile.course || ''}
                    onChange={(e) => updateProfile({ course: e.target.value })}
                  />
                  <Input
                    placeholder="Branch"
                    value={profile.branch || ''}
                    onChange={(e) => updateProfile({ branch: e.target.value })}
                  />
                  <Input
                    placeholder="Year of study"
                    value={profile.year_of_study || ''}
                    onChange={(e) => updateProfile({ year_of_study: e.target.value })}
                  />
                  <Input
                    placeholder="CGPA"
                    value={profile.cgpa || ''}
                    onChange={(e) => updateProfile({ cgpa: e.target.value })}
                  />
                  <Textarea
                    placeholder="Skills (comma-separated)"
                    value={profile.student_skills || ''}
                    onChange={(e) => updateProfile({ student_skills: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="GitHub URL"
                    value={profile.github_link || ''}
                    onChange={(e) => updateProfile({ github_link: e.target.value })}
                  />
                  <Input
                    placeholder="LeetCode URL"
                    value={profile.leetcode_link || ''}
                    onChange={(e) => updateProfile({ leetcode_link: e.target.value })}
                  />
                  <Input
                    placeholder="LinkedIn URL"
                    value={profile.linkedin_link || ''}
                    onChange={(e) => updateProfile({ linkedin_link: e.target.value })}
                  />
                  <Input
                    placeholder="CodeChef URL"
                    value={profile.codechef_link || ''}
                    onChange={(e) => updateProfile({ codechef_link: e.target.value })}
                  />
                  <Input
                    placeholder="HackerRank URL"
                    value={profile.hackerrank_link || ''}
                    onChange={(e) => updateProfile({ hackerrank_link: e.target.value })}
                  />
                  <Input
                    placeholder="Codeforces URL"
                    value={profile.codeforces_link || ''}
                    onChange={(e) => updateProfile({ codeforces_link: e.target.value })}
                  />
                  <Input
                    placeholder="GeeksforGeeks URL"
                    value={profile.gfg_link || ''}
                    onChange={(e) => updateProfile({ gfg_link: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="LinkedIn headline"
                    value={profile.linkedin_headline || ''}
                    onChange={(e) => updateProfile({ linkedin_headline: e.target.value })}
                  />
                  <Input
                    placeholder="LinkedIn experience count"
                    value={profile.linkedin_experience_count ?? ''}
                    onChange={(e) => updateProfile({ linkedin_experience_count: e.target.value })}
                  />
                  <Input
                    placeholder="LinkedIn skills count"
                    value={profile.linkedin_skill_count ?? ''}
                    onChange={(e) => updateProfile({ linkedin_skill_count: e.target.value })}
                  />
                  <Input
                    placeholder="LinkedIn certifications count"
                    value={profile.linkedin_cert_count ?? ''}
                    onChange={(e) => updateProfile({ linkedin_cert_count: e.target.value })}
                  />
                  <Textarea
                    placeholder="LinkedIn about summary"
                    value={profile.linkedin_about || ''}
                    onChange={(e) => updateProfile({ linkedin_about: e.target.value })}
                    rows={3}
                    className="md:col-span-2"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">Resume on file</div>
                      {profile.resume_document ? (
                        <div className="text-sm text-muted-foreground">
                          {profile.resume_document.filename}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No original resume is stored for this account yet.
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadResume}
                      disabled={downloadingResume || !profile.resume_document}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloadingResume ? 'Downloading...' : 'Download Resume'}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Settings className="w-10 h-10 mb-3 text-primary" />
                No settings available yet
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
