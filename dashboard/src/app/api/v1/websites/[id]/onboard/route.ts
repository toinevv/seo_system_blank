import { createAdminClient, createClient } from "@/lib/supabase/server";
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
    if (auth.valid && auth.userId) {
      return { userId: auth.userId };
    }
    return { userId: null, error: auth.error };
  }

  // Fall back to session auth
  try {
    const supabase = await createClient();
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

    // Check if we already have scan data (from preview scan during website creation)
    const hasScanData = !!seoConfig.niche_description || !!seoConfig.main_keywords;

    // If preview scan data exists, skip directly to discovering phase
    const startingStatus = hasScanData ? "discovering" : "scanning";

    await supabase
      .from("websites")
      .update({
        seo_config: {
          ...seoConfig,
          onboarding_status: startingStatus,
          onboarding_started_at: new Date().toISOString(),
          ...(hasScanData && { discovery_started_at: new Date().toISOString() }),
        },
      })
      .eq("id", id);

    // If we have scan data, trigger initial topic discovery right away
    const workerUrl = process.env.WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";
    if (hasScanData && workerUrl) {
      try {
        const discoverUrl = `${workerUrl}/discover-topics?website_id=${id}&count=10`;
        console.log(`[onboard POST] Triggering initial topic discovery: ${discoverUrl}`);
        const response = await fetch(discoverUrl, { method: "POST" });
        if (response.ok) {
          const result = await response.json();
          console.log(`[onboard POST] Initial discovery result:`, result);
        }
      } catch (err) {
        console.error(`[onboard POST] Initial discovery failed:`, err);
      }
    }

    return apiSuccess({
      website_id: id,
      status: startingStatus,
      message: hasScanData
        ? "Scan data found, discovering topics. Poll GET for status."
        : "Onboarding started. Poll GET for status.",
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
    const workerUrl = process.env.WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";

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
      // Check seo_config for preview scan data
      let hasScanData = !!seoConfig.niche_description || !!seoConfig.main_keywords;
      let scanContext = seoConfig;

      // Also check website_scans table (where full /scan saves data)
      if (!hasScanData) {
        const { data: scanData } = await supabase
          .from("website_scans")
          .select("niche_description, main_keywords, content_themes")
          .eq("website_id", id)
          .eq("scan_status", "completed")
          .order("last_scanned_at", { ascending: false })
          .limit(1)
          .single();

        if (scanData?.niche_description || scanData?.main_keywords?.length) {
          hasScanData = true;
          // Copy scan data to seo_config for topic discovery
          scanContext = {
            ...seoConfig,
            niche_description: scanData.niche_description,
            main_keywords: scanData.main_keywords,
            content_themes: scanData.content_themes,
          };
        }
      }

      if (hasScanData) {
        const now = new Date().toISOString();
        // Scan complete! Move to discovering phase
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...scanContext,
              onboarding_status: "discovering",
              discovery_started_at: now,
              last_discovery_triggered_at: now, // For idempotency
            },
          })
          .eq("id", id);

        // Trigger first batch of topic discovery synchronously (serverless requires await)
        if (workerUrl) {
          try {
            const discoverUrl = `${workerUrl}/discover-topics?website_id=${id}&count=10`;
            console.log(`[onboard GET] Triggering initial topic discovery: ${discoverUrl}`);
            const response = await fetch(discoverUrl, { method: "POST" });
            if (response.ok) {
              const result = await response.json();
              console.log(`[onboard GET] Initial topic discovery result:`, result);
            } else {
              console.error(`[onboard GET] Topic discovery HTTP error:`, response.status);
            }
          } catch (err) {
            console.error(`[onboard GET] Topic discovery failed:`, err);
          }
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

      const hasEnoughTopics = (topicsCount || 0) >= 10; // Consider done if at least 10

      // Idempotency: Check if discovery was triggered recently (within 30s)
      const lastDiscoveryTrigger = seoConfig.last_discovery_triggered_at as string;
      const timeSinceLastTrigger = lastDiscoveryTrigger
        ? Date.now() - new Date(lastDiscoveryTrigger).getTime()
        : Infinity;
      const shouldTriggerDiscovery = !hasEnoughTopics && timeSinceLastTrigger > 30000;

      // If not enough topics yet and no recent trigger, discover more
      if (shouldTriggerDiscovery && workerUrl) {
        // Update trigger timestamp BEFORE calling worker (prevents race)
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              last_discovery_triggered_at: new Date().toISOString(),
            },
          })
          .eq("id", id);

        try {
          const discoverUrl = `${workerUrl}/discover-topics?website_id=${id}&count=10`;
          console.log(`[onboard] Discovering more topics (current: ${topicsCount}): ${discoverUrl}`);
          const response = await fetch(discoverUrl, { method: "POST" });
          if (response.ok) {
            const result = await response.json();
            console.log(`[onboard] Additional topic discovery result:`, result);
          }
        } catch (err) {
          console.error(`[onboard] Additional topic discovery failed:`, err);
        }
      } else if (!hasEnoughTopics) {
        console.log(`[onboard] Skipping discovery trigger (recent: ${Math.round(timeSinceLastTrigger/1000)}s ago)`);
      }

      if (hasEnoughTopics) {
        // Topics ready! Move to generating phase
        await supabase
          .from("websites")
          .update({
            seo_config: {
              ...seoConfig,
              onboarding_status: "generating",
              generating_started_at: new Date().toISOString(),
            },
          })
          .eq("id", id);

        // Trigger first article generation synchronously (serverless requires await)
        if (workerUrl) {
          try {
            console.log(`[onboard] Triggering article generation for ${id}`);
            const response = await fetch(`${workerUrl}/generate?website_id=${id}`, { method: "POST" });
            if (response.ok) {
              const result = await response.json();
              console.log(`[onboard] Generation triggered:`, result);
            } else {
              console.error(`[onboard] Generation HTTP error:`, response.status);
            }
          } catch (err) {
            console.error(`[onboard] Generation trigger failed:`, err);
          }
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
              generating_started_at: new Date().toISOString(),
            },
          })
          .eq("id", id);

        // Trigger first article generation synchronously
        if (workerUrl) {
          try {
            console.log(`[onboard] Triggering generation (discovery timeout) for ${id}`);
            const response = await fetch(`${workerUrl}/generate?website_id=${id}`, { method: "POST" });
            if (response.ok) {
              const result = await response.json();
              console.log(`[onboard] Generation triggered:`, result);
            }
          } catch (err) {
            console.error(`[onboard] Generation trigger failed:`, err);
          }
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

