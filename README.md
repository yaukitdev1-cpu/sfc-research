# SFC Research Repository

> Systematic research and design of SFC (Securities and Futures Commission of Hong Kong) document processing infrastructure. Research complete. Design complete. Ready for implementation.

---

## 🎯 Current Status

| Phase | Status | Completion |
|-------|--------|------------|
| **API Research** | ✅ Complete | 100% - All 4 categories documented |
| **Workflow Design** | ✅ Complete | 100% - State-managed processing defined |
| **Microservice Design** | ✅ Complete | 100% - NoSQL model with Git backup strategy |
| **Implementation** | ⏳ Pending | Ready to begin |

**Last Updated:** February 2026

---

## 📚 Quick Navigation

### Research Documentation (Complete)

**e-Distribution API (apps.sfc.hk):**
- [`CIRCULAR_API_SUMMARY.md`](findings/CIRCULAR_API_SUMMARY.md) - 700 circulars, 2000-2026
- [`CIRCULAR_WORKFLOW.md`](findings/CIRCULAR_WORKFLOW.md) - Processing workflow
- [`CONSULTATION_API_SUMMARY.md`](findings/CONSULTATION_API_SUMMARY.md) - 217 consultations, 1989-2026
- [`CONSULTATION_WORKFLOW.md`](findings/CONSULTATION_WORKFLOW.md) - Processing workflow
- [`NEWS_API_SUMMARY.md`](findings/NEWS_API_SUMMARY.md) - 5,205 articles, 1996-2026
- [`NEWS_WORKFLOW.md`](findings/NEWS_WORKFLOW.md) - Processing workflow

**Main Website (www.sfc.hk):**
- [`GUIDELINES_SUMMARY.md`](findings/GUIDELINES_SUMMARY.md) - 50 guidelines, HTML scraping
- [`GUIDELINES_WORKFLOW.md`](findings/GUIDELINES_WORKFLOW.md) - Processing workflow

### Design Documentation (Complete)

**Microservice Architecture:**
- [`DESIGN.md`](DESIGN.md) - **Complete microservice design document**
  - Document-oriented NoSQL data model (one refNo = one document)
  - Category-based API structure
  - Embedded workflow and sub-workflow state
  - Git backup strategy (dehydrate/hydrate)
  - Markdown-only storage
  - Retry and re-run semantics

**Supporting Design:**
- [`STATE_MANAGED_WORKFLOW_SYSTEM.md`](STATE_MANAGED_WORKFLOW_SYSTEM.md) - Workflow state management concepts
- [`schema.sql`](schema.sql) - Reference schema (SQLite-based, for understanding)
- [`workflow-cli.js`](workflow-cli.js) - CLI implementation reference

### Key Statistics

| Category | Count | Date Range | Format |
|----------|-------|------------|--------|
| **Circulars** | ~700 | 2000-2026 | PDF + HTML (2012+) |
| **Consultations** | ~217 | 1989-2026 | Consultation + Conclusion PDFs |
| **News** | ~5,205 | 1996-2026 | HTML + Images + Appendices |
| **Guidelines** | ~50 | 2000-2026 | PDF with version history |
| **TOTAL** | **~6,172** | | |

---

## Background & Objective

### The Ultimate Goal

This research supports the development of a **Multi-Agent AI System** to help financial companies maintain SFC-compliant user manuals. The system features:

- **5 AI agents** working in orchestration ("The Compliant" as the orchestrator)
- **Template-based manual generation** with GitHub PR workflow for version control
- **Auto-crawl SFC documents** with LLM-driven chunking and intelligent processing
- **Telegram notifications** for real-time updates
- **Multi-tenant support** for serving multiple financial institutions

### Why This Research Matters

To build an intelligent compliance system, we need deep understanding of:

1. **SFC API structures** - How data is exposed and accessible ✅
2. **Document organization** - How SFC structures circulars, codes, and consultations ✅
3. **Content patterns** - Common formats, sections, and regulatory language used ✅
4. **Data relationships** - How different document types relate to each other ✅
5. **Update mechanisms** - How SFC publishes and notifies about regulatory changes ✅

