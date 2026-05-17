const { validateExecutePayload } = require('../../src/middleware/validate');

const validPayload = {
  user_id: 'user-123',
  language: 'javascript',
  code: "console.log('Hello')"
};

function makeReqRes(body) {
  const req = { body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('validateExecutePayload', () => {
  it('calls next() for valid javascript payload', () => {
    const { req, res, next } = makeReqRes(validPayload);
    validateExecutePayload(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for valid python payload', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, language: 'python' });
    validateExecutePayload(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when user_id is missing', () => {
    const { user_id, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/user_id/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for unsupported language', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, language: 'ruby' });
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/language/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when code is missing', () => {
    const { code, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/code/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when code exceeds 50000 characters', () => {
    const { req, res, next } = makeReqRes({ ...validPayload, code: 'x'.repeat(50001) });
    validateExecutePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
