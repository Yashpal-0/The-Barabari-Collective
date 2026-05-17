const { runExecution } = require('../services/executor');

async function runJob(job, io) {
  const { user_id, language, code } = job.data;
  const job_id = job.id;

  io.to(user_id).emit('status', { job_id, status: 'running' });

  const start = Date.now();
  const result = await runExecution({ language, code });
  const execution_time_ms = Date.now() - start;

  const status = result.timedOut ? 'timeout' : result.exitCode === 0 ? 'success' : 'error';

  io.to(user_id).emit('status', {
    job_id,
    status,
    output: result.output.slice(0, 10240),
    execution_time_ms
  });
}

module.exports = { runJob };
