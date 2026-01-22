import { getApiBaseUrl, getApiKey } from "./config.js";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  product_id: string;
  language: string;
  default_author: string;
  is_active: boolean;
  days_between_posts: number;
  last_generated_at: string | null;
  next_scheduled_at: string | null;
  total_articles_generated: number;
  created_at: string;
}

export interface Topic {
  id: string;
  title: string;
  keywords: string[];
  category: string;
  priority: number;
  source: string;
  is_used: boolean;
  used_at: string | null;
  times_used: number;
  last_seo_score: number | null;
  created_at: string;
}

export interface ScanResult {
  website_id: string;
  domain: string;
  has_scan: boolean;
  scan_data: {
    niche_description: string | null;
    content_themes: string[];
    main_keywords: string[];
    search_keywords: string[];
  };
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string | null;

  constructor(apiKey?: string) {
    this.baseUrl = getApiBaseUrl();
    this.apiKey = apiKey || getApiKey();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          code: "NO_API_KEY",
          message: "No API key configured",
          hint: "Run 'iyn login' or set INDEXYOURNICHE_API_KEY environment variable",
        },
      };
    }

    const url = `${this.baseUrl}/api/v1${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
          "User-Agent": "IndexYourNiche-CLI/0.1.0",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          hint: "Check your internet connection and try again",
        },
      };
    }
  }

  // Websites
  async listWebsites(): Promise<ApiResponse<Website[]>> {
    return this.request<Website[]>("GET", "/websites");
  }

  async createWebsite(data: {
    name: string;
    domain: string;
    language?: string;
    default_author?: string;
    days_between_posts?: number;
    target_supabase_url?: string;
    target_supabase_service_key?: string;
    openai_api_key?: string;
    anthropic_api_key?: string;
  }): Promise<ApiResponse<Website>> {
    return this.request<Website>("POST", "/websites", data);
  }

  async getWebsite(id: string): Promise<ApiResponse<Website & { stats: unknown }>> {
    return this.request<Website & { stats: unknown }>("GET", `/websites/${id}`);
  }

  async updateWebsite(
    id: string,
    data: Partial<Website>
  ): Promise<ApiResponse<Website>> {
    return this.request<Website>("PATCH", `/websites/${id}`, data);
  }

  async deleteWebsite(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>("DELETE", `/websites/${id}`);
  }

  // Scan
  async getScan(websiteId: string): Promise<ApiResponse<ScanResult>> {
    return this.request<ScanResult>("GET", `/websites/${websiteId}/scan`);
  }

  async triggerScan(websiteId: string): Promise<ApiResponse<ScanResult>> {
    return this.request<ScanResult>("POST", `/websites/${websiteId}/scan`);
  }

  // Topics
  async listTopics(
    websiteId: string,
    status?: "unused" | "used" | "all"
  ): Promise<ApiResponse<{ website_id: string; topics: Topic[]; count: number }>> {
    const query = status ? `?status=${status}` : "";
    return this.request<{ website_id: string; topics: Topic[]; count: number }>(
      "GET",
      `/websites/${websiteId}/topics${query}`
    );
  }

  async addTopics(
    websiteId: string,
    topics: Array<{
      title: string;
      keywords?: string[];
      category?: string;
      priority?: number;
    }>
  ): Promise<ApiResponse<{ website_id: string; added: number; topics: Topic[] }>> {
    return this.request<{ website_id: string; added: number; topics: Topic[] }>(
      "POST",
      `/websites/${websiteId}/topics`,
      { topics }
    );
  }

  async discoverTopics(
    websiteId: string,
    count?: number
  ): Promise<ApiResponse<{ website_id: string; discovered: number; topics: Topic[] }>> {
    return this.request<{ website_id: string; discovered: number; topics: Topic[] }>(
      "POST",
      `/websites/${websiteId}/topics`,
      { discover: true, count: count || 5 }
    );
  }

  // Generate
  async triggerGeneration(
    websiteId: string,
    options?: { topic_id?: string; custom_topic?: string }
  ): Promise<ApiResponse<{
    website_id: string;
    log_id: string;
    topic: { id: string; title: string };
    status: string;
    message: string;
  }>> {
    return this.request("POST", `/websites/${websiteId}/generate`, options || {});
  }

  async getGenerationLogs(
    websiteId: string,
    limit?: number
  ): Promise<ApiResponse<{ website_id: string; logs: unknown[]; count: number }>> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request<{ website_id: string; logs: unknown[]; count: number }>(
      "GET",
      `/websites/${websiteId}/generate${query}`
    );
  }

  // Utility to check if API key is valid
  async validateKey(): Promise<boolean> {
    const result = await this.listWebsites();
    return result.success;
  }
}

// Singleton instance
let apiClient: ApiClient | null = null;

export function getApiClient(apiKey?: string): ApiClient {
  if (!apiClient || apiKey) {
    apiClient = new ApiClient(apiKey);
  }
  return apiClient;
}
