import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/stripe";

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      // No customer ID = no subscription
      return NextResponse.json({
        plan: null,
        planKey: null,
        subscription: null,
        hasSubscription: false,
      });
    }

    // Get active subscription from Stripe
    const subscription = await getActiveSubscription(profile.stripe_customer_id);

    if (!subscription) {
      return NextResponse.json({
        plan: null,
        planKey: null,
        subscription: null,
        hasSubscription: false,
      });
    }

    return NextResponse.json({
      plan: subscription.plan,
      planKey: subscription.planKey,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      hasSubscription: true,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
