import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      website_id,
      openai_api_key,
      anthropic_api_key,
      target_supabase_url,
      target_supabase_service_key,
    } = body;

    if (!website_id) {
      return NextResponse.json(
        { error: "website_id is required" },
        { status: 400 }
      );
    }

    // Verify user owns this website
    const { data: website } = await supabase
      .from("websites")
      .select("id")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .single();

    if (!website) {
      return NextResponse.json(
        { error: "Website not found or access denied" },
        { status: 404 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Get existing keys to preserve values not being updated
    const { data: existingKeys } = await adminClient
      .from("api_keys")
      .select("*")
      .eq("website_id", website_id)
      .single();

    // Build update object - only update fields that are provided
    const encryptedData: Record<string, unknown> = {
      website_id,
      updated_at: new Date().toISOString(),
    };

    // Only update OpenAI key if provided (non-empty string)
    if (openai_api_key && openai_api_key.trim()) {
      encryptedData.openai_api_key_encrypted = encrypt(openai_api_key);
    } else if (!existingKeys) {
      // First time setup - allow null
      encryptedData.openai_api_key_encrypted = null;
    }
    // If not provided and exists, keep existing value (don't include in update)

    // Only update Anthropic key if provided
    if (anthropic_api_key && anthropic_api_key.trim()) {
      encryptedData.anthropic_api_key_encrypted = encrypt(anthropic_api_key);
    } else if (!existingKeys) {
      encryptedData.anthropic_api_key_encrypted = null;
    }

    // Only update target URL if provided
    if (target_supabase_url && target_supabase_url.trim()) {
      encryptedData.target_supabase_url = target_supabase_url.trim();
    } else if (!existingKeys) {
      return NextResponse.json(
        { error: "Target Supabase URL is required for initial setup" },
        { status: 400 }
      );
    }

    // Only update target service key if provided
    if (target_supabase_service_key && target_supabase_service_key.trim()) {
      encryptedData.target_supabase_service_key_encrypted = encrypt(target_supabase_service_key);
    } else if (!existingKeys) {
      return NextResponse.json(
        { error: "Target Supabase Service Key is required for initial setup" },
        { status: 400 }
      );
    }

    // Upsert - insert or update
    const { error } = await adminClient
      .from("api_keys")
      .upsert(encryptedData, { onConflict: "website_id" });

    if (error) {
      console.error("Error saving API keys:", error);
      return NextResponse.json(
        { error: "Failed to save API keys" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("website_id");

    if (!websiteId) {
      return NextResponse.json(
        { error: "website_id is required" },
        { status: 400 }
      );
    }

    // Verify user owns this website
    const { data: website } = await supabase
      .from("websites")
      .select("id")
      .eq("id", websiteId)
      .eq("user_id", user.id)
      .single();

    if (!website) {
      return NextResponse.json(
        { error: "Website not found or access denied" },
        { status: 404 }
      );
    }

    // Get API keys
    const adminClient = createAdminClient();
    const { data: apiKeys } = await adminClient
      .from("api_keys")
      .select("*")
      .eq("website_id", websiteId)
      .single();

    if (!apiKeys) {
      return NextResponse.json({ configured: false });
    }

    // Return masked versions for display
    return NextResponse.json({
      configured: true,
      openai_configured: !!apiKeys.openai_api_key_encrypted,
      anthropic_configured: !!apiKeys.anthropic_api_key_encrypted,
      target_supabase_url: apiKeys.target_supabase_url,
      target_db_configured: !!apiKeys.target_supabase_service_key_encrypted,
      openai_validated: apiKeys.openai_validated,
      anthropic_validated: apiKeys.anthropic_validated,
      target_db_validated: apiKeys.target_db_validated,
      last_validated_at: apiKeys.last_validated_at,
    });
  } catch (error) {
    console.error("Get API keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
