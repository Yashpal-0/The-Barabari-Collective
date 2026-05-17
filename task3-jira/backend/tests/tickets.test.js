jest.mock('../src/db', () => ({
  pool: { query: jest.fn() }
}));

const request = require('supertest');
const { app } = require('../src/app');
const { pool } = require('../src/db');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/tickets', () => {
  it('returns all tickets', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Fix bug', status: 'todo' }] });
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, title: 'Fix bug', status: 'todo' }]);
  });

  it('filters by status', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets?status=done');
    expect(res.status).toBe(200);
    const call = pool.query.mock.calls[0];
    expect(call[0]).toContain('status');
    expect(call[1]).toContain('done');
  });

  it('filters by priority', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets?priority=high');
    expect(res.status).toBe(200);
    const call = pool.query.mock.calls[0];
    expect(call[1]).toContain('high');
  });
});

describe('POST /api/tickets', () => {
  it('creates ticket and returns 201', async () => {
    const ticket = { id: 1, title: 'New task', status: 'backlog', priority: 'medium' };
    pool.query.mockResolvedValueOnce({ rows: [ticket] });
    const res = await request(app).post('/api/tickets').send({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
  });

  it('returns 400 when title missing', async () => {
    const res = await request(app).post('/api/tickets').send({ priority: 'high' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tickets/:id', () => {
  it('returns ticket with children and comments', async () => {
    const ticket = { id: 1, title: 'Parent', status: 'todo' };
    const children = [{ id: 2, title: 'Child', parent_id: 1 }];
    const comments = [{ id: 1, ticket_id: 1, author: 'Alice', body: 'Hello' }];
    pool.query
      .mockResolvedValueOnce({ rows: [ticket] })
      .mockResolvedValueOnce({ rows: children })
      .mockResolvedValueOnce({ rows: comments });
    const res = await request(app).get('/api/tickets/1');
    expect(res.status).toBe(200);
    expect(res.body.ticket).toEqual(ticket);
    expect(res.body.children).toEqual(children);
    expect(res.body.comments).toEqual(comments);
  });

  it('returns 404 when ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets/999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tickets/:id', () => {
  it('updates ticket fields', async () => {
    const updated = { id: 1, title: 'Updated', priority: 'high' };
    pool.query.mockResolvedValueOnce({ rows: [updated] });
    const res = await request(app).patch('/api/tickets/1').send({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  it('returns 400 with empty body', async () => {
    const res = await request(app).patch('/api/tickets/1').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/tickets/999').send({ priority: 'low' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tickets/:id/move', () => {
  it('moves ticket to new status and position', async () => {
    const moved = { id: 1, status: 'done', position: 0 };
    pool.query.mockResolvedValueOnce({ rows: [moved] });
    const res = await request(app)
      .patch('/api/tickets/1/move')
      .send({ status: 'done', position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('returns 400 when status missing', async () => {
    const res = await request(app).patch('/api/tickets/1/move').send({ position: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/tickets/999/move')
      .send({ status: 'todo', position: 1 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tickets/:id', () => {
  it('deletes ticket and returns 204', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).delete('/api/tickets/1');
    expect(res.status).toBe(204);
  });

  it('returns 404 when ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/tickets/999');
    expect(res.status).toBe(404);
  });
});
