"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2, Copy, ExternalLink, CreditCard, Sparkles, X, AlertTriangle, TrendingUp, Bot, Database } from "lucide-react";
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

type Step = "basic" | "database" | "review" | "checkout";

const PLAN_DETAILS: Record<string, { name: string; price: number; geoPrice: number; articles: number }> = {
  starter: { name: "Starter", price: 30, geoPrice: 35, articles: 3 },
  pro: { name: "Pro", price: 75, geoPrice: 140, articles: 10 },
  business: { name: "Business", price: 150, geoPrice: 290, articles: 30 },
};

// Vibe coder prompt (same as landing page)
const VIBE_PROMPT = `Add IndexYourNiche SEO blog to this project.

## Step 1: Create Articles Table
Run this SQL in Supabase SQL Editor:

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

## Step 2: Build Blog Frontend
Create app/blog/page.tsx (list articles) and app/blog/[slug]/page.tsx (single article).
Fetch from Supabase, add SEO meta tags and JSON-LD schema.

Done! Articles will appear in your database automatically.`;

export default function NewWebsitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get plan info from URL params (passed from signup) - default to Pro as featured plan
  const planKey = searchParams.get("plan") || "pro";
  // Default GEO to true (only false if explicitly set to "false")
  const withGeo = searchParams.get("geo") !== "false";
  const checkoutSuccess = searchParams.get("checkout") === "success";

  // Start at checkout step if coming back from successful payment (shows success + Create button)
  const [step, setStep] = useState<Step>(checkoutSuccess ? "checkout" : "basic");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [setupMethod, setSetupMethod] = useState<"vibe" | "sql" | null>(null);
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

  // Plan selection state (user can choose plan during checkout step)
  const [selectedPlan, setSelectedPlan] = useState<string>(planKey);
  const [enableGeo, setEnableGeo] = useState<boolean>(withGeo);
  const [skippedPayment, setSkippedPayment] = useState(false);

  // Subscription status (check if user already has active subscription)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // FOMO pop-up state
  const [showFomoPopup, setShowFomoPopup] = useState(false);
  const [fomoPopupIndex, setFomoPopupIndex] = useState(0);

  const FOMO_MESSAGES = [
    {
      title: "Your competitors are ranking higher",
      message: "Every day without SEO content means potential customers finding your competitors instead.",
      icon: TrendingUp,
    },
    {
      title: "Google isn't indexing your site",
      message: "Without regular content updates, search engines deprioritize your website.",
      icon: AlertTriangle,
    },
    {
      title: "Missing out on organic traffic",
      message: "SEO-optimized content can bring 10x more visitors than paid ads long-term.",
      icon: TrendingUp,
    },
  ];

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

  // Check if user already has an active subscription
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCheckingSubscription(false);
          return;
        }

        // Check for active subscription in profiles table (set by Stripe webhook)
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", user.id)
          .single();

        if (profile?.subscription_status === "active") {
          setHasActiveSubscription(true);
        }
      } catch (err) {
        console.error("Failed to check subscription:", err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [supabase]);

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

  // FOMO pop-ups when user skips payment
  useEffect(() => {
    if (!skippedPayment) return;

    // Show first pop-up after 5 seconds
    const firstTimeout = setTimeout(() => {
      setShowFomoPopup(true);
    }, 5000);

    // Cycle through messages every 30 seconds
    const interval = setInterval(() => {
      setFomoPopupIndex((prev) => (prev + 1) % FOMO_MESSAGES.length);
      setShowFomoPopup(true);
    }, 30000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [skippedPayment, FOMO_MESSAGES.length]);

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

      // Create an AbortController for timeout (90 seconds should be plenty)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Preview scan: timeout reached, aborting");
        controller.abort();
      }, 90000);

      console.log("Preview scan: fetching", `${workerUrl}/scan-preview?domain=${encodeURIComponent(cleanDomain)}`);

      const response = await fetch(`${workerUrl}/scan-preview?domain=${encodeURIComponent(cleanDomain)}`, {
        method: "POST",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Preview scan: got response", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("Preview scan: parsed result", result);
        if (result.success && result.data) {
          setPreviewScanData(result.data);
          setPreviewScanStatus("done");
          console.log("Preview scan complete:", result.data);
        } else {
          console.log("Preview scan: response not successful", result);
          setPreviewScanStatus("error");
        }
      } else {
        const errorText = await response.text();
        console.error("Preview scan: HTTP error", response.status, errorText);
        setPreviewScanStatus("error");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("Preview scan: timed out after 90 seconds");
      } else {
        console.error("Preview scan error:", err);
      }
      setPreviewScanStatus("error");
    }
  };

  // Handle step navigation with preview scan trigger
  const handleNextStep = (nextStep: Step) => {
    // When moving from basic to database, trigger preview scan
    if (step === "basic" && nextStep === "database" && formData.domain) {
      triggerPreviewScan(formData.domain);
    }
    // Skip checkout step if user already has active subscription (go straight to creating website)
    if (nextStep === "checkout" && hasActiveSubscription) {
      handleSubmit();
      return;
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

      // Build seo_config with preview scan data (if available)
      // This allows the onboarding to skip the scan step if preview already completed
      const seoConfig: Record<string, unknown> = {
        fallback_meta_template: "{title} - {domain}",
        default_category: "general",
        schema_organization: {},
      };

      // Include preview scan data so onboarding can progress immediately
      if (previewScanData) {
        if (previewScanData.niche_description) {
          seoConfig.niche_description = previewScanData.niche_description;
        }
        if (previewScanData.content_themes?.length) {
          seoConfig.content_themes = previewScanData.content_themes;
        }
        if (previewScanData.main_keywords?.length) {
          seoConfig.main_keywords = previewScanData.main_keywords;
        }
        if (previewScanData.homepage_title) {
          seoConfig.homepage_title = previewScanData.homepage_title;
        }
        // Mark scan as already complete from preview
        seoConfig.onboarding_status = "scanning"; // Will be detected as complete on first poll
      }

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
          seo_config: seoConfig,
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
    { key: "database", title: "Database Setup", description: "Connect your database" },
    { key: "review", title: "Review", description: "See what we found" },
    { key: "checkout", title: "Subscribe", description: "Activate your subscription" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canProceed = () => {
    switch (step) {
      case "basic":
        return formData.name && formData.domain && formData.product_id;
      case "database":
        // Both methods need credentials (we need them to publish articles)
        const hasCredentials = formData.target_supabase_url && formData.target_supabase_service_key;
        if (setupMethod === "vibe") return hasCredentials;
        if (setupMethod === "sql") return hasCredentials;
        return false; // Must select a method
      case "review":
        return true; // Always allow proceeding to checkout
      case "checkout":
        return checkoutSuccess || skippedPayment || hasActiveSubscription;
      default:
        return true;
    }
  };

  // Handle skip payment (create website without subscription)
  const handleSkipPayment = () => {
    setSkippedPayment(true);
    handleSubmit(); // Create website directly
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
        body: JSON.stringify({ plan: selectedPlan, withGeo: enableGeo }),
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
              <div className="space-y-4">
                {/* Setup Method Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupMethod(setupMethod === "vibe" ? null : "vibe")}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                      setupMethod === "vibe"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <Bot className={`h-5 w-5 ${setupMethod === "vibe" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">AI Setup</p>
                      <p className="text-xs text-muted-foreground">Lovable, Cursor, etc.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupMethod(setupMethod === "sql" ? null : "sql")}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                      setupMethod === "sql"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <Database className={`h-5 w-5 ${setupMethod === "sql" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">Manual Setup</p>
                      <p className="text-xs text-muted-foreground">SQL + credentials</p>
                    </div>
                  </button>
                </div>

                {/* Vibe Integration Content */}
                {setupMethod === "vibe" && (
                  <div className="space-y-4 pt-2">
                    {/* Step 1: Copy prompt for AI tool */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                        <p className="text-sm font-medium">Copy prompt for your AI tool</p>
                      </div>
                      <div className="relative ml-8">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-40 overflow-y-auto">
                          <code>{VIBE_PROMPT}</code>
                        </pre>
                      </div>
                      <div className="ml-8">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(VIBE_PROMPT);
                            setPromptCopied(true);
                            setTimeout(() => setPromptCopied(false), 2000);
                          }}
                        >
                          {promptCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Prompt
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: Enter credentials */}
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                        <p className="text-sm font-medium">Enter your Supabase credentials</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">
                        We need these to publish articles to your database
                      </p>
                      <div className="ml-8 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="vibe_supabase_url">Supabase URL</Label>
                          <Input
                            id="vibe_supabase_url"
                            placeholder="https://xxxxx.supabase.co"
                            value={formData.target_supabase_url}
                            onChange={(e) => {
                              updateField("target_supabase_url", e.target.value);
                              setConnectionStatus("idle");
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vibe_supabase_service_key">Service Role Key</Label>
                          <Input
                            id="vibe_supabase_service_key"
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={formData.target_supabase_service_key}
                            onChange={(e) => {
                              updateField("target_supabase_service_key", e.target.value);
                              setConnectionStatus("idle");
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Supabase Dashboard → Settings → API → service_role
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={testConnection}
                          disabled={!formData.target_supabase_url || !formData.target_supabase_service_key || testingConnection}
                        >
                          {testingConnection ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : connectionStatus === "success" ? (
                            <Check className="h-4 w-4 text-green-600 mr-2" />
                          ) : null}
                          {connectionStatus === "success" ? "Connected" : "Test Connection"}
                        </Button>
                        {connectionError && (
                          <p className={`text-sm ${connectionStatus === "success" ? "text-green-600" : "text-destructive"}`}>
                            {connectionError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SQL Integration Content */}
                {setupMethod === "sql" && (
                  <div className="space-y-4 pt-2">
                    {/* Credentials */}
                    <div className="space-y-2">
                      <Label htmlFor="target_supabase_url">Supabase URL</Label>
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
                      <Label htmlFor="target_supabase_service_key">Service Role Key</Label>
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
                        Supabase Dashboard → Settings → API → service_role
                      </p>
                    </div>

                    {/* Test + SQL buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testConnection}
                        disabled={!formData.target_supabase_url || !formData.target_supabase_service_key || testingConnection}
                      >
                        {testingConnection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : connectionStatus === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyToClipboard}
                      >
                        {sqlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="ml-2">{sqlCopied ? "Copied!" : "Copy SQL"}</span>
                      </Button>
                      {sqlEditorUrl && (
                        <a href={sqlEditorUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="default">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            SQL Editor
                          </Button>
                        </a>
                      )}
                    </div>
                    {connectionError && (
                      <p className={`text-sm ${connectionStatus === "success" ? "text-green-600" : "text-destructive"}`}>
                        {connectionError}
                      </p>
                    )}

                    {/* Collapsible SQL Preview */}
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View SQL schema
                      </summary>
                      <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs max-h-48 overflow-y-auto">
                        <code>{databaseSql}</code>
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            {step === "checkout" && (
              <div className="space-y-6">
                {hasActiveSubscription ? (
                  <div className="rounded-md bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="h-5 w-5" />
                      <strong>You already have an active subscription</strong>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your existing subscription covers this website.
                    </p>
                    <Button onClick={handleSubmit} disabled={loading} className="mt-3" size="lg">
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
                  </div>
                ) : checkoutSuccess ? (
                  <div className="rounded-md bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="h-5 w-5" />
                      <strong>Payment successful!</strong>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your {PLAN_DETAILS[selectedPlan]?.name} subscription is now active.
                    </p>
                    <Button onClick={handleSubmit} disabled={loading} className="mt-3" size="lg">
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
                  </div>
                ) : (
                  <>
                    {/* Pro Plan - Featured */}
                    <div
                      onClick={() => setSelectedPlan("pro")}
                      className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all ${
                        selectedPlan === "pro"
                          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                          : "border-primary/50 hover:border-primary hover:shadow-md"
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full shadow-md">
                        Best Value
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === "pro" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {selectedPlan === "pro" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <h4 className="text-xl font-bold">Pro</h4>
                            <p className="text-sm text-muted-foreground">Most popular choice</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">€{enableGeo ? PLAN_DETAILS.pro.geoPrice : PLAN_DETAILS.pro.price}</span>
                            <span className="text-muted-foreground">/mo</span>
                          </div>
                          <p className="text-sm text-primary font-medium">{PLAN_DETAILS.pro.articles} articles/month</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                          <Check className="h-3 w-3 mr-1" /> 3 websites
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                          <Check className="h-3 w-3 mr-1" /> Email support
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                          <Check className="h-3 w-3 mr-1" /> Great €/article ratio
                        </span>
                      </div>
                    </div>

                    {/* Business and Starter Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Business Plan */}
                      <div
                        onClick={() => setSelectedPlan("business")}
                        className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                          selectedPlan === "business"
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-muted hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === "business" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {selectedPlan === "business" && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <h4 className="font-semibold">Business</h4>
                            <p className="text-xs text-muted-foreground">Ranks fastest</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold">€{enableGeo ? PLAN_DETAILS.business.geoPrice : PLAN_DETAILS.business.price}</span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {PLAN_DETAILS.business.articles} articles/month
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">10 websites • Priority support</p>
                      </div>

                      {/* Starter Plan */}
                      <div
                        onClick={() => setSelectedPlan("starter")}
                        className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                          selectedPlan === "starter"
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-muted hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === "starter" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {selectedPlan === "starter" && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <h4 className="font-semibold">Starter</h4>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold">€{enableGeo ? PLAN_DETAILS.starter.geoPrice : PLAN_DETAILS.starter.price}</span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {PLAN_DETAILS.starter.articles} articles/month
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">1 website</p>
                      </div>
                    </div>

                    {/* GEO Optimization Toggle - Subtle */}
                    <div
                      onClick={() => setEnableGeo(!enableGeo)}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                        enableGeo
                          ? "border-primary/50 bg-primary/5"
                          : "border-muted hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className={`h-4 w-4 ${enableGeo ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-sm font-medium">GEO Optimization</p>
                          <p className="text-xs text-muted-foreground">
                            Optimize for AI search engines
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          +€{(PLAN_DETAILS[selectedPlan]?.geoPrice || 0) - (PLAN_DETAILS[selectedPlan]?.price || 0)}/mo
                        </span>
                        <div className={`h-5 w-9 rounded-full transition-colors ${enableGeo ? "bg-primary" : "bg-muted"}`}>
                          <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${enableGeo ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                        </div>
                      </div>
                    </div>

                    {/* Summary & Checkout */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-medium">Total</span>
                        <div className="text-right">
                          <span className="text-2xl font-bold">
                            €{enableGeo ? PLAN_DETAILS[selectedPlan]?.geoPrice : PLAN_DETAILS[selectedPlan]?.price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      </div>

                      {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
                          {error}
                        </div>
                      )}

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
                            Subscribe to {PLAN_DETAILS[selectedPlan]?.name}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Secure payment via Stripe. Cancel anytime.
                      </p>
                    </div>

                    {/* Skip Payment Option */}
                    <div className="text-center">
                      <button
                        onClick={handleSkipPayment}
                        disabled={loading}
                        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      >
                        {loading ? "Creating..." : "Continue without subscribing"}
                      </button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Website created but content generation won&apos;t start
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="space-y-6">
                {/* Scan Results - Show value before payment */}
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
                        <h3 className="font-semibold text-emerald-900">We Found Great Content Opportunities</h3>
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
                      We couldn&apos;t fully analyze {formData.domain} yet.
                      Don&apos;t worry - we&apos;ll do a complete scan after setup to find the best topics for your content.
                    </p>
                  </div>
                )}

                {previewScanStatus === "idle" && (
                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      Once you proceed, we&apos;ll analyze your website and discover content opportunities tailored to your niche.
                    </p>
                  </div>
                )}

                {/* Settings Summary */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Your Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Domain</p>
                      <p className="font-medium">{formData.domain}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Language</p>
                      <p className="font-medium">
                        {LANGUAGES.find((l) => l.value === formData.language)?.label || formData.language}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Posting</p>
                      <p className="font-medium">Every {formData.days_between_posts} days</p>
                    </div>
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

          {/* Checkout is the final step - Create Website button is in the checkout card */}
          {step !== "checkout" && (
            <Button
              onClick={() => handleNextStep(steps[currentStepIndex + 1].key)}
              disabled={!canProceed()}
            >
              {step === "review" ? "Continue to Payment" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* FOMO Pop-up for users who skipped payment */}
      {showFomoPopup && skippedPayment && (
        <div className="fixed bottom-4 right-4 max-w-sm animate-in slide-in-from-bottom-5 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-red-200 p-4">
            <button
              onClick={() => setShowFomoPopup(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                {(() => {
                  const IconComponent = FOMO_MESSAGES[fomoPopupIndex].icon;
                  return <IconComponent className="h-5 w-5 text-red-600" />;
                })()}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {FOMO_MESSAGES[fomoPopupIndex].title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {FOMO_MESSAGES[fomoPopupIndex].message}
                </p>
                <button
                  onClick={() => {
                    setShowFomoPopup(false);
                    setStep("checkout");
                  }}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Start generating content now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
