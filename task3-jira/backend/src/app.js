const express = require('express');
const helmet = require('helmet');
const { initDB } = require('./db');

const app = express();

app.use(helmet());
app.use(express.json());

app.use('/api/tickets', require('./routes/tickets'));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;
if (require.main === module) {
  initDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server on port ${PORT}`));
    })
    .catch((err) => {
      console.error('DB init failed:', err.message);
      process.exit(1);
    });
}

module.exports = { app };
