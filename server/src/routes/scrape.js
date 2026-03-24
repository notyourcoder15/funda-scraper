import express from 'express';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import scraper from '../services/scraper.js';
import imageFetcher from '../services/imageFetcher.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../../temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

setInterval(() => {
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    if (age > 10 * 60 * 1000) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old zip: ${file}`);
    }
  }
}, 60 * 1000);

router.post('/info', async (req, res) => {
  const logger = console;

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const validatedUrl = scraper.validateUrl(url);
    const result = await scraper.scrapeListing(validatedUrl);

    res.json({
      address: result.address,
      price: result.price,
      zipcode: result.zipcode,
      city: result.city
    });
  } catch (err) {
    const status = err.message.includes('Invalid URL') ? 400 :
                   err.message.includes('timeout') ? 504 :
                   err.message.includes('forbidden') ? 403 :
                   err.message.includes('not found') ? 404 : 500;

    console.error(`Info fetch failed: ${err.message}`);
    res.status(status).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const logger = console;

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const validatedUrl = scraper.validateUrl(url);
    const result = await scraper.scrapeListing(validatedUrl);

    const images = await imageFetcher.fetchImages(result.images);

    if (images.length === 0) {
      return res.status(400).json({ error: 'No images could be fetched' });
    }

    const zipName = `funda-${Date.now()}.zip`;
    const zipPath = path.join(tempDir, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const img of images) {
      archive.append(img.buffer, { name: img.filename });
    }

    await archive.finalize();

    res.download(zipPath, 'funda-images.zip', (err) => {
      if (err) {
        logger.error(`Download error: ${err.message}`);
      }
      setTimeout(() => {
        try {
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }
        } catch (e) {}
      }, 1000);
    });
  } catch (err) {
    const status = err.message.includes('Invalid URL') ? 400 :
                   err.message.includes('timeout') ? 504 :
                   err.message.includes('forbidden') ? 403 :
                   err.message.includes('not found') ? 404 : 500;

    logger.error(`Scrape failed: ${err.message}`);
    res.status(status).json({ error: err.message });
  }
});

export default router;
