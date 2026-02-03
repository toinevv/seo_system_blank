"""
SEO Content Generator - Cloudflare Worker
Generates blog articles for multiple websites using AI APIs.
Uses HTTP fetch instead of SDKs (required for Pyodide/WebAssembly).
"""

from workers import Response, WorkerEntrypoint
from js import fetch, Object, console, crypto, Uint8Array, TextDecoder
from pyodide.ffi import to_js
import json
import base64
from datetime import datetime, timedelta
from typing import Optional
import random

# =============================================
# CONTENT FORMAT DEFINITIONS
# =============================================
# Each format has a unique structure, tone, and heading style
# to create varied, genuine content that avoids AI detection patterns

CONTENT_FORMATS = {
    "listicle": {
        "name": "Listicle",
        "description": "Numbered list format - great for tips, rankings, and quick reads",
        "structure": [
            ("intro", "Opening hook with the promise of value (2-3 sentences)"),
            ("numbered_items", "5-10 numbered items, each with a heading and 2-3 paragraph explanation"),
            ("expert_tip", "A bonus expert tip or insider insight"),
            ("conclusion", "Brief wrap-up with key takeaway")
        ],
        "tone": "energetic",
        "heading_style": "numbered",
        "word_range": (800, 1200)
    },
    "how_to_guide": {
        "name": "How-To Guide",
        "description": "Step-by-step tutorial format - ideal for tutorials and processes",
        "structure": [
            ("problem_intro", "Describe the problem this guide solves (2-3 sentences)"),
            ("what_youll_learn", "Brief overview of what reader will accomplish"),
            ("prerequisites", "What the reader needs before starting (optional)"),
            ("steps", "Numbered steps with clear instructions, each step gets its own heading"),
            ("troubleshooting", "Common problems and solutions"),
            ("conclusion", "Summary and next steps")
        ],
        "tone": "instructional",
        "heading_style": "step",
        "word_range": (1000, 1500)
    },
    "deep_dive": {
        "name": "Deep Dive Analysis",
        "description": "In-depth exploration - perfect for complex topics requiring thorough coverage",
        "structure": [
            ("executive_summary", "TL;DR of the key findings (50-75 words)"),
            ("background", "Context and why this matters"),
            ("analysis", "Main analysis with multiple sections exploring different angles"),
            ("implications", "What this means for the reader"),
            ("conclusion", "Key takeaways and recommendations")
        ],
        "tone": "analytical",
        "heading_style": "descriptive",
        "word_range": (1200, 1800)
    },
    "comparison": {
        "name": "Comparison/Versus",
        "description": "Side-by-side comparison - ideal for product/service comparisons",
        "structure": [
            ("intro", "What we're comparing and why it matters"),
            ("overview_table", "Quick comparison table with key differences"),
            ("detailed_comparison", "Category-by-category breakdown"),
            ("pros_cons", "Pros and cons of each option"),
            ("verdict", "Final recommendation based on use case"),
            ("faq", "Common questions about choosing between options")
        ],
        "tone": "objective",
        "heading_style": "versus",
        "word_range": (1000, 1400)
    },
    "case_study": {
        "name": "Case Study",
        "description": "Real-world example format - great for demonstrating results",
        "structure": [
            ("overview", "Brief summary of the case and outcome"),
            ("challenge", "The problem or situation that needed solving"),
            ("approach", "The strategy or method used"),
            ("implementation", "How it was executed"),
            ("results", "Measurable outcomes and achievements"),
            ("lessons_learned", "Key takeaways others can apply")
        ],
        "tone": "narrative",
        "heading_style": "story",
        "word_range": (900, 1300)
    },
    "qa_interview": {
        "name": "Q&A / Expert Interview",
        "description": "Question and answer format - feels personal and authoritative",
        "structure": [
            ("intro_context", "Set up who's being interviewed and why (can be fictional expert persona)"),
            ("qa_pairs", "8-12 questions with detailed answers"),
            ("key_takeaways", "Summary of the most important points"),
            ("resources", "Where to learn more")
        ],
        "tone": "conversational",
        "heading_style": "question",
        "word_range": (1000, 1400)
    },
    "news_commentary": {
        "name": "News Commentary",
        "description": "Timely analysis of trends or news - positions as thought leader",
        "structure": [
            ("news_summary", "What happened or what's trending (brief factual summary)"),
            ("context", "Background needed to understand the significance"),
            ("analysis", "Expert interpretation of what this means"),
            ("opinion", "Perspective on the implications"),
            ("what_next", "Predictions or recommended actions")
        ],
        "tone": "journalistic",
        "heading_style": "news",
        "word_range": (800, 1100)
    },
    "ultimate_guide": {
        "name": "Ultimate Guide",
        "description": "Comprehensive resource - the definitive guide on a topic",
        "structure": [
            ("overview", "What this guide covers and who it's for"),
            ("table_of_contents", "Quick navigation to sections"),
            ("fundamentals", "Core concepts everyone needs to know"),
            ("intermediate", "Building on the basics"),
            ("advanced", "Expert-level insights"),
            ("best_practices", "Do's and don'ts from experience"),
            ("resources", "Tools, further reading, next steps"),
            ("faq", "Comprehensive FAQ section")
        ],
        "tone": "comprehensive",
        "heading_style": "chapter",
        "word_range": (1500, 2500)
    }
}

# Voice style configurations for genuine, human-like content
VOICE_STYLES = {
    "professional": {
        "contractions": False,
        "first_person": "we",
        "sentence_complexity": "high",
        "formality": "high",
        "emoji_use": False
    },
    "conversational": {
        "contractions": True,
        "first_person": "I",
        "sentence_complexity": "mixed",
        "formality": "low",
        "emoji_use": False
    },
    "expert": {
        "contractions": False,
        "first_person": "we",
        "sentence_complexity": "high",
        "formality": "medium",
        "jargon_level": "high",
        "emoji_use": False
    },
    "friendly": {
        "contractions": True,
        "first_person": "I",
        "sentence_complexity": "low",
        "formality": "low",
        "emoji_use": True
    }
}

# Human elements configuration for avoiding AI detection
HUMAN_ELEMENTS = {
    "rhetorical_questions": True,
    "conversational_asides": True,
    "opinion_markers": True,
    "uncertainty_markers": True,
    "anecdote_hints": True,
    "transition_variety": True
}

# Search intent types for topic classification (GEO optimization)
SEARCH_INTENTS = {
    "informational": {
        "description": "Educational content - how-to guides, explanations, tutorials",
        "signals": ["how to", "what is", "guide", "tutorial", "learn", "understand"],
        "geo_priority": "high"  # AI search engines love informational content
    },
    "commercial": {
        "description": "Comparison and evaluation - reviews, best-of lists, comparisons",
        "signals": ["best", "top", "vs", "compare", "review", "alternative"],
        "geo_priority": "high"
    },
    "transactional": {
        "description": "Action-oriented - tools, templates, resources, downloads",
        "signals": ["buy", "download", "template", "tool", "free", "get"],
        "geo_priority": "medium"
    },
    "navigational": {
        "description": "Brand/product specific - specific features, documentation",
        "signals": ["login", "pricing", "features", "docs", "support"],
        "geo_priority": "low"
    }
}

# Seasonal content calendar for trending topics
SEASONAL_THEMES = {
    1: ["new year resolutions", "planning", "goals", "fresh start", "winter"],
    2: ["valentine", "love", "relationships", "winter activities"],
    3: ["spring", "renewal", "spring cleaning", "preparation"],
    4: ["spring cleaning", "tax season", "easter", "outdoor activities"],
    5: ["mother's day", "summer prep", "gardening", "outdoor"],
    6: ["summer", "vacation planning", "father's day", "graduation"],
    7: ["summer activities", "travel", "outdoor", "mid-year review"],
    8: ["back to school", "end of summer", "preparation", "planning"],
    9: ["fall", "back to school", "new beginnings", "autumn"],
    10: ["fall activities", "halloween", "preparation", "cozy season"],
    11: ["thanksgiving", "black friday", "holiday prep", "gratitude"],
    12: ["holidays", "year-end", "christmas", "new year prep", "gift guides"]
}


