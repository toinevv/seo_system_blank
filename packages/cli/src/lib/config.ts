import * as fs from "fs";
import * as path from "path";
import { config as loadDotenv } from "dotenv";

import * as os from "os";

const CONFIG_FILENAME = "seo.config.json";
const ENV_FILES = [".env.local", ".env", ".env.development"];
const GLOBAL_CONFIG_DIR = ".indexyourniche";
const GLOBAL_CONFIG_FILE = "config.json";

interface GlobalConfig {
  apiKey?: string;
  email?: string;
}

export interface SeoConfig {
  website?: {
    name?: string;
    domain?: string;
    language?: string;
    author?: string;
  };
  target?: {
    supabaseUrl?: string;
    supabaseServiceKey?: string;
  };
  ai?: {
    provider?: "anthropic" | "openai";
    apiKey?: string;
  };
  content?: {
    postingFrequency?: number;
    autoGenerateTopics?: boolean;
    categories?: string[];
  };
  blog?: {
    path?: string;
    productId?: string;
  };
  _meta?: {
    websiteId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * Find the project root by looking for package.json
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Load environment variables from .env files
 */
export function loadEnvFiles(projectRoot: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const envFile of ENV_FILES) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      loadDotenv({ path: envPath });
      // Also manually parse for our use
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  }

  return env;
}

/**
 * Interpolate environment variables in config values
 */
export function interpolateEnvVars(
  value: string,
  env: Record<string, string>
): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return env[varName] || process.env[varName] || "";
  });
}

/**
 * Load seo.config.json if it exists
 */
export function loadConfig(projectRoot: string): SeoConfig | null {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as SeoConfig;

    // Load env files and interpolate
    const env = loadEnvFiles(projectRoot);

    // Interpolate env vars in config
    if (config.target?.supabaseUrl) {
      config.target.supabaseUrl = interpolateEnvVars(config.target.supabaseUrl, env);
    }
    if (config.target?.supabaseServiceKey) {
      config.target.supabaseServiceKey = interpolateEnvVars(config.target.supabaseServiceKey, env);
    }
    if (config.ai?.apiKey) {
      config.ai.apiKey = interpolateEnvVars(config.ai.apiKey, env);
    }

    return config;
  } catch (error) {
    return null;
  }
}

/**
 * Save seo.config.json
 */
export function saveConfig(projectRoot: string, config: SeoConfig): void {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);

  // Update metadata
  config._meta = {
    ...config._meta,
    updatedAt: new Date().toISOString(),
  };

  if (!config._meta.createdAt) {
    config._meta.createdAt = config._meta.updatedAt;
  }

  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Get the global config directory path
 */
function getGlobalConfigDir(): string {
  return path.join(os.homedir(), GLOBAL_CONFIG_DIR);
}

/**
 * Get the global config file path
 */
function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE);
}

/**
 * Load global config from ~/.indexyourniche/config.json
 */
export function loadGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as GlobalConfig;
  } catch {
    return {};
  }
}

/**
 * Save global config to ~/.indexyourniche/config.json
 */
export function saveGlobalConfig(config: GlobalConfig): void {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();

  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Save API key to global config
 */
export function saveApiKey(apiKey: string): void {
  const config = loadGlobalConfig();
  config.apiKey = apiKey;
  saveGlobalConfig(config);
}

/**
 * Get API key from environment, project .env, or global config
 */
export function getApiKey(): string | null {
  // 1. Check environment first (highest priority)
  const envKey = process.env.INDEXYOURNICHE_API_KEY || process.env.IYN_API_KEY;
  if (envKey) {
    return envKey;
  }

  // 2. Check project .env files
  const projectRoot = findProjectRoot();
  if (projectRoot) {
    const env = loadEnvFiles(projectRoot);
    if (env.INDEXYOURNICHE_API_KEY) {
      return env.INDEXYOURNICHE_API_KEY;
    }
    if (env.IYN_API_KEY) {
      return env.IYN_API_KEY;
    }
  }

  // 3. Check global config (~/.indexyourniche/config.json)
  const globalConfig = loadGlobalConfig();
  if (globalConfig.apiKey) {
    return globalConfig.apiKey;
  }

  return null;
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return process.env.INDEXYOURNICHE_API_URL || "https://indexyourniche.com";
}
