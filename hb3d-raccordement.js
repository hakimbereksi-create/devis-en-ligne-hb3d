/* HB3D — initialisation isolée du viewer.
   Aucun import, calcul de prix, transfert ou envoi. */
(function () {
  'use strict';

  function initViewer() {
    var canvas = document.getElementById('cv');
    var container = document.getElementById('hb3d-real-viewer');
    var placeholder = document.getElementById(
      'hb3d-viewer-placeholder'
    );
    var status = document.getElementById('hb3d-viewer-status');

    if (!canvas || !container) return;
    if (window.hb3dRaccordementViewer) return;

    function setMessage(title, description) {
  var isWelcome = title === 'Viewer 3D prêt';

  var displayedTitle = isWelcome
    ? 'Ajoutez vos fichiers 3D'
    : title;

  var displayedDescription = isWelcome
    ? 'Visualisez vos pièces et obtenez une estimation.'
    : description;

  if (placeholder) {
    var heading = placeholder.querySelector('span');
    var caption = placeholder.querySelector('small');

    if (heading) {
      heading.textContent = displayedTitle;
    }

    if (caption) {
      caption.textContent = displayedDescription;
    }

    var importBlock = placeholder.querySelector(
      '.hb3d-import-invitation'
    );

    /* Le bouton ne doit pas apparaître dans les messages d'erreur. */
    if (!isWelcome && importBlock) {
      importBlock.remove();
    }

    if (isWelcome && !importBlock) {
      importBlock = document.createElement('div');
      importBlock.className = 'hb3d-import-invitation';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'hb3d-import-button';
      button.textContent = 'Choisir mes fichiers 3D';

      button.addEventListener('click', function (event) {
        event.stopPropagation();

        var input = document.getElementById('files');

        if (input && !input.disabled) {
          input.click();
        }
      });

      var formats = document.createElement('small');
      formats.className = 'hb3d-import-formats';
      formats.textContent =
        'STL, OBJ, STEP, STP, IGS et IGES';

      importBlock.appendChild(button);
      importBlock.appendChild(formats);
      placeholder.appendChild(importBlock);
    }
  }

  if (status) {
    status.textContent =
      displayedTitle + '. ' + displayedDescription;
  }
}

    if (
      !window.JSC3D ||
      typeof window.JSC3D.Viewer !== 'function'
    ) {
      setMessage(
        'Moteur 3D indisponible',
        'Vérifiez le chargement de dist/js/jsc3d_mod.js.'
      );
      return;
    }

    try {
      var bounds = container.getBoundingClientRect();

      canvas.width = Math.max(1, Math.round(bounds.width));
      canvas.height = Math.max(1, Math.round(bounds.height));

      var viewer = new window.JSC3D.Viewer(canvas);

      viewer.setParameter('InitRotationX', 20);
      viewer.setParameter('InitRotationY', 20);
      viewer.setParameter('InitRotationZ', 0);
      viewer.setParameter('ModelColor', '#ebeef1');
      /* Fond clair en haut, plus soutenu en bas. */
      viewer.setParameter('BackgroundColor1', '#979797');
      viewer.setParameter('BackgroundColor2', '#ffffff');
      viewer.setParameter('RenderMode', 'smooth');
      viewer.setParameter('CreaseAngle', '35');
      viewer.setParameter('Definition', 'high');

      viewer.init();
      viewer.update();

      window.hb3dRaccordementViewer = viewer;

      /* Repère XYZ : lecture seule de l'orientation JSC3D. */
(function installDynamicAxis() {
  var svg = document.querySelector('svg.viewer-axis');

  if (!svg) return;

  /* Éviter deux synchronisations si le viewer est recréé. */
  if (typeof svg.hb3dStopAxis === 'function') {
    svg.hb3dStopAxis();
  }

  var ns = 'http://www.w3.org/2000/svg';
  var frame = 0;
  var stopped = false;
  var previousOrientation = '';

  svg.setAttribute('viewBox', '0 0 76 54');
  svg.setAttribute(
    'aria-label',
    'Repère XYZ synchronisé avec la vue 3D'
  );

  var title = document.createElementNS(ns, 'title');
  title.textContent = 'Orientation des axes du modèle';

  var drawing = document.createElementNS(ns, 'g');

  var axes = [
    { name: 'X', color: '#df315d', column: 0 },
    { name: 'Y', color: '#36a578', column: 1 },
    { name: 'Z', color: '#2878d0', column: 2 }
  ];

  axes.forEach(function (axis) {
    axis.group = document.createElementNS(ns, 'g');

    axis.path = document.createElementNS(ns, 'path');
    axis.path.setAttribute('fill', 'none');
    axis.path.setAttribute('stroke', axis.color);
    axis.path.setAttribute('stroke-width', '1.8');
    axis.path.setAttribute('stroke-linecap', 'round');
    axis.path.setAttribute('stroke-linejoin', 'round');

    axis.text = document.createElementNS(ns, 'text');
    axis.text.setAttribute('fill', axis.color);
    axis.text.setAttribute('font-family', 'Arial, sans-serif');
    axis.text.setAttribute('font-size', '9');
    axis.text.setAttribute('font-weight', '700');
    axis.text.setAttribute('text-anchor', 'middle');
    axis.text.setAttribute('dominant-baseline', 'middle');
    axis.text.textContent = axis.name;

    axis.group.appendChild(axis.path);
    axis.group.appendChild(axis.text);
    drawing.appendChild(axis.group);
  });

  svg.replaceChildren(title, drawing);

  function syncAxis() {
    if (stopped) return;

    if (
      !svg.isConnected ||
      window.hb3dRaccordementViewer !== viewer
    ) {
      stopped = true;
      return;
    }

    var matrix = viewer.rotMatrix;

    if (matrix) {
      var values = [
        matrix.m00, matrix.m01, matrix.m02,
        matrix.m10, matrix.m11, matrix.m12,
        matrix.m20, matrix.m21, matrix.m22
      ];

      if (values.every(Number.isFinite)) {
        var orientation = values.map(function (value) {
          return value.toFixed(5);
        }).join(',');

        /* Ne redessiner le SVG que si l'orientation change. */
        if (orientation !== previousOrientation) {
          previousOrientation = orientation;

          axes.forEach(function (axis) {
            var column = axis.column;

            var x = values[column];
            var y = -values[3 + column];

            axis.depth = values[6 + column];

            var cx = 38;
            var cy = 27;
            var length = 16;

            var endX = cx + length * x;
            var endY = cy + length * y;
            var projectedLength = Math.hypot(x, y);

            var path =
              'M' + cx + ' ' + cy +
              'L' + endX + ' ' + endY;

            /* Pointe de flèche dans le plan de l'écran. */
            if (projectedLength > 0.15) {
              var ux = x / projectedLength;
              var uy = y / projectedLength;

              path +=
                'M' + (endX - 4 * ux - 2 * uy) +
                ' ' + (endY - 4 * uy + 2 * ux) +
                'L' + endX + ' ' + endY +
                'L' + (endX - 4 * ux + 2 * uy) +
                ' ' + (endY - 4 * uy - 2 * ux);
            }

            axis.path.setAttribute('d', path);

            axis.text.setAttribute('x', cx + 23 * x);
            axis.text.setAttribute('y', cy + 23 * y);
          });

          /* Dessiner les axes éloignés avant les axes proches. */
          axes.slice().sort(function (a, b) {
            return a.depth - b.depth;
          }).forEach(function (axis) {
            drawing.appendChild(axis.group);
          });
        }
      }
    }

    frame = window.requestAnimationFrame(syncAxis);
  }

  svg.hb3dStopAxis = function () {
    stopped = true;
    window.cancelAnimationFrame(frame);
  };

  syncAxis();
})();

      /* Synchroniser le rendu avec la taille réelle du viewer. */
var resizeFrame = 0;

function resizeViewer() {
  resizeFrame = 0;

  /* Ce raccordement concerne le moteur logiciel utilisé ici. */
  if (viewer.webglBackend || !viewer.ctx2d) return;

  var rect = container.getBoundingClientRect();
  var width = Math.round(rect.width);
  var height = Math.round(rect.height);

  if (width < 3 || height < 3) return;

  var expectedFrameWidth = width * 2;
  var expectedFrameHeight = height * 2;

  var canvasMatches =
    canvas.width === width &&
    canvas.height === height;

  var frameMatches =
    viewer.definition === 'high' &&
    viewer.frameWidth === expectedFrameWidth &&
    viewer.frameHeight === expectedFrameHeight;

  var outputMatches =
    viewer.canvasData &&
    viewer.canvasData.width === width &&
    viewer.canvasData.height === height;

  if (canvasMatches && frameMatches && outputMatches) return;

  var oldFrameWidth = viewer.frameWidth;
  var oldFrameHeight = viewer.frameHeight;
  var oldZoom = viewer.zoomFactor;
  var oldPanX = viewer.panning[0];
  var oldPanY = viewer.panning[1];

  canvas.width = width;
  canvas.height = height;

  /* Recréer le tampon de sortie aux nouvelles dimensions. */
  viewer.canvasData = viewer.ctx2d.createImageData(
    width,
    height
  );

  /* Forcer le recalcul des buffers haute définition. */
  viewer.setDefinition('standard');
  viewer.setDefinition('high');

  /* Conserver le cadrage relatif sans réinitialiser la scène. */
  var oldReference = Math.min(
    oldFrameWidth,
    oldFrameHeight
  );

  var newReference = Math.min(
    viewer.frameWidth,
    viewer.frameHeight
  );

  var ratio = oldReference > 0
    ? newReference / oldReference
    : 1;

  viewer.zoomFactor = oldZoom * ratio;
  viewer.panning[0] = oldPanX * ratio;
  viewer.panning[1] = oldPanY * ratio;

  viewer.update();
}

function scheduleViewerResize() {
  if (resizeFrame) return;

  resizeFrame = window.requestAnimationFrame(resizeViewer);
}

/* Observer aussi les changements de taille dus à la mise en page. */
if (typeof window.ResizeObserver === 'function') {
  var viewerResizeObserver = new window.ResizeObserver(
    scheduleViewerResize
  );

  viewerResizeObserver.observe(container);
}

window.addEventListener('resize', scheduleViewerResize);

scheduleViewerResize();

       setMessage(
       'Viewer 3D prêt',
       'Ajoutez un fichier STL, OBJ, STEP ou STP, IGS ou IGES pour afficher son aperçu.'
       );

      console.info(
        '[HB3D Raccordement] Viewer initialisé.',
        viewer
      );
    } catch (error) {
      setMessage(
        'Initialisation du viewer interrompue',
        'Consultez la console du navigateur.'
      );

      console.error(
        '[HB3D Raccordement] Échec de l’initialisation.',
        error
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewer);
  } else {
    initViewer();
  }
}());

/* HB3D — aperçus locaux STL / OBJ / STEP / STP. */
(function () {
  'use strict';

  var requestedFile = null;
  var requestId = 0;
  var occtPromise = null;

  /*
   * Une promesse par fichier :
   * réutiliser une lecture en cours ou une scène déjà construite.
   */
  var scenes = new WeakMap();

  /*
 * Analyse des scènes sources, avant les déplacements d'affichage.
 * Résultat géométrique estimatif : aucune validation technique.
 */
var geometryResults = new WeakMap();

function analyseSourceGeometry(scene) {
  var meshes = scene.getChildren();
  var signedVolume = 0;
  var triangleCount = 0;

  var min = [Infinity, Infinity, Infinity];
  var max = [-Infinity, -Infinity, -Infinity];

  function addTriangle(vertices, a, b, c) {
    var ax = vertices[a * 3];
    var ay = vertices[a * 3 + 1];
    var az = vertices[a * 3 + 2];

    var bx = vertices[b * 3];
    var by = vertices[b * 3 + 1];
    var bz = vertices[b * 3 + 2];

    var cx = vertices[c * 3];
    var cy = vertices[c * 3 + 1];
    var cz = vertices[c * 3 + 2];

    signedVolume += (
      ax * (by * cz - bz * cy) +
      ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx)
    ) / 6;

    triangleCount++;
  }

  meshes.forEach(function (mesh) {
    var vertices = mesh.vertexBuffer;
    var indices = mesh.indexBuffer;

    if (
      !vertices ||
      !indices ||
      vertices.length < 9 ||
      vertices.length % 3 !== 0
    ) {
      throw new Error('Géométrie incomplète.');
    }

    for (var i = 0; i < vertices.length; i++) {
      if (!Number.isFinite(vertices[i])) {
        throw new Error('Coordonnée non numérique.');
      }

      var axis = i % 3;
      min[axis] = Math.min(min[axis], vertices[i]);
      max[axis] = Math.max(max[axis], vertices[i]);
    }

    var face = [];

    function flushFace() {
      if (!face.length) return;

      /*
       * Première version volontairement limitée aux triangles.
       * Ne pas tarifer silencieusement un polygone mal interprété.
       */
      if (face.length !== 3) {
        throw new Error(
          'Face non triangulaire : analyse complémentaire requise.'
        );
      }

      addTriangle(vertices, face[0], face[1], face[2]);
      face = [];
    }

    for (var j = 0; j < indices.length; j++) {
      var index = indices[j];

      if (index === -1) {
        flushFace();
        continue;
      }

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= vertices.length / 3
      ) {
        throw new Error('Indice de sommet invalide.');
      }

      face.push(index);
    }

    flushFace();
  });

  var volume = Math.abs(signedVolume);

  if (
    !triangleCount ||
    !Number.isFinite(volume) ||
    volume <= 0
  ) {
    throw new Error('Volume non exploitable.');
  }

  return {
    status: 'estimated',
    volumeModelUnits3: volume,
    dimensionsModelUnits: {
      x: max[0] - min[0],
      y: max[1] - min[1],
      z: max[2] - min[2]
    },
    triangles: triangleCount,
    unitStatus: 'to-confirm',
    technicalValidation: false
  };
}

function publishSourceGeometry(file, scene) {
  var result = geometryResults.get(file);

  if (!result) {
    try {
      result = analyseSourceGeometry(scene);

      /*
       * Seules les scènes CAO créées par readCad()
       * portent ce contrat d'unité.
       */
      if (scene.hb3dLinearUnit === 'mm') {
        result.linearUnit = 'mm';
        result.unitStatus = 'specified-output';
        result.unitSource = scene.hb3dUnitSource;
      }
    } catch (error) {
      result = {
        status: 'unavailable',
        message: error.message,
        technicalValidation: false
      };

      console.warn(
        '[HB3D Géométrie]',
        file.name,
        error
      );
    }

    geometryResults.set(file, result);
  }

  if (typeof window.hb3dReceiveGeometry === 'function') {
    window.hb3dReceiveGeometry(file, result);
  }
}

  function showMessage(title, description) {
    var placeholder = document.getElementById(
      'hb3d-viewer-placeholder'
    );
    var status = document.getElementById('hb3d-viewer-status');

    if (placeholder) {
      placeholder.hidden = false;

      var heading = placeholder.querySelector('span');
      var caption = placeholder.querySelector('small');

      if (heading) heading.textContent = title;
      if (caption) caption.textContent = description;
    }

    if (status) {
      status.textContent = title + '. ' + description;
    }
  }

  function clearScene(viewer) {
    viewer.replaceScene(
      new window.JSC3D.Scene('hb3d-empty')
    );
    viewer.update();
  }

  function setNote(text) {
    var note = document.querySelector('.scene-note');
    if (note) note.textContent = text;
  }

  window.hb3dClearPreview = function () {
    requestId++;
    requestedFile = null;

    var viewer = window.hb3dRaccordementViewer;

    if (viewer && window.JSC3D) {
      try {
        clearScene(viewer);
      } catch (error) {
        console.error('[HB3D Viewer] Nettoyage :', error);
      }
    }

    showMessage(
      'Aucune pièce à afficher',
      'Ajoutez un fichier STL, OBJ, STEP, STP, IGS ou IGES pour afficher son aperçu.'
    );

    setNote('Aperçu local · aucun modèle chargé');
  };

  function getOcct() {
    if (!occtPromise) {
      occtPromise = Promise.resolve().then(function () {
        if (typeof window.occtimportjs !== 'function') {
          throw new Error(
            'Lecteur STEP absent : vérifiez ' +
            'vendor/occt/occt-import-js.js.'
          );
        }

        return window.occtimportjs({
          locateFile: function (filename) {
            return new URL(
              'vendor/occt/' + filename,
              document.baseURI
            ).href;
          }
        });
      }).catch(function (error) {
        /* Autoriser une nouvelle tentative après un échec. */
        occtPromise = null;
        throw error;
      });
    }

    return occtPromise;
  }

  async function readCad(file, extension) {
    var occt = await getOcct();
    var buffer = await file.arrayBuffer();

    /* Laisser le message de chargement devenir visible. */
    await new Promise(function (resolve) {
      window.setTimeout(resolve, 50);
    });


    var isIges = extension === 'igs' || extension === 'iges';

var reader = isIges
  ? occt.ReadIgesFile
  : occt.ReadStepFile;

var formatName = isIges ? 'IGES' : 'STEP';

if (typeof reader !== 'function') {
  throw new Error(
    'Fonction de lecture ' + formatName + ' indisponible.'
  );
}

var result = reader.call(
  occt,
  new Uint8Array(buffer),
  {
    linearUnit: 'millimeter'
  }
);

if (
  !result ||
  !result.success ||
  !result.meshes ||
  !result.meshes.length
) {
  throw new Error(
    'La lecture ' + formatName + ' n’a produit aucun maillage.'
  );
}

    var scene = new window.JSC3D.Scene(file.name);

    /*
 * Contrat d'import CAO :
 * coordonnées de sortie demandées en millimètres.
 * À vérifier sur une pièce de dimensions connues.
 */
     scene.hb3dLinearUnit = 'mm';
     scene.hb3dUnitSource = 'occt-output';

    result.meshes.forEach(function (source, index) {
      var positions = source.attributes &&
        source.attributes.position &&
        source.attributes.position.array;

      var indices = source.index && source.index.array;

      if (
        !positions ||
        !indices ||
        positions.length < 9 ||
        indices.length < 3 ||
        positions.length % 3 !== 0 ||
        indices.length % 3 !== 0
      ) {
        throw new Error(
         'Maillage ' + formatName + ' vide ou incomplet.'
         );
      }

      var mesh = new window.JSC3D.Mesh(
        source.name || 'STEP-' + (index + 1)
      );

      mesh.vertexBuffer = Array.from(positions);
      mesh.indexBuffer = [];

      for (var i = 0; i < indices.length; i += 3) {
        mesh.indexBuffer.push(
          indices[i],
          indices[i + 1],
          indices[i + 2],
          -1
        );
      }

      scene.addChild(mesh);
    });

    scene.init();
    return scene;
  }

  function readMesh(file, extension) {
    return new Promise(function (resolve, reject) {
      var Loader = extension === 'stl'
        ? window.JSC3D.StlLoader
        : window.JSC3D.ObjLoader;

      if (typeof Loader !== 'function') {
        reject(new Error('Loader STL / OBJ indisponible.'));
        return;
      }

      var completed = false;
      var timer;

      function finish(error, scene) {
        if (completed) return;

        completed = true;
        window.clearTimeout(timer);

        if (error) reject(error);
        else resolve(scene);
      }

      try {
        var loader = new Loader();

        loader.onload = function (scene) {
          finish(null, scene);
        };

        loader.onerror = function (error) {
          finish(
            error || new Error('Lecture STL / OBJ impossible.')
          );
        };

        timer = window.setTimeout(function () {
          finish(new Error('Délai de chargement dépassé.'));
        }, 60000);

        loader.loadFromUrl(file);
      } catch (error) {
        finish(error);
      }
    });
  }

  function getScene(file, extension) {
    var pending = scenes.get(file);

    if (!pending) {
      pending = Promise.resolve().then(function () {
         var isCad = /^(step|stp|igs|iges)$/.test(extension);

         return isCad
         ? readCad(file, extension)
         : readMesh(file, extension);
         }).then(function (scene) {
        
          var children = scene &&
          typeof scene.getChildren === 'function'
          ? scene.getChildren()
          : [];

        var hasGeometry = children.some(function (mesh) {
          return mesh.vertexBuffer &&
            mesh.vertexBuffer.length >= 9 &&
            mesh.indexBuffer &&
            mesh.indexBuffer.length >= 3;
        });

        if (!hasGeometry) {
          throw new Error('Aucune géométrie exploitable.');
        }

        return scene;
      }).catch(function (error) {
        scenes.delete(file);
        throw error;
      });

      scenes.set(file, pending);
    }

    return pending;
  }

  /* HB3D — vue globale du lot. */
var lotState = null;
var lotFiles = [];
var lotRevision = 0;
var lotEntries = [];
var lotOwners = new WeakMap();
var lotPickingReady = false;
var lotSceneActive = false;

/* Vue globale et vue individuelle. */
var lotGlobalScene = null;
var lotViewMode = 'lot';
var isolatedEntry = null;
var isolatedViews = new WeakMap();
var globalView = null;
var viewButtonsReady = false;
/* Outil de navigation sélectionné. */
var previewNavigationMode = 'orbit';
/* Priorité temporaire aux raccourcis souris natifs. */
var previewQuickNavigation = false;
var previewQuickNavigationReady = false;

function savePreviewCamera() {
  var viewer = window.hb3dRaccordementViewer;
  var reference = Math.max(
    1,
    Math.min(viewer.frameWidth, viewer.frameHeight)
  );

  return {
    rotation: Object.assign({}, viewer.rotMatrix),
    zoom: viewer.zoomFactor / reference,
    panX: viewer.panning[0] / reference,
    panY: viewer.panning[1] / reference
  };
}

function restorePreviewCamera(camera) {
  if (!camera) return;

  var viewer = window.hb3dRaccordementViewer;
  var reference = Math.max(
    1,
    Math.min(viewer.frameWidth, viewer.frameHeight)
  );

  Object.assign(viewer.rotMatrix, camera.rotation);

  viewer.zoomFactor = camera.zoom * reference;
  viewer.panning[0] = camera.panX * reference;
  viewer.panning[1] = camera.panY * reference;
}

function rememberPreviewCamera() {
  if (!lotSceneActive) return;

  if (lotViewMode === 'piece' && isolatedEntry) {
    isolatedViews.set(
      isolatedEntry.file,
      savePreviewCamera()
    );
  } else if (lotViewMode === 'lot') {
    globalView = savePreviewCamera();
  }
}

/* Vues prédéfinies : orientation uniquement.
   Convention du modèle : Y vertical, sol dans le plan XZ. */
function syncPreviewOrientationButtons() {
  var buttons = document.querySelectorAll(
    '.viewer-views button[data-view]'
  );

  buttons.forEach(function (button) {
    button.disabled = !lotSceneActive;

    /* Ne raccorder chaque bouton qu'une seule fois. */
    if (button.dataset.hb3dOrientationReady === 'true') {
      return;
    }

    button.dataset.hb3dOrientationReady = 'true';

    button.addEventListener('click', function () {
      var viewer = window.hb3dRaccordementViewer;

      if (
        !lotSceneActive ||
        !viewer ||
        !viewer.rotMatrix
      ) {
        return;
      }

      var view = button.dataset.view;

      if (
        view !== 'plan' &&
        view !== 'face' &&
        view !== 'iso'
      ) {
        return;
      }

            viewer.rotMatrix.identity();

      if (view === 'face') {
        viewer.rotMatrix.rotateAboutXAxis(-90);

      } else if (view === 'iso') {
        /* Partir de la même orientation que la vue Face. */
        viewer.rotMatrix.rotateAboutXAxis(-90);

        /* Tourner vers un trois-quarts avant. */
        viewer.rotMatrix.rotateAboutYAxis(45);

        /* Incliner légèrement pour voir le dessus. */
        viewer.rotMatrix.rotateAboutXAxis(35.26438968);
      }

      /* Plan : la matrice identité suffit. */
      viewer.update();

    });
  });
}

/* Appliquer l'outil au viewer existant. */
function applyPreviewNavigationMode() {
  var viewer = window.hb3dRaccordementViewer;
  var canvas = document.getElementById('cv');

  if (!viewer || !canvas) return;

    var usages = {
    orbit: 'default',
    pan: 'pan',
    zoom: 'zoom'
  };

  var usage = usages[previewNavigationMode] || 'default';

  /* Selon la version de JSC3D chargée. */
  if (typeof viewer.setMouseUsage === 'function') {
    viewer.setMouseUsage(usage);
  } else {
    viewer.mouseUsage = usage;
  }

  canvas.style.cursor =
    previewNavigationMode === 'pan'
      ? 'move'
      : previewNavigationMode === 'zoom'
        ? 'ns-resize'
        : 'grab';
}

/* Donner la priorité à Ctrl / Shift sans modifier le bouton actif. */
function connectPreviewQuickNavigation() {
  if (previewQuickNavigationReady) return;

  var canvas = document.getElementById('cv');
  if (!canvas) return;

  previewQuickNavigationReady = true;

  var mouseInside = false;
  var mouseDragging = false;

  function setQuickNavigation(enabled) {
    enabled = Boolean(enabled && lotSceneActive);

    if (previewQuickNavigation === enabled) return;

    previewQuickNavigation = enabled;
    applyPreviewNavigationMode();
  }

  function updateFromMouse(event) {
    setQuickNavigation(event.ctrlKey || event.shiftKey);
  }

  function resetQuickNavigation() {
    mouseInside = false;
    mouseDragging = false;
    setQuickNavigation(false);
  }

  canvas.addEventListener('mouseenter', function (event) {
    mouseInside = true;
    updateFromMouse(event);
  });

  canvas.addEventListener('mouseleave', function () {
    mouseInside = false;

    if (!mouseDragging) {
      setQuickNavigation(false);
    }
  });

  /* Choisir le mode avant le traitement souris du viewer. */
  canvas.addEventListener('mousedown', function (event) {
    if (!lotSceneActive) return;

    mouseInside = true;
    mouseDragging = true;
    updateFromMouse(event);
  }, true);

  /* Actualiser aussi si une touche change pendant le geste. */
  window.addEventListener('mousemove', function (event) {
    if (!mouseInside && !mouseDragging) return;

    updateFromMouse(event);
  }, true);

  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Control' && event.key !== 'Shift') {
      return;
    }

    if (!mouseInside && !mouseDragging) return;

    setQuickNavigation(event.ctrlKey || event.shiftKey);
  }, true);

  window.addEventListener('keyup', function (event) {
    if (event.key !== 'Control' && event.key !== 'Shift') {
      return;
    }

    if (!mouseInside && !mouseDragging) return;

    setQuickNavigation(event.ctrlKey || event.shiftKey);
  }, true);

  window.addEventListener('mouseup', function (event) {
    if (!mouseDragging) return;
    if (event.buttons !== 0) return;

    mouseDragging = false;

    var rect = canvas.getBoundingClientRect();

    mouseInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    setQuickNavigation(
      mouseInside && (event.ctrlKey || event.shiftKey)
    );
  });

  window.addEventListener('blur', resetQuickNavigation);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      resetQuickNavigation();
    }
  });
}

