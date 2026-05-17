# Task 1: Mock Evaluation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/Express PoC service that ingests interview transcripts, grades them via a mock AI (with circuit breaker), and flags remediation modules based on role thresholds.

**Architecture:** Single Express service — validation middleware → opossum circuit breaker wraps mockAI (2s delay, 10% failure) → remediation engine compares scores to thresholds → structured JSON response. No database; stateless PoC.

**Tech Stack:** Node.js, Express 4, Joi (validation), opossum (circuit breaker), helmet (HTTP security headers), Jest + Supertest (testing)

---

## File Map

```
task1-samvaad-saathi/
  src/
    app.js                     ← Express app setup (helmet, JSON, routes)
    routes/
      evaluate.js              ← POST /api/v1/evaluate — wires middleware + services
    services/
      mockAI.js                ← mockAIGrade(): 2s delay, 10% failure, random scores 1-10
      remediation.js           ← getRemediationModules(scores, thresholds): returns string[]
      circuitBreaker.js        ← opossum instance wrapping mockAIModule.mockAIGrade
    middleware/
      validate.js              ← Joi schema + validateEvaluatePayload middleware
  tests/
    middleware/
      validate.test.js
    services/
      mockAI.test.js
      remediation.test.js
      circuitBreaker.test.js
    routes/
      evaluate.test.js
  DESIGN.md
  README.md
  package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `task1-samvaad-saathi/package.json`
- Create: `task1-samvaad-saathi/src/app.js`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p "task1-samvaad-saathi/src/routes" \
         "task1-samvaad-saathi/src/services" \
         "task1-samvaad-saathi/src/middleware" \
         "task1-samvaad-saathi/tests/middleware" \
         "task1-samvaad-saathi/tests/services" \
         "task1-samvaad-saathi/tests/routes"
```

Create `task1-samvaad-saathi/package.json`:

```json
{
  "name": "task1-samvaad-saathi",
  "version": "1.0.0",
  "description": "Mock Evaluation Pipeline PoC for Samvaad Saathi",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest"
  },
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 10000
  },
  "dependencies": {
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "opossum": "^8.1.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd task1-samvaad-saathi && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create src/app.js**

```javascript
const express = require('express');
const helmet = require('helmet');
const evaluateRouter = require('./routes/evaluate');

const app = express();

