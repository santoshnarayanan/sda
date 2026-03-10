# SDA Deployment Guide

This document explains how to run the **Smart Developer Assistant (SDA)** system locally using Docker and the backend worker.

The architecture currently includes:

* React Frontend
* FastAPI Backend (Docker container)
* RabbitMQ (Docker container)
* PostgreSQL (Docker container)
* Worker process (Python service)

---

# 1. Prerequisites

Ensure the following tools are installed:

* Docker Desktop
* Docker Compose
* Python 3.10+
* Node.js (for frontend)

Verify installations:

```
docker --version
docker compose version
python --version
node --version
```

---

# 2. Project Structure

Example structure:

```
sda/
 ├── backend/
 │   ├── app/
 │   ├── worker.py
 │   ├── Dockerfile
 │   ├── requirements.txt
 │   └── .env
 │
 ├── frontend/
 │
 ├── docker-compose.yml
 │
 └── deployment.md
```

---

# 3. Environment Configuration

Backend environment variables are defined in:

```
backend/.env
```

Example:

```
RABBITMQ_URL=amqp://sda:sda123@rabbitmq:5672/%2F
DATABASE_URL=postgresql://postgres:atos123@postgres:5432/sda_dev_db
```

These values allow containers to communicate using Docker service names.

---

# 4. Start Infrastructure (Docker)

Start RabbitMQ, PostgreSQL and API container.

From the project root:

```
docker compose up --build
```

This will start the following containers:

```
sda-api
sda-postgres
sda-rabbitmq
```

Verify containers:

```
docker ps
```

Expected services:

* API → http://localhost:8000
* RabbitMQ UI → http://localhost:15672

RabbitMQ credentials:

```
username: sda
password: sda123
```

---

# 5. Run Backend Worker

The worker consumes tasks from RabbitMQ and executes agents.

Open a new terminal and run:

```
cd backend
python worker.py
```

Expected output:

```
[*] Waiting for messages. To exit press CTRL+C
```

The worker will now process queued tasks.

---

# 6. Start Frontend

From the frontend directory:

```
cd frontend
npm install
npm start
```

The React application will start at:

```
http://localhost:3000
```

---

# 7. Application Workflow

The system uses asynchronous agent execution.

Workflow:

```
Frontend
   ↓
POST /api/v1/agent_run_async
   ↓
FastAPI API
   ↓
RabbitMQ Queue
   ↓
Worker Service
   ↓
Agent Execution
   ↓
PostgreSQL Result Storage
```

Frontend polls task status using:

```
GET /api/v1/agent_status/{task_id}
```

---

# 8. Checking System Health

### Check containers

```
docker ps
```

### Check RabbitMQ queues

Open:

```
http://localhost:15672
```

Queue used by system:

```
sda_agent_tasks
```

---

# 9. Stop System

To stop containers:

```
docker compose down
```

---

# 10. Future Deployment (Planned)

Next deployment target:

```
AWS ECS
```

Service mapping:

| Docker Service | AWS Equivalent     |
| -------------- | ------------------ |
| frontend       | CloudFront / S3    |
| api            | ECS Service        |
| worker         | ECS Worker Service |
| rabbitmq       | ECS or Amazon MQ   |
| postgres       | AWS RDS            |
| vector db      | Managed Cloud      |

---

# 11. Current Architecture

```
Frontend (React)
       ↓
FastAPI API (Docker)
       ↓
RabbitMQ (Docker)
       ↓
Worker (Python Process)
       ↓
PostgreSQL (Docker)
       ↓
Vector DB (External)
```

---

# 12. Next Improvements

Planned improvements:

* Containerize worker service
* Containerize frontend
* Deploy to AWS
* Implement worker auto-scaling

---
