/**
 * Simple Banner Colors
 * Extracts color from first banner heading on index page and applies to navigation
 */

(function () {
  'use strict';

  // Only run on index page
  if (
    !document.body.hasAttribute('data-template') ||
    document.body.getAttribute('data-template') !== 'index'
  ) {
    return;
  }

  function initBannerColors() {
    // Find the first banner heading
    const bannerHeading = document.querySelector('.banner__heading');

    if (!bannerHeading) {
      return;
    }

    // Get the computed color
    const computedStyle = window.getComputedStyle(bannerHeading);
    const bannerColor = computedStyle.color;

    if (!bannerColor) {
      return;
    }

    // Set CSS custom property
    document.documentElement.style.setProperty(
      '--banner-heading-color',
      bannerColor,
    );

    console.log('Banner color extracted:', bannerColor);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBannerColors);
  } else {
    initBannerColors();
  }
})();