app.use(helmet());
app.use(express.json());
app.use('/api/v1/evaluate', evaluateRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
```

- [ ] **Step 4: Create placeholder route so app.js doesn't crash**

Create `task1-samvaad-saathi/src/routes/evaluate.js` with just enough to load:

```javascript
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

module.exports = router;
```

- [ ] **Step 5: Verify app loads**

```bash
node -e "require('./src/app'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 6: Commit**

```bash
git add task1-samvaad-saathi/
git commit -m "feat(task1): project scaffold with Express and dependencies"
```

---

## Task 2: Validation Middleware

**Files:**
- Create: `task1-samvaad-saathi/src/middleware/validate.js`
- Test: `task1-samvaad-saathi/tests/middleware/validate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task1-samvaad-saathi/tests/middleware/validate.test.js`:

```javascript
const { validateEvaluatePayload } = require('../../src/middleware/validate');

const validPayload = {
  interview_id: 'int-9901',
  user_id: 'user-445',
  role_config: {
    role: 'Customer Success',
    thresholds: { pacing: 6, knowledge: 5 }
  },
  transcript: 'I think customer satisfaction is the most important thing.',
  audio_metadata: { duration_seconds: 12, filler_word_count: 3 }
};

function makeReqRes(body) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validateEvaluatePayload', () => {
  it('calls next() for a valid payload', () => {
    const { req, res, next } = makeReqRes(validPayload);
    validateEvaluatePayload(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when interview_id is missing', () => {
    const { interview_id, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/interview_id/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when role_config is missing', () => {
    const { role_config, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when audio_metadata is missing', () => {
    const { audio_metadata, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when transcript is missing', () => {
    const { transcript, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd task1-samvaad-saathi && npx jest tests/middleware/validate.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/middleware/validate'`

- [ ] **Step 3: Implement validate.js**

Create `task1-samvaad-saathi/src/middleware/validate.js`:

```javascript
const Joi = require('joi');

const evaluateSchema = Joi.object({
  interview_id: Joi.string().required(),
  user_id: Joi.string().required(),
  role_config: Joi.object({
    role: Joi.string().required(),
    thresholds: Joi.object().pattern(Joi.string(), Joi.number().min(1).max(10)).min(1).required()
  }).required(),
  transcript: Joi.string().required(),
  audio_metadata: Joi.object({
    duration_seconds: Joi.number().min(0).required(),
    filler_word_count: Joi.number().min(0).required()
  }).required()
});

function validateEvaluatePayload(req, res, next) {
  const { error } = evaluateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateEvaluatePayload };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/middleware/validate.test.js --no-coverage
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add task1-samvaad-saathi/src/middleware/validate.js \
        task1-samvaad-saathi/tests/middleware/validate.test.js
git commit -m "feat(task1): add Joi validation middleware with tests"
```

---

## Task 3: Mock AI Service

**Files:**
- Create: `task1-samvaad-saathi/src/services/mockAI.js`
- Test: `task1-samvaad-saathi/tests/services/mockAI.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task1-samvaad-saathi/tests/services/mockAI.test.js`:

```javascript
const { mockAIGrade } = require('../../src/services/mockAI');

describe('mockAIGrade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns scores with keys knowledge, pacing, filler_word_usage', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // won't trigger failure
    const promise = mockAIGrade({
      transcript: 'test transcript',
      audio_metadata: { duration_seconds: 10, filler_word_count: 2 }
    });
    await jest.runAllTimersAsync();
    const scores = await promise;
    expect(scores).toHaveProperty('knowledge');
    expect(scores).toHaveProperty('pacing');
    expect(scores).toHaveProperty('filler_word_usage');
  });

  it('returns integer scores between 1 and 10 inclusive', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    const scores = await promise;
    for (const key of ['knowledge', 'pacing', 'filler_word_usage']) {
      expect(scores[key]).toBeGreaterThanOrEqual(1);
      expect(scores[key]).toBeLessThanOrEqual(10);
      expect(Number.isInteger(scores[key])).toBe(true);
    }
  });

  it('throws Error("AI timeout") when Math.random() < 0.1', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow('AI timeout');
  });

  it('does not throw when Math.random() >= 0.1', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/services/mockAI.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/mockAI'`

- [ ] **Step 3: Implement mockAI.js**

Create `task1-samvaad-saathi/src/services/mockAI.js`:

```javascript
function randomScore() {
  return Math.ceil(Math.random() * 10);
}

async function mockAIGrade({ transcript, audio_metadata }) {
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (Math.random() < 0.1) {
    throw new Error('AI timeout');
  }

  return {
    knowledge: randomScore(),
    pacing: randomScore(),
    filler_word_usage: randomScore()
  };
}

module.exports = { mockAIGrade };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/mockAI.test.js --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add task1-samvaad-saathi/src/services/mockAI.js \
        task1-samvaad-saathi/tests/services/mockAI.test.js
git commit -m "feat(task1): add mock AI grading service with 2s delay and 10% failure rate"
```

---

## Task 4: Remediation Service

**Files:**
- Create: `task1-samvaad-saathi/src/services/remediation.js`
- Test: `task1-samvaad-saathi/tests/services/remediation.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task1-samvaad-saathi/tests/services/remediation.test.js`:

```javascript
const { getRemediationModules } = require('../../src/services/remediation');

describe('getRemediationModules', () => {
  it('returns empty array when all scores meet thresholds', () => {
    const scores = { knowledge: 7, pacing: 8, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    expect(getRemediationModules(scores, thresholds)).toEqual([]);
  });

  it('flags Pacing Practice when pacing score is below threshold', () => {
    const scores = { knowledge: 7, pacing: 4, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Pacing Practice');
    expect(modules).not.toContain('Knowledge Review');
  });

  it('flags Knowledge Review when knowledge score is below threshold', () => {
    const scores = { knowledge: 3, pacing: 8, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Knowledge Review');
    expect(modules).not.toContain('Pacing Practice');
  });

  it('flags multiple modules when multiple scores are below threshold', () => {
    const scores = { knowledge: 3, pacing: 4, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Pacing Practice');
    expect(modules).toContain('Knowledge Review');
    expect(modules).toHaveLength(2);
  });

  it('handles filler_word_usage threshold when provided', () => {
    const scores = { knowledge: 7, pacing: 8, filler_word_usage: 3 };
    const thresholds = { pacing: 6, knowledge: 5, filler_word_usage: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Filler Word Practice');
    expect(modules).toHaveLength(1);
  });

  it('returns empty array when scores is null', () => {
    expect(getRemediationModules(null, { pacing: 6 })).toEqual([]);
  });

  it('score equal to threshold is not flagged (must be strictly below)', () => {
    const scores = { knowledge: 5, pacing: 6 };
    const thresholds = { pacing: 6, knowledge: 5 };
    expect(getRemediationModules(scores, thresholds)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/services/remediation.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/remediation'`

- [ ] **Step 3: Implement remediation.js**

Create `task1-samvaad-saathi/src/services/remediation.js`:

```javascript
const MODULE_NAMES = {
  pacing: 'Pacing Practice',
  knowledge: 'Knowledge Review',
  filler_word_usage: 'Filler Word Practice'
};

function getRemediationModules(scores, thresholds) {
  if (!scores) return [];

  return Object.entries(thresholds)
    .filter(([key, threshold]) => scores[key] !== undefined && scores[key] < threshold)
    .map(([key]) => MODULE_NAMES[key] || `${key} Practice`);
}

module.exports = { getRemediationModules };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/remediation.test.js --no-coverage
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add task1-samvaad-saathi/src/services/remediation.js \
        task1-samvaad-saathi/tests/services/remediation.test.js
git commit -m "feat(task1): add remediation engine with threshold comparison"
```

---

## Task 5: Circuit Breaker Service

**Files:**
- Create: `task1-samvaad-saathi/src/services/circuitBreaker.js`
- Test: `task1-samvaad-saathi/tests/services/circuitBreaker.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task1-samvaad-saathi/tests/services/circuitBreaker.test.js`:

```javascript
const mockAIModule = require('../../src/services/mockAI');

describe('circuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = require('../../src/services/circuitBreaker');
    breaker.close(); // reset circuit state to closed before each test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves with scores when mockAIGrade succeeds', async () => {
    jest.spyOn(mockAIModule, 'mockAIGrade').mockResolvedValue({
      knowledge: 7, pacing: 8, filler_word_usage: 6
    });
    const result = await breaker.fire({ transcript: 'test', audio_metadata: {} });
    expect(result).toEqual({ knowledge: 7, pacing: 8, filler_word_usage: 6 });
  });

  it('resolves with pending fallback when mockAIGrade throws', async () => {
    jest.spyOn(mockAIModule, 'mockAIGrade').mockRejectedValue(new Error('AI timeout'));
    const result = await breaker.fire({ transcript: 'test', audio_metadata: {} });
    expect(result).toEqual({ status: 'pending', scores: null, flagged_modules: [] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/services/circuitBreaker.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/circuitBreaker'`

- [ ] **Step 3: Implement circuitBreaker.js**

Create `task1-samvaad-saathi/src/services/circuitBreaker.js`:

```javascript
const CircuitBreaker = require('opossum');
const mockAIModule = require('./mockAI');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 5
};

// Arrow function wrapper ensures spy on mockAIModule.mockAIGrade is honoured in tests
const breaker = new CircuitBreaker(
  (payload) => mockAIModule.mockAIGrade(payload),
  options
);

breaker.fallback(() => ({ status: 'pending', scores: null, flagged_modules: [] }));

module.exports = breaker;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/circuitBreaker.test.js --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add task1-samvaad-saathi/src/services/circuitBreaker.js \
        task1-samvaad-saathi/tests/services/circuitBreaker.test.js
git commit -m "feat(task1): add opossum circuit breaker wrapping mock AI service"
```

---

## Task 6: Evaluate Route

**Files:**
- Modify: `task1-samvaad-saathi/src/routes/evaluate.js`
- Test: `task1-samvaad-saathi/tests/routes/evaluate.test.js`

- [ ] **Step 1: Write the failing integration tests**

Create `task1-samvaad-saathi/tests/routes/evaluate.test.js`:

```javascript
jest.mock('../../src/services/circuitBreaker', () => ({
  fire: jest.fn(),
  close: jest.fn()
}));

const request = require('supertest');
const app = require('../../src/app');
const breaker = require('../../src/services/circuitBreaker');

const validPayload = {
  interview_id: 'int-9901',
  user_id: 'user-445',
  role_config: {
    role: 'Customer Success',
    thresholds: { pacing: 6, knowledge: 5 }
  },
  transcript: 'I think customer satisfaction is the most important thing.',
  audio_metadata: { duration_seconds: 12, filler_word_count: 3 }
};

describe('POST /api/v1/evaluate', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with evaluated status and flagged modules below threshold', async () => {
    breaker.fire.mockResolvedValue({ knowledge: 3, pacing: 4, filler_word_usage: 8 });

    const res = await request(app).post('/api/v1/evaluate').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.interview_id).toBe('int-9901');
    expect(res.body.user_id).toBe('user-445');
    expect(res.body.status).toBe('evaluated');
    expect(res.body.scores).toEqual({ knowledge: 3, pacing: 4, filler_word_usage: 8 });
    expect(res.body.flagged_modules).toContain('Pacing Practice');
    expect(res.body.flagged_modules).toContain('Knowledge Review');
    expect(res.body.evaluated_at).toBeDefined();
  });

  it('returns 200 with evaluated status and empty flagged_modules when all scores above threshold', async () => {
    breaker.fire.mockResolvedValue({ knowledge: 8, pacing: 9, filler_word_usage: 7 });

    const res = await request(app).post('/api/v1/evaluate').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('evaluated');
    expect(res.body.flagged_modules).toHaveLength(0);
  });

  it('returns 200 with pending status when circuit breaker fallback triggers', async () => {
    breaker.fire.mockResolvedValue({ status: 'pending', scores: null, flagged_modules: [] });

    const res = await request(app).post('/api/v1/evaluate').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.scores).toBeNull();
    expect(res.body.flagged_modules).toEqual([]);
  });

  it('returns 200 with pending status when breaker.fire rejects unexpectedly', async () => {
    breaker.fire.mockRejectedValue(new Error('unexpected'));

    const res = await request(app).post('/api/v1/evaluate').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns 400 for missing interview_id', async () => {
    const { interview_id, ...body } = validPayload;
    const res = await request(app).post('/api/v1/evaluate').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/interview_id/);
  });

  it('returns 400 for missing transcript', async () => {
    const { transcript, ...body } = validPayload;
    const res = await request(app).post('/api/v1/evaluate').send(body);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/routes/evaluate.test.js --no-coverage
```

Expected: FAIL — route returns 501

- [ ] **Step 3: Implement the evaluate route**

Replace the contents of `task1-samvaad-saathi/src/routes/evaluate.js`:

```javascript
const express = require('express');
const router = express.Router();
const { validateEvaluatePayload } = require('../middleware/validate');
const breaker = require('../services/circuitBreaker');
const { getRemediationModules } = require('../services/remediation');

router.post('/', validateEvaluatePayload, async (req, res) => {
  const { interview_id, user_id, role_config, transcript, audio_metadata } = req.body;

  try {
    const result = await breaker.fire({ transcript, audio_metadata });

    if (result.status === 'pending') {
      return res.status(200).json({
        interview_id,
        user_id,
        status: 'pending',
        scores: null,
        flagged_modules: [],
        evaluated_at: new Date().toISOString()
      });
    }

    const flagged_modules = getRemediationModules(result, role_config.thresholds);

    return res.status(200).json({
      interview_id,
      user_id,
      status: 'evaluated',
      scores: result,
      flagged_modules,
      evaluated_at: new Date().toISOString()
    });
  } catch {
    return res.status(200).json({
      interview_id,
      user_id,
      status: 'pending',
      scores: null,
      flagged_modules: [],
      evaluated_at: new Date().toISOString()
    });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: PASS — all tests across all suites passing

- [ ] **Step 5: Smoke test the running server**

In one terminal:
```bash
node src/app.js
```

In another:
```bash
curl -s -X POST http://localhost:3000/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "interview_id": "int-9901",
    "user_id": "user-445",
    "role_config": {
      "role": "Customer Success",
      "thresholds": { "pacing": 6, "knowledge": 5 }
    },
    "transcript": "I, uh, think that customer satisfaction is the most important thing.",
    "audio_metadata": { "duration_seconds": 12, "filler_word_count": 3 }
  }' | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

