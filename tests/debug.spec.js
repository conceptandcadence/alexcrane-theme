const { test, expect } = require('@playwright/test');

test.describe('Debug Development Theme', () => {
  test('inspect page structure and scripts', async ({ page }) => {
    // Navigate to the collection page
    await page.goto('/collections/bestsellers/men');

    console.log('=== PAGE DEBUG INFO ===');

    // Check page title
    const title = await page.title();
    console.log('Page Title:', title);

    // Check if page loaded successfully
    const url = page.url();
    console.log('Current URL:', url);

    // Look for Swiper script tags
    const swiperScripts = await page.$$eval('script', (scripts) =>
      scripts
        .filter((script) => script.src && script.src.includes('swiper'))
        .map((script) => script.src),
    );
    console.log('Swiper Scripts Found:', swiperScripts);

    // Check if Swiper is available in window
    const swiperGlobal = await page.evaluate(() => {
      return {
        swiperDefined: typeof window.Swiper !== 'undefined',
        swiperVersion: window.Swiper ? window.Swiper.version : 'not found',
      };
    });
    console.log('Swiper Global:', swiperGlobal);

    // Look for our custom carousel scripts
    const carouselScripts = await page.$$eval('script', (scripts) =>
      scripts
        .filter(
          (script) =>
            script.src &&
            (script.src.includes('card-media-carousel') ||
              script.src.includes('modal-media-carousel') ||
              script.src.includes('swatch-quick-add')),
        )
        .map((script) => script.src),
    );
    console.log('Carousel Scripts Found:', carouselScripts);

    // Look for product card elements with various selectors
    const cardSelectors = [
      '.card-wrapper',
      '.card',
      '.product-card',
      '.grid-product',
      '.product-item',
      '.product',
      '[data-product-id]',
    ];

    console.log('=== PRODUCT CARD SEARCH ===');
    for (const selector of cardSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} elements with: ${selector}`);

        // Get the first element's class list
        const classList = await page
          .locator(selector)
          .first()
          .evaluate((el) => el.className);
        console.log(`   First element classes: "${classList}"`);
      } else {
        console.log(`❌ No elements found with: ${selector}`);
      }
    }

    // Look for swatch buttons
    const swatchSelectors = [
      '.product-swatch-button',
      '.swatch',
      '.color-swatch',
      '.variant-swatch',
      '[data-product-url]',
    ];

    console.log('=== SWATCH BUTTON SEARCH ===');
    for (const selector of swatchSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} swatch elements with: ${selector}`);
      } else {
        console.log(`❌ No swatch elements found with: ${selector}`);
      }
    }

    // Look for carousel-related elements
    const carouselSelectors = [
      '.card-media-carousel',
      '.swiper',
      '.slider',
      '.media-carousel',
    ];

    console.log('=== CAROUSEL ELEMENT SEARCH ===');
    for (const selector of carouselSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} carousel elements with: ${selector}`);
      } else {
        console.log(`❌ No carousel elements found with: ${selector}`);
      }
    }

    // Take a screenshot for visual inspection
    await page.screenshot({
      path: 'test-results/debug-collection-page.png',
      fullPage: true,
    });
    console.log(
      '📸 Screenshot saved to: test-results/debug-collection-page.png',
    );

    // Log some DOM structure
    const bodyHtml = await page.locator('body').innerHTML();
    const productSection = bodyHtml.match(/<[^>]*product[^>]*>/gi) || [];
    console.log('=== PRODUCT-RELATED ELEMENTS ===');
    productSection.slice(0, 5).forEach((element, index) => {
      console.log(`${index + 1}. ${element}`);
    });

    // This test always passes - it's just for debugging
    expect(true).toBe(true);
  });
});
