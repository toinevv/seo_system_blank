// Database types for the central SEO dashboard

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user" | "viewer";
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  product_id: string;
  is_active: boolean;
  days_between_posts: number;
  preferred_time: string;
  timezone: string;
  last_generated_at: string | null;
  next_scheduled_at: string | null;
  language: string;
  default_author: string;
  system_prompt_openai: string | null;
  system_prompt_claude: string | null;
  seo_config: SeoConfig;
  internal_links: InternalLinks;
  categories: Categories;
  google_news_config: GoogleNewsConfig;
  total_articles_generated: number;
  // Topic generation settings
  max_topic_uses: number;
  auto_generate_topics: boolean;
  // Website scanning settings
  auto_scan_enabled: boolean;
  scan_frequency_days: number;
  google_search_enabled: boolean;
  // Content format settings
  content_formats: ContentFormatType[];
  format_history: string[];
  voice_style: VoiceStyleType;
  human_elements: HumanElements;
  // Time variation settings
  time_variation_mode: TimeVariationMode;
  posting_window_start: string;
  posting_window_end: string;
  preferred_days: string[];
  min_hours_between_posts: number;
  max_hours_between_posts: number;
  last_posting_hour: number | null;
  // API rotation settings
  api_rotation_mode: ApiRotationMode;
  last_api_used: "openai" | "claude" | null;
  created_at: string;
  updated_at: string;
}

// Content format types (matches worker/src/entry.py CONTENT_FORMATS)
export type ContentFormatType =
  | "listicle"
  | "how_to_guide"
  | "deep_dive"
  | "comparison"
  | "case_study"
  | "qa_interview"
  | "news_commentary"
  | "ultimate_guide";

// Voice style types (matches worker/src/entry.py VOICE_STYLES)
export type VoiceStyleType = "professional" | "conversational" | "expert" | "friendly";

// Time variation modes
export type TimeVariationMode = "fixed" | "window" | "random";

// API rotation modes
export type ApiRotationMode = "rotate" | "openai_only" | "anthropic_only";

// Human elements for anti-AI detection
export interface HumanElements {
  rhetorical_questions: boolean;
  conversational_asides: boolean;
  opinion_markers: boolean;
  uncertainty_markers: boolean;
  anecdote_hints: boolean;
  transition_variety: boolean;
}

export interface SeoConfig {
  fallback_meta_template: string;
  default_category: string;
  schema_organization: {
    name?: string;
    url?: string;
    logo?: string;
  };
}

export interface InternalLinks {
  landing_links: Array<{
    anchor_text: string;
    url: string;
    title: string;
  }>;
  related_topics: Record<string, Array<{ anchor: string; url: string }>>;
}

export interface Categories {
  category_keywords: Record<string, string[]>;
  default_category: string;
}

export interface GoogleNewsConfig {
  search_queries: string[];
  relevance_keywords: string[];
  exclude_keywords: string[];
  min_relevance_score: number;
}

export interface ApiKeys {
  id: string;
  website_id: string;
  openai_api_key_encrypted: string | null;
  anthropic_api_key_encrypted: string | null;
  target_supabase_url: string;
  target_supabase_service_key_encrypted: string;
  openai_validated: boolean;
  anthropic_validated: boolean;
  target_db_validated: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  website_id: string;
  title: string;
  keywords: string[];
  category: string | null;
  priority: number;
  source: "manual" | "google_news" | "imported" | "ai_suggested" | "ai_generated" | "google_search";
  is_used: boolean;
  used_at: string | null;
  times_used: number;
  last_seo_score: number | null;
  original_title: string | null;
  notes: string | null;
  discovery_context: DiscoveryContext | null;
  // Content format hints
  format_type: ContentFormatType | null;
  trending_reason: string | null;
  timeliness: "evergreen" | "seasonal" | "news" | "trending";
  created_at: string;
  updated_at: string;
}

export interface DiscoveryContext {
  used_scan_data?: boolean;
  niche?: string;
  themes_used?: string[];
  search_source?: string;
  snippet?: string;
}

export interface WebsiteScan {
  id: string;
  website_id: string;
  homepage_title: string | null;
  homepage_meta_description: string | null;
  main_keywords: string[];
  headings: string[];
  navigation_links: NavigationLink[];
  content_themes: string[];
  niche_description: string | null;
  pages_scanned: number;
  scan_status: "pending" | "scanning" | "completed" | "failed";
  error_message: string | null;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NavigationLink {
  url: string;
  text: string;
}

export interface GenerationLog {
  id: string;
  website_id: string;
  topic_id: string | null;
  status: "pending" | "generating" | "success" | "failed" | "cancelled";
  article_title: string | null;
  article_slug: string | null;
  api_used: "openai" | "claude" | null;
  api_model: string | null;
  tokens_used: number | null;
  generation_time_seconds: number | null;
  seo_score: number | null;
  word_count: number | null;
  geo_optimized: boolean;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  retry_count: number;
  target_article_id: string | null;
  // Content format tracking
  content_format: ContentFormatType | null;
  voice_style: VoiceStyleType | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface WorkerStatus {
  id: string;
  worker_name: string;
  status: "idle" | "running" | "error" | "stopped";
  current_website_id: string | null;
  current_task: string | null;
  last_heartbeat: string;
  started_at: string | null;
  error_message: string | null;
  stats: {
    articles_today: number;
    articles_this_week: number;
    total_runtime_hours: number;
  };
}

export interface SystemKey {
  id: string;
  key_name: string;
  key_value_encrypted: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
