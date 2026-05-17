const { runInDocker } = require('./docker');

async function runExecution({ language, code }) {
  return runInDocker({ language, code });
}

module.exports = { runExecution };
