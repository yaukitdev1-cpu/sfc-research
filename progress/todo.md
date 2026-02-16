# Research TODO

## Current Priority Tasks

- [x] ✅ **DONE** - Investigate SFC e-Distribution system for API endpoints
- [x] ✅ **DONE** - Explore individual document endpoint structure
- [ ] Test news and consultation APIs (similar pattern expected)
- [ ] Document rate limiting and pagination behavior
- [ ] Test appendix download endpoint

## Research Questions - Status

1. ✅ **ANSWERED** - Does SFC expose any public/financial data APIs? **YES!** Three endpoints discovered:
   - `POST /api/circular/search` - List circulars
   - `GET /api/circular/content` - **Full HTML content** 🎯
   - `GET /api/circular/openAppendix` - Download appendices
2. ✅ **ANSWERED** - How has the e-Distribution site structure changed? - **It's now API-first!** All data available via JSON
3. ❓ What are the current rate limits or anti-bot measures? - Needs testing
4. 🔄 What content chunking strategy works best? - Can chunk by `<ol>` list items (sections)

---

*Last updated: 2025-02-15*
