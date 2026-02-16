# SFC Circular Content API - Full Detail

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Circular:** 26EC6  
**Status:** ✅ **COMPLETE API STRUCTURE DISCOVERED**

---

## Main Content API Endpoint

```
GET https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo={refNo}&lang={lang}
```

### Example
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=26EC6&lang=EN
```

---

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refNo` | string | Yes | Circular reference number (e.g., "26EC6") |
| `lang` | string | Yes | Language code: "EN", "TC", or "SC" |

---

## Response Structure (Complete)

```json
{
  "refNo": "26EC6",
  "lang": "EN",
  "postDocType": 110,
  "postDocSubtype": 105,
  "deptCode": "IS",
  "releasedDate": "2026-02-11T16:10:23.117",
  "title": "Circular on permitting virtual asset trading platform operators...",
  "html": "<ol>\n <li>This circular sets out...",
  "emailBody": "The Securities and Futures Commission (SFC) posted...",
  "documentLinkUrl": null,
  "faxFileKeySeq": 12306,
  "appendixDocList": [
    {
      "fileKeySeq": 12307,
      "lang": "EN",
      "refNo": 0,
      "caption": "Appendix",
      "dateOnWeb": null
    }
  ],
  "creationTime": "2026-02-11T16:10:23.117",
  "modificationTime": "2026-02-11T16:10:23",
  "publicUrl": "doc?refNo=26EC6"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `refNo` | string | Circular reference number |
| `lang` | string | Language code |
| `postDocType` | number | Document category code (110 = Intermediaries supervision) |
| `postDocSubtype` | number | Document subcategory code |
| `deptCode` | string | Department code ("IS" = Intermediaries Supervision) |
| `releasedDate` | string | ISO 8601 datetime of release |
| `title` | string | Full circular title |
| `html` | string | **Full HTML content of the circular** |
| `emailBody` | string | Pre-formatted text for email notifications |
| `documentLinkUrl` | string \| null | External document link (if any) |
| `faxFileKeySeq` | number | File ID for fax version |
| `appendixDocList` | array | List of appendix documents |
| `creationTime` | string | ISO 8601 creation timestamp |
| `modificationTime` | string | Modification timestamp |
| `publicUrl` | string | Relative URL for web viewing |

---

## HTML Content Structure

The `html` field contains the complete circular content as HTML:

```html
<ol>
 <li>This circular sets out the Securities and Futures Commission's 
   (<strong>SFC</strong>) regulatory approach...</li>
 <li>Liquidity on Hong Kong's VATPs remains subdued...</li>
 ...
</ol>
<p>
 Intermediaries Division<br>
 Securities and Futures Commission<br>
 <br><br>
 Enclosure
</p>
<p>End</p>
<p>SFO/IS/006/2026</p>
<p><sup>1</sup> Paragraph 13.3 of the Guidelines...</p>
```

### HTML Features Observed

- **Ordered lists** (`<ol>`) for main sections
- **Bold text** (`<strong>`) for key terms
- **Line breaks** (`<br>`) for formatting
- **Superscript** (`<sup>`) for footnotes
- **Footnotes** at the end with reference numbers
- **Document reference** (e.g., "SFO/IS/006/2026")

---

## Appendix Download API

From the `emailBody` field, discovered the appendix download URL pattern:

```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?lang={lang}&refNo={refNo}&appendix={index}
```

### Example
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?lang=EN&refNo=26EC6&appendix=0
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `lang` | string | Language code |
| `refNo` | string | Circular reference number |
| `appendix` | number | Zero-based index in appendixDocList |

---

## Department Codes (deptCode)

| Code | Department |
|------|------------|
| "IS" | Intermediaries Supervision |

*Note: More codes to be discovered for other circular types*

---

## Complete API Flow for sfc-fetch

### Step 1: List Circulars
```bash
POST /api/circular/search
```
Returns: List of circulars with metadata (refNo, title, date, etc.)

### Step 2: Get Full Content
```bash
GET /api/circular/content?refNo={refNo}&lang=EN
```
Returns: Full HTML content + metadata + appendix list

### Step 3: Download Appendix (if needed)
```bash
GET /api/circular/openAppendix?lang=EN&refNo={refNo}&appendix=0
```
Returns: PDF or document file

---

## Testing Commands

```bash
# Get circular list
curl -X POST "https://apps.sfc.hk/edistributionWeb/api/circular/search" \
  -H "Content-Type: application/json" \
  -d '{"lang":"EN","category":"all","year":2026,"pageNo":0,"pageSize":20,"sort":{"field":"issueDate","order":"desc"}}'

# Get circular content
curl "https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=26EC6&lang=EN"

# Download appendix (discovered from emailBody)
curl "https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?lang=EN&refNo=26EC6&appendix=0" \
  -o appendix_26EC6.pdf
```

---

## Implications for sfc-fetch

### ✅ Fully API-Driven Approach Works!

| Task | API Available | Notes |
|------|---------------|-------|
| List all circulars | ✅ YES | `/api/circular/search` with pagination |
| Get full content | ✅ YES | `/api/circular/content` returns HTML |
| Get metadata | ✅ YES | Included in both endpoints |
| Download appendix | ✅ YES | `/api/circular/openAppendix` endpoint found |
| No scraping needed | ✅ YES | Pure JSON API approach viable |

### Architecture Recommendations

1. **Pure API implementation** - No headless browser required!
2. **HTML to Markdown** - Convert the `html` field for storage/processing
3. **Incremental fetching** - Use pagination and year filters efficiently
4. **Appendix handling** - Use `openAppendix` endpoint for supplementary docs
5. **Multi-language** - Support EN/TC/SC via `lang` parameter

### Data Model Considerations

```javascript
// Proposed circular document structure
{
  refNo: "26EC6",
  title: "...",
  releasedDate: "2026-02-11T16:10:23.117",
  department: "IS",
  docType: 110,
  docSubtype: 105,
  content: {
    html: "<ol>...</ol>",
    markdown: "1. This circular sets out...",
    plainText: "This circular sets out..."
  },
  metadata: {
    creationTime: "...",
    modificationTime: "...",
    faxFileKeySeq: 12306
  },
  appendices: [
    {
      fileKeySeq: 12307,
      caption: "Appendix",
      downloadUrl: "/api/circular/openAppendix?lang=EN&refNo=26EC6&appendix=0"
    }
  ]
}
```

---

## References

- Circular page: https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC6
- Content API: https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=26EC6&lang=EN
- Search API: https://apps.sfc.hk/edistributionWeb/api/circular/search
- Related: `20260216_api_endpoint_discovered.md`

---

*This confirms sfc-fetch can be built as a pure API client without browser automation!*
