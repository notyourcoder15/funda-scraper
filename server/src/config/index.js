import dotenv from 'dotenv';
dotenv.config();

export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10)
  },
  scrapeTimeout: parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10),
  imageFetchTimeout: parseInt(process.env.IMAGE_FETCH_TIMEOUT_MS || '10000', 10),
  maxImages: parseInt(process.env.MAX_IMAGES || '50', 10)
};
