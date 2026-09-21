(function () {
  'use strict';

  var canvas = document.getElementById('cv');
  var activePointerId = null;
  var lastX = 0;
  var lastY = 0;
  var rotationFactor = 0.5;

  if (!canvas || !window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  function getViewer() {
    return window.viewer || null;
  }

  function onPointerDown(event) {
    if (event.pointerType !== 'touch' || activePointerId !== null) {
      return;
    }

    activePointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    var viewer = getViewer();
    var deltaX;
    var deltaY;

    if (
      event.pointerId !== activePointerId ||
      event.pointerType !== 'touch' ||
      !viewer
    ) {
      return;
    }

    deltaX = event.clientX - lastX;
    deltaY = event.clientY - lastY;

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    viewer.rotate(deltaY * rotationFactor, deltaX * rotationFactor, 0);
    viewer.update();

    lastX = event.clientX;
    lastY = event.clientY;

    event.preventDefault();
  }

  function endPointer(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    activePointerId = null;
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
}());
