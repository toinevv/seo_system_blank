// Plan limits configuration - keep in sync with Stripe plans and database functions

export const PLAN_LIMITS = {
  starter: {
    maxWebsites: 2,
    articlesPerMonth: 3,
  },
  pro: {
    maxWebsites: 3,
    articlesPerMonth: 10,
  },
  business: {
    maxWebsites: 10,
    articlesPerMonth: 30,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null): { maxWebsites: number; articlesPerMonth: number } | null {
  if (!plan || !(plan in PLAN_LIMITS)) {
    return null;
  }
  return PLAN_LIMITS[plan as PlanName];
}

export function canAddWebsite(
  currentPlan: string | null,
  currentWebsiteCount: number
): { allowed: boolean; reason?: string; limit?: number; noSubscription?: boolean; atLimit?: boolean } {
  const limits = getPlanLimits(currentPlan);

  if (!limits) {
    return {
      allowed: false,
      noSubscription: true,
      reason: "Subscribe to add websites.",
    };
  }

  if (currentWebsiteCount >= limits.maxWebsites) {
    return {
      allowed: false,
      atLimit: true,
      reason: `Your ${currentPlan} plan allows ${limits.maxWebsites} website${limits.maxWebsites > 1 ? "s" : ""}. Upgrade to add more.`,
      limit: limits.maxWebsites,
    };
  }

  return { allowed: true, limit: limits.maxWebsites };
}

export function canGenerateArticle(
  currentPlan: string | null,
  articlesThisMonth: number
): { allowed: boolean; reason?: string; limit?: number; remaining?: number } {
  const limits = getPlanLimits(currentPlan);

  if (!limits) {
    return {
      allowed: false,
      reason: "You need an active subscription to generate articles.",
    };
  }

  if (articlesThisMonth >= limits.articlesPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.articlesPerMonth} articles. Upgrade to generate more.`,
      limit: limits.articlesPerMonth,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    limit: limits.articlesPerMonth,
    remaining: limits.articlesPerMonth - articlesThisMonth,
  };
}
