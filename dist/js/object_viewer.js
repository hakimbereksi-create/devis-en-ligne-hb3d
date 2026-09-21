console.log('[HB3D] OBJECT_VIEWER VERSION MEMOIRE CHARGÉE - TEST 2026-09-05 18:18');
// en dehors de toute fonction, on crée une référence globale
var viewer;

// 1) init du viewer + tout ce qui dépend du canvas ou de jQuery
$(document).ready(function() {
  var canvas = document.getElementById('cv');
  viewer = new JSC3D.Viewer(canvas);

  //viewer.setParameter('SceneUrl', 'dist/models/40mmcube.stl');
  viewer.setParameter('InitRotationX', 20);
  viewer.setParameter('InitRotationY', 20);
  viewer.setParameter('InitRotationZ', 0);
  viewer.setParameter('ModelColor', '#898fa1');  // couleur par défaut
  viewer.setParameter('BackgroundColor1', '#FFFFFF');
  viewer.setParameter('BackgroundColor2', '#FFFFFF');
  viewer.setParameter('RenderMode', 'smooth');
  viewer.setParameter('CreaseAngle', '35');
  viewer.setParameter('Definition', 'high');
  viewer.init();
  viewer.update();



  // =============================
  // tout ce qui utilise canvas, ctx, jQuery, etc. RESTE dans ce ready
  // =============================

  var ctx = canvas.getContext('2d');
  ctx.font = '12px Courier New';
  ctx.fillStyle = '#FF0000';

  // quantité
  $('#quantite').on('change keyup', function () {
    if (typeof hb3dVolumeCm3 !== 'undefined') {
      var dureeHeuresEstimee = 2;
      mettreAJourPrixDepuisVolume(hb3dVolumeCm3, dureeHeuresEstimee);
    }
  });

  // techno + matériau
  $('#techno, #materiau').on('change', function () {
    if (typeof hb3dVolumeCm3 !== 'undefined') {
      var dureeHeuresEstimee = 2;
      mettreAJourPrixDepuisVolume(hb3dVolumeCm3, dureeHeuresEstimee);
    }
  });

  // couleur (pour le prix / panier)
  $('input[name="couleur"]').on('change', function () {
    if (typeof hb3dVolumeCm3 !== 'undefined' && typeof mettreAJourPrixDepuisVolume === 'function') {
      var dureeHeuresEstimee = 2;
      mettreAJourPrixDepuisVolume(hb3dVolumeCm3, dureeHeuresEstimee);
    }
  });

  // Boutons de mode de rendu
  const modeButtons = document.querySelectorAll('#viewer-modes button');

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode'); // 'flat' | 'wireframe' | 'point'

      viewer.setRenderMode(mode);
      viewer.update();

      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  //Function Definitions
  //====================================================================
  function loadModelByPath($path) {
    viewer.enableDefaultInputHandler(true);
    viewer.replaceSceneFromUrl($path);
    viewer.update();
  }

  // Handlers
  //=====================================================================
  function majInfosViewerHTML() {
    var infoDiv = document.getElementById('viewer-info');
    if (!infoDiv || typeof hb3dVolumeCm3 === 'undefined') return;

    var dimXmm = (typeof hb3dDimX !== 'undefined') ? hb3dDimX : 0;
    var dimYmm = (typeof hb3dDimY !== 'undefined') ? hb3dDimY : 0;
    var dimZmm = (typeof hb3dDimZ !== 'undefined') ? hb3dDimZ : 0;

    var densitePLA = 1.24;
    var poidsGrammes = hb3dVolumeCm3 * densitePLA;

    infoDiv.textContent =
      'Dimensions (mm) : ' +
      dimXmm.toFixed(1) + ' x ' +
      dimYmm.toFixed(1) + ' x ' +
      dimZmm.toFixed(1) +
      ' — Volume : ' +
      hb3dVolumeCm3.toFixed(1) + ' cm³' +
      ' — Poids estimé : ' +
      poidsGrammes.toFixed(1) + ' g';
  }

  viewer.afterupdate = function () {
    if (typeof hb3dVolumeCm3 === 'undefined') {
      return;
    }

    var canvas = document.getElementById('cv');
    if (canvas) {
      var ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(10, 10, 320, 50);
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#FF0000';

        var dimXmm = (typeof hb3dDimX !== 'undefined') ? hb3dDimX : 0;
        var dimYmm = (typeof hb3dDimY !== 'undefined') ? hb3dDimY : 0;
        var dimZmm = (typeof hb3dDimZ !== 'undefined') ? hb3dDimZ : 0;

        var ligne1 = 'Box (mm): ' +
          dimXmm.toFixed(1) + ' x ' +
          dimYmm.toFixed(1) + ' x ' +
          dimZmm.toFixed(1);

        var ligne2 = 'Volume (cm3): ' + hb3dVolumeCm3.toFixed(1);

        ctx.fillText(ligne1, 10, 20);
        ctx.fillText(ligne2, 10, 35);
      }
    }

    majInfosViewerHTML();
  };

  // Execution space
  //=====================================================================

  //Interaction Tip init and behavior
  $("#tip").hide();
  $("#info").mouseenter(function(){
    $("#tip").fadeIn();
  });
  $("#info").mouseleave(function(){
    $("#tip").fadeOut("slow");
  });

  // Ancien système de liens de rendu (optionnel)
  /*
  $("a.rendermode").click(function(evt){
    $mode = $(this).attr("href").substr(1);
    viewer.setRenderMode($mode);
    viewer.update();
  });
  */

  // Affichage temporaire de l'aide de navigation "Interact"
$('#info').on('mouseenter', function () {
  $('#tip').stop(true, true).fadeIn(100);
});

$('.viewer-wrapper').on('mouseleave', function () {
  $('#tip').fadeOut(100);
});

// File loader historique.
// Il conserve l'aperçu initial, mais ne doit jamais écraser
// la scène multi-objets lorsqu'un fichier est déjà présent.
$("#file").change(function(evt) {
  const file = evt.target.files[0];

  if (!file) {
    return;
  }

  var fileKey = (
    typeof window.hb3dGetFileKey === 'function'
  )
    ? window.hb3dGetFileKey(file)
    : file.name + '|' + file.size + '|' + file.lastModified;

  var dejaDansLeLot = (window.hb3dSelectedFiles || []).some(function(existingFile) {
    var existingKey = (
      typeof window.hb3dGetFileKey === 'function'
    )
      ? window.hb3dGetFileKey(existingFile)
      : existingFile.name + '|' + existingFile.size + '|' + existingFile.lastModified;

    return existingKey === fileKey;
  });

  if (dejaDansLeLot) {
    console.log(
      '[HB3D] Aperçu mono-fichier ignoré : doublon déjà présent.',
      file.name
    );
    return;
  }

  loadModelByPath(file);

  if (typeof majNomFichierPanier === 'function') {
    majNomFichierPanier(file.name);
  }
});

}); // <-- FIN du $(document).ready


