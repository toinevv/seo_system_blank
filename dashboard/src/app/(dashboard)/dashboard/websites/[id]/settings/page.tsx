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
import { ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import type { Website } from "@/types/database";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [website, setWebsite] = useState<Website | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    language: "en-US",
    default_author: "Team",
    days_between_posts: 3,
    is_active: true,
    system_prompt_openai: "",
    system_prompt_claude: "",
  });

  useEffect(() => {
    fetchWebsite();
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
      });
    }
    setLoading(false);
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
      })
      .eq("id", websiteId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }

    setSaving(false);
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

        {/* Save Button */}
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
