# Task 3: Jira-like Kanban Task Management System

Full-stack Kanban board with drag-and-drop, filtering, ticket hierarchy, and comments.

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or set `DATABASE_URL`)

## Setup

```bash
# Backend
cd task3-jira/backend
npm install

# Frontend
cd task3-jira/frontend
npm install
```

## Run (Development)

```bash
# Terminal 1 — backend on :3002
cd task3-jira/backend
DATABASE_URL=postgresql://localhost:5432/jira_kanban npm start

# Terminal 2 — frontend on :5173 (proxies /api → :3002)
cd task3-jira/frontend
npm run dev
```

Open http://localhost:5173

## Run (Production)

```bash
cd task3-jira/frontend && npm run build
cd task3-jira/backend
DATABASE_URL=postgresql://... npm start
# Serves frontend/dist/ + API on :3002
```

## Test (Backend)

```bash
cd task3-jira/backend
npm test
# 21 tests — no real DB or Docker needed
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+, Express 4 |
| Database | PostgreSQL (pg Pool, auto-migrated) |
| Validation | Joi |
| HTTP Security | helmet |
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Drag-and-drop | @hello-pangea/dnd |
| Testing | Jest + Supertest |

## API

```
GET    /api/tickets              List; ?status=&priority=&team=&assignee=
POST   /api/tickets              Create ticket
GET    /api/tickets/:id          Ticket + children + comments
PATCH  /api/tickets/:id          Update fields
PATCH  /api/tickets/:id/move     { status, position } — drag-drop
DELETE /api/tickets/:id          Delete (children orphaned)
POST   /api/tickets/:id/comments { author, body }
GET    /api/tickets/:id/comments List comments
```

## Features

- 5-column Kanban board: Backlog → To Do → In Progress → Review → Done
- Drag-and-drop cards across columns (optimistic update, reverts on error)
- Filter by status, priority, team, and assignee simultaneously
- Create / edit / delete tickets via modal
- One-level ticket hierarchy (sub-tickets)
- Comments thread per ticket
- Parameterized SQL queries (SQL injection safe)

## Design

See [HLD.md](./HLD.md) for full architecture and Phase 2 scaling design.
