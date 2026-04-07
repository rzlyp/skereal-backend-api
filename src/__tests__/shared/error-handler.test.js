'use strict';

jest.mock('../../shared/utils/logger', () => ({ error: jest.fn() }));

const errorHandler = require('../../shared/middleware/error-handler');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = () => ({ path: '/test', method: 'GET' });

describe('errorHandler', () => {
  it('handles Mongoose ValidationError with 400', () => {
    const err = {
      name: 'ValidationError',
      errors: { field: { message: 'Field is required' } }
    };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation Error' })
    );
  });

  it('handles duplicate key error (code 11000) with 409', () => {
    const err = { code: 11000 };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Duplicate entry' })
    );
  });

  it('handles JsonWebTokenError with 401', () => {
    const err = { name: 'JsonWebTokenError', message: 'invalid token' };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('handles TokenExpiredError with 401', () => {
    const err = { name: 'TokenExpiredError', message: 'jwt expired' };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('uses err.statusCode when set', () => {
    const err = { statusCode: 422, message: 'Unprocessable' };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unprocessable' }));
  });

  it('defaults to 500 for unknown errors', () => {
    const err = { message: 'Something broke' };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('includes stack in development mode', () => {
    process.env.NODE_ENV = 'development';
    const err = { message: 'oops', stack: 'Error: oops\n  at ...' };
    const res = mockRes();

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: err.stack }));
    delete process.env.NODE_ENV;
  });
});
