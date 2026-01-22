"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Terminal, Zap, Bot, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

// The one-liner command - this is the hero command users copy
const ONE_LINER_COMMAND = `INDEXYOURNICHE_API_KEY=<YOUR_API_KEY> npx @indexyourniche/cli init -y -d yoursite.com && iyn scan && iyn topics --discover && iyn generate -y`;

const codeSnippets = {
  oneliner: ONE_LINER_COMMAND,

  explained: `# What this command does:
# 1. Connects your project to IndexYourNiche
# 2. Scans your site to understand your niche
# 3. Discovers SEO topic opportunities
# 4. Generates your first GEO-optimized article

${ONE_LINER_COMMAND}`,

  agent: `Add SEO to my project with IndexYourNiche. Run this command:

${ONE_LINER_COMMAND}

Replace <YOUR_API_KEY> with the key from indexyourniche.com/signup`,
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
        {label}
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 pt-6 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export function CLIQuickstart() {
  const [activeTab, setActiveTab] = useState<"oneliner" | "explained" | "agent">("oneliner");
  const [copied, setCopied] = useState(false);

  const copyOneLiner = () => {
    navigator.clipboard.writeText(ONE_LINER_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="landing-section bg-gradient-to-b from-gray-50 to-white">
      <div className="landing-container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            <Terminal className="h-4 w-4" />
            Developer-First Setup
          </div>
          <h2 className="landing-heading">
            One Command. <span className="text-emerald-600">Instant SEO.</span>
          </h2>
          <p className="landing-subheading max-w-2xl mx-auto">
            Copy this command and paste it to your AI coding agent.
            <br />
            Sign up to get your API key → done.
          </p>
        </div>

        {/* HERO: The One-Liner Command */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative group bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5">
              <Terminal className="h-3 w-3" />
              Copy & Paste to Your AI Agent
            </div>
            <pre className="text-gray-100 text-sm md:text-base font-mono overflow-x-auto whitespace-pre-wrap break-all pt-2">
              {ONE_LINER_COMMAND}
            </pre>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
              <span className="text-xs text-gray-500">
                Replace &lt;YOUR_API_KEY&gt; with your key from signup
              </span>
              <Button
                onClick={copyOneLiner}
                variant="landing"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy Command
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* CTA: Get API Key */}
        <div className="text-center mb-12">
          <Link href="/signup">
            <Button variant="landing" size="lg">
              Get Your Free API Key
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Free tier: 5 articles/month. No credit card required.
          </p>
        </div>

        {/* Tab Selector for More Info */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("explained")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "explained"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Sparkles className="h-4 w-4 inline mr-2" />
            What It Does
          </button>
          <button
            onClick={() => setActiveTab("agent")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "agent"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Bot className="h-4 w-4 inline mr-2" />
            AI Agent Prompt
          </button>
        </div>

        {/* Code Display */}
        <div className="max-w-3xl mx-auto mb-8">
          <CodeBlock
            code={codeSnippets[activeTab]}
            label={
              activeTab === "explained" ? "Explained" : "Paste to AI Agent"
            }
          />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="text-center p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Terminal className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Framework Agnostic</h3>
            <p className="text-sm text-gray-600">
              Next.js, Remix, Astro, Nuxt - auto-detected and configured
            </p>
          </div>
          <div className="text-center p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">AI Agent Ready</h3>
            <p className="text-sm text-gray-600">
              Non-interactive mode (-y flag) for Claude Code, Cursor, Lovable
            </p>
          </div>
          <div className="text-center p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold mb-2">GEO Optimized</h3>
            <p className="text-sm text-gray-600">
              Content structured for ChatGPT, Claude & Perplexity citations
            </p>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="text-center">
          <Button asChild variant="landing-outline" size="lg">
            <Link href="/docs">
              <Terminal className="h-4 w-4 mr-2" />
              Full CLI Documentation
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