/* Raccorder et actualiser les boutons de navigation. */
function syncPreviewNavigationButtons() {
  connectPreviewQuickNavigation();

  var buttons = document.querySelectorAll(
    '.viewer-navigation button[data-navigation]'
  );

  buttons.forEach(function (button) {
    var mode = button.dataset.navigation;

    button.disabled = !lotSceneActive;

    button.setAttribute(
      'aria-pressed',
      String(mode === previewNavigationMode)
    );

    if (button.dataset.hb3dNavigationReady === 'true') {
      return;
    }

    button.dataset.hb3dNavigationReady = 'true';

    button.addEventListener('click', function () {
      if (!lotSceneActive) return;

      var nextMode = button.dataset.navigation;

      if (
        nextMode !== 'orbit' &&
        nextMode !== 'pan' &&
        nextMode !== 'zoom'
      ) {
        return;
      }

      previewNavigationMode = nextMode;

      applyPreviewNavigationMode();
      syncPreviewNavigationButtons();
    });
  });

  /* Réappliquer aussi après un changement Lot / Pièce. */
  if (lotSceneActive) {
    applyPreviewNavigationMode();
  }
}

function updatePreviewViewButtons() {
  var lotButton = document.getElementById('hb3d-view-lot');
  var pieceButton = document.getElementById('hb3d-view-piece');

  var activeEntry = lotState && lotEntries.find(function (entry) {
    return entry.file === lotState.activeFile;
  });

  if (lotButton) {
    lotButton.disabled = !lotSceneActive;

    lotButton.setAttribute(
      'aria-pressed',
      String(lotViewMode === 'lot')
    );
  }

  if (pieceButton) {
    pieceButton.disabled = !lotSceneActive || !activeEntry;

    pieceButton.setAttribute(
      'aria-pressed',
      String(lotViewMode === 'piece')
    );
  }

  /* Activer et raccorder Plan / Face / Iso. */
  syncPreviewOrientationButtons();

  /* Activer et raccorder Orbite / Pan / Zoom. */
  syncPreviewNavigationButtons();
}

