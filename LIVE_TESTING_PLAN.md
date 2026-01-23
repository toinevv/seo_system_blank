# Live Testing Plan: IndexYourNiche on Lovable Project

## Overview
Test the zero-friction CLI setup flow on a real Lovable project to validate:
1. Landing page copyable command works
2. Signup → Dashboard → Personalized API key flow
3. CLI actually runs and connects to IndexYourNiche
4. Article generation works end-to-end

---

## Pre-requisites

### 1. Lovable Project Setup
- [ ] Have a Lovable project with Supabase connected
- [ ] Know your Supabase URL (from Lovable dashboard or Supabase)
- [ ] Have your Supabase Service Role Key ready

### 2. IndexYourNiche Deployed
- [ ] Dashboard deployed at https://indexyourniche.com
- [ ] API endpoints working (`/api/v1/*`)
- [ ] Worker deployed and running

---

## Test Flow

### Step 1: Landing Page Experience
**URL:** https://indexyourniche.com

- [ ] Navigate to landing page
- [ ] Scroll to "One Command. Instant SEO." section
- [ ] Verify command is visible:
  ```bash
  INDEXYOURNICHE_API_KEY=<YOUR_API_KEY> npx @indexyourniche/cli init -y -d yoursite.com && iyn scan && iyn topics --discover && iyn generate -y
  ```
- [ ] Click "Copy Command" button
- [ ] Verify "Copied!" feedback appears
- [ ] Click "Get Your Free API Key" button

### Step 2: Signup Flow
**URL:** https://indexyourniche.com/signup

- [ ] Fill in signup form
- [ ] Complete signup
- [ ] Verify redirect to `/dashboard`

### Step 3: Dashboard Quick Setup
**URL:** https://indexyourniche.com/dashboard/setup

- [ ] Navigate to "Setup Guide" in sidebar
- [ ] Verify "Quick Setup" card appears at top
- [ ] Check if API key is auto-generated
- [ ] If first visit: Verify "⚠️ Save this key!" warning appears
- [ ] Change domain to your Lovable project domain (e.g., `myproject.lovable.app`)
- [ ] Verify command updates with new domain
- [ ] Copy the personalized command:
  ```bash
  INDEXYOURNICHE_API_KEY=iyn_xxx... npx @indexyourniche/cli init -y -d myproject.lovable.app && iyn scan && iyn topics --discover && iyn generate -y
  ```

### Step 4: Run in Lovable
**In Lovable AI chat:**

Option A - Direct command:
```
Run this command in the terminal:
INDEXYOURNICHE_API_KEY=iyn_xxx npx @indexyourniche/cli init -y -d myproject.lovable.app && iyn scan && iyn topics --discover && iyn generate -y
```

Option B - AI Agent prompt (copy from dashboard):
```
Add SEO to my project with IndexYourNiche. Run this command:

INDEXYOURNICHE_API_KEY=iyn_xxx npx @indexyourniche/cli init -y -d myproject.lovable.app && iyn scan && iyn topics --discover && iyn generate -y
```

### Step 5: Observe CLI Output

Expected flow:
1. **npx installs** `@indexyourniche/cli`
2. **iyn init** - Creates `seo.config.json` in project
3. **iyn scan** - Analyzes website (may prompt for Supabase URL/Key)
4. **iyn topics --discover** - AI generates topic ideas
5. **iyn generate -y** - Creates first GEO-optimized article

**Watch for:**
- [ ] CLI installs successfully
- [ ] Config file created
- [ ] Website registered in IndexYourNiche
- [ ] Topics discovered
- [ ] Article generated

### Step 6: Verify in Dashboard
**URL:** https://indexyourniche.com/dashboard/websites

- [ ] See your Lovable project listed
- [ ] Click on website
- [ ] Check topics were created
- [ ] Check generation log shows success

### Step 7: Verify in Lovable Supabase
**In Lovable project:**

- [ ] Check `blog_articles` table exists
- [ ] Verify article was inserted
- [ ] Check article has:
  - Title
  - Content (HTML)
  - Slug
  - Meta description
  - TL;DR (for GEO)
  - FAQ items (for GEO)

---

## Troubleshooting

### CLI Not Found
```bash
# Try direct npx
npx @indexyourniche/cli --version
```

### API Key Invalid
- Go to Dashboard → Setup Guide
- Generate a new key if needed
- Ensure you copied the FULL key (not just prefix)

### Supabase Connection Failed
- CLI will prompt for:
  - Target Supabase URL
  - Target Service Role Key
- Get these from Lovable's Supabase integration or Supabase dashboard

### Article Not Generated
- Check Dashboard → Generation Logs for errors
- Verify website has topics
- Check worker is running (Dashboard shows worker status)

---

## Success Criteria

✅ **Complete success if:**
1. CLI runs without errors in Lovable
2. Website appears in IndexYourNiche dashboard
3. At least one topic is created
4. One article is generated and saved to Lovable's Supabase

---

## Notes for Future

### If Supabase prompts are friction:
- Could pre-populate from Lovable's environment
- Could use a simpler connection wizard

### If CLI install is slow:
- Consider publishing to npm for faster installs
- Could create a global install option

### Improvements to consider:
- Add `--supabase-url` and `--supabase-key` flags to CLI
- Auto-detect Supabase from Lovable env vars
- Show progress in dashboard while CLI runs
