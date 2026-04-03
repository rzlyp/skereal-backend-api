const jwt = require('jsonwebtoken');
const { verifyGoogleToken, findOrCreateUser } = require('../services/google-oauth.service');
const logger = require('../../../shared/utils/logger');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const googleUserData = await verifyGoogleToken(credential);

    const user = await findOrCreateUser(googleUserData);

    const token = generateToken(user._id);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar
    }
  });
};

const logout = async (req, res) => {

  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  googleAuth,
  getCurrentUser,
  logout
};