function updatePreviewViewNote() {
  if (!lotSceneActive || !lotState) return;

  var activePiece = lotState.pieces.find(function (p) {
    return p.file === lotState.activeFile;
  });

  var text = lotViewMode === 'piece'
    ? 'Vue individuelle : ' +
      (activePiece ? activePiece.name : '')
    : 'Vue globale : ' + lotEntries.length +
      ' fichier(s) affiché(s) · cliquez sur une pièce';

  var missing = lotState.pieces.length - lotEntries.length;

  if (missing > 0) {
    text += ' · ' + missing + ' aperçu(s) indisponible(s)';
  }

  text += ' · aucune validation technique';

  setNote(text);

  var status = document.getElementById('hb3d-viewer-status');
  if (status) status.textContent = text;
}

function showPreviewView(mode) {
  if (!lotSceneActive || !lotGlobalScene) return;

  var viewer = window.hb3dRaccordementViewer;
  var target = lotEntries.find(function (entry) {
    return entry.file === lotState.activeFile;
  });

  if (mode === 'piece' && !target) return;

  if (
    mode === lotViewMode &&
    (
      mode === 'lot' ||
      (isolatedEntry && isolatedEntry.file === target.file)
    )
  ) {
    applyLotAppearance();
    updatePreviewViewButtons();
    updatePreviewViewNote();
    return;
  }

  rememberPreviewCamera();

  if (mode === 'piece') {
    var scene = new window.JSC3D.Scene('hb3d-piece');
    var meshes = target.meshes.map(function (source) {
      var mesh = copyLotMesh(source);
      scene.addChild(mesh);
      lotOwners.set(mesh, target.file);
      return mesh;
    });

    isolatedEntry = {
      file: target.file,
      meshes: meshes,
      color: null
    };

    lotViewMode = 'piece';

    viewer.replaceScene(scene);
    viewer.enableDefaultInputHandler(true);

    restorePreviewCamera(
      isolatedViews.get(target.file)
    );
  } else {
    lotViewMode = 'lot';
    isolatedEntry = null;

    viewer.replaceScene(lotGlobalScene);
    viewer.enableDefaultInputHandler(true);

    restorePreviewCamera(globalView);
  }

  applyLotAppearance();
  updatePreviewViewButtons();
  updatePreviewViewNote();
}

