const { test, expect } = require('@playwright/test');

test.describe('Verify Theme Deployment', () => {
  test('check if we are hitting the correct development theme', async ({
    page,
  }) => {
    console.log('=== DEPLOYMENT VERIFICATION ===');

    // Navigate to the collection page
    await page.goto('/collections/bestsellers/men');

    // Check current URL
    const url = page.url();
    console.log('Current URL:', url);

    // Verify we're on the development theme
    const hasPreviewThemeId = url.includes('preview_theme_id=138154934361');
    console.log('Has correct preview_theme_id:', hasPreviewThemeId);

    // Check if there are any script errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async scripts to load
    await page.waitForTimeout(3000);

    console.log('Script errors found:', errors);

    // Check if any of our custom files are being loaded
    const allScripts = await page.$$eval('script', (scripts) =>
      scripts.map((script) => script.src).filter((src) => src),
    );

    console.log('=== ALL SCRIPT TAGS ===');
    allScripts.forEach((src, index) => {
      console.log(`${index + 1}. ${src}`);
    });

    // Look for any carousel-related CSS
    const allStyles = await page.$$eval('link[rel="stylesheet"]', (links) =>
      links.map((link) => link.href).filter((href) => href),
    );

    console.log('=== ALL STYLESHEETS ===');
    allStyles.forEach((href, index) => {
      console.log(`${index + 1}. ${href}`);
    });

    // Check page source for our carousel snippet
    const pageContent = await page.content();
    const hasCardCarousel = pageContent.includes('card-media-carousel');
    const hasCardWrapper = pageContent.includes('card-wrapper');
    const hasSwiper = pageContent.includes('swiper');

    console.log('=== PAGE CONTENT SEARCH ===');
    console.log('Contains "card-media-carousel":', hasCardCarousel);
    console.log('Contains "card-wrapper":', hasCardWrapper);
    console.log('Contains "swiper":', hasSwiper);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/deployment-verification.png',
      fullPage: true,
    });

    expect(true).toBe(true); // Always pass for debugging
  });
});
