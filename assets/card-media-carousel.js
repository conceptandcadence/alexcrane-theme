// Enhanced Card Media Carousel with Swiper.js
// This provides smooth touch/swipe functionality for product card carousels

if (typeof window.CardMediaCarouselManager === 'undefined') {
  window.CardMediaCarouselManager = class CardMediaCarouselManager {
    constructor() {
      this.carousels = new Map();
      this.init();
    }

    init() {
      // Wait for Swiper to be available
      if (typeof Swiper === 'undefined') {
        setTimeout(() => this.init(), 100);
        return;
      }

      // Initialize existing carousels
      this.initializeCarousels();

      // Set up mutation observer for dynamically added carousels
      this.observeNewCarousels();
    }

    initializeCarousels() {
      const carousels = document.querySelectorAll(
        '.card-media-carousel:not([data-carousel-initialized])',
      );
      carousels.forEach((carousel) => this.setupCarousel(carousel));
    }

    setupCarousel(carouselElement) {
      const swiperElement = carouselElement.querySelector('.swiper');
      const dots = carouselElement.querySelectorAll('.card-slider-dot');
      const prevButton = carouselElement.querySelector(
        '.card-slider-button--prev',
      );
      const nextButton = carouselElement.querySelector(
        '.card-slider-button--next',
      );

      if (!swiperElement) return;

      carouselElement.setAttribute('data-carousel-initialized', 'true');

      const carouselId =
        carouselElement.dataset.cardId ||
        Math.random().toString(36).substr(2, 9);
      const totalSlides =
        swiperElement.querySelectorAll('.swiper-slide').length;

      // Only initialize Swiper for multiple images
      if (totalSlides <= 1) return;

      // Initialize Swiper
      console.log('Initializing Swiper with loop:', totalSlides > 1);
      const swiper = new Swiper(swiperElement, {
        // Core settings
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true, // Enable wrapping/looping
        initialSlide: totalSlides > 1 ? 1 : 0, // Start on second image for reveal effect

        // Touch settings for smooth mobile experience
        touchRatio: 1,
        touchAngle: 45,
        grabCursor: false, // Disable grab cursor, we'll handle this with zones

        // Resistance for better UX at boundaries
        resistance: true,
        resistanceRatio: 0.85,

        // Smooth transitions
        speed: 300,

        // Navigation
        navigation: {
          nextEl: nextButton,
          prevEl: prevButton,
        },

        // Pagination (dots)
        pagination:
          dots.length > 0
            ? {
                el: carouselElement.querySelector('.card-slider-dots'),
                clickable: true,
                bulletClass: 'card-slider-dot',
                bulletActiveClass: 'is-active',
                renderBullet: (index, className) => {
                  return `<button class="${className}" aria-label="Go to slide ${
                    index + 1
                  }"></button>`;
                },
              }
            : false,

        // Events
        on: {
          init: (swiper) => {
            this.updateButtonStates(carouselId, swiper);
          },
          slideChange: (swiper) => {
            this.updateButtonStates(carouselId, swiper);
          },
        },
      });

      // Store carousel state
      const state = {
        element: carouselElement,
        swiper: swiper,
        totalSlides: totalSlides,
        prevButton: prevButton,
        nextButton: nextButton,
        dots: dots,
      };

      this.carousels.set(carouselId, state);

      // Set up product link area only (no interfering swipe zones)
      this.setupProductLink(carouselElement);
    }

    setupProductLink(carouselElement) {
      // Only create the center product link area
      const productLinkArea = document.createElement('a');

      // Product link area (center 50%)
      Object.assign(productLinkArea.style, {
        position: 'absolute',
        top: '0',
        left: '25%',
        width: '50%',
        height: '100%',
        zIndex: '998',
        cursor: 'pointer',
        display: 'block',
        background: 'transparent',
        pointerEvents: 'auto',
      });
      productLinkArea.className = 'product-link-area';
      productLinkArea.innerHTML = '&nbsp;'; // Prevent empty element hiding

      // Get the product URL
      const productLink = carouselElement
        .closest('.card-wrapper')
        .querySelector('.card__heading a, .card-link');
      if (productLink) {
        productLinkArea.href = productLink.href;
        productLinkArea.setAttribute(
          'aria-label',
          productLink.getAttribute('aria-label') || 'View product',
        );
      }

      // Add product link to carousel
      carouselElement.style.position = 'relative';
      carouselElement.appendChild(productLinkArea);
    }

    updateButtonStates(carouselId, swiper) {
      const state = this.carousels.get(carouselId);
      if (!state) return;

      // For loop mode, never disable buttons since we can always navigate
      if (state.prevButton) {
        state.prevButton.disabled = false;
        state.prevButton.setAttribute('aria-disabled', 'false');
      }

      if (state.nextButton) {
        state.nextButton.disabled = false;
        state.nextButton.setAttribute('aria-disabled', 'false');
      }
    }

    observeNewCarousels() {
      const observer = new MutationObserver(
        this.debounce(() => {
          this.initializeCarousels();
        }, 100),
      );

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };
}

// Initialize on DOM ready
if (!window.cardCarouselInitialized) {
  let cardCarouselManager;

  document.addEventListener('DOMContentLoaded', () => {
    if (!cardCarouselManager && window.CardMediaCarouselManager) {
      cardCarouselManager = new window.CardMediaCarouselManager();
      window.cardCarouselManagerInstance = cardCarouselManager;
    }
  });

  // Export for global use (for dynamically loaded content)
  window.initCardMediaCarousels = () => {
    if (window.cardCarouselManagerInstance) {
      window.cardCarouselManagerInstance.initializeCarousels();
    } else if (window.CardMediaCarouselManager) {
      cardCarouselManager = new window.CardMediaCarouselManager();
      window.cardCarouselManagerInstance = cardCarouselManager;
    }
  };

  window.cardCarouselInitialized = true;
}
