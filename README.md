# Job Description Keyword Gap Analyzer

An AI-powered Resume Intelligence & Recruitment Analytics Platform.
Upload your resume, paste a job description, and instantly discover which keywords are missing — with semantic similarity scoring and actionable improvement suggestions.

---

## Features

- **JWT Authentication** — register, login, token refresh
- **Resume Upload** — PDF and DOCX parsing with `pdfplumber` and `python-docx`
- **Job Description Management** — save and reuse job postings
- **AI Keyword Extraction** — `KeyBERT` with 1–2 gram keyphrases
- **Semantic Similarity** — `sentence-transformers` (all-MiniLM-L6-v2) cosine scoring
- **Gap Analysis** — matched / missing keywords, composite score, suggestions
- **Analytics Dashboard** — radar chart, bar chart, keyword clouds
- **Clean Architecture** — Domain → Application → Infrastructure → Presentation

---

## Technology Stack

| Layer       | Technology                                         |
|-------------|---------------------------------------------------|
| Frontend    | React 18, Vite 5, Tailwind CSS 3, Chart.js 4      |
| Backend     | FastAPI, Python 3.12, Uvicorn                     |
| Database    | SQLite (via aiosqlite), SQLAlchemy 2 (async), Alembic |
| Auth        | JWT (python-jose), bcrypt (passlib)               |
| AI / NLP    | spaCy, KeyBERT, sentence-transformers, numpy      |
| Parsing     | pdfplumber, python-docx                           |
| Deployment  | Docker, Docker Compose, Nginx                     |

---

## Project Structure

```
job-gap-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI route handlers
│   │   ├── application/
│   │   │   ├── dtos/           # Pydantic request/response schemas
│   │   │   ├── interfaces/     # Abstract repository contracts
│   │   │   └── services/       # Business logic (auth, resume, analysis…)
│   │   ├── core/               # Config, security, logging, exceptions
│   │   ├── domain/
│   │   │   ├── entities/       # Pure dataclasses (no ORM dependency)
│   │   │   └── enums/
│   │   ├── infrastructure/
│   │   │   ├── ai/             # NLP engine, keyword extractor, scorer
│   │   │   ├── database/       # SQLAlchemy base + async session
│   │   │   ├── models/         # ORM models
│   │   │   ├── parsers/        # PDF / DOCX text extraction
│   │   │   └── repositories/   # Concrete async repositories
│   │   └── main.py
│   ├── alembic/                # Database migrations
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API clients
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React AuthContext
│   │   ├── hooks/              # Data-fetching hooks
│   │   ├── pages/              # Route-level page components
│   │   └── utils/              # Formatters, validators
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Docker — recommended)

### Prerequisites
- Docker Desktop ≥ 4.x
- Docker Compose V2

### 1. Clone and configure

```bash
git clone <repo-url>
cd job-gap-analyzer

cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY (SQLITE_PATH defaults to ./jobgap.db)
```

### 2. Build and run

```bash
docker compose up --build
```

Services started:
- Frontend → http://localhost:80
- Backend API → http://localhost:8000
- API docs → http://localhost:8000/api/v1/docs

### 3. Stop

```bash
docker compose down
# To remove volumes (database): docker compose down -v
```

---

## Local Development (without Docker)

### Backend

**Requirements:** Python 3.12 (SQLite is built-in — no separate database installation needed)

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env with your local database credentials

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/api/v1/docs

### Frontend

**Requirements:** Node.js 20+

```bash
cd frontend

npm install
npm run dev
```

Frontend available at: http://localhost:5173

> The Vite dev server proxies `/api` to `http://localhost:8000` automatically.

---

## API Reference

| Method | Endpoint                        | Description                         | Auth |
|--------|---------------------------------|-------------------------------------|------|
| POST   | `/api/v1/auth/register`         | Register new user                   | No   |
| POST   | `/api/v1/auth/login`            | Login → JWT tokens                  | No   |
| POST   | `/api/v1/auth/refresh`          | Refresh access token                | No   |
| GET    | `/api/v1/users/me`              | Get current user profile            | Yes  |
| PATCH  | `/api/v1/users/me`              | Update name / password              | Yes  |
| POST   | `/api/v1/resumes/upload`        | Upload resume (PDF/DOCX)            | Yes  |
| GET    | `/api/v1/resumes/`              | List user resumes                   | Yes  |
| DELETE | `/api/v1/resumes/{id}`          | Delete resume                       | Yes  |
| POST   | `/api/v1/jobs/`                 | Create job description              | Yes  |
| GET    | `/api/v1/jobs/`                 | List job descriptions               | Yes  |
| PATCH  | `/api/v1/jobs/{id}`             | Update job description              | Yes  |
| DELETE | `/api/v1/jobs/{id}`             | Delete job description              | Yes  |
| POST   | `/api/v1/analyses/`             | Run keyword-gap analysis            | Yes  |
| GET    | `/api/v1/analyses/`             | List analyses (summary)             | Yes  |
| GET    | `/api/v1/analyses/{id}`         | Get full analysis detail            | Yes  |
| DELETE | `/api/v1/analyses/{id}`         | Delete analysis                     | Yes  |

---

## Analysis Scoring

The composite score is calculated as:

```
overall_score = 0.4 × semantic_similarity + 0.6 × keyword_match_rate
```

- **Semantic Similarity** — cosine similarity between full-document sentence embeddings
- **Keyword Match Rate** — fraction of job keywords that match a resume keyword above the similarity threshold (default 0.75)

---

## Environment Variables

See `backend/.env.example` for the full reference. Key variables:

| Variable                     | Default          | Description                        |
|------------------------------|------------------|------------------------------------|
| `SECRET_KEY`                 | —                | JWT signing key (required)         |
| `SQLITE_PATH`                | `./jobgap.db`    | Path to the SQLite database file   |
| `SIMILARITY_THRESHOLD`       | `0.75`           | Min score to count a keyword match |
| `KEYBERT_TOP_N`              | `20`             | Keywords to extract per document   |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `60`             | Access token lifetime              |
| `LOG_LEVEL`                  | `INFO`           | Logging verbosity                  |

---

## Architecture Notes

- **Clean Architecture**: domain entities have zero framework dependencies; services depend only on abstract interfaces; infrastructure details are injected.
- **Repository Pattern**: all database access goes through typed async repositories; services never import SQLAlchemy directly.
- **Lazy AI Loading**: NLP models are loaded on first request (with a startup warm-up) to keep cold-start memory low.
- **Async throughout**: FastAPI + asyncpg + SQLAlchemy async engine; no blocking I/O on the event loop.
