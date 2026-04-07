'use strict';

const {
  googleAuthSchema,
  createProjectSchema,
  createVersionSchema,
  validate
} = require('../../shared/utils/validators');

describe('googleAuthSchema', () => {
  it('passes with a valid credential', () => {
    const { error } = googleAuthSchema.validate({ credential: 'token123' });
    expect(error).toBeUndefined();
  });

  it('fails when credential is missing', () => {
    const { error } = googleAuthSchema.validate({});
    expect(error).toBeDefined();
  });

  it('fails when credential is empty string', () => {
    const { error } = googleAuthSchema.validate({ credential: '' });
    expect(error).toBeDefined();
  });
});

describe('createProjectSchema', () => {
  it('passes with no fields (prompt is optional)', () => {
    const { error, value } = createProjectSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.prompt).toBe('');
  });

  it('passes with a valid prompt', () => {
    const { error } = createProjectSchema.validate({ prompt: 'silk evening gown' });
    expect(error).toBeUndefined();
  });

  it('fails when prompt exceeds 1000 characters', () => {
    const { error } = createProjectSchema.validate({ prompt: 'a'.repeat(1001) });
    expect(error).toBeDefined();
  });
});

describe('createVersionSchema', () => {
  it('passes with no fields', () => {
    const { error } = createVersionSchema.validate({});
    expect(error).toBeUndefined();
  });

  it('passes with a valid beforeVersionId (24-char hex)', () => {
    const { error } = createVersionSchema.validate({
      beforeVersionId: 'a1b2c3d4e5f6a1b2c3d4e5f6'
    });
    expect(error).toBeUndefined();
  });

  it('fails when beforeVersionId is not 24-char hex', () => {
    const { error } = createVersionSchema.validate({ beforeVersionId: 'short' });
    expect(error).toBeDefined();
  });

  it('fails when prompt exceeds 1000 characters', () => {
    const { error } = createVersionSchema.validate({ prompt: 'x'.repeat(1001) });
    expect(error).toBeDefined();
  });
});

describe('validate middleware', () => {
  const middleware = validate(googleAuthSchema);

  it('calls next() and assigns validated value on valid input', () => {
    const req = { body: { credential: 'tok' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.credential).toBe('tok');
  });

  it('returns 400 with error details on invalid input', () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation failed', details: expect.any(Array) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
