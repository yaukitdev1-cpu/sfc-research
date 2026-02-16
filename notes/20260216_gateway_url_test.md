# Gateway URL Test - Legacy vs Modern Comparison

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Status:** ✅ **CONFIRMED - Gateway URLs Use Same API**

---

## Test Method

Browsed both legacy and modern circulars via `/gateway/EN/circular/doc?refNo={refNo}` and captured API calls.

---

## Results

### Modern Circular (26EC6, 2026)

**Gateway URL:**
```
https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC6
```

**API Call Made:**
```
GET /api/circular/content?refNo=26EC6&lang=EN
```

**Response:**
```json
{
  "refNo": "26EC6",
  "html": "<ol>\n <li>This circular sets out...",
  // ... full content
}
```

**Result:**
- ✅ HTML length: **5,962 characters**
- ✅ Page renders full content (6,613 chars visible)

---

### Legacy Circular (H035, 2000)

**Gateway URL:**
```
https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=H035
```

**API Call Made:**
```
GET /api/circular/content?refNo=H035&lang=EN
```

**Response:**
```json
{
  "refNo": "H035",
  "html": null,
  "faxFileKeySeq": -8805,
  // ... metadata only, no content
}
```

**Result:**
- ❌ HTML: **null**
- ❌ Page renders empty content area (navigation only)

---

## Key Finding

Both gateway URLs trigger the **same API endpoint** (`/api/circular/content`), which:
- ✅ Returns full HTML for **2012+ circulars** (YYEC## format)
- ❌ Returns `html: null` for **2000-2011 circulars** (H### format)

---

## Why Legacy Circulars Don't Work

The browser loads the gateway URL → React app loads → App calls content API → API returns `html: null` → React has nothing to render → Empty page with only navigation shell.

**This is not a hidden API issue** - the API is called correctly, it simply has no content for legacy circulars.

---

## Conclusion Remains

| Approach | 2012+ (YYEC##) | 2000-2011 (H###) |
|----------|---------------|------------------|
| Search API | ✅ Works | ✅ Works |
| Content API | ✅ Full HTML | ❌ `html: null` |
| Gateway URL | ✅ Renders | ❌ Empty |
| `openFile` URL | ✅ Would work | ❌ No file |

**Final verdict unchanged:** Legacy circulars not accessible via any URL pattern because the backend API has no content for them.

---

## References

- Main conclusion: `20260216_legacy_final_conclusion.md`
- Historical limitations: `20260216_historical_data_limitations.md`
- API discovery: `20260216_api_endpoint_discovered.md`

---

*Gateway URL test confirms: The issue is not URL routing, but backend data availability. Legacy circulars simply don't have HTML content in the system.*
