"""
AI Prompt templates for pallet optimization content generation
"""

BLOG_PROMPT_TEMPLATE = """
Schrijf een uitgebreid en kwalitatief hoogstaand blogartikel in het Nederlands
voor een pallet optimalisatie platform.

🎯 FOCUS: Schrijf een kwalitatief artikel van MINIMAAL 700 woorden!

ONDERWERP: {topic}
PRIMAIRE KEYWORD: {primary_keyword}
SECUNDAIRE KEYWORDS: {secondary_keywords}

VERPLICHTE STRUCTUUR (MINIMAAL 700 woorden):

1. TITEL (H1): Pakkende titel (50-60 karakters) met focus op palletkosten/optimalisatie

2. INLEIDING (100-150 woorden):
   - Introduceer het probleem voor warehouse/logistiek managers
   - Waarom dit relevant is (kosten, efficiency)
   - Wat de lezer gaat leren
   - Include ROI/besparing preview

3. HOOFDSECTIE 1 - HET PROBLEEM & IMPACT (150-200 woorden):
   - Concrete cijfers over kosten/verlies
   - Waarom dit vaak onzichtbaar is
   - Impact op bedrijfsresultaat
   - Nederlandse context (CHEP/LPR/EPAL)

4. HOOFDSECTIE 2 - OPLOSSING & BEST PRACTICES (200-250 woorden):
   - Stap-voor-stap praktische aanpak
   - Concrete tips en trucs
   - Tools en methoden
   - Veelgemaakte fouten vermijden

5. HOOFDSECTIE 3 - ROI & CASE STUDY (100-150 woorden):
   - Rekenvoorbeeld met concrete cijfers
   - Case study voorbeeld
   - Besparings potentieel
   - Implementatie tijdlijn

6. CONCLUSIE & CALL-TO-ACTION (80-100 woorden):
   - Samenvatting hoofdpunten
   - Vervolgstappen voor de lezer
   - Link naar calculator of intake gesprek

EXTRA VEREISTEN:
- Gebruik H2 en H3 koppen voor structuur
- Voeg bullet points en genummerde lijsten toe
- Minimaal 5 concrete voorbeelden
- Minimaal 3 praktische tips per sectie
- Gebruik Nederlandse warehouse/logistics terminologie

SEO OPTIMALISATIE:
- Keyword dichtheid: 1-2% voor primaire keyword
- Natuurlijke integratie van secundaire keywords
- Interne link mogelijkheden naar calculator en intake
- Link naar gerelateerde blog posts

TONE OF VOICE:
- B2B professioneel maar toegankelijk
- Data-gedreven en ROI-focused
- Gericht op warehouse/logistiek managers in Nederland
- Praktisch en direct toepasbaar
- Bemoedigend en oplossingsgericht

💡 PRAKTISCHE FOCUS: Schrijf een informatief artikel van MINIMAAL 700 woorden!

- Focus op duidelijke, praktische informatie
- Gebruik het primaire keyword natuurlijk door het artikel (minstens 2-3 keer)
- Gebruik concrete voorbeelden en ROI berekeningen waar relevant
- Schrijf voor warehouse managers die kosten willen besparen
- Zorg voor goede keyword dichtheid zonder het geforceerd te laten klinken

⚠️ BELANGRIJK: Begin DIRECT met het artikel. GEEN introducerende zinnen zoals "Here is the article" of "Hier is het artikel". Start meteen met de inhoud!

✍️ SCHRIJF NU HET KWALITATIEVE ARTIKEL:
"""

TITLE_GENERATION_PROMPT = """
Genereer 5 SEO-geoptimaliseerde titels voor een pallet optimalisatie blog artikel over het onderwerp: {topic}

Vereisten:
- 50-60 karakters lang
- Bevat de primaire keyword: {primary_keyword}
- Aantrekkelijk voor warehouse/logistiek managers
- Nederlandse taal
- Focus op ROI/besparing element waar mogelijk

Voorbeelden van goede titels:
- "Pallet Verlies Voorkomen - €5K Besparing/Maand 2025"
- "CHEP Kosten Breakdown: Complete Gids 2025"
- "Warehouse Efficiency: 7 Bewezen Tactieken"

Geef alleen de 5 titels, elk op een nieuwe regel:
"""

