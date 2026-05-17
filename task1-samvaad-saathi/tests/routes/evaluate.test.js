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