// 2) mapping valeur métier -> couleur hex (en dehors de ready, global)

var hb3dColorMap = {
  plablanc: '#F5F5F5',
  planoir: '#222222',
  plagris: '#9F9F9F',
  plarouge: '#FF3333',
  plavert: '#00B050',
  plableu: '#3366FF',
  plaorange: '#FFA602',
  plajaune: '#FAE206',
  plapurple: '#800080',

  slablanc: '#F5F5F5',
  slanoir: '#222222',
  slagris: '#9F9F9F'
};

// 3) fonction pour piloter la couleur du viewer (globale aussi)
function setViewerColorFromCode(code) {
  console.log('[HB3D] setViewerColorFromCode', code, 'viewer=', viewer);

  if (!viewer) {
    return;
  }

  var normalizedCode = String(code || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '');

var hex = hb3dColorMap[normalizedCode];

console.log(
  '[HB3D] code reçu =', code,
  '| code normalisé =', normalizedCode,
  '| hex choisi =', hex
);

  if (!hex) {
    console.warn('[HB3D] Couleur introuvable pour le code :', code);
    return;
  }

  var couleurRgb = parseInt(hex.slice(1), 16);
  var fileKey = window.hb3dFichierActifKey;
  var mesh = fileKey && window.hb3dMeshesParFichier
    ? window.hb3dMeshesParFichier[fileKey]
    : null;

  /*
   * Priorité 1 : futur mode multi-objets.
   * Le mesh est retrouvé directement grâce à la clé du fichier actif.
   */
  if (mesh && typeof mesh.setMaterial === 'function') {
    mesh.setMaterial(
      new JSC3D.Material(
        'hb3d-mat-' + fileKey,
        0,
        couleurRgb,
        0,
        false
      )
    );

    viewer.update();

    console.log(
      '[HB3D] Couleur appliquée au mesh enregistré :',
      fileKey,
      hex
    );

    return;
  }

  /*
   * Priorité 2 : mode actuel mono-objet.
   * On récupère le premier mesh de la scène chargée par
   * viewer.replaceSceneFromUrl(file), puis on lui applique
   * exactement le même matériau.
   */
  var scene = viewer.getScene ? viewer.getScene() : viewer.scene;
  var children = scene && scene.getChildren
    ? scene.getChildren()
    : (scene ? scene.children : null);

  if (children && children.length > 0) {
    var meshActif = children[0];

    if (meshActif && typeof meshActif.setMaterial === 'function') {
      meshActif.setMaterial(
        new JSC3D.Material(
          'hb3d-mat-actif',
          0,
          couleurRgb,
          0,
          false
        )
      );

      viewer.update();

      console.log(
        '[HB3D] Couleur appliquée au mesh courant de la scène :',
        hex
      );

      return;
    }
  }

  /*
   * Dernier recours : conserve le comportement précédent si
   * aucune scène/mesh n'est encore disponible.
   */
  viewer.setParameter('ModelColor', hex);
  viewer.update();

  console.warn(
    '[HB3D] Aucun mesh exploitable : couleur globale appliquée en secours.',
    hex
  );
}

// 4) branchement sur les gommettes (en dehors de ready, mais après HTML)
document.addEventListener('DOMContentLoaded', function () {
  console.log('[HB3D] DOMContentLoaded, init couleurs JSC3D');

  var checked = document.querySelector('.chip-color input[type="radio"][name="couleur"]:checked');
  console.log('[HB3D] Couleur initiale:', checked && checked.value);
  if (checked) {
    setViewerColorFromCode(checked.value);
  }

  document
    .querySelectorAll('.chip-color input[type="radio"][name="couleur"]')
    .forEach(function (input) {
      input.addEventListener('change', function () {
        if (this.checked) {
          console.log('[HB3D] Gommette changée ->', this.value);
          setViewerColorFromCode(this.value);
        }
      });
    });
});


// 5) fonction de prix (inchangée)
function mettreAJourPrixDepuisVolume(volumeCm3, dureeHeures) {
  const densitePLA = 1.24;
  const poidsGrammes = volumeCm3 * densitePLA;

  const inputQte = document.getElementById('quantite');
  const qte = inputQte ? Math.max(1, parseInt(inputQte.value || '1', 10)) : 1;

  const prixUnitaire = calculerPrixHT(poidsGrammes, dureeHeures);
  const prixTotal = prixUnitaire * qte;

  const prixFormate = prixTotal.toFixed(2).replace('.', ',') + ' €';

  const spanPrix = document.getElementById('prix-panier');
  if (spanPrix) spanPrix.textContent = prixFormate;

  const spanQte = document.getElementById('qte-panier');
  if (spanQte) spanQte.textContent = qte;

  const selectTechno   = document.getElementById('techno');
  const selectMateriau = document.getElementById('materiau');
  const radioCouleur   = document.querySelector('input[name="couleur"]:checked');

  const technoPanier   = document.getElementById('techno-panier');
  const materiauPanier = document.getElementById('materiau-panier');
  const couleurPanier  = document.getElementById('couleur-panier');

  if (technoPanier && selectTechno) {
    technoPanier.textContent = selectTechno.value;
  }
  if (materiauPanier && selectMateriau) {
    materiauPanier.textContent = selectMateriau.value;
  }
  if (couleurPanier && radioCouleur) {
    const labelCouleur = radioCouleur.parentElement.textContent.trim();
    couleurPanier.textContent = labelCouleur;
  }
}

// ------------------------------------------------------------
// HB3D - Configuration mémorisée pour chaque fichier du lot
// ------------------------------------------------------------
window.hb3dConfigParFichier = window.hb3dConfigParFichier || {};
window.hb3dFichierActifKey = window.hb3dFichierActifKey || null;

