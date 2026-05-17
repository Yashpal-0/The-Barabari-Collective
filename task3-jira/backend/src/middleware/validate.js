const Joi = require('joi');

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const createTicketSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').default(''),
  status: Joi.string().valid(...STATUSES).default('backlog'),
  priority: Joi.string().valid(...PRIORITIES).default('medium'),
  assignee: Joi.string().allow('').default(''),
  team_tag: Joi.string().allow('').default(''),
  parent_id: Joi.number().integer().positive().allow(null).default(null)
});

const updateTicketSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string().allow(''),
  priority: Joi.string().valid(...PRIORITIES),
  assignee: Joi.string().allow(''),
  team_tag: Joi.string().allow(''),
  parent_id: Joi.number().integer().positive().allow(null)
}).min(1);

const moveTicketSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required(),
  position: Joi.number().integer().min(0).required()
});

const createCommentSchema = Joi.object({
  author: Joi.string().required(),
  body: Joi.string().required()
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    req.body = value;
    next();
  };
}

module.exports = {
  validateCreate: validate(createTicketSchema),
  validateUpdate: validate(updateTicketSchema),
  validateMove: validate(moveTicketSchema),
  validateComment: validate(createCommentSchema)
};
