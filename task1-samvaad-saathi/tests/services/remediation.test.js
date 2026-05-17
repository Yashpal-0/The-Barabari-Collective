const { getRemediationModules } = require('../../src/services/remediation');

describe('getRemediationModules', () => {
  it('returns empty array when all scores meet thresholds', () => {
    const scores = { knowledge: 7, pacing: 8, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    expect(getRemediationModules(scores, thresholds)).toEqual([]);
  });

  it('flags Pacing Practice when pacing score is below threshold', () => {
    const scores = { knowledge: 7, pacing: 4, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Pacing Practice');
    expect(modules).not.toContain('Knowledge Review');
  });

  it('flags Knowledge Review when knowledge score is below threshold', () => {
    const scores = { knowledge: 3, pacing: 8, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Knowledge Review');
    expect(modules).not.toContain('Pacing Practice');
  });

  it('flags multiple modules when multiple scores are below threshold', () => {
    const scores = { knowledge: 3, pacing: 4, filler_word_usage: 9 };
    const thresholds = { pacing: 6, knowledge: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Pacing Practice');
    expect(modules).toContain('Knowledge Review');
    expect(modules).toHaveLength(2);
  });

  it('handles filler_word_usage threshold when provided', () => {
    const scores = { knowledge: 7, pacing: 8, filler_word_usage: 3 };
    const thresholds = { pacing: 6, knowledge: 5, filler_word_usage: 5 };
    const modules = getRemediationModules(scores, thresholds);
    expect(modules).toContain('Filler Word Practice');
    expect(modules).toHaveLength(1);
  });

  it('returns empty array when scores is null', () => {
    expect(getRemediationModules(null, { pacing: 6 })).toEqual([]);
  });

  it('score equal to threshold is not flagged (must be strictly below)', () => {
    const scores = { knowledge: 5, pacing: 6 };
    const thresholds = { pacing: 6, knowledge: 5 };
    expect(getRemediationModules(scores, thresholds)).toEqual([]);
  });
});
