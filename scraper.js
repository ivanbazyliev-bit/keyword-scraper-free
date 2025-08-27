const puppeteer = require('puppeteer');

// Browser pool for reuse
let browserPool = [];
const MAX_BROWSERS = 3;
let activeBrowsers = 0;

/**
 * Get or create a browser instance from pool
 */
async function getBrowser() {
  // Try to reuse existing browser
  if (browserPool.length > 0) {
    const browser = browserPool.pop();
    try {
      // Check if browser is still alive
      await browser.version();
      return browser;
    } catch (e) {
      // Browser is dead, create new one
    }
  }
  
  // Create new browser if under limit
  if (activeBrowsers < MAX_BROWSERS) {
    activeBrowsers++;
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--memory-pressure-off',
        '--max-old-space-size=512',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-shipping',
        '--disable-webgl',
        '--disable-webgl2',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    return browser;
  }
  
  // Wait for a browser to become available
  await new Promise(resolve => setTimeout(resolve, 1000));
  return getBrowser();
}

/**
 * Return browser to pool
 */
function returnBrowser(browser) {
  if (browser && browserPool.length < MAX_BROWSERS) {
    browserPool.push(browser);
  } else if (browser) {
    browser.close().catch(() => {});
    activeBrowsers--;
  }
}

/**
 * Extract keywords from HTML content using Python patterns
 */
function extractKeywordsFromHtml(htmlContent) {
  if (!htmlContent) return '';
  
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
              return keywords;
            }
          }
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return '';
}

/**
 * Accept cookies dialogs
 */
async function acceptCookies(page) {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Agree")', 
    'button:has-text("OK")',
    'button:has-text("Allow")',
    'a:has-text("Accept")',
    'button[class*="accept"]',
    'button[class*="agree"]',
    'button[class*="consent"]',
    '[id*="accept"]',
    '[id*="consent"]'
  ];
  
  for (const selector of selectors) {
    try {
      // Use XPath for text matching
      const xpath = selector.includes(':has-text(') 
        ? `//button[contains(text(), "${selector.match(/"([^"]+)"/)[1]}")]`
        : selector;
      
      const elements = await page.$x(xpath);
      if (elements.length > 0) {
        await elements[0].click();
        await page.waitForTimeout(500);
        return true;
      }
    } catch (error) {
      continue;
    }
  }
  
  // Try CSS selectors for class/id based
  for (const selector of selectors.filter(s => s.includes('[') || s.includes('#'))) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await page.waitForTimeout(500);
        return true;
      }
    } catch (error) {
      continue;
    }
  }
  
  return false;
}

/**
 * Extract surface keywords from iframe spans (Python logic)
 */
async function extractSurfaceKeywords(page) {
  const kValues = {};
  
  try {
    // Bring page to front
    await page.bringToFront();
    
    // Look for iframe with ID 'master-1'
    let iframe = null;
    try {
      // Wait for iframe to appear
      await page.waitForSelector('#master-1', { timeout: 5000 });
      
      const iframeElement = await page.$('#master-1');
      if (!iframeElement) {
        // Fill with empty values
        for (let i = 1; i <= 10; i++) {
          kValues[`k${i}`] = '';
        }
        return '';
      }
      
      // Get iframe content
      iframe = await iframeElement.contentFrame();
      if (!iframe) {
        // Fill with empty values
        for (let i = 1; i <= 10; i++) {
          kValues[`k${i}`] = '';
        }
        return '';
      }
      
      await page.waitForTimeout(1000);
      
      // Look for elements with class "p_.si34.span"
      const elements = await iframe.$$('.p_.si34.span');
      
      // Take max 10 elements
      const limitedElements = elements.slice(0, 10);
      
      // Extract text from each element
      for (let i = 0; i < 10; i++) {
        if (i < limitedElements.length) {
          try {
            const text = await limitedElements[i].evaluate(el => {
              return el.innerText || el.textContent || '';
            });
            kValues[`k${i + 1}`] = text ? text.trim() : '';
          } catch (error) {
            kValues[`k${i + 1}`] = '';
          }
        } else {
          kValues[`k${i + 1}`] = '';
        }
      }
      
    } catch (error) {
      // Fill with empty values if iframe not found
      for (let i = 1; i <= 10; i++) {
        kValues[`k${i}`] = '';
      }
    }
    
  } catch (error) {
    // Fill with empty values on error
    for (let i = 1; i <= 10; i++) {
      kValues[`k${i}`] = '';
    }
  }
  
  // Collect non-empty keywords into comma-separated string
  const spanKeywordsList = [];
  for (let i = 1; i <= 10; i++) {
    const value = kValues[`k${i}`] || '';
    if (value.trim()) {
      spanKeywordsList.push(value.trim());
    }
  }
  
  return spanKeywordsList.join(', ');
}

/**
 * Process URL with optimized browser reuse
 */
async function processUrl(url, parserCountry = 'Unknown') {
  const startTime = Date.now();
  
  let browser = null;
  let page = null;
  
  try {
    // Get browser from pool
    browser = await getBrowser();
    
    // Create new page with optimized settings
    page = await browser.newPage();
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set timeout
    page.setDefaultTimeout(15000);
    
    // Navigate to URL
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);
      
    } catch (timeoutError) {
      return {
        scraped_keywords: '',
        surface_keywords: '',
        success: false,
        error: `Timeout: ${timeoutError.message}`,
        processing_time_ms: Date.now() - startTime
      };
    }
    
    // Extract HTML keywords
    const pageSource = await page.content();
    let scrapedKeywords = extractKeywordsFromHtml(pageSource);
    
    // Extract surface keywords from iframe spans
    let surfaceKeywords = await extractSurfaceKeywords(page);
    
    // If no keywords found, try accepting cookies and retry
    if (!scrapedKeywords && !surfaceKeywords) {
      await acceptCookies(page);
      await page.waitForTimeout(2000);
      
      // Retry extraction after cookies
      const newPageSource = await page.content();
      scrapedKeywords = extractKeywordsFromHtml(newPageSource);
      surfaceKeywords = await extractSurfaceKeywords(page);
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      scraped_keywords: scrapedKeywords || '',
      surface_keywords: surfaceKeywords || '',
      success: true,
      error: '',
      processing_time_ms: processingTime
    };
    
  } catch (error) {
    return {
      scraped_keywords: '',
      surface_keywords: '',
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  } finally {
    // Clean up page
    if (page) {
      await page.close().catch(() => {});
    }
    
    // Return browser to pool
    if (browser) {
      returnBrowser(browser);
    }
  }
}

/**
 * Clean up browser pool
 */
async function cleanup() {
  const browsers = [...browserPool];
  browserPool = [];
  
  for (const browser of browsers) {
    try {
      await browser.close();
    } catch (e) {
      // Ignore errors
    }
  }
  activeBrowsers = 0;
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

module.exports = { 
  processUrl,
  cleanup,
  extractKeywordsFromHtml,
  extractSurfaceKeywords
};
