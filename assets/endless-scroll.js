/**
 * Endless Scroll for GrapheneHC Collection Pages
 * Integrates with existing GrapheneHC pagination structure
 */
if (!window.EndlessScroll) {
  class EndlessScroll {
    constructor(options = {}) {
      this.options = {
        // Container that holds the product grid
        resultsContainer: '#Results',

        // Pagination container with next links
        paginationContainer: '.plp-pagination',

        // Next page link selector
        nextLinkSelector: '.pagination__next, .pagination__link.next',

        // Distance from bottom to trigger load (in pixels)
        threshold: 300,

        // Loading state settings
        loadingText: 'Loading more products...',
        loadingClass: 'endless-scroll-loading',

        // Disable endless scroll on mobile by default
        disableOnMobile: false,

        // Enable debug logging
        debug: false,

        ...options,
      };

      this.isLoading = false;
      this.isComplete = false;
      this.currentPage = 1;
      this.loadingElement = null;

      this.init();
    }

    init() {
      this.log('Initializing endless scroll...');

      // Check if we're on a mobile device and should disable
      if (this.options.disableOnMobile && this.isMobile()) {
        this.log('Endless scroll disabled on mobile');
        return;
      }

      // Get current page from URL
      this.currentPage = this.getCurrentPageFromURL();
      this.log(`Starting from page ${this.currentPage}`);

      // Wait for the initial content to load
      this.waitForContent(() => {
        this.setupScrollListener();
        this.createLoadingElement();
        this.log('Endless scroll initialized');
      });
    }

    waitForContent(callback, attempts = 0, maxAttempts = 50) {
      const resultsContainer = document.querySelector(
        this.options.resultsContainer,
      );

      if (resultsContainer && resultsContainer.children.length > 0) {
        callback();
        return;
      }

      if (attempts >= maxAttempts) {
        this.log('Timeout waiting for initial content');
        return;
      }

      setTimeout(() => {
        this.waitForContent(callback, attempts + 1, maxAttempts);
      }, 200);
    }

    setupScrollListener() {
      let throttleTimer = null;

      const scrollHandler = () => {
        if (throttleTimer) return;

        throttleTimer = setTimeout(() => {
          if (this.shouldLoadMore()) {
            this.loadMore();
          }
          throttleTimer = null;
        }, 100);
      };

      window.addEventListener('scroll', scrollHandler);
      window.addEventListener('resize', scrollHandler);
    }

    shouldLoadMore() {
      if (this.isLoading || this.isComplete) {
        return false;
      }

      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      return scrollPosition >= documentHeight - this.options.threshold;
    }

    async loadMore() {
      if (this.isLoading || this.isComplete) return;

      // Calculate next page number directly
      const nextPage = this.currentPage + 1;

      this.log(`Loading next page via GrapheneHC: page ${nextPage}`);
      this.isLoading = true;
      this.showLoading();

      try {
        // Store current products to merge with new ones
        const currentProducts = this.captureCurrentProducts();
        this.log(`Captured ${currentProducts.length} current products`);

        this.log(`Loading GrapheneHC page ${nextPage}`);

        // Use GrapheneHC's loading mechanism but capture and merge results
        const success = await this.loadGrapheneHCPageAndMerge(
          nextPage,
          currentProducts,
        );

        if (!success) {
          this.log(`Failed to load page ${nextPage}, pagination complete`);
          this.isComplete = true;
          // Don't hide loading here - let the finally block handle it
          return;
        }

        this.currentPage = nextPage;
        this.log(`Successfully loaded page ${nextPage} via GrapheneHC`);

        // Notify carousel manager of new content
        this.notifyCarouselManager();
      } catch (error) {
        this.log(`Error loading more content: ${error.message}`);
        this.showError();
        // On error, mark as complete to prevent infinite retries
        this.isComplete = true;
      } finally {
        this.isLoading = false;
        this.hideLoading();
      }
    }

    getCurrentPageFromURL() {
      const urlParams = new URLSearchParams(window.location.search);
      const pgParam = urlParams.get('pg');
      const pageParam = urlParams.get('page');

      // GrapheneHC uses 'pg' parameter, fallback to 'page'
      const currentPage = parseInt(pgParam || pageParam || '1', 10);
      return Math.max(1, currentPage); // Ensure it's at least 1
    }

    findNextLink() {
      // Look for the next link in the pagination container
      const paginationContainer = document.querySelector(
        this.options.paginationContainer,
      );
      if (!paginationContainer) {
        this.log('Pagination container not found');
        return null;
      }

      const nextLink = paginationContainer.querySelector(
        this.options.nextLinkSelector,
      );
      if (!nextLink) {
        this.log('Next link not found in pagination');
        return null;
      }

      return nextLink;
    }

    getCurrentProductCount() {
      const resultsContainer = document.querySelector(
        this.options.resultsContainer,
      );
      if (!resultsContainer) return 0;

      // Count current products using various selectors
      const selectors = [
        'ul > li',
        'li',
        '.product-card-wrapper',
        '.grid__item',
      ];

      for (const selector of selectors) {
        const products = resultsContainer.querySelectorAll(selector);
        if (products.length > 0) {
          // Filter to actual product items
          const productItems = Array.from(products).filter((item) => {
            return (
              item.querySelector('h2, .product-title, [href*="/products/"]') ||
              item.querySelector('[class*="price"], .money') ||
              item.querySelector('img')
            );
          });

          if (productItems.length > 0) {
            return productItems.length;
          }
        }
      }

      return 0;
    }

    captureCurrentProducts() {
      const resultsContainer = document.querySelector(
        this.options.resultsContainer,
      );
      if (!resultsContainer) {
        this.log('No results container found for capturing products');
        return [];
      }

      this.log(
        'Results container HTML preview:',
        resultsContainer.innerHTML.substring(0, 500),
      );

      // Find the product grid (likely a UL element)
      const productGrid = this.findProductGrid(resultsContainer);
      if (!productGrid) {
        this.log('No product grid found');
        return [];
      }

      this.log(
        `Product grid found with ${productGrid.children.length} children`,
      );
      this.log(
        'Product grid HTML preview:',
        productGrid.innerHTML.substring(0, 500),
      );

      // Capture all current product elements
      const allChildren = Array.from(productGrid.children);
      this.log(
        'All children elements:',
        allChildren.map((child) => `${child.tagName}.${child.className}`),
      );

      const productItems = allChildren.filter((item) => {
        const hasProductInfo = item.querySelector(
          'h2, .product-title, [href*="/products/"]',
        );
        const hasPrice = item.querySelector('[class*="price"], .money');
        const hasImage = item.querySelector('img');

        this.log(
          `Child ${item.tagName}.${
            item.className
          }: hasProductInfo=${!!hasProductInfo}, hasPrice=${!!hasPrice}, hasImage=${!!hasImage}`,
        );

        return hasProductInfo || hasPrice || hasImage;
      });

      this.log(`Found ${productItems.length} current products to preserve`);
      return productItems.map((item) => item.cloneNode(true));
    }

    async loadGrapheneHCPageAndMerge(page, currentProducts) {
      return new Promise((resolve, reject) => {
        // Check if GrapheneHC is available
        if (typeof $g === 'undefined' || !$g.load) {
          reject(new Error('GrapheneHC ($g) not available'));
          return;
        }

        const resultsContainer = document.querySelector(
          this.options.resultsContainer,
        );
        if (!resultsContainer) {
          reject(new Error('Results container not found'));
          return;
        }

        // Set up observer to detect when GrapheneHC finishes loading
        const observer = new MutationObserver((mutations) => {
          let contentChanged = false;

          mutations.forEach((mutation) => {
            if (
              mutation.type === 'childList' &&
              mutation.target.id === 'Results'
            ) {
              // Check if we actually got new content (not just loading indicators)
              const hasProducts = mutation.target.querySelector(
                'ul li, .product-item',
              );
              if (hasProducts) {
                contentChanged = true;
              }
            }
          });

          if (contentChanged) {
            this.log(
              'GrapheneHC content loaded, merging with previous products',
            );
            observer.disconnect();

            // Merge the previous products with new ones
            setTimeout(() => {
              // Check if GrapheneHC loaded an empty page before merging
              const productGrid = this.findProductGrid(resultsContainer);
              const newProducts = productGrid
                ? Array.from(productGrid.children)
                : [];

              if (newProducts.length === 0) {
                // GrapheneHC loaded an empty page - restore the previous products immediately
                this.log(
                  'GrapheneHC returned empty page, restoring previous products',
                );
                productGrid.innerHTML = '';
                currentProducts.forEach((product) => {
                  // Remove animation classes that cause flickering when re-inserted
                  product.classList.remove(
                    'scroll-trigger',
                    'animate--slide-in',
                  );
                  // Ensure the product is fully visible
                  product.style.opacity = '1';
                  product.style.transform = 'translateY(0)';
                  productGrid.appendChild(product);
                });

                // Restore original URL after GrapheneHC has loaded
                window.history.replaceState({}, '', originalUrl);
                this.log(`Restored original URL: ${originalUrl}`);

                resolve(false); // No new products
                return;
              }

              const success =
                this.mergeProductsAfterGrapheneHCLoad(currentProducts);

              // Restore original URL after GrapheneHC has loaded
              window.history.replaceState({}, '', originalUrl);
              this.log(`Restored original URL: ${originalUrl}`);

              resolve(success);
            }, 200);
          }
        });

        observer.observe(resultsContainer, {
          childList: true,
          subtree: true,
        });

        // GrapheneHC reads pagination from the current URL, not from page_context
        // So we need to temporarily update the URL to include the page parameter
        const originalUrl = window.location.href;
        const currentUrl = new URL(originalUrl);

        // Set the page parameter in the URL
        currentUrl.searchParams.set('pg', page.toString());

        // Temporarily update the URL (without adding to browser history)
        window.history.replaceState({}, '', currentUrl.toString());

        this.log(`Temporarily updated URL to: ${currentUrl.toString()}`);

        // Use GrapheneHC to load the new page (it will read pg from the URL)
        try {
          $g.load({
            page_context: {
              currency_id: window.theme?.country_code || 'US',
            },
            context: {
              is_paging_request: true,
            },
            template: {
              id: 'category',
              target: '#Results',
              sub_templates: [
                {
                  id: 'sort_and_filters_html',
                  target: '.shop-filters',
                },
              ],
            },
          });
        } catch (error) {
          // Restore original URL on error
          window.history.replaceState({}, '', originalUrl);
          observer.disconnect();
          reject(error);
          return;
        }

        // Timeout fallback
        setTimeout(() => {
          observer.disconnect();
          // Restore original URL on timeout
          window.history.replaceState({}, '', originalUrl);
          this.log('GrapheneHC load timeout');
          reject(new Error('Timeout waiting for GrapheneHC to load'));
        }, 15000);
      });
    }

    mergeProductsAfterGrapheneHCLoad(previousProducts) {
      const resultsContainer = document.querySelector(
        this.options.resultsContainer,
      );
      if (!resultsContainer) {
        this.log('Results container not found for merging');
        return false;
      }

      // Find the product grid that GrapheneHC just populated
      const productGrid = this.findProductGrid(resultsContainer);
      if (!productGrid) {
        this.log('Product grid not found for merging');
        return false;
      }

      // Get the new products that GrapheneHC just loaded
      const newProductElements = Array.from(productGrid.children).filter(
        (item) => {
          return (
            item.querySelector('h2, .product-title, [href*="/products/"]') ||
            item.querySelector('[class*="price"], .money') ||
            item.querySelector('img')
          );
        },
      );

      this.log(`GrapheneHC loaded ${newProductElements.length} new products`);

      // Debug: Check if products are actually different
      if (newProductElements.length > 0 && previousProducts.length > 0) {
        const firstNewProduct = newProductElements[0];
        const firstPrevProduct = previousProducts[0];

        const newProductLink = firstNewProduct.querySelector(
          'a[href*="/products/"]',
        );
        const prevProductLink = firstPrevProduct.querySelector(
          'a[href*="/products/"]',
        );

        if (newProductLink && prevProductLink) {
          this.log(`First new product: ${newProductLink.href}`);
          this.log(`First previous product: ${prevProductLink.href}`);

          if (newProductLink.href === prevProductLink.href) {
            this.log(
              'WARNING: New products appear to be the same as previous products!',
            );
            this.log('Stopping endless scroll to prevent infinite duplication');
            this.isComplete = true;
            return false;
          }
        }
      }

      // If no new products were loaded, we've reached the end
      if (newProductElements.length === 0) {
        this.log('No new products found, pagination complete');
        // Don't clear the grid - just leave the existing products as they are
        // The grid already contains all the products we want to show
        this.log(
          `Keeping existing ${previousProducts.length} products in grid (no clearing needed)`,
        );
        return false;
      }

      // Clear the grid and rebuild with previous + new products
      productGrid.innerHTML = '';

      // First, add all previous products (remove animation classes to prevent flickering)
      previousProducts.forEach((product) => {
        // Remove animation classes that cause flickering when re-inserted
        product.classList.remove('scroll-trigger', 'animate--slide-in');
        // Ensure the product is fully visible
        product.style.opacity = '1';
        product.style.transform = 'translateY(0)';
        productGrid.appendChild(product);
      });

      // Then add new products with animation
      newProductElements.forEach((product, index) => {
        const clonedProduct = product.cloneNode(true);

        // Add entrance animation
        clonedProduct.style.opacity = '0';
        clonedProduct.style.transform = 'translateY(20px)';
        clonedProduct.style.transition =
          'opacity 0.3s ease, transform 0.3s ease';

        productGrid.appendChild(clonedProduct);

        // Trigger animation with stagger
        setTimeout(() => {
          clonedProduct.style.opacity = '1';
          clonedProduct.style.transform = 'translateY(0)';
        }, index * 50 + 100);
      });

      this.log(
        `Merged ${previousProducts.length} previous + ${newProductElements.length} new products`,
      );

      return true; // Success
    }

    async appendNewContent(html) {
      // Create a temporary container to parse the response
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      this.log('Response HTML length:', html.length);
      this.log(
        'Response structure:',
        tempDiv.innerHTML.substring(0, 500) + '...',
      );

      // Find the new products container in the response
      const newResultsContainer = tempDiv.querySelector(
        this.options.resultsContainer,
      );
      if (!newResultsContainer) {
        this.log(
          'Available elements in response:',
          Array.from(tempDiv.querySelectorAll('*'))
            .map(
              (el) =>
                el.tagName +
                (el.id ? '#' + el.id : '') +
                (el.className ? '.' + el.className.split(' ').join('.') : ''),
            )
            .slice(0, 20),
        );
        throw new Error('Could not find results container in response');
      }

      this.log(
        'Found results container with content length:',
        newResultsContainer.innerHTML.length,
      );

      // Extract new products (look for product grid or list items)
      const newProducts = this.extractProducts(newResultsContainer);
      if (newProducts.length === 0) {
        this.log('No new products found in response');
        this.log(
          'Results container HTML preview:',
          newResultsContainer.innerHTML.substring(0, 1000),
        );
        this.isComplete = true;
        return;
      }

      // Find current results container
      const currentResultsContainer = document.querySelector(
        this.options.resultsContainer,
      );
      if (!currentResultsContainer) {
        throw new Error('Current results container not found');
      }

      // Find the product grid within the results container
      const productGrid = this.findProductGrid(currentResultsContainer);
      if (!productGrid) {
        throw new Error('Could not find product grid to append to');
      }

      // Append new products with animation
      this.appendProductsWithAnimation(productGrid, newProducts);

      // Update pagination
      this.updatePagination(tempDiv);

      // Notify carousel manager of new content
      this.notifyCarouselManager();

      this.log(`Appended ${newProducts.length} new products`);
    }

    extractProducts(container) {
      // Look for various product container patterns
      // Based on Alex Crane's structure, products are in a UL with LI items
      const selectors = [
        'ul > li', // GrapheneHC product list items (more specific)
        'li', // Individual product items
        '.product-card-wrapper',
        '.grid__item',
        '.product-item',
        '[data-product-id]',
      ];

      for (const selector of selectors) {
        const products = container.querySelectorAll(selector);
        if (products.length > 0) {
          this.log(
            `Found ${products.length} products using selector: ${selector}`,
          );

          // Filter out any non-product elements (like navigation, empty items, etc.)
          const filteredProducts = Array.from(products).filter((product) => {
            // Check if this looks like a real product
            const hasProductInfo = product.querySelector(
              'h2, .product-title, [href*="/products/"]',
            );
            const hasPrice = product.querySelector('[class*="price"], .money');
            const hasImage = product.querySelector('img');

            return hasProductInfo || hasPrice || hasImage;
          });

          if (filteredProducts.length > 0) {
            this.log(
              `Filtered to ${filteredProducts.length} actual product items`,
            );
            return filteredProducts;
          }
        }
      }

      // If no products found with selectors, try to find them by content
      this.log('Trying content-based product detection...');
      const allElements = container.querySelectorAll('*');
      const productLikeElements = Array.from(allElements).filter((el) => {
        const hasProductLink = el.querySelector('a[href*="/products/"]');
        const hasProductTitle = el.textContent && el.querySelector('h2, h3');
        const hasPrice = el.textContent && /\$\d+/.test(el.textContent);

        return hasProductLink && (hasProductTitle || hasPrice);
      });

      if (productLikeElements.length > 0) {
        this.log(
          `Found ${productLikeElements.length} products via content detection`,
        );
        return productLikeElements;
      }

      return [];
    }

    findProductGrid(container) {
      // Look for the main product grid - prioritize specific product grid selectors
      const selectors = [
        'ul#product-grid', // Specific product grid ID
        'ul.product-grid', // Product grid class
        '.grid.product-grid', // Combined classes
        'ul.grid', // Generic grid UL
        '.product-grid',
        '.products-grid',
        '[class*="grid"]',
      ];

      for (const selector of selectors) {
        const grid = container.querySelector(selector);
        if (grid) {
          this.log(`Found product grid using selector: ${selector}`);
          return grid;
        }
      }

      return null;
    }

    appendProductsWithAnimation(productGrid, newProducts) {
      newProducts.forEach((product, index) => {
        // Clone the product element
        const clonedProduct = product.cloneNode(true);

        // Add entrance animation
        clonedProduct.style.opacity = '0';
        clonedProduct.style.transform = 'translateY(20px)';
        clonedProduct.style.transition =
          'opacity 0.3s ease, transform 0.3s ease';

        // Append to grid
        productGrid.appendChild(clonedProduct);

        // Trigger animation after a short delay
        setTimeout(() => {
          clonedProduct.style.opacity = '1';
          clonedProduct.style.transform = 'translateY(0)';
        }, index * 50 + 100); // Stagger the animations
      });
    }

    updatePagination(responseContainer) {
      // Find pagination in the response
      const newPagination = responseContainer.querySelector(
        this.options.paginationContainer,
      );
      const currentPagination = document.querySelector(
        this.options.paginationContainer,
      );

      if (newPagination && currentPagination) {
        // Replace current pagination with new one
        currentPagination.innerHTML = newPagination.innerHTML;
        this.log('Pagination updated');
      } else if (!newPagination) {
        // No pagination in response means we've reached the end
        this.log('No pagination in response, reached end');
        this.isComplete = true;

        if (currentPagination) {
          currentPagination.style.display = 'none';
        }
      }
    }

    notifyCarouselManager() {
      // Notify the existing GrapheneHC carousel manager about new content
      if (
        window.GrapheneCarouselManager &&
        typeof window.GrapheneCarouselManager.setupExistingCarousels ===
          'function'
      ) {
        setTimeout(() => {
          try {
            window.GrapheneCarouselManager.setupExistingCarousels();
            this.log('Notified carousel manager of new content');
          } catch (error) {
            this.log('Error reinitializing carousels:', error.message);
            // Try alternative method if available
            if (
              typeof window.GrapheneCarouselManager.reinitializeCarousels ===
              'function'
            ) {
              try {
                window.GrapheneCarouselManager.reinitializeCarousels();
                this.log('Used alternative carousel reinitialization');
              } catch (altError) {
                this.log(
                  'Alternative carousel method also failed:',
                  altError.message,
                );
              }
            }

            // As a last resort, try to manually initialize any Swiper carousels
            this.initializeManualCarousels();
          }
        }, 300); // Increased delay to ensure DOM is fully updated
      } else {
        this.log(
          'GrapheneCarouselManager not available or setupExistingCarousels method missing',
        );
        // Try manual carousel initialization
        setTimeout(() => {
          this.initializeManualCarousels();
        }, 300);
      }
    }

    initializeManualCarousels() {
      // Manually initialize any Swiper carousels that might have been added
      try {
        const carouselContainers = document.querySelectorAll(
          '.swiper:not(.swiper-initialized)',
        );

        if (carouselContainers.length > 0) {
          this.log(
            `Found ${carouselContainers.length} uninitialized carousels, attempting manual initialization`,
          );

          carouselContainers.forEach((container, index) => {
            try {
              // Basic Swiper configuration - adjust as needed for your carousels
              if (window.Swiper) {
                new window.Swiper(container, {
                  slidesPerView: 'auto',
                  spaceBetween: 10,
                  freeMode: true,
                  pagination: {
                    el: container.querySelector('.swiper-pagination'),
                    clickable: true,
                  },
                  navigation: {
                    nextEl: container.querySelector('.swiper-button-next'),
                    prevEl: container.querySelector('.swiper-button-prev'),
                  },
                });
                this.log(`Manually initialized carousel ${index + 1}`);
              }
            } catch (swiperError) {
              this.log(
                `Failed to manually initialize carousel ${index + 1}:`,
                swiperError.message,
              );
            }
          });
        } else {
          this.log('No uninitialized carousels found');
        }
      } catch (error) {
        this.log('Error in manual carousel initialization:', error.message);
      }
    }

    createLoadingElement() {
      this.loadingElement = document.createElement('div');
      this.loadingElement.className = this.options.loadingClass;
      this.loadingElement.innerHTML = `
      <div style="text-align: center; padding: 20px; font-size: 14px; color: #666;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #000; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
        ${this.options.loadingText}
      </div>
    `;

      // Add spinning animation
      if (!document.getElementById('endless-scroll-styles')) {
        const style = document.createElement('style');
        style.id = 'endless-scroll-styles';
        style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .${this.options.loadingClass} {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .${this.options.loadingClass}.show {
          opacity: 1;
        }
      `;
        document.head.appendChild(style);
      }
    }

    showLoading() {
      if (!this.loadingElement) return;

      const resultsContainer = document.querySelector(
        this.options.resultsContainer,
      );
      if (resultsContainer) {
        resultsContainer.appendChild(this.loadingElement);
        setTimeout(() => {
          this.loadingElement.classList.add('show');
        }, 10);
      }
    }

    hideLoading() {
      if (this.loadingElement && this.loadingElement.parentNode) {
        this.loadingElement.classList.remove('show');
        setTimeout(() => {
          if (this.loadingElement.parentNode) {
            this.loadingElement.parentNode.removeChild(this.loadingElement);
          }
        }, 300);
      }
    }

    showError() {
      // Show a brief error message
      const errorElement = document.createElement('div');
      errorElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
      errorElement.textContent =
        'Failed to load more products. Please try again.';

      document.body.appendChild(errorElement);

      setTimeout(() => {
        errorElement.style.opacity = '1';
      }, 10);

      setTimeout(() => {
        errorElement.style.opacity = '0';
        setTimeout(() => {
          if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
          }
        }, 300);
      }, 3000);
    }

    isMobile() {
      return (
        window.innerWidth <= 768 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        )
      );
    }

    log(message) {
      if (this.options.debug) {
        console.log(`[EndlessScroll] ${message}`);
      }
    }

    // Public methods for controlling the endless scroll
    enable() {
      this.isComplete = false;
      this.log('Endless scroll enabled');
    }

    disable() {
      this.isComplete = true;
      this.log('Endless scroll disabled');
    }

    destroy() {
      // Remove event listeners and clean up
      this.isComplete = true;
      this.isLoading = false;

      if (this.loadingElement && this.loadingElement.parentNode) {
        this.loadingElement.parentNode.removeChild(this.loadingElement);
      }

      this.log('Endless scroll destroyed');
    }
  }

  // Auto-initialize on collection pages
  document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a collection page with GrapheneHC
    if (document.querySelector('#Results')) {
      console.log(
        '[EndlessScroll] GrapheneHC Results container found, initializing...',
      );

      // Wait a bit for GrapheneHC to load initial content
      setTimeout(() => {
        // Double-check that we have content before initializing
        const resultsContainer = document.querySelector('#Results');
        if (resultsContainer && resultsContainer.children.length > 0) {
          console.log(
            '[EndlessScroll] Content loaded, starting endless scroll',
          );
          window.endlessScroll = new EndlessScroll({
            debug: true, // Enable debug logging
          });
        } else {
          console.log(
            '[EndlessScroll] No content found yet, waiting longer...',
          );
          // Wait a bit more for slower loading
          setTimeout(() => {
            window.endlessScroll = new EndlessScroll({
              debug: true,
            });
          }, 2000);
        }
      }, 1500);
    } else {
      console.log(
        '[EndlessScroll] Not a GrapheneHC collection page, skipping initialization',
      );
    }
  });

  // Export for use in other scripts
  window.EndlessScroll = EndlessScroll;
}
