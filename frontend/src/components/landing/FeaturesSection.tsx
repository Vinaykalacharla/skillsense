import { motion } from 'framer-motion';
import {
  Layers,
  ShieldCheck,
  Mic,
  FileCheck,
  Target,
  Sparkles,
  Code,
  Video,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { getLandingGradientClasses, getLandingIconColorClasses } from '@/lib/landingStyles';

const iconMap = {
  Layers,
  ShieldCheck,
  Mic,
  FileCheck,
  Target,
  Sparkles,
  Code,
  Video,
  FileText,
  TrendingUp,
};

type Feature = {
  icon: keyof typeof iconMap;
  title: string;
  description: string;
  gradient: string;
};

type DataType = {
  icon: keyof typeof iconMap;
  label: string;
  color: string;
};

export function FeaturesSection({
  features,
  dataTypes,
}: {
  features: Feature[];
  dataTypes: DataType[];
}) {
  return (
    <section id="features" className="section-padding relative">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="eyebrow-badge">Features</span>
          <h2 className="section-title mt-6 mb-6">
            Everything You Need for <span className="gradient-text">Skill Verification</span>
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Comprehensive tools powered by cutting-edge AI to discover, verify, and showcase authentic talent.
          </p>
        </motion.div>

        {/* Data Types Bar */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {dataTypes.map((type, index) => {
            const Icon = iconMap[type.icon] || Code;
            const iconColor = getLandingIconColorClasses(type.color);
            return (
              <div key={index} className="glass px-4 py-2 rounded-full flex items-center gap-2">
                <Icon className={`w-4 h-4 ${iconColor}`} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">{type.label}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Layers;
            const featureGradient = getLandingGradientClasses(feature.gradient);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group perspective-1000"
              >
                <div className="glass-card p-6 h-full card-hover relative overflow-hidden tilt-card">
                  <div className={`absolute inset-0 bg-gradient-to-br ${featureGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${featureGradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