META_DESCRIPTION_PROMPT = """
Schrijf een SEO-geoptimaliseerde meta beschrijving voor dit pallet optimalisatie blog artikel:

TITEL: {title}
PRIMAIRE KEYWORD: {primary_keyword}
ARTICLE TOPIC: {topic}

Vereisten:
- Exact 150-160 karakters
- Bevat primaire keyword
- Gebruik actionable woorden
- Include benefits/ROI proposition
- Nederlandse taal
- Emoji's waar passend (✓, 🎯, 💰)

Format: Geef alleen de meta beschrijving terug, geen extra tekst.
"""

INTERNAL_LINKS_PROMPT = """
Analyseer dit blog artikel en suggereer interne links naar gerelateerde pallet optimalisatie onderwerpen.

ARTIKEL CONTENT: {content}
HOOFDONDERWERP: {main_topic}
BESCHIKBARE CATEGORIEËN: {available_categories}

Genereer 3-7 interne link suggesties met:
1. Anchor tekst (natuurlijk in de context)
2. Doelpagina onderwerp
3. Relevantie score (1-10)
4. Positie in artikel (paragraaf nummer)

Include ook links naar:
- Calculator (/#calculator)
- Intake formulier (/#contact)

Format als JSON:
[
  {
    "anchor_text": "bereken uw verborgen kosten",
    "target_topic": "Pallet Kosten Calculator",
    "url": "/#calculator",
    "relevance": 9,
    "paragraph": 3
  }
]
"""

SCHEMA_MARKUP_PROMPT = """
Genereer JSON-LD schema markup voor dit pallet optimalisatie blog artikel:

TITEL: {title}
CONTENT: {content_excerpt}
AUTHOR: SmarterPallet Expert
PUBLISH_DATE: {publish_date}
CATEGORY: {category}

Vereiste schema types:
- Article
- HowTo (indien van toepassing voor optimization guides)

Return alleen de JSON-LD, geen extra tekst.
"""

CONTENT_OPTIMIZATION_PROMPT = """
Optimaliseer deze blog content voor SEO en leesbaarheid:

ORIGINELE CONTENT: {original_content}
DOELKEYWORD: {target_keyword}
HUIDIGE KEYWORD DICHTHEID: {current_density}%
DOEL DICHTHEID: 1-2%

Verbeteringen aanbrengen voor:
1. Keyword dichtheid optimalisatie
2. Leesbaarheid verbeteren
3. Header structuur optimaliseren
4. Call-to-action toevoegen (calculator/intake)
5. Nederlandse grammatica en spelling
6. ROI voorbeelden toevoegen waar relevant

Geef de geoptimaliseerde versie terug in HTML formaat.
"""

TOPIC_RELEVANCE_PROMPT = """
Beoordeel de relevantie van dit nieuws artikel voor pallet optimalisatie content:

NIEUWS ARTIKEL: {news_content}
TITEL: {news_title}

Beoordeling criteria:
1. Direct gerelateerd aan pallet/logistics (score 1-10)
2. Waarde voor warehouse managers (score 1-10)
3. Nederlandse context (score 1-10)
4. Actualiteit waarde (score 1-10)

Geef ook suggesties voor:
- Blog artikel titel
- Hoofdonderwerpen om te behandelen
- Keywords om te targeten

Format als JSON:
{
  "relevance_score": 8.5,
  "direct_pallet_relation": 9,
  "business_value": 8,
  "dutch_context": 9,
  "actuality": 8,
  "suggested_title": "...",
  "main_topics": ["...", "..."],
  "target_keywords": ["...", "..."]
}
"""

