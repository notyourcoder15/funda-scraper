# Funda Scraper - Project Specification

## Project Overview

- **Project Name**: Funda Image Scraper
- **Type**: Full-stack web application (React + Express)
- **Core Functionality**: Scrape and download images from Funda.nl property listings
- **Target Users**: Real estate agents, property researchers, home buyers

## Technical Stack

- **Frontend**: React 18 + Tailwind CSS + Vite
- **Backend**: Node.js + Express.js
- **Scraping**: Axios + Cheerio (Funda uses server-rendered content)
- **Zip Generation**: Archiver
- **Concurrency**: p-limit
- **Rate Limiting**: express-rate-limit
- **Config**: dotenv

## Project Structure

```
/funda-scraper
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ScraperForm.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── scrape.js
│   │   ├── services/
│   │   │   ├── scraper.js
│   │   │   └── imageFetcher.js
│   │   ├── config/
│   │   │   └── index.js
│   │   ├── middleware/
│   │   │   └── rateLimiter.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
├── package.json            # Root package.json for running both
├── SPEC.md
└── README.md
```

## Functionality Specification

### 1. Frontend (client/)

**ScraperForm Component**:
- Single input field for Funda URL
- Submit button with loading state
- Error message display area
- Success/response handling (triggers download)

**UI Requirements**:
- Clean, minimal design with Tailwind
- Input validation feedback
- Loading spinner during scrape
- Responsive layout

### 2. Backend (server/)

**POST /scrape Endpoint**:
- Accepts JSON body: `{ url: string }`
- Validates URL format and domain
- Returns ZIP file as downloadable attachment

**URL Validation**:
- Must be valid URL format
- Must be from funda.nl domain
- Must contain /detail/ path

**Rate Limiting**:
- 10 requests per 15 minutes per IP
- Returns 429 on exceeded limit

**Timeout Handling**:
- 30 second timeout for scraping
- 10 second timeout per image fetch

### 3. Scraper Service

**Scraping Logic**:
- Fetch listing page with axios
- Parse HTML with Cheerio
- Extract all image URLs from DOM:
  - Main image: `img[class*="object-cover"]`
  - Gallery images: `img[class*="funda-image"]`
  - All img tags with src containing images
- Remove duplicates using Set
- Validate image URLs (must be http/https)

**Robots.txt Compliance**:
- /detail/ is allowed per robots.txt
- Add delay between requests (respectful scraping)
- Include User-Agent header

### 4. Image Fetcher Service

**Concurrency Control**:
- Use p-limit with limit of 5 concurrent downloads
- Fetch images as buffers
- Handle failures gracefully (skip failed images)
- Log failed fetches

**Memory Management**:
- Stream images directly into archiver
- Don't store all buffers in memory
- Clean up on errors

### 5. Zip Generation

**Archiver Configuration**:
- Create zip with listing images
- Name files sequentially (image-001.jpg, etc.)
- Set Content-Disposition: attachment
- Set Content-Type: application/zip

### 6. Environment Config

**Environment Variables**:
- `NODE_ENV`: development | production
- `PORT`: server port (default 3001)
- `RATE_LIMIT_WINDOW_MS`: rate limit window
- `RATE_LIMIT_MAX_REQUESTS`: max requests per window
- `SCRAPE_TIMEOUT_MS`: scrape timeout
- `IMAGE_FETCH_TIMEOUT_MS`: image fetch timeout
- `MAX_IMAGES`: maximum images to download (default 50)

**Logging**:
- Console logging with timestamps
- Log failed scrapes with URL and error
- Log rate limit violations

## Edge Cases & Error Handling

1. **Invalid URL**: Return 400 with specific error message
2. **Rate limited**: Return 429 with retry-after header
3. **Scraping timeout**: Return 504 with timeout error
4. **No images found**: Return 404 with message
5. **Image fetch failure**: Skip image, log error, continue
6. **Empty zip**: Return 400 with message
7. **Server error**: Return 500 with generic message

## Acceptance Criteria

1. ✅ User can enter a valid funda.nl listing URL
2. ✅ Invalid URLs are rejected with clear error message
3. ✅ Only funda.nl URLs are accepted
4. ✅ Rate limiting prevents abuse
5. ✅ Images are scraped and deduplicated
6. ✅ ZIP file downloads automatically
7. ✅ Failed images don't crash the app
8. ✅ Environment config works for dev/prod
9. ✅ Failed scrapes are logged
10. ✅ Scraper logic is in service layer, not routes

## Compliance Notes

- **Robots.txt**: /detail/ is explicitly allowed
- **ToS**: This tool is for personal use. Commercial use may violate Funda ToS
- **Recommendation**: Add disclaimer in UI about terms compliance
