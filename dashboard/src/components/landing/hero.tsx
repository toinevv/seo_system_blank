"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  const [url, setUrl] = useState("");

  const handleAnalyze = () => {
    if (url) {
      window.location.href = `/signup?url=${encodeURIComponent(url)}`;
    } else {
      window.location.href = "/signup";
    }
  };

  return (
    <section className="relative pt-24 pb-16 px-4 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-landing-card border border-landing-border rounded-full">
          <Zap size={12} className="text-landing-accent" />
          <span className="text-xs text-landing-text-muted">
            SEO + GEO for Niche Builders
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-semibold text-landing-text mb-4 tracking-tight">
          Index Your Niche.{" "}
          <span className="text-landing-accent">Rank Everywhere.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-sm md:text-base text-landing-text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
          SEO + GEO for builders using Lovable, Replit, Claude Code & Cursor.
          <br className="hidden md:block" />
          Connect your Supabase, we handle the rest.
        </p>

        {/* URL Input */}
        <div className="max-w-xl mx-auto mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your project URL"
                className="w-full h-12 px-4 text-sm bg-landing-card border border-landing-border rounded-md text-landing-text placeholder:text-landing-text-muted/60 focus:outline-none focus:ring-2 focus:ring-landing-accent/30 focus:border-landing-accent"
              />
            </div>
            <Button
              variant="landing"
              size="xl"
              onClick={handleAnalyze}
              className="shrink-0"
            >
              Analyze My Site
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-landing-text-muted">
          <div className="flex items-center gap-1.5">
            <Database size={12} />
            <span>Works with Supabase</span>
          </div>
          <span className="hidden sm:block">•</span>
          <span>Postgres compatible</span>
          <span className="hidden sm:block">•</span>
          <span>More integrations coming</span>
        </div>

        {/* Secondary CTA */}
        <div className="mt-6">
          <Link href="#pricing">
            <Button variant="landing-ghost" size="sm">
              See Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
