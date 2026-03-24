import express from 'express';
import config from './config/index.js';
import rateLimiter from './middleware/rateLimiter.js';
import scrapeRoutes from './routes/scrape.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

app.use('/scrape', rateLimiter, scrapeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

const port = config.port;
app.listen(port, () => {
  console.log(`Server running on port ${port} (${config.env} mode)`);
});
