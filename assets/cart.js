class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems =
        this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') ||
      document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.cartUpdate,
      (event) => {
        if (event.source === 'cart-items') {
          return;
        }
        this.onCartUpdate();
      },
    );
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    if (input) {
      input.value = input.getAttribute('value');
    }
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace(
        '[min]',
        event.target.dataset.min,
      );
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace(
        '[max]',
        event.target.max,
      );
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace(
        '[step]',
        event.target.step,
      );
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId,
      );
    }
  }

  onChange(event) {
    if (event.target.type == 'number') {
      this.validateQuantity(event);
    }
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            'text/html',
          );

          // Get the new cart drawer structure
          const newCartDrawer = html.querySelector('cart-drawer');
          const currentCartDrawer = document.querySelector('cart-drawer');

          if (newCartDrawer && currentCartDrawer) {
            // Check if empty state has changed
            const wasEmpty = currentCartDrawer.classList.contains('is-empty');
            const isNowEmpty = newCartDrawer.classList.contains('is-empty');

            // If transitioning from empty to non-empty or vice versa, update more comprehensively
            if (wasEmpty !== isNowEmpty) {
              // Update the cart drawer classes but preserve active state
              const wasActive = currentCartDrawer.classList.contains('active');
              currentCartDrawer.className = newCartDrawer.className;
              // Restore active class if it was active before
              if (wasActive) {
                currentCartDrawer.classList.add('active');
                console.log(
                  '🛒 Cart drawer active state preserved during selective update',
                );
              }

              // Update specific sections more carefully to preserve functionality
              const sectionsToUpdate = [
                'cart-drawer-items',
                '.cart-drawer__footer',
                '.drawer__inner-empty',
                '.cart-drawer__motivator',
              ];

              sectionsToUpdate.forEach((selector) => {
                const newElement = html.querySelector(selector);
                const currentElement = document.querySelector(selector);

                if (selector === '.drawer__inner-empty') {
                  // Handle empty state section
                  if (isNowEmpty && newElement && !currentElement) {
                    // Cart became empty, need to add empty state
                    const drawerInner =
                      document.querySelector('.drawer__inner');
                    if (drawerInner) {
                      drawerInner.insertBefore(
                        newElement,
                        drawerInner.firstChild,
                      );
                    }
                  } else if (!isNowEmpty && currentElement) {
                    // Cart is no longer empty, remove empty state
                    currentElement.remove();
                  }
                } else if (selector === '.cart-drawer__motivator') {
                  // Handle motivator section
                  if (!isNowEmpty && newElement && !currentElement) {
                    // Cart has items, add motivator if it doesn't exist
                    const drawerInner =
                      document.querySelector('.drawer__inner');
                    const cartDrawerItems =
                      document.querySelector('cart-drawer-items');
                    if (drawerInner && cartDrawerItems) {
                      drawerInner.insertBefore(newElement, cartDrawerItems);
                    }
                  } else if (isNowEmpty && currentElement) {
                    // Cart is empty, remove motivator
                    currentElement.remove();
                  } else if (newElement && currentElement) {
                    // Update existing motivator
                    currentElement.replaceWith(newElement);
                  }
                } else {
                  // Handle other sections normally
                  if (newElement && currentElement) {
                    currentElement.replaceWith(newElement);
                  }
                }
              });

              // Ensure cart drawer remains open and visible after update
              if (currentCartDrawer.classList.contains('active')) {
                // Re-trigger any necessary initialization for new content
                setTimeout(() => {
                  const overlayElement = document.querySelector(
                    '#CartDrawer-Overlay',
                  );
                  if (
                    overlayElement &&
                    !overlayElement.hasAttribute('data-listener-added')
                  ) {
                    overlayElement.addEventListener('click', () => {
                      currentCartDrawer.classList.remove('active');
                    });
                    overlayElement.setAttribute('data-listener-added', 'true');
                  }
                }, 100);
              }

              // Also update checkout button price specifically
              this.updateCheckoutButtonPrice(html);

              // Check if shipping motivator should be hidden
              if (typeof checkShippingMotivatorAfterCartUpdate === 'function') {
                checkShippingMotivatorAfterCartUpdate();
              }

              // Also check cart drawer shipping motivator status
              if (typeof window.checkShippingMotivatorStatus === 'function') {
                window.checkShippingMotivatorStatus();
              }

              console.log(
                '🛒 Cart drawer: Selective update due to empty state change',
              );
              return;
            }
          }

          // Standard update for when empty state hasn't changed
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }

          // Update cart drawer classes even for standard updates, but preserve active state
          if (newCartDrawer && currentCartDrawer) {
            const wasActive = currentCartDrawer.classList.contains('active');
            currentCartDrawer.className = newCartDrawer.className;
            // Restore active class if it was active before
            if (wasActive) {
              currentCartDrawer.classList.add('active');
              console.log(
                '🛒 Cart drawer active state preserved during update',
              );
            }
          }

          // Also update checkout button price for standard updates
          this.updateCheckoutButtonPrice(html);

          // Check if shipping motivator should be hidden
          if (typeof checkShippingMotivatorAfterCartUpdate === 'function') {
            checkShippingMotivatorAfterCartUpdate();
          }

          // Also check cart drawer shipping motivator status
          if (typeof window.checkShippingMotivatorStatus === 'function') {
            window.checkShippingMotivatorStatus();
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            'text/html',
          );
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  updateCheckoutButtonPrice(html) {
    // Update checkout button price specifically
    const newCheckoutButton = html.querySelector('#CartDrawer-Checkout');
    const currentCheckoutButton = document.querySelector(
      '#CartDrawer-Checkout',
    );

    if (newCheckoutButton && currentCheckoutButton) {
      // Update the button text which includes the price
      currentCheckoutButton.innerHTML = newCheckoutButton.innerHTML;

      // Also update disabled state
      if (newCheckoutButton.hasAttribute('disabled')) {
        currentCheckoutButton.setAttribute('disabled', '');
      } else {
        currentCheckoutButton.removeAttribute('disabled');
      }

      console.log('🛒 Checkout button price updated');
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) ||
          document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if (parsedState.errors) {
          if (quantityElement) {
            quantityElement.value = quantityElement.getAttribute('value');
          }
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter)
          cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle(
            'is-empty',
            parsedState.item_count === 0,
          );

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document
              .getElementById(section.id)
              .querySelector(section.selector) ||
            document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector,
          );
        });
        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = '';
        if (
          items.length === parsedState.items.length &&
          quantityElement &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              '[quantity]',
              updatedValue,
            );
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          const focusElement = lineItem.querySelector(`[name="${name}"]`);
          if (focusElement) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, focusElement)
              : focusElement.focus();
          }
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          const emptyContainer = cartDrawerWrapper.querySelector(
            '.drawer__inner-empty',
          );
          const emptyFocusElement = cartDrawerWrapper.querySelector('a');
          if (emptyContainer && emptyFocusElement) {
            trapFocus(emptyContainer, emptyFocusElement);
          }
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          const cartItemName = document.querySelector('.cart-item__name');
          if (cartItemName) {
            trapFocus(cartDrawerWrapper, cartItemName);
          }
        }

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'cart-items',
          cartData: parsedState,
          variantId: variantId,
        });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) =>
          overlay.classList.add('hidden'),
        );
        const errors =
          document.getElementById('cart-errors') ||
          document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) ||
      document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError)
      lineItemError.querySelector('.cart-item__error-text').textContent =
        message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') ||
      document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById('main-cart-items') ||
      document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading__spinner`,
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading__spinner`,
    );

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove('hidden'),
    );

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems =
      document.getElementById('main-cart-items') ||
      document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading__spinner`,
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading__spinner`,
    );

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) =>
      overlay.classList.add('hidden'),
    );
  }
}

