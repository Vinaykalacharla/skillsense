import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

type Testimonial = {
  name: string;
  role: string;
  company: string;
  image?: string;
  content: string;
  rating: number;
};

const unavailableAvatarHosts = ['via.placeholder.com'];

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

function TestimonialAvatar({ name, image }: Pick<Testimonial, 'name' | 'image'>) {
  const [showFallback, setShowFallback] = useState(() => {
    if (!image) {
      return true;
    }

    return unavailableAvatarHosts.some((host) => image.includes(host));
  });

  const initials = useMemo(() => getInitials(name), [name]);

  if (showFallback) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      className="h-12 w-12 rounded-full border-2 border-primary/20 object-cover"
      onError={() => setShowFallback(true)}
    />
  );
}

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="section-padding relative">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="eyebrow-badge">Testimonials</span>
          <h2 className="section-title mt-6 mb-6">
            Loved by <span className="gradient-text">Thousands</span>
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            See what students, recruiters, and universities are saying about SkillSense AI.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="perspective-1000"
            >
              <div className="glass-card p-6 h-full relative card-hover tilt-card">
                <Quote className="w-8 h-8 text-primary/20 absolute top-6 right-6" />

                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                <p className="text-foreground/90 mb-6 relative z-10">"{testimonial.content}"</p>

                <div className="flex items-center gap-4">
                  <TestimonialAvatar name={testimonial.name} image={testimonial.image} />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} - {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
