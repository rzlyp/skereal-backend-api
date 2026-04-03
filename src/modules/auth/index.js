const authRoutes = require('./routes/auth.routes');
const User = require('./models/user.model');
const { authenticate, optionalAuth } = require('./middleware/auth.middleware');
const googleOAuthService = require('./services/google-oauth.service');

module.exports = {
  authRoutes,
  User,
  authenticate,
  optionalAuth,
  googleOAuthService
};
