# Guidelines Research - Phase 1: Initial Reconnaissance

**Date:** 2026-02-17
**Status:** 🔍 Investigation in Progress

---

## Summary

The Guidelines category appears to work differently from Circulars, News, and Consultations. Initial investigation shows the Guidelines page exists on e-Distribution but may not have a corresponding API.

---

## Phase 1 Findings

### 1. Direct HTTP Test

**URL:** `https://apps.sfc.hk/edistributionWeb/gateway/EN/guidelines/`

**Result:** ✅ Page exists, returns React SPA shell (same pattern as other categories)

```html
<div id="root"></div>
<script>...</script>
```

### 2. API Endpoint Tests

| Endpoint | Status | Result |
|----------|--------|--------|
| `/api/guideline/search` | ❌ 404 | Not Found |
| `/api/guidelines/search` | ❌ 404 | Not Found |
| `/api/guideline` | ❌ 404 | Not Found |
| `/api/guidelines` | ❌ 404 | Not Found |

**Pattern comparison:**
- ✅ `/api/circular/search` - Works
- ✅ `/api/news/search` - Works
- ✅ `/api/consultation/search` - Works
- ❌ `/api/guideline/search` - Does NOT work

### 3. Other Category Tests

Tested variations:
- `/api/code/search` - 404
- `/api/codes/search` - 404
- `/api/guidance/search` - 404
- `/api/policy/search` - 404
- `/api/standard/search` - 404
- `/api/standards/search` - 404
- `/api/rules/search` - 404

**Conclusion:** Only circular, news, and consultation have API endpoints.

---

## Key Questions

1. **Are Guidelines on e-Distribution?** The page exists but may load data differently (static content, iframe, or different API pattern)

2. **Are Guidelines on the main SFC website?** The main www.sfc.hk site has guideline content in different sections:
   - `/en/Regulatory-functions/Intermediaries/Licensing/Guidelines/`
   - Various regulatory function pages

3. **Are Guidelines part of other categories?** Previous research shows "Guidelines" mentioned in:
   - Consultation titles (e.g., "Consultation Paper on the Proposed Guidelines for Market Soundings")
   - Circular content (e.g., references to VATP Guidelines)

---

## Next Steps

Since the API pattern doesn't work for Guidelines, need to investigate:

1. **Browser inspection** (if browser tool available) - Check what network requests the Guidelines page makes
2. **Main website scraping** - Guidelines may be on www.sfc.hk, not apps.sfc.hk
3. **Clarification needed** - What specific Guidelines content is needed?
   - SFC Codes and Guidelines (e.g., Code of Conduct for Persons Licensed by/Registered with the SFC)
   - Guidelines as published on main website
   - Guidelines referenced within circulars/consultations

---

## Recommendations

**Option A:** Research Guidelines on main SFC website (www.sfc.hk)
- Different scraping approach needed
- May have different document structure

**Option B:** Accept that e-Distribution only has 3 API-accessible categories
- Circulars ✅
- News ✅
- Consultations ✅
- Guidelines ❌ (different system)

**Option C:** Investigate if Guidelines can be extracted from circulars/news content
- Guidelines are often referenced in circulars
- May not be a standalone document type

---

*Phase 1 Complete - Need clarification on Guidelines scope before proceeding*
