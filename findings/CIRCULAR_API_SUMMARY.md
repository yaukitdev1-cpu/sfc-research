# SFC Circular API - Complete Research Summary

**Date:** 2026-02-16  
**Status:** ✅ **Research Complete**  
**Coverage:** 2000-2025 (25 years of circulars)

---

## 📊 API Endpoints Discovered

### 1. Search/List Circulars
```
POST https://apps.sfc.hk/edistributionWeb/api/circular/search
```

**Request Body:**
```json
{
  "lang": "EN",           // Language: EN, TC, SC
  "category": "all",      // Filter by category or "all"
  "year": 2025,           // Year to fetch (2000-2025)
  "pageNo": 0,            // Zero-based page number
  "pageSize": 20,         // Items per page (max ~100)
  "sort": {
    "field": "issueDate", // Sort field
    "order": "desc"       // asc or desc
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "refNo": "26EC6",           // Reference number
      "lang": "EN",
      "title": "Circular title...",
      "releasedDate": "2026-02-11T16:10:23.117",
      "postDocType": 110,         // Category code
      "appendixDocList": [...],   // Appendix metadata
      "publicUrl": "intermediaries/supervision/doc?refNo=26EC6"
    }
  ],
  "total": 48                   // Total items for pagination
}
```

**Works for:** 2000-2025 (all years)

---

### 2. Get Circular Content
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo={refNo}&lang={lang}
```

**Parameters:**
- `refNo`: Circular reference (e.g., "26EC6", "H035")
- `lang`: Language code

**Response Structure:**
```json
{
  "refNo": "26EC6",
  "lang": "EN",
  "postDocType": 110,
  "postDocSubtype": 105,
  "deptCode": "IS",              // Department code
  "releasedDate": "2026-02-11T16:10:23.117",
  "title": "Full circular title",
  "html": "<ol>...</ol>",        // HTML content (2012+ only)
  "emailBody": "...",            // Pre-formatted notification text
  "documentLinkUrl": null,         // External link if any
  "faxFileKeySeq": 232,          // PDF file ID
  "appendixDocList": [...],      // Appendix metadata
  "creationTime": "...",
  "modificationTime": "...",
  "publicUrl": "doc?refNo=26EC6"
}
```

**Works for:** All years (returns metadata)  
**Full HTML:** 2012+ only (YYEC## format)  
**HTML null:** 2000-2011 (H### format)

---

### 3. Download Main PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openFile?lang={lang}&refNo={refNo}
```

**Response:** `application/pdf` binary

**Works for:** ALL years (2000-2025)

---

