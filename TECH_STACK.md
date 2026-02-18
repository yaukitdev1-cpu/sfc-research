# SFC Document Processing Microservice - Tech Stack

> Technology choices and architecture decisions for the SFC document processing pipeline.

**Status:** ✅ Confirmed and ready for implementation  
**Last Updated:** February 2026

---

## Core Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Bun | Latest | Fast JavaScript runtime with native TypeScript support |
| **Framework** | NestJS | 10.x | Modular API framework with dependency injection |
| **Language** | TypeScript | 5.x | Type safety and modern JavaScript features |
| **Database** | LowDB | 7.x | File-based JSON database for document storage |
| **Queue** | better-queue | 3.x | Persistent job queue (uses LowDB for storage) |

---

## Document Processing

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **HTML → Markdown** | Turndown + Cheerio | Convert SFC HTML content to Markdown |
| **PDF → Markdown** | Docling CLI | Convert PDF documents to Markdown format |
| **HTML Parsing** | Cheerio | Server-side HTML parsing for structure extraction |
| **Date Parsing** | date-fns | Handle multiple SFC date formats ("Apr 2013", "1 Jan 2022") |
| **Schema Validation** | Zod | Runtime validation for document structures |

---

## Infrastructure & Utilities

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Git Operations** | simple-git | Programmatic git commit/push for backups |
| **Compression** | adm-zip | Zip/unzip for dehydration/hydration |
| **Rate Limiting** | p-throttle | Throttle SFC API calls (~2 req/sec) |
| **File Operations** | fs-extra | Enhanced file system operations |
| **HTTP Client** | Native fetch (Bun) | HTTP requests to SFC APIs |
| **Configuration** | @nestjs/config | Environment variable management |
| **Git Auth** | GitHub PAT | Authenticate git operations |

---

## Stack Rationale

### Why Bun?

- **Native TypeScript**: No separate compilation step
- **Fast startup**: ~3x faster than Node.js for CLI tools
- **Built-in fetch**: Modern HTTP client without dependencies
- **SQLite support**: If needed later for complex queries
- **Single executable**: Easy deployment

### Why NestJS?

- **Modular architecture**: Clean separation of concerns
- **Dependency injection**: Testable, maintainable code
- **Decorators**: Declarative API endpoint definitions
- **Built-in validation**: Pipes for request validation
- **Config management**: @nestjs/config for env vars

### Why LowDB?

- **File-based**: No database server to manage
- **JSON-native**: Perfect fit for document-oriented model
- **Git-friendly**: Database is just JSON files
- **Single workload**: No concurrency issues
- **Zero config**: Works out of the box

### Why better-queue?

- **Persistence**: Jobs survive service restarts
- **LowDB adapter**: Uses same storage as documents
- **Retry logic**: Built-in exponential backoff
- **Progress tracking**: Job state and progress
- **Simple API**: Easy to integrate with NestJS

### Why Docling CLI?

- **Dedicated tool**: Purpose-built for PDF→Markdown
- **Quality output**: Better than generic PDF parsers
- **CLI integration**: Spawn process, capture output
- **Active development**: IBM research project

### Why Turndown?

- **Clean output**: Minimal, readable Markdown
- **Configurable**: Custom rules for SFC HTML patterns
- **Widely used**: Battle-tested in production
- **Cheerio integration**: Server-side HTML parsing

---

## Architecture Constraints

### Single Workload Design

**Confirmed**: Service runs only ONE workflow at a time

**Implications:**
- ✅ LowDB is safe (no concurrent writes)
- ✅ No need for distributed locking
- ✅ Simple queue (better-queue on LowDB)
- ✅ No event bus needed
- ✅ Simpler state management

### Data Storage Model

**Document Storage (LowDB):**
```json
{
  "circulars": ["26EC6", "26EC7", ...],
  "guidelines": [...],
  "consultations": [...],
  "news": [...],
  "jobs": [...]
}
```

**Markdown Files (Flat):**
```
data/content/
├── circulars/markdown/2026/26EC6.md
├── guidelines/markdown/EN/fit-and-proper.md
├── consultations/markdown/2025/25CP11_consultation.md
└── news/markdown/2026/26PR27.md
```

