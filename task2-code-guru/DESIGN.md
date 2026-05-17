# Code Guru — Code Execution Engine Design

## 1. System Architecture

```
Client → POST /execute → Express API → BullMQ Queue (Redis)
                                              ↓
                                       BullMQ Worker (concurrency: 5)
                                              ↓
                                       Docker Executor (--rm --network none)
                                              ↓
                                       Socket.io → Client (real-time updates)
```

**Components:**
- **API layer (Express):** Validates request, enqueues job, returns `{ job_id, status: "queued" }` immediately
- **Queue (BullMQ + Redis):** Buffers execution requests, persists across process restarts, guarantees at-least-once delivery
- **Worker (BullMQ, concurrency 5):** Pulls jobs, manages Docker container lifecycle, emits WebSocket events
- **Executor (Docker):** OS-level isolated sandbox per execution
- **Real-time (Socket.io):** Rooms keyed by `user_id`, receives `queued → running → success/error/timeout`

**Data flow:**
1. Client POSTs code → validated, job added to Redis queue
2. Worker claims job → emits `running` via Socket.io
3. Docker container executes code → output captured via stdout/stderr
4. Result emitted via Socket.io → container auto-removed (`--rm`)

## 2. Execution Strategy

Each execution runs in a fresh Docker container:

```bash
docker run --rm --network none --memory 64m --cpus 0.5 -i <image> <runtime> -
```

Code is piped via stdin (no temp files — avoids race conditions and cleanup burden).

| Language | Docker image | Runtime command |
|----------|-------------|-----------------|
| JavaScript | `node:alpine` | `node -` |
| Python | `python:alpine` | `python3 -` |

**Security flags:**
- `--network none`: no outbound network access from user code
- `--memory 64m`: container OOM-killed before affecting host
- `--cpus 0.5`: CPU fair-sharing, prevents starvation
- `--rm`: container auto-deleted after exit, no cleanup needed

**Isolation tradeoffs:**

| Method | Isolation | Cold start | Languages |
|--------|-----------|------------|-----------|
| Docker | OS-level | ~300-500ms | Any |
| child_process | Process | ~20ms | Any |
| VM2 | JS sandbox | ~5ms | JS only |

Docker chosen for true multi-language isolation and spec alignment.

## 3. Scalability Approach

- BullMQ queue absorbs traffic spikes — requests queue up, nothing is dropped
- `concurrency: 5` per worker limits simultaneous Docker containers per process
- **Horizontal scale:** add worker processes pointing at same Redis instance (no code change)
- At 1,000 concurrent users: 200 worker processes × 5 = 1,000 parallel containers
- Kubernetes HPA can scale worker pods based on BullMQ queue depth metric

## 4. Failure Handling

| Failure | Detection | Response |
|---------|-----------|----------|
| Runtime error (throws) | non-zero exit code | `error` status, stderr captured |
| Infinite loop | 5s timeout fires | `child.kill('SIGTERM')` → `timeout` status |
| Container OOM | Docker kills (SIGKILL) | non-zero exit → `error` status |
| Worker crash mid-job | BullMQ `stalled` detection | auto-requeued, up to 3 retries |
| Redis down | queue.add throws | 503 from API, user retries |

Code execution errors are NOT retried (code bugs are not transient). Worker crashes ARE retried (infrastructure failures are transient).

## 5. State & Persistence

- Job state lives in Redis: `waiting → active → completed/failed`
- BullMQ manages state transitions atomically
- Completed results: TTL 1 hour (`removeOnComplete: { age: 3600 }`)
- **Client disconnect mid-execution:** Job runs to completion in background. On reconnect, client re-joins Socket.io room and will receive next event if job hasn't completed yet.
- No external database required for PoC — Redis is the source of truth

## 6. Low-bandwidth Optimization

- Output truncated at 10KB before emitting (prevents large payloads on slow connections)
- Socket.io binary protocol reduces payload size vs. HTTP polling
- Single emit on completion (not streaming) — minimal bandwidth, simpler for unstable connections
- Socket.io built-in exponential backoff for reconnection
- POST response body is minimal: `{ job_id, status }` (< 100 bytes)

## 7. Operational Considerations

**Logging:**
- Worker logs `job_id`, `language`, `execution_time_ms`, `status` on every execution
- Failed jobs logged to stderr with error message

**Debugging:**
- BullMQ dashboard (bull-board) mountable at `/admin/queues` for job inspection
- `docker ps` should show zero lingering containers (`--rm` enforces cleanup)

**Deployment:**
```yaml
# docker-compose.yml (development)
services:
  app:
    build: .
    ports: ["3001:3001"]
    environment:
      REDIS_HOST: redis
    depends_on: [redis]
  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

**Pre-pull Docker images** on deploy to eliminate cold-start latency:
```bash
docker pull node:alpine && docker pull python:alpine
```

## 8. Tradeoffs

| Decision | Choice | Alternative | Reason |
|----------|--------|-------------|--------|
| Isolation | Docker containers | child_process | True OS isolation; multi-language |
| Queue | BullMQ + Redis | in-memory (p-queue) | Persists across restarts; horizontal scale |
| Response model | Async (WebSocket delivery) | Sync (wait for result) | Non-blocking; clean timeout handling |
| Code injection | stdin | Temp file | No race conditions; no cleanup |
| Worker placement | Same process | Separate process | Simpler PoC; scale later |
| Output limit | 10KB truncation | Unlimited | Bandwidth/memory protection |
