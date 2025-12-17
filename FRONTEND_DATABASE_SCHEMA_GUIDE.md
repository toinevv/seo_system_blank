# Frontend Database Schema Guide for Blog Articles

## Overview
This guide helps frontend engineers understand the `blog_articles` table structure and which fields to use for optimal SEO and display capabilities.

---

## Database Table: `blog_articles`

### Complete Schema

```sql
CREATE TABLE IF NOT EXISTS public.blog_articles (
    -- Primary Identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,

    -- Multi-Product Support
    product_id TEXT NOT NULL DEFAULT 'smarterpallet',
    website_domain TEXT NOT NULL DEFAULT 'smarterpallet.com',

    -- Content Fields
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,

    -- SEO Fields
    meta_description TEXT,
    primary_keyword TEXT,
    secondary_keywords TEXT[],
    tags TEXT[],
    seo_score INTEGER DEFAULT 0,
    schema_markup JSONB,
    internal_links JSONB,

    -- Media
    cover_image_url TEXT,
    cover_image_alt TEXT,

    -- Metadata
    author TEXT DEFAULT 'SmarterPallet Expert',
    category TEXT,
    read_time INTEGER,
    word_count INTEGER,
    language TEXT DEFAULT 'nl-NL',

    -- Status & Timestamps
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Analytics (optional, for future use)
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Constraints
    CONSTRAINT blog_articles_slug_product_unique UNIQUE(slug, product_id),
    CONSTRAINT blog_articles_status_check CHECK (status IN ('draft', 'published', 'archived'))
);
```

---

## 🎯 Essential Fields for Frontend

### For Blog List Page (`/blog`)

```typescript
// Minimal query for blog listing
const { data } = await supabase
  .from('blog_articles')
  .select(`
    id,
    slug,
    title,
    excerpt,
    cover_image_url,
    cover_image_alt,
    category,
    tags,
    published_at,
    read_time,
    author
  `)
  .eq('product_id', 'smarterpallet')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(50)
```

**Why these fields?**
- `id` - Unique identifier for React keys
- `slug` - URL routing to `/blog/[slug]`
- `title` - Main heading in card
- `excerpt` - Preview text (150-160 chars)
- `cover_image_url` + `cover_image_alt` - Card thumbnail (SEO: alt text)
- `category` - Filter/badge display
- `tags` - Related topics, internal linking
- `published_at` - Sort by date, display "Published on"
- `read_time` - User engagement ("5 min read")
- `author` - Attribution

---

### For Individual Blog Post (`/blog/[slug]`)

```typescript
// Full query for single post
const { data } = await supabase
  .from('blog_articles')
  .select('*')  // Get all fields
  .eq('product_id', 'smarterpallet')
  .eq('slug', slug)
  .eq('status', 'published')
  .single()
```

**Critical fields for SEO:**

1. **`schema_markup`** (JSONB) - **MUST USE**
   ```typescript
   // Render as JSON-LD in <head>
   <script type="application/ld+json">
     {JSON.stringify(article.schema_markup)}
   </script>
   ```
   Contains: Article, HowTo, Organization schema for rich snippets

2. **`meta_description`** (TEXT) - **MUST USE**
   ```typescript
   // In Next.js metadata
   export async function generateMetadata({ params }) {
     return {
       description: article.meta_description,
       // ... other meta tags
     }
   }
   ```
   150-160 chars, optimized for search results

3. **`primary_keyword`** + **`secondary_keywords`** - **MUST USE**
   ```typescript
   // In metadata keywords
   metadata: {
     keywords: [article.primary_keyword, ...article.secondary_keywords]
   }
   ```
   SEO keyword targeting

4. **`internal_links`** (JSONB) - **RECOMMENDED**
   ```typescript
   // Render related links at bottom of post
   {article.internal_links?.map(link => (
     <Link href={link.url}>{link.anchor}</Link>
   ))}
   ```
   Boosts SEO through internal linking

---

## 📊 Field Reference Guide

### Content Display Fields

