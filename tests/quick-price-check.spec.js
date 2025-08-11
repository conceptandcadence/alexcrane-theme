import { test, expect } from '@playwright/test';

test.describe('Quick Price Check', () => {
  test('check price display with debug info', async ({ page }) => {
    console.log('🔍 Starting price debug test...');

    // Navigate to collection page
    await page.goto('https://alexcrane.co/collections/bestsellers/men', {
      waitUntil: 'networkidle',
    });

    // Wait a bit for content to load
    await page.waitForTimeout(3000);

    console.log('📄 Page loaded, looking for debug info...');

    // Look for debug info elements
    const debugElements = await page.locator('[style*="color: red"]').all();
    console.log(`Found ${debugElements.length} debug elements`);

    // Get debug info from first few products
    for (let i = 0; i < Math.min(3, debugElements.length); i++) {
      const debugText = await debugElements[i].textContent();
      console.log(`Debug ${i + 1}: ${debugText}`);
    }

    // Check if price elements exist
    const priceElements = await page.locator('.price').all();
    console.log(`Found ${priceElements.length} price elements`);

    // Get text content of first few price elements
    for (let i = 0; i < Math.min(3, priceElements.length); i++) {
      const priceText = await priceElements[i].textContent();
      console.log(`Price ${i + 1}: "${priceText}"`);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/quick-price-check.png' });
    console.log('📸 Screenshot saved: test-results/quick-price-check.png');
  });
});