---

## 📊 Research Completion Summary

### Phase 1: API Discovery ✅

**Completed:** All 4 SFC document categories fully researched

| Category | API Type | Endpoints | Coverage | Key Finding |
|----------|----------|-----------|----------|-------------|
| Circulars | e-Distribution | 4 | 2000-2026 | PDF universal, HTML 2012+ |
| Consultations | e-Distribution | 4 | 1989-2026 | Two-phase lifecycle (CP + CC) |
| News | e-Distribution | 5 | 1996-2026 | Consistent HTML across all years |
| Guidelines | Main Website | N/A (HTML) | 2000-2026 | Version history via popup tables |

**Key Discovery:** e-Distribution exposes clean JSON APIs for most content, eliminating need for browser-based scraping in most cases.

### Phase 2: Workflow Design ✅

**Completed:** Comprehensive processing workflows for all categories

- **Circulars**: 10-step workflow (search → paginate → fetch → download → convert → save)
- **Consultations**: 8-step workflow (handles consultation + conclusion lifecycle)
- **News**: 10-step workflow (includes image handling)
- **Guidelines**: 8-step workflow (HTML scraping focused)

All workflows include:
- State management at document and step level
- Retry logic with exponential backoff
- Pause/resume capability
- Error handling and recovery

### Phase 3: Microservice Architecture ✅

**Completed:** Document-oriented design with Git backup strategy

**Core Design Decisions:**

1. **NoSQL Document Model**
   - One SFC refNo = one document record
   - Category-specific collections (circulars, guidelines, consultations, news)
   - Embedded workflow state, sub-workflow steps, and metadata

2. **Markdown-Only Storage**
   - Raw PDFs/HTML processed but not retained
   - Only converted markdown stored
   - Consistent format for downstream consumers

3. **Git Backup Strategy**
   - Dehydration: Zip DB + markdown files → commit → push
   - Hydration: Pull → unzip → restore on startup
   - Portability: `git clone` = full data restoration

4. **API Structure**
   ```
   GET /<category>/<refNo>/content           # Markdown content
   GET /<category>/<refNo>/workflow/status   # Processing state
   POST /<category>/<refNo>/workflow/retry   # Retry from failure
   POST /<category>/<refNo>/workflow/re-run  # Re-run from scratch
   ```

5. **Retry vs Re-run**
   - Retry: Resume from failed step (network errors, temporary failures)
   - Re-run: Start fresh with output archiving (false positives, code fixes)

---

## 🚀 What's Next

### Implementation Phase (Ready to Begin)

**Next Steps:**

1. **Set up project structure**
   - Initialize microservice repository
   - Set up NoSQL database (MongoDB/DynamoDB/etc.)
   - Configure Git repository for backups

2. **Implement core components**
   - Document data models (per category)
   - API endpoints (content, workflow status, control)
   - Git backup service (dehydrate/hydrate)
   - Workflow orchestration engine

3. **Implement API clients**
   - Circulars API client
   - Consultations API client
   - News API client
   - Guidelines HTML scraper

4. **Processing pipeline**
   - PDF to text extraction
   - HTML to markdown conversion
   - Image handling (for news)
   - Version history tracking (for guidelines)

5. **Integration & testing**
   - Event publishing (for downstream consumers)
   - End-to-end workflow testing
   - Hydration/dehydration testing
   - Recovery scenario testing

**Success Criteria:**
- ✅ All 6,172 documents can be processed
- ✅ Pause/resume works without data loss
- ✅ Failed documents can be retried
- ✅ False positives can be re-run
- ✅ Other microservices can query via APIs
- ✅ Git backup is automatic and reliable
- ✅ New instance can restore from git clone

---

## 📁 Repository Structure

