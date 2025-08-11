import { test, expect } from '@playwright/test';

test.describe('Price Display Debug', () => {
  test('examine price display logic on collection page', async ({ page }) => {
    // Navigate to collection page
    await page.goto('https://alexcrane.co/collections/bestsellers/men');

    // Wait for products to load
    await page.waitForSelector('.card-wrapper', { timeout: 10000 });

    console.log('=== PRICE DISPLAY DEBUG ===');

    // Find all product cards
    const productCards = await page.locator('.card-wrapper').all();
    console.log(`Found ${productCards.length} product cards`);

    // Examine first few product cards for price display
    for (let i = 0; i < Math.min(5, productCards.length); i++) {
      const card = productCards[i];

      console.log(`\n--- PRODUCT CARD ${i + 1} ---`);

      // Get debug info if available
      const debugInfo = await card
        .locator('[style*="color: red"]')
        .textContent()
        .catch(() => null);
      if (debugInfo) {
        console.log(`Debug Info: ${debugInfo.trim()}`);
      }

      // Get product title
      const title = await card
        .locator('.card__heading a, h3 a')
        .textContent()
        .catch(() => 'No title found');
      console.log(`Title: ${title}`);

      // Look for price elements
      const priceElements = await card.locator('.price').all();
      console.log(`Price containers found: ${priceElements.length}`);

      if (priceElements.length > 0) {
        const priceText = await priceElements[0].textContent();
        console.log(`Price text: "${priceText}"`);

        // Check for specific price classes
        const salePrice = await card
          .locator('.price__sale')
          .textContent()
          .catch(() => null);
        const regularPrice = await card
          .locator('.price__regular')
          .textContent()
          .catch(() => null);
        const discountPercentage = await card
          .locator('.discount-percentage')
          .textContent()
          .catch(() => null);

        console.log(`  Sale price: ${salePrice || 'Not found'}`);
        console.log(`  Regular price: ${regularPrice || 'Not found'}`);
        console.log(`  Discount: ${discountPercentage || 'Not found'}`);
      } else {
        console.log('  No price container found');
      }

      // Check if price div is empty or hidden
      const priceDiv = await card.locator('.price').first();
      if (priceDiv) {
        const isEmpty = await priceDiv.evaluate(
          (el) => el.textContent.trim() === '',
        );
        const isHidden = await priceDiv.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden';
        });
        console.log(`  Price div empty: ${isEmpty}`);
        console.log(`  Price div hidden: ${isHidden}`);
      }
    }

    // Take a screenshot for visual debugging
    await page.screenshot({
      path: 'test-results/price-debug.png',
      fullPage: true,
    });
    console.log('\n📸 Screenshot saved to: test-results/price-debug.png');
  });
});
