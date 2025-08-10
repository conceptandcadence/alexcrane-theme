import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Swiper Debug Test', () => {
  test('debug Swiper.js loading in GrapheneHC', async ({ page }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('=== SWIPER DEBUG VERIFICATION ===');

    // Wait for GrapheneHC to load content
    await page.waitForTimeout(8000);

    // Check if Swiper CSS is loaded
    const swiperCSS = await page.locator('link[href*="swiper"]').count();
    console.log(`Swiper CSS Links: ${swiperCSS}`);

    // Check if Swiper JS is loaded
    const swiperJS = await page.locator('script[src*="swiper"]').count();
    console.log(`Swiper JS Scripts: ${swiperJS}`);

    // Check if Swiper is available in window
    const swiperGlobal = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined' ? 'loaded' : 'not loaded';
    });
    console.log(`Window.Swiper: ${swiperGlobal}`);

    // Check if our GrapheneCarouselManager is available
    const carouselManager = await page.evaluate(() => {
      return typeof window.GrapheneCarouselManager !== 'undefined'
        ? 'loaded'
        : 'not loaded';
    });
    console.log(`GrapheneCarouselManager: ${carouselManager}`);

    // Look for any errors in console
    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    // Trigger a page interaction to see if anything loads
    await page.hover('.card-wrapper');
    await page.waitForTimeout(2000);

    // Check for carousel instances
    const carouselInstances = await page.evaluate(() => {
      if (window.GrapheneCarouselManager) {
        return window.GrapheneCarouselManager.instances
          ? Object.keys(window.GrapheneCarouselManager.instances).length
          : 0;
      }
      return 0;
    });
    console.log(`Carousel Instances: ${carouselInstances}`);

    // Look for Swiper initialization
    const swiperInstances = await page.evaluate(() => {
      const swipers = document.querySelectorAll('.swiper');
      let initCount = 0;
      swipers.forEach((el) => {
        if (el.swiper) initCount++;
      });
      return {
        total: swipers.length,
        initialized: initCount,
      };
    });
    console.log(
      `Swiper Elements: ${swiperInstances.total}, Initialized: ${swiperInstances.initialized}`,
    );

    // Check for static images vs carousel visibility
    const staticImages = await page.locator('.card-media-static').count();
    const carousels = await page.locator('.card-slider').count();
    console.log(`Static Images: ${staticImages}, Carousels: ${carousels}`);

    // Check if hover reveals carousel
    const firstCard = page.locator('.card-wrapper').first();
    if ((await firstCard.count()) > 0) {
      await firstCard.hover();
      await page.waitForTimeout(1000);

      const carouselVisible = await firstCard
        .locator('.card-slider')
        .isVisible();
      const staticVisible = await firstCard
        .locator('.card-media-static')
        .isVisible();
      console.log(
        `After hover - Carousel visible: ${carouselVisible}, Static visible: ${staticVisible}`,
      );
    }

    // Print recent console messages
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.slice(-10).forEach((msg) => console.log(msg));

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-swiper-debug.png',
      fullPage: true,
    });
    console.log(
      '📸 Screenshot saved to: test-results/graphene-swiper-debug.png',
    );

    // Test should pass - this is just for debugging
    expect(swiperCSS).toBeGreaterThanOrEqual(0);
  });
});
