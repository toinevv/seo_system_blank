import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Globe, MoreVertical, Settings, FileText, Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const supabase = await createClient();

  const { data: websites } = await supabase
    .from("websites")
    .select(`
      *,
      topics(count),
      generation_logs(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col">
      <Header
        title="Websites"
        description="Manage your connected websites"
      />

      <div className="p-6 space-y-6">
        {/* Add Website Button */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            {websites?.length || 0} website(s) configured
          </p>
          <Link href="/dashboard/websites/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </Link>
        </div>

        {/* Websites Grid */}
        {websites && websites.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <Card key={website.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{website.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {website.domain}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        website.is_active ? "bg-green-500" : "bg-gray-300"
                      }`}
                      title={website.is_active ? "Active" : "Inactive"}
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {website.total_articles_generated}
                      </p>
                      <p className="text-xs text-muted-foreground">Articles</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {(website.topics as unknown as { count: number }[])?.[0]?.count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Topics</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {website.days_between_posts}d
                      </p>
                      <p className="text-xs text-muted-foreground">Interval</p>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Next generation: </span>
                      {website.next_scheduled_at
                        ? new Date(website.next_scheduled_at).toLocaleDateString()
                        : "Not scheduled"}
                    </p>
                    {website.last_generated_at && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Last: </span>
                        {new Date(website.last_generated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/websites/${website.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/dashboard/websites/${website.id}/topics`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/websites/${website.id}/api-keys`}>
                      <Button variant="ghost" size="sm">
                        <Key className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No websites yet</h3>
                <p className="text-muted-foreground">
                  Add your first website to start generating SEO content.
                </p>
              </div>
              <Link href="/dashboard/websites/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Website
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