customElements.define('cart-items', CartItems);

// Enhanced Rebuy integration for cart drawer updates
class RebuyCartIntegration {
  constructor() {
    this.setupRebuyListeners();
  }

  setupRebuyListeners() {
    // Listen for various Rebuy events that indicate cart changes
    const rebuyEvents = [
      'rebuy:cart.change',
      'rebuy:cart.add',
      'rebuy:cart.updated',
      'rebuy:widget.cart-add',
      'rebuy:smartcart.change',
    ];

    rebuyEvents.forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        console.log(`🛒 Rebuy event detected: ${eventName}`);
        this.handleRebuyCartUpdate(event);
      });
    });

    // Also listen for clicks on rebuy buttons with a more specific selector
    document.addEventListener('click', (event) => {
      const rebuyButton = event.target.closest(
        '.rebuy-button, [data-rebuy-add-to-cart], .rebuy-cart__flyout-item-add-button',
      );
      if (rebuyButton) {
        console.log('🛒 Rebuy button clicked, scheduling cart update');
        // Schedule cart update after a delay to allow Rebuy to process
        setTimeout(() => {
          this.triggerCartUpdate();
        }, 800);
      }
    });

    // Specific observer for rebuy widget 235697 in cart drawer
    this.setupRebuyWidgetObserver();
  }

  setupRebuyWidgetObserver() {
    const rebuyWidget = document.querySelector('[data-rebuy-id="235697"]');
    if (rebuyWidget) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Check for added nodes that might contain rebuy buttons
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const hasRebuyContent = Array.from(mutation.addedNodes).some(
              (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                ((node.querySelector && node.querySelector('.rebuy-button')) ||
                  (node.classList && node.classList.contains('rebuy-button'))),
            );

            if (hasRebuyContent) {
              console.log(
                '🛒 Rebuy widget 235697 content added, setting up listeners',
              );
              // Add a small delay to ensure buttons are interactive
              setTimeout(() => {
                this.addRebuyButtonListeners(rebuyWidget);
              }, 200);
            }
          }
        });
      });

      observer.observe(rebuyWidget, {
        childList: true,
        subtree: true,
      });

      // Also set up initial listeners if content is already present
      setTimeout(() => {
        this.addRebuyButtonListeners(rebuyWidget);
      }, 500);
    }
  }

  addRebuyButtonListeners(container) {
    const rebuyButtons = container.querySelectorAll(
      '.rebuy-button, [data-rebuy-add-to-cart]',
    );
    rebuyButtons.forEach((button) => {
      // Remove existing listeners to avoid duplicates
      button.removeEventListener('click', this.handleRebuyButtonClick);

      // Add new listener
      button.addEventListener('click', this.handleRebuyButtonClick.bind(this));
    });
  }

  handleRebuyButtonClick(event) {
    console.log('🛒 Rebuy widget 235697 button clicked');

    // Schedule cart update with longer delay for add to cart operations
    setTimeout(() => {
      this.triggerCartUpdate();
    }, 1000);
  }

  handleRebuyCartUpdate(event) {
    // Prevent multiple rapid updates by debouncing
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Check if cart drawer is already being protected by rebuy updates
    const cartDrawer = document.querySelector('cart-drawer');
    const isAlreadyUpdating =
      cartDrawer && cartDrawer.hasAttribute('data-rebuy-updating');

    // Use shorter delay if already updating to avoid piling up updates
    const delay = isAlreadyUpdating ? 100 : 300;

    // Add a small delay to ensure Rebuy has finished updating the cart
    this.updateTimeout = setTimeout(() => {
      this.triggerCartUpdate();
    }, delay);
  }

  triggerCartUpdate() {
    // Only apply protection for rebuy-specific updates, not all cart operations
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      // Set a specific rebuy protection flag instead of general updating flag
      cartDrawer.setAttribute('data-rebuy-updating', 'true');
      console.log('🛒 Rebuy update protection enabled');

      // Remove rebuy protection after a shorter delay
      setTimeout(() => {
        cartDrawer.removeAttribute('data-rebuy-updating');
        console.log('🛒 Rebuy update protection disabled');
      }, 1500); // Shorter timeout, just for rebuy operations
    }

    // Publish the cart update event to trigger onCartUpdate in cart-drawer-items
    if (typeof publish === 'function') {
      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'rebuy-integration',
        cartData: null, // Let the update method fetch fresh data
      });
      console.log('🛒 Published cartUpdate event from Rebuy integration');
    } else {
      // Fallback: directly trigger update on cart drawer items
      const cartDrawerItems = document.querySelector('cart-drawer-items');
      if (
        cartDrawerItems &&
        typeof cartDrawerItems.onCartUpdate === 'function'
      ) {
        cartDrawerItems.onCartUpdate();
        console.log('🛒 Direct cart drawer update triggered');
      }
    }

    // Also update cart icon bubble to reflect new cart state
    this.updateCartIconBubble();
  }

  updateCartIconBubble() {
    // Fetch the cart icon bubble section to update the icon and count
    fetch(
      `${window.location.origin}${window.location.pathname}?section_id=cart-icon-bubble`,
    )
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newCartIcon = doc.querySelector('.shopify-section');
        const currentCartIcon = document.querySelector('#cart-icon-bubble');

        if (newCartIcon && currentCartIcon) {
          currentCartIcon.innerHTML = newCartIcon.innerHTML;
          console.log('🛒 Cart icon bubble updated');
        }
      })
      .catch((error) => {
        console.error('Failed to update cart icon bubble:', error);
      });
  }
}

// Initialize the Rebuy integration
if (typeof window.rebuyCartIntegration === 'undefined') {
  window.rebuyCartIntegration = new RebuyCartIntegration();
}

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, ON_CHANGE_DEBOUNCE_TIMER),
        );
      }
    },
  );
}
