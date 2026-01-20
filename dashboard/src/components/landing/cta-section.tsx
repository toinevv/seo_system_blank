import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 px-4 bg-landing-bg-alt">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-xl md:text-2xl font-medium text-landing-text mb-3">
          Your Niche Deserves to Rank
        </h2>
        <p className="text-sm text-landing-text-muted mb-6">
          Join builders who are already getting found on Google and AI search.
        </p>

        <Link href="/signup">
          <Button variant="landing" size="xl">
            Start Free
            <ArrowRight size={16} />
          </Button>
        </Link>

        <p className="text-xs text-landing-text-muted mt-4">
          No credit card required. 1 website free forever.
        </p>
      </div>
    </section>
  );
}
