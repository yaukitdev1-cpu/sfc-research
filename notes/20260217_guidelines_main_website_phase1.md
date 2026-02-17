# Guidelines Research - Main SFC Website

**Date:** 2026-02-17
**Source:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines
**Status:** 🔍 Phase 1: Initial Reconnaissance - **COMPLETE**

---

## Summary

The Guidelines section on the main SFC website (www.sfc.hk) is **completely separate** from the e-Distribution system (apps.sfc.hk). It uses a static HTML structure with direct PDF links, not a JSON API.

---

## Key Findings

### 1. Source Location
- **Main website:** www.sfc.hk
- **Path:** `/en/Rules-and-standards/Codes-and-guidelines/Guidelines`
- **NOT e-Distribution** - this is the corporate website, not the distribution platform

### 2. Structure

**Two tabs:**
- ✅ **Latest version** (currently viewing)
- ⏳ **Previous versions** (needs investigation)

**Content organization:**
- Static HTML page
- No embedded JSON data
- No API endpoints
- **45+ PDF files** linked directly

### 3. PDF URL Pattern

```
https://www.sfc.hk/-/media/EN/assets/components/codes/files-current/web/guidelines/
  {guideline-name}/{filename}.pdf?rev={hash}
```

**Example:**
```
https://www.sfc.hk/-/media/EN/assets/components/codes/files-current/web/guidelines/
  fit-and-proper-guidelines/Fit-and-Proper-Guidelines.pdf?rev=d3a9d995e4fa40c89ece44b0fc681e4d
```

### 4. Document Metadata Available

Each guideline entry contains:
- **Title** (as heading text)
- **Issue/Effective Date** (as link title attribute)
- **PDF URL** (direct download)
- **Version count** (e.g., "Four versions", "Seven versions")

### 5. Guidelines Discovered (Sample)

| # | Guideline Title | Date |
|---|-----------------|------|
| 1 | Advertising Guidelines Applicable to Collective Investment Schemes | Apr 2013 |
| 2 | Client Identity Rule Policy | Apr 2003 |
| 3 | Core Operational and Financial Risk Management Controls for OTC Derivatives | Apr 2003 |
| 4 | Debt Collection Guidelines for Licensed Corporations | Apr 2003 |
| 5 | Fit and Proper Guidelines | 1 Jan 2022 |
| 6 | Guidance Note for Persons Advertising or Offering CIS on the Internet | Apr 2013 |
| 7 | Guidance Note on Cooperation with the SFC | 1 Jun 2023 |
| 8 | Guidance note on directors' duties in the context of valuations | 15 May 2017 |
| 9 | Statement on the liability of valuers for disclosure | 15 May 2017 |
| 10 | Guidance Note on Position Limits and Large Open Position Reporting | 2 Jul 2025 |
| 11 | Guidance Note on Short Position Reporting | 18 Jun 2012 |
| 12 | Guidance Note on Short Selling Reporting and Stock Lending | 6 Jun 2023 |
| 13 | Guideline on Anti-Money Laundering and Counter-Financing of Terrorism | 1 Jun 2023 |
| 14 | Guidelines for Electronic Public Offerings | Apr 2003 |
| 15 | Guidelines for Market Soundings | Effective: 2 May 2025 |
| 16 | Guidelines for Reducing and Mitigating Hacking Risks | 27 Oct 2017 |
| 17 | Guidelines for the Approval of Corporations as Approved Lending Agents | 1 Apr 2003 |
| 18 | Guidelines for the Exemption of Listed Corporations from Part XV | 5 Sep 2014 |
| 19 | Guidelines for the Regulation of Automated Trading Services | 1 Sep 2016 |
| 20 | Guidelines for Securities Margin Financing Activities | 4 Apr 2019 |
| 21 | Guidelines for Virtual Asset Trading Platform Operators (VATP) | 1 Jun 2023 |
| 22 | Guidelines on Competence | 2 Oct 2024 |
| 23 | Guidelines on Continuous Professional Training | 1 Jan 2022 |
| 24 | Guidelines on Disclosure of Fees and Charges | 1 Jan 2005 |
| 25 | Guidelines on Disclosure of Inside Information | Jun 2012 |
| ... | (more to be documented) | ... |

---

## Research Questions

### Immediate Questions:
1. **How many total guidelines?** (45 PDF links found - need exact count)
2. **What's in "Previous versions" tab?** (historical versions access)
3. **Which guidelines have multiple versions?** (some show "Seven versions")
4. **Is there a Chinese (TC/SC) version page?**

### Technical Questions:
1. **Scraping approach:** HTML parsing (cheerio/BeautifulSoup) vs regex
2. **Version tracking:** How to detect updates (hash in URL changes?)
3. **Historical access:** Previous versions tab structure
4. **Update detection:** No obvious "last modified" timestamps

---

## Comparison: e-Distribution vs Main Website

| Aspect | e-Distribution (apps.sfc.hk) | Main Website (www.sfc.hk) |
|--------|------------------------------|---------------------------|
| System | React SPA with JSON API | Static HTML/CMS |
| API | ✅ `/api/{category}/search` | ❌ None (HTML scraping) |
| Categories | Circulars, News, Consultations | Guidelines, Codes, other rules |
| Format | JSON metadata + PDF/HTML | Direct PDF links only |
| Updates | Trackable via API | Requires diff/scraping |
| Coverage | 1996-2026 (news), 2000-2025 (circulars) | Current versions only |

---

## Next Steps

### Phase 2: Deep Structure Analysis
- [ ] Scrape complete list of all guidelines
- [ ] Document exact HTML structure for parsing
- [ ] Check "Previous versions" tab
- [ ] Look for Chinese language versions

### Phase 3: Version History
- [ ] Investigate guidelines with multiple versions
- [ ] Understand version navigation
- [ ] Document URL patterns for historical versions

### Phase 4: Update Detection Strategy
- [ ] Design monitoring approach (no API means different strategy)
- [ ] Options:
  - Option A: Periodic full scrape + diff
  - Option B: Check file hashes/ETags
  - Option C: Monitor SFC news for guideline updates

---

## Implementation Notes

**For sfc-fetch integration:**

Since Guidelines are on a different system, recommend:
1. **Separate scraper module** for www.sfc.hk (not e-Distribution API client)
2. **HTML parsing** using cheerio or similar
3. **Different update detection** (no API polling possible)
4. **Version management** important (multiple versions exist)

---

*Research started: 2026-02-17*
*Phase 1 complete - ready for Phase 2*
