// Modal Media Carousel Manager
if (typeof window.ModalMediaCarouselManager === 'undefined') {
  window.ModalMediaCarouselManager = class ModalMediaCarouselManager {
    constructor() {
      this.carousels = new Map();
      this.swiperInitialized = false;
    }

    initializeCarousels() {
      // Wait for Swiper to be available
      if (typeof Swiper === 'undefined') {
        // Swiper not yet available, retrying...
        setTimeout(() => this.initializeCarousels(), 100);
        return;
      }

      const carouselElements = document.querySelectorAll(
        '.modal-media-carousel',
      );
      // Found modal carousels

      carouselElements.forEach((carouselElement) => {
        this.setupCarousel(carouselElement);
      });

      this.observeNewCarousels();
    }

    setupCarousel(carouselElement) {
      const modalId = carouselElement.getAttribute('data-modal-id');
      const productId = carouselElement.getAttribute('data-product-id');
      const carouselId = `${modalId}-${productId}`;

      // Setting up modal carousel

      // Check if already initialized
      if (this.carousels.has(carouselId)) {
        // Modal carousel already initialized
        return;
      }

      const swiperElement = carouselElement.querySelector(
        '.modal-slider.swiper',
      );
      const hasMultipleMedia =
        carouselElement.classList.contains('has-multiple-media');

      if (!swiperElement) {
        console.error('Swiper element not found in modal carousel');
        return;
      }

      // Get navigation elements
      const prevButton = carouselElement.querySelector(
        '.modal-slider-button--prev',
      );
      const nextButton = carouselElement.querySelector(
        '.modal-slider-button--next',
      );
      const dots = carouselElement.querySelectorAll('.modal-slider-dot');

      // Capture manager reference for callbacks
      const manager = this;

      // Initialize Swiper
      const swiper = new Swiper(swiperElement, {
        slidesPerView: 1,
        spaceBetween: 0,
        loop:
          hasMultipleMedia &&
          carouselElement.querySelectorAll('.swiper-slide').length > 1,
        touchRatio: hasMultipleMedia ? 1 : 0,
        allowTouchMove: hasMultipleMedia,
        grabCursor: hasMultipleMedia,
        resistance: true,
        resistanceRatio: 0.85,
        navigation: hasMultipleMedia
          ? {
              nextEl: nextButton,
              prevEl: prevButton,
            }
          : false,
        pagination: hasMultipleMedia
          ? {
              el: carouselElement.querySelector('.modal-slider-dots'),
              clickable: true,
              bulletClass: 'modal-slider-dot',
              bulletActiveClass: 'modal-slider-dot--active',
              renderBullet: function (index, className) {
                return `<button type="button" class="${className}" aria-label="Go to slide ${
                  index + 1
                }"></button>`;
              },
            }
          : false,
        on: {
          slideChange: function () {
            // Use captured manager reference and 'this' for swiper instance
            manager.updateButtonStates(carouselId, this);
          },
        },
      });

      // Store carousel state
      const state = {
        element: carouselElement,
        swiper: swiper,
        prevButton: prevButton,
        nextButton: nextButton,
        dots: dots,
      };

      this.carousels.set(carouselId, state);
      this.updateButtonStates(carouselId, swiper);
    }

    updateButtonStates(carouselId, swiper) {
      const state = this.carousels.get(carouselId);
      if (!state) return;

      const { prevButton, nextButton, dots } = state;

      // For loop mode, always enable buttons
      if (swiper.params.loop) {
        if (prevButton) prevButton.disabled = false;
        if (nextButton) nextButton.disabled = false;
      } else {
        // For non-loop mode, disable at boundaries
        if (prevButton) prevButton.disabled = swiper.isBeginning;
        if (nextButton) nextButton.disabled = swiper.isEnd;
      }

      // Update dot states
      if (dots && dots.length > 0) {
        dots.forEach((dot, index) => {
          if (index === swiper.realIndex) {
            dot.classList.add('modal-slider-dot--active');
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.classList.remove('modal-slider-dot--active');
            dot.removeAttribute('aria-current');
          }
        });
      }
    }

    observeNewCarousels() {
      // Observe for dynamically added modal carousels
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const carousels = node.classList?.contains('modal-media-carousel')
                ? [node]
                : node.querySelectorAll?.('.modal-media-carousel') || [];

              carousels.forEach((carousel) => {
                this.debounce(() => this.setupCarousel(carousel), 100)();
              });
            }
          });
        });
      });

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

  // Create a global instance
  window.modalCarouselManager = new window.ModalMediaCarouselManager();

  // Initialize when DOM is ready
  if (!window.modalCarouselInitialized) {
    window.modalCarouselInitialized = true;

    document.addEventListener('DOMContentLoaded', function () {
      window.modalCarouselManager.initializeCarousels();
    });

    // Also initialize immediately if DOM is already ready
    if (document.readyState === 'loading') {
      // DOM is still loading, the event listener above will handle it
    } else {
      // DOM is already ready
      window.modalCarouselManager.initializeCarousels();
    }

    // Listen for quick-add modal content changes
    document.addEventListener('DOMContentLoaded', function () {
      // Hook into the quick-add modal content loading
      const originalSetInnerHTML = window.HTMLUpdateUtility?.setInnerHTML;
      if (originalSetInnerHTML) {
        window.HTMLUpdateUtility.setInnerHTML = function (element, html) {
          // Quick-add modal content being updated
          const result = originalSetInnerHTML.call(this, element, html);
          // Re-initialize carousels after content is loaded
          setTimeout(() => {
            // Re-initializing modal carousels after content load
            window.modalCarouselManager.initializeCarousels();
          }, 100);
          return result;
        };
      }
    });
  }
}
