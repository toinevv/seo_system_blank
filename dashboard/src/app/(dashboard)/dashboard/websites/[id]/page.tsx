import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanWebsiteButton } from "./scan-button";
import { OnboardingProgressWrapper } from "./onboarding-wrapper";

import {
  Settings,
  FileText,
  BarChart3,
  Clock,
  ArrowLeft,
  ExternalLink,
  Search,
  Tag,
  Key,
  Link2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onboarding?: string }>;
}

export default async function WebsiteDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { onboarding } = await searchParams;
  const supabase = await createClient();

  const { data: website } = await supabase
    .from("websites")
    .select("*")
    .eq("id", id)
    .single();

  if (!website) {
    notFound();
  }

  // Get recent logs
  const { data: recentLogs } = await supabase
    .from("generation_logs")
    .select("*")
    .eq("website_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get topic count
  const { count: topicCount } = await supabase
    .from("topics")
    .select("*", { count: "exact", head: true })
    .eq("website_id", id)
    .eq("is_used", false);

  // Get API keys status
  const apiKeysResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/api/api-keys?website_id=${id}`,
    { cache: "no-store" }
  ).catch(() => null);

  const apiKeysStatus = apiKeysResponse?.ok
    ? await apiKeysResponse.json()
    : { configured: false };

  // Get website scan data
  const { data: websiteScan } = await supabase
    .from("website_scans")
    .select("*")
    .eq("website_id", id)
    .single();

  return (
    <div className="flex flex-col">
      <Header
        title={website.name}
        description={website.domain}
      />

      <div className="p-6 space-y-6">
        {/* Back button */}
        <Link href="/dashboard/websites">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Websites
          </Button>
        </Link>

        {/* Onboarding Progress (shown during initial setup) */}
        <OnboardingProgressWrapper
          websiteId={id}
          showOnboarding={
            onboarding === "true" ||
            (website.seo_config as Record<string, unknown> | null)?.onboarding_status === "scanning" ||
            (website.seo_config as Record<string, unknown> | null)?.onboarding_status === "discovering" ||
            (website.seo_config as Record<string, unknown> | null)?.onboarding_status === "generating"
          }
        />

        {/* Status Banner */}
        <Card className={website.is_active ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${website.is_active ? "bg-green-500" : "bg-yellow-500"}`} />
                <span className="font-medium">
                  {website.is_active ? "Active" : "Paused"}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  Generates every {website.days_between_posts} days
                </span>
              </div>
              <a
                href={`https://${website.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Visit site <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{website.total_articles_generated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Topics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topicCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Generation</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {website.next_scheduled_at
                  ? new Date(website.next_scheduled_at).toLocaleDateString()
                  : "Not scheduled"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Status</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {apiKeysStatus.configured ? (
                  <span className="text-green-600">Configured</span>
                ) : (
                  <span className="text-yellow-600">Not Set</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href={`/dashboard/websites/${id}/settings`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <Settings className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Settings</CardTitle>
                <CardDescription>
                  Configure prompts, schedule, and SEO options
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/dashboard/websites/${id}/topics`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Topics</CardTitle>
                <CardDescription>
                  Manage content topics and priorities
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/dashboard/websites/${id}/logs`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Logs</CardTitle>
                <CardDescription>
                  View generation history and errors
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/dashboard/websites/${id}/partners`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <Link2 className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">Partners</CardTitle>
                <CardDescription>
                  Manage partner websites for backlinking
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Website Content Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Website Content Analysis
                </CardTitle>
                <CardDescription>
                  Scanned content themes and keywords for accurate topic generation
                </CardDescription>
              </div>
              <ScanWebsiteButton websiteId={id} />
            </div>
          </CardHeader>
          <CardContent>
            {websiteScan && websiteScan.scan_status === "completed" ? (
              <div className="space-y-4">
                {websiteScan.niche_description && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Detected Niche</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {websiteScan.niche_description}
                    </p>
                  </div>
                )}

                {websiteScan.content_themes && websiteScan.content_themes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Content Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {websiteScan.content_themes.map((theme: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {websiteScan.main_keywords && websiteScan.main_keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Extracted Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {websiteScan.main_keywords.slice(0, 15).map((keyword: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {keyword}
                        </span>
                      ))}
                      {websiteScan.main_keywords.length > 15 && (
                        <span className="text-xs text-muted-foreground">
                          +{websiteScan.main_keywords.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Last scanned: {new Date(websiteScan.last_scanned_at).toLocaleString()} •
                  Pages scanned: {websiteScan.pages_scanned}
                </div>
              </div>
            ) : websiteScan && websiteScan.scan_status === "scanning" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Scanning website content...
              </div>
            ) : websiteScan && websiteScan.scan_status === "failed" ? (
              <div className="text-sm text-red-600">
                Scan failed: {websiteScan.error_message || "Unknown error"}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No scan data yet. Click &quot;Scan Website&quot; to analyze content for better topic generation.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        {log.article_title || "Generating..."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.api_used && `via ${log.api_used}`}
                        {log.seo_score && ` • SEO Score: ${log.seo_score}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-100 text-green-800"
                            : log.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : log.status === "generating"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {log.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No generation activity yet. Add topics to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
