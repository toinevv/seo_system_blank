"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Copy, Terminal, Bot, Database, Zap, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOG_ARTICLES_SQL_MINIMAL } from "@/lib/constants/sql-schema";

// Full prompt for AI agents (Lovable, Cursor, Bolt, Replit, etc.)
// SQL is pulled from the centralized schema config
const AI_PROMPT = `Add IndexYourNiche SEO blog to this project. This will automatically generate SEO-optimized articles written directly to your Supabase database.

## Step 1: Create Articles Table
Run this SQL in your Supabase SQL Editor (Supabase Dashboard → SQL Editor):

${BLOG_ARTICLES_SQL_MINIMAL}

## Step 2: Register at IndexYourNiche
Go to https://indexyourniche.com/signup and:
1. Create an account
2. Add your website (domain like "myapp.com")
3. Enter your Supabase credentials (get from Supabase Dashboard → Settings → API):
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
4. Choose a plan and complete payment

Articles will be generated automatically after signup! 🎉

## Step 3: Build Blog Frontend
Create these files to display your SEO-optimized articles:

### 3a. Blog Listing Page (app/blog/page.tsx)
- Fetch all articles from Supabase: SELECT * FROM blog_articles WHERE status = 'published' ORDER BY published_at DESC
- Display as card grid with title, excerpt, published_at
- Add meta tags: title="Blog | YourSite", description="Latest articles..."

### 3b. Article Page (app/blog/[slug]/page.tsx)
- Fetch single article by slug
- Render: title (h1), tldr box (highlighted summary), content (as HTML), faq_items (as FAQ accordion)
- SEO meta tags: use title, meta_description, cover_image_url from the article
- Add JSON-LD Article schema for Google

### 3c. Sitemap (app/sitemap.ts)
- Generate sitemap including all blog article URLs
- Format: /blog/[slug] for each published article

## Step 4: Done!
Check your /blog page - articles should appear automatically.
New articles are generated weekly based on your site's niche.

---
💡 AI content generation is INCLUDED - no OpenAI/Anthropic keys needed!
💡 Articles appear in YOUR Supabase database automatically.
💡 Just build the frontend to display them.`;

// CLI one-liner
const CLI_COMMAND = `INDEXYOURNICHE_API_KEY=<YOUR_API_KEY> npx @indexyourniche/cli init -y -d yoursite.com && iyn scan && iyn topics --discover && iyn generate -y`;

export function Hero() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopiedPrompt(true);
    setShowPromptModal(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const copyCli = () => {
    navigator.clipboard.writeText(CLI_COMMAND);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showPromptModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPromptModal]);

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
        <p className="text-xs text-landing-text-muted mb-4">
          Paste to Cursor, Lovable, Claude Code, or run in terminal.{" "}
          <Link href="/signup" className="text-landing-accent hover:underline">
            Get your API key →
          </Link>
        </p>

        {/* Collapsible Preview */}
        <div className="max-w-2xl mx-auto mb-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 mx-auto text-xs text-landing-text-muted hover:text-landing-accent transition-colors"
          >
            {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showPreview ? "Hide prompt preview" : "Preview what you're copying"}
          </button>

          {showPreview && (
            <div className="mt-3 p-4 bg-landing-card border border-landing-border rounded-lg text-left">
              <pre className="text-xs text-landing-text-muted whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {AI_PROMPT}
              </pre>
            </div>
          )}
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

      {/* Copied Prompt Modal */}
      {showPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPromptModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl bg-landing-bg border border-landing-border rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-landing-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-full">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-landing-text">
                  Prompt Copied!
                </h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 text-landing-text-muted hover:text-landing-text transition-colors rounded-lg hover:bg-landing-card"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-landing-text-muted">
                Paste this into Cursor, Lovable, Claude Code, or your AI coding assistant:
              </p>
              <div className="p-4 bg-landing-card border border-landing-border rounded-lg">
                <pre className="text-xs text-landing-text whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                  {AI_PROMPT}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-landing-border">
              <Button
                variant="landing-outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(AI_PROMPT);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
              >
                {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                {copiedPrompt ? "Copied!" : "Copy Again"}
              </Button>
              <Link href="/signup">
                <Button variant="landing" size="sm">
                  Start Now →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
