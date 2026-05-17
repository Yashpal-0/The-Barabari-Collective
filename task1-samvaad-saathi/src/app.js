const express = require('express');
const helmet = require('helmet');
const evaluateRouter = require('./routes/evaluate');

const app = express();

app.use(helmet());
app.use(express.json());
app.use('/api/v1/evaluate', evaluateRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
