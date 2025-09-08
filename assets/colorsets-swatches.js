/**
 * Colorsets Swatches - Dynamic Swatch Injection for Product Cards
 *
 * This script provides functionality to dynamically add colorway swatches to product cards
 * that don't have access to metaobjects on the backend (e.g., Rebuy, GrapheneHC cards).
 *
 * Usage:
 * 1. Include this script after the colorsets.liquid snippet
 * 2. Initialize with ColorsetSwatches.init()
 * 3. Use ColorsetSwatches.applySwatches() to process existing cards
 * 4. The script will automatically handle new cards via MutationObserver
 */

class ColorsetSwatches {
  constructor() {
    this.colorsetData = null;
    this.productToColorsetMap = new Map();
    this.observer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the colorset swatches system
   */
  async init() {
    //console.log('🎨 Starting ColorsetSwatches initialization...');
    try {
      //console.log('🎨 Step 1: Loading colorset data...');
      await this.loadColorsetData();
      //console.log('🎨 Step 2: Building product map...');
      this.buildProductMap();
      //console.log('🎨 Step 3: Setting up mutation observer...');
      this.setupMutationObserver();
      //console.log('🎨 Step 4: Applying swatches to existing cards...');
      this.applySwatches();
      this.isInitialized = true;
      //console.log('🎨 ColorsetSwatches initialized successfully');
    } catch (error) {
      console.error('🎨 Failed to initialize ColorsetSwatches:', error);
    }
  }

  /**
   * Load colorset data from the JSON script tag
   */
  async loadColorsetData() {
    // console.log('🎨 Looking for colorsets-data script element...');
    const scriptElement = document.getElementById('colorsets-data');

    if (!scriptElement) {
      // console.error('🎨 Script element #colorsets-data not found in DOM');
      /*console.log(
        '🎨 Available script elements with IDs:',
        Array.from(document.querySelectorAll('script[id]')).map((s) => s.id),
      ); */
      throw new Error(
        'Colorsets data not found. Make sure colorsets.liquid is included.',
      );
    }

    // console.log('🎨 Found colorsets-data script element');

    try {
      const rawData = scriptElement.textContent;
      // console.log('🎨 Raw colorsets data length:', rawData?.length || 0);
      /*console.log(
        '🎨 First 200 chars of raw data:',
        rawData?.substring(0, 200),
      ); */

      this.colorsetData = JSON.parse(rawData);
      console.log('🎨 Parsed colorset data successfully');
      /*console.log(
        '🎨 Colorsets count:',
        this.colorsetData?.colorsets?.length || 0,
      ); */
      //console.log('🎨 Meta info:', this.colorsetData?.meta);
    } catch (error) {
      console.error('🎨 Failed to parse colorsets JSON:', error);
      throw new Error('Failed to parse colorsets data: ' + error.message);
    }
  }

  /**
   * Build a map of product handles/IDs to their colorset information
   */
  buildProductMap() {
    if (!this.colorsetData?.colorsets) return;

    this.colorsetData.colorsets.forEach((colorset) => {
      if (!colorset.products) return;

      colorset.products.forEach((product) => {
        // Map by product handle (primary key)
        this.productToColorsetMap.set(product.handle, {
          colorset: colorset,
          product: product,
          allProducts: colorset.products,
        });

        // Also map by product ID for fallback
        this.productToColorsetMap.set(product.id.toString(), {
          colorset: colorset,
          product: product,
          allProducts: colorset.products,
        });
      });
    });
    /*
    console.log(
      `Built product map with ${this.productToColorsetMap.size} entries`,
    ); */
  }

  /**
   * Extract product identifier from various card formats
   */
  extractProductIdentifier(cardElement) {
    // Try to get product URL first (most reliable)
    const productUrlElement = cardElement.querySelector('[data-product-url]');
    if (productUrlElement) {
      const url = productUrlElement.getAttribute('data-product-url');
      const match = url.match(/\/products\/([^?#]+)/);
      if (match) {
        return match[1]; // product handle
      }
    }

    // Try to get product ID
    const productIdElement = cardElement.querySelector('[data-product-id]');
    if (productIdElement) {
      return productIdElement.getAttribute('data-product-id');
    }

    // Try to extract from href links
    const productLink = cardElement.querySelector('a[href*="/products/"]');
    if (productLink) {
      const href = productLink.getAttribute('href');
      const match = href.match(/\/products\/([^?#]+)/);
      if (match) {
        return match[1]; // product handle
      }
    }

    return null;
  }

  /**
   * Generate swatch HTML based on colorset data
   */
  generateSwatchHTML(colorsetInfo, currentProductHandle) {
    const { allProducts } = colorsetInfo;
    let swatchesUsed = 0;
    let swatchCount = 0;
    const maxSwatches = 5;

    let swatchesHTML = '';
    let additionalCount = 0;

    // Process products to create swatches
    allProducts.forEach((product) => {
      if (swatchesUsed < maxSwatches) {
        // For now, we'll create a simple swatch based on product data
        // In a full implementation, you'd need the actual colorway/swatch metafield data
        const swatchHTML = this.createSwatchItem(product, currentProductHandle);
        if (swatchHTML) {
          swatchesHTML += swatchHTML;
          swatchesUsed++;
        }
      } else {
        additionalCount++;
      }
    });

    // Build the complete secondary div HTML
    if (swatchesUsed > 1) {
      // Only show if there are multiple options
      return `
        <ul class='tw-flex tw-flex-row tw-gap-2'>
          ${swatchesHTML}
        </ul>
        ${
          additionalCount > 0
            ? `<div class='tw-text-[10px] tw-leading-[12px] tw-text-[#767676] tw-text-right'>+ ${additionalCount} styles</div>`
            : ''
        }
      `;
    }

    return '';
  }

  /**
   * Create individual swatch item HTML
   */
  createSwatchItem(product, currentProductHandle) {
    // Skip the current product
    if (product.handle === currentProductHandle) {
      return '';
    }

    // Only create swatch if product has colorway data with image_url
    if (!product.colorway?.image_url || product.colorway.image_url === '') {
      /* console.log(
        `🎨 Skipping ${product.handle} - no colorway swatch image available`,
      ); */
      return '';
    }

    // Use the colorway swatch image
    const swatchImage = product.colorway.image_url;
    const swatchTitle =
      product.colorway.title || product.colorway.admin_name || '';
    const productUrl = product.url || '';

    //console.log(`🎨 Using colorway swatch for ${product.handle}:`, swatchImage);

    // Ensure proper image sizing
    let finalSwatchImage = swatchImage;
    if (swatchImage.includes('cdn.shopify.com')) {
      finalSwatchImage =
        swatchImage.split('?')[0] + '?width=28&height=28&crop=center';
    }

    return `
      <li class='product-swatch-item tw-flex tw-flex-col tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-[2px] hover:tw-scale-110 tw-transition-all tw-duration-300'>
        <button class='product-swatch-button tw-flex tw-flex-col tw-items-center tw-justify-center'>
          <img
            class='tw-image-cover tw-w-[18px] tw-h-[12px] tw-overflow-hidden tw-pointer-events-none'
            src='${finalSwatchImage}'
            alt='${swatchTitle}'
            width='14'
            height='14'
            data-product-url='${productUrl}'
          >
        </button>
      </li>
    `;
  }

  /**
   * Apply swatches to a single product card
   */
  applySwatchesToCard(cardElement) {
    // Check if this card already has swatches
    const existingSwatches = cardElement.querySelector('.colorset-swatches');
    if (existingSwatches) {
      return; // Already processed
    }

    // Extract product identifier first
    const productIdentifier = this.extractProductIdentifier(cardElement);
    if (!productIdentifier) {
      return; // Couldn't identify product
    }

    // Get colorset info for this product
    const colorsetInfo = this.productToColorsetMap.get(productIdentifier);
    if (!colorsetInfo) {
      return; // Product not in any colorset
    }

    // Find or create a place to inject swatches
    let targetInfo = this.findSwatchTarget(cardElement);
    if (!targetInfo || !targetInfo.element) {
      return; // Couldn't find suitable location
    }

    // Generate and inject swatch HTML
    const swatchHTML = this.generateSwatchHTML(colorsetInfo, productIdentifier);
    if (swatchHTML) {
      if (targetInfo.useExisting) {
        // Use existing .secondary div - just populate it
        targetInfo.element.innerHTML = swatchHTML;
        targetInfo.element.classList.add('colorset-swatches');

        // Add click handlers for swatch navigation
        this.addSwatchClickHandlers(targetInfo.element);

        /*console.log(
          `🎨 Applied swatches to existing .secondary for product: ${productIdentifier}`,
        ); */
      } else {
        // Create new wrapper with identifier class
        const swatchWrapper = document.createElement('div');
        swatchWrapper.className =
          'colorset-swatches secondary tw-flex tw-flex-col tw-gap-3 tw-pt-[1px]';
        swatchWrapper.innerHTML = swatchHTML;

        targetInfo.element.appendChild(swatchWrapper);

        // Add click handlers for swatch navigation
        this.addSwatchClickHandlers(swatchWrapper);

        /*console.log(
          `🎨 Applied swatches to new container for product: ${productIdentifier}`,
        ); */
      }

      // Add class to card__content for layout modifications
      const cardContent = cardElement.querySelector('.card__content');
      if (cardContent) {
        cardContent.classList.add('has-swatches');
        /*console.log(
          `🎨 Added 'has-swatches' class to .card__content for ${productIdentifier}`,
        ); */
      }
    }
  }

  /**
   * Find the best location to inject swatches
   */
  findSwatchTarget(cardElement) {
    // Try to find existing secondary div first
    let target = cardElement.querySelector('.secondary');
    if (target) {
      return { element: target, useExisting: true };
    }

    // Look for card information area
    target = cardElement.querySelector(
      '.card__information, .card-information, .product-info',
    );
    if (target) {
      return { element: target, useExisting: false };
    }

    // Look for card content area
    target = cardElement.querySelector(
      '.card__content, .card-content, .product-content',
    );
    if (target) {
      return { element: target, useExisting: false };
    }

    // Look for price area (common in third-party widgets)
    target = cardElement.querySelector('.price, .product-price, .rebuy-money');
    if (target) {
      return { element: target.parentElement, useExisting: false };
    }

    // Fallback: use the card element itself
    return { element: cardElement, useExisting: false };
  }

  /**
   * Add click handlers to swatch buttons for quick-add modal
   */
  addSwatchClickHandlers(container) {
    const swatchButtons = container.querySelectorAll('.product-swatch-button');
    swatchButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const img = button.querySelector('img');
        const productUrl = img?.getAttribute('data-product-url');
        if (productUrl) {
          this.openQuickAddModal(productUrl);
        }
      });
    });
  }

  /**
   * Open quick-add modal for a product
   */
  async openQuickAddModal(productUrl) {
    try {
      // console.log(`🎨 Opening quick-add modal for: ${productUrl}`);

      // Extract product handle from URL
      const productHandle = productUrl.replace('/products/', '').split('?')[0];

      // Create a temporary modal opener to trigger the quick-add modal
      const tempModalOpener = document.createElement('modal-opener');
      tempModalOpener.style.display = 'none';
      tempModalOpener.setAttribute(
        'data-modal',
        `#QuickAdd-temp-${productHandle}`,
      );

      // Create the quick-add modal structure
      const modalId = `QuickAdd-temp-${productHandle}`;
      const existingModal = document.getElementById(modalId);

      if (!existingModal) {
        const quickAddModal = document.createElement('quick-add-modal');
        quickAddModal.id = modalId;
        quickAddModal.className = 'quick-add-modal';
        quickAddModal.innerHTML = `
          <div role="dialog" 
               aria-label="Choose product options"
               aria-modal="true"
               class="quick-add-modal__content global-settings-popup"
               tabindex="-1">
            <button type="button"
                    class="quick-add-modal__toggle"
                    aria-label="Close">
              <svg class="icon icon-close" aria-hidden="true" focusable="false" viewBox="0 0 18 17">
                <path d="m.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor"></path>
              </svg>
            </button>
            <div id="QuickAddInfo-temp-${productHandle}" class="quick-add-modal__content-info">
              <div class="loading__spinner">
                <svg aria-hidden="true" focusable="false" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                  <circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(quickAddModal);
      }

      document.body.appendChild(tempModalOpener);

      // Load the product quick-add content
      await this.loadQuickAddContent(
        productUrl,
        `QuickAddInfo-temp-${productHandle}`,
      );

      // Trigger the modal
      tempModalOpener.click();

      // Clean up the temporary modal opener
      tempModalOpener.remove();
    } catch (error) {
      console.error('🎨 Error opening quick-add modal:', error);
      // Fallback to regular navigation
      window.location.href = productUrl;
    }
  }

  /**
   * Load quick-add content for a product
   */
  async loadQuickAddContent(productUrl, targetElementId) {
    try {
      const response = await fetch(`${productUrl}?view=quick-add`);
      const html = await response.text();

      const targetElement = document.getElementById(targetElementId);
      if (targetElement) {
        targetElement.innerHTML = html;

        // Initialize mobile accordion functionality for dynamically loaded content
        if (typeof initializeMobileAccordion === 'function') {
          setTimeout(() => {
            const modalContainer = targetElement.closest('quick-add-modal');
            initializeMobileAccordion(modalContainer || document);
          }, 100);
        }
      }
    } catch (error) {
      console.error('🎨 Error loading quick-add content:', error);
      const targetElement = document.getElementById(targetElementId);
      if (targetElement) {
        targetElement.innerHTML = `<p>Error loading product options. <a href="${productUrl}">View product page</a></p>`;
      }
    }
  }

  /**
   * Apply swatches to all existing product cards
   */
  applySwatches() {
    // Try multiple selectors to find product cards, excluding product page elements
    const selectors = [
      '.product-card-wrapper',
      '.card-wrapper',
      '.card:not(.product__media)',
      '[data-product-url]:not(.product__media-wrapper)',
      '.product-item',
      '.grid__item:not(.product__media-wrapper)',
    ];

    let productCards = [];
    for (const selector of selectors) {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) {
        // Additional filter to exclude product page media elements
        const filteredCards = Array.from(cards).filter((card) => {
          // Exclude elements that are part of product media gallery
          if (
            card.classList.contains('product__media-wrapper') ||
            card.classList.contains('product__media') ||
            card.closest('.product__media-gallery') ||
            card.closest('.product__media-list') ||
            card.closest('[data-media-id]')
          ) {
            return false;
          }
          return true;
        });
        productCards = [...productCards, ...filteredCards];
      }
    }

    // Remove duplicates
    productCards = [...new Set(productCards)];

    // console.log(`🎨 Found ${productCards.length} product cards to process`);
    /*console.log(
      `🎨 Card types found:`,
      selectors.map((s) => `${s}: ${document.querySelectorAll(s).length}`),
    ); */

    let processedCount = 0;
    let skippedCount = 0;
    let appliedCount = 0;

    productCards.forEach((card, index) => {
      const productId = this.extractProductIdentifier(card);
      const colorsetInfo = productId
        ? this.productToColorsetMap.get(productId)
        : null;

      if (productId && colorsetInfo) {
        this.applySwatchesToCard(card);
        if (card.querySelector('.colorset-swatches')) {
          appliedCount++;
        }
        processedCount++;
      } else {
        skippedCount++;
      }
    });

    /* console.log(
      `🎨 Processing complete: ${appliedCount} swatches applied, ${processedCount} processed, ${skippedCount} skipped`,
    ); */
  }

  /**
   * Set up MutationObserver to handle dynamically added cards
   */
  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let hasNewContent = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a product card
            if (node.matches) {
              const cardSelectors = [
                '.product-card-wrapper',
                '.card-wrapper',
                '.card:not(.product__media)',
                '[data-product-url]:not(.product__media-wrapper)',
                '.grid__item:not(.product__media-wrapper)',
              ];

              if (cardSelectors.some((selector) => node.matches(selector))) {
                this.applySwatchesToCard(node);
                hasNewContent = true;
              }
            }

            // Check for product cards within the added node
            const productCards =
              node.querySelectorAll &&
              node.querySelectorAll(
                '.product-card-wrapper, .card-wrapper, .card:not(.product__media), [data-product-url]:not(.product__media-wrapper), .grid__item:not(.product__media-wrapper)',
              );
            if (productCards && productCards.length > 0) {
              // Filter out product media elements
              const filteredCards = Array.from(productCards).filter((card) => {
                if (
                  card.classList.contains('product__media-wrapper') ||
                  card.classList.contains('product__media') ||
                  card.closest('.product__media-gallery') ||
                  card.closest('.product__media-list') ||
                  card.closest('[data-media-id]')
                ) {
                  return false;
                }
                return true;
              });

              filteredCards.forEach((card) => {
                this.applySwatchesToCard(card);
              });

              if (filteredCards.length > 0) {
                hasNewContent = true;
                /*console.log(
                  `🎨 MutationObserver detected ${filteredCards.length} new product cards`,
                ); */
              }
            }
          }
        });
      });

      // If we detected new content, also do a full refresh after a short delay
      if (hasNewContent) {
        clearTimeout(this.mutationRefreshTimeout);
        this.mutationRefreshTimeout = setTimeout(() => {
          /* console.log(
            '🎨 MutationObserver triggering full refresh after new content detection',
          ); */
          this.refresh();
        }, 1000);
      }
    });

    // Start observing with more comprehensive options
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attribute changes
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false,
    });

    //console.log('MutationObserver set up for dynamic card detection');
  }

  /**
   * Public method to manually refresh swatches
   */
  refresh() {
    if (!this.isInitialized) {
      console.warn('ColorsetSwatches not initialized yet');
      return;
    }
    this.applySwatches();
  }

  /**
   * Debug helper - check system status
   */
  debug() {
    /*
    console.log('🎨 ColorsetSwatches Debug Info:');
    console.log('  - Initialized:', this.isInitialized);
    console.log('  - Colorset data loaded:', !!this.colorsetData);
    console.log(
      '  - Colorsets count:',
      this.colorsetData?.colorsets?.length || 0,
    );
    console.log('  - Product map size:', this.productToColorsetMap.size);
    console.log('  - Observer active:', !!this.observer);
		*/
    // Check for colorsets-data element
    const scriptElement = document.getElementById('colorsets-data');
    //console.log('  - colorsets-data element found:', !!scriptElement);

    // Check for product cards with multiple selectors (excluding product page media)
    const cardSelectors = [
      '.product-card-wrapper',
      '.card-wrapper',
      '.card:not(.product__media)',
      '[data-product-url]:not(.product__media-wrapper)',
      '.product-item',
      '.grid__item:not(.product__media-wrapper)',
      '.product-card',
      '.rebuy-widget .rebuy-product',
      '.rebuy-product-block',
    ];

    let totalCards = 0;
    cardSelectors.forEach((selector) => {
      const cards = document.querySelectorAll(selector);
      if (cards.length > 0) {
        // Filter out product media elements
        const filteredCards = Array.from(cards).filter((card) => {
          if (
            card.classList.contains('product__media-wrapper') ||
            card.classList.contains('product__media') ||
            card.closest('.product__media-gallery') ||
            card.closest('.product__media-list') ||
            card.closest('[data-media-id]')
          ) {
            return false;
          }
          return true;
        });
        if (filteredCards.length > 0) {
          /*console.log(
            `  - ${selector}: ${filteredCards.length} found (${
              cards.length - filteredCards.length
            } excluded)`,
          ); */
          totalCards += filteredCards.length;
        }
      }
    });

    //console.log('  - Total product cards found:', totalCards);

    // Check for secondary divs
    const secondaryDivs = document.querySelectorAll('.secondary');
    //console.log('  - Secondary divs found:', secondaryDivs.length);

    // Check for any elements with product URLs
    const productUrls = document.querySelectorAll(
      '[href*="/products/"], [data-product-url]',
    );
    //console.log('  - Elements with product URLs:', productUrls.length);

    return {
      initialized: this.isInitialized,
      colorsetData: this.colorsetData,
      productMapSize: this.productToColorsetMap.size,
      productCards: totalCards,
      secondaryDivs: secondaryDivs.length,
    };
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.productToColorsetMap.clear();
    this.isInitialized = false;
  }
}

// Create global instance
window.ColorsetSwatches = new ColorsetSwatches();

// Add debug function immediately to global scope
window.debugColorsets = function () {
  return window.ColorsetSwatches.debug();
};

// console.log('🎨 ColorsetSwatches script loaded');
// console.log('🎨 Debug function available as: window.debugColorsets()');

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  //console.log('🎨 DOM loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    //console.log('🎨 DOMContentLoaded fired, initializing ColorsetSwatches...');
    window.ColorsetSwatches.init();
  });
} else {
  // DOM is already ready
  /*
  console.log(
    '🎨 DOM already ready, initializing ColorsetSwatches immediately...',
  );
	*/
  window.ColorsetSwatches.init();
}

// Multiple refresh attempts to catch late-loading content
const refreshAttempts = [500, 1000, 2000, 5000];
refreshAttempts.forEach((delay, index) => {
  setTimeout(() => {
    //console.log(`🎨 Refresh attempt ${index + 1} (${delay}ms)...`);
    if (window.ColorsetSwatches.isInitialized) {
      /*
      console.log('🎨 ColorsetSwatches initialized, refreshing...'); */
      window.ColorsetSwatches.refresh();
    } else {
      /*
      console.log(
        '🎨 ColorsetSwatches not initialized yet, attempting init...',
      ); */
      window.ColorsetSwatches.init();
    }
  }, delay);
});
