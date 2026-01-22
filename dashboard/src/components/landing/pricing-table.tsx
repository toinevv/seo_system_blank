"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    basePrice: 0,
    geoPrice: 0,
    period: "forever",
    description: "Perfect for testing with a single project",
    articles: 3,
    features: [
      "1 website",
      "3 articles/month",
      "Basic topic suggestions",
      "Google indexing",
      "Community support",
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
    hasGeoOption: false,
  },
  {
    name: "Pro",
    basePrice: 37.5,
    geoPrice: 75,
    period: "/month",
    description: "For growing businesses",
    articles: 10,
    features: [
      "3 websites",
      "10 articles/month",
      "AI topic discovery",
      "Priority support",
      "Custom API keys",
    ],
    geoFeatures: [
      "GEO optimization",
      "AI chat visibility",
    ],
    cta: "Get Started",
    href: "/signup?plan=pro",
    highlighted: true,
    hasGeoOption: true,
    priceIdBase: "price_pro_base", // Replace with actual Stripe Price ID
    priceIdGeo: "price_pro_geo", // Replace with actual Stripe Price ID
  },
  {
    name: "Business",
    basePrice: 150,
    geoPrice: 300,
    period: "/month",
    description: "For agencies and power users",
    articles: 30,
    features: [
      "10 websites",
      "30 articles/month",
      "Full automation",
      "API access",
      "Dedicated support",
    ],
    geoFeatures: [
      "GEO optimization",
      "AI chat visibility",
    ],
    cta: "Get Started",
    href: "/signup?plan=business",
    highlighted: false,
    hasGeoOption: true,
    priceIdBase: "price_business_base", // Replace with actual Stripe Price ID
    priceIdGeo: "price_business_geo", // Replace with actual Stripe Price ID
  },
];

export function PricingTable() {
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const handleGeoToggle = () => {
    if (geoEnabled) {
      setShowWarning(true);
    } else {
      setGeoEnabled(true);
    }
  };

  const confirmDisableGeo = () => {
    setGeoEnabled(false);
    setShowWarning(false);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "€0";
    return `€${price % 1 === 0 ? price : price.toFixed(2)}`;
  };

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

        <p className="text-sm text-landing-text-muted text-center max-w-xl mx-auto mb-6">
          Start free, scale as you grow. No hidden fees.
        </p>

        {/* GEO Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={handleGeoToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              geoEnabled ? "bg-landing-accent" : "bg-landing-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                geoEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-landing-accent" />
            <span className="text-sm text-landing-text">
              GEO Optimization
            </span>
            <span className="text-xs text-landing-text-muted">
              (AI chat visibility)
            </span>
          </div>
        </div>

        {/* Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-landing-card border border-landing-border rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-medium text-landing-text mb-3">
                Disable GEO Optimization?
              </h3>
              <p className="text-sm text-landing-text-muted mb-6">
                Disabling GEO optimization may significantly impact your long-term
                findability in AI chats like <strong>ChatGPT</strong>, <strong>Perplexity</strong>,
                and <strong>Claude</strong>. Your content won&apos;t be optimized for AI discovery.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="landing-outline"
                  size="sm"
                  onClick={() => setShowWarning(false)}
                  className="flex-1"
                >
                  Keep GEO Enabled
                </Button>
                <Button
                  variant="landing"
                  size="sm"
                  onClick={confirmDisableGeo}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Disable Anyway
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan, index) => {
            const showGeoPrice = geoEnabled && plan.hasGeoOption;
            const displayPrice = showGeoPrice ? plan.geoPrice : plan.basePrice;
            const allFeatures = showGeoPrice && plan.geoFeatures
              ? [...plan.features, ...plan.geoFeatures]
              : plan.features;

            return (
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
                      {formatPrice(displayPrice)}
                    </span>
                    <span className="text-xs text-landing-text-muted">
                      {plan.period}
                    </span>
                  </div>
                  {plan.hasGeoOption && !showGeoPrice && (
                    <p className="text-[10px] text-landing-text-muted mt-1 line-through">
                      {formatPrice(plan.geoPrice)}/month with GEO
                    </p>
                  )}
                  <p className="text-xs text-landing-text-muted mt-1">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-4">
                  {allFeatures.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className={`flex items-center gap-2 text-xs ${
                        plan.geoFeatures?.includes(feature)
                          ? "text-landing-accent"
                          : "text-landing-text-muted"
                      }`}
                    >
                      <Check size={12} className={`shrink-0 ${
                        plan.geoFeatures?.includes(feature)
                          ? "text-landing-accent"
                          : "text-landing-accent"
                      }`} />
                      {feature}
                      {plan.geoFeatures?.includes(feature) && (
                        <Sparkles size={10} className="text-landing-accent" />
                      )}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`${plan.href}${plan.hasGeoOption ? `&geo=${geoEnabled}` : ''}`}
                  className="block"
                >
                  <Button
                    variant={plan.highlighted ? "landing" : "landing-outline"}
                    size="sm"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-landing-text-muted text-center mt-6">
          All plans include SSL, automatic backups, and 99.9% uptime guarantee.
        </p>
      </div>
    </section>
  );
}
