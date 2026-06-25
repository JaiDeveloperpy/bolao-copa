/**
 * Vercel Web Analytics for Vanilla JavaScript
 * This script initializes Vercel Analytics for static sites
 */

(function() {
  'use strict';

  // Check if we're in production (deployed on Vercel)
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';

  // Initialize Vercel Analytics
  function initAnalytics() {
    // Inject Vercel Analytics script
    const script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    
    script.onerror = function() {
      // Silent fail if analytics script is not available
      console.debug('Vercel Analytics not available');
    };

    document.head.appendChild(script);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }

  // Track Web Vitals (optional but recommended)
  function sendToAnalytics(metric) {
    const body = JSON.stringify(metric);
    const url = '/_vercel/insights/vitals';

    // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, { body, method: 'POST', keepalive: true });
    }
  }

  // Web Vitals tracking (optional)
  function trackWebVitals() {
    if (typeof webVitals !== 'undefined') {
      webVitals.onCLS(sendToAnalytics);
      webVitals.onFID(sendToAnalytics);
      webVitals.onLCP(sendToAnalytics);
      webVitals.onFCP(sendToAnalytics);
      webVitals.onTTFB(sendToAnalytics);
    }
  }

  // Call trackWebVitals when available
  if (window.webVitals) {
    trackWebVitals();
  }
})();
