import {
  Database,
  FileText,
  Globe,
  Lightbulb,
  LayoutGrid,
  Search,
} from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Supabase Integration",
    description:
      "Connect your Postgres in 2 minutes. We scan your content structure automatically.",
    highlight: "2 min setup",
  },
  {
    icon: FileText,
    title: "Auto Content Generation",
    description:
      "AI writes SEO-optimized articles from your product data. You approve, we publish.",
    highlight: "AI-powered",
  },
  {
    icon: Globe,
    title: "GEO Optimization",
    description:
      "Structured content that AI search engines understand. Get cited by ChatGPT & Perplexity.",
    highlight: "AI Search Ready",
  },
  {
    icon: Lightbulb,
    title: "Topic Discovery",
    description:
      "We analyze your niche and find what people are actually searching for.",
    highlight: "Auto-research",
  },
  {
    icon: LayoutGrid,
    title: "Multi-site Management",
    description:
      "Run SEO for all your projects from one dashboard. Perfect for serial builders.",
    highlight: "Unlimited sites",
  },
  {
    icon: Search,
    title: "Ranking Tracking",
    description:
      "Monitor your positions in Google and AI search results. See what's working.",
    highlight: "Analytics",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 px-4 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          Features
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-3">
          One Connection. Complete Visibility.
        </h2>

        <p className="text-sm text-landing-text-muted text-center max-w-xl mx-auto mb-10">
          Everything you need to get your niche project ranking on Google and AI
          search engines.
        </p>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-4 bg-landing-card border border-landing-border rounded-md hover:border-landing-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-landing-bg-alt group-hover:bg-landing-accent/10 transition-colors">
                  <feature.icon
                    size={16}
                    className="text-landing-text-muted group-hover:text-landing-accent transition-colors"
                  />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-landing-accent font-medium">
                  {feature.highlight}
                </span>
              </div>
              <h3 className="text-sm font-medium text-landing-text mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-landing-text-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
