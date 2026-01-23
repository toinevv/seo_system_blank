"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Terminal, Bot, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Full prompt for AI agents (Lovable, Cursor, etc.)
const AI_PROMPT = `Set up IndexYourNiche SEO automation for this project.

1. Add these to .env.local (get from Supabase Dashboard → Settings → API):
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

2. Create the articles table by running this SQL in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_description TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'published',
  author TEXT,
  tldr TEXT,
  faq_items JSONB DEFAULT '[]'::JSONB,
  CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published" ON public.blog_articles FOR SELECT USING (status = 'published');
GRANT SELECT ON public.blog_articles TO anon;

3. Run setup command:
   INDEXYOURNICHE_API_KEY=<YOUR_API_KEY> npx @indexyourniche/cli init -y -d <YOUR_DOMAIN>

4. Generate content:
   iyn scan && iyn topics --discover && iyn generate -y

Get your API key at: https://indexyourniche.com/signup
AI content generation is INCLUDED - no OpenAI/Anthropic keys needed!`;

// CLI one-liner
const CLI_COMMAND = `INDEXYOURNICHE_API_KEY=<YOUR_API_KEY> npx @indexyourniche/cli init -y -d yoursite.com && iyn scan && iyn topics --discover && iyn generate -y`;

export function Hero() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const copyCli = () => {
    navigator.clipboard.writeText(CLI_COMMAND);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
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

        {/* Two CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button
            onClick={copyPrompt}
            variant="landing"
            size="xl"
            className="min-w-[200px]"
          >
            {copiedPrompt ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Bot size={18} />
                Copy AI Prompt
              </>
            )}
          </Button>
          <Button
            onClick={copyCli}
            variant="landing-outline"
            size="xl"
            className="min-w-[200px]"
          >
            {copiedCli ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Terminal size={18} />
                Copy CLI Command
              </>
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-landing-text-muted mb-6">
          Paste to Cursor, Lovable, Claude Code, or run in terminal.{" "}
          <Link href="/signup" className="text-landing-accent hover:underline">
            Get your API key →
          </Link>
        </p>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-landing-text-muted">
          <div className="flex items-center gap-1.5">
            <Database size={12} />
            <span>Works with Supabase</span>
          </div>
          <span className="hidden sm:block">•</span>
          <span>Postgres compatible</span>
          <span className="hidden sm:block">•</span>
          <span>AI included - no extra keys</span>
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