class Default(WorkerEntrypoint):
    """Main worker entrypoint for SEO content generation."""

    def _make_options(self, method: str = "GET", headers: dict = None, body: str = None) -> object:
        """Create JS-compatible fetch options."""
        options = {"method": method}
        if headers:
            options["headers"] = headers
        if body:
            options["body"] = body
        return to_js(options, dict_converter=Object.fromEntries)

    async def _parse_json(self, response) -> any:
        """Parse JSON response and convert JsProxy to Python native types."""
        data = await response.json()
        if hasattr(data, 'to_py'):
            return data.to_py()
        return data

    async def _decrypt(self, encrypted_base64: str, key_base64: str) -> str:
        """Decrypt AES-256-GCM encrypted data using WebCrypto API."""
        if not encrypted_base64 or not key_base64:
            return None
        try:
            # Decode base64 to bytes
            encrypted_bytes = base64.b64decode(encrypted_base64)
            key_bytes = base64.b64decode(key_base64)

            # Extract IV (16 bytes), tag (16 bytes), ciphertext
            iv = encrypted_bytes[:16]
            tag = encrypted_bytes[16:32]
            ciphertext = encrypted_bytes[32:]

            # WebCrypto expects ciphertext + tag concatenated
            ciphertext_with_tag = ciphertext + tag

            # Convert to JS Uint8Array
            iv_js = Uint8Array.new(list(iv))
            key_js = Uint8Array.new(list(key_bytes))
            data_js = Uint8Array.new(list(ciphertext_with_tag))

            # Import the key
            crypto_key = await crypto.subtle.importKey(
                "raw",
                key_js,
                to_js({"name": "AES-GCM"}, dict_converter=Object.fromEntries),
                False,
                to_js(["decrypt"])
            )

            # Decrypt
            decrypted = await crypto.subtle.decrypt(
                to_js({"name": "AES-GCM", "iv": iv_js}, dict_converter=Object.fromEntries),
                crypto_key,
                data_js
            )

            # Convert result to string
            decoder = TextDecoder.new()
            return decoder.decode(decrypted)
        except Exception as e:
            console.log(f"Decryption error: {str(e)}")
            return None

    def _parse_query_params(self, url: str) -> dict:
        """Parse query parameters from URL."""
        params = {}
        if "?" in url:
            query_string = url.split("?")[1]
            for param in query_string.split("&"):
                if "=" in param:
                    key, value = param.split("=", 1)
                    params[key] = value
        return params

    def select_api_provider(
        self,
        website: dict,
        openai_key: str,
        anthropic_key: str,
        purpose: str = "article"
    ) -> tuple:
        """Select API provider with rotation support.

        Supports three modes:
        - 'openai_only': Always use OpenAI
        - 'anthropic_only': Always use Anthropic
        - 'rotate': Alternate between APIs for variety (default)

        Returns: (api_type, api_key) tuple
        """
        api_preference = website.get("api_rotation_mode", "rotate")
        last_api_used = website.get("last_api_used")

        # Determine available APIs
        has_openai = openai_key is not None
        has_anthropic = anthropic_key is not None

        if not has_openai and not has_anthropic:
            return (None, None)

        # Handle specific preferences
        if api_preference == "openai_only" and has_openai:
            return ("openai", openai_key)
        elif api_preference == "anthropic_only" and has_anthropic:
            return ("claude", anthropic_key)

        # Rotation mode (default)
        if api_preference == "rotate" and has_openai and has_anthropic:
            # Alternate based on last API used
            if last_api_used == "openai":
                selected = ("claude", anthropic_key)
            elif last_api_used == "claude":
                selected = ("openai", openai_key)
            else:
                # Random initial selection for variety
                selected = random.choice([
                    ("openai", openai_key),
                    ("claude", anthropic_key)
                ])

            console.log(f"API rotation: last={last_api_used}, selected={selected[0]} for {purpose}")
            return selected

        # Fallback: use whatever is available
        if has_openai:
            return ("openai", openai_key)
        return ("claude", anthropic_key)

    def get_current_seasonal_themes(self) -> list:
        """Get seasonal themes for the current month."""
        current_month = datetime.now().month
        return SEASONAL_THEMES.get(current_month, [])

    def classify_search_intent(self, topic_title: str, keywords: list = None) -> str:
        """Classify the search intent of a topic for GEO optimization."""
        text_to_check = topic_title.lower()
        if keywords:
            text_to_check += " " + " ".join(keywords).lower()

        for intent, config in SEARCH_INTENTS.items():
            for signal in config["signals"]:
                if signal in text_to_check:
                    return intent

        # Default to informational (best for GEO)
        return "informational"

    async def on_fetch(self, request):
        """Handle HTTP requests (for manual triggers and health checks)."""
        url = request.url
        params = self._parse_query_params(url)
        website_id = params.get("website_id")

        # Handle CORS preflight requests
        if request.method == "OPTIONS":
            return Response("", headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",  # Cache preflight for 24 hours
            })

        try:
            if "/health" in url:
                return Response(json.dumps({
                    "status": "healthy",
                    "service": "seo-content-generator",
                    "timestamp": datetime.now().isoformat()
                }), headers={"Content-Type": "application/json"})

            if "/trigger" in url or "/generate" in url:
                # Support single-website generation
                if website_id:
                    result = await self.generate_for_single_website(website_id)
                else:
                    result = await self.run_generation()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            if "/discover-topics" in url or "/discover" in url:
                # Support single-website discovery with custom count
                if website_id:
                    count = int(params.get("count", "10"))
                    result = await self.discover_for_single_website(website_id, count)
                else:
                    result = await self.discover_all_topics()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            if "/scan-preview" in url:
                # Preview scan - accepts domain directly, returns data without storing
                domain = params.get("domain")
                if domain:
                    # URL decode the domain
                    from urllib.parse import unquote
                    domain = unquote(domain)
                    result = await self.scan_preview(domain)
                else:
                    result = {"error": "domain parameter required", "success": False}
                return Response(json.dumps(result), headers={
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"  # Allow CORS for preview
                })

            if "/scan" in url:
                # Support single-website scanning
                if website_id:
                    result = await self.scan_single_website(website_id)
                else:
                    result = await self.scan_all_websites()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            return Response(json.dumps({
                "message": "SEO Content Generator Worker",
                "endpoints": ["/health", "/trigger", "/generate", "/discover", "/scan", "/scan-preview"],
                "single_website": "Add ?website_id=xxx to target a specific website",
                "preview_scan": "Use /scan-preview?domain=example.com for preview scanning"
            }), headers={"Content-Type": "application/json"})

        except Exception as e:
            console.log(f"Request error: {str(e)}")
            return Response(json.dumps({"error": str(e)}),
                          status=500,
                          headers={"Content-Type": "application/json"})

    async def scheduled(self, event, env, ctx):
        """Handle cron trigger - runs every hour."""
        console.log("Cron triggered: checking for scheduled generations")
        await self.run_generation()

    async def run_generation(self) -> dict:
        """Main generation logic - check websites and generate content."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                console.log("Missing required environment variables")
                return {"error": "Missing environment variables"}

            websites = await self.get_websites_due(supabase_url, supabase_key)

            if not websites:
                console.log("No websites due for generation")
                return {"message": "No websites due for generation", "processed": 0}

            processed = 0
            for website in websites:
                try:
                    success = await self.process_website(
                        website, supabase_url, supabase_key, encryption_key
                    )
                    if success:
                        processed += 1
                except Exception as e:
                    console.log(f"Error processing website {website.get('name')}: {str(e)}")

            return {"message": f"Processed {processed} websites", "processed": processed}

        except Exception as e:
            console.log(f"Generation error: {str(e)}")
            return {"error": str(e)}

    async def get_websites_due(self, supabase_url: str, supabase_key: str) -> list:
        """Fetch websites that are due for content generation."""
        now = datetime.now().isoformat()
        url = f"{supabase_url}/rest/v1/websites?is_active=eq.true&next_scheduled_at=lte.{now}&select=*"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }

        response = await fetch(url, self._make_options("GET", headers))

        if response.ok:
            data = await self._parse_json(response)
            return data if data else []
        return []

    async def process_website(
        self,
        website: dict,
        supabase_url: str,
        supabase_key: str,
        encryption_key: str
    ) -> bool:
        """Process a single website - generate and publish article."""
        website_id = website.get("id")
        console.log(f"Processing website: {website.get('name')}")

        # Get API keys
        api_keys = await self.get_api_keys(website_id, supabase_url, supabase_key)
        if not api_keys:
            console.log(f"No API keys for website {website.get('name')}")
            return False

        # Decrypt API keys
        openai_key_encrypted = api_keys.get("openai_api_key_encrypted")
        anthropic_key_encrypted = api_keys.get("anthropic_api_key_encrypted")
        target_url = api_keys.get("target_supabase_url")
        target_key_encrypted = api_keys.get("target_supabase_service_key_encrypted")

        if not target_url or not target_key_encrypted:
            console.log("Missing target database credentials")
            return False

        # Decrypt the keys
        openai_key = await self._decrypt(openai_key_encrypted, encryption_key) if openai_key_encrypted else None
        anthropic_key = await self._decrypt(anthropic_key_encrypted, encryption_key) if anthropic_key_encrypted else None
        target_key = await self._decrypt(target_key_encrypted, encryption_key) if target_key_encrypted else None

        console.log(f"Per-website keys - OpenAI: {openai_key is not None}, Anthropic: {anthropic_key is not None}, Target: {target_key is not None}")

        # Fallback to platform keys if no per-website AI keys
        if not openai_key and not anthropic_key:
            platform_openai = getattr(self.env, "PLATFORM_OPENAI_KEY", None)
            platform_anthropic = getattr(self.env, "PLATFORM_ANTHROPIC_KEY", None)

            if platform_openai or platform_anthropic:
                openai_key = platform_openai
                anthropic_key = platform_anthropic
                console.log(f"Using platform keys - OpenAI: {openai_key is not None}, Anthropic: {anthropic_key is not None}")
            else:
                console.log("No AI API keys (per-website or platform)")
                return False

        if not target_key:
            console.log("Target Supabase key decryption failed")
            return False

        # Get next topic (with reuse support)
        topic = await self.get_next_topic(website_id, website, supabase_url, supabase_key, openai_key)
        if not topic:
            console.log(f"No topics available and auto-generation disabled for {website.get('name')}")
            return False

        # Create generation log
        log_id = await self.create_generation_log(
            website_id, topic.get("id"), supabase_url, supabase_key
        )

        # Generate article with API rotation
        api_used, api_key = self.select_api_provider(
            website, openai_key, anthropic_key, purpose="article"
        )

        if not api_key:
            console.log("No API key available after selection")
            return False

        # Try primary API, fallback to other if it fails
        article = await self.generate_article(topic, website, api_used, api_key)

        # Fallback: try the other API if primary fails
        if not article:
            fallback_api = "claude" if api_used == "openai" else "openai"
            fallback_key = anthropic_key if api_used == "openai" else openai_key

            if fallback_key:
                console.log(f"Primary API ({api_used}) failed, trying fallback ({fallback_api})")
                article = await self.generate_article(topic, website, fallback_api, fallback_key)
                if article:
                    api_used = fallback_api  # Update for logging

        if not article:
            await self.update_generation_log(
                log_id, "failed", "Content generation failed (both APIs)", supabase_url, supabase_key
            )
            return False

        # Classify search intent for GEO tracking
        article["search_intent"] = self.classify_search_intent(
            topic.get("title", ""),
            topic.get("keywords", [])
        )

        article = self.optimize_seo(article, website)

        saved = await self.save_article(article, website, target_url, target_key)

        if not saved:
            await self.update_generation_log(
                log_id, "failed", "Failed to save article", supabase_url, supabase_key
            )
            return False

        await self.update_generation_log(
            log_id, "success", None, supabase_url, supabase_key,
            article_title=article.get("title"),
            article_slug=article.get("slug"),
            api_used=api_used,
            seo_score=article.get("seo_score", 0)
        )

        # Mark topic as used (with times_used increment)
        await self.mark_topic_used(topic.get("id"), website, supabase_url, supabase_key)

        # Update schedule with time variation, format tracking, and API rotation
        await self.update_website_schedule(
            website_id,
            website.get("days_between_posts", 3),
            supabase_url,
            supabase_key,
            website=website,
            content_format=article.get("content_format"),
            api_used=api_used
        )

        console.log(f"Successfully generated: {article.get('title')} (format: {article.get('content_format', 'default')})")
        return True

    async def get_api_keys(self, website_id: str, supabase_url: str, supabase_key: str) -> Optional[dict]:
        """Fetch API keys for a website."""
        url = f"{supabase_url}/rest/v1/api_keys?website_id=eq.{website_id}&select=*"

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }

        response = await fetch(url, self._make_options("GET", headers))

        if response.ok:
            data = await self._parse_json(response)
            return dict(data[0]) if data and len(data) > 0 else None
        return None

    async def get_next_topic(
        self,
        website_id: str,
        website: dict,
        supabase_url: str,
        supabase_key: str,
        openai_key: str = None
    ) -> Optional[dict]:
        """Get the next topic for a website.

        Supports:
        - Topic reuse (max_topic_uses setting)
        - Auto-generation when no topics (auto_generate_topics setting)
        - Context-aware generation using website scan data
        """
        max_uses = website.get("max_topic_uses", 1)
        auto_generate = website.get("auto_generate_topics", False)

        # First try to get unused topic
        url = f"{supabase_url}/rest/v1/topics?website_id=eq.{website_id}&is_used=eq.false&order=priority.desc&limit=1"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }

        response = await fetch(url, self._make_options("GET", headers))

        if response.ok:
            data = await self._parse_json(response)
            if data and len(data) > 0:
                return dict(data[0])

        # If max_uses > 1, try to get reusable topic
        if max_uses > 1:
            url = f"{supabase_url}/rest/v1/topics?website_id=eq.{website_id}&times_used=lt.{max_uses}&order=priority.desc,times_used.asc&limit=1"
            response = await fetch(url, self._make_options("GET", headers))

            if response.ok:
                data = await self._parse_json(response)
                if data and len(data) > 0:
                    return dict(data[0])

        # If auto_generate is enabled and we have an API key, generate a topic
        if auto_generate and openai_key:
            console.log("No topics available, auto-generating with context...")

            # Get scan data for context-aware generation
            scan_data = await self.get_website_scan(website_id, supabase_url, supabase_key)

            topic = await self.generate_topic_with_ai(website, openai_key, scan_data)
            if topic:
                # Add discovery context if scan data was used
                if scan_data:
                    topic["discovery_context"] = {
                        "used_scan_data": True,
                        "niche": scan_data.get("niche_description"),
                        "themes_used": scan_data.get("content_themes", [])[:3]
                    }
                # Save the generated topic
                saved_topic = await self.save_generated_topic(website_id, topic, supabase_url, supabase_key)
                return saved_topic

        return None

    async def generate_topic_with_ai(
        self,
        website: dict,
        api_key: str,
        scan_data: dict = None
    ) -> Optional[dict]:
        """Generate a topic using GPT-4o with optional scan context."""

        # Build context-aware prompt if scan data is available
        if scan_data and scan_data.get("niche_description"):
            prompt = f"""Generate a single blog topic for this website.

WEBSITE CONTEXT (from actual website scan):
- Website Name: {website.get('name')}
- Domain: {website.get('domain')}
- Niche: {scan_data.get('niche_description', 'N/A')}
- Main Themes: {', '.join(scan_data.get('content_themes', [])[:5])}
- Key Topics Found: {', '.join(scan_data.get('main_keywords', [])[:10])}
- Sample Headings: {', '.join(scan_data.get('headings', [])[:5])}

