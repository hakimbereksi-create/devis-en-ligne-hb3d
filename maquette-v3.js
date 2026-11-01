/* Maquette autonome 03 — aucun réseau, stockage ni calcul métier. */
(function () {
  'use strict';
  function init() {
    if (document.body.dataset.mockReady) return;
    document.body.dataset.mockReady = 'true';
    var byId = function (id) { return document.getElementById(id); };
    
    var money = function (value) {
  if (!Number.isFinite(value)) {
    return 'Estimation indisponible';
  }

  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  });
};

function piece(name) {
  return {
    name: name,
    tech: 'FDM',
    material: 'PLA',
    color: 'Gris',
    quantity: 1,
    finish: 'Standard',
    geometry: null,
    unit: null
  };
}

    var pieces = [];
    /* Matériaux déjà présents dans les tarifs HB3D. */
var MATERIALS_BY_TECH = {
  FDM: [
    'PLA',
    'ABS',
    'PET',
    'PETG',
    'ASA',
    'TPU',
    'PA-CF',
    'HIPS'
  ],

  SLA: [
    'Résine Standard',
    'Résine Tough',
    'Résine Calcinable',
    'Résine Flexible'
  ]
};

var SLA_COLORS = [
  'Blanc',
  'Gris',
  'Noir'
];

function isColorAllowed(tech, color) {
  return tech !== 'SLA' ||
    SLA_COLORS.indexOf(color) !== -1;
}

    var TARIFS = {
  FDM: {
    PLA:     { A: 12.99, B: 0.224 },
    PETG:    { A: 14.50, B: 0.245 },
    ABS:     { A: 15.50, B: 0.255 },
    ASA:     { A: 16.50, B: 0.270 },
    TPU:     { A: 18.50, B: 0.295 },
    'PA-CF': { A: 23.00, B: 0.345 },
    HIPS:    { A: 14.20, B: 0.238 },
    PET:     { A: 14.00, B: 0.235 }
  },

  SLA: {
    'Résine Standard':   { A: 19.44, B: 0.467 },
    'Résine Tough':      { A: 24.00, B: 0.560 },
    'Résine Flexible':   { A: 26.00, B: 0.620 },
    'Résine Calcinable': { A: 29.00, B: 0.700 }
  }
};

function getDiscountRate(quantity) {
  if (quantity >= 500) return 0.40;
  if (quantity >= 400) return 0.35;
  if (quantity >= 300) return 0.30;
  if (quantity >= 200) return 0.25;
  if (quantity >= 100) return 0.20;
  if (quantity >= 50) return 0.15;
  if (quantity >= 20) return 0.10;
  if (quantity >= 10) return 0.05;
  return 0;
}

/*
 * STL / OBJ : convention existante, coordonnées en mm.
 * STEP / IGES : sortie OCCT explicitement demandée en mm.
 * Aucune validation automatique de fermeture du maillage.
 */
function getVolumeCm3(p) {
  if (!p.file) return null;

  var geometry = p.geometry;

  if (
    !geometry ||
    geometry.status !== 'estimated' ||
    !Number.isFinite(geometry.volumeModelUnits3) ||
    geometry.volumeModelUnits3 <= 0
  ) {
    return null;
  }

  var isMesh = /\.(stl|obj)$/i.test(p.file.name);
  var isCad = /\.(step|stp|igs|iges)$/i.test(p.file.name);

  var cadOutputInMm =
    isCad &&
    geometry.linearUnit === 'mm' &&
    geometry.unitStatus === 'specified-output' &&
    geometry.unitSource === 'occt-output';

  if (!isMesh && !cadOutputInMm) {
    return null;
  }

  return geometry.volumeModelUnits3 / 1000;
}

function calculateLot() {
  var gross = 0;
  var quantity = 0;
  var complete = pieces.length > 0;

  pieces.forEach(function (p) {
    var validQuantity =
      Number.isInteger(p.quantity) &&
      p.quantity >= 1;

    if (validQuantity) {
      quantity += p.quantity;
    } else {
      complete = false;
    }

    var volumeCm3 = getVolumeCm3(p);
    var technology = TARIFS[p.tech];
    var tariff = technology && technology[p.material];

    p.unit = null;

    if (
      !validQuantity ||
      volumeCm3 === null ||
      !tariff
    ) {
      complete = false;
      return;
    }

    p.unit = tariff.A + tariff.B * volumeCm3;
    gross += p.unit * p.quantity;
  });

    var rate = getDiscountRate(quantity);

  var grossCents = complete
    ? Math.round((gross + Number.EPSILON) * 100)
    : null;

  var discountCents = complete
    ? Math.round(grossCents * rate)
    : null;

  var netCents = complete
    ? grossCents - discountCents
    : null;

  return {
    complete: complete,
    quantity: quantity,
    gross: complete ? grossCents / 100 : null,
    rate: rate,
    discount: complete ? discountCents / 100 : null,
    net: complete ? netCents / 100 : null
  };
}

function lineTotal(p) {
  return Number.isFinite(p.unit)
    ? p.unit * p.quantity
    : null;
}

/* Afficher la remise séparément des prix de ligne bruts. */
function renderPricingSummary(result) {
  var totalElement = byId('cart-total');
  if (!totalElement) return;

  var note = byId('hb3d-pricing-summary');

  if (!note) {
    note = document.createElement('p');
    note.id = 'hb3d-pricing-summary';
    note.setAttribute('aria-live', 'polite');

    totalElement.parentElement.insertAdjacentElement(
      'afterend',
      note
    );
  }

  var text;

  if (!pieces.length) {
    text = 'Ajoutez une pièce pour obtenir une estimation.';
  } else if (!result.complete) {
    text =
      'Total indisponible : au moins une pièce attend ' +
      'une analyse, un contrôle d’unité ou un tarif.';
  } else {
    text =
      'Sous-total : ' + money(result.gross) +
      ' · Quantité cumulée : ' + result.quantity +
      ' · Remise : ' +
      Math.round(result.rate * 100) + ' %';

    if (result.rate > 0) {
      text += ' (−' + money(result.discount) + ')';
    }

    text += ' · Lignes présentées avant remise.';
  }

  text +=
    ' TVA non applicable, art. 293 B du CGI.' +
    ' Estimation standard hors supplément de finition.' +
    ' Validation technique humaine requise.';

  note.replaceChildren();

function addSummaryLine(value) {
  var line = document.createElement('span');
  line.style.display = 'block';
  line.textContent = value;
  note.appendChild(line);
}

if (!pieces.length) {
  addSummaryLine('Ajoutez un fichier pour obtenir une estimation.');
} else if (!result.complete) {
  addSummaryLine(
    'Total indisponible : analyse, unité ou tarif à vérifier.'
  );
} else {
  addSummaryLine(
    'Qté totale : ' + result.quantity +
    ' · Sous-total : ' + money(result.gross)
  );

  addSummaryLine(
    result.rate > 0
      ? 'Remise lot : ' +
        Math.round(result.rate * 100) +
        ' % (−' + money(result.discount) + ')'
      : 'Remise lot : aucune'
  );
}

addSummaryLine('Lignes avant remise · Suppléments de finition non inclus.');
addSummaryLine('Estimation soumise à validation technique humaine.');
addSummaryLine('TVA non applicable, art. 293 B du CGI');
}
   
    /*
 * Résultats géométriques reçus du viewer.
 * L'association utilise le fichier d'origine, jamais son nom.
 */
window.hb3dReceiveGeometry = function (file, result) {
  var p = pieces.find(function (item) {
    return item.file === file;
  });

  /* Ignorer un résultat arrivé après le retrait du fichier. */
  if (!p) return;

  p.geometry = result;

  renderGeometryMetrics();

  /*
   * Actualiser les informations sans rappeler render()
   * pendant la réception des résultats géométriques.
   */
  renderCart();

  if (pieces[detail]) {
    renderDetail();
  }

  renderReview();
  renderImportProgress();

  console.info('[HB3D Géométrie]', p.name, result);
};

/* Lecture de contrôle, sans exposer le tableau interne. */
window.hb3dGetGeometryReport = function () {
  return pieces.map(function (p) {
    return {
      name: p.name,
      quantity: p.quantity,
      geometry: p.geometry || null
    };
  });
};

/*
 * Contexte destiné au chatbot.
 * Lecture uniquement : aucun changement du lot ou des calculs.
 */
/*
 * Contexte du lot destiné au chatbot.
 * Lecture uniquement : aucun changement des données métier.
 */
window.hb3dGetChatContext = function () {
  function readPieceContext(p, index) {
    var geometry = p.geometry || null;

    var dimensions = geometry
      ? geometry.dimensionsModelUnits
      : null;

    var hasDimensions = Boolean(
      dimensions &&
      [dimensions.x, dimensions.y, dimensions.z].every(
        function (value) {
          return Number.isFinite(value) && value >= 0;
        }
      )
    );

    var isMesh = Boolean(
      p.file &&
      /\.(stl|obj)$/i.test(p.file.name)
    );

    var cadOutputInMm = Boolean(
      p.file &&
      /\.(step|stp|igs|iges)$/i.test(p.file.name) &&
      geometry &&
      geometry.linearUnit === 'mm' &&
      geometry.unitStatus === 'specified-output' &&
      geometry.unitSource === 'occt-output'
    );

    var interpretedAsMm = isMesh || cadOutputInMm;

    return {
      position: index + 1,

      configuration: {
        technology: p.tech,
        material: p.material,
        color: p.color,
        quantity: p.quantity,
        finish: p.finish
      },

      geometry: {
        status: !geometry
          ? 'pending'
          : geometry.status === 'estimated'
            ? 'estimated'
            : 'unavailable',

        dimensions: hasDimensions
          ? {
              x: dimensions.x,
              y: dimensions.y,
              z: dimensions.z,
              unit: interpretedAsMm ? 'mm' : 'model-units'
            }
          : null,

        unitBasis: cadOutputInMm
          ? 'occt-output-mm'
          : isMesh
            ? 'mesh-assumed-mm'
            : 'unconfirmed',

        volumeCm3: getVolumeCm3(p),

        volumeScope: 'one-copy-of-this-piece',
        meshClosureValidated: false,
        technicalValidation: 'human-review-required'
      }
    };
  }

  var lotPieces = pieces.map(readPieceContext);

  var quantitiesValid = pieces.every(function (p) {
    return (
      Number.isInteger(p.quantity) &&
      p.quantity >= 1
    );
  });

  var totalQuantity = quantitiesValid
    ? pieces.reduce(function (sum, p) {
        return sum + p.quantity;
      }, 0)
    : null;

  return {
    version: 1,
    source: 'configuration-navigateur',

    fileCount: pieces.length,
    totalQuantity: totalQuantity,

    activePiece: pieces[active]
      ? readPieceContext(pieces[active], active)
      : null,

    pieces: lotPieces
  };
};

    /* Anti-doublon : lectures locales mises en cache. */
var duplicateBuffers = new WeakMap();
var importChecking = false;
var duplicateTimer = 0;

function hideDuplicateNotice() {
  window.clearTimeout(duplicateTimer);
  byId('hb3d-duplicate-notice').hidden = true;
}

byId('hb3d-duplicate-close').addEventListener(
  'click',
  hideDuplicateNotice
);

function showDuplicateNotice(messages) {
  var notice = byId('hb3d-duplicate-notice');

  window.clearTimeout(duplicateTimer);

  byId('hb3d-duplicate-text').textContent =
    messages.join('\n') +
    '\nAucun fichier ajouté. Pour plusieurs exemplaires, ' +
    'augmentez la quantité de la pièce.';

  notice.hidden = false;

  duplicateTimer = window.setTimeout(
    hideDuplicateNotice,
    7000
  );
}

function getDuplicateBuffer(file) {
  var pending = duplicateBuffers.get(file);

  if (!pending) {
    pending = file.arrayBuffer().catch(function (error) {
      duplicateBuffers.delete(file);
      throw error;
    });

    duplicateBuffers.set(file, pending);
  }

  return pending;
}

function sameFileBytes(first, second) {
  if (first.byteLength !== second.byteLength) return false;

  var a = new Uint8Array(first);
  var b = new Uint8Array(second);

  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}
    var active=0, filePage=0, cartPage=0, detail=0, sendStep=0;
    /*
 * Liaison entre la configuration et le viewer.
 * La configuration reste détenue par la maquette.
 */
window.hb3dGetPreviewState = function () {
  return {
    pieces: pieces.map(function (p) {
      return {
        file: p.file,
        name: p.name,
        tech: p.tech,
        material: p.material,
        color: p.color,
        quantity: p.quantity,
        finish: p.finish
      };
    }),
    activeFile: pieces[active]
      ? pieces[active].file
      : null
  };
};

/*
 * Sélection depuis le viewer :
 * retrouver la pièce par son fichier, pas par son nom.
 */
window.hb3dSelectPreviewFile = function (file) {
  var index = pieces.findIndex(function (p) {
    return p.file === file;
  });

  if (index < 0 || index === active) return;

  active = index;
  detail = index;
  render();
};
    var notes=[''], notesIndex=0;
    var toggles=Array.from(document.querySelectorAll('.panel-toggle'));

    /* Contrôle commun avant l'accès aux coordonnées. */
function confirmConfigurationForSend() {
  var pricing = calculateLot();

  var allAnalysed = pieces.length > 0 && pieces.every(
    function (p) {
      var geometry = p.geometry;

      return Boolean(
        geometry &&
        geometry.status === 'estimated' &&
        Number.isFinite(geometry.volumeModelUnits3) &&
        geometry.volumeModelUnits3 > 0
      );
    }
  );

  var validConfiguration = pieces.every(function (p) {
    var materials = MATERIALS_BY_TECH[p.tech] || [];

    return (
      materials.indexOf(p.material) !== -1 &&
      isColorAllowed(p.tech, p.color) &&
      Number.isInteger(p.quantity) &&
      p.quantity >= 1
    );
  });

  if (
    importChecking ||
    !allAnalysed ||
    !validConfiguration ||
    !pricing.complete ||
    !Number.isFinite(pricing.net)
  ) {
    var status = byId('progress-status');

    if (status) {
      status.textContent =
        'Le lot doit être analysé et disposer ' +
        'd’une configuration et d’une estimation complètes.';
    }

    return false;
  }

  configurationConfirmed = true;
  return true;
}

    function openPanel(id) {
  /*
   * Même contrôle pour le bouton « Passer aux coordonnées »
   * et pour l'ouverture directe du volet « Envoyer ».
   */
  if (
    id === 'panel-send' &&
    !confirmConfigurationForSend()
  ) {
    return;
  }

  toggles.forEach(function (button) {
    var target = byId(button.getAttribute('aria-controls'));

    var opened =
      button.getAttribute('aria-controls') === id;

    button.setAttribute('aria-expanded', String(opened));
    target.hidden = !opened;
  });

  if (id === 'panel-send') {
    showSend();
  }
}    

    toggles.forEach(function (button) { button.addEventListener('click',function () {
      openPanel(button.getAttribute('aria-expanded')==='true'?null:button.getAttribute('aria-controls'));
    }); });
    
    function total() {
    return calculateLot().net;
    }

    function chunkSize(){return window.innerWidth<=760||window.innerHeight<700?2:3;}

    /* Nouvelle simulation après un envoi confirmé et un lot vidé. */
function resetCompletedRequestIfEmpty() {
  /*
   * Ne jamais déverrouiller un envoi en cours,
   * un résultat incertain ou une notification non confirmée.
   */
  if (
    pieces.length !== 0 ||
    sendingRequest ||
    progressSendState !== 'success'
  ) {
    return;
  }

  progressSendState = 'idle';
  configurationConfirmed = false;

  /* Autoriser une nouvelle demande distincte. */
  submissionLocked = false;
  sendStep = 0;

  stopSendProgress();

  var progress = byId('hb3d-send-progress');

  if (progress) {
    progress.hidden = true;
  }

  var disc = byId('hb3d-send-disc');

  if (disc) {
    disc.classList.remove('is-success', 'is-error');
  }

  var notice = byId('hb3d-send-notice');

  if (notice) {
    notice.remove();
  }

  byId('send-next').disabled = false;
  byId('send-next').textContent =
    'Envoyer ma demande de devis';

  byId('send-restart').hidden = false;

  showSend();
}

    /* Retirer une pièce tout en conservant une sélection cohérente. */
function removePiece(index) {
  if (index < 0 || index >= pieces.length) return;

  var removedName = pieces[index].name;

  pieces.splice(index, 1);

/* Tout changement du lot annule sa confirmation précédente. */
   configurationConfirmed = false;

/* Réinitialiser l'envoi uniquement si le lot est désormais vide. */
   resetCompletedRequestIfEmpty();

if (!pieces.length) {
    active = 0;
    detail = 0;

    if (typeof window.hb3dClearPreview === 'function') {
      window.hb3dClearPreview();
    }
  } else {
    if (index < active) {
      /* La même pièce active change simplement d'index. */
      active--;
    } else if (index === active) {
      /*
       * Prendre la suivante si elle existe,
       * sinon la dernière pièce restante.
       */
      active = Math.min(index, pieces.length - 1);
    }

    detail = active;
  }

  filePage = 0;
  cartPage = 0;

  cartView('cart-summary');
  render();

  byId('file-feedback').textContent =
    removedName + ' retiré du lot. ' +
    (
      pieces.length
        ? pieces.length + ' fichier(s) restant(s).'
        : 'Le lot est vide.'
    );
}

function renderFiles() {
  var list = byId('file-list');
  list.replaceChildren();

  pieces.forEach(function (p, index) {
    var row = document.createElement('div');
    row.className = 'file-row';

    /*
     * Disposition locale : aucun changement du fichier CSS.
     * Le nom et le retrait restent deux boutons distincts.
     */
    row.style.display = 'grid';
    row.style.gridTemplateColumns = 'minmax(0, 1fr) auto';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    var selectButton = document.createElement('button');

    selectButton.type = 'button';
    selectButton.textContent = p.name;
    selectButton.style.minWidth = '0';
    selectButton.style.overflowWrap = 'anywhere';

    selectButton.setAttribute(
      'aria-pressed',
      String(index === active)
    );

    selectButton.addEventListener('click', function () {
      active = index;
      detail = index;
      render();
    });

        var removeButton = document.createElement('button');

    removeButton.type = 'button';
    removeButton.className = 'cart-remove-button';
    removeButton.title = 'Retirer ' + p.name;

    removeButton.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16"' +
      ' fill="none" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true" focusable="false">' +
        '<path d="M3 6h18"></path>' +
        '<path d="M9 6V4h6v2"></path>' +
        '<path d="M5 6l1 14h12l1-14"></path>' +
        '<path d="M10 10v6M14 10v6"></path>' +
      '</svg>';

    removeButton.setAttribute(
      'aria-label',
      'Retirer ' + p.name + ' du lot'
    );

    removeButton.addEventListener('click', function () {
      removePiece(index);

      /*
       * Après reconstruction de la liste,
       * replacer le focus sur la pièce active.
       */
      var activeButton = list.querySelector(
        'button[aria-pressed="true"]'
      );

      if (activeButton) {
        activeButton.focus();
      } else {
        byId('files').focus();
      }
    });

    row.append(selectButton, removeButton);
    list.appendChild(row);
  });

  byId('files-prev').parentElement.hidden = true;
}

/* ==========================================
   Panier : couleurs, quantités et prix
   ========================================== */

function renderCart() {
  var pricing = calculateLot();
  var list = byId('cart-list');
  var fragment = document.createDocumentFragment();

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

  pieces.forEach(function (p, index) {
    var card = document.createElement('article');
    card.className = 'cart-piece';

    /* Nom du fichier. */
    var name = document.createElement('h4');
    name.className = 'cart-piece-name';
    name.textContent = p.name;
    name.title = p.name;

    /* Configuration. */
    var configuration = document.createElement('p');
    configuration.className = 'cart-piece-config';

       /* Couleur modifiable pour cette pièce uniquement. */
    var colorLabel = document.createElement('label');
    colorLabel.className = 'cart-color-label';

    var swatch = document.createElement('span');
    swatch.className = 'cart-color-swatch';
    swatch.setAttribute('aria-hidden', 'true');

    swatch.style.backgroundColor =
      colors[p.color] || 'transparent';

    var colorSelect = document.createElement('select');
    colorSelect.className = 'cart-color-select';
    colorSelect.dataset.cartColorIndex = String(index);

    colorSelect.setAttribute(
      'aria-label',
      'Couleur de ' + p.name
    );

    Object.keys(colors).forEach(function (color) {
      if (!isColorAllowed(p.tech, color)) return;

      var option = document.createElement('option');
      option.value = color;
      option.textContent = color;

      colorSelect.appendChild(option);
    });

    colorSelect.value = p.color;

    colorSelect.addEventListener('change', function () {
      var currentIndex = pieces.indexOf(p);
      var nextColor = colorSelect.value;

      if (currentIndex < 0) return;

      if (!isColorAllowed(p.tech, nextColor)) {
        colorSelect.value = p.color;
        return;
      }

      var previousScroll = list.scrollTop;

      /* Ne pas modifier la pièce active. */
      p.color = nextColor;

      /* Réutiliser l'actualisation existante. */
      render();

      var replacement = list.querySelector(
        '[data-cart-color-index="' + currentIndex + '"]'
      );

      if (replacement) {
        replacement.focus({ preventScroll: true });
      }

      list.scrollTop = previousScroll;
    });

    colorLabel.append(swatch, colorSelect);

    /* Commandes de quantité. */
    var quantityControl = document.createElement('span');
    quantityControl.className = 'cart-quantity';

    var quantityValue = document.createElement('span');
    quantityValue.className = 'cart-quantity-value';
    quantityValue.textContent = p.quantity;

    function makeQuantityButton(action, text, delta) {
      var button = document.createElement('button');

      button.type = 'button';
      button.className = 'cart-quantity-button';
      button.textContent = text;

      button.dataset.cartAction = action;
      button.dataset.cartIndex = index;

      button.setAttribute(
        'aria-label',
        (delta > 0 ? 'Augmenter' : 'Diminuer') +
        ' la quantité de ' + p.name
      );

      button.disabled = delta < 0 && p.quantity <= 1;

      button.addEventListener('click', function () {
        var currentIndex = pieces.indexOf(p);

        if (currentIndex < 0) return;

        var previousScroll = list.scrollTop;

        p.quantity = Math.max(1, p.quantity + delta);

        /*
         * Actualiser la maquette sans changer
         * la pièce active.
         */
        render();

        var nextAction =
          action === 'minus' && p.quantity === 1
            ? 'plus'
            : action;

        var replacement = list.querySelector(
          '[data-cart-index="' + currentIndex + '"]' +
          '[data-cart-action="' + nextAction + '"]'
        );

        if (replacement) {
          replacement.focus({ preventScroll: true });
        }

        list.scrollTop = previousScroll;
      });

      return button;
    }

        quantityControl.append(
        makeQuantityButton('minus', '−', -1),
        quantityValue,
        makeQuantityButton('plus', '+', 1)
    );

      configuration.title =
      p.tech + ' · ' + p.material + ' · ' + p.color;

      configuration.append(
      document.createTextNode(p.tech + ' · '),
      colorLabel,
      document.createTextNode(' · '),
      quantityControl
    );

    /* Prix unitaire et montant de ligne. */
    var prices = document.createElement('div');
    prices.className = 'cart-piece-prices';

    var unitPrice = document.createElement('span');

    unitPrice.textContent = Number.isFinite(p.unit)
      ? 'PU : ' + money(p.unit)
      : 'PU indisponible';

    var amount = lineTotal(p);
    var pieceTotal = document.createElement('strong');

    pieceTotal.textContent = Number.isFinite(amount)
      ? 'Ligne : ' + money(amount)
      : 'Ligne indisponible';

        /* Retirer cette pièce du lot. */
    var removeButton = document.createElement('button');

    removeButton.type = 'button';
    removeButton.className = 'cart-remove-button';
    removeButton.dataset.cartRemove = 'true';

    removeButton.title = 'Retirer ' + p.name;

    removeButton.setAttribute(
      'aria-label',
      'Retirer ' + p.name + ' du lot'
    );

    removeButton.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16"' +
      ' fill="none" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true" focusable="false">' +
        '<path d="M3 6h18"></path>' +
        '<path d="M9 6V4h6v2"></path>' +
        '<path d="M5 6l1 14h12l1-14"></path>' +
        '<path d="M10 10v6M14 10v6"></path>' +
      '</svg>';

    removeButton.addEventListener('click', function () {
      var currentIndex = pieces.indexOf(p);

      if (currentIndex < 0) return;

      var previousScroll = list.scrollTop;

      /* Réutiliser la suppression existante. */
      removePiece(currentIndex);

      /* Après actualisation, viser la pièce suivante
         ou la dernière pièce restante. */
      var remainingButtons = list.querySelectorAll(
        '[data-cart-remove]'
      );

      var nextButton = remainingButtons[
        Math.min(currentIndex, remainingButtons.length - 1)
      ];

      if (nextButton) {
        nextButton.focus({ preventScroll: true });
      } else {
        var filesToggle = document.querySelector(
          '.panel-toggle[aria-controls="panel-files"]'
        );

        if (filesToggle) {
          filesToggle.focus({ preventScroll: true });
        }
      }

      list.scrollTop = previousScroll;
    });

    var pieceActions = document.createElement('div');
    pieceActions.className = 'cart-piece-actions';
    pieceActions.appendChild(removeButton);

    /* Ajouter le PU et la poubelle après la quantité. */
    unitPrice.classList.add('cart-unit-price');

    configuration.append(
      document.createTextNode(' · '),
      unitPrice,
      pieceActions
    );

    /* Garder uniquement le total sur la ligne inférieure. */
    prices.appendChild(pieceTotal);

    card.append(name, configuration, prices);
    fragment.appendChild(card);
  });

  /* Remplacer le précédent affichage en une seule opération. */
  list.classList.add('cart-overview');
  list.replaceChildren(fragment);

  byId('cart-prev').parentElement.hidden = true;

  byId('cart-count').textContent =
    pieces.length +
    (pieces.length > 1 ? ' fichiers' : ' fichier');

  byId('cart-total').textContent = money(pricing.net);
  byId('metric-total').textContent = money(pricing.net);

  renderPricingSummary(pricing);
}

   /* ==========================================
   Navigation entre les vues du panier
   ========================================== */

function cartView(id) {
  var views = [
    'cart-summary',
    'cart-detail',
    'cart-notes'
  ];

  views.forEach(function (key) {
    byId(key).hidden = key !== id;
  });
}


/* ==========================================
   Détail d'une pièce du panier
   ========================================== */

function renderDetail() {
  var p = pieces[detail];

  if (!p) return;

  byId('detail-name').textContent = p.name;

  byId('detail-index').textContent =
    (detail + 1) + ' / ' + pieces.length;

  byId('detail-tech').textContent = p.tech;
  byId('detail-material').textContent = p.material;
  byId('detail-color').textContent = p.color;
  byId('detail-quantity').textContent = p.quantity;

  byId('detail-unit').textContent = money(p.unit);
  byId('detail-total').textContent = money(lineTotal(p));

  byId('piece-prev').disabled = detail === 0;

  byId('piece-next').disabled =
    detail === pieces.length - 1;
}
    
function renderConfig() {
  var p = pieces[active];

  var colors = {
    Blanc: '#ffffff',
    Noir: '#252932',
    Gris: '#919ba7',
    Vert: '#32a568',
    Bleu: '#2878d0',
    Rose: '#db4588',
    Rouge: '#fa0606',
    Jaune: '#f1cc35'
  };

  var colorSelect = byId('config-color-select');
  var minusButton = byId('config-minus');
  var plusButton = byId('config-plus');

  colorSelect.replaceChildren();

  colorSelect.disabled = !p;
  minusButton.disabled = !p || p.quantity <= 1;
  plusButton.disabled = !p;

    if (!p) {
    renderConfig();
    [
      'config-tech',
      'config-material',
      'config-color',
      'config-quantity'
    ].forEach(function (id) {
      byId(id).textContent = '—';
    });

    byId('config-color-dot').style.backgroundColor =
      'transparent';

    return;
  }

  byId('config-tech').textContent = p.tech;
  byId('config-material').textContent = p.material;
  byId('config-color').textContent = p.color;
  byId('config-quantity').textContent = p.quantity;

  byId('config-color-dot').style.backgroundColor =
    colors[p.color] || 'transparent';

  Object.keys(colors).forEach(function (color) {
    if (!isColorAllowed(p.tech, color)) return;

    var option = document.createElement('option');

    option.value = color;
    option.textContent = color;

    colorSelect.appendChild(option);
  });

  colorSelect.value = p.color;
}
    
function syncToolbox() {
  var p = pieces[active];

  if (!p) return;

  document.querySelectorAll('[data-tech]').forEach(
    function (button) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.tech === p.tech)
      );
    }
  );

  /* Pastilles visibles du viewer. */
  document.querySelectorAll('.color-dot').forEach(
    function (button) {
      var color = button.dataset.color;
      var allowed = isColorAllowed(p.tech, color);

      button.disabled = !allowed;

      button.classList.toggle(
        'is-color-unavailable',
        !allowed
      );

      button.setAttribute(
        'aria-disabled',
        String(!allowed)
      );

      button.setAttribute(
        'aria-pressed',
        String(allowed && color === p.color)
      );

      button.title = allowed
        ? color
        : color + ' — indisponible en SLA';
    }
  );

  /* Liste de couleur utilisée par la maquette. */
  var colorSelect = byId('color');

  if (colorSelect) {
    Array.from(colorSelect.options).forEach(
      function (option) {
        option.disabled = !isColorAllowed(
          p.tech,
          option.value
        );
      }
    );

    colorSelect.value = p.color;
  }

  byId('selected-color-name').textContent = p.color;
  byId('minus').disabled = p.quantity <= 1;

  renderConfig();
}

