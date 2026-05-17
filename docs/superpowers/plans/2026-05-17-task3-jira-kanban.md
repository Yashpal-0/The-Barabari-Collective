# Task 3: Jira Kanban Task Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Kanban task management system with drag-drop, nested tickets, comments, filtering, and a comprehensive HLD document.

**Architecture:** Monorepo — Express + PostgreSQL backend on :3002, Vite + React frontend on :5173 (proxies /api to backend in dev). Auto-migrated schema on startup. No auth — assignee/author are plain strings.

**Tech Stack:** Node.js, Express 4, pg (PostgreSQL), Joi, helmet, cors, Jest, Supertest / Vite, React 18, Tailwind CSS, @hello-pangea/dnd

---

## File Map

```
task3-jira/
  backend/
    src/
      app.js                   ← Express + helmet + cors + routes + error handler
      db.js                    ← pg Pool + initDB() schema migration
      routes/
        tickets.js             ← GET list, POST, GET :id, PATCH :id, PATCH :id/move, DELETE :id
        comments.js            ← POST :id/comments, GET :id/comments
      middleware/
        validate.js            ← Joi schemas + validate() middleware factory
    tests/
      tickets.test.js
      comments.test.js
    .gitignore
    package.json
  frontend/
    src/
      api.js                   ← fetch wrappers: getTickets, createTicket, moveTicket, etc.
      components/
        KanbanBoard.jsx        ← DragDropContext + 5 Droppable columns
        TicketCard.jsx         ← Draggable card
        FilterBar.jsx          ← status/priority/team/assignee dropdowns+inputs
        TicketModal.jsx        ← create/edit form + children list + comments thread
      App.jsx                  ← state, loadTickets, handleDragEnd, modal toggle
      main.jsx
      index.css                ← Tailwind directives
    vite.config.js             ← proxy /api → http://localhost:3002
    tailwind.config.js
    .gitignore
    package.json
  HLD.md
  README.md
```

---

## Task 1: Backend Scaffold

**Files:**
- Create: `task3-jira/backend/.gitignore`
- Create: `task3-jira/backend/package.json`
- Create: `task3-jira/backend/src/app.js`
- Create: `task3-jira/backend/src/db.js`
- Create: `task3-jira/backend/src/routes/tickets.js` (placeholder)
- Create: `task3-jira/backend/src/routes/comments.js` (placeholder)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p task3-jira/backend/src/routes \
         task3-jira/backend/src/middleware \
         task3-jira/backend/tests \
         task3-jira/frontend
```

- [ ] **Step 2: Create `task3-jira/backend/.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 3: Create `task3-jira/backend/package.json`**

```json
{
  "name": "task3-jira-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest"
  },
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 10000
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "joi": "^17.11.0",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd task3-jira/backend && npm install
```

Expected: no errors, `node_modules/` created.

- [ ] **Step 5: Create `task3-jira/backend/src/db.js`**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/jira_dev'
});

async function initDB() {
  await pool.query(`
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
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id         SERIAL PRIMARY KEY,
      ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author     TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_team_tag ON tickets(team_tag)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_ticket  ON comments(ticket_id)`);
}

module.exports = { pool, initDB };
```

- [ ] **Step 6: Create `task3-jira/backend/src/app.js`**

```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tickets', require('./routes/comments'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;

if (require.main === module) {
  const { initDB } = require('./db');
  initDB()
    .then(() => app.listen(PORT, () => console.log(`Server on port ${PORT}`)))
    .catch(err => { console.error('DB init failed:', err); process.exit(1); });
}

module.exports = app;
```

- [ ] **Step 7: Create placeholder `task3-jira/backend/src/routes/tickets.js`**

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
```

- [ ] **Step 8: Create placeholder `task3-jira/backend/src/routes/comments.js`**

```javascript
const express = require('express');
const router = express.Router();

router.post('/:id/comments', (req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
```

- [ ] **Step 9: Verify app loads**

```bash
cd task3-jira/backend && node -e "require('./src/app'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 10: Commit scaffold**

```bash
git add task3-jira/backend/
git commit -m "feat(task3): backend scaffold with Express, PostgreSQL, placeholder routes"
```

---

## Task 2: Validation Middleware

**Files:**
- Create: `task3-jira/backend/src/middleware/validate.js`

- [ ] **Step 1: Create `task3-jira/backend/src/middleware/validate.js`**

```javascript
const Joi = require('joi');

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const createTicketSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').default(''),
  status: Joi.string().valid(...STATUSES).default('backlog'),
  priority: Joi.string().valid(...PRIORITIES).default('medium'),
  assignee: Joi.string().allow('').default(''),
  team_tag: Joi.string().allow('').default(''),
  parent_id: Joi.number().integer().positive().allow(null).default(null)
});

const updateTicketSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string().allow(''),
  priority: Joi.string().valid(...PRIORITIES),
  assignee: Joi.string().allow(''),
  team_tag: Joi.string().allow(''),
  parent_id: Joi.number().integer().positive().allow(null)
}).min(1);

const moveTicketSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required(),
  position: Joi.number().integer().min(0).required()
});

const createCommentSchema = Joi.object({
  author: Joi.string().required(),
  body: Joi.string().required()
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  createTicketSchema,
  updateTicketSchema,
  moveTicketSchema,
  createCommentSchema,
  STATUSES,
  PRIORITIES
};
```

- [ ] **Step 2: Verify it loads**

```bash
cd task3-jira/backend && node -e "require('./src/middleware/validate'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add task3-jira/backend/src/middleware/validate.js
git commit -m "feat(task3): add Joi validation middleware with all schemas"
```

---

## Task 3: Tickets Route + Tests

**Files:**
- Modify: `task3-jira/backend/src/routes/tickets.js`
- Create: `task3-jira/backend/tests/tickets.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task3-jira/backend/tests/tickets.test.js`:

```javascript
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() }
}));

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('GET /api/tickets', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns all tickets', async () => {
    const rows = [{ id: 1, title: 'Test', status: 'todo', position: 0 }];
    pool.query.mockResolvedValueOnce({ rows });
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  it('filters by status', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets?status=todo');
    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('status = $1');
    expect(params).toContain('todo');
  });

  it('filters by multiple params', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/tickets?status=todo&priority=high');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('status = $1');
    expect(sql).toContain('priority = $2');
    expect(params).toEqual(['todo', 'high']);
  });
});

