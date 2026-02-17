# Guidelines API Summary - Main SFC Website

**Date:** 2026-02-17
**Source:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines
**Status:** ✅ **Research Complete**

---

## 📊 Overview

| Metric | Value |
|--------|-------|
| **Total Guidelines** | 50 |
| **With Version History** | 32 (64%) |
| **Format** | Static HTML with embedded popups |
| **PDF Storage** | SFC Media Server (`/-/media/EN/assets/...`) |
| **Current Files Path** | `/files-current/web/guidelines/` |
| **Previous Files Path** | `/files-previous/web/guidelines/` |
| **Languages** | English (EN), Traditional Chinese (TC), Simplified Chinese (SC) |

---

## 🏗️ Data Structure

### HTML Structure

```html
<tr data-code-guideline-id="{UUID}" data-code-guideline-topics="{Category}">
  <td>{Guideline Title}</td>
  <td>
    <a href="{current_pdf_url}" title="{effective_date}">{effective_date}</a>
  </td>
  <td>
    <a data-popup-id="#popup{UUID}">{N} versions</a>  <!-- Only if history exists -->
  </td>
</tr>

<!-- Version History Popup -->
<div class="section-popup__content" id="popup{UUID}">
  {Guideline Title}
  <table>
    <tr>
      <td>
        <a href="{historical_pdf_url}" title="{start_date}">
          {start_date} - {end_date}
        </a>
      </td>
    </tr>
  </table>
</div>
```

### Data Attributes

| Attribute | Description | Example |
|-------------|-------------|---------|
| `data-code-guideline-id` | Unique UUID | `56F165F53E8E46BE82DC015EDCF41197` |
| `data-code-guideline-topics` | Regulatory category | `Licensing`, `Intermediaries_supervision` |
| `title` (on link) | Effective/Issue date | `1 Jan 2022`, `Apr 2013` |
| `href` | Direct PDF URL | `https://www.sfc.hk/-/media/EN/...` |

---

## 📋 Complete Guidelines List (50 Total)

### By Regulatory Topic

#### Licensing (8 guidelines)
1. **Fit and Proper Guidelines** (1 Jan 2022) - *4 versions*
2. **Guidelines for Virtual Asset Trading Platform Operators** (1 Jun 2023)
3. **Guidelines on Competence** (2 Oct 2024) - *with Appendix C*
4. **Guidelines on Continuous Professional Training** (1 Jan 2022)
5. **Guidelines on Waivers of Certain Licensing Fees** (Mar 2003)
6. **Licensing Handbook** (15 Jul 2025)
7. **Licensing Handbook for Virtual Asset Trading Platform Operators** (15 Jul 2025)

#### Intermediaries Supervision (12 guidelines)
1. **Client Identity Rule Policy** (Apr 2003)
2. **Core Operational and Financial Risk Management Controls for OTC Derivatives** (Apr 2003)
3. **Debt Collection Guidelines for Licensed Corporations** (Apr 2003)
4. **Guidance Note for Persons Advertising or Offering CIS on the Internet** (Apr 2013) - *2 versions*
5. **Guidance Note on Cooperation with the SFC** (1 Jun 2023) - *2 versions*
6. **Guidance note on directors' duties in valuations** (15 May 2017)
7. **Guideline on AML/CFT for Licensed Corporations** (1 Jun 2023)
8. **Guidelines for Securities Margin Financing Activities** (4 Apr 2019)
9. **Guidelines on Disclosure of Fees and Charges** (1 Jan 2005)
10. **Guidelines to capital market intermediaries** (5 Aug 2022)
11. **Management, Supervision and Internal Control Guidelines** (1 Apr 2003)
12. **Prevention of Money Laundering and Terrorist Financing Guideline** (1 Jun 2023)
13. **Risk Management Guidelines for Licensed Persons Dealing in Futures** (25 Aug 2023)
14. **Suggested Control Techniques and Procedures** (Apr 2003)

#### Market Infrastructure & Trading (5 guidelines)
1. **Guidance Note on Position Limits** (2 Jul 2025)
2. **Guidance Note on Short Position Reporting** (18 Jun 2012)
3. **Guidance Note on Short Selling Reporting** (6 Jun 2023)
4. **Guidelines for Electronic Public Offerings** (Apr 2003)
5. **Guidelines for the Regulation of Automated Trading Services** (1 Sep 2016)
6. **Guidelines on CPMI-IOSCO Principles** (27 May 2016)

#### Listings & Takeovers / Takeovers Only (8 guidelines)
1. **Guidelines on Disclosure of Inside Information** (Jun 2012)
2. **Guidelines on Exempt Fund Manager (EFM) Status** (10 Apr 2001) - *Revised 30 Sep 2010*
3. **Guidelines on Exempt Principal Trader (EPT) Status** (10 Apr 2001) - *Revised 30 Sep 2010*
4. **Guidelines on revised procedures for EPT applications** (5 Jul 2013)
5. **Guidelines on revised procedures for EFM applications** (5 Jul 2013)
6. **Guidelines on applying for relaxation from procedural formalities** (21 Feb 2003)
7. **Guidelines on using offer awareness materials** (Mar 2003)
8. **Guidelines on using dual prospectus structure** (21 Feb 2003)
9. **Guidelines to fund managers on dealing disclosure** (12 Jan 2017)
10. **Project on Plain Language - Clear Prospectus** (Jan 1998)
11. **Project on Plain Language - Clear Announcements** (Jul 1997)

#### Investment Products (3 guidelines)
1. **Advertising Guidelines for CIS** (Apr 2013)
2. **Guidelines on Marketing Materials for Listed Structured Products** (Sep 2006)
3. **Guidelines on Online Distribution and Advisory Platforms** (6 Jul 2019)

