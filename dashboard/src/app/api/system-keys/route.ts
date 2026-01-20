import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

// Initialize Supabase client with service role key for system_keys access
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get all system keys (without decrypting values)
    const { data, error } = await supabase
      .from("system_keys")
      .select("id, key_name, description, created_at, updated_at")
      .order("key_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return key names and whether they are configured
    const keys = data?.map((key) => ({
      id: key.id,
      key_name: key.key_name,
      description: key.description,
      configured: true,
      created_at: key.created_at,
      updated_at: key.updated_at,
    })) || [];

    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch system keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key_name, key_value, description } = body;

    if (!key_name || !key_value) {
      return NextResponse.json(
        { error: "key_name and key_value are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Encrypt the key value (encrypt function uses ENCRYPTION_KEY from env internally)
    const encryptedValue = encrypt(key_value);

    // Check if key exists
    const { data: existing } = await supabase
      .from("system_keys")
      .select("id")
      .eq("key_name", key_name)
      .single();

    if (existing) {
      // Update existing key
      const { error } = await supabase
        .from("system_keys")
        .update({
          key_value_encrypted: encryptedValue,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("key_name", key_name);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "updated" });
    } else {
      // Insert new key
      const { error } = await supabase.from("system_keys").insert({
        key_name,
        key_value_encrypted: encryptedValue,
        description: description || null,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "created" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save system key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyName = searchParams.get("key_name");

    if (!keyName) {
      return NextResponse.json(
        { error: "key_name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("system_keys")
      .delete()
      .eq("key_name", keyName);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete system key" },
      { status: 500 }
    );
  }
}