function connectPreviewViewButtons() {
  if (viewButtonsReady) return;

  var lotButton = document.getElementById('hb3d-view-lot');
  var pieceButton = document.getElementById('hb3d-view-piece');

  if (!lotButton || !pieceButton) return;

  viewButtonsReady = true;

  lotButton.addEventListener('click', function () {
    showPreviewView('lot');
  });

  pieceButton.addEventListener('click', function () {
    showPreviewView('piece');
  });
}

var lotColors = {
  Blanc: '#ffffff',
  Noir: '#252932',
  Gris: '#919ba7',
  Vert: '#1fb967',
  Bleu: '#2878d0',
  Rose: '#db4588',
  Rouge: '#fa0606',
  Jaune: '#f1cc35'
};

function sameLotFiles(files) {
  return files.length === lotFiles.length &&
    files.every(function (file, index) {
      return file === lotFiles[index];
    });
}

/*
 * Grille d'affichage uniquement.
 * Plan XZ, juste sous le point le plus bas sur l'axe Y.
 * Aucun ajout aux scènes sources ni aux données de prix.
 */
function addPreviewGrid(scene) {
  var children = scene.getChildren();

  var minX = Infinity;
  var minY = Infinity;
  var minZ = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  var maxZ = -Infinity;

  children.forEach(function (mesh) {
    if (mesh.hb3dDisplayGrid) return;

    var vertices = mesh.vertexBuffer || [];

    for (var i = 0; i < vertices.length; i += 3) {
      var x = vertices[i];
      var y = vertices[i + 1];
      var z = vertices[i + 2];

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
      ) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);

      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  });

  if (!Number.isFinite(minX)) return;

  var reference = Math.max(
    maxX - minX,
    maxY - minY,
    maxZ - minZ
  );

  if (!(reference > 0)) return;

  var margin = reference * 0.08;
  var step = reference / 12;
  var thickness = reference * 0.001;

  var left = minX - margin;
  var right = maxX + margin;
  var back = minZ - margin;
  var front = maxZ + margin;

  var groundY = minY - reference * 0.003;

  var grid = new window.JSC3D.Mesh('hb3d-display-grid');

  grid.hb3dDisplayGrid = true;
  grid.vertexBuffer = [];
  grid.indexBuffer = [];
  grid.isDoubleSided = true;

  function rectangle(x1, z1, x2, z2) {
    var index = grid.vertexBuffer.length / 3;

    grid.vertexBuffer.push(
      x1, groundY, z1,
      x2, groundY, z1,
      x2, groundY, z2,
      x1, groundY, z2
    );

    grid.indexBuffer.push(
      index, index + 1, index + 2, -1,
      index, index + 2, index + 3, -1
    );
  }

  for (var x = left; x <= right; x += step) {
    rectangle(
      x,
      back,
      Math.min(x + thickness, right),
      front
    );
  }

  for (var z = back; z <= front; z += step) {
    rectangle(
      left,
      z,
      right,
      Math.min(z + thickness, front)
    );
  }

  grid.setMaterial(
    new window.JSC3D.Material(
      'hb3d-grid-material',
      0,
      0x8190a3,
      0,
      false
    )
  );

  grid.setRenderMode('flat');

  scene.addChild(grid);
}

