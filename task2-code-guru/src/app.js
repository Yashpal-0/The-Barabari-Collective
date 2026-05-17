const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');

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

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = { app, server, io };
