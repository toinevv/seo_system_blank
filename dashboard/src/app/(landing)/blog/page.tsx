import { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { BlogCard, BlogArticle } from "@/components/landing/blog-card";
import { Search, BookOpen } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog - SEO & GEO Insights",
  description:
    "Learn about SEO, GEO (Generative Engine Optimization), and how to rank higher in Google and AI search engines like ChatGPT, Claude, and Perplexity.",
  openGraph: {
    title: "Blog | IndexYourNiche - SEO & GEO Insights",
    description:
      "Learn about SEO, GEO optimization, and how to rank in AI search engines",
    type: "website",
  },
};

// Product ID for IndexYourNiche articles
const PRODUCT_ID = "indexyourniche";

async function getBlogArticles(): Promise<BlogArticle[]> {
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
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching blog articles:", error);
      return [];
    }

    return (data as BlogArticle[]) || [];
  } catch (error) {
    console.error("Error fetching blog articles:", error);
    return [];
  }
}

export default async function BlogPage() {
  noStore(); // Ensure this is always dynamic at runtime

  const articles = await getBlogArticles();
  const featuredArticle = articles[0];
  const remainingArticles = articles.slice(1);

  // Get unique categories for filtering
  const categories = [
    ...new Set(articles.map((a) => a.category).filter(Boolean)),
  ];

  return (
    <div className="pt-20 pb-16">
      {/* Hero Section */}
      <section className="px-4 py-12 border-b border-landing-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-landing-accent/10 rounded-full mb-4">
            <BookOpen size={14} className="text-landing-accent" />
            <span className="text-xs font-medium text-landing-accent">
              SEO & GEO Insights
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-landing-text mb-4">
            Learn to Rank Everywhere
          </h1>
          <p className="text-base text-landing-text-muted max-w-2xl mx-auto">
            Practical guides on SEO, GEO (Generative Engine Optimization), and
            getting your niche projects indexed by Google and AI search engines.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {articles.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-landing-card border border-landing-border rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-landing-text-muted" />
              </div>
              <h2 className="text-xl font-medium text-landing-text mb-2">
                No articles yet
              </h2>
              <p className="text-sm text-landing-text-muted mb-6">
                We&apos;re working on our first articles. Check back soon!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-landing-accent text-white rounded-md text-sm font-medium hover:bg-landing-accent/90 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <span className="text-xs text-landing-text-muted mr-2">
                    Filter:
                  </span>
                  <button className="px-3 py-1 text-xs font-medium bg-landing-accent text-white rounded-full">
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      className="px-3 py-1 text-xs font-medium text-landing-text-muted bg-landing-card border border-landing-border rounded-full hover:border-landing-accent/50 transition-colors"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {/* Featured Article */}
              {featuredArticle && (
                <div className="mb-10">
                  <h2 className="text-xs uppercase tracking-widest text-landing-text-muted mb-4">
                    Latest Article
                  </h2>
                  <BlogCard article={featuredArticle} featured />
                </div>
              )}

              {/* Article Grid */}
              {remainingArticles.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-landing-text-muted mb-4">
                    More Articles
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {remainingArticles.map((article) => (
                      <BlogCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 border-t border-landing-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold text-landing-text mb-3">
            Ready to rank your niche?
          </h2>
          <p className="text-sm text-landing-text-muted mb-6">
            Start generating SEO & GEO optimized content for your project today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-landing-accent text-white rounded-md text-sm font-medium hover:bg-landing-accent/90 transition-colors"
          >
            Start Free
          </Link>
        </div>
      </section>
    </div>
  );
}
