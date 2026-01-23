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

    async def on_fetch(self, request):
        """Handle HTTP requests (for manual triggers and health checks)."""
        url = request.url

        try:
            if "/health" in url:
                return Response(json.dumps({
                    "status": "healthy",
                    "service": "seo-content-generator",
                    "timestamp": datetime.now().isoformat()
                }), headers={"Content-Type": "application/json"})

            if "/trigger" in url:
                result = await self.run_generation()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            if "/discover" in url:
                # Topic discovery endpoint (now with website scanning context)
                result = await self.discover_all_topics()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            if "/scan" in url:
                # Website scanning endpoint - extracts content themes and keywords
                result = await self.scan_all_websites()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            return Response(json.dumps({
                "message": "SEO Content Generator Worker",
                "endpoints": ["/health", "/trigger", "/discover", "/scan"]
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

        # Generate article
        api_used = "openai" if openai_key else "claude"
        api_key = openai_key if openai_key else anthropic_key

        article = await self.generate_article(topic, website, api_used, api_key)

        if not article:
            await self.update_generation_log(
                log_id, "failed", "Content generation failed", supabase_url, supabase_key
            )
            return False

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

        await self.update_website_schedule(website_id, website.get("days_between_posts", 3), supabase_url, supabase_key)

        console.log(f"Successfully generated: {article.get('title')}")
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
        """Save a generated topic to the database."""
        data = {
            "website_id": website_id,
            "title": topic.get("title"),
            "keywords": topic.get("keywords", []),
            "category": topic.get("category", "general"),
            "priority": topic.get("priority", 5),
            "source": topic.get("source", "ai_generated"),
            "is_used": False,
            "times_used": 0,
            "discovery_context": topic.get("discovery_context", {})
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

        # 2. Generate AI topics with context
        if scan_data and scan_data.get("niche_description"):
            prompt = f"""Find 5 trending blog topics for this website.

WEBSITE CONTEXT (from actual website scan):
- Website Name: {website.get('name')}
- Domain: {website.get('domain')}
- Niche: {scan_data.get('niche_description', 'N/A')}
- Main Themes: {', '.join(scan_data.get('content_themes', [])[:5])}
- Key Topics Found: {', '.join(scan_data.get('main_keywords', [])[:15])}
- Sample Headings: {', '.join(scan_data.get('headings', [])[:8])}

IMPORTANT: Topics MUST be relevant to the actual website content described above.
Do NOT generate generic topics based only on the domain name.

Language: {website.get('language', 'en-US')}

Return ONLY a JSON object (no markdown):
{{"topics": [{{"title": "Title", "keywords": ["kw1", "kw2"], "category": "cat", "priority": 7}}]}}"""
        else:
            # Fallback to basic prompt without scan data
            prompt = f"""Find 5 trending blog topics for a website about: {website.get('name')}
Domain: {website.get('domain')}
Language: {website.get('language', 'en-US')}

Topics should be:
- Current and trending
- SEO-optimized
- Relevant to the website's niche

Return ONLY a JSON object (no markdown):
{{"topics": [{{"title": "Title", "keywords": ["kw1", "kw2"], "category": "cat", "priority": 7}}]}}"""

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

                # Add discovery context and source to AI topics
                for topic in ai_topics:
                    topic["source"] = "ai_suggested"
                    if scan_data:
                        topic["discovery_context"] = {
                            "used_scan_data": True,
                            "niche": scan_data.get("niche_description"),
                            "themes_used": scan_data.get("content_themes", [])[:3]
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
        """Generate article content using AI API."""
        prompt = self.build_prompt(topic, website)
        system_prompt = website.get(f"system_prompt_{api_type}") or self.get_default_system_prompt(website)

        if api_type == "openai":
            content = await self.call_openai(prompt, system_prompt, api_key)
        else:
            content = await self.call_anthropic(prompt, system_prompt, api_key)

        if not content:
            return None

        return self.parse_article(content, topic, website)

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

    def build_prompt(self, topic: dict, website: dict) -> str:
        """Build the content generation prompt with explicit formatting rules."""
        keywords = ", ".join(topic.get("keywords", [])) if topic.get("keywords") else ""

        return f"""Write a comprehensive, SEO-optimized blog article.

TOPIC: {topic.get('title')}
TARGET KEYWORDS: {keywords}
LANGUAGE: {website.get('language', 'en-US')}
CATEGORY: {topic.get('category', 'general')}

REQUIRED STRUCTURE:

1. TL;DR SUMMARY (50-75 words):
   Format: <div class="tldr"><strong>TL;DR:</strong> [Summary]</div>

2. INTRODUCTION (100-150 words):
   - Hook with compelling insight or statistic
   - Include primary keyword naturally

3. MAIN CONTENT (800-1200 words):
   - Use <h2> for main section headings
   - Use <h3> for subsections
   - Include statistics with sources where applicable
   - Include practical tips and actionable advice
   - Use <ul> and <li> for lists

4. FAQ SECTION:
   - Add heading: <h2>Veelgestelde Vragen</h2> (or FAQ in the article language)
   - Format each Q&A as:
     <div class="faq-item"><strong>Q: [Question]?</strong><p>A: [Answer in 2-3 sentences]</p></div>
   - Include 3-5 relevant questions

5. CONCLUSION (80-100 words):
   - Summarize key points
   - Clear call-to-action

CRITICAL FORMATTING RULES:
- Output ONLY the article content - no wrapper
- Do NOT wrap in markdown code blocks (no ```)
- Do NOT include <!DOCTYPE>, <html>, <head>, <body>, <meta>, or <title> tags
- Do NOT start with "Here is the article" or any meta-commentary
- Do NOT add HTML comments at the end
- Use semantic HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <div>, <strong>
- Start DIRECTLY with the <div class="tldr"> section

BEGIN THE ARTICLE NOW:"""

    def get_default_system_prompt(self, website: dict) -> str:
        """Get default system prompt for content generation."""
        return f"""You are an expert content writer for {website.get('name', 'a professional website')}.
Write engaging, informative, and SEO-optimized blog articles.
Focus on providing value to readers while incorporating relevant keywords naturally.
Your content should be well-structured, easy to read, and actionable.
Always include practical examples and real-world applications where relevant.
Output clean semantic HTML only - never wrap in code blocks or include document structure tags."""

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
        """Apply SEO optimizations to the article."""
        meta_desc = article.get("excerpt", "")[:160]

        score = 50
        if article.get("title") and len(article["title"]) >= 30:
            score += 10
        if article.get("primary_keyword") and article["primary_keyword"].lower() in article.get("title", "").lower():
            score += 15
        if article.get("word_count", 0) >= 1000:
            score += 15
        if article.get("excerpt"):
            score += 10

        article["meta_description"] = meta_desc
        article["seo_score"] = min(100, score)
        article["geo_optimized"] = True

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

    async def update_website_schedule(self, website_id: str, days: int, supabase_url: str, supabase_key: str):
        """Update website schedule after generation."""
        next_scheduled = datetime.now() + timedelta(days=days)

        data = {
            "last_generated_at": datetime.now().isoformat(),
            "next_scheduled_at": next_scheduled.isoformat(),
        }

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }

        await fetch(
            f"{supabase_url}/rest/v1/websites?id=eq.{website_id}",
            self._make_options("PATCH", headers, json.dumps(data))
        )

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

    async def fetch_page_content(self, url: str) -> Optional[str]:
        """Fetch HTML content from a URL."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0; +https://example.com/bot)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9,nl;q=0.8"
            }

            response = await fetch(url, self._make_options("GET", headers))

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
            console.log(f"Fetch error for {url}: {str(e)}")
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
