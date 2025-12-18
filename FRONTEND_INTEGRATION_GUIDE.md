# Frontend Integration Guide - Multi-Product Blog System

Complete guide for integrating the blog system into any Next.js frontend.

---

## 📋 **Overview**

This guide shows you how to add a fully functional blog to any Next.js website that connects to the multi-product blog system in Supabase.

**What you'll get**:
- `/blog` page with article listing
- `/blog/[slug]` pages for individual articles
- Dynamic sitemap.xml
- Robots.txt for SEO
- Full SEO optimization (meta tags, schema markup, OpenGraph)

---

## 🚀 **Quick Start (5 Steps)**

### Step 1: Install Dependencies

```bash
cd your-nextjs-project
npm install @supabase/supabase-js date-fns
```

### Step 2: Add Environment Variables

Create/update `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Get these values from**:
- Supabase Dashboard → Settings → API
- Use the **anon/public** key (not service key)

### Step 3: Create Supabase Client

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type BlogArticle = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  meta_description: string
  tags: string[]
  cover_image_url?: string
  cover_image_alt?: string
  primary_keyword: string
  secondary_keywords: string[]
  schema_markup: any
  internal_links: any[]
  published_at: string
  updated_at?: string
  author: string
  read_time: number
  category: string
  seo_score?: number
  product_id: string
  website_domain: string

  // GEO (Generative Engine Optimization) Fields
  // For AI search visibility (ChatGPT, Google AI, Perplexity)
  tldr?: string                    // TL;DR summary for AI extraction
  faq_items?: Array<{              // FAQ Q&A pairs
    question: string
    answer: string
  }>
  faq_schema?: any                 // Pre-generated FAQPage schema
  cited_statistics?: Array<{       // Statistics with sources
    statistic: string
    source: string
  }>
  citations?: Array<{              // Expert quotes
    quote: string
    source: string
    type?: string
  }>
  geo_optimized?: boolean          // GEO optimization flag
}
```

### Step 4: Create Blog Data Fetching

Create `src/lib/blog.ts`:
```typescript
import { supabase } from './supabase'
import type { BlogArticle } from './supabase'

// 🔧 CHANGE THIS to your product_id
const PRODUCT_ID = 'smarterpallet'

export async function getAllPosts(limit = 50): Promise<BlogArticle[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('product_id', PRODUCT_ID)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching blog posts:', error)
    return []
  }
  return data || []
}

export async function getPostBySlug(slug: string): Promise<BlogArticle | null> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('product_id', PRODUCT_ID)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error(`Error fetching post with slug ${slug}:`, error)
    return null
  }
  return data
}

export async function getRelatedPosts(
  postId: string,
  category: string,
  limit = 3
): Promise<BlogArticle[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('product_id', PRODUCT_ID)
    .eq('category', category)
    .eq('status', 'published')
    .neq('id', postId)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related posts:', error)
    return []
  }
  return data || []
}

export async function getPostsByCategory(
  category: string,
  limit = 10
): Promise<BlogArticle[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('*')
    .eq('product_id', PRODUCT_ID)
    .eq('category', category)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error(`Error fetching posts for category ${category}:`, error)
    return []
  }
  return data || []
}
```

**🔧 Important**: Change `PRODUCT_ID` to match your product (e.g., 'smarterpallet', 'jachtexamen', 'yourproduct')

### Step 5: Create Blog Components

Create directory: `src/components/blog/`

---

## 📦 **Component Files**

### BlogCard.tsx
```typescript
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { BlogArticle } from '@/lib/supabase'

export default function BlogCard({ post }: { post: BlogArticle }) {
  return (
    <article className="card hover:shadow-lg transition-shadow bg-white rounded-lg overflow-hidden">
      <Link href={`/blog/${post.slug}`}>
        <div className="p-6">
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.cover_image_alt || post.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded">
              {post.category.replace('_', ' ')}
            </span>
            <span>•</span>
            <time dateTime={post.published_at}>
              {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: nl })}
            </time>
            <span>•</span>
            <span>{post.read_time} min</span>
          </div>

          <h2 className="text-2xl font-bold text-primary mb-3 hover:text-secondary transition-colors">
            {post.title}
          </h2>

          <p className="text-gray-600 mb-4">
            {post.excerpt || post.meta_description}
          </p>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  )
}
```

