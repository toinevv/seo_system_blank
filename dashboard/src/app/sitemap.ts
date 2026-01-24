import { MetadataRoute } from "next";

const BASE_URL = "https://indexyourniche.com";
const PRODUCT_ID = "indexyourniche-com";

interface BlogArticle {
  slug: string;
  published_at: string;
  updated_at?: string;
}

async function getBlogArticles(): Promise<BlogArticle[]> {
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
      .select("slug, published_at, updated_at")
      .eq("product_id", PRODUCT_ID)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Sitemap: Error fetching blog articles:", error);
      return [];
    }

    return (data as BlogArticle[]) || [];
  } catch (error) {
    console.error("Sitemap: Error fetching blog articles:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getBlogArticles();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.updated_at || article.published_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
