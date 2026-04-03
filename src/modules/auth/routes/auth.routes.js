const express = require('express');
const { googleAuth, getCurrentUser, logout } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../../../shared/middleware/rate-limiter');
const { validate, googleAuthSchema } = require('../../../shared/utils/validators');

const router = express.Router();

router.post('/google', authRateLimiter, validate(googleAuthSchema), googleAuth);

router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;
