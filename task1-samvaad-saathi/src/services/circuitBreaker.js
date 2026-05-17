const CircuitBreaker = require('opossum');
const mockAIModule = require('./mockAI');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 5
};

// Arrow function wrapper ensures spy on mockAIModule.mockAIGrade is honoured in tests
const breaker = new CircuitBreaker(
  (payload) => mockAIModule.mockAIGrade(payload),
  options
);

breaker.fallback(() => ({ status: 'pending', scores: null, flagged_modules: [] }));

module.exports = breaker;