document.querySelectorAll('[data-tech]').forEach(function (button) {
  button.addEventListener('click', function () {
    var select = byId('technology');

    if (select.value === button.dataset.tech) return;

    select.value = button.dataset.tech;
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
});

document.querySelectorAll('.color-dot').forEach(function (button) {
  button.addEventListener('click', function () {
    var select = byId('color');

    select.value = button.dataset.color;
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
});
    
function renderGeometryMetrics() {
  var dimensionsElement = byId('metric-dimensions');
  var volumeElement = byId('metric-volume');

  if (!dimensionsElement || !volumeElement) return;

  dimensionsElement.replaceChildren();
  volumeElement.replaceChildren();

  var p = pieces[active];

  if (!p) {
    dimensionsElement.textContent = 'En attente';
    volumeElement.textContent = 'En attente';
    return;
  }

  var geometry = p.geometry;

  if (!geometry) {
    dimensionsElement.textContent = 'Analyse en cours…';
    volumeElement.textContent = 'Analyse en cours…';
    return;
  }

  var dimensions = geometry.dimensionsModelUnits;

  var hasDimensions = dimensions &&
    [dimensions.x, dimensions.y, dimensions.z].every(
      function (value) {
        return Number.isFinite(value) && value >= 0;
      }
    );

  /*
   * Même convention que la tarification actuelle :
   * STL et OBJ interprétés en millimètres.
   * Les formats CAO restent dans les unités du modèle.
   */
   var isMesh = Boolean(
  p.file &&
  /\.(stl|obj)$/i.test(p.file.name)
  );

var cadOutputInMm = Boolean(
  p.file &&
  /\.(step|stp|igs|iges)$/i.test(p.file.name) &&
  geometry.linearUnit === 'mm' &&
  geometry.unitStatus === 'specified-output' &&
  geometry.unitSource === 'occt-output'
);

var interpretedAsMm = isMesh || cadOutputInMm;

  function number(value) {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function addUnitNote(element) {
    var note = document.createElement('small');
    note.className = 'metric-unit-note';

    note.textContent = cadOutputInMm
    ? 'Sortie OCCT en mm'
    : (
      isMesh
        ? 'Coordonnées interprétées en mm'
        : 'Unité du modèle à confirmer'
    );

    element.appendChild(note);
  }

  if (hasDimensions) {
    dimensionsElement.textContent =
      number(dimensions.x) + ' × ' +
      number(dimensions.y) + ' × ' +
      number(dimensions.z) +
      (interpretedAsMm ? ' mm' : ' unités');

    addUnitNote(dimensionsElement);
  } else {
    dimensionsElement.textContent =
      'Dimensions indisponibles';
  }

  var volume = geometry.volumeModelUnits3;

  if (
    geometry.status === 'estimated' &&
    Number.isFinite(volume) &&
    volume > 0
  ) {
    volumeElement.textContent = interpretedAsMm
      ? number(volume / 1000) + ' cm³'
      : number(volume) + ' unités³';

    addUnitNote(volumeElement);
  } else {
    volumeElement.textContent = 'Volume indisponible';
  }
}

/* ==========================================
   Avancement réel de la demande
   ========================================== */

function setProgressStep(id, state) {
  var item = byId(id);

  if (!item) return;

  item.classList.toggle('done', state === 'done');
  item.classList.toggle('current', state === 'current');

  if (state === 'current') {
    item.setAttribute('aria-current', 'step');
  } else {
    item.removeAttribute('aria-current');
  }

  var badge = item.querySelector('span');

  var numbers = {
    'progress-import': '1',
    'progress-analysis': '2',
    'progress-config': '3',
    'progress-send': '4'
  };

  if (badge) {
    badge.textContent = state === 'done'
      ? '✓'
      : numbers[id];
  }
}

/*
 * Première phase :
 * raccorder uniquement l'import au lot réel.
 * L'analyse et l'envoi seront raccordés ensuite.
 */
function renderImportProgress() {
  var hasFiles = pieces.length > 0;
  var checking = Boolean(importChecking);

  var analysedCount = pieces.filter(function (p) {
    var geometry = p.geometry;

    return Boolean(
      geometry &&
      geometry.status === 'estimated' &&
      Number.isFinite(geometry.volumeModelUnits3) &&
      geometry.volumeModelUnits3 > 0
    );
  }).length;

  var allAnalysed =
    hasFiles && analysedCount === pieces.length;

  var missingResults = pieces.some(function (p) {
    return !p.geometry;
  });

  /* Vérifier les choix avec les règles déjà utilisées. */
  var configurationReady = allAnalysed && pieces.every(
    function (p) {
      var materials = MATERIALS_BY_TECH[p.tech] || [];

      return (
        materials.indexOf(p.material) !== -1 &&
        isColorAllowed(p.tech, p.color) &&
        Number.isInteger(p.quantity) &&
        p.quantity >= 1
      );
    }
  );

  /* Ne pas annoncer un lot prêt sans estimation complète. */
  var pricing = hasFiles ? calculateLot() : null;

  var readyToSend = Boolean(
    !checking &&
    configurationReady &&
    pricing &&
    pricing.complete &&
    Number.isFinite(pricing.net)
  );

  var sendState = progressSendState || 'idle';
  var sendStarted = sendState !== 'idle';

  setProgressStep(
    'progress-import',
    checking || !hasFiles ? 'current' : 'done'
  );

  setProgressStep(
    'progress-analysis',
    !hasFiles || checking
      ? 'pending'
      : allAnalysed
        ? 'done'
        : 'current'
  );

  setProgressStep(
  'progress-config',
  !allAnalysed || checking
    ? 'pending'
    : readyToSend && configurationConfirmed
      ? 'done'
      : 'current'
  );

  setProgressStep(
  'progress-send',
  sendState === 'success'
    ? 'done'
    : (readyToSend && configurationConfirmed) || sendStarted
      ? 'current'
      : 'pending'
);

  var status = byId('progress-status');

  if (!status) return;

  /* Les résultats d'envoi sont prioritaires dans le message. */
  if (sendState === 'success') {
    status.textContent =
      'Demande enregistrée. Notification acceptée par EmailJS.';
  } else if (sendState === 'recorded') {
    status.textContent =
      'Demande enregistrée. Notification non confirmée : ' +
      'ne renvoyez pas la demande.';
  } else if (sendState === 'uncertain') {
    status.textContent =
      'Enregistrement à vérifier avant toute nouvelle tentative.';
  } else if (sendState === 'sending') {
    status.textContent =
      'Envoi de la demande en cours…';
  } else if (sendState === 'error') {
    status.textContent =
      'Envoi interrompu. Consultez le message du formulaire.';
  } else if (checking) {
    status.textContent =
      'Vérification des fichiers sélectionnés…';
  } else if (!hasFiles) {
    status.textContent =
      'Ajoutez vos fichiers pour commencer.';
  } else if (!allAnalysed) {
    status.textContent = missingResults
      ? 'Analyse du lot : ' +
        analysedCount + ' / ' + pieces.length +
        ' fichier(s) avec un volume exploitable.'
      : 'Analyse à vérifier : au moins une pièce ne dispose ' +
        'pas d’un volume exploitable.';
  } else if (!configurationReady) {
    status.textContent =
      'Vérifiez les matériaux, les couleurs et les quantités.';
  } else if (!readyToSend) {
    status.textContent =
      'Estimation du lot incomplète : vérification nécessaire.';
  } else if (!configurationConfirmed) {
  status.textContent =
    'Vérifiez votre configuration, puis passez aux coordonnées.';
  } else {
  status.textContent =
    'Lot prêt. Renseignez vos coordonnées pour envoyer la demande.';
  }
}

function render() {
  var p = pieces[active];

  renderImportProgress();
  renderGeometryMetrics();

  /* Désactiver les réglages tant qu'aucune pièce n'existe. */
  document.querySelectorAll(
    '[data-tech], .color-dot, #material, #finish, #plus, #minus'
  ).forEach(function (control) {
    control.disabled = !p;
  });

  if (!p) {
    byId('active-name').textContent = 'Aucune pièce sélectionnée';
    byId('config-name').textContent = 'Importez une pièce';

    [
      'config-tech',
      'config-material',
      'config-color',
      'config-quantity'
    ].forEach(function (id) {
      byId(id).textContent = '—';
    });

    byId('config-color-dot').style.backgroundColor = 'transparent';
    byId('selected-color-name').textContent = '—';
    byId('material').replaceChildren();
    byId('quantity').value = '—';

    document.querySelectorAll(
      '[data-tech], .color-dot'
    ).forEach(function (button) {
      button.setAttribute('aria-pressed', 'false');
    });

    renderFiles();
    renderCart();
    renderReview();

    if (typeof window.hb3dSyncPreviewLot === 'function') {
    window.hb3dSyncPreviewLot(
    window.hb3dGetPreviewState()
  );
}

return;
  }

  byId('active-name').textContent = p.name;
  byId('config-name').textContent = p.name;
  byId('technology').value = p.tech;

  var select = byId('material');
  select.replaceChildren();

  var materials = MATERIALS_BY_TECH[p.tech] || [];

  materials.forEach(function (value) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = p.material;

  byId('color').value = p.color;
  byId('quantity').value = p.quantity;
  byId('finish').value = p.finish;
  byId('scene').dataset.color = p.color;

  renderFiles();
  renderCart();
  renderDetail();
  renderReview();
  syncToolbox();

/*
 * Nouveau raccordement du lot, lorsqu'il est disponible.
 * Sinon, conserver l'aperçu individuel existant.
 */
if (typeof window.hb3dSyncPreviewLot === 'function') {
  window.hb3dSyncPreviewLot(
    window.hb3dGetPreviewState()
  );
} else {
  if (
    p.file &&
    typeof window.hb3dLoadPreview === 'function'
  ) {
    window.hb3dLoadPreview(p.file);
  }

  if (
    typeof window.hb3dSyncViewerAppearance === 'function'
  ) {
    window.hb3dSyncViewerAppearance();
  }
}

}   

/* Import local : refuser les fichiers au contenu identique. */
byId('files').addEventListener('change', async function (event) {
  var input = event.target;
  var files = Array.from(input.files || []);

  if (!files.length || importChecking) return;

  var maximumFiles = 5;
  var errors = [];

  files.forEach(function (file) {
    if (!/\.(stl|obj|step|stp|igs|iges)$/i.test(file.name)) {
      errors.push(
        file.name + ' : formats disponibles : ' +
        'STL, OBJ, STEP, STP, IGS et IGES.'
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      errors.push(file.name + ' : limite de test de 50 Mo.');
    }

    if (file.size === 0) {
      errors.push(file.name + ' : fichier vide.');
    }
  });

  if (errors.length) {
    byId('file-feedback').textContent =
      errors.join(' ') + ' Aucun fichier ajouté ; lot inchangé.';

    input.value = '';
    return;
  }

   importChecking = true;
   input.disabled = true;
   hideDuplicateNotice();

   renderImportProgress();

  byId('file-feedback').textContent =
    'Vérification locale des doublons…';

  try {
    var existingFiles = pieces.map(function (p) {
      return p.file;
    }).filter(Boolean);

    var allFiles = existingFiles.concat(files);
    var sizes = new Map();

    allFiles.forEach(function (file) {
      sizes.set(file.size, (sizes.get(file.size) || 0) + 1);
    });

    /*
     * Deux contenus identiques ont nécessairement la même taille.
     * Lire seulement les fichiers pouvant correspondre.
     */
    var candidates = allFiles.filter(function (file) {
      return sizes.get(file.size) > 1;
    });

    var buffers = new Map();

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];

      if (!buffers.has(candidate)) {
        buffers.set(
          candidate,
          await getDuplicateBuffer(candidate)
        );
      }
    }

    /*
     * Reprendre le lot courant après les lectures :
     * une pièce peut avoir été retirée entre-temps.
     */
    var seen = pieces.map(function (p) {
      return {
        file: p.file,
        name: p.name
      };
    }).filter(function (item) {
      return Boolean(item.file);
    });

    var duplicates = [];

    files.forEach(function (file) {
      var match = seen.find(function (item) {
        if (item.file.size !== file.size) return false;
        if (item.file === file) return true;

        var first = buffers.get(item.file);
        var second = buffers.get(file);

        return Boolean(
          first &&
          second &&
          sameFileBytes(first, second)
        );
      });

      if (match) {
        duplicates.push(
          '« ' + file.name + ' » : contenu identique à « ' +
          match.name + ' ».'
        );
      } else {
        seen.push({
          file: file,
          name: file.name
        });
      }
    });

    if (duplicates.length) {
      byId('file-feedback').textContent =
        duplicates.join(' ') +
        ' Aucun fichier ajouté ; lot inchangé.';

      showDuplicateNotice(duplicates);
      return;
    }

    var availableSlots = maximumFiles - pieces.length;

    if (files.length > availableSlots) {
      byId('file-feedback').textContent =
        'Le lot est limité à ' + maximumFiles + ' fichiers. ' +
        pieces.length + ' déjà présent(s), ' +
        availableSlots + ' emplacement(s) disponible(s). ' +
        'Aucun fichier ajouté ; lot inchangé.';

      return;
    }

    var firstAddedIndex = pieces.length;

    var addedPieces = files.map(function (file) {
      var p = piece(file.name);
      p.file = file;
      return p;
    });

    pieces = pieces.concat(addedPieces);

    active = firstAddedIndex;
    detail = firstAddedIndex;
    filePage = 0;
    cartPage = 0;

    byId('file-feedback').textContent =
      files.length + ' fichier(s) ajouté(s). ' +
      'Lot : ' + pieces.length + ' / ' + maximumFiles + '. ' +
      'Lecture locale, aucun transfert serveur.';

    cartView('cart-summary');
    render();
  } catch (error) {
    byId('file-feedback').textContent =
      'Vérification des fichiers impossible. ' +
      'Aucun fichier ajouté ; lot inchangé.';

    console.error('[HB3D Doublons]', error);
  } finally {
  input.value = '';
  input.disabled = false;
  importChecking = false;

  renderImportProgress();
}
});


/* Anciennes commandes de pagination des fichiers. */
byId('files-prev').addEventListener('click', function () {
  filePage--;
  renderFiles();
});

byId('files-next').addEventListener('click', function () {
  filePage++;
  renderFiles();
});


/* Anciennes commandes de pagination du panier. */
byId('cart-prev').addEventListener('click', function () {
  cartPage--;
  renderCart();
});

byId('cart-next').addEventListener('click', function () {
  cartPage++;
  renderCart();
});


/* Retour au récapitulatif du panier. */
byId('back-cart').addEventListener('click', function () {
  cartView('cart-summary');
});

byId('back-notes').addEventListener('click', function () {
  cartView('cart-summary');
});


/* Navigation dans les détails des pièces. */
byId('piece-prev').addEventListener('click', function () {
  if (pieces.length && detail > 0) {
    detail--;
    renderDetail();
  }
});

byId('piece-next').addEventListener('click', function () {
  if (pieces.length && detail < pieces.length - 1) {
    detail++;
    renderDetail();
  }
});


/* Technologie de la pièce active. */
byId('technology').addEventListener('change', function (event) {
  var p = pieces[active];

  if (!p) return;

  var nextTech = event.target.value;
  var materials = MATERIALS_BY_TECH[nextTech];

  /* Ne pas activer une technologie non disponible. */
  if (!materials || !materials.length) {
    event.target.value = p.tech;
    return;
  }

  p.tech = nextTech;

  /*
   * Conserver le matériau s'il reste compatible.
   * Sinon, choisir le premier de la technologie :
   * PLA pour FDM, Résine Standard pour SLA.
   */
  if (materials.indexOf(p.material) === -1) {
    p.material = materials[0];
  }

  /*
   * En SLA, remplacer une couleur interdite par Blanc.
   * Blanc, Gris et Noir restent conservés.
   */
  if (!isColorAllowed(p.tech, p.color)) {
    p.color = 'Blanc';
  }

  render();
});


/* Matériau de la pièce active. */
byId('material').addEventListener('change', function (event) {
  if (!pieces[active]) return;

  pieces[active].material = event.target.value;

  renderCart();
  renderDetail();
  renderConfig();
  renderReview();
});
    
    
/* Couleur de la pièce active : commande existante. */
byId('color').addEventListener('change', function (event) {
  var p = pieces[active];

  if (!p) return;

  var nextColor = event.target.value;

  if (!isColorAllowed(p.tech, nextColor)) {
    event.target.value = p.color;
    return;
  }

  p.color = nextColor;

  render();
});


/* NOUVEAU : couleur depuis le volet Configuration. */
byId('config-color-select').addEventListener(
  'change',
  function (event) {
    var p = pieces[active];

    if (!p) return;

    var nextColor = event.target.value;

    if (!isColorAllowed(p.tech, nextColor)) {
      event.target.value = p.color;
      return;
    }

    p.color = nextColor;

    render();
  }
);


/* NOUVEAU : augmenter la quantité depuis le volet Configuration. */
byId('config-plus').addEventListener('click', function () {
  var p = pieces[active];

  if (!p) return;

  p.quantity++;

  render();

  byId('config-plus').focus({ preventScroll: true });
});


/* NOUVEAU : diminuer la quantité depuis le volet Configuration. */
byId('config-minus').addEventListener('click', function () {
  var p = pieces[active];

  if (!p || p.quantity <= 1) return;

  p.quantity--;

  render();

  var focusTarget = p.quantity <= 1
    ? byId('config-plus')
    : byId('config-minus');

  focusTarget.focus({ preventScroll: true });
});


/* Finition : commande existante, à conserver. */
byId('finish').addEventListener('change',function(e){pieces[active].finish=e.target.value;});
     
    byId('finish').addEventListener('change',function(e){pieces[active].finish=e.target.value;});
    byId('plus').addEventListener('click',function(){pieces[active].quantity++;render();});byId('minus').addEventListener('click',function(){pieces[active].quantity=Math.max(1,pieces[active].quantity-1);render();});
    document.querySelectorAll('[data-mode]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-mode]').forEach(function(other){other.setAttribute('aria-pressed',String(other===button));});byId('scene').dataset.mode=button.dataset.mode;});});
    function showNotes(){byId('notes').value=notes[notesIndex];byId('notes-page').textContent=(notesIndex+1)+' / '+notes.length;byId('notes-prev').disabled=notesIndex===0;byId('notes-next').disabled=notesIndex===notes.length-1;}
    byId('show-notes').addEventListener('click',function(){cartView('cart-notes');showNotes();});byId('notes').addEventListener('input',function(e){notes[notesIndex]=e.target.value;});byId('notes-prev').addEventListener('click',function(){notesIndex--;showNotes();});byId('notes-next').addEventListener('click',function(){notesIndex++;showNotes();});byId('notes-add').addEventListener('click',function(){notes.push('');notesIndex=notes.length-1;showNotes();});
    function renderReview() {
    byId('review-count').textContent = pieces.length;
    byId('review-total').textContent = money(total());

    byId('review-name').textContent =
    byId('demo-name').value || 'Non renseigné';

   renderImportProgress();
  }

    function showSend() {
  var finished = sendStep === 3;

  byId('demo-form').hidden = finished;
  byId('send-done').hidden = !finished;

  /* Afficher les deux groupes de coordonnées ensemble. */
  byId('send-contact').hidden = finished;
  byId('send-extra').hidden = finished;

  /* Retirer l’ancienne page intermédiaire de vérification. */
  byId('send-review').hidden = true;
  byId('send-step').textContent = finished ? 'Terminé' : '';

  /* Un seul bouton, sur toute la largeur. */
  byId('send-prev').hidden = true;
  byId('send-next').textContent =
    'Envoyer ma demande de devis';

  byId('send-next').parentElement.style.gridTemplateColumns = '1fr';

  /* Éviter de répéter les explications entre les champs. */
  byId('send-contact').querySelector('.hint').textContent =
    'Renseignez vos coordonnées pour recevoir votre estimation. Envoi réel.';

  byId('send-extra').querySelector('.hint').hidden = true;

  byId('send-restart').textContent = 'Revenir aux coordonnées';

  renderReview();
}
    byId('go-send').addEventListener('click', function () {
  var pricing = calculateLot();

  var allAnalysed = pieces.length > 0 && pieces.every(
    function (p) {
      var geometry = p.geometry;

      return Boolean(
        geometry &&
        geometry.status === 'estimated' &&
        Number.isFinite(geometry.volumeModelUnits3) &&
        geometry.volumeModelUnits3 > 0
      );
    }
  );

  var validConfiguration = pieces.every(function (p) {
    var materials = MATERIALS_BY_TECH[p.tech] || [];

    return (
      materials.indexOf(p.material) !== -1 &&
      isColorAllowed(p.tech, p.color) &&
      Number.isInteger(p.quantity) &&
      p.quantity >= 1
    );
  });

  if (
    importChecking ||
    !allAnalysed ||
    !validConfiguration ||
    !pricing.complete ||
    !Number.isFinite(pricing.net)
  ) {
    var status = byId('progress-status');

    if (status) {
      status.textContent =
        'Le lot doit être analysé et disposer ' +
        'd’une configuration et d’une estimation complètes.';
    }

    return;
  }

  configurationConfirmed = true;

  openPanel('panel-send');
  showSend();
});

    byId('send-prev').addEventListener('click',function(){sendStep=Math.max(0,sendStep-1);showSend();});
    
    var HB3D_EMAIL_PUBLIC_KEY = 'yMCFNhgV27X8SzqIp';
var HB3D_IS_LOCAL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

var HB3D_PHP_BASE_URL = HB3D_IS_LOCAL
  ? window.location.origin + '/devis/php/'
  : 'https://unamusable-nonacidic-wilfred.ngrok-free.dev/devis/php/';

var sendingRequest = false;
var submissionLocked = false;
/* État de l'indicateur de droite, sans modifier l'envoi. */
var progressSendState = 'idle';
var configurationConfirmed = false;

var sendProgressTimer = null;
var sendProgressValue = 0;

function stopSendProgress() {
  window.clearInterval(sendProgressTimer);
  sendProgressTimer = null;
}

function setSendProgress(value, label) {
  sendProgressValue = Math.max(0, Math.min(100, value));

  var rounded = Math.round(sendProgressValue);
  var disc = byId('hb3d-send-disc');

  disc.style.setProperty(
    '--send-progress',
    sendProgressValue + '%'
  );

  disc.setAttribute('aria-valuenow', String(rounded));
  disc.setAttribute(
    'aria-valuetext',
    'Progression indicative : ' + rounded + ' %'
  );

  byId('hb3d-send-percent').textContent = rounded + ' %';

  if (label) {
    byId('hb3d-send-progress-label').textContent = label;
  }
}

function animateSendProgress(target, label) {
  stopSendProgress();

  byId('hb3d-send-progress-label').textContent = label;

  sendProgressTimer = window.setInterval(function () {
    var remaining = target - sendProgressValue;

    if (remaining <= 0.3) {
      setSendProgress(target);
      stopSendProgress();
      return;
    }

    setSendProgress(
      Math.min(
        target,
        sendProgressValue + Math.max(0.2, remaining * 0.08)
      )
    );
  }, 100);
}

function startSendProgress() {
  stopSendProgress();

  var disc = byId('hb3d-send-disc');

  disc.classList.remove('is-success', 'is-error');
  byId('hb3d-send-progress').hidden = false;

  setSendProgress(0, 'Préparation de la demande…');
}

async function finishSendProgress() {
  stopSendProgress();

  /* Finir le cercle en rouge, puis passer au vert. */
  var initialValue = sendProgressValue;

  for (var step = 1; step <= 10; step++) {
    setSendProgress(
      initialValue + (100 - initialValue) * step / 10,
      'Finalisation…'
    );

    await new Promise(function (resolve) {
      window.setTimeout(resolve, 35);
    });
  }

  await new Promise(function (resolve) {
    window.setTimeout(resolve, 250);
  });

  byId('hb3d-send-disc').classList.add('is-success');

  setSendProgress(
    100,
    'Demande enregistrée · envoi EmailJS accepté'
  );
}

function failSendProgress(label) {
  stopSendProgress();

  byId('hb3d-send-disc').classList.add('is-error');
  byId('hb3d-send-progress-label').textContent = label;
}

function showSendNotice(message) {
  var notice = byId('hb3d-send-notice');

  if (!notice) {
    notice = document.createElement('p');
    notice.id = 'hb3d-send-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    byId('demo-form').insertAdjacentElement('beforebegin', notice);
  }

  notice.textContent = message;
}

async function postSendJson(url, body) {
  var response = await fetch(url, {
    method: 'POST',
    body: body
  });

  var text = await response.text();
  var result;

  try {
    result = JSON.parse(text);
  } catch (error) {
    throw new Error(
      'Réponse PHP illisible. Vérifiez les journaux avant toute nouvelle tentative.'
    );
  }

  if (
    !response.ok ||
    !result ||
    result.success !== true ||
    result.error
  ) {
    throw new Error(
      result && result.error
        ? result.error
        : 'Opération non confirmée par le serveur.'
    );
  }

  return result;
}

byId('send-next').addEventListener('click', async function () {
  if (sendingRequest || submissionLocked) return;

  var nameInput = byId('demo-name');
  var emailInput = byId('demo-email');

  nameInput.required = true;
  emailInput.required = true;

  if (!nameInput.value.trim()) {
    showSendNotice('Renseignez votre nom ou prénom.');
    nameInput.focus();
    return;
  }

  if (!emailInput.reportValidity()) return;

  if (
    !window.emailjs ||
    HB3D_EMAIL_PUBLIC_KEY === 'REMPLACER_PAR_TA_CLE_PUBLIQUE'
  ) {
    showSendNotice(
      'EmailJS n’est pas configuré. Aucun transfert effectué.'
    );
    return;
  }

  var pricing = calculateLot();

  if (!pricing.complete || !pieces.length) {
    showSendNotice(
      'Le lot doit disposer d’une estimation complète avant l’envoi.'
    );
    return;
  }

  if (
    pieces.length > 5 ||
    pieces.some(function (p) {
      return !p.file || p.file.size > 50 * 1024 * 1024;
    })
  ) {
    showSendNotice('Limite : 5 fichiers, 50 Mo par fichier.');
    return;
  }

  /*
   * Figer les données avant les opérations asynchrones.
   * Les changements ultérieurs du panier ne modifient pas
   * la demande en cours.
   */
  var contact = {
    nom: nameInput.value.trim(),
    email: emailInput.value.trim(),
    societe: byId('demo-company').value.trim(),
    tel: byId('demo-phone').value.trim()
  };

  var customerNotes = notes.join('\n\n').trim();

  var rows = pieces.map(function (p) {
    return {
      file: p.file,
      name: p.name,
      tech: p.tech,
      material: p.material,
      color: p.color,
      finish: p.finish,
      quantity: p.quantity,
      unit: p.unit,
      amount: lineTotal(p)
    };
  });

  var summary = rows.map(function (p, index) {
    return (
      (index + 1) + '. ' + p.name + '\n' +
      p.tech + ' · ' + p.material + ' · ' + p.color +
      ' · Finition : ' + p.finish + '\n' +
      'Quantité : ' + p.quantity +
      ' · PU avant remise : ' + money(p.unit) +
      ' · Ligne avant remise : ' + money(p.amount)
    );
  }).join('\n\n');

  summary +=
    '\n\nSous-total : ' + money(pricing.gross) +
    '\nRemise lot : ' + Math.round(pricing.rate * 100) +
    ' % (' + money(pricing.discount) + ')' +
    '\nTotal estimatif : ' + money(pricing.net) +
    '\nSuppléments de finition non inclus.' +
    '\nValidation technique humaine requise.';

  var submittedNotes =
    (customerNotes ? customerNotes + '\n\n' : '') +
    'RÉCAPITULATIF DU LOT\n' + summary;

  var submissionStarted = false;
  var recorded = false;
  var quote = '';

  sendingRequest = true;
  progressSendState = 'sending';
  renderImportProgress();

  byId('send-next').disabled = true;
  byId('send-next').textContent = 'Envoi en cours…';

  startSendProgress();

  try {
    window.emailjs.init({
      publicKey: HB3D_EMAIL_PUBLIC_KEY
    });

    showSendNotice('Transfert des fichiers…');

    animateSendProgress(65, 'Transfert des fichiers…');

    var uploadBody = new FormData();

    rows.forEach(function (p, index) {
      uploadBody.append(String(index), p.file);
    });

    var uploaded = await postSendJson(
      HB3D_PHP_BASE_URL + 'upload.php?files',
      uploadBody
    );

    if (
      !Array.isArray(uploaded.files) ||
      uploaded.files.length !== rows.length ||
      uploaded.files.some(function (value) {
        return typeof value !== 'string' || !value;
      })
    ) {
      throw new Error('Le transfert du lot n’est pas complet.');
    }

    var submitBody = new URLSearchParams();

    Object.keys(contact).forEach(function (key) {
      submitBody.set(key, contact[key]);
    });

    submitBody.set('quantite', String(pricing.quantity));
    submitBody.set('prix_affiche', pricing.net.toFixed(2));
    submitBody.set('commentaire', customerNotes);
    submitBody.set('notes', submittedNotes);

        var configurations = rows.map(function (p, index) {
      return {
        filename: uploaded.files[index],
        original_name: p.name,
        tech: p.tech,
        material: p.material,
        color: p.color,
        finish: p.finish,
        quantity: p.quantity,
        unit: p.unit,
        amount: p.amount
      };
    });

    submitBody.set(
      'configurations_json',
      JSON.stringify(configurations)
    );

    uploaded.files.forEach(function (filename) {
      submitBody.append('filenames[]', filename);
    });

    showSendNotice('Enregistrement de la demande…');
    setSendProgress(65);
    animateSendProgress(85, 'Enregistrement de la demande…');
    submissionStarted = true;

    var data = await postSendJson(
      HB3D_PHP_BASE_URL + 'submit.php',
      submitBody
    );

    recorded = true;
    submissionLocked = true;
    quote = data.quote_number || data.devis_id || '';

    var params = {
      HB3D: contact.nom,
      Bienvenue: contact.societe,
      client_email: contact.email,
      client_id: contact.tel,
      client_code: data.client_code || '',
      time: new Date().toLocaleString('fr-FR'),
      quote_number: quote,
      quantite_totale: pricing.quantity,
      prix_total: money(pricing.net),
      message: submittedNotes
    };

    params.sous_total = money(pricing.gross);
    params.remise_taux = Math.round(pricing.rate * 100) + ' %';
    params.remise_montant = money(pricing.discount);

    var colors = {
      Blanc: '#ffffff',
      Noir: '#252932',
      Gris: '#919ba7',
      Vert: '#32a568',
      Bleu: '#2878d0',
      Rose: '#db4588',
      Rouge: '#fa0606',
      Jaune: '#f1cc35'
    };

    for (var i = 1; i <= 5; i++) {
      var row = rows[i - 1];

      params['fichier_' + i] = row ? row.name : '';
      params['configuration_' + i] = row
        ? row.tech + ' · ' + row.material + ' · ' +
          row.color + ' · Finition : ' + row.finish
        : '';
      params['couleur_hex_' + i] = row
        ? colors[row.color] || '#ffffff'
        : '#ffffff';
      params['quantite_' + i] = row ? row.quantity : '';
      params['prix_unitaire_' + i] = row ? money(row.unit) : '';
      params['prix_ligne_' + i] = row ? money(row.amount) : '';
    }

    showSendNotice(
      'Demande ' + quote + ' enregistrée — notification en cours…'
    );

    setSendProgress(85);
    animateSendProgress(95, 'Envoi de votre estimation…');

    await window.emailjs.send(
      'service_np51rgo',
      'template_7mjwzt9',
      params
    );
    
    await finishSendProgress();

    progressSendState = 'success';

    sendStep = 3;
    showSend();

    byId('send-done').querySelector('h3').textContent =
      'Demande enregistrée';

    byId('send-done').querySelector('p').textContent =
      'Référence : ' + quote +
      '. Envoi EmailJS accepté. Vérifiez votre boîte de réception.';

    byId('send-done').querySelector('.hint').textContent =
      'Estimation soumise à validation technique humaine.';

    byId('send-restart').hidden = true;

    showSendNotice('Traitement terminé — référence : ' + quote);
  } catch (error) {
    /*
     * Après le début du POST d’enregistrement, une réponse
     * perdue ne permet pas de savoir si le serveur a enregistré.
     */
    if (submissionStarted) submissionLocked = true;

    progressSendState = recorded
     ? 'recorded'
     : submissionStarted
     ? 'uncertain'
     : 'error';

renderImportProgress();

    var prefix = recorded
      ? 'Demande ' + quote +
        ' enregistrée, mais notification non confirmée. ' +
        'Ne renvoyez pas la demande. '
      : submissionStarted
        ? 'Résultat de l’enregistrement incertain. ' +
          'Vérifiez le journal avant toute nouvelle tentative. '
        : '';

    failSendProgress(
    recorded
    ? 'Demande enregistrée · notification non confirmée'
    : submissionStarted
      ? 'Enregistrement à vérifier'
      : 'Traitement interrompu'
    );

    showSendNotice(prefix + error.message);
    console.error('[HB3D Envoi]', error);
  } finally {
    sendingRequest = false;

    byId('send-next').disabled = submissionLocked;
    byId('send-next').textContent = submissionLocked
      ? 'Demande traitée — vérifiez le résultat'
      : 'Envoyer ma demande de devis';
  }
});

    byId('send-restart').addEventListener('click',function(){sendStep=2;showSend();});byId('demo-form').addEventListener('submit',function(e){e.preventDefault();});
    
        /* Simple emplacement du futur déclencheur du chatbot existant. */
    var assistantButton = document.querySelector('.assistant-link');

    if (assistantButton) {
      assistantButton.removeAttribute('aria-expanded');
      assistantButton.removeAttribute('aria-controls');
      assistantButton.disabled = true;
      assistantButton.title =
        'Le chatbot du site sera raccordé après validation de la maquette.';

      var assistantCaption = assistantButton.querySelector('span');

      if (assistantCaption) {
        assistantCaption.textContent = 'Raccordement à venir';
      }
    }

    /* Conserver les adaptations des listes au redimensionnement. */
    window.addEventListener('resize', function () {
      renderFiles();
      renderCart();
    });

    render();
    showSend();
    showNotes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