**🎨 Customize**: Change `text-primary`, `text-secondary` to match your theme

### BlogList.tsx
```typescript
import BlogCard from './BlogCard'
import type { BlogArticle } from '@/lib/supabase'

export default function BlogList({ posts }: { posts: BlogArticle[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">Geen artikelen gevonden.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

### BlogPost.tsx
```typescript
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { BlogArticle } from '@/lib/supabase'
import TLDRSection from './TLDRSection'
import FAQSection from './FAQSection'

export default function BlogPost({ post }: { post: BlogArticle }) {
  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
            {post.category.replace('_', ' ')}
          </span>
          <span>•</span>
          <time dateTime={post.published_at}>
            {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: nl })}
          </time>
          <span>•</span>
          <span>{post.read_time} minuten lezen</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          {post.title}
        </h1>

        <p className="text-xl text-gray-600">
          {post.excerpt || post.meta_description}
        </p>
      </header>

      {/* TL;DR Section - GEO Optimization for AI Search */}
      <TLDRSection tldr={post.tldr} />

      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.cover_image_alt || post.title}
          className="w-full h-96 object-cover rounded-lg mb-8"
        />
      )}

      <div
        className="prose prose-lg max-w-none prose-headings:text-primary prose-a:text-secondary"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* FAQ Section - GEO Optimization for AI Search */}
      <FAQSection faqItems={post.faq_items} />

      {post.tags && post.tags.length > 0 && (
        <footer className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </footer>
      )}
    </>
  )
}
```

**🤖 GEO Note**: The `TLDRSection` and `FAQSection` components are critical for AI search visibility. AI systems like ChatGPT extract the TL;DR for quick answers, and the FAQ section enables FAQPage schema which can boost visibility by 35-40%.

### RelatedPosts.tsx
```typescript
import Link from 'next/link'
import type { BlogArticle } from '@/lib/supabase'

export default function RelatedPosts({ posts }: { posts: BlogArticle[] }) {
  if (posts.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary mb-6">Gerelateerde Artikelen</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="card hover:shadow-lg transition-shadow p-4 bg-white rounded-lg"
          >
            <h3 className="font-bold text-lg text-primary mb-2 hover:text-secondary transition-colors">
              {post.title}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3">
              {post.excerpt || post.meta_description}
            </p>
            <span className="text-secondary text-sm mt-2 inline-block">
              Lees meer →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### BlogSchema.tsx
```typescript
import type { BlogArticle } from '@/lib/supabase'

export default function BlogSchema({ article }: { article: BlogArticle }) {
  return (
    <>
      {/* Main Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(article.schema_markup),
        }}
      />

      {/* FAQPage Schema for GEO (AI Search Optimization) */}
      {article.faq_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(article.faq_schema),
          }}
        />
      )}
    </>
  )
}
```

### TLDRSection.tsx (GEO Component)
```typescript
// TL;DR section for AI search optimization
// AI systems like ChatGPT extract this for quick answers
export default function TLDRSection({ tldr }: { tldr?: string }) {
  if (!tldr) return null

  return (
    <div className="tldr bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r">
      <div className="flex items-start gap-2">
        <span className="text-blue-600 font-bold">TL;DR:</span>
        <p className="text-gray-700">{tldr}</p>
      </div>
    </div>
  )
}
```

### FAQSection.tsx (GEO Component)
```typescript
import type { BlogArticle } from '@/lib/supabase'

// FAQ Section for AI search optimization
// Enables FAQPage schema for rich results in Google & AI search
export default function FAQSection({ faqItems }: { faqItems?: BlogArticle['faq_items'] }) {
  if (!faqItems || faqItems.length === 0) return null

  return (
    <section className="faq-section mt-12 pt-8 border-t">
      <h2 className="text-2xl font-bold text-primary mb-6">
        Veelgestelde Vragen
      </h2>
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="faq-item bg-gray-50 p-4 rounded-lg"
          >
            <h3 className="font-semibold text-lg text-primary">
              {item.question}
            </h3>
            <p className="text-gray-700 mt-2">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

## 📄 **Page Files**

### Blog Listing Page

Create `src/app/blog/page.tsx`:
```typescript
import { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import BlogList from '@/components/blog/BlogList'

// 🔧 CUSTOMIZE THIS metadata for your brand
export const metadata: Metadata = {
  title: 'Blog - Your Brand Name',
  description: 'Practical tips and insights about your industry.',
  openGraph: {
    title: 'Your Brand Blog',
    description: 'Free tips and insights',
    url: 'https://yourdomain.com/blog',
  },
}

export const revalidate = 3600 // Revalidate every hour

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="text-center mb-12">
          {/* 🔧 CUSTOMIZE headline and description */}
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Your Blog Name
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your blog description here - practical tips and insights.
          </p>
        </header>

        <BlogList posts={posts} />
      </div>
    </main>
  )
}
```

### Individual Blog Post Page

Create `src/app/blog/[slug]/page.tsx`:
```typescript
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getRelatedPosts, getAllPosts } from '@/lib/blog'
import BlogPost from '@/components/blog/BlogPost'
import RelatedPosts from '@/components/blog/RelatedPosts'
import BlogSchema from '@/components/blog/BlogSchema'

