# Legacy Circular Investigation - Final Conclusion

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Status:** ✅ **CONFIRMED - Legacy Circulars Not Accessible via API**

---

## Investigation Method: Browser Network Analysis

Used Playwright to capture ALL network requests when loading legacy circular `openFile` URLs.

**Test URL:** `https://apps.sfc.hk/edistributionWeb/openFile?refNo=H035` (2000 circular)

---

## Results

### Requests Made (11 total)

| # | URL | Type |
|---|-----|------|
| 1 | `openFile?refNo=H035` | Initial page load (HTML shell) |
| 2 | `jquery.min.js` | JavaScript library |
| 3 | `slick.min.js` | JavaScript library |
| 4 | `select2.full.min.js` | JavaScript library |
| 5 | `main.c37a2608.chunk.css` | CSS stylesheet |
| 6 | `2.4e3f6381.chunk.js` | React vendor bundle |
| 7 | `main.d006c9f9.chunk.js` | React app bundle |
| 8 | `locales/EN/common.json` | Translation file |
| 9 | `locales/EN/circular.json` | Translation file |
| 10 | `locales/EN/news.json` | Translation file |
| 11 | `locales/EN/consultation.json` | Translation file |

### Critical Finding

**NO API calls made for circular content:**
- ❌ No call to `/api/circular/content?refNo=H035`
- ❌ No call to any file download endpoint
- ❌ No call to fetch PDF or document

---

## Page Behavior

1. **React app loads** - JavaScript bundles execute
2. **No content API call** - React app doesn't attempt to fetch H035 content
3. **Page shows:** "You need to enable JavaScript" (noscript fallback)
4. **Result:** Empty shell with no document content

---

## Conclusion

### Why Legacy Circulars Are Inaccessible

| Observation | Meaning |
|-------------|---------|
| No API calls made | React app has no handler for H-series references |
| `faxFileKeySeq: -8805` | Negative value = "no digital file in system" |
| `openFile?refNo=H###` returns SPA shell | URL route exists but backend has no file |
| Page shows noscript message | No content rendered dynamically |

**Verdict:** Legacy circulars (H-series, 2000-2011) are **not digitally available** through the current e-Distribution system.

---

## Comparison: Modern vs Legacy

| Feature | 2012+ (YYEC##) | 2000-2011 (H###) |
|---------|---------------|------------------|
| Search API | ✅ Lists circulars | ✅ Lists circulars |
| Content API | ✅ Returns full HTML | ❌ Returns `html: null` |
| openFile URL | ✅ Works | ❌ Returns empty shell |
| faxFileKeySeq | Positive number | Negative number |
| Browser API calls | ✅ Multiple API calls | ❌ None |

---

## Final Recommendation

**For sfc-fetch:**

1. **Implement 2012+ only** (years with full API support)
2. **Acknowledge 2000-2011 gap** in documentation
3. **Do not attempt web scraping** for legacy files:
   - Files simply don't exist in current system
   - No hidden API to discover
   - Would need SFC archive access or historical PDF scraping

**Coverage:**
- ✅ **2012-2025:** ~13 years, ~500+ circulars, full structured data
- ❌ **2000-2011:** ~12 years, metadata only, no content access

---

## Alternative for Full Historical Coverage

If 2000-2011 circulars are **absolutely required**:

1. **Contact SFC directly** - Request archive access or bulk data
2. **Historical web scraping** - Scrape old SFC website (if archived)
3. **Manual collection** - Source PDFs from SFC publications
4. **Wayback Machine** - Check web.archive.org for historical snapshots

**Note:** These are outside scope of API-based sfc-fetch implementation.

---

## References

- Main research: `20260216_historical_data_limitations.md`
- API discovery: `20260216_api_endpoint_discovered.md`
- Content API: `20260216_circular_content_api_complete.md`
- Previous investigation: `20260216_legacy_file_access_investigation.md`

---

*Definitive conclusion: Legacy circulars (2000-2011) cannot be accessed via the current SFC e-Distribution API. Recommendation is to implement sfc-fetch for 2012+ coverage only.*
