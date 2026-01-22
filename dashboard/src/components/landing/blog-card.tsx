import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  read_time: number | null;
  published_at: string;
  tldr: string | null;
  geo_optimized: boolean;
}

interface BlogCardProps {
  article: BlogArticle;
  featured?: boolean;
}

export function BlogCard({ article, featured = false }: BlogCardProps) {
  const publishedDate = new Date(article.published_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (featured) {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className="group block bg-landing-card border border-landing-border rounded-lg overflow-hidden hover:border-landing-accent/50 transition-all duration-300"
      >
        {/* Featured Image */}
        {article.cover_image_url && (
          <div className="aspect-[2/1] overflow-hidden bg-landing-bg">
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt || article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-6">
          {/* Category & GEO Badge */}
          <div className="flex items-center gap-2 mb-3">
            {article.category && (
              <span className="text-xs font-medium text-landing-accent uppercase tracking-wide">
                {article.category}
              </span>
            )}
            {article.geo_optimized && (
              <span className="text-[10px] px-1.5 py-0.5 bg-landing-accent/10 text-landing-accent rounded">
                GEO
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-landing-text mb-3 group-hover:text-landing-accent transition-colors line-clamp-2">
            {article.title}
          </h2>

          {/* TL;DR or Excerpt */}
          <p className="text-sm text-landing-text-muted mb-4 line-clamp-3">
            {article.tldr || article.excerpt || article.meta_description}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-landing-text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {publishedDate}
              </span>
              {article.read_time && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {article.read_time} min read
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-landing-accent group-hover:gap-2 transition-all">
              Read more <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block bg-landing-card border border-landing-border rounded-lg p-5 hover:border-landing-accent/50 transition-all duration-300"
    >
      {/* Category & GEO Badge */}
      <div className="flex items-center gap-2 mb-2">
        {article.category && (
          <span className="text-[10px] font-medium text-landing-accent uppercase tracking-wide">
            {article.category}
          </span>
        )}
        {article.geo_optimized && (
          <span className="text-[10px] px-1.5 py-0.5 bg-landing-accent/10 text-landing-accent rounded">
            GEO
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-medium text-landing-text mb-2 group-hover:text-landing-accent transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* Excerpt */}
      <p className="text-xs text-landing-text-muted mb-3 line-clamp-2">
        {article.tldr || article.excerpt || article.meta_description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-landing-text-muted">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {publishedDate}
        </span>
        {article.read_time && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {article.read_time} min
          </span>
        )}
      </div>
    </Link>
  );
}
