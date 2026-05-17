const { validateEvaluatePayload } = require('../../src/middleware/validate');

const validPayload = {
  interview_id: 'int-9901',
  user_id: 'user-445',
  role_config: {
    role: 'Customer Success',
    thresholds: { pacing: 6, knowledge: 5 }
  },
  transcript: 'I think customer satisfaction is the most important thing.',
  audio_metadata: { duration_seconds: 12, filler_word_count: 3 }
};

function makeReqRes(body) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validateEvaluatePayload', () => {
  it('calls next() for a valid payload', () => {
    const { req, res, next } = makeReqRes(validPayload);
    validateEvaluatePayload(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when interview_id is missing', () => {
    const { interview_id, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/interview_id/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when role_config is missing', () => {
    const { role_config, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when audio_metadata is missing', () => {
    const { audio_metadata, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when transcript is missing', () => {
    const { transcript, ...body } = validPayload;
    const { req, res, next } = makeReqRes(body);
    validateEvaluatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
