import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { findProjectRoot, loadConfig, getApiKey } from "../lib/config.js";
import { getApiClient } from "../lib/api.js";

interface GenerateOptions {
  topic?: string;
  yes?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  console.log(chalk.bold("\n✨ Article Generation\n"));

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

  // Get available topics
  const topicsSpinner = ora("Fetching available topics...").start();
  const topicsResult = await api.listTopics(websiteId);

  if (!topicsResult.success) {
    topicsSpinner.fail(`Failed to fetch topics: ${topicsResult.error?.message}`);
    process.exit(1);
  }

  const allTopics = topicsResult.data?.topics || [];
  const availableTopics = allTopics.filter((t) => !t.is_used);
  topicsSpinner.succeed(`Found ${availableTopics.length} available topics`);

  if (availableTopics.length === 0) {
    console.log(chalk.yellow("\nNo available topics. Run 'iyn topics --discover' first."));
    process.exit(1);
  }

  // Select topic
  let selectedTopic: { id: string; title: string };

  if (options.topic) {
    // Find topic by title or ID
    const found = availableTopics.find(
      (t: { id: string; title: string; is_used: boolean }) =>
        t.title.toLowerCase().includes(options.topic!.toLowerCase()) ||
        t.id === options.topic
    );
    if (!found) {
      console.error(chalk.red(`✗ Topic not found: ${options.topic}`));
      process.exit(1);
    }
    selectedTopic = found;
  } else if (options.yes) {
    // Auto-select first topic
    selectedTopic = availableTopics[0];
  } else {
    // Interactive selection
    const { topicId } = await inquirer.prompt([
      {
        type: "list",
        name: "topicId",
        message: "Select a topic to write about:",
        choices: availableTopics.slice(0, 15).map((t: { id: string; title: string }) => ({
          name: t.title,
          value: t.id,
        })),
      },
    ]);
    selectedTopic = availableTopics.find((t: { id: string }) => t.id === topicId)!;
  }

  console.log(chalk.gray(`\nGenerating article: "${selectedTopic.title}"\n`));

  // Confirm generation
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "This will use AI credits. Continue?",
        default: true,
      },
    ]);
    if (!confirm) {
      console.log(chalk.yellow("Generation cancelled."));
      return;
    }
  }

  // Generate article
  const genSpinner = ora("Generating article with AI...").start();
  genSpinner.text = "This may take 1-2 minutes...";

  const result = await api.triggerGeneration(websiteId, { topic_id: selectedTopic.id });

  if (!result.success) {
    genSpinner.fail(`Generation failed: ${result.error?.message}`);
    if (result.error?.hint) {
      console.log(chalk.gray(`  ${result.error.hint}`));
    }
    process.exit(1);
  }

  genSpinner.succeed("Article generated!");

  // Display result
  const genResult = result.data;
  if (genResult) {
    console.log(chalk.bold("\n📄 Article Created:"));
    console.log(chalk.white(`   Title: ${genResult.topic?.title || selectedTopic.title}`));
    console.log(chalk.gray(`   Log ID: ${genResult.log_id}`));
    console.log(chalk.gray(`   Status: ${genResult.status}`));
    if (genResult.message) {
      console.log(chalk.gray(`   Message: ${genResult.message}`));
    }
  }

  console.log(chalk.bold("\n✓ Article saved to your target database!"));
  console.log(chalk.gray("  It will appear on your blog once published.\n"));
}

export async function statusCommand(): Promise<void> {
  console.log(chalk.bold("\n📊 Status\n"));

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

  // Fetch website details
  const spinner = ora("Fetching status...").start();
  const result = await api.getWebsite(websiteId);

  if (!result.success) {
    spinner.fail(`Failed to fetch status: ${result.error?.message}`);
    process.exit(1);
  }

  spinner.stop();

  const website = result.data;
  if (!website) {
    console.error(chalk.red("✗ Website not found"));
    process.exit(1);
  }

  // Cast stats to expected shape
  const stats = website.stats as {
    total_topics?: number;
    unused_topics?: number;
    successful_articles?: number;
  } | undefined;

  const hasCredentials = 'credentials_configured' in website ? (website as { credentials_configured?: boolean }).credentials_configured : false;

  // Display status
  console.log(chalk.bold("🌐 Website:"));
  console.log(`   Name: ${chalk.white(website.name)}`);
  console.log(`   Domain: ${chalk.cyan(website.domain)}`);
  console.log(`   Language: ${chalk.gray(website.language || "en-US")}`);
  console.log(`   Active: ${website.is_active ? chalk.green("✓") : chalk.red("✗")}`);
  console.log("");

  if (stats) {
    console.log(chalk.bold("📈 Stats:"));
    console.log(`   Total Topics: ${chalk.white(stats.total_topics || 0)}`);
    console.log(`   Available Topics: ${chalk.green(stats.unused_topics || 0)}`);
    console.log(`   Articles Generated: ${chalk.white(stats.successful_articles || 0)}`);
    console.log("");
  }

  console.log(chalk.bold("⚙️  Configuration:"));
  console.log(
    `   Target DB: ${hasCredentials ? chalk.green("✓ Configured") : chalk.yellow("✗ Not configured")}`
  );
  console.log(
    `   AI Provider: ${config.ai?.provider ? chalk.green(`✓ ${config.ai.provider}`) : chalk.yellow("✗ Not configured")}`
  );
  console.log("");

  // Next steps
  if (!stats?.total_topics) {
    console.log(chalk.bold("Next step:"));
    console.log(`  ${chalk.cyan("iyn scan")} - Analyze your website`);
    console.log(`  ${chalk.cyan("iyn topics --discover")} - Generate content ideas`);
  } else if (!stats?.unused_topics) {
    console.log(chalk.bold("Next step:"));
    console.log(`  ${chalk.cyan("iyn topics --discover")} - Generate more content ideas`);
  } else {
    console.log(chalk.bold("Ready to generate!"));
    console.log(`  ${chalk.cyan("iyn generate")} - Create an article`);
  }
  console.log("");
}
