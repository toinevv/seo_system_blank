"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Key } from "lucide-react";

export default function GlobalSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [googleNewsKey, setGoogleNewsKey] = useState("");

  const handleSave = async () => {
    setSaving(true);
    // TODO: Save to system_keys table
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSuccess(true);
    setSaving(false);
  };

  return (
    <div className="flex flex-col">
      <Header title="Global Settings" description="Configure system-wide settings" />

      <div className="p-6 space-y-6 max-w-2xl">
        {success && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            Settings saved successfully!
          </div>
        )}

        {/* Shared API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shared API Keys</CardTitle>
            <CardDescription>
              These keys are used across all websites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google_news">Google News API Key (Optional)</Label>
              <Input
                id="google_news"
                type="password"
                placeholder="AIza..."
                value={googleNewsKey}
                onChange={(e) => setGoogleNewsKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for automatic topic discovery from Google News.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Worker Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Worker Configuration</CardTitle>
            <CardDescription>
              The worker runs on Railway and generates content for all websites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Environment Variables for Railway:</p>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`CENTRAL_SUPABASE_URL=your-supabase-url
CENTRAL_SUPABASE_SERVICE_KEY=your-service-key
ENCRYPTION_KEY=your-encryption-key
RAILWAY_RUN_MODE=continuous`}
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate an encryption key with: <code className="bg-muted px-1 rounded">openssl rand -base64 32</code>
            </p>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
