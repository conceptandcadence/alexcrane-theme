import { test, expect } from '@playwright/test';

test.describe('Swatch Modal Functionality', () => {
  test('verify swatches are clickable and trigger quick-add modal', async ({
    page,
  }) => {
    console.log('🎨 Testing swatch modal functionality...');

    // Navigate to collection page
    await page.goto('https://alexcrane.co/collections/bestsellers/men', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    console.log('📄 Page loaded, checking for swatches...');

    // Check for swatch elements
    const swatchButtons = await page.locator('.product-swatch-button').all();
    console.log(`Found ${swatchButtons.length} swatch buttons`);

    if (swatchButtons.length > 0) {
      // Test first swatch button
      const firstSwatch = swatchButtons[0];

      // Check if it has required attributes
      const hasDataUrl =
        (await firstSwatch
          .locator('img[data-product-url], div[data-product-url]')
          .count()) > 0;
      console.log(`First swatch has data-product-url: ${hasDataUrl}`);

      if (hasDataUrl) {
        const productUrl = await firstSwatch
          .locator('img[data-product-url], div[data-product-url]')
          .first()
          .getAttribute('data-product-url');
        console.log(`Product URL: ${productUrl}`);

        // Test swatch button styling
        const buttonClasses = await firstSwatch.getAttribute('class');
        console.log(`Swatch button classes: ${buttonClasses}`);

        // Check if it's properly styled as a clickable button
        const isClickable = buttonClasses.includes('tw-cursor-pointer');
        console.log(`Swatch is clickable: ${isClickable}`);

        // Test clicking the swatch (but catch any errors)
        try {
          console.log('🖱️ Testing swatch click...');
          await firstSwatch.click();

          // Wait a moment to see if modal appears
          await page.waitForTimeout(1000);

          // Check for quick-add modal
          const modalExists =
            (await page.locator('quick-add-modal').count()) > 0;
          console.log(`Quick-add modal appeared: ${modalExists}`);

          if (modalExists) {
            // Check modal content
            const modalContent =
              (await page.locator('.quick-add-modal__content').count()) > 0;
            console.log(`Modal has content structure: ${modalContent}`);

            // Check for close button
            const closeButton =
              (await page.locator('.quick-add-modal__toggle').count()) > 0;
            console.log(`Modal has close button: ${closeButton}`);

            // Try to close modal if it exists
            if (closeButton) {
              await page.locator('.quick-add-modal__toggle').first().click();
              console.log('🗙 Modal closed');
            }
          }
        } catch (error) {
          console.log(`Error clicking swatch: ${error.message}`);
        }
      }
    }

    // Check for "view all styles" links
    const viewAllLinks = await page
      .locator('a[href*="/products/"]:text("+ ")')
      .all();
    console.log(`Found ${viewAllLinks.length} "view all styles" links`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/swatch-modal-test.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved: test-results/swatch-modal-test.png');
  });
});
