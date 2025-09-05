// This function is used for opening facet dropdown for the theme version 2

function init_color_palette() {
  document.querySelectorAll('.acs_color_palette span').forEach((item) => {
    item.addEventListener('click', (e) => {
      let prod = item.dataset.product;
      let media = item.dataset.media;
      if (media) {
        document.querySelector(`img.media-${prod}`).src = media;
        document.querySelector(`img.media-${prod}`).srcset = '';
      }
    });
  });
}

// Simple filter reveal functionality
function init_filter_reveal() {
  // Find trigger buttons
  const triggerButtons = document.querySelectorAll(
    '.plp-products-filter--trigger',
  );

  if (triggerButtons.length === 0) {
    return;
  }

  // Function to close filters
  const closeFilters = () => {
    const productGridContainer = document.querySelector(
      '.product-grid-container',
    );
    const activeTrigger = document.querySelector(
      '.plp-products-filter--trigger.filters-active',
    );

    if (
      productGridContainer &&
      productGridContainer.classList.contains('revealed')
    ) {
      productGridContainer.classList.remove('revealed');
      if (activeTrigger) {
        activeTrigger.classList.remove('filters-active');
      }
    }
  };

  // Add ESC key listener for accessibility
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeFilters();
    }
  });

  // Add click handlers to each trigger button
  triggerButtons.forEach((button, index) => {
    // Create simple click handler
    const clickHandler = function (event) {
      // Prevent default behavior and stop propagation IMMEDIATELY
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Get the actual button that was clicked (could be the cloned one)
      const clickedButton = event.currentTarget;

      // Toggle reveal class on product-grid-container
      const productGridContainer = document.querySelector(
        '.product-grid-container',
      );
      if (productGridContainer) {
        const isRevealed = productGridContainer.classList.toggle('revealed');

        // Toggle active class on the trigger button to flip the caret
        if (isRevealed) {
          clickedButton.classList.add('filters-active');
        } else {
          clickedButton.classList.remove('filters-active');
        }
      }
    };

    // Completely remove any existing event handlers
    button.removeAttribute('onclick');
    button.onclick = null;

    // Clone the button to remove all event listeners, then replace it
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    // Add our event listener to the clean button with highest priority
    newButton.addEventListener('click', clickHandler, {
      capture: true,
      passive: false,
    });

    // Also add a second listener as backup
    newButton.addEventListener('click', clickHandler, {
      capture: false,
      passive: false,
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  init_filter_reveal();
});

// Also initialize for dynamic content
if (typeof window !== 'undefined') {
  window.init_filter_reveal = init_filter_reveal;
}

// Fallback: if DOM is already loaded, initialize immediately
if (document.readyState !== 'loading') {
  init_filter_reveal();
}
