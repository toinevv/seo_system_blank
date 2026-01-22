import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";

/**
 * GET /api/v1/keys
 * List all platform API keys for the authenticated user
 * (Requires session auth - for dashboard use)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiErrors.UNAUTHORIZED("Please log in to view your API keys");
    }

    const { data: keys, error } = await supabase
      .from("platform_api_keys")
      .select(
        "id, name, key_prefix, description, scopes, is_active, last_used_at, use_count, created_at, expires_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess(keys || []);
  } catch (error) {
    console.error("Error in GET /api/v1/keys:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * POST /api/v1/keys
 * Create a new platform API key
 * (Requires session auth - for dashboard use)
 *
 * Body: { name: string, description?: string, expires_in_days?: number }
 * Returns the full API key (only shown once!)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiErrors.UNAUTHORIZED("Please log in to create an API key");
    }

    const body = await request.json();
    const { name, description, expires_in_days } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError(
        "VALIDATION_ERROR",
        "Name is required",
        'Provide a name like "My CLI Key" or "Production"'
      );
    }

    // Generate the key
    const { fullKey, keyPrefix, keyHash } = generatePlatformApiKey();

    // Calculate expiration if provided
    let expiresAt: string | null = null;
    if (expires_in_days && typeof expires_in_days === "number") {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expires_in_days);
      expiresAt = expDate.toISOString();
    }

    // Store the key
    const { data: newKey, error } = await supabase
      .from("platform_api_keys")
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        description: description?.trim() || null,
        expires_at: expiresAt,
      })
      .select("id, name, key_prefix, description, created_at, expires_at")
      .single();

    if (error) {
      console.error("Error creating API key:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    // Return the full key (only time it's shown!)
    return apiSuccess(
      {
        ...newKey,
        api_key: fullKey,
        warning:
          "Save this API key now. You won't be able to see it again!",
      },
      201
    );
  } catch (error) {
    console.error("Error in POST /api/v1/keys:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}

/**
 * DELETE /api/v1/keys?id=xxx
 * Revoke (delete) a platform API key
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ApiErrors.UNAUTHORIZED("Please log in to delete an API key");
    }

    const url = new URL(request.url);
    const keyId = url.searchParams.get("id");

    if (!keyId) {
      return apiError("VALIDATION_ERROR", "Key ID is required");
    }

    // Delete the key (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from("platform_api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting API key:", error);
      return ApiErrors.INTERNAL_ERROR();
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/keys:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
