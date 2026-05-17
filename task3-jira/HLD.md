# Kanban Task Management System — High-Level Design

## Phase 1 — Initial System Design

### Architecture

```
Browser (React SPA)
    ↓ HTTP/JSON
Express API (:3002)
    ↓ pg Pool (connection pooling)
PostgreSQL
```

Single Express process, single PostgreSQL instance. React SPA served from `frontend/dist/` in production (Express static middleware). In development, Vite dev server (:5173) proxies `/api` to `:3002`.

### Database Schema

Two tables with a self-referencing hierarchy:

```
tickets
  id          SERIAL PK
  title       TEXT NOT NULL
  description TEXT
  status      TEXT CHECK (backlog|todo|in_progress|review|done)
  priority    TEXT CHECK (low|medium|high|critical)
  assignee    TEXT
  team_tag    TEXT
  parent_id   INTEGER → tickets(id) ON DELETE SET NULL   ← one-level hierarchy
  position    INTEGER                                    ← column ordering
  created_at  TIMESTAMPTZ

comments
  id          SERIAL PK
  ticket_id   INTEGER → tickets(id) ON DELETE CASCADE
  author      TEXT
  body        TEXT
  created_at  TIMESTAMPTZ
```

**Key decisions:**
- `assignee` and `team_tag` are plain strings — no user table needed at PoC scale
- `position` integer tracks card order within a column, updated on drag-drop
- `parent_id` self-references for one level of sub-tickets
- 5 indexes on frequently filtered columns (status, priority, team_tag, assignee, comments.ticket_id)
- Schema auto-migrated via `CREATE TABLE IF NOT EXISTS` on server startup

### API Design

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tickets | List all; `?status=&priority=&team=&assignee=` (AND logic) |
| POST | /api/tickets | Create ticket |
| GET | /api/tickets/:id | Single ticket + children array + comments array |
| PATCH | /api/tickets/:id | Update fields (title, description, priority, assignee, team_tag, parent_id) |
| PATCH | /api/tickets/:id/move | `{ status, position }` — drag-drop persistence |
| DELETE | /api/tickets/:id | Delete (children get parent_id = NULL) |
| POST | /api/tickets/:id/comments | Add comment |
| GET | /api/tickets/:id/comments | List comments ordered by created_at ASC |

**Security:** Parameterized queries throughout. Field whitelist (`ALLOWED_UPDATE` Set) prevents injection in dynamic SET clauses. Joi validates all request bodies. Helmet sets secure HTTP headers.

### Frontend Structure

```
App.jsx
  ├── FilterBar.jsx     dropdowns + text inputs; onChange → re-fetch
  ├── KanbanBoard.jsx   DragDropContext wrapping 5 Droppable columns
  │     └── TicketCard.jsx   Draggable, click → TicketModal
  └── TicketModal.jsx   create/edit form + sub-tickets list + comments thread
```

**Drag-drop:** `onDragEnd` fires `PATCH /api/tickets/:id/move`. Optimistic update — card moves immediately in React state, reverts on API error.

**State:** `useState` + `useEffect` per component. No Redux. `api.js` centralises all fetch calls with a shared `request()` wrapper.

### API Flow

1. Browser fetches `GET /api/tickets` on load and on every filter change
2. User drags card → optimistic state update → `PATCH /api/tickets/:id/move` → DB persists status + position
3. User opens ticket → `GET /api/tickets/:id` returns ticket + children + comments
4. User adds comment → `POST /api/tickets/:id/comments` → comment appended to modal state

---

## Phase 2 — Scaling to 100K+ Tickets

### Database Scaling

**Indexes (beyond Phase 1):**
- Composite indexes: `(status, priority)`, `(team_tag, assignee)` for common combined filters
- Partial indexes per status column — most list queries filter by a single status
- `position` index per `(status, position)` to speed ordered fetches within a column

**Partitioning:**
- Partition `tickets` by `status` using PostgreSQL declarative partitioning — each column becomes its own partition, pruning non-relevant partitions on filtered queries

**Pagination:**
- Replace full list response with cursor-based pagination: `WHERE id > $cursor ORDER BY id LIMIT 50`
- Eliminates OFFSET performance degradation at large row counts

**Read scaling:**
- PostgreSQL read replica for all GET queries; primary for writes only
- pgBouncer in transaction mode between app and PostgreSQL (prevents connection exhaustion at high concurrency)

### Caching

- **Redis** cache for board state per team (TTL 30s): `GET /api/tickets?team=X` hits Redis first
- Invalidate on any write (create/update/move/delete) for that team's key
- Redis also serves as Socket.io adapter for multi-instance pub/sub (`@socket.io/redis-adapter`)

### Realtime Updates

- **Socket.io** rooms keyed by `team_tag` (`socket.join(team_tag)`)
- Server emits `ticket:moved`, `ticket:updated`, `ticket:created`, `ticket:deleted` on writes
- Clients update local state without polling — team members see moves live
- Eliminates polling overhead; Socket.io handles reconnection with exponential backoff

### Queue / Event System

- **BullMQ + Redis** for async operations: bulk status updates, notification dispatch, webhook delivery
- API returns immediately; background worker processes queue
- Prevents slow operations from blocking HTTP responses under load spikes
- `removeOnComplete` / `removeOnFail` TTL keeps Redis memory bounded

### API Performance

- Response compression (gzip via `compression` middleware)
- `ETag` headers for board state — browser skips re-render if unchanged
- `express-rate-limit`: 100 req/min per IP on reads, 30 req/min on writes
- 429 response with `Retry-After` header

### Horizontal Scaling

- Stateless Express — multiple instances behind nginx / ALB
- Redis for shared Socket.io adapter
- Shared PostgreSQL (primary + read replicas)
- No sticky sessions needed
- Kubernetes HPA scales API pods based on CPU; BullMQ worker pods scale based on queue depth metric

### Concurrency Handling

- **Optimistic locking:** PATCH checks `updated_at` timestamp; returns 409 if stale
- **Position updates** use DB transaction to prevent race conditions on simultaneous drag-drops
- pgBouncer serialises connection acquisition under burst traffic
