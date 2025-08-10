import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Carousel Test', () => {
  test('verify GrapheneHC carousel on merchandising testing page', async ({
    page,
  }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('=== GRAPHENE CAROUSEL VERIFICATION ===');

    // Check page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`Page Title: ${title}`);
    console.log(`Current URL: ${url}`);

    // Check for any Liquid errors
    const pageContent = await page.content();
    const hasLiquidError = pageContent.includes('Error in tag');
    console.log(`Has Liquid Error: ${hasLiquidError}`);

    if (hasLiquidError) {
      const errorMatch = pageContent.match(/Error in tag[^<]*/);
      if (errorMatch) {
        console.log(`Error Details: ${errorMatch[0]}`);
      }
    }

    // Wait for GrapheneHC to load content
    await page.waitForTimeout(3000);

    // Check for Swiper.js loading
    const swiperLoaded = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined';
    });
    console.log(`Swiper.js Loaded: ${swiperLoaded}`);

    // Look for GrapheneHC product items (updated to new card structure)
    const cardItems = await page.locator('.card').count();
    const cardWrappers = await page.locator('.card-wrapper').count();
    console.log(`GrapheneHC Card Items (.card): ${cardItems}`);
    console.log(`GrapheneHC Card Wrappers (.card-wrapper): ${cardWrappers}`);

    // Look for carousel elements
    const carouselElements = await page.locator('.card-media-carousel').count();
    console.log(
      `Carousel Elements (.card-media-carousel): ${carouselElements}`,
    );

    // Look for swiper elements
    const swiperElements = await page.locator('.swiper').count();
    console.log(`Swiper Elements (.swiper): ${swiperElements}`);

    // Look for multiple media carousels
    const multipleMediaCarousels = await page
      .locator('.card-media-carousel.has-multiple-media')
      .count();
    console.log(`Multiple Media Carousels: ${multipleMediaCarousels}`);

    // Check for navigation buttons
    const navButtons = await page.locator('.card-slider-button').count();
    console.log(`Navigation Buttons: ${navButtons}`);

    // Check for dots
    const dots = await page.locator('.card-slider-dot').count();
    console.log(`Dot Indicators: ${dots}`);

    // Check for GrapheneHC carousel manager
    const grapheneCarouselManager = await page.evaluate(() => {
      return typeof window.GrapheneCarouselManager !== 'undefined';
    });
    console.log(
      `GrapheneHC Carousel Manager Loaded: ${grapheneCarouselManager}`,
    );

    // Test hover on first product item (if any)
    const totalProducts = Math.max(cardItems, cardWrappers);
    if (totalProducts > 0) {
      console.log('\n=== TESTING HOVER INTERACTION ===');

      // Use .card if available, otherwise .card-wrapper
      const firstItem =
        cardItems > 0
          ? page.locator('.card').first()
          : page.locator('.card-wrapper').first();

      // Check if it has a carousel
      const hasCarousel =
        (await firstItem.locator('.card-media-carousel').count()) > 0;
      console.log(`First item has carousel: ${hasCarousel}`);

      if (hasCarousel) {
        // Test hover
        await firstItem.hover();
        console.log('✅ Hovered on first item');

        // Check if navigation becomes visible
        const navVisible = await firstItem
          .locator('.card-slider-button')
          .first()
          .isVisible();
        console.log(`Navigation visible on hover: ${navVisible}`);

        // Test clicking navigation if visible
        if (navVisible) {
          const nextButton = firstItem
            .locator('.card-slider-button--next')
            .first();
          if ((await nextButton.count()) > 0) {
            await nextButton.click();
            console.log('✅ Clicked next button');

            // Wait for slide transition
            await page.waitForTimeout(500);
            console.log('✅ Slide transition completed');
          }
        }
      }
    }

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/graphene-carousel-test.png',
      fullPage: true,
    });
    console.log(
      '📸 Screenshot saved to: test-results/graphene-carousel-test.png',
    );

    // The test should pass if we have products and no liquid errors
    expect(hasLiquidError).toBe(false);
    expect(totalProducts).toBeGreaterThan(0);
  });
});
