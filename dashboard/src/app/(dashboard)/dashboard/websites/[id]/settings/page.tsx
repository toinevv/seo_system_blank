"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Trash2, Key, AlertTriangle, Sparkles, Clock, FileText } from "lucide-react";
import type { Website, GenerationLog } from "@/types/database";

// Content format definitions (matches worker/src/entry.py)
const CONTENT_FORMATS = {
  listicle: { name: "Listicle", description: "Numbered list format - tips, rankings, quick reads" },
  how_to_guide: { name: "How-To Guide", description: "Step-by-step tutorials and processes" },
  deep_dive: { name: "Deep Dive", description: "In-depth analysis for complex topics" },
  comparison: { name: "Comparison", description: "Side-by-side product/service comparisons" },
  case_study: { name: "Case Study", description: "Real-world examples demonstrating results" },
  qa_interview: { name: "Q&A Interview", description: "Question and answer format" },
  news_commentary: { name: "News Commentary", description: "Timely analysis of trends" },
  ultimate_guide: { name: "Ultimate Guide", description: "Comprehensive definitive guides" },
};

const VOICE_STYLES = {
  conversational: { name: "Conversational", description: "Friendly, uses contractions, personal" },
  professional: { name: "Professional", description: "Formal, no contractions, uses 'we'" },
  expert: { name: "Expert", description: "Authoritative, technical, detailed" },
  friendly: { name: "Friendly", description: "Casual, warm, may use emoji" },
};

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Smart error notification helper
function getErrorNotification(errorMessage: string | null): { message: string; type: "warning" | "error" } | null {
  if (!errorMessage) return null;

  const lower = errorMessage.toLowerCase();

  if (lower.includes("no api keys")) {
    return { message: "Configure your OpenAI or Anthropic API key above", type: "warning" };
  }
  if (lower.includes("decryption failed") || lower.includes("decryption error")) {
    return { message: "API keys may be corrupted. Try re-entering them.", type: "warning" };
  }
  if (lower.includes("pgrst204") || lower.includes("column")) {
    return { message: "Target database schema mismatch. Some columns may be missing.", type: "warning" };
  }
  if (lower.includes("openai error") || lower.includes("anthropic error")) {
    return { message: "AI API returned an error. Check your API key is valid.", type: "error" };
  }
  if (lower.includes("save article error") || lower.includes("failed to save")) {
    return { message: "Could not save to target database. Check credentials.", type: "error" };
  }
  if (lower.includes("no topics")) {
    return { message: "No topics available. Add topics or enable auto-generation.", type: "warning" };
  }

  return { message: errorMessage, type: "error" };
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [keysSuccess, setKeysSuccess] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);

  const [website, setWebsite] = useState<Website | null>(null);
  const [recentErrors, setRecentErrors] = useState<GenerationLog[]>([]);

  // Website settings form
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    language: "en-US",
    default_author: "Team",
    days_between_posts: 3,
    is_active: true,
    system_prompt_openai: "",
    system_prompt_claude: "",
    // Content format settings
    content_formats: Object.keys(CONTENT_FORMATS) as string[],
    voice_style: "conversational",
    human_elements: {
      rhetorical_questions: true,
      conversational_asides: true,
      opinion_markers: true,
      uncertainty_markers: true,
      anecdote_hints: true,
      transition_variety: true,
    },
    // Time variation settings
    time_variation_mode: "fixed" as "fixed" | "window" | "random",
    posting_window_start: "08:00",
    posting_window_end: "18:00",
    preferred_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    min_hours_between_posts: 24,
    max_hours_between_posts: 96,
  });

  // API keys form
  const [apiKeysData, setApiKeysData] = useState({
    openai_api_key: "",
    anthropic_api_key: "",
    target_supabase_url: "",
    target_supabase_service_key: "",
  });

  useEffect(() => {
    fetchWebsite();
    fetchApiKeys();
    fetchRecentErrors();
  }, [websiteId]);

  const fetchWebsite = async () => {
    const { data } = await supabase
      .from("websites")
      .select("*")
      .eq("id", websiteId)
      .single();

    if (data) {
      setWebsite(data as Website);
      setFormData({
        name: data.name,
        domain: data.domain,
        language: data.language || "en-US",
        default_author: data.default_author || "Team",
        days_between_posts: data.days_between_posts || 3,
        is_active: data.is_active,
        system_prompt_openai: data.system_prompt_openai || "",
        system_prompt_claude: data.system_prompt_claude || "",
        // Content format settings
        content_formats: data.content_formats || Object.keys(CONTENT_FORMATS),
        voice_style: data.voice_style || "conversational",
        human_elements: data.human_elements || {
          rhetorical_questions: true,
          conversational_asides: true,
          opinion_markers: true,
          uncertainty_markers: true,
          anecdote_hints: true,
          transition_variety: true,
        },
        // Time variation settings
        time_variation_mode: data.time_variation_mode || "fixed",
        posting_window_start: data.posting_window_start?.slice(0, 5) || "08:00",
        posting_window_end: data.posting_window_end?.slice(0, 5) || "18:00",
        preferred_days: data.preferred_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        min_hours_between_posts: data.min_hours_between_posts || 24,
        max_hours_between_posts: data.max_hours_between_posts || 96,
      });
    }
    setLoading(false);
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/api-keys?website_id=${websiteId}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeysData({
          openai_api_key: data.openai_api_key || "",
          anthropic_api_key: data.anthropic_api_key || "",
          target_supabase_url: data.target_supabase_url || "",
          target_supabase_service_key: data.target_supabase_service_key || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    }
  };

  const fetchRecentErrors = async () => {
    const { data } = await supabase
      .from("generation_logs")
      .select("*")
      .eq("website_id", websiteId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setRecentErrors(data as GenerationLog[]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("websites")
      .update({
        name: formData.name,
        domain: formData.domain,
        language: formData.language,
        default_author: formData.default_author,
        days_between_posts: formData.days_between_posts,
        is_active: formData.is_active,
        system_prompt_openai: formData.system_prompt_openai || null,
        system_prompt_claude: formData.system_prompt_claude || null,
        // Content format settings
        content_formats: formData.content_formats,
        voice_style: formData.voice_style,
        human_elements: formData.human_elements,
        // Time variation settings
        time_variation_mode: formData.time_variation_mode,
        posting_window_start: formData.posting_window_start,
        posting_window_end: formData.posting_window_end,
        preferred_days: formData.preferred_days,
        min_hours_between_posts: formData.min_hours_between_posts,
        max_hours_between_posts: formData.max_hours_between_posts,
      })
      .eq("id", websiteId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }

    setSaving(false);
  };

  // Toggle content format
  const toggleContentFormat = (format: string) => {
    setFormData((prev) => ({
      ...prev,
      content_formats: prev.content_formats.includes(format)
        ? prev.content_formats.filter((f) => f !== format)
        : [...prev.content_formats, format],
    }));
  };

  // Toggle human element
  const toggleHumanElement = (element: keyof typeof formData.human_elements) => {
    setFormData((prev) => ({
      ...prev,
      human_elements: {
        ...prev.human_elements,
        [element]: !prev.human_elements[element],
      },
    }));
  };

  // Toggle preferred day
  const togglePreferredDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_days: prev.preferred_days.includes(day)
        ? prev.preferred_days.filter((d) => d !== day)
        : [...prev.preferred_days, day],
    }));
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    setKeysError(null);
    setKeysSuccess(false);

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_id: websiteId,
          ...apiKeysData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save API keys");
      }

      setKeysSuccess(true);
      fetchApiKeys();
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : "Failed to save");
    }

    setSavingKeys(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this website? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("websites")
      .delete()
      .eq("id", websiteId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    } else {
      router.push("/dashboard/websites");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Website Settings" description={`Configure ${website?.name}`} />

      <div className="p-6 space-y-6 max-w-2xl">
        <Link href={`/dashboard/websites/${websiteId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Website
          </Button>
        </Link>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            Settings saved successfully!
          </div>
        )}

        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Website Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Default Author</Label>
                <Input
                  id="author"
                  value={formData.default_author}
                  onChange={(e) => setFormData({ ...formData, default_author: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="days">Days Between Posts</Label>
                <Input
                  id="days"
                  type="number"
                  min={1}
                  value={formData.days_between_posts}
                  onChange={(e) =>
                    setFormData({ ...formData, days_between_posts: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, is_active: true })}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, is_active: false })}
                  >
                    Paused
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Formats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Formats
            </CardTitle>
            <CardDescription>
              Select which article formats to rotate between. Content will randomly use one of these formats for variety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(CONTENT_FORMATS).map(([key, format]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.content_formats.includes(key)
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.content_formats.includes(key)}
                    onChange={() => toggleContentFormat(key)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{format.name}</div>
                    <div className="text-xs text-muted-foreground">{format.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {formData.content_formats.length === 0 && (
              <p className="text-sm text-yellow-600">Select at least one format. All formats will be enabled if none selected.</p>
            )}
          </CardContent>
        </Card>

        {/* Voice & Tone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Voice & Tone
            </CardTitle>
            <CardDescription>
              Configure writing style for more genuine, human-like content that avoids AI detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Style Selector */}
            <div className="space-y-2">
              <Label>Voice Style</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(VOICE_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, voice_style: key })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.voice_style === key
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{style.name}</div>
                    <div className="text-xs text-muted-foreground">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Human Elements */}
            <div className="space-y-3">
              <Label>Human Elements (Anti-AI Detection)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.rhetorical_questions}
                    onChange={() => toggleHumanElement("rhetorical_questions")}
                  />
                  Rhetorical questions
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.conversational_asides}
                    onChange={() => toggleHumanElement("conversational_asides")}
                  />
                  Conversational asides
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.opinion_markers}
                    onChange={() => toggleHumanElement("opinion_markers")}
                  />
                  Opinion markers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.uncertainty_markers}
                    onChange={() => toggleHumanElement("uncertainty_markers")}
                  />
                  Uncertainty markers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.anecdote_hints}
                    onChange={() => toggleHumanElement("anecdote_hints")}
                  />
                  Anecdotes & experiences
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.human_elements.transition_variety}
                    onChange={() => toggleHumanElement("transition_variety")}
                  />
                  Varied transitions
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Variation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Posting Time Variation
            </CardTitle>
            <CardDescription>
              Randomize posting times to appear more natural and avoid predictable patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time Variation Mode */}
            <div className="space-y-2">
              <Label>Schedule Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, time_variation_mode: "fixed" })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.time_variation_mode === "fixed"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-medium text-sm">Fixed</div>
                  <div className="text-xs text-muted-foreground">Same time every post</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, time_variation_mode: "window" })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.time_variation_mode === "window"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-medium text-sm">Window</div>
                  <div className="text-xs text-muted-foreground">Random within time window</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, time_variation_mode: "random" })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    formData.time_variation_mode === "random"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-medium text-sm">Random</div>
                  <div className="text-xs text-muted-foreground">Fully randomized times</div>
                </button>
              </div>
            </div>

            {/* Time Window (shown for window mode) */}
            {formData.time_variation_mode === "window" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="window_start">Window Start</Label>
                    <Input
                      id="window_start"
                      type="time"
                      value={formData.posting_window_start}
                      onChange={(e) => setFormData({ ...formData, posting_window_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="window_end">Window End</Label>
                    <Input
                      id="window_end"
                      type="time"
                      value={formData.posting_window_end}
                      onChange={(e) => setFormData({ ...formData, posting_window_end: e.target.value })}
                    />
                  </div>
                </div>

                {/* Preferred Days */}
                <div className="space-y-2">
                  <Label>Preferred Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => togglePreferredDay(day)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          formData.preferred_days.includes(day)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Hours Between Posts (for window and random modes) */}
            {formData.time_variation_mode !== "fixed" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_hours">Min Hours Between Posts</Label>
                  <Input
                    id="min_hours"
                    type="number"
                    min={1}
                    value={formData.min_hours_between_posts}
                    onChange={(e) =>
                      setFormData({ ...formData, min_hours_between_posts: parseInt(e.target.value) || 24 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_hours">Max Hours Between Posts</Label>
                  <Input
                    id="max_hours"
                    type="number"
                    min={1}
                    value={formData.max_hours_between_posts}
                    onChange={(e) =>
                      setFormData({ ...formData, max_hours_between_posts: parseInt(e.target.value) || 96 })
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Configure AI and database credentials for content generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {keysError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {keysError}
              </div>
            )}

            {keysSuccess && (
              <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
                API keys saved successfully!
              </div>
            )}

            {/* AI Keys */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type="password"
                  placeholder="sk-proj-..."
                  value={apiKeysData.openai_api_key}
                  onChange={(e) =>
                    setApiKeysData({ ...apiKeysData, openai_api_key: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                <Input
                  id="anthropic"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeysData.anthropic_api_key}
                  onChange={(e) =>
                    setApiKeysData({ ...apiKeysData, anthropic_api_key: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Target Database */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="supabase_url">Target Supabase URL</Label>
                <Input
                  id="supabase_url"
                  placeholder="https://xxxxx.supabase.co"
                  value={apiKeysData.target_supabase_url}
                  onChange={(e) =>
                    setApiKeysData({ ...apiKeysData, target_supabase_url: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase_key">Target Service Role Key</Label>
                <Input
                  id="supabase_key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={apiKeysData.target_supabase_service_key}
                  onChange={(e) =>
                    setApiKeysData({
                      ...apiKeysData,
                      target_supabase_service_key: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button onClick={handleSaveApiKeys} disabled={savingKeys} className="w-full">
              {savingKeys ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving API Keys...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Save API Keys
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* System Prompts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI System Prompts</CardTitle>
            <CardDescription>
              Custom prompts for content generation. Leave empty to use defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt_openai">OpenAI System Prompt</Label>
              <textarea
                id="prompt_openai"
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="You are an expert content writer..."
                value={formData.system_prompt_openai}
                onChange={(e) =>
                  setFormData({ ...formData, system_prompt_openai: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt_claude">Claude System Prompt</Label>
              <textarea
                id="prompt_claude"
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="You are an expert content writer..."
                value={formData.system_prompt_claude}
                onChange={(e) =>
                  setFormData({ ...formData, system_prompt_claude: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button for Website Settings */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>

        {/* Recent Errors */}
        {recentErrors.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                Recent Generation Errors
              </CardTitle>
              <CardDescription>
                Last {recentErrors.length} failed generation attempts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentErrors.map((log) => {
                const notification = getErrorNotification(log.error_message);
                return (
                  <div
                    key={log.id}
                    className={`rounded-md p-3 text-sm ${
                      notification?.type === "error"
                        ? "bg-red-50 border border-red-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className={notification?.type === "error" ? "text-red-800" : "text-yellow-800"}>
                          {notification?.message || log.error_message || "Unknown error"}
                        </p>
                        {log.article_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Article: {log.article_title}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Website
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