```
sfc-research/
├── README.md                          # This file - current status
├── DESIGN.md                          # Complete microservice design
│
├── findings/                          # Research outputs (COMPLETE)
│   ├── CIRCULAR_API_SUMMARY.md       # Circulars API documentation
│   ├── CIRCULAR_WORKFLOW.md          # Circulars processing workflow
│   ├── CONSULTATION_API_SUMMARY.md   # Consultations API documentation
│   ├── CONSULTATION_WORKFLOW.md     # Consultations processing workflow
│   ├── NEWS_API_SUMMARY.md           # News API documentation
│   ├── NEWS_WORKFLOW.md              # News processing workflow
│   ├── GUIDELINES_SUMMARY.md         # Guidelines research
│   ├── GUIDELINES_WORKFLOW.md        # Guidelines processing workflow
│   └── RESEARCH_METHODOLOGY.md       # How research was conducted
│
├── STATE_MANAGED_WORKFLOW_SYSTEM.md  # Workflow state management concepts
├── README_STATE_SYSTEM.md             # Workflow CLI usage guide
├── schema.sql                         # Reference database schema
├── workflow-cli.js                    # CLI implementation reference
│
├── notes/                             # Raw research notes (dated)
│   ├── 20260216_circular_content_api_complete.md
│   ├── 20260216_consultations_api_research.md
│   ├── 20260217_news_phase1_reconnaissance.md
│   └── ... (many more)
│
└── progress/                          # Tracking (archive)
    ├── todo.md                        # Completed tasks
    └── completed.md                   # Task completion log
```

---

## 🔍 Key Findings Summary

### API vs Scraping

| Category | Method | Rationale |
|----------|--------|-----------|
| Circulars | API | Clean JSON API, no scraping needed |
| Consultations | API | Clean JSON API, two-phase documents |
| News | API | Clean JSON API, includes images |
| Guidelines | HTML Scrape | No API available, static HTML tables |

### Format Gaps

| Category | Legacy (pre-2012) | Modern (2012+) |
|----------|-------------------|----------------|
| Circulars | PDF only | PDF + HTML + Markdown |
| Consultations | PDF only | PDF + HTML intro |
| News | HTML (all years) | HTML (all years) - consistent! |
| Guidelines | PDF with history | PDF with history |

### Reference Number Patterns

| Category | Format | Example |
|----------|--------|---------|
| Circulars (legacy) | H### | H035, H618 |
| Circulars (modern) | YYEC## | 26EC6, 25EC42 |
| Consultations | YYCP## / YYCC## | 25CP11 / 25CC7 |
| News | YYPR## | 26PR27, 25PR100 |
| Guidelines | UUID | 56F165F53E8E46BE82DC015EDCF41197 |

---

## 📝 Notes for Future Implementers

**From Research:**
- SFC e-Distribution API is stable and well-structured
- No authentication required for read access
- Rate limiting appears to be ~2 req/sec (be polite)
- HTML content only available for circulars 2012+, but news has HTML for all years
- Guidelines require HTML table scraping (no API)

**From Design:**
- Start with document-oriented mindset (one refNo = one doc)
- Git backup is critical for portability
- Markdown conversion must happen immediately (don't store raw PDFs)
- Plan for re-run capability from day one (false positives will happen)
- Category-specific endpoints are essential (different content types)

**Potential Challenges:**
- Guidelines HTML structure could change (no API contract)
- News images need separate handling
- Consultation conclusion papers may arrive days/weeks after consultation
- Version history for guidelines requires popup parsing
- Large news volume (5,205) requires efficient pagination

---

## 🎓 Research Methodology

This research followed a systematic 7-phase methodology documented in [`RESEARCH_METHODOLOGY.md`](findings/RESEARCH_METHODOLOGY.md):

1. Initial reconnaissance (HTTP testing)
2. Browser-based API discovery (Playwright)
3. Endpoint analysis and documentation
4. Historical coverage testing
5. Content and file access testing
6. Edge case and error handling
7. Synthesis and documentation

**Time Investment:**
- Circulars: ~8 hours
- Consultations: ~4 hours
- News: ~6 hours
- Guidelines: ~4 hours
- **Total research time: ~22 hours**

---

*Research began: February 2025*  
*Research completed: February 2026*  
*Design completed: February 2026*  
*Status: Ready for implementation*
