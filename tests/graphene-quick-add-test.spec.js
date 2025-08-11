const { test, expect } = require('@playwright/test');

test.describe('GrapheneHC Quick Add and Swatches Test', () => {
  test('verify quick-add button and product swatches functionality', async ({
    page,
  }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log('=== QUICK ADD & SWATCHES VERIFICATION ===');
    console.log(`Page Title: ${await page.title()}`);
    console.log(`Current URL: ${page.url()}`);

    // Check for quick-add elements
    const quickAddButtons = await page
      .locator('.card__quick-add .quick-add__submit')
      .count();
    const productSwatches = await page
      .locator('.product-swatch-button')
      .count();
    const swatchContainers = await page
      .locator('.card__swatch-container')
      .count();

    console.log(`Quick Add Buttons: ${quickAddButtons}`);
    console.log(`Product Swatch Buttons: ${productSwatches}`);
    console.log(`Swatch Containers: ${swatchContainers}`);

    // Check if swatch-quick-add.js is loaded
    const swatchScriptLoaded = await page.evaluate(() => {
      return (
        typeof window !== 'undefined' &&
        document.querySelector('script[src*="swatch-quick-add.js"]') !== null
      );
    });
    console.log(`Swatch Script Loaded: ${swatchScriptLoaded}`);

    // Test hover behavior on first product card
    const firstCard = page.locator('.card-wrapper').first();
    const firstQuickAdd = firstCard.locator('.card__quick-add');

    console.log('\n=== TESTING HOVER BEHAVIOR ===');

    // Check initial state (should be hidden)
    const initialOpacity = await firstQuickAdd.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    console.log(`Quick-add initial opacity: ${initialOpacity}`);

    // Hover over the card
    await firstCard.hover();
    await page.waitForTimeout(1000); // Wait for transition

    // Check hover state (should be visible)
    const hoverOpacity = await firstQuickAdd.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    console.log(`Quick-add hover opacity: ${hoverOpacity}`);

    // Test swatch button functionality if any swatches exist
    if (productSwatches > 0) {
      console.log('\n=== TESTING SWATCH FUNCTIONALITY ===');

      const firstSwatchButton = page.locator('.product-swatch-button').first();
      const swatchProductUrl = await firstSwatchButton
        .locator('img')
        .getAttribute('data-product-url');
      console.log(`First swatch product URL: ${swatchProductUrl}`);

      // Click the swatch button (should trigger quick-add modal)
      await firstSwatchButton.click();
      await page.waitForTimeout(2000); // Wait for modal to appear

      // Check if modal appeared
      const modalVisible = await page.locator('quick-add-modal').isVisible();
      console.log(
        `Quick-add modal visible after swatch click: ${modalVisible}`,
      );

      if (modalVisible) {
        // Check if modal has the carousel
        const modalCarousel = await page
          .locator('quick-add-modal .modal-media-carousel')
          .count();
        console.log(`Modal carousels found: ${modalCarousel}`);

        // Close the modal
        const closeButton = page.locator(
          'quick-add-modal .quick-add-modal__toggle',
        );
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Test direct quick-add button functionality
    if (quickAddButtons > 0) {
      console.log('\n=== TESTING QUICK-ADD BUTTON ===');

      // Find a card with variants (should have "Choose Options" button)
      const chooseOptionsButton = page
        .locator('.quick-add__submit:has-text("Choose Options")')
        .first();

      if (await chooseOptionsButton.isVisible()) {
        // Hover over the card to reveal the button
        const parentCard = chooseOptionsButton
          .locator('..')
          .locator('..')
          .locator('..');
        await parentCard.hover();
        await page.waitForTimeout(500);

        // Click the quick-add button
        await chooseOptionsButton.click();
        await page.waitForTimeout(2000);

        // Check if modal appeared
        const modalVisible = await page.locator('quick-add-modal').isVisible();
        console.log(
          `Quick-add modal visible after button click: ${modalVisible}`,
        );

        if (modalVisible) {
          // Close the modal
          const closeButton = page.locator(
            'quick-add-modal .quick-add-modal__toggle',
          );
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-quick-add-test.png',
      fullPage: true,
    });
    console.log(
      '\n📸 Screenshot saved to: test-results/graphene-quick-add-test.png',
    );

    // Test passes if we find the expected elements
    expect(quickAddButtons + productSwatches).toBeGreaterThan(0);
  });
});
