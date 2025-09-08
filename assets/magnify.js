// create a container and set the full-size image as its background
function createOverlay(image) {
  const overlayImage = document.createElement('img');
  overlayImage.setAttribute('src', `${image.src}`);
  const overlay = document.createElement('div');
  prepareOverlay(overlay, overlayImage);

  image.style.opacity = '50%';
  toggleLoadingSpinner(image);

  overlayImage.onload = () => {
    toggleLoadingSpinner(image);

    // Ensure the parent container has relative positioning for the overlay
    const parentContainer = image.parentElement;
    console.log(
      'magnify.js: Parent container:',
      parentContainer.className,
      'Position:',
      getComputedStyle(parentContainer).position,
    );

    if (getComputedStyle(parentContainer).position === 'static') {
      parentContainer.style.position = 'relative';
      console.log('magnify.js: Set parent container to relative positioning');
    }

    // Insert overlay after the image instead of before
    image.parentElement.appendChild(overlay);
    console.log(
      'magnify.js: Overlay inserted, z-index:',
      getComputedStyle(overlay).zIndex,
    );
    image.style.opacity = '100%';
  };

  return overlay;
}

function prepareOverlay(container, image) {
  container.setAttribute('class', 'image-magnify-full-size');
  container.setAttribute('aria-hidden', 'true');
  container.style.backgroundImage = `url('${image.src}')`;
  container.style.backgroundColor = 'var(--gradient-background)';
}

function toggleLoadingSpinner(image) {
  const loadingSpinner =
    image.parentElement.parentElement.querySelector(`.loading__spinner`);
  loadingSpinner.classList.toggle('hidden');
}

function moveWithHover(image, event, zoomRatio, overlayElement) {
  // calculate mouse position
  const ratio = image.height / image.width;
  const container = event.target.getBoundingClientRect();
  const xPosition = event.clientX - container.left;
  const yPosition = event.clientY - container.top;
  const xPercent = `${xPosition / (image.clientWidth / 100)}%`;
  const yPercent = `${yPosition / ((image.clientWidth * ratio) / 100)}%`;

  // determine what to show in the frame
  overlayElement.style.backgroundPosition = `${xPercent} ${yPercent}`;
  overlayElement.style.backgroundSize = `${image.width * zoomRatio}px`;
}

function magnify(image, zoomRatio) {
  const overlay = createOverlay(image);
  overlay.onclick = () => overlay.remove();
  overlay.onmousemove = (event) =>
    moveWithHover(image, event, zoomRatio, overlay);
  overlay.onmouseleave = () => overlay.remove();
  return overlay;
}

function enableZoomOnHover(zoomRatio) {
  const images = document.querySelectorAll('.image-magnify-hover');
  console.log(
    'magnify.js: Found',
    images.length,
    'images with .image-magnify-hover class',
  );

  images.forEach((image) => {
    image.onclick = (event) => {
      console.log('magnify.js: Image clicked, creating magnify overlay');
      const overlay = magnify(image, zoomRatio);
      moveWithHover(image, event, zoomRatio, overlay);
    };
  });
}

// Make function globally available for debugging
window.enableZoomOnHover = enableZoomOnHover;

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => enableZoomOnHover(2), 100);
  });
} else {
  setTimeout(() => enableZoomOnHover(2), 100);
}