window.hb3dLireConfigurationActuelle = function() {
  var couleur = document.querySelector('input[name="couleur"]:checked');

  return {
    techno: document.getElementById('techno').value,
    materiau: document.getElementById('materiau').value,
    couleur: couleur ? couleur.value : 'plablanc',
    quantite: Math.max(
      1,
      parseInt(document.getElementById('quantite').value || '1', 10)
    )
  };
};

window.hb3dSauvegarderConfigurationActive = function() {
  if (window.hb3dRestaurationConfigurationEnCours) {
    return;
  }

  if (!window.hb3dFichierActifKey) {
    return;
  }

  clearTimeout(window.hb3dTimerSauvegardeConfiguration);

  window.hb3dTimerSauvegardeConfiguration = setTimeout(function() {
    if (window.hb3dRestaurationConfigurationEnCours) {
      return;
    }

    if (!window.hb3dFichierActifKey) {
      return;
    }

    window.hb3dConfigParFichier[window.hb3dFichierActifKey] =
      window.hb3dLireConfigurationActuelle();

    console.log(
      '[HB3D] Configuration mémorisée pour :',
      window.hb3dFichierActifKey,
      window.hb3dConfigParFichier[window.hb3dFichierActifKey]
    );

    if (typeof window.hb3dRafraichirDetailPanierLot === 'function') {
      window.hb3dRafraichirDetailPanierLot();
    }
  }, 100);
};
window.hb3dRestaurationConfigurationEnCours = false;

window.hb3dRestaurerConfigurationFichier = function(fileKey) {
  var config = window.hb3dConfigParFichier[fileKey];

  if (!config) {
    return;
  }

  var techno = document.getElementById('techno');
  var materiau = document.getElementById('materiau');
  var quantite = document.getElementById('quantite');

  window.hb3dRestaurationConfigurationEnCours = true;

  /*
   * 1. Technologie.
   * Déclenche les scripts déjà présents qui filtrent les couleurs
   * et reconstruisent les matériaux disponibles.
   */
  if (techno && techno.value !== config.techno) {
    techno.value = config.techno;
    $(techno).trigger('change');
  }

  /*
   * 2. Matériau.
   * Après le changement de technologie, la liste est reconstruite.
   */
  if (materiau) {
    var materiauExiste = Array.prototype.some.call(
      materiau.options,
      function(option) {
        return option.value === config.materiau;
      }
    );

    if (materiauExiste) {
      materiau.value = config.materiau;
      $(materiau).trigger('change');
    }
  }

  /*
   * 3. Couleur.
   * La couleur doit exister et ne pas être désactivée.
   */
  var couleur = document.querySelector(
    'input[name="couleur"][value="' + config.couleur + '"]:not(:disabled)'
  );

  if (couleur) {
    couleur.checked = true;
    $(couleur).trigger('change');
  }

  /*
   * 4. Quantité.
   */
  if (quantite) {
    quantite.value = config.quantite;
    $(quantite).trigger('input').trigger('change');
  }

  window.hb3dRestaurationConfigurationEnCours = false;

  if (typeof window.hb3dRecalculerPanier === 'function') {
    window.hb3dRecalculerPanier();
  }

  console.log(
    '[HB3D] Configuration restaurée pour :',
    fileKey,
    config
  );
};

// ------------------------------------------------------------
// HB3D - Calcul du volume d'un mesh JSC3D (STL ou OBJ)
// Le volume n'est fiable que pour un maillage fermé et cohérent.
// ------------------------------------------------------------
window.hb3dCalculerVolumeMeshMm3 = function(mesh) {
  if (!mesh || !mesh.vertexBuffer || !mesh.indexBuffer) {
    return 0;
  }

  var vertices = mesh.vertexBuffer;
  var indices = mesh.indexBuffer;
  var volumeSigne = 0;
  var face = [];

  function ajouterTriangle(i0, i1, i2) {
    var ax = Number(vertices[3 * i0]);
    var ay = Number(vertices[3 * i0 + 1]);
    var az = Number(vertices[3 * i0 + 2]);

    var bx = Number(vertices[3 * i1]);
    var by = Number(vertices[3 * i1 + 1]);
    var bz = Number(vertices[3 * i1 + 2]);

    var cx = Number(vertices[3 * i2]);
    var cy = Number(vertices[3 * i2 + 1]);
    var cz = Number(vertices[3 * i2 + 2]);

    if (
      !isFinite(ax) || !isFinite(ay) || !isFinite(az) ||
      !isFinite(bx) || !isFinite(by) || !isFinite(bz) ||
      !isFinite(cx) || !isFinite(cy) || !isFinite(cz)
    ) {
      return;
    }

    volumeSigne += (
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx)
    ) / 6;
  }

  function triangulerFace(indicesFace) {
    if (indicesFace.length < 3) {
      return;
    }

    for (var j = 1; j < indicesFace.length - 1; j += 1) {
      ajouterTriangle(
        indicesFace[0],
        indicesFace[j],
        indicesFace[j + 1]
      );
    }
  }

  for (var i = 0; i < indices.length; i += 1) {
    var indexSommet = Number(indices[i]);

    if (indexSommet === -1) {
      triangulerFace(face);
      face = [];
    } else if (indexSommet >= 0) {
      face.push(indexSommet);
    }
  }

  /*
   * Certains fichiers ou loaders n'ajoutent pas -1 après
   * la dernière face : on traite donc la face restante.
   */
  triangulerFace(face);

  return Math.abs(volumeSigne);
};

