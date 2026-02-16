# SFC-Fetch Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SFC-Fetch System                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐      ┌─────────────────────────────┐
│   API Layer         │      │     SFC API Endpoints        │
├─────────────────────┤      ├─────────────────────────────┤
│ • searchAPI()       │──────▶│ POST /api/circular/search     │
│ • contentAPI()      │      │ GET  /api/circular/content    │
│ • openFileAPI()     │──────▶│ GET  /api/circular/openFile   │
│ • openAppendixAPI() │      │ GET  /api/circular/openAppendix│
└─────────────────────┘      └─────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Processing Layer  │
├─────────────────────┤
│ • HTML→Markdown     │
│ • Metadata extract  │
│ • Index builder     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐      ┌─────────────────────────────┐
│   Storage Layer     │      │      File System            │
├─────────────────────┤      ├─────────────────────────────┤
│ • PDF storage       │──────▶│ circulars/pdf/{year}/       │
│ • HTML storage      │──────▶│ circulars/html/{year}/      │
│ • Markdown storage  │──────▶│ circulars/markdown/{year}/  │
│ • Appendix storage  │──────▶│ circulars/appendix/{year}/  │
│ • Index JSON        │──────▶│ index.json                  │
└─────────────────────┘      └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Workflows                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INITIAL DOWNLOAD (One-time)              DAILY CHECK          │
│  ───────────────────────────              ───────────          │
│                                                                 │
│  1. Loop years 2000→2026                   1. Search current    │
│     ├─ Search API                           year only           │
│     ├─ For each circular:                  ├─ Compare with    │
│     │  ├─ Download PDF                        index            │
│     │  ├─ Download HTML                    ├─ Detect new/     │
│     │  ├─ Convert to MD                       modified         │
│     │  ├─ Download appendices              ├─ Download new    │
│     │  └─ Store metadata                      content          │
│     └─ Build index                         └─ Update index    │
│  2. Save master index                         & notify        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow (Per Circular)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   refNo: "26EC6"                                                │
│   year: 2026 (≥2012 = Modern)                                  │
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│   │ Search API   │───▶│ Content API  │───▶│ openFile API │    │
│   │ (metadata)   │    │ (HTML)       │    │ (PDF)        │    │
│   └──────────────┘    └──────────────┘    └──────────────┘    │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│   │ index.json   │    │ raw HTML     │    │ PDF file     │    │
│   │              │    │              │    │              │    │
│   └──────────────┘    └──────────────┘    └──────────────┘    │
│          ▼                                                        │
│   ┌──────────────┐                                                │
│   │ Convert to   │                                                │
│   │ Markdown     │                                                │
│   └──────────────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────┐                                                │
│   │ .md file     │                                                │
│   │ (searchable) │                                                │
│   └──────────────┘                                                │
│                                                                 │
│   Appendix (if any):                                            │
│   openAppendixAPI() → PDF → circulars/appendix/                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Legacy Circular (2000-2011)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   refNo: "H035"                                                 │
│   year: 2000 (<2012 = Legacy)                                  │
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐                        │
│   │ Search API   │───▶│ Content API  │                         │
│   │ (metadata)   │    │ (html: null)│                         │
│   └──────────────┘    └──────────────┘                        │
│          │                   │                                   │
│          │                   ▼                                   │
│          │            ┌──────────────┐                          │
│          │            │ Skip HTML  │                          │
│          │            │ conversion │                          │
│          │            └──────────────┘                          │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐                                              │
│   │ openFile API │                                              │
│   │ (PDF only)   │                                              │
│   └──────────────┘                                              │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐                                              │
│   │ PDF file     │                                              │
│   │ (only format)│                                              │
│   └──────────────┘                                              │
│                                                                 │
│   Result: Metadata + PDF (no HTML, no Markdown)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
───────▶  Data flow
───┬───   API call
   ▼     Storage
