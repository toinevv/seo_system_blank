import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "./supabase/server";

/**
 * Platform API Key Authentication
 *
 * Keys are formatted as: iyn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - Prefix: "iyn_" (IndexYourNiche)
 * - Key: 32 random bytes, base64url encoded (43 chars)
 *
 * Storage:
 * - key_prefix: "iyn_" + first 8 chars (for identification in UI)
 * - key_hash: SHA-256 hash of full key (for validation)
 */

const KEY_PREFIX = "iyn_";

/**
 * Generate a new platform API key
 * Returns the full key (only shown once) and the data to store
 */
export function generatePlatformApiKey(): {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  // Generate 32 random bytes and encode as base64url
  const randomPart = randomBytes(32)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 40);

  const fullKey = `${KEY_PREFIX}${randomPart}`;
  const keyPrefix = fullKey.slice(0, 12); // "iyn_" + 8 chars
  const keyHash = hashApiKey(fullKey);

  return { fullKey, keyPrefix, keyHash };
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key and return the user info
 */
export async function validatePlatformApiKey(apiKey: string): Promise<{
  valid: boolean;
  userId?: string;
  keyId?: string;
  error?: string;
}> {
  // Basic format validation
  if (!apiKey || !apiKey.startsWith(KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  const keyHash = hashApiKey(apiKey);

  // Use admin client to bypass RLS
  const supabase = createAdminClient();

  const { data: keyRecord, error } = await supabase
    .from("platform_api_keys")
    .select("id, user_id, is_active, expires_at, scopes")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    return { valid: false, error: "Invalid API key" };
  }

  // Check if key is active
  if (!keyRecord.is_active) {
    return { valid: false, error: "API key has been revoked" };
  }

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update last used timestamp (fire and forget)
  const currentCount = (keyRecord as unknown as { use_count?: number }).use_count ?? 0;
  supabase
    .from("platform_api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: currentCount + 1,
    })
    .eq("id", keyRecord.id)
    .then(() => {});

  return {
    valid: true,
    userId: keyRecord.user_id,
    keyId: keyRecord.id,
  };
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: Request): string | null {
  // Check X-API-Key header first
  const apiKeyHeader = request.headers.get("X-API-Key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * API response helpers
 */
export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  hint?: string,
  status = 400
) {
  return Response.json(
    {
      success: false,
      error: { code, message, hint },
    },
    { status }
  );
}

/**
 * Standard API error codes
 */
export const ApiErrors = {
  UNAUTHORIZED: (hint?: string) =>
    apiError(
      "UNAUTHORIZED",
      "Authentication required",
      hint || "Provide your API key via X-API-Key header or Bearer token",
      401
    ),

  INVALID_API_KEY: (message?: string) =>
    apiError(
      "INVALID_API_KEY",
      message || "Invalid API key",
      "Get your API key from https://indexyourniche.com/dashboard/settings",
      401
    ),

  FORBIDDEN: (message?: string) =>
    apiError(
      "FORBIDDEN",
      message || "Access denied",
      "You don't have permission to access this resource",
      403
    ),

  NOT_FOUND: (resource: string) =>
    apiError("NOT_FOUND", `${resource} not found`, undefined, 404),

  VALIDATION_ERROR: (message: string) =>
    apiError("VALIDATION_ERROR", message, undefined, 400),

  INTERNAL_ERROR: () =>
    apiError(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      "Please try again or contact support",
      500
    ),
};
