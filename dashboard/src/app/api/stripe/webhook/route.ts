import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Helper to extract base plan and geo status from planKey
function extractPlanInfo(planKey: string | null): { plan: string | null; hasGeo: boolean } {
  if (!planKey) return { plan: null, hasGeo: false };
  const parts = planKey.split("_");
  return {
    plan: parts[0], // "starter", "pro", or "business"
    hasGeo: parts[1] === "geo",
  };
}

// Helper to update user's subscription in database
async function updateUserSubscription(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;
  const planKey = priceId ? getPlanFromPriceId(priceId) : null;
  const { plan, hasGeo } = extractPlanInfo(planKey);

  await adminClient
    .from("profiles")
    .update({
      subscription_plan: plan,
      subscription_status: subscription.status,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      has_geo_optimization: hasGeo,
    })
    .eq("id", userId);

  console.log(`Updated subscription for user ${userId}: plan=${plan}, status=${subscription.status}, hasGeo=${hasGeo}`);
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("No stripe-signature header");
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;

        if (userId && customerId) {
          // Ensure customer ID is saved to profile
          await adminClient
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);

          console.log(`Checkout completed for user ${userId}, customer ${customerId}`);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await updateUserSubscription(adminClient, userId, subscription);
        }
        console.log(`Subscription created: ${subscription.id} for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await updateUserSubscription(adminClient, userId, subscription);
        }

        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);

        if (subscription.cancel_at_period_end) {
          console.log(`Subscription ${subscription.id} will cancel at period end`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          // Clear subscription data when deleted
          await adminClient
            .from("profiles")
            .update({
              subscription_plan: null,
              subscription_status: "canceled",
              subscription_period_end: null,
              has_geo_optimization: false,
            })
            .eq("id", userId);
        }

        console.log(`Subscription deleted: ${subscription.id} for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.error(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);
        // Could send email notification here
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
