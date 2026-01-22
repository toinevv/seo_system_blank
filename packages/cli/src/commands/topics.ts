import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { findProjectRoot, loadConfig, getApiKey } from "../lib/config.js";
import { getApiClient } from "../lib/api.js";

interface TopicsOptions {
  discover?: boolean;
  count?: number;
  list?: boolean;
}

export async function topicsCommand(options: TopicsOptions): Promise<void> {
  console.log(chalk.bold("\n📝 Topic Management\n"));

  // Load config
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

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(chalk.red("✗ No API key found. Set INDEXYOURNICHE_API_KEY"));
    process.exit(1);
  }

  const api = getApiClient(apiKey);
  const websiteId = config._meta.websiteId;

  // Default to list if no option specified
  if (!options.discover && !options.list) {
    options.list = true;
  }

  if (options.list) {
    await listTopics(api, websiteId);
  }

  if (options.discover) {
    await discoverTopics(api, websiteId, options.count || 10);
  }
}

async function listTopics(
  api: ReturnType<typeof getApiClient>,
  websiteId: string
): Promise<void> {
  const spinner = ora("Fetching topics...").start();
  const result = await api.listTopics(websiteId);

  if (!result.success) {
    spinner.fail(`Failed to fetch topics: ${result.error?.message}`);
    return;
  }

  const topics = result.data?.topics || [];
  spinner.succeed(`Found ${topics.length} topics`);

  if (topics.length === 0) {
    console.log(chalk.yellow("\nNo topics yet. Run 'iyn topics --discover' to generate some."));
    return;
  }

  console.log("");

  // Group by status
  const unused = topics.filter((t) => !t.is_used);
  const used = topics.filter((t) => t.is_used);

  if (unused.length > 0) {
    console.log(chalk.bold("📋 Available Topics:"));
    for (const topic of unused.slice(0, 10)) {
      const priority = topic.priority ? chalk.gray(` [${topic.priority}]`) : "";
      console.log(chalk.green(`   ○ ${topic.title}${priority}`));
    }
    if (unused.length > 10) {
      console.log(chalk.gray(`   ... and ${unused.length - 10} more`));
    }
    console.log("");
  }

  if (used.length > 0) {
    console.log(chalk.bold("✓ Used Topics:"));
    for (const topic of used.slice(0, 5)) {
      console.log(chalk.gray(`   ✓ ${topic.title}`));
    }
    if (used.length > 5) {
      console.log(chalk.gray(`   ... and ${used.length - 5} more`));
    }
    console.log("");
  }

  // Summary
  console.log(chalk.gray(`Total: ${topics.length} | Available: ${unused.length} | Used: ${used.length}`));
}

async function discoverTopics(
  api: ReturnType<typeof getApiClient>,
  websiteId: string,
  count: number
): Promise<void> {
  console.log(chalk.gray(`Generating ${count} new topic ideas...\n`));

  const spinner = ora("Discovering topics with AI...").start();
  const result = await api.discoverTopics(websiteId, count);

  if (!result.success) {
    spinner.fail(`Discovery failed: ${result.error?.message}`);
    if (result.error?.hint) {
      console.log(chalk.gray(`  ${result.error.hint}`));
    }
    process.exit(1);
  }

  const newTopics = result.data?.topics || [];
  const discoveredCount = result.data?.discovered || newTopics.length;
  spinner.succeed(`Discovered ${discoveredCount} new topics!`);

  if (newTopics.length > 0) {
    console.log(chalk.bold("\n🆕 New Topics:"));
    for (const topic of newTopics) {
      console.log(chalk.cyan(`   • ${topic.title}`));
    }
  }

  console.log(chalk.bold("\nNext step:"));
  console.log(`  ${chalk.cyan("iyn generate")} - Generate an article from a topic`);
  console.log("");
}

export async function addTopicCommand(title: string): Promise<void> {
  console.log(chalk.bold("\n➕ Add Topic\n"));

  // Load config
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

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(chalk.red("✗ No API key found. Set INDEXYOURNICHE_API_KEY"));
    process.exit(1);
  }

  const api = getApiClient(apiKey);
  const websiteId = config._meta.websiteId;

  const spinner = ora("Adding topic...").start();
  const result = await api.addTopics(websiteId, [{ title }]);

  if (!result.success) {
    spinner.fail(`Failed to add topic: ${result.error?.message}`);
    process.exit(1);
  }

  spinner.succeed(`Added topic: "${title}"`);
  console.log("");
}