// Aperçu d'un fichier fichiers 3D choisi dans la liste multi-fichiers.
window.hb3dPreviewFile = function(file, callbackFin) {
  if (!file) {
    if (typeof callbackFin === 'function') {
      callbackFin(new Error('Fichier absent'), 0);
    }
    return;
  }

  if (!viewer) {
    console.error('[HB3D] Viewer JSC3D non initialisé.');

    if (typeof callbackFin === 'function') {
      callbackFin(new Error('Viewer JSC3D non initialisé'), 0);
    }

    return;
  }

  var fileKey = (
    typeof window.hb3dGetFileKey === 'function'
  )
    ? window.hb3dGetFileKey(file)
    : file.name + '|' + file.size + '|' + file.lastModified;

  window.hb3dFichierActifKey = fileKey;

  window.hb3dDemandeApercuId =
    (window.hb3dDemandeApercuId || 0) + 1;

  var demandeApercuId = window.hb3dDemandeApercuId;

  if (!window.hb3dConfigParFichier[fileKey]) {
    window.hb3dConfigParFichier[fileKey] =
      window.hb3dLireConfigurationActuelle();
  }

  window.hb3dRestaurerConfigurationFichier(fileKey);

  console.log(
    '[HB3D] Fichier actif pour configuration :',
    file.name,
    window.hb3dConfigParFichier[fileKey]
  );

  viewer.onloadingcomplete = function() {
    /*
     * Ignore les fins de chargement appartenant à une demande
     * plus ancienne que celle actuellement en cours.
     */
    if (demandeApercuId !== window.hb3dDemandeApercuId) {
      console.log(
        '[HB3D] Fin de chargement ancienne ignorée pour :',
        file.name
      );

      return;
    }

    var scene = viewer.getScene ? viewer.getScene() : viewer.scene;

var meshes = scene && typeof scene.getChildren === 'function'
  ? scene.getChildren()
  : (scene && scene.children ? scene.children : []);

var volumeMm3 = 0;

meshes.forEach(function(mesh) {
  volumeMm3 += window.hb3dCalculerVolumeMeshMm3(mesh);
});

/*
 * Mise à jour des variables historiques déjà utilisées ailleurs
 * dans ton ancien code et dans l'affichage du viewer.
 */
window.hb3dVolumeMm3 = volumeMm3;
window.hb3dVolumeCm3 = volumeMm3 / 1000;



    if (volumeMm3 > 0) {
      window.hb3dVolumesParFichier[fileKey] = volumeMm3;

      if (typeof window.hb3dMettreAJourVolumeLot === 'function') {
        window.hb3dMettreAJourVolumeLot();
      }

      if (typeof window.hb3dRafraichirDetailPanierLot === 'function') {
        window.hb3dRafraichirDetailPanierLot();
      }

      if (typeof window.hb3dRenderSelectedFiles === 'function') {
        window.hb3dRenderSelectedFiles();
      }

      console.log(
        '[HB3D] Volume mémorisé pour :',
        file.name,
        (volumeMm3 / 1000).toFixed(2) + ' cm³'
      );
    } else {
      console.warn(
        '[HB3D] Volume non disponible pour :',
        file.name
      );
    }


    /*
     * Très important : ce callback doit être dans onloadingcomplete.
     * Il est déclenché uniquement après le chargement réel du fichier.
     */

      /*
     * Le callback a servi pour ce fichier.
     * On le retire avant de passer au suivant ou de reconstruire le lot.
     */

    viewer.onloadingcomplete = null;

    if (typeof callbackFin === 'function') {
      callbackFin(null, volumeMm3);
    }
  };

  viewer.replaceSceneFromUrl(file);
  viewer.enableDefaultInputHandler(true);
  viewer.update();

  console.log('[HB3D] Modèle demandé dans le viewer :', file.name);
};

// ------------------------------------------------------------
// HB3D - Construction d'une scène JSC3D contenant tous les fichiers 3D
// validés/sélectionnés dans le lot.
// Test séparé : ne remplace pas encore hb3dPreviewFile.
// ------------------------------------------------------------
/*
 * Positions persistantes des pièces de la scène commune.
 * Chaque valeur est reliée à la clé unique du fichier fichiers 3D.
 */
window.hb3dPositionParFichier = window.hb3dPositionParFichier || {};

/*
 * Retourne la boîte englobante locale du mesh et ses dimensions.
 * Les vertexBuffer JSC3D sont une suite de coordonnées x, y, z.
 */