/* Les copies d'affichage ne modifient pas les scènes sources. */
function copyLotMesh(source) {
  var mesh = new window.JSC3D.Mesh(source.name);

  mesh.vertexBuffer = Array.from(source.vertexBuffer);
  mesh.indexBuffer = Array.from(source.indexBuffer);
  mesh.creaseAngle = 35;
  mesh.isDoubleSided = source.isDoubleSided;

  return mesh;
}

function applyLotAppearance() {
  if (!lotSceneActive || !lotState) return;

  var viewer = window.hb3dRaccordementViewer;
  if (!viewer) return;

  var selectedMode = document.querySelector(
    '.viewer-modes button[data-mode][aria-pressed="true"]'
  );

  var modes = {
    smooth: 'smooth',
    wire: 'wireframe',
    point: 'point'
  };

  var mode = modes[
    selectedMode
      ? selectedMode.getAttribute('data-mode')
      : 'smooth'
  ] || 'smooth';

  var appearanceEntries = isolatedEntry
  ? lotEntries.concat([isolatedEntry])
  : lotEntries;

  appearanceEntries.forEach(function (entry) {

    var piece = lotState.pieces.find(function (p) {
      return p.file === entry.file;
    });

    if (!piece) return;

    if (entry.color !== piece.color) {
      var hex = lotColors[piece.color] || lotColors.Gris;

      var material = new window.JSC3D.Material(
        'hb3d-lot-' + piece.color,
        0,
        parseInt(hex.slice(1), 16),
        0,
        false
      );

      entry.meshes.forEach(function (mesh) {
        mesh.setMaterial(material);
      });

      entry.color = piece.color;
    }

    entry.meshes.forEach(function (mesh) {
      mesh.setRenderMode(mode);
    });
  });

  viewer.setRenderMode(mode);
  viewer.update();
}

