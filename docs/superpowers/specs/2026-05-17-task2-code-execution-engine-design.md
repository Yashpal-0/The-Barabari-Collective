# Task 2: Code Execution Engine — Design Spec

**Date:** 2026-05-17
**Stack:** Node.js + Express, Socket.io, BullMQ + Redis, Docker, Joi, helmet
**Scope:** Part A (implementation) + Part B (DESIGN.md architecture)

---

## Part A: Implementation

### File Structure

```
task2-code-guru/
  src/
    app.js              ← Express + Socket.io server + BullMQ worker registration
    routes/
      execute.js        ← POST /execute: validate → enqueue → ack
    services/
      queue.js          ← BullMQ Queue instance (shared by route + worker)
      docker.js         ← spawn Docker container, enforce 5s timeout, capture output
      executor.js       ← language dispatch: js → node:alpine, python → python:alpine
    middleware/
      validate.js       ← Joi: user_id (string), language (js|python), code (string)
  DESIGN.md
  README.md
  package.json
```

### Request/Response

**POST /execute request:**
```json
{
  "user_id": "user-123",
  "language": "javascript",
  "code": "console.log('Hello World')"
}
```

**POST /execute response (immediate):**
```json
{ "job_id": "<uuid>", "status": "queued" }
```

**WebSocket events (room: user_id):**
```
{ job_id, status: "queued" }     ← on enqueue
{ job_id, status: "running" }    ← worker picks up
{ job_id, status: "success",  output: "Hello World\n", execution_time_ms: 120 }
{ job_id, status: "error",    output: "ReferenceError: ...", execution_time_ms: 80 }
{ job_id, status: "timeout",  output: "",  execution_time_ms: 5000 }
```

### Data Flow

```
POST /execute
  │
  ├─ validate.js → 400 if invalid
  ├─ queue.add(job: { user_id, language, code }) → job_id
  ├─ io.to(user_id).emit('status', { job_id, status: 'queued' })
  └─ respond 200: { job_id, status: 'queued' }

BullMQ Worker (concurrency: 5, same process):
  │
  ├─ job dequeued
  ├─ io.to(user_id).emit('status', { job_id, status: 'running' })
  │
  ├─ executor.js dispatches to docker.js:
  │   docker run --rm --network none --memory 64m --cpus 0.5
  │              --timeout 5s <image> <lang-runtime> -
  │   code piped via stdin
  │
  ├─ success (exit 0) →
  │   emit { job_id, status: 'success', output: stdout.slice(0, 10240), execution_time_ms }
  │
  ├─ error (exit non-0) →
  │   emit { job_id, status: 'error', output: stderr.slice(0, 10240), execution_time_ms }
  │
  └─ timeout (5000ms) →
      child.kill() (SIGTERM propagates to container; --rm removes it)
      emit { job_id, status: 'timeout', output: '', execution_time_ms: 5000 }
```

### Service Contracts

**queue.js**
- Exports: `Queue` instance named `executionQueue`
- BullMQ config: `{ connection: { host: 'localhost', port: 6379 } }`
- Job TTL: `removeOnComplete: { age: 3600 }`, `removeOnFail: { age: 3600 }`

**docker.js**
- Input: `{ language, code }`
- Returns: `{ output: string, execution_time_ms: number, timedOut: boolean, exitCode: number }`
- Enforces 5000ms timeout via `setTimeout` + `docker kill`
- Docker flags: `--rm --network none --memory 64m --cpus 0.5`
- Code injection: via stdin (`child.stdin.write(code); child.stdin.end()`)

**executor.js**
- Input: `{ language, code }`
- Maps language to Docker image + command:
  - `javascript` → `node:alpine` + `node -`
  - `python` → `python:alpine` + `python3 -`
- Returns docker.js result

**Worker (registered in app.js)**
- `new Worker('executions', async (job) => { ... }, { connection, concurrency: 5 })`
- On job: emit running → call executor.js → emit result
- Needs access to `io` (Socket.io instance) — passed via closure

**validate.js**
- Schema: `{ user_id: string.required(), language: string.valid('javascript','python').required(), code: string.max(50000).required() }`
- 400 on failure

**WebSocket**
- Client connects and joins room: `socket.join(user_id)` on `socket.on('join', user_id)`
- Server emits to room: `io.to(user_id).emit('status', payload)`

