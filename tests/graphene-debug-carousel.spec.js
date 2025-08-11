const { test, expect } = require('@playwright/test');

test.describe('GrapheneHC Carousel Debug', () => {
  test('debug carousel images and quick-add', async ({ page }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      'https://alexcrane.co/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait a bit for content to load
    await page.waitForTimeout(3000);

    console.log('=== DEBUGGING CAROUSEL IMAGES ===');

    // Check if products are loading
    const products = await page.locator('.card').count();
    console.log(`Found ${products} product cards`);

    if (products > 0) {
      // Check the first product card
      const firstCard = page.locator('.card').first();

      // Check for media elements
      const mediaContainer = firstCard.locator('.card__media');
      const hasMedia = (await mediaContainer.count()) > 0;
      console.log(`First card has media container: ${hasMedia}`);

      if (hasMedia) {
        // Check for carousel structure
        const carouselContainer = mediaContainer.locator(
          '.card-media-carousel',
        );
        const hasCarousel = (await carouselContainer.count()) > 0;
        console.log(`Has carousel container: ${hasCarousel}`);

        // Check for images
        const images = await mediaContainer.locator('img').count();
        console.log(`Found ${images} images in first card`);

        // Check image sources
        const imgElements = await mediaContainer.locator('img').all();
        for (let i = 0; i < Math.min(imgElements.length, 3); i++) {
          const src = await imgElements[i].getAttribute('src');
          const srcset = await imgElements[i].getAttribute('srcset');
          console.log(
            `Image ${i + 1} src: ${src ? src.substring(0, 100) : 'null'}`,
          );
          console.log(
            `Image ${i + 1} srcset: ${
              srcset ? srcset.substring(0, 100) : 'null'
            }`,
          );
        }

        // Check for carousel navigation
        const navButtons = await carouselContainer
          .locator('.card-slider-button')
          .count();
        console.log(`Found ${navButtons} navigation buttons`);

        const dots = await carouselContainer
          .locator('.card-slider-dot')
          .count();
        console.log(`Found ${dots} navigation dots`);
      }

      // Check for quick-add button
      const quickAddBtn = await firstCard.locator('.card__quick-add').count();
      console.log(`Found ${quickAddBtn} quick-add containers`);

      if (quickAddBtn > 0) {
        const quickAddButton = firstCard.locator('.card__quick-add button');
        const buttonCount = await quickAddButton.count();
        console.log(`Found ${buttonCount} quick-add buttons`);

        if (buttonCount > 0) {
          const buttonText = await quickAddButton.first().textContent();
          const productUrl = await quickAddButton
            .first()
            .getAttribute('data-product-url');
          console.log(`Quick-add button text: "${buttonText?.trim()}"`);
          console.log(`Product URL: ${productUrl}`);
        }
      }

      // Check for swatches
      const swatches = await firstCard
        .locator('.product-swatch-button')
        .count();
      console.log(`Found ${swatches} product swatches`);
    }

    // Check JavaScript console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(`ERROR: ${msg.text()}`);
      } else if (
        msg.text().includes('carousel') ||
        msg.text().includes('Swiper') ||
        msg.text().includes('🎠')
      ) {
        consoleMessages.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    await page.waitForTimeout(2000);

    console.log('=== CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg) => console.log(msg));

    // Check if Swiper is loaded
    const swiperLoaded = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined';
    });
    console.log(`Swiper loaded: ${swiperLoaded}`);

    // Check if GrapheneCarouselManager exists
    const carouselManagerExists = await page.evaluate(() => {
      return typeof window.GrapheneCarouselManager !== 'undefined';
    });
    console.log(`GrapheneCarouselManager exists: ${carouselManagerExists}`);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-carousel.png', fullPage: true });
    console.log('Screenshot saved as debug-carousel.png');
  });
});
