const puppeteer = require('puppeteer');

/**
 * Extract keywords from HTML content (exact Python logic)
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
              console.log(`✅ Found HTML keywords using pattern ${startDelim}: ${keywords.substring(0, 50)}...`);
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
 * Accept cookies on page (same as Python accept_cookies)
 */
async function acceptCookies(page) {
  console.log('🍪 Attempting to accept cookies...');
  
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
      await page.waitForSelector(selector, { timeout: 3000 });
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await page.waitForTimeout(1000);
        console.log('✅ Cookie dialog accepted');
        return true;
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log('ℹ️ No cookie dialog found');
  return false;
}

/**
 * Extract surface keywords from spans (exact Python logic)
 */
async function extractSurfaceKeywords(page) {
  console.log('🎯 Extracting surface keywords from spans...');
  
  const kValues = {};
  
  try {
    // Return to main content (same as Python)
    await page.bringToFront();
    
    // Wait for iframe with ID 'master-1' (exact Python logic)
    try {
      console.log('🔍 Looking for iframe #master-1...');
      await page.waitForSelector('#master-1', { timeout: 10000 });
      
      const iframeElement = await page.$('#master-1');
      if (!iframeElement) {
        console.log('❌ Iframe element not found');
        // Fill with empty values (same as Python)
        for (let i = 1; i <= 10; i++) {
          kValues[`k${i}`] = '';
        }
        return '';
      }
      
      // Switch to found iframe (same as Python)
      const iframe = await iframeElement.contentFrame();
      if (!iframe) {
        console.log('❌ Could not access iframe content');
        // Fill with empty values (same as Python)
        for (let i = 1; i <= 10; i++) {
          kValues[`k${i}`] = '';
        }
        return '';
      }
      
      console.log('✅ Successfully accessed iframe');
      await page.waitForTimeout(2000);
      
      // Search for elements with class "p_.si34.span" (exact Python selector)
      console.log('🔍 Looking for .p_.si34.span elements...');
      const elements = await iframe.$$('.p_.si34.span');
      console.log(`📊 Found ${elements.length} span elements`);
      
      // Take max 10 elements (same as Python)
      const limitedElements = elements.slice(0, 10);
      
      // Create k1, k2, ..., k10 (exact Python logic)
      for (let i = 0; i < 10; i++) {
        if (i < limitedElements.length) {
          try {
            const text = await limitedElements[i].evaluate(el => el.innerText || el.textContent);
            kValues[`k${i + 1}`] = text ? text.trim() : '';
            if (text && text.trim()) {
              console.log(`📝 k${i + 1}: ${text.trim()}`);
            }
          } catch (error) {
            kValues[`k${i + 1}`] = '';
          }
        } else {
          kValues[`k${i + 1}`] = '';
        }
      }
      
    } catch (error) {
      console.log(`❌ Error working with iframe: ${error.message}`);
      // Fill with empty values (same as Python)
      for (let i = 1; i <= 10; i++) {
        kValues[`k${i}`] = '';
      }
    }
    
  } catch (error) {
    console.log(`❌ Error in extractSurfaceKeywords: ${error.message}`);
    // Fill with empty values (same as Python)
    for (let i = 1; i <= 10; i++) {
      kValues[`k${i}`] = '';
    }
  }
  
  // Collect span keywords into one string separated by commas (exact Python logic)
  const spanKeywordsList = [];
  for (let i = 1; i <= 10; i++) {
    const value = kValues[`k${i}`] || '';
    if (value.trim()) {
      spanKeywordsList.push(value.trim());
    }
  }
  
  const keywordsSpanString = spanKeywordsList.join(', ');
  
  if (keywordsSpanString) {
    console.log(`✅ Surface keywords result: ${keywordsSpanString}`);
  } else {
    console.log('❌ No surface keywords found');
  }
  
  return keywordsSpanString;
}

/**
 * Process single URL (equivalent to Python process_url method)
 */
async function processUrl(url, parserCountry = 'Unknown') {
  console.log(`\n🚀 Processing: ${url}`);
  const startTime = Date.now();
  
  // Browser configuration (same as your Python args)
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--memory-pressure-off',
      '--max-old-space-size=512',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // Speed up loading
    ]
  });
  
  let page;
  
  try {
    page = await browser.newPage();
    
    // Set user agent (same as Python)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport (same as Python)
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set timeout (15 seconds like Python BROWSER_TIMEOUT)
    page.setDefaultTimeout(15000);
    
    // Load the page with timeout (same as Python)
    try {
      console.log('📄 Loading page...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      await page.waitForTimeout(2000);
      console.log('✅ Page loaded successfully');
    } catch (timeoutError) {
      console.log(`⏰ Timeout loading URL ${url}: ${timeoutError.message}`);
      return {
        scraped_keywords: '',
        surface_keywords: '',
        success: false,
        error: 'Timeout loading page',
        processing_time_ms: Date.now() - startTime
      };
    }
    
    try {
      // Get original keywords from HTML (same as Python)
      console.log('📊 Getting page source...');
      const pageSource = await page.content();
      let keywordsOriginal = extractKeywordsFromHtml(pageSource);
      
      // Get span keywords (same as Python EXTENDED_MODE)
      let keywordsSpanString = await extractSurfaceKeywords(page);
      
      // If nothing found - try cookies (same as Python logic)
      if (!keywordsOriginal && !keywordsSpanString) {
        console.log('🔄 No keywords found, trying cookie acceptance...');
        await acceptCookies(page);
        await page.waitForTimeout(2000);
        
        // Try again after accepting cookies
        const newPageSource = await page.content();
        keywordsOriginal = extractKeywordsFromHtml(newPageSource);
        keywordsSpanString = await extractSurfaceKeywords(page);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Log results (same as Python)
      if (keywordsOriginal) {
        console.log(`✅ Found scraped keywords: ${keywordsOriginal.substring(0, 100)}...`);
      }
      if (keywordsSpanString) {
        console.log(`✅ Found surface keywords: ${keywordsSpanString.substring(0, 100)}...`);
      }
      
      if (!keywordsOriginal && !keywordsSpanString) {
        console.log(`❌ No keywords found for URL: ${url}`);
      }
      
      console.log(`⏱️ Processing completed in ${processingTime}ms`);
      
      return {
        scraped_keywords: keywordsOriginal || '',
        surface_keywords: keywordsSpanString || '',
        success: true,
        error: '',
        processing_time_ms: processingTime
      };
      
    } catch (innerError) {
      console.log(`❌ Error extracting keywords: ${innerError.message}`);
      return {
        scraped_keywords: '',
        surface_keywords: '',
        success: false,
        error: innerError.message,
        processing_time_ms: Date.now() - startTime
      };
    }
    
  } catch (error) {
    console.log(`❌ General error processing URL: ${error.message}`);
    return {
      scraped_keywords: '',
      surface_keywords: '',
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  } finally {
    if (page) await page.close();
    await browser.close();
    console.log('🧹 Browser closed');
  }
}

module.exports = { processUrl };