function connectLotPicking() {
  if (lotPickingReady) return;

  var canvas = document.getElementById('cv');
  if (!canvas) return;

  lotPickingReady = true;

  var start = null;
  var gestureMoved = false;
  var pointers = new Set();

  canvas.addEventListener('pointerdown', function (event) {
    pointers.add(event.pointerId);

    if (pointers.size > 1) {
      gestureMoved = true;
      return;
    }

    if (event.button !== 0) return;

    start = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };

    gestureMoved = false;
  });

  window.addEventListener('pointermove', function (event) {
    if (!start || event.pointerId !== start.id) return;

    if (
      Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      ) > 5
    ) {
      gestureMoved = true;
    }
  });

  window.addEventListener('pointerup', function (event) {
    pointers.delete(event.pointerId);

    if (!start || event.pointerId !== start.id) return;

    var wasClick = !gestureMoved &&
      Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      ) <= 5;

    start = null;

    if (!wasClick || !lotSceneActive) return;

    var rect = canvas.getBoundingClientRect();

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) return;

    var viewer = window.hb3dRaccordementViewer;
    var info = viewer.pick(event.clientX, event.clientY);

    var file = info && info.mesh
      ? lotOwners.get(info.mesh)
      : null;

    if (
      file &&
      typeof window.hb3dSelectPreviewFile === 'function'
    ) {
      window.hb3dSelectPreviewFile(file);
    }
  });

  window.addEventListener('pointercancel', function (event) {
    pointers.delete(event.pointerId);
    start = null;
    gestureMoved = true;
  });

  window.addEventListener('blur', function () {
    pointers.clear();
    start = null;
  });
}

