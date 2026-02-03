import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";

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
 * GET /api/v1/websites/:id/scan
 * Get the latest scan results for a website
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate (supports both API key and session)
    const auth = await authenticateRequest(request);
    if (!auth.userId) {
      return ApiErrors.UNAUTHORIZED(auth.error);
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
      return ApiErrors.NOT_FOUND("Website");
    }

    // Check if there's a scan stored in seo_config or a separate scans table
    // For now, return the seo_config which may contain scan data
    const scanData = website.seo_config as Record<string, unknown> || {};

    return apiSuccess({
      website_id: id,
      domain: website.domain,
      has_scan: !!scanData.niche_description,
      scan_data: {
        niche_description: scanData.niche_description || null,
        content_themes: scanData.content_themes || [],
        main_keywords: scanData.main_keywords || [],
        search_keywords: scanData.search_keywords || [],
      },
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id/scan:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * POST /api/v1/websites/:id/scan
 * Trigger a new website scan
 *
 * This calls the worker's scan endpoint
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate (supports both API key and session)
    const auth = await authenticateRequest(request);
    if (!auth.userId) {
      return ApiErrors.UNAUTHORIZED(auth.error);
    }

    const supabase = createAdminClient();

    // Verify website ownership and get details
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, domain, user_id")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    // Get the worker URL from environment
    const workerUrl = process.env.WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";

    // Call the worker's scan endpoint
    try {
      const scanResponse = await fetch(`${workerUrl}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          website_id: id,
          domain: website.domain,
        }),
      });

      if (!scanResponse.ok) {
        const errorText = await scanResponse.text();
        console.error("Worker scan error:", errorText);
        return apiError(
          "SCAN_FAILED",
          "Failed to initiate scan",
          "The worker returned an error. Please try again.",
          502
        );
      }

      const scanResult = await scanResponse.json();

      // Store scan results in website's seo_config
      if (scanResult.success && scanResult.data) {
        await supabase
          .from("websites")
          .update({
            seo_config: {
              niche_description: scanResult.data.niche_description,
              content_themes: scanResult.data.content_themes,
              main_keywords: scanResult.data.main_keywords,
              search_keywords: scanResult.data.search_keywords,
              last_scan_at: new Date().toISOString(),
            },
          })
          .eq("id", id);
      }

      return apiSuccess({
        website_id: id,
        domain: website.domain,
        status: "completed",
        scan_data: scanResult.data || null,
      });
    } catch (fetchError) {
      console.error("Error calling worker:", fetchError);

      // If worker is not available, return a helpful message
      return apiError(
        "WORKER_UNAVAILABLE",
        "Scan service temporarily unavailable",
        "The scan worker is not responding. Please try again later.",
        503
      );
    }
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/scan:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
