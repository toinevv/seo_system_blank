"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2, Copy, ExternalLink, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Common languages for SEO content
const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "nl-BE", label: "Dutch (Belgium)" },
  { value: "de-DE", label: "German" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
  { value: "it-IT", label: "Italian" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "pl-PL", label: "Polish" },
  { value: "sv-SE", label: "Swedish" },
  { value: "da-DK", label: "Danish" },
  { value: "no-NO", label: "Norwegian" },
  { value: "fi-FI", label: "Finnish" },
];

// Extract project ID from Supabase URL (e.g., "klhmxzuvfzodmcotsezy" from "https://klhmxzuvfzodmcotsezy.supabase.co")
const extractSupabaseProjectId = (url: string): string | null => {
  const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : null;
};

type Step = "basic" | "database" | "frontend" | "checkout" | "review";

const PLAN_DETAILS: Record<string, { name: string; price: number; geoPrice: number; articles: number }> = {
  starter: { name: "Starter", price: 30, geoPrice: 35, articles: 3 },
  pro: { name: "Pro", price: 75, geoPrice: 140, articles: 10 },
  business: { name: "Business", price: 150, geoPrice: 290, articles: 30 },
};

export default function NewWebsitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get plan info from URL params (passed from signup)
  const planKey = searchParams.get("plan") || "starter";
  const withGeo = searchParams.get("geo") === "true";
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const planDetails = PLAN_DETAILS[planKey] || PLAN_DETAILS.starter;
  const displayPrice = withGeo ? planDetails.geoPrice : planDetails.price;

  // Start at checkout step if coming back from successful payment
  const [step, setStep] = useState<Step>(checkoutSuccess ? "review" : "basic");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [frontendCopied, setFrontendCopied] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Preview scan state (runs in background while user fills database form)
  const [previewScanStatus, setPreviewScanStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [previewScanData, setPreviewScanData] = useState<{
    niche_description?: string;
    content_themes?: string[];
    main_keywords?: string[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Basic info
    name: "",
    domain: "",
    product_id: "",
    language: "en-US",
    default_author: "Team",
    days_between_posts: 3,

    // Target database
    target_supabase_url: "",
    target_supabase_service_key: "",
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Restore form data from localStorage after returning from checkout
  useEffect(() => {
    if (checkoutSuccess) {
      const savedData = localStorage.getItem("websiteSetupData");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          localStorage.removeItem("websiteSetupData");
        } catch (e) {
          console.error("Failed to restore form data:", e);
        }
      }
    }
  }, [checkoutSuccess]);

  // Auto-generate product_id from domain
  const handleDomainChange = (domain: string) => {
    updateField("domain", domain);
    if (!formData.product_id) {
      const productId = domain
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      updateField("product_id", productId);
    }
  };

  // Trigger preview scan in background (fire and forget)
  const triggerPreviewScan = async (domain: string) => {
    if (!domain || previewScanStatus === "scanning") return;

    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase();

    if (!cleanDomain) return;

    setPreviewScanStatus("scanning");
    console.log("Starting preview scan for:", cleanDomain);

    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";
      const response = await fetch(`${workerUrl}/scan-preview?domain=${encodeURIComponent(cleanDomain)}`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPreviewScanData(result.data);
          setPreviewScanStatus("done");
          console.log("Preview scan complete:", result.data);
        } else {
          setPreviewScanStatus("error");
        }
      } else {
        setPreviewScanStatus("error");
      }
    } catch (err) {
      console.error("Preview scan error:", err);
      setPreviewScanStatus("error");
    }
  };

  // Handle step navigation with preview scan trigger
  const handleNextStep = (nextStep: Step) => {
    // When moving from basic to database, trigger preview scan
    if (step === "basic" && nextStep === "database" && formData.domain) {
      triggerPreviewScan(formData.domain);
    }
    setStep(nextStep);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Clean domain (remove protocol, www, trailing slash)
      const cleanDomain = formData.domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "")
        .toLowerCase();

      // Create website
      const { data: website, error: websiteError } = await supabase
        .from("websites")
        .insert({
          user_id: user.id,
          name: formData.name,
          domain: cleanDomain,
          product_id: formData.product_id,
          language: formData.language,
          default_author: formData.default_author,
          days_between_posts: formData.days_between_posts,
          is_active: true,
          next_scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (websiteError) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (websiteError.code === "23505") {
          if (websiteError.message?.includes("domain")) {
            throw new Error("A website with this domain already exists. Please use a different domain.");
          } else if (websiteError.message?.includes("product_id")) {
            throw new Error("A website with this Product ID already exists. Please change the Product ID.");
          }
          throw new Error("This website already exists. Please check the domain and Product ID are unique.");
        }
        throw websiteError;
      }

      // Store database credentials (encryption happens server-side)
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_id: website.id,
          target_supabase_url: formData.target_supabase_url,
          target_supabase_service_key: formData.target_supabase_service_key,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save API keys");
      }

      // Trigger automatic onboarding (scan → discover topics → generate content)
      try {
        await fetch(`/api/v1/websites/${website.id}/onboard`, {
          method: "POST",
        });
      } catch (onboardErr) {
        console.error("Failed to start onboarding:", onboardErr);
        // Continue anyway - user can manually trigger later
      }

      router.push(`/dashboard/websites/${website.id}?onboarding=true`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create website");
      setLoading(false);
    }
  };

  const steps: { key: Step; title: string; description: string }[] = [
    { key: "basic", title: "Basic Info", description: "Website name and settings" },
    { key: "database", title: "Database Setup", description: "Connect and configure your database" },
    { key: "frontend", title: "Frontend Guide", description: "How to display your blog" },
    { key: "checkout", title: "Subscribe", description: "Activate your subscription" },
    { key: "review", title: "Review", description: "Confirm and create" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canProceed = () => {
    switch (step) {
      case "basic":
        return formData.name && formData.domain && formData.product_id;
      case "database":
        return formData.target_supabase_url && formData.target_supabase_service_key;
      case "frontend":
        return true; // Guide is informational
      case "checkout":
        return checkoutSuccess; // Can only proceed after successful payment
      default:
        return true;
    }
  };

  // Handle Stripe checkout
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);

    try {
      // Store form data in localStorage so we can restore it after checkout
      localStorage.setItem("websiteSetupData", JSON.stringify(formData));

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, withGeo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setCheckoutLoading(false);
    }
  };

  // Test connection to the target Supabase database
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError(null);

    try {
      const { createClient: createTargetClient } = await import("@supabase/supabase-js");
      const targetSupabase = createTargetClient(
        formData.target_supabase_url,
        formData.target_supabase_service_key
      );

      // Try to query the blog_articles table (or check if it exists)
      const { error } = await targetSupabase
        .from("blog_articles")
        .select("id")
        .limit(1);

      if (error) {
        // Table doesn't exist yet - that's expected, they need to run the SQL
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setConnectionStatus("success");
          setConnectionError("Connection successful! The blog_articles table doesn't exist yet - run the SQL below to create it.");
        } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
          setConnectionStatus("error");
          setConnectionError("Connection failed: Permission denied. Make sure you're using the service_role key, not the anon key.");
        } else {
          setConnectionStatus("error");
          setConnectionError(`Connection error: ${error.message}`);
        }
      } else {
        setConnectionStatus("success");
        setConnectionError("Connection successful! The blog_articles table already exists.");
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err instanceof Error ? err.message : "Failed to connect. Check your URL and key.");
    } finally {
      setTestingConnection(false);
    }
  };

  // Get the Supabase project ID for the SQL editor link
  const supabaseProjectId = extractSupabaseProjectId(formData.target_supabase_url);
  const sqlEditorUrl = supabaseProjectId
    ? `https://supabase.com/dashboard/project/${supabaseProjectId}/sql/new`
    : null;

  // The SQL schema to copy
  const databaseSql = `-- Run this SQL in your Supabase SQL Editor to create the blog_articles table

CREATE TABLE IF NOT EXISTS public.blog_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    product_id TEXT NOT NULL,
    website_domain TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,
    cover_image_url TEXT,
    cover_image_alt TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_keyword TEXT,
    secondary_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    internal_links JSONB DEFAULT '[]'::JSONB,
    schema_markup JSONB DEFAULT '{}'::JSONB,
    keyword_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    author TEXT,
    read_time INTEGER DEFAULT 5,
    category TEXT,
    topic_id TEXT,
    seo_score INTEGER,
    geo_targeting TEXT[],
    language TEXT,
    tldr TEXT,
    faq_items JSONB DEFAULT '[]'::JSONB,
    cited_statistics JSONB DEFAULT '[]'::JSONB,
    citations JSONB DEFAULT '[]'::JSONB,
    geo_optimized BOOLEAN DEFAULT FALSE,
    faq_schema JSONB DEFAULT '{}'::JSONB,
    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_product ON public.blog_articles(product_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_product_category ON public.blog_articles(product_id, category);
CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_category ON public.blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_status ON public.blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_blog_tags ON public.blog_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_articles(slug);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_articles_updated_at ON public.blog_articles;
CREATE TRIGGER update_blog_articles_updated_at
    BEFORE UPDATE ON public.blog_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (published articles only)
CREATE POLICY "Public can read published articles"
    ON public.blog_articles
    FOR SELECT
    USING (status = 'published');

-- Create policy for service role to manage articles
CREATE POLICY "Service role can manage articles"
    ON public.blog_articles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.blog_articles TO anon;
GRANT ALL ON public.blog_articles TO authenticated;
GRANT ALL ON public.blog_articles TO service_role;`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(databaseSql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  // Frontend implementation guide
  const frontendGuide = `// =============================================================================
// BLOG FRONTEND IMPLEMENTATION GUIDE
// =============================================================================
// This guide shows you how to integrate the blog system into your website.
// Examples are in Next.js/React but the concepts apply to any framework.

// -----------------------------------------------------------------------------
// 1. SUPABASE CLIENT SETUP (lib/supabase.ts)
// -----------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// -----------------------------------------------------------------------------
// 2. FETCH ARTICLES FOR BLOG LISTING PAGE (app/blog/page.tsx)
// -----------------------------------------------------------------------------
export async function getBlogArticles() {
  const { data: articles } = await supabase
    .from('blog_articles')
    .select('slug, title, excerpt, published_at, cover_image_url, category, read_time, author')
    .eq('status', 'published')
    .eq('product_id', '${formData.product_id || "YOUR_PRODUCT_ID"}')
    .order('published_at', { ascending: false })

  return articles || []
}

// -----------------------------------------------------------------------------
// 3. FETCH SINGLE ARTICLE BY SLUG (app/blog/[slug]/page.tsx)
// -----------------------------------------------------------------------------
export async function getArticleBySlug(slug: string) {
  const { data: article } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('slug', slug)
    .eq('product_id', '${formData.product_id || "YOUR_PRODUCT_ID"}')
    .eq('status', 'published')
    .single()

  return article
}

// -----------------------------------------------------------------------------
// 4. GENERATE STATIC PATHS FOR ALL ARTICLES (for SSG)
// -----------------------------------------------------------------------------
export async function generateStaticParams() {
  const { data: articles } = await supabase
    .from('blog_articles')
    .select('slug')
    .eq('product_id', '${formData.product_id || "YOUR_PRODUCT_ID"}')
    .eq('status', 'published')

  return (articles || []).map((article) => ({ slug: article.slug }))
}

// -----------------------------------------------------------------------------
// 5. SEO METADATA (app/blog/[slug]/page.tsx)
// -----------------------------------------------------------------------------
export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.meta_description || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.meta_description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
      type: 'article',
      publishedTime: article.published_at,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.meta_description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  }
}

// -----------------------------------------------------------------------------
// 6. JSON-LD STRUCTURED DATA (for rich search results)
// -----------------------------------------------------------------------------
function ArticleJsonLd({ article }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description,
    image: article.cover_image_url,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    // Use FAQ schema if available (GEO optimized)
    ...(article.faq_schema && Object.keys(article.faq_schema).length > 0
      ? { mainEntity: article.faq_schema }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}`;

  const seoTips = [
    {
      title: "URL Structure",
      tips: [
        "Use clean URLs: /blog/your-article-slug",
        "Keep slugs short, descriptive, and keyword-rich",
        "Use hyphens, not underscores",
      ],
    },
    {
      title: "Meta Tags",
      tips: [
        "Unique title tag (50-60 characters)",
        "Meta description (150-160 characters)",
        "Open Graph tags for social sharing",
      ],
    },
    {
      title: "Content Structure",
      tips: [
        "Use semantic HTML (article, header, main, section)",
        "One H1 per page (the article title)",
        "Logical heading hierarchy (H2, H3, H4)",
        "Include the TL;DR summary for AI search engines",
      ],
    },
    {
      title: "Performance",
      tips: [
        "Lazy load images below the fold",
        "Use next/image or similar for optimization",
        "Implement ISR (Incremental Static Regeneration)",
      ],
    },
    {
      title: "Sitemap & Internal Linking",
      tips: [
        "Add blog URLs to your sitemap.xml",
        "Link between related articles",
        "Use descriptive anchor text",
        "The system stores internal_links for each article",
      ],
    },
  ];

  const copyFrontendGuide = async () => {
    await navigator.clipboard.writeText(frontendGuide);
    setFrontendCopied(true);
    setTimeout(() => setFrontendCopied(false), 2000);
  };

  return (
    <div className="flex flex-col">
      <Header title="Add New Website" description="Connect a new website to your SEO dashboard" />

      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    i < currentStepIndex
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === currentStepIndex
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-2 text-center hidden sm:block">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-12 sm:w-24 mx-2 ${
                    i < currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStepIndex].title}</CardTitle>
            <CardDescription>{steps[currentStepIndex].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "basic" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Website Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Blog"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={formData.domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_id">Product ID</Label>
                  <Input
                    id="product_id"
                    placeholder="example"
                    value={formData.product_id}
                    onChange={(e) => updateField("product_id", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier used in the database. Auto-generated from domain.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={formData.language}
                      onChange={(e) => updateField("language", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days_between_posts">Days Between Posts</Label>
                    <Input
                      id="days_between_posts"
                      type="number"
                      min={1}
                      value={formData.days_between_posts}
                      onChange={(e) => updateField("days_between_posts", parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_author">Default Author</Label>
                  <Input
                    id="default_author"
                    placeholder="Team"
                    value={formData.default_author}
                    onChange={(e) => updateField("default_author", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === "database" && (
              <>
                {/* Background Scan Status */}
                {previewScanStatus === "scanning" && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-4 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Analyzing <strong>{formData.domain}</strong> in the background...
                    </p>
                  </div>
                )}
                {previewScanStatus === "done" && previewScanData && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-3 mb-4">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Website analyzed: <strong>{previewScanData.niche_description ? previewScanData.niche_description.slice(0, 60) + "..." : formData.domain}</strong>
                    </p>
                  </div>
                )}

                {/* Credentials Section */}
                <div className="rounded-md bg-muted p-4 mb-4">
                  <p className="text-sm">
                    Enter the Supabase credentials for the <strong>target website</strong> where
                    articles will be published. This is the website&apos;s own database, not the
                    central dashboard database.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_supabase_url">Target Supabase URL</Label>
                  <Input
                    id="target_supabase_url"
                    placeholder="https://xxxxx.supabase.co"
                    value={formData.target_supabase_url}
                    onChange={(e) => {
                      updateField("target_supabase_url", e.target.value);
                      setConnectionStatus("idle");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_supabase_service_key">Target Service Role Key</Label>
                  <Input
                    id="target_supabase_service_key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={formData.target_supabase_service_key}
                    onChange={(e) => {
                      updateField("target_supabase_service_key", e.target.value);
                      setConnectionStatus("idle");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in Supabase Dashboard → Settings → API → service_role key
                  </p>
                </div>

                {/* Test Connection Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={!formData.target_supabase_url || !formData.target_supabase_service_key || testingConnection}
                    className="flex items-center gap-2"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : connectionStatus === "success" ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Connection OK
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  {connectionError && (
                    <p className={`text-sm mt-2 ${connectionStatus === "success" ? "text-green-600" : "text-destructive"}`}>
                      {connectionError}
                    </p>
                  )}
                </div>

                {/* SQL Setup Section - only show after credentials are entered */}
                {formData.target_supabase_url && formData.target_supabase_service_key && (
                  <div className="border-t pt-6 mt-6">
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>📋 One-time setup:</strong> Copy the SQL below and run it in your Supabase SQL Editor
                        to create the <code className="bg-blue-100 px-1 rounded">blog_articles</code> table.
                      </p>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyToClipboard}
                        className="flex items-center gap-2"
                      >
                        {sqlCopied ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy SQL
                          </>
                        )}
                      </Button>

                      {sqlEditorUrl && (
                        <a href={sqlEditorUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="default" className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Open SQL Editor
                          </Button>
                        </a>
                      )}
                    </div>

                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-64 overflow-y-auto">
                        <code>{databaseSql}</code>
                      </pre>
                    </div>

                    <div className="rounded-md bg-amber-50 border border-amber-200 p-4 mt-4">
                      <p className="text-sm text-amber-800">
                        <strong>💡 Tip:</strong> Click &quot;Open SQL Editor&quot;, paste the SQL, and click &quot;Run&quot;.
                        Then use &quot;Test Connection&quot; above to verify it worked.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "frontend" && (
              <>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 mb-4">
                  <p className="text-sm text-emerald-800">
                    <strong>🚀 Implementation Guide:</strong> Copy this code to integrate the blog
                    into your {formData.domain || "website"}. Examples are in Next.js but work with any framework.
                  </p>
                </div>

                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyFrontendGuide}
                    className="flex items-center gap-2"
                  >
                    {frontendCopied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-72 overflow-y-auto">
                    <code>{frontendGuide}</code>
                  </pre>
                </div>

                {/* SEO Best Practices */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="font-semibold mb-4">SEO Best Practices for Findability</h3>
                  <div className="grid gap-4">
                    {seoTips.map((section) => (
                      <div key={section.title} className="rounded-md border p-4">
                        <h4 className="font-medium text-sm mb-2">{section.title}</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {section.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 mt-0.5">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === "checkout" && (
              <div className="space-y-6">
                {checkoutSuccess ? (
                  <div className="rounded-md bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="h-5 w-5" />
                      <strong>Payment successful!</strong>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your subscription is now active. Click &quot;Next&quot; to finish creating your website.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Website Scan Preview - Show what we discovered */}
                    {previewScanStatus === "scanning" && (
                      <div className="rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-900">Analyzing Your Website</h3>
                            <p className="text-sm text-blue-700">Discovering topics and keywords for {formData.domain}...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {previewScanStatus === "done" && previewScanData && (
                      <div className="rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-emerald-900">We Found Great Content Opportunities!</h3>
                            <p className="text-sm text-emerald-700">Here&apos;s what we discovered on {formData.domain}</p>
                          </div>
                        </div>

                        {previewScanData.niche_description && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Your Niche</p>
                            <p className="text-sm text-gray-600 bg-white/60 rounded-md p-2">
                              {previewScanData.niche_description}
                            </p>
                          </div>
                        )}

                        {previewScanData.content_themes && previewScanData.content_themes.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Content Themes We&apos;ll Write About</p>
                            <div className="flex flex-wrap gap-2">
                              {previewScanData.content_themes.slice(0, 5).map((theme, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                                >
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {previewScanData.main_keywords && previewScanData.main_keywords.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Target Keywords</p>
                            <div className="flex flex-wrap gap-2">
                              {previewScanData.main_keywords.slice(0, 8).map((keyword, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-white/80 text-gray-700 border border-gray-200"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {previewScanStatus === "error" && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                        <p className="text-sm text-amber-800">
                          <strong>Note:</strong> We couldn&apos;t fully analyze {formData.domain} yet.
                          Don&apos;t worry - we&apos;ll do a complete scan after setup to find the best topics for your content.
                        </p>
                      </div>
                    )}

                    <div className="rounded-md bg-primary/5 border border-primary/20 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{planDetails.name} Plan</h3>
                          <p className="text-sm text-muted-foreground">
                            {planDetails.articles} articles/month
                            {withGeo && (
                              <span className="inline-flex items-center gap-1 ml-2 text-primary">
                                <Sparkles size={12} /> + GEO optimization
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl font-bold">€{displayPrice}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <ul className="text-sm space-y-2 mb-6">
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-600" />
                          {planDetails.articles} SEO-optimized articles per month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-600" />
                          Automatic topic discovery
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-600" />
                          Google indexing requests
                        </li>
                        {withGeo && (
                          <>
                            <li className="flex items-center gap-2 text-primary">
                              <Sparkles size={14} />
                              GEO optimization for AI visibility
                            </li>
                            <li className="flex items-center gap-2 text-primary">
                              <Sparkles size={14} />
                              Optimized for ChatGPT, Perplexity, Claude
                            </li>
                          </>
                        )}
                      </ul>
                      <Button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="w-full"
                        size="lg"
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redirecting to checkout...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Subscribe Now
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Secure payment via Stripe. Cancel anytime.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="space-y-4">
                {checkoutSuccess && (
                  <div className="rounded-md bg-green-50 border border-green-200 p-3 mb-4">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Subscription active - {planDetails.name} plan
                      {withGeo && " + GEO"}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Website Name</p>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domain</p>
                    <p className="font-medium">{formData.domain}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Product ID</p>
                    <p className="font-medium">{formData.product_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-medium">
                      {LANGUAGES.find((l) => l.value === formData.language)?.label || formData.language}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posting Frequency</p>
                    <p className="font-medium">Every {formData.days_between_posts} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target Database</p>
                    <p className="font-medium">{formData.target_supabase_url ? "✓ Configured" : "Not set"}</p>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          {step === "basic" ? (
            <Link href="/dashboard/websites">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStep(steps[currentStepIndex - 1].key)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {step === "review" ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Website
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleNextStep(steps[currentStepIndex + 1].key)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
