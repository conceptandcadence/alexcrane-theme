// Product View Switcher
// Switches between default (first) image and lifestyle (second) image based on select value

if (typeof window.ProductViewSwitcher === 'undefined') {
  window.ProductViewSwitcher = class ProductViewSwitcher {
    constructor() {
      this.selectElement = null;
      this.init();
    }

    init() {
      // Find the select element
      this.selectElement = document.querySelector('.plp-products-view select');

      if (!this.selectElement) {
        console.warn(
          'ProductViewSwitcher: .plp-products-view select not found',
        );
        return;
      }

      // Set up event listener
      this.setupEventListener();

      // Apply initial state based on current select value
      this.handleViewChange();
    }

    setupEventListener() {
      this.selectElement.addEventListener('change', () => {
        this.handleViewChange();
      });
    }

    handleViewChange() {
      const selectedValue = this.selectElement.value;
      const isLifestyle = selectedValue === 'lifestyle';

      console.log(
        'ProductViewSwitcher: View changed to:',
        selectedValue,
        'isLifestyle:',
        isLifestyle,
      );

      // Get all product cards
      const productCards = document.querySelectorAll('.card-media-carousel');
      console.log(
        'ProductViewSwitcher: Found',
        productCards.length,
        'product cards',
      );

      productCards.forEach((card, index) => {
        this.switchCardView(card, isLifestyle);
        console.log(
          'ProductViewSwitcher: Switched card',
          index + 1,
          'to',
          isLifestyle ? 'lifestyle' : 'flats',
        );
      });
    }

    switchCardView(cardElement, showSecondImage) {
      // Set data attribute for CSS-based transitions
      cardElement.setAttribute(
        'data-view-mode',
        showSecondImage ? 'lifestyle' : 'flats',
      );

      // Find the swiper instance for this card
      const swiperElement = cardElement.querySelector('.swiper');
      if (!swiperElement) return;

      // Check if this card has multiple images
      const slides = swiperElement.querySelectorAll('.swiper-slide');
      if (slides.length < 2) return;

      // Try to get the swiper instance
      const swiper = swiperElement.swiper;

      if (swiper) {
        // Use swiper to navigate to the appropriate slide
        if (showSecondImage) {
          // Go to second image (index 1) for lifestyle view
          swiper.slideToLoop(1, 300);
        } else {
          // Go to second image (index 1) for flats view too, to maintain hover behavior
          // The static image will cover this, but hover will reveal the second image
          swiper.slideToLoop(1, 300);
        }
      } else {
        // Fallback: manually handle active classes if swiper not available
        this.fallbackImageSwitch(cardElement, showSecondImage);
      }
    }

    fallbackImageSwitch(cardElement, showSecondImage) {
      const slides = cardElement.querySelectorAll('.swiper-slide');

      slides.forEach((slide, index) => {
        slide.classList.remove('is-active', 'is-hover-active');

        // Always set the second slide (index 1) as active to maintain hover behavior
        // In both flats and lifestyle modes, the carousel should show the second image
        if (index === 1) {
          slide.classList.add('is-active');
        }
      });
    }

    // Method to reinitialize after dynamic content loads
    reinitialize() {
      this.init();
    }
  };
}

// Initialize on DOM ready
if (!window.productViewSwitcherInitialized) {
  let productViewSwitcher;

  document.addEventListener('DOMContentLoaded', () => {
    if (!productViewSwitcher && window.ProductViewSwitcher) {
      productViewSwitcher = new window.ProductViewSwitcher();
      window.productViewSwitcherInstance = productViewSwitcher;
    }
  });

  // Export for global use (for dynamically loaded content)
  window.initProductViewSwitcher = () => {
    if (window.productViewSwitcherInstance) {
      window.productViewSwitcherInstance.reinitialize();
    } else if (window.ProductViewSwitcher) {
      productViewSwitcher = new window.ProductViewSwitcher();
      window.productViewSwitcherInstance = productViewSwitcher;
    }
  };

  window.productViewSwitcherInitialized = true;
}
