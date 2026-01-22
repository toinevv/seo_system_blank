import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import { findProjectRoot, loadConfig, saveConfig } from "../lib/config.js";
import { detectProject, detectBlogPath, detectBlogDirectory } from "../lib/detect.js";

interface BlogOptions {
  path?: string;
  yes?: boolean;
}

export async function blogCommand(options: BlogOptions): Promise<void> {
  console.log(chalk.bold("\n📰 Blog Setup\n"));

  // Find project root
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    console.error(chalk.red("✗ Not in a project directory"));
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  if (!config?._meta?.websiteId) {
    console.error(chalk.red("✗ No website configured. Run 'iyn init' first."));
    process.exit(1);
  }

  // Detect project
  const project = detectProject(projectRoot);
  const recommendedPath = detectBlogPath(project);

  console.log(chalk.gray(`Framework: ${project.framework || "Unknown"}`));
  console.log(chalk.gray(`Recommended path: ${recommendedPath}\n`));

  // Get blog path
  let blogPath = options.path || recommendedPath;

  if (!options.yes) {
    const { selectedPath } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedPath",
        message: "Where should blog pages be created?",
        choices: [
          { name: `${recommendedPath} (Recommended)`, value: recommendedPath },
          { name: "/articles", value: "/articles" },
          { name: "/posts", value: "/posts" },
          { name: "Custom path...", value: "_custom" },
        ],
        default: recommendedPath,
      },
    ]);

    if (selectedPath === "_custom") {
      const { customPath } = await inquirer.prompt([
        {
          type: "input",
          name: "customPath",
          message: "Enter custom blog path:",
          default: "/blog",
        },
      ]);
      blogPath = customPath;
    } else {
      blogPath = selectedPath;
    }
  }

  // Determine file system path for the blog
  const fsPath = getBlogFsPath(projectRoot, project.framework || "unknown", blogPath);

  console.log(chalk.gray(`\nCreating blog at: ${fsPath}`));

  // Check if path already exists
  if (fs.existsSync(fsPath)) {
    if (!options.yes) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "Blog directory already exists. Continue anyway?",
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.yellow("Setup cancelled."));
        return;
      }
    }
  }

  // Create blog files
  const spinner = ora("Creating blog files...").start();

  try {
    await createBlogFiles(projectRoot, fsPath, project.framework || "unknown", config);
    spinner.succeed("Blog files created!");
  } catch (error) {
    spinner.fail("Failed to create blog files");
    console.error(chalk.red(error));
    process.exit(1);
  }

  // Update config
  config.blog = {
    ...config.blog,
    path: blogPath,
  };
  saveConfig(projectRoot, config);

  // Summary
  console.log(chalk.bold("\n✓ Blog setup complete!\n"));
  console.log(chalk.gray("Created files:"));
  console.log(`  ${chalk.cyan(path.join(fsPath, "page.tsx"))} - Blog listing`);
  console.log(`  ${chalk.cyan(path.join(fsPath, "[slug]", "page.tsx"))} - Article page`);

  console.log(chalk.bold("\nNext steps:"));
  console.log(`  ${chalk.cyan("iyn topics --discover")} - Generate content ideas`);
  console.log(`  ${chalk.cyan("iyn generate")} - Create your first article`);
  console.log("");
}

