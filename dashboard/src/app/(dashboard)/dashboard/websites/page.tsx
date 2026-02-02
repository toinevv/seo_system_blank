import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteCard } from "@/components/dashboard/website-card";
import Link from "next/link";
import { Plus, Globe, AlertTriangle } from "lucide-react";
import { canAddWebsite } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's subscription info
  const { data: profile } = user
    ? await adminClient
        .from("profiles")
        .select("subscription_plan, subscription_status")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: websites } = await supabase
    .from("websites")
    .select(`
      *,
      topics(count),
      generation_logs(count)
    `)
    .order("created_at", { ascending: false });

  // Check if user can add more websites
  const activePlan = profile?.subscription_status === "active" ? profile.subscription_plan : null;
  const websiteCheck = canAddWebsite(activePlan, websites?.length || 0);

  return (
    <div className="flex flex-col">
      <Header
        title="Websites"
        description="Manage your connected websites"
      />

      <div className="p-6 space-y-6">
        {/* Add Website Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {websites?.length || 0} / {websiteCheck.limit || "?"} website(s)
            </p>
            {activePlan && (
              <Badge variant="outline" className="capitalize">{activePlan} plan</Badge>
            )}
          </div>
          {websiteCheck.allowed ? (
            <Link href="/dashboard/websites/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Website
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{websiteCheck.reason}</span>
              <Link href="/dashboard/billing">
                <Button variant="outline">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Websites Grid */}
        {websites && websites.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <WebsiteCard key={website.id} website={website} />
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
