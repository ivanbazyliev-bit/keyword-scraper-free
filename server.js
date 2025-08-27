const express = require('express');
const cors = require('cors');
const { processUrl } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'alive',
    message: 'Free Keyword Scraper API',
    version: '1.0.0',
    endpoints: {
      'POST /extract': 'Extract keywords from a single URL',
      'GET /': 'Health check'
    }
  });
});

// Main extraction endpoint
app.post('/extract', async (req, res) => {
  console.log('\n=== NEW EXTRACTION REQUEST ===');
  
  try {
    const { url, country = 'Unknown' } = req.body;
    
    // Validate input
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        scraped_keywords: '',
        surface_keywords: ''
      });
    }
    
    // Validate URL format
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
      server: 'render-free-tier'
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
    available_endpoints: {
      'GET /': 'Health check',
      'POST /extract': 'Extract keywords'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Free Keyword Scraper API running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}`);
  console.log(`📊 Extract endpoint: POST http://localhost:${PORT}/extract`);
});

module.exports = app;
