const cheerio = require('cheerio');

/**
 * Scrape favicon from a website URL
 * @param {string} url - The website URL to scrape favicon from
 * @returns {Promise<string|null>} - The favicon URL or null if not found
 */
const getFavicon = async (url) => {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    // Fetch the webpage
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${fullUrl}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try different favicon selectors in order of preference
    let favicon = 
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      $('link[rel="apple-touch-icon-precomposed"]').attr('href') ||
      $('link[rel="mask-icon"]').attr('href');

    // If no favicon found in link tags, try meta tags
    if (!favicon) {
      favicon = $('meta[property="og:image"]').attr('content');
    }

    // If still no favicon, try common favicon paths
    if (!favicon) {
      const { origin } = new URL(fullUrl);
      const commonPaths = [
        '/favicon.ico',
        '/favicon.png',
        '/apple-touch-icon.png',
        '/apple-touch-icon-precomposed.png'
      ];

      // Test each common path (we'll just return the first one for now)
      favicon = origin + commonPaths[0];
    }

    // Handle relative paths and protocol-relative URLs
    if (favicon && !favicon.startsWith('http')) {
      try {
        const { origin, protocol } = new URL(fullUrl);
        
        if (favicon.startsWith('//')) {
          // Protocol-relative URL (e.g., //ssl.gstatic.com/...)
          favicon = protocol + favicon;
        } else if (favicon.startsWith('/')) {
          // Absolute path (e.g., /favicon.ico)
          favicon = origin + favicon;
        } else {
          // Relative path (e.g., favicon.ico)
          favicon = origin + '/' + favicon;
        }
      } catch (e) {
        console.log('Error parsing URL for relative favicon:', e.message);
        return null;
      }
    }

    return favicon;
  } catch (error) {
    console.log('Error scraping favicon:', error.message);
    return null;
  }
};

/**
 * Get favicon with fallback to default
 * @param {string} url - The website URL
 * @returns {Promise<string>} - The favicon URL or a default favicon
 */
const getFaviconWithFallback = async (url) => {
  const favicon = await getFavicon(url);
  
  if (favicon) {
    return favicon;
  }

  // Return a default favicon or the domain's favicon.ico
  try {
    const { origin } = new URL(url.startsWith('http') ? url : 'https://' + url);
    return `${origin}/favicon.ico`;
  } catch (e) {
    return 'https://via.placeholder.com/32x32/cccccc/666666?text=?';
  }
};

module.exports = {
  getFavicon,
  getFaviconWithFallback,
};