---

## Part B: DESIGN.md Architecture

### 1. System Architecture

```
Client → POST /execute → Express API → BullMQ Queue (Redis)
                                              ↓
                                       BullMQ Worker (concurrency: 5)
                                              ↓
                                       Docker Executor (--rm --network none)
                                              ↓
                                       Socket.io → Client (real-time updates)
```

Key components:
- **API layer:** Express validates and enqueues. Returns immediately.
- **Queue:** BullMQ on Redis. Buffers requests, survives spikes.
- **Worker:** Same process, concurrency 5. Pulls jobs, manages Docker lifecycle.
- **Executor:** Docker container per execution, fully isolated.
- **Real-time:** Socket.io rooms keyed by user_id.

### 2. Execution Strategy

Docker provides true OS-level isolation:
- `--network none`: no outbound network access
- `--memory 64m`: OOM kills container, not host
- `--cpus 0.5`: prevents CPU starvation
- `--rm`: container auto-deleted after exit

Code injected via stdin (no temp files → no race conditions, no cleanup needed).

**Language support:**

| Language | Docker image | Command |
|----------|-------------|---------|
| JavaScript | `node:alpine` | `node -` |
| Python | `python:alpine` | `python3 -` |

**Tradeoffs (Docker vs alternatives):**

| Approach | Isolation | Cold start | Complexity |
|----------|-----------|------------|------------|
| Docker | OS-level | ~300-500ms | Medium |
| child_process | Process | ~20ms | Low |
| VM2 | JS sandbox | ~5ms | Low (JS only) |

Docker chosen for true multi-language isolation and spec alignment.

### 3. Scalability Approach

- BullMQ queue absorbs traffic spikes — jobs wait, nothing is dropped
- Each worker process handles 5 concurrent Docker containers
- Horizontal scaling: add worker processes pointing at same Redis instance
- `concurrency: 5` prevents Docker daemon overload on a single node
- At 1,000 concurrent users: 200 worker processes × 5 concurrency = 1,000 parallel executions

### 4. Failure Handling

| Failure | Handling |
|---------|---------|
| Code throws runtime error | non-zero exit code → `error` status, stderr captured |
| Infinite loop / long code | 5s timeout → `docker kill` → `timeout` status |
| Container OOM | Docker kills container → non-zero exit → `error` status |
| Worker crash | BullMQ auto-requeues (job stays in Redis, `stalled` → retry) |
| Redis down | Queue operations fail → 503 from API layer |

No retries for code execution (code errors are not transient). BullMQ retries worker crashes (infrastructure errors) up to 3 times.

### 5. State & Persistence

- Job state: Redis (managed by BullMQ) — `waiting → active → completed/failed`
- Completed results: TTL 1 hour (`removeOnComplete: { age: 3600 }`)
- On client disconnect mid-execution: job completes normally in background
- On reconnect within TTL: client re-joins Socket.io room and receives next event
- No database needed for PoC — Redis is the source of truth

### 6. Low-bandwidth Optimization

- Output truncated at 10KB before emitting (prevents large payloads on slow networks)
- Socket.io binary protocol reduces wire size vs. polling
- Single emit on completion (not streamed) — simpler for low-bandwidth clients
- Socket.io built-in exponential backoff handles reconnection
- POST response is tiny (just job_id + status string)

### 7. Operational Considerations

- **Logging:** Worker logs job_id, language, duration, status on each execution
- **Debugging:** BullMQ dashboard (bull-board) can be mounted at `/admin/queues` to inspect jobs
- **Deployment:** `docker-compose.yml` with three services: app, redis, (optional) bull-board
- **Container cleanup:** `--rm` flag ensures containers are removed; `docker ps` should never accumulate stopped containers

### 8. Tradeoffs

| Decision | Choice | Alternative | Reason |
|----------|--------|-------------|--------|
| Isolation | Docker | child_process | True OS isolation; supports Python |
| Queue | BullMQ + Redis | in-memory | Survives restarts; horizontal scale |
| Response model | async (WebSocket) | sync (wait for result) | Non-blocking; handles timeouts cleanly |
| Code injection | stdin | temp file | No race conditions, no cleanup |
| Output limit | 10KB truncation | unlimited | Protects bandwidth and memory |
