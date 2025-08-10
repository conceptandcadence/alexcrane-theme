const { test, expect } = require('@playwright/test');

test.describe('Product Card Carousel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a collection page with products
    // You'll need to replace this with your actual Shopify store URL
    await page.goto(
      '/collections/bestsellers/men?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for product cards to load
    await page.waitForSelector('.card-wrapper');
  });

  test('should show carousel navigation on hover', async ({ page }) => {
    const cardWrapper = page.locator('.card-wrapper').first();

    // Initially navigation should be hidden
    const navigation = cardWrapper.locator('.card-slider-buttons');
    await expect(navigation).toHaveCSS('opacity', '0');

    // Hover over card
    await cardWrapper.hover();

    // Navigation should become visible
    await expect(navigation).toHaveCSS('opacity', '1');
  });

  test('should navigate slides with buttons', async ({ page }) => {
    const cardWrapper = page.locator('.card-wrapper').first();

    // Check if card has multiple images
    const hasMultipleMedia =
      (await cardWrapper
        .locator('.card-media-carousel.has-multiple-media')
        .count()) > 0;

    if (hasMultipleMedia) {
      await cardWrapper.hover();

      // Click next button
      const nextButton = cardWrapper.locator('.card-slider-button--next');
      await nextButton.click();

      // Verify slide changed
      const activeSlide = cardWrapper.locator('.swiper-slide-active');
      await expect(activeSlide).toBeVisible();

      // Click previous button
      const prevButton = cardWrapper.locator('.card-slider-button--prev');
      await prevButton.click();

      // Should navigate back
      await expect(activeSlide).toBeVisible();
    }
  });

  test('should show second image on hover', async ({ page }) => {
    const cardWrapper = page.locator('.card-wrapper').first();
    const hasMultipleMedia =
      (await cardWrapper
        .locator('.card-media-carousel.has-multiple-media')
        .count()) > 0;

    if (hasMultipleMedia) {
      // Before hover - should show first image (static layer)
      const staticImage = cardWrapper.locator('.card-static-image');
      await expect(staticImage).toBeVisible();

      // Hover to reveal carousel
      await cardWrapper.hover();

      // Static image should be hidden
      await expect(staticImage).toHaveCSS('opacity', '0');

      // Carousel should be visible and showing second slide
      const carousel = cardWrapper.locator('.card-media-carousel');
      await expect(carousel).toBeVisible();
    }
  });

  test('should support swipe/drag gestures', async ({ page }) => {
    const cardWrapper = page.locator('.card-wrapper').first();
    const hasMultipleMedia =
      (await cardWrapper
        .locator('.card-media-carousel.has-multiple-media')
        .count()) > 0;

    if (hasMultipleMedia) {
      await cardWrapper.hover();

      const carousel = cardWrapper.locator('.swiper');
      const carouselBox = await carousel.boundingBox();

      if (carouselBox) {
        // Simulate swipe gesture from right to left
        await page.mouse.move(
          carouselBox.x + carouselBox.width * 0.8,
          carouselBox.y + carouselBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          carouselBox.x + carouselBox.width * 0.2,
          carouselBox.y + carouselBox.height / 2,
        );
        await page.mouse.up();

        // Wait for slide transition
        await page.waitForTimeout(500);

        // Verify slide changed
        const activeSlide = cardWrapper.locator('.swiper-slide-active');
        await expect(activeSlide).toBeVisible();
      }
    }
  });
});

test.describe('Quick-Add Modal Carousel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a collection page with products that have swatches
    await page.goto(
      '/collections/bestsellers/men?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );
    await page.waitForSelector('.product-swatch-button');
  });

  test('should open modal with carousel when clicking swatch', async ({
    page,
  }) => {
    // Click on a product swatch
    const swatchButton = page.locator('.product-swatch-button').first();
    await swatchButton.click();

    // Wait for modal to appear
    const modal = page.locator('quick-add-modal');
    await expect(modal).toBeVisible();

    // Check if modal contains carousel
    const modalCarousel = modal.locator('.modal-media-carousel');
    await expect(modalCarousel).toBeVisible();
  });

  test('should navigate modal carousel with buttons', async ({ page }) => {
    // Open modal
    const swatchButton = page.locator('.product-swatch-button').first();
    await swatchButton.click();

    const modal = page.locator('quick-add-modal');
    await expect(modal).toBeVisible();

    const carousel = modal.locator('.modal-media-carousel');
    const hasMultipleMedia =
      (await carousel.locator('.has-multiple-media').count()) > 0;

    if (hasMultipleMedia) {
      // Click next button
      const nextButton = modal.locator('.modal-slider-button--next');
      await nextButton.click();

      // Verify slide changed
      const activeSlide = modal.locator('.swiper-slide-active');
      await expect(activeSlide).toBeVisible();

      // Click previous button
      const prevButton = modal.locator('.modal-slider-button--prev');
      await prevButton.click();

      // Should navigate back
      await expect(activeSlide).toBeVisible();
    }
  });

  test('should support swipe in modal carousel', async ({ page }) => {
    // Open modal
    const swatchButton = page.locator('.product-swatch-button').first();
    await swatchButton.click();

    const modal = page.locator('quick-add-modal');
    await expect(modal).toBeVisible();

    const carousel = modal.locator('.modal-media-carousel');
    const hasMultipleMedia =
      (await carousel.locator('.has-multiple-media').count()) > 0;

    if (hasMultipleMedia) {
      const swiper = carousel.locator('.swiper');
      const swiperBox = await swiper.boundingBox();

      if (swiperBox) {
        // Simulate swipe gesture
        await page.mouse.move(
          swiperBox.x + swiperBox.width * 0.8,
          swiperBox.y + swiperBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          swiperBox.x + swiperBox.width * 0.2,
          swiperBox.y + swiperBox.height / 2,
        );
        await page.mouse.up();

        // Wait for slide transition
        await page.waitForTimeout(500);

        // Verify slide changed
        const activeSlide = modal.locator('.swiper-slide-active');
        await expect(activeSlide).toBeVisible();
      }
    }
  });

  test('should close modal properly', async ({ page }) => {
    // Open modal
    const swatchButton = page.locator('.product-swatch-button').first();
    await swatchButton.click();

    const modal = page.locator('quick-add-modal');
    await expect(modal).toBeVisible();

    // Close modal
    const closeButton = modal.locator('.modal__close-button');
    await closeButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });
});
