# Completed Research

*Research items that have been fully documented and synthesized.*

## 2026-02-16

- [x] ✅ **MAJOR DISCOVERY** - SFC circular API endpoint found via browser network inspection
  - Endpoint: `POST /edistributionWeb/api/circular/search`
  - Returns JSON with pagination support
  - No authentication required
  - See `notes/20260216_api_endpoint_discovered.md`

- [x] ✅ **CRITICAL BREAKTHROUGH** - Full circular content API discovered
  - Endpoint: `GET /api/circular/content?refNo={refNo}&lang={lang}`
  - Returns **complete HTML content** - no scraping needed!
  - Also includes: email body, appendix list, metadata
  - See `notes/20260216_circular_content_api_complete.md`

- [x] ✅ **APPENDIX DOWNLOAD** - Appendix endpoint discovered
  - Endpoint: `GET /api/circular/openAppendix?lang={lang}&refNo={refNo}&appendix={index}`
  - Found in `emailBody` field of content API response

- [x] ✅ **CRITICAL LIMITATION DISCOVERED** - Historical data has HTML gap
  - Search API works for years 2000-2025 ✅
  - Content API returns `html: null` for pre-2012 circulars ⚠️
  - Full HTML content only available from 2012 onward
  - Pre-2012 circulars use different ref format (H### vs YYEC##)
  - See `notes/20260216_historical_data_limitations.md`

- [x] ✅ **LEGACY FILE ACCESS INVESTIGATED** - No direct download method found
  - Tested: `openFile?refNo=H###` URL pattern
  - Tested: `faxFileKeySeq` with negative values (-8805, -8429)
  - Tested: Browser inspection for hidden download links
  - Result: **Legacy circulars (2000-2011) not accessible via API**
  - Negative `faxFileKeySeq` indicates "file not digitally available"
  - See `notes/20260216_legacy_file_access_investigation.md`

- [x] ✅ **DEFINITIVE CONFIRMATION** - Browser network analysis proves inaccessibility
  - Captured ALL network requests when loading `openFile?refNo=H035`
  - Result: **NO API calls made** - React app doesn't fetch legacy content
  - Only loads: HTML shell + JS/CSS bundles + locale files (11 requests total)
  - Legacy files simply **not in the system**
  - See `notes/20260216_legacy_final_conclusion.md`

## 2025-02

- [x] Repository structure established
- [x] Initial README with objectives documented
- [x] Research framework defined

---

*Update this as research tasks are completed.*
