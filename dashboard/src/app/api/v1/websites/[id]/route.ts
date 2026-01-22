import { createAdminClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  ApiErrors,
} from "@/lib/api-auth";

/**
 * GET /api/v1/websites/:id
 * Get details for a specific website
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

    const supabase = createAdminClient();

    // Get website (verify ownership)
    const { data: website, error } = await supabase
      .from("websites")
      .select(
        `
        *,
        api_keys (
          target_supabase_url,
          openai_validated,
          anthropic_validated,
          target_db_validated
        )
      `
      )
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (error || !website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    // Get topic and article counts
    const [topicsResult, logsResult] = await Promise.all([
      supabase
        .from("topics")
        .select("id, is_used", { count: "exact" })
        .eq("website_id", id),
      supabase
        .from("generation_logs")
        .select("id", { count: "exact" })
        .eq("website_id", id)
        .eq("status", "success"),
    ]);

    const totalTopics = topicsResult.count || 0;
    const unusedTopics =
      topicsResult.data?.filter((t) => !t.is_used).length || 0;
    const successfulArticles = logsResult.count || 0;

    return apiSuccess({
      ...website,
      stats: {
        total_topics: totalTopics,
        unused_topics: unusedTopics,
        successful_articles: successfulArticles,
      },
      credentials_configured: !!website.api_keys,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * PATCH /api/v1/websites/:id
 * Update a website
 */
export async function PATCH(
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
    const allowedFields = [
      "name",
      "language",
      "default_author",
      "days_between_posts",
      "is_active",
      "auto_generate_topics",
      "max_topic_uses",
    ];

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return ApiErrors.VALIDATION_ERROR("No valid fields to update");
    }

    const supabase = createAdminClient();

    // Update website (verify ownership)
    const { data: website, error } = await supabase
      .from("websites")
      .update(updates)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating website:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    if (!website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    return apiSuccess(website);
  } catch (error) {
    console.error("Error in PATCH /api/v1/websites/:id:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * DELETE /api/v1/websites/:id
 * Delete a website
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

    const supabase = createAdminClient();

    // Delete website (verify ownership)
    const { error } = await supabase
      .from("websites")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("Error deleting website:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/websites/:id:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
