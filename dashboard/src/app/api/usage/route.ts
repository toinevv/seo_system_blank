import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { canAddWebsite, canGenerateArticle, getPlanLimits } from "@/lib/plan-limits";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get user's profile with subscription info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("subscription_plan, subscription_status, has_geo_optimization")
      .eq("id", user.id)
      .single();

    // Count user's websites
    const { count: websiteCount } = await adminClient
      .from("websites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Count articles generated this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: articlesThisMonth } = await adminClient
      .from("generation_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "success")
      .gte("created_at", startOfMonth.toISOString())
      .in(
        "website_id",
        adminClient
          .from("websites")
          .select("id")
          .eq("user_id", user.id)
      );

    // Get plan and check limits
    const plan = profile?.subscription_status === "active" ? profile.subscription_plan : null;
    const limits = getPlanLimits(plan);
    const websiteCheck = canAddWebsite(plan, websiteCount || 0);
    const articleCheck = canGenerateArticle(plan, articlesThisMonth || 0);

    return NextResponse.json({
      plan: plan,
      status: profile?.subscription_status || null,
      hasGeo: profile?.has_geo_optimization || false,
      usage: {
        websites: {
          current: websiteCount || 0,
          limit: limits?.maxWebsites || 0,
          canAdd: websiteCheck.allowed,
          message: websiteCheck.reason,
        },
        articles: {
          current: articlesThisMonth || 0,
          limit: limits?.articlesPerMonth || 0,
          remaining: articleCheck.remaining || 0,
          canGenerate: articleCheck.allowed,
          message: articleCheck.reason,
        },
      },
    });
  } catch (error) {
    console.error("Usage check error:", error);
    return NextResponse.json(
      { error: "Failed to check usage" },
      { status: 500 }
    );
  }
}
