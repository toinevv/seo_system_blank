import { createAdminClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  ApiErrors,
} from "@/lib/api-auth";

/**
 * GET /api/v1/websites/:id/partners
 * List partner websites for backlinking
 *
 * Query params:
 * - status: "active" | "inactive" | "all" (default: "all")
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

    // Check if website_partners table exists (backward compatibility)
    const { data: partners, error } = await supabase
      .from("website_partners")
      .select(
        "id, partner_name, partner_domain, target_urls, link_categories, max_links_per_article, link_placement, is_active, priority, total_links_generated, last_linked_at, created_at"
      )
      .eq("website_id", id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Handle table not existing (migration not run yet)
    if (error?.code === "42P01") {
      return apiSuccess({
        website_id: id,
        partners: [],
        count: 0,
        migration_required: true,
        message:
          "Run migration 005_website_partners.sql to enable partner backlinking",
      });
    }

    if (error) {
      console.error("Error fetching partners:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    // Filter by status if specified
    let filteredPartners = partners || [];
    if (status === "active") {
      filteredPartners = filteredPartners.filter((p) => p.is_active);
    } else if (status === "inactive") {
      filteredPartners = filteredPartners.filter((p) => !p.is_active);
    }

    return apiSuccess({
      website_id: id,
      partners: filteredPartners,
      count: filteredPartners.length,
    });
  } catch (error) {
    console.error("Error in GET /api/v1/websites/:id/partners:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * POST /api/v1/websites/:id/partners
 * Add a new partner website
 *
 * Body:
 * {
 *   partner_name: string,
 *   partner_domain: string,
 *   target_urls?: [{url: string, anchors: string[]}],
 *   link_categories?: string[],
 *   max_links_per_article?: number,
 *   link_placement?: "beginning" | "middle" | "end" | "natural",
 *   priority?: number
 * }
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
    const {
      partner_name,
      partner_domain,
      target_urls = [],
      link_categories = [],
      max_links_per_article = 1,
      link_placement = "natural",
      priority = 5,
    } = body;

    // Validate required fields
    if (!partner_name || !partner_domain) {
      return ApiErrors.VALIDATION_ERROR(
        "partner_name and partner_domain are required"
      );
    }

    // Validate partner_domain format (remove protocol if provided)
    const cleanDomain = partner_domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

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

    // Insert partner
    const { data: inserted, error } = await supabase
      .from("website_partners")
      .insert({
        website_id: id,
        partner_name,
        partner_domain: cleanDomain,
        target_urls,
        link_categories,
        max_links_per_article: Math.min(Math.max(max_links_per_article, 1), 3),
        link_placement,
        priority: Math.min(Math.max(priority, 1), 10),
        is_active: true,
      })
      .select()
      .single();

    // Handle table not existing
    if (error?.code === "42P01") {
      return apiSuccess({
        website_id: id,
        partner: null,
        migration_required: true,
        message:
          "Run migration 005_website_partners.sql to enable partner backlinking",
      });
    }

    // Handle duplicate partner domain
    if (error?.code === "23505") {
      return ApiErrors.VALIDATION_ERROR(
        `Partner with domain "${cleanDomain}" already exists for this website`
      );
    }

    if (error) {
      console.error("Error inserting partner:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess(
      {
        website_id: id,
        partner: inserted,
      },
      201
    );
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/partners:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * PATCH /api/v1/websites/:id/partners
 * Update a partner
 *
 * Body:
 * {
 *   partner_id: string,
 *   ... fields to update
 * }
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
    const { partner_id, ...updates } = body;

    if (!partner_id) {
      return ApiErrors.VALIDATION_ERROR("partner_id is required");
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

    // Build update object with only allowed fields
    const allowedFields = [
      "partner_name",
      "target_urls",
      "link_categories",
      "max_links_per_article",
      "link_placement",
      "is_active",
      "priority",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    }

    // Enforce constraints
    if ("max_links_per_article" in updateData) {
      updateData.max_links_per_article = Math.min(
        Math.max(updateData.max_links_per_article as number, 1),
        3
      );
    }
    if ("priority" in updateData) {
      updateData.priority = Math.min(
        Math.max(updateData.priority as number, 1),
        10
      );
    }

    updateData.updated_at = new Date().toISOString();

    // Update partner
    const { data: updated, error } = await supabase
      .from("website_partners")
      .update(updateData)
      .eq("id", partner_id)
      .eq("website_id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating partner:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    if (!updated) {
      return ApiErrors.NOT_FOUND("Partner");
    }

    return apiSuccess({
      website_id: id,
      partner: updated,
    });
  } catch (error) {
    console.error("Error in PATCH /api/v1/websites/:id/partners:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * DELETE /api/v1/websites/:id/partners?partner_id=xxx
 * Delete a partner
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
    const partnerId = url.searchParams.get("partner_id");

    if (!partnerId) {
      return ApiErrors.VALIDATION_ERROR("partner_id is required");
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

    // Delete partner
    const { error } = await supabase
      .from("website_partners")
      .delete()
      .eq("id", partnerId)
      .eq("website_id", id);

    if (error) {
      console.error("Error deleting partner:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/websites/:id/partners:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
