jest.mock('../src/db', () => ({
  pool: { query: jest.fn() }
}));

const request = require('supertest');
const { app } = require('../src/app');
const { pool } = require('../src/db');

beforeEach(() => jest.clearAllMocks());

describe('POST /api/tickets/:id/comments', () => {
  it('creates comment and returns 201', async () => {
    const comment = { id: 1, ticket_id: 1, author: 'Alice', body: 'Looks good' };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [comment] });
    const res = await request(app)
      .post('/api/tickets/1/comments')
      .send({ author: 'Alice', body: 'Looks good' });
    expect(res.status).toBe(201);
    expect(res.body.author).toBe('Alice');
    expect(res.body.body).toBe('Looks good');
  });

  it('returns 400 when author missing', async () => {
    const res = await request(app)
      .post('/api/tickets/1/comments')
      .send({ body: 'No author' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body missing', async () => {
    const res = await request(app)
      .post('/api/tickets/1/comments')
      .send({ author: 'Alice' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when ticket not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/tickets/999/comments')
      .send({ author: 'Alice', body: 'Hello' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tickets/:id/comments', () => {
  it('returns comments ordered by created_at', async () => {
    const comments = [
      { id: 1, ticket_id: 1, author: 'Alice', body: 'First' },
      { id: 2, ticket_id: 1, author: 'Bob', body: 'Second' }
    ];
    pool.query.mockResolvedValueOnce({ rows: comments });
    const res = await request(app).get('/api/tickets/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].author).toBe('Alice');
  });

  it('returns empty array when no comments', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tickets/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