/*
 * Permet au gestionnaire existant des modes d'affichage
 * d'actualiser le lot sans lui appliquer une couleur unique.
 */
window.hb3dApplyLotAppearance = function () {
  if (!lotState) return false;

  applyLotAppearance();
  return true;
};

window.hb3dSyncPreviewLot = function (state) {
  var viewer = window.hb3dRaccordementViewer;

  if (!viewer || !window.JSC3D) return;

  lotState = state;
  connectLotPicking();
  connectPreviewViewButtons();

  var files = state.pieces.map(function (p) {
    return p.file;
  }).filter(Boolean);

  /* Une sélection ou une couleur ne reconstruit pas la scène. */
  if (sameLotFiles(files)) {
  if (lotViewMode === 'piece' && lotSceneActive) {
    showPreviewView('piece');
  } else {
    applyLotAppearance();
    updatePreviewViewButtons();
    updatePreviewViewNote();
  }

  return;
}

  lotFiles = files.slice();

  var revision = ++lotRevision;

    var lotLoadingPlaceholder = document.getElementById(
    'hb3d-viewer-placeholder'
  );

  /* Réinitialiser l’indicateur du chargement précédent,
     y compris lorsque le nouveau lot est vide. */
  if (lotLoadingPlaceholder) {
    lotLoadingPlaceholder.classList.remove(
      'hb3d-preview-loading'
    );
    lotLoadingPlaceholder.removeAttribute('aria-busy');
  }

  /* Annuler aussi l'affichage d'un ancien aperçu individuel. */
  requestId++;
  requestedFile = null;
  lotSceneActive = false;
  lotEntries = [];
  lotOwners = new WeakMap();

  lotGlobalScene = null;
  lotViewMode = 'lot';
  isolatedEntry = null;
  isolatedViews = new WeakMap();
  globalView = null;

  updatePreviewViewButtons();
  clearScene(viewer);

  if (!files.length) {
    showMessage(
      'Aucune pièce à afficher',
      'Ajoutez un fichier STL, OBJ, STEP, STP, IGS ou IGES.'
    );

    setNote('Aperçu local · aucun modèle chargé');
    return;
  }

    showMessage(
    'Préparation de votre aperçu 3D',
    'Chargement et préparation de ' +
      files.length +
      ' fichier(s). Merci de patienter.'
  );

  if (lotLoadingPlaceholder) {
    lotLoadingPlaceholder.classList.add(
      'hb3d-preview-loading'
    );
    lotLoadingPlaceholder.setAttribute('aria-busy', 'true');
  }

  setNote('Vue globale · chargement en cours');

  /*
   * Charger séquentiellement les fichiers :
   * réutiliser les scènes déjà présentes dans le cache.
   */
  (async function () {
    var loaded = [];
    var failures = [];

    for (var i = 0; i < files.length; i++) {
      if (revision !== lotRevision) return;

      var file = files[i];
      var extension = file.name.split('.').pop().toLowerCase();

      try {
         var sourceScene = await getScene(file, extension);

if (revision !== lotRevision) return;

/*
 * Préparer les dimensions avant de disposer
 * les pièces dans la scène globale.
 */
sourceScene.init();

var box = sourceScene.aabb;

if (
  !box ||
  ![
    box.minX, box.minY, box.minZ,
    box.maxX, box.maxY, box.maxZ
  ].every(Number.isFinite) ||
  box.maxX < box.minX ||
  box.maxY < box.minY ||
  box.maxZ < box.minZ
) {
  throw new Error(
    'Dimensions du modèle absentes ou invalides : ' +
    file.name
  );
}

publishSourceGeometry(file, sourceScene);

loaded.push({
  file: file,
  scene: sourceScene
});
      } catch (error) {
        if (revision !== lotRevision) return;

        failures.push(file.name);
        console.error('[HB3D Lot]', file.name, error);
      }
    }

    if (!loaded.length) {
      throw new Error('Aucun fichier du lot ne peut être affiché.');
    }

    var scene = new window.JSC3D.Scene('hb3d-lot');
    var entries = [];
    var owners = new WeakMap();

    var largestSize = loaded.reduce(function (largest, item) {
      var box = item.scene.aabb;

      return Math.max(
        largest,
        box.maxX - box.minX,
        box.maxY - box.minY,
        box.maxZ - box.minZ
      );
    }, 0);

    var gap = Math.max(largestSize * 0.15, 0.001);
    var cursor = 0;

    loaded.forEach(function (item) {
      var box = item.scene.aabb;
      var width = box.maxX - box.minX;

      var dx = cursor - box.minX;
      var dy = -(box.minY + box.maxY) / 2;
      var dz = -(box.minZ + box.maxZ) / 2;

      var meshes = [];

      item.scene.getChildren().forEach(function (source) {
        if (
          !source.vertexBuffer ||
          !source.indexBuffer ||
          source.vertexBuffer.length < 9 ||
          source.indexBuffer.length < 3
        ) return;

        var mesh = copyLotMesh(source);

        for (var j = 0; j < mesh.vertexBuffer.length; j += 3) {
          mesh.vertexBuffer[j] += dx;
          mesh.vertexBuffer[j + 1] += dy;
          mesh.vertexBuffer[j + 2] += dz;
        }

        scene.addChild(mesh);
        meshes.push(mesh);
        owners.set(mesh, item.file);
      });

      entries.push({
        file: item.file,
        meshes: meshes,
        color: null
      });

      cursor += width + gap;
    });

    if (revision !== lotRevision) return;

    lotGlobalScene = scene;
    lotViewMode = 'lot';
    isolatedEntry = null;

    viewer.replaceScene(scene);
    viewer.enableDefaultInputHandler(true);

    lotEntries = entries;
    lotOwners = owners;
    lotSceneActive = true;

    applyLotAppearance();
    updatePreviewViewButtons();

    var placeholder = document.getElementById(
      'hb3d-viewer-placeholder'
    );

    var status = document.getElementById(
      'hb3d-viewer-status'
    );

        if (placeholder) {
      placeholder.classList.remove('hb3d-preview-loading');
      placeholder.removeAttribute('aria-busy');
      placeholder.hidden = true;
    }

    var message =
      'Vue globale : ' + loaded.length + ' fichier(s) affiché(s).';

    if (failures.length) {
      message += ' Aperçu indisponible : ' +
        failures.join(', ') + '.';
    }

    if (status) status.textContent = message;

    setNote(
      message +
      ' Cliquez sur une pièce pour la configurer' +
      ' · aucune validation technique'
    );
    
    updatePreviewViewNote();

    }()).catch(function (error) {
    if (revision !== lotRevision) return;

    if (lotLoadingPlaceholder) {
      lotLoadingPlaceholder.classList.remove(
        'hb3d-preview-loading'
      );
      lotLoadingPlaceholder.removeAttribute('aria-busy');
    }

    lotSceneActive = false;

    showMessage(
      'Aperçu du lot indisponible',
      'Consultez la console du navigateur.'
    );

    setNote('Aperçu indisponible · aucune validation technique');

    /* Autoriser une nouvelle tentative au prochain rendu. */
    lotFiles = [];

    console.error('[HB3D Lot]', error);
  });
};

  window.hb3dLoadPreview = async function (file) {
    console.log(
      '[HB3D TEST] Passage dans hb3dLoadPreview',
      file && file.name
    );

    var viewer = window.hb3dRaccordementViewer;

    if (!viewer || !file || !window.JSC3D) return;
    if (requestedFile === file) return;

    requestedFile = file;

    var currentRequest = ++requestId;
    var extension = file.name.split('.').pop().toLowerCase();

    try {
      clearScene(viewer);

      if (!/^(stl|obj|step|stp|igs|iges)$/.test(extension)) {
        throw new Error('Format d’aperçu non pris en charge.');
      }

      showMessage(
        'Chargement de la pièce',
        file.name + ' — préparation de l’aperçu local.'
      );

            setNote('Aperçu local · chargement en cours');

      var loadingPlaceholder = document.getElementById(
        'hb3d-viewer-placeholder'
      );

      if (loadingPlaceholder) {
        loadingPlaceholder.classList.add('hb3d-preview-loading');
        loadingPlaceholder.setAttribute('aria-busy', 'true');
      }

      var scene = await getScene(file, extension);

      /* Ne jamais afficher le résultat d’une ancienne sélection. */
      if (currentRequest !== requestId) return;

      viewer.replaceScene(scene);
      viewer.enableDefaultInputHandler(true);

      if (
        typeof window.hb3dSyncViewerAppearance === 'function'
      ) {
        window.hb3dSyncViewerAppearance();
      }

      viewer.update();

      var placeholder = document.getElementById(
        'hb3d-viewer-placeholder'
      );
      var status = document.getElementById('hb3d-viewer-status');

      if (placeholder) placeholder.hidden = true;

      if (status) {
        status.textContent = 'Pièce affichée : ' + file.name;
      }

      setNote(
        'Aperçu local · déplacement, rotation et zoom · ' +
        'aucune validation technique'
      );
    } catch (error) {
      if (currentRequest !== requestId) return;

      requestedFile = null;

      try {
        clearScene(viewer);
      } catch (clearError) {
        console.error('[HB3D Import] Nettoyage :', clearError);
      }

      showMessage(
        'Impossible d’afficher cette pièce',
        file.name + ' — consultez la console.'
      );

      setNote('Aperçu indisponible · aucune validation technique');

            console.error('[HB3D Import]', file.name, error);
    } finally {
      /* Une ancienne requête ne doit pas arrêter
         l’indicateur d’une sélection plus récente. */
      if (currentRequest === requestId) {
        var loadingPlaceholder = document.getElementById(
          'hb3d-viewer-placeholder'
        );

        if (loadingPlaceholder) {
          loadingPlaceholder.classList.remove(
            'hb3d-preview-loading'
          );

          loadingPlaceholder.removeAttribute('aria-busy');
        }
      }
    }
  };

  console.info(
  '[HB3D Raccordement] Aperçus STL / OBJ / STEP / STP / IGS / IGES disponibles.'
  );
}());

