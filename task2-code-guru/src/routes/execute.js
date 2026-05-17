const express = require('express');
const router = express.Router();
const { validateExecutePayload } = require('../middleware/validate');
const { executionQueue } = require('../services/queue');

router.post('/', validateExecutePayload, async (req, res) => {
  const { user_id, language, code } = req.body;
  const io = req.io;

  try {
    const job = await executionQueue.add('execute', { user_id, language, code });
    io.to(user_id).emit('status', { job_id: job.id, status: 'queued' });
    return res.status(200).json({ job_id: job.id, status: 'queued' });
  } catch (err) {
    console.error('Failed to enqueue job:', err.message);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

module.exports = router;