| Field | Type | Usage | SEO Impact | Required |
|-------|------|-------|------------|----------|
| `title` | TEXT | H1 heading | ⭐⭐⭐⭐⭐ High | ✅ Yes |
| `content` | TEXT | HTML article body | ⭐⭐⭐⭐⭐ High | ✅ Yes |
| `excerpt` | TEXT | Preview/summary | ⭐⭐⭐ Medium | ⚠️ Recommended |
| `cover_image_url` | TEXT | Featured image | ⭐⭐⭐ Medium | ❌ Optional |
| `cover_image_alt` | TEXT | Image alt text | ⭐⭐⭐⭐ High | ⚠️ If image used |

### SEO-Critical Fields

| Field | Type | Usage | SEO Impact | Required |
|-------|------|-------|------------|----------|
| `meta_description` | TEXT | Meta description tag | ⭐⭐⭐⭐⭐ Critical | ✅ Yes |
| `primary_keyword` | TEXT | Main SEO keyword | ⭐⭐⭐⭐⭐ Critical | ✅ Yes |
| `secondary_keywords` | TEXT[] | Related keywords | ⭐⭐⭐⭐ High | ✅ Yes |
| `tags` | TEXT[] | Topic tags | ⭐⭐⭐ Medium | ⚠️ Recommended |
| `schema_markup` | JSONB | JSON-LD structured data | ⭐⭐⭐⭐⭐ Critical | ✅ Yes |
| `internal_links` | JSONB | Internal link suggestions | ⭐⭐⭐⭐ High | ⚠️ Recommended |
| `seo_score` | INTEGER | Quality score (0-100) | ⭐⭐ Low | ❌ Optional |

### Metadata Fields

| Field | Type | Usage | SEO Impact | Required |
|-------|------|-------|------------|----------|
| `slug` | TEXT | URL-friendly identifier | ⭐⭐⭐⭐⭐ Critical | ✅ Yes |
| `author` | TEXT | Author attribution | ⭐⭐⭐ Medium | ⚠️ Recommended |
| `category` | TEXT | Content categorization | ⭐⭐⭐⭐ High | ✅ Yes |
| `read_time` | INTEGER | Reading time (minutes) | ⭐⭐ Low | ⚠️ Recommended |
| `word_count` | INTEGER | Article length | ⭐⭐ Low | ❌ Optional |
| `language` | TEXT | Content language | ⭐⭐⭐ Medium | ✅ Yes |
| `published_at` | TIMESTAMP | Publication date | ⭐⭐⭐⭐ High | ✅ Yes |
| `updated_at` | TIMESTAMP | Last modified date | ⭐⭐⭐ Medium | ⚠️ Recommended |

### Multi-Product Fields

| Field | Type | Usage | SEO Impact | Required |
|-------|------|-------|------------|----------|
| `product_id` | TEXT | Product identifier | ⭐⭐⭐⭐⭐ Critical | ✅ Yes |
| `website_domain` | TEXT | Domain filter | ⭐⭐⭐ Medium | ✅ Yes |

---

## 🚀 Optimal SEO Implementation

### 1. Page Metadata (Next.js example)

```typescript
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  return {
    // Essential SEO
    title: post.title,
    description: post.meta_description,
    keywords: [post.primary_keyword, ...post.secondary_keywords],
    authors: [{ name: post.author }],

    // Open Graph (Social Sharing)
    openGraph: {
      title: post.title,
      description: post.meta_description,
      url: `https://smarterpallet.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author],
      tags: post.tags,
      images: post.cover_image_url ? [{
        url: post.cover_image_url,
        alt: post.cover_image_alt
      }] : [],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.meta_description,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },

    // Additional SEO
    alternates: {
      canonical: `https://smarterpallet.com/blog/${post.slug}`,
    },
  }
}
```

### 2. Schema Markup (JSON-LD)

```typescript
// components/BlogSchema.tsx
export default function BlogSchema({ article }: { article: BlogArticle }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(article.schema_markup)
      }}
    />
  )
}

