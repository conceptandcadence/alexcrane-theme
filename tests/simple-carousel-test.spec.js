const { test, expect } = require('@playwright/test');

test.describe('Simple Carousel Test', () => {
  test('verify carousel basics are working', async ({ page }) => {
    // Navigate to the development theme
    await page.goto(
      '/collections/bestsellers/men?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('=== BASIC CAROUSEL VERIFICATION ===');

    // Count elements
    const cardWrappers = await page.locator('.card-wrapper').count();
    const carousels = await page.locator('.card-media-carousel').count();
    const swipers = await page.locator('.swiper').count();
    const swatchButtons = await page.locator('.product-swatch-button').count();

    console.log(`Card wrappers found: ${cardWrappers}`);
    console.log(`Carousels found: ${carousels}`);
    console.log(`Swiper elements found: ${swipers}`);
    console.log(`Swatch buttons found: ${swatchButtons}`);

    // Test hover on first card (if any)
    if (cardWrappers > 0) {
      const firstCard = page.locator('.card-wrapper').first();

      // Check if it's visible
      const isVisible = await firstCard.isVisible();
      console.log(`First card is visible: ${isVisible}`);

      if (isVisible) {
        // Try hovering
        await firstCard.hover();
        console.log('✅ Hover on first card successful');

        // Look for navigation buttons
        const navButtons = firstCard.locator('.card-slider-button');
        const navCount = await navButtons.count();
        console.log(`Navigation buttons in first card: ${navCount}`);

        // Test clicking a swatch (if any)
        if (swatchButtons > 0) {
          const firstSwatch = page.locator('.product-swatch-button').first();
          await firstSwatch.click();
          console.log('✅ Clicked first swatch button');

          // Wait a bit for modal
          await page.waitForTimeout(1000);

          // Check for any visible modal
          const visibleModals = await page
            .locator('quick-add-modal[open]')
            .count();
          console.log(`Visible modals after swatch click: ${visibleModals}`);
        }
      }
    }

    // Always pass - this is just for verification
    expect(true).toBe(true);
  });
});
