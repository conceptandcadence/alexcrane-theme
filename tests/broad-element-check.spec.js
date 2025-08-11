import { test, expect } from '@playwright/test';

test.describe('Broad Element Check', () => {
  test('check what elements actually exist on page', async ({ page }) => {
    console.log('🔍 Starting broad element check...');

    // Navigate to collection page
    await page.goto('https://alexcrane.co/collections/bestsellers/men', {
      waitUntil: 'networkidle',
    });

    // Wait a bit for content to load
    await page.waitForTimeout(5000);

    console.log('📄 Page loaded, checking elements...');

    // Check for various product-related elements
    const selectors = [
      '.card-wrapper',
      '.card',
      '.price',
      '.product-card',
      '[data-product-id]',
      '.grid',
      '#product-grid',
      '.card__content',
      '.card__information',
      '.card__heading',
      '[style*="color: red"]',
      '[style*="background: #ffe"]',
    ];

    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      console.log(`${selector}: ${elements.length} found`);

      if (elements.length > 0 && elements.length < 5) {
        // Get text content for small numbers of elements
        for (let i = 0; i < elements.length; i++) {
          const text = await elements[i]
            .textContent()
            .catch(() => 'Error getting text');
          console.log(`  ${i + 1}: "${text.substring(0, 100)}..."`);
        }
      }
    }

    // Check page source for GrapheneHC indicators
    const content = await page.content();
    const hasGrapheneHC =
      content.includes('GrapheneHC') || content.includes('graphenehc');
    const hasResults =
      content.includes('#Results') || content.includes('results');
    const hasPLP =
      content.includes('plp_products') || content.includes('plp-products');

    console.log(`Page indicators:`);
    console.log(`  Contains GrapheneHC: ${hasGrapheneHC}`);
    console.log(`  Contains Results: ${hasResults}`);
    console.log(`  Contains PLP: ${hasPLP}`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/broad-element-check.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved: test-results/broad-element-check.png');
  });
});
