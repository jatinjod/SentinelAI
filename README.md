<div align="center">

# SentinelAI

### Developer Security & Source-Code Scanning Platform

Analyze source code, detect security findings, and surface actionable results through a FastAPI backend and web dashboard.

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org/)

</div>

---

## Overview

SentinelAI is a security-focused developer project for scanning source code and turning detected issues into structured security findings.

The project combines a **FastAPI backend**, **PostgreSQL persistence**, a browser-based frontend/admin dashboard, and automated tests into one development workflow.

### What it does

- Scans source-code directories
- Detects hardcoded secrets and security-related patterns
- Assigns severity to findings
- Stores users, repositories, scans, and findings
- Exposes REST API endpoints
- Provides a web interface and admin dashboard
- Includes automated tests for core functionality

---

## Architecture

```text
                    ┌──────────────────────┐
                    │      Web Frontend    │
                    │  Dashboard / Admin   │
                    └──────────┬───────────┘
                               │ HTTP
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI API     │
                    │   Routes / Services  │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌────────────┐   ┌─────────────┐  ┌────────────┐
       │  Scanner   │   │ SQLAlchemy  │  │   Config   │
       │  Services  │   │   Models    │  │  / .env    │
       └──────┬─────┘   └──────┬──────┘  └────────────┘
              │                │
              └────────┬───────┘
                       ▼
                ┌───────────────┐
                │  PostgreSQL   │
                └───────────────┘
```

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Language | Python |
| API | FastAPI, Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Frontend | HTML, CSS, JavaScript |
| Testing | pytest |
| Configuration | python-dotenv |
| Version Control | Git, GitHub |
| Containerization | Docker / Compose setup |

---

## Project Structure

```text
SentinelAI/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── index.html
│   ├── admin.html
│   ├── admin.js
│   ├── api.js
│   ├── app.js
│   └── style.css
├── tests/
├── docs/
├── .env.example
├── docker-compose.yml
└── requirements.txt
```

---

## API

### Health Check

```http
GET /health
```

### Users

```http
POST /api/v1/users/
```

### Scans

```http
POST /api/v1/scans/
```

A scan can process a repository/local path and return structured scan metadata and findings.

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/jatinjod/SentinelAI.git
cd SentinelAI
```

### 2. Create environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

Copy `.env.example` to `.env` and provide your local PostgreSQL configuration.

### 5. Start the API

```bash
cd backend
uvicorn app:app --reload
```

API: `http://127.0.0.1:8000`

---

## Testing

Run the test suite from the project root:

```bash
pytest
```

SentinelAI also includes a sample vulnerable source file used to validate hardcoded-secret detection.

---

## Security

SentinelAI is a learning and portfolio project for source-code security analysis. It should not be treated as a complete replacement for mature security platforms or a full secure-code review process.

**Never commit real secrets, API keys, passwords, database credentials, or `.env` files.**

---

## Roadmap

- [x] FastAPI backend
- [x] PostgreSQL integration
- [x] Source-code scanning
- [x] Hardcoded-secret detection
- [x] Severity-based findings
- [x] Web/admin interface
- [x] Automated tests
- [ ] Expand vulnerability detectors
- [ ] Repository integrations
- [ ] CI security scanning
- [ ] Richer reporting and remediation guidance

---

<div align="center">

**Built with Python · FastAPI · PostgreSQL · SQLAlchemy**

by [Jatin](https://github.com/jatinjod)

</div>