# 🚀 QuickStart Guide - SEO Blog System

Complete setup guide for deploying your own AI-powered blog system.

---

## ⏱️ Time Required

- **Minimum Setup**: 15 minutes
- **Full Customization**: 1-2 hours
- **First Article**: ~3 minutes (after deployment)

---

## Step 1: Copy Template (2 min)

```bash
# Navigate to your projects folder
cd ~/projects

# Copy the template
cp -r seo_system_blank my_company_blog

# Enter directory
cd my_company_blog
```

---

## Step 2: Create Topics File (15-30 min)

```bash
# Copy the template
cp data/topics_template.json data/topics_mycompany.json
```

**Edit `data/topics_mycompany.json`:**

```json
{
  "topics": [
    {
      "id": "mycompany-001",
      "title": "Your First Article Title",
      "category": "getting_started",
      "keywords": ["main keyword", "secondary keyword", "related term"],
      "priority": 10,
      "difficulty": "basis",
      "target_audience": "your target audience",
      "business_value": "high"
    },
    {
      "id": "mycompany-002",
      "title": "Your Second Article Title",
      "category": "tutorials",
      "keywords": ["tutorial keyword", "how to"],
      "priority": 9,
      "difficulty": "basis",
      "target_audience": "beginners",
      "business_value": "high"
    }
  ]
}
```

**Create 10-50 topics** based on:
- Your product/service
- Customer questions
- SEO keywords you want to rank for
- Industry topics

**Topic Priorities:**
- 10 = Must-write, highest value
- 8-9 = Important topics
- 5-7 = Medium priority
- 1-4 = Nice-to-have

---

## Step 3: Configure Product Settings (5 min)

**Edit `config/settings.py`:**

Find `PRODUCT_CONFIG` and update:

```python
PRODUCT_CONFIG = {
    "product_id": "mycompany",                    # CHANGE THIS
    "website_domain": "mycompany.com",            # CHANGE THIS
    "base_url": "https://mycompany.com",          # CHANGE THIS
    "company_name": "My Company",                  # CHANGE THIS
    "parent_company": "Parent Corp Inc"            # CHANGE THIS
}
```

Find `SEO_CONFIG` and update:

```python
SEO_CONFIG = {
    "title_template": "{keyword} - Your Topic {year} | MyCompany",  # CHANGE THIS
    "meta_description_template": "Learn about {topic}. ✓ Expert tips ✓ Proven strategies ✓ {year}",  # CHANGE THIS

    "target_keywords": {
        "primary": ["your main keyword", "primary term", "core topic"],  # CHANGE THIS
        "location": ["your country", "your city"],  # CHANGE THIS
        "intent": ["buy", "learn", "compare", "hire"]  # CHANGE THIS
    },

    "geo_targeting": {
        "primary": "Netherlands",  # CHANGE THIS
        "secondary": ["Belgium", "Germany"],  # CHANGE THIS
        "language": "nl-NL"  # CHANGE THIS (nl-NL, en-US, de-DE, etc.)
    }
}
```

---

## Step 4: Customize Content Prompts (15-30 min)

**Edit `config/prompts.py`:**

Update the main blog prompt template with your industry:

```python
BLOG_PROMPT_TEMPLATE = """
Write a comprehensive and high-quality blog article in [YOUR LANGUAGE]
for a [YOUR INDUSTRY] platform.

🎯 FOCUS: Write a quality article of AT LEAST 700 words!

TOPIC: {topic}
PRIMARY KEYWORD: {primary_keyword}
SECONDARY KEYWORDS: {secondary_keywords}

REQUIRED STRUCTURE (MINIMUM 700 words):

1. TITLE (H1): Catchy title (50-60 characters) focused on [YOUR TOPIC]

2. INTRODUCTION (100-150 words):
   - Introduce the problem for [YOUR TARGET AUDIENCE]
   - Why this is relevant ([YOUR VALUE PROP])
   - What the reader will learn
   - Include ROI/benefit preview

3. MAIN SECTION 1 - THE PROBLEM & IMPACT (150-200 words):
   - Concrete numbers about costs/impact
   - Why this is often invisible
   - Impact on business results
   - [YOUR COUNTRY] context

4. MAIN SECTION 2 - THE SOLUTION (200-250 words):
   - Step-by-step explanation
   - Practical examples
   - Do's and don'ts
   - Implementation tips

5. MAIN SECTION 3 - BENEFITS & ROI (150-200 words):
   - Concrete savings/benefits
   - Success stories
   - Time-to-value
   - Risk reduction

6. CONCLUSION (100-150 words):
   - Summary of key points
   - Clear call-to-action
   - Next steps for reader

TONE OF VOICE:
- B2B professional but accessible  # CHANGE FOR B2C
- Data-driven and ROI-focused
- Aimed at [YOUR TARGET AUDIENCE]
- Conversational, not academic
- Trustworthy and authoritative

IMPORTANT:
- Use {primary_keyword} naturally 3-5 times
- Include {secondary_keywords} throughout
- Write for [YOUR AUDIENCE], not experts
- Provide actionable insights
- Include concrete examples from [YOUR INDUSTRY]
- Stay on topic, no filler content
"""
```

