const mockAIModule = require('../../src/services/mockAI');

describe('circuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = require('../../src/services/circuitBreaker');
    breaker.close(); // reset circuit state to closed before each test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves with scores when mockAIGrade succeeds', async () => {
    jest.spyOn(mockAIModule, 'mockAIGrade').mockResolvedValue({
      knowledge: 7, pacing: 8, filler_word_usage: 6
    });
    const result = await breaker.fire({ transcript: 'test', audio_metadata: {} });
    expect(result).toEqual({ knowledge: 7, pacing: 8, filler_word_usage: 6 });
  });

  it('resolves with pending fallback when mockAIGrade throws', async () => {
    jest.spyOn(mockAIModule, 'mockAIGrade').mockRejectedValue(new Error('AI timeout'));
    const result = await breaker.fire({ transcript: 'test', audio_metadata: {} });
    expect(result).toEqual({ status: 'pending', scores: null, flagged_modules: [] });
  });
});
