"""
AI Prompt Templates for Multi-Product Blog System

NOTE: These are structural templates only. Language and product-specific content
comes from config/product_content.py (SYSTEM_PROMPTS section).

The system prompt (set in product_content.py) tells the AI:
- What language to write in
- What industry/niche to focus on
- What tone/style to use
- Who the target audience is

These templates provide the STRUCTURE and GEO optimization requirements.
"""

# =============================================================================
# BLOG ARTICLE GENERATION PROMPTS
# =============================================================================

BLOG_PROMPT_TEMPLATE = """
Write a comprehensive, high-quality blog article.

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

MINIMUM LENGTH: 700 words

REQUIRED STRUCTURE:

1. TITLE (H1): Engaging title (50-60 characters) including primary keyword

2. INTRODUCTION (100-150 words):
   - Hook the reader with a compelling statistic or insight
   - Explain why this topic matters
   - Preview what the reader will learn

3. MAIN SECTION 1 - Problem/Context (150-200 words):
   - Explain the core issue or concept
   - Include relevant statistics with sources
   - Provide industry context

4. MAIN SECTION 2 - Solution/Best Practices (200-250 words):
   - Step-by-step practical guidance
   - Concrete tips and strategies
   - Common mistakes to avoid

5. MAIN SECTION 3 - Examples/Case Study (100-150 words):
   - Real-world examples
   - ROI calculations if applicable
   - Implementation timeline

6. CONCLUSION & CALL-TO-ACTION (80-100 words):
   - Summarize key points
   - Clear next steps for the reader

FORMATTING REQUIREMENTS:
- Use H2 and H3 headings for structure
- Include bullet points and numbered lists
- Use HTML formatting (<h2>, <h3>, <ul>, <li>, <p>)
- Include primary keyword 3-4 times naturally
- Include secondary keywords where relevant

IMPORTANT: Start DIRECTLY with the article content. NO meta-commentary like "Here is the article".

Write the complete article now:
"""

TITLE_GENERATION_PROMPT = """
Generate 5 SEO-optimized titles for a blog article about: {topic}

Requirements:
- 50-60 characters long
- Contains the primary keyword: {primary_keyword}
- Engaging and click-worthy
- Professional tone

Provide only the 5 titles, each on a new line:
"""

META_DESCRIPTION_PROMPT = """
Write an SEO-optimized meta description for this blog article:

TITLE: {title}
PRIMARY KEYWORD: {primary_keyword}
TOPIC: {topic}

Requirements:
- Exactly 150-160 characters
- Contains primary keyword
- Uses action-oriented language
- Includes value proposition

Format: Return only the meta description, no additional text.
"""

# =============================================================================
# GEO-OPTIMIZED PROMPTS (For AI Search Visibility)
# =============================================================================

OPENAI_SPECIFIC_PROMPT = """
MINIMUM LENGTH: 700 WORDS REQUIRED

Write a comprehensive blog article optimized for both traditional search AND AI search engines (ChatGPT, Google AI, Perplexity).

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

REQUIRED STRUCTURE (MINIMUM 700 WORDS):

1. **TITLE**: Include primary keyword (50-60 characters)

2. **TL;DR SUMMARY** (50-75 words) - CRITICAL FOR AI SEARCH:
   - Format: <div class="tldr"><strong>TL;DR:</strong> [Summary] </div>
   - Cover: the problem, solution, and key benefit
   - This is what AI assistants will quote - make it impactful!

3. **INTRODUCTION** (100-150 words):
   - Hook with compelling insight or statistic
   - Include a cited statistic: "According to [Source], [stat]..."
   - Explain why this topic matters
   - Include primary keyword naturally

4. **MAIN SECTION 1: Problem/Context** (150-200 words):
   - Detailed explanation
   - 1-2 statistics WITH SOURCES
   - Industry-specific context
   - Concrete examples

5. **MAIN SECTION 2: Solutions & Best Practices** (200-250 words):
   - Step-by-step practical guidance
   - Include an expert quote: "As [Expert/Company] states: '...'"
   - Real-world examples
   - Common mistakes to avoid
   - Include secondary keywords naturally

6. **MAIN SECTION 3: ROI/Results** (100-150 words):
   - Concrete calculations or examples
   - Include statistic: "On average, [X]% according to [Source]..."
   - Case study with real numbers

7. **FAQ SECTION** - CRITICAL FOR AI SEARCH:
   - Format: <h2>Frequently Asked Questions</h2>
   - Include 3-5 Q&A pairs in this EXACT format:
   - <div class="faq-item"><strong>Q: [Question about {topic}]?</strong><p>A: [Concise answer in 2-3 sentences]</p></div>
   - Questions should be what users actually search for
   - Answers should be direct and fact-based

8. **CONCLUSION & CALL-TO-ACTION** (80-100 words):
   - Summarize key points
   - Clear next steps for the reader

GEO OPTIMIZATION REQUIREMENTS:
- Include AT LEAST 3 statistics with source attribution
- Include AT LEAST 1 expert quote with attribution
- TL;DR section is MANDATORY
- FAQ section is MANDATORY
- Use clear, scannable formatting
- Write declarative statements that can be easily quoted

CRITICAL:
- MINIMUM 700 WORDS
- Use primary keyword 3-4 times naturally
- Include HTML formatting (h2, h3, ul, li, div tags)
- Start DIRECTLY with article content - NO meta-commentary

Write the complete article now:
"""

CLAUDE_SPECIFIC_PROMPT = """
MINIMUM LENGTH: 700 WORDS REQUIRED

Write a comprehensive blog article optimized for both traditional search AND AI search engines (ChatGPT, Google AI, Perplexity).

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

WRITING FRAMEWORK (Minimum 700 words):

**SECTION 0: TL;DR SUMMARY** (50-75 words) - CRITICAL FOR AI SEARCH!
- Format: <div class="tldr"><strong>TL;DR:</strong> [Summary] </div>
- Summarize: the problem, the solution, and the key benefit
- This is what AI assistants will extract and quote!

**SECTION 1: Compelling Introduction (100-150 words)**
- Start with a statistic + source
- Establish why this matters
- Include primary keyword "{primary_keyword}" naturally

**SECTION 2: Problem Analysis (150-200 words)**
- In-depth analysis
- 1-2 statistics WITH SOURCES
- Industry-specific context
- Concrete examples

**SECTION 3: Practical Solutions (200-250 words)**
- Step-by-step guidance
- Include an expert quote with attribution
- Real-world examples
- Best practices and tips
- Common pitfalls to avoid
- Include secondary keywords: {secondary_keywords}

**SECTION 4: Results/ROI (100-150 words)**
- Concrete examples or calculations
- Include statistic with source
- Case study with real numbers

**SECTION 5: FAQ Section** - CRITICAL FOR AI SEARCH!
- Format: <h2>Frequently Asked Questions</h2>
- Include 3-5 Q&A pairs in this EXACT format:
- <div class="faq-item"><strong>Q: [Question about {topic}]?</strong><p>A: [Answer in 2-3 sentences]</p></div>
- Questions should be what users actually search for
- Answers should be direct, fact-based, and quotable

**SECTION 6: Action-Oriented Conclusion (80-100 words)**
- Recap the most important points
- Clear next steps for the reader
- Call-to-action

GEO OPTIMIZATION REQUIREMENTS:
- AT LEAST 3 statistics with source attribution
- AT LEAST 1 expert quote with attribution
- TL;DR section is MANDATORY
- FAQ section is MANDATORY
- Clear, scannable formatting
- Declarative statements that AI can easily quote

QUALITY STANDARDS:
- Minimum 700 words
- Professional tone
- Primary keyword 3-4 times naturally
- HTML formatting: <h2>, <h3>, <ul>, <li>, <div>
- Practical, actionable advice

NO META-COMMENTARY! Start directly with the article content.

BEGIN WRITING YOUR 700+ WORD GEO-OPTIMIZED ARTICLE NOW:
"""

# =============================================================================
# UTILITY PROMPTS (Used internally, not for direct content generation)
# =============================================================================

INTERNAL_LINKS_PROMPT = """
Analyze this blog article and suggest internal links.

ARTICLE CONTENT: {content}
MAIN TOPIC: {main_topic}
AVAILABLE CATEGORIES: {available_categories}

Generate 3-7 internal link suggestions with:
1. Anchor text (natural in context)
2. Target page topic
3. Relevance score (1-10)
4. Position in article (paragraph number)

Format as JSON:
[
  {{
    "anchor_text": "learn more about this",
    "target_topic": "Related Topic",
    "url": "/related-page",
    "relevance": 9,
    "paragraph": 3
  }}
]
"""

SCHEMA_MARKUP_PROMPT = """
Generate JSON-LD schema markup for this blog article:

TITLE: {title}
CONTENT: {content_excerpt}
AUTHOR: {author}
PUBLISH_DATE: {publish_date}
CATEGORY: {category}

Required schema types:
- Article
- HowTo (if applicable for guides/tutorials)

Return only the JSON-LD, no extra text.
"""

CONTENT_OPTIMIZATION_PROMPT = """
Optimize this blog content for SEO and readability:

ORIGINAL CONTENT: {original_content}
TARGET KEYWORD: {target_keyword}
CURRENT KEYWORD DENSITY: {current_density}%
TARGET DENSITY: 1-2%

Improvements to make:
1. Keyword density optimization
2. Readability improvements
3. Header structure optimization
4. Add call-to-action
5. Grammar and spelling check

Return the optimized version in HTML format.
"""

TOPIC_RELEVANCE_PROMPT = """
Assess the relevance of this news article for content creation:

NEWS ARTICLE: {news_content}
TITLE: {news_title}

Assessment criteria:
1. Direct relevance to our topic (score 1-10)
2. Value for our target audience (score 1-10)
3. Timeliness (score 1-10)

Also suggest:
- Blog article title
- Main topics to cover
- Keywords to target

Format as JSON:
{{
  "relevance_score": 8.5,
  "direct_relevance": 9,
  "audience_value": 8,
  "timeliness": 8,
  "suggested_title": "...",
  "main_topics": ["...", "..."],
  "target_keywords": ["...", "..."]
}}
"""
