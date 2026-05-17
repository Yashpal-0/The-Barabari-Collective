const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const { Worker } = require('bullmq');
const { runJob } = require('./workers/jobHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(helmet());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
});

app.use('/execute', require('./routes/execute'));

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const worker = new Worker('executions', (job) => runJob(job, io), {
  connection: redisConnection,
  concurrency: 5
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = { app, server, io };
