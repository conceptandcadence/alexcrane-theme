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
