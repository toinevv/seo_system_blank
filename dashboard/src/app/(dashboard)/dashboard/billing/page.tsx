"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Check,
  AlertTriangle,
  Calendar,
  FileText,
  Globe,
  Sparkles
} from "lucide-react";

// Plan details matching the subscription plans
const PLAN_DETAILS = {
  starter: {
    name: "Starter",
    price: 30,
    geoPrice: 35,
    articles: 3,
    websites: 1,
  },
  pro: {
    name: "Pro",
    price: 75,
    geoPrice: 140,
    articles: 10,
    websites: 3,
  },
  business: {
    name: "Business",
    price: 150,
    geoPrice: 290,
    articles: 30,
    websites: 10,
  },
};

type PlanKey = "starter" | "pro" | "business";

interface SubscriptionData {
  plan: {
    name: string;
    articlesPerMonth: number;
    maxWebsites: number;
    hasGeo: boolean;
  } | null;
  planKey: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  hasSubscription: boolean;
}

interface UsageData {
  articlesThisMonth: number;
  totalWebsites: number;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData>({ articlesThisMonth: 0, totalWebsites: 0 });
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription");
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      // Fetch websites count
      const response = await fetch("/api/websites");
      if (response.ok) {
        const websites = await response.json();
        setUsage(prev => ({
          ...prev,
          totalWebsites: Array.isArray(websites) ? websites.length : 0,
        }));
      }

      // TODO: Fetch articles this month from generation_logs
      // For now, we'll show 0 as placeholder
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal");
      }
    } catch (err) {
      setError("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const getBasePlan = (planKey: string | null): PlanKey | null => {
    if (!planKey) return null;
    // planKey is like "starter_base" or "pro_geo"
    const base = planKey.split("_")[0] as PlanKey;
    return PLAN_DETAILS[base] ? base : null;
  };

  const basePlan = getBasePlan(subscription?.planKey || null);
  const planLimits = basePlan ? PLAN_DETAILS[basePlan] : null;
  const hasGeo = subscription?.planKey?.includes("_geo") || false;

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Billing" description="Manage your subscription and billing" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Billing" description="Manage your subscription and billing" />

      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  {subscription?.hasSubscription && (
                    <Badge variant={subscription.subscription?.status === "active" ? "default" : "secondary"}>
                      {subscription.subscription?.status || "Unknown"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {subscription?.hasSubscription
                    ? "Your subscription details and usage"
                    : "You don't have an active subscription"
                  }
                </CardDescription>
              </div>
              {subscription?.hasSubscription && (
                <Button onClick={openBillingPortal} disabled={portalLoading}>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {subscription?.hasSubscription && subscription.plan && planLimits ? (
              <div className="space-y-6">
                {/* Plan Name & Price */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{subscription.plan.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {hasGeo && (
                          <span className="flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3" />
                            GEO Optimization
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {hasGeo ? planLimits.geoPrice : planLimits.price}/mo
                    </div>
                    {subscription.subscription?.cancelAtPeriodEnd && (
                      <Badge variant="destructive" className="mt-1">Cancels at period end</Badge>
                    )}
                  </div>
                </div>

                {/* Renewal Date */}
                {subscription.subscription?.currentPeriodEnd && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {subscription.subscription.cancelAtPeriodEnd ? "Access until" : "Next billing date"}:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* Usage Stats */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Articles Usage */}
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Articles This Month</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.articlesThisMonth} / {subscription.plan.articlesPerMonth}
                      </span>
                    </div>
                    <Progress
                      value={(usage.articlesThisMonth / subscription.plan.articlesPerMonth) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {subscription.plan.articlesPerMonth - usage.articlesThisMonth} articles remaining
                    </p>
                  </div>

                  {/* Websites Usage */}
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Websites</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.totalWebsites} / {subscription.plan.maxWebsites}
                      </span>
                    </div>
                    <Progress
                      value={(usage.totalWebsites / subscription.plan.maxWebsites) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {subscription.plan.maxWebsites - usage.totalWebsites} websites remaining
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Plan Features</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {subscription.plan.articlesPerMonth} articles per month
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {subscription.plan.maxWebsites} website{subscription.plan.maxWebsites > 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      SEO-optimized content
                    </div>
                    {hasGeo && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        GEO optimization for AI search
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No Subscription State */
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Subscribe to a plan to start generating SEO-optimized content for your websites.
                </p>
                <Button asChild>
                  <a href="/dashboard/websites/new">
                    Choose a Plan
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        {!subscription?.hasSubscription && (
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border ${key === "business" ? "border-primary bg-primary/5" : ""}`}
                  >
                    {key === "business" && (
                      <Badge className="mb-2">Best Value</Badge>
                    )}
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <div className="text-2xl font-bold mt-2">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.articles} articles/month
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.websites} website{plan.websites > 1 ? "s" : ""}
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Billing FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">How do I upgrade or downgrade my plan?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Manage Billing" to access the Stripe billing portal where you can change your plan, update payment methods, or cancel your subscription.
              </p>
            </div>
            <div>
              <h4 className="font-medium">When will I be charged?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You're charged on the same day each month that you subscribed. If you upgrade mid-cycle, you'll be charged a prorated amount.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Yes! You can cancel your subscription at any time. You'll retain access until the end of your current billing period.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
