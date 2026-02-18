import { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import Script from "next/script";
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Lightbulb,
  Quote,
  BarChart3,
  HelpCircle,
} from "lucide-react";

// Product ID for IndexYourNiche articles
const PRODUCT_ID = "indexyourniche";
const SITE_URL = "https://indexyourniche.com";

interface FaqItem {
  question: string;
  answer: string;
}

interface CitedStatistic {
  statistic: string;
  source: string;
  url?: string;
}

interface Citation {
  quote: string;
  author: string;
  role?: string;
  source?: string;
}

interface FullArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  meta_description: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  read_time: number | null;
  published_at: string;
  updated_at: string;
  primary_keyword: string | null;
  secondary_keywords: string[];
  // GEO Fields
  tldr: string | null;
  faq_items: FaqItem[];
  cited_statistics: CitedStatistic[];
  citations: Citation[];
  geo_optimized: boolean;
  faq_schema: object | null;
  schema_markup: object | null;
}

async function getArticle(slug: string): Promise<FullArticle | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_articles")
      .select("*")
      .eq("product_id", PRODUCT_ID)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !data) {
      return null;
    }

    return data as FullArticle;
  } catch {
    return null;
  }
}

async function getRelatedArticles(
  currentSlug: string,
  category: string | null
): Promise<FullArticle[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    let query = supabase
      .from("blog_articles")
      .select("id, slug, title, excerpt, category, read_time, published_at, tldr")
      .eq("product_id", PRODUCT_ID)
      .eq("status", "published")
      .neq("slug", currentSlug)
      .limit(3);

    if (category) {
      query = query.eq("category", category);
    }

    const { data } = await query.order("published_at", { ascending: false });

    return (data as FullArticle[]) || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: article.title,
    description: article.meta_description || article.excerpt || article.tldr,
    keywords: [
      article.primary_keyword,
      ...(article.secondary_keywords || []),
      ...(article.tags || []),
    ].filter((k): k is string => Boolean(k)),
    authors: article.author ? [{ name: article.author }] : undefined,
    openGraph: {
      title: article.title,
      description: article.meta_description || article.excerpt || undefined,
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      authors: article.author ? [article.author] : undefined,
      images: article.cover_image_url
        ? [
            {
              url: article.cover_image_url,
              alt: article.cover_image_alt || article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description || article.excerpt || undefined,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
    alternates: {
      canonical: `${SITE_URL}/blog/${article.slug}`,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  noStore();
  const { slug } = await params;

  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(slug, article.category);

  const publishedDate = new Date(article.published_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  // Generate Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || article.excerpt,
    image: article.cover_image_url,
    author: {
      "@type": "Person",
      name: article.author || "IndexYourNiche Team",
    },
    publisher: {
      "@type": "Organization",
      name: "IndexYourNiche",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${article.slug}`,
    },
    keywords: [
      article.primary_keyword,
      ...(article.secondary_keywords || []),
    ].filter(Boolean),
  };

  // Generate FAQ JSON-LD if FAQ items exist
  const faqJsonLd =
    article.faq_items && article.faq_items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.faq_items.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {/* Article JSON-LD */}
      <Script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* FAQ JSON-LD - Critical for GEO */}
      {faqJsonLd && (
        <Script
          id="faq-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <article className="pt-20 pb-16">
        {/* Header */}
        <header className="px-4 py-8 border-b border-landing-border">
          <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-xs text-landing-text-muted hover:text-landing-accent mb-6 transition-colors"
            >
              <ArrowLeft size={12} />
              Back to Blog
            </Link>

            {/* Category & GEO Badge */}
            <div className="flex items-center gap-2 mb-4">
              {article.category && (
                <span className="text-xs font-medium text-landing-accent uppercase tracking-wide">
                  {article.category}
                </span>
              )}
              {article.geo_optimized && (
                <span className="text-[10px] px-2 py-0.5 bg-landing-accent/10 text-landing-accent rounded-full">
                  GEO Optimized
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-landing-text mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-landing-text-muted">
              {article.author && (
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {article.author}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {publishedDate}
              </span>
              {article.read_time && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {article.read_time} min read
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {article.cover_image_url && (
          <div className="px-4 py-6">
            <div className="max-w-4xl mx-auto">
              <img
                src={article.cover_image_url}
                alt={article.cover_image_alt || article.title}
                className="w-full rounded-lg border border-landing-border"
              />
            </div>
          </div>
        )}

        {/* TL;DR Section - Critical for GEO */}
        {article.tldr && (
          <div className="px-4 py-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-landing-accent/5 border border-landing-accent/20 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-landing-accent" />
                  <h2 className="text-sm font-semibold text-landing-accent">
                    TL;DR
                  </h2>
                </div>
                <p className="text-sm text-landing-text leading-relaxed">
                  {article.tldr}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <div
              className="prose prose-landing max-w-none
                prose-headings:text-landing-text prose-headings:font-semibold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-landing-text-muted prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-landing-accent prose-a:no-underline hover:prose-a:underline
                prose-strong:text-landing-text prose-strong:font-semibold
                prose-ul:text-landing-text-muted prose-ol:text-landing-text-muted
                prose-li:mb-1
                prose-code:text-landing-accent prose-code:bg-landing-card prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-landing-card prose-pre:border prose-pre:border-landing-border
                prose-blockquote:border-l-landing-accent prose-blockquote:text-landing-text-muted prose-blockquote:italic"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </div>

        {/* Cited Statistics Section - Important for GEO */}
        {article.cited_statistics && article.cited_statistics.length > 0 && (
          <div className="px-4 py-8 border-t border-landing-border">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-landing-accent" />
                <h2 className="text-lg font-semibold text-landing-text">
                  Key Statistics
                </h2>
              </div>
              <div className="grid gap-4">
                {article.cited_statistics.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-landing-card border border-landing-border rounded-lg p-4"
                  >
                    <p className="text-base text-landing-text font-medium mb-2">
                      {stat.statistic}
                    </p>
                    <p className="text-xs text-landing-text-muted">
                      Source:{" "}
                      {stat.url ? (
                        <a
                          href={stat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-landing-accent hover:underline"
                        >
                          {stat.source}
                        </a>
                      ) : (
                        stat.source
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expert Citations Section - Important for GEO */}
        {article.citations && article.citations.length > 0 && (
          <div className="px-4 py-8 border-t border-landing-border">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Quote size={18} className="text-landing-accent" />
                <h2 className="text-lg font-semibold text-landing-text">
                  Expert Insights
                </h2>
              </div>
              <div className="grid gap-4">
                {article.citations.map((citation, index) => (
                  <blockquote
                    key={index}
                    className="bg-landing-card border-l-4 border-landing-accent rounded-r-lg p-5"
                  >
                    <p className="text-sm text-landing-text italic mb-3">
                      &ldquo;{citation.quote}&rdquo;
                    </p>
                    <footer className="text-xs text-landing-text-muted">
                      <strong className="text-landing-text not-italic">
                        {citation.author}
                      </strong>
                      {citation.role && `, ${citation.role}`}
                      {citation.source && (
                        <span className="text-landing-text-muted">
                          {" "}
                          — {citation.source}
                        </span>
                      )}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section - Critical for GEO */}
        {article.faq_items && article.faq_items.length > 0 && (
          <div className="px-4 py-8 border-t border-landing-border">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle size={18} className="text-landing-accent" />
                <h2 className="text-lg font-semibold text-landing-text">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-4">
                {article.faq_items.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-landing-card border border-landing-border rounded-lg overflow-hidden"
                  >
                    <h3 className="text-sm font-medium text-landing-text p-4 border-b border-landing-border">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-landing-text-muted p-4">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="px-4 py-6 border-t border-landing-border">
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs bg-landing-card border border-landing-border rounded-full text-landing-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="px-4 py-8 border-t border-landing-border">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-semibold text-landing-text mb-6">
                Related Articles
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="bg-landing-card border border-landing-border rounded-lg p-4 hover:border-landing-accent/50 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-landing-text mb-2 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-xs text-landing-text-muted line-clamp-2">
                      {related.tldr || related.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-4 py-8 border-t border-landing-border">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-semibold text-landing-text mb-3">
              Want content like this for your site?
            </h2>
            <p className="text-sm text-landing-text-muted mb-6">
              IndexYourNiche generates GEO-optimized articles that rank in
              Google and AI search engines.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-landing-accent text-white rounded-md text-sm font-medium hover:bg-landing-accent/90 transition-colors"
            >
              Start Generating Content
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
