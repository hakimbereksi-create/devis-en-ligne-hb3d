// en dehors de toute fonction, on crée une référence globale
var viewer;

$(document).ready(function() {

    var canvas = document.getElementById('cv');
    // on affecte à la variable globale
    viewer = new JSC3D.Viewer(canvas);

    viewer.setParameter('SceneUrl', 'dist/models/40mmcube.stl');
    viewer.setParameter('InitRotationX', 20);
    viewer.setParameter('InitRotationY', 20);
    viewer.setParameter('InitRotationZ', 0);
    viewer.setParameter('ModelColor', '#4082b8');
    viewer.setParameter('BackgroundColor1', '#FFFFFF');
    viewer.setParameter('BackgroundColor2', '#FFFFFF');
    viewer.setParameter('RenderMode', 'flat');
    viewer.setParameter('Definition', 'high');
    viewer.init();
    viewer.update();

    var ctx = canvas.getContext('2d');
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#FF0000';
    
    // >>> ICI : écouteur sur la quantité, à l'intérieur du même ready <<<
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

// couleur
$('input[name="couleur"]').on('change', function () {
  if (typeof hb3dVolumeCm3 !== 'undefined' && typeof mettreAJourPrixDepuisVolume === 'function') {
    var dureeHeuresEstimee = 2;
    mettreAJourPrixDepuisVolume(hb3dVolumeCm3, dureeHeuresEstimee);
  }
});

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

  // === mise à jour techno / matériau / couleur ===
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

    // Boutons de mode de rendu
    const modeButtons = document.querySelectorAll('#viewer-modes button');

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-mode'); // 'flat' | 'wireframe' | 'point'

    // utiliser l'API runtime dédiée
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


    //END Function Definitions
    //====================================================================


    // Handlers
    //=====================================================================
        function majInfosViewerHTML() {
        var infoDiv = document.getElementById('viewer-info');
        if (!infoDiv || typeof hb3dVolumeCm3 === 'undefined') return;

        var dimXmm = (typeof hb3dDimX !== 'undefined') ? hb3dDimX : 0;
        var dimYmm = (typeof hb3dDimY !== 'undefined') ? hb3dDimY : 0;
        var dimZmm = (typeof hb3dDimZ !== 'undefined') ? hb3dDimZ : 0;

        // poids estimé à partir du volume (même densité que pour le prix)
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



    //END Handlers
    //====================================================================


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

    // Ancien système de liens de rendu : plus utile si tu n'as plus de <a class="rendermode">
    // Tu peux le laisser commenté ou le supprimer complètement :
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

        // mise à jour du nom dans le panier
        if (typeof majNomFichierPanier === 'function' && file) {
            majNomFichierPanier(file.name);
        }
    });

    //

});
