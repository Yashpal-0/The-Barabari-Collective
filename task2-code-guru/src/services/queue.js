const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const executionQueue = new Queue('executions', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 3600 }
  }
});

module.exports = { executionQueue };
