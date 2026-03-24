import axios from 'axios';
import * as cheerio from 'cheerio';
import config from '../config/index.js';

function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.hostname !== 'www.funda.nl' && url.hostname !== 'funda.nl') {
      throw new Error('Only funda.nl URLs are allowed');
    }
    if (!url.pathname.includes('/detail/')) {
      throw new Error('URL must be a Funda detail listing');
    }
    return url.toString();
  } catch (err) {
    throw new Error(`Invalid URL: ${err.message}`);
  }
}

async function scrapeListing(url) {
  const logger = console;
  const timeout = config.scrapeTimeout;

  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const imageUrls = new Set();

    let address = '';
    let price = '';
    let zipcode = '';
    let city = '';

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const findAddress = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj['@type'] === 'PostalAddress' || obj.streetAddress) {
            if (obj.streetAddress && !address) address = obj.streetAddress;
            if (obj.addressLocality && !city) city = obj.addressLocality;
            if (obj.postalCode && !zipcode) zipcode = obj.postalCode;
          }
          if (obj['@type'] === 'Offer' || obj['@type'] === 'Offer') {
            if (obj.price && !price) {
              const formattedPrice = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(obj.price);
              price = formattedPrice;
            }
          }
          if (obj.name && !address && typeof obj.name === 'string' && obj.name.includes(' ')) {
            address = obj.name;
          }
          Object.values(obj).forEach(val => {
            if (val && typeof val === 'object') findAddress(val);
          });
        };
        findAddress(json);
      } catch (e) {}
    });

    if (!address) {
      const title = $('h1').first().text().trim();
      if (title) address = title;
    }

    if (!price) {
      const priceEl = $('[data-testid="price-value"], .text-3xl, .text-2xl').first();
      const priceText = priceEl.text().trim();
      if (priceText) price = priceText;
    }

    if (!city) {
      const locationEl = $('[data-testid="location"], .text-lg.text-neutral-70').first();
      const locationText = locationEl.text().trim();
      if (locationText) {
        const parts = locationText.split(',');
        if (parts.length > 0) city = parts[parts.length - 1].trim();
      }
    }

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const dataSrc = $(el).attr('data-src');
      const srcset = $(el).attr('srcset');

      const sources = [src, dataSrc];
      if (srcset) {
        const firstSrc = srcset.split(',')[0]?.trim().split(' ')[0];
        if (firstSrc) sources.push(firstSrc);
      }

      for (const source of sources) {
        if (source && (source.startsWith('http://') || source.startsWith('https://'))) {
          if (source.includes('funda.nl') || source.includes('fundra.nl') || source.includes('cloudfront.net') || source.includes('cloud.funda') || source.includes('images.unsplash.com')) {
            imageUrls.add(source);
          }
        }
      }
    });

    $('[style*="background-image"]').each((_, el) => {
      const style = $(el).attr('style');
      const match = style?.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match && match[1].startsWith('http')) {
        imageUrls.add(match[1]);
      }
    });

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const extractImages = (obj) => {
          if (Array.isArray(obj)) {
            obj.forEach(extractImages);
          } else if (obj && typeof obj === 'object') {
            if (obj['@type'] === 'ImageObject' && obj.contentUrl) {
              imageUrls.add(obj.contentUrl);
            }
            if (obj.image) {
              if (typeof obj.image === 'string') {
                imageUrls.add(obj.image);
              } else if (Array.isArray(obj.image)) {
                obj.image.forEach(extractImages);
              } else if (obj.image.contentUrl) {
                imageUrls.add(obj.image.contentUrl);
              }
            }
            if (obj.photo) {
              extractImages(obj.photo);
            }
            Object.values(obj).forEach(extractImages);
          }
        };
        extractImages(json);
      } catch (e) {}
    });

    const urls = Array.from(imageUrls).slice(0, config.maxImages);

    if (urls.length === 0) {
      throw new Error('No images found on this listing');
    }

    logger.info(`Scraped ${urls.length} images from ${url}`);
    return {
      images: urls,
      address: address || 'Unknown',
      price: price || 'Price on request',
      zipcode: zipcode || '',
      city: city || ''
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      throw new Error('Scraping timed out');
    }
    if (err.response?.status === 403) {
      throw new Error('Access forbidden - scraping may be blocked');
    }
    if (err.response?.status === 404) {
      throw new Error('Listing not found');
    }
    logger.error(`Failed to scrape ${url}: ${err.message}`);
    throw err;
  }
}

export default { validateUrl, scrapeListing };
