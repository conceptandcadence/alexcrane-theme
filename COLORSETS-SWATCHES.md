# Colorsets Swatches System

A JavaScript solution to dynamically inject colorway swatches into product cards that don't have access to metaobjects on the backend (e.g., Rebuy, GrapheneHC cards).

## Overview

This system provides the ability to show colorway swatches on product cards loaded via third-party systems that don't have access to Shopify metaobjects. It works by:

1. Loading colorset data from metaobjects into JSON
2. Building a mapping of products to their colorsets
3. Dynamically injecting swatch HTML into empty `.secondary` divs
4. Monitoring for new product cards via MutationObserver

## Files

### Core Files
- `snippets/colorsets.liquid` - Generates colorset data JSON
- `assets/colorsets-swatches.js` - Main JavaScript functionality
- `snippets/colorsets-swatches-init.liquid` - Initialization script

### Documentation
- `COLORSETS-SWATCHES.md` - This documentation file

## Implementation

### 1. Include the Colorsets Data

Add the colorsets snippet to your theme layout (typically in `layout/theme.liquid`):

```liquid
{% render 'colorsets' %}
```

This should be placed in the `<head>` section or before the closing `</body>` tag.

### 2. Initialize the Swatches System

Add the initialization snippet before the closing `</body>` tag:

```liquid
{% render 'colorsets-swatches-init' %}
```

### 3. Ensure Product Cards Have Proper Structure

Your product cards should have:
- A `.secondary` div for swatch injection
- A way to identify the product (URL, ID, or handle)
- The class `product-card-wrapper` or `card-wrapper`

Example structure:
```html
<div class="product-card-wrapper">
  <!-- Product content -->
  <div class="card__information">
    <div class="primary">
      <!-- Primary product info -->
    </div>
    <div class="secondary">
      <!-- Swatches will be injected here -->
    </div>
  </div>
</div>
```

## How It Works

### Data Structure

The system generates a JSON structure containing all colorsets and their associated products:

```json
{
  "colorsets": [
    {
      "id": "gid://shopify/Metaobject/123",
      "handle": "men",
      "products": [
        {
          "id": 414819188765,
          "handle": "bo-shorts-lines-1",
          "title": "Bo Shorts - Lines",
          "url": "/products/bo-shorts-lines-1",
          "colorway": {
            "admin_name": "Woven Linen Lines",
            "image": "gid://shopify/MediaImage/26621573988441",
            "title": "Lines"
          }
        }
      ]
    }
  ]
}
```

### Product Identification

The system identifies products in cards using multiple methods:
1. `data-product-url` attributes
2. `data-product-id` attributes  
3. Product links with `/products/` URLs

### Swatch Generation

For each product in a colorset:
1. Uses the colorway swatch image if available
2. Falls back to the product's featured image
3. Creates clickable swatch buttons that navigate to the product
4. Limits to 5 swatches with "+X styles" indicator

### Dynamic Loading

The system automatically detects new product cards using MutationObserver and applies swatches to:
- Cards loaded via AJAX
- Rebuy recommendation widgets
- GrapheneHC search results
- Any dynamically inserted product cards

## Integration with Third-Party Systems

### Rebuy Integration

The system automatically hooks into Rebuy's render function to refresh swatches when new recommendations load.

### GrapheneHC Integration

Listens for the `graphene:loaded` event to refresh swatches when search results update.

### Generic AJAX Integration

Monitors common AJAX events and refreshes swatches accordingly.

## API Reference

### Global Object: `window.ColorsetSwatches`

#### Methods

- `init()` - Initialize the system
- `refresh()` - Manually refresh swatches on existing cards
- `applySwatches()` - Apply swatches to all current product cards
- `destroy()` - Clean up observers and data

#### Properties

- `isInitialized` - Boolean indicating if system is ready
- `colorsetData` - The loaded colorset data
- `productToColorsetMap` - Map of product identifiers to colorset info

### Manual Usage

```javascript
// Initialize manually
window.ColorsetSwatches.init();

// Refresh swatches after dynamic content loads
window.ColorsetSwatches.refresh();

// Check if system is ready
if (window.ColorsetSwatches.isInitialized) {
  // System is ready
}
```

## Troubleshooting

### Common Issues

1. **Swatches not appearing**
   - Check that colorsets.liquid is included
   - Verify product cards have `.secondary` divs
   - Ensure products are in colorset metaobjects

2. **Swatches appear but images are broken**
   - Check colorway metafield data has valid image references
   - Verify image URLs are accessible

3. **Swatches not updating for dynamic content**
   - Call `ColorsetSwatches.refresh()` after content loads
   - Check console for JavaScript errors

### Debug Mode

Enable debug mode in theme settings to see console logs of colorset data:
- Set `settings.colorsets_debug_mode` to `true`
- Check browser console for colorset information

### Console Commands

```javascript
// View loaded colorset data
console.log(window.ColorsetSwatches.colorsetData);

// View product mapping
console.log(window.ColorsetSwatches.productToColorsetMap);

// Manually refresh
window.ColorsetSwatches.refresh();
```

## Performance Considerations

- The system loads all colorset data on page load
- Product mapping is built once and cached
- MutationObserver only monitors for new cards
- Swatch generation is throttled to prevent excessive DOM manipulation

## Customization

### Styling

Swatches use the same CSS classes as the original card-product.liquid implementation:
- `.product-swatch-item`
- `.product-swatch-button`
- Standard Tailwind classes for layout

### Swatch Limits

To change the maximum number of swatches, modify the `maxSwatches` variable in `generateSwatchHTML()`.

### Image Sizing

Swatch images are automatically sized to 28x28 pixels. Modify the image URL generation in `createSwatchItem()` to change this.

## Browser Support

- Modern browsers with ES6+ support
- MutationObserver support (IE11+)
- Requires JavaScript enabled

## Version History

- v1.0 - Initial implementation with basic swatch injection
- Enhanced colorway data integration
- Added third-party system integrations