type Props = {
  params: { slug: string }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    return { title: 'Post Not Found' }
  }

  // 🔧 CHANGE URL to your domain
  return {
    title: post.title,
    description: post.meta_description,
    keywords: [post.primary_keyword, ...post.secondary_keywords],
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.meta_description,
      url: `https://yourdomain.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.meta_description,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  }
}

export const revalidate = 3600 // Revalidate every hour

export default async function BlogPostPage({ params }: Props) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post.id, post.category)

  return (
    <>
      <BlogSchema article={post} />
      <main className="min-h-screen bg-white">
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
          <BlogPost post={post} />
        </article>

        {relatedPosts.length > 0 && (
          <div className="bg-gray-50 py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
              <RelatedPosts posts={relatedPosts} />
            </div>
          </div>
        )}
      </main>
    </>
  )
}
```

---

## 🔍 **SEO Files**

### Dynamic Sitemap

Create `src/app/sitemap.ts`:
```typescript
import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 🔧 CHANGE to your domain
  const baseUrl = 'https://yourdomain.com'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Add your other static pages here
  ]

  const posts = await getAllPosts()
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages]
}
```

### Robots.txt

Create `src/app/robots.ts`:
```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/private/'],
    },
    // 🔧 CHANGE to your domain
    sitemap: 'https://yourdomain.com/sitemap.xml',
  }
}
```

---

## 🤖 **GEO (Generative Engine Optimization)**

GEO optimizes content for AI search engines like ChatGPT, Google AI Overviews, and Perplexity. Research shows specific content structures increase AI citation rates by 35-40%.

### What is GEO?

Traditional SEO optimizes for Google's search algorithm. GEO optimizes for **AI systems that synthesize answers** from multiple sources. When users ask ChatGPT or use Google AI Overviews, these systems:

1. **Extract key facts** from content (TL;DR sections are ideal)
2. **Look for Q&A patterns** (FAQ sections get cited frequently)
3. **Prefer cited statistics** (adds credibility/trust signals)
4. **Value expert quotes** (authority signals)

### GEO Database Fields

| Field | Type | Purpose |
|-------|------|---------|
| `tldr` | `TEXT` | 50-75 word summary at article top - AI systems extract this for quick answers |
| `faq_items` | `JSONB` | Array of Q&A pairs: `[{question, answer}]` - enables FAQPage schema |
| `faq_schema` | `JSONB` | Pre-generated FAQPage JSON-LD schema markup |
| `cited_statistics` | `JSONB` | Statistics with sources: `[{statistic, source}]` |
| `citations` | `JSONB` | Expert quotes: `[{quote, source, type}]` |
| `geo_optimized` | `BOOLEAN` | Flag indicating article has GEO optimization applied |

### GEO Components

The following components handle GEO rendering:

#### TLDRSection.tsx
```typescript
// Renders the TL;DR summary at the top of articles
// AI systems prioritize extracting content from clearly marked summaries
<TLDRSection tldr={post.tldr} />
```

#### FAQSection.tsx
```typescript
// Renders FAQ Q&A pairs at the bottom of articles
// Combined with FAQPage schema for rich results
<FAQSection faqItems={post.faq_items} />
```

#### BlogSchema.tsx (with FAQPage)
```typescript
// Outputs both Article schema AND FAQPage schema
{article.faq_schema && (
  <script type="application/ld+json">
    {JSON.stringify(article.faq_schema)}
  </script>
)}
```

### FAQPage Schema Structure

The `faq_schema` field contains pre-generated JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the question?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "This is the answer..."
      }
    }
  ]
}
```

### GEO Impact on SEO Score

The backend calculates SEO scores with GEO factors (35 points out of 100):

| Factor | Points |
|--------|--------|
| TL;DR present | +8 |
| FAQ section (3+ items) | +10 |
| Statistics with sources (3+) | +10 |
| Citations/quotes (2+) | +7 |

### Testing GEO Implementation

1. **Check schema markup**: View page source, search for `"@type": "FAQPage"`
2. **Validate with Google**: [Rich Results Test](https://search.google.com/test/rich-results)
3. **Query in SQL**:
   ```sql
   SELECT title, geo_optimized,
          jsonb_array_length(faq_items) as faq_count,
          tldr IS NOT NULL as has_tldr
   FROM blog_articles
   WHERE product_id = 'yourproduct' AND geo_optimized = true;
   ```

---

## 🎨 **Styling Tips**

### Using Tailwind CSS Classes

The components use these Tailwind classes that you can customize:

```typescript
// Primary color (your brand color)
text-primary          // Replace with your color like text-blue-600
bg-primary           // Replace with bg-blue-600
border-primary       // Replace with border-blue-600

