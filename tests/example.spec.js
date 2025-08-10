const { test, expect } = require('@playwright/test');

test.describe('Basic Setup Test', () => {
  test('should load the collection page', async ({ page }) => {
    // Test the collection page that has our carousels
    await page.goto('/collections/bestsellers/men');

    // Check if page has a title
    await expect(page).toHaveTitle(/.*/);

    // Check if we can find typical Shopify elements
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Look for product cards
    const productCards = page.locator('.card-wrapper');
    await expect(productCards.first()).toBeVisible();
  });

  test('should have Swiper library loaded', async ({ page }) => {
    await page.goto('/collections/bestsellers/men');

    // Check if Swiper is available
    const swiperAvailable = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined';
    });

    expect(swiperAvailable).toBe(true);
  });
});
