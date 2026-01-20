import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for testing with a single project",
    features: [
      "1 website",
      "10 articles/month",
      "Basic topic suggestions",
      "Google indexing",
      "Community support",
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For builders with multiple projects",
    features: [
      "5 websites",
      "100 articles/month",
      "AI topic discovery",
      "GEO optimization",
      "Priority email support",
      "Custom API keys",
    ],
    cta: "Start Pro Trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$99",
    period: "/month",
    description: "For agencies and power users",
    features: [
      "Unlimited websites",
      "Unlimited articles",
      "White-label options",
      "API access",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Contact Us",
    href: "/signup?plan=agency",
    highlighted: false,
  },
];

export function PricingTable() {
  return (
    <section id="pricing" className="py-16 px-4 bg-landing-bg-alt scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        {/* Section Label */}
        <p className="text-xs uppercase tracking-widest text-landing-text-muted text-center mb-3">
          Pricing
        </p>

        {/* Section Title */}
        <h2 className="text-xl md:text-2xl font-medium text-landing-text text-center mb-3">
          Simple Pricing for Builders
        </h2>

        <p className="text-sm text-landing-text-muted text-center max-w-xl mx-auto mb-10">
          Start free, scale as you grow. No hidden fees.
        </p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-4 rounded-md border ${
                plan.highlighted
                  ? "bg-landing-card border-landing-accent"
                  : "bg-landing-card border-landing-border"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-landing-accent rounded-sm">
                  <span className="text-[10px] uppercase tracking-wider text-white font-medium">
                    Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-medium text-landing-text mb-1">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-landing-text">
                    {plan.price}
                  </span>
                  <span className="text-xs text-landing-text-muted">
                    {plan.period}
                  </span>
                </div>
                <p className="text-xs text-landing-text-muted mt-1">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center gap-2 text-xs text-landing-text-muted"
                  >
                    <Check size={12} className="text-landing-accent shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.href} className="block">
                <Button
                  variant={plan.highlighted ? "landing" : "landing-outline"}
                  size="sm"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
