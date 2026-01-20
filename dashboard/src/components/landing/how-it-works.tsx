import { Database, Settings, Rocket, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Database,
    title: "Connect",
    description:
      "Link your Supabase or Postgres database. We'll scan your content and structure.",
  },
  {
    step: "02",
    icon: Settings,
    title: "Configure",
    description:
      "Set your topics, target keywords, and content priorities. Or let AI discover them.",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Publish",
    description:
      "AI generates SEO-optimized articles. You approve, rankings follow.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 px-4 bg-landing-bg-alt scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          How It Works
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-10">
          Three Steps to Rankings
        </h2>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step Card */}
              <div className="p-4 bg-landing-card border border-landing-border rounded-md h-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-landing-accent">
                    {step.step}
                  </span>
                  <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-landing-bg-alt">
                    <step.icon size={16} className="text-landing-text-muted" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-landing-text mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs text-landing-text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 md:-right-6 transform -translate-y-1/2 z-10">
                  <ArrowRight
                    size={16}
                    className="text-landing-border"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
