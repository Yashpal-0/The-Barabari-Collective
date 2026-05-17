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
