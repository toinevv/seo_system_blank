"""
SEO Content Generator - Cloudflare Worker
Generates blog articles for multiple websites using AI APIs.
Uses HTTP fetch instead of SDKs (required for Pyodide/WebAssembly).
"""

from workers import Response, WorkerEntrypoint
from js import fetch, Object, console
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
                # Topic discovery endpoint
                result = await self.discover_all_topics()
                return Response(json.dumps(result), headers={"Content-Type": "application/json"})

            return Response(json.dumps({
                "message": "SEO Content Generator Worker",
                "endpoints": ["/health", "/trigger", "/discover"]
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
            supabase_url = self.env.CENTRAL_SUPABASE_URL
            supabase_key = self.env.CENTRAL_SUPABASE_SERVICE_KEY
            encryption_key = self.env.ENCRYPTION_KEY

            if not all([supabase_url, supabase_key, encryption_key]):
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
            data = await response.json()
            return list(data) if data else []
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

        # Get decrypted keys (or raw keys for now)
        openai_key = api_keys.get("openai_api_key_encrypted")
        anthropic_key = api_keys.get("anthropic_api_key_encrypted")
        target_url = api_keys.get("target_supabase_url")
        target_key = api_keys.get("target_supabase_service_key_encrypted")

        if not target_url or not target_key:
            console.log("Missing target database credentials")
            return False

        if not openai_key and not anthropic_key:
            console.log("No AI API keys configured")
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
            data = await response.json()
            return dict(data[0]) if data and len(list(data)) > 0 else None
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
            data = await response.json()
            if data and len(list(data)) > 0:
                return dict(data[0])

        # If max_uses > 1, try to get reusable topic
        if max_uses > 1:
            url = f"{supabase_url}/rest/v1/topics?website_id=eq.{website_id}&times_used=lt.{max_uses}&order=priority.desc,times_used.asc&limit=1"
            response = await fetch(url, self._make_options("GET", headers))

            if response.ok:
                data = await response.json()
                if data and len(list(data)) > 0:
                    return dict(data[0])

        # If auto_generate is enabled and we have an API key, generate a topic
        if auto_generate and openai_key:
            console.log("No topics available, auto-generating...")
            topic = await self.generate_topic_with_ai(website, openai_key)
            if topic:
                # Save the generated topic
                saved_topic = await self.save_generated_topic(website_id, topic, supabase_url, supabase_key)
                return saved_topic

        return None

    async def generate_topic_with_ai(self, website: dict, api_key: str) -> Optional[dict]:
        """Generate a topic using GPT-4o."""
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
                data = await response.json()
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
            "source": "ai_generated",
            "is_used": False,
            "times_used": 0
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
            result = await response.json()
            return dict(result[0]) if result else None
        return None

    async def discover_all_topics(self) -> dict:
        """Discover topics for all active websites."""
        try:
            supabase_url = self.env.CENTRAL_SUPABASE_URL
            supabase_key = self.env.CENTRAL_SUPABASE_SERVICE_KEY

            if not all([supabase_url, supabase_key]):
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

            websites = list(await response.json())
            discovered = 0

            for website in websites:
                api_keys = await self.get_api_keys(website.get("id"), supabase_url, supabase_key)
                if api_keys and api_keys.get("openai_api_key_encrypted"):
                    topics = await self.discover_topics_for_website(
                        website,
                        api_keys.get("openai_api_key_encrypted"),
                        supabase_url,
                        supabase_key
                    )
                    discovered += len(topics) if topics else 0

            return {"message": f"Discovered {discovered} topics", "discovered": discovered}

        except Exception as e:
            console.log(f"Discovery error: {str(e)}")
            return {"error": str(e)}

    async def discover_topics_for_website(
        self,
        website: dict,
        api_key: str,
        supabase_url: str,
        supabase_key: str
    ) -> list:
        """Discover multiple topics for a website using GPT-4o."""
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
                data = await response.json()
                content = data["choices"][0]["message"]["content"]
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]

                result = json.loads(content)
                topics = result.get("topics", [])

                # Save all topics
                saved = []
                for topic in topics:
                    saved_topic = await self.save_generated_topic(
                        website.get("id"), topic, supabase_url, supabase_key
                    )
                    if saved_topic:
                        saved.append(saved_topic)

                return saved
            return []
        except Exception as e:
            console.log(f"Topic discovery failed: {str(e)}")
            return []

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
                data = await response.json()
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
                data = await response.json()
                return data["content"][0]["text"]
            else:
                error = await response.text()
                console.log(f"Anthropic error: {error}")
                return None
        except Exception as e:
            console.log(f"Anthropic call failed: {str(e)}")
            return None

    def build_prompt(self, topic: dict, website: dict) -> str:
        """Build the content generation prompt."""
        keywords = ", ".join(topic.get("keywords", [])) if topic.get("keywords") else ""

        return f"""Write a comprehensive, SEO-optimized blog article about: {topic.get('title')}

Target keywords: {keywords}
Language: {website.get('language', 'en-US')}
Category: {topic.get('category', 'general')}

Requirements:
1. Write in HTML format with proper headings (h2, h3)
2. Include a compelling introduction
3. Add 3-5 FAQ items at the end (format: <h3>Q: question</h3><p>Answer</p>)
4. Include a TL;DR summary at the beginning (50-75 words)
5. Add relevant statistics with sources where applicable
6. Word count: 1200-1800 words
7. Make it engaging and actionable
8. Include internal linking suggestions as HTML comments

Output the article in clean HTML format."""

    def get_default_system_prompt(self, website: dict) -> str:
        """Get default system prompt for content generation."""
        return f"""You are an expert content writer for {website.get('name', 'a professional website')}.
Write engaging, informative, and SEO-optimized blog articles.
Focus on providing value to readers while incorporating relevant keywords naturally.
Your content should be well-structured, easy to read, and actionable.
Always include practical examples and real-world applications where relevant."""

    def parse_article(self, content: str, topic: dict, website: dict) -> dict:
        """Parse AI response into article structure."""
        slug = topic.get("title", "").lower()
        slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
        slug = "-".join(slug.split())[:60]

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

        text_content = content
        for tag in ["<h1>", "</h1>", "<h2>", "</h2>", "<h3>", "</h3>", "<p>", "</p>", "<ul>", "</ul>", "<li>", "</li>"]:
            text_content = text_content.replace(tag, " ")
        excerpt = " ".join(text_content.split())[:200] + "..."

        word_count = len(content.split())
        read_time = max(1, word_count // 200)

        return {
            "title": title,
            "slug": slug,
            "content": content,
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
        """Save article to target website's Supabase database."""
        now = datetime.now().isoformat()

        data = {
            "title": article.get("title"),
            "slug": article.get("slug"),
            "content": article.get("content"),
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
            "status": "published",
            "published_at": now,
            "created_at": now,
            "geo_optimized": article.get("geo_optimized", False),
        }

        try:
            headers = {
                "apikey": target_key,
                "Authorization": f"Bearer {target_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }

            response = await fetch(
                f"{target_url}/rest/v1/blog_articles",
                self._make_options("POST", headers, json.dumps(data))
            )

            if response.ok:
                return True
            else:
                error = await response.text()
                console.log(f"Save article error: {error}")
                return False
        except Exception as e:
            console.log(f"Save article failed: {str(e)}")
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
            result = await response.json()
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
            data = await response.json()
            if data and len(list(data)) > 0:
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
