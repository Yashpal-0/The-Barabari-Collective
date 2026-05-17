function randomScore() {
  return Math.floor(Math.random() * 10) + 1;
}

async function mockAIGrade({ transcript, audio_metadata }) {
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (Math.random() < 0.1) {
    throw new Error('AI timeout');
  }

  return {
    knowledge: randomScore(),
    pacing: randomScore(),
    filler_word_usage: randomScore()
  };
}

module.exports = { mockAIGrade };