function getBlogFsPath(
  projectRoot: string,
  framework: string,
  blogPath: string
): string {
  // Normalize blog path
  const normalizedPath = blogPath.replace(/^\//, "").replace(/\/$/, "");

  switch (framework) {
    case "next-app":
      return path.join(projectRoot, "app", normalizedPath);
    case "next-pages":
      return path.join(projectRoot, "pages", normalizedPath);
    case "next-src-app":
      return path.join(projectRoot, "src", "app", normalizedPath);
    case "next-src-pages":
      return path.join(projectRoot, "src", "pages", normalizedPath);
    case "remix":
      return path.join(projectRoot, "app", "routes", normalizedPath);
    case "astro":
      return path.join(projectRoot, "src", "pages", normalizedPath);
    case "nuxt":
      return path.join(projectRoot, "pages", normalizedPath);
    default:
      // Default to src/app for unknown frameworks
      return path.join(projectRoot, "src", "app", normalizedPath);
  }
}

async function createBlogFiles(
  projectRoot: string,
  fsPath: string,
  framework: string,
  config: ReturnType<typeof loadConfig>
): Promise<void> {
  // Create directories
  fs.mkdirSync(fsPath, { recursive: true });
  fs.mkdirSync(path.join(fsPath, "[slug]"), { recursive: true });

  const websiteName = config?.website?.name || "Blog";
  const productId = config?.blog?.productId || "default";

  // Create blog listing page
  const listingPage = generateBlogListingPage(framework, websiteName, productId);
  fs.writeFileSync(path.join(fsPath, "page.tsx"), listingPage);

  // Create article page
  const articlePage = generateArticlePage(framework, productId);
  fs.writeFileSync(path.join(fsPath, "[slug]", "page.tsx"), articlePage);
}

function generateBlogListingPage(
  framework: string,
  websiteName: string,
  productId: string
): string {
  return `import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | ${websiteName}",
  description: "Latest articles and insights from ${websiteName}",
};

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  tldr: string | null;
  cover_image_url: string | null;
  published_at: string;
  geo_optimized: boolean;
}

export default async function BlogPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("blog_articles")
    .select("id, slug, title, meta_description, tldr, cover_image_url, published_at, geo_optimized")
    .eq("product_id", "${productId}")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <main className="container mx-auto px-4 py-16 max-w-6xl">
      <header className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Latest articles and insights from ${websiteName}
        </p>
      </header>

      {!articles || articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No articles published yet.</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {article.cover_image_url && (
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  {article.geo_optimized && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      GEO Optimized
                    </span>
                  )}
                  <time className="text-sm text-muted-foreground">
                    {new Date(article.published_at).toLocaleDateString()}
                  </time>
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  <Link href={\`/blog/\${article.slug}\`} className="hover:underline">
                    {article.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground line-clamp-3">
                  {article.tldr || article.meta_description}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
`;
}

function generateArticlePage(framework: string, productId: string): string {
  return `import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface Citation {
  text: string;
  source: string;
  author?: string;
}

interface Statistic {
  stat: string;
  source: string;
  url?: string;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("blog_articles")
    .select("title, meta_description, cover_image_url")
    .eq("slug", slug)
    .eq("product_id", "${productId}")
    .single();

  if (!article) return { title: "Not Found" };

  return {
    title: article.title,
    description: article.meta_description,
    openGraph: {
      title: article.title,
      description: article.meta_description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article, error } = await supabase
    .from("blog_articles")
    .select("*")
    .eq("slug", slug)
    .eq("product_id", "${productId}")
    .single();

  if (error || !article) {
    notFound();
  }

  const faqItems = (article.faq_items as FAQItem[]) || [];
  const citations = (article.citations as Citation[]) || [];
  const statistics = (article.cited_statistics as Statistic[]) || [];

  return (
    <>
      {/* Schema Markup */}
      {article.schema_markup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema_markup) }}
        />
      )}
      {article.faq_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article.faq_schema) }}
        />
      )}

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <article>
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              {article.author_name && <span>By {article.author_name}</span>}
              {article.published_at && (
                <time>{new Date(article.published_at).toLocaleDateString()}</time>
              )}
              {article.geo_optimized && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  GEO Optimized
                </span>
              )}
            </div>
          </header>

          {/* TL;DR - Key for GEO */}
          {article.tldr && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r">
              <h2 className="font-bold text-blue-900 mb-2">TL;DR</h2>
              <p className="text-blue-800">{article.tldr}</p>
            </div>
          )}

          {/* Cover Image */}
          {article.cover_image_url && (
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full rounded-lg mb-8"
            />
          )}

          {/* Main Content */}
          <div
            className="prose prose-lg max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Cited Statistics - GEO Feature */}
          {statistics.length > 0 && (
            <section className="mb-12 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">📊 Key Statistics</h2>
              <ul className="space-y-3">
                {statistics.map((stat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>
                      {stat.stat}
                      <span className="text-muted-foreground text-sm ml-2">
                        — {stat.url ? (
                          <a href={stat.url} target="_blank" rel="noopener noreferrer" className="underline">
                            {stat.source}
                          </a>
                        ) : stat.source}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Expert Citations - GEO Feature */}
          {citations.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">💬 Expert Insights</h2>
              <div className="space-y-4">
                {citations.map((citation, idx) => (
                  <blockquote
                    key={idx}
                    className="border-l-4 border-gray-300 pl-4 italic"
                  >
                    <p className="mb-2">"{citation.text}"</p>
                    <footer className="text-sm text-muted-foreground">
                      {citation.author && <span className="font-medium">{citation.author}</span>}
                      {citation.author && citation.source && <span>, </span>}
                      <cite>{citation.source}</cite>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section - GEO Feature */}
          {faqItems.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">❓ Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqItems.map((faq, idx) => (
                  <details key={idx} className="border rounded-lg p-4">
                    <summary className="font-semibold cursor-pointer">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </>
  );
}
`;
}