### Git Backup Strategy

**Dehydration (Shutdown):**
1. Stop accepting new jobs
2. Wait for current job to complete
3. Zip `./data/db/` and `./data/content/`
4. Git commit with timestamp
5. Git push to remote
6. Cleanup old zips (keep last 10)

**Hydration (Startup):**
1. Check if `./data/db/` exists locally
2. If not, pull from git remote
3. Unzip latest backup
4. Load LowDB collections
5. Resume queue from persisted state

**Git Authentication:**
- GitHub Personal Access Token (PAT)
- Stored in environment variable
- Used by simple-git for HTTPS auth

---

## Dependencies

### Production Dependencies

```json
{
  "@nestjs/common": "^10.x",
  "@nestjs/core": "^10.x",
  "@nestjs/config": "^3.x",
  "@nestjs/platform-fastify": "^10.x",
  "better-queue": "^3.x",
  "lowdb": "^7.x",
  "turndown": "^7.x",
  "cheerio": "^1.x",
  "date-fns": "^3.x",
  "zod": "^3.x",
  "simple-git": "^3.x",
  "adm-zip": "^0.5.x",
  "p-throttle": "^6.x",
  "fs-extra": "^11.x"
}
```

### Development Dependencies

```json
{
  "@nestjs/cli": "^10.x",
  "@types/node": "^20.x",
  "typescript": "^5.x"
}
```

**Note:** Bun has built-in TypeScript support, no `ts-node` needed.

---

## Category-Specific Processing

### Circulars

**Input:** SFC e-Distribution API (JSON + PDF)
**Processing:**
1. Fetch metadata via search API
2. Download PDF via openFile API
3. Convert PDF → Markdown (Docling CLI)
4. Save to `circulars/markdown/{year}/{refNo}.md`
5. Update LowDB record

**Storage:**
- LowDB: `circulars` collection
- Files: `data/content/circulars/markdown/{year}/{refNo}.md`

### Guidelines

**Input:** SFC main website (HTML scraping)
**Processing:**
1. Scrape HTML table
2. Extract metadata from data attributes
3. Download PDF from media server
4. Convert PDF → Markdown (Docling CLI)
5. Save to `guidelines/markdown/{lang}/{slug}.md`
6. Handle version history (multiple PDFs per guideline)

**Storage:**
- LowDB: `guidelines` collection
- Files: `data/content/guidelines/markdown/{lang}/{slug}.md`

### Consultations

**Input:** SFC e-Distribution API (JSON + PDF)
**Processing:**
1. Fetch consultation paper metadata
2. Download consultation PDF
3. If concluded: download conclusion PDF
4. Convert both to Markdown
5. Save to `consultations/markdown/{year}/{refNo}_consultation.md`
   and `consultations/markdown/{year}/{refNo}_conclusion.md`

**Storage:**
- LowDB: `consultations` collection
- Files: `data/content/consultations/markdown/{year}/{refNo}_*.md`

### News

**Input:** SFC e-Distribution API (JSON + HTML)
**Processing:**
1. Fetch HTML content via content API
2. Convert HTML → Markdown (Turndown)
3. Extract plain text for search
4. Download images if present
5. Save to `news/markdown/{year}/{refNo}.md`

**Storage:**
- LowDB: `news` collection
- Files: `data/content/news/markdown/{year}/{refNo}.md`

---

## API Structure

### Endpoints

```
# Category-based document APIs
GET    /circulars/:refNo                   # Document metadata
GET    /circulars/:refNo/content           # Markdown content
GET    /circulars/:refNo/workflow/status   # Workflow state
POST   /circulars/:refNo/workflow/retry    # Retry from failure
POST   /circulars/:refNo/workflow/re-run   # Re-run from scratch

GET    /guidelines/:refNo
GET    /guidelines/:refNo/content
GET    /guidelines/:refNo/versions/:date   # Historical version
...

# Workflow management
GET    /workflows                          # List workflows
GET    /workflows/:id                      # Workflow details
POST   /workflows/:id/pause
POST   /workflows/:id/resume

# Backup & restore
POST   /backup/dehydrate                   # Create zip + git commit
POST   /backup/hydrate                     # Restore from git
GET    /backup/status                      # Last backup info
```

