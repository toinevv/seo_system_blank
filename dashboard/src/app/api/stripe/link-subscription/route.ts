import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (!session.customer) {
      return NextResponse.json(
        { error: "No customer in session" },
        { status: 400 }
      );
    }

    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer.id;

    // Update the Stripe customer with the Supabase user ID
    await stripe.customers.update(customerId, {
      metadata: {
        supabase_user_id: user.id,
      },
    });

    // Also update the subscription metadata if exists
    if (session.subscription) {
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

      await stripe.subscriptions.update(subscriptionId, {
        metadata: {
          supabase_user_id: user.id,
        },
      });
    }

    // Save the customer ID to the user's profile
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json(
        { error: "Failed to link subscription to profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId,
    });
  } catch (error) {
    console.error("Link subscription error:", error);
    return NextResponse.json(
      { error: "Failed to link subscription" },
      { status: 500 }
    );
  }
}
