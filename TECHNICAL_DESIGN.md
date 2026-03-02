# 1️⃣ Introduction
Phase 6 extends the Smart Developer Assistant (SDA) into three major capabilities:

- **Part 1 — GitHub Integration:**  
  Secure OAuth login, repository retrieval, ZIP ingestion, and automated embedding into Qdrant.

- **Part 2 — Multi-Agent System:**  
  A coordinated architecture of Retriever, Analyzer, Refactor, and DevOps agents orchestrated through a unified Agent Manager.

- **Part 3 — Deployment Artifact Pipeline:**  
  DevOps agent generates deployment YAMLs/Dockerfiles → parser extracts artifacts → user downloads as a ZIP bundle.

This document describes the technical design and implementation details for all three parts.

---

# 2️⃣ System Overview (Phase 6)

## 🏗️ High-Level Architecture  
**(PLACEHOLDER — Architecture_Phase6.png)**  
Place your generated diagram in the `./images` folder and reference it as:  
`![Architecture Phase 6](./images/Architecture_Phase6.png)`

---

# 3️⃣ Phase 6 — Part 1: GitHub Integration

## 🔹 Overview
Part 1 enables SDA users to connect GitHub accounts, browse repositories, and import any repo directly for analysis.

## 🔹 Architecture  
**(PLACEHOLDER — Architecture_Phase6_Part1.png)**  

## 🔹 Components

### Frontend
- `GithubIntegration.tsx`
- OAuth redirect handler
- Load repositories
- Import repository ZIP

### Backend
- OAuth endpoints:  
  - `/api/v1/auth/github/login_url`  
  - `/api/v1/auth/github/complete`
- Repo listing endpoint:
  - `/api/v1/github/repos`
- Repo import and ingestion endpoint:
  - `/api/v1/import_repo`

### Databases
- PostgreSQL table: `github_accounts`
- Qdrant: Project-level collection created automatically per imported repo

### Process Flow
1. User clicks **Connect GitHub**
2. OAuth login initiated
3. Access token stored in PostgreSQL
4. Repo list fetched
5. ZIP download & ingestion
6. Collection created in Qdrant

## 🔹 Sequence Diagram  
**(PLACEHOLDER — Sequence_Phase6_Part1.png)**