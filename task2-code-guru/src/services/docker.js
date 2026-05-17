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
