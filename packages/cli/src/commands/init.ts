import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import * as path from "path";
import {
  findProjectRoot,
  loadConfig,
  saveConfig,
  getApiKey,
  type SeoConfig,
} from "../lib/config.js";
import {
  detectProject,
  detectCredentials,
  domainToProductId,
  formatProjectInfo,
} from "../lib/detect.js";
import { getApiClient } from "../lib/api.js";

interface InitOptions {
  domain?: string;
  name?: string;
  language?: string;
  yes?: boolean; // Non-interactive mode
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold("\n🚀 IndexYourNiche Setup\n"));

  // Find project root
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    console.error(
      chalk.red("✗ Could not find project root (no package.json found)")
    );
    console.log(
      chalk.gray("  Run this command from within a Node.js project")
    );
    process.exit(1);
  }

  // Check for existing config
  const existingConfig = loadConfig(projectRoot);
  if (existingConfig?._meta?.websiteId && !options.yes) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "seo.config.json already exists. Overwrite?",
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow("Setup cancelled."));
      return;
    }
  }

  // Detect project info
  const spinner = ora("Detecting project...").start();
  const project = detectProject(projectRoot);
  const credentials = detectCredentials(projectRoot);
  spinner.succeed("Project detected");

  console.log(chalk.gray("\n" + formatProjectInfo(project) + "\n"));

  // Check API key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.yellow("⚠ No IndexYourNiche API key found"));
    console.log(
      chalk.gray(
        "  Get your API key from https://indexyourniche.com/dashboard/settings"
      )
    );
    console.log(
      chalk.gray("  Then set INDEXYOURNICHE_API_KEY in your .env.local file\n")
    );

    if (!options.yes) {
      const { continueWithoutKey } = await inquirer.prompt([
        {
          type: "confirm",
          name: "continueWithoutKey",
          message: "Continue without API key? (config will be created but not registered)",
          default: true,
        },
      ]);
      if (!continueWithoutKey) {
        return;
      }
    }
  }

  // Gather information
  let domain = options.domain;
  let name = options.name;
  let language = options.language || "en-US";

  if (!options.yes) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "domain",
        message: "Website domain:",
        default: domain || project.name?.replace(/[^a-z0-9]/gi, "") + ".com",
        validate: (input: string) =>
          input.length > 0 || "Domain is required",
      },
      {
        type: "input",
        name: "name",
        message: "Website name:",
        default: (answers: { domain?: string }) =>
          name || project.name || answers.domain?.split(".")[0] || "My Website",
      },
      {
        type: "list",
        name: "language",
        message: "Content language:",
        choices: [
          { name: "English (US)", value: "en-US" },
          { name: "English (UK)", value: "en-GB" },
          { name: "Dutch", value: "nl-NL" },
          { name: "German", value: "de-DE" },
          { name: "French", value: "fr-FR" },
          { name: "Spanish", value: "es-ES" },
        ],
        default: language,
      },
    ]);

    domain = answers.domain;
    name = answers.name;
    language = answers.language;
  }

  if (!domain) {
    console.error(chalk.red("✗ Domain is required"));
    process.exit(1);
  }

  // Clean domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const productId = domainToProductId(cleanDomain);

  // Build config
  const config: SeoConfig = {
    website: {
      name: name || cleanDomain,
      domain: cleanDomain,
      language,
      author: "Team",
    },
    target: {
      supabaseUrl: credentials.supabaseUrl
        ? "${NEXT_PUBLIC_SUPABASE_URL}"
        : undefined,
      supabaseServiceKey: credentials.supabaseServiceKey
        ? "${SUPABASE_SERVICE_ROLE_KEY}"
        : undefined,
    },
    ai: {
      provider: credentials.anthropicApiKey ? "anthropic" : "openai",
      apiKey: credentials.anthropicApiKey
        ? "${ANTHROPIC_API_KEY}"
        : credentials.openaiApiKey
        ? "${OPENAI_API_KEY}"
        : undefined,
    },
    content: {
      postingFrequency: 3,
      autoGenerateTopics: false,
      categories: ["general"],
    },
    blog: {
      path: "/blog",
      productId,
    },
    _meta: {
      createdAt: new Date().toISOString(),
    },
  };

  // Register with API if key is available
  if (apiKey) {
    const registerSpinner = ora("Registering website...").start();
    const api = getApiClient(apiKey);

    const result = await api.createWebsite({
      name: config.website?.name || cleanDomain,
      domain: cleanDomain,
      language: config.website?.language,
      default_author: config.website?.author,
      days_between_posts: config.content?.postingFrequency,
      target_supabase_url: credentials.supabaseUrl || undefined,
      target_supabase_service_key: credentials.supabaseServiceKey || undefined,
      openai_api_key: credentials.openaiApiKey || undefined,
      anthropic_api_key: credentials.anthropicApiKey || undefined,
    });

    if (result.success && result.data) {
      config._meta!.websiteId = result.data.id;
      registerSpinner.succeed(
        `Website registered (ID: ${result.data.id.slice(0, 8)}...)`
      );
    } else {
      if (result.error?.code === "DOMAIN_EXISTS") {
        registerSpinner.warn("Website already registered for this domain");
        // Try to get existing website
        const listResult = await api.listWebsites();
        if (listResult.success && listResult.data) {
          const existing = listResult.data.find(
            (w) => w.domain === cleanDomain
          );
          if (existing) {
            config._meta!.websiteId = existing.id;
          }
        }
      } else {
        registerSpinner.fail(
          `Failed to register: ${result.error?.message || "Unknown error"}`
        );
      }
    }
  }

  // Save config
  const saveSpinner = ora("Creating seo.config.json...").start();
  try {
    saveConfig(projectRoot, config);
    saveSpinner.succeed("Created seo.config.json");
  } catch (error) {
    saveSpinner.fail("Failed to create seo.config.json");
    console.error(chalk.red(error));
    process.exit(1);
  }

  // Summary
  console.log(chalk.bold("\n✓ Setup complete!\n"));

  // Show detected credentials status
  console.log(chalk.gray("Credentials detected:"));
  console.log(
    `  Supabase URL: ${credentials.supabaseUrl ? chalk.green("✓") : chalk.yellow("✗")}`
  );
  console.log(
    `  Supabase Service Key: ${credentials.supabaseServiceKey ? chalk.green("✓") : chalk.yellow("✗")}`
  );
  console.log(
    `  OpenAI API Key: ${credentials.openaiApiKey ? chalk.green("✓") : chalk.gray("✗")}`
  );
  console.log(
    `  Anthropic API Key: ${credentials.anthropicApiKey ? chalk.green("✓") : chalk.gray("✗")}`
  );

  // Next steps
  console.log(chalk.bold("\nNext steps:"));

  if (!credentials.supabaseUrl || !credentials.supabaseServiceKey) {
    console.log(
      chalk.yellow(
        "  1. Add your Supabase credentials to .env.local"
      )
    );
  }

  if (!credentials.openaiApiKey && !credentials.anthropicApiKey) {
    console.log(
      chalk.yellow(
        "  2. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env.local"
      )
    );
  }

  console.log(`  ${chalk.cyan("iyn scan")}    - Analyze your website for SEO insights`);
  console.log(`  ${chalk.cyan("iyn topics")}  - Discover content topic ideas`);
  console.log(`  ${chalk.cyan("iyn blog")}    - Set up blog pages in your project`);
  console.log("");
}