window.hb3dLireBoiteMesh = function(mesh) {
  var vertices = mesh && mesh.vertexBuffer ? mesh.vertexBuffer : [];

  var minX = Infinity;
  var minY = Infinity;
  var minZ = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  var maxZ = -Infinity;

  for (var i = 0; i < vertices.length; i += 3) {
    var x = Number(vertices[i]);
    var y = Number(vertices[i + 1]);
    var z = Number(vertices[i + 2]);

    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      continue;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (minX === Infinity) {
    return {
      minX: 0, minY: 0, minZ: 0,
      maxX: 0, maxY: 0, maxZ: 0,
      largeur: 0, hauteur: 0, profondeur: 0
    };
  }

  return {
    minX: minX,
    minY: minY,
    minZ: minZ,
    maxX: maxX,
    maxY: maxY,
    maxZ: maxZ,
    largeur: maxX - minX,
    hauteur: maxY - minY,
    profondeur: maxZ - minZ
  };
};


/*
 * Décale un mesh JSC3D de façon permanente pour sa scène courante.
 * La scène multi-fichiers 3D est recréée depuis les fichiers à chaque fois :
 * les vertexBuffer repartent donc de leurs coordonnées natives.
 */
window.hb3dDecalerMesh = function(mesh, dx, dy, dz) {
  if (!mesh || !mesh.vertexBuffer) {
    return;
  }

  for (var i = 0; i < mesh.vertexBuffer.length; i += 3) {
    mesh.vertexBuffer[i] += dx;
    mesh.vertexBuffer[i + 1] += dy;
    mesh.vertexBuffer[i + 2] += dz;
  }
};

window.hb3dAfficherSceneMultiObjets = function() {
  var fichiers = window.hb3dSelectedFiles || [];

  var hb3dPerfSceneMultiDebut = performance.now();

console.log(
  '[HB3D PERF] Début scène multi :',
  fichiers.length,
  'fichier(s)'
);

  if (!viewer) {
    console.error('[HB3D MULTI] Viewer JSC3D non initialisé.');
    return;
  }

  if (!fichiers.length) {
    console.warn('[HB3D MULTI] Aucun fichier dans hb3dSelectedFiles.');
    return;
  }

  /*
   * Chaque reconstruction de la scène recalcule les positions
   * automatiques depuis zéro. Cela élimine les offsets provenant
   * d'une reconstruction précédente.
   */
  window.hb3dPositionParFichier = {};

  /*
   * Les chargements fichiers 3D sont asynchrones. On stocke donc d'abord
   * les meshes disponibles, puis on les place dans l'ordre strict
   * de la liste fichiers — jamais dans l'ordre de fin des onload.
   */
  var meshesChargesParFichier = {};
  var fichiersTermines = 0;
  var margeEntrePieces = 20;

  console.log(
    '[HB3D MULTI] Ordre demandé :',
    fichiers.map(function(file) {
      return file.name;
    })
  );

  console.log(
    '[HB3D MULTI] Chargement préparatoire de',
    fichiers.length,
    'fichier(s).'
  );

  fichiers.forEach(function(file) {
    var fileKey = (typeof window.hb3dGetFileKey === 'function')
      ? window.hb3dGetFileKey(file)
      : file.name + '|' + file.size + '|' + file.lastModified;

    var extension = file.name.split('.').pop().toLowerCase();
var loader = null;

if (extension === 'stl') {
  loader = new JSC3D.StlLoader();
} else if (extension === 'obj') {
  loader = new JSC3D.ObjLoader();
} else {
  console.warn('[HB3D MULTI] Format non géré :', file.name);
  fichiersTermines += 1;
  terminerSiPret();
  return;
}

    loader.onload = function(sceneChargee) {
      var enfants = sceneChargee && typeof sceneChargee.getChildren === 'function'
        ? sceneChargee.getChildren()
        : [];

      var mesh = enfants.length ? enfants[0] : null;

      if (mesh) {
        meshesChargesParFichier[fileKey] = mesh;

        console.log(
          '[HB3D MULTI] fichiers 3D chargé :',
          file.name
        );
      } else {
        console.warn(
          '[HB3D MULTI] Aucun mesh dans la scène chargée :',
          file.name
        );
      }

      fichiersTermines += 1;
      terminerSiPret();
    };

    loader.onerror = function(erreur) {
      console.error(
        '[HB3D MULTI] Échec de chargement :',
        file.name,
        erreur
      );

      fichiersTermines += 1;
      terminerSiPret();
    };

    loader.loadFromUrl(file);
  });

  function terminerSiPret() {
    if (fichiersTermines !== fichiers.length) {
      return;
    }

    var sceneCommune = new JSC3D.Scene('hb3d-scene-multi');
    var meshesParFichier = {};
    var prochainX = 0;
    var meshesAjoutes = 0;

    /*
     * La boucle utilise toujours l'ordre du tableau fichiers :
     * Blaster, puis kayrou, puis Marvin, par exemple.
     */
    fichiers.forEach(function(file, index) {
      var fileKey = (typeof window.hb3dGetFileKey === 'function')
        ? window.hb3dGetFileKey(file)
        : file.name + '|' + file.size + '|' + file.lastModified;

      var mesh = meshesChargesParFichier[fileKey];

      if (!mesh) {
        console.warn(
          '[HB3D MULTI] fichiers 3D absent au placement :',
          file.name
        );
        return;
      }

      mesh.hb3dFileKey = fileKey;
      mesh.hb3dFileName = file.name;

      var boite = window.hb3dLireBoiteMesh(mesh);

      /*
       * Placement déterministe sur l'axe X :
       * chaque objet commence après le précédent,
       * avec une marge fixe.
       */
      var position = {
        x: prochainX - boite.minX,
        y: -boite.minY,
        z: -boite.minZ
      };

      window.hb3dPositionParFichier[fileKey] = position;

      window.hb3dDecalerMesh(
        mesh,
        position.x,
        position.y,
        position.z
      );

      prochainX = boite.maxX + position.x + margeEntrePieces;

      mesh.hb3dPosition = {
        x: position.x,
        y: position.y,
        z: position.z
      };

      var config = window.hb3dConfigParFichier
        ? window.hb3dConfigParFichier[fileKey]
        : null;

      var codeCouleur = config && config.couleur
        ? config.couleur
        : 'plablanc';

      var hex = hb3dColorMap[codeCouleur] || '#F5F5F5';
      var couleurRgb = parseInt(hex.slice(1), 16);

      mesh.setMaterial(
        new JSC3D.Material(
          'hb3d-mat-' + fileKey,
          0,
          couleurRgb,
          0,
          false
        )
      );

      sceneCommune.addChild(mesh);
      meshesParFichier[fileKey] = mesh;
      meshesAjoutes += 1;

      console.log(
        '[HB3D MULTI] Placement déterministe :',
        file.name,
        {
          index: index,
          x: position.x,
          y: position.y,
          z: position.z,
          largeur: boite.largeur,
          hauteur: boite.hauteur,
          profondeur: boite.profondeur,
          prochainX: prochainX
        }
      );
    });

    if (!meshesAjoutes || sceneCommune.isEmpty()) {
      console.error('[HB3D MULTI] Aucun fichiers 3D n’a pu être ajouté à la scène.');
      return;
    }

    window.hb3dMeshesParFichier = meshesParFichier;

    if (typeof window.hb3dMettreAJourVolumeLot === 'function') {
      window.hb3dMettreAJourVolumeLot();
    }

    if (typeof window.hb3dRafraichirDetailPanierLot === 'function') {
      window.hb3dRafraichirDetailPanierLot();
    }

    if (typeof window.hb3dRenderSelectedFiles === 'function') {
      window.hb3dRenderSelectedFiles();
    }

    viewer.replaceScene(sceneCommune);
    viewer.enableDefaultInputHandler(true);
    viewer.update();

    console.log(
    '[HB3D PERF] Scène multi prête :',
    (performance.now() - hb3dPerfSceneMultiDebut).toFixed(0),
    'ms'
    );

    console.log(
      '[HB3D MULTI] Scène déterministe affichée :',
      meshesAjoutes,
      'mesh(es).'
    );
  }
};

// ------------------------------------------------------------
// HB3D - Sélection d'une pièce de la scène commune au clic.
// Le clic restaure la configuration du mesh sélectionné.
// ------------------------------------------------------------
(function installerSelectionMeshAuClic() {
  var canvas = document.getElementById('cv');

  if (!canvas) {
    console.warn('[HB3D PICK] Canvas #cv introuvable.');
    return;
  }

  var pointDepart = null;
  var seuilGlissement = 7;

  canvas.addEventListener('mousedown', function(event) {
    pointDepart = {
      x: event.clientX,
      y: event.clientY
    };
  }, true);

  canvas.addEventListener('mouseup', function(event) {
    if (!pointDepart || !viewer) {
      pointDepart = null;
      return;
    }

    /*
     * Ne pas considérer une rotation comme un clic de sélection.
     * Si la souris a trop bougé entre pressage et relâchement,
     * on conserve le comportement normal de navigation JSC3D.
     */
    var dx = event.clientX - pointDepart.x;
    var dy = event.clientY - pointDepart.y;

    if (Math.sqrt((dx * dx) + (dy * dy)) > seuilGlissement) {
      pointDepart = null;
      return;
    }

    /*
     * viewer.pick attend directement les coordonnées client absolues
     * de l'événement souris. JSC3D fait lui-même la conversion vers
     * son buffer interne de sélection.
     */
         /*
     * Lecture directe du buffer de sélection JSC3D.
     * Cette méthode est validée par le test console :
     * elle identifie correctement le mesh sous le curseur.
     */
    var rect = canvas.getBoundingClientRect();

    var xBuffer = Math.floor(
      (event.clientX - rect.left) * viewer.frameWidth / rect.width
    );

    var yBuffer = Math.floor(
      (event.clientY - rect.top) * viewer.frameHeight / rect.height
    );

    xBuffer = Math.max(
      0,
      Math.min(viewer.frameWidth - 1, xBuffer)
    );

    yBuffer = Math.max(
      0,
      Math.min(viewer.frameHeight - 1, yBuffer)
    );

    var internalId = viewer.selectionBuffer[
      yBuffer * viewer.frameWidth + xBuffer
    ];

    var scene = viewer.getScene ? viewer.getScene() : viewer.scene;

    var meshes = scene && typeof scene.getChildren === 'function'
      ? scene.getChildren()
      : [];

    var mesh = meshes.find(function(item) {
      return item.internalId === internalId;
    });

    if (!mesh || !mesh.hb3dFileKey) {
      console.log('[HB3D PICK] Aucun objet sélectionné.');
      pointDepart = null;
      return;
    }

    var fileKey = mesh.hb3dFileKey;

    window.hb3dFichierActifKey = fileKey;

    /*
     * La fonction existante restaure technologie, matériau,
     * couleur et quantité ; elle déclenche ensuite les recalculs
     * déjà présents dans V2.
     */
    if (typeof window.hb3dRestaurerConfigurationFichier === 'function') {
      window.hb3dRestaurerConfigurationFichier(fileKey);
    }

    console.log(
      '[HB3D PICK] Pièce sélectionnée :',
      mesh.hb3dFileName,
      fileKey
    );

    pointDepart = null;
  }, true);

  console.log('[HB3D PICK] Sélection au clic installée.');
})();

/*
 * Analyse automatiquement tous les fichiers 3D sélectionnés, un à la fois.
 *
 * Important :
 * - un seul chargement JSC3D est lancé à la fois ;
 * - hb3dPreviewFile() conserve le fileKey correct dans son callback ;
 * - aucun volume n'est lu pendant que plusieurs chargements concurrents
 *   risquent d'écraser window.hb3dVolumeMm3.
 */
window.hb3dAnalyserTousLesFichiersPourDevis = function(callbackFin) {
  var files = (
    typeof window.hb3dGetSelectedFiles === 'function'
  )
    ? window.hb3dGetSelectedFiles()
    : [];

  var fichiers3d = files.filter(function(file) {
  return /\.(stl|obj)$/i.test(file.name);
  });

  if (!fichiers3d.length) {
    if (typeof callbackFin === 'function') {
      callbackFin();
    }
    return;
  }

  var index = 0;


  function analyserSuivant() {
    if (index >= fichiers3d.length) {


      if (typeof window.hb3dMettreAJourVolumeLot === 'function') {
        window.hb3dMettreAJourVolumeLot();
      }

      if (typeof window.hb3dRafraichirDetailPanierLot === 'function') {
        window.hb3dRafraichirDetailPanierLot();
      }

      if (typeof window.hb3dRenderSelectedFiles === 'function') {
        window.hb3dRenderSelectedFiles();
      }

 /*
     * L’analyse a fini : on remplace l’aperçu mono-fichier
     * par la scène commune contenant tout le lot.
     */

      if (typeof window.hb3dAfficherSceneMultiObjets === 'function') {
      window.hb3dAfficherSceneMultiObjets();
      }

      console.log(
        '[HB3D AUTO-ANALYSE] Analyse terminée :',
        Object.keys(window.hb3dVolumesParFichier).length,
        'fichier(s) mémorisé(s).'
      );

      if (typeof callbackFin === 'function') {
        callbackFin();
      }

      return;
    }

    var file = fichiers3d[index];
    var fileKey = (
      typeof window.hb3dGetFileKey === 'function'
    )
      ? window.hb3dGetFileKey(file)
      : file.name + '|' + file.size + '|' + file.lastModified;

    index += 1;

    /*
     * Un fichier déjà analysé ne doit pas être rechargé inutilement.
     */
    if (
      window.hb3dVolumesParFichier &&
      Object.prototype.hasOwnProperty.call(
        window.hb3dVolumesParFichier,
        fileKey
      ) &&
      Number(window.hb3dVolumesParFichier[fileKey]) > 0
    ) {
      analyserSuivant();
      return;
    }

    console.log(
      '[HB3D AUTO-ANALYSE] Analyse de',
      index + '/' + fichiers3d.length + ' :',
      file.name
    );

    /*
     * hb3dPreviewFile redéfinit onloadingcomplete.
     * On attend donc la fin de CE fichier avant de lancer le suivant.
     */
    window.hb3dPreviewFile(file, function(erreur, volumeMm3) {
  if (erreur) {
    console.error(
      '[HB3D AUTO-ANALYSE] Échec pour :',
      file.name,
      erreur
    );
    } else if (Number(volumeMm3) <= 0) {
    console.warn(
      '[HB3D AUTO-ANALYSE] Aucun volume exploitable pour :',
      file.name
    );
    }

    window.setTimeout(analyserSuivant, 50);
    });


  }

  analyserSuivant();
};

(function installerMemoireConfigurationParFichier() {
  var techno = document.getElementById('techno');
  var materiau = document.getElementById('materiau');
  var quantite = document.getElementById('quantite');
  var couleurs = document.querySelectorAll('input[name="couleur"]');

if (techno) {
  techno.addEventListener('change', function() {
    setTimeout(function() {
      window.hb3dSauvegarderConfigurationActive();
    }, 0);
  });
}

if (materiau) {
  materiau.addEventListener('change', function() {
    setTimeout(function() {
      window.hb3dSauvegarderConfigurationActive();
    }, 0);
  });
}

  if (quantite) {
    quantite.addEventListener('change', window.hb3dSauvegarderConfigurationActive);
    quantite.addEventListener('input', window.hb3dSauvegarderConfigurationActive);
  }

  couleurs.forEach(function(couleur) {
    couleur.addEventListener('change', function() {
      if (this.checked) {
        window.hb3dSauvegarderConfigurationActive();
      }
    });
  });

  console.log('[HB3D] Mémoire de configuration : écouteurs installés.');
})();

// ------------------------------------------------------------
// HB3D - Volumes des fichiers 3D analysés dans un lot multi-fichiers
// ------------------------------------------------------------

window.hb3dVolumesParFichier = window.hb3dVolumesParFichier || {};

window.hb3dGetFileKey = function(file) {
  if (!file) {
    return '';
  }

  return file.name + '|' + file.size + '|' + file.lastModified;
};

window.hb3dGetVolumeTotalMm3 = function() {
  var total = 0;

  Object.keys(window.hb3dVolumesParFichier).forEach(function(key) {
    total += Number(window.hb3dVolumesParFichier[key]) || 0;
  });

  return total;
};

window.hb3dMettreAJourVolumeLot = function() {
  var totalMm3 = window.hb3dGetVolumeTotalMm3();
  var totalCm3 = totalMm3 / 1000;

  var summary = document.getElementById('hb3d-volume-summary');

  if (summary) {
    var count = Object.keys(window.hb3dVolumesParFichier).length;
    var plural = count > 1 ? 's' : '';

    summary.innerHTML =
      '<span class="hb3d-files3d-count">' +
        'Fichier' + plural + ' 3D analysé' + plural +
        ' : <strong>' + count + '</strong>' +
      '</span>' +
      '<span class="hb3d-files3d-volume">' +
        'Volume total : <strong>' +
          totalCm3.toFixed(2).replace('.', ',') +
          ' cm³' +
        '</strong>' +
      '</span>';
  }

  console.log(
    '[HB3D] Volume total des fichiers 3D analysés :',
    totalMm3.toFixed(0) + ' mm³ / ' +
    totalCm3.toFixed(2) + ' cm³'
  );

  return totalMm3;
};


// ------------------------------------------------------------
// HB3D - Détail des fichiers dans le panier
// ------------------------------------------------------------
window.hb3dRafraichirDetailPanierLot = function() {
  var container = document.getElementById('hb3d-cart-file-details');

  if (!container) {
    return;
  }

  var files = (typeof window.hb3dGetSelectedFiles === 'function')
    ? window.hb3dGetSelectedFiles()
    : [];

  if (!files.length) {
    container.innerHTML =
      '<div class="hb3d-cart-file-empty">' +
      'Les détails des fichiers analysés apparaîtront ici.' +
      '</div>';
    return;
  }

  var colorMap = {
    plablanc: '#F5F5F5',
    planoir: '#222222',
    plagris: '#9F9F9F',
    plarouge: '#FF3333',
    plavert: '#00B050',
    plableu: '#3366FF',
    plaorange: '#FFA602',
    plajaune: '#FAE206',
    plapurple: '#800080',
    slablanc: '#F5F5F5',
    slanoir: '#222222',
    slagris: '#9F9F9F'
  };

  var colorLabels = {
    plablanc: 'Blanc',
    planoir: 'Noir',
    plagris: 'Gris',
    plarouge: 'Rouge',
    plavert: 'Vert',
    plableu: 'Bleu',
    plaorange: 'Orange',
    plajaune: 'Jaune',
    plapurple: 'Violet',
    slablanc: 'Blanc',
    slanoir: 'Noir',
    slagris: 'Gris'
  };

  var tarifs = {
    FDM: {
      PLA: { A: 12.99, B: 0.224 },
      PETG: { A: 14.50, B: 0.245 },
      ABS: { A: 15.50, B: 0.255 },
      ASA: { A: 16.50, B: 0.270 },
      TPU: { A: 18.50, B: 0.295 },
      'PA-CF': { A: 23.00, B: 0.345 },
      HIPS: { A: 14.20, B: 0.238 },
      PET: { A: 14.00, B: 0.235 }
    },
    SLA: {
      'Résine Standard': { A: 19.44, B: 0.467 },
      'Résine Tough': { A: 24.00, B: 0.560 },
      'Résine Flexible': { A: 26.00, B: 0.620 },
      'Résine Calcinable': { A: 29.00, B: 0.700 }
    },
    SLS: {
      'Nylon PA12': { A: 30.00, B: 0.800 }
    }
  };

  var html =
    '<div class="hb3d-cart-file-title">Détail du lot</div>' +
    '<div class="hb3d-cart-table-wrap">' +
      '<table class="hb3d-cart-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Fichier</th>' +
            '<th>Configuration</th>' +
            '<th>Qté</th>' +
            '<th>Prix unit.</th>' +
            '<th>Sous-total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  var analysedCount = 0;

  files.forEach(function(file) {
    var fileKey = (typeof window.hb3dGetFileKey === 'function')
      ? window.hb3dGetFileKey(file)
      : file.name + '|' + file.size + '|' + file.lastModified;

    var volumeMm3 = (window.hb3dVolumesParFichier &&
      Object.prototype.hasOwnProperty.call(
        window.hb3dVolumesParFichier,
        fileKey
      ))
      ? Number(window.hb3dVolumesParFichier[fileKey]) || 0
      : 0;

    if (volumeMm3 <= 0) {
      return;
    }

    analysedCount += 1;

    if (!window.hb3dConfigParFichier) {
      window.hb3dConfigParFichier = {};
    }

    if (!window.hb3dConfigParFichier[fileKey]) {
      window.hb3dConfigParFichier[fileKey] = {
        techno: 'FDM',
        materiau: 'PLA',
        couleur: 'plablanc',
        quantite: 1
      };
    }

    var config = window.hb3dConfigParFichier[fileKey];

    var couleurCode = config.couleur || 'plablanc';
    var couleurHex = colorMap[couleurCode] || '#F5F5F5';
    var couleurLabel = colorLabels[couleurCode] || couleurCode;
    var volumeCm3 = volumeMm3 / 1000;
    var quantite = Math.max(1, parseInt(config.quantite || '1', 10));

    config.quantite = quantite;

    var technoTarifs = tarifs[config.techno];
    var tarif = technoTarifs
      ? technoTarifs[config.materiau]
      : null;

    var prixUnitaire = null;
    var sousTotal = null;

    if (tarif) {
      prixUnitaire = tarif.A + (tarif.B * volumeCm3);
      sousTotal = prixUnitaire * quantite;
    }

    var prixUnitaireTexte = 'Sur demande';
    var sousTotalTexte = 'Sur demande';

    if (prixUnitaire !== null && sousTotal !== null) {
      prixUnitaireTexte =
        prixUnitaire.toFixed(2).replace('.', ',') + ' €';

      sousTotalTexte =
        sousTotal.toFixed(2).replace('.', ',') + ' €';
    }

    html +=
      '<tr>' +
        '<td class="hb3d-cart-table-file" title="' +
          file.name.replace(/"/g, '&quot;') +
        '">' +
          file.name +
        '</td>' +
        '<td class="hb3d-cart-table-config">' +
          config.techno + ' · ' +
          config.materiau + ' · ' +
          '<span class="hb3d-cart-file-swatch" style="background:' +
            couleurHex +
            ';"></span>' +
          couleurLabel +
        '</td>' +
        '<td class="hb3d-cart-quantity-cell">' +
          '<div class="hb3d-cart-quantity-control">' +
            '<button type="button" ' +
              'class="hb3d-cart-quantity-btn hb3d-cart-quantity-minus" ' +
              'data-file-key="' + fileKey.replace(/"/g, '&quot;') + '" ' +
              'aria-label="Diminuer la quantité de ' +
                file.name.replace(/"/g, '&quot;') +
              '">−</button>' +
            '<span class="hb3d-cart-quantity-value">' +
              quantite +
            '</span>' +
            '<button type="button" ' +
              'class="hb3d-cart-quantity-btn hb3d-cart-quantity-plus" ' +
              'data-file-key="' + fileKey.replace(/"/g, '&quot;') + '" ' +
              'aria-label="Augmenter la quantité de ' +
                file.name.replace(/"/g, '&quot;') +
              '">+</button>' +
          '</div>' +
        '</td>' +
        '<td>' + prixUnitaireTexte + '</td>' +
        '<td>' + sousTotalTexte + '</td>' +
      '</tr>';
  });

  html +=
        '</tbody>' +
      '</table>' +
    '</div>';

  if (analysedCount === 0) {
    html =
      '<div class="hb3d-cart-file-empty">' +
      'Aucun fichier 3D n’a encore été analysé pour le devis.' +
      '</div>';
  }

  container.innerHTML = html;

  /*
   * Événements ajoutés après la génération du tableau :
   * − diminue la quantité sans descendre sous 1.
   * + augmente la quantité de la ligne concernée.
   */
  var minusButtons = container.querySelectorAll(
    '.hb3d-cart-quantity-minus'
  );

  var plusButtons = container.querySelectorAll(
    '.hb3d-cart-quantity-plus'
  );

  function modifierQuantiteDepuisPanier(event, variation) {
    var fileKey = event.currentTarget.getAttribute('data-file-key');

    if (!fileKey || !window.hb3dConfigParFichier) {
      return;
    }

    var config = window.hb3dConfigParFichier[fileKey];

    if (!config) {
      return;
    }

    var ancienneQuantite = Math.max(
      1,
      parseInt(config.quantite || '1', 10)
    );

    var nouvelleQuantite = Math.max(
      1,
      ancienneQuantite + variation
    );

    if (nouvelleQuantite === ancienneQuantite) {
      return;
    }

    config.quantite = nouvelleQuantite;

    /*
     * Si le modèle modifié est actuellement sélectionné,
     * le champ quantité de la configuration est synchronisé.
     */
    if (window.hb3dFichierActifKey === fileKey) {
      var inputQuantite = document.getElementById('quantite');

      if (inputQuantite) {
        inputQuantite.value = nouvelleQuantite;
      }

      var quantitePanier = document.getElementById('qte-panier');

      if (quantitePanier) {
        quantitePanier.textContent = nouvelleQuantite;
      }
    }

    /*
     * Reconstruit uniquement le tableau / panier.
     * La scène 3D et les fichiers ne sont pas rechargés.
     */
    window.hb3dRafraichirDetailPanierLot();

    /*
     * Met aussi à jour le total si l'estimation a déjà été demandée.
     */
    if (typeof window.hb3dRecalculerPanier === 'function') {
      window.hb3dRecalculerPanier();
    }

    console.log(
      '[HB3D] Quantité modifiée depuis le panier :',
      fileKey,
      nouvelleQuantite
    );
  }

  minusButtons.forEach(function(button) {
    button.addEventListener('click', function(event) {
      modifierQuantiteDepuisPanier(event, -1);
    });
  });

  plusButtons.forEach(function(button) {
    button.addEventListener('click', function(event) {
      modifierQuantiteDepuisPanier(event, 1);
    });
  });
};

// ------------------------------------------------------------
// HB3D - Prix indicatif d'un fichiers 3D pour l'affichage par ligne.
// Les paramètres restent communs à l'ensemble du lot.
// ------------------------------------------------------------

window.hb3dCalculerPrixFichier = function(volumeMm3) {
  var techno = document.getElementById('techno');
  var materiau = document.getElementById('materiau');

  if (!techno || !materiau) {
    return null;
  }

  var tarifs = {
    FDM: {
      PLA: { A: 12.99, B: 0.224 },
      PETG: { A: 14.50, B: 0.245 },
      ABS: { A: 15.50, B: 0.255 },
      ASA: { A: 16.50, B: 0.270 },
      TPU: { A: 18.50, B: 0.295 },
      'PA-CF': { A: 23.00, B: 0.345 },
      HIPS: { A: 14.20, B: 0.238 },
      PET: { A: 14.00, B: 0.235 }
    },
    SLA: {
      'Résine Standard': { A: 19.44, B: 0.467 },
      'Résine Tough': { A: 24.00, B: 0.560 },
      'Résine Flexible': { A: 26.00, B: 0.620 },
      'Résine Calcinable': { A: 29.00, B: 0.700 }
    },
    SLS: {
      'Nylon PA12': { A: 30.00, B: 0.800 }
    }
  };

  var technoTarifs = tarifs[techno.value];
  var tarif = technoTarifs ? technoTarifs[materiau.value] : null;
  var volumeCm3 = (Number(volumeMm3) || 0) / 1000;

  if (!tarif || volumeCm3 <= 0) {
    return null;
  }

  return tarif.A + (tarif.B * volumeCm3);
};