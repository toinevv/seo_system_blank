import { createAdminClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";

/**
 * GET /api/v1/websites/:id/topics
 * List topics for a website
 *
 * Query params:
 * - status: "unused" | "used" | "all" (default: "all")
 * - limit: number (default: 50)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return ApiErrors.UNAUTHORIZED();
    }

    const auth = await validatePlatformApiKey(apiKey);
    if (!auth.valid) {
      return ApiErrors.INVALID_API_KEY(auth.error);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );

    const supabase = createAdminClient();

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    // Build query
    let query = supabase
      .from("topics")
      .select(
        "id, title, keywords, category, priority, source, is_used, used_at, times_used, last_seo_score, created_at"
      )
      .eq("website_id", id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status === "unused") {
      query = query.eq("is_used", false);
    } else if (status === "used") {
      query = query.eq("is_used", true);
    }

    const { data: topics, error } = await query;

    if (error) {
      console.error("Error fetching topics:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({
      website_id: id,
      topics: topics || [],
      count: topics?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id/topics:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * POST /api/v1/websites/:id/topics
 * Add topics or trigger topic discovery
 *
 * Body options:
 * 1. Add manual topics: { topics: [{ title, keywords?, category?, priority? }] }
 * 2. Trigger discovery: { discover: true, count?: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return ApiErrors.UNAUTHORIZED();
    }

    const auth = await validatePlatformApiKey(apiKey);
    if (!auth.valid) {
      return ApiErrors.INVALID_API_KEY(auth.error);
    }

    const body = await request.json();
    const { topics, discover, count = 5 } = body;

    const supabase = createAdminClient();

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, domain, seo_config, language")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    // Option 1: Add manual topics
    if (topics && Array.isArray(topics)) {
      const topicsToInsert = topics.map(
        (t: {
          title: string;
          keywords?: string[];
          category?: string;
          priority?: number;
        }) => ({
          website_id: id,
          title: t.title,
          keywords: t.keywords || [],
          category: t.category || "general",
          priority: t.priority || 5,
          source: "manual",
        })
      );

      const { data: inserted, error: insertError } = await supabase
        .from("topics")
        .insert(topicsToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting topics:", insertError);
        return ApiErrors.INTERNAL_ERROR();
      }

      return apiSuccess(
        {
          website_id: id,
          added: inserted?.length || 0,
          topics: inserted,
        },
        201
      );
    }

    // Option 2: Trigger topic discovery via worker
    if (discover) {
      const workerUrl = process.env.WORKER_URL;

      if (!workerUrl) {
        return apiError(
          "WORKER_NOT_CONFIGURED",
          "Worker URL not configured",
          "Contact support to configure the worker",
          503
        );
      }

      try {
        const discoverResponse = await fetch(`${workerUrl}/discover-topics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            website_id: id,
            domain: website.domain,
            language: website.language,
            scan_context: website.seo_config,
            count: Math.min(count, 10),
          }),
        });

        if (!discoverResponse.ok) {
          const errorText = await discoverResponse.text();
          console.error("Worker discover error:", errorText);
          return apiError(
            "DISCOVERY_FAILED",
            "Failed to discover topics",
            "The worker returned an error. Please try again.",
            502
          );
        }

        const discoverResult = await discoverResponse.json();

        // Insert discovered topics
        if (
          discoverResult.success &&
          discoverResult.topics &&
          discoverResult.topics.length > 0
        ) {
          const topicsToInsert = discoverResult.topics.map(
            (t: {
              title: string;
              keywords?: string[];
              category?: string;
              priority?: number;
            }) => ({
              website_id: id,
              title: t.title,
              keywords: t.keywords || [],
              category: t.category || "general",
              priority: t.priority || 5,
              source: "ai_suggested",
            })
          );

          const { data: inserted } = await supabase
            .from("topics")
            .insert(topicsToInsert)
            .select();

          return apiSuccess({
            website_id: id,
            discovered: inserted?.length || 0,
            topics: inserted,
          });
        }

        return apiSuccess({
          website_id: id,
          discovered: 0,
          topics: [],
          message: "No topics discovered. Try running a scan first.",
        });
      } catch (fetchError) {
        console.error("Error calling worker:", fetchError);
        return apiError(
          "WORKER_UNAVAILABLE",
          "Discovery service temporarily unavailable",
          "The worker is not responding. Please try again later.",
          503
        );
      }
    }

    return ApiErrors.VALIDATION_ERROR(
      'Provide either "topics" array or "discover: true"'
    );
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/topics:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * DELETE /api/v1/websites/:id/topics?topic_id=xxx
 * Delete a specific topic
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return ApiErrors.UNAUTHORIZED();
    }

    const auth = await validatePlatformApiKey(apiKey);
    if (!auth.valid) {
      return ApiErrors.INVALID_API_KEY(auth.error);
    }

    const url = new URL(request.url);
    const topicId = url.searchParams.get("topic_id");

    if (!topicId) {
      return ApiErrors.VALIDATION_ERROR("topic_id is required");
    }

    const supabase = createAdminClient();

    // Verify website ownership
    const { data: website } = await supabase
      .from("websites")
      .select("id")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (!website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    // Delete topic
    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", topicId)
      .eq("website_id", id);

    if (error) {
      console.error("Error deleting topic:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/websites/:id/topics:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