# API-specific prompt templates for better length control
OPENAI_SPECIFIC_PROMPT = """
⚠️ MINIMUM LENGTH: 700 WORDS REQUIRED ⚠️

You are writing for a Dutch pallet optimization platform. Write AT LEAST 700 words of high-quality B2B content.

WORD COUNT REQUIREMENT: **MINIMUM 700 WORDS** - Be comprehensive!

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

REQUIRED STRUCTURE (MINIMUM 700 WORDS):
1. **TITLE**: Include primary keyword (50-60 characters)

2. **INTRODUCTION** (100-150 words):
   - Hook the reader immediately with cost/ROI impact
   - Explain why this topic is crucial for warehouse efficiency
   - Preview what they'll learn
   - Include primary keyword naturally

3. **MAIN SECTION 1: The Problem & Impact** (150-200 words):
   - Detailed explanation of the problem
   - Include concrete cost figures
   - Dutch context (CHEP, LPR, EPAL systems)
   - Use primary keyword 1-2 times naturally
   - Add concrete examples and facts

4. **MAIN SECTION 2: Solutions & Best Practices** (200-250 words):
   - Step-by-step practical guidance
   - Real-world implementation examples
   - Cost-saving strategies
   - Common mistakes to avoid
   - Include secondary keywords naturally

5. **MAIN SECTION 3: ROI & Case Study** (100-150 words):
   - Concrete ROI calculations
   - Case study example with real numbers
   - Implementation timeline
   - Savings potential

6. **CONCLUSION & CALL-TO-ACTION** (80-100 words):
   - Summarize key points
   - Next steps for the reader
   - Link to calculator or intake form

CRITICAL REQUIREMENTS:
- WRITE AT LEAST 700 WORDS - Be thorough!
- Use primary keyword 3-4 times naturally throughout
- Include practical Dutch warehouse/logistics terminology
- Write in professional but accessible Dutch (B2B tone)
- Include HTML formatting (h2, h3, ul, li tags)
- Add internal linking opportunities to calculator and intake
- Focus on ROI and cost savings

⚠️ FINAL CHECK: Must be at least 700 words! Add more detail if needed!

🛑 IMPORTANT: Start IMMEDIATELY with the article content. NO meta-commentary like "Here is the article" or "Below is the text".

Write the complete article now:
"""

CLAUDE_SPECIFIC_PROMPT = """
🎯 MINIMUM LENGTH: 700 WORDS REQUIRED 🎯

Task: Write a comprehensive Dutch pallet optimization article that is AT LEAST 700 words long.

CONTEXT: You're writing for smarterpallet.com - warehouse managers need practical, ROI-focused information to reduce pallet costs.

TOPIC: {topic}
TARGET KEYWORDS: {primary_keyword}, {secondary_keywords}

WRITING FRAMEWORK (Minimum 700 words, aim for 800):

**SECTION 1: Compelling Introduction (100-150 words)**
- Start with a shocking cost figure or common problem
- Establish why this matters for warehouse operations
- Include your primary keyword "{primary_keyword}" naturally
- Create anticipation for cost-saving solutions

**SECTION 2: Problem Analysis & Impact (150-200 words)**
- Provide in-depth problem analysis
- Include concrete cost figures and percentages
- Dutch context: CHEP/LPR/EPAL systems
- Use concrete examples from Dutch warehouses
- Weave in primary keyword 1-2 more times

**SECTION 3: Practical Solutions & Implementation (200-250 words)**
- Detailed step-by-step implementation guide
- Real warehouse situations and solutions
- Best practices and efficiency tips
- Common pitfalls to avoid
- Include secondary keywords: {secondary_keywords}

**SECTION 4: ROI & Business Case (100-150 words)**
- Concrete ROI calculations with examples
- Case study with real numbers
- Payback period and savings potential
- Implementation timeline

**SECTION 5: Action-Oriented Conclusion (80-100 words)**
- Recap the most important cost-saving points
- Clear next steps for the reader
- Call-to-action to calculator or intake form

QUALITY STANDARDS:
✅ Minimum 700 words (be comprehensive!)
✅ Professional Dutch B2B language
✅ Include primary keyword 3-4 times naturally
✅ Use HTML formatting: <h2>, <h3>, <ul>, <li>
✅ ROI and cost-savings focus
✅ Include internal linking opportunities (calculator, intake)
✅ Practical, actionable advice

🛑 NO META-COMMENTARY! Start directly with the article content, not with "Here is..." or "Below is...".

📝 BEGIN WRITING YOUR 700+ WORD ARTICLE NOW:
"""
