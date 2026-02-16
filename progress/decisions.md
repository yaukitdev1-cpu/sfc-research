# Key Decisions & Rationale

*Important decisions made during the research process.*

## 2026-02-16

### Decision: API-First Approach for sfc-fetch
**Rationale:** Browser network inspection revealed a public JSON API (`POST /api/circular/search`) that returns structured circular data with pagination. This eliminates the need for headless browser scraping (Puppeteer/Playwright) for listing circulars.

**Implications:**
- Direct HTTP API calls are faster and more reliable
- No JavaScript execution required for listing circulars
- Pagination support allows efficient historical data fetching
- Individual document content may still require HTML parsing

## 2025-02-15

### Decision: Simple, Flexible Folder Structure
**Rationale:** Research direction is unknown at start. Rigid nested directories create friction. Flat structure with simple categories (`notes/`, `findings/`, `experiments/`, `references/`, `progress/`) allows organic organization as patterns emerge.

---

*Decisions will be added here as the research progresses.*
