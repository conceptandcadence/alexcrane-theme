// Vanilla JavaScript Sizing Chart Modal functionality
(function () {
  'use strict';

  function initSizingChartModal() {
    const modal = document.getElementById('sizing-chart-modal-overlay');
    const modalContent = document.querySelector('.sizing-chart-modal-content');
    const modalClose = document.querySelector('.sizing-chart-modal-close');
    const modalTitle = document.querySelector('.sizing-chart-modal-title');
    const sizingChartContainer = document.querySelector(
      '.sizing-chart-content-container',
    );
    const sizingCharts = document.querySelectorAll('.sizing-chart');

    if (
      !modal ||
      !modalContent ||
      !sizingChartContainer ||
      sizingCharts.length === 0
    )
      return;

    // Handle opening size chart modal
    document.addEventListener('click', function (e) {
      if (
        e.target.matches('[data-sizing-chart-toggle]') ||
        e.target.closest('[data-sizing-chart-toggle]')
      ) {
        e.preventDefault();
        const trigger = e.target.matches('[data-sizing-chart-toggle]')
          ? e.target
          : e.target.closest('[data-sizing-chart-toggle]');

        // Determine which chart to show based on product tags or default to first
        let chartToShow = sizingCharts[0]; // Default to first chart

        // Try to find specific chart based on current product context if available
        const chartType = trigger.dataset.chartType;
        if (chartType) {
          const specificChart = document.querySelector(
            `.sizing-chart[data-chart-type="${chartType}"]`,
          );
          if (specificChart) chartToShow = specificChart;
        }

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