### Controllers (NestJS)

```typescript
// Circulars controller example
@Controller('circulars')
export class CircularsController {
  @Get(':refNo')
  async getDocument(@Param('refNo') refNo: string) {
    return this.circularsService.findOne(refNo);
  }

  @Get(':refNo/content')
  async getContent(@Param('refNo') refNo: string) {
    return this.circularsService.getMarkdownContent(refNo);
  }

  @Post(':refNo/workflow/retry')
  async retry(@Param('refNo') refNo: string, @Body() body: RetryDto) {
    return this.workflowService.retryDocument('circulars', refNo, body.reason);
  }
}
```

---

## Workflow State Machine

Better-queue job states:

```
pending → active → completed
   ↓         ↓
  failed  ← retrying
```

**Retry logic:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
- Max retries: 5 (configurable per step)
- Retriable errors: HTTP 408, 429, 500, 502, 503, 504
- Non-retriable: Parse errors, validation errors

**Re-run logic:**
- Archives current markdown to `data/archive/{refNo}_{timestamp}.md`
- Resets document state to `PENDING`
- Queues fresh processing job
- Old content preserved for comparison

---

## File Organization

### Project Structure

```
sfc-microservice/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── config/
│   │   ├── database.config.ts     # LowDB configuration
│   │   ├── sfc.config.ts           # SFC API endpoints
│   │   └── git.config.ts          # Git backup settings
│   │
│   ├── database/
│   │   ├── lowdb.service.ts       # LowDB wrapper
│   │   ├── schemas/
│   │   │   ├── circular.schema.ts
│   │   │   ├── guideline.schema.ts
│   │   │   ├── consultation.schema.ts
│   │   │   └── news.schema.ts
│   │   └── collections/
│   │       ├── circulars.collection.ts
│   │       ├── guidelines.collection.ts
│   │       ├── consultations.collection.ts
│   │       └── news.collection.ts
│   │
│   ├── workflows/
│   │   ├── workflow.module.ts
│   │   ├── workflow.service.ts    # Workflow orchestration
│   │   ├── queue.service.ts       # Better-queue integration
│   │   └── processors/
│   │       ├── circular.processor.ts
│   │       ├── guideline.processor.ts
│   │       ├── consultation.processor.ts
│   │       └── news.processor.ts
│   │
│   ├── api/
│   │   ├── api.module.ts
│   │   ├── circulars.controller.ts
│   │   ├── guidelines.controller.ts
│   │   ├── consultations.controller.ts
│   │   ├── news.controller.ts
│   │   └── workflows.controller.ts
│   │
│   ├── sfc-clients/
│   │   ├── sfc-client.module.ts
│   │   ├── circular.client.ts     # SFC Circulars API client
│   │   ├── consultation.client.ts
│   │   ├── news.client.ts
│   │   └── guideline.scraper.ts   # HTML scraper
│   │
│   ├── converters/
│   │   ├── converter.module.ts
│   │   ├── turndown.service.ts    # HTML → Markdown
│   │   └── docling.service.ts     # PDF → Markdown (Docling CLI)
│   │
│   ├── backup/
│   │   ├── backup.module.ts
│   │   ├── backup.service.ts      # Dehydrate/hydrate logic
│   │   └── git.service.ts         # Simple-git wrapper
│   │
│   └── common/
│       ├── utils/
│       │   ├── date.utils.ts
│       │   ├── file.utils.ts
│       │   └── throttle.utils.ts
│       └── filters/
│           └── http-exception.filter.ts
│
├── data/                          # Git-ignored (created at runtime)
│   ├── db/
│   │   └── sfc-db.json           # LowDB file
│   └── content/                   # Markdown files
│       ├── circulars/
│       ├── guidelines/
│       ├── consultations/
│       └── news/
│
├── scripts/
│   └── docling-setup.sh           # Docling CLI installation
│
├── bun.lockb
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/db/sfc-db.json

# Content Storage
CONTENT_PATH=./data/content

# SFC API
SFC_BASE_URL=https://apps.sfc.hk/edistributionWeb
SFC_RATE_LIMIT=2  # requests per second
SFC_RETRY_ATTEMPTS=5

# Git Backup
GIT_REPO_URL=https://github.com/yourusername/sfc-data.git
GIT_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
GIT_USER_NAME=SFC Bot
GIT_USER_EMAIL=bot@example.com
BACKUP_RETENTION=10  # keep last 10 backups

# Docling
DOCLING_PATH=/usr/local/bin/docling
DOCLING_TIMEOUT=30000  # ms

# Queue
QUEUE_PATH=./data/db/sfc-db.json  # Same as DB (better-queue uses LowDB)
QUEUE_MAX_RETRIES=5
```

