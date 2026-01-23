import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
} from "@/lib/api-auth";

type OnboardingStatus =
  | "not_started"
  | "scanning"
  | "discovering"
  | "generating"
  | "complete"
  | "failed";

interface OnboardingState {
  website_id: string;
  status: OnboardingStatus;
  scan_complete?: boolean;
  topics_count?: number;
  articles_generated?: number;
  error?: string;
  message?: string;
}

/**
 * Helper to authenticate request (supports both session and API key)
 */
async function authenticateRequest(request: Request): Promise<{ userId: string | null; error?: string }> {
  // Try API key first
  const apiKey = extractApiKey(request);
  if (apiKey) {
    const auth = await validatePlatformApiKey(apiKey);
    if (auth.valid) {
      return { userId: auth.userId };
    }
    return { userId: null, error: auth.error };
  }

  // Fall back to session auth
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { userId: user.id };
    }
  } catch {
    // Session auth failed
  }

  return { userId: null, error: "Authentication required" };
}

/**
 * POST /api/v1/websites/:id/onboard
 * Start the automated onboarding process (scan → discover 50 topics → generate)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);

    if (!auth.userId) {
      return apiError("UNAUTHORIZED", auth.error || "Authentication required", undefined, 401);
    }

    const supabase = createAdminClient();

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, domain, seo_config")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return apiError("NOT_FOUND", "Website not found", undefined, 404);
    }

    // Check if already onboarded
    const seoConfig = website.seo_config as Record<string, unknown> || {};
    if (seoConfig.onboarding_status === "complete") {
      return apiSuccess({
        website_id: id,
        status: "complete",
        message: "Website already onboarded",
      });
    }

    // Mark onboarding as started
    await supabase
      .from("websites")
      .update({
        seo_config: {
          ...seoConfig,
          onboarding_status: "scanning",
          onboarding_started_at: new Date().toISOString(),
        },
      })
      .eq("id", id);

    // Trigger scan asynchronously (don't await - let GET endpoint poll for completion)
    const workerUrl = process.env.WORKER_URL;
    if (workerUrl) {
      // Fire and forget - scan runs in background
      fetch(`${workerUrl}/scan?website_id=${id}`, {
        method: "POST",
      }).catch(err => console.error("Onboard scan trigger error:", err));
    }

    return apiSuccess({
      website_id: id,
      status: "scanning",
      message: "Onboarding started. Poll GET /api/v1/websites/:id/onboard for status.",
    });
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/onboard:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", undefined, 500);
  }
}

/**
 * GET /api/v1/websites/:id/onboard
 * Get onboarding status and progress to next step if ready
 *
 * This implements a state machine:
 * scanning → discovering → generating → complete
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);

    if (!auth.userId) {
      return apiError("UNAUTHORIZED", auth.error || "Authentication required", undefined, 401);
    }

    const supabase = createAdminClient();
    const workerUrl = process.env.WORKER_URL;

    // Get website with current state
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, domain, seo_config, language")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return apiError("NOT_FOUND", "Website not found", undefined, 404);
    }

    const seoConfig = website.seo_config as Record<string, unknown> || {};
    const currentStatus = (seoConfig.onboarding_status as OnboardingStatus) || "not_started";

    // If not started, return immediately
    if (currentStatus === "not_started") {
      return apiSuccess<OnboardingState>({
        website_id: id,
        status: "not_started",
      });
    }

    // If already complete, return immediately
    if (currentStatus === "complete") {
      const { count: topicsCount } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("website_id", id);

      return apiSuccess<OnboardingState>({
        website_id: id,
        status: "complete",
        topics_count: topicsCount || 0,
      });
    }

    // STATE: SCANNING - Check if scan is complete
    if (currentStatus === "scanning") {
      const hasScanData = !!seoConfig.niche_description || !!seoConfig.main_keywords;

      if (hasScanData) {
        // Scan complete! Move to discovering phase
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "discovering",
            },
          })
          .eq("id", id);

        // Trigger topic discovery (50 topics in batches)
        if (workerUrl) {
          triggerTopicDiscovery(id, website.domain, website.language, seoConfig, workerUrl, supabase);
        }

        return apiSuccess<OnboardingState>({
          website_id: id,
          status: "discovering",
          scan_complete: true,
          message: "Scan complete, discovering topics...",
        });
      }

      // Still scanning
      return apiSuccess<OnboardingState>({
        website_id: id,
        status: "scanning",
        scan_complete: false,
      });
    }

    // STATE: DISCOVERING - Check if we have enough topics
    if (currentStatus === "discovering") {
      const { count: topicsCount } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("website_id", id);

      const targetTopics = 50;
      const hasEnoughTopics = (topicsCount || 0) >= 10; // Consider done if at least 10

      if (hasEnoughTopics) {
        // Topics ready! Move to generating phase
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "generating",
            },
          })
          .eq("id", id);

        // Trigger first article generation
        if (workerUrl) {
          fetch(`${workerUrl}/generate?website_id=${id}`, {
            method: "POST",
          }).catch(err => console.error("Onboard generate trigger error:", err));
        }

        return apiSuccess<OnboardingState>({
          website_id: id,
          status: "generating",
          topics_count: topicsCount || 0,
          message: "Topics ready, generating first article...",
        });
      }

      // Still discovering - check if discovery stalled
      const discoveryStarted = seoConfig.discovery_started_at as string;
      const discoveryAge = discoveryStarted
        ? Date.now() - new Date(discoveryStarted).getTime()
        : 0;

      // If discovery has been running for over 2 minutes with some topics, move on
      if (discoveryAge > 120000 && (topicsCount || 0) >= 5) {
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "generating",
            },
          })
          .eq("id", id);

        // Trigger first article generation
        if (workerUrl) {
          fetch(`${workerUrl}/generate?website_id=${id}`, {
            method: "POST",
          }).catch(err => console.error("Onboard generate trigger error:", err));
        }

        return apiSuccess<OnboardingState>({
          website_id: id,
          status: "generating",
          topics_count: topicsCount || 0,
          message: "Moving to content generation...",
        });
      }

      return apiSuccess<OnboardingState>({
        website_id: id,
        status: "discovering",
        topics_count: topicsCount || 0,
      });
    }

    // STATE: GENERATING - Check if first article is generated
    if (currentStatus === "generating") {
      const { count: articleCount } = await supabase
        .from("generation_logs")
        .select("*", { count: "exact", head: true })
        .eq("website_id", id)
        .eq("status", "success");

      const { count: topicsCount } = await supabase
        .from("topics")
        .select("*", { count: "exact", head: true })
        .eq("website_id", id);

      if ((articleCount || 0) > 0) {
        // Complete!
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "complete",
              onboarding_completed_at: new Date().toISOString(),
            },
          })
          .eq("id", id);

        return apiSuccess<OnboardingState>({
          website_id: id,
          status: "complete",
          topics_count: topicsCount || 0,
          articles_generated: articleCount || 0,
          message: "Onboarding complete!",
        });
      }

      // Check if generation has been running too long (5 minutes) - consider complete anyway
      const generatingStarted = seoConfig.generating_started_at as string;
      const generatingAge = generatingStarted
        ? Date.now() - new Date(generatingStarted).getTime()
        : 0;

      if (generatingAge > 300000) {
        // Mark as complete even without article (generation may have failed)
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "complete",
              onboarding_completed_at: new Date().toISOString(),
            },
          })
          .eq("id", id);

        return apiSuccess<OnboardingState>({
          website_id: id,
          status: "complete",
          topics_count: topicsCount || 0,
          articles_generated: 0,
          message: "Onboarding complete (content generation pending).",
        });
      }

      return apiSuccess<OnboardingState>({
        website_id: id,
        status: "generating",
        topics_count: topicsCount || 0,
      });
    }

    // Fallback
    return apiSuccess<OnboardingState>({
      website_id: id,
      status: currentStatus,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id/onboard:", error);
    return apiError("INTERNAL_ERROR", "Internal server error", undefined, 500);
  }
}

/**
 * Trigger topic discovery in batches to get ~50 topics
 * Runs asynchronously - doesn't block the response
 */
