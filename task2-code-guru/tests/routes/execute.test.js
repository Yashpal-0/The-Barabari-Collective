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
