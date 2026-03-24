import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', Math.ceil(config.rateLimit.windowMs / 1000));
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

export default limiter;
