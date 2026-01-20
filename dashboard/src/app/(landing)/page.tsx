import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SocialProof } from "@/components/landing/social-proof";
import { PricingTable } from "@/components/landing/pricing-table";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <Features />
      <HowItWorks />
      <SocialProof />
      <PricingTable />
      <FAQ />
      <CTASection />
    </>
  );
}
