# SFC News API Research - Phase 1: Initial Reconnaissance

**Date:** 2026-02-17
**Target:** https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/
**Status:** 🔄 Phase 1 - Initial Reconnaissance

---

## Step 1: Direct HTTP Test

Testing if the page returns static HTML or a dynamic SPA shell.

**Result:** React SPA (Same architecture as circulars/consultations)

```html
<div id="root"></div>
<noscript>You need to enable JavaScript to run this app.</noscript>
<script src="/edistributionWeb/static/js/main.d006c9f9.chunk.js"></script>
```

✅ **Confirmed:** Dynamic React application - need browser inspection for API discovery

---

## Step 2: Test for Public APIs

Testing common API patterns:

### Search API Test
```bash
curl -s -X POST "https://apps.sfc.hk/edistributionWeb/api/news/search" \
  -H "Content-Type: application/json" \
  -d '{"lang":"EN","pageNo":0,"pageSize":10}'
```

**Result:** ✅ **200 OK - API FOUND!**

**Response Summary:**
- **Total items:** 5,205 news items
- **Items returned:** 10 (page 0, size 10)
- **News types observed:** "GN" (General News?), "EF" (Enforcement?)

**Sample Item Structure:**
```json
{
  "newsRefNo": "26PR27",
  "lang": "EN",
  "title": "Settlement with Sino Wealth International Limited...",
  "newsExtLink": null,
  "newsType": "GN",
  "issueDate": "2026-02-16T16:53:29.346",
  "creationTime": null,
  "modificationTime": "2026-02-16T16:53:29"
}
```

---

## Step 3: JavaScript Bundle Inspection

Looking for additional API endpoints in the main JS chunk:

**APIs Found in Bundle:**
```
/api/news/search
/api/news/content?
/api/news/notification?
/api/news/openAppendix?
/api/news/openImage?refNo=
```

**News Categories Found:**
| Category | URL Path | Code |
|----------|----------|------|
| all | (default) | all |
| corporate | corporate-news | corporate |
| other | other-news | other |
| enforcement | enforcement-news | enforcement |

**Key Findings from Code Analysis:**
- Year range: **1996 - current** (`startYear:1996`)
- Supports month filtering (1-12)
- Has image list support (`imageList` field)
- Has appendix support (`appendixDocList`)
- Has external link field (`newsExtLink`)
- News types: "GN" (General), "EF" (Enforcement)

---

## Phase 1 Summary

✅ **SPA Architecture Confirmed** - Same as circulars/consultations
✅ **Search API Discovered** - `POST /api/news/search` works!
✅ **Total Items:** 5,205 news items
✅ **Year Coverage:** 1996 - 2026 (30 years)
✅ **Multiple Endpoints Found** - content, notification, openAppendix, openImage

**Ready for Phase 2:** Browser-based API discovery to capture all endpoints

---

*Phase 1 Complete: 2026-02-17*