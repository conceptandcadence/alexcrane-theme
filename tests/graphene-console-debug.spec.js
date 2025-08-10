import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Console Debug Test', () => {
  test('check console messages and script execution', async ({ page }) => {
    const consoleMessages = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('=== CONSOLE DEBUG VERIFICATION ===');

    // Wait for GrapheneHC and scripts to load
    await page.waitForTimeout(10000);

    // Check if our debug messages appear
    const carouselMessages = consoleMessages.filter(
      (msg) => msg.includes('🎠') || msg.includes('GrapheneHC'),
    );
    console.log('\n=== CAROUSEL CONSOLE MESSAGES ===');
    carouselMessages.forEach((msg) => console.log(msg));

    // Check if Swiper is available
    const swiperStatus = await page.evaluate(() => {
      return {
        swiperDefined: typeof window.Swiper !== 'undefined',
        swiperConstructor: window.Swiper ? 'available' : 'not available',
        carouselManager: typeof window.GrapheneCarouselManager !== 'undefined',
      };
    });
    console.log('\n=== SCRIPT STATUS ===');
    console.log(`Swiper Defined: ${swiperStatus.swiperDefined}`);
    console.log(`Swiper Constructor: ${swiperStatus.swiperConstructor}`);
    console.log(`Carousel Manager: ${swiperStatus.carouselManager}`);

    // Check DOM elements
    const domStatus = await page.evaluate(() => {
      return {
        cardWrappers: document.querySelectorAll('.card-wrapper').length,
        cards: document.querySelectorAll('.card').length,
        carousels: document.querySelectorAll('.card-media-carousel').length,
        swipers: document.querySelectorAll('.swiper').length,
        swiperScripts: document.querySelectorAll('script[src*="swiper"]')
          .length,
        carouselScripts: document.querySelectorAll('script').length,
      };
    });
    console.log('\n=== DOM STATUS ===');
    Object.entries(domStatus).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // Print all console messages
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg) => console.log(msg));

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-console-debug.png',
      fullPage: true,
    });
    console.log(
      '\n📸 Screenshot saved to: test-results/graphene-console-debug.png',
    );

    // Test should pass if scripts are loading
    expect(domStatus.swiperScripts).toBeGreaterThan(0);
  });
});
