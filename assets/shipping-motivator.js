// /////////////////////////////////////////////////////////////////////////////////////////
// Native Shopify Shipping Motivator
// /////////////////////////////////////////////////////////////////////////////////////////

class ShippingMotivator {
  constructor() {
    this.bannerMotivator = document.querySelector('[data-motivator]');
    this.cartMotivator = document.querySelector('[data-motivator-cart]');
    this.config = this.getConfig();
    this.cart = null;
    this.initialized = false;
    this.fetchingCart = null; // Track ongoing fetch requests
    this.processingGWP = false; // Track GWP processing to prevent duplicates
    this.removingGWP = false; // Track GWP removal to prevent duplicates
    this.internalFetch = false; // Track internal cart fetches to prevent interceptor loops
    this.lastUpdateTime = 0; // Timestamp to prevent excessive updates

    // Cache for performance optimization
    this.lastCartValue = -1;
    this.lastProgressPercentage = -1;
    this.lastCurrentGoal = null;
    this.lastMessage = '';
    this.lastCompletedGoals = [];
    this.previouslyCompletedGoals = []; // Track previous state for removal detection

    // Track collection goals that have been fulfilled by product selection
    this.fulfilledCollectionGoals = new Set();

    // Restore previous goals from sessionStorage if available
    try {
      const storedPreviousGoals = sessionStorage.getItem(
        'shippingMotivatorPreviousGoals',
      );
      if (storedPreviousGoals) {
        this.previouslyCompletedGoals = JSON.parse(storedPreviousGoals);
        console.log(
          '🔄 Restored previous goals from storage:',
          this.previouslyCompletedGoals.length,
        );
      }

      // Restore fulfilled collection goals
      const storedFulfilledGoals = sessionStorage.getItem(
        'shippingMotivatorFulfilledCollections',
      );
      console.log('🔍 Raw fulfilled goals from storage:', storedFulfilledGoals);
      if (storedFulfilledGoals) {
        const parsedGoals = JSON.parse(storedFulfilledGoals);
        this.fulfilledCollectionGoals = new Set(parsedGoals);
        console.log(
          '🔄 Restored fulfilled collection goals:',
          this.fulfilledCollectionGoals.size,
          'Goals:',
          [...this.fulfilledCollectionGoals],
        );
      } else {
        console.log('🔄 No fulfilled collection goals found in storage');
      }
    } catch (e) {
      // Ignore storage errors
    }

    if ((this.bannerMotivator || this.cartMotivator) && this.config) {
      this.init();
    }
  }

  getConfig() {
    const configScript = document.querySelector('[data-motivator-config]');
    if (!configScript) return null;

    try {
      return JSON.parse(configScript.textContent);
    } catch (error) {
      console.error('Error parsing motivator config:', error);
      return null;
    }
  }

  async init() {
    await this.fetchCart();
    this.setupElements();
    this.bindEvents();
    await this.update();
    this.show();
    this.initialized = true;
    console.log('Shipping Motivator initialized with native cart');
  }

  async fetchCart() {
    // Prevent multiple simultaneous requests
    if (this.fetchingCart) {
      return this.fetchingCart;
    }

    this.fetchingCart = (async () => {
      try {
        // Flag to prevent intercepting our own cart fetch
        this.internalFetch = true;
        const response = await fetch('/cart.js');
        this.cart = await response.json();
        console.log('🛒 Cart fetched:', this.cart.total_price);
      } catch (error) {
        console.error('❌ Error fetching cart:', error);
        this.cart = { total_price: 0, items: [] };
      } finally {
        this.fetchingCart = null;
        this.internalFetch = false;
      }
    })();

    return this.fetchingCart;
  }

  setupElements() {
    try {
      this.elements = {
        banner: this.bannerMotivator
          ? this.getElementsForMotivator(this.bannerMotivator)
          : null,
        cart: this.cartMotivator
          ? this.getElementsForMotivator(this.cartMotivator)
          : null,
      };

      // Apply proportional widths to all goal elements
      this.applyProportionalWidths();
    } catch (error) {
      console.error('Error setting up shipping motivator elements:', error);
      this.elements = { banner: null, cart: null };
    }
  }

  getElementsForMotivator(motivator) {
    return {
      motivator: motivator,
      message: motivator.querySelector('.shipping-motivator__text'),
      progressContainer: motivator.querySelector(
        '.shipping-motivator__progress-container',
      ),
      progressFill: motivator.querySelector(
        '.shipping-motivator__progress-fill',
      ),
      progressText: motivator.querySelector(
        '.shipping-motivator__progress-fill-text',
      ),
      goals: motivator.querySelectorAll('.shipping-motivator__goal'),
    };
  }
  bindEvents() {
    // Listen for cart updates from Shopify theme
    document.addEventListener('cart:updated', (event) => {
      this.cart = event.detail;
      this.update().catch(console.error);
    });

    // Listen for cart changes via fetch API
    this.interceptCartRequests();

    // Watch for cart drawer content changes (when items are added/removed)
    this.setupCartDrawerObserver();

    // Listen for Rebuy add to cart button clicks
    this.setupRebuyCartListeners();
  }

  setupCartDrawerObserver() {
    // Watch for changes in cart drawer content
    const cartDrawer = document.querySelector('#CartDrawer');
    if (cartDrawer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Check if cart motivator was added or content changed
          const cartMotivatorAdded = Array.from(mutation.addedNodes).some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node.querySelector?.('[data-motivator-cart]') ||
                node.matches?.('[data-motivator-cart]')),
          );

