const express = require('express');
const router = express.Router();
const { validateEvaluatePayload } = require('../middleware/validate');
const breaker = require('../services/circuitBreaker');
const { getRemediationModules } = require('../services/remediation');

router.post('/', validateEvaluatePayload, async (req, res) => {
  const { interview_id, user_id, role_config, transcript, audio_metadata } = req.body;

  try {
    const result = await breaker.fire({ transcript, audio_metadata });

    if (result.status === 'pending') {
      return res.status(200).json({
        interview_id,
        user_id,
        status: 'pending',
        scores: null,
        flagged_modules: [],
        evaluated_at: new Date().toISOString()
      });
    }

    const flagged_modules = getRemediationModules(result, role_config.thresholds);

    return res.status(200).json({
      interview_id,
      user_id,
      status: 'evaluated',
      scores: result,
      flagged_modules,
      evaluated_at: new Date().toISOString()
    });
  } catch {
    return res.status(200).json({
      interview_id,
      user_id,
      status: 'pending',
      scores: null,
      flagged_modules: [],
      evaluated_at: new Date().toISOString()
    });
  }
});

module.exports = router;
