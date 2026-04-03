const Joi = require('joi');

const googleAuthSchema = Joi.object({
  credential: Joi.string().required()
});

const createProjectSchema = Joi.object({
  prompt: Joi.string().trim().max(1000).optional().default('')
});

const createVersionSchema = Joi.object({
  prompt: Joi.string().trim().max(1000).optional().default(''),
  beforeVersionId: Joi.string().hex().length(24).optional()
});

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false });

    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req[source] = value;
    next();
  };
};

module.exports = {
  googleAuthSchema,
  createProjectSchema,
  createVersionSchema,
  validate
};
