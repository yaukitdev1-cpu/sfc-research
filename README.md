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
2. **Document organization** - How SFC structures circulars, guidelines, codes, and consultations
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

```
sfc-research/
├── README.md                 # This file - overview and navigation
├── research/                 # Core research findings
│   ├── apis/                # API endpoint discoveries
│   │   ├── e-distribution/  # SFC e-Distribution system APIs
│   │   ├── circulars/       # Circulars and guidelines APIs
│   │   ├── consultations/   # Public consultation APIs
│   │   └── codes/           # Codes and guidelines APIs
│   ├── documents/           # Document structure analysis
│   │   ├── circulars/       # Circular document patterns
│   │   ├── guidelines/      # Guidelines document patterns
│   │   ├── codes/           # Codes of conduct patterns
│   │   └── consultations/   # Consultation document patterns
│   ├── scraping/            # Scraping methodology research
│   │   ├── selectors/       # CSS selectors and DOM patterns
│   │   ├── anti-bot/        # Anti-bot detection findings
│   │   └── rate-limits/     # Rate limiting observations
│   └── sfc-structure/       # SFC website organization
│       ├── navigation/      # Site structure and navigation
│       ├── search/          # Search functionality analysis
│       └── archives/        # Historical data access
├── findings/                # Processed findings and insights
│   ├── api-endpoints.md     # Consolidated API documentation
│   ├── content-patterns.md  # Common document patterns
│   ├── data-models.md       # Proposed data models
│   └── integration-notes.md # Integration recommendations
├── experiments/             # Experimental code and tests
│   ├── api-tests/          # API endpoint tests
│   ├── scraper-tests/      # Scraping approach tests
│   └── parser-tests/       # Content parsing experiments
├── references/              # External references
│   ├── sfc-docs/           # Downloaded SFC documentation
│   ├── legal-framework/      # Legal framework documents
│   └── related-projects/     # Related open source projects
└── progress/                # Research progress tracking
    ├── todo.md             # Current research tasks
    ├── completed.md        # Completed research items
    └── decisions.md        # Key decisions and rationale
```

### Directory Purposes

#### `research/`

Raw research findings organized by domain. Each subdirectory contains:
- Markdown notes for each discovery
- Code snippets for reproduction
- Screenshots or evidence files
- Links to relevant resources

**Naming convention**: `{YYYYMMDD}_{brief-description}.md`

Example: `20250215_e-distribution-pagination-api.md`

#### `findings/`

Consolidated, processed insights synthesized from raw research. These are the "conclusions" that inform system design.

#### `experiments/`

Working code, tests, and proof-of-concept implementations. Nothing here is production-ready, but everything teaches us something.

#### `references/`

Downloaded or referenced external materials. Keep SFC PDFs, screenshots, and related documentation here.

#### `progress/`

Tracking what's been done and what's next. Use this to maintain momentum and context across research sessions.

---

## Getting Started

### Research Workflow

1. **Pick a domain** from the objectives above (APIs, documents, scraping, structure)
2. **Create a research note** in the appropriate `research/` subdirectory
3. **Document as you go** - don't wait until the end
4. **Summarize findings** in `findings/` when patterns emerge
5. **Update progress** in `progress/` to track status

### First Research Tasks

Based on the sfc-fetch objective, priority research areas:

1. **API Discovery**
   - Does SFC expose any public APIs?
   - Are there hidden/internal endpoints that return JSON?
   - Can we find structured data feeds?

2. **e-Distribution System Analysis**
   - How is the news/circulars list populated?
   - Is there pagination? How does it work?
   - What metadata is available for each item?

3. **Document Structure Patterns**
   - Common sections in circulars
   - PDF vs HTML content availability
   - Attachment handling patterns

4. **Access Method Evaluation**
   - API-first vs scraping requirements
   - Rate limiting and anti-bot measures
   - Authentication needs (if any)

---

## Contributing to Research

### When Adding Research

1. Create dated markdown file in appropriate subdirectory
2. Include discovery method, evidence, and implications
3. Cross-reference related findings
4. Update `progress/todo.md` to mark as in-progress or completed

### When Synthesizing Findings

1. Review related research notes
2. Identify patterns and commonalities
3. Write consolidated finding in `findings/`
4. Link back to source research notes

---

## Integration with sfc-fetch

Once research is complete, findings will inform:

- **Data architecture** - How sfc-fetch stores and organizes data
- **Fetching strategy** - API vs scraping decisions
- **Processing pipeline** - Content chunking and embedding approach
- **Multi-agent integration** - How agents access and query SFC data

Research findings will be the foundation for sfc-fetch design decisions.

---

## Notes

- **Timestamps matter** - SFC website structure changes; always note when research was conducted
- **Verify periodically** - Re-check findings every few months
- **Document failures too** - What didn't work is as valuable as what did
- **Stay legal** - Respect robots.txt, terms of service, and rate limits

---

*Research began: February 2025*
*Objective: Enable intelligent SFC compliance system through systematic data source understanding*
