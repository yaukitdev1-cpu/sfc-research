# SFC Research Repository

> Systematic research and analysis of SFC (Securities and Futures Commission of Hong Kong) APIs, document structures, and data sources for the SFC Compliance System.

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

1. **SFC API structures** - How data is exposed and accessible
2. **Document organization** - How SFC structures circulars, codes, and consultations
3. **Content patterns** - Common formats, sections, and regulatory language used
4. **Data relationships** - How different document types relate to each other
5. **Update mechanisms** - How SFC publishes and notifies about regulatory changes

### From sfc-scraper to sfc-fetch

This research bridges the gap between `sfc-scraper` (the previous scraping approach) and `sfc-fetch` (the new implementation).

#### What sfc-scraper Did

`sfc-scraper` was a comprehensive Node.js scraper that:
- Scraped news articles from SFC e-Distribution system using Puppeteer
- Extracted full article content and converted HTML to markdown
- Downloaded PDF attachments with intelligent naming
- Tracked all processed articles in JSON format
- Supported incremental processing and duplicate prevention

#### Why sfc-fetch Is Needed

While `sfc-scraper` worked well, several factors necessitate a fresh approach:

1. **Website changes** - SFC website structure may have evolved since the original scraper was built
2. **Different approach** - Moving from browser-based scraping to potentially more efficient API-first approach
3. **Better processing** - Improved chunking, embedding, and LLM integration for the multi-agent system
4. **Maintainability** - Cleaner architecture for long-term maintenance
5. **Integration needs** - Better fit with the multi-agent compliance system architecture

---

## Document Approach

### Research Documentation Philosophy

Every finding must be documented. **No discovery is too small to record.**

This serves multiple purposes:
- **Knowledge persistence** - Research survives beyond individual sessions
- **Decision traceability** - Design choices can be traced back to findings
- **Team alignment** - Clear documentation enables collaboration
- **Future reference** - Avoid re-researching already explored areas

### Documentation Requirements

For each research finding, create a document that includes:

1. **What was discovered** - Clear description of the finding
2. **How it was found** - Methodology used (API endpoint, inspection, etc.)
3. **Evidence** - Screenshots, code snippets, response samples, URLs
4. **Implications** - What this means for the system design
5. **Timestamp** - When the discovery was made (SFC websites change)
6. **Confidence level** - Certain, likely, or needs verification

---

## Repository Structure

Keep it simple and flexible. Organize as you go.

```
sfc-research/
├── README.md              # This file
├── notes/                 # Research notes (dated files)
├── findings/              # Synthesized insights
├── experiments/           # Test scripts and code
├── references/            # Downloaded docs, PDFs, screenshots
└── progress/              # Tracking what you're working on
```

### Simple Guidelines

- **`notes/`** - Drop research notes here. Name them `YYYYMMDD_what-you-found.md`
- **`findings/`** - When patterns emerge, write up consolidated insights
- **`experiments/`** - Any code you write to test something
- **`references/`** - SFC PDFs, screenshots, external docs
- **`progress/`** - `todo.md`, `completed.md` to track work

That's it. No rigid subdirectories. Reorganize as needed.

---

## Getting Started

### Research Workflow

1. **Start exploring** - Pick an area (APIs, e-Distribution, documents)
2. **Take notes** - Create a dated file in `notes/` as you discover things
3. **Capture evidence** - Screenshots, API responses, URLs
4. **Review and synthesize** - When you see patterns, write them up in `findings/`
5. **Track progress** - Update `progress/todo.md` so you know what's next

### Completed Research Areas

✅ **CIRCULARS** - Complete API documentation (4 endpoints, 2000-2025, ~700 items)  
✅ **CONSULTATIONS** - Complete API documentation (4 endpoints, 1989-2026, 217 items)  
✅ **NEWS** - Complete API documentation (5 endpoints, 1996-2026, 5,205 items)  

See `findings/` directory for comprehensive API documentation and workflow guides.

### First Research Tasks

Priority areas to explore:

1. ~~**API Discovery** - Does SFC expose any JSON endpoints or data feeds?~~ ✅ Done
2. ~~**e-Distribution System** - How does the news/circulars list work? Pagination?~~ ✅ Done
3. ~~**Document Patterns** - What do circulars look like? Common sections?~~ ✅ Done
4. ~~**Access Methods** - API vs scraping? Any rate limits or anti-bot measures?~~ ✅ Done

---

## Integration with sfc-fetch

Once research is complete, findings will inform:

- **Data architecture** - How sfc-fetch stores and organizes data
- **Fetching strategy** - API vs scraping decisions
- **Processing pipeline** - Content chunking and embedding approach
- **Multi-agent integration** - How agents access and query SFC data

---

## Notes

- **Timestamps matter** - SFC website structure changes; always note when research was conducted
- **Verify periodically** - Re-check findings every few months
- **Document failures too** - What didn't work is as valuable as what did
- **Stay legal** - Respect robots.txt, terms of service, and rate limits
- **Stay flexible** - This structure is a starting point, not a rulebook

---

*Research began: February 2025*
*Objective: Enable intelligent SFC compliance system through systematic data source understanding*
