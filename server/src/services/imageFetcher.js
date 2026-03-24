import axios from 'axios';
import pLimit from 'p-limit';
import config from '../config/index.js';

const limit = pLimit(5);

async function fetchImage(url, index) {
  const timeout = config.imageFetchTimeout;
  const logger = console;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout,
      headers: {
        'User-Agent': 'FundaScraper/1.0 (Personal Use)'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const filename = `image-${String(index + 1).padStart(3, '0')}.${extension}`;

    return {
      filename,
      buffer: Buffer.from(response.data),
      originalUrl: url
    };
  } catch (err) {
    logger.error(`Failed to fetch image ${url}: ${err.message}`);
    return null;
  }
}

async function fetchImages(urls) {
  const logger = console;
  const results = await Promise.all(
    urls.map((url, index) => limit(() => fetchImage(url, index)))
  );

  const validImages = results.filter(img => img !== null);
  logger.info(`Successfully fetched ${validImages.length}/${urls.length} images`);

  return validImages;
}

export default { fetchImages };