          if (cartMotivatorAdded) {
            this.cartMotivator = document.querySelector(
              '[data-motivator-cart]',
            );

            this.setupElements();
            this.lastCartValue = -1; // Force update

            this.fetchCart()
              .then(async () => {
                await this.update();
              })
              .catch(console.error);
          }
        });
      });

      observer.observe(cartDrawer, {
        childList: true,
        subtree: true,
      });

      this.cartDrawerObserver = observer;
    }
  }

  setupRebuyCartListeners() {
    // Listen for Rebuy-specific cart events
    document.addEventListener('rebuy:cart.change', () => {
      console.log('🛒 Rebuy cart change detected');
      setTimeout(() => {
        this.fetchCart()
          .then(() => {
            this.update();
            this.updateCartItems(); // Refresh cart items display
          })
          .catch(console.error);
      }, 500); // Small delay to ensure cart is updated
    });

    // Listen for Rebuy button clicks using event delegation
    document.addEventListener('click', (event) => {
      const rebuyButton = event.target.closest('.rebuy-button');
      if (rebuyButton) {
        console.log('🛒 Rebuy add to cart button clicked');
        // Wait a bit for the cart to be updated, then refresh
        setTimeout(() => {
          this.fetchCart()
            .then(() => {
              this.update();
              this.updateCartItems(); // Refresh cart items display
            })
            .catch(console.error);
        }, 1000); // Longer delay for add to cart operations
      }
    });

    // Also listen for any Rebuy widget events
    document.addEventListener('rebuy:widget.cart-add', () => {
      console.log('🛒 Rebuy widget cart add detected');
      setTimeout(() => {
        this.fetchCart()
          .then(() => {
            this.update();
            this.updateCartItems(); // Refresh cart items display
          })
          .catch(console.error);
      }, 500);
    });

    // Listen for general Rebuy events that might indicate cart changes
    document.addEventListener('rebuy:cart.updated', () => {
      console.log('🛒 Rebuy cart updated event detected');
      setTimeout(() => {
        this.fetchCart()
          .then(() => {
            this.update();
            this.updateCartItems(); // Refresh cart items display
          })
          .catch(console.error);
      }, 300);
    });
  }

  interceptCartRequests() {
    // Only intercept if we haven't already done so
    if (window.shippingMotivatorIntercepted) return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Check if this is a cart-related request
      if (
        args[0] &&
        (args[0].includes('/cart/') ||
          args[0].includes('/cart.js') ||
          args[0].includes('/cart/add') ||
          args[0].includes('/cart/update') ||
          args[0].includes('/cart/change'))
      ) {
        // Update cart after a minimal delay
        setTimeout(() => {
          if (
            window.shippingMotivator &&
            window.shippingMotivator.initialized &&
            !window.shippingMotivator.fetchingCart &&
            !window.shippingMotivator.processingGWP &&
            !window.shippingMotivator.removingGWP &&
            !window.shippingMotivator.internalFetch
          ) {
            window.shippingMotivator
              .fetchCart()
              .then(async () => await window.shippingMotivator.update())
              .catch(console.error);
          }
        }, 10);
      }

      return response;
    };

    window.shippingMotivatorIntercepted = true;
  }

  show() {
    // Check display settings from configuration
    const displaySetting = this.getDisplaySetting();

    if (
      this.bannerMotivator &&
      (displaySetting === 'banner' || displaySetting === 'both')
    ) {
      this.bannerMotivator.classList.remove('shipping-motivator--hidden');
      this.bannerMotivator.setAttribute('aria-hidden', 'false');
    }
    if (
      this.cartMotivator &&
      (displaySetting === 'cart' || displaySetting === 'both')
    ) {
      // Only setup goals if they're missing
      const goalsContainer = this.cartMotivator.querySelector(
        '#cart-goals-container',
      );
      if (goalsContainer && goalsContainer.children.length === 0) {
        this.setupCartGoals();
      }

      this.cartMotivator.classList.remove('shipping-motivator--hidden');
      this.cartMotivator.setAttribute('aria-hidden', 'false');
    }
  }

  showIfNeeded() {
    // Check display settings from configuration
    const displaySetting = this.getDisplaySetting();

    // Only show banner if not already visible
    if (
      this.bannerMotivator &&
      (displaySetting === 'banner' || displaySetting === 'both') &&
      this.bannerMotivator.classList.contains('shipping-motivator--hidden')
    ) {
      this.bannerMotivator.classList.remove('shipping-motivator--hidden');
      this.bannerMotivator.setAttribute('aria-hidden', 'false');
    }

    // Only show cart if not already visible
    if (
      this.cartMotivator &&
      (displaySetting === 'cart' || displaySetting === 'both') &&
      this.cartMotivator.classList.contains('shipping-motivator--hidden')
    ) {
      // Only setup goals if they're missing
      const goalsContainer = this.cartMotivator.querySelector(
        '#cart-goals-container',
      );
      if (goalsContainer && goalsContainer.children.length === 0) {
        this.setupCartGoals();
      }

      this.cartMotivator.classList.remove('shipping-motivator--hidden');
      this.cartMotivator.setAttribute('aria-hidden', 'false');
    }
  }

  getDisplaySetting() {
    // Try to get display setting from any announcement bar section on the page
    const announcementBar = document.querySelector('.announcement-bar-section');
    if (announcementBar) {
      // Look for shipping motivator in the announcement bar to determine display setting
      const bannerMotivator = announcementBar.querySelector('[data-motivator]');
      if (bannerMotivator) {
        // If banner motivator exists, assume "both" or "banner"
        return this.cartMotivator ? 'both' : 'banner';
      }
    }

    // Default to showing cart if cart motivator exists
    return this.cartMotivator ? 'cart' : 'banner';
  }

  applyProportionalWidths() {
    if (!this.config || !this.config.goals || this.config.goals.length === 0)
      return;

    // Sort goals by value to calculate segments correctly
    const sortedGoals = [...this.config.goals].sort(
      (a, b) => a.value - b.value,
    );
    const highestGoalValue = sortedGoals[sortedGoals.length - 1].value;

    // Apply to both banner and cart goals
    ['banner', 'cart'].forEach((type) => {
      const elements = this.elements[type];
      if (elements?.goals && elements.goals.length > 0) {
        elements.goals.forEach((goalElement) => {
          const goalValue = parseInt(goalElement.dataset.goalValue);
          if (!isNaN(goalValue)) {
            // Find the previous goal value (or 0 for the first goal)
            const goalIndex = sortedGoals.findIndex(
              (goal) => goal.value === goalValue,
            );
            const previousGoalValue =
              goalIndex > 0 ? sortedGoals[goalIndex - 1].value : 0;

            // Calculate segment width: (current goal - previous goal) / highest goal * 100
            const segmentWidth =
              ((goalValue - previousGoalValue) / highestGoalValue) * 100;
            goalElement.style.width = `${segmentWidth}%`;
          }
        });
      }
    });
  }

  setupCartGoals() {
    if (!this.cartMotivator || !this.config || !this.config.goals) return;

    const goalsContainer = this.cartMotivator.querySelector(
      '#cart-goals-container',
    );
    if (goalsContainer && this.config.goals.length > 0) {
      console.log('Setting up cart goals:', this.config.goals.length);

      // Sort goals by value to calculate segments correctly
      const sortedGoals = [...this.config.goals].sort(
        (a, b) => a.value - b.value,
      );
      const highestGoalValue = sortedGoals[sortedGoals.length - 1].value;

      goalsContainer.innerHTML = this.config.goals
        .map((goal) => {
          // Find the previous goal value (or 0 for the first goal)
          const goalIndex = sortedGoals.findIndex(
            (g) => g.value === goal.value,
          );
          const previousGoalValue =
            goalIndex > 0 ? sortedGoals[goalIndex - 1].value : 0;

          // Calculate segment width: (current goal - previous goal) / highest goal * 100
          const proportionalWidth =
            ((goal.value - previousGoalValue) / highestGoalValue) * 100;

          return `
        <div 
          class="shipping-motivator__goal"
          data-goal-type="${goal.type}"
          data-goal-value="${goal.value}"
          data-goal-title="${goal.title}"
          data-goal-message="${goal.message}"
          style="width: ${proportionalWidth}%;">
          <div class="shipping-motivator__goal-marker">
            <div class="shipping-motivator__goal-label tw-flex tw-gap-1">
							<span class="shipping-motivator__goal-checkmark">✓</span>
              <span class="shipping-motivator__goal-title">${goal.title}</span>
            </div>
          </div>
        </div>
      `;
        })
        .join('');

      // Re-setup elements after adding goals
      this.setupElements();

      console.log('Cart goals populated successfully');
    }
  }

  hide() {
    if (this.bannerMotivator) {
      this.bannerMotivator.classList.add('shipping-motivator--hidden');
    }
    if (this.cartMotivator) {
      this.cartMotivator.classList.add('shipping-motivator--hidden');
    }
  }

  formatMoney(amount) {
    const money = amount / 100;
    let formatted = money.toFixed(2);

    // Omit decimals if zero
    if (formatted.endsWith('.00')) {
      formatted = formatted.slice(0, -3);
    }
    return this.config.moneyFormat.replace(/\{\{\s*amount\s*\}\}/, formatted);
  }

  getCurrentGoal() {
    const cartValue = this.cart.total_price;
    const sortedGoals = this.config.goals
      .filter((goal) => {
        // If goal value is higher than cart value, it's definitely not complete
        if (goal.value > cartValue) return true;

        // If goal value is reached, check if it's actually fulfilled
        if (goal.type === 'goal_gwp_collection') {
          return !this.isCollectionGoalFulfilled(goal);
        }

        // For other goal types, if value is reached, it's complete
        return false;
      })
      .sort((a, b) => a.value - b.value);

    return sortedGoals.length > 0 ? sortedGoals[0] : null;
  }

  getCompletedGoals() {
    const cartValue = this.cart.total_price;
    return this.config.goals.filter((goal) => {
      if (goal.value > cartValue) return false;

      // For collection goals, check if they're actually fulfilled (product selected)
      if (goal.type === 'goal_gwp_collection') {
        return this.isCollectionGoalFulfilled(goal);
      }

      return true;
    });
  }

  // Get goals that have reached threshold but aren't necessarily fulfilled
  getReachedGoals() {
    if (!this.cart) {
      console.warn('⚠️ Cart is null in getReachedGoals');
      return [];
    }
    const cartValue = this.cart.total_price;
    return this.config.goals.filter((goal) => goal.value <= cartValue);
  }

  // Check if a collection goal is actually fulfilled (product was selected)
  isCollectionGoalFulfilled(goal) {
    // Ensure we're checking with consistent data types (convert both to strings)
    const collectionIdStr = String(goal.collectionId);
    const isMarkedAsFulfilled =
      this.fulfilledCollectionGoals.has(collectionIdStr);

    console.log(`🔍 isCollectionGoalFulfilled check for ${goal.title}:`, {
      collectionIdStr,
      isMarkedAsFulfilled,
      fulfilledGoalsSize: this.fulfilledCollectionGoals.size,
      fulfilledGoals: [...this.fulfilledCollectionGoals],
    });

    // Primary check: is this goal permanently marked as fulfilled?
    if (isMarkedAsFulfilled) {
      console.log(`✅ Goal ${goal.title} is marked as fulfilled`);
      return true;
    }

    // If not permanently fulfilled, then it's not fulfilled
    // (We don't use active slider as a fallback for fulfillment)
    console.log(`❌ Goal ${goal.title} is NOT fulfilled`);
    return false;
  }

  getHighestGoal() {
    return this.config.goals.reduce(
      (highest, goal) => (goal.value > highest.value ? goal : highest),
      this.config.goals[0] || { value: 0 },
    );
  }
  async update() {
    // Rate limiting - prevent excessive updates
    const now = Date.now();
    if (now - this.lastUpdateTime < 100) {
      // Minimum 100ms between updates
      return;
    }
    this.lastUpdateTime = now;

    // Defensive check - ensure cart data is available
    if (!this.cart) {
      console.warn('⚠️ Cart data is null, skipping update');
      return;
    }

    // CRITICAL FIX: Ensure fulfilled collection goals are restored from sessionStorage
    // This handles cases where the Set gets cleared during DOM updates/cart changes
    if (this.fulfilledCollectionGoals.size === 0) {
      try {
        const stored = sessionStorage.getItem(
          'shippingMotivatorFulfilledCollections',
        );
        if (stored) {
          const storedGoals = JSON.parse(stored);
          if (Array.isArray(storedGoals) && storedGoals.length > 0) {
            this.fulfilledCollectionGoals = new Set(
              storedGoals.map((id) => String(id)),
            );
            console.log('🔄 AUTO-RESTORED fulfilled goals in update():', [
              ...this.fulfilledCollectionGoals,
            ]);
          }
        }
      } catch (error) {
        console.warn('Failed to auto-restore fulfilled goals:', error);
      }
    }

    if (!this.cart || !this.config || this.config.goals.length === 0) {
      this.hide();
      return;
    }

    // For cart drawer, check if cart is empty - only hide if truly empty
    if (this.cart.item_count === 0) {
      this.hide();
      return;
    }

    const cartValue = this.cart.total_price;

    // Re-find cart motivator if it was replaced by AJAX
    if (!this.cartMotivator || !document.contains(this.cartMotivator)) {
      this.cartMotivator = document.querySelector('[data-motivator-cart]');
      if (this.cartMotivator) {
        this.setupElements();
        this.setupCartGoals(); // Ensure goals are populated
        // Force cache reset to ensure update happens
        this.lastCartValue = -1;
      }
    }

    // Performance check: Skip update if cart value hasn't changed
    if (cartValue === this.lastCartValue) {
      return;
    }

    // Check if elements are still available (in case DOM was updated)
    if (
      this.elements.banner &&
      (!this.elements.banner.progressFill ||
        !this.bannerMotivator?.querySelector(
          '.shipping-motivator__progress-fill',
        ))
    ) {
      console.log('Banner motivator elements missing, reinitializing...');
      this.setupElements();
    }
    if (
      this.elements.cart &&
      (!this.elements.cart.progressFill ||
        !this.cartMotivator?.querySelector(
          '.shipping-motivator__progress-fill',
        ))
    ) {
      console.log('Cart motivator elements missing, reinitializing...');
      this.setupElements();
    }

    // Check if cart goals need to be repopulated (but not too frequently)
    if (this.cartMotivator && !this.processingGWP && !this.removingGWP) {
      const goalsContainer = this.cartMotivator.querySelector(
        '#cart-goals-container',
      );
      if (goalsContainer && goalsContainer.children.length === 0) {
        console.log('Cart goals missing, repopulating...');
        this.setupCartGoals();
      }
    }

    const currentGoal = this.getCurrentGoal();
    const completedGoals = this.getCompletedGoals();
    const reachedGoals = this.getReachedGoals(); // Goals that reached threshold
    const highestGoal = this.getHighestGoal();
    const allGoalsCompleted =
      completedGoals.length === this.config.goals.length;

    // Debug logging for collection goal visibility issue
    console.log(
      `🎯 Goal Status: completed=${completedGoals.length}/${
        this.config.goals.length
      }, current=${
        currentGoal?.type || 'none'
      }, allComplete=${allGoalsCompleted}`,
    );

    // Enhanced debug logging for GWP issues
    console.log('📊 Goal Details:');
    this.config.goals.forEach((goal, index) => {
      const isCompleted = cartValue >= goal.value;
      const isReached = cartValue >= goal.value;
      console.log(
        `  ${index + 1}. ${goal.title} ($${goal.value / 100}) - Type: ${
          goal.type
        }, Completed: ${isCompleted}, Removable: ${goal.removable || false}`,
      );
    });

    // Check for newly reached GWP goals and auto-add products
    // Store current completed goals before processing changes
    const currentPreviousGoals = [...this.lastCompletedGoals];

    this.handleGiftWithPurchase(reachedGoals);

    // Check for previously completed but now uncompleted removable GWP goals
    // Use the stored previous goals for comparison
    if (currentPreviousGoals.length > 0) {
      console.log('🔍 Checking for GWP removals');
      this.handleGiftWithPurchaseRemoval(reachedGoals, currentPreviousGoals);
    } else {
      console.log('🔍 Skipping GWP removal check (no previous state)');
    }

    // Check for removed collection products (always run to handle threshold changes)
    console.log('🔍 Running collection product check in update()...');
    await this.checkForRemovedCollectionProducts();

    // Handle collection product sliders for newly reached collection goals
    this.handleCollectionGoals(reachedGoals, currentPreviousGoals);

    // Calculate progress percentage
    const progressPercentage = Math.min(
      (cartValue / highestGoal.value) * 100,
      100,
    );

    // Check if we need to update based on actual changes
    const needsUpdate = this.shouldUpdate(
      cartValue,
      progressPercentage,
      currentGoal,
      completedGoals,
    );

    if (!needsUpdate) {
      return;
    }

    try {
      // Update both banner and cart motivators
      ['banner', 'cart'].forEach((type) => {
        const elements = this.elements[type];
        if (elements) {
          this.updateMotivator(
            elements,
            progressPercentage,
            allGoalsCompleted,
            currentGoal,
            completedGoals,
            cartValue,
          );
        }
      });

      // Only show if not already visible to avoid unnecessary transitions
      this.showIfNeeded();

      // Small delay to ensure smooth transition after show
      setTimeout(() => {
        this.updateProgressBars(progressPercentage, allGoalsCompleted);
      }, 10);

      // Update cache values - store current completed goals as previous for next update
      this.previouslyCompletedGoals = [...completedGoals];

      // Also store in sessionStorage for persistence across cart drawer refreshes
      try {
        sessionStorage.setItem(
          'shippingMotivatorPreviousGoals',
          JSON.stringify(completedGoals),
        );
      } catch (e) {
        // Ignore storage errors
      }

      this.lastCartValue = cartValue;
      this.lastProgressPercentage = progressPercentage;
      this.lastCurrentGoal = currentGoal;
      this.lastCompletedGoals = [...completedGoals];
    } catch (error) {
      console.error('Error updating shipping motivator:', error);
      setTimeout(() => {
        this.setupElements();
      }, 500);
    }
  }

  shouldUpdate(cartValue, progressPercentage, currentGoal, completedGoals) {
    // Check if any key values have changed
    if (cartValue !== this.lastCartValue) return true;
    if (Math.abs(progressPercentage - this.lastProgressPercentage) > 0.1)
      return true;
    if (currentGoal?.id !== this.lastCurrentGoal?.id) return true;
    if (completedGoals.length !== this.lastCompletedGoals.length) return true;

    // Check if completed goals have changed
    for (let i = 0; i < completedGoals.length; i++) {
      if (completedGoals[i].id !== this.lastCompletedGoals[i]?.id) return true;
    }

    return false;
  }

  updateMotivator(
    elements,
    progressPercentage,
    allGoalsCompleted,
    currentGoal,
    completedGoals,
    cartValue,
  ) {
    // Skip progress bar updates in main update - handled separately for smooth transitions

    // Update message
    this.updateMessage(
      elements,
      currentGoal,
      allGoalsCompleted,
      completedGoals,
    );

    // Update goal markers
    this.updateGoalMarkers(elements, completedGoals, cartValue);
  }

  updateProgressBars(progressPercentage, allGoalsCompleted) {
    ['banner', 'cart'].forEach((type) => {
      const elements = this.elements[type];
      if (elements?.progressFill) {
        const currentWidth = parseInt(elements.progressFill.style.width) || 0;
        const newWidth = Math.round(progressPercentage);

        if (currentWidth !== newWidth) {
          elements.progressFill.style.width = `${progressPercentage}%`;
        }

        // Add/remove completed class only if state changed
        const hasCompleteClass = elements.progressContainer?.classList.contains(
          'shipping-motivator__progress--complete',
        );

        if (allGoalsCompleted && !hasCompleteClass) {
          elements.progressContainer?.classList.add(
            'shipping-motivator__progress--complete',
          );
        } else if (!allGoalsCompleted && hasCompleteClass) {
          elements.progressContainer?.classList.remove(
            'shipping-motivator__progress--complete',
          );
        }
      }

      // Update progress text only if changed
      if (elements?.progressText) {
        const newText = `${Math.round(progressPercentage)}%`;
        if (elements.progressText.textContent !== newText) {
          elements.progressText.textContent = newText;
        }
      }
    });
  }

  updateMessage(elements, currentGoal, allGoalsCompleted, completedGoals) {
    if (!elements.message) return;

    let message;

    // Check if there are any active collection sliders (reached but not fulfilled)
    const activeCollectionGoal = this.getActiveCollectionGoal();

    // Double-check if all goals are actually completed by verifying cart value
    // This prevents stale "all complete" messages during reset transitions
    const cartValue = this.cart.total_price;
    const actuallyAllCompleted =
      allGoalsCompleted &&
      this.config.goals.every((goal) => {
        if (goal.type === 'goal_gwp_collection') {
          return (
            cartValue >= goal.value && this.isCollectionGoalFulfilled(goal)
          );
        }
        return cartValue >= goal.value;
      });

    // Debug logging for message state
    if (allGoalsCompleted !== actuallyAllCompleted) {
      console.log(
        `🔍 MESSAGE DEBUG: allGoalsCompleted=${allGoalsCompleted} vs actuallyAllCompleted=${actuallyAllCompleted}, cartValue=${cartValue}`,
      );
    }

    if (activeCollectionGoal) {
      // Show the goal's complete message while slider is active
      message = activeCollectionGoal.message;
    } else if (actuallyAllCompleted) {
      message = this.config.templates.complete;
    } else {
      // Check if we have recently fulfilled collection goals that should show completion message
      const recentlyFulfilledCollectionGoal = this.config.goals.find((goal) => {
        return (
          goal.type === 'goal_gwp_collection' &&
          cartValue >= goal.value &&
          this.isCollectionGoalFulfilled(goal)
        );
      });

      if (recentlyFulfilledCollectionGoal) {
        // Show a completion message for fulfilled collection goal
        message = this.config.templates.complete;
      } else if (currentGoal) {
        const remainingAmount = currentGoal.value - cartValue;

        // Don't show message if remaining amount is negative (goal already reached)
        if (remainingAmount <= 0) {
          message =
            currentGoal.type === 'goal_gwp_collection'
              ? currentGoal.message
              : this.config.templates.complete;
        } else {
          message = this.config.templates.progress
            .replace('[MONEY]', this.formatMoney(remainingAmount))
            .replace('[GOAL]', currentGoal.title);
        }
      } else {
        // Default message if no current goal
        message = this.config.templates.progress;
      }
    }

    // Only update text if it has actually changed
    if (elements.message.textContent !== message) {
      elements.message.textContent = message;
      this.lastMessage = message;
    }
  }

  // Get the active collection goal (reached threshold but slider still showing)
  getActiveCollectionGoal() {
    const reachedGoals = this.getReachedGoals();
    return reachedGoals.find((goal) => {
      if (goal.type !== 'goal_gwp_collection') return false;
      const activeSlider = document.querySelector(
        `[data-collection-slider="${goal.collectionId}"]:not(.collection-slider--hidden)`,
      );
      return !!activeSlider;
    });
  }

  updateGoalMarkers(elements, completedGoals, cartValue) {
    if (!elements.goals || elements.goals.length === 0) return;

    elements.goals.forEach((goalElement) => {
      const goalValue = parseInt(goalElement.dataset.goalValue);
      const isCompleted = cartValue >= goalValue;

      goalElement.classList.toggle(
        'shipping-motivator__goal--completed',
        isCompleted,
      );

      const checkmark = goalElement.querySelector(
        '.shipping-motivator__goal-checkmark',
      );
      if (checkmark) {
        checkmark.style.opacity = isCompleted ? '1' : '0';
      }
    });
  }

  async handleGiftWithPurchase(completedGoals) {
    // Skip if we're already processing GWP or if we don't have a cart yet
    if (this.processingGWP || !this.cart || !this.cart.items) return;

    // Find newly completed goal_gwp_product goals
    const newlyCompletedGWPGoals = completedGoals.filter((goal) => {
      return (
        goal.type === 'goal_gwp_product' &&
        goal.productId &&
        !this.lastCompletedGoals.some((lastGoal) => lastGoal.id === goal.id)
      );
    });

    if (newlyCompletedGWPGoals.length === 0) return;

    console.log(
      '🎁 Processing GWP goals:',
      newlyCompletedGWPGoals.map((g) => `${g.title} (${g.productId})`),
    );

    // Set processing flag to prevent duplicate additions
    this.processingGWP = true;

    // Group goals by product to prevent duplicate additions of the same product
    const productGroups = {};
    newlyCompletedGWPGoals.forEach((goal) => {
      if (!productGroups[goal.productId]) {
        productGroups[goal.productId] = goal;
      }
    });

    console.log('🎁 Unique products to add:', Object.keys(productGroups));

    // Add products for newly completed GWP goals (deduplicated)
    for (const productId of Object.keys(productGroups)) {
      const goal = productGroups[productId];
      try {
        // Check if this product is already in the cart (by handle)
        const isAlreadyInCart = this.cart.items.some(
          (item) => item.handle === goal.productId,
        );

        if (isAlreadyInCart) {
          console.log('🎁 GWP product already in cart:', goal.title);
          continue;
        }

        // Get first available variant from product handle
        const variantId = await this.getFirstAvailableVariant(goal.productId);
        if (!variantId) {
          console.error(
            '❌ No available variant found for GWP product:',
            goal.productId,
          );
          continue;
        }

        console.log(
          '🎁 Adding gift with purchase:',
          goal.title,
          'Variant ID:',
          variantId,
        );
        await this.addProductToCart(variantId, 1);
        console.log('✅ Successfully added GWP product to cart');

        // Add delay between multiple additions to prevent race conditions
        if (Object.keys(productGroups).length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error('❌ Failed to add GWP product:', error);
        // Continue with other products even if one fails
      }
    }

    // Clear processing flag
    this.processingGWP = false;
  }

  async handleGiftWithPurchaseRemoval(
    currentCompletedGoals,
    previousGoals = null,
  ) {
    // Skip if we're already processing GWP operations or if we don't have a cart yet
    if (
      this.removingGWP ||
      this.processingGWP ||
      !this.cart ||
      !this.cart.items
    )
      return;

    // Use passed previousGoals or fall back to stored ones
    const previousCompletedGoals =
      previousGoals || this.previouslyCompletedGoals;

    console.log('🔍 Checking for GWP removals...');
    console.log(
      '🔍 Previously completed goals:',
      previousCompletedGoals.length,
    );
    console.log('🔍 Currently completed goals:', currentCompletedGoals.length);

    // Find goals that were previously completed but are no longer completed
    const uncompletedGwpGoals = previousCompletedGoals.filter(
      (previousGoal) => {
        const isGwpProduct = previousGoal.type === 'goal_gwp_product';
        const hasProductId = previousGoal.productId;
        const isRemovable = previousGoal.removable;
        const stillCompleted = currentCompletedGoals.some(
          (currentGoal) => currentGoal.id === previousGoal.id,
        );

        console.log(`🔍 Goal check for: ${previousGoal.title}`);
        console.log(`  - isGwpProduct: ${isGwpProduct}`);
        console.log(`  - hasProductId: ${hasProductId}`);
        console.log(`  - isRemovable: ${isRemovable}`);
        console.log(`  - stillCompleted: ${stillCompleted}`);
        console.log(
          `  - shouldRemove: ${
            isGwpProduct && hasProductId && isRemovable && !stillCompleted
          }`,
        );

        return isGwpProduct && hasProductId && isRemovable && !stillCompleted;
      },
    );

    console.log(
      '🔍 Uncompleted removable GWP goals:',
      uncompletedGwpGoals.length,
    );

    if (uncompletedGwpGoals.length === 0) return;

    // Set processing flag to prevent duplicate removals
    this.removingGWP = true;

    // Remove products for uncompleted removable GWP goals
    for (const goal of uncompletedGwpGoals) {
      try {
        console.log(
          '🗑️ Removing GWP product (goal no longer met):',
          goal.title,
        );
        await this.removeProductFromCart(goal.productId);
        console.log('✅ Successfully removed GWP product from cart');

        // Small delay between removals to prevent overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error('❌ Failed to remove GWP product:', error);
        // Continue with other products even if one fails
      }
    }

    // Clear processing flag
    this.removingGWP = false;
  }

  async removeProductFromCart(productHandle) {
    console.log('🔍 Looking for product to remove:', productHandle);

    // First, find the cart line item that matches this product handle
    const cartItem = this.cart.items.find(
      (item) => item.handle === productHandle,
    );

    if (!cartItem) {
      console.log(
        '🔍 GWP product not found in cart for removal:',
        productHandle,
      );

      return;
    }

    console.log('🔍 Found cart item to remove:', cartItem.product_title);

    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: cartItem.key,
        quantity: 0,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Failed to remove product ${productHandle} from cart`;
      try {
        const errorData = await response.json();
        errorMessage =
          errorData.message || errorData.description || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('🗑️ GWP Product removed from cart:', result);

    // Trigger a visual update of the cart drawer
    this.updateCartItems();

    return result;
  }

  async addProductToCart(productId, quantity = 1) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: productId,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Failed to add product ${productId} to cart`;
      try {
        const errorData = await response.json();
        errorMessage =
          errorData.message || errorData.description || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('🛒 GWP Product added to cart:', result);

    // Trigger a targeted cart items update without full refresh
    this.updateCartItems();

    return result;
  }

  async getFirstAvailableVariant(productHandle) {
    try {
      const response = await fetch(`/products/${productHandle}.js`);
      if (!response.ok) {
        throw new Error(`Product not found: ${productHandle}`);
      }

      const product = await response.json();

      // Find first available variant
      const availableVariant = product.variants.find(
        (variant) => variant.available && variant.inventory_quantity > 0,
      );

      // If no variant with inventory, get first available variant
      const firstAvailable =
        availableVariant ||
        product.variants.find((variant) => variant.available);

      return firstAvailable ? firstAvailable.id : null;
    } catch (error) {
      console.error('❌ Error fetching product variants:', error);
      return null;
    }
  }

  updateCartItems() {
    // Fetch only the cart items section to update the visual cart
    fetch(window.location.href + '?section_id=cart-drawer')
      .then((response) => response.text())
      .then((html) => {
        // Parse the HTML response
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the cart items container in the new HTML
        const newCartItems = doc.querySelector('#CartDrawer-CartItems');
        const currentCartItems = document.querySelector(
          '#CartDrawer-CartItems',
        );

        if (newCartItems && currentCartItems) {
          // Only update the cart items, not the entire drawer
          currentCartItems.innerHTML = newCartItems.innerHTML;
          console.log('🛒 Cart items updated');

          // Update cart count/total if needed
          const newCartCount = doc.querySelector('.cart-count-bubble');
          const currentCartCount = document.querySelector('.cart-count-bubble');
          if (newCartCount && currentCartCount) {
            currentCartCount.textContent = newCartCount.textContent;
          }

          // Note: checkForRemovedCollectionProducts is now called in main update() method

          // Dispatch event for other scripts
          document.dispatchEvent(new CustomEvent('cart:updated'));
        } else {
          console.log('🔄 Fallback: Using full refresh method');
          this.refreshCartDrawer();
        }
      })
      .catch((error) => {
        console.error('❌ Failed to update cart items:', error);
        this.refreshCartDrawer();
      });
  }

  async checkForRemovedCollectionProducts() {
    try {
      // Get current cart to check which products are still present
      await this.fetchCart(); // Refresh cart data

      if (!this.cart || !this.cart.items) {
        console.log(
          '⚠️ No cart data available, skipping collection product check',
        );
        return;
      }

      const currentProductIds = this.cart.items.map((item) => item.variant_id);

      console.log('🔍 Checking for removed collection products...');
      console.log('🛒 Current cart product IDs:', currentProductIds);
      console.log('💰 Current cart value:', this.cart.total_price);
      console.log('🎯 Fulfilled collection goals:', [
        ...this.fulfilledCollectionGoals,
      ]);

      // Check each fulfilled collection goal to see if it should be reset
      const goalsToReset = [];
      for (const collectionId of this.fulfilledCollectionGoals) {
        // Find the collection goal configuration
        const collectionGoal = this.config.goals.find(
          (goal) =>
            goal.type === 'goal_gwp_collection' &&
            String(goal.collectionId) === String(collectionId),
        );

        if (!collectionGoal) {
          console.log(`⚠️ Collection goal not found for ID: ${collectionId}`);
          continue;
        }

        // Reset if cart value is below threshold (goal no longer reached)
        if (this.cart.total_price < collectionGoal.value) {
          console.log(
            `📉 Cart value $${
              this.cart.total_price / 100
            } is below goal threshold $${
              collectionGoal.value / 100
            }, resetting collection goal ${collectionId}`,
          );
          goalsToReset.push(collectionId);
          continue; // Skip product check if threshold not met
        }

        // Check if any products from this collection are still in cart
        // We need to fetch the collection products to check
        try {
          const collectionProducts = await this.fetchCollectionProducts(
            collectionGoal.collectionHandle || collectionGoal.collectionId,
          );
          const collectionProductIds = collectionProducts.flatMap((product) =>
            product.variants.map((variant) => variant.id),
          );

          // Check if any collection products are still in cart
          const hasCollectionProductInCart = collectionProductIds.some(
            (productId) => currentProductIds.includes(productId),
          );

          if (!hasCollectionProductInCart) {
            console.log(
              `🗑️ No products from collection ${collectionId} found in cart, resetting goal fulfillment`,
            );
            goalsToReset.push(collectionId);
          } else {
            console.log(
              `✅ Collection ${collectionId} still has products in cart`,
            );
          }
        } catch (error) {
          console.error(`❌ Error checking collection ${collectionId}:`, error);
        }
      }

      // Reset the goals that should no longer be fulfilled
      if (goalsToReset.length > 0) {
        for (const collectionId of goalsToReset) {
          this.fulfilledCollectionGoals.delete(String(collectionId));
          console.log(
            `🔄 Reset fulfillment for collection goal: ${collectionId}`,
          );
        }

        // Update sessionStorage
        sessionStorage.setItem(
          'shippingMotivatorFulfilledCollections',
          JSON.stringify([...this.fulfilledCollectionGoals]),
        );

        console.log('💾 Updated fulfilled collection goals in storage:', [
          ...this.fulfilledCollectionGoals,
        ]);
      }
    } catch (error) {
      console.error('❌ Error in checkForRemovedCollectionProducts:', error);
    }
  }

  refreshCartDrawer() {
    // Instead of replacing the entire cart drawer, just dispatch events
    // and let the natural cart update cycle handle the refresh
    console.log('🔄 Triggering cart drawer refresh via events');

    // Dispatch cart updated event for other scripts
    document.dispatchEvent(new CustomEvent('cart:updated'));

    // Try theme-specific refresh methods
    this.fallbackCartRefresh();
  }

  fallbackCartRefresh() {
    // Dispatch custom cart updated event
    document.dispatchEvent(new CustomEvent('cart:updated'));

    // Try theme-specific refresh methods
    if (window.theme && window.theme.cart && window.theme.cart.refresh) {
      window.theme.cart.refresh();
    }

    // Try global cart refresh
    if (window.refreshCart && typeof window.refreshCart === 'function') {
      window.refreshCart();
    }

    console.log('🔄 Fallback cart refresh triggered');
  }

  // Handle collection product sliders for completed goals
  async handleCollectionGoals(completedGoals, previousGoals = []) {
    console.log('🎁 Checking collection goals...');

    // Clean up any duplicate sliders first
    this.cleanupDuplicateSliders();

    // Get collection goals that have reached threshold but are NOT yet fulfilled
    const reachedGoals = this.getReachedGoals();
    const unfulfilledCollectionGoals = reachedGoals.filter(
      (goal) =>
        goal.type === 'goal_gwp_collection' &&
        goal.collectionId &&
        !this.isCollectionGoalFulfilled(goal), // ← CRITICAL FIX: Only show if not fulfilled
    );

    console.log('🔍 COLLECTION DEBUG:', {
      reachedGoals: reachedGoals.length,
      unfulfilledCollectionGoals: unfulfilledCollectionGoals.length,
      unfulfilledGoalTitles: unfulfilledCollectionGoals.map((g) => g.title),
    });

    // Find collection goals that should have sliders but don't
    const goalsNeedingSliders = unfulfilledCollectionGoals.filter((goal) => {
      const existingSlider = document.querySelector(
        `[data-collection-slider="${goal.collectionId}"]:not(.collection-slider--hidden)`,
      );
      const hasHiddenSlider = document.querySelector(
        `[data-collection-slider="${goal.collectionId}"].collection-slider--hidden`,
      );

      return !existingSlider;
    });

    // Find collection goals that have sliders but shouldn't (no longer reached)
    const goalsToHide = [];
    document
      .querySelectorAll(
        '[data-collection-slider]:not(.collection-slider--hidden)',
      )
      .forEach((slider) => {
        const collectionId = slider.dataset.collectionSlider;
        const isStillReached = unfulfilledCollectionGoals.some(
          (goal) => goal.collectionId === collectionId,
        );
        if (!isStillReached) {
          // Find the goal info for this collection ID
          const goalToHide = this.config.goals.find(
            (g) =>
              g.type === 'goal_gwp_collection' &&
              g.collectionId === collectionId,
          );
          if (goalToHide) {
            goalsToHide.push(goalToHide);
          }
        }
      });

    // Show sliders for goals that need them
    for (const goal of goalsNeedingSliders) {
      await this.showCollectionSlider(goal);
    }

    // Hide sliders for goals that no longer qualify
    for (const goal of goalsToHide) {
      console.log('🎁 Hiding collection slider for:', goal.title);
      this.hideCollectionSlider(goal);
    }
  }

  // Show collection product slider
  async showCollectionSlider(goal) {
    try {
      // Check if slider already exists
      const existingSlider = document.querySelector(
        `[data-collection-slider="${goal.collectionId}"]`,
      );
      if (existingSlider) {
        console.log(
          `🔍 Found existing slider for collection ${goal.collectionId}, showing it`,
        );
        existingSlider.classList.remove('collection-slider--hidden');
        return;
      }

      console.log(`🎯 Creating new collection slider for: ${goal.title}`);

      // Double-check if there are any duplicate sliders before creating a new one
      const allSliders = document.querySelectorAll(
        `[data-collection-slider="${goal.collectionId}"]`,
      );
      if (allSliders.length > 0) {
        console.log(
          `⚠️ Found ${allSliders.length} existing sliders, removing duplicates`,
        );
        allSliders.forEach((slider, index) => {
          if (index > 0) {
            slider.remove();
          } else {
            slider.classList.remove('collection-slider--hidden');
          }
        });
        return;
      }

      // Fetch collection products
      const products = await this.fetchCollectionProducts(
        goal.collectionId,
        goal.collectionHandle,
      );
      if (!products || products.length === 0) {
        console.log('❌ No products found in collection:', goal.collectionId);
        return;
      }

      // Create slider HTML
      const sliderHTML = this.createCollectionSliderHTML(goal, products);

      // Insert slider into cart drawer
      this.insertCollectionSlider(sliderHTML);

      // Initialize Swiper
      this.initializeCollectionSwiper(goal.collectionId);
    } catch (error) {
      console.error('❌ Failed to show collection slider:', error);
    }
  }

  // Hide collection product slider
  hideCollectionSlider(goal) {
    const slider = document.querySelector(
      `[data-collection-slider="${goal.collectionId}"]`,
    );
    if (slider) {
      slider.classList.add('collection-slider--hidden');
      // Don't remove from DOM so it can be shown again later
      console.log(`🙈 Collection slider hidden for: ${goal.title}`);
    }
  }

  // Fetch products from collection
  async fetchCollectionProducts(collectionId, collectionHandle) {
    try {
      // Use collection handle if provided, otherwise try collectionId
      const handle = collectionHandle || collectionId;

      const response = await fetch(
        `/collections/${handle}/products.json?limit=10`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('❌ Failed to fetch collection products:', error);
      return [];
    }
  }

  // Create collection slider HTML
  createCollectionSliderHTML(goal, products) {
    const limitedProducts = products.slice(0, 5); // Limit to 5 products max

    const productSlides = limitedProducts
      .map((product) => {
        const availableVariants = product.variants.filter((v) => v.available);
        const firstVariant = availableVariants[0] || product.variants[0];
        const hasMultipleVariants = availableVariants.length > 1;

        // Create variant selector if there are multiple variants
        const variantSelector = hasMultipleVariants
          ? this.createVariantSelector(product, availableVariants)
          : '';

        // Get initial price and image
        const price = firstVariant
          ? this.formatMoney(firstVariant.price)
          : 'N/A';
        const image = product.images[0];
        const imageUrl = image ? image.src : '';

        return `
          <div class="swiper-slide">
            <div class="collection-slider__product" data-product-id="${
              firstVariant?.id || ''
            }" data-product-handle="${product.handle}">
              <div class="collection-slider__product-image">
                ${
                  imageUrl
                    ? `<img src="${imageUrl}" alt="${product.title}" loading="lazy">`
                    : ''
                }
              </div>
              <div class="collection-slider__product-info">
                <h4 class="collection-slider__product-title">${
                  product.title
                }</h4>
                <p class="collection-slider__product-price" data-price-display>${price}</p>
                ${variantSelector}
              </div>
              <button class="collection-slider__add-btn" data-variant-id="${
                firstVariant?.id || ''
              }" ${!firstVariant ? 'disabled' : ''}>
                Add to Cart
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="collection-slider" data-collection-slider="${
        goal.collectionId
      }">
        <div class="collection-slider__header" data-collection-header="${
          goal.collectionId
        }">
          <div class="collection-slider__title">
            ${goal.message}
            <span class="tw-text-[#767676]">(${limitedProducts.length} ${
      limitedProducts.length === 1 ? 'option' : 'options'
    })</span>
          </div>
          <button class="collection-slider__toggle" data-collection-toggle="${
            goal.collectionId
          }" aria-label="Toggle collection view">
            <svg class="icon icon-collection-slier-arrow" viewBox="0 0 10 6"><path fill="currentColor" fill-rule="evenodd" d="M9.354.646a.5.5 0 0 0-.708 0L5 4.293 1.354.646a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708" clip-rule="evenodd"/></svg>
          </button>
        </div>
        <div class="collection-slider__content" data-collection-content="${
          goal.collectionId
        }">
          <div class="collection-slider__container">
            <div class="swiper collection-slider__swiper" data-collection-swiper="${
              goal.collectionId
            }">
              <div class="swiper-wrapper">
                ${productSlides}
              </div>
              <div class="swiper-pagination"></div>
              <div class="swiper-button-next"><span class="tw-sr-only">Next</span></div>
              <div class="swiper-button-prev"><span class="tw-sr-only">Prev</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Create variant selector dropdown
  createVariantSelector(product, variants) {
    const options = variants
      .map((variant) => {
        const title =
          variant.title === 'Default Title' ? product.title : variant.title;
        const price = this.formatMoney(variant.price);
        return `
        <option value="${variant.id}" data-id="${variant.id}">
          ${title}
        </option>
      `;
      })
      .join('');

    return `
      <select class="collection-slider__variant-selector" data-variant-selector>
        ${options}
      </select>
    `;
  }

  // Insert slider into cart drawer
  insertCollectionSlider(sliderHTML) {
    // Find the cart motivator in the cart drawer
    const cartMotivator = document.querySelector('[data-motivator-cart]');
    if (!cartMotivator) return;

    // Create container if it doesn't exist
    let slidersContainer = cartMotivator.querySelector(
      '.collection-sliders-container',
    );
    if (!slidersContainer) {
      slidersContainer = document.createElement('div');
      slidersContainer.className = 'collection-sliders-container';
      cartMotivator.appendChild(slidersContainer);
    }

    // Add slider HTML
    slidersContainer.insertAdjacentHTML('beforeend', sliderHTML);
  }

  // Clean up any duplicate collection sliders
  cleanupDuplicateSliders() {
    const allSliders = document.querySelectorAll('[data-collection-slider]');
    const seen = new Set();

    allSliders.forEach((slider) => {
      const collectionId = slider.dataset.collectionSlider;
      if (seen.has(collectionId)) {
        console.log(
          `🧹 Removing duplicate slider for collection: ${collectionId}`,
        );
        slider.remove();
      } else {
        seen.add(collectionId);
      }
    });
  }

  // Initialize Swiper for collection slider
  initializeCollectionSwiper(collectionId) {
    // Wait a bit for DOM to be ready
    setTimeout(() => {
      const swiperElement = document.querySelector(
        `[data-collection-swiper="${collectionId}"]`,
      );
      if (!swiperElement || typeof Swiper === 'undefined') return;

      new Swiper(swiperElement, {
        slidesPerView: 'auto',
        spaceBetween: 10,
        slidesOffsetAfter: 10,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        breakpoints: {
          640: {
            slidesPerView: 1.5,
          },
          768: {
            slidesPerView: 2.25,
          },
        },
      });

      // Add click handlers for add to cart buttons
      this.addCollectionSliderEventListeners(collectionId);
    }, 100);
  }

  // Add event listeners for collection slider
  addCollectionSliderEventListeners(collectionId) {
    const slider = document.querySelector(
      `[data-collection-slider="${collectionId}"]`,
    );
    if (!slider) return;

    // Prevent duplicate event listeners
    if (slider.dataset.listenersAttached === 'true') {
      console.log(
        '🔍 Skipping duplicate event listeners for collection:',
        collectionId,
      );
      return;
    }
    slider.dataset.listenersAttached = 'true';

    // Handle toggle expand/collapse
    const toggleBtn = slider.querySelector(
      `[data-collection-toggle="${collectionId}"]`,
    );
    const content = slider.querySelector(
      `[data-collection-content="${collectionId}"]`,
    );
    const header = slider.querySelector(
      `[data-collection-header="${collectionId}"]`,
    );

    if (toggleBtn && content && header) {
      // Set initial state (expanded by default)
      let isExpanded = true;

      const updateToggleState = () => {
        if (isExpanded) {
          //toggleBtn.textContent = '▼';
          toggleBtn.classList.remove('collection-slider__toggle--expanded');
          content.classList.remove('collection-slider__content--collapsed');
          header.classList.remove('collection-slider__header--collapsed');
        } else {
          //toggleBtn.textContent = '▲';
          toggleBtn.classList.add('collection-slider__toggle--expanded');
          content.classList.add('collection-slider__content--collapsed');
          header.classList.add('collection-slider__header--collapsed');
        }
      };

      // Set initial state
      updateToggleState();

      // Handle clicks on the entire header
      header.addEventListener('click', (event) => {
        // Don't toggle if clicking on the toggle button itself (handled separately)
        if (event.target === toggleBtn) return;

        isExpanded = !isExpanded;
        updateToggleState();

        console.log(
          `🎯 Collection slider ${isExpanded ? 'expanded' : 'collapsed'}`,
        );
      });

      // Handle clicks specifically on the toggle button
      toggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        isExpanded = !isExpanded;
        updateToggleState();

        console.log(
          `🎯 Collection slider ${isExpanded ? 'expanded' : 'collapsed'}`,
        );
      });
    }

    // Handle variant selector changes
    slider.addEventListener('change', (event) => {
      const variantSelector = event.target.closest('[data-variant-selector]');
      if (!variantSelector) return;

      const selectedOption = variantSelector.selectedOptions[0];
      const variantId = selectedOption.value;
      const variantPrice = selectedOption.dataset.price;

      // Update the product card
      const productCard = variantSelector.closest(
        '.collection-slider__product',
      );
      if (productCard) {
        // Update price display
        const priceDisplay = productCard.querySelector('[data-price-display]');
        if (priceDisplay) {
          priceDisplay.textContent = this.formatMoney(parseInt(variantPrice));
        }

        // Update add to cart button with new variant ID
        const addBtn = productCard.querySelector('.collection-slider__add-btn');
        if (addBtn) {
          addBtn.dataset.variantId = variantId;
          addBtn.disabled = false;
        }
      }
    });

    // Handle add to cart clicks
    slider.addEventListener('click', async (event) => {
      const addBtn = event.target.closest('.collection-slider__add-btn');
      if (!addBtn) return;

      const variantId = addBtn.dataset.variantId;
      if (!variantId) return;

      try {
        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        // Add product to cart
        await this.addProductToCart(variantId, 1);

        // Mark the collection goal as fulfilled
        const goalSlider = addBtn.closest('[data-collection-slider]');
        if (goalSlider) {
          const collectionId = String(goalSlider.dataset.collectionSlider);

          // Mark this collection goal as permanently fulfilled
          this.fulfilledCollectionGoals.add(collectionId);

          // Store in sessionStorage for persistence
          try {
            sessionStorage.setItem(
              'shippingMotivatorFulfilledCollections',
              JSON.stringify([...this.fulfilledCollectionGoals]),
            );
            console.log(
              `✅ Collection goal ${collectionId} marked as fulfilled`,
            );
          } catch (e) {
            // Ignore storage errors
          }

          // Hide and remove the slider since goal is fulfilled
          goalSlider.classList.add('collection-slider--hidden');
          setTimeout(() => goalSlider.remove(), 300);

          // Trigger an update after hiding the slider to update completion message
          setTimeout(() => {
            if (window.shippingMotivator) {
              window.shippingMotivator.update().catch(console.error);
            }
          }, 50);
        }

        console.log('✅ Collection product added to cart');
      } catch (error) {
        console.error('❌ Failed to add collection product:', error);
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Cart';
      }
    });
  }

  // Method to manually refresh cart and update
  async refresh() {
    await this.fetchCart();
    await this.update();
  }
}

// Initialize when DOM is ready
function initShippingMotivator() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.shippingMotivator = new ShippingMotivator();
    });
  } else {
    window.shippingMotivator = new ShippingMotivator();
  }
}

initShippingMotivator();

// Expose global refresh function for external integrations
window.refreshShippingMotivator = () => {
  if (window.shippingMotivator) {
    window.shippingMotivator.refresh();
  }
};

// Expose cart refresh function specifically for Rebuy or other integrations
window.refreshCartFromRebuy = () => {
  if (window.shippingMotivator) {
    console.log('🛒 Manual cart refresh triggered from Rebuy');
    window.shippingMotivator
      .fetchCart()
      .then(() => {
        window.shippingMotivator.update();
        window.shippingMotivator.updateCartItems(); // Refresh cart items display
      })
      .catch(console.error);
  }
};
