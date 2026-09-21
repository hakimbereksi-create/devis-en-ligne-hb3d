$(document).ready(function() {

  // -------------------------
  // Fonctions d'affichage
  // -------------------------

  function setUploadProgress(percent) {
    percent = Math.max(0, Math.min(100, percent));
    console.log('setUploadProgress called with', percent);
    // chiffre au centre du disque
    $('#hb3d-upload-percent').text(percent + '%');

    // remplissage du disque
    document.querySelector('.circular-upload').style.setProperty('--progress', percent);
  }

  function setUploadStatus(text) {
    $('#hb3d-upload-text').html(text);
  }

  var hb3dViewerNotificationTimer = null;

function showHb3dViewerNotification(message) {
  var $notification = $('#hb3d-viewer-notification');
  var $message = $('#hb3d-viewer-notification-text');

  if (!$notification.length || !$message.length) {
    console.warn('[HB3D] Zone de notification viewer introuvable.');
    return;
  }

  $message.text(message);

  $notification
    .attr('aria-hidden', 'false')
    .addClass('is-visible');

  window.clearTimeout(hb3dViewerNotificationTimer);

  hb3dViewerNotificationTimer = window.setTimeout(function() {
    $notification
      .removeClass('is-visible')
      .attr('aria-hidden', 'true');
  }, 5000);
}

$('#hb3d-viewer-notification-close').on('click', function() {
  window.clearTimeout(hb3dViewerNotificationTimer);

  $('#hb3d-viewer-notification')
    .removeClass('is-visible')
    .attr('aria-hidden', 'true');
});

  // -------------------------
  // Gestion des fichiers
  // -------------------------

var selectedFiles = [];

window.hb3dSelectedFiles = selectedFiles;

var MAX_FILES = 5;
var MAX_FILE_SIZE = 250 * 1024 * 1024;
var LARGE_FILE_SIZE = 50 * 1024 * 1024;
var ALLOWED_EXTENSIONS = ['stl', 'obj'];

$('#file').on('change', prepareUpload);

$("#loading").hide();
setUploadProgress(0);
setUploadStatus('En attente de fichier<br>Fichier 0 / 0');

function getFileKey(file) {
  return file.name + '|' + file.size + '|' + file.lastModified;
}

function getExtension(fileName) {
  var parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' Ko';
  }

  return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
}

function updateFilesStatus() {
  var count = selectedFiles.length;
  var plural = count > 1 ? 's' : '';

  var $lotPanier = $('#lot-fichiers-panier');

if ($lotPanier.length) {
  if (count === 0) {
    $lotPanier.text('Aucun fichier sélectionné');
  } else {
    $lotPanier.text(
      count + ' fichier' + plural + ' sélectionné' + plural
    );
  }
}

  $('#hb3d-files-summary').text(
    count === 0
      ? 'Aucun fichier sélectionné — 0 / ' + MAX_FILES
      : count + ' fichier' + plural + ' sélectionné' + plural + ' — ' + count + ' / ' + MAX_FILES
  );

  if (count === 0) {
    setUploadProgress(0);
    setUploadStatus('En attente de fichier<br>Fichier 0 / 0');
  } else {
    setUploadProgress(0);
    setUploadStatus(
      count + ' fichier' + plural + ' prêt' + plural + ' à être envoyé' +
      '<br>Fichier ' + count + ' / ' + MAX_FILES
    );
  }
}

function renderSelectedFiles() {
  var $list = $('#hb3d-files-list');
  $list.empty();

  selectedFiles.forEach(function(file, index) {
    var fileKey = '';

    if (typeof window.hb3dGetFileKey === 'function') {
      fileKey = window.hb3dGetFileKey(file);
    } else {
      fileKey = file.name + '|' + file.size + '|' + file.lastModified;
    }

    var volumeMm3 = (
      window.hb3dVolumesParFichier &&
      Object.prototype.hasOwnProperty.call(window.hb3dVolumesParFichier, fileKey)
    )
      ? Number(window.hb3dVolumesParFichier[fileKey]) || 0
      : 0;

    var $row = $('<div>', {
      class: 'hb3d-file-row'
    });

    var $name = $('<span>', {
      class: 'hb3d-file-name',
      title: file.name,
      text: (index + 1) + '. ' + file.name + ' — ' + formatFileSize(file.size)
    });

    var $details = $('<span>', {
      class: 'hb3d-file-details'
    });

    if (volumeMm3 > 0) {
      var prixFichier = typeof window.hb3dCalculerPrixFichier === 'function'
        ? window.hb3dCalculerPrixFichier(volumeMm3)
        : null;

      var texteDetails =
        'Volume : ' + (volumeMm3 / 1000).toFixed(2).replace('.', ',') + ' cm³';

      if (prixFichier !== null) {
        texteDetails +=
          ' — Estimation : ' +
          prixFichier.toFixed(2).replace('.', ',') +
          ' €';
      }

    $details.text(texteDetails);
    } else {
    $details
    .addClass('pending')
    .text('Analyse du fichier 3D en cours…');
    }

    var $actions = $('<div>', {
      class: 'hb3d-file-actions'
    });

    var extension = getExtension(file.name);



    var $remove = $('<button>', {
      type: 'button',
      class: 'hb3d-file-remove',
      text: 'Retirer'
    });

    $remove.on('click', function() {
      if (
        fileKey &&
        window.hb3dVolumesParFichier &&
        Object.prototype.hasOwnProperty.call(window.hb3dVolumesParFichier, fileKey)
      ) {
        delete window.hb3dVolumesParFichier[fileKey];

        if (typeof window.hb3dMettreAJourVolumeLot === 'function') {
          window.hb3dMettreAJourVolumeLot();
        }
      }

      selectedFiles.splice(index, 1);
      renderSelectedFiles();
      updateFilesStatus();

      if (typeof window.hb3dRafraichirDetailPanierLot === 'function') {
         window.hb3dRafraichirDetailPanierLot();
      }

      if (selectedFiles.length === 0) {
  $('#file').val('');
}

/*
 * Le panier est déjà mis à jour ci-dessus. Il faut maintenant
 * reconstruire la scène JSC3D à partir des seuls fichiers restants,
 * sinon le mesh retiré reste affiché dans l'ancienne scène.
 */
if (selectedFiles.length > 0) {
  if (typeof window.hb3dAfficherSceneMultiObjets === 'function') {
    window.hb3dAfficherSceneMultiObjets();
  } else {
    console.warn(
      '[HB3D MULTI] Reconstruction impossible après retrait : fonction introuvable.'
    );
  }
} else if (window.viewer) {
  /*
   * Cas du dernier fichier retiré : vider complètement la scène.
   * Une scène vide JSC3D évite de conserver le dernier mesh affiché.
   */
  window.viewer.replaceScene(new JSC3D.Scene('hb3d-scene-vide'));
  window.viewer.update();
  window.hb3dMeshesParFichier = {};
  window.hb3dPositionParFichier = {};
  window.hb3dFichierActifKey = null;
}

console.log('[HB3D] Fichier retiré :', file.name);

      console.log('[HB3D] Fichier retiré :', file.name);
    });

    $actions.append($remove);

    $row.append($name);
    $row.append($details);
    $row.append($actions);
    $list.append($row);
  });
}

window.hb3dRenderSelectedFiles = renderSelectedFiles;

window.hb3dGetSelectedFiles = function() {
  return selectedFiles.slice();
};

function prepareUpload(event) {
  var incomingFiles = Array.prototype.slice.call(event.target.files || []);
  var errors = [];
  var warnings = [];
  var addedCount = 0;

  incomingFiles.forEach(function(file) {
    var extension = getExtension(file.name);

    var isDuplicate = selectedFiles.some(function(existingFile) {
      return getFileKey(existingFile) === getFileKey(file);
    });

    if (isDuplicate) {
    var messageDoublon = '⚠ ' + file.name + ' est déjà présent dans votre lot.';

    errors.push(messageDoublon);

   /*
   * Message certain côté client : il ne dépend ni du CSS,
   * ni de la zone de statut, ni de JSC3D.
   */
    showHb3dViewerNotification(messageDoublon);

   return;
   }

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(file.name + ' : format non supporté. Utilisez STL ou OBJ.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
    errors.push(
    file.name +
    ' : fichier trop volumineux (maximum 250 Mo). ' +
    'Merci de nous contacter pour les fichiers plus volumineux.'
    );
      return;
    }
    if (file.size > LARGE_FILE_SIZE) {
  warnings.push(
    file.name +
    ' : fichier volumineux (' +
    formatFileSize(file.size) +
    '). Son analyse peut prendre quelques instants.'
  );
}

    if (isDuplicate) {
      errors.push(file.name + ' : fichier déjà ajouté.');
      return;
    }

    if (selectedFiles.length >= MAX_FILES) {
      errors.push(file.name + ' : limite de ' + MAX_FILES + ' fichiers atteinte.');
      return;
    }

    selectedFiles.push(file);
    addedCount++;
  });

  $('#file').val('');

  renderSelectedFiles();
  updateFilesStatus();

  if (selectedFiles.length > 0 && typeof majNomFichierPanier === 'function') {
    majNomFichierPanier(selectedFiles[0].name);
  }

      /*
     * Analyse automatique des STL nouvellement sélectionnés.
     * Chaque fichier sera intégré au total et au tableau du volet 3
     * sans clic sur « Valider pour le devis ».
     */
    if (
      addedCount > 0 &&
      typeof window.hb3dAnalyserTousLesFichiersPourDevis === 'function'
    ) {
      window.hb3dAnalyserTousLesFichiersPourDevis(function() {
        /*
         * Lorsque tous les volumes sont mémorisés, on revient à la scène
         * multi-objets afin de conserver l'aperçu global interactif.
         */
        if (typeof window.hb3dAfficherSceneMultiObjets === 'function') {
          window.hb3dAfficherSceneMultiObjets();
        }
      });
    }

var statusMessages = [];

if (errors.length > 0) {
  statusMessages.push(
    'Certains fichiers ne peuvent pas être ajoutés :<br>' +
    errors.join('<br>')
  );
}

if (warnings.length > 0) {
  statusMessages.push(
    'Fichier(s) ajouté(s) avec avertissement :<br>' +
    warnings.join('<br>')
  );
}

if (statusMessages.length > 0) {
  var messageStatut = statusMessages.join('<br><br>');

  /*
   * On laisse finir tous les rafraîchissements du lot et du viewer,
   * puis on force l'affichage du message de validation/refus.
   */
  window.setTimeout(function() {
    setUploadStatus(messageStatut);
  }, 100);

  /*
   * Retour automatique au statut normal du lot après 5 secondes.
   */
  window.setTimeout(function() {
    updateFilesStatus();
  }, 5100);

} else if (addedCount > 0) {
  console.log('[HB3D] Fichiers ajoutés à la sélection :', addedCount);
}

} // fin de prepareUpload(event)

  // Bouton d'upload (adapter l'ID si besoin)
  $('#btn-upload').on('click', uploadFiles);

  // -------------------------
  // Upload des fichiers
  // -------------------------

  // couleur (pour la synchro panier)
$('input[name="couleur"]').on('change', function () {
  const $chip   = $(this).closest('.chip-color');
  const label   = $chip.find('.swatch-label').text().trim();
  const color   = $chip.find('.swatch').css('background-color'); // ou data-color

  // MAJ texte dans le panier
  $('#couleur-panier').text(label);

  // MAJ pastille dans le panier
  $('.swatch-panier').css('background-color', color);
});


  function uploadFiles(event) {
    event.stopPropagation();
    event.preventDefault();

    if (!selectedFiles || !selectedFiles.length) {
      setUploadStatus('Aucun fichier sélectionné<br>Veuillez choisir un fichier');
      return;
    }

    $("#loading").show();

    var data = new FormData();
    $.each(selectedFiles, function(key, value) {
      data.append(key, value);
      console.log(value);
    });

    $.ajax({
      xhr: function() {
        var xhr = new window.XMLHttpRequest();

        xhr.upload.addEventListener("progress", function(evt) {
          if (evt.lengthComputable) {
            var realPercent = parseInt((evt.loaded / evt.total) * 100, 10);

            var displayed = realPercent;

            // on plafonne l'affichage à 90 % pendant l'upload
            if (realPercent >= 100) {
              displayed = 90;
            } else if (realPercent > 90) {
              displayed = 90;
            }

            setUploadProgress(displayed);
            setUploadStatus('Upload en cours<br>' + displayed + ' %');
          }
        }, false);

        return xhr;
      },

      url: 'https://unamusable-nonacidic-wilfred.ngrok-free.dev/devis/php/upload.php?files',
      type: 'POST',
      data: data,
      cache: false,
      dataType: 'json',
      processData: false,
      contentType: false,

      success: function(data, textStatus, jqXHR) {
        if (typeof data.error === 'undefined') {

          // animation de 90 à 100 %
          var current = 90;
          var interval = setInterval(function() {
            current += 2;

            if (current >= 100) {
              current = 100;
              clearInterval(interval);

              setUploadProgress(current);
              setUploadStatus('Upload terminé<br>Traitement de la commande...');

              submitForm(event, data);
            } else {
              setUploadProgress(current);
              setUploadStatus('Upload en cours<br>' + current + ' %');
            }
          }, 120);

        } else {
          console.log('1.ERRORS: ' + data.error);
          setUploadStatus('Erreur lors de l\'upload<br>' + data.error);
          $("#loading").hide();
        }
      },

      error: function(jqXHR, textStatus, errorThrown) {
        console.log('2.ERRORS: ' + errorThrown);
        $("#loading").hide();
        setUploadStatus('Erreur réseau pendant l\'upload<br>Veuillez réessayer');
      }
    });
  }

 // -------------------------
// Submit du formulaire
// -------------------------
function submitForm(event, data) {
  console.log('submitForm called', data);

  var $form = $("#form");

  // --- HB3D: synchroniser les champs cachés avec le panier ---
  var qteText  = $('#qte-panier').text().trim();
  var prixText = $('#prix-panier').text().trim();

  console.log('qte-panier =', qteText, 'prix-panier =', prixText);

  if (qteText !== '') {
    $('#quantite').val(qteText);
  }
  if (prixText !== '') {
    $('#prix_affiche').val(prixText);
  }
  // ------------------------------------------------------------
// --- HB3D: synchroniser techno / matériau / couleur ---

// Valeurs techniques issues des listes de choix.
var techValue     = $('#techno').val() || '';
var materialValue = $('#materiau').val() || '';

// Code interne de la couleur sélectionnée, par exemple : "plablanc".
var colorValue = $('input[name="couleur"]:checked').val() || '';

// Libellé lisible présenté au client, par exemple : "PLA Blanc".
// Si le libellé est introuvable, on garde le code interne comme solution de secours.
var colorLabel = $('input[name="couleur"]:checked')
  .closest('.chip-color')
  .find('.swatch-label')
  .text()
  .trim() || colorValue;

// Mise à jour des champs cachés transmis à php/submit.php.
$('#tech_hidden').val(techValue);
$('#material_hidden').val(materialValue);
$('#color_hidden').val(colorLabel);

// Journal de diagnostic visible dans F12 > Console.
console.log(
  'tech =', techValue,
  'material =', materialValue,
  'color code =', colorValue,
  'color label =', colorLabel
);
  // ------------------------------------------------------

  // On sérialise le formulaire APRES mise à jour des champs.
var formData = $form.serialize();

function ajouterChampSubmit(nom, valeur) {
  formData += '&' + encodeURIComponent(nom) + '=' +
    encodeURIComponent(valeur === undefined || valeur === null ? '' : valeur);
}

// Les valeurs sont ajoutées explicitement, même si certains champs sont
// visuellement placés hors de #form.
ajouterChampSubmit('email', $('#email').val() || '');
ajouterChampSubmit('clientemail', $('#email').val() || '');
ajouterChampSubmit('nom', $('#nom').val() || '');
ajouterChampSubmit('tel', $('#tel').val() || '');
ajouterChampSubmit('societe', $('#societe').val() || '');
ajouterChampSubmit('commentaire', $('#commentaire').val() || '');
ajouterChampSubmit('message', $('#message').val() || '');
ajouterChampSubmit('quantite', $('#quantite').val() || qteText || '');
ajouterChampSubmit('prix_affiche', $('#prix_affiche').val() || prixText || '');
ajouterChampSubmit('techno', techValue);
ajouterChampSubmit('materiau', materialValue);
ajouterChampSubmit('couleur', colorValue);
ajouterChampSubmit('tech_hidden', $('#tech_hidden').val() || techValue);
ajouterChampSubmit('material_hidden', $('#material_hidden').val() || materialValue);
ajouterChampSubmit('color_hidden', $('#color_hidden').val() || colorLabel);

console.log('HB3D DEBUG données envoyées à submit.php :', formData);


  // Ajouter les notes (volet 2, hors form)
  var notes = $('#notes').val() || '';
  formData = formData + '&notes=' + encodeURIComponent(notes);
  // >>> FIN AJOUT <<<
  $('#message').val(notes);

  // Noms de fichiers renvoyés par upload.php.
  // Le backend reçoit la liste complète via filenames[].
  var uploadedFiles = Array.isArray(data.files) ? data.files : [];

  $.each(uploadedFiles, function(key, value) {
  formData += '&filenames[]=' + encodeURIComponent(value);
  });

  // Compatibilité avec le flux historique mono-fichier.
  $('#fichier').val(uploadedFiles[0] || '');

  // Les cinq champs sont transmis par EmailJS via sendForm().
  for (var i = 0; i < 5; i++) {
  $('#fichier_' + (i + 1)).val(uploadedFiles[i] || '');
  }

  $.ajax({
    url: 'https://unamusable-nonacidic-wilfred.ngrok-free.dev/devis/php/submit.php',
    type: 'POST',
    data: formData,
    cache: false,
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      console.log('submit.php response', data);  // <-- AJOUT ICI

// Numéro de devis technique + numéro affiché
        $('#devis_id').val(data.devis_id || '');
        $('#quote_number').val(data.quote_number || data.devis_id || '');

      if (typeof data.error === 'undefined') {
        console.log('SUCCESS: ' + data.success);

        if (data && data.stripe_link) {
        $('#stripe_link').val(data.stripe_link);
      } else {
        $('#stripe_link').val('https://hb3d.fr/paiement'); // lien de test
      }


        // --- HB3D: EmailJS après succès submit.php ---

        try {
          console.log('EmailJS: préparation des champs cachés');
          var now = new Date();
          $('#time').val(now.toLocaleString());

          // AVANT : ça écrasait le message client
          // $('#message').val('Nouveau devis HB3D depuis le formulaire web.');

          // MAINTENANT : on garde ce que le client a tapé
          var notes = $('#notes').val() || '';
  $('#message').val(notes);

          console.log('EmailJS: envoi sendForm');

          emailjs.sendForm(
          'service_np51rgo',
          'template_9s5e5co',
          '#form'
          )
        .then(function(response) {
        console.log('EmailJS OK', response.status, response.text);
        }, function(error) {
        console.error('EmailJS ERROR', error);
        });

                  // --- HB3D : e-mail interne de test multi-fichiers ---
          // Cet envoi est indépendant du sendForm() existant.
          // Il utilise la configuration mémorisée de chaque fichier du lot.
          try {
            var fichiersLot = (
              typeof window.hb3dGetSelectedFiles === 'function'
            )
              ? window.hb3dGetSelectedFiles()
              : [];

            var volumesLot = window.hb3dVolumesParFichier || {};
            var configurationsLot = window.hb3dConfigParFichier || {};

            var tarifsHb3d = {
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
                'Résine Standard': { A: 19.44, B: 0.467 }
              }
            };

            var libellesCouleurHb3d = {
              plablanc: 'PLA blanc',
              planaturel: 'PLA naturel',
              planoir: 'PLA noir',
              plarouge: 'PLA rouge',
              plableu: 'PLA bleu',
              plavert: 'PLA vert',
              plajaune: 'PLA jaune',
              plaorange: 'PLA orange',
              plagrisc: 'PLA gris clair',
              plagrif: 'PLA gris foncé',
              petgblanc: 'PETG blanc',
              petgnoir: 'PETG noir',
              petgtransparent: 'PETG transparent',
              absblanc: 'ABS blanc',
              absnoir: 'ABS noir'
            };

               var hexCouleurHb3d = {
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

            var numeroDevisEmail = (
            data && (data.quote_number || data.devis_id)
            )
            ? (data.quote_number || data.devis_id)
            : ($('#quotenumber').val() || $('#devisid').val() || '');

            var codeClientEmail = (
             data && data.client_code
             )
             ? data.client_code
            : '';

            var paramsMultiFichiers = {
               HB3D: $('#nom').val() || '',
               Bienvenue: $('#societe').val() || '',
               client_email: $('#email').val() || '',
               client_id: $('#tel').val() || '',
               client_code: codeClientEmail,
               time: $('[name="time"]').val() || new Date().toLocaleString(),
               message: $('#notes').val() || '',
               quote_number: numeroDevisEmail,
               quantite_totale: 0,
               prix_total: '0,00 € TTC'
              };

            for (var emplacement = 1; emplacement <= 5; emplacement += 1) {
              paramsMultiFichiers['fichier_' + emplacement] = '';
              paramsMultiFichiers['configuration_' + emplacement] = '';
              paramsMultiFichiers['couleur_hex_' + emplacement] = '#FFFFFF';
              paramsMultiFichiers['quantite_' + emplacement] = '';
              paramsMultiFichiers['prix_unitaire_' + emplacement] = '';
              paramsMultiFichiers['prix_ligne_' + emplacement] = '';
            }

            var quantiteTotale = 0;
            var prixTotal = 0;

            console.log('HB3D DEBUG fichiersLot :', fichiersLot);
            console.log('HB3D DEBUG volumes/configurations :', volumesLot, configurationsLot);

            fichiersLot.slice(0, 5).forEach(function(fichierLot, indexLot) {
              var emplacement = indexLot + 1;

              var cleFichierLot = (
                typeof window.hb3dGetFileKey === 'function'
              )
                ? window.hb3dGetFileKey(fichierLot)
                : fichierLot.name + '|' + fichierLot.size + '|' + fichierLot.lastModified;

              var configuration = configurationsLot[cleFichierLot] || {};
              var volumeMm3 = Number(volumesLot[cleFichierLot]) || 0;
              var quantiteLigne = Math.max(
                1,
                parseInt(configuration.quantite || '1', 10)
              );

              var technologie = configuration.techno || 'Non définie';
              var materiau = configuration.materiau || 'Non défini';
              var codeCouleur = configuration.couleur || '';
              var couleur = libellesCouleurHb3d[codeCouleur] || codeCouleur || 'Non définie';
              var couleurHex = hexCouleurHb3d[codeCouleur] || '#FFFFFF';

              var tarif = (
                tarifsHb3d[technologie] &&
                tarifsHb3d[technologie][materiau]
              )
                ? tarifsHb3d[technologie][materiau]
                : null;

              var prixUnitaire = null;
              var prixLigne = null;

              if (tarif && volumeMm3 > 0) {
                prixUnitaire = tarif.A + (tarif.B * (volumeMm3 / 1000));
                prixLigne = prixUnitaire * quantiteLigne;
              }

               paramsMultiFichiers['fichier_' + emplacement] = fichierLot.name || '';
               paramsMultiFichiers['configuration_' + emplacement] =
               technologie + ' · ' + materiau + ' · ' + couleur;
               paramsMultiFichiers['couleur_hex_' + emplacement] = couleurHex;
               paramsMultiFichiers['quantite_' + emplacement] = quantiteLigne;
               paramsMultiFichiers['prix_unitaire_' + emplacement] =
                prixUnitaire === null
                  ? 'En cours de calcul'
                  : prixUnitaire.toFixed(2).replace('.', ',') + ' €';
               paramsMultiFichiers['prix_ligne_' + emplacement] =
                prixLigne === null
                  ? 'En cours de calcul'
                  : prixLigne.toFixed(2).replace('.', ',') + ' €';

              quantiteTotale += quantiteLigne;

              if (prixLigne !== null) {
                prixTotal += prixLigne;
              }
            });

            paramsMultiFichiers.quantite_totale = quantiteTotale;
            paramsMultiFichiers.prix_total =
              prixTotal.toFixed(2).replace('.', ',') + ' € TTC';

            console.log(
              'EmailJS: envoi test multi-fichiers',
              paramsMultiFichiers
            );

            console.log('HB3D DEBUG paramètres finaux :', paramsMultiFichiers);

            emailjs.send(
              'service_np51rgo',
              'template_7mjwzt9',
              paramsMultiFichiers
            ).then(function(response) {
              console.log(
                'EmailJS multi-fichiers OK',
                response.status,
                response.text
              );
            }, function(error) {
              console.error('EmailJS multi-fichiers ERROR', error);
            });
          } catch (multiFilesError) {
            console.error(
              'EmailJS multi-fichiers EXCEPTION',
              multiFilesError
            );
          }
          // --- fin HB3D : e-mail interne de test multi-fichiers ---

        } catch (e) {
          console.error('EmailJS EXCEPTION', e);
        }
        // --- fin HB3D ---

      } else {
        console.log('1.ERRORS: ' + data.error);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log('2.ERRORS: ' + errorThrown);
    },
    complete: function() {
      setTimeout(function() {
        $("#loading").hide();
        setUploadProgress(100);
        setUploadStatus('Devis envoyé<br>Merci !');

                // Modal HB3D
        var modal = document.createElement('div');
        modal.className = 'hb3d-modal';
        modal.innerHTML = '\
        <div class="hb3d-modal-box">\
          <div class="hb3d-modal-title">HB3D</div>\
          <p class="hb3d-modal-text">\
            Votre devis a bien été transmis.<br><br>\
            Nous revenons vers vous rapidement\
            pour la suite de votre demande.\
            En l’absence de message dans votre boîte de réception, nous vous invitons à consulter vos courriers indésirables.\
          </p>\
          <button class="hb3d-modal-btn" onclick="document.querySelector(\'.hb3d-modal\').remove()">FERMER</button>\
        </div>';
        document.body.appendChild(modal);
      }, 700);
    }
  });
}
});




