'use strict';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken
  }))
}));

jest.mock('../../../modules/auth/models/user.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../../shared/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const User = require('../../../modules/auth/models/user.model');
const { verifyGoogleToken, findOrCreateUser } = require('../../../modules/auth/services/google-oauth.service');

const mockPayload = {
  sub: 'google-id-123',
  email: 'user@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg'
};

const userData = {
  googleId: mockPayload.sub,
  email: mockPayload.email,
  name: mockPayload.name,
  avatar: mockPayload.picture
};

describe('verifyGoogleToken', () => {
  it('returns user data from a valid Google token', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockPayload });

    const result = await verifyGoogleToken('valid-credential');

    expect(result).toEqual({
      googleId: mockPayload.sub,
      email: mockPayload.email,
      name: mockPayload.name,
      avatar: mockPayload.picture
    });
  });

  it('throws "Invalid Google token" when verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

    await expect(verifyGoogleToken('bad-credential')).rejects.toThrow('Invalid Google token');
  });
});

describe('findOrCreateUser', () => {
  it('updates and returns an existing user found by googleId', async () => {
    const existingUser = { ...userData, save: jest.fn().mockResolvedValue(true) };
    User.findOne.mockImplementation(({ googleId }) =>
      googleId ? Promise.resolve(existingUser) : Promise.resolve(null)
    );

    const result = await findOrCreateUser(userData);

    expect(existingUser.save).toHaveBeenCalled();
    expect(result).toBe(existingUser);
  });

  it('links Google account to user found by email', async () => {
    const emailUser = { email: userData.email, save: jest.fn().mockResolvedValue(true) };
    User.findOne.mockImplementation(({ googleId, email }) => {
      if (googleId) return Promise.resolve(null);
      if (email) return Promise.resolve(emailUser);
    });

    const result = await findOrCreateUser(userData);

    expect(emailUser.googleId).toBe(userData.googleId);
    expect(emailUser.save).toHaveBeenCalled();
    expect(result).toBe(emailUser);
  });

  it('creates a new user when none exists', async () => {
    const newUser = { ...userData, id: 'new-id' };
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(newUser);

    const result = await findOrCreateUser(userData);

    expect(User.create).toHaveBeenCalledWith(userData);
    expect(result).toBe(newUser);
  });
});
