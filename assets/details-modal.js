class DetailsModal extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    this.detailsContainer.addEventListener(
      'keyup',
      (event) => event.code.toUpperCase() === 'ESCAPE' && this.close(),
    );
    this.summaryToggle.addEventListener(
      'click',
      this.onSummaryClick.bind(this),
    );
    const closeButton = this.querySelector('button[type="button"]');
    if (closeButton) {
      closeButton.addEventListener('click', this.close.bind(this));
    }

    this.summaryToggle.setAttribute('role', 'button');
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open')
      ? this.close()
      : this.open(event);
  }

  onBodyClick(event) {
    if (
      !this.contains(event.target) ||
      event.target.classList.contains('modal-overlay')
    )
      this.close(false);
  }

  open(event) {
    this.onBodyClickEvent =
      this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden');

    // Enhanced search input focus handling with multiple fallbacks
    const searchInput =
      this.detailsContainer.querySelector('#Search') ||
      this.detailsContainer.querySelector('.search__input') ||
      this.detailsContainer.querySelector('input[type="search"]') ||
      this.detailsContainer.querySelector('input:not([type="hidden"])');

    // Find focus container - fallback to detailsContainer if no tabindex element exists
    const focusContainer =
      this.detailsContainer.querySelector('[tabindex="-1"]') ||
      this.detailsContainer;

    trapFocus(focusContainer, searchInput);

    // Enhanced focus for search modals with better timing and error handling
    if (this.classList.contains('header__search') && searchInput) {
      // Use requestAnimationFrame for better timing with DOM rendering
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            searchInput.focus();
            // Select all text for better UX when search has existing value
            if (searchInput.value && searchInput.value.trim()) {
              searchInput.select();
            }
          } catch (error) {
            console.warn('Search input focus failed:', error);
          }
        }, 50);
      });
    }
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden');
  }
}

customElements.define('details-modal', DetailsModal);
