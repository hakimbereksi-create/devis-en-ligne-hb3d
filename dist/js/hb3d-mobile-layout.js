(function () {
  'use strict';

  var MOBILE_MAX_WIDTH = 767;
  var orderPanel = null;
  var workflowColumn = null;
  var uploadPanel = null;
  var originalNextSibling = null;
  var resizeTimer = null;

  function findElements() {
    orderPanel = document.querySelector('.hb3d-order-panel');
    workflowColumn = document.querySelector('.devis-workflow-column');
    uploadPanel = document.querySelector('.hb3d-upload-panel');

    if (
      orderPanel &&
      workflowColumn &&
      orderPanel.parentNode === workflowColumn &&
      !originalNextSibling
    ) {
      originalNextSibling = orderPanel.nextElementSibling;
    }

    return Boolean(orderPanel && workflowColumn && uploadPanel);
  }

  function placeOrderPanel() {
    if (!findElements()) return;

    if (window.matchMedia('(max-width: 767px)').matches) {
      if (orderPanel.parentNode !== uploadPanel.parentNode || orderPanel.nextElementSibling !== uploadPanel) {
        uploadPanel.parentNode.insertBefore(orderPanel, uploadPanel);
      }

      orderPanel.classList.add('hb3d-mobile-moved');
      return;
    }

    if (originalNextSibling && originalNextSibling.parentNode === workflowColumn) {
      workflowColumn.insertBefore(orderPanel, originalNextSibling);
    } else {
      workflowColumn.appendChild(orderPanel);
    }

    orderPanel.classList.remove('hb3d-mobile-moved');
  }

  function scheduleLayout() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(placeOrderPanel, 0);
  }

  function start() {
    placeOrderPanel();
    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('orientationchange', scheduleLayout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());