async function triggerTopicDiscovery(
  websiteId: string,
  domain: string,
  language: string,
  seoConfig: Record<string, unknown>,
  workerUrl: string,
  supabase: ReturnType<typeof createAdminClient>
) {
  // Mark discovery as started
  await supabase
    .from("websites")
    .update({
      seo_config: {
        ...seoConfig,
        discovery_started_at: new Date().toISOString(),
      },
    })
    .eq("id", websiteId);

  // Discover topics in batches (fire and forget - will be picked up by polling)
  const batchSize = 10;
  const batches = 5; // 5 batches * 10 = 50 topics

  for (let i = 0; i < batches; i++) {
    try {
      const response = await fetch(`${workerUrl}/discover-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_id: websiteId,
          domain,
          language,
          scan_context: seoConfig,
          count: batchSize,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Insert discovered topics directly
        if (result.success && result.topics?.length > 0) {
          const topicsToInsert = result.topics.map((t: {
            title: string;
            keywords?: string[];
            category?: string;
            priority?: number
          }) => ({
            website_id: websiteId,
            title: t.title,
            keywords: t.keywords || [],
            category: t.category || "general",
            priority: t.priority || 5,
            source: "ai_suggested",
          }));

          await supabase.from("topics").insert(topicsToInsert);
        }
      }
    } catch (err) {
      console.error(`Topic discovery batch ${i + 1} failed:`, err);
    }

    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
