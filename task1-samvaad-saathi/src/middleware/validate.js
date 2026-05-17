const Joi = require('joi');

const evaluateSchema = Joi.object({
  interview_id: Joi.string().required(),
  user_id: Joi.string().required(),
  role_config: Joi.object({
    role: Joi.string().required(),
    thresholds: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(10)).min(1).required()
  }).required(),
  transcript: Joi.string().required(),
  audio_metadata: Joi.object({
    duration_seconds: Joi.number().min(0).required(),
    filler_word_count: Joi.number().min(0).required()
  }).required()
});

function validateEvaluatePayload(req, res, next) {
  const { error } = evaluateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateEvaluatePayload };
