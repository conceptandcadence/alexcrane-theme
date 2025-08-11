import { test, expect } from '@playwright/test';

test.describe('Template Debug', () => {
  test('check if GrapheneHC template is rendering', async ({ page }) => {
    console.log('🔍 Checking if GrapheneHC template is rendering...');

    // Navigate to collection page
    await page.goto('https://alexcrane.co/collections/bestsellers/men', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for content to load
    await page.waitForTimeout(5000);

    console.log('📄 Page loaded, checking for debug elements...');

    // Look for our obvious debug element
    const grapheneDebug = await page
      .locator('div:text("GRAPHENE TEMPLATE IS WORKING")')
      .count();
    console.log(`Found GrapheneHC debug element: ${grapheneDebug > 0}`);

    // Look for any red debug elements
    const redElements = await page.locator('[style*="color: red"]').count();
    console.log(`Found red debug elements: ${redElements}`);

    // Look for any yellow background elements
    const yellowElements = await page
      .locator('[style*="background: yellow"]')
      .count();
    console.log(`Found yellow debug elements: ${yellowElements}`);

    // Check page source for our template content
    const content = await page.content();
    const hasGrapheneComment = content.includes('GRAPHENE TEMPLATE IS WORKING');
    const hasSwatchComment = content.includes('Product Swatches');

    console.log(`Page source contains GrapheneHC debug: ${hasGrapheneComment}`);
    console.log(`Page source contains swatch comment: ${hasSwatchComment}`);

    // Look for product grid
    const productGrids = await page
      .locator('#product-grid, .product-grid')
      .count();
    console.log(`Found product grids: ${productGrids}`);

    // Look for any cards
    const cards = await page
      .locator('.card-wrapper, .card, .product-card')
      .count();
    console.log(`Found card elements: ${cards}`);

    // Check for Results div (GrapheneHC indicator)
    const resultsDiv = await page.locator('#Results').count();
    console.log(`Found #Results div: ${resultsDiv}`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/template-debug.png',
      fullPage: true,
    });
    console.log('📸 Screenshot saved: test-results/template-debug.png');

    // Save page HTML for inspection
    const html = await page.content();
    require('fs').writeFileSync('test-results/page-source.html', html);
    console.log('💾 Page source saved: test-results/page-source.html');
  });
});
