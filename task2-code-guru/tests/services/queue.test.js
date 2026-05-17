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
