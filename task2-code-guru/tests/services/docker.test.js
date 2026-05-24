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

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.timedOut).toBe(true);
    expect(result.output).toBe('');

    jest.useRealTimers();
  });
});
