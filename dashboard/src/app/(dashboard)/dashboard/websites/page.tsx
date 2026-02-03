import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteCard } from "@/components/dashboard/website-card";
import Link from "next/link";
import { Plus, Globe } from "lucide-react";
import { canAddWebsite, getPlanLimits } from "@/lib/plan-limits";
import { getActiveSubscription } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's profile (including stripe customer ID for fallback)
  const { data: profile } = user
    ? await adminClient
        .from("profiles")
        .select("subscription_plan, subscription_status, stripe_customer_id")
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

  // Determine user's active plan
  // First try from profile (cached), then fallback to Stripe API
  let activePlan: string | null = null;

  if (profile?.subscription_status === "active" && profile.subscription_plan) {
    // Use cached subscription from profile
    activePlan = profile.subscription_plan;
  } else if (profile?.stripe_customer_id) {
    // Fallback: fetch from Stripe directly
    try {
      const stripeSubscription = await getActiveSubscription(profile.stripe_customer_id);
      if (stripeSubscription?.plan) {
        // Extract base plan name (e.g., "starter" from "Starter + GEO")
        const planName = stripeSubscription.plan.name.toLowerCase().split(" ")[0];
        if (getPlanLimits(planName)) {
          activePlan = planName;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Stripe subscription:", e);
    }
  }

  const websiteCount = websites?.length || 0;
  const websiteCheck = canAddWebsite(activePlan, websiteCount);

  return (
    <div className="flex flex-col">
      <Header
        title="Websites"
        description="Manage your connected websites"
      />

      <div className="p-6 space-y-6">
        {/* Header with count and add button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {websiteCount} / {websiteCheck.limit || (activePlan ? "?" : "∞")} website(s)
            </p>
            {activePlan && (
              <Badge variant="outline" className="capitalize">{activePlan} plan</Badge>
            )}
            {!activePlan && websiteCount > 0 && (
              <Badge variant="secondary">No subscription</Badge>
            )}
          </div>
          {websiteCheck.allowed ? (
            <Link href="/dashboard/websites/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Website
              </Button>
            </Link>
          ) : websiteCheck.noSubscription ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{websiteCheck.reason}</span>
              <Link href="/dashboard/websites/new">
                <Button>
                  Subscribe & Add Website
                </Button>
              </Link>
            </div>
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
                  {activePlan
                    ? "Add your first website to start generating SEO content."
                    : "Subscribe to a plan and add your first website."}
                </p>
              </div>
              <Link href="/dashboard/websites/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {activePlan ? "Add Your First Website" : "Get Started"}
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
