import Stripe from "stripe";

// Lazy-initialize Stripe (avoids build-time errors when env var is missing)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      // Use fetch for Cloudflare Workers compatibility
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}

// Backward compatible export (deprecated - use getStripe())
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
} as unknown as Stripe;

// Price IDs - Set via environment variables
export const PRICE_IDS = {
  starter: {
    base: process.env.STRIPE_PRICE_STARTER_BASE || "price_starter_base",
    geo: process.env.STRIPE_PRICE_STARTER_GEO || "price_starter_geo",
  },
  pro: {
    base: process.env.STRIPE_PRICE_PRO_BASE || "price_pro_base",
    geo: process.env.STRIPE_PRICE_PRO_GEO || "price_pro_geo",
  },
  business: {
    base: process.env.STRIPE_PRICE_BUSINESS_BASE || "price_business_base",
    geo: process.env.STRIPE_PRICE_BUSINESS_GEO || "price_business_geo",
  },
} as const;

// Plan metadata
export const PLANS = {
  starter_base: {
    name: "Starter",
    articlesPerMonth: 3,
    maxWebsites: 1,
    hasGeo: false,
  },
  starter_geo: {
    name: "Starter + GEO",
    articlesPerMonth: 3,
    maxWebsites: 1,
    hasGeo: true,
  },
  pro_base: {
    name: "Pro",
    articlesPerMonth: 10,
    maxWebsites: 3,
    hasGeo: false,
  },
  pro_geo: {
    name: "Pro + GEO",
    articlesPerMonth: 10,
    maxWebsites: 3,
    hasGeo: true,
  },
  business_base: {
    name: "Business",
    articlesPerMonth: 30,
    maxWebsites: 10,
    hasGeo: false,
  },
  business_geo: {
    name: "Business + GEO",
    articlesPerMonth: 30,
    maxWebsites: 10,
    hasGeo: true,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Get plan details from a Stripe Price ID
 */
export function getPlanFromPriceId(priceId: string): PlanKey | null {
  if (priceId === PRICE_IDS.starter.base) return "starter_base";
  if (priceId === PRICE_IDS.starter.geo) return "starter_geo";
  if (priceId === PRICE_IDS.pro.base) return "pro_base";
  if (priceId === PRICE_IDS.pro.geo) return "pro_geo";
  if (priceId === PRICE_IDS.business.base) return "business_base";
  if (priceId === PRICE_IDS.business.geo) return "business_geo";
  return null;
}

/**
 * Get the correct price ID based on plan and GEO selection
 */
export function getPriceId(plan: "starter" | "pro" | "business", withGeo: boolean): string {
  return withGeo ? PRICE_IDS[plan].geo : PRICE_IDS[plan].base;
}

/**
 * Get subscription details for a Stripe customer
 */
export async function getActiveSubscription(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return null;
  }

  const subscription = subscriptions.data[0];
  const priceId = subscription.items.data[0]?.price.id;
  const planKey = getPlanFromPriceId(priceId || "");
  const plan = planKey ? PLANS[planKey] : null;

  return {
    id: subscription.id,
    status: subscription.status,
    priceId,
    planKey,
    plan,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Get user's current plan (checks Stripe if they have a customer ID)
 * Returns null if no active subscription
 */
export async function getUserPlan(stripeCustomerId: string | null) {
  if (!stripeCustomerId) {
    return null;
  }

  const subscription = await getActiveSubscription(stripeCustomerId);
  if (!subscription || !subscription.plan) {
    return null;
  }

  return subscription.plan;
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
) {
  // Try to find existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      supabase_user_id: userId,
    },
  });

  return customer;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}) {
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
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
  });

  return session;
}

/**
 * Create a customer portal session for managing subscriptions
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}
