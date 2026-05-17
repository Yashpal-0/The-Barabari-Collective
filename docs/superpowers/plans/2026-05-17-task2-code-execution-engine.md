# Task 2: Code Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/Express service that accepts code execution requests, isolates them in Docker containers, queues them with BullMQ, and streams lifecycle status via Socket.io.

**Architecture:** Single process — Express API validates and enqueues jobs (BullMQ + Redis), BullMQ worker (concurrency 5) pulls jobs and runs Docker containers (`--rm --network none --memory 64m`), Socket.io rooms keyed by `user_id` deliver real-time status (queued → running → success/error/timeout).

**Tech Stack:** Node.js, Express 4, Socket.io 4, BullMQ 5, Joi, helmet, Jest + Supertest

---

## File Map

```
task2-code-guru/
  src/
    app.js                      ← Express + Socket.io server + BullMQ worker registration
    routes/
      execute.js                ← POST /execute: validate → enqueue → emit queued → respond
    workers/
      jobHandler.js             ← runJob(job, io): emit running → call executor → emit result
    services/
      queue.js                  ← BullMQ Queue instance named 'executions'
      docker.js                 ← runInDocker({language,code}): spawn, timeout, stdin, capture
      executor.js               ← runExecution({language,code}): thin dispatch to docker.js
    middleware/
      validate.js               ← validateExecutePayload: Joi schema
  tests/
    middleware/
      validate.test.js
    services/
      queue.test.js
      docker.test.js
      executor.test.js
    workers/
      jobHandler.test.js
    routes/
      execute.test.js
  DESIGN.md
  README.md
  package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `task2-code-guru/package.json`
- Create: `task2-code-guru/src/app.js` (placeholder)
- Create: `task2-code-guru/src/routes/execute.js` (placeholder)
- Create: `task2-code-guru/src/workers/jobHandler.js` (placeholder)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p task2-code-guru/src/routes \
         task2-code-guru/src/workers \
         task2-code-guru/src/services \
         task2-code-guru/src/middleware \
         task2-code-guru/tests/middleware \
         task2-code-guru/tests/services \
         task2-code-guru/tests/workers \
         task2-code-guru/tests/routes
```

- [ ] **Step 2: Create package.json**

Create `task2-code-guru/package.json`:

```json
{
  "name": "task2-code-guru",
  "version": "1.0.0",
  "description": "Code Execution Engine PoC for Code Guru",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest"
  },
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 15000
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "socket.io-client": "^4.7.0",
    "supertest": "^6.3.3"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd task2-code-guru && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Create placeholder app.js**

Create `task2-code-guru/src/app.js`:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(helmet());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
});

app.use('/execute', require('./routes/execute'));

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = { app, server, io };
```

- [ ] **Step 5: Create placeholder route**

Create `task2-code-guru/src/routes/execute.js`:

```javascript
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
```

- [ ] **Step 6: Create placeholder jobHandler**

Create `task2-code-guru/src/workers/jobHandler.js`:

```javascript
async function runJob(job, io) {
  throw new Error('Not implemented');
}

module.exports = { runJob };
```

- [ ] **Step 7: Verify app loads**

```bash
cd task2-code-guru && node -e "require('./src/app'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 8: Add .gitignore and commit**

```bash
echo "node_modules/" > task2-code-guru/.gitignore
git add task2-code-guru/
git commit -m "feat(task2): project scaffold with Express, Socket.io, BullMQ"
```

---

## Task 2: Validation Middleware

**Files:**
- Create: `task2-code-guru/src/middleware/validate.js`
- Test: `task2-code-guru/tests/middleware/validate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task2-code-guru/tests/middleware/validate.test.js`:

```javascript
const { validateExecutePayload } = require('../../src/middleware/validate');

const validPayload = {
  user_id: 'user-123',
  language: 'javascript',
  code: "console.log('Hello')"
};

