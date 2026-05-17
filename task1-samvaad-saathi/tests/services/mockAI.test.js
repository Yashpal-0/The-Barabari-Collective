const { mockAIGrade } = require('../../src/services/mockAI');

describe('mockAIGrade', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns scores with keys knowledge, pacing, filler_word_usage', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // won't trigger failure
    const promise = mockAIGrade({
      transcript: 'test transcript',
      audio_metadata: { duration_seconds: 10, filler_word_count: 2 }
    });
    await jest.runAllTimersAsync();
    const scores = await promise;
    expect(scores).toHaveProperty('knowledge');
    expect(scores).toHaveProperty('pacing');
    expect(scores).toHaveProperty('filler_word_usage');
  });

  it('returns integer scores between 1 and 10 inclusive', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    const scores = await promise;
    for (const key of ['knowledge', 'pacing', 'filler_word_usage']) {
      expect(scores[key]).toBeGreaterThanOrEqual(1);
      expect(scores[key]).toBeLessThanOrEqual(10);
      expect(Number.isInteger(scores[key])).toBe(true);
    }
  });

  it('throws Error("AI timeout") when Math.random() < 0.1', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    // Attach error handler immediately to capture the rejection
    const rejectionHandler = expect(promise).rejects.toThrow('AI timeout');
    await jest.runAllTimersAsync();
    await rejectionHandler;
  });

  it('does not throw when Math.random() >= 0.1', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeDefined();
  });

  it('returns score of 1 (not 0) when Math.random() returns 0', async () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // failure check — 0.5 >= 0.1, no throw
      .mockReturnValueOnce(0)    // knowledge score
      .mockReturnValueOnce(0)    // pacing score
      .mockReturnValueOnce(0);   // filler_word_usage score
    const promise = mockAIGrade({
      transcript: 'test',
      audio_metadata: { duration_seconds: 5, filler_word_count: 1 }
    });
    await jest.runAllTimersAsync();
    const scores = await promise;
    expect(scores.knowledge).toBe(1);
    expect(scores.pacing).toBe(1);
    expect(scores.filler_word_usage).toBe(1);
  });
});
