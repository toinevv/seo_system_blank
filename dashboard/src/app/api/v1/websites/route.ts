import { createAdminClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";
import { encrypt } from "@/lib/encryption";

/**
 * GET /api/v1/websites
 * List all websites for the authenticated user
 */
export async function GET(request: Request) {
  try {
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

    const { data: websites, error } = await supabase
      .from("websites")
      .select(
        `
        id,
        name,
        domain,
        product_id,
        language,
        default_author,
        is_active,
        days_between_posts,
        last_generated_at,
        next_scheduled_at,
        total_articles_generated,
        created_at
      `
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching websites:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess(websites || []);
  } catch (error) {
    console.error("Error in GET /api/v1/websites:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * POST /api/v1/websites
 * Create a new website
 *
 * Body: {
 *   name: string,
 *   domain: string,
 *   language?: string,
 *   default_author?: string,
 *   days_between_posts?: number,
 *   target_supabase_url?: string,
 *   target_supabase_service_key?: string,
 *   openai_api_key?: string,
 *   anthropic_api_key?: string
 * }
 */
export async function POST(request: Request) {
  try {
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
    const {
      name,
      domain,
      language = "en-US",
      default_author = "Team",
      days_between_posts = 3,
      target_supabase_url,
      target_supabase_service_key,
      openai_api_key,
      anthropic_api_key,
    } = body;

    // Validation
    if (!name || typeof name !== "string") {
      return ApiErrors.VALIDATION_ERROR("Name is required");
    }

    if (!domain || typeof domain !== "string") {
      return ApiErrors.VALIDATION_ERROR("Domain is required");
    }

    // Clean domain (remove protocol, trailing slash)
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

    // Generate product_id from domain
    const productId = cleanDomain
      .replace(/\./g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const supabase = createAdminClient();

    // Check if domain already exists
    const { data: existing } = await supabase
      .from("websites")
      .select("id")
      .eq("domain", cleanDomain)
      .single();

    if (existing) {
      return apiError(
        "DOMAIN_EXISTS",
        "A website with this domain already exists",
        "Use a different domain or contact support",
        409
      );
    }

    // Create the website
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .insert({
        user_id: auth.userId,
        name: name.trim(),
        domain: cleanDomain,
        product_id: productId,
        language,
        default_author,
        days_between_posts,
        is_active: true,
      })
      .select()
      .single();

    if (websiteError) {
      console.error("Error creating website:", websiteError);
      if (websiteError.code === "23505") {
        return apiError(
          "DOMAIN_EXISTS",
          "A website with this domain or product ID already exists",
          undefined,
          409
        );
      }
      return ApiErrors.INTERNAL_ERROR();
    }

    // If target Supabase credentials provided, create api_keys record
    if (target_supabase_url && target_supabase_service_key) {
      const { error: keysError } = await supabase.from("api_keys").insert({
        website_id: website.id,
        target_supabase_url,
        target_supabase_service_key_encrypted: encrypt(
          target_supabase_service_key
        ),
        openai_api_key_encrypted: openai_api_key
          ? encrypt(openai_api_key)
          : null,
        anthropic_api_key_encrypted: anthropic_api_key
          ? encrypt(anthropic_api_key)
          : null,
      });

      if (keysError) {
        console.error("Error creating api_keys:", keysError);
        // Don't fail the request, website was created
      }
    }

    return apiSuccess(
      {
        id: website.id,
        name: website.name,
        domain: website.domain,
        product_id: website.product_id,
        language: website.language,
        default_author: website.default_author,
        days_between_posts: website.days_between_posts,
        is_active: website.is_active,
        created_at: website.created_at,
        credentials_configured: !!(
          target_supabase_url && target_supabase_service_key
        ),
      },
      201
    );
  } catch (error) {
    console.error("Error in POST /api/v1/websites:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
