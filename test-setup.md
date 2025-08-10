# Playwright Test Setup

## Quick Setup

To run tests, you need to provide your Shopify store URL. You can do this in two ways:

### Option 1: Environment Variable (Recommended)
```bash
# Set the BASE_URL and run tests
BASE_URL=https://your-store.myshopify.com npm run test:headed
```

### Option 2: Create .env file
Create a `.env` file in the project root:
```
BASE_URL=https://your-store.myshopify.com
```

Then run:
```bash
npm run test:headed
```

## Test Commands

```bash
# Run tests with browser visible
npm run test:headed

# Run specific test file
npx playwright test tests/example.spec.js --headed

# Run carousel tests only
npx playwright test tests/carousel.spec.js --headed

# Interactive UI mode
npm run test:ui

# Debug mode
npm run test:debug
```

## Example URLs

Replace with your actual store URL:
- `https://your-store.myshopify.com`
- `https://yourstore.com` (if using custom domain)

## What the Tests Check

### Basic Setup Test
- ✅ Page loads correctly
- ✅ Product cards are visible
- ✅ Swiper library is loaded

### Carousel Tests
- ✅ Card carousel hover effects
- ✅ Navigation button functionality
- ✅ Swipe gestures work
- ✅ Quick-add modal opens
- ✅ Modal carousel functionality