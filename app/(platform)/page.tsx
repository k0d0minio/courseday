import { Hero } from '@/components/landing/hero';
import { ProblemStrip } from '@/components/landing/problem-strip';
import { Showcase } from '@/components/landing/showcase';
import { RolesSection } from '@/components/landing/roles-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Outcomes } from '@/components/landing/outcomes';
import { Faq } from '@/components/landing/faq';
import { FinalCta } from '@/components/landing/final-cta';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <ProblemStrip />
      <Showcase />
      <RolesSection />
      <HowItWorks />
      <Outcomes />
      <Faq />
      <FinalCta />
    </div>
  );
}
