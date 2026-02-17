# SFC Guidelines Research - Phase 1 Complete

**URL:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines  
**Date:** 2026-02-16  
**Status:** Phase 1 (Reconnaissance) Complete

---

## 🎯 Key Finding: NOT a React SPA

Unlike the **e-Distribution** system (circulars, consultations), the **main SFC website** is a **traditional CMS-driven HTML website**.

| Feature | e-Distribution | Main SFC Website |
|---------|----------------|----------------|
| **Architecture** | React SPA | Traditional CMS |
| **Content** | Loaded via JSON API | Server-rendered HTML |
| **Data Access** | REST API | HTML scraping |
| **JavaScript** | Required (empty root div) | Enhancement only |

---

## 📊 Guidelines Page Structure

### What We Found

**Total Guidelines:** 53

**HTML Structure:**
```html
<tr data-code-guideline-id="DD514C18019549CE98C9C7B838BEF455" 
    data-code-guideline-topics="Investment_products">
    <td>
        <a href="https://www.sfc.hk/-/media/EN/assets/components/codes/files-current/web/guidelines/.../filename.pdf?rev=40ec438171854b829cd6118a0e5cfbd0" 
           target="_blank" 
           title="Apr 2013">Apr 2013</a>
    </td>
</tr>
```

**Data Attributes:**
- `data-code-guideline-id`: UUID (e.g., "DD514C18019549CE98C9C7B838BEF455")
- `data-code-guideline-topics`: Category tags (e.g., "Investment_products", "Intermediaries_supervision")
- `title`: Date (e.g., "Apr 2013", "1 Jan 2022")

---

## 🔗 PDF URL Pattern

```
https://www.sfc.hk/-/media/EN/assets/components/codes/files-current/web/guidelines/
  {folder-name}/
  {Filename}.pdf
  ?rev={revision-hash}
```

**Example:**
```
https://www.sfc.hk/-/media/EN/assets/components/codes/files-current/web/guidelines/
  fit-and-proper-guidelines/
  Fit-and-Proper-Guidelines.pdf
  ?rev=d3a9d995e4fa40c89ece44b0fc681e4d
```

---

## 📋 Sample Guidelines Extracted

| # | Guideline | Date | Topics |
|---|-----------|------|--------|
| 1 | Advertising Guidelines (CIS) | Apr 2013 | Investment_products |
| 2 | Client Identity Rule Policy | Apr 2003 | Intermediaries_supervision, Enforcement |
| 3 | Core Operational and Financial Risk Management | Apr 2003 | Intermediaries_supervision |
| 4 | Debt Collection Guidelines | Apr 2003 | Intermediaries_supervision |
| 5 | Fit and Proper Guidelines | 1 Jan 2022 | Licensing |
| 6 | AML/CFT Guidelines | 1 Jun 2023 | Intermediaries_supervision |
| 7 | Guidelines for VATP Operators | 1 Jun 2023 | Licensing |
| 8 | Guidelines on Competence | 2 Oct 2024 | Licensing, Intermediaries_supervision |
| 9 | Guidelines for Market Soundings | 2 May 2025 | (none) |
| 10 | Guidance Note on Position Limits | 2 Jul 2025 | Market_infrastructure_&_trading |

---

## 🏷️ Categories (Topics) Found

- `Investment_products`
- `Intermediaries_supervision`
- `Enforcement`
- `Licensing`
- `Listings_&_takeovers`
- `Market_infrastructure_&_trading`
- `Disclosure_of_Interests`
- (some have no category)

---

## 🛠️ Access Method: HTML Scraping

Since there's **no JSON API**, we must:

1. **Fetch the HTML page**
   ```bash
   curl -s "https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines"
   ```

2. **Parse the HTML table**
   - Extract `data-code-guideline-id`
   - Extract `data-code-guideline-topics`
   - Extract PDF URL from `href`
   - Extract date from `title`

3. **Download PDFs**
   ```bash
   curl -O "https://www.sfc.hk/-/media/.../filename.pdf?rev=..."
   ```

---

## 📅 Date Range

From the sample:
- **Oldest:** Apr 2003 (Client Identity Rule Policy)
- **Newest:** Jul 2025 (Guidance Note on Position Limits)
- **Range:** ~22 years (2003-2025)

---

## 🔍 Technical Details

### Website Platform
- **CMS:** Sitecore (inferred from URL patterns and structure)
- **Media Library:** `/-/media/` path indicates Sitecore
- **Revision IDs:** `?rev=` parameter for cache-busting

### No API Endpoints Found
```
❌ /api/guidelines          → 404
❌ /api/codes               → 404
❌ /-/media/SFC/data/*.json → 404
```

### JavaScript Search Feature
The page includes a **lunr.js** search index for filtering guidelines by topic and keyword, but this is client-side only and doesn't provide structured data export.

---

## 📁 Proposed Storage Structure

```
sfc-data/
├── guidelines/
│   ├── metadata/
│   │   └── guidelines-index.json      # Scraped from HTML
│   ├── pdf/
│   │   ├── 2003/
│   │   │   ├── client-identity-rule-policy.pdf
│   │   │   └── debt-collection-guidelines.pdf
│   │   ├── 2022/
│   │   │   └── fit-and-proper-guidelines.pdf
│   │   └── 2025/
│   │       └── guidance-note-position-limits.pdf
│   └── by-category/
│       ├── Licensing/
│       ├── Intermediaries_supervision/
│       └── Investment_products/
```

---

## 🔄 Next Steps

### Phase 2: Extraction Strategy
Need to decide:
1. **Scraping Tool:** cheerio (Node.js), BeautifulSoup (Python), or similar
2. **Update Detection:** Compare revision IDs (`?rev=` parameter)
3. **Incremental Updates:** Store metadata, check for new/changed rev IDs

### Phase 3: Implementation
1. Build HTML scraper
2. Extract all 53 guidelines metadata
3. Download all PDFs
4. Build index with revision tracking

---

## ⚠️ Key Differences from e-Distribution

| Aspect | Circulars/Consultations | Guidelines |
|--------|------------------------|------------|
| **System** | e-Distribution | Main SFC Website |
| **Architecture** | React SPA | CMS (Sitecore) |
| **Data Access** | JSON API | HTML Scraping |
| **Total Items** | 700+ circulars, 217 consultations | 53 guidelines |
| **Updates** | API query | Scrape & compare rev IDs |
| **Auth** | None (public) | None (public) |

---

## 🎯 Recommendation

**Guidelines require a different approach:**
- No API client needed
- HTML scraper/parser needed
- Revision ID tracking for updates
- Simpler dataset (53 items vs 900+ combined for circulars/consultations)

**Priority:** Lower than circulars/consultations due to:
- Smaller dataset (53 vs 900+)
- Static nature (guidelines don't change frequently)
- No API complexity

---

*Research Status: Phase 1 Complete. Proceeding to Phase 2 (Extraction Strategy).*