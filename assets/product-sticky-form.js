// Wait for dependencies to load before defining the custom element
function waitForDependencies() {
  return new Promise((resolve) => {
    const checkDependencies = () => {
      if (
        typeof PUB_SUB_EVENTS !== 'undefined' &&
        typeof subscribe !== 'undefined'
      ) {
        resolve();
      } else {
        setTimeout(checkDependencies, 50);
      }
    };
    checkDependencies();
  });
}

// Define the sticky product form custom element
waitForDependencies().then(() => {
  if (!customElements.get('sticky-product-form')) {
    customElements.define(
      'sticky-product-form',
      class StickyProductForm extends HTMLElement {
        constructor() {
          super();
          this.unsubscribers = [];
          this.isSyncing = false;
        }

        connectedCallback() {
          this.productStickyForm = this.querySelector('.product--sticky-form');
          this.productForm = document.querySelector(
            'product-form:not(.product--sticky-form product-form)',
          );
          this.mainVariantSelects = document.querySelector(
            'variant-selects:not(.product--sticky-form variant-selects)',
          );
          this.stickyVariantSelects = this.querySelector('variant-selects');

          if (!this.productForm) {
            console.warn('Sticky form: Main product-form element not found');
            return;
          }

          if (!this.productStickyForm) {
            console.warn('Sticky form: Sticky form element not found');
            return;
          }

          this.onScrollHandler = this.onScroll.bind(this);
          window.addEventListener('scroll', this.onScrollHandler, false);

          this.createObserver();
          this.setupVariantSync();
        }

        disconnectedCallback() {
          window.removeEventListener('scroll', this.onScrollHandler);
          // Unsubscribe from all events
          this.unsubscribers.forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
          });
          this.unsubscribers = [];

          if (this.observer) {
            this.observer.disconnect();
          }
        }

        createObserver() {
          if (!this.productForm) {
            console.warn(
              'Sticky form: Cannot create observer - productForm not found',
            );
            return;
          }

          try {
            this.observer = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    this.hide();
                  } else {
                    this.reveal();
                  }
                });
              },
              {
                rootMargin: '0px 0px -100px 0px',
                threshold: 0,
              },
            );
            this.observer.observe(this.productForm);
          } catch (error) {
            console.error(
              'Sticky form: Error creating intersection observer:',
              error,
            );
          }
        }

        setupVariantSync() {
          if (!this.mainVariantSelects || !this.stickyVariantSelects) {
            console.log('Sticky sync: Missing variant selects', {
              main: this.mainVariantSelects,
              sticky: this.stickyVariantSelects,
            });
            return;
          }

          console.log('Sticky sync: Setting up variant synchronization');

          // Subscribe to main form variant changes
          const unsubscriber = subscribe(
            PUB_SUB_EVENTS.optionValueSelectionChange,
            (event) => {
              console.log('Sticky sync: Received variant change event', event);
              const target = event.data.target;

              // Check if this event is from the sticky form
              if (target.closest('.product--sticky-form')) {
                console.log(
                  'Sticky sync: Event from sticky form, syncing to main',
                );
                this.syncVariantToMain(target);
              } else {
                console.log(
                  'Sticky sync: Event from main form, syncing to sticky',
                );
                this.syncVariantToSticky(target);
              }
            },
          );

          this.unsubscribers.push(unsubscriber);
        }

        syncVariantToSticky(target) {
          if (this.isSyncing) return;
          this.isSyncing = true;

          const optionName = this.getOptionNameFromTarget(target);
          const selectedValue = target.value;

          console.log('Sticky sync: syncVariantToSticky', {
            target,
            optionName,
            selectedValue,
            targetName: target.name,
          });

          if (optionName && selectedValue) {
            const stickySelect = this.findStickySelectForOption(optionName);
            console.log('Sticky sync: Found sticky select', stickySelect);

            if (stickySelect && stickySelect.value !== selectedValue) {
              console.log(
                'Sticky sync: Updating sticky select from',
                stickySelect.value,
                'to',
                selectedValue,
              );
              stickySelect.value = selectedValue;
              stickySelect.dispatchEvent(
                new Event('change', { bubbles: true }),
              );
            }
          }

          setTimeout(() => {
            this.isSyncing = false;
          }, 100);
        }

        syncVariantToMain(target) {
          if (this.isSyncing) return;
          this.isSyncing = true;

          const optionName = this.getOptionNameFromTarget(target);
          const selectedValue = target.value;

          console.log('Sticky sync: syncVariantToMain', {
            target,
            optionName,
            selectedValue,
            targetName: target.name,
          });

          if (optionName && selectedValue) {
            const mainInput = this.findMainInputForOption(
              optionName,
              selectedValue,
            );
            console.log('Sticky sync: Found main input', mainInput);

            if (mainInput && !mainInput.checked) {
              console.log('Sticky sync: Updating main input to checked');
              mainInput.checked = true;
              mainInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          setTimeout(() => {
            this.isSyncing = false;
          }, 100);
        }

        getOptionNameFromTarget(target) {
          // Handle sticky form selects: name="options[Size]"
          if (target.name && target.name.includes('options[')) {
            const optionsMatch = target.name.match(/options\[(.+?)\]/);
            if (optionsMatch) {
              return optionsMatch[1];
            }
          }

          // Handle main form radio buttons: name="Size-1"
          if (target.name) {
            const nameMatch = target.name.match(/^(.+?)-\d+$/);
            if (nameMatch) {
              return nameMatch[1];
            }
          }

          // Fallback: try to find from parent fieldset legend
          const fieldset = target.closest('fieldset');
          if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend) {
              const legendText = legend.textContent.trim();
              // Remove the colon and selected value if present
              return legendText.replace(/:.*$/, '').trim();
            }
          }

          return null;
        }

        findStickySelectForOption(optionName) {
          if (!this.stickyVariantSelects) return null;

          // Look for select with name="options[optionName]"
          return this.stickyVariantSelects.querySelector(
            `select[name="options[${optionName}]"]`,
          );
        }

        findMainInputForOption(optionName, value) {
          if (!this.mainVariantSelects) return null;

          // Look for radio input with matching name pattern and value
          // Name pattern is like "Size-1", "Size-2", etc.
          const namePattern = new RegExp(`^${optionName}-\\d+$`);
          const inputs = this.mainVariantSelects.querySelectorAll(
            'input[type="radio"]',
          );

          for (const input of inputs) {
            if (namePattern.test(input.name) && input.value === value) {
              return input;
            }
          }

          return null;
        }

        onScroll() {
          if (!this.productStickyForm) return;
          // Intersection Observer handles the show/hide logic
        }

        hide() {
          if (!this.productStickyForm) return;
          this.productStickyForm.classList.remove('show');
        }

        reveal() {
          if (!this.productStickyForm) return;
          this.productStickyForm.classList.add('show');
        }
      },
    );
  }
});
