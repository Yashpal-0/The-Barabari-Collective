# Samvaad Saathi — System Design

## 1. Orchestration Layer: Conversation State & Resilience

### Drop-off Problem

Our target demographic uses unstable mobile networks. If a connection drops mid-answer, the student must resume exactly where they left off — with previous transcriptions and scores intact.

**Architecture choice: Hybrid Redis + PostgreSQL**

Redis stores the hot session state keyed by `interview_id`:

```json
{
  "current_question_index": 3,
  "transcript_chunks": ["chunk1", "chunk2"],
  "partial_scores": { "knowledge": 7 },
  "last_active": "2026-05-17T10:00:00Z"
}
```

- TTL: 2 hours (covers a full interview session)
- Write-through on every answer received
- On session complete/timeout: flush full session to PostgreSQL
- On reconnect: client sends `interview_id` → server fetches Redis first, falls back to DB if key expired

**Rejected alternatives:**

| Option | Why rejected |
|--------|-------------|
| Client-side only | Fails on network drop — the exact problem we're solving |
| DB-only | <1ms reads not achievable with PG for every conversation turn |

---

## 2. Admin Dashboard: Versioning & Safe Publishing

### Schema

```sql
CREATE TABLE role_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name     TEXT NOT NULL,
  config        JSONB NOT NULL,  -- JD, questions, thresholds
  status        TEXT CHECK (status IN ('draft', 'review', 'published')) NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_by    UUID NOT NULL
);

CREATE TABLE interview_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id   UUID NOT NULL REFERENCES role_versions(id),  -- pinned at session start
  student_id        UUID NOT NULL,
  started_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Safe Publishing

When an Admin publishes a new role version:
1. A new row is inserted into `role_versions` (new UUID, status = `published`)
2. In-flight interviews reference the **old** `role_version_id` (pinned FK at session start)
3. No existing row is mutated — new publish never breaks active sessions

Rollback = set the previous version's status back to `published` and demote the current one.

### Vet → Edit → Verify Pipeline

| Status | Permissions |
|--------|------------|
| `draft` | Fully editable by program team |
| `review` | Locked for editing; QA/program lead verifies content against JD |
| `published` | Immutable; changes require creating a new draft |

---

## 3. Optimized Resource Management: Scaling Voice & AI

### Context

During placement drives: up to **5,000 concurrent students**, government college networks (100–500 kbps), Indian-accented voice models.

### TTS Caching

Pre-generate audio for all standard interview questions at role publish time:

- Cache in Redis: `tts:{sha256(question_text + voice_model_id)}` → audio bytes
- Expected cache hit rate: ~70% for standard question banks (most questions repeat)
- CDN edge delivery (e.g., CloudFront) for pre-cached audio — reduces RTT for distributed users

### STT Queuing

- BullMQ (Redis-backed) job queue with two priority lanes:
  - **High:** live interview STT (student waiting for AI response)
  - **Low:** async review STT (post-session analytics)
- Worker pods scale horizontally via Kubernetes HPA during burst events

### Latency Optimization

| Technique | Benefit |
|-----------|---------|
| Stream audio in 250ms chunks | Begin STT before answer ends; shaves 1-2s off response time |
| Adaptive bitrate | Measure RTT on WebSocket connect; drop to 8kbps Opus if RTT >300ms |
| Speculative TTS | Start generating next question audio while current answer is being transcribed |
| Regional deployment | Deploy worker pods in `ap-south-1` (Mumbai) for Indian users |
