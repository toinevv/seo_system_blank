import { PricingTable } from "@/components/landing/pricing-table";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";

export const metadata = {
  title: "Pricing - IndexYourNiche",
  description: "Simple, transparent pricing for builders. Start free, scale as you grow.",
};

export default function PricingPage() {
  return (
    <div className="pt-14">
      <PricingTable />
      <FAQ />
      <CTASection />
    </div>
  );
}