function makeReqRes(body) {
  const req = { body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('validateExecutePayload', () => {
  it('calls next() for valid javascript payload', () => {
    const { req, res, next } = makeReqRes(validPayload);
    validateExecutePayload(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for valid python payload', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, language: 'python' });
    validateExecutePayload(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when user_id is missing', () => {
    const { user_id, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/user_id/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for unsupported language', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, language: 'ruby' });
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/language/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when code is missing', () => {
    const { code, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/code/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when code exceeds 50000 characters', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, code: 'x'.repeat(50001) });
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd task2-code-guru && npx jest tests/middleware/validate.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/middleware/validate'`

- [ ] **Step 3: Implement validate.js**

Create `task2-code-guru/src/middleware/validate.js`:

```javascript
const Joi = require('joi');

const executeSchema = Joi.object({
  user_id: Joi.string().required(),
  language: Joi.string().valid('javascript', 'python').required(),
  code: Joi.string().max(50000).required()
});

function validateExecutePayload(req, res, next) {
  const { error } = executeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateExecutePayload };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/middleware/validate.test.js --no-coverage
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add task2-code-guru/src/middleware/validate.js \
        task2-code-guru/tests/middleware/validate.test.js
git commit -m "feat(task2): add Joi validation middleware for execute payload"
```

---

## Task 3: Queue Service

**Files:**
- Create: `task2-code-guru/src/services/queue.js`
- Test: `task2-code-guru/tests/services/queue.test.js`

- [ ] **Step 1: Write the failing test**

Create `task2-code-guru/tests/services/queue.test.js`:

```javascript
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() }))
}));

const { Queue } = require('bullmq');

describe('executionQueue', () => {
  it('creates a BullMQ Queue named executions with correct config', () => {
    require('../../src/services/queue');

    expect(Queue).toHaveBeenCalledWith('executions', expect.objectContaining({
      connection: expect.objectContaining({ host: expect.any(String), port: expect.any(Number) }),
      defaultJobOptions: expect.objectContaining({
        removeOnComplete: expect.any(Object),
        removeOnFail: expect.any(Object)
      })
    }));
  });

  it('exports executionQueue object', () => {
    jest.resetModules();
    jest.mock('bullmq', () => ({
      Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() }))
    }));
    const { executionQueue } = require('../../src/services/queue');
    expect(executionQueue).toBeDefined();
    expect(typeof executionQueue.add).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/services/queue.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/queue'`

- [ ] **Step 3: Implement queue.js**

Create `task2-code-guru/src/services/queue.js`:

```javascript
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const executionQueue = new Queue('executions', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 3600 }
  }
});

module.exports = { executionQueue };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/queue.test.js --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add task2-code-guru/src/services/queue.js \
        task2-code-guru/tests/services/queue.test.js
git commit -m "feat(task2): add BullMQ queue service"
```

---

## Task 4: Docker Executor Service

**Files:**
- Create: `task2-code-guru/src/services/docker.js`
- Test: `task2-code-guru/tests/services/docker.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task2-code-guru/tests/services/docker.test.js`:

```javascript
const { EventEmitter } = require('events');

jest.mock('child_process', () => ({ spawn: jest.fn() }));

const { spawn } = require('child_process');
const { runInDocker } = require('../../src/services/docker');

function makeFakeChild({ stdout = '', stderr = '', exitCode = 0 } = {}) {
  const child = new EventEmitter();
  child.stdin = { write: jest.fn(), end: jest.fn() };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn();
  setImmediate(() => {
    if (stdout) child.stdout.emit('data', Buffer.from(stdout));
    if (stderr) child.stderr.emit('data', Buffer.from(stderr));
    child.emit('close', exitCode);
  });
  return child;
}

describe('runInDocker', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns stdout and exitCode 0 for successful execution', async () => {
    spawn.mockReturnValue(makeFakeChild({ stdout: 'Hello World\n', exitCode: 0 }));
    const result = await runInDocker({ language: 'javascript', code: "console.log('Hello World')" });
    expect(result.output).toBe('Hello World\n');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
  });

  it('returns stderr and non-zero exitCode for runtime errors', async () => {
    spawn.mockReturnValue(makeFakeChild({ stderr: 'ReferenceError: x is not defined', exitCode: 1 }));
    const result = await runInDocker({ language: 'javascript', code: 'x' });
    expect(result.output).toBe('ReferenceError: x is not defined');
    expect(result.exitCode).toBe(1);
    expect(result.timedOut).toBe(false);
  });

  it('uses node:alpine image for javascript', async () => {
    spawn.mockReturnValue(makeFakeChild({ exitCode: 0 }));
    await runInDocker({ language: 'javascript', code: '' });
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining(['node:alpine', 'node', '-'])
    );
  });

  it('uses python:alpine image for python', async () => {
    spawn.mockReturnValue(makeFakeChild({ exitCode: 0 }));
    await runInDocker({ language: 'python', code: '' });
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining(['python:alpine', 'python3', '-'])
    );
  });

  it('passes security flags to docker run', async () => {
    spawn.mockReturnValue(makeFakeChild({ exitCode: 0 }));
    await runInDocker({ language: 'javascript', code: '' });
    const args = spawn.mock.calls[0][1];
    expect(args).toContain('--rm');
    expect(args).toContain('--network');
    expect(args).toContain('none');
    expect(args).toContain('--memory');
    expect(args).toContain('64m');
  });

  it('throws for unsupported language', async () => {
    await expect(runInDocker({ language: 'ruby', code: '' }))
      .rejects.toThrow('Unsupported language: ruby');
  });

  it('kills child process and sets timedOut after 5000ms', async () => {
    jest.useFakeTimers();

    const child = new EventEmitter();
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = jest.fn(() => child.emit('close', -1));

    spawn.mockReturnValue(child);

    const promise = runInDocker({ language: 'javascript', code: 'while(true){}' });
    jest.advanceTimersByTime(5000);
    const result = await promise;

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(result.timedOut).toBe(true);
    expect(result.output).toBe('');

    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/services/docker.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/docker'`

- [ ] **Step 3: Implement docker.js**

Create `task2-code-guru/src/services/docker.js`:

```javascript
const { spawn } = require('child_process');

const LANGUAGE_CONFIG = {
  javascript: { image: 'node:alpine', command: ['node', '-'] },
  python: { image: 'python:alpine', command: ['python3', '-'] }
};

const TIMEOUT_MS = 5000;

async function runInDocker({ language, code }) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  const start = Date.now();

  return new Promise((resolve) => {
    const child = spawn('docker', [
      'run', '--rm',
      '--network', 'none',
      '--memory', '64m',
      '--cpus', '0.5',
      '-i',
      config.image,
      ...config.command
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.stdin.write(code);
    child.stdin.end();

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, TIMEOUT_MS);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        output: timedOut ? '' : (exitCode === 0 ? stdout : stderr),
        execution_time_ms: Date.now() - start,
        timedOut,
        exitCode: timedOut ? -1 : exitCode
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        output: err.message,
        execution_time_ms: Date.now() - start,
        timedOut: false,
        exitCode: -1
      });
    });
  });
}

module.exports = { runInDocker, LANGUAGE_CONFIG };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/docker.test.js --no-coverage
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add task2-code-guru/src/services/docker.js \
        task2-code-guru/tests/services/docker.test.js
git commit -m "feat(task2): add Docker executor with timeout and stdin code injection"
```

---

## Task 5: Executor Dispatcher

**Files:**
- Create: `task2-code-guru/src/services/executor.js`
- Test: `task2-code-guru/tests/services/executor.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task2-code-guru/tests/services/executor.test.js`:

```javascript
jest.mock('../../src/services/docker', () => ({
  runInDocker: jest.fn()
}));

const { runInDocker } = require('../../src/services/docker');
const { runExecution } = require('../../src/services/executor');

describe('runExecution', () => {
  afterEach(() => jest.clearAllMocks());

  it('delegates to runInDocker with same params', async () => {
    const mockResult = { output: 'ok\n', exitCode: 0, timedOut: false, execution_time_ms: 50 };
    runInDocker.mockResolvedValue(mockResult);

    const result = await runExecution({ language: 'javascript', code: 'console.log("ok")' });

    expect(runInDocker).toHaveBeenCalledWith({ language: 'javascript', code: 'console.log("ok")' });
    expect(result).toEqual(mockResult);
  });

  it('propagates errors from runInDocker', async () => {
    runInDocker.mockRejectedValue(new Error('Unsupported language: ruby'));
    await expect(runExecution({ language: 'ruby', code: '' }))
      .rejects.toThrow('Unsupported language: ruby');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/services/executor.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/services/executor'`

- [ ] **Step 3: Implement executor.js**

Create `task2-code-guru/src/services/executor.js`:

```javascript
const { runInDocker } = require('./docker');

async function runExecution({ language, code }) {
  return runInDocker({ language, code });
}

module.exports = { runExecution };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/services/executor.test.js --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add task2-code-guru/src/services/executor.js \
        task2-code-guru/tests/services/executor.test.js
git commit -m "feat(task2): add executor dispatcher wrapping Docker service"
```

---

## Task 6: Worker Job Handler

**Files:**
- Modify: `task2-code-guru/src/workers/jobHandler.js`
- Test: `task2-code-guru/tests/workers/jobHandler.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task2-code-guru/tests/workers/jobHandler.test.js`:

```javascript
jest.mock('../../src/services/executor', () => ({
  runExecution: jest.fn()
}));

const { runExecution } = require('../../src/services/executor');
const { runJob } = require('../../src/workers/jobHandler');

function makeMockIo() {
  const mockEmit = jest.fn();
  return {
    io: { to: jest.fn().mockReturnValue({ emit: mockEmit }) },
    mockEmit
  };
}

describe('runJob', () => {
  afterEach(() => jest.clearAllMocks());

  it('emits running then success status', async () => {
    const { io, mockEmit } = makeMockIo();
    runExecution.mockResolvedValue({
      output: 'Hello\n', exitCode: 0, timedOut: false, execution_time_ms: 80
    });

    const job = { id: 'job-1', data: { user_id: 'user-123', language: 'javascript', code: 'console.log("Hello")' } };
    await runJob(job, io);

    expect(io.to).toHaveBeenCalledWith('user-123');
    expect(mockEmit).toHaveBeenCalledWith('status', { job_id: 'job-1', status: 'running' });
    expect(mockEmit).toHaveBeenCalledWith('status', expect.objectContaining({
      job_id: 'job-1',
      status: 'success',
      output: 'Hello\n',
      execution_time_ms: expect.any(Number)
    }));
  });

  it('emits error status when exitCode is non-zero', async () => {
    const { io, mockEmit } = makeMockIo();
    runExecution.mockResolvedValue({
      output: 'SyntaxError', exitCode: 1, timedOut: false, execution_time_ms: 40
    });

    const job = { id: 'job-2', data: { user_id: 'user-123', language: 'python', code: 'bad code' } };
    await runJob(job, io);

    expect(mockEmit).toHaveBeenCalledWith('status', expect.objectContaining({
      status: 'error',
      output: 'SyntaxError'
    }));
  });

  it('emits timeout status when timedOut is true', async () => {
    const { io, mockEmit } = makeMockIo();
    runExecution.mockResolvedValue({
      output: '', exitCode: -1, timedOut: true, execution_time_ms: 5000
    });

    const job = { id: 'job-3', data: { user_id: 'user-123', language: 'javascript', code: 'while(true){}' } };
    await runJob(job, io);

    expect(mockEmit).toHaveBeenCalledWith('status', expect.objectContaining({
      status: 'timeout',
      output: ''
    }));
  });

  it('truncates output to 10240 characters', async () => {
    const { io, mockEmit } = makeMockIo();
    runExecution.mockResolvedValue({
      output: 'x'.repeat(20000), exitCode: 0, timedOut: false, execution_time_ms: 100
    });

    const job = { id: 'job-4', data: { user_id: 'user-123', language: 'javascript', code: '' } };
    await runJob(job, io);

    const lastCall = mockEmit.mock.calls[mockEmit.mock.calls.length - 1][1];
    expect(lastCall.output.length).toBe(10240);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd task2-code-guru && npx jest tests/workers/jobHandler.test.js --no-coverage
```

Expected: FAIL — `throw new Error('Not implemented')`

- [ ] **Step 3: Implement jobHandler.js**

Replace `task2-code-guru/src/workers/jobHandler.js`:

```javascript
const { runExecution } = require('../services/executor');

async function runJob(job, io) {
  const { user_id, language, code } = job.data;
  const job_id = job.id;

  io.to(user_id).emit('status', { job_id, status: 'running' });

  const start = Date.now();
  const result = await runExecution({ language, code });
  const execution_time_ms = Date.now() - start;

  const status = result.timedOut ? 'timeout' : result.exitCode === 0 ? 'success' : 'error';

  io.to(user_id).emit('status', {
    job_id,
    status,
    output: result.output.slice(0, 10240),
    execution_time_ms
  });
}

module.exports = { runJob };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/workers/jobHandler.test.js --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add task2-code-guru/src/workers/jobHandler.js \
        task2-code-guru/tests/workers/jobHandler.test.js
git commit -m "feat(task2): add BullMQ worker job handler with lifecycle emit"
```

---

## Task 7: Execute Route + Full App Integration

**Files:**
- Modify: `task2-code-guru/src/app.js` (add BullMQ Worker registration)
- Modify: `task2-code-guru/src/routes/execute.js` (full implementation)
- Test: `task2-code-guru/tests/routes/execute.test.js`

- [ ] **Step 1: Write the failing integration tests**

Create `task2-code-guru/tests/routes/execute.test.js`:

```javascript
// Mock BullMQ to prevent Redis connection in app.js Worker
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() }))
}));

// Mock queue module so we can control executionQueue.add
jest.mock('../../src/services/queue', () => ({
  executionQueue: { add: jest.fn() }
}));

const request = require('supertest');
const { app, io } = require('../../src/app');
const { executionQueue } = require('../../src/services/queue');

const validPayload = {
  user_id: 'user-123',
  language: 'javascript',
  code: "console.log('Hello World')"
};

describe('POST /execute', () => {
  let mockEmit;

  beforeEach(() => {
    mockEmit = jest.fn();
    jest.spyOn(io, 'to').mockReturnValue({ emit: mockEmit });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns 200 with job_id and queued status', async () => {
    executionQueue.add.mockResolvedValue({ id: 'job-abc' });

    const res = await request(app).post('/execute').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.job_id).toBe('job-abc');
    expect(res.body.status).toBe('queued');
    expect(io.to).toHaveBeenCalledWith('user-123');
    expect(mockEmit).toHaveBeenCalledWith('status', { job_id: 'job-abc', status: 'queued' });
  });

  it('calls executionQueue.add with correct job data', async () => {
    executionQueue.add.mockResolvedValue({ id: 'job-xyz' });

    await request(app).post('/execute').send(validPayload);

    expect(executionQueue.add).toHaveBeenCalledWith('execute', {
      user_id: 'user-123',
      language: 'javascript',
      code: "console.log('Hello World')"
    });
  });

  it('returns 400 for unsupported language', async () => {
    const res = await request(app)
      .post('/execute')
      .send({ ...validPayload, language: 'ruby' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/language/);
  });

  it('returns 400 for missing user_id', async () => {
    const { user_id, ...body } = validPayload;
    const res = await request(app).post('/execute').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing code', async () => {
    const { code, ...body } = validPayload;
    const res = await request(app).post('/execute').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 503 when queue.add throws', async () => {
    executionQueue.add.mockRejectedValue(new Error('Redis down'));

    const res = await request(app).post('/execute').send(validPayload);
    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/routes/execute.test.js --no-coverage
```

Expected: FAIL — route returns 501

- [ ] **Step 3: Implement the execute route**

Replace `task2-code-guru/src/routes/execute.js`:

```javascript
const express = require('express');
const router = express.Router();
const { validateExecutePayload } = require('../middleware/validate');
const { executionQueue } = require('../services/queue');

router.post('/', validateExecutePayload, async (req, res) => {
  const { user_id, language, code } = req.body;
  const io = req.io;

  try {
    const job = await executionQueue.add('execute', { user_id, language, code });
    io.to(user_id).emit('status', { job_id: job.id, status: 'queued' });
    return res.status(200).json({ job_id: job.id, status: 'queued' });
  } catch (err) {
    console.error('Failed to enqueue job:', err.message);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

module.exports = router;
```

- [ ] **Step 4: Update app.js with full BullMQ Worker registration**

Replace `task2-code-guru/src/app.js`:

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const { Worker } = require('bullmq');
const { runJob } = require('./workers/jobHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(helmet());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
});

app.use('/execute', require('./routes/execute'));

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const worker = new Worker('executions', (job) => runJob(job, io), {
  connection: redisConnection,
  concurrency: 5
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = { app, server, io };
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: PASS — all test suites passing

- [ ] **Step 6: Smoke test with running server**

Requires: Docker daemon running, Redis on localhost:6379

```bash
# Pull Docker images (one-time, ~30s each)
docker pull node:alpine
docker pull python:alpine

# Start Redis
docker run -d --name redis-test -p 6379:6379 redis:alpine

# Start server
node src/app.js &
sleep 2

# Send a JavaScript execution request
curl -s -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-123","language":"javascript","code":"console.log(\"Hello World\")"}'
```

Expected response: `{"job_id":"<uuid>","status":"queued"}`

WebSocket events visible via socket.io-client or `wscat`:
```
{ job_id: '...', status: 'queued' }
{ job_id: '...', status: 'running' }
{ job_id: '...', status: 'success', output: 'Hello World\n', execution_time_ms: 420 }
```

```bash
# Cleanup
kill %1
docker stop redis-test && docker rm redis-test
```

- [ ] **Step 7: Commit**

```bash
git add task2-code-guru/src/app.js \
        task2-code-guru/src/routes/execute.js \
        task2-code-guru/tests/routes/execute.test.js
git commit -m "feat(task2): implement execute route and full app integration"
```

---

## Task 8: DESIGN.md

**Files:**
- Create: `task2-code-guru/DESIGN.md`

- [ ] **Step 1: Write DESIGN.md**

Create `task2-code-guru/DESIGN.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add task2-code-guru/DESIGN.md
git commit -m "docs(task2): add code execution engine system design"
```

---

## Task 9: README.md

**Files:**
- Create: `task2-code-guru/README.md`

- [ ] **Step 1: Write README.md**

Create `task2-code-guru/README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add task2-code-guru/README.md
git commit -m "docs(task2): add README with setup, API docs, and design notes"
```

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| POST /execute endpoint | Task 7 |
| user_id, language, code validation | Task 2 |
| Docker isolation (`--rm --network none --memory --cpus`) | Task 4 |
| Job queue (BullMQ + Redis) | Task 3 |
| Concurrency handling (concurrency: 5) | Task 7 |
| 5-second execution timeout | Task 4 |
| JavaScript support (node:alpine) | Task 4 |
| Python support (python:alpine) | Task 4 |
| Structured response `{ status, output, execution_time_ms }` | Task 6 |
| WebSocket real-time updates | Task 7 |
| `queued → running → completed/failed` lifecycle | Task 6 |
| Failure isolation (one execution doesn't affect others) | Task 4 |
| DESIGN.md: system architecture | Task 8 |
| DESIGN.md: execution strategy + isolation tradeoffs | Task 8 |
| DESIGN.md: scalability approach | Task 8 |
| DESIGN.md: failure handling | Task 8 |
| DESIGN.md: state/persistence | Task 8 |
| DESIGN.md: low-bandwidth optimization | Task 8 |
| DESIGN.md: operational considerations | Task 8 |
| DESIGN.md: tradeoffs | Task 8 |
| README.md with setup + API docs | Task 9 |

All requirements covered. ✓

### Type/Name Consistency Check

- `runInDocker({ language, code })` — defined Task 4, used Task 5 ✓
- `runExecution({ language, code })` — defined Task 5, used Task 6 ✓
- `runJob(job, io)` — defined Task 6, registered in Task 7 (app.js) ✓
- `executionQueue.add('execute', { user_id, language, code })` — queue Task 3, route Task 7 ✓
- `{ output, execution_time_ms, timedOut, exitCode }` — docker.js Task 4, jobHandler.js Task 6 ✓
- `io.to(user_id).emit('status', { job_id, status, ... })` — consistent Tasks 6, 7 ✓
- Status values: `'queued' | 'running' | 'success' | 'error' | 'timeout'` — consistent Tasks 6, 7, 8 ✓
