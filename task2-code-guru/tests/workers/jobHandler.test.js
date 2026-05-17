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
