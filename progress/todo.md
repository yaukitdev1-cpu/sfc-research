# Research TODO

## Current Priority Tasks

- [x] ✅ **DONE** - Investigate SFC e-Distribution system for API endpoints
- [x] ✅ **DONE** - Explore individual document endpoint structure
- [x] ✅ **DONE** - Test historical year coverage and HTML availability
- [x] ✅ **DONE** - Test `openFile` URL pattern for legacy circulars
- [ ] Test news and consultation APIs (similar pattern expected)
- [ ] Document rate limiting and pagination behavior

## Research Questions - Status

1. ✅ **ANSWERED** - Does SFC expose any public/financial data APIs? **YES!**
2. ✅ **ANSWERED** - How has the e-Distribution site structure changed? - **API-first!**
3. ✅ **ANSWERED** - Does API work for historical years? **YES, with limitation:**
   - Search API: ✅ Works for 2000-2025
   - Content API: ✅ Full HTML only for 2012+, ❌ Pre-2012 has `html: null`
4. ✅ **ANSWERED** - Can we access legacy circular files? **NO** - `openFile`, `faxFileKeySeq`, browser inspection all failed
5. ❓ What are the current rate limits or anti-bot measures? - Needs testing
6. 🔄 What content chunking strategy works best? - Chunk by `<ol>` list items (2012+ only)

## Research Questions - Status

1. ✅ **ANSWERED** - Does SFC expose any public/financial data APIs? **YES!** Three endpoints discovered:
   - `POST /api/circular/search` - List circulars
   - `GET /api/circular/content` - **Full HTML content** (2012+ only ⚠️)
   - `GET /api/circular/openAppendix` - Download appendices
2. ✅ **ANSWERED** - How has the e-Distribution site structure changed? - **It's now API-first!**
3. ✅ **ANSWERED** - Does API work for historical years? **YES, but with limitation:**
   - Search API: ✅ Works for 2000-2025
   - Content API: ✅ Full HTML only for 2012+, ❌ Pre-2012 has `html: null`
4. ❓ What are the current rate limits or anti-bot measures? - Needs testing
5. 🔄 What content chunking strategy works best? - Chunk by `<ol>` list items (2012+ only)

---

*Last updated: 2025-02-15*
