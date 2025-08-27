const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Extract keywords from HTML content (exact same logic as your Python)
 */
function extractKeywordsFromHtml(htmlContent) {
  if (!htmlContent) return '';
  
  console.log('🔍 Extracting keywords from HTML...');
  
  // Same delimiters as your Python version
  const delimiters = [
    ['&quot;terms&quot;:&quot;', '&quot;,'],
    ['"terms":"', '",'],
    ['terms=', '&'],
    ['"keyWords":"', '",'],
    ['"keywords":"', '",']
  ];
  
  for (const [startDelim, endDelim] of delimiters) {
    try {
      if (htmlContent.includes(startDelim)) {
        const startIndex = htmlContent.indexOf(startDelim);
        if (startIndex !== -1) {
          const afterStart = htmlContent.substring(startIndex + startDelim.length);
          const endIndex = afterStart.indexOf(endDelim);
          if (endIndex !== -1) {
            const keywords = afterStart.substring(0, endIndex).trim();
            if (keywords) {
              console.log(`✅ Found HTML keywords: ${keywords.substring(0, 50)}...`);
              return keywords;
            }
          }
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log('❌ No HTML keywords found');
  return '';
}

/**
 * Extract basic surface keywords from HTML (limited version)
 */
function extractBasicSurfaceKeywords(htmlContent) {
  if (!htmlContent) return '';
  
  console.log('🎯 Extracting basic surface keywords...');
  
  try {
    const keywords = [];
    
    // Method 1: Meta keywords
    const metaKeywordsMatch = htmlContent.match(/<meta[^>]+name=['"]keywords['"][^>]+content=['"]([^'"]+)['"][^>]*>/i);
    if (metaKeywordsMatch) {
      keywords.push(metaKeywordsMatch[1]);
    }
    
    // Method 2: Meta description words
    const metaDescMatch = htmlContent.match(/<meta[^>]+name=['"]description['"][^>]+content=['"]([^'"]+)['"][^>]*>/i);
    if (metaDescMatch) {
      const descWords = metaDescMatch[1].split(/[,\s]+/).filter(word => word.length > 3);
      keywords.push(...descWords.slice(0, 3));
    }
    
    // Method 3: Title tag words  
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const titleWords = titleMatch[1].split(/[,\s\-|]+/).filter(word => word.length > 3);
      keywords.push(...titleWords.slice(0, 2));
    }
    
    // Method 4: Try to find span elements in HTML source
    const spanMatches = htmlContent.match(/<span[^>]*class=['"][^'"]*si34[^'"]*span[^'"]*['"][^>]*>([^<]+)<\/span>/gi);
    if (spanMatches) {
      spanMatches.forEach(match => {
        const textMatch = match.match(/>([^<]+)</);
        if (textMatch && textMatch[1].trim()) {
          keywords.push(textMatch[1].trim());
        }
      });
    }
    
    // Remove duplicates and join
    const uniqueKeywords = [...new Set(keywords.filter(k => k && k.trim()))];
    const result = uniqueKeywords.slice(0, 8).join(', ');
    
    if (result) {
      console.log(`✅ Found basic surface keywords: ${result}`);
    } else {
      console.log('❌ No basic surface keywords found');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error extracting basic surface keywords:', error);
    return '';
  }
}

/**
 * Process URL with HTTP request only
 */
async function processUrl(url, country = 'Unknown') {
  console.log(`\n🚀 Processing: ${url}`);
  const startTime = Date.now();
  
  try {
    // Fetch page with HTTP request
    console.log('📄 Fetching page...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const htmlContent = await response.text();
    console.log(`✅ Page fetched (${htmlContent.length} characters)`);
    
    // Extract keywords using your exact Python logic
    const scrapedKeywords = extractKeywordsFromHtml(htmlContent);
    const surfaceKeywords = extractBasicSurfaceKeywords(htmlContent);
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Processing completed in ${processingTime}ms`);
    
    return {
      scraped_keywords: scrapedKeywords || '',
      surface_keywords: surfaceKeywords || '',
      success: true,
      error: '',
      processing_time_ms: processingTime
    };
    
  } catch (error) {
    console.error(`❌ Error processing ${url}:`, error.message);
    return {
      scraped_keywords: '',
      surface_keywords: '',
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'alive',
    message: 'Lightweight Keyword Scraper API',
    version: '1.0.0',
    type: 'HTTP-only (no browser automation)',
    endpoints: {
      'POST /extract': 'Extract keywords from a URL',
      'GET /': 'Health check'
    }
  });
});

// Main extraction endpoint
app.post('/extract', async (req, res) => {
  console.log('\n=== NEW EXTRACTION REQUEST ===');
  
  try {
    const { url, country = 'Unknown' } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        scraped_keywords: '',
        surface_keywords: ''
      });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        scraped_keywords: '',
        surface_keywords: ''
      });
    }
    
    console.log(`📥 Request: ${url} (Country: ${country})`);
    
    // Process the URL
    const result = await processUrl(url, country);
    
    // Return response
    const response = {
      ...result,
      url: url,
      country: country,
      timestamp: new Date().toISOString(),
      server: 'render-lightweight',
      method: 'HTTP-only'
    };
    
    console.log(`📤 Response: Success=${result.success}, Scraped=${!!result.scraped_keywords}, Surface=${!!result.surface_keywords}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      scraped_keywords: '',
      surface_keywords: '',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['GET /', 'POST /extract']
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Lightweight Keyword Scraper API running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}`);
  console.log(`📊 Extract endpoint: POST http://localhost:${PORT}/extract`);
  console.log(`⚡ Method: HTTP requests only (no browser automation)`);
});

module.exports = app;
