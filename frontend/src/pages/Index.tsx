import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { UserTypes } from '@/components/landing/UserTypes';
import { Testimonials } from '@/components/landing/Testimonials';
import { AboutSection } from '@/components/landing/AboutSection';
import { CTASection } from '@/components/landing/CTASection';
import { buildApiUrl } from '@/lib/api';
import { LandingContent, defaultLandingContent, mergeLandingContent } from '@/lib/defaultLandingContent';

const Index = () => {
  const [content, setContent] = useState<LandingContent>(defaultLandingContent as LandingContent);

  useEffect(() => {
    let timeoutId: number | undefined;
    let isCancelled = false;

    const loadContent = async (attempt = 0) => {
      try {
        const response = await fetch(buildApiUrl('/api/content/landing/'));

        if (!response.ok) {
          throw new Error(`Failed to load landing content: ${response.status}`);
        }

        const data = await response.json();
        if (!isCancelled) {
          setContent(mergeLandingContent(data));
        }
      } catch {
        if (!isCancelled && attempt < 5) {
          timeoutId = window.setTimeout(() => {
            void loadContent(attempt + 1);
          }, 2500);
        }
      }
    };

    void loadContent();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection content={content.hero} />
        <FeaturesSection
          features={content.features || []}
          dataTypes={content.data_types || []}
        />
        <UserTypes userTypes={content.user_types || []} />
        <Testimonials testimonials={content.testimonials || []} />
        <AboutSection content={content.about} />
        <CTASection content={content.contact} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
