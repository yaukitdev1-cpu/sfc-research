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

## 2025-02

- [x] Repository structure established
- [x] Initial README with objectives documented
- [x] Research framework defined

---

*Update this as research tasks are completed.*
