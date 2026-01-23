"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal, Bot, Sparkles, Loader2, ArrowRight, Cloud, Database, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// SQL for blog_articles table
const BLOG_SQL = `CREATE TABLE IF NOT EXISTS public.blog_articles (
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

CREATE POLICY "Public can read published"
  ON public.blog_articles FOR SELECT
  USING (status = 'published');

GRANT SELECT ON public.blog_articles TO anon;`;

// CLI command template
const getCommand = (apiKey: string, domain: string) =>
  `INDEXYOURNICHE_API_KEY=${apiKey} npx @indexyourniche/cli init -y -d ${domain} && iyn scan && iyn topics --discover && iyn generate -y`;

export default function SetupPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("yoursite.com");
  const [copied, setCopied] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [setupType, setSetupType] = useState<"lovable" | "cli">("lovable");

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
          name: "Setup Key",
          description: "Auto-generated for setup",
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

  const copyCommand = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySql = () => {
    navigator.clipboard.writeText(BLOG_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Setup" description="Get started with IndexYourNiche" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Setup" description="Get started with IndexYourNiche" />

      <div className="p-6 max-w-4xl mx-auto w-full">
        {/* Setup Type Selector */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setSetupType("lovable")}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              setupType === "lovable"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Cloud className="h-4 w-4" />
            Lovable / Replit / Bolt
          </button>
          <button
            onClick={() => setSetupType("cli")}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              setupType === "cli"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Terminal className="h-4 w-4" />
            CLI / Local Project
          </button>
        </div>

        {/* LOVABLE / CLOUD SETUP */}
        {setupType === "lovable" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">
                Cloud-Based Setup
              </h2>
              <p className="text-muted-foreground">
                For Lovable, Replit, Bolt, and other cloud platforms
              </p>
            </div>

            {/* Step 1 */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Enable Supabase in your platform</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    In Lovable: Click &quot;Enable Supabase&quot; or go to Project Settings → Integrations → Supabase
                  </p>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                    This creates your database where articles will be stored.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Create the blog_articles table</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Go to your Supabase Dashboard → SQL Editor → Run this SQL:
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-48 overflow-y-auto">
                      {BLOG_SQL}
                    </pre>
                    <Button
                      onClick={copySql}
                      size="sm"
                      className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
                    >
                      {copiedSql ? <><Check className="h-3 w-3 mr-1" />Copied!</> : <><Copy className="h-3 w-3 mr-1" />Copy SQL</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Add your website here</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click below and enter your Supabase URL + Service Key (from Supabase Dashboard → Settings → API)
                  </p>
                  <Link href="/dashboard/websites/new">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Database className="h-4 w-4 mr-2" />
                      Add Website
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">We generate content automatically</h3>
                  <p className="text-sm text-muted-foreground">
                    Once connected, we&apos;ll generate SEO-optimized articles and publish them directly to your database. You can trigger generation manually or let our scheduler handle it.
                  </p>
                </div>
              </div>
            </div>

            {/* Lovable-specific prompt */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">Prompt for Lovable</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    After completing the steps above, paste this to add a blog to your Lovable project:
                  </p>
                  <div className="relative">
                    <pre className="bg-white border border-purple-200 p-3 rounded-lg text-xs font-mono text-purple-900 whitespace-pre-wrap">
{`Add a blog section to my app that reads from the blog_articles table in Supabase.

Create:
1. /blog page - lists all articles (title, excerpt, date)
2. /blog/[slug] page - shows full article content

Query example:
const { data } = await supabase
  .from('blog_articles')
  .select('*')
  .eq('status', 'published')
  .order('published_at', { ascending: false })`}
                    </pre>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`Add a blog section to my app that reads from the blog_articles table in Supabase.

Create:
1. /blog page - lists all articles (title, excerpt, date)
2. /blog/[slug] page - shows full article content

Query example:
const { data } = await supabase
  .from('blog_articles')
  .select('*')
  .eq('status', 'published')
  .order('published_at', { ascending: false })`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 text-xs"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLI SETUP */}
        {setupType === "cli" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2">
                One Command. <span className="text-emerald-600">Instant SEO.</span>
              </h2>
              <p className="text-muted-foreground">
                For local projects with terminal access
              </p>
            </div>

            {/* CLI Command */}
            <div className="relative bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5">
                <Terminal className="h-3 w-3" />
                Copy & Paste to Your AI Agent
              </div>

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
                    Save this key!
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
                  {copied ? <><Check className="h-4 w-4 mr-1.5" />Copied!</> : <><Copy className="h-4 w-4 mr-1.5" />Copy Command</>}
                </Button>
              </div>
            </div>

            {/* What it does */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                What this command does
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Creates <code className="bg-gray-200 px-1 rounded">seo.config.json</code> and registers your site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scans your site to understand your niche</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Discovers SEO topic opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Generates your first GEO-optimized article</span>
                </li>
              </ol>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-5 rounded-xl bg-white border shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Terminal className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Framework Agnostic</h3>
                <p className="text-xs text-gray-600">
                  Next.js, Remix, Astro, Nuxt
                </p>
              </div>
              <div className="text-center p-5 rounded-xl bg-white border shadow-sm">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">AI Agent Ready</h3>
                <p className="text-xs text-gray-600">
                  Claude Code, Cursor, Windsurf
                </p>
              </div>
              <div className="text-center p-5 rounded-xl bg-white border shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">GEO Optimized</h3>
                <p className="text-xs text-gray-600">
                  ChatGPT & Perplexity citations
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