IMPORTANT: The topic MUST be relevant to the actual website content described above.
Do NOT generate generic topics based only on the domain name.

Language: {website.get('language', 'en-US')}

Return ONLY a JSON object (no markdown, no code blocks):
{{"title": "Blog Post Title Here", "keywords": ["keyword1", "keyword2", "keyword3"], "category": "category_name", "priority": 7}}"""
        else:
            # Fallback to basic prompt without scan data
            prompt = f"""Generate a single blog topic for a website about: {website.get('name')}
Domain: {website.get('domain')}
Language: {website.get('language', 'en-US')}

The topic should be:
- Relevant and timely
- SEO-optimized
- Engaging for readers

Return ONLY a JSON object (no markdown, no code blocks):
{{"title": "Blog Post Title Here", "keywords": ["keyword1", "keyword2", "keyword3"], "category": "category_name", "priority": 7}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        body = json.dumps({
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "You are a content strategist. Return only valid JSON, no markdown."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.8
        })

        try:
            response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                self._make_options("POST", headers, body)
            )

            if response.ok:
                data = await self._parse_json(response)
                content = data["choices"][0]["message"]["content"]
                # Clean up potential markdown formatting
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                return json.loads(content)
            else:
                error = await response.text()
                console.log(f"Topic generation error: {error}")
                return None
        except Exception as e:
            console.log(f"Topic generation failed: {str(e)}")
            return None

    async def save_generated_topic(
        self,
        website_id: str,
        topic: dict,
        supabase_url: str,
        supabase_key: str
    ) -> Optional[dict]:
        """Save a generated topic to the database with enhanced metadata for SEO/GEO."""
        data = {
            "website_id": website_id,
            "title": topic.get("title"),
            "keywords": topic.get("keywords", []),
            "category": topic.get("category", "general"),
            "priority": topic.get("priority", 5),
            "source": topic.get("source", "ai_generated"),
            "is_used": False,
            "times_used": 0,
            "discovery_context": topic.get("discovery_context", {}),
            # Enhanced SEO/GEO fields
            "format_type": topic.get("format_type"),
            "timeliness": topic.get("timeliness", "evergreen"),
            "trending_reason": topic.get("trending_reason")
        }

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        response = await fetch(
            f"{supabase_url}/rest/v1/topics",
            self._make_options("POST", headers, json.dumps(data))
        )

        if response.ok:
            result = await self._parse_json(response)
            return dict(result[0]) if result else None
        return None

    async def discover_all_topics(self) -> dict:
        """Discover topics for all active websites."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                return {"error": "Missing environment variables"}

            # Get all active websites
            url = f"{supabase_url}/rest/v1/websites?is_active=eq.true&select=*"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }

            response = await fetch(url, self._make_options("GET", headers))

            if not response.ok:
                return {"error": "Failed to fetch websites"}

            websites = list(await self._parse_json(response))
            console.log(f"Discovering topics for {len(websites)} websites")
            discovered = 0

            for website in websites:
                api_keys = await self.get_api_keys(website.get("id"), supabase_url, supabase_key)
                if api_keys and api_keys.get("openai_api_key_encrypted"):
                    # Decrypt the API key before using
                    openai_key = await self._decrypt(api_keys.get("openai_api_key_encrypted"), encryption_key)
                    if not openai_key:
                        console.log(f"Failed to decrypt OpenAI key for {website.get('name')}")
                        continue

                    # First ensure website is scanned (for context-aware discovery)
                    existing_scan = await self.get_website_scan(website.get("id"), supabase_url, supabase_key)
                    if not existing_scan or existing_scan.get("scan_status") != "completed":
                        console.log(f"Scanning {website.get('name')} before topic discovery...")
                        await self.scan_website(website, openai_key, supabase_url, supabase_key)

                    # Discover topics with scan context and Google Search
                    topics = await self.discover_topics_for_website(
                        website,
                        openai_key,
                        supabase_url,
                        supabase_key,
                        encryption_key  # Pass for Google Search API
                    )
                    if topics:
                        console.log(f"Discovered {len(topics)} topics for {website.get('name')}")
                    discovered += len(topics) if topics else 0
                else:
                    console.log(f"Skipping {website.get('name')} - no OpenAI API key")

            return {"message": f"Discovered {discovered} topics", "discovered": discovered}

        except Exception as e:
            console.log(f"Discovery error: {str(e)}")
            return {"error": str(e)}

    async def discover_topics_for_website(
        self,
        website: dict,
        api_key: str,
        supabase_url: str,
        supabase_key: str,
        encryption_key: str = None
    ) -> list:
        """Discover multiple topics for a website using scan data, Google Search, and GPT-4o."""

        # Get scan data for context-aware discovery
        scan_data = await self.get_website_scan(website.get("id"), supabase_url, supabase_key)

        all_topics = []

        # 1. Try Google Custom Search API if enabled and configured
        # Keys are stored as Cloudflare secrets (faster, no DB lookup needed)
        google_api_key = getattr(self.env, 'GOOGLE_SEARCH_API_KEY', None)
        google_cx_id = getattr(self.env, 'GOOGLE_SEARCH_CX_ID', None)

        if website.get("google_search_enabled", True) and google_api_key and google_cx_id and scan_data:
            console.log(f"Discovering topics from Google Search for {website.get('name')}")
            google_topics = await self.discover_topics_from_search(
                website, scan_data, google_api_key, google_cx_id, supabase_url, supabase_key
            )
            all_topics.extend(google_topics)
            console.log(f"Found {len(google_topics)} topics from Google Search")

        # 2. Generate AI topics with enhanced context for SEO and GEO
        seasonal_themes = self.get_current_seasonal_themes()
        seasonal_hint = f"- Current Season Themes: {', '.join(seasonal_themes[:5])}" if seasonal_themes else ""

        if scan_data and scan_data.get("niche_description"):
            prompt = f"""Find 5 highly-targeted blog topics for this website optimized for both Google SEO and AI search engines (ChatGPT, Perplexity, Gemini).

WEBSITE CONTEXT (from actual website scan):
- Website Name: {website.get('name')}
- Domain: {website.get('domain')}
- Niche: {scan_data.get('niche_description', 'N/A')}
- Main Themes: {', '.join(scan_data.get('content_themes', [])[:5])}
- Key Topics Found: {', '.join(scan_data.get('main_keywords', [])[:15])}
- Sample Headings: {', '.join(scan_data.get('headings', [])[:8])}
{seasonal_hint}

TOPIC REQUIREMENTS:
1. Each topic MUST be directly relevant to the scanned website content
2. Include long-tail keywords (3-5 words) that are easier to rank for
3. Mix of search intents: informational (how-to, what-is), commercial (best, reviews), and transactional
4. Consider seasonal relevance where appropriate
5. Titles should be question-based or list-based (great for GEO/AI search)

Language: {website.get('language', 'en-US')}

Return ONLY a JSON object (no markdown):
{{"topics": [{{
  "title": "How to [Action] for [Specific Outcome]",
  "keywords": ["long-tail keyword 1", "keyword 2", "keyword 3"],
  "category": "category_name",
  "priority": 7,
  "search_intent": "informational|commercial|transactional|navigational",
  "timeliness": "evergreen|seasonal|news|trending",
  "format_hint": "listicle|how_to_guide|deep_dive|comparison|case_study|qa_interview|news_commentary|ultimate_guide",
  "trending_reason": "Why this topic is relevant now (or null if evergreen)"
}}]}}"""
        else:
            # Fallback to basic prompt without scan data
            prompt = f"""Find 5 highly-targeted blog topics for a website about: {website.get('name')}
Domain: {website.get('domain')}
Language: {website.get('language', 'en-US')}
{seasonal_hint}

TOPIC REQUIREMENTS:
1. Long-tail keywords (3-5 words) that are easier to rank for
2. Mix of search intents: informational, commercial, transactional
3. Question-based or list-based titles (great for AI search engines)
4. Consider seasonal relevance where appropriate

