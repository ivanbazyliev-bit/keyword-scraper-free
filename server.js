const express = require('express');
const cors = require('cors');
const pLimit = require('p-limit');
const { processUrl, cleanup } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 10000;

// Concurrency limiter - process max 3 requests at once
const limit = pLimit(3);

// Request queue tracking
let activeRequests = 0;
let queuedRequests = 0;
const MAX_QUEUED = 10;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Optimized Keyword Scraper API',
    version: '2.0.0',
    features: [
      'Browser-based scraping with Puppeteer',
      'Surface keywords extraction from iframes',
      'Scraped keywords from HTML patterns',
      'Cookie acceptance handling',
      'Browser pool for performance',
      'Concurrent request handling'
    ],
    endpoints: {
      'GET /': 'Health check',
      'POST /extract': 'Extract keywords from URL',
      'GET /stats': 'Server statistics'
    },
    performance: {
      active_requests: activeRequests,
      queued_requests: queuedRequests,
      max_concurrent: 3
    }
  });
});

/**
 * Server statistics endpoint
 */
app.get('/stats', (req, res) => {
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      active_requests: activeRequests,
      queued_requests: queuedRequests
    }
  });
});

/**
 * Main extraction endpoint with queue management
 */
app.post('/extract', async (req, res) => {
  console.log('\n════════════════════════════════');
  console.log('🚀 NEW EXTRACTION REQUEST');
  console.log('════════════════════════════════');
  
  // Check if queue is full
  if (queuedRequests >= MAX_QUEUED) {
    console.log('❌ Queue full - rejecting request');
    return res.status(503).json({
      success: false,
      error: 'Server too busy. Please try again later.',
      scraped_keywords: '',
      surface_keywords: ''
    });
  }
  
  queuedRequests++;
  
  try {
    const { url, country = 'Unknown' } = req.body;
    
    // Validate URL
    if (!url) {
      queuedRequests--;
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        scraped_keywords: '',
        surface_keywords: ''
      });
    }
    
    try {
      new URL(url);
    } catch (urlError) {
      queuedRequests--;
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        scraped_keywords: '',
        surface_keywords: ''
      });
    }
    
    console.log(`📍 URL: ${url}`);
    console.log(`🌍 Country: ${country}`);
    console.log(`⏳ Queue position: ${queuedRequests}`);
    
    // Process with concurrency limit
    queuedRequests--;
    activeRequests++;
    
    console.log(`🔄 Active requests: ${activeRequests}`);
    
    const result = await limit(() => processUrl(url, country));
    
    activeRequests--;
    
    // Log results
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('──────────────────────');
    console.log(`✅ Success: ${result.success}`);
    console.log(`⏱️  Time: ${result.processing_time_ms}ms`);
    console.log(`📝 Scraped Keywords: ${result.scraped_keywords ? 
      result.scraped_keywords.substring(0, 50) + '...' : '(none)'}`);
    console.log(`🎯 Surface Keywords: ${result.surface_keywords ? 
      result.surface_keywords.substring(0, 50) + '...' : '(none)'}`);
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    console.log('──────────────────────\n');
    
    // Return response
    const response = {
      ...result,
      url: url,
      country: country,
      timestamp: new Date().toISOString(),
      server: 'optimized-puppeteer',
      method: 'browser-automation'
    };
    
    res.json(response);
    
  } catch (error) {
    queuedRequests = Math.max(0, queuedRequests - 1);
    activeRequests = Math.max(0, activeRequests - 1);
    
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

/**
 * 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['GET /', 'POST /extract', 'GET /stats']
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Stop accepting new requests
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Clean up browser pool
  await cleanup();
  
  console.log('✅ Cleanup complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   OPTIMIZED KEYWORD SCRAPER API v2.0     ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}`);
  console.log(`📊 Statistics: http://localhost:${PORT}/stats`);
  console.log(`🔍 Extract endpoint: POST http://localhost:${PORT}/extract`);
  console.log('\n⚡ Features:');
  console.log('  • Browser-based scraping with Puppeteer');
  console.log('  • Surface keywords from iframe spans');
  console.log('  • Scraped keywords from HTML patterns');
  console.log('  • Browser pool for performance');
  console.log('  • Concurrent request handling');
  console.log('  • Graceful shutdown support');
  console.log('\n📌 Ready to accept requests...\n');
});

module.exports = app;
