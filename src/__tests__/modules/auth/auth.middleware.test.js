'use strict';

const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');
jest.mock('../../../modules/auth/models/user.model');

const User = require('../../../modules/auth/models/user.model');
const { authenticate, optionalAuth } = require('../../../modules/auth/middleware/auth.middleware');

process.env.JWT_SECRET = 'test-secret';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticate', () => {
  it('returns 401 when no Authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header has wrong format', async () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for invalid token', async () => {
    jwt.verify.mockImplementation(() => { throw Object.assign(new Error(), { name: 'JsonWebTokenError' }); });
    const req = { headers: { authorization: 'Bearer bad.token' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('returns 401 for expired token', async () => {
    jwt.verify.mockImplementation(() => { throw Object.assign(new Error(), { name: 'TokenExpiredError' }); });
    const req = { headers: { authorization: 'Bearer expired.token' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('returns 401 when user not found in DB', async () => {
    jwt.verify.mockReturnValue({ userId: 'user123' });
    User.findById.mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer valid.token' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('sets req.user and calls next() for valid token and existing user', async () => {
    const fakeUser = { id: 'user123', email: 'test@example.com' };
    jwt.verify.mockReturnValue({ userId: 'user123' });
    User.findById.mockResolvedValue(fakeUser);
    const req = { headers: { authorization: 'Bearer valid.token' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('calls next() without setting req.user when no header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('calls next() silently when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const req = { headers: { authorization: 'Bearer bad.token' } };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sets req.user when token is valid', async () => {
    const fakeUser = { id: 'user123' };
    jwt.verify.mockReturnValue({ userId: 'user123' });
    User.findById.mockResolvedValue(fakeUser);
    const req = { headers: { authorization: 'Bearer valid.token' } };
    const res = mockRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});
