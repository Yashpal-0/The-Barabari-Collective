const MODULE_NAMES = {
  pacing: 'Pacing Practice',
  knowledge: 'Knowledge Review',
  filler_word_usage: 'Filler Word Practice'
};

function getRemediationModules(scores, thresholds) {
  if (!scores) return [];

  return Object.entries(thresholds)
    .filter(([key, threshold]) => scores[key] !== undefined && scores[key] < threshold)
    .map(([key]) => MODULE_NAMES[key] || `${key} Practice`);
}

module.exports = { getRemediationModules };