#### Disclosure of Interests (3 guidelines)
1. **Guidelines for the Approval of Corporations as Approved Lending Agents** (1 Apr 2003)
2. **Guidelines for the Exemption of Listed Corporations from Part XV** (5 Sep 2014)
3. **Outline of Part XV of the SFO** (24 May 2024)

#### Enforcement (3 guidelines)
1. **Guidance Note on Cooperation with the SFC** (1 Jun 2023) - *2 versions*
2. **SFC Disciplinary Fining Guidelines (Part V SFO)** (1 Jun 2023)
3. **SFC Disciplinary Fining Guidelines (Pre-2018)** (10 Aug 2018)

#### Other / Mixed
1. **Guidelines for Market Soundings** (Effective: 2 May 2025)
2. **Guidelines for Reducing and Mitigating Hacking Risks** (27 Oct 2017)
3. **Statement on valuers' liability** (15 May 2017)

---

## 📁 URL Patterns

### Current Version PDF
```
https://www.sfc.hk/-/media/EN/assets/components/codes/
  files-current/web/guidelines/{guideline-folder}/{filename}.pdf?rev={hash}
```

### Previous Version PDF
```
https://www.sfc.hk/-/media/EN/assets/components/codes/
  files-previous/web/guidelines/{guideline-folder}/{filename}-{date}.pdf?rev={hash}
```

**Example:**
- Current: `Fit-and-Proper-Guidelines.pdf?rev=d3a9d995e4fa40c89ece44b0fc681e4d`
- Previous: `Fit-and-Proper-Guidelines_Oct2013.pdf?rev=0bdc836c4033473490f4eacd526e36be`

---

## 🔄 Version History Examples

### Fit and Proper Guidelines (4 versions, dating back to Dec 2000)

| # | Effective Period | Date Stamp |
|---|------------------|------------|
| Current | 1 Jan 2022 - present | (current PDF) |
| v3 | 1 Oct 2013 - 31 Dec 2021 | Oct2013 |
| v2 | 1 Sep 2006 - 30 Sep 2013 | 2006-09-01 |
| v1 | 1 Mar 2003 - 31 Aug 2006 | 2003-03-01 |
| v0 | Dec 2000 - 28 Feb 2003 | 2003-02-28 |

---

## 🌐 Multi-Language Support

| Language | URL Pattern | PDF Count |
|----------|-------------|-----------|
| English | `/en/.../Guidelines` | 50 guidelines, 107 PDFs |
| Traditional Chinese | `/tc/.../Guidelines` | ~50 guidelines, 102 PDFs |
| Simplified Chinese | `/sc/.../Guidelines` | (to be verified) |

**Note:** Chinese versions have slightly different PDF counts, suggesting some guidelines may be English-only or have different versioning.

---

## 🛠️ Implementation for sfc-fetch

### Scraping Strategy

Since this is static HTML (no API):

```javascript
// 1. Fetch HTML page
const html = await fetch('https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines');

// 2. Parse with cheerio or similar
const $ = cheerio.load(html);

// 3. Extract guidelines
const guidelines = [];
$('tr[data-code-guideline-id]').each((i, el) => {
  const id = $(el).attr('data-code-guideline-id');
  const topics = $(el).attr('data-code-guideline-topics');
  const title = $(el).find('td:first').text().trim();
  const currentLink = $(el).find('td:eq(1) a');
  const date = currentLink.attr('title');
  const pdfUrl = currentLink.attr('href');
  
  // Check for version history
  const versionBtn = $(el).find('.popup-btn');
  const hasVersions = versionBtn.length > 0;
  
  guidelines.push({ id, topics, title, date, pdfUrl, hasVersions });
});

// 4. Extract version history from popups (if needed)
// Parse popup divs for historical versions
```

### Update Detection Strategy

**Challenge:** No API means no timestamp/metadata for change detection.

**Options:**
1. **ETag/Last-Modified headers** - Check HTTP headers on PDFs
2. **Content hash** - Hash PDF content and compare
3. **Periodic full scrape + diff** - Compare parsed structure
4. **Monitor SFC News** - Watch for "Guidelines updated" announcements

**Recommended:** Combine #3 (weekly full scrape) + #4 (monitor news for immediate updates)

### Storage Structure

```
sfc-data/
├── guidelines/
│   ├── metadata/
│   │   └── guidelines.json          # Parsed list with IDs
│   ├── current/                     # Latest versions
│   │   ├── fit-and-proper-guidelines.pdf
│   │   ├── vatp-operators.pdf
│   │   └── ...
│   └── historical/                  # Previous versions
│       ├── fit-and-proper-guidelines/
│       │   ├── 2022-01-01.pdf
│       │   ├── 2013-10-01.pdf
│       │   └── ...
│       └── ...
└── index.json                       # Master index
```

---

## ⚠️ Key Considerations

1. **No API** - Must scrape HTML, handle structural changes
2. **No timestamps** - Hard to detect updates without re-scraping
3. **Version history** - 64% have multiple versions (32/50)
4. **Date formats** - Multiple formats ("Apr 2013", "1 Jan 2022", "Effective date: 2 May 2025")
5. **Language variations** - EN/TC/SC may have different content
6. **Mixed categories** - Some guidelines have multiple topics

---

## 📚 Related Documentation

- `20260217_guidelines_main_website_phase1.md` - Initial reconnaissance
- `CIRCULAR_API_SUMMARY.md` - e-Distribution API (different system)
- `NEWS_API_SUMMARY.md` - e-Distribution API (different system)
- `CONSULTATION_API_SUMMARY.md` - e-Distribution API (different system)

---

*Research completed: 2026-02-17*
*Total guidelines documented: 50*
*With full version history: 32*
