"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal, Bot, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// The one-liner command template
const getCommand = (apiKey: string, domain: string) =>
  `INDEXYOURNICHE_API_KEY=${apiKey} npx @indexyourniche/cli init -y -d ${domain} && iyn scan && iyn topics --discover && iyn generate -y`;

export default function SetupPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("yoursite.com");
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"explained" | "agent">("agent");

  // Fetch existing API key or create one
  useEffect(() => {
    fetchOrCreateKey();
  }, []);

  const fetchOrCreateKey = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/keys");
      const data = await res.json();

      if (data.data && data.data.length > 0) {
        const key = data.data[0];
        setApiKey(key.key_prefix + "...");
      } else {
        await createNewKey();
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNewKey = async () => {
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CLI Setup Key",
          description: "Auto-generated for quick CLI setup",
        }),
      });
      const data = await res.json();
      if (data.data?.api_key) {
        setApiKey(data.data.api_key);
        setJustCreated(data.data.api_key);
      }
    } catch (error) {
      console.error("Error creating API key:", error);
    }
  };

  const setupCommand = apiKey ? getCommand(apiKey, domain) : "";

  const agentPrompt = `Add SEO to my project with IndexYourNiche. Run this command:

${setupCommand}

This will:
1. Connect your project to IndexYourNiche
2. Scan your site to understand your niche
3. Discover SEO topic opportunities
4. Generate your first GEO-optimized article`;

  const explainedPrompt = `# What this command does:
# 1. Connects your project to IndexYourNiche
# 2. Scans your site to understand your niche
# 3. Discovers SEO topic opportunities
# 4. Generates your first GEO-optimized article

${setupCommand}`;

  const copyCommand = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(activeTab === "agent" ? agentPrompt : explainedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Setup" description="Get started with IndexYourNiche" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-3 text-sm text-muted-foreground">Loading your setup command...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Setup" description="Get started with IndexYourNiche" />

      <div className="p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            <Terminal className="h-4 w-4" />
            Developer-First Setup
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            One Command. <span className="text-emerald-600">Instant SEO.</span>
          </h2>
          <p className="text-muted-foreground">
            Copy this command and paste it to your AI coding agent.
          </p>
        </div>

        {/* HERO: The One-Liner Command */}
        <div className="mb-8">
          <div className="relative bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5">
              <Terminal className="h-3 w-3" />
              Copy & Paste to Your AI Agent
            </div>

            {/* Domain Input */}
            <div className="flex items-center gap-3 mb-4 pt-2">
              <span className="text-xs text-gray-400">Domain:</span>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yoursite.com"
                className="font-mono text-sm h-8 w-48 bg-gray-800 border-gray-700 text-gray-100"
              />
              {justCreated && (
                <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
                  ⚠️ Key shown once - save it!
                </span>
              )}
            </div>

            <pre className="text-gray-100 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {setupCommand}
            </pre>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
              <span className="text-xs text-gray-500">
                Your API key is pre-filled
              </span>
              <Button
                onClick={copyCommand}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
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

        {/* Tab Selector */}
        <div className="flex justify-center gap-2 mb-6">
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
        </div>

        {/* Prompt Display */}
        <div className="mb-8">
          <div className="relative group">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded">
              {activeTab === "agent" ? "Paste to AI Agent" : "Explained"}
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 pt-6 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {activeTab === "agent" ? agentPrompt : explainedPrompt}
            </pre>
            <button
              onClick={copyPrompt}
              className="absolute top-2 right-2 p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
              aria-label="Copy code"
            >
              {copiedPrompt ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Terminal className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">Framework Agnostic</h3>
            <p className="text-xs text-gray-600">
              Next.js, Remix, Astro, Nuxt - auto-detected
            </p>
          </div>
          <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">AI Agent Ready</h3>
            <p className="text-xs text-gray-600">
              Non-interactive mode for Claude Code, Cursor, Lovable
            </p>
          </div>
          <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-sm mb-1">GEO Optimized</h3>
            <p className="text-xs text-gray-600">
              Content for ChatGPT, Claude & Perplexity citations
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/docs">
            <Button variant="outline" size="lg">
              <Terminal className="h-4 w-4 mr-2" />
              Full CLI Documentation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