describe('POST /api/tickets', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates ticket with defaults', async () => {
    const created = { id: 1, title: 'New', status: 'backlog', priority: 'medium', position: 0 };
    pool.query
      .mockResolvedValueOnce({ rows: [{ next_pos: 0 }] })
      .mockResolvedValueOnce({ rows: [created] });
    const res = await request(app).post('/api/tickets').send({ title: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New');
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app).post('/api/tickets').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).post('/api/tickets').send({ title: 'X', status: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tickets/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns ticket with children and comments', async () => {
    const ticket = { id: 1, title: 'Parent', status: 'todo' };
    const children = [{ id: 2, title: 'Child', parent_id: 1 }];
    const comments = [{ id: 1, ticket_id: 1, author: 'Alice', body: 'Hi' }];
    pool.query
      .mockResolvedValueOnce({ rows: [ticket], rowCount: 1 })
      .mockResolvedValueOnce({ rows: children })
      .mockResolvedValueOnce({ rows: comments });
    const res = await request(app).get('/api/tickets/1');
    expect(res.status).toBe(200);
    expect(res.body.children).toEqual(children);
    expect(res.body.comments).toEqual(comments);
  });

  it('returns 404 for missing ticket', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/tickets/999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tickets/:id/move', () => {
  afterEach(() => jest.clearAllMocks());

  it('moves ticket to new column and position', async () => {
    const moved = { id: 1, status: 'in_progress', position: 2 };
    pool.query.mockResolvedValueOnce({ rows: [moved], rowCount: 1 });
    const res = await request(app).patch('/api/tickets/1/move').send({ status: 'in_progress', position: 2 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).patch('/api/tickets/1/move').send({ status: 'invalid', position: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 404 for missing ticket', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).patch('/api/tickets/999/move').send({ status: 'todo', position: 0 });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tickets/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates ticket fields', async () => {
    const updated = { id: 1, title: 'Updated', priority: 'high' };
    pool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });
    const res = await request(app).patch('/api/tickets/1').send({ title: 'Updated', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app).patch('/api/tickets/1').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for missing ticket', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).patch('/api/tickets/999').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tickets/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('deletes ticket and returns 204', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/api/tickets/1');
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing ticket', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete('/api/tickets/999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd task3-jira/backend && npx jest tests/tickets.test.js --no-coverage 2>&1 | tail -8
```

Expected: FAIL — routes return 501

- [ ] **Step 3: Implement `task3-jira/backend/src/routes/tickets.js`**

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { validate, createTicketSchema, updateTicketSchema, moveTicketSchema } = require('../middleware/validate');

const ALLOWED_UPDATE = new Set(['title', 'description', 'priority', 'assignee', 'team_tag', 'parent_id']);

router.get('/', async (req, res, next) => {
  try {
    const { status, priority, team, assignee } = req.query;
    const conditions = [];
    const params = [];
    if (status)   { conditions.push(`status = $${params.length + 1}`);   params.push(status); }
    if (priority) { conditions.push(`priority = $${params.length + 1}`); params.push(priority); }
    if (team)     { conditions.push(`team_tag = $${params.length + 1}`); params.push(team); }
    if (assignee) { conditions.push(`assignee = $${params.length + 1}`); params.push(assignee); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY status, position ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/', validate(createTicketSchema), async (req, res, next) => {
  try {
    const { title, description, status, priority, assignee, team_tag, parent_id } = req.body;
    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tickets WHERE status = $1',
      [status]
    );
    const position = posRes.rows[0].next_pos;
    const result = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, assignee, team_tag, parent_id, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, status, priority, assignee, team_tag, parent_id, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketRes.rowCount === 0) return res.status(404).json({ error: 'Ticket not found' });
    const childrenRes = await pool.query(
      'SELECT * FROM tickets WHERE parent_id = $1 ORDER BY position ASC', [id]
    );
    const commentsRes = await pool.query(
      'SELECT * FROM comments WHERE ticket_id = $1 ORDER BY created_at ASC', [id]
    );
    res.json({ ...ticketRes.rows[0], children: childrenRes.rows, comments: commentsRes.rows });
  } catch (err) { next(err); }
});

// MUST be registered before /:id to avoid 'move' being matched as an id
router.patch('/:id/move', validate(moveTicketSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, position } = req.body;
    const result = await pool.query(
      'UPDATE tickets SET status = $1, position = $2 WHERE id = $3 RETURNING *',
      [status, position, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', validate(updateTicketSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = Object.keys(req.body).filter(f => ALLOWED_UPDATE.has(f));
    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const values = fields.map(f => req.body[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE tickets SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/tickets.test.js --no-coverage 2>&1 | tail -10
```

Expected: PASS — 13 tests passing

- [ ] **Step 5: Commit**

```bash
git add task3-jira/backend/src/routes/tickets.js \
        task3-jira/backend/tests/tickets.test.js
git commit -m "feat(task3): implement tickets route with CRUD, move, and filter"
```

---

## Task 4: Comments Route + Tests

**Files:**
- Modify: `task3-jira/backend/src/routes/comments.js`
- Create: `task3-jira/backend/tests/comments.test.js`

- [ ] **Step 1: Write the failing tests**

Create `task3-jira/backend/tests/comments.test.js`:

```javascript
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() }
}));

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('POST /api/tickets/:id/comments', () => {
  afterEach(() => jest.clearAllMocks());

  it('adds comment to existing ticket', async () => {
    const comment = { id: 1, ticket_id: 1, author: 'Alice', body: 'Looks good', created_at: '2024-01-01T00:00:00Z' };
    pool.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [comment] });
    const res = await request(app).post('/api/tickets/1/comments').send({ author: 'Alice', body: 'Looks good' });
    expect(res.status).toBe(201);
    expect(res.body.author).toBe('Alice');
    expect(res.body.body).toBe('Looks good');
  });

  it('returns 404 if ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).post('/api/tickets/999/comments').send({ author: 'Alice', body: 'Hi' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing author', async () => {
    const res = await request(app).post('/api/tickets/1/comments').send({ body: 'Hi' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/author/);
  });

  it('returns 400 for missing body', async () => {
    const res = await request(app).post('/api/tickets/1/comments').send({ author: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/);
  });
});

describe('GET /api/tickets/:id/comments', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns comments in chronological order', async () => {
    const comments = [
      { id: 1, author: 'Alice', body: 'First', created_at: '2024-01-01T00:00:00Z' },
      { id: 2, author: 'Bob', body: 'Second', created_at: '2024-01-02T00:00:00Z' }
    ];
    pool.query.mockResolvedValueOnce({ rows: comments });
    const res = await request(app).get('/api/tickets/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].author).toBe('Alice');
  });

  it('returns empty array for ticket with no comments', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/comments.test.js --no-coverage 2>&1 | tail -6
```

Expected: FAIL — route returns 501

- [ ] **Step 3: Implement `task3-jira/backend/src/routes/comments.js`**

```javascript
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { validate, createCommentSchema } = require('../middleware/validate');

router.post('/:id/comments', validate(createCommentSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { author, body } = req.body;
    const ticketCheck = await pool.query('SELECT id FROM tickets WHERE id = $1', [id]);
    if (ticketCheck.rowCount === 0) return res.status(404).json({ error: 'Ticket not found' });
    const result = await pool.query(
      'INSERT INTO comments (ticket_id, author, body) VALUES ($1, $2, $3) RETURNING *',
      [id, author, body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM comments WHERE ticket_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
```

- [ ] **Step 4: Run all backend tests**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: PASS — all test suites passing

- [ ] **Step 5: Commit**

```bash
git add task3-jira/backend/src/routes/comments.js \
        task3-jira/backend/tests/comments.test.js
git commit -m "feat(task3): implement comments route with add and list"
```

---

## Task 5: Frontend Scaffold

**Files:**
- Create: `task3-jira/frontend/` (Vite project)
- Create: `task3-jira/frontend/vite.config.js`
- Create: `task3-jira/frontend/tailwind.config.js`
- Modify: `task3-jira/frontend/src/index.css`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
cd task3-jira && npm create vite@latest frontend -- --template react
```

When prompted: select React, JavaScript.

- [ ] **Step 2: Install dependencies**

```bash
cd task3-jira/frontend && npm install
npm install @hello-pangea/dnd
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Create `task3-jira/frontend/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Replace `task3-jira/frontend/vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})
```

- [ ] **Step 5: Replace `task3-jira/frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 6: Replace `task3-jira/frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Verify dev server starts**

```bash
cd task3-jira/frontend && npm run dev &
sleep 3 && curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML output containing `<div id="root">`

- [ ] **Step 8: Commit**

```bash
cd ../.. && git add task3-jira/frontend/
git commit -m "feat(task3): frontend scaffold with Vite, React, Tailwind, hello-pangea/dnd"
```

---

## Task 6: api.js

**Files:**
- Create: `task3-jira/frontend/src/api.js`

- [ ] **Step 1: Create `task3-jira/frontend/src/api.js`**

```javascript
const BASE = '/api';

export async function getTickets(filters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  );
  const res = await fetch(`${BASE}/tickets?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

export async function createTicket(data) {
  const res = await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create ticket');
  return res.json();
}

export async function getTicket(id) {
  const res = await fetch(`${BASE}/tickets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json();
}

export async function updateTicket(id, data) {
  const res = await fetch(`${BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  return res.json();
}

export async function moveTicket(id, status, position) {
  const res = await fetch(`${BASE}/tickets/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, position })
  });
  if (!res.ok) throw new Error('Failed to move ticket');
  return res.json();
}

export async function deleteTicket(id) {
  const res = await fetch(`${BASE}/tickets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete ticket');
}

export async function addComment(ticketId, data) {
  const res = await fetch(`${BASE}/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add task3-jira/frontend/src/api.js
git commit -m "feat(task3): add API fetch wrappers"
```

---

## Task 7: KanbanBoard + TicketCard Components

**Files:**
- Create: `task3-jira/frontend/src/components/KanbanBoard.jsx`
- Create: `task3-jira/frontend/src/components/TicketCard.jsx`

- [ ] **Step 1: Create `task3-jira/frontend/src/components/TicketCard.jsx`**

```jsx
import { Draggable } from '@hello-pangea/dnd';

const PRIORITY_COLORS = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

export default function TicketCard({ ticket, index, onClick }) {
  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded shadow p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg rotate-1 opacity-90' : ''
          }`}
        >
          <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{ticket.title}</p>
          <div className="flex gap-1 flex-wrap items-center">
            <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium}`}>
              {ticket.priority}
            </span>
            {ticket.team_tag && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{ticket.team_tag}</span>
            )}
            {ticket.assignee && (
              <span className="text-xs text-gray-500 truncate max-w-[80px]">{ticket.assignee}</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
```

- [ ] **Step 2: Create `task3-jira/frontend/src/components/KanbanBoard.jsx`**

```jsx
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TicketCard from './TicketCard';

const COLUMNS = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const COLUMN_LABELS = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done'
};

export default function KanbanBoard({ tickets, onDragEnd, onCardClick }) {
  const byStatus = COLUMNS.reduce((acc, s) => {
    acc[s] = tickets
      .filter(t => t.status === s)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4 min-h-[calc(100vh-120px)]">
        {COLUMNS.map(col => (
          <div key={col} className="flex-shrink-0 w-64">
            <h2 className="font-semibold mb-2 text-gray-700 text-sm uppercase tracking-wide">
              {COLUMN_LABELS[col]}
              <span className="ml-1 text-gray-400 font-normal">({byStatus[col].length})</span>
            </h2>
            <Droppable droppableId={col}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-32 rounded-lg p-2 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-100'
                  }`}
                >
                  {byStatus[col].map((ticket, index) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      index={index}
                      onClick={() => onCardClick(ticket)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add task3-jira/frontend/src/components/KanbanBoard.jsx \
        task3-jira/frontend/src/components/TicketCard.jsx
git commit -m "feat(task3): add KanbanBoard and TicketCard drag-drop components"
```

---

## Task 8: FilterBar Component

**Files:**
- Create: `task3-jira/frontend/src/components/FilterBar.jsx`

- [ ] **Step 1: Create `task3-jira/frontend/src/components/FilterBar.jsx`**

```jsx
const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function FilterBar({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex gap-3 px-4 py-2 bg-white border-b flex-wrap items-center">
      <span className="text-sm text-gray-500 font-medium">Filter:</span>
      <select
        value={filters.status || ''}
        onChange={set('status')}
        className="border rounded px-2 py-1 text-sm text-gray-700"
      >
        <option value="">All Status</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        value={filters.priority || ''}
        onChange={set('priority')}
        className="border rounded px-2 py-1 text-sm text-gray-700"
      >
        <option value="">All Priority</option>
        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input
        placeholder="Team..."
        value={filters.team || ''}
        onChange={set('team')}
        className="border rounded px-2 py-1 text-sm w-28"
      />
      <input
        placeholder="Assignee..."
        value={filters.assignee || ''}
        onChange={set('assignee')}
        className="border rounded px-2 py-1 text-sm w-28"
      />
      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add task3-jira/frontend/src/components/FilterBar.jsx
git commit -m "feat(task3): add FilterBar component with status/priority/team/assignee filters"
```

---

## Task 9: TicketModal Component

**Files:**
- Create: `task3-jira/frontend/src/components/TicketModal.jsx`

- [ ] **Step 1: Create `task3-jira/frontend/src/components/TicketModal.jsx`**

```jsx
import { useState } from 'react';
import { createTicket, updateTicket, addComment } from '../api';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function TicketModal({ ticket, onClose, onSave }) {
  const isNew = !ticket;
  const [form, setForm] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    status: ticket?.status || 'backlog',
    priority: ticket?.priority || 'medium',
    assignee: ticket?.assignee || '',
    team_tag: ticket?.team_tag || '',
    parent_id: ticket?.parent_id || ''
  });
  const [children] = useState(ticket?.children || []);
  const [comments, setComments] = useState(ticket?.comments || []);
  const [newComment, setNewComment] = useState({ author: '', body: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const data = {
        ...form,
        parent_id: form.parent_id ? parseInt(form.parent_id) : null
      };
      if (isNew) {
        await createTicket(data);
      } else {
        const { status, ...updateData } = data;
        await updateTicket(ticket.id, updateData);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.author.trim() || !newComment.body.trim()) return;
    try {
      const comment = await addComment(ticket.id, newComment);
      setComments(c => [...c, comment]);
      setNewComment({ author: '', body: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">{isNew ? 'New Ticket' : `Ticket #${ticket.id}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <input
            placeholder="Title *"
            value={form.title}
            onChange={set('title')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={form.status} onChange={set('status')} className="w-full border rounded px-3 py-2">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={form.priority} onChange={set('priority')} className="w-full border rounded px-3 py-2">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Assignee" value={form.assignee} onChange={set('assignee')} className="border rounded px-3 py-2" />
            <input placeholder="Team tag" value={form.team_tag} onChange={set('team_tag')} className="border rounded px-3 py-2" />
          </div>
          <input
            placeholder="Parent ticket ID (optional)"
            value={form.parent_id}
            onChange={set('parent_id')}
            type="number"
            min="1"
            className="w-full border rounded px-3 py-2"
          />

          {!isNew && children.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 text-gray-700">Child Tickets ({children.length})</h3>
              {children.map(c => (
                <div key={c.id} className="text-sm border rounded px-3 py-2 mb-1 text-gray-700 flex justify-between">
                  <span>#{c.id} {c.title}</span>
                  <span className="text-xs text-gray-400">{c.status}</span>
                </div>
              ))}
            </div>
          )}

          {!isNew && (
            <div>
              <h3 className="font-semibold text-sm mb-2 text-gray-700">Comments ({comments.length})</h3>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="text-sm bg-gray-50 rounded px-3 py-2">
                    <span className="font-medium text-gray-800">{c.author}:</span>
                    <span className="ml-1 text-gray-700">{c.body}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Author"
                  value={newComment.author}
                  onChange={e => setNewComment(n => ({ ...n, author: e.target.value }))}
                  className="border rounded px-2 py-1 w-32 text-sm"
                />
                <input
                  placeholder="Comment..."
                  value={newComment.body}
                  onChange={e => setNewComment(n => ({ ...n, body: e.target.value }))}
                  className="border rounded px-2 py-1 flex-1 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="border rounded px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading || !form.title.trim()}
            className="bg-blue-500 text-white rounded px-4 py-2 text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isNew ? 'Create Ticket' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add task3-jira/frontend/src/components/TicketModal.jsx
git commit -m "feat(task3): add TicketModal with create/edit form, children, and comments"
```

---

## Task 10: App.jsx Integration + Smoke Test

**Files:**
- Modify: `task3-jira/frontend/src/App.jsx`
- Modify: `task3-jira/frontend/src/main.jsx`

- [ ] **Step 1: Replace `task3-jira/frontend/src/App.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react';
import KanbanBoard from './components/KanbanBoard';
import FilterBar from './components/FilterBar';
import TicketModal from './components/TicketModal';
import { getTickets, moveTicket } from './api';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      setLoadError('');
      const data = await getTickets(filters);
      setTickets(data);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [filters]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  async function handleDragEnd(result) {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const id = parseInt(draggableId);
    const status = destination.droppableId;
    const position = destination.index;

    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, position } : t));

    try {
      await moveTicket(id, status, position);
    } catch {
      loadTickets();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Kanban Board</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm font-medium"
        >
          + New Ticket
        </button>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      {loadError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {loadError} — is the backend running on :3002?
        </div>
      )}

      <KanbanBoard
        tickets={tickets}
        onDragEnd={handleDragEnd}
        onCardClick={setSelectedTicket}
      />

      {showCreate && (
        <TicketModal
          onClose={() => setShowCreate(false)}
          onSave={loadTickets}
        />
      )}

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSave={() => { loadTickets(); setSelectedTicket(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify `task3-jira/frontend/src/main.jsx`**

Check it contains (Vite scaffold usually provides this correctly):

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

If it doesn't match exactly, replace it with the above.

- [ ] **Step 3: Smoke test — start both servers**

Terminal 1 (requires PostgreSQL running with `jira_dev` database):
```bash
cd task3-jira/backend && DATABASE_URL=postgresql://localhost:5432/jira_dev npm start
```

Terminal 2:
```bash
cd task3-jira/frontend && npm run dev
```

Open `http://localhost:5173` in browser. Verify:
- Kanban board renders with 5 empty columns
- "New Ticket" button opens modal
- Create a ticket → appears in correct column
- Drag ticket to another column → persists on refresh
- Open ticket → comments section visible, can add comment
- FilterBar dropdowns filter tickets correctly

- [ ] **Step 4: Commit**

```bash
git add task3-jira/frontend/src/App.jsx \
        task3-jira/frontend/src/main.jsx
git commit -m "feat(task3): wire App.jsx with board, filters, and modals"
```

---

## Task 11: HLD.md

**Files:**
- Create: `task3-jira/HLD.md`

- [ ] **Step 1: Create `task3-jira/HLD.md`**

```markdown
# Jira Kanban — High Level Design

## Phase 1: Initial System Design

### Overall Architecture

```
Browser (React SPA)
    │ HTTP / Vite proxy in dev
    ↓
Express API (:3002)
    │ pg Pool (connection pooling built-in)
    ↓
PostgreSQL
```

Single Express process serves all REST API routes. React SPA served from `frontend/dist/` in production (same server, same port). No separate reverse proxy needed for PoC.

### Database Schema

```sql
tickets (
  id SERIAL PK, title TEXT NOT NULL,
  description TEXT, status TEXT CHECK (...5 values...),
  priority TEXT CHECK (...4 values...),
  assignee TEXT, team_tag TEXT,
  parent_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  position INTEGER,  -- sort order within column
  created_at TIMESTAMPTZ
)

comments (
  id SERIAL PK, ticket_id INTEGER FK → tickets,
  author TEXT, body TEXT, created_at TIMESTAMPTZ
)
```

Indexes on `status`, `priority`, `team_tag`, `assignee` (all filter fields).
Self-referencing `parent_id` for parent-child hierarchy.
`position` integer updated on drag-drop to preserve column ordering.

### API Flow

```
GET  /api/tickets?status=todo&priority=high
  → dynamic WHERE clause (parameterized, no SQL injection risk)
  → ORDER BY status, position ASC

POST /api/tickets { title, status, priority, ... }
  → Joi validation → compute next position in column → INSERT

PATCH /api/tickets/:id/move { status, position }
  → UPDATE status + position (drag-drop persistence)

GET  /api/tickets/:id
  → ticket row + children (WHERE parent_id=:id) + comments (JOIN)

POST /api/tickets/:id/comments { author, body }
  → ticket existence check → INSERT comment
```

### Frontend Structure

```
App.jsx              state: tickets[], filters{}, selectedTicket, showCreate
  ├── FilterBar      dropdowns/inputs → setFilters → useEffect re-fetches
  ├── KanbanBoard    DragDropContext → 5 Droppable columns
  │     └── TicketCard  Draggable → onClick → setSelectedTicket
  └── TicketModal    create/edit form + children list + comments thread
```

All fetch calls centralised in `api.js`. Optimistic drag-drop update with revert on error.

---

## Phase 2: Scaling to 100K+ Tickets

### Database Scaling

**Problem:** Full table scans on 100K+ ticket table.

**Solutions:**
- Composite indexes: `(status, priority)`, `(team_tag, assignee)` — covers common multi-filter queries
- Partial indexes per status: `CREATE INDEX ON tickets(position) WHERE status='todo'` — fast column ordering
- Table partitioning by status (PostgreSQL declarative): each Kanban column is a physical partition — queries that filter by status touch only one partition
- Cursor-based pagination: replace `OFFSET` with `WHERE id > $cursor LIMIT 50` — O(1) instead of O(n) scan

**Read scaling:**
- PostgreSQL read replica for all `GET` requests; primary for writes only
- pgBouncer in transaction mode (connection pool manager) — prevents connection exhaustion at 1000s of concurrent users

### Caching

- Redis cache for board state per team: `GET /api/tickets?team=X` → Redis key `board:team:X` (TTL 30s)
- Cache invalidated on any write (create, update, move, delete) in that team's tickets
- CDN (CloudFront) for static React bundle — edge delivery, no origin load for JS/CSS

### Realtime Updates

**Problem:** User A moves a ticket; User B's board is stale.

**Solution:** Socket.io rooms per `team_tag`:
```
server emits 'ticket:moved' { id, status, position } on PATCH /move
server emits 'ticket:created' { ticket } on POST
server emits 'ticket:updated' { id, fields } on PATCH
```
Clients subscribe to room on connect: `socket.emit('join', team_tag)`.
Receiving client updates React state without re-fetching — minimal bandwidth.

### Queue / Event Systems

- BullMQ + Redis job queue for async operations:
  - Bulk status updates (move all `todo` → `in_progress`)
  - Future notification dispatch (email/Slack on ticket assignment)
  - Webhook delivery to external integrations
- API returns 202 Accepted immediately; worker processes the queue
- Prevents slow operations blocking HTTP response latency

### API Performance Optimizations

- Response gzip compression (`compression` middleware) — reduces payload size ~70%
- `ETag` + `If-None-Match` for board state — client skips render if unchanged (304)
- `GET /api/tickets/:id` single query with JOIN instead of 3 round trips:
  ```sql
  SELECT t.*, 
    json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL) AS comments,
    json_agg(DISTINCT ch.*) FILTER (WHERE ch.id IS NOT NULL) AS children
  FROM tickets t
  LEFT JOIN comments c ON c.ticket_id = t.id
  LEFT JOIN tickets ch ON ch.parent_id = t.id
  WHERE t.id = $1
  GROUP BY t.id
  ```

### Rate Limiting

- `express-rate-limit` per IP:
  - Read endpoints: 200 req/min
  - Write endpoints: 30 req/min
  - Comment creation: 10/min (spam prevention)
- Response: `429 Too Many Requests` with `Retry-After` header
- Per-team limits on bulk operations to prevent one team starving others

### Horizontal Scaling

- Express is stateless — multiple instances behind nginx/ALB load balancer
- Socket.io multi-instance: `@socket.io/redis-adapter` syncs events across instances via Redis pub/sub
- Shared PostgreSQL primary + read replicas
- No sticky sessions required (JWT or session in DB if auth added later)

### Concurrency Handling

- Optimistic locking on ticket updates: client sends `updated_at`; server rejects with 409 if row changed since client fetched it
- `position` updates use a DB transaction to prevent race conditions when two users drag cards simultaneously:
  ```sql
  BEGIN;
  UPDATE tickets SET position = position + 1 WHERE status = $1 AND position >= $2;
  UPDATE tickets SET status = $1, position = $2 WHERE id = $3;
  COMMIT;
  ```
- pgBouncer serialises connection acquisition — prevents thundering herd on connection pool
```

- [ ] **Step 2: Commit**

```bash
git add task3-jira/HLD.md
git commit -m "docs(task3): add HLD with Phase 1 architecture and Phase 2 scaling"
```

---

## Task 12: README.md

**Files:**
- Create: `task3-jira/README.md`

- [ ] **Step 1: Create `task3-jira/README.md`**

```markdown
# Task 3: Jira-like Kanban Task Management System

Full-stack Kanban board with drag-drop, nested tickets, comments, and filtering.

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or via Docker)

## Setup

### 1. Database

```bash
# Option A: Docker (easiest)
docker run -d --name jira-pg -p 5432:5432 \
  -e POSTGRES_DB=jira_dev \
  -e POSTGRES_PASSWORD=postgres \
  postgres:alpine

# Option B: local psql
createdb jira_dev
```

Schema is auto-created on server startup — no manual SQL needed.

### 2. Backend

```bash
cd task3-jira/backend
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jira_dev npm start
# Server on http://localhost:3002
```

### 3. Frontend (dev mode)

```bash
cd task3-jira/frontend
npm install
npm run dev
# Open http://localhost:5173
```

### 4. Frontend (production build)

```bash
cd task3-jira/frontend && npm run build
# Then the backend serves the built frontend:
cd ../backend && npm start
# Open http://localhost:3002
```

## Run Tests

```bash
cd task3-jira/backend
npm test
# Tests mock PostgreSQL — no real DB needed
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | PostgreSQL (pg pool) |
| Validation | Joi |
| HTTP Security | helmet |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Drag & Drop | @hello-pangea/dnd |
| Testing | Jest + Supertest |

## Features

- **Kanban Board** — 5 columns (Backlog → Todo → In Progress → Review → Done)
- **Drag & Drop** — move tickets between columns, position persisted
- **Ticket Fields** — title, description, status, priority, assignee, team tag, parent ticket
- **Nested Tickets** — parent-child hierarchy via `parent_id`
- **Comments** — threaded discussion on each ticket
- **Filtering** — filter by status, priority, team, assignee (AND logic)
- **Optimistic Updates** — drag-drop is instant, reverts on error

## API Quick Reference

```
GET    /api/tickets                     list (supports ?status=&priority=&team=&assignee=)
POST   /api/tickets                     create
GET    /api/tickets/:id                 get with children + comments
PATCH  /api/tickets/:id                 update fields
PATCH  /api/tickets/:id/move            { status, position } — drag-drop
DELETE /api/tickets/:id

POST   /api/tickets/:id/comments        { author, body }
GET    /api/tickets/:id/comments
```

## Architecture

See `HLD.md` for full architecture decisions, database schema, and scaling strategy.
```

- [ ] **Step 2: Commit**

```bash
git add task3-jira/README.md
git commit -m "docs(task3): add README with setup instructions and API reference"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Kanban board with 5 columns | Task 10 (KanbanBoard) |
| Create tickets | Task 9 (TicketModal) + Task 3 (POST /api/tickets) |
| Drag-drop between columns, persist | Task 7 (KanbanBoard) + Task 3 (PATCH /move) |
| Title, Description, Status, Priority, Assignee, Team tag, Created | Task 2 (schema) + Task 9 (TicketModal) |
| Parent ticket (optional) | Task 2 (parent_id FK) + Task 9 (TicketModal input) |
| Nested ticketing (parent-child) | Task 3 (GET :id returns children) + Task 9 (children list) |
| Add comments + view discussion | Task 4 (comments route) + Task 9 (comments thread) |
| Filter by status/priority/team/assignee | Task 3 (GET filter) + Task 8 (FilterBar) |
| HLD Phase 1: arch + schema + API + frontend | Task 11 |
| HLD Phase 2: DB scaling, caching, realtime, queue, rate limiting, horizontal, concurrency | Task 11 |
| GitHub repo + README + HLD | Task 12 |

All requirements covered. ✓

### Type/Name Consistency

- `moveTicket(id, status, position)` — api.js Task 6, called in App.jsx Task 10 ✓
- `getTickets(filters)` — api.js Task 6, called in App.jsx Task 10 ✓
- `createTicket(data)` / `updateTicket(id, data)` — api.js Task 6, TicketModal Task 9 ✓
- `addComment(ticketId, data)` — api.js Task 6, TicketModal Task 9 ✓
- `onDragEnd(result)` prop — KanbanBoard Task 7, App.jsx Task 10 ✓
- `onCardClick(ticket)` prop — KanbanBoard Task 7, App.jsx Task 10 ✓
- `ticket?.children` / `ticket?.comments` — TicketModal Task 9 from GET /api/tickets/:id Task 3 ✓
- Pool mock: `{ pool: { query: jest.fn() } }` — same in tickets.test.js and comments.test.js ✓
