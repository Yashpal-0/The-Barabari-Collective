# Task 1: Mock Evaluation Pipeline — Samvaad Saathi

PoC backend service that evaluates mock interview answers, grades them via a simulated AI, and flags remediation modules based on role-specific thresholds.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Validation | Joi |
| Circuit Breaker | opossum |
| HTTP Security | helmet |
| Testing | Jest + Supertest |

## Setup

```bash
cd task1-samvaad-saathi
npm install
```

## Run

```bash
npm start
# Server on http://localhost:3000
```

## Test

```bash
npm test
```

## API

### POST /api/v1/evaluate

**Request:**
```json
{
  "interview_id": "int-9901",
  "user_id": "user-445",
  "role_config": {
    "role": "Customer Success",
    "thresholds": { "pacing": 6, "knowledge": 5 }
  },
  "transcript": "I, uh, think that customer satisfaction is important.",
  "audio_metadata": { "duration_seconds": 12, "filler_word_count": 3 }
}
```

**Response (evaluated):**
```json
{
  "interview_id": "int-9901",
  "user_id": "user-445",
  "status": "evaluated",
  "scores": { "knowledge": 7, "pacing": 4, "filler_word_usage": 8 },
  "flagged_modules": ["Pacing Practice"],
  "evaluated_at": "2026-05-17T10:00:02.123Z"
}
```

**Response (pending — AI failed or circuit open):**
```json
{
  "interview_id": "int-9901",
  "user_id": "user-445",
  "status": "pending",
  "scores": null,
  "flagged_modules": [],
  "evaluated_at": "2026-05-17T10:00:02.123Z"
}
```

## Design Notes

- Mock AI introduces a 2-second delay and fails 10% of the time
- opossum circuit breaker: opens after 50% error rate (min 5 requests), resets after 10s
- When circuit is open, response is instant with `status: "pending"` — user experience uninterrupted
- See `DESIGN.md` for full architecture decisions (state management, role versioning, STT/TTS scaling)
