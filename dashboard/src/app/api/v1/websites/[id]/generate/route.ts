import { createAdminClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";

/**
 * POST /api/v1/websites/:id/generate
 * Trigger article generation for a website
 *
 * Body options:
 * - topic_id: string (use specific topic)
 * - custom_topic: string (generate with custom title)
 * - (none): use next available topic
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

    const body = await request.json().catch(() => ({}));
    const { topic_id, custom_topic } = body;

    const supabase = createAdminClient();

    // Verify website ownership and get details
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select(
        `
        id, domain, product_id, language, default_author, is_active,
        api_keys (
          target_supabase_url,
          openai_api_key_encrypted,
          anthropic_api_key_encrypted
        )
      `
      )
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) {
      return ApiErrors.NOT_FOUND("Website");
    }

    if (!website.is_active) {
      return apiError(
        "WEBSITE_INACTIVE",
        "Website is not active",
        "Activate the website before generating content",
        400
      );
    }

    // Check if credentials are configured
    const apiKeys = website.api_keys as {
      target_supabase_url?: string;
      openai_api_key_encrypted?: string;
      anthropic_api_key_encrypted?: string;
    } | null;

    if (!apiKeys?.target_supabase_url) {
      return apiError(
        "CREDENTIALS_MISSING",
        "Target Supabase credentials not configured",
        "Configure your target database in the dashboard",
        400
      );
    }

    if (
      !apiKeys?.openai_api_key_encrypted &&
      !apiKeys?.anthropic_api_key_encrypted
    ) {
      return apiError(
        "AI_CREDENTIALS_MISSING",
        "No AI API keys configured",
        "Configure OpenAI or Anthropic API keys in the dashboard",
        400
      );
    }

    // Determine which topic to use
    let topicToUse: { id: string; title: string } | null = null;

    if (topic_id) {
      // Use specified topic
      const { data: topic } = await supabase
        .from("topics")
        .select("id, title, is_used")
        .eq("id", topic_id)
        .eq("website_id", id)
        .single();

      if (!topic) {
        return ApiErrors.NOT_FOUND("Topic");
      }

      if (topic.is_used) {
        return apiError(
          "TOPIC_ALREADY_USED",
          "This topic has already been used",
          "Choose an unused topic or provide a custom_topic",
          400
        );
      }

      topicToUse = { id: topic.id, title: topic.title };
    } else if (custom_topic) {
      // Create a new topic for the custom title
      const { data: newTopic, error: topicError } = await supabase
        .from("topics")
        .insert({
          website_id: id,
          title: custom_topic,
          keywords: [],
          category: "general",
          priority: 5,
          source: "manual",
        })
        .select("id, title")
        .single();

      if (topicError || !newTopic) {
        console.error("Error creating custom topic:", topicError);
        return ApiErrors.INTERNAL_ERROR();
      }

      topicToUse = newTopic;
    } else {
      // Get next available topic
      const { data: nextTopic } = await supabase
        .from("topics")
        .select("id, title")
        .eq("website_id", id)
        .eq("is_used", false)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!nextTopic) {
        return apiError(
          "NO_TOPICS_AVAILABLE",
          "No unused topics available",
          "Add topics or use discover endpoint first",
          400
        );
      }

      topicToUse = nextTopic;
    }

    // Create generation log entry
    const { data: logEntry, error: logError } = await supabase
      .from("generation_logs")
      .insert({
        website_id: id,
        topic_id: topicToUse.id,
        status: "pending",
        article_title: topicToUse.title,
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating generation log:", logError);
      return ApiErrors.INTERNAL_ERROR();
    }

    // Call the worker to generate
    const workerUrl = process.env.WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";

    try {
      // Trigger generation (async - worker will update status)
      const generateResponse = await fetch(`${workerUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          website_id: id,
          topic_id: topicToUse.id,
          log_id: logEntry.id,
        }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Worker generate error:", errorText);

        await supabase
          .from("generation_logs")
          .update({
            status: "failed",
            error_message: "Worker returned an error",
            error_details: { response: errorText },
          })
          .eq("id", logEntry.id);

        return apiError(
          "GENERATION_FAILED",
          "Failed to start generation",
          "The worker returned an error. Check the logs for details.",
          502
        );
      }

      const generateResult = await generateResponse.json();

      return apiSuccess({
        website_id: id,
        log_id: logEntry.id,
        topic: topicToUse,
        status: "generating",
        message:
          "Article generation started. Check status with GET /api/v1/websites/:id/logs/:log_id",
        result: generateResult.data || null,
      });
    } catch (fetchError) {
      console.error("Error calling worker:", fetchError);

      await supabase
        .from("generation_logs")
        .update({
          status: "failed",
          error_message: "Worker unavailable",
        })
        .eq("id", logEntry.id);

      return apiError(
        "WORKER_UNAVAILABLE",
        "Generation service temporarily unavailable",
        "The worker is not responding. Please try again later.",
        503
      );
    }
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/generate:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * GET /api/v1/websites/:id/generate
 * Get generation status and recent logs
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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

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

    // Get recent generation logs
    const { data: logs, error } = await supabase
      .from("generation_logs")
      .select(
        `
        id,
        topic_id,
        status,
        article_title,
        article_slug,
        api_used,
        api_model,
        tokens_used,
        generation_time_seconds,
        seo_score,
        word_count,
        geo_optimized,
        error_message,
        started_at,
        completed_at
      `
      )
      .eq("website_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching logs:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({
      website_id: id,
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id/generate:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
