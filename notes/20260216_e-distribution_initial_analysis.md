# SFC e-Distribution Initial Analysis

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**URL:** https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/

---

## Summary

The SFC e-Distribution circular page is a **React Single Page Application (SPA)** that requires JavaScript to render content. Direct HTTP requests return only the shell HTML with an empty `<div id="root"></div>`.

---

## Key Findings

### 1. Site Architecture
- **Framework:** React (webpack bundled)
- **Type:** Single Page Application (SPA)
- **Rendering:** Client-side JavaScript required
- **Initial HTML:** Empty shell, content loaded dynamically

### 2. Technology Stack (from HTML inspection)
- React app bundled with webpack
- jQuery present (likely for legacy components)
- Slick carousel and Select2 libraries included
- Served from `/edistributionWeb/` path

### 3. API Discovery Attempts
Tested several common API endpoint patterns:

| Endpoint | Result |
|----------|--------|
| `/edistributionWeb/api/circulars` | 404 Not Found |
| `/edistributionWeb/api/news` | 404 Not Found |
| `/edistributionWeb/api/v1/circulars` | 404 Not Found |
| `/edistributionWeb/gateway/circulars` | Returns HTML (not JSON) |
| `/edistributionWeb/gateway/EN/circular/api` | Returns HTML |

**Observation:** The API endpoints are either:
- Behind a different path structure
- Dynamically constructed in the minified JavaScript
- Require authentication/session
- Not exposed as public REST endpoints

### 4. JavaScript Bundle Analysis
- Main chunk: `main.d006c9f9.chunk.js`
- Vendor chunk: `2.4e3f6381.chunk.js`
- Minified/obfuscated code makes static analysis difficult
- API endpoints likely constructed dynamically at runtime

---

## Implications for sfc-fetch

### API-First Approach
- **Status:** Unclear if public API exists
- **Next Steps:** Need to inspect network traffic from a real browser session
- **Alternative:** May need to reverse-engineer API from JavaScript or use headless browser

### Scraping Approach
- **Status:** Feasible but requires JavaScript execution
- **Tools Needed:** Puppeteer, Playwright, or similar headless browser
- **Previous Work:** sfc-scraper used Puppeteer successfully

---

## Next Steps

1. **Browser Inspection** - Load the site in a real browser and inspect Network tab for actual API calls
2. **JavaScript Debugging** - De-obfuscate or debug the React app to find data fetching logic
3. **Alternative Sources** - Check if SFC provides:
   - RSS feeds
   - Email subscriptions with structured data
   - FTP or bulk download options
   - Developer documentation

---

## References

- Site URL: https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/
- Related: sfc-scraper (previous Puppeteer-based implementation)