(function () {
  'use strict';

  var colors = {
    Blanc: '#ffffff',
    Noir: '#252932',
    Gris: '#919ba7',
    Vert: '#1fb967',
    Bleu: '#2878d0',
    Rose: '#db4588',
    Rouge: '#fa0606',
    Jaune: '#f1cc35'
  };

    window.hb3dSyncViewerAppearance = function () {
    if (
    typeof window.hb3dApplyLotAppearance === 'function' &&
    window.hb3dApplyLotAppearance()
    ) {
    return;
    }

  var viewer = window.hb3dRaccordementViewer;

    if (!viewer || !window.JSC3D) return;

    var scene = typeof viewer.getScene === 'function'
      ? viewer.getScene()
      : viewer.scene;

    if (!scene || typeof scene.getChildren !== 'function') {
      return;
    }

    var meshes = scene.getChildren();

    if (!meshes.length) return;

    /* Lire la couleur de la configuration active. */
    var colorField = document.getElementById('color');
    var colorName = colorField ? colorField.value : 'Gris';
    var hex = colors[colorName] || colors.Gris;
    var rgb = parseInt(hex.slice(1), 16);

    /* Le HTML utilise "wire", le moteur utilise "wireframe". */
    var selectedMode = document.querySelector(
      '.viewer-modes button[data-mode][aria-pressed="true"]'
    );

    var requestedMode = selectedMode
    ? selectedMode.getAttribute('data-mode')
    : 'smooth';

    var modes = {
    smooth: 'smooth',
    wire: 'wireframe',
    point: 'point'
    };

    var mode = modes[requestedMode] || 'smooth';

    try {
      var material = new window.JSC3D.Material(
        'hb3d-preview-' + colorName,
        0,
        rgb,
        0,
        false
      );

      meshes.forEach(function (mesh) {
        if (typeof mesh.setMaterial === 'function') {
          mesh.setMaterial(material);
        }

        if (typeof mesh.setRenderMode === 'function') {
          mesh.setRenderMode(mode);
        }
      });

            viewer.setRenderMode(mode);
      viewer.update();

    } catch (error) {
      console.error(
        '[HB3D Apparence] Mise à jour impossible.',
        error
      );
    }
  };

  function connectModeButtons() {
    document.querySelectorAll(
      '.viewer-modes button[data-mode]'
    ).forEach(function (button) {
      button.addEventListener('click', function () {
        /*
         * Laisser le gestionnaire de la maquette actualiser
         * aria-pressed avant de lire le mode sélectionné.
         */
        window.setTimeout(function () {
          window.hb3dSyncViewerAppearance();
        }, 0);
      });
    });
  }


  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      connectModeButtons
    );
  } else {
    connectModeButtons();
  }

}());