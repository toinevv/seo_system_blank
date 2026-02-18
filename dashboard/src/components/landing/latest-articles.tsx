import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { BlogCard, BlogArticle } from "./blog-card";

// Product ID for IndexYourNiche articles
const PRODUCT_ID = "indexyourniche";

async function getLatestArticles(): Promise<BlogArticle[]> {
  // Skip during build time when env vars aren't available
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_articles")
      .select(
        `
        id,
        slug,
        title,
        excerpt,
        meta_description,
        cover_image_url,
        cover_image_alt,
        author,
        category,
        tags,
        read_time,
        published_at,
        tldr,
        geo_optimized
      `
      )
      .eq("product_id", PRODUCT_ID)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching latest articles:", error);
      return [];
    }

    return (data as BlogArticle[]) || [];
  } catch (error) {
    console.error("Error fetching latest articles:", error);
    return [];
  }
}

export async function LatestArticles() {
  noStore(); // Ensure this is always dynamic at runtime

  const articles = await getLatestArticles();

  // Don't render section if no articles
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 border-t border-landing-border">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Newspaper size={16} className="text-landing-accent" />
              <p className="text-xs uppercase tracking-widest text-landing-text-muted">
                From the Blog
              </p>
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-landing-text">
              Latest SEO & GEO Insights
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-1 text-sm text-landing-accent hover:gap-2 transition-all"
          >
            View all articles
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {articles.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 text-center md:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-landing-accent"
          >
            View all articles
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
