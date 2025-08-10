import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Full Load Test', () => {
  test('wait for complete GrapheneHC carousel loading', async ({ page }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for initial page load
    await page.waitForLoadState('networkidle');

    console.log('=== WAITING FOR COMPLETE GRAPHENE LOADING ===');

    // Wait longer for GrapheneHC to fully load and initialize
    await page.waitForTimeout(8000);

    // Check if Swiper.js is now loaded
    const swiperLoaded = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined';
    });
    console.log(`Swiper.js Loaded (after wait): ${swiperLoaded}`);

    // Check if GrapheneHC carousel manager is loaded
    const grapheneCarouselManager = await page.evaluate(() => {
      return typeof window.GrapheneCarouselManager !== 'undefined';
    });
    console.log(
      `GrapheneHC Carousel Manager Loaded: ${grapheneCarouselManager}`,
    );

    // Count all elements again
    const cardItems = await page.locator('.card').count();
    const carouselElements = await page.locator('.card-media-carousel').count();
    const multipleMediaCarousels = await page
      .locator('.card-media-carousel.has-multiple-media')
      .count();
    const navButtons = await page.locator('.card-slider-button').count();

    console.log(`Cards: ${cardItems}`);
    console.log(`Carousels: ${carouselElements}`);
    console.log(`Multiple Media Carousels: ${multipleMediaCarousels}`);
    console.log(`Navigation Buttons: ${navButtons}`);

    // Test interaction with any available card
    if (cardItems > 0) {
      console.log('\n=== TESTING CARD INTERACTION ===');

      // Find a card with a carousel
      for (let i = 0; i < cardItems; i++) {
        const currentCard = page.locator('.card').nth(i);
        const hasCarousel =
          (await currentCard.locator('.card-media-carousel').count()) > 0;

        if (hasCarousel) {
          console.log(`Card ${i + 1} has carousel - testing...`);

          // Hover on the card
          await currentCard.hover();
          console.log('✅ Hovered on card');

          // Wait for hover effects
          await page.waitForTimeout(500);

          // Check if navigation is visible
          const navButton = currentCard.locator('.card-slider-button').first();
          if ((await navButton.count()) > 0) {
            const isVisible = await navButton.isVisible();
            console.log(`Navigation visible: ${isVisible}`);

            if (isVisible) {
              // Try clicking next button
              const nextBtn = currentCard.locator('.card-slider-button--next');
              if ((await nextBtn.count()) > 0) {
                await nextBtn.click();
                console.log('✅ Clicked next button');
                await page.waitForTimeout(1000);
              }
            }
          }
          break;
        }
      }
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/graphene-full-load-test.png',
      fullPage: true,
    });
    console.log('📸 Final screenshot saved');

    // Test should pass if we have cards
    expect(cardItems).toBeGreaterThan(0);
  });
});
