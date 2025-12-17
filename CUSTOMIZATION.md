# 🎨 Customization Guide

This guide shows exactly what to change to adapt this SEO system for your project.

---

## 📋 Customization Checklist

### 1. Product Configuration (REQUIRED)

**File**: `config/settings.py`
**Location**: Lines 67-73

```python
PRODUCT_CONFIG = {
    "product_id": "YOUR_PRODUCT_ID",              # 🔧 CHANGE: e.g., "mycompany"
    "website_domain": "YOUR_DOMAIN.com",          # 🔧 CHANGE: e.g., "example.com"
    "base_url": "https://YOUR_DOMAIN.com",        # 🔧 CHANGE: Full URL
    "company_name": "Your Company Name",          # 🔧 CHANGE: Your brand
    "parent_company": "Parent Company Name"       # 🔧 CHANGE: Parent company
}
```

**What this controls:**
- Database product_id filtering
- Schema.org organization markup
- Internal linking structure

---

### 2. SEO Configuration (REQUIRED)

**File**: `config/settings.py`
**Location**: Lines 35-64

#### Title Template

```python
"title_template": "{keyword} - Your Topic {year} | YourBrand",  # 🔧 CHANGE THIS
```

**Examples:**
```python
# B2B SaaS
"title_template": "{keyword} - Complete Guide {year} | CompanyName"

# E-commerce
"title_template": "{keyword} - Best {year} Deals | ShopName"

# Education
"title_template": "{keyword} - Learn {year} | CourseName"
```

#### Meta Description

```python
"meta_description_template": "Learn {topic}. ✓ Tips ✓ Guide ✓ {year}",  # 🔧 CHANGE THIS
```

#### Target Keywords

```python
"target_keywords": {
    "primary": ["main keyword", "primary term"],  # 🔧 CHANGE: Your main keywords
    "location": ["your country", "your city"],    # 🔧 CHANGE: Your geo targets
    "intent": ["buy", "learn", "compare"]         # 🔧 CHANGE: User intents
},
```

**Examples:**
```python
# Logistics company
"primary": ["warehouse optimization", "logistics efficiency", "supply chain"],
"location": ["netherlands", "europe", "amsterdam"],
"intent": ["optimize", "reduce costs", "automate"]

# Healthcare SaaS
"primary": ["patient management", "healthcare software", "EMR system"],
"location": ["united states", "california"],
"intent": ["streamline", "improve care", "compliance"]
```

#### Geo Targeting

```python
"geo_targeting": {
    "primary": "Your Country",                    # 🔧 CHANGE
    "secondary": ["Other Countries"],             # 🔧 CHANGE
    "language": "nl-NL"                           # 🔧 CHANGE (ISO code)
}
```

**Language codes:**
- `nl-NL` - Dutch (Netherlands)
- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `de-DE` - German (Germany)
- `fr-FR` - French (France)
- `es-ES` - Spanish (Spain)

---

### 3. Content Prompts (REQUIRED)

**File**: `config/prompts.py`

#### Main Blog Prompt

Replace ALL placeholders with your specifics:

```python
BLOG_PROMPT_TEMPLATE = """
Write a comprehensive article in [LANGUAGE]        # 🔧 Dutch/English/German
for a [INDUSTRY] platform.                         # 🔧 logistics/healthcare/finance

🎯 FOCUS: Write AT LEAST 700 words!

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

REQUIRED STRUCTURE:

1. TITLE: Focus on [YOUR TOPIC AREA]              # 🔧 pallet costs/patient care/investments

2. INTRODUCTION (100-150 words):
   - Problem for [TARGET AUDIENCE]                 # 🔧 warehouse managers/doctors/investors
   - Relevance: [VALUE PROPOSITION]               # 🔧 cost savings/better outcomes/ROI
   - What reader learns

3. MAIN SECTION 1 - PROBLEM (150-200 words):
   - Concrete data about [IMPACT]                 # 🔧 costs/inefficiency/risks
   - Why invisible
   - Business impact
   - [COUNTRY] context                            # 🔧 Netherlands/US/Germany

4. MAIN SECTION 2 - SOLUTION (200-250 words):
   - Step-by-step [SOLUTION]                      # 🔧 optimization/treatment/strategy
   - Examples from [INDUSTRY]                      # 🔧 logistics/healthcare/finance
   - Implementation

5. MAIN SECTION 3 - BENEFITS (150-200 words):
   - ROI/savings/improvements
   - Success stories
   - Metrics

6. CONCLUSION (100-150 words):
   - Summary
   - Call-to-action for [YOUR CTA]               # 🔧 calculator/demo/consultation

TONE OF VOICE:
- [B2B/B2C] professional                          # 🔧 Choose one
- Data-driven and ROI-focused                      # 🔧 Or: Story-driven, emotional
- For [TARGET AUDIENCE]                            # 🔧 CFOs/consumers/developers
- [PERSONALITY TRAITS]                             # 🔧 trustworthy/friendly/authoritative
```

