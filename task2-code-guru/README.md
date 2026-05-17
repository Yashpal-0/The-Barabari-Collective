# Task 2: Code Execution Engine — Code Guru

PoC backend service for isolated, concurrent code execution with real-time WebSocket status updates.

## Prerequisites

- Node.js 18+
- Docker daemon running
- Redis on `localhost:6379` (or set `REDIS_HOST`/`REDIS_PORT` env vars)

## Setup

```bash
cd task2-code-guru
npm install

# Pull Docker images (one-time)
docker pull node:alpine
docker pull python:alpine
```

## Run

```bash
# Start Redis (if not already running)
docker run -d -p 6379:6379 redis:alpine

npm start
# Server on http://localhost:3001
```

## Test

```bash
npm test
```

> Note: Tests mock Docker and Redis — no real Docker or Redis needed for tests.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Real-time | Socket.io 4 |
| Job Queue | BullMQ 5 + Redis |
| Validation | Joi |
| HTTP Security | helmet |
| Code Isolation | Docker (node:alpine, python:alpine) |
| Testing | Jest + Supertest |

## API

### POST /execute

**Request:**
```json
{
  "user_id": "user-123",
  "language": "javascript",
  "code": "console.log('Hello World')"
}
```

**Immediate response:**
```json
{ "job_id": "550e8400-...", "status": "queued" }
```

**WebSocket events** (join room with `user_id` first):
```javascript
// Client-side
const socket = io('http://localhost:3001');
socket.emit('join', 'user-123');
socket.on('status', ({ job_id, status, output, execution_time_ms }) => {
  console.log(status); // "queued" | "running" | "success" | "error" | "timeout"
});
```

**Execution lifecycle:**
```
queued → running → success   { output: "Hello World\n", execution_time_ms: 420 }
                → error     { output: "ReferenceError: ...", execution_time_ms: 80 }
                → timeout   { output: "", execution_time_ms: 5000 }
```

## Design Notes

- Each execution runs in its own Docker container: `--rm --network none --memory 64m --cpus 0.5`
- Code injected via stdin (no temp files)
- 5-second hard timeout enforced per execution
- BullMQ queue handles concurrency (5 simultaneous executions per worker)
- Output truncated at 10KB before emitting
- See `DESIGN.md` for full architecture decisions
