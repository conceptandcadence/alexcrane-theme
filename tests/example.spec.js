const { test, expect } = require('@playwright/test');

test.describe('Basic Setup Test', () => {
  test('should load the homepage', async ({ page }) => {
    // This is a basic test to verify Playwright is working
    // You'll need to replace with your actual Shopify store URL
    await page.goto('/');

    // Check if page has a title
    await expect(page).toHaveTitle(/.*/);

    // Check if we can find typical Shopify elements
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have Swiper library loaded', async ({ page }) => {
    await page.goto('/');

    // Check if Swiper is available
    const swiperAvailable = await page.evaluate(() => {
      return typeof window.Swiper !== 'undefined';
    });

    expect(swiperAvailable).toBe(true);
  });
});
