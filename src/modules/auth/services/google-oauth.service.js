const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const logger = require('../../../shared/utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (credential) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture
    };
  } catch (error) {
    logger.error('Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
};

const findOrCreateUser = async (googleUserData) => {
  try {
    // Check if user exists by googleId
    let user = await User.findOne({ googleId: googleUserData.googleId });

    if (user) {
      // Update user info if changed
      user.email = googleUserData.email;
      user.name = googleUserData.name;
      user.avatar = googleUserData.avatar;
      await user.save();
      return user;
    }

    // Check if user exists by email (might have registered differently)
    user = await User.findOne({ email: googleUserData.email });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleUserData.googleId;
      user.avatar = googleUserData.avatar;
      await user.save();
      return user;
    }

    // Create new user
    user = await User.create({
      googleId: googleUserData.googleId,
      email: googleUserData.email,
      name: googleUserData.name,
      avatar: googleUserData.avatar
    });

    logger.info(`New user created: ${user.email}`);
    return user;
  } catch (error) {
    logger.error('Error finding/creating user:', error);
    throw error;
  }
};

module.exports = {
  verifyGoogleToken,
  findOrCreateUser
};
