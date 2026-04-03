const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});


const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Too many generation requests, please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = rateLimiter;
module.exports.authRateLimiter = authRateLimiter;
module.exports.generationRateLimiter = generationRateLimiter;
