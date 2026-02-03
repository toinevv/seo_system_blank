import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, Book, Zap, Bot, Code, FileText, Settings, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | IndexYourNiche",
  description: "Complete guide to setting up and using the IndexYourNiche CLI for automated SEO content generation.",
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-4">
      {title && (
        <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm font-mono rounded-t-lg border-b border-gray-700">
          {title}
        </div>
      )}
      <pre className={`bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm font-mono ${title ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="prose prose-gray max-w-none">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Everything you need to set up automated SEO content generation with the IndexYourNiche CLI.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <p className="font-semibold text-sm text-gray-900 mb-3">Getting Started</p>
              <a href="#quickstart" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">Quick Start</a>
              <a href="#installation" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">Installation</a>
              <a href="#api-key" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">API Key Setup</a>

              <p className="font-semibold text-sm text-gray-900 mb-3 mt-6">Commands</p>
              <a href="#init" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">iyn init</a>
              <a href="#scan" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">iyn scan</a>
              <a href="#topics" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">iyn topics</a>
              <a href="#generate" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">iyn generate</a>
              <a href="#blog" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">iyn blog</a>

              <p className="font-semibold text-sm text-gray-900 mb-3 mt-6">Guides</p>
              <a href="#geo-setup" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">GEO Setup (robots.txt)</a>
              <a href="#ai-agents" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">AI Agent Integration</a>
              <a href="#config" className="block py-1.5 text-sm text-gray-600 hover:text-emerald-600">Configuration</a>
            </nav>
          </aside>

          {/* Content */}
          <main>
            <Section id="quickstart" title="Quick Start" icon={Zap}>
              <p className="text-gray-600 mb-4">
                Get started with IndexYourNiche in under a minute. This guide assumes you have Node.js 18+ installed.
              </p>

              <CodeBlock title="Terminal">{`# 1. Get your API key from the dashboard
#    https://indexyourniche.com/dashboard/settings

# 2. Set your API key
export INDEXYOURNICHE_API_KEY=iyn_your_key_here

# 3. Initialize in your project
npx @indexyourniche/cli init

# 4. Scan your website
iyn scan

# 5. Discover topics
iyn topics --discover

# 6. Generate your first article
iyn generate`}</CodeBlock>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-6">
                <p className="text-emerald-800 text-sm">
                  <strong>Tip:</strong> Use the <code className="bg-emerald-100 px-1 rounded">-y</code> flag for non-interactive mode,
                  perfect for CI/CD pipelines and AI coding agents.
                </p>
              </div>
            </Section>

            <Section id="installation" title="Installation" icon={Terminal}>
              <p className="text-gray-600 mb-4">
                You can use the CLI directly with npx (recommended) or install it globally.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">Using npx (Recommended)</h3>
              <CodeBlock>{`npx @indexyourniche/cli init`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Global Installation</h3>
              <CodeBlock>{`npm install -g @indexyourniche/cli

# Now you can use 'iyn' directly
iyn --help`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Supported Frameworks</h3>
              <p className="text-gray-600 mb-4">The CLI automatically detects and configures for:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li>Next.js (App Router & Pages Router)</li>
                <li>Remix</li>
                <li>Astro</li>
                <li>Nuxt</li>
                <li>Any Node.js project with package.json</li>
              </ul>
            </Section>

            <Section id="api-key" title="API Key Setup" icon={Settings}>
              <p className="text-gray-600 mb-4">
                You need an API key to use the CLI. Get one from your dashboard.
              </p>

              <ol className="list-decimal pl-6 text-gray-600 space-y-3 mb-6">
                <li>Sign up at <Link href="/signup" className="text-emerald-600 hover:underline">indexyourniche.com/signup</Link></li>
                <li>Go to <strong>Dashboard → Settings → API Keys</strong></li>
                <li>Click <strong>Generate New Key</strong></li>
                <li>Copy the key (starts with <code className="bg-gray-100 px-1 rounded">iyn_</code>)</li>
              </ol>

              <h3 className="text-lg font-semibold mt-6 mb-3">Setting the API Key</h3>

              <p className="text-gray-600 mb-2"><strong>Option 1:</strong> Environment variable (recommended)</p>
              <CodeBlock>{`# Add to your .env.local or shell profile
export INDEXYOURNICHE_API_KEY=iyn_your_key_here`}</CodeBlock>

              <p className="text-gray-600 mb-2 mt-4"><strong>Option 2:</strong> Inline with command</p>
              <CodeBlock>{`INDEXYOURNICHE_API_KEY=iyn_xxx npx @indexyourniche/cli init`}</CodeBlock>
            </Section>

            <Section id="init" title="iyn init" icon={Code}>
              <p className="text-gray-600 mb-4">
                Initialize IndexYourNiche in your project. Creates a <code className="bg-gray-100 px-1 rounded">seo.config.json</code> file
                and registers your website with the platform.
              </p>

              <CodeBlock title="Usage">{`iyn init [options]

Options:
  -d, --domain <domain>      Website domain
  -n, --name <name>          Website name
  -l, --language <language>  Content language (default: en-US)
  -y, --yes                  Non-interactive mode (accept defaults)`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Examples</h3>
              <CodeBlock>{`# Interactive setup
iyn init

# Non-interactive setup
iyn init -y -d example.com -n "My Website"

# Specify language
iyn init -y -d example.com -l nl-NL`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">What it does</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li>Detects your project framework (Next.js, Remix, etc.)</li>
                <li>Finds existing Supabase and AI credentials in .env files</li>
                <li>Creates <code className="bg-gray-100 px-1 rounded">seo.config.json</code> with your settings</li>
                <li>Registers your website with the IndexYourNiche platform</li>
              </ul>
            </Section>

            <Section id="scan" title="iyn scan" icon={FileText}>
              <p className="text-gray-600 mb-4">
                Analyze your website to understand your niche, content themes, and target keywords.
                This data is used to generate relevant topics.
              </p>

              <CodeBlock title="Usage">{`iyn scan [options]

Options:
  -f, --force    Force a fresh scan (ignore cached results)`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Output</h3>
              <p className="text-gray-600 mb-4">The scan provides:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li><strong>Niche Description:</strong> AI-generated summary of your website's focus</li>
                <li><strong>Content Themes:</strong> Main topics your website covers</li>
                <li><strong>Keywords:</strong> Target keywords for SEO optimization</li>
              </ul>
            </Section>

            <Section id="topics" title="iyn topics" icon={Book}>
              <p className="text-gray-600 mb-4">
                Manage content topics. Discover new ideas with AI or list existing topics.
              </p>

              <CodeBlock title="Usage">{`iyn topics [options]

Options:
  -d, --discover        Discover new topics using AI
  -c, --count <number>  Number of topics to discover (default: 10)
  -l, --list            List existing topics`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Examples</h3>
              <CodeBlock>{`# List all topics
iyn topics

# Discover 20 new topics
iyn topics --discover -c 20

# Add a specific topic manually
iyn topic:add "How to optimize Next.js for SEO"`}</CodeBlock>
            </Section>

            <Section id="generate" title="iyn generate" icon={Zap}>
              <p className="text-gray-600 mb-4">
                Generate a GEO-optimized article from a topic. The article is automatically saved
                to your target database.
              </p>

              <CodeBlock title="Usage">{`iyn generate [options]

Options:
  -t, --topic <topic>  Topic title or ID to use
  -y, --yes            Skip confirmation prompts`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">GEO Optimization</h3>
              <p className="text-gray-600 mb-4">
                Generated articles include features optimized for AI search engines:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-1">
                <li><strong>TL;DR:</strong> 50-75 word summary for quick AI extraction</li>
                <li><strong>FAQ Section:</strong> Structured Q&A with schema markup</li>
                <li><strong>Cited Statistics:</strong> Data points with sources</li>
                <li><strong>Expert Quotes:</strong> Attribution for credibility</li>
                <li><strong>JSON-LD Schema:</strong> Article and FAQ structured data</li>
              </ul>
            </Section>

            <Section id="blog" title="iyn blog" icon={FileText}>
              <p className="text-gray-600 mb-4">
                Scaffold blog pages in your project. Creates listing and article pages
                with GEO optimization built-in.
              </p>

              <CodeBlock title="Usage">{`iyn blog [options]

Options:
  -p, --path <path>  Blog URL path (default: /blog)
  -y, --yes          Non-interactive mode`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Generated Files</h3>
              <p className="text-gray-600 mb-4">For Next.js App Router:</p>
              <CodeBlock>{`app/blog/
├── page.tsx        # Blog listing page
└── [slug]/
    └── page.tsx    # Individual article with GEO features`}</CodeBlock>
            </Section>

            <Section id="geo-setup" title="GEO Setup (robots.txt)" icon={Globe}>
              <p className="text-gray-600 mb-4">
                <strong>Generative Engine Optimization (GEO)</strong> is about making your content visible in AI-powered search engines
                like ChatGPT, Perplexity, Claude, and Gemini. A key step is configuring your <code className="bg-gray-100 px-1 rounded">robots.txt</code> to
                explicitly allow AI crawlers.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Why this matters:</strong> Many AI companies only index sites that explicitly permit their bots.
                  Without proper robots.txt configuration, your content may not appear in AI search results.
                </p>
              </div>

              <h3 className="text-lg font-semibold mt-6 mb-3">robots.txt Template for GEO</h3>
              <p className="text-gray-600 mb-4">
                Add this to your <code className="bg-gray-100 px-1 rounded">public/robots.txt</code> file:
              </p>

              <CodeBlock title="public/robots.txt">{`# robots.txt - Optimized for SEO & GEO
# Allow all bots by default
User-agent: *
Allow: /

# AI / LLM Crawlers - Explicitly Allowed
# OpenAI (ChatGPT, GPT)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Anthropic (Claude)
User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

# Google AI (Gemini/Bard)
User-agent: Google-Extended
Allow: /

# Perplexity AI Search
User-agent: PerplexityBot
Allow: /

# Common Crawl (used by many AI companies)
User-agent: CCBot
Allow: /

# Meta AI
User-agent: FacebookBot
Allow: /

User-agent: meta-externalagent
Allow: /

# Amazon (Alexa, AI)
User-agent: Amazonbot
Allow: /

# Apple (Siri, Spotlight)
User-agent: Applebot
Allow: /

# Cohere AI
User-agent: cohere-ai
Allow: /

# You.com AI Search
User-agent: YouBot
Allow: /

# Sitemap
Sitemap: https://yourdomain.com/sitemap.xml`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">AI Bot Reference</h3>
              <p className="text-gray-600 mb-4">Here are the main AI crawlers and what they're used for:</p>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Bot</th>
                      <th className="px-4 py-2 text-left font-semibold">Company</th>
                      <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="px-4 py-2 font-mono text-xs">GPTBot</td><td className="px-4 py-2">OpenAI</td><td className="px-4 py-2">Training & ChatGPT</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">ChatGPT-User</td><td className="px-4 py-2">OpenAI</td><td className="px-4 py-2">ChatGPT browsing</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">Claude-Web</td><td className="px-4 py-2">Anthropic</td><td className="px-4 py-2">Claude web search</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">Google-Extended</td><td className="px-4 py-2">Google</td><td className="px-4 py-2">Gemini/Bard AI</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">PerplexityBot</td><td className="px-4 py-2">Perplexity</td><td className="px-4 py-2">AI search engine</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">CCBot</td><td className="px-4 py-2">Common Crawl</td><td className="px-4 py-2">Dataset for AI training</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-6">
                <p className="text-emerald-800 text-sm">
                  <strong>Pro tip:</strong> The setup prompt in your dashboard includes a ready-to-copy robots.txt
                  template customized with your domain's sitemap URL.
                </p>
              </div>
            </Section>

            <Section id="ai-agents" title="AI Agent Integration" icon={Bot}>
              <p className="text-gray-600 mb-4">
                The CLI is designed to work seamlessly with AI coding agents like Claude Code,
                Cursor, Lovable, and Replit.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">For Claude Code / Cursor</h3>
              <p className="text-gray-600 mb-2">Just paste this prompt to your AI agent:</p>
              <CodeBlock>{`Set up IndexYourNiche SEO for my project.
My API key is iyn_xxx and my domain is example.com.

Run these commands:
1. INDEXYOURNICHE_API_KEY=iyn_xxx npx @indexyourniche/cli init -y -d example.com
2. iyn scan
3. iyn topics --discover -c 10
4. iyn blog -y`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Non-Interactive Mode</h3>
              <p className="text-gray-600 mb-4">
                All commands support the <code className="bg-gray-100 px-1 rounded">-y</code> flag for non-interactive execution:
              </p>
              <CodeBlock>{`# Full autonomous setup
iyn init -y -d example.com
iyn scan
iyn topics --discover -c 20
iyn generate -y
iyn blog -y`}</CodeBlock>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-blue-800 text-sm">
                  <strong>Coming Soon:</strong> Native MCP (Model Context Protocol) integration for
                  Claude Code will enable even deeper integration without command-line execution.
                </p>
              </div>
            </Section>

            <Section id="config" title="Configuration" icon={Settings}>
              <p className="text-gray-600 mb-4">
                The <code className="bg-gray-100 px-1 rounded">seo.config.json</code> file stores your project settings.
              </p>

              <CodeBlock title="seo.config.json">{`{
  "website": {
    "name": "My Website",
    "domain": "example.com",
    "language": "en-US",
    "author": "Team"
  },
  "target": {
    "supabaseUrl": "\${NEXT_PUBLIC_SUPABASE_URL}",
    "supabaseServiceKey": "\${SUPABASE_SERVICE_ROLE_KEY}"
  },
  "ai": {
    "provider": "anthropic",
    "apiKey": "\${ANTHROPIC_API_KEY}"
  },
  "content": {
    "postingFrequency": 3,
    "autoGenerateTopics": false,
    "categories": ["general"]
  },
  "blog": {
    "path": "/blog",
    "productId": "example-com"
  },
  "_meta": {
    "websiteId": "uuid-here",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}`}</CodeBlock>

              <h3 className="text-lg font-semibold mt-6 mb-3">Environment Variables</h3>
              <p className="text-gray-600 mb-4">
                Values starting with <code className="bg-gray-100 px-1 rounded">$&#123;...&#125;</code> are
                automatically interpolated from your environment.
              </p>
            </Section>

            {/* CTA */}
            <div className="mt-16 p-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-emerald-100 mb-6 max-w-lg mx-auto">
                Create your free account and start generating GEO-optimized content in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
