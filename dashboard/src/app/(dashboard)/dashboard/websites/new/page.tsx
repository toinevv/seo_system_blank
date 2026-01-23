"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";

type Step = "basic" | "database" | "api-keys" | "review";

export default function NewWebsitePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // API keys
    openai_api_key: "",
    anthropic_api_key: "",
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create website
      const { data: website, error: websiteError } = await supabase
        .from("websites")
        .insert({
          user_id: user.id,
          name: formData.name,
          domain: formData.domain,
          product_id: formData.product_id,
          language: formData.language,
          default_author: formData.default_author,
          days_between_posts: formData.days_between_posts,
          is_active: true,
          next_scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (websiteError) throw websiteError;

      // Store API keys (encryption happens server-side)
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_id: website.id,
          openai_api_key: formData.openai_api_key,
          anthropic_api_key: formData.anthropic_api_key,
          target_supabase_url: formData.target_supabase_url,
          target_supabase_service_key: formData.target_supabase_service_key,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save API keys");
      }

      router.push(`/dashboard/websites/${website.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create website");
      setLoading(false);
    }
  };

  const steps: { key: Step; title: string; description: string }[] = [
    { key: "basic", title: "Basic Info", description: "Website name and settings" },
    { key: "database", title: "Target Database", description: "Where to store articles" },
    { key: "api-keys", title: "API Keys", description: "AI service credentials" },
    { key: "review", title: "Review", description: "Confirm and create" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canProceed = () => {
    switch (step) {
      case "basic":
        return formData.name && formData.domain && formData.product_id;
      case "database":
        return formData.target_supabase_url && formData.target_supabase_service_key;
      case "api-keys":
        return true; // AI keys are optional - platform provides them
      default:
        return true;
    }
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
                    <Input
                      id="language"
                      placeholder="en-US"
                      value={formData.language}
                      onChange={(e) => updateField("language", e.target.value)}
                    />
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
                    onChange={(e) => updateField("target_supabase_url", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_supabase_service_key">Target Service Role Key</Label>
                  <Input
                    id="target_supabase_service_key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={formData.target_supabase_service_key}
                    onChange={(e) => updateField("target_supabase_service_key", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in Supabase Dashboard → Settings → API → service_role key
                  </p>
                </div>
              </>
            )}

            {step === "api-keys" && (
              <>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 mb-4">
                  <p className="text-sm text-emerald-800">
                    <strong>✨ AI keys are optional!</strong> Your subscription includes AI content
                    generation powered by Claude. Skip this step or add your own keys to use your quota.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai_api_key">OpenAI API Key <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="openai_api_key"
                    type="password"
                    placeholder="sk-proj-... (leave blank to use platform AI)"
                    value={formData.openai_api_key}
                    onChange={(e) => updateField("openai_api_key", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anthropic_api_key">Anthropic API Key <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="anthropic_api_key"
                    type="password"
                    placeholder="sk-ant-... (leave blank to use platform AI)"
                    value={formData.anthropic_api_key}
                    onChange={(e) => updateField("anthropic_api_key", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === "review" && (
              <div className="space-y-4">
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
                    <p className="text-sm text-muted-foreground">Posting Frequency</p>
                    <p className="font-medium">Every {formData.days_between_posts} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target Database</p>
                    <p className="font-medium">{formData.target_supabase_url ? "✓ Configured" : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Content Generation</p>
                    <p className="font-medium">
                      {formData.openai_api_key || formData.anthropic_api_key
                        ? [
                            formData.openai_api_key && "OpenAI",
                            formData.anthropic_api_key && "Anthropic",
                          ].filter(Boolean).join(", ")
                        : "✨ Platform AI (included)"}
                    </p>
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
              onClick={() => setStep(steps[currentStepIndex + 1].key)}
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