// Usage in page
<BlogSchema article={post} />
```

**What's in schema_markup?**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article title",
  "description": "Meta description",
  "author": {
    "@type": "Organization",
    "name": "SmarterPallet"
  },
  "publisher": {
    "@type": "Organization",
    "name": "NewSystem.AI B.V.",
    "url": "https://newsystem.ai"
  },
  "datePublished": "2025-12-08T09:00:00Z",
  "dateModified": "2025-12-08T09:00:00Z",
  "mainEntityOfPage": "https://smarterpallet.com/blog/slug",
  "audience": {
    "@type": "Audience",
    "audienceType": "Warehouse Managers, Logistics Professionals"
  },
  "inLanguage": "nl-NL"
}
```

### 3. Internal Linking

```typescript
// Display internal links from internal_links JSONB field
{article.internal_links && article.internal_links.length > 0 && (
  <div className="related-links mt-8 p-6 bg-gray-50 rounded-lg">
    <h3 className="font-bold text-lg mb-4">Gerelateerde artikelen</h3>
    <ul className="space-y-2">
      {article.internal_links.slice(0, 5).map((link, index) => (
        <li key={index}>
          <Link
            href={link.url}
            className="text-primary hover:text-secondary"
          >
            {link.anchor || link.title}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)}
```

**Structure of `internal_links`:**
```json
[
  {
    "anchor": "bereken uw verborgen kosten",
    "url": "/#calculator",
    "title": "Pallet Kosten Calculator",
    "relevance": 9
  },
  {
    "anchor": "plan een gratis intake",
    "url": "/#contact",
    "title": "Gratis Intake Gesprek",
    "relevance": 8
  }
]
```

---

## 📱 Content Rendering

### HTML Content Display

The `content` field contains HTML. Render with proper styling:

```typescript
// Use Tailwind Typography for automatic styling
<div
  className="prose prose-lg max-w-none
    prose-headings:text-primary
    prose-a:text-secondary
    prose-strong:text-primary"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>
```

**Content structure:**
- `<h2>` - Section headings
- `<h3>` - Subsection headings
- `<p>` - Paragraphs
- `<ul>` + `<li>` - Bullet lists
- `<ol>` + `<li>` - Numbered lists
- `<strong>` - Bold text
- `<em>` - Italic text

### Tags Display

```typescript
// Render tags as badges
{post.tags && post.tags.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-4">
    {post.tags.map((tag) => (
      <span
        key={tag}
        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
      >
        #{tag}
      </span>
    ))}
  </div>
)}
```

---

## 🔍 SEO Best Practices

### ✅ DO Use These Fields

1. **`meta_description`** - Always render in meta tags
2. **`schema_markup`** - Always render as JSON-LD
3. **`primary_keyword` + `secondary_keywords`** - Always in meta keywords
4. **`internal_links`** - Always display (boosts SEO + UX)
5. **`published_at` + `updated_at`** - Show dates, good for freshness signal
6. **`cover_image_alt`** - Critical for image SEO if image is used
7. **`language`** - Set HTML lang attribute (`<html lang={post.language}>`)
8. **`canonical URL`** - Prevent duplicate content

### ❌ DON'T Do These

1. **Don't ignore `schema_markup`** - Google uses this for rich snippets
2. **Don't skip alt text** - Images without alt hurt SEO
3. **Don't hide `internal_links`** - They improve site structure
4. **Don't render without `product_id` filter** - Could show wrong content
5. **Don't use `content` without sanitization** - Always use `dangerouslySetInnerHTML` carefully

---

## 🎨 UI/UX Recommendations

### Blog Card (List View)

```typescript
<article className="card hover:shadow-lg transition-shadow">
  {/* Cover Image */}
  {post.cover_image_url && (
    <img
      src={post.cover_image_url}
      alt={post.cover_image_alt || post.title}
      className="w-full h-48 object-cover"
    />
  )}

  {/* Metadata Bar */}
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <span className="badge">{post.category}</span>
    <span>•</span>
    <time dateTime={post.published_at}>
      {formatDate(post.published_at)}
    </time>
    <span>•</span>
    <span>{post.read_time} min</span>
  </div>

  {/* Title */}
  <h2 className="text-2xl font-bold">{post.title}</h2>

  {/* Excerpt */}
  <p className="text-gray-600">{post.excerpt}</p>

  {/* Tags */}
  <div className="flex gap-2">
    {post.tags?.slice(0, 3).map(tag => (
      <span key={tag} className="tag">#{tag}</span>
    ))}
  </div>
</article>
```