Expected: JSON response with `status: "evaluated"` or `"pending"` after ~2s, `flagged_modules` array, `evaluated_at` timestamp.

- [ ] **Step 6: Commit**

```bash
git add task1-samvaad-saathi/src/routes/evaluate.js \
        task1-samvaad-saathi/tests/routes/evaluate.test.js
git commit -m "feat(task1): implement evaluate route with circuit breaker and remediation"
```

---

## Task 7: DESIGN.md

**Files:**
- Create: `task1-samvaad-saathi/DESIGN.md`

- [ ] **Step 1: Write DESIGN.md**

Create `task1-samvaad-saathi/DESIGN.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add task1-samvaad-saathi/DESIGN.md
git commit -m "docs(task1): add system design document (Part B)"
```

---

## Task 8: README.md

**Files:**
- Create: `task1-samvaad-saathi/README.md`

- [ ] **Step 1: Write README.md**

Create `task1-samvaad-saathi/README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add task1-samvaad-saathi/README.md
git commit -m "docs(task1): add README with setup, API docs, and design notes"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| Ingestion endpoint accepts JSON payload | Task 6 |
| Mock AI: 2s delay | Task 3 |
| Mock AI: 10% failure | Task 3 |
| Mock AI: scores 1-10 for Knowledge, Pacing, Filler | Task 3 |
| Remediation: flag modules below threshold | Task 4 |
| Circuit breaker: graceful fallback to "pending" | Task 5 |
| DESIGN.md: drop-off + state management | Task 7 |
| DESIGN.md: versioning + safe publishing | Task 7 |
| DESIGN.md: STT/TTS caching + latency | Task 7 |
| README.md with run instructions + stack | Task 8 |

All requirements covered. ✓

### Type/name consistency check

- `mockAIGrade` — defined in Task 3, used in Task 5 ✓
- `getRemediationModules(scores, thresholds)` — defined in Task 4, used in Task 6 ✓
- `validateEvaluatePayload` — defined in Task 2, used in Task 6 ✓
- `breaker.fire(payload)` — opossum API, used in Task 5 test and Task 6 ✓
- `result.status === 'pending'` — fallback shape defined in Task 5, checked in Task 6 ✓
- Score keys: `knowledge`, `pacing`, `filler_word_usage` — consistent across Tasks 3, 4, 6 ✓
