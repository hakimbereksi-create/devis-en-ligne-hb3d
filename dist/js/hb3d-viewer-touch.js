(function () {
  'use strict';

  var canvas = document.getElementById('cv');
  var pointers = {};
  var activePointerId = null;
  var lastX = 0;
  var lastY = 0;
  var startX = 0;
  var startY = 0;
  var pinchDistance = null;
  var gestureHasMoved = false;
  var isPinching = false;

  var rotationFactor = 0.5;
  var tapMoveThreshold = 7;
  var minZoomFactor = 2;
  var maxZoomFactor = 200;

  if (!canvas || !window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  function getViewer() {
    return window.viewer || null;
  }

  function getTouchPointers() {
    return Object.keys(pointers)
      .map(function (id) {
        return {
        id: Number(id),
        pointerType: pointers[id].pointerType,
        x: pointers[id].x,
        y: pointers[id].y
      };
      })
      .filter(function (pointer) {
        return pointer.pointerType === 'touch';
      });
  }

  function getDistance(first, second) {
    var dx = second.x - first.x;
    var dy = second.y - first.y;

    return Math.sqrt((dx * dx) + (dy * dy));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function selectMeshAt(clientX, clientY) {
    var viewer = getViewer();

    if (
      !viewer ||
      !viewer.selectionBuffer ||
      !viewer.frameWidth ||
      !viewer.frameHeight
    ) {
      return;
    }

    var rect = canvas.getBoundingClientRect();

    var xBuffer = Math.floor(
      (clientX - rect.left) * viewer.frameWidth / rect.width
    );

    var yBuffer = Math.floor(
      (clientY - rect.top) * viewer.frameHeight / rect.height
    );

    xBuffer = clamp(xBuffer, 0, viewer.frameWidth - 1);
    yBuffer = clamp(yBuffer, 0, viewer.frameHeight - 1);

    var internalId = viewer.selectionBuffer[
      yBuffer * viewer.frameWidth + xBuffer
    ];

    var scene = viewer.getScene ? viewer.getScene() : viewer.scene;
    var meshes = scene && typeof scene.getChildren === 'function'
      ? scene.getChildren()
      : [];

    var mesh = meshes.find(function (item) {
      return item.internalId === internalId;
    });

    if (!mesh || !mesh.hb3dFileKey) {
      console.log('[HB3D TOUCH PICK] Aucun objet sélectionné.');
      return;
    }

    window.hb3dFichierActifKey = mesh.hb3dFileKey;

    if (typeof window.hb3dRestaurerConfigurationFichier === 'function') {
      window.hb3dRestaurerConfigurationFichier(mesh.hb3dFileKey);
    }

    console.log(
      '[HB3D TOUCH PICK] Pièce sélectionnée :',
      mesh.hb3dFileName,
      mesh.hb3dFileKey
    );
  }

  function onPointerDown(event) {
    if (event.pointerType !== 'touch') {
      return;
    }

    pointers[event.pointerId] = {
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY
    };

    var touches = getTouchPointers();

    if (touches.length === 1) {
      activePointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      startX = event.clientX;
      startY = event.clientY;
      gestureHasMoved = false;
      isPinching = false;
    } else if (touches.length === 2) {
      activePointerId = null;
      isPinching = true;
      gestureHasMoved = true;
      pinchDistance = getDistance(touches[0], touches[1]);
    }

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (event.pointerType !== 'touch' || !pointers[event.pointerId]) {
      return;
    }

    pointers[event.pointerId].x = event.clientX;
    pointers[event.pointerId].y = event.clientY;

    var viewer = getViewer();
    var touches = getTouchPointers();

    if (!viewer) {
      return;
    }

    if (touches.length >= 2) {
      var currentDistance = getDistance(touches[0], touches[1]);

      if (pinchDistance && currentDistance > 0) {
        var ratio = currentDistance / pinchDistance;
        var nextZoom = viewer.zoomFactor * ratio;

        viewer.zoomFactor = clamp(nextZoom, minZoomFactor, maxZoomFactor);
        viewer.update();
      }

      pinchDistance = currentDistance;
      isPinching = true;
      gestureHasMoved = true;
      event.preventDefault();
      return;
    }

    if (event.pointerId !== activePointerId || isPinching) {
      return;
    }

    var deltaX = event.clientX - lastX;
    var deltaY = event.clientY - lastY;

    var totalX = event.clientX - startX;
    var totalY = event.clientY - startY;

    if (
      Math.sqrt((totalX * totalX) + (totalY * totalY)) >
      tapMoveThreshold
    ) {
      gestureHasMoved = true;
    }

    if (deltaX !== 0 || deltaY !== 0) {
      viewer.rotate(deltaY * rotationFactor, deltaX * rotationFactor, 0);
      viewer.update();

      lastX = event.clientX;
      lastY = event.clientY;
    }

    event.preventDefault();
  }

  function endPointer(event) {
    if (event.pointerType !== 'touch' || !pointers[event.pointerId]) {
      return;
    }

    var endedPointer = pointers[event.pointerId];
    var touchesBeforeRemoval = getTouchPointers();

    if (
      touchesBeforeRemoval.length === 1 &&
      event.pointerId === activePointerId &&
      !gestureHasMoved &&
      !isPinching
    ) {
      selectMeshAt(event.clientX, event.clientY);
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    delete pointers[event.pointerId];

    var touchesAfterRemoval = getTouchPointers();

    if (touchesAfterRemoval.length === 1) {
      activePointerId = touchesAfterRemoval[0].id || null;
      lastX = touchesAfterRemoval[0].x;
      lastY = touchesAfterRemoval[0].y;
      startX = lastX;
      startY = lastY;
      pinchDistance = null;
      isPinching = false;
      gestureHasMoved = true;
    } else if (touchesAfterRemoval.length === 0) {
      activePointerId = null;
      pinchDistance = null;
      isPinching = false;
      gestureHasMoved = false;
    }

    void endedPointer;
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', endPointer, { passive: false });
  canvas.addEventListener('pointercancel', endPointer, { passive: false });

  console.log('[HB3D TOUCH] Rotation, zoom et sélection tactile installés.');
}());
