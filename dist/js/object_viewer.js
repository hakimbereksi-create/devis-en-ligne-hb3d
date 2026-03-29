// en dehors de toute fonction, on crée une référence globale
var viewer;

// 1) init du viewer + tout ce qui dépend du canvas ou de jQuery
$(document).ready(function() {
  var canvas = document.getElementById('cv');
  viewer = new JSC3D.Viewer(canvas);

  viewer.setParameter('SceneUrl', 'dist/models/40mmcube.stl');
  viewer.setParameter('InitRotationX', 20);
  viewer.setParameter('InitRotationY', 20);
  viewer.setParameter('InitRotationZ', 0);
  viewer.setParameter('ModelColor', '#898fa1');  // couleur par défaut
  viewer.setParameter('BackgroundColor1', '#FFFFFF');
  viewer.setParameter('BackgroundColor2', '#FFFFFF');
  viewer.setParameter('RenderMode', 'flat');
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

  // File loader
  $("#file").change(function(evt) {
    const file = evt.target.files[0];
    loadModelByPath(file);

    if (typeof majNomFichierPanier === 'function' && file) {
      majNomFichierPanier(file.name);
    }
  });

}); // <-- FIN du $(document).ready


// 2) mapping valeur métier -> couleur hex (en dehors de ready, global)
var hb3dColorMap = {
  pla_blanc:  '#F5F5F5',
  pla_noir:   '#222222',
  pla_gris:   '#9F9F9F',
  pla_rouge:  '#FF3333',
  pla_vert:   '#00B050',
  pla_bleu:   '#3366FF',
  pla_orange: '#ffa602',
  pla_jaune:  '#fae206',
  pla_purple: '#ad06fac9'
};

// 3) fonction pour piloter la couleur du viewer (globale aussi)
function setViewerColorFromCode(code) {
  console.log('[HB3D] setViewerColorFromCode', code, 'viewer=', viewer);
  if (!viewer) return;

  var hex = hb3dColorMap[code];
  console.log('[HB3D] hex choisi =', hex);
  if (!hex) return;

  viewer.setParameter('ModelColor', hex);
  viewer.update();
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