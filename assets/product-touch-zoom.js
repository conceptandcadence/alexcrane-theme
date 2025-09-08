/**
 * Product Touch Zoom
 * Implements pinch-to-zoom functionality for product images on touch devices
 */

class ProductTouchZoom {
  constructor() {
    this.activeZoomContainer = null;
    this.isZooming = false;
    this.initialDistance = 0;
    this.initialScale = 1;
    this.currentScale = 1;
    this.maxScale = 4;
    this.minScale = 1;
    this.lastPanX = 0;
    this.lastPanY = 0;
    this.isPanning = false;

    this.init();
  }

  init() {
    this.setupZoomButtons();
    this.addGlobalStyles();
  }

  setupZoomButtons() {
    // Find all zoom buttons for both lightbox and hover modes
    const lightboxButtons = document.querySelectorAll(
      '.product__media-zoom-lightbox',
    );
    const hoverButtons = document.querySelectorAll(
      '.product__media-zoom-hover',
    );
    const allZoomButtons = [...lightboxButtons, ...hoverButtons];

    allZoomButtons.forEach((button) => {
      // For lightbox mode, remove modal functionality on touch devices
      if (button.classList.contains('product__media-zoom-lightbox')) {
        const modalOpener = button.closest('modal-opener');
        if (modalOpener) {
          // Create a new button element to replace the modal functionality
          const touchZoomButton = document.createElement('button');
          touchZoomButton.className = button.className + ' touch-zoom-enabled';
          touchZoomButton.type = 'button';
          touchZoomButton.innerHTML = button.innerHTML;
          touchZoomButton.setAttribute('aria-label', 'Enable pinch to zoom');

          // Replace the old button
          button.parentNode.replaceChild(touchZoomButton, button);

          // Add click handler for touch zoom
          touchZoomButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.enableZoomForImage(touchZoomButton);
          });
        }
      }
      // For hover mode, enhance the existing functionality
      else if (button.classList.contains('product__media-zoom-hover')) {
        // Only modify behavior on touch devices
        if ('ontouchstart' in window) {
          button.classList.add('touch-zoom-enabled');

          // Override the click handler for touch devices only
          const originalClick = button.onclick;
          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.enableZoomForImage(button);
          };
        }
        // On desktop, leave the button completely alone - don't add any classes or handlers
      }
    });

    // Also handle images with magnify class directly (for hover mode) - but only on touch devices
    if ('ontouchstart' in window) {
      const magnifyImages = document.querySelectorAll('.image-magnify-hover');
      magnifyImages.forEach((image) => {
        // Store original click handler
        const originalClick = image.onclick;

        image.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Find the associated zoom button
          const container = image.closest('.product-media-container');
          const zoomButton = container?.querySelector(
            '.product__media-zoom-hover',
          );
          if (zoomButton) {
            this.enableZoomForImage(zoomButton);
          }
        };
      });
    }
    // On desktop, don't touch the magnify images at all - let magnify.js handle them
  }

  enableZoomForImage(button) {
    const mediaContainer = button.closest('.product-media-container');
    const image = mediaContainer.querySelector('img');

    if (!image || !mediaContainer) return;

    // Get the highest resolution image source
    const highResImage = this.getHighResImageSrc(image);

    // Create zoom overlay
    this.createZoomOverlay(mediaContainer, image, highResImage);
  }

  getHighResImageSrc(image) {
    // Try to get the highest resolution from srcset
    if (image.srcset) {
      const srcsetEntries = image.srcset.split(',').map((entry) => {
        const [url, width] = entry.trim().split(' ');
        return { url: url.trim(), width: parseInt(width) || 0 };
      });

      // Sort by width and get the highest resolution
      srcsetEntries.sort((a, b) => b.width - a.width);
      if (srcsetEntries.length > 0) {
        return srcsetEntries[0].url;
      }
    }

    // Fallback to original src
    return image.src;
  }

  createZoomOverlay(container, originalImage, highResImageSrc) {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'product-touch-zoom-overlay';

    // Create zoomable image with high resolution
    const zoomImage = document.createElement('img');
    zoomImage.src = highResImageSrc || originalImage.src;
    zoomImage.alt = originalImage.alt;
    zoomImage.className = 'product-touch-zoom-image';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'product-touch-zoom-close';
    closeButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.setAttribute('aria-label', 'Close zoom');

    // Create instructions
    const instructions = document.createElement('div');
    instructions.className = 'product-touch-zoom-instructions';
    instructions.textContent = 'Pinch to zoom • Drag to pan';

    // Assemble overlay
    overlay.appendChild(zoomImage);
    overlay.appendChild(closeButton);
    overlay.appendChild(instructions);

    // Add to document
    document.body.appendChild(overlay);

    // Store reference
    this.activeZoomContainer = overlay;

    // Add event listeners
    this.addZoomEventListeners(overlay, zoomImage);

    // Show overlay
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      // Hide instructions after 3 seconds
      setTimeout(() => {
        instructions.style.opacity = '0';
      }, 3000);
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close button handler
    closeButton.addEventListener('click', () => {
      this.closeZoom();
    });

    // Close on overlay click (but not on image)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeZoom();
      }
    });
  }

  addZoomEventListeners(overlay, image) {
    let touches = [];

    // Touch start
    overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touches = Array.from(e.touches);

      if (touches.length === 2) {
        // Two fingers - prepare for zoom
        this.isZooming = true;
        this.initialDistance = this.getDistance(touches[0], touches[1]);
        this.initialScale = this.currentScale;
      } else if (touches.length === 1 && this.currentScale > 1) {
        // One finger on zoomed image - prepare for pan
        this.isPanning = true;
        this.lastPanX = touches[0].clientX;
        this.lastPanY = touches[0].clientY;
      }
    });

    // Touch move
    overlay.addEventListener('touchmove', (e) => {
      e.preventDefault();
      touches = Array.from(e.touches);

      if (this.isZooming && touches.length === 2) {
        // Handle zoom
        const currentDistance = this.getDistance(touches[0], touches[1]);
        const scale =
          (currentDistance / this.initialDistance) * this.initialScale;

        this.currentScale = Math.max(
          this.minScale,
          Math.min(this.maxScale, scale),
        );
        this.updateImageTransform(image);
      } else if (
        this.isPanning &&
        touches.length === 1 &&
        this.currentScale > 1
      ) {
        // Handle pan
        const deltaX = touches[0].clientX - this.lastPanX;
        const deltaY = touches[0].clientY - this.lastPanY;

        // Get current transform
        const matrix = new DOMMatrix(getComputedStyle(image).transform);
        const newX = matrix.m41 + deltaX;
        const newY = matrix.m42 + deltaY;

        // Apply constraints to prevent panning too far
        const maxPanX = (image.offsetWidth * (this.currentScale - 1)) / 2;
        const maxPanY = (image.offsetHeight * (this.currentScale - 1)) / 2;

        const constrainedX = Math.max(-maxPanX, Math.min(maxPanX, newX));
        const constrainedY = Math.max(-maxPanY, Math.min(maxPanY, newY));

        image.style.transform = `scale(${this.currentScale}) translate(${
          constrainedX / this.currentScale
        }px, ${constrainedY / this.currentScale}px)`;

        this.lastPanX = touches[0].clientX;
        this.lastPanY = touches[0].clientY;
      }
    });

    // Touch end
    overlay.addEventListener('touchend', (e) => {
      e.preventDefault();
      touches = Array.from(e.touches);

      if (touches.length < 2) {
        this.isZooming = false;
      }

      if (touches.length === 0) {
        this.isPanning = false;

        // If zoomed out completely, close the overlay
        if (this.currentScale <= 1) {
          this.closeZoom();
        }
      }
    });

    // Double tap to zoom
    let lastTap = 0;
    overlay.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;

      if (tapLength < 500 && tapLength > 0 && e.touches.length === 0) {
        e.preventDefault();

        if (this.currentScale === 1) {
          // Zoom in to 2x
          this.currentScale = 2;
          this.updateImageTransform(image);
        } else {
          // Zoom out to 1x
          this.currentScale = 1;
          this.updateImageTransform(image);
          // Close after zoom out animation
          setTimeout(() => {
            this.closeZoom();
          }, 300);
        }
      }

      lastTap = currentTime;
    });
  }

  updateImageTransform(image) {
    image.style.transform = `scale(${this.currentScale})`;
    image.style.transition = 'transform 0.1s ease-out';

    // Remove transition after animation
    setTimeout(() => {
      image.style.transition = '';
    }, 100);
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  closeZoom() {
    if (!this.activeZoomContainer) return;

    // Reset values
    this.currentScale = 1;
    this.isZooming = false;
    this.isPanning = false;

    // Hide overlay
    this.activeZoomContainer.classList.remove('active');

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.activeZoomContainer && this.activeZoomContainer.parentNode) {
        this.activeZoomContainer.parentNode.removeChild(
          this.activeZoomContainer,
        );
      }
      this.activeZoomContainer = null;
    }, 300);

    // Restore body scroll
    document.body.style.overflow = '';
  }

  addGlobalStyles() {
    // Only add styles if we're on a touch device
    if (!('ontouchstart' in window)) return;

    // Check if styles already added
    if (document.getElementById('product-touch-zoom-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'product-touch-zoom-styles';
    styles.textContent = `
      /* Fix z-index for zoom buttons - only on touch devices */
      .product__media-toggle.touch-zoom-enabled {
        position: relative;
        z-index: 10 !important;
        pointer-events: auto !important;
      }

      .product__media-toggle.touch-zoom-enabled::after {
        z-index: 11 !important;
      }
      
      /* Touch zoom overlay */
      .product-touch-zoom-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        touch-action: none;
        user-select: none;
      }
      
      .product-touch-zoom-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      .product-touch-zoom-image {
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        transform-origin: center center;
        transition: transform 0.1s ease-out;
        touch-action: none;
        user-select: none;
        pointer-events: none;
      }
      
      .product-touch-zoom-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s ease;
        z-index: 1001;
      }
      
      .product-touch-zoom-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .product-touch-zoom-close svg {
        width: 20px;
        height: 20px;
      }
      
      .product-touch-zoom-instructions {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 14px;
        text-align: center;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 20px;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      /* Hide lightbox zoom button on non-touch devices */
      @media (hover: hover) and (pointer: fine) {
        .product__media-zoom-lightbox.touch-zoom-enabled {
          display: none;
        }
      }

      /* Show all zoom buttons on touch devices */
      @media (hover: none) and (pointer: coarse) {
        .product__media-toggle.touch-zoom-enabled {
          display: flex !important;
        }
      }

      /* Ensure zoom button is visible on mobile */
      @media screen and (max-width: 749px) {
        .product__media-toggle.touch-zoom-enabled {
          display: flex !important;
        }
      }

      /* Prevent magnify overlay from interfering on touch devices only */
      @media (hover: none) and (pointer: coarse) {
        .image-magnify-full-size {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize when DOM is ready
function initProductTouchZoom() {
  // Clear any existing instances
  if (window.productTouchZoomInstance) {
    window.productTouchZoomInstance = null;
  }

  // Only initialize if we're on a touch device, otherwise let magnify.js handle everything
  if ('ontouchstart' in window) {
    // Wait for magnify.js and other scripts to load
    setTimeout(() => {
      window.productTouchZoomInstance = new ProductTouchZoom();
    }, 300);
  } else {
    // On desktop, do absolutely nothing - let the original functionality work
    console.log(
      'Desktop detected - ProductTouchZoom not initialized, using original magnify.js',
    );

    // Debug: Check if magnify.js is working
    setTimeout(() => {
      const magnifyImages = document.querySelectorAll('.image-magnify-hover');
      const zoomButtons = document.querySelectorAll(
        '.product__media-zoom-hover',
      );
      console.log(
        'Debug: Found',
        magnifyImages.length,
        'images with .image-magnify-hover class',
      );
      console.log(
        'Debug: Found',
        zoomButtons.length,
        'zoom buttons with .product__media-zoom-hover class',
      );
      console.log(
        'Debug: enableZoomOnHover function exists:',
        typeof window.enableZoomOnHover !== 'undefined',
      );

      // Check if images have click handlers
      magnifyImages.forEach((img, index) => {
        console.log(`Debug: Image ${index} has onclick:`, img.onclick !== null);
      });
    }, 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductTouchZoom);
} else {
  initProductTouchZoom();
}

// Also initialize on theme editor changes
document.addEventListener('shopify:section:load', initProductTouchZoom);

// Handle page transitions (for themes that use AJAX)
document.addEventListener('page:loaded', initProductTouchZoom);
