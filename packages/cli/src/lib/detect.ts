import * as fs from "fs";
import * as path from "path";
import { loadEnvFiles } from "./config.js";

export interface ProjectInfo {
  root: string;
  name: string | null;
  framework: "nextjs" | "remix" | "astro" | "nuxt" | "other" | null;
  frameworkVersion: string | null;
  typescript: boolean;
  hasSupabase: boolean;
  hasTailwind: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
}

export interface DetectedCredentials {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceKey: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
}

/**
 * Detect project information from package.json and file structure
 */
export function detectProject(projectRoot: string): ProjectInfo {
  const packageJsonPath = path.join(projectRoot, "package.json");

  let packageJson: {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } = {};

  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    } catch {
      // Ignore parse errors
    }
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Detect framework
  let framework: ProjectInfo["framework"] = null;
  let frameworkVersion: string | null = null;

  if (deps["next"]) {
    framework = "nextjs";
    frameworkVersion = deps["next"].replace(/[\^~]/g, "");
  } else if (deps["@remix-run/react"]) {
    framework = "remix";
    frameworkVersion = deps["@remix-run/react"].replace(/[\^~]/g, "");
  } else if (deps["astro"]) {
    framework = "astro";
    frameworkVersion = deps["astro"].replace(/[\^~]/g, "");
  } else if (deps["nuxt"]) {
    framework = "nuxt";
    frameworkVersion = deps["nuxt"].replace(/[\^~]/g, "");
  } else if (Object.keys(deps).length > 0) {
    framework = "other";
  }

  // Detect TypeScript
  const typescript =
    fs.existsSync(path.join(projectRoot, "tsconfig.json")) ||
    !!deps["typescript"];

  // Detect Supabase
  const hasSupabase =
    !!deps["@supabase/supabase-js"] ||
    !!deps["@supabase/ssr"] ||
    !!deps["@supabase/auth-helpers-nextjs"];

  // Detect Tailwind
  const hasTailwind =
    !!deps["tailwindcss"] ||
    fs.existsSync(path.join(projectRoot, "tailwind.config.js")) ||
    fs.existsSync(path.join(projectRoot, "tailwind.config.ts"));

  // Detect package manager
  let packageManager: ProjectInfo["packageManager"] = "npm";
  if (fs.existsSync(path.join(projectRoot, "bun.lockb"))) {
    packageManager = "bun";
  } else if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) {
    packageManager = "yarn";
  }

  return {
    root: projectRoot,
    name: packageJson.name || null,
    framework,
    frameworkVersion,
    typescript,
    hasSupabase,
    hasTailwind,
    packageManager,
  };
}

/**
 * Detect credentials from environment files
 */
export function detectCredentials(projectRoot: string): DetectedCredentials {
  const env = loadEnvFiles(projectRoot);

  // Also check process.env
  const allEnv = { ...env, ...process.env };

  return {
    supabaseUrl:
      allEnv.NEXT_PUBLIC_SUPABASE_URL ||
      allEnv.SUPABASE_URL ||
      allEnv.PUBLIC_SUPABASE_URL ||
      allEnv.VITE_SUPABASE_URL ||
      null,
    supabaseAnonKey:
      allEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      allEnv.SUPABASE_ANON_KEY ||
      allEnv.PUBLIC_SUPABASE_ANON_KEY ||
      allEnv.VITE_SUPABASE_ANON_KEY ||
      null,
    supabaseServiceKey:
      allEnv.SUPABASE_SERVICE_ROLE_KEY ||
      allEnv.SUPABASE_SERVICE_KEY ||
      null,
    openaiApiKey: allEnv.OPENAI_API_KEY || null,
    anthropicApiKey:
      allEnv.ANTHROPIC_API_KEY || allEnv.CLAUDE_API_KEY || null,
  };
}

/**
 * Detect the best blog path based on framework
 */
export function detectBlogPath(project: ProjectInfo): string {
  const root = project.root;

  // Check existing blog directories
  const possiblePaths = [
    "app/blog",
    "app/(marketing)/blog",
    "app/(landing)/blog",
    "src/app/blog",
    "src/app/(marketing)/blog",
    "pages/blog",
    "src/pages/blog",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(root, p))) {
      return `/${p.replace(/^(src\/)?app\/|^(src\/)?pages\//, "").replace(/\([^)]+\)\//g, "")}`;
    }
  }

  // Default based on framework
  if (project.framework === "nextjs") {
    // Check if using App Router or Pages Router
    if (fs.existsSync(path.join(root, "app")) || fs.existsSync(path.join(root, "src/app"))) {
      return "/blog";
    }
    return "/blog";
  }

  return "/blog";
}

/**
 * Detect where to create blog files based on framework
 */
export function detectBlogDirectory(project: ProjectInfo): string {
  const root = project.root;

  // Next.js App Router
  if (project.framework === "nextjs") {
    if (fs.existsSync(path.join(root, "src/app"))) {
      // Check for route groups
      if (fs.existsSync(path.join(root, "src/app/(landing)"))) {
        return "src/app/(landing)/blog";
      }
      if (fs.existsSync(path.join(root, "src/app/(marketing)"))) {
        return "src/app/(marketing)/blog";
      }
      return "src/app/blog";
    }
    if (fs.existsSync(path.join(root, "app"))) {
      if (fs.existsSync(path.join(root, "app/(landing)"))) {
        return "app/(landing)/blog";
      }
      if (fs.existsSync(path.join(root, "app/(marketing)"))) {
        return "app/(marketing)/blog";
      }
      return "app/blog";
    }
    // Pages Router
    if (fs.existsSync(path.join(root, "src/pages"))) {
      return "src/pages/blog";
    }
    return "pages/blog";
  }

  // Remix
  if (project.framework === "remix") {
    if (fs.existsSync(path.join(root, "app/routes"))) {
      return "app/routes/blog";
    }
  }

  // Astro
  if (project.framework === "astro") {
    return "src/pages/blog";
  }

  // Default
  return "blog";
}

/**
 * Detect components directory
 */
export function detectComponentsDirectory(project: ProjectInfo): string {
  const root = project.root;

  const possiblePaths = [
    "src/components",
    "components",
    "app/components",
    "src/app/components",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(root, p))) {
      return p;
    }
  }

  // Default based on project structure
  if (fs.existsSync(path.join(root, "src"))) {
    return "src/components";
  }

  return "components";
}

/**
 * Generate a product ID from domain
 */
export function domainToProductId(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}

/**
 * Format detection results for display
 */
export function formatProjectInfo(project: ProjectInfo): string {
  const lines: string[] = [];

  if (project.framework) {
    const version = project.frameworkVersion ? ` ${project.frameworkVersion}` : "";
    lines.push(`Framework: ${project.framework}${version}`);
  }

  if (project.typescript) {
    lines.push("TypeScript: Yes");
  }

  if (project.hasSupabase) {
    lines.push("Supabase: Detected");
  }

  if (project.hasTailwind) {
    lines.push("Tailwind CSS: Detected");
  }

  lines.push(`Package Manager: ${project.packageManager}`);

  return lines.join("\n");
}
