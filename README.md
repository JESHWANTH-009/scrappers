# RAG Data Collector

> **Production-Ready Website & Wikipedia Scraper for Retrieval-Augmented Generation (RAG)**

A high-performance full-stack web application designed to crawl documentation portals or harvest Wikipedia knowledge bases by keyword, extract clean content, and persist structured Markdown (`.md`) files with rich YAML front-matter metadata optimized for vector databases and LLM pipelines.

---

## 🌟 Key Features

- **Dual Ingestion Modes**:
  - **Option A: Website URL Crawler**: Async Breadth-First Search (BFS) crawler with configurable boundary scoping (strict path, hostname, subdomains), concurrency limits, politeness delays, and URL regex filtering.
  - **Option B: Wikipedia Keyword Harvester**: Official MediaWiki Action API integration searching multilingual Wikipedia editions, resolving sections, preserving references, and discovering related articles.
- **RAG-Ready Metadata**: Every saved file includes standardized YAML front matter (`title`, `source_url`, `canonical_url`, `content_hash`, `crawl_depth`, `parent_url`, `source_type`, `language`, `http_status`, `page_id`, `revision_id`).
- **Hierarchical File Storage**:
  - General websites mirror readable source URL directory structures (e.g., `pages/guide/install/linux/index.md`).
  - Wikipedia saves deterministic slugs (e.g., `pages/wikipedia/en/artificial_intelligence--1164.md`).
  - Automatic collision prevention via short hash fallback.
- **Manifest Generation**: Generates `manifest.json` for each crawl capturing overall metrics, page statuses, and the full parent-child crawl relationship tree.
- **Live Scraping Dashboard**:
  - Real-time Server-Sent Events (SSE) streaming progress.
  - Live terminal-style activity log viewer with level filtering (INFO, SUCCESS, WARN, ERROR) and auto-scroll.
  - Live cancellation and retry handling.
- **Air-Tight Security**:
  - **SSRF Protection**: Validates schemes (HTTP/HTTPS only), resolves DNS before requests, blocks loopback/private/link-local/multicast IP addresses (127.x, 10.x, 172.16.x, 192.168.x, 169.254.x), and cloud metadata endpoints.
  - **Redirect Re-Validation**: Inspects every 3xx redirect destination for SSRF before following.
  - **Path Traversal Prevention**: Guarantees all read/write and ZIP archive operations stay strictly within authorized boundaries.
- **One-Click Downloads**: Direct download of individual Markdown files or complete crawl ZIP archives containing all documents and `manifest.json`.

---

## 🏗️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React Icons |
| **Backend** | Python 3.12+, FastAPI, Uvicorn, httpx, BeautifulSoup4, lxml, Markdownify, PyYAML, aiosqlite |
| **Database** | SQLite with asynchronous WAL mode (`aiosqlite`) |
| **External API** | Official MediaWiki Action API (`action=query`, `action=parse`) |
| **Streaming** | Server-Sent Events (SSE) |
| **Testing** | Pytest, Pytest-Asyncio, Starlette TestClient, httpx MockTransport |

---

## 📁 Project Structure

