const Joi = require('joi');

const executeSchema = Joi.object({
  user_id: Joi.string().required(),
  language: Joi.string().valid('javascript', 'python').required(),
  code: Joi.string().max(50000).required()
});

function validateExecutePayload(req, res, next) {
  const { error } = executeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateExecutePayload };
