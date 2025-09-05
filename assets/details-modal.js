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

    // Enhanced search input focus handling
    const searchInput =
      this.detailsContainer.querySelector('input:not([type="hidden"])') ||
      this.detailsContainer.querySelector('#Search') ||
      this.detailsContainer.querySelector('.search__input');

    // Find focus container - fallback to detailsContainer if no tabindex element exists
    const focusContainer =
      this.detailsContainer.querySelector('[tabindex="-1"]') ||
      this.detailsContainer;

    trapFocus(focusContainer, searchInput);

    // Additional focus insurance for search modals
    if (this.classList.contains('header__search') && searchInput) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        searchInput.focus();
        searchInput.select(); // Optional: select all text for better UX
      }, 50);
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
