const featureGradientClasses: Record<string, string> = {
  'from-primary to-cyan-500': 'from-primary to-cyan-500',
  'from-accent to-primary': 'from-accent to-primary',
  'from-cyan-500 to-emerald-400': 'from-cyan-500 to-emerald-400',
  'from-primary to-indigo-500': 'from-primary to-indigo-500',
  'from-amber-400 to-orange-500': 'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500': 'from-emerald-400 to-teal-500',
  'from-primary to-accent': 'from-primary to-accent',
  'from-cyan-500 to-primary': 'from-cyan-500 to-primary',
};

const iconColorClasses: Record<string, string> = {
  'text-primary': 'text-primary',
  'text-accent': 'text-accent',
  'text-cyan-400': 'text-cyan-400',
  'text-amber-400': 'text-amber-400',
};

export const getLandingGradientClasses = (value?: string) =>
  (value && featureGradientClasses[value]) || 'from-primary to-accent';

export const getLandingIconColorClasses = (value?: string) =>
  (value && iconColorClasses[value]) || 'text-primary';