Return ONLY a JSON object (no markdown):
{{"topics": [{{
  "title": "How to [Action] for [Specific Outcome]",
  "keywords": ["long-tail keyword 1", "keyword 2", "keyword 3"],
  "category": "category_name",
  "priority": 7,
  "search_intent": "informational|commercial|transactional|navigational",
  "timeliness": "evergreen|seasonal|news|trending",
  "format_hint": "listicle|how_to_guide|deep_dive|comparison|case_study|qa_interview|news_commentary|ultimate_guide",
  "trending_reason": "Why this topic is relevant now (or null if evergreen)"
}}]}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        body = json.dumps({
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "You are a content strategist. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1500,
            "temperature": 0.8
        })

        try:
            response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                self._make_options("POST", headers, body)
            )

            if response.ok:
                data = await self._parse_json(response)
                content = data["choices"][0]["message"]["content"]
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]

                result = json.loads(content)
                ai_topics = result.get("topics", [])

                # Add discovery context, source, and enhanced metadata to AI topics
                for topic in ai_topics:
                    topic["source"] = "ai_suggested"

                    # Map format_hint to format_type (database column name)
                    if topic.get("format_hint"):
                        topic["format_type"] = topic.pop("format_hint")

                    # Validate and set search intent
                    valid_intents = ["informational", "commercial", "transactional", "navigational"]
                    if topic.get("search_intent") not in valid_intents:
                        # Auto-classify if AI didn't provide valid intent
                        topic["search_intent"] = self.classify_search_intent(
                            topic.get("title", ""),
                            topic.get("keywords", [])
                        )

                    # Validate timeliness
                    valid_timeliness = ["evergreen", "seasonal", "news", "trending"]
                    if topic.get("timeliness") not in valid_timeliness:
                        topic["timeliness"] = "evergreen"

                    # Build discovery context
                    if scan_data:
                        topic["discovery_context"] = {
                            "used_scan_data": True,
                            "niche": scan_data.get("niche_description"),
                            "themes_used": scan_data.get("content_themes", [])[:3],
                            "search_intent": topic.get("search_intent")
                        }

                # Save AI-generated topics
                for topic in ai_topics:
                    saved_topic = await self.save_generated_topic(
                        website.get("id"), topic, supabase_url, supabase_key
                    )
                    if saved_topic:
                        all_topics.append(saved_topic)

                console.log(f"Generated {len(ai_topics)} AI topics for {website.get('name')}")
            else:
                error_text = await response.text()
                console.log(f"OpenAI error: {error_text}")

        except Exception as e:
            console.log(f"AI topic discovery failed: {str(e)}")

        # 3. Save Google Search topics if we have any
        for topic in all_topics:
            if topic.get("source") == "google_search" and not topic.get("id"):
                saved_topic = await self.save_generated_topic(
                    website.get("id"), topic, supabase_url, supabase_key
                )
                if saved_topic:
                    # Replace unsaved topic with saved one
                    idx = all_topics.index(topic)
                    all_topics[idx] = saved_topic

        return all_topics

    async def generate_article(self, topic: dict, website: dict, api_type: str, api_key: str) -> Optional[dict]:
        """Generate article content using AI API with dynamic format selection."""
        # Select content format and build prompt
        content_format = self.select_content_format(website, topic)
        prompt = self.build_prompt(topic, website, content_format)
        system_prompt = website.get(f"system_prompt_{api_type}") or self.get_default_system_prompt(website)

        if api_type == "openai":
            content = await self.call_openai(prompt, system_prompt, api_key)
        else:
            content = await self.call_anthropic(prompt, system_prompt, api_key)

        if not content:
            return None

        article = self.parse_article(content, topic, website)

        # Track the content format used
        if article:
            article["content_format"] = content_format.get("key", "unknown")
            article["voice_style"] = website.get("voice_style", "conversational")

        return article

    async def call_openai(self, prompt: str, system_prompt: str, api_key: str) -> Optional[str]:
        """Call OpenAI API directly via HTTP."""
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            body = json.dumps({
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 4000,
                "temperature": 0.7
            })

            response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                self._make_options("POST", headers, body)
            )

            if response.ok:
                data = await self._parse_json(response)
                return data["choices"][0]["message"]["content"]
            else:
                error = await response.text()
                console.log(f"OpenAI error: {error}")
                return None
        except Exception as e:
            console.log(f"OpenAI call failed: {str(e)}")
            return None

    async def call_anthropic(self, prompt: str, system_prompt: str, api_key: str) -> Optional[str]:
        """Call Anthropic Claude API directly via HTTP."""
        try:
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }

            body = json.dumps({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 4000,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })

            response = await fetch(
                "https://api.anthropic.com/v1/messages",
                self._make_options("POST", headers, body)
            )

            if response.ok:
                data = await self._parse_json(response)
                return data["content"][0]["text"]
            else:
                error = await response.text()
                console.log(f"Anthropic error: {error}")
                return None
        except Exception as e:
            console.log(f"Anthropic call failed: {str(e)}")
            return None

    # =============================================
    # CONTENT FORMAT SELECTION & BUILDING
    # =============================================

    def select_content_format(self, website: dict, topic: dict) -> dict:
        """Select a content format based on website config and randomization.

        Avoids repeating the last few formats used for variety.
        """
        # Get enabled formats from website config (default: all formats)
        enabled_formats = website.get("content_formats", list(CONTENT_FORMATS.keys()))

        # Filter to only valid formats
        valid_formats = [f for f in enabled_formats if f in CONTENT_FORMATS]
        if not valid_formats:
            valid_formats = list(CONTENT_FORMATS.keys())

        # Get recent format history to avoid repetition
        format_history = website.get("format_history", [])
        recent_formats = format_history[-3:] if format_history else []

        # Prefer formats not recently used
        available_formats = [f for f in valid_formats if f not in recent_formats]
        if not available_formats:
            available_formats = valid_formats

        # Random selection
        selected_key = random.choice(available_formats)
        selected_format = CONTENT_FORMATS[selected_key].copy()
        selected_format["key"] = selected_key

        console.log(f"Selected content format: {selected_format['name']}")
        return selected_format

    def _build_structure_instructions(self, content_format: dict, language: str) -> str:
        """Build structure instructions based on the selected format."""
        structure = content_format.get("structure", [])
        word_range = content_format.get("word_range", (800, 1200))

        instructions = []
        instructions.append(f"TARGET WORD COUNT: {word_range[0]}-{word_range[1]} words\n")
        instructions.append("REQUIRED SECTIONS:\n")

        for i, (section_name, section_desc) in enumerate(structure, 1):
            instructions.append(f"{i}. {section_name.upper().replace('_', ' ')}")
            instructions.append(f"   {section_desc}\n")

        return "\n".join(instructions)

    def _get_heading_style_instructions(self, heading_style: str) -> str:
        """Get heading style instructions based on format type."""
        styles = {
            "numbered": "Use numbered headings: '1. First Point', '2. Second Point', etc.",
            "step": "Use step-based headings: 'Step 1: [Action]', 'Step 2: [Action]', etc.",
            "descriptive": "Use descriptive headings that summarize the section content",
            "versus": "Use comparison headings: '[Option A] vs [Option B]', 'Feature Comparison', etc.",
            "story": "Use narrative headings: 'The Challenge', 'The Approach', 'The Results', etc.",
            "question": "Use question headings: 'What is...?', 'How does...?', 'Why should...?'",
            "news": "Use journalistic headings: 'What Happened', 'Why It Matters', 'What's Next'",
            "chapter": "Use chapter-style headings: 'Chapter 1: Getting Started', or 'Part 1: Fundamentals'"
        }
        return styles.get(heading_style, "Use clear, descriptive headings")

    def _get_tone_instructions(self, tone: str, voice_style: str) -> str:
        """Get tone and voice instructions based on format and website config."""
        voice_config = VOICE_STYLES.get(voice_style, VOICE_STYLES["conversational"])

        instructions = []

        # Base tone
        tone_mapping = {
            "energetic": "Write with energy and enthusiasm. Use active verbs and exciting language.",
            "instructional": "Write clearly and didactically. Guide the reader step by step.",
            "analytical": "Write thoughtfully and thoroughly. Support claims with evidence and reasoning.",
            "objective": "Write balanced and fair. Present multiple perspectives before concluding.",
            "narrative": "Write engagingly like telling a story. Use vivid details and build tension.",
            "conversational": "Write like you're talking to a friend. Be warm and approachable.",
            "journalistic": "Write factually and concisely. Lead with the most important information.",
            "comprehensive": "Write thoroughly and authoritatively. Cover all aspects of the topic."
        }
        instructions.append(tone_mapping.get(tone, "Write naturally and engagingly."))

        # Voice specifics
        if voice_config.get("contractions"):
            instructions.append("Use contractions naturally (don't, won't, I'm, you're, it's).")
        else:
            instructions.append("Avoid contractions for a more formal tone.")

        first_person = voice_config.get("first_person", "we")
        if first_person == "I":
            instructions.append("Write in first person singular (I, my, me) as if sharing personal experience.")
        else:
            instructions.append("Write in first person plural (we, our, us) representing the team/company.")

        return "\n".join(instructions)

    def _get_genuineness_instructions(self, website: dict) -> str:
        """Get instructions for human-like, genuine writing that avoids AI detection."""
        human_config = website.get("human_elements", HUMAN_ELEMENTS)

        instructions = [
            "\nWRITING STYLE FOR AUTHENTICITY (CRITICAL - Read Carefully):",
            "",
            "To sound human and avoid robotic AI patterns:"
        ]

        if human_config.get("rhetorical_questions", True):
            instructions.append("- Ask rhetorical questions occasionally: 'But what does this actually mean?', 'Sound familiar?'")

        if human_config.get("conversational_asides", True):
            instructions.append("- Include conversational asides: 'Here's the thing...', 'Now,', 'Look,', 'Honestly,'")

        if human_config.get("opinion_markers", True):
            instructions.append("- Share opinions naturally: 'In my experience...', 'I've found that...', 'What I like about...'")

        if human_config.get("uncertainty_markers", True):
            instructions.append("- Use natural uncertainty: 'It seems', 'In most cases', 'Typically', 'Often'")

        if human_config.get("anecdote_hints", True):
            instructions.append("- Reference experiences: 'I remember when...', 'A common situation is...', 'Many people find...'")

        instructions.extend([
            "",
            "ANTI-AI-DETECTION RULES:",
            "- Vary paragraph length: mix short (1-2 sentences) with longer paragraphs",
            "- DON'T start multiple sentences with 'The', 'This', 'It', or 'There'",
            "- DON'T use 'Additionally', 'Furthermore', 'Moreover' repeatedly",
            "- Use natural keyword density (1-2%) - don't force keywords",
            "- Mix sentence lengths: some short and punchy, others more complex",
            "- Include occasional tangents or related thoughts",
            "- Don't be exhaustively comprehensive - real writers skip obvious things",
            "- Vary your transitions: 'That said,', 'On the flip side,', 'Here's where it gets interesting,'"
        ])

        return "\n".join(instructions)

    def _get_geo_instructions(self, topic: dict) -> str:
        """Get instructions for GEO (Generative Engine Optimization) - optimizing for AI search engines.

        AI search engines like ChatGPT, Perplexity, and Gemini prefer:
        - Clear, cite-able summaries
        - Structured Q&A content
        - Factual, authoritative information
        - Easy-to-extract key points
        """
        search_intent = topic.get("discovery_context", {}).get("search_intent") or \
                       self.classify_search_intent(topic.get("title", ""), topic.get("keywords", []))

        instructions = [
            "\nGEO OPTIMIZATION (For AI Search Engines like ChatGPT, Perplexity, Gemini):",
            "",
            "REQUIRED FOR AI CITATION:",
            "- Start with a 40-60 word summary that directly answers the main question",
            "- Include a clear FAQ section with 3-5 Q&A pairs at the end",
            "- Format FAQs as: <h3>Question here?</h3> followed by <p>Direct answer...</p>",
            "- Use bullet points for lists of features, steps, or comparisons",
            "- Include specific numbers, statistics, or data points where relevant",
            "- Make key statements quotable (clear, standalone sentences)",
            "",
            "STRUCTURED CONTENT FOR AI PARSING:",
            "- Use descriptive headings that could be questions: 'What is X?', 'How does X work?'",
            "- Keep paragraphs focused on single concepts (easier for AI to extract)",
            "- Include a 'Key Takeaways' or 'Summary' section with 3-5 bullet points",
            "- Define terms when introducing them (AI citation-friendly)",
        ]

        # Add intent-specific guidance
        if search_intent == "informational":
            instructions.extend([
                "",
                "INFORMATIONAL INTENT OPTIMIZATION:",
                "- Lead with the direct answer, then expand",
                "- Include 'What is', 'How to', 'Why' structured sections",
                "- Add a step-by-step process where applicable"
            ])
        elif search_intent == "commercial":
            instructions.extend([
                "",
                "COMMERCIAL INTENT OPTIMIZATION:",
                "- Include comparison criteria and clear recommendations",
                "- List pros/cons in structured format",
                "- Add a 'Best for...' or 'Verdict' section"
            ])
        elif search_intent == "transactional":
            instructions.extend([
                "",
                "TRANSACTIONAL INTENT OPTIMIZATION:",
                "- Highlight key features and benefits early",
                "- Include clear call-to-action elements",
                "- Add pricing or value comparison if relevant"
            ])

        return "\n".join(instructions)

    def build_prompt(self, topic: dict, website: dict, content_format: dict = None) -> str:
        """Build the content generation prompt with dynamic format and genuineness."""
        keywords = ", ".join(topic.get("keywords", [])) if topic.get("keywords") else ""

        # Select format if not provided
        if not content_format:
            content_format = self.select_content_format(website, topic)

        # Get voice style
        voice_style = website.get("voice_style", "conversational")

        # Build all the dynamic sections
        structure_instructions = self._build_structure_instructions(
            content_format,
            website.get('language', 'en-US')
        )
        heading_instructions = self._get_heading_style_instructions(content_format.get("heading_style", "descriptive"))
        tone_instructions = self._get_tone_instructions(content_format.get("tone", "conversational"), voice_style)
        genuineness_instructions = self._get_genuineness_instructions(website)
        geo_instructions = self._get_geo_instructions(topic)

        return f"""Write a {content_format['name']} style blog article.

TOPIC: {topic.get('title')}
TARGET KEYWORDS: {keywords}
LANGUAGE: {website.get('language', 'en-US')}
CATEGORY: {topic.get('category', 'general')}
FORMAT: {content_format['name']} - {content_format.get('description', '')}

{structure_instructions}

HEADING STYLE:
{heading_instructions}

TONE & VOICE:
{tone_instructions}
{genuineness_instructions}
{geo_instructions}

CRITICAL FORMATTING RULES:
- Output ONLY the article content - no wrapper or meta text
- Do NOT wrap in markdown code blocks (no ```)
- Do NOT include <!DOCTYPE>, <html>, <head>, <body>, <meta>, or <title> tags
- Do NOT start with "Here is the article" or any meta-commentary
- Do NOT add HTML comments
- Use semantic HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <div>, <strong>, <em>
- Start DIRECTLY with the first section content

BEGIN THE ARTICLE NOW:"""

    def get_default_system_prompt(self, website: dict) -> str:
        """Get default system prompt with genuineness instructions."""
        voice_style = website.get("voice_style", "conversational")
        voice_config = VOICE_STYLES.get(voice_style, VOICE_STYLES["conversational"])

        # Build personality based on voice style
        if voice_style == "professional":
            personality = "You write with authority and precision, using formal language."
        elif voice_style == "expert":
            personality = "You write as a subject matter expert, comfortable with technical details."
        elif voice_style == "friendly":
            personality = "You write like a helpful friend, warm and encouraging."
        else:  # conversational
            personality = "You write naturally like a knowledgeable colleague sharing insights."

        return f"""You are an expert content writer for {website.get('name', 'a professional website')}.
{personality}

Your content philosophy:
- Provide genuine value - don't just fill space
- Write for humans first, search engines second
- Be specific rather than generic
- Share insights that come from real experience
- Engage readers with your unique perspective

Writing rules:
- Output clean semantic HTML only
- Never wrap content in code blocks
- Never include document structure tags (html, head, body)
- Never add meta-commentary about the article
- Vary your sentence structure and paragraph lengths naturally"""

    def clean_content(self, content: str, title: str) -> str:
        """Clean AI output: remove code blocks, document structure, meta-commentary."""
        import re

        # 1. Remove markdown code blocks (```html ... ``` or ```json ... ```)
        content = re.sub(r'```\w*\n?', '', content)
        content = re.sub(r'```', '', content)

        # 2. Remove full HTML document structure tags
        content = re.sub(r'<!DOCTYPE[^>]*>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<html[^>]*>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'</html>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<head>.*?</head>', '', content, flags=re.IGNORECASE | re.DOTALL)
        content = re.sub(r'<body[^>]*>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'</body>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<meta[^>]*/?>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<title>.*?</title>', '', content, flags=re.IGNORECASE | re.DOTALL)
        content = re.sub(r'<header>.*?</header>', '', content, flags=re.IGNORECASE | re.DOTALL)

        # 3. Remove AI meta-commentary patterns
        meta_patterns = [
            r'^Here is the \d*\+? ?word .*?:?\s*\n+',
            r'^Here\'s the .*? article.*?:?\s*\n+',
            r'^Below is .*?:?\s*\n+',
            r'^I\'ve written .*?:?\s*\n+',
            r'^The following is .*?:?\s*\n+',
            r'^This is .*? article.*?:?\s*\n+',
            r'^\[.*?word.*?article.*?\]\s*\n+',
        ]
        for pattern in meta_patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.MULTILINE)

        # 4. Remove HTML comments (internal linking suggestions, etc.)
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)

        # 5. Remove the title if it appears at the beginning (duplicate of h1)
        if title:
            content = re.sub(rf'^#?\s*{re.escape(title)}\s*\n', '', content, flags=re.IGNORECASE)

        # 6. Convert markdown-style headers to HTML (if AI still uses markdown)
        content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
        content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
        content = re.sub(r'^\* (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)
        content = re.sub(r'^- (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)

        # 7. Clean up excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = content.strip()

        return content

    def parse_article(self, content: str, topic: dict, website: dict) -> dict:
        """Parse AI response into article structure."""
        # Generate slug from topic title
        slug = topic.get("title", "").lower()
        slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
        slug = "-".join(slug.split())[:60]

        # Extract title before cleaning (may be in h1/h2)
        title = topic.get("title")
        if "<h1>" in content:
            start = content.find("<h1>") + 4
            end = content.find("</h1>")
            if end > start:
                title = content[start:end].strip()
        elif "<h2>" in content:
            start = content.find("<h2>") + 4
            end = content.find("</h2>")
            if end > start:
                title = content[start:end].strip()

        # Clean the content: remove code blocks, document structure, meta-commentary
        cleaned_content = self.clean_content(content, title)

        # Generate excerpt from cleaned content (strip HTML tags for text)
        text_content = cleaned_content
        for tag in ["<h1>", "</h1>", "<h2>", "</h2>", "<h3>", "</h3>", "<p>", "</p>",
                    "<ul>", "</ul>", "<li>", "</li>", "<div>", "</div>",
                    "<strong>", "</strong>", "<em>", "</em>", "<section>", "</section>"]:
            text_content = text_content.replace(tag, " ")
        # Also remove class attributes from remaining tags
        import re
        text_content = re.sub(r'<[^>]+>', ' ', text_content)
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        excerpt = text_content[:200] + "..." if len(text_content) > 200 else text_content

        # Calculate word count and reading time from cleaned content
        word_count = len(cleaned_content.split())
        read_time = max(1, word_count // 200)

        return {
            "title": title,
            "slug": slug,
            "content": cleaned_content,
            "excerpt": excerpt,
            "read_time": read_time,
            "word_count": word_count,
            "topic_id": topic.get("id"),
            "category": topic.get("category"),
            "tags": topic.get("keywords", []),
            "primary_keyword": topic.get("keywords", [""])[0] if topic.get("keywords") else "",
            "author": website.get("default_author", "Team"),
            "language": website.get("language", "en-US"),
        }

    def optimize_seo(self, article: dict, website: dict) -> dict:
        """Apply comprehensive SEO and GEO optimizations to the article.

        Scoring factors (total possible: 100):
        - Title optimization: 20 points
        - Content length & structure: 25 points
        - Meta data: 15 points
        - Keywords: 15 points
        - GEO factors (AI search readiness): 25 points
        """
        import re
        content = article.get("content", "")
        title = article.get("title", "")
        excerpt = article.get("excerpt", "")
        primary_keyword = article.get("primary_keyword", "")
        word_count = article.get("word_count", 0)

        score = 0
        scoring_breakdown = {}

        # === TITLE OPTIMIZATION (20 points) ===
        title_score = 0
        if title:
            # Title length (optimal: 50-60 chars for SERP display)
            title_len = len(title)
            if 50 <= title_len <= 60:
                title_score += 8
            elif 30 <= title_len < 50 or 60 < title_len <= 70:
                title_score += 5
            elif title_len >= 20:
                title_score += 2

            # Keyword in title (front-loaded is better)
            if primary_keyword and primary_keyword.lower() in title.lower():
                keyword_pos = title.lower().find(primary_keyword.lower())
                if keyword_pos < len(title) // 3:  # In first third
                    title_score += 8
                else:
                    title_score += 5

            # Power words in title (engagement boosters)
            power_words = ["how", "why", "what", "best", "guide", "top", "ultimate", "essential", "complete"]
            if any(word in title.lower() for word in power_words):
                title_score += 4

        scoring_breakdown["title"] = title_score
        score += title_score

        # === CONTENT LENGTH & STRUCTURE (25 points) ===
        structure_score = 0

        # Word count (optimal: 1200-2500 for most topics)
        if word_count >= 1500:
            structure_score += 8
        elif word_count >= 1000:
            structure_score += 5
        elif word_count >= 600:
            structure_score += 2

        # Heading structure
        h2_count = len(re.findall(r'<h2[^>]*>', content, re.IGNORECASE))
        h3_count = len(re.findall(r'<h3[^>]*>', content, re.IGNORECASE))

        if h2_count >= 3:
            structure_score += 5
        elif h2_count >= 2:
            structure_score += 3

        if h3_count >= 2:
            structure_score += 4
        elif h3_count >= 1:
            structure_score += 2

        # Lists presence (good for readability and featured snippets)
        has_ul = '<ul' in content.lower()
        has_ol = '<ol' in content.lower()
        if has_ul or has_ol:
            structure_score += 4

        # Paragraph variety (not all same length)
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', content, re.DOTALL | re.IGNORECASE)
        if len(paragraphs) >= 5:
            structure_score += 4
        elif len(paragraphs) >= 3:
            structure_score += 2

        scoring_breakdown["structure"] = structure_score
        score += structure_score

        # === META DATA (15 points) ===
        meta_score = 0

        # Meta description
        meta_desc = excerpt[:160] if excerpt else ""
        if meta_desc:
            meta_len = len(meta_desc)
            if 120 <= meta_len <= 160:
                meta_score += 8
            elif 80 <= meta_len < 120:
                meta_score += 5
            else:
                meta_score += 2

            # Keyword in meta description
            if primary_keyword and primary_keyword.lower() in meta_desc.lower():
                meta_score += 4

        # Has excerpt/summary
        if excerpt and len(excerpt) >= 50:
            meta_score += 3

        scoring_breakdown["meta"] = meta_score
        score += meta_score

        # === KEYWORD OPTIMIZATION (15 points) ===
        keyword_score = 0

        if primary_keyword and content:
            # Keyword density (optimal: 1-2%)
            keyword_lower = primary_keyword.lower()
            content_lower = content.lower()
            keyword_count = content_lower.count(keyword_lower)
            words_in_content = len(content.split())

            if words_in_content > 0:
                density = (keyword_count * len(keyword_lower.split())) / words_in_content * 100
                if 0.5 <= density <= 2.5:
                    keyword_score += 8
                elif 0.2 <= density < 0.5 or 2.5 < density <= 4:
                    keyword_score += 4

            # Keyword in first paragraph
            first_para_match = re.search(r'<p[^>]*>(.*?)</p>', content, re.DOTALL | re.IGNORECASE)
            if first_para_match and keyword_lower in first_para_match.group(1).lower():
                keyword_score += 4

            # Keyword in headings
            heading_text = " ".join(re.findall(r'<h[23][^>]*>(.*?)</h[23]>', content, re.IGNORECASE))
            if keyword_lower in heading_text.lower():
                keyword_score += 3

        scoring_breakdown["keywords"] = keyword_score
        score += keyword_score

        # === GEO FACTORS - AI SEARCH READINESS (25 points) ===
        geo_score = 0

        # FAQ section presence (critical for AI citations)
        has_faq = bool(re.search(r'<h[23][^>]*>[^<]*(?:FAQ|Frequently Asked|Questions)[^<]*</h[23]>', content, re.IGNORECASE))
        has_question_headings = len(re.findall(r'<h[23][^>]*>[^<]*\?</h[23]>', content)) >= 2

        if has_faq:
            geo_score += 8
        elif has_question_headings:
            geo_score += 5

        # Summary/Key Takeaways section
        has_summary = bool(re.search(r'<h[23][^>]*>[^<]*(?:Summary|Key Takeaways|Conclusion|TL;DR)[^<]*</h[23]>', content, re.IGNORECASE))
        if has_summary:
            geo_score += 5

        # Structured bullet points (easy for AI to extract)
        bullet_points = len(re.findall(r'<li[^>]*>', content))
        if bullet_points >= 5:
            geo_score += 5
        elif bullet_points >= 3:
            geo_score += 3

        # Clear, quotable statements (sentences ending with period after specific words)
        # Look for definitional patterns: "X is", "X means", "X refers to"
        definitional_patterns = len(re.findall(r'(?:is|means|refers to|defined as)[^.]{20,100}\.', content))
        if definitional_patterns >= 2:
            geo_score += 4
        elif definitional_patterns >= 1:
            geo_score += 2

        # Has numbers/statistics (AI loves citing specific data)
        has_numbers = bool(re.search(r'\d+(?:\.\d+)?(?:%|percent|times|x|hours|days|years)', content, re.IGNORECASE))
        if has_numbers:
            geo_score += 3

        scoring_breakdown["geo"] = geo_score
        score += geo_score

        # Set article properties
        article["meta_description"] = meta_desc
        article["seo_score"] = min(100, score)
        article["seo_breakdown"] = scoring_breakdown
        article["geo_optimized"] = geo_score >= 15  # True if GEO score is good

        return article

    async def save_article(self, article: dict, website: dict, target_url: str, target_key: str) -> bool:
        """Save article to target website's Supabase database.

        Handles schema differences by automatically removing missing columns and retrying.
        """
        import re
        now = datetime.now().isoformat()

        # Essential fields that must exist in target schema
        data = {
            "title": article.get("title"),
            "slug": article.get("slug"),
            "content": article.get("content"),
            "status": "published",
            "published_at": now,
            "created_at": now,
        }

        # Optional fields - will be removed if target schema doesn't have them
        optional_fields = {
            "excerpt": article.get("excerpt"),
            "meta_description": article.get("meta_description"),
            "tags": article.get("tags", []),
            "primary_keyword": article.get("primary_keyword"),
            "author": article.get("author"),
            "read_time": article.get("read_time"),
            "category": article.get("category"),
            "seo_score": article.get("seo_score"),
            "product_id": website.get("product_id"),
            "website_domain": website.get("domain"),
            "language": article.get("language"),
            "geo_optimized": article.get("geo_optimized", False),
        }

        # Start with all fields
        data.update(optional_fields)

        headers = {
            "apikey": target_key,
            "Authorization": f"Bearer {target_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # Retry loop - removes missing columns and retries (max 5 retries)
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = await fetch(
                    f"{target_url}/rest/v1/blog_articles",
                    self._make_options("POST", headers, json.dumps(data))
                )

                if response.ok:
                    return True
                else:
                    error_text = await response.text()

                    # Check if error is about missing column (PGRST204)
                    if "PGRST204" in error_text and "column" in error_text:
                        # Extract missing column name from error
                        match = re.search(r"'(\w+)' column", error_text)
                        if match:
                            missing_col = match.group(1)
                            if missing_col in data and missing_col not in ["title", "slug", "content", "status"]:
                                console.log(f"Removing missing column '{missing_col}' and retrying...")
                                del data[missing_col]
                                continue

                    console.log(f"Save article error: {error_text}")
                    return False
            except Exception as e:
                console.log(f"Save article failed: {str(e)}")
                return False

        console.log("Save article failed: max retries exceeded")
        return False

    async def create_generation_log(self, website_id: str, topic_id: str, supabase_url: str, supabase_key: str) -> Optional[str]:
        """Create a generation log entry."""
        data = {
            "website_id": website_id,
            "topic_id": topic_id,
            "status": "generating",
            "started_at": datetime.now().isoformat()
        }

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        response = await fetch(
            f"{supabase_url}/rest/v1/generation_logs",
            self._make_options("POST", headers, json.dumps(data))
        )

        if response.ok:
            result = await self._parse_json(response)
            return result[0].get("id") if result else None
        return None

    async def update_generation_log(
        self,
        log_id: str,
        status: str,
        error_message: Optional[str],
        supabase_url: str,
        supabase_key: str,
        **kwargs
    ):
        """Update a generation log entry."""
        data = {
            "status": status,
            "completed_at": datetime.now().isoformat(),
            **kwargs
        }
        if error_message:
            data["error_message"] = error_message

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }

        await fetch(
            f"{supabase_url}/rest/v1/generation_logs?id=eq.{log_id}",
            self._make_options("PATCH", headers, json.dumps(data))
        )

    async def mark_topic_used(self, topic_id: str, website: dict, supabase_url: str, supabase_key: str):
        """Mark a topic as used with times_used increment."""
        max_uses = website.get("max_topic_uses", 1)

        # First get current times_used
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }

        response = await fetch(
            f"{supabase_url}/rest/v1/topics?id=eq.{topic_id}&select=times_used",
            self._make_options("GET", headers)
        )

        times_used = 0
        if response.ok:
            data = await self._parse_json(response)
            if data and len(data) > 0:
                times_used = dict(data[0]).get("times_used", 0)

        new_times_used = times_used + 1
        is_used = new_times_used >= max_uses

        data = {
            "times_used": new_times_used,
            "is_used": is_used,
            "used_at": datetime.now().isoformat()
        }

        headers["Content-Type"] = "application/json"

        await fetch(
            f"{supabase_url}/rest/v1/topics?id=eq.{topic_id}",
            self._make_options("PATCH", headers, json.dumps(data))
        )

    def calculate_next_schedule(self, website: dict) -> datetime:
        """Calculate next posting time with time variation support.

        Supports multiple scheduling modes:
        - fixed: Same time every post (original behavior)
        - window: Random time within a daily window
        - random: Fully randomized times within constraints
        """
        mode = website.get("time_variation_mode", "fixed")
        min_hours = website.get("min_hours_between_posts", 24)
        max_hours = website.get("max_hours_between_posts", 96)
        preferred_days = website.get("preferred_days", ["monday", "tuesday", "wednesday", "thursday", "friday"])
        window_start = website.get("posting_window_start", "08:00")
        window_end = website.get("posting_window_end", "18:00")
        last_hour = website.get("last_posting_hour")

        now = datetime.now()

        if mode == "fixed":
            # Original behavior - fixed interval
            days = website.get("days_between_posts", 3)
            preferred_time = website.get("preferred_time", "09:00:00")
            next_date = now + timedelta(days=days)

            # Parse preferred time
            try:
                time_parts = preferred_time.split(":")
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                return next_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            except:
                return next_date

        elif mode == "window":
            # Random time within daily window
            hours_offset = random.randint(min_hours, max_hours)
            next_date = now + timedelta(hours=hours_offset)

            # Parse window times
            try:
                start_hour = int(window_start.split(":")[0])
                end_hour = int(window_end.split(":")[0])
            except:
                start_hour, end_hour = 8, 18

            # Ensure it falls on a preferred day (if configured)
            if preferred_days:
                day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                attempts = 0
                while next_date.strftime("%A").lower() not in preferred_days and attempts < 7:
                    next_date += timedelta(days=1)
                    attempts += 1

            # Random time within window, avoiding same hour as last time
            available_hours = [h for h in range(start_hour, end_hour + 1)]
            if last_hour is not None and last_hour in available_hours and len(available_hours) > 1:
                available_hours.remove(last_hour)

            random_hour = random.choice(available_hours) if available_hours else random.randint(start_hour, end_hour)
            random_minute = random.randint(0, 59)

            return next_date.replace(hour=random_hour, minute=random_minute, second=0, microsecond=0)

        elif mode == "random":
            # Fully random within constraints
            hours_offset = random.randint(min_hours, max_hours)
            random_hour = random.randint(6, 22)  # Reasonable hours (6 AM - 10 PM)
            random_minute = random.randint(0, 59)

            next_date = now + timedelta(hours=hours_offset)
            return next_date.replace(hour=random_hour, minute=random_minute, second=0, microsecond=0)

        # Fallback - 3 days from now
        return now + timedelta(days=3)

    async def update_website_schedule(
        self,
        website_id: str,
        days: int,
        supabase_url: str,
        supabase_key: str,
        website: dict = None,
        content_format: str = None,
        api_used: str = None
    ):
        """Update website schedule after generation with time variation, format tracking, and API rotation."""
        now = datetime.now()

        # Calculate next schedule with variation if website config provided
        if website:
            next_scheduled = self.calculate_next_schedule(website)
            current_hour = now.hour

            # Update format history (keep last 10)
            format_history = website.get("format_history", [])
            if content_format:
                format_history.append(content_format)
                format_history = format_history[-10:]  # Keep last 10

            data = {
                "last_generated_at": now.isoformat(),
                "next_scheduled_at": next_scheduled.isoformat(),
                "last_posting_hour": current_hour,
                "format_history": format_history
            }

            # Track last API used for rotation
            if api_used:
                data["last_api_used"] = api_used
        else:
            # Fallback to simple scheduling
            next_scheduled = now + timedelta(days=days)
            data = {
                "last_generated_at": now.isoformat(),
                "next_scheduled_at": next_scheduled.isoformat(),
            }
            if api_used:
                data["last_api_used"] = api_used

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }

        await fetch(
            f"{supabase_url}/rest/v1/websites?id=eq.{website_id}",
            self._make_options("PATCH", headers, json.dumps(data))
        )

        console.log(f"Next generation scheduled for: {next_scheduled.isoformat()}")

    # =============================================
    # WEBSITE SCANNING FUNCTIONS
    # =============================================

    async def scan_all_websites(self) -> dict:
        """Scan all active websites to extract content themes and keywords."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                return {"error": "Missing environment variables"}

            # Get all active websites with auto_scan_enabled
            url = f"{supabase_url}/rest/v1/websites?is_active=eq.true&auto_scan_enabled=eq.true&select=*"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }

            response = await fetch(url, self._make_options("GET", headers))

            if not response.ok:
                return {"error": "Failed to fetch websites"}

            websites = list(await self._parse_json(response))
            console.log(f"Scanning {len(websites)} websites")
            scanned = 0

            for website in websites:
                try:
                    # Check if scan is needed (based on scan_frequency_days)
                    existing_scan = await self.get_website_scan(
                        website.get("id"), supabase_url, supabase_key
                    )

                    if existing_scan:
                        last_scanned = existing_scan.get("last_scanned_at")
                        if last_scanned:
                            from datetime import datetime
                            try:
                                last_scan_date = datetime.fromisoformat(last_scanned.replace('Z', '+00:00'))
                                days_since = (datetime.now(last_scan_date.tzinfo) - last_scan_date).days
                                scan_frequency = website.get("scan_frequency_days", 7)
                                if days_since < scan_frequency:
                                    console.log(f"Skipping {website.get('name')} - scanned {days_since} days ago")
                                    continue
                            except:
                                pass  # If date parsing fails, proceed with scan

                    # Get API keys for AI analysis
                    api_keys = await self.get_api_keys(website.get("id"), supabase_url, supabase_key)
                    openai_key = None
                    if api_keys and api_keys.get("openai_api_key_encrypted"):
                        openai_key = await self._decrypt(api_keys.get("openai_api_key_encrypted"), encryption_key)

                    success = await self.scan_website(
                        website, openai_key, supabase_url, supabase_key
                    )
                    if success:
                        scanned += 1
                except Exception as e:
                    console.log(f"Error scanning {website.get('name')}: {str(e)}")

            return {"message": f"Scanned {scanned} websites", "scanned": scanned}

        except Exception as e:
            console.log(f"Scan error: {str(e)}")
            return {"error": str(e)}

    async def scan_single_website(self, website_id: str) -> dict:
        """Scan a single website by ID (for onboarding flow)."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                return {"error": "Missing environment variables", "success": False}

            # Fetch website by ID
            url = f"{supabase_url}/rest/v1/websites?id=eq.{website_id}&select=*"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }

            response = await fetch(url, self._make_options("GET", headers))
            if not response.ok:
                return {"error": "Failed to fetch website", "success": False}

            websites = list(await self._parse_json(response))
            if not websites:
                return {"error": "Website not found", "success": False}

            website = dict(websites[0])
            console.log(f"Single website scan: {website.get('name')}")

            # Get API keys for AI analysis
            api_keys = await self.get_api_keys(website_id, supabase_url, supabase_key)
            openai_key = None
            if api_keys and api_keys.get("openai_api_key_encrypted"):
                openai_key = await self._decrypt(api_keys.get("openai_api_key_encrypted"), encryption_key)

            # Fallback to platform key
            if not openai_key:
                openai_key = getattr(self.env, "PLATFORM_OPENAI_KEY", None)

            success = await self.scan_website(website, openai_key, supabase_url, supabase_key)

            if success:
                # Get the scan data to return
                scan_data = await self.get_website_scan(website_id, supabase_url, supabase_key)
                return {
                    "success": True,
                    "website_id": website_id,
                    "message": "Scan completed",
                    "data": scan_data
                }
            else:
                return {"success": False, "website_id": website_id, "error": "Scan failed"}

        except Exception as e:
            console.log(f"Single scan error: {str(e)}")
            return {"error": str(e), "success": False}

    async def scan_preview(self, domain: str) -> dict:
        """Preview scan - analyzes a domain without storing results (for onboarding preview)."""
        import re

        try:
            console.log(f"Preview scanning domain: {domain}")

            # Clean domain
            domain = domain.lower().strip()
            domain = re.sub(r'^https?://', '', domain)
            domain = re.sub(r'^www\.', '', domain)
            domain = domain.rstrip('/')

            # Get platform OpenAI key
            openai_key = getattr(self.env, "PLATFORM_OPENAI_KEY", None)

            # Fetch homepage (with 10s timeout)
            homepage_url = f"https://{domain}"
            console.log(f"[1/4] Fetching homepage: {homepage_url}")
            homepage_html = await self.fetch_page_content(homepage_url, timeout_ms=10000)

            if not homepage_html:
                # Try www variant
                console.log(f"Homepage failed, trying www.{domain}")
                homepage_url = f"https://www.{domain}"
                homepage_html = await self.fetch_page_content(homepage_url, timeout_ms=10000)

            if not homepage_html:
                return {
                    "success": False,
                    "domain": domain,
                    "error": f"Failed to fetch homepage (tried with and without www)"
                }

            console.log(f"[2/4] Extracting metadata from homepage")
            # Extract metadata from homepage
            homepage_data = self.extract_page_metadata(homepage_html, homepage_url)

            # Find navigation links and scan all header pages (up to 6 for good context)
            nav_links = self.identify_navigation_links(homepage_html, domain)
            pages_data = [homepage_data]

            max_pages = min(len(nav_links), 6)
            console.log(f"[3/4] Scanning {max_pages} navigation pages")
            for i, link in enumerate(nav_links[:6]):
                try:
                    # Shorter timeout per page to keep total time reasonable
                    page_html = await self.fetch_page_content(link["url"], timeout_ms=6000)
                    if page_html:
                        page_data = self.extract_page_metadata(page_html, link["url"])
                        pages_data.append(page_data)
                        console.log(f"  ✓ {link['text']}: {link['url']}")
                except:
                    console.log(f"  ✗ Failed: {link['url']}")

            # Compile extracted data
            all_keywords = []
            all_headings = []
            all_titles = []

            for page in pages_data:
                all_keywords.extend(page.get("meta_keywords", []))
                all_headings.extend(page.get("headings", []))
                if page.get("title"):
                    all_titles.append(page["title"])

            # Deduplicate
            all_keywords = list(dict.fromkeys(all_keywords))[:30]
            all_headings = list(dict.fromkeys(all_headings))[:20]

            # If we have OpenAI key, do AI analysis
            niche_description = None
            content_themes = []

            if openai_key and (all_keywords or all_headings or all_titles):
                console.log(f"[4/4] Analyzing content with AI...")
                ai_analysis = await self.analyze_content_with_ai_preview(
                    domain, all_titles, all_headings, all_keywords, openai_key
                )
                if ai_analysis:
                    niche_description = ai_analysis.get("niche_description")
                    content_themes = ai_analysis.get("content_themes", [])
                    console.log(f"  - Niche identified: {niche_description[:50]}..." if niche_description else "  - No niche identified")
            else:
                console.log(f"[4/4] Skipping AI analysis (no API key or no content)")

            return {
                "success": True,
                "domain": domain,
                "data": {
                    "homepage_title": homepage_data.get("title"),
                    "meta_description": homepage_data.get("meta_description"),
                    "niche_description": niche_description,
                    "content_themes": content_themes,
                    "main_keywords": all_keywords[:15],
                    "headings": all_headings[:10],
                    "pages_scanned": len(pages_data)
                }
            }

        except Exception as e:
            console.log(f"Preview scan error: {str(e)}")
            return {"success": False, "domain": domain, "error": str(e)}

    async def analyze_content_with_ai_preview(
        self,
        domain: str,
        titles: list,
        headings: list,
        keywords: list,
        api_key: str
    ) -> dict:
        """Analyze content with AI for preview scan (simplified version)."""
        try:
            prompt = f"""Analyze this website content and identify its niche and main themes.

Domain: {domain}
Page Titles: {', '.join(titles[:5])}
Headings Found: {', '.join(headings[:15])}
Keywords: {', '.join(keywords[:20])}

Return ONLY valid JSON:
{{
    "niche_description": "A 1-2 sentence description of what this website is about",
    "content_themes": ["theme1", "theme2", "theme3", "theme4", "theme5"]
}}"""

            response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                self._make_options("POST", {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }, json.dumps({
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You analyze websites and identify their niche. Return only JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.3
                }))
            )

            if response.ok:
                data = await self._parse_json(response)
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                # Parse JSON from response
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                return json.loads(content)
        except Exception as e:
            console.log(f"AI preview analysis error: {str(e)}")

        return None

    async def discover_for_single_website(self, website_id: str, count: int = 10) -> dict:
        """Discover topics for a single website (for onboarding flow)."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                return {"error": "Missing environment variables", "success": False, "topics": []}

            # Fetch website by ID
            url = f"{supabase_url}/rest/v1/websites?id=eq.{website_id}&select=*"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }

            response = await fetch(url, self._make_options("GET", headers))
            if not response.ok:
                return {"error": "Failed to fetch website", "success": False, "topics": []}

            websites = list(await self._parse_json(response))
            if not websites:
                return {"error": "Website not found", "success": False, "topics": []}

            website = dict(websites[0])
            console.log(f"Discovering {count} topics for: {website.get('name')}")

            # Get API keys
            api_keys = await self.get_api_keys(website_id, supabase_url, supabase_key)
            openai_key = None
            if api_keys and api_keys.get("openai_api_key_encrypted"):
                openai_key = await self._decrypt(api_keys.get("openai_api_key_encrypted"), encryption_key)

            # Fallback to platform key
            if not openai_key:
                openai_key = getattr(self.env, "PLATFORM_OPENAI_KEY", None)

            if not openai_key:
                return {"error": "No OpenAI API key available", "success": False, "topics": []}

            # Ensure website is scanned first
            existing_scan = await self.get_website_scan(website_id, supabase_url, supabase_key)
            if not existing_scan or existing_scan.get("scan_status") != "completed":
                console.log(f"Scanning {website.get('name')} before topic discovery...")
                await self.scan_website(website, openai_key, supabase_url, supabase_key)

            # Discover topics (call multiple times for larger counts)
            all_topics = []
            batches_needed = (count + 4) // 5  # Each call returns ~5 topics
            max_batches = min(batches_needed, 10)  # Cap at 10 batches = 50 topics

            for i in range(max_batches):
                if len(all_topics) >= count:
                    break

                topics = await self.discover_topics_for_website(
                    website, openai_key, supabase_url, supabase_key, encryption_key
                )
                if topics:
                    # Filter duplicates
                    existing_titles = {t.get("title", "").lower() for t in all_topics}
                    new_topics = [t for t in topics if t.get("title", "").lower() not in existing_titles]
                    all_topics.extend(new_topics)
                    console.log(f"Batch {i+1}: discovered {len(new_topics)} new topics")

            # Trim to requested count
            all_topics = all_topics[:count]

            return {
                "success": True,
                "website_id": website_id,
                "topics": all_topics,
                "count": len(all_topics),
                "message": f"Discovered {len(all_topics)} topics"
            }

        except Exception as e:
            console.log(f"Single discover error: {str(e)}")
            return {"error": str(e), "success": False, "topics": []}

    async def generate_for_single_website(self, website_id: str) -> dict:
        """Generate content for a single website (for onboarding flow)."""
        try:
            supabase_url = getattr(self.env, "CENTRAL_SUPABASE_URL", None)
            supabase_key = getattr(self.env, "CENTRAL_SUPABASE_SERVICE_KEY", None)
            encryption_key = getattr(self.env, "ENCRYPTION_KEY", None)

            if not all([supabase_url, supabase_key, encryption_key]):
                return {"error": "Missing environment variables", "success": False}

            # Fetch website by ID
            url = f"{supabase_url}/rest/v1/websites?id=eq.{website_id}&select=*"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }

            response = await fetch(url, self._make_options("GET", headers))
            if not response.ok:
                return {"error": "Failed to fetch website", "success": False}

            websites = list(await self._parse_json(response))
            if not websites:
                return {"error": "Website not found", "success": False}

            website = dict(websites[0])
            console.log(f"Generating content for: {website.get('name')}")

            success = await self.process_website(website, supabase_url, supabase_key, encryption_key)

            if success:
                return {
                    "success": True,
                    "website_id": website_id,
                    "message": "Content generated successfully"
                }
            else:
                return {"success": False, "website_id": website_id, "error": "Generation failed"}

        except Exception as e:
            console.log(f"Single generate error: {str(e)}")
            return {"error": str(e), "success": False}

    async def scan_website(
        self,
        website: dict,
        openai_key: str,
        supabase_url: str,
        supabase_key: str
    ) -> bool:
        """Scan a single website to extract content themes and keywords."""
        import re

        website_id = website.get("id")
        domain = website.get("domain")
        console.log(f"Scanning website: {domain}")

        # Update scan status to 'scanning'
        await self.update_scan_status(website_id, "scanning", supabase_url, supabase_key)

        try:
            # Fetch homepage
            homepage_url = f"https://{domain}"
            homepage_html = await self.fetch_page_content(homepage_url)

            if not homepage_html:
                await self.update_scan_status(
                    website_id, "failed", supabase_url, supabase_key,
                    error_message=f"Failed to fetch homepage: {homepage_url}"
                )
                return False

            # Extract metadata from homepage
            homepage_data = self.extract_page_metadata(homepage_html, homepage_url)

            # Find navigation links to scan more pages
            nav_links = self.identify_navigation_links(homepage_html, domain)
            console.log(f"Found {len(nav_links)} navigation links")

            # Scan additional pages (limit to 5)
            all_headings = list(homepage_data.get("headings", []))
            all_keywords = list(homepage_data.get("keywords", []))
            pages_scanned = 1

            for link in nav_links[:5]:
                try:
                    page_html = await self.fetch_page_content(link["url"])
                    if page_html:
                        page_data = self.extract_page_metadata(page_html, link["url"])
                        all_headings.extend(page_data.get("headings", []))
                        all_keywords.extend(page_data.get("keywords", []))
                        pages_scanned += 1
                except Exception as e:
                    console.log(f"Error scanning {link['url']}: {str(e)}")

            # Remove duplicates
            all_headings = list(set(all_headings))
            all_keywords = list(set(all_keywords))

            # Analyze content with AI to identify niche and themes
            content_themes = []
            niche_description = None

            if openai_key:
                ai_analysis = await self.analyze_content_with_ai(
                    {
                        "title": homepage_data.get("title"),
                        "meta_description": homepage_data.get("meta_description"),
                        "headings": all_headings[:20],  # Limit for prompt size
                        "keywords": all_keywords[:30]
                    },
                    website,
                    openai_key
                )
                if ai_analysis:
                    content_themes = ai_analysis.get("themes", [])
                    niche_description = ai_analysis.get("niche_description")
                    # Add AI-extracted keywords
                    all_keywords.extend(ai_analysis.get("keywords", []))
                    all_keywords = list(set(all_keywords))

            # Save scan results
            scan_data = {
                "homepage_title": homepage_data.get("title"),
                "homepage_meta_description": homepage_data.get("meta_description"),
                "main_keywords": all_keywords[:50],  # Limit stored keywords
                "headings": all_headings[:30],
                "navigation_links": nav_links[:10],
                "content_themes": content_themes,
                "niche_description": niche_description,
                "pages_scanned": pages_scanned,
                "scan_status": "completed",
                "last_scanned_at": datetime.now().isoformat()
            }

            await self.save_scan_results(website_id, scan_data, supabase_url, supabase_key)
            console.log(f"Scan completed for {domain}: {len(all_keywords)} keywords, {len(content_themes)} themes")
            return True

        except Exception as e:
            console.log(f"Scan failed for {domain}: {str(e)}")
            await self.update_scan_status(
                website_id, "failed", supabase_url, supabase_key,
                error_message=str(e)
            )
            return False

    async def fetch_page_content(self, url: str, timeout_ms: int = 10000) -> Optional[str]:
        """Fetch HTML content from a URL with timeout.

        Args:
            url: The URL to fetch
            timeout_ms: Timeout in milliseconds (default 10 seconds)
        """
        from js import AbortController, setTimeout

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0; +https://example.com/bot)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9,nl;q=0.8"
            }

            # Create AbortController for timeout
            controller = AbortController.new()
            timeout_id = setTimeout(lambda: controller.abort(), timeout_ms)

            options = {
                "method": "GET",
                "headers": headers,
                "signal": controller.signal
            }

            response = await fetch(url, to_js(options, dict_converter=Object.fromEntries))

            # Clear timeout if request completed
            from js import clearTimeout
            clearTimeout(timeout_id)

            if response.ok:
                text = await response.text()
                # Handle JsProxy if needed
                if hasattr(text, 'to_py'):
                    return str(text)
                return text
            else:
                console.log(f"Failed to fetch {url}: {response.status}")
                return None
        except Exception as e:
            error_msg = str(e)
            if "abort" in error_msg.lower():
                console.log(f"Timeout fetching {url} after {timeout_ms}ms")
            else:
                console.log(f"Fetch error for {url}: {error_msg}")
            return None

    def extract_page_metadata(self, html: str, url: str) -> dict:
        """Extract title, meta description, headings, and keywords from HTML using regex."""
        import re

        result = {
            "url": url,
            "title": "",
            "meta_description": "",
            "headings": [],
            "keywords": []
        }

        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if title_match:
            result["title"] = self._clean_text(title_match.group(1))

        # Extract meta description
        meta_match = re.search(
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']',
            html, re.IGNORECASE
        )
        if not meta_match:
            meta_match = re.search(
                r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']',
                html, re.IGNORECASE
            )
        if meta_match:
            result["meta_description"] = self._clean_text(meta_match.group(1))

        # Extract h1 headings
        h1_matches = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
        for h in h1_matches:
            cleaned = self._clean_text(h)
            if cleaned and len(cleaned) > 2:
                result["headings"].append(cleaned)

        # Extract h2 headings
        h2_matches = re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.IGNORECASE | re.DOTALL)
        for h in h2_matches:
            cleaned = self._clean_text(h)
            if cleaned and len(cleaned) > 2:
                result["headings"].append(cleaned)

        # Extract keywords from meta keywords tag
        keywords_match = re.search(
            r'<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"\']*)["\']',
            html, re.IGNORECASE
        )
        if keywords_match:
            kws = keywords_match.group(1).split(',')
            result["keywords"].extend([self._clean_text(k) for k in kws if k.strip()])

        # Extract keywords from headings (split on common separators)
        for heading in result["headings"]:
            words = re.split(r'[-–|:,]', heading)
            for word in words:
                word = word.strip().lower()
                if len(word) > 3 and len(word) < 30:
                    result["keywords"].append(word)

        # Extract keywords from title
        if result["title"]:
            words = re.split(r'[-–|:,]', result["title"])
            for word in words:
                word = word.strip().lower()
                if len(word) > 3 and len(word) < 30:
                    result["keywords"].append(word)

        # Remove duplicates
        result["keywords"] = list(set(result["keywords"]))

        return result

    def _clean_text(self, text: str) -> str:
        """Clean HTML text by removing tags and normalizing whitespace."""
        import re
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Decode common HTML entities
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
        return text.strip()

    def identify_navigation_links(self, html: str, base_domain: str) -> list:
        """Find main navigation links to scan (limit to internal pages)."""
        import re

        links = []
        seen_urls = set()

        # Look for links in nav elements
        nav_sections = re.findall(r'<nav[^>]*>(.*?)</nav>', html, re.IGNORECASE | re.DOTALL)

        # Also look in header
        header_sections = re.findall(r'<header[^>]*>(.*?)</header>', html, re.IGNORECASE | re.DOTALL)

        all_sections = nav_sections + header_sections

        for section in all_sections:
            # Find all anchor tags
            anchors = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>', section, re.IGNORECASE | re.DOTALL)

            for href, text in anchors:
                # Skip empty, hash-only, or external links
                if not href or href.startswith('#') or href.startswith('javascript:'):
                    continue

                # Make absolute URL
                if href.startswith('/'):
                    url = f"https://{base_domain}{href}"
                elif href.startswith('http'):
                    # Check if it's same domain
                    if base_domain not in href:
                        continue
                    url = href
                else:
                    url = f"https://{base_domain}/{href}"

                # Skip if already seen
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                # Clean link text
                link_text = self._clean_text(text)

                if link_text and len(link_text) > 1:
                    links.append({
                        "url": url,
                        "text": link_text
                    })

        return links[:10]  # Limit to 10 links

    async def analyze_content_with_ai(
        self,
        extracted_data: dict,
        website: dict,
        api_key: str
    ) -> Optional[dict]:
        """Use GPT-4o to analyze extracted content and identify themes/niche."""

        prompt = f"""Analyze this website's content and identify its niche, themes, and relevant keywords.