### Blog Post (Single View)

```typescript
<article>
  {/* Schema Markup - SEO Critical */}
  <BlogSchema article={post} />

  {/* Header */}
  <header>
    <div className="metadata">
      <span>{post.category}</span>
      <time>{formatDate(post.published_at)}</time>
      <span>{post.read_time} min lezen</span>
    </div>
    <h1>{post.title}</h1>
    <p className="lead">{post.excerpt || post.meta_description}</p>
  </header>

  {/* Cover Image */}
  {post.cover_image_url && (
    <img
      src={post.cover_image_url}
      alt={post.cover_image_alt}
      className="w-full h-96 object-cover"
    />
  )}

  {/* Content - Main Article */}
  <div
    className="prose prose-lg"
    dangerouslySetInnerHTML={{ __html: post.content }}
  />

  {/* Internal Links - SEO Boost */}
  {post.internal_links?.length > 0 && (
    <InternalLinksSection links={post.internal_links} />
  )}

  {/* Tags */}
  <footer>
    {post.tags?.map(tag => <Badge key={tag}>#{tag}</Badge>)}
  </footer>
</article>
```

---

## 📊 Analytics Fields (Future Use)

These fields are prepared for future analytics integration:

```typescript
// Optional fields for tracking
view_count: INTEGER    // Track page views
share_count: INTEGER   // Track social shares
```

Currently not used by the backend, but available for frontend analytics tools.

---

## 🔧 TypeScript Type Definition

```typescript
export type BlogArticle = {
  // Primary
  id: string
  slug: string

  // Multi-product
  product_id: string
  website_domain: string

  // Content
  title: string
  content: string
  excerpt: string | null

  // SEO - CRITICAL
  meta_description: string
  primary_keyword: string
  secondary_keywords: string[]
  tags: string[]
  seo_score: number
  schema_markup: Record<string, any>  // JSON-LD schema
  internal_links: Array<{
    anchor: string
    url: string
    title?: string
    relevance?: number
  }>

  // Media
  cover_image_url: string | null
  cover_image_alt: string | null

  // Metadata
  author: string
  category: string
  read_time: number
  word_count: number
  language: string

  // Status
  status: 'draft' | 'published' | 'archived'
  published_at: string
  updated_at: string
  created_at: string

  // Analytics (optional)
  view_count?: number
  share_count?: number
}
```

---

## 🎯 Quick Checklist for Developers

### Blog List Page ✅
- [ ] Filter by `product_id = 'smarterpallet'`
- [ ] Filter by `status = 'published'`
- [ ] Display `title`, `excerpt`, `category`, `tags`
- [ ] Show `published_at` as formatted date
- [ ] Show `read_time` as "X min read"
- [ ] Link to `/blog/[slug]`

### Blog Post Page ✅
- [ ] Fetch by `slug` + `product_id` + `status`
- [ ] Render `meta_description` in meta tags
- [ ] Render `schema_markup` as JSON-LD script
- [ ] Use `primary_keyword` + `secondary_keywords` in meta
- [ ] Display `content` as HTML with typography styles
- [ ] Show `internal_links` section
- [ ] Include `cover_image_alt` if using image
- [ ] Set `lang={language}` on HTML tag
- [ ] Show `tags` as badges
- [ ] Display `published_at` and `updated_at`

### SEO Critical ⚠️
- [ ] Never skip `schema_markup` rendering
- [ ] Never skip `meta_description` in meta tags
- [ ] Never skip `alt` text on images
- [ ] Always filter by `product_id`
- [ ] Always use canonical URLs

---

## 📚 Related Documentation

- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) - Complete integration steps
- [SEO_SYSTEM_SETUP.md](SEO_SYSTEM_SETUP.md) - System implementation details
- [RAILWAY_DEPLOYMENT_CHECKLIST.md](RAILWAY_DEPLOYMENT_CHECKLIST.md) - Backend deployment

---

**Last Updated**: 2025-12-08
**System Version**: 1.0.0
**Language**: Dutch (nl-NL)
**Target Audience**: Frontend Engineers
