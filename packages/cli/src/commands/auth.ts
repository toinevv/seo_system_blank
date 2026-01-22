import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import * as http from "http";
import * as open from "open";
import { saveApiKey, getApiKey, getApiBaseUrl } from "../lib/config.js";

const CALLBACK_PORT = 9876;

interface AuthOptions {
  email?: string;
  trial?: boolean;
}

/**
 * Start a local server to receive the auth callback
 */
function startCallbackServer(): Promise<{ apiKey: string; email: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname === "/callback") {
        const apiKey = url.searchParams.get("key");
        const email = url.searchParams.get("email");
        const error = url.searchParams.get("error");

        // Send response to browser
        res.writeHead(200, { "Content-Type": "text/html" });

        if (error) {
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #ef4444;">❌ Authentication Failed</h1>
                  <p>${error}</p>
                  <p>You can close this window.</p>
                </div>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(error));
        } else if (apiKey) {
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #10b981;">✅ Authentication Successful!</h1>
                  <p>You can close this window and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);
          server.close();
          resolve({ apiKey, email: email || "" });
        } else {
          res.end("Invalid callback");
          server.close();
          reject(new Error("Invalid callback - no API key received"));
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(CALLBACK_PORT, () => {
      // Server started
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out"));
    }, 5 * 60 * 1000);
  });
}

/**
 * Browser-based login flow
 */
export async function loginCommand(): Promise<void> {
  console.log(chalk.bold("\n🔐 IndexYourNiche Login\n"));

  // Check if already logged in
  const existingKey = getApiKey();
  if (existingKey) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "You're already logged in. Log in with a different account?",
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.gray("Keeping existing credentials."));
      return;
    }
  }

  const baseUrl = getApiBaseUrl();
  const callbackUrl = `http://localhost:${CALLBACK_PORT}/callback`;
  const authUrl = `${baseUrl}/auth/cli?callback=${encodeURIComponent(callbackUrl)}`;

  console.log(chalk.gray("Opening browser for authentication...\n"));
  console.log(chalk.gray(`If browser doesn't open, visit:\n${authUrl}\n`));

  // Start callback server
  const serverPromise = startCallbackServer();

  // Open browser
  try {
    await open.default(authUrl);
  } catch {
    console.log(chalk.yellow("Could not open browser automatically."));
    console.log(chalk.gray(`Please visit: ${authUrl}`));
  }

  const spinner = ora("Waiting for authentication...").start();

  try {
    const { apiKey, email } = await serverPromise;

    // Save the API key
    saveApiKey(apiKey);

    spinner.succeed(`Logged in as ${email || "user"}`);
    console.log(chalk.green("\n✓ API key saved to ~/.indexyourniche/config"));
    console.log(chalk.gray("\nYou can now use 'iyn init' to set up your project.\n"));
  } catch (error) {
    spinner.fail("Authentication failed");
    console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
    process.exit(1);
  }
}

/**
 * Create a trial account with just an email
 */
export async function trialCommand(options: AuthOptions): Promise<void> {
  console.log(chalk.bold("\n🚀 IndexYourNiche Trial\n"));

  let email = options.email;

  if (!email) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Enter your email to start free trial:",
        validate: (input: string) => {
          if (!input.includes("@")) return "Please enter a valid email";
          return true;
        },
      },
    ]);
    email = answers.email;
  }

  const spinner = ora("Creating trial account...").start();

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/auth/trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      spinner.fail("Failed to create trial");
      console.error(chalk.red(result.error?.message || "Unknown error"));
      if (result.error?.hint) {
        console.log(chalk.gray(`  ${result.error.hint}`));
      }
      process.exit(1);
    }

    if (result.data?.api_key) {
      // Direct key returned (for verified emails / returning users)
      saveApiKey(result.data.api_key);
      spinner.succeed("Trial activated!");
      console.log(chalk.green("\n✓ API key saved"));
      console.log(chalk.gray("\nRun 'iyn init' to set up your project.\n"));
    } else {
      // Email verification required
      spinner.succeed("Verification email sent!");
      console.log(chalk.yellow(`\n📧 Check your email (${email})`));
      console.log(chalk.gray("Click the link to activate your trial and get your API key."));
      console.log(chalk.gray("\nAfter verifying, run 'iyn init' to continue.\n"));
    }
  } catch (error) {
    spinner.fail("Network error");
    console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
    process.exit(1);
  }
}

/**
 * Log out and remove saved credentials
 */
export async function logoutCommand(): Promise<void> {
  console.log(chalk.bold("\n👋 Logout\n"));

  const existingKey = getApiKey();
  if (!existingKey) {
    console.log(chalk.gray("Not logged in."));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to log out?",
      default: true,
    },
  ]);

  if (confirm) {
    saveApiKey("");
    console.log(chalk.green("✓ Logged out successfully"));
  }
}

/**
 * Show current auth status
 */
export async function whoamiCommand(): Promise<void> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log(chalk.yellow("Not logged in"));
    console.log(chalk.gray("\nRun 'iyn auth login' or 'iyn auth trial' to authenticate.\n"));
    return;
  }

  const spinner = ora("Checking credentials...").start();

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { "X-API-Key": apiKey },
    });

    const result = await response.json();

    if (result.success && result.data) {
      spinner.stop();
      console.log(chalk.bold("\n👤 Current User\n"));
      console.log(`   Email: ${chalk.cyan(result.data.email)}`);
      console.log(`   Plan: ${chalk.green(result.data.plan || "free")}`);
      console.log(`   Websites: ${result.data.website_count || 0}`);
      console.log("");
    } else {
      spinner.fail("Invalid API key");
      console.log(chalk.gray("\nRun 'iyn auth login' to re-authenticate.\n"));
    }
  } catch {
    spinner.fail("Could not verify credentials");
  }
}
