import { test, expect } from '@playwright/test';

test.describe('GrapheneHC Script Inspection Test', () => {
  test('inspect script tags and execution', async ({ page }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);

    console.log('=== SCRIPT INSPECTION ===');

    // Get all script tags
    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map((script) => ({
        src: script.src || 'inline',
        hasContent: script.innerHTML.length > 0,
        contentPreview: script.innerHTML.substring(0, 100),
        hasSwiperContent: script.innerHTML.includes('Swiper'),
        hasCarouselContent: script.innerHTML.includes(
          'GrapheneCarouselManager',
        ),
        hasCarouselEmoji: script.innerHTML.includes('🎠'),
      }));
    });

    // Find our carousel script
    const carouselScripts = scriptInfo.filter(
      (s) => s.hasCarouselContent || s.hasCarouselEmoji,
    );
    console.log(`Found ${carouselScripts.length} carousel scripts:`);
    carouselScripts.forEach((script, i) => {
      console.log(`Script ${i + 1}:`);
      console.log(`  Source: ${script.src}`);
      console.log(`  Has Content: ${script.hasContent}`);
      console.log(`  Has Carousel Manager: ${script.hasCarouselContent}`);
      console.log(`  Has Carousel Emoji: ${script.hasCarouselEmoji}`);
      console.log(`  Preview: ${script.contentPreview}...`);
    });

    // Find Swiper scripts
    const swiperScripts = scriptInfo.filter(
      (s) => s.src.includes('swiper') || s.hasSwiperContent,
    );
    console.log(`\nFound ${swiperScripts.length} Swiper scripts:`);
    swiperScripts.forEach((script, i) => {
      console.log(`Swiper Script ${i + 1}: ${script.src}`);
    });

    // Check if scripts are executing
    const executionTest = await page.evaluate(() => {
      // Try to manually execute a test script
      try {
        const testScript = document.createElement('script');
        testScript.innerHTML = 'console.log("🧪 Manual script test executed");';
        document.head.appendChild(testScript);
        return 'success';
      } catch (error) {
        return `error: ${error.message}`;
      }
    });
    console.log(`\nScript execution test: ${executionTest}`);

    // Check for content security policy or other restrictions
    const securityInfo = await page.evaluate(() => {
      const meta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      return {
        csp: meta ? meta.content : 'none',
        scriptCount: document.scripts.length,
        currentURL: window.location.href,
      };
    });
    console.log(`\nSecurity Info:`);
    console.log(`  CSP: ${securityInfo.csp}`);
    console.log(`  Total Scripts: ${securityInfo.scriptCount}`);
    console.log(`  Current URL: ${securityInfo.currentURL}`);

    // Try to force load Swiper
    const swiperLoadTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.Swiper) {
          resolve('already loaded');
          return;
        }

        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
        script.onload = () => {
          resolve(`loaded: ${typeof window.Swiper}`);
        };
        script.onerror = () => {
          resolve('failed to load');
        };
        document.head.appendChild(script);

        // Timeout after 3 seconds
        setTimeout(() => resolve('timeout'), 3000);
      });
    });
    console.log(`\nSwiper load test: ${swiperLoadTest}`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-script-inspection.png',
      fullPage: true,
    });
    console.log(
      '\n📸 Screenshot saved to: test-results/graphene-script-inspection.png',
    );

    // Test should pass if we found scripts
    expect(scriptInfo.length).toBeGreaterThan(0);
  });
});