WEBSITE: {website.get('domain')}
NAME: {website.get('name')}

EXTRACTED DATA:
- Page Title: {extracted_data.get('title', 'N/A')}
- Meta Description: {extracted_data.get('meta_description', 'N/A')}
- Headings Found: {', '.join(extracted_data.get('headings', [])[:15])}
- Keywords Found: {', '.join(extracted_data.get('keywords', [])[:20])}

IMPORTANT: Based ONLY on the actual content found above, determine:
1. What is this website's specific niche? (Be precise - e.g., "Dutch boating license exam preparation" NOT just "boats")
2. What are the main content themes?
3. What keywords would be most relevant for blog topics?

Return ONLY a JSON object (no markdown):
{{
    "niche_description": "A 1-2 sentence description of the website's specific niche and target audience",
    "themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
    "language": "detected language code (e.g., nl, en, de)"
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        body = json.dumps({
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "You are an SEO analyst. Analyze website content and identify its niche accurately. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 800,
            "temperature": 0.3  # Lower temperature for more accurate analysis
        })

        try:
            response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                self._make_options("POST", headers, body)
            )

            if response.ok:
                data = await self._parse_json(response)
                content = data["choices"][0]["message"]["content"]
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                return json.loads(content)
            else:
                error = await response.text()
                console.log(f"AI analysis error: {error}")
                return None
        except Exception as e:
            console.log(f"AI analysis failed: {str(e)}")
            return None

    async def get_website_scan(
        self,
        website_id: str,
        supabase_url: str,
        supabase_key: str
    ) -> Optional[dict]:
        """Retrieve existing scan data for a website."""
        url = f"{supabase_url}/rest/v1/website_scans?website_id=eq.{website_id}&select=*"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }

        response = await fetch(url, self._make_options("GET", headers))

        if response.ok:
            data = await self._parse_json(response)
            return dict(data[0]) if data and len(data) > 0 else None
        return None

    async def save_scan_results(
        self,
        website_id: str,
        scan_data: dict,
        supabase_url: str,
        supabase_key: str
    ) -> bool:
        """Save or update scan results in the database."""
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # Check if scan record exists
        existing = await self.get_website_scan(website_id, supabase_url, supabase_key)

        data = {
            "website_id": website_id,
            **scan_data
        }

        if existing:
            # Update existing record
            response = await fetch(
                f"{supabase_url}/rest/v1/website_scans?website_id=eq.{website_id}",
                self._make_options("PATCH", headers, json.dumps(scan_data))
            )
        else:
            # Insert new record
            response = await fetch(
                f"{supabase_url}/rest/v1/website_scans",
                self._make_options("POST", headers, json.dumps(data))
            )

        return response.ok

    async def update_scan_status(
        self,
        website_id: str,
        status: str,
        supabase_url: str,
        supabase_key: str,
        error_message: str = None
    ):
        """Update the scan status for a website."""
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }

        data = {"scan_status": status}
        if error_message:
            data["error_message"] = error_message

        # Check if record exists
        existing = await self.get_website_scan(website_id, supabase_url, supabase_key)

        if existing:
            await fetch(
                f"{supabase_url}/rest/v1/website_scans?website_id=eq.{website_id}",
                self._make_options("PATCH", headers, json.dumps(data))
            )
        else:
            data["website_id"] = website_id
            await fetch(
                f"{supabase_url}/rest/v1/website_scans",
                self._make_options("POST", headers, json.dumps(data))
            )

    # =============================================
    # GOOGLE CUSTOM SEARCH API FUNCTIONS
    # =============================================

    async def get_system_key(
        self,
        key_name: str,
        supabase_url: str,
        supabase_key: str,
        encryption_key: str
    ) -> Optional[str]:
        """Retrieve and decrypt a system key."""
        url = f"{supabase_url}/rest/v1/system_keys?key_name=eq.{key_name}&select=*"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }

        response = await fetch(url, self._make_options("GET", headers))

        if response.ok:
            data = await self._parse_json(response)
            if data and len(data) > 0:
                encrypted_value = data[0].get("key_value_encrypted")
                if encrypted_value:
                    return await self._decrypt(encrypted_value, encryption_key)
        return None

    async def search_google(
        self,
        query: str,
        api_key: str,
        cx_id: str,
        language: str = "en"
    ) -> list:
        """Execute a Google Custom Search API request."""
        try:
            # URL encode the query
            from urllib.parse import quote
            encoded_query = quote(query)

            # Map language codes
            hl = language[:2] if language else "en"  # e.g., "nl-NL" -> "nl"

            url = (
                f"https://www.googleapis.com/customsearch/v1"
                f"?key={api_key}"
                f"&cx={cx_id}"
                f"&q={encoded_query}"
                f"&hl={hl}"
                f"&num=10"
            )

            response = await fetch(url, self._make_options("GET"))

            if response.ok:
                data = await self._parse_json(response)
                return data.get("items", [])
            else:
                error = await response.text()
                console.log(f"Google Search error: {error}")
                return []
        except Exception as e:
            console.log(f"Google Search failed: {str(e)}")
            return []

    def build_search_queries(self, scan_data: dict, website: dict) -> list:
        """Build search queries from scan data for topic discovery."""
        queries = []

        niche = scan_data.get("niche_description", "")
        themes = scan_data.get("content_themes", [])
        keywords = scan_data.get("main_keywords", [])
        language = website.get("language", "en-US")

        # Query templates based on language
        if language.startswith("nl"):
            templates = [
                "{keyword} nieuws 2025",
                "{keyword} tips",
                "beste {keyword}",
                "{keyword} gids",
                "hoe {keyword}"
            ]
        else:
            templates = [
                "{keyword} news 2025",
                "{keyword} tips",
                "best {keyword}",
                "{keyword} guide",
                "how to {keyword}"
            ]

        # Use top keywords to build queries
        for keyword in keywords[:5]:
            for template in templates[:2]:  # Limit templates to avoid too many API calls
                queries.append(template.format(keyword=keyword))

        # Add theme-based queries
        for theme in themes[:3]:
            queries.append(f"{theme} latest")

        return queries[:10]  # Limit to 10 queries

    async def discover_topics_from_search(
        self,
        website: dict,
        scan_data: dict,
        google_api_key: str,
        google_cx_id: str,
        supabase_url: str,
        supabase_key: str
    ) -> list:
        """Discover topics using Google Custom Search API."""
        queries = self.build_search_queries(scan_data, website)
        all_results = []

        for query in queries[:5]:  # Limit API calls
            results = await self.search_google(
                query,
                google_api_key,
                google_cx_id,
                website.get("language", "en-US")
            )
            all_results.extend(results)

        # Convert search results to topic suggestions
        topics = []
        seen_titles = set()

        for result in all_results:
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            link = result.get("link", "")

            # Skip duplicates
            if title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())

            # Extract keywords from title and snippet
            keywords = self._extract_keywords_from_text(f"{title} {snippet}")

            # Filter keywords to match website themes
            relevant_keywords = [
                kw for kw in keywords
                if any(theme.lower() in kw.lower() or kw.lower() in theme.lower()
                       for theme in scan_data.get("content_themes", []))
            ]

            if len(relevant_keywords) >= 2:
                topics.append({
                    "title": title,
                    "keywords": relevant_keywords[:5],
                    "category": scan_data.get("content_themes", ["general"])[0] if scan_data.get("content_themes") else "general",
                    "priority": 6,
                    "source": "google_search",
                    "discovery_context": {
                        "search_source": link,
                        "snippet": snippet[:200]
                    }
                })

        return topics[:10]  # Return top 10 topics

    def _extract_keywords_from_text(self, text: str) -> list:
        """Extract potential keywords from text."""
        import re

        # Clean and lowercase
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)

        # Split into words
        words = text.split()

        # Filter: length between 4-25 chars, not common stop words
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
                      'was', 'one', 'our', 'out', 'het', 'een', 'van', 'voor', 'met', 'zijn'}

        keywords = [w for w in words if len(w) >= 4 and len(w) <= 25 and w not in stop_words]

        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique.append(kw)

        return unique[:15]