#### System Messages (Generator)

**File**: `src/generator.py`
**Lines**: 165 (OpenAI), 193 (Claude)

```python
# OpenAI system message (line 165)
"Je bent een expert in [YOUR EXPERTISE]"          # 🔧 CHANGE

# Claude system message (line 193)
"Je bent een consultant in [YOUR SPECIALTY]"      # 🔧 CHANGE
```

**Examples:**
```python
# Logistics
"You're an expert in warehouse logistics and supply chain optimization"

# Healthcare
"You're a healthcare consultant specializing in patient care workflows"

# Finance
"You're a financial advisor specializing in investment strategies"
```

---

### 4. Topics File (REQUIRED)

**Create**: `data/topics_[your_product_id].json`

```bash
cp data/topics_template.json data/topics_myproduct.json
```

**Edit topics** - Replace EVERY placeholder:

```json
{
  "topics": [
    {
      "id": "myproduct-001",                     // 🔧 CHANGE: unique ID
      "title": "Your Article Title",             // 🔧 CHANGE: actual title
      "category": "your_category",               // 🔧 CHANGE: category name
      "keywords": [
        "your keyword 1",                        // 🔧 CHANGE: real keywords
        "your keyword 2"
      ],
      "priority": 10,                            // 🔧 SET: 1-10 (10=highest)
      "difficulty": "basis",                     // Keep: basis/medium/advanced
      "target_audience": "your audience",        // 🔧 CHANGE: who reads this
      "business_value": "high"                   // 🔧 SET: high/medium/low
    }
  ]
}
```

**Create 10-50 topics** covering:
- Core product features
- Common customer questions
- Industry problems you solve
- Comparisons with alternatives
- How-to guides
- Best practices
- Case studies

---

### 5. Publishing Schedule (OPTIONAL)

**File**: `config/settings.py`
**Lines**: 119-124

```python
PUBLISHING_SCHEDULE = {
    "frequency": "daily",                         # Options: "daily", "every_3_days"
    "optimal_times": ["09:00", "14:00"],         # 🔧 CHANGE: your timezone times
    "posts_per_month": 30,                        # Auto-calculated from frequency
    "categories_rotation": True                   # Rotate through categories
}
```

---

### 6. Environment Variables (REQUIRED)

Create `.env` file or set in Railway:

```bash
# API Keys
OPENAI_API_KEY=sk-proj-xxx                       # Get from openai.com
ANTHROPIC_API_KEY=sk-ant-xxx                     # Get from anthropic.com

# Database
SUPABASE_URL=https://xxx.supabase.co             # From Supabase project
SUPABASE_SERVICE_KEY=eyJxxx                      # Service role key (NOT anon!)

# Product (MUST match your config and topics filename!)
PRODUCT_ID=myproduct                              # 🔧 CHANGE: matches topics_[THIS].json
WEBSITE_DOMAIN=example.com                        # 🔧 CHANGE: your domain

# Worker Settings
RAILWAY_RUN_MODE=continuous                       # Keep this
DAYS_BETWEEN_POSTS=1                             # 1=daily, 3=every 3 days
ENVIRONMENT=production                            # Keep this
LOG_LEVEL=INFO                                    # Keep or change to DEBUG
```

---

## 🎯 Industry-Specific Examples

### Example 1: SaaS Product

