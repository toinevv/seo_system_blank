"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, Check, Key, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ApiKeysPage() {
  const params = useParams();
  const websiteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currentStatus, setCurrentStatus] = useState({
    configured: false,
    openai_configured: false,
    anthropic_configured: false,
    target_supabase_url: "",
    target_db_configured: false,
  });

  const [formData, setFormData] = useState({
    openai_api_key: "",
    anthropic_api_key: "",
    target_supabase_url: "",
    target_supabase_service_key: "",
  });

  useEffect(() => {
    fetchStatus();
  }, [websiteId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/api-keys?website_id=${websiteId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStatus(data);
        if (data.target_supabase_url) {
          setFormData((prev) => ({
            ...prev,
            target_supabase_url: data.target_supabase_url,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch API keys status:", err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_id: websiteId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save API keys");
      }

      setSuccess(true);
      setFormData({
        openai_api_key: "",
        anthropic_api_key: "",
        target_supabase_url: formData.target_supabase_url,
        target_supabase_service_key: "",
      });
      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }

    setSaving(false);
  };

  return (
    <div className="flex flex-col">
      <Header title="API Keys" description="Configure credentials for this website" />

      <div className="p-6 space-y-6 max-w-2xl">
        <Link href={`/dashboard/websites/${websiteId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Website
          </Button>
        </Link>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  {currentStatus.openai_configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>OpenAI API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentStatus.anthropic_configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Anthropic API Key</span>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  {currentStatus.target_db_configured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Target Database</span>
                  {currentStatus.target_supabase_url && (
                    <span className="text-sm text-muted-foreground">
                      ({currentStatus.target_supabase_url})
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Credentials</CardTitle>
            <CardDescription>
              Leave fields empty to keep existing values. Enter new values to update.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
                API keys saved successfully!
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">AI API Keys</h4>
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type="password"
                  placeholder={currentStatus.openai_configured ? "••••••••••••" : "sk-proj-..."}
                  value={formData.openai_api_key}
                  onChange={(e) =>
                    setFormData({ ...formData, openai_api_key: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                <Input
                  id="anthropic"
                  type="password"
                  placeholder={currentStatus.anthropic_configured ? "••••••••••••" : "sk-ant-..."}
                  value={formData.anthropic_api_key}
                  onChange={(e) =>
                    setFormData({ ...formData, anthropic_api_key: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Target Database</h4>
              <p className="text-sm text-muted-foreground">
                The Supabase database where articles will be published for this website.
              </p>
              <div className="space-y-2">
                <Label htmlFor="supabase_url">Supabase URL</Label>
                <Input
                  id="supabase_url"
                  placeholder="https://xxxxx.supabase.co"
                  value={formData.target_supabase_url}
                  onChange={(e) =>
                    setFormData({ ...formData, target_supabase_url: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase_key">Service Role Key</Label>
                <Input
                  id="supabase_key"
                  type="password"
                  placeholder={
                    currentStatus.target_db_configured
                      ? "••••••••••••"
                      : "eyJhbGciOiJIUzI1NiIs..."
                  }
                  value={formData.target_supabase_service_key}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_supabase_service_key: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || (!formData.openai_api_key && !formData.anthropic_api_key && !formData.target_supabase_service_key)}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