### 4. Download Appendix PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?lang={lang}&refNo={refNo}&appendix={index}
```

**Parameters:**
- `refNo`: Circular reference
- `appendix`: Zero-based index from `appendixDocList` array

**Response:** `application/pdf` binary

**Works for:** ALL years (2000-2025)

---

## 📈 Historical Coverage

| Period | Ref Format | Total Circulars | Content Format | Appendix Support |
|--------|-----------|-----------------|----------------|------------------|
| **2012-2025** | YYEC## | ~500+ | HTML + PDF | ✅ Yes |
| **2000-2011** | H### | ~200+ | PDF only | ✅ Yes (rare) |

**Appendix availability:**
- 2000-2010: Rare (found 0 in tested years)
- 2011+: More common (e.g., H618 has 2 appendices)
- 2012+: Regular appendices

---

## 🔢 Document Type Codes (postDocType)

| Code | Category |
|------|----------|
| 100 | Product authorization |
| 110 | Intermediaries supervision |
| 120 | Licensing |
| 130 | External relations |
| 140 | Listings & takeovers |
| 150 | Market infrastructure & trading |
| 160 | Takeovers (only) |
| 170 | Enforcement |
| 180 | Disclosure of interests |
| 190 | Unlisted shares, debentures |
| 200 | VATP (Virtual Asset Trading Platform) |
| 900 | Others |

---

## 🏢 Department Codes (deptCode)

| Code | Department |
|------|------------|
| "IS" | Intermediaries Supervision |

*More codes to be discovered as encountered*

---

## 📄 Content Format Differences

### 2012+ Circulars (YYEC##)
- ✅ HTML content via `content` API
- ✅ PDF via `openFile` API
- ✅ Structure: `<ol><li>...</li></ol>` with sections
- ✅ Footnotes in `<sup>` tags
- ✅ Department codes and subtypes

### 2000-2011 Circulars (H###)
- ❌ No HTML content (`html: null`)
- ✅ PDF via `openFile` API
- ⚠️ Less metadata (no subtypes, fewer fields)
- ✅ Still have titles, dates, categories

---

## 🔑 Key Findings

1. **Pure API approach works** - No browser automation needed
2. **PDFs available for ALL years** via `openFile` API
3. **HTML only for 2012+** - Use PDF for legacy
4. **Appendices work for ALL years** via `openAppendix` API
5. **Pagination supported** - Fetch year by year
6. **No authentication** - Public API
7. **Rate limits unknown** - Needs testing

---

## 🚀 Recommended Architecture

### Data Model

```javascript
// Circular document structure
{
  // Core metadata
  refNo: "26EC6",
  lang: "EN",
  title: "Circular title...",
  releasedDate: "2026-02-11T16:10:23.117",
  
  // Classification
  postDocType: 110,
  postDocSubtype: 105,
  deptCode: "IS",
  category: "Intermediaries supervision",
  
  // Content (format depends on year)
  content: {
    format: "html",     // "html" or "pdf-only"
    html: "<ol>...</ol>",  // null for pre-2012
    markdown: "1. This circular...",  // Converted from HTML
    pdfUrl: "/api/circular/openFile?lang=EN&refNo=26EC6"
  },
  
  // Files
  files: {
    mainPdf: "26EC6.pdf",           // Always downloaded
    rawHtml: "26EC6_raw.html",     // If HTML available
    markdown: "26EC6.md",          // Converted
    appendices: [
      "26EC6_appendix_0.pdf",
      "26EC6_appendix_1.pdf"
    ]
  },
  
  // Metadata
  creationTime: "2026-02-11T16:10:23.117",
  modificationTime: "2026-02-11T16:10:23",
  lastFetched: "2026-02-16T10:00:00Z",
  apiVersion: "1.0"
}
```

---

## 📝 File Storage Structure

```
sfc-data/
├── circulars/
│   ├── metadata/              # JSON metadata files
│   │   ├── 2026/
│   │   │   ├── 26EC6.json
│   │   │   └── 26EC7.json
│   │   ├── 2025/
│   │   └── ...
│   ├── pdf/                  # PDF files (all years)
│   │   ├── 2026/
│   │   │   ├── 26EC6.pdf
│   │   │   └── 26EC7.pdf
│   │   ├── 2000/
│   │   │   └── H035.pdf
│   │   └── ...
│   ├── html/                 # Raw HTML (2012+ only)
│   │   ├── 2026/
│   │   │   ├── 26EC6_raw.html
│   │   │   └── 26EC7_raw.html
│   │   └── ...
│   ├── markdown/             # Converted markdown (2012+ only)
│   │   ├── 2026/
│   │   │   ├── 26EC6.md
│   │   │   └── 26EC7.md
│   │   └── ...
│   └── appendix/             # Appendix PDFs
│       ├── 2026/
│       │   ├── 26EC6_appendix_0.pdf
│       │   └── 26EC6_appendix_1.pdf
│       └── ...
├── index.json                 # Master index of all circulars
└── last-check.json            # Last update check timestamp
```

---

## ⚠️ Limitations & Notes

1. **HTML Content Gap:** Pre-2012 circulars have no HTML, only PDF
2. **Appendix Rarity:** Legacy appendices are rare (found only in 2011+)
3. **Negative fileKeySeq:** Indicates legacy files but APIs still work
4. **No Rate Limit Info:** Test carefully, implement backoff
5. **Language Support:** EN/TC/SC available

---

## 📚 References

- `20260216_api_endpoint_discovered.md` - Initial API discovery
- `20260216_circular_content_api_complete.md` - Content API details
- `20260216_historical_data_limitations.md` - HTML gap documentation
- `20260216_legacy_final_conclusion.md` - PDF discovery for legacy
- `20260216_legacy_appendix_discovery.md` - Appendix API for legacy

---

*Research complete. Ready for sfc-fetch implementation.*
