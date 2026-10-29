# Job Description Keyword Gap Analyzer

An AI-powered Resume Intelligence & Recruitment Analytics Platform.
Upload your resume, paste a job description, and instantly discover which keywords are missing — with semantic similarity scoring, ATS compatibility analysis, and actionable improvement suggestions.

---

## Features

- **JWT Authentication** — register, login, token refresh
- **Resume Upload** — PDF and DOCX parsing with `pdfplumber` and `python-docx`
- **Job Description Management** — save and reuse job postings
- **AI Keyword Extraction** — `KeyBERT` with 1–2 gram keyphrases + curated technical-skill scan that preserves `C++`, `C#`, `.NET`, `Node.js`, `CI/CD`, `REST APIs`, `SQL`, `JavaScript`, etc.
- **Semantic Similarity** — `sentence-transformers` (all-MiniLM-L6-v2) cosine scoring
- **Gap Analysis** — matched / missing keywords, composite score, suggestions
- **Improved Skill Matching** — exact/alias matching with confusable-technology guards (Java ≠ JavaScript, React ≠ Vue) and an "uncertain" band. Match types and evidence snippets are returned.
- **ATS Compatibility Score** — independent, text-based ATS analysis with 5 transparent checks, warnings, and recommendations. Score is **not** derived from the job-match score.
- **ATS-Friendly Popup** — shown once per session when the ATS score ≥ 80% **and** the required parsing/compatibility checks pass.
- **Job & Internship Recommendations** — grounded role suggestions linked to legitimate public job boards (Indeed, LinkedIn, Internshala, Wellfound, Google Jobs, Glassdoor). No fake vacancies or salaries are generated.
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

---

## ATS Compatibility Scoring

The ATS score is **independent** of the job-match score. It assesses how well the resume's extracted text can be parsed by an automated system, using five weighted checks:

| Check | Weight | What it measures |
|---|---|---|
| Text extractable | 15% | Non-trivial text (≥ 50 chars) was extracted |
| Meaningful content | 30% | Sufficient word count (≥ 150 words = full score, 60–149 = half score) |
| Contact information | 20% | Email and/or phone number detectable |
| Resume sections | 25% | Standard headings (Experience, Education, Skills, …) found |
| Text quality | 10% | No major layout artefacts (very long lines, repeated headers, low alphanumeric ratio) |

**ATS score ≥ 80% AND both gating checks (text extractable + meaningful content) pass → `passed: true` → success popup shown.**

The popup is shown **once per analysis per browser session** using `sessionStorage`.

### Limitations of ATS scoring

- Scores are based only on **extracted text**. Visual formatting (fonts, columns, colours, images) cannot be assessed.
- Different ATS products behave differently — a high score does not guarantee parsing success on every employer's system.
- Passing the ATS check does not guarantee an interview or selection.

---

## Job-Match Score vs ATS Compatibility

| | Job-Match Score | ATS Compatibility |
|---|---|---|
| **What it measures** | How well your skills overlap with a specific job description | How reliably the resume can be parsed by automated systems |
| **Depends on** | Resume + job description keywords and semantic similarity | Resume text structure, formatting, and content |
| **Formula** | `0.4 × semantic_similarity + 0.6 × keyword_coverage` | Weighted sum of 5 structural checks |
| **Threshold** | None (shown as a percentage, not a hiring probability) | 80% (configurable via `ATS_COMPATIBILITY_THRESHOLD`) |
| **What it is NOT** | A probability of being selected | A guarantee of an interview |

A resume can have a **high ATS score but low job match** (well-structured but wrong skills) or **high job match but low ATS score** (right skills but hard to parse).

---

## Job & Internship Recommendations

The recommendations feature (`POST /api/v1/recommendations/`) uses skills extracted from an existing analysis to suggest relevant roles (internships, fresher-friendly, graduate trainee, full-time). For each suggestion it provides:

- Role title and description
- Tags (internship / full-time / fresher-friendly / graduate-trainee)
- Resume skills that match the role
- A relevance score (0–1)
- Deep-link search URLs on legitimate public job boards

**No external API is required** — the feature works offline. All URLs link to the board's own search results. No vacancies, salaries, company names, or application deadlines are fabricated.

### External API extension point

If you configure `JSEARCH_API_KEY` in `.env`, the recommendations endpoint can be extended to append live job listings. The key is not used by the current implementation.

---

## New Environment Variables (Parts 1–3)

| Variable | Default | Description |
|---|---|---|
| `UNCERTAIN_MATCH_MIN` | `0.60` | Minimum embedding similarity for the "uncertain" keyword-match band |
| `ATS_COMPATIBILITY_THRESHOLD` | `0.80` | ATS score threshold for the success popup |

---

## New API Endpoint

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/recommendations/` | Yes | Get job/internship recommendations from an analysis |

**Request body:**
```json
{
  "analysis_id": 1,
  "location": "London",
  "include_internships": true,
  "include_fulltime": true,
  "max_results": 8
}
```

---

## Running Tests

### Backend

```bash
cd backend

# Install dev dependencies (pytest only — not needed for production)
pip install -r requirements-dev.txt

# Run all tests
python -m pytest tests -v

# Run a specific test file
python -m pytest tests/test_ats_scorer.py -v
python -m pytest tests/test_recommendations.py -v

# Syntax check all backend files
python check_syntax.py
```

Test files and what they cover:

| File | Coverage |
|---|---|
| `test_skill_taxonomy.py` | Normalisation, alias folding, Java≠JavaScript, confusable guard, noise filter |
| `test_keyword_extractor.py` | Noise-reduction filter, fragment/composite dropping |
| `test_matching.py` | Exact/alias/semantic/uncertain matching, confusable guard, dedup, evidence, backward compat |
| `test_parsers.py` | PDF/DOCX extraction, empty/corrupted files, oversized files, extension rejection |
| `test_analysis_scoring.py` | Requirement-level detection, suggestion wording, DTO backward compatibility |
| `test_ats_scorer.py` | All 8 ATS scenarios (pass/fail/gating/empty/legacy/.doc/reproducibility) |
| `test_recommendations.py` | Role generation, filtering, no-fake-data, link domains, score ordering, reproducibility |

### Frontend

```bash
cd frontend

# Build (verifies JSX compiles)
npm run build

# Lint the source
npm run lint
```

> Pre-existing lint warnings in `LoginPage.jsx`, `NewAnalysisPage.jsx`, `NotFoundPage.jsx`, `ProfilePage.jsx`, and `ResumesPage.jsx` (unused `React` import) are not introduced by Parts 1–3.

---

## Security Notes

- `SECRET_KEY` must be set to a random 64-char hex string. Never use the placeholder value.
- `.env` is in `.gitignore` and must never be committed.
- All data queries filter by both resource ID and `user_id` — cross-user data access is not possible.
- Resume file bytes are validated for size (≤ 5 MB) and extension before parsing.
- Uploaded files are processed in-memory (`io.BytesIO`); no file is written to disk.
- Passwords are bcrypt-hashed; plaintext passwords are never stored or logged.
- JWT access tokens expire after 60 minutes; refresh tokens after 7 days.
