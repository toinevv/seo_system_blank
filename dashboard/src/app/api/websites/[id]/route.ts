import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/websites/:id
 * Delete a website (internal dashboard API with session auth)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership before deleting
    const { data: website } = await supabase
      .from("websites")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    if (website.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this website" },
        { status: 403 }
      );
    }

    // Delete related data first (cascade might not be set up)
    // Delete in order: generation_logs -> topics -> api_keys -> website
    await supabase.from("generation_logs").delete().eq("website_id", id);
    await supabase.from("topics").delete().eq("website_id", id);
    await supabase.from("api_keys").delete().eq("website_id", id);
    await supabase.from("website_scans").delete().eq("website_id", id);

    // Finally delete the website
    const { error: deleteError } = await supabase
      .from("websites")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting website:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete website" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Error in DELETE /api/websites/:id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