```
Prati-1/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point & CORS
│   │   ├── config.py                   # Pydantic BaseSettings configuration
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── crawls.py           # REST endpoints & SSE streaming
│   │   │       └── health.py           # Health diagnostics endpoint
│   │   ├── crawler/
│   │   │   ├── url_crawler.py          # BFS URL crawler with concurrency & SSRF
│   │   │   ├── wikipedia_crawler.py    # MediaWiki Action API harvester
│   │   │   ├── url_normalizer.py       # Normalization, tracking strip & path mapping
│   │   │   └── scope_rules.py          # Boundary scoping & extension filtering
│   │   ├── extraction/
│   │   │   ├── html_extractor.py       # BeautifulSoup4 parsing & link discovery
│   │   │   └── markdown_converter.py   # HTML-to-Markdown & YAML front matter
│   │   ├── storage/
│   │   │   ├── file_storage.py         # Hierarchical file manager & ZIP packager
│   │   │   └── manifest.py             # Manifest.json & tree hierarchy builder
│   │   ├── models/
│   │   │   └── schemas.py              # Pydantic v2 schemas
│   │   ├── services/
│   │   │   ├── crawl_manager.py        # Background task coordinator & cancel token
│   │   │   ├── job_store.py            # SQLite async persistence & crash recovery
│   │   │   └── sse_broadcaster.py      # Real-time SSE broadcaster
│   │   └── security/
│   │       ├── url_validation.py       # SSRF protection & DNS IP checking
│   │       └── path_security.py        # Safe path containment & sanitization
│   ├── tests/                          # 26 automated unit & integration tests
│   ├── requirements.txt                # Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/                 # UI components (Sidebar, Navbar, StatsCard, LiveLogViewer, PageTreeView, MarkdownPreviewModal)
│   │   ├── pages/                      # Dashboard, NewScrape, LiveCrawl, CrawlHistory, CrawlDetail, MarkdownFiles, Settings
│   │   ├── services/                   # Typed API client & SSE connector
│   │   ├── types/                      # TypeScript domain models
│   │   ├── App.tsx                     # Main layout & router state
│   │   └── index.css                   # Tailwind directives & glassmorphic styling
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data/
│   ├── crawls.db                       # SQLite job and page state database
│   └── crawls/                         # Isolated crawl directories & ZIPs
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup & Run

```bash
# Navigate to backend directory
cd backend

# (Optional) Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
```
The backend API is now running at `http://127.0.0.1:8000`.
- Swagger Interactive Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup & Run

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend is now running at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

A comprehensive automated test suite covers SSRF protection, URL normalization, scope rules, HTML extraction, YAML frontmatter, MediaWiki API integration, manifest tree generation, and local website crawling with mock redirects:

```bash
cd backend
python -m pytest tests -v
```

All 26 test suites execute offline without external network dependencies.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/crawls/url` | Starts a URL-based crawl job |
| `POST` | `/api/crawls/wikipedia` | Starts a Wikipedia keyword crawl job |
| `GET` | `/api/crawls/stats` | Returns aggregate dashboard metrics |
| `GET` | `/api/crawls` | Lists crawl jobs (with pagination & filters) |
| `GET` | `/api/crawls/{job_id}` | Retrieves full job details & status |
| `GET` | `/api/crawls/{job_id}/events` | Streams live crawl updates via SSE |
| `POST` | `/api/crawls/{job_id}/cancel` | Cancels a running crawl job |
| `POST` | `/api/crawls/{job_id}/retry` | Retries failed or interrupted jobs |
| `GET` | `/api/crawls/{job_id}/pages` | Lists all discovered/scraped pages |
| `GET` | `/api/crawls/{job_id}/manifest` | Retrieves the generated `manifest.json` |
| `GET` | `/api/crawls/{job_id}/download` | Downloads full crawl archive as a ZIP |
| `GET` | `/api/crawls/{job_id}/pages/{page_id}/content` | Safely fetches raw Markdown content |
| `GET` | `/api/health` | Backend health & configuration status |

---

## 🔒 Security & Safe Crawling

1. **SSRF Hardening**:
   - Accepts only `http` and `https` schemes.
   - Rejects loopback (`127.0.0.1`, `::1`), link-local (`169.254.x.x`), and private RFC 1918 addresses (`10.x`, `172.16.x`, `192.168.x`).
   - Resolves hostnames via DNS and validates resolved IPs against blocklists before opening connections.
   - Custom redirect inspection prevents open-redirect SSRF bypasses.
2. **Path Traversal Protection**:
   - Filenames are sanitized of special characters (`< > : " / \ | ? *`).
   - File read and ZIP packaging strictly verify that paths remain within `data/crawls/<job_id>`.
3. **Respectful Harvester**:
   - Identifies itself with a descriptive User-Agent string.
   - Configurable politeness delay between requests (default 300ms).
   - Concurrency limits (semaphore-controlled).
   - MediaWiki API compliance honoring Wikimedia User-Agent and namespace guidelines (`ns=0`).

---

## 📄 License
MIT License. Built for production-ready Retrieval-Augmented Generation workflows.
