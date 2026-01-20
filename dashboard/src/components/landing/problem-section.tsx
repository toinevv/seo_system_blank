import { AlertTriangle, Bot, Wrench } from "lucide-react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Google ignores new sites",
    description:
      "90% of pages get zero organic traffic. New domains take 6-12 months to build authority.",
  },
  {
    icon: Bot,
    title: "AI search is the new frontier",
    description:
      "ChatGPT, Perplexity, Claude — users ask AI instead of Googling. You need GEO to be found.",
  },
  {
    icon: Wrench,
    title: "SEO tools aren't for builders",
    description:
      "Enterprise dashboards, $200/month plans, weeks of setup. Built for agencies, not makers.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 px-4 bg-landing-bg-alt">
      <div className="max-w-5xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          The Problem
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-10">
          You Built It. Now Get Found.
        </h2>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="p-4 bg-landing-card border border-landing-border rounded-md"
            >
              <div className="w-8 h-8 mb-3 flex items-center justify-center rounded-sm bg-landing-bg-alt">
                <problem.icon size={16} className="text-landing-text-muted" />
              </div>
              <h3 className="text-sm font-medium text-landing-text mb-2">
                {problem.title}
              </h3>
              <p className="text-xs text-landing-text-muted leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
