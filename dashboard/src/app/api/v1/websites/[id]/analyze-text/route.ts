import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  extractApiKey,
  validatePlatformApiKey,
  apiSuccess,
  apiError,
  ApiErrors,
} from "@/lib/api-auth";

async function authenticateRequest(request: Request) {
  const apiKey = extractApiKey(request);
  if (apiKey) {
    const auth = await validatePlatformApiKey(apiKey);
    if (auth.valid && auth.userId) return { userId: auth.userId };
    return { userId: null, error: auth.error };
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { userId: user.id };
  } catch {}
  return { userId: null, error: "Authentication required" };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await authenticateRequest(request);
    if (!auth.userId) return ApiErrors.UNAUTHORIZED(auth.error);

    const body = await request.json();
    const pages: { label: string; text: string }[] = body.pages ?? [];

    if (!pages.length || pages.every((p) => !p.text?.trim())) {
      return apiError("INVALID_INPUT", "No page content provided", "Paste at least one page's content.", 400);
    }

    const supabase = createAdminClient();

    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("id, domain, user_id")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (websiteError || !website) return ApiErrors.NOT_FOUND("Website");

    const workerUrl = process.env.WORKER_URL || "https://seo-content-generator.ta-voeten.workers.dev";

    const workerResponse = await fetch(`${workerUrl}/analyze-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ website_id: id, pages }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("Worker analyze-text error:", errorText);
      return apiError("ANALYZE_FAILED", "Analysis failed", "The worker returned an error.", 502);
    }

    const result = await workerResponse.json();
    return apiSuccess({ website_id: id, domain: website.domain, ...result });
  } catch (error) {
    console.error("Error in POST /api/v1/websites/:id/analyze-text:", error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
