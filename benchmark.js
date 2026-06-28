import puppeteer from 'puppeteer';

const RUNS = 5;
const URLS = [
  'http://127.0.0.1:4173/', // Attendance (default tab now)
  'http://127.0.0.1:4173/admin-portal-floww-security' // Admin portal
];

async function measurePageLoad(browser, url) {
  const page = await browser.newPage();
  
  // Navigate and wait for DOMContentLoaded
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait a bit for React to hydrate and metrics to settle
  await new Promise(r => setTimeout(r, 500));
  
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );
  
  await page.close();
  
  const loadTime = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
  return loadTime;
}

async function runBenchmark() {
  console.log('Starting Performance Benchmark...');
  console.log(`Test conditions: ${RUNS} runs per route on cached PWA build.\n`);
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  
  // Warm up cache for PWA
  console.log('Warming up Service Worker cache...');
  const warmupPage = await browser.newPage();
  await warmupPage.goto(URLS[0], { waitUntil: 'networkidle0' });
  await warmupPage.goto(URLS[1], { waitUntil: 'networkidle0' });
  await warmupPage.close();
  
  for (const url of URLS) {
    console.log(`\nBenchmarking: ${url}`);
    let totalTime = 0;
    
    for (let i = 1; i <= RUNS; i++) {
      const time = await measurePageLoad(browser, url);
      console.log(`  Run ${i}: ${time}ms`);
      totalTime += time;
    }
    
    console.log(`  => Average DOMContentLoaded Time: ${(totalTime / RUNS).toFixed(2)}ms`);
  }
  
  await browser.close();
  console.log('\nBenchmark Complete.');
}

runBenchmark().catch(console.error);
