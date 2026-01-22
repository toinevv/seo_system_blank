import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CLIQuickstart } from "@/components/landing/cli-quickstart";
import { SocialProof } from "@/components/landing/social-proof";
import { LatestArticles } from "@/components/landing/latest-articles";
import { PricingTable } from "@/components/landing/pricing-table";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";

// Force dynamic to prevent build-time issues with async server components
export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <Features />
      <HowItWorks />
      <CLIQuickstart />
      <SocialProof />
      <LatestArticles />
      <PricingTable />
      <FAQ />
      <CTASection />
    </>
  );
}