```python
# config/settings.py
PRODUCT_CONFIG = {
    "product_id": "projectmanager",
    "website_domain": "projectmanager.io",
    "base_url": "https://projectmanager.io",
    "company_name": "ProjectManager",
    "parent_company": "TechCorp Inc"
}

SEO_CONFIG = {
    "title_template": "{keyword} - Project Management Guide {year} | ProjectManager",
    "target_keywords": {
        "primary": ["project management", "team collaboration", "task tracking"],
        "location": ["global", "remote teams"],
        "intent": ["organize", "collaborate", "track progress"]
    },
    "geo_targeting": {
        "primary": "Global",
        "language": "en-US"
    }
}
```

### Example 2: Local Service Business

```python
PRODUCT_CONFIG = {
    "product_id": "plumbingpros",
    "website_domain": "plumbingpros-amsterdam.nl",
    "base_url": "https://plumbingpros-amsterdam.nl",
    "company_name": "PlumbingPros Amsterdam",
    "parent_company": "PlumbingPros Amsterdam"
}

SEO_CONFIG = {
    "title_template": "{keyword} Amsterdam - Expert Loodgieters {year} | PlumbingPros",
    "target_keywords": {
        "primary": ["loodgieter amsterdam", "spoed loodgieter", "lekkage reparatie"],
        "location": ["amsterdam", "noord-holland", "centrum"],
        "intent": ["spoed", "reparatie", "installatie"]
    },
    "geo_targeting": {
        "primary": "Netherlands",
        "secondary": ["Amsterdam"],
        "language": "nl-NL"
    }
}
```

### Example 3: E-commerce Store

```python
PRODUCT_CONFIG = {
    "product_id": "gadgetstore",
    "website_domain": "techgadgets.com",
    "base_url": "https://techgadgets.com",
    "company_name": "TechGadgets",
    "parent_company": "Retail Group LLC"
}

SEO_CONFIG = {
    "title_template": "{keyword} - Best Deals {year} | TechGadgets",
    "target_keywords": {
        "primary": ["tech gadgets", "electronics", "smart devices"],
        "location": ["us", "united states"],
        "intent": ["buy", "compare", "deals"]
    },
    "geo_targeting": {
        "primary": "United States",
        "language": "en-US"
    }
}
```

---

## 🚫 Don't Change (Unless You Know What You're Doing)

Keep these files/settings as-is:

- `src/*.py` - Core Python code
- `requirements.txt` - Dependencies
- `railway_worker.py` - Worker logic
- `health_server.py` - Health checks
- `database_schema.sql` - Database structure (unless adding fields)
- `Dockerfile` - Container config
- API_CONFIG in settings.py - AI model settings
- QA_REQUIREMENTS in settings.py - Quality thresholds

---

## ✅ Verification Checklist

After customization, verify:

- [ ] `PRODUCT_ID` matches topics filename: `topics_[PRODUCT_ID].json`
- [ ] All `[PLACEHOLDERS]` removed from prompts
- [ ] Topics have real titles (not "Your Article Title")
- [ ] Keywords are actual search terms for your industry
- [ ] Language code matches your target language
- [ ] Company name/domain are yours (not template text)
- [ ] Test locally: `python main.py` generates article
- [ ] Railway environment variables all set
- [ ] First article publishes successfully

---

## 🐛 Common Customization Mistakes

### 1. Mismatched Product ID

❌ **Wrong:**
```bash
# In settings.py
PRODUCT_ID = "mycompany"

# But topics file is named:
data/topics_myproduct.json  # MISMATCH!
```

✅ **Right:**
```bash
# Both match
PRODUCT_ID = "mycompany"
data/topics_mycompany.json
```

### 2. Forgot to Replace Placeholders

❌ **Wrong:**
```python
"title": "[YOUR PRODUCT] Guide"  # Still has placeholder!
```

✅ **Right:**
```python
"title": "ProjectManager Complete Guide"
```

### 3. Using Anon Key Instead of Service Key

❌ **Wrong:**
```bash
SUPABASE_SERVICE_KEY=eyJhbG...  # This is actually anon key
```

✅ **Right:**
```bash
# Get the SERVICE ROLE key from Supabase Settings → API
SUPABASE_SERVICE_KEY=eyJhbG...  # Longer key, starts with eyJhbG
```

---

**Need help customizing? Check QUICKSTART.md for step-by-step guidance!**

**Last Updated**: 2025-12-08
