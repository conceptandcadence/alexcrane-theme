// Vanilla JavaScript Sizing Chart Modal functionality
(function () {
  'use strict';

  function initSizingChartModal() {
    console.log('Initializing sizing chart modal...');
    const modal = document.getElementById('sizing-chart-modal-overlay');
    const modalContent = document.querySelector('.sizing-chart-modal-content');
    const modalClose = document.querySelector('.sizing-chart-modal-close');
    const modalTitle = document.querySelector('.sizing-chart-modal-title');
    const sizingChartContainer = document.querySelector(
      '.sizing-chart-content-container',
    );
    const sizingCharts = document.querySelectorAll('.sizing-chart');

    console.log('Elements found:', {
      modal: !!modal,
      modalContent: !!modalContent,
      modalClose: !!modalClose,
      modalTitle: !!modalTitle,
      sizingChartContainer: !!sizingChartContainer,
      sizingCharts: sizingCharts.length,
    });

    // Debug: Check what sizing charts exist
    console.log(
      'Available sizing charts:',
      Array.from(sizingCharts).map((chart) => ({
        element: chart,
        chartType: chart.dataset.chartType,
        visible: chart.style.display !== 'none',
      })),
    );

    // Debug: Check current product info if available
    if (window.product) {
      console.log('Current product tags:', window.product.tags);
    }

    if (!modal || !modalContent || !sizingChartContainer) {
      console.log('Missing required modal elements, aborting initialization');
      return;
    }

    if (sizingCharts.length === 0) {
      console.log('⚠️ No sizing charts found - this might be because:');
      console.log(
        '1. Product is missing the correct tag (e.g., "size-acshirts")',
      );
      console.log('2. Size charts section is not configured properly');
      console.log('3. Product has no matching size chart configuration');

      // Still set up the event listener in case charts get loaded later
      console.log('Setting up event listener anyway for dynamic content...');
    } else {
      console.log(
        '✅ Found',
        sizingCharts.length,
        'sizing charts, proceeding with initialization',
      );
    }

    console.log('All elements found, setting up event listeners...');

    // Handle opening size chart modal
    document.addEventListener('click', function (e) {
      console.log('Click detected on:', e.target);
      if (
        e.target.matches('[data-sizing-chart-toggle]') ||
        e.target.closest('[data-sizing-chart-toggle]')
      ) {
        console.log('Size chart toggle clicked!');
        e.preventDefault();
        const trigger = e.target.matches('[data-sizing-chart-toggle]')
          ? e.target
          : e.target.closest('[data-sizing-chart-toggle]');

        // Re-query sizing charts in case they were loaded dynamically
        const currentSizingCharts = document.querySelectorAll('.sizing-chart');

        if (currentSizingCharts.length === 0) {
          console.log('❌ No sizing charts available to display');
          alert('Size chart is not available for this product.');
          return;
        }

        // Determine which chart to show based on product tags or default to first
        let chartToShow = currentSizingCharts[0]; // Default to first chart

        // Try to find specific chart based on current product context if available
        const chartType = trigger.dataset.chartType;
        if (chartType) {
          const specificChart = document.querySelector(
            `.sizing-chart[data-chart-type="${chartType}"]`,
          );
          if (specificChart) chartToShow = specificChart;
        }

        console.log(
          '📏 Showing sizing chart:',
          chartToShow.dataset.chartType || 'default',
        );

        // Move the chart content to modal
        modalContent.appendChild(chartToShow);

        // Update modal title if chart has a title
        const chartTitle = chartToShow.querySelector('.sizing-chart__title');
        if (chartTitle) {
          modalTitle.textContent = chartTitle.textContent;
        } else {
          modalTitle.textContent = 'Size Guide';
        }

        // Show modal
        modal.classList.add('active');

        // Prevent body scrolling
        document.body.style.overflow = 'hidden';

        // Focus management for accessibility
        modalClose.focus();
      }
    });

    // Handle toggling sizing units
    document.addEventListener('click', function (e) {
      if (
        e.target.matches('.toggle-sizing-unit') ||
        e.target.closest('.toggle-sizing-unit')
      ) {
        e.preventDefault();
        const toggle = e.target.matches('.toggle-sizing-unit')
          ? e.target
          : e.target.closest('.toggle-sizing-unit');
        const unit = toggle.dataset.unit;

        // Update active state on toggles
        const allToggles = modalContent.querySelectorAll('.toggle-sizing-unit');
        allToggles.forEach((t) => t.classList.remove('active'));
        toggle.classList.add('active');

        // Update chart view
        const currentChart = modalContent.querySelector('.sizing-chart');
        if (currentChart) {
          currentChart.setAttribute('data-view', unit);
        }
      }
    });

    // Close modal function
    function closeModal() {
      // Move chart content back to original container
      const currentChart = modalContent.querySelector('.sizing-chart');
      if (currentChart && sizingChartContainer) {
        sizingChartContainer.appendChild(currentChart);
      }

      // Hide modal
      modal.classList.remove('active');

      // Restore body scrolling
      document.body.style.overflow = '';

      // Return focus to trigger button if it exists
      const trigger = document.querySelector('[data-sizing-chart-toggle]');
      if (trigger) trigger.focus();
    }

    // Handle closing size chart modal
    if (modalClose) {
      modalClose.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal();
      });
    }

    // Close modal when clicking outside the dialog
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Handle escape key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        e.preventDefault();
        closeModal();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSizingChartModal);
  } else {
    initSizingChartModal();
  }
})();
