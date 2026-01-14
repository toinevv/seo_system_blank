import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, FileText, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch dashboard stats
  const { data: websites } = await supabase
    .from("websites")
    .select("id, name, domain, is_active, total_articles_generated, last_generated_at");

  const { data: recentLogs } = await supabase
    .from("generation_logs")
    .select("*, websites(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: workerStatus } = await supabase
    .from("worker_status")
    .select("*")
    .eq("worker_name", "main")
    .single();

  const totalWebsites = websites?.length || 0;
  const activeWebsites = websites?.filter((w) => w.is_active).length || 0;
  const totalArticles =
    websites?.reduce((sum, w) => sum + (w.total_articles_generated || 0), 0) || 0;

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Overview of your SEO content system"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWebsites}</div>
              <p className="text-xs text-muted-foreground">
                {activeWebsites} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Articles
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArticles}</div>
              <p className="text-xs text-muted-foreground">
                Generated across all websites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Worker Status</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {workerStatus?.status || "Unknown"}
              </div>
              <p className="text-xs text-muted-foreground">
                {workerStatus?.current_task || "No active task"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workerStatus?.last_heartbeat
                  ? new Date(workerStatus.last_heartbeat).toLocaleDateString()
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Worker heartbeat
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Link href="/dashboard/websites/new">
            <Button>Add New Website</Button>
          </Link>
          <Link href="/dashboard/websites">
            <Button variant="outline">Manage Websites</Button>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Generation Activity</CardTitle>
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
                        {(log.websites as { name: string })?.name || "Unknown website"}
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
                No generation activity yet. Add a website to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Websites Overview */}
        {websites && websites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Websites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {websites.map((website) => (
                  <Link
                    key={website.id}
                    href={`/dashboard/websites/${website.id}`}
                    className="block"
                  >
                    <Card className="hover:bg-accent transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              website.is_active ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <div>
                            <p className="font-medium">{website.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {website.domain}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between text-sm">
                          <span className="text-muted-foreground">Articles</span>
                          <span className="font-medium">
                            {website.total_articles_generated}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
