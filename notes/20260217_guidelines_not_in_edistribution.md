# SFC Guidelines Research - Corrected Approach

**Date:** 2026-02-17  
**Status:** ✅ **Investigation Complete - Guidelines NOT in e-Distribution**

---

## 🎯 Key Finding

**Following the research methodology, I discovered:**

| Category | Location | Access Method |
|----------|----------|---------------|
| **Circulars** | ✅ e-Distribution | JSON API ✅ |
| **Consultations** | ✅ e-Distribution | JSON API ✅ |
| **News** | ✅ e-Distribution | JSON API ✅ (26 items found) |
| **Guidelines** | ❌ **NOT in e-Distribution** | Main website only (HTML scraping) |
| **Codes** | ❌ **NOT in e-Distribution** | Main website only (HTML scraping) |

---

## 🔍 API Discovery Results

### JavaScript Bundle Analysis

From `/edistributionWeb/static/js/main.d006c9f9.chunk.js`:

```
Found API endpoints:
  ✅ /api/circular      → Researched (700+ items)
  ✅ /api/consultation  → Researched (217 items)  
  ✅ /api/news          → DISCOVERED (26 items) ⚡
  ❌ /api/guideline     → 404 Not Found
  ❌ /api/guidelines    → 404 Not Found
  ❌ /api/codes         → 404 Not Found
```

### API Testing

**Tested:**
```bash
POST /api/guideline/search   → 404 ❌
POST /api/guidelines/search  → 404 ❌
POST /api/codes/search       → 404 ❌
POST /api/news/search        → 200 ✅ (26 items)
```

---

## 📍 Where Guidelines Actually Exist

**Location:** Main SFC Website (www.sfc.hk)
- **URL:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines
- **System:** Sitecore CMS
- **Technology:** Server-rendered HTML
- **Access:** HTML scraping required
- **Count:** 53 guidelines

**Already Researched:**
- ✅ Phase 1: `notes/20260216_guidelines_phase1_reconnaissance.md`
- ✅ Phase 2: `notes/20260216_guidelines_phase2_extraction.md`

---

## 🎉 NEW Discovery: NEWS API

While searching for guidelines, **discovered the NEWS API**:

```
POST /api/news/search
Response: 26 news items (2026)
```

**News API is available in e-Distribution and follows the same pattern as circulars/consultations!**

---

## 🤔 Recommendation

Since **guidelines do NOT exist in e-Distribution**, you have 3 options:

### Option A: Research NEWS API (Recommended)
- ✅ Available in e-Distribution
- ✅ Follows same API pattern
- ✅ 26+ items
- ✅ Can use same methodology as circulars/consultations

### Option B: Complete Guidelines HTML Scraping
- Continue with main website scraping approach
- Different methodology (not API-based)
- 53 guidelines available
- Already documented in Phase 1 & 2 notes

### Option C: Mark Guidelines as Complete
- Guidelines research is DONE (HTML scraping documented)
- Move on to other e-Distribution categories
- News API is the next logical research target

---

## 📊 e-Distribution API Summary

| API | Status | Items | Coverage |
|-----|--------|-------|----------|
| `/api/circular/search` | ✅ Researched | ~700 | 2000-2025 |
| `/api/consultation/search` | ✅ Researched | 217 | 1989-2026 |
| `/api/news/search` | ⚠️ **DISCOVERED** | 26+ | 2026-current |
| `/api/guideline/search` | ❌ **Does NOT exist** | - | - |
| `/api/codes/search` | ❌ **Does NOT exist** | - | - |

---

## 🚀 Next Steps

**If you want to follow the research methodology on a NEW category:**

→ **Research NEWS API** (`/gateway/EN/news/`)

**Why News:**
- ✅ Uses same React SPA architecture
- ✅ Has JSON API endpoints
- ✅ Follows same pattern as circulars/consultations
- ✅ Can apply the complete 7-phase methodology
- ✅ Different data structure (news articles vs circulars/consultations)

**Would you like me to:**
1. **Research NEWS API** using the full methodology?
2. **Complete guidelines HTML scraping** implementation?
3. **Move on to other research areas**?

---

*Investigation complete: Guidelines are NOT part of e-Distribution API system.*