**Customize:**
- Replace `[YOUR LANGUAGE]` (e.g., "Dutch", "English", "German")
- Replace `[YOUR INDUSTRY]` (e.g., "logistics", "healthcare", "finance")
- Replace `[YOUR TARGET AUDIENCE]` (e.g., "warehouse managers", "doctors", "CFOs")
- Replace `[YOUR VALUE PROP]` (e.g., "cost savings", "efficiency", "compliance")
- Adjust tone for B2B vs B2C
- Modify sections to match your content goals

---

## Step 5: Setup Supabase Database (5 min)

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project

2. **Run SQL Schema**:
   - Open SQL Editor in Supabase
   - Copy contents of `database_schema.sql`
   - Run the SQL

3. **Get API Keys**:
   - Settings → API
   - Copy `URL` and `service_role key` (NOT anon key!)

---

## Step 6: Deploy to Railway (10 min)

### Option A: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init
# Choose: "Create new project"
# Name: "my-company-blog"

# Add environment variables
railway variables set OPENAI_API_KEY=sk-proj-xxx
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJxxx
railway variables set PRODUCT_ID=mycompany
railway variables set WEBSITE_DOMAIN=mycompany.com
railway variables set RAILWAY_RUN_MODE=continuous
railway variables set DAYS_BETWEEN_POSTS=1

# Deploy
railway up
```

### Option B: Railway Web UI

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Connect your repository
4. Add environment variables (see list above)
5. Deploy

---

## Step 7: Verify Deployment (5 min)

Check Railway logs for:

✅ **Success indicators:**
```
✅ Supabase client initialized successfully
📋 Selected topic: [Your Topic Title]
🚀 Starting article generation...
✅ Article published successfully
```

❌ **Error indicators:**
```
❌ No available topics found
❌ ImportError: cannot import...
❌ Maintenance error
```

If errors, see Troubleshooting section.

---

## Step 8: Check Your First Article (5 min)

### In Supabase:

```sql
SELECT
  title,
  slug,
  seo_score,
  word_count,
  published_at
FROM blog_articles
WHERE product_id = 'mycompany'  -- Use your product_id
ORDER BY published_at DESC
LIMIT 1;
```

### Verify:
- ✅ Title matches your topic
- ✅ Word count ≥ 700
- ✅ SEO score ≥ 80
- ✅ Content is in correct language
- ✅ Keywords present in content

---

## Step 9: Integrate with Frontend (Optional)

See `FRONTEND_INTEGRATION_GUIDE.md` for complete Next.js integration.

**Quick test:**

```typescript
// Test fetching the article
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'  // Use anon key for frontend
)

const { data } = await supabase
  .from('blog_articles')
  .select('*')
  .eq('product_id', 'mycompany')
  .eq('status', 'published')
  .limit(1)

console.log(data)
```

---

## 🎉 You're Done!

Your system is now:
- ✅ Generating articles daily
- ✅ Optimizing for SEO
- ✅ Saving to database
- ✅ Ready for frontend integration

---

## 📊 Next Steps

### Immediate (Week 1):
- [ ] Generate 5-10 articles
- [ ] Review quality and adjust prompts if needed
- [ ] Integrate with frontend
- [ ] Submit sitemap to Google Search Console

### Short-term (Month 1):
- [ ] Generate 30 articles
- [ ] Monitor SEO performance
- [ ] Adjust topics based on performance
- [ ] Add more topics to queue

### Long-term (Month 3+):
- [ ] Analyze which topics perform best
- [ ] Refine prompt templates
- [ ] Consider adding more products
- [ ] Scale to multiple websites

---

## 💰 Cost Tracking

Monitor your costs:

**Railway**: Check dashboard for usage
**OpenAI**: [platform.openai.com/usage](https://platform.openai.com/usage)
**Claude**: [console.anthropic.com](https://console.anthropic.com)
**Supabase**: Free tier should be sufficient

Expected: ~$42/month for 30 articles

---

## 🐛 Common Issues

### "No available topics found"

```bash
# Check if file exists
ls data/topics_mycompany.json

# Verify PRODUCT_ID environment variable matches filename
# data/topics_[PRODUCT_ID].json
```

### "healthcheck failing"

```bash
# Set continuous mode
railway variables set RAILWAY_RUN_MODE=continuous
railway restart
```

### "ImportError"

```bash
# Redeploy to get latest code fixes
railway up
```

### Articles in wrong language

**Fix**: Update `language` field in `config/settings.py` and `config/prompts.py`

### SEO score too low

**Fix**: Add more specific keywords to topics, improve prompt instructions for SEO

---

## 🆘 Need Help?

1. Check Railway logs for specific error messages
2. Review `TROUBLESHOOTING.md`
3. Verify all environment variables are set
4. Test locally first: `python main.py`

---

## 🎯 Success Metrics

After 1 month, you should have:
- ✅ 30 published articles
- ✅ Average SEO score: 85+
- ✅ Average word count: 700+
- ✅ Zero deployment failures
- ✅ Consistent daily publishing

---

**Ready to scale? Add more topics and watch your content library grow! 🚀**

**Last Updated**: 2025-12-08
**Estimated Setup Time**: 15 minutes minimum, 2 hours with full customization
