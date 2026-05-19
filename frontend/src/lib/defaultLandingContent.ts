export const defaultLandingContent = {
  hero: {
    badge_text: 'Placement intelligence',
    title: 'SkillSense AI is the smart way to verify every candidate',
    highlight: 'Evidence-backed talent',
    subtitle: 'Adaptive AI interviews, recruiter pipelines, and university analytics in one platform.',
    stats: [
      { value: '3K+', label: 'Verified students' },
      { value: '120+', label: 'Partner universities' },
      { value: '95%', label: 'Interview readiness' },
    ],
  },
  features: [
    {
      icon: 'Layers',
      title: 'Unified student journeys',
      description: 'Profile verification, recommendations, score reports, and placement readiness all in one place.',
      gradient: 'from-primary to-cyan-500',
    },
    {
      icon: 'Mic',
      title: 'Adaptive AI interviews',
      description: 'Run interview simulations that change in difficulty as the candidate responds.',
      gradient: 'from-accent to-primary',
    },
    {
      icon: 'FileCheck',
      title: 'Resume and profile validation',
      description: 'Match claims with uploaded evidence and generate recruiter-ready scorecards.',
      gradient: 'from-cyan-500 to-emerald-400',
    },
    {
      icon: 'Code',
      title: 'Code analysis signals',
      description: 'Turn repositories and submissions into readable engineering feedback and skill summaries.',
      gradient: 'from-primary to-indigo-500',
    },
    {
      icon: 'Video',
      title: 'Recruiter workflow automation',
      description: 'Schedule interviews, review pipelines, and coordinate candidate updates from one dashboard.',
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      icon: 'TrendingUp',
      title: 'University readiness analytics',
      description: 'Track cohorts, surface weak skill clusters, and intervene before placement cycles begin.',
      gradient: 'from-emerald-400 to-teal-500',
    },
  ],
  data_types: [
    { icon: 'ShieldCheck', label: 'Verified evidence', color: 'text-primary' },
    { icon: 'Sparkles', label: 'AI scoring', color: 'text-accent' },
    { icon: 'Code', label: 'Project reviews', color: 'text-cyan-400' },
    { icon: 'FileText', label: 'Resume insights', color: 'text-amber-400' },
  ],
  user_types: [
    {
      icon: 'GraduationCap',
      title: 'Students',
      description: 'Auto-build a skill passport and get AI interview coaching.',
      features: ['AI interviews', 'Score transparency', 'Resume ready'],
      cta: 'Join as student',
      href: '/student/start',
      gradient: 'from-primary to-accent',
    },
    {
      icon: 'Briefcase',
      title: 'Recruiters',
      description: 'Shortlist faster with proof-backed candidate signals instead of guesswork.',
      features: ['Hiring pipelines', 'Resume downloads', 'Interview scheduling'],
      cta: 'Open recruiter desk',
      href: '/recruiter/dashboard',
      gradient: 'from-cyan-500 to-primary',
    },
    {
      icon: 'Building2',
      title: 'Universities',
      description: 'Monitor batch readiness, upload cohorts, and trigger focused interventions.',
      features: ['Batch analytics', 'Drive planning', 'Placement reporting'],
      cta: 'View university suite',
      href: '/university/dashboard',
      gradient: 'from-emerald-400 to-teal-500',
    },
  ],
  testimonials: [
    {
      name: 'Asha Patel',
      role: 'Full-stack student',
      company: 'ABC University',
      image: '',
      content: 'SkillSense AI highlighted the exact areas I needed to improve before interviewing.',
      rating: 5,
    },
    {
      name: 'Daniel Brooks',
      role: 'Campus recruiter',
      company: 'Northwind Tech',
      image: '',
      content: 'We moved from resume screening to verified signals and cut our shortlist time dramatically.',
      rating: 5,
    },
    {
      name: 'Mira Singh',
      role: 'Placement lead',
      company: 'Cityline Institute',
      image: '',
      content: 'The batch dashboard made it obvious where students were stuck and what interventions were needed.',
      rating: 5,
    },
  ],
  about: {
    title: 'Why SkillSense',
    subtitle: 'We combine data, AI coaching, and recruiter workflows.',
    items: [
      {
        icon: 'Users',
        title: 'One shared platform',
        description: 'Students, recruiters, and universities operate from the same source of truth.',
      },
      {
        icon: 'Target',
        title: 'Precision interventions',
        description: 'Surface weak skills early and direct effort where it has measurable impact.',
      },
      {
        icon: 'Award',
        title: 'Proof-backed credibility',
        description: 'Move beyond self-reported skills with evidence, assessments, and verified outcomes.',
      },
      {
        icon: 'TrendingUp',
        title: 'Better placement outcomes',
        description: 'Translate readiness signals into faster hiring decisions and stronger conversion rates.',
      },
    ],
  },
  contact: {
    email: 'hello@skillsense.ai',
    phone: '+1-800-555-0101',
  },
};

export interface LandingContent {
  hero: {
    badge_text: string;
    title: string;
    highlight: string;
    subtitle: string;
    stats: { value: string; label: string }[];
  };
  features: {
    icon: 'Layers' | 'Mic' | 'FileCheck' | 'Code' | 'Video' | 'TrendingUp' | 'ShieldCheck' | 'Sparkles' | 'FileText' | 'Target';
    title: string;
    description: string;
    gradient: string;
  }[];
  data_types: {
    icon: 'Layers' | 'Mic' | 'FileCheck' | 'Code' | 'Video' | 'TrendingUp' | 'ShieldCheck' | 'Sparkles' | 'FileText' | 'Target';
    label: string;
    color: string;
  }[];
  user_types: {
    icon: 'GraduationCap' | 'Briefcase' | 'Building2';
    title: string;
    description: string;
    features: string[];
    cta: string;
    href: string;
    gradient: string;
  }[];
  testimonials: {
    name: string;
    role: string;
    company: string;
    image: string;
    content: string;
    rating: number;
  }[];
  about: {
    title: string;
    subtitle: string;
    items: {
      icon: 'Users' | 'Target' | 'Award' | 'TrendingUp';
      title: string;
      description: string;
    }[];
  };
  contact: {
    email: string;
    phone: string;
    headline: string;
    subtext: string;
  };
}

export const mergeLandingContent = (content?: Record<string, unknown>): LandingContent => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = content as Record<string, any>;
  return {
    hero: { ...defaultLandingContent.hero, ...(c?.hero || {}) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: (c?.features?.length ? c.features : defaultLandingContent.features) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data_types: (c?.data_types?.length ? c.data_types : defaultLandingContent.data_types) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user_types: (c?.user_types?.length ? c.user_types : defaultLandingContent.user_types) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testimonials: (c?.testimonials?.length ? c.testimonials : defaultLandingContent.testimonials) as any,
    about: {
      ...defaultLandingContent.about,
      ...(c?.about || {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (c?.about?.items?.length ? c.about.items : defaultLandingContent.about.items) as any,
    },
    contact: { ...defaultLandingContent.contact, ...(c?.contact || {}) },
  };
};
