// Swatch Quick Add - Uses existing quick-add modal infrastructure
document.addEventListener('DOMContentLoaded', function () {
  // Handle swatch button clicks
  document.addEventListener('click', function (e) {
    const swatchButton = e.target.closest('.product-swatch-button');
    if (!swatchButton) return;

    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple rapid clicks
    if (swatchButton.dataset.processing === 'true') return;
    swatchButton.dataset.processing = 'true';
    setTimeout(() => delete swatchButton.dataset.processing, 1000);

    // Get product URL from the image data attribute
    const productImage = swatchButton.querySelector('img[data-product-url]');
    if (!productImage) return;

    const productUrl = productImage.getAttribute('data-product-url');
    if (!productUrl) return;

    // Find the existing quick-add modal for this card
    const cardWrapper = swatchButton.closest('.card-wrapper');
    let quickAddModal = cardWrapper.querySelector('quick-add-modal');

    // If no modal found, check for dynamically created modals globally first
    if (!quickAddModal) {
      const urlParts = productUrl.split('/');
      const productHandle = urlParts[urlParts.length - 1].split('?')[0];
      const expectedModalId = `SwatchQuickAdd-${productHandle}`;
      quickAddModal = document.querySelector(`#${expectedModalId}`);
    }

    if (quickAddModal) {
      // Create a temporary button element with the required attributes
      const tempButton = document.createElement('button');
      tempButton.setAttribute('data-product-url', productUrl);
      tempButton.classList.add('loading');

      // Add a loading spinner element (required by the quick-add modal)
      const spinner = document.createElement('div');
      spinner.classList.add('loading__spinner', 'hidden');
      tempButton.appendChild(spinner);

      // Trigger the existing quick-add modal show method
      quickAddModal.show(tempButton);
    } else {
      // Create a dynamic modal for the swatch product
      createDynamicQuickAddModal(productUrl, cardWrapper);
    }
  });
});

// Create a dynamic quick-add modal for swatch products
function createDynamicQuickAddModal(productUrl, cardWrapper) {
  // Extract product handle from URL for consistent modal ID
  const urlParts = productUrl.split('/');
  const productHandle = urlParts[urlParts.length - 1].split('?')[0];
  const modalId = `SwatchQuickAdd-${productHandle}`;

  // Check if modal already exists for this product
  const existingModal = document.querySelector(`#${modalId}`);
  if (existingModal) {
    const tempButton = document.createElement('button');
    tempButton.setAttribute('data-product-url', productUrl);
    tempButton.classList.add('loading');
    const spinner = document.createElement('div');
    spinner.classList.add('loading__spinner', 'hidden');
    tempButton.appendChild(spinner);
    existingModal.show(tempButton);
    return;
  }

  // Create the modal HTML structure wrapped in a section to avoid ModalDialog errors
  const modalHTML = `
    <div class="shopify-section" id="shopify-section-swatch-${productHandle}">
      <quick-add-modal id="${modalId}" class="quick-add-modal">
        <div
          role="dialog"
          aria-label="Choose product options"
          aria-modal="true"
          class="quick-add-modal__content global-settings-popup"
          tabindex="-1"
        >
          <button
            id="ModalClose-${productHandle}"
            type="button"
            class="quick-add-modal__toggle"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 20 20"
              class="icon icon-close"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M15.89 14.696l-4.734-4.734 4.717-4.717c.4-.4.37-1.085-.03-1.485a1.065 1.065 0 0 0-1.504.03L9.621 8.508 4.887 3.774a1.065 1.065 0 0 0-1.504-.03c-.4.4-.43 1.085-.03 1.485l4.717 4.717-4.734 4.734c-.4.4-.37 1.085.03 1.485a1.065 1.065 0 0 0 1.504-.03l4.734-4.734 4.734 4.734a1.065 1.065 0 0 0 1.504.03c.4-.4.43-1.085.03-1.485z" fill="currentColor"></path>
            </svg>
          </button>
          <div id="QuickAddInfo-${productHandle}" class="quick-add-modal__content-info">
            <!-- Content will be loaded here -->
          </div>
        </div>
      </quick-add-modal>
    </div>
  `;

  // Add modal to the body instead of card wrapper to avoid conflicts
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get the newly created modal
  const quickAddModal = document.querySelector(`#${modalId}`);

  if (quickAddModal) {
    // Manually set the modalContent property since the constructor ran before HTML was added
    quickAddModal.modalContent = quickAddModal.querySelector(
      '[id^="QuickAddInfo-"]',
    );

    // Create a temporary button element
    const tempButton = document.createElement('button');
    tempButton.setAttribute('data-product-url', productUrl);
    tempButton.classList.add('loading');

    // Add a loading spinner element
    const spinner = document.createElement('div');
    spinner.classList.add('loading__spinner', 'hidden');
    tempButton.appendChild(spinner);

    // Trigger the modal
    quickAddModal.show(tempButton);
  }
}