// Secondary/accent color
text-secondary       // Replace with text-orange-500
hover:text-secondary // Replace with hover:text-orange-600

// Container widths
max-w-4xl           // Article width
max-w-7xl           // Page width

// Shadows and effects
hover:shadow-lg     // Card hover effect
transition-shadow   // Smooth transitions
```

### Example Customization

If your brand uses purple (#8B5CF6):
```typescript
// Change from:
className="text-primary"

// To:
className="text-purple-600"

// Or use custom colors in tailwind.config.js:
colors: {
  primary: '#8B5CF6',
  secondary: '#F59E0B'
}
```

---

## 🔗 **Add Blog Link to Navigation**

Update your navigation component:

```typescript
// In your Navigation.tsx or Header.tsx
<Link
  href="/blog"
  className="text-primary hover:text-primary-hover font-semibold"
>
  Blog
</Link>
```

---

## ✅ **Verification Checklist**

After setup, verify:

### Core Functionality
- [ ] `/blog` loads without errors
- [ ] Blog cards display correctly
- [ ] `/blog/[slug]` pages load
- [ ] Related posts show up
- [ ] Images load (if you have cover images)
- [ ] Date formatting is correct
- [ ] Links work correctly
- [ ] Mobile responsive

### SEO & Indexing
- [ ] `https://yourdomain.com/sitemap.xml` is accessible
- [ ] `https://yourdomain.com/robots.txt` is accessible
- [ ] Meta tags appear in page source (View Source)
- [ ] Schema markup validates ([Google Rich Results Test](https://search.google.com/test/rich-results))

### GEO (AI Search Optimization)
- [ ] TL;DR section displays at top of article (if `tldr` field present)
- [ ] FAQ section displays at bottom of article (if `faq_items` present)
- [ ] FAQPage schema is in page source (check for `"@type": "FAQPage"`)
- [ ] Schema validates with FAQPage ([Google Rich Results Test](https://search.google.com/test/rich-results))
- [ ] `geo_optimized` flag is `true` on articles with GEO content

---

## 🐛 **Troubleshooting**

### No Articles Showing
```typescript
// Check in browser console or terminal:
console.log('Posts:', posts)

// Verify product_id matches:
// In blog.ts, check PRODUCT_ID = 'yourproduct'
// In database, check articles have correct product_id
```

### Connection Error
```bash
# Verify .env.local has correct values:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Restart dev server after adding env vars:
npm run dev
```

### Styling Issues
```typescript
// Make sure you have @tailwind directives in globals.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

// Install @tailwindcss/typography for prose styles:
npm install @tailwindcss/typography

// Add to tailwind.config.js:
plugins: [require('@tailwindcss/typography')]
```

### Supabase RLS Error
```sql
-- In Supabase SQL Editor, verify policies exist:
SELECT * FROM pg_policies WHERE tablename = 'blog_articles';

-- Should see policy: "Public can read published articles"
-- If not, run database_schema.sql again
```

---

## 🚀 **Deploy to Production**

### Vercel Deployment

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "Add blog integration"
   git push
   ```

2. **Add Environment Variables in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Redeploy**:
   - Vercel auto-deploys on push
   - Or manually: Deploy → Redeploy

### Submit to Google

1. **Submit Sitemap**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add property: `https://yourdomain.com`
   - Sitemaps → Add: `https://yourdomain.com/sitemap.xml`

2. **Request Indexing**:
   - URL Inspection → Enter blog URL
   - Request Indexing

---

## 📊 **Monitoring**

### Check Article Stats

```sql
-- In Supabase SQL Editor:

-- Total articles for your product
SELECT COUNT(*)
FROM blog_articles
WHERE product_id = 'yourproduct' AND status = 'published';

-- Articles by category
SELECT category, COUNT(*)
FROM blog_articles
WHERE product_id = 'yourproduct' AND status = 'published'
GROUP BY category;

-- Recent articles
SELECT title, published_at, seo_score
FROM blog_articles
WHERE product_id = 'yourproduct' AND status = 'published'
ORDER BY published_at DESC
LIMIT 10;
```

---

## 🎯 **Advanced: Filter by Category**

Add category filtering to your blog:

```typescript
// Add to blog.ts:
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('blog_articles')
    .select('category')
    .eq('product_id', PRODUCT_ID)
    .eq('status', 'published')

  if (error) return []

  const unique = [...new Set(data.map(d => d.category))]
  return unique
}

// Use in your blog page:
const categories = await getCategories()
```

---

## 📚 **Resources**

- [Supabase JavaScript Docs](https://supabase.com/docs/reference/javascript)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [date-fns Documentation](https://date-fns.org/docs)
- [Schema.org Markup](https://schema.org/Article)
- [Schema.org FAQPage](https://schema.org/FAQPage) - For GEO optimization
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Validate schema markup
- [GEO Research Paper](https://arxiv.org/abs/2311.09735) - Original Princeton/Georgia Tech research

---

## 🔧 **Quick Customization Checklist**

Before deploying, change:

- [ ] `PRODUCT_ID` in `src/lib/blog.ts` (line 5)
- [ ] Domain URLs in `src/app/sitemap.ts`
- [ ] Domain URL in `src/app/robots.ts`
- [ ] Domain URL in `src/app/blog/[slug]/page.tsx` (generateMetadata)
- [ ] Page titles and descriptions in `src/app/blog/page.tsx`
- [ ] Color classes (`text-primary`, `text-secondary`) to match your brand
- [ ] Environment variables in Vercel

---

**Created**: 2025-01-15
**Updated**: 2025-12-18
**System**: Multi-Product Blog Integration with GEO
**Version**: 2.0.0 (GEO-enabled)

