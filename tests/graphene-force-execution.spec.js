import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Force Execution Test', () => {
  test('manually execute carousel script and catch errors', async ({
    page,
  }) => {
    const consoleMessages = [];
    const pageErrors = [];

    // Capture console messages and errors
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log('=== FORCE EXECUTION TEST ===');

    // Get our carousel script content
    const carouselScriptContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const carouselScript = scripts.find(
        (s) =>
          s.innerHTML.includes('GrapheneCarouselManager') &&
          s.innerHTML.includes('🎠'),
      );
      return carouselScript ? carouselScript.innerHTML : null;
    });

    if (carouselScriptContent) {
      console.log('✅ Found carousel script content');

      // Try to manually execute the script
      const executionResult = await page.evaluate((scriptContent) => {
        try {
          console.log('🧪 Manually executing carousel script...');

          // Clear any existing variables
          if (window.GrapheneCarouselManager) {
            delete window.GrapheneCarouselManager;
          }

          // Execute the script
          eval(scriptContent);

          return {
            success: true,
            managerExists:
              typeof window.GrapheneCarouselManager !== 'undefined',
            swiperExists: typeof window.Swiper !== 'undefined',
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack,
          };
        }
      }, carouselScriptContent);

      console.log('\n=== EXECUTION RESULT ===');
      console.log(`Success: ${executionResult.success}`);
      if (executionResult.success) {
        console.log(`Manager Exists: ${executionResult.managerExists}`);
        console.log(`Swiper Exists: ${executionResult.swiperExists}`);
      } else {
        console.log(`Error: ${executionResult.error}`);
        console.log(`Stack: ${executionResult.stack}`);
      }

      // Wait for any async operations
      await page.waitForTimeout(3000);

      // Check final state
      const finalState = await page.evaluate(() => {
        return {
          managerExists: typeof window.GrapheneCarouselManager !== 'undefined',
          swiperExists: typeof window.Swiper !== 'undefined',
          carouselElements: document.querySelectorAll('.card-media-carousel')
            .length,
          instances: window.GrapheneCarouselManager
            ? window.GrapheneCarouselManager.carousels
              ? window.GrapheneCarouselManager.carousels.size
              : 0
            : 0,
        };
      });

      console.log('\n=== FINAL STATE ===');
      Object.entries(finalState).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    } else {
      console.log('❌ Carousel script not found');
    }

    // Print all console messages
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg) => console.log(msg));

    // Print any page errors
    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach((error) => console.log(`ERROR: ${error}`));
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-force-execution.png',
      fullPage: true,
    });
    console.log(
      '\n📸 Screenshot saved to: test-results/graphene-force-execution.png',
    );

    // Test should pass
    expect(carouselScriptContent).toBeTruthy();
  });
});
