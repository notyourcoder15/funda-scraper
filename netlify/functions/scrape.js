import * as cheerio from 'cheerio';
import archiver from 'archiver';
import pLimit from 'p-limit';

const MAX_IMAGES = 50;
const SCRAPE_TIMEOUT = 15000;
const IMAGE_FETCH_TIMEOUT = 8000;

async function httpGet(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      ...options.headers
    },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT)
  });
  return {
    data: await response.text(),
    headers: response.headers,
    status: response.status
  };
}

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
  const response = await httpGet(url);

  const $ = cheerio.load(response.data);
  const imageUrls = new Set();

  let address = '';
  let price = '';
  let zipcode = '';
  let city = '';

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const findData = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj['@type'] === 'PostalAddress' || obj.streetAddress) {
          if (obj.streetAddress && !address) address = obj.streetAddress;
          if (obj.addressLocality && !city) city = obj.addressLocality;
          if (obj.postalCode && !zipcode) zipcode = obj.postalCode;
        }
        if (obj.price && !price) {
          price = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(obj.price);
        }
        if (obj.name && !address && typeof obj.name === 'string' && obj.name.includes(' ')) {
          address = obj.name;
        }
        Object.values(obj).forEach(val => {
          if (val && typeof val === 'object') findData(val);
        });
      };
      findData(json);
    } catch (e) {}
  });

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
      if (source && source.startsWith('http')) {
        if (source.includes('funda.nl') || source.includes('cloud.funda') || source.includes('cloudfront.net')) {
          imageUrls.add(source);
        }
      }
    }
  });

  return {
    images: Array.from(imageUrls).slice(0, MAX_IMAGES),
    address: address || 'Unknown',
    price: price || 'Price on request',
    zipcode: zipcode || '',
    city: city || ''
  };
}

async function fetchImages(urls) {
  const limit = pLimit(3);
  const results = await Promise.all(
    urls.map((url, index) => limit(async () => {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT)
        });
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || '';
        const extension = contentType.includes('png') ? 'png' : 'jpg';
        return {
          filename: `image-${String(index + 1).padStart(3, '0')}.${extension}`,
          buffer: Buffer.from(arrayBuffer)
        };
      } catch (err) {
        return null;
      }
    }))
  );
  return results.filter(img => img !== null);
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { url, action } = JSON.parse(event.body || '{}');

    if (!url || typeof url !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL is required' }) };
    }

    const validatedUrl = validateUrl(url);
    const result = await scrapeListing(validatedUrl);

    if (action === 'info') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          address: result.address,
          price: result.price,
          zipcode: result.zipcode,
          city: result.city
        })
      };
    }

    const images = await fetchImages(result.images);

    if (images.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No images could be fetched' }) };
    }

    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 6 } });
    
    await new Promise((resolve, reject) => {
      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', resolve);
      archive.on('error', reject);
      images.forEach(img => archive.append(img.buffer, { name: img.filename }));
      archive.finalize();
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=funda-images.zip'
      },
      body: Buffer.concat(chunks).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    const status = err.message.includes('Invalid URL') ? 400 :
                   err.message.includes('timeout') ? 504 :
                   err.message.includes('forbidden') ? 403 :
                   err.message.includes('not found') ? 404 : 500;
    console.error('Error:', err.message);
    return { statusCode: status, headers, body: JSON.stringify({ error: err.message }) };
  }
}
