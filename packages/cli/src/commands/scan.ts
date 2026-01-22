import chalk from "chalk";
import ora from "ora";
import { findProjectRoot, loadConfig, getApiKey } from "../lib/config.js";
import { getApiClient } from "../lib/api.js";

export async function scanCommand(): Promise<void> {
  console.log(chalk.bold("\n🔍 Website Scan\n"));

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

  // First check existing scan
  const existingSpinner = ora("Checking for existing scan...").start();
  const existingResult = await api.getScan(websiteId);

  if (existingResult.success && existingResult.data?.has_scan) {
    existingSpinner.succeed("Found existing scan data");
    displayScanResults(existingResult.data.scan_data);

    console.log(chalk.gray("\nTo run a fresh scan, use: iyn scan --force"));
    return;
  }

  existingSpinner.info("No existing scan found");

  // Trigger new scan
  const scanSpinner = ora(`Scanning ${config.website?.domain}...`).start();
  const scanResult = await api.triggerScan(websiteId);

  if (!scanResult.success) {
    scanSpinner.fail(`Scan failed: ${scanResult.error?.message}`);
    if (scanResult.error?.hint) {
      console.log(chalk.gray(`  ${scanResult.error.hint}`));
    }
    process.exit(1);
  }

  scanSpinner.succeed("Scan complete!");
  displayScanResults(scanResult.data?.scan_data);

  console.log(chalk.bold("\nNext step:"));
  console.log(`  ${chalk.cyan("iyn topics")} - Discover content ideas based on this scan`);
  console.log("");
}

function displayScanResults(scanData: {
  niche_description: string | null;
  content_themes: string[];
  main_keywords: string[];
  search_keywords: string[];
} | undefined): void {
  if (!scanData) {
    console.log(chalk.yellow("\nNo scan data available"));
    return;
  }

  console.log("");

  if (scanData.niche_description) {
    console.log(chalk.bold("📝 Niche:"));
    console.log(chalk.white(`   ${scanData.niche_description}`));
    console.log("");
  }

  if (scanData.content_themes?.length > 0) {
    console.log(chalk.bold("🎯 Content Themes:"));
    for (const theme of scanData.content_themes.slice(0, 5)) {
      console.log(chalk.gray(`   • ${theme}`));
    }
    console.log("");
  }

  if (scanData.main_keywords?.length > 0) {
    console.log(chalk.bold("🔑 Keywords:"));
    const keywords = scanData.main_keywords.slice(0, 10).join(", ");
    console.log(chalk.gray(`   ${keywords}`));
    if (scanData.main_keywords.length > 10) {
      console.log(chalk.gray(`   ... and ${scanData.main_keywords.length - 10} more`));
    }
    console.log("");
  }
}