---

## Development Workflow

### Installation

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone <repo>
cd sfc-microservice
bun install

# Install Docling CLI
./scripts/docling-setup.sh

# Copy env
cp .env.example .env
# Edit .env with your settings

# Run
cd sfc-research && bun run src/main.ts
```

### Commands

```bash
# Development
bun run start:dev          # Watch mode
bun run start:debug        # Debug mode

# Production
bun run build
bun run start:prod

# Testing
bun test                   # Run tests

# Linting
bun run lint

# Backup
bun run backup:dehydrate   # Manual backup
bun run backup:hydrate     # Restore from git
```

---

## Performance Considerations

### Bun Advantages

- **Fast cold start**: ~100ms vs Node.js ~300ms
- **Efficient memory**: Lower memory footprint for I/O bound tasks
- **Native fetch**: No need for axios/node-fetch
- **Built-in test runner**: No jest/mocha needed

### LowDB Optimization

- **Single file**: All collections in one JSON file
- **Atomic writes**: File write is atomic (Bun/fs-extra)
- **No indexing needed**: refNo is the key, O(1) lookups
- **Lazy loading**: Load only needed collections

### Queue Tuning

- **Concurrency**: 1 (single workflow)
- **Batch size**: Process one document at a time
- **Polling interval**: 100ms (better-queue default)

---

## Security Considerations

- **PAT storage**: Environment variable only, never commit
- **Git HTTPS**: Use PAT in URL (https://token@github.com/...)
- **No secrets in logs**: Sanitize error messages
- **File permissions**: 0600 for DB and config files

---

## Deployment

### Docker (Optional)

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

RUN mkdir -p data/db data/content

EXPOSE 3000

CMD ["bun", "run", "src/main.ts"]
```

### Systemd Service (Linux)

```ini
[Unit]
Description=SFC Document Processor
After=network.target

[Service]
Type=simple
User=sfc
WorkingDirectory=/opt/sfc-microservice
ExecStart=/usr/local/bin/bun run src/main.ts
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/opt/sfc-microservice/.env

[Install]
WantedBy=multi-user.target
```

---

## Monitoring (Future)

When ready to add monitoring:

- **Logging**: Bun's built-in logger or pino
- **Metrics**: Prometheus client (prom-client)
- **Health checks**: Simple `GET /health` endpoint
- **Queue depth**: Expose via `GET /queue/status`

For now: stdout logs are sufficient.

---

## Next Steps

1. ✅ **Tech stack confirmed** (this document)
2. ⏳ **Initialize project**: `bun init`, install NestJS CLI
3. ⏳ **Setup NestJS structure**: Modules, controllers, services
4. ⏳ **Implement LowDB layer**: Collections, schemas
5. ⏳ **Implement queue**: Better-queue integration
6. ⏳ **Implement SFC clients**: API clients and scraper
7. ⏳ **Implement converters**: Turndown + Docling
8. ⏳ **Implement backup service**: Git integration
9. ⏳ **Implement API endpoints**: Controllers and DTOs
10. ⏳ **Testing**: End-to-end workflow testing

---

*Stack confirmed and ready for implementation*
