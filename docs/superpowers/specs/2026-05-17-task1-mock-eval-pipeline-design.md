# Task 1: Mock Evaluation Pipeline — Design Spec

**Date:** 2026-05-17
**Stack:** Node.js + Express, opossum (circuit breaker), Joi (validation)
**Scope:** Part A (implementation) + Part B (DESIGN.md architecture)

---

## Part A: Implementation

### File Structure

```
task1-samvaad-saathi/
  src/
    app.js
    routes/
      evaluate.js          ← POST /api/v1/evaluate
    services/
      mockAI.js            ← 2s delay, 10% failure, returns scores 1-10
      remediation.js       ← threshold comparison → flagged_modules[]
      circuitBreaker.js    ← opossum config wrapping mockAI
    middleware/
      validate.js          ← Joi input validation
  DESIGN.md
  README.md
  package.json
```

### Request Payload

```json
{
  "interview_id": "int-9901",
  "user_id": "user-445",
  "role_config": {
    "role": "Customer Success",
    "thresholds": { "pacing": 6, "knowledge": 5 }
  },
  "transcript": "I, uh, think that...",
  "audio_metadata": { "duration_seconds": 12, "filler_word_count": 3 }
}
```

### Data Flow

```
POST /api/v1/evaluate
  │
  ├─ validate.js → 400 if missing required fields
  │
  ├─ circuitBreaker.fire(mockAI, payload)
  │     ├─ success → { knowledge, pacing, filler_word_usage } scores 1-10
  │     └─ failure (10% random or circuit open) → status: "pending", scores: null
  │
  ├─ remediation(scores, role_config.thresholds)
  │     └─ score < threshold → push module name to flagged_modules[]
  │
  └─ Response:
       {
         "interview_id": "int-9901",
         "user_id": "user-445",
         "status": "evaluated" | "pending",
         "scores": { "knowledge": 7, "pacing": 4, "filler_word_usage": 6 },
         "flagged_modules": ["Pacing Practice"],
         "evaluated_at": "<ISO timestamp>"
       }
```

### Service Contracts

**mockAI.js**
- Input: `{ transcript, audio_metadata }`
- Behavior: `await delay(2000)`, then `Math.random() < 0.1` throws Error("AI timeout")
- Output: `{ knowledge: 1-10, pacing: 1-10, filler_word_usage: 1-10 }` (random integers)

**remediation.js**
- Input: `scores`, `thresholds`
- Logic: compare each threshold key against corresponding score
- Threshold keys map to module names: `pacing → "Pacing Practice"`, `knowledge → "Knowledge Review"`
- Output: `string[]` of flagged module names

**circuitBreaker.js**
- Library: `opossum`
- Config: `{ timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000 }`
- Fallback: returns `{ status: "pending", scores: null, flagged_modules: [] }`

---

## Part B: DESIGN.md Architecture

### 1. Orchestration Layer: Drop-off Problem & State Management

**Choice: Hybrid Redis + PostgreSQL**

Redis stores hot session state keyed by `interview_id`:
```json
{
  "current_question_index": 3,
  "transcript_chunks": ["chunk1", "chunk2"],
  "partial_scores": { "knowledge": 7 },
  "last_active": "<timestamp>"
}
```

- TTL: 2 hours per key
- Write-through on every answer received
- On session complete or timeout: flush full session to PostgreSQL
- On reconnect: client sends `interview_id` → server fetches Redis first, falls back to DB if key expired

**Justification:** Client-side state fails on network drop (the exact failure case). DB-only is too slow for mid-interview reads (every exchange). Redis handles hot-path reads at <1ms; DB provides durability and audit trail.

### 2. Admin Dashboard: Versioning & Safe Publishing

**Schema:**
```sql
role_versions (
  id            UUID PRIMARY KEY,
  role_name     TEXT,
  config        JSONB,      -- JD, questions, thresholds
  status        ENUM('draft', 'review', 'published'),
  published_at  TIMESTAMP,
  created_by    UUID
)

interview_sessions (
  id                UUID PRIMARY KEY,
  role_version_id   UUID REFERENCES role_versions(id),  -- pinned at start
  ...
)
```

**Safe Publishing:**
- Interview sessions pin `role_version_id` at creation. New publish = new row, not mutation.
- In-flight sessions are unaffected — they reference the old version FK.
- Rollback = publish a previous version (set its status back to `published`, demote current).

**Vet → Edit → Verify Pipeline:**
- `draft`: fully editable
- `review`: locked for editing; QA/program team verifies content
- `published`: immutable; triggers new `draft` if changes needed

### 3. Resource Management: STT/TTS at 5,000 Concurrent Users

**TTS Caching:**
- Pre-generate audio for all standard interview questions
- Cache in Redis keyed by `sha256(question_text + voice_model_id)`
- Expected cache hit rate: ~70% for standard question banks
- CDN edge delivery for pre-cached audio (low RTT for gov college networks)

**STT Queuing:**
- BullMQ (Redis-backed) job queue for STT requests
- Priority lanes: live interview (high) vs async review (low)
- Horizontal worker scaling: add workers during placement drive bursts

**Latency Optimization:**
- Stream audio in 250ms chunks; begin STT before answer ends
- Adaptive quality: measure client RTT on connect, downgrade audio bitrate if >300ms
- Overlap: start generating next question TTS while current answer is being transcribed
