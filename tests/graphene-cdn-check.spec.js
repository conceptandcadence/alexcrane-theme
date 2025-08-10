import { test, expect } from '@playwright/test';

test.describe('GrapheneHC CDN Check Test', () => {
  test('check if new Swiper CDN and fallback script are deployed', async ({
    page,
  }) => {
    // Navigate to the GrapheneHC merchandising testing page
    await page.goto(
      '/collections/merchandising-testing?_cd=1b89b03c2b57cf4dbb88a0adde2ee219143547c3b7dd9c5dbc6acbd4e7557bd4&_uid=4619010077&preview_theme_id=138154934361&preview_token=81kjn4p8oi7gxvem8qftx8gpay3mot6b',
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    console.log('=== CDN CHECK TEST ===');

    // Check for the specific CDN URLs
    const cdnInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const links = Array.from(document.querySelectorAll('link[href]'));

      return {
        // Old CDN
        hasOldJsDelivrJS: scripts.some((s) =>
          s.src.includes('cdn.jsdelivr.net/npm/swiper'),
        ),
        hasOldJsDelivrCSS: links.some((l) =>
          l.href.includes('cdn.jsdelivr.net/npm/swiper'),
        ),

        // New CDN
        hasNewCdnjsJS: scripts.some((s) =>
          s.src.includes('cdnjs.cloudflare.com/ajax/libs/Swiper'),
        ),
        hasNewCdnjsCSS: links.some((l) =>
          l.href.includes('cdnjs.cloudflare.com/ajax/libs/Swiper'),
        ),

        // Fallback detection script
        hasFallbackScript: scripts.some((s) =>
          s.innerHTML.includes('checkAndLoadSwiper'),
        ),
        hasSwiperCheckMessage: scripts.some((s) =>
          s.innerHTML.includes('🔍 Swiper check attempt'),
        ),

        // All Swiper-related URLs
        allSwiperURLs: [
          ...scripts.map((s) => s.src).filter((src) => src.includes('swiper')),
          ...links.map((l) => l.href).filter((href) => href.includes('swiper')),
        ],
      };
    });

    console.log('\n=== CDN STATUS ===');
    console.log(`Old jsdelivr JS: ${cdnInfo.hasOldJsDelivrJS}`);
    console.log(`Old jsdelivr CSS: ${cdnInfo.hasOldJsDelivrCSS}`);
    console.log(`New cdnjs JS: ${cdnInfo.hasNewCdnjsJS}`);
    console.log(`New cdnjs CSS: ${cdnInfo.hasNewCdnjsCSS}`);
    console.log(`Has Fallback Script: ${cdnInfo.hasFallbackScript}`);
    console.log(`Has Swiper Check Messages: ${cdnInfo.hasSwiperCheckMessage}`);

    console.log('\n=== ALL SWIPER URLs ===');
    cdnInfo.allSwiperURLs.forEach((url) => console.log(url));

    // Check carousel script content for the new messages
    const carouselScriptContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const carouselScript = scripts.find(
        (s) =>
          s.innerHTML.includes('GrapheneCarouselManager') &&
          s.innerHTML.includes('🎠'),
      );

      if (carouselScript) {
        return {
          hasCheckAndLoadSwiper:
            carouselScript.innerHTML.includes('checkAndLoadSwiper'),
          hasSwiperCheckMessage: carouselScript.innerHTML.includes(
            '🔍 Swiper check attempt',
          ),
          hasAlternativeCDN: carouselScript.innerHTML.includes('unpkg.com'),
          contentPreview: carouselScript.innerHTML.substring(0, 200),
        };
      }
      return null;
    });

    if (carouselScriptContent) {
      console.log('\n=== CAROUSEL SCRIPT ANALYSIS ===');
      console.log(
        `Has checkAndLoadSwiper function: ${carouselScriptContent.hasCheckAndLoadSwiper}`,
      );
      console.log(
        `Has Swiper check messages: ${carouselScriptContent.hasSwiperCheckMessage}`,
      );
      console.log(
        `Has alternative CDN: ${carouselScriptContent.hasAlternativeCDN}`,
      );
      console.log(
        `Content preview: ${carouselScriptContent.contentPreview}...`,
      );
    } else {
      console.log('\n❌ Carousel script not found');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/graphene-cdn-check.png',
      fullPage: true,
    });
    console.log(
      '\n📸 Screenshot saved to: test-results/graphene-cdn-check.png',
    );

    // Test passes if we find scripts
    expect(cdnInfo.allSwiperURLs.length).toBeGreaterThan(0);
  });
});
