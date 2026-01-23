import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  stripe,
  getPriceId,
  getOrCreateCustomer,
} from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, withGeo } = body as {
      plan: "pro" | "business";
      withGeo: boolean;
    };

    if (!plan || !["pro", "business"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'pro' or 'business'" },
        { status: 400 }
      );
    }

    // Get user profile
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await getOrCreateCustomer(
        user.id,
        profile.email || user.email!,
        profile.full_name || undefined
      );
      customerId = customer.id;

      // Save customer ID to profile
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Check if customer already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (existingSubscriptions.data.length > 0) {
      // Redirect to portal instead for plan changes
      return NextResponse.json(
        {
          error: "You already have an active subscription. Use the billing portal to manage it.",
          redirectToPortal: true
        },
        { status: 400 }
      );
    }

    // Get the correct price ID
    const priceId = getPriceId(plan, withGeo ?? true);

    // Create checkout session
    const origin = request.headers.get("origin") || "https://indexyourniche.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card", "ideal", "bancontact"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
