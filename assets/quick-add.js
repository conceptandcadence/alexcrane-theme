if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

        this.addEventListener('product-info:loaded', ({ target }) => {
          target.addPreProcessCallback(this.preprocessHTML.bind(this));
        });
      }

      hide(preventFocus = false) {
        const cartNotification =
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        // Remove the fixed bottom button
        this.removeFixedBottomButton();

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner').classList.remove('hidden');

        fetch(opener.getAttribute('data-product-url'))
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(
              responseText,
              'text/html',
            );
            const productElement = responseHTML.querySelector('product-info');

            this.preprocessHTML(productElement);
            HTMLUpdateUtility.setInnerHTML(
              this.modalContent,
              productElement.outerHTML,
            );

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            // Add Rebuy widget to the modal
            this.addRebuyWidget(responseHTML);

            // Create and setup the fixed bottom button
            this.setupFixedBottomButton();

            super.show(opener);

            // Initialize mobile accordion functionality for modal content
            if (typeof initializeMobileAccordion === 'function') {
              setTimeout(() => {
                initializeMobileAccordion(this);
              }, 150);
            }

            // Trigger custom event for Rebuy initialization
            document.dispatchEvent(
              new CustomEvent('quick-add-modal:opened', {
                detail: { modal: this },
              }),
            );
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            opener.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      preprocessHTML(productElement) {
        productElement.classList.forEach((classApplied) => {
          if (classApplied.startsWith('color-') || classApplied === 'gradient')
            this.modalContent.classList.add(classApplied);
        });
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        this.removeGalleryListSemantic(productElement);
        this.updateImageSizes(productElement);
        this.preventVariantURLSwitching(productElement);
      }

      preventVariantURLSwitching(productElement) {
        productElement.setAttribute('data-update-url', 'false');
      }

      removeDOMElements(productElement) {
        const pickupAvailability = productElement.querySelector(
          'pickup-availability',
        );
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const modalDialog = productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;

        const oldId = sectionId;
        const newId = `quickadd-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(
          oldId,
          newId,
        );
        Array.from(productElement.attributes).forEach((attribute) => {
          if (attribute.value.includes(oldId)) {
            productElement.setAttribute(
              attribute.name,
              attribute.value.replace(oldId, newId),
            );
          }
        });

        productElement.dataset.originalSection = sectionId;
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector(
          '[id^="Slider-Gallery"]',
        );
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList
          .querySelectorAll('[id^="Slide-"]')
          .forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        const product = productElement.querySelector('.product');
        const desktopColumns = product?.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) =>
          img.setAttribute('sizes', mediaImageSizes),
        );
      }

      addRebuyWidget(responseHTML) {
        // Extract product ID from the fetched product page
        const productElement = responseHTML.querySelector('product-info');
        const productId = productElement
          ? productElement.dataset.productId
          : null;

        if (!productId) return;

        // Rebuy widgets are now handled by the existing template system
        // No need to manually insert widgets as they're already present in the modal content

        // Initialize Rebuy widget if available
        if (window.rebuy && window.rebuy.render) {
          setTimeout(() => {
            window.rebuy.render();
          }, 100);
        }

        // Initialize specific Rebuy widget (ID 234056) after modal opens
        setTimeout(() => {
          const rebuyWidget234056 = document.querySelector(
            '[data-rebuy-id="234056"]',
          );
          if (rebuyWidget234056 && window.Rebuy && window.Rebuy.init) {
            window.Rebuy.init({
              id: 234056,
              node: rebuyWidget234056,
            });
          }
        }, 200);
      }

      addRebuyScript(productId) {
        // Check if script already exists
        const existingScript = document.querySelector(
          '#rebuy-widget-modal-232526',
        );
        if (existingScript) return;

        // Create script template for the modal
        const script = document.createElement('script');
        script.id = 'rebuy-widget-modal-232526';
        script.setAttribute('data-rebuy-shopify-product-ids', productId);
        script.type = 'text/template';
        script.innerHTML = this.getRebuyScriptTemplate();

        document.head.appendChild(script);
      }

      getRebuyScriptTemplate() {
        return `
          <div class="rebuy-widget rebuy-widget-modal" v-cloak v-on:click="stopPropagation($event)" v-bind:id="'rebuy-widget-modal-' + id"
            v-bind:class="['widget-type-' + config.type.replace('_','-'), 'widget-display-' + config.display_type, products.length > 0 ? 'is-visible' : 'is-hidden']">
            <div class="rebuy-widget-container" v-cloak
              v-bind:class="['widget-display-' + config.display_type, visible ? 'is-visible' : 'is-hidden' ]">
              <div class="rebuy-widget-content">
                <div class="recommended-product-grid grid--2-col-mobile grid--3-col-tablet-up">
                  <li class="grid__item" v-for="(product, product_index) in products.slice(0, 4)">
                    <div class="card-wrapper product-card-wrapper"
                      v-bind:class="[product.handle, 'product-id-' + product.id, cartHasProduct(product) ? 'cart-has-item' : '', productTagClasses(product)]">
                      <div class="card card--card card--media gradient"
                        v-bind:style="{ '--ratio-percent': '125%' }">
                        <div class="card__inner ratio"
                          v-bind:style="{ '--ratio-percent': '125%' }">
                          <div class="card__media">
                            <div class="card-media-carousel">
                              <div class="card-media-container" v-bind:style="{ '--ratio-percent': '100%' }">
                                <a class="rebuy-product-image" 
                                  v-bind:href="learnMoreURL(product)"
                                  v-on:click="learnMore(product);"
                                  v-bind:class="[hasLearnMore() ? 'clickable' : '']">
                                  <img v-bind:src="itemImage(product, product.selected_variant, '400x')"
                                    v-bind:alt="'View ' + product.title"
                                    class="card-media-image motion-reduce"
                                    loading="lazy"> 
                                </a>
                              </div>
                            </div>
                          </div>
                          <div class="card__content">
                            <div class="card__information">
                              <h3 class="card__heading">
                                <a class="full-unstyled-link" 
                                  v-bind:href="learnMoreURL(product)"
                                  v-on:click="learnMore(product);" 
                                  v-html="product.title"
                                  v-bind:class="[hasLearnMore() ? 'clickable' : '']"></a>
                              </h3>
                              <div class="price">
                                <div class="price__container">
                                  <div class="price__sale" v-if="variantOnSale(product, product.selected_variant)">
                                    <span class="visually-hidden visually-hidden--inline">Regular price</span>
                                    <span>
                                      <s class="price-item price-item--regular" v-html="formatMoney(variantCompareAtPrice(product, product.selected_variant))"></s>
                                    </span>
                                    <span class="visually-hidden visually-hidden--inline">Sale price</span>
                                    <span class="price-item price-item--sale price-item--last" v-html="formatMoney(variantPrice(product, product.selected_variant))"></span>
                                  </div>
                                  <div class="price__regular" v-else>
                                    <span class="visually-hidden visually-hidden--inline">Regular price</span>
                                    <span class="price-item price-item--regular" v-html="formatMoney(variantPrice(product, product.selected_variant))"></span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="card__badge">
                              <span v-if="!variantAvailable(product.selected_variant)"
                                class="badge badge--bottom-left color-accent-1">
                                Sold out
                              </span>
                              <span v-else-if="variantOnSale(product, product.selected_variant)"
                                class="badge badge--bottom-left color-accent-2">
                                Sale
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      setupFixedBottomButton() {
        // Find the original submit button
        const originalButton = this.modalContent.querySelector(
          '.product-form__submit',
        );
        if (!originalButton) return;

        // Hide the original button
        originalButton.style.display = 'none';

        // Create the fixed button container
        const fixedContainer = document.createElement('div');
        fixedContainer.className = 'quick-add-modal__fixed-button-container';
        fixedContainer.innerHTML = `
          <div class="quick-add-modal__fixed-button-wrapper">
            <button type="button" class="quick-add-modal__fixed-submit button button--full-width button--primary">
              ${originalButton.textContent}
            </button>
          </div>
        `;

        // Add to the modal content
        this.modalContent.appendChild(fixedContainer);

        // Setup click sync
        const fixedButton = fixedContainer.querySelector(
          '.quick-add-modal__fixed-submit',
        );
        fixedButton.addEventListener('click', () => {
          originalButton.click();
        });

        // Sync button states (disabled, loading, etc.)
        this.syncButtonStates(originalButton, fixedButton);

        // Store reference for cleanup
        this.fixedButtonContainer = fixedContainer;
        this.originalButton = originalButton;
        this.fixedButton = fixedButton;
      }

      syncButtonStates(originalButton, fixedButton) {
        // Initial sync
        this.updateFixedButtonState(originalButton, fixedButton);

        // Create observer for attribute changes
        const observer = new MutationObserver(() => {
          this.updateFixedButtonState(originalButton, fixedButton);
        });

        observer.observe(originalButton, {
          attributes: true,
          attributeFilter: ['aria-disabled', 'disabled', 'class'],
        });

        // Store observer for cleanup
        this.buttonObserver = observer;
      }

      updateFixedButtonState(originalButton, fixedButton) {
        // Sync disabled state
        if (
          originalButton.hasAttribute('disabled') ||
          originalButton.getAttribute('aria-disabled') === 'true'
        ) {
          fixedButton.setAttribute('disabled', 'true');
          fixedButton.setAttribute('aria-disabled', 'true');
        } else {
          fixedButton.removeAttribute('disabled');
          fixedButton.removeAttribute('aria-disabled');
        }

        // Sync loading state
        if (originalButton.classList.contains('loading')) {
          fixedButton.classList.add('loading');
        } else {
          fixedButton.classList.remove('loading');
        }

        // Sync text content
        if (originalButton.textContent !== fixedButton.textContent) {
          fixedButton.textContent = originalButton.textContent;
        }
      }

      removeFixedBottomButton() {
        if (this.fixedButtonContainer) {
          this.fixedButtonContainer.remove();
          this.fixedButtonContainer = null;
        }

        if (this.originalButton) {
          this.originalButton.style.display = '';
          this.originalButton = null;
        }

        if (this.buttonObserver) {
          this.buttonObserver.disconnect();
          this.buttonObserver = null;
        }

        this.fixedButton = null;
      }
    },
  );
}

// Global event listener for Rebuy widget initialization in quick-add modals
document.addEventListener('quick-add-modal:opened', function (event) {
  // Wait a bit for the modal content to be fully rendered
  setTimeout(() => {
    const rebuyWidget234056 = document.querySelector(
      '[data-rebuy-id="234056"]',
    );
    if (rebuyWidget234056 && window.Rebuy && window.Rebuy.init) {
      window.Rebuy.init({
        id: 234056,
        node: rebuyWidget234056,
      });
    }
  }, 300);
});
