import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Grid Structure Test', () => {
  test('verify GrapheneHC uses proper Dawn theme grid hierarchy', async ({
    page,
  }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('=== GRID STRUCTURE VERIFICATION ===');

    // Wait for GrapheneHC to load content
    await page.waitForTimeout(5000);

    // Check for proper grid container
    const productGrid = await page.locator('#product-grid').count();
    console.log(`Product Grid Container: ${productGrid}`);

    // Check for grid classes
    const gridClasses = await page.locator('.grid.product-grid').count();
    console.log(`Grid with proper classes: ${gridClasses}`);

    // Check for grid items (li elements)
    const gridItems = await page.locator('.grid__item').count();
    console.log(`Grid Items (.grid__item): ${gridItems}`);

    // Check for cards inside grid items
    const cardsInGridItems = await page.locator('.grid__item .card').count();
    console.log(`Cards inside Grid Items: ${cardsInGridItems}`);

    // Check for scroll-trigger animation classes
    const animationItems = await page
      .locator('.scroll-trigger.animate--slide-in')
      .count();
    console.log(`Animation Items: ${animationItems}`);

    // Check if grid items have proper data attributes
    const cascadeItems = await page.locator('[data-cascade]').count();
    console.log(`Cascade Animation Items: ${cascadeItems}`);

    // Check for animation order styles
    const animationOrderItems = await page
      .locator('[style*="--animation-order"]')
      .count();
    console.log(`Animation Order Items: ${animationOrderItems}`);

    // Verify grid structure hierarchy
    if (gridItems > 0) {
      console.log('\n=== VERIFYING GRID HIERARCHY ===');

      const firstGridItem = page.locator('.grid__item').first();

      // Check if grid item contains a card
      const hasCard = (await firstGridItem.locator('.card').count()) > 0;
      console.log(`First grid item contains card: ${hasCard}`);

      // Check if card contains card__inner
      const hasCardInner =
        (await firstGridItem.locator('.card .card__inner').count()) > 0;
      console.log(`Card contains card__inner: ${hasCardInner}`);

      // Check if card__inner contains card__media
      const hasCardMedia =
        (await firstGridItem
          .locator('.card .card__inner .card__media')
          .count()) > 0;
      console.log(`Card__inner contains card__media: ${hasCardMedia}`);

      // Check if there's card__content
      const hasCardContent =
        (await firstGridItem.locator('.card .card__content').count()) > 0;
      console.log(`Card contains card__content: ${hasCardContent}`);

      // Get classes of first grid item
      const gridItemClasses = await firstGridItem.getAttribute('class');
      console.log(`First grid item classes: "${gridItemClasses}"`);

      // Get animation order style
      const animationOrderStyle = await firstGridItem.getAttribute('style');
      console.log(`Animation order style: "${animationOrderStyle}"`);
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-grid-structure.png',
      fullPage: true,
    });
    console.log(
      '📸 Screenshot saved to: test-results/graphene-grid-structure.png',
    );

    // Test should pass if we have proper grid structure
    expect(productGrid).toBeGreaterThan(0);
    expect(gridItems).toBeGreaterThan(0);
    expect(cardsInGridItems).toBeGreaterThan(0);
  });
});
