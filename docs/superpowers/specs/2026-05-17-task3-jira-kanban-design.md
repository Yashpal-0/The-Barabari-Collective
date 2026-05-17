# Task 3: Jira-like Kanban Task Management System — Design Spec

**Date:** 2026-05-17
**Stack:** Node.js + Express, PostgreSQL (pg), React 18 + Vite, Tailwind CSS, @hello-pangea/dnd, Joi, helmet
**Scope:** Full-stack implementation + HLD.md

---

## Part A: Implementation

### Architecture

Monorepo with separate backend and frontend. In development, backend runs on `:3002` and Vite dev server on `:5173` (proxies `/api` to `:3002`). In production, `npm run build` in frontend produces `frontend/dist/` which Express serves as static files.

```
task3-jira/
  backend/
    src/
      app.js                  ← Express + helmet + cors + JSON error handler
      db.js                   ← pg Pool + CREATE TABLE IF NOT EXISTS migrations
      routes/
        tickets.js            ← CRUD + move + filter/search
        comments.js           ← add/list comments
      middleware/
        validate.js           ← Joi schemas
    tests/
      tickets.test.js
      comments.test.js
    package.json
  frontend/
    src/
      api.js                  ← fetch wrappers (getTickets, createTicket, moveTicket, etc.)
      components/
        KanbanBoard.jsx       ← DragDropContext + 5 Droppable columns
        TicketCard.jsx        ← Draggable card, click → open modal
        TicketModal.jsx       ← create/edit form + children list + comments thread
        FilterBar.jsx         ← status/priority/team/assignee dropdowns
      App.jsx
      main.jsx
    vite.config.js            ← proxy /api → http://localhost:3002
    package.json
  HLD.md
  README.md
```

### Database Schema

Auto-migrated on server startup via `db.js`:

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'backlog'
                CHECK (status IN ('backlog','todo','in_progress','review','done')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','critical')),
  assignee    TEXT DEFAULT '',
  team_tag    TEXT DEFAULT '',
  parent_id   INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_team_tag ON tickets(team_tag);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee);
CREATE INDEX IF NOT EXISTS idx_comments_ticket  ON comments(ticket_id);
```

Key decisions:
- `assignee` and `team_tag` are plain strings — no user table needed for PoC
- `position` integer tracks card order within a column, updated on drag-drop
- `parent_id` self-references for one level of nesting (sufficient per spec)
- All four filter fields indexed

### API

```
GET    /api/tickets              list all; ?status=&priority=&team=&assignee= (AND logic)
POST   /api/tickets              create ticket
GET    /api/tickets/:id          single ticket + children array + comments array
PATCH  /api/tickets/:id          update fields (title, description, priority, assignee, team_tag, parent_id)
PATCH  /api/tickets/:id/move     { status, position } — drag-drop persistence
DELETE /api/tickets/:id          delete ticket (children get parent_id = NULL)

POST   /api/tickets/:id/comments { author, body }
GET    /api/tickets/:id/comments ordered by created_at ASC
```

**Validation (Joi):**
- `POST /api/tickets`: `title` string required; `status`/`priority` enum if provided; all others optional strings
- `PATCH /api/tickets/:id/move`: `status` required enum, `position` required integer ≥ 0
- `POST /api/tickets/:id/comments`: `author` and `body` required strings

**Error responses:** `400` validation, `404` not found, `500` generic message (no stack leak)

**Filter query building:** `GET /api/tickets` builds parameterized WHERE clause from present query params only. Uses `$1, $2...` placeholders to prevent SQL injection.

### Frontend

**Stack:** Vite + React 18, Tailwind CSS, `@hello-pangea/dnd`

**Component tree:**
```
App.jsx
  ├── FilterBar.jsx     dropdowns for status/priority/team/assignee
  │                     onChange → re-fetch with query params
  ├── KanbanBoard.jsx   DragDropContext wrapping 5 Droppable columns
  │     └── TicketCard.jsx   Draggable, click → TicketModal
  └── TicketModal.jsx   create/edit form + children list + comments thread
```

**Drag-drop:** `onDragEnd` calls `PATCH /api/tickets/:id/move`. Optimistic update — card moves immediately in React state, reverts on API error.

**State:** `useState` + `useEffect` fetch per component. No Redux. `api.js` centralises all fetch calls.

**Vite proxy:** `/api` → `http://localhost:3002` (dev only, no CORS config needed).

---

## Part B: HLD.md Content

### Phase 1 — Initial System Design

**Architecture:**
```
Browser (React SPA)
    ↓ HTTPS
Express API (:3002)
    ↓ pg Pool
PostgreSQL
```

Single Express process, single PostgreSQL instance. React SPA served from `frontend/dist/` in production. No caching layer needed at PoC scale.

**Database schema:** tickets + comments tables as above. Self-referencing `parent_id` for hierarchy. `position` integer for column ordering.

**API flow:**
1. Browser fetches `GET /api/tickets?status=todo` on load and filter change
2. User drags card → `PATCH /api/tickets/:id/move` → DB updates status + position
3. User opens ticket → `GET /api/tickets/:id` returns ticket + children + comments
4. User adds comment → `POST /api/tickets/:id/comments`

**Frontend structure:** Single-page React app. KanbanBoard is the primary view. TicketModal overlays for create/edit/view. FilterBar sits above board.

### Phase 2 — Scaling to 100K+ Tickets

**Database scaling:**
- Composite indexes: `(status, priority)`, `(team_tag, assignee)`
- Partial indexes per status column (most queries filter by status)
- Partition `tickets` table by status (PostgreSQL declarative partitioning) — each column becomes its own partition
- Cursor-based pagination on list endpoint (replace OFFSET with `WHERE id > $cursor`)
- PostgreSQL read replica for all GET queries; primary for writes only
- pgBouncer in transaction mode between app and PostgreSQL (prevents connection exhaustion)

**Caching:**
- Redis cache for board state per team (TTL 30s): `GET /api/tickets?team=X` hits Redis first
- Invalidate on any write (create/update/move/delete)
- Redis also serves as Socket.io adapter for multi-instance pub/sub

**Realtime updates:**
- Socket.io: one room per team_tag (`socket.join(team_tag)`)
- Server emits `ticket:moved`, `ticket:updated`, `ticket:created` on writes
- Client updates local state without polling — other team members see moves live

**Queue/event systems:**
- BullMQ + Redis for async operations: bulk status updates, future notification dispatch, webhook delivery
- API returns immediately; background worker processes queue
- Prevents slow operations from blocking HTTP responses under load spikes

**API performance:**
- Response compression (gzip via `compression` middleware)
- `ETag` headers for board state — browser skips re-render if unchanged
- `express-rate-limit`: 100 req/min per IP on reads, 30 req/min on writes

**Rate limiting:**
- Per-IP limits on API endpoints
- Per-team limits on bulk operations
- 429 response with `Retry-After` header

**Horizontal scaling:**
- Stateless Express — multiple instances behind nginx/ALB
- Redis for shared Socket.io adapter (`@socket.io/redis-adapter`)
- Shared PostgreSQL (primary + replicas)
- No sticky sessions needed

**Concurrency handling:**
- Optimistic locking: PATCH checks `updated_at` version; returns 409 if stale
- `position` updates use DB transaction to prevent race conditions on simultaneous drag-drops
- pgBouncer serialises connection acquisition