```

---

## Storage Structure

```
sfc-data/
├── circulars/
│   ├── metadata/
│   │   └── index.json          # Master index
│   │
│   ├── pdf/                    # ALL years (2000-2025)
│   │   ├── 2000/
│   │   │   ├── H035.pdf
│   │   │   └── H046.pdf
│   │   ├── 2010/
│   │   │   ├── H613.pdf
│   │   │   └── H618.pdf
│   │   └── 2026/
│   │       ├── 26EC6.pdf
│   │       ├── 26EC7.pdf
│   │       └── ...
│   │
│   ├── html/                   # 2012+ only
│   │   └── 2026/
│   │       ├── 26EC6_raw.html
│   │       └── 26EC7_raw.html
│   │
│   ├── markdown/               # 2012+ only (converted)
│   │   └── 2026/
│   │       ├── 26EC6.md
│   │       └── 26EC7.md
│   │
│   └── appendix/               # ALL years (when available)
│       ├── 2011/
│       │   └── H618_appendix_0.pdf
│       └── 2026/
│           ├── 26EC6_appendix_0.pdf
│           └── 26EC6_appendix_1.pdf
│
├── logs/
│   ├── full-download.log       # Initial download log
│   ├── daily-check.log         # Daily check log
│   └── errors.log              # Error log
│
├── last-check.json             # Timestamp of last check
└── config.json                 # Configuration
```

---

## File Formats

### index.json
```json
{
  "generatedAt": "2026-02-16T10:00:00Z",
  "totalCount": 712,
  "byYear": {
    "2026": { "count": 48, "circulars": ["26EC6", "26EC7", ...] },
    "2025": { "count": 52, "circulars": [...] }
  },
  "byType": {
    "110": { "count": 234, "name": "Intermediaries supervision" }
  },
  "circulars": {
    "26EC6": {
      "refNo": "26EC6",
      "title": "...",
      "releasedDate": "...",
      "year": 2026,
      "hasHtml": true,
      "hasAppendix": true,
      "files": {
        "mainPdf": "circulars/pdf/2026/26EC6.pdf",
        "rawHtml": "circulars/html/2026/26EC6_raw.html",
        "markdown": "circulars/markdown/2026/26EC6.md",
        "appendices": ["circulars/appendix/2026/26EC6_appendix_0.pdf"]
      },
      "lastFetched": "2026-02-16T10:00:00Z"
    }
  }
}
```

### Markdown Template
```markdown
# {title}

**Reference:** {refNo}  
**Date:** {releasedDate}  
**Year:** {year}  
**Department:** {deptCode}  
**Category:** {postDocType} - {categoryName}

---

## Content

{converted html content}

---

## Source Files

- **PDF:** [{refNo}.pdf](../pdf/{year}/{refNo}.pdf)
- **Raw HTML:** [{refNo}_raw.html](../html/{year}/{refNo}_raw.html)
- **API URL:** https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo={refNo}

---

*Generated by sfc-fetch v1.0*
```

---

## API Request Patterns

### Initial Download
```
POST /api/circular/search
  Body: { lang: "EN", year: YYYY, pageNo: N, pageSize: 50 }
  
GET /api/circular/content?refNo=X&lang=EN
  (For 2012+ only)
  
GET /api/circular/openFile?refNo=X&lang=EN
  (For ALL years - returns PDF)
  
GET /api/circular/openAppendix?refNo=X&appendix=N&lang=EN
  (If appendix exists)
```

### Daily Check
```
POST /api/circular/search
  Body: { lang: "EN", year: CURRENT_YEAR, pageNo: 0, pageSize: 50 }
  
Compare with index.json
Download new items
Update index
```

---

## Performance Estimates

| Operation | Time | Notes |
|-----------|------|-------|
| Search 1 year | ~500ms | 50 items per page |
| Download 1 PDF | ~2-5s | Average 200KB |
| Download 1 HTML | ~500ms | Average 5KB |
| Convert to Markdown | ~50ms | Local processing |
| Full download (all years) | ~2-3 hours | 700+ circulars |
| Daily check | ~5s | Current year only |

---

*Ready for implementation*
