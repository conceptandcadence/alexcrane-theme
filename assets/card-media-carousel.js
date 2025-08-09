// Enhanced Card Media Carousel functionality
// This works alongside Dawn's existing slider-component
if (typeof window.CardMediaCarouselManager === 'undefined') {
  window.CardMediaCarouselManager = class CardMediaCarouselManager {
    constructor() {
      this.carousels = new Map();
      this.init();
    }

    init() {
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
      const sliderComponent = carouselElement.querySelector('slider-component');
      const slider = carouselElement.querySelector('.card-media-list');
      const dots = carouselElement.querySelectorAll('.card-slider-dot');
      const prevButton = carouselElement.querySelector(
        '.card-slider-button--prev',
      );
      const nextButton = carouselElement.querySelector(
        '.card-slider-button--next',
      );

      if (!sliderComponent || !slider) return;

      carouselElement.setAttribute('data-carousel-initialized', 'true');

      const carouselId =
        carouselElement.dataset.cardId ||
        Math.random().toString(36).substr(2, 9);

      // Create carousel state
      const state = {
        element: carouselElement,
        slider: slider,
        sliderComponent: sliderComponent,
        dots: dots,
        prevButton: prevButton,
        nextButton: nextButton,
        currentSlide: 0,
        totalSlides:
          carouselElement.querySelectorAll('.card-media-item').length,
      };

      this.carousels.set(carouselId, state);

      // Set up arrow navigation
      if (prevButton) {
        prevButton.addEventListener('click', () =>
          this.goToPrevSlide(carouselId),
        );
      }

      if (nextButton) {
        nextButton.addEventListener('click', () =>
          this.goToNextSlide(carouselId),
        );
      }

      // Set up dot navigation if dots exist
      if (dots.length > 0) {
        dots.forEach((dot, index) => {
          dot.addEventListener('click', () =>
            this.goToSlide(carouselId, index),
          );
        });
      }

      // Listen to slider component events
      if (sliderComponent.slider) {
        sliderComponent.slider.addEventListener(
          'scroll',
          this.debounce(() => {
            this.updateActiveSlide(carouselId);
          }, 100),
        );
      }
    }

    goToSlide(carouselId, slideIndex) {
      const state = this.carousels.get(carouselId);
      if (!state || slideIndex < 0 || slideIndex >= state.totalSlides) return;

      const slideWidth = state.slider.clientWidth;
      state.currentSlide = slideIndex;

      state.slider.scrollTo({
        left: slideWidth * slideIndex,
        behavior: 'smooth',
      });

      this.updateDotStates(carouselId);
      this.updateButtonStates(carouselId);
    }

    goToNextSlide(carouselId) {
      const state = this.carousels.get(carouselId);
      if (!state) return;

      const nextIndex = (state.currentSlide + 1) % state.totalSlides;
      this.goToSlide(carouselId, nextIndex);
    }

    goToPrevSlide(carouselId) {
      const state = this.carousels.get(carouselId);
      if (!state) return;

      const prevIndex =
        state.currentSlide === 0
          ? state.totalSlides - 1
          : state.currentSlide - 1;
      this.goToSlide(carouselId, prevIndex);
    }

    updateActiveSlide(carouselId) {
      const state = this.carousels.get(carouselId);
      if (!state) return;

      const slideWidth = state.slider.clientWidth;
      const scrollLeft = state.slider.scrollLeft;
      const newCurrentSlide = Math.round(scrollLeft / slideWidth);

      if (
        newCurrentSlide !== state.currentSlide &&
        newCurrentSlide < state.totalSlides
      ) {
        state.currentSlide = newCurrentSlide;
        this.updateDotStates(carouselId);
        this.updateButtonStates(carouselId);
      }
    }

    updateButtonStates(carouselId) {
      const state = this.carousels.get(carouselId);
      if (!state || !state.prevButton || !state.nextButton) return;

      // For infinite loop, we don't disable buttons
      // But you could add logic here to disable at start/end if desired
      state.prevButton.disabled = false;
      state.nextButton.disabled = false;
    }

    updateDotStates(carouselId) {
      const state = this.carousels.get(carouselId);
      if (!state || !state.dots.length) return;

      state.dots.forEach((dot, index) => {
        if (index === state.currentSlide) {
          dot.classList.add('is-active');
        } else {
          dot.classList.remove('is-active');
        }
      });
    }

    observeNewCarousels() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a carousel or contains carousels
              const carousels =
                node.matches && node.matches('.card-media-carousel')
                  ? [node]
                  : node.querySelectorAll
                  ? Array.from(node.querySelectorAll('.card-media-carousel'))
                  : [];

              carousels.forEach((carousel) => {
                if (!carousel.hasAttribute('data-carousel-initialized')) {
                  this.setupCarousel(carousel);
                }
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

    // Utility function for debouncing
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
  // Initialize the carousel manager
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
