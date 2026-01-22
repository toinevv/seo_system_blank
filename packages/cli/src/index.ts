#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { topicsCommand, addTopicCommand } from "./commands/topics.js";
import { blogCommand } from "./commands/blog.js";
import { generateCommand, statusCommand } from "./commands/generate.js";
import { loginCommand, trialCommand, logoutCommand, whoamiCommand } from "./commands/auth.js";

const program = new Command();

program
  .name("iyn")
  .description(
    chalk.bold("IndexYourNiche CLI") +
      " - SEO automation for your projects\n\n" +
      "  Generate GEO-optimized content that ranks in AI search engines\n" +
      "  like ChatGPT, Claude, and Perplexity."
  )
  .version("0.1.0");

// Init command
program
  .command("init")
  .description("Initialize IndexYourNiche in your project")
  .option("-d, --domain <domain>", "Website domain")
  .option("-n, --name <name>", "Website name")
  .option("-l, --language <language>", "Content language (default: en-US)")
  .option("-y, --yes", "Non-interactive mode (accept defaults)")
  .action(initCommand);

// Scan command
program
  .command("scan")
  .description("Scan your website for SEO insights")
  .option("-f, --force", "Force a fresh scan")
  .action(scanCommand);

// Topics command
program
  .command("topics")
  .description("Manage content topics")
  .option("-d, --discover", "Discover new topics using AI")
  .option("-c, --count <number>", "Number of topics to discover", "10")
  .option("-l, --list", "List existing topics")
  .action((options) => {
    topicsCommand({
      ...options,
      count: parseInt(options.count, 10),
    });
  });

// Add topic command
program
  .command("topic:add <title>")
  .description("Add a specific topic manually")
  .action(addTopicCommand);

// Blog command
program
  .command("blog")
  .description("Scaffold blog pages in your project")
  .option("-p, --path <path>", "Blog URL path (default: /blog)")
  .option("-y, --yes", "Non-interactive mode")
  .action(blogCommand);

// Generate command
program
  .command("generate")
  .description("Generate an article from a topic")
  .option("-t, --topic <topic>", "Topic title or ID to use")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(generateCommand);

// Status command
program
  .command("status")
  .description("Show current project status")
  .action(statusCommand);

// Auth commands
const auth = program
  .command("auth")
  .description("Authentication commands");

auth
  .command("login")
  .description("Log in via browser (opens authentication page)")
  .action(loginCommand);

auth
  .command("trial")
  .description("Start a free trial with just your email")
  .option("-e, --email <email>", "Your email address")
  .action(trialCommand);

auth
  .command("logout")
  .description("Log out and remove saved credentials")
  .action(logoutCommand);

auth
  .command("whoami")
  .description("Show current logged-in user")
  .action(whoamiCommand);

// Shortcut for login
program
  .command("login")
  .description("Log in to IndexYourNiche (shortcut for 'auth login')")
  .action(loginCommand);

// Help footer
program.addHelpText(
  "after",
  `
${chalk.bold("Quick Start:")}
  ${chalk.gray("# Start free trial (no account needed)")}
  $ iyn auth trial --email you@example.com

  ${chalk.gray("# Or log in with existing account")}
  $ iyn login

  ${chalk.gray("# Then set up your project")}
  $ iyn init -y -d yoursite.com
  $ iyn scan
  $ iyn topics --discover
  $ iyn generate

${chalk.bold("For AI Agents:")}
  ${chalk.gray("# Full autonomous setup")}
  $ iyn auth trial -e user@example.com && iyn init -y -d example.com && iyn scan && iyn topics --discover && iyn generate -y

${chalk.bold("Documentation:")}
  https://indexyourniche.com/docs
`
);

program.parse();
