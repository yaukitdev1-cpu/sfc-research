# SFC e-Distribution API Discovery

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Method:** Playwright network capture  
**Status:** ✅ API Endpoint Discovered

---

## Main API Endpoint

```
POST https://apps.sfc.hk/edistributionWeb/api/circular/search
```

---

## Request Parameters

**Content-Type:** `application/json`

**Request Body Structure:**
```json
{
  "lang": "EN",
  "category": "all",
  "year": 2026,
  "pageNo": 0,
  "pageSize": 20,
  "sort": {
    "field": "issueDate",
    "order": "desc"
  },
  "isLoading": true,
  "errors": null,
  "items": null,
  "total": -1
}
```

### Parameter Details

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `lang` | string | Language code | "EN", "TC", "SC" |
| `category` | string | Filter by category | "all" |
| `year` | number | Filter by year | 2026, 2025, etc. |
| `pageNo` | number | Page number (0-indexed) | 0, 1, 2... |
| `pageSize` | number | Items per page | 20 |
| `sort.field` | string | Sort field | "issueDate" |
| `sort.order` | string | Sort direction | "desc", "asc" |

---

## Response Structure

**Content-Type:** `application/json`

**Response Format:**
```json
{
  "items": [
    {
      "refNo": "26EC5",
      "lang": "EN",
      "title": "Circular title here...",
      "releasedDate": "2026-02-11T16:10:41.191",
      "postDocType": 110,
      "appendixDocList": [
        {
          "fileKeySeq": 12307,
          "lang": "EN",
          "refNo": 0,
          "caption": "Appendix",
          "dateOnWeb": null
        }
      ],
      "publicUrl": "intermediaries/supervision/doc?refNo=26EC5"
    }
  ],
  "total": 7
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | List of circular items |
| `items[].refNo` | string | Reference number (e.g., "26EC5") |
| `items[].lang` | string | Language code |
| `items[].title` | string | Full circular title |
| `items[].releasedDate` | string | ISO 8601 datetime |
| `items[].postDocType` | number | Category code (see below) |
| `items[].publicUrl` | string | Relative URL to full document |
| `items[].appendixDocList` | array | List of supplementary documents |
| `total` | number | Total count of results |

---

## Document Type Codes (postDocType)

From locale files:

| Code | Category |
|------|----------|
| 100 | Product authorization |
| 110 | Intermediaries supervision |
| 120 | Licensing |
| 130 | External relations |
| 140 | Listings & takeovers |
| 150 | Market infrastructure & trading |

---

## Locale/Translation Endpoints

The site also loads translation files:

```
GET https://apps.sfc.hk/edistributionWeb/locales/EN/common.json
GET https://apps.sfc.hk/edistributionWeb/locales/EN/circular.json
GET https://apps.sfc.hk/edistributionWeb/locales/EN/news.json
GET https://apps.sfc.hk/edistributionWeb/locales/EN/consultation.json
```

These contain UI labels and category mappings.

---

## Accessing Full Circular Content

From the API response, use the `publicUrl` field:

```
https://apps.sfc.hk/edistributionWeb/{publicUrl}
```

Example:
```
https://apps.sfc.hk/edistributionWeb/intermediaries/supervision/doc?refNo=26EC5
```

---

## Testing with cURL

```bash
# Get first page of 2026 circulars
curl -X POST "https://apps.sfc.hk/edistributionWeb/api/circular/search" \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "EN",
    "category": "all",
    "year": 2026,
    "pageNo": 0,
    "pageSize": 20,
    "sort": {
      "field": "issueDate",
      "order": "desc"
    }
  }'
```

---

## Implications for sfc-fetch

### ✅ API-First Approach is Viable!

Unlike the initial assessment (React SPA requiring headless browser), **there IS a public JSON API** that can be accessed directly via HTTP POST requests.

### Recommendations

1. **Direct API calls** - No need for Puppeteer/Playwright for listing circulars
2. **Pagination support** - Use `pageNo` and `pageSize` for batch fetching
3. **Year filtering** - Can filter by year, fetch historical data efficiently
4. **Document type filtering** - Can filter by `postDocType` if needed
5. **Full content** - Still need to fetch individual circular pages via `publicUrl`

### Architecture Notes

- API returns metadata only (title, date, ref number)
- Full content requires separate HTTP GET to `publicUrl`
- Appendix documents listed in `appendixDocList`
- No authentication required (public API)

---

## Next Steps

1. Test pagination to fetch all historical circulars
2. Explore the individual document endpoint structure
3. Check if other sections (news, consultations) have similar APIs:
   - `/api/news/search`
   - `/api/consultation/search`
4. Document rate limiting behavior
5. Test Chinese (TC/SC) language support

---

## References

- Main site: https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/
- API endpoint: https://apps.sfc.hk/edistributionWeb/api/circular/search
- Related research: `20260216_e-distribution_initial_analysis.md`
