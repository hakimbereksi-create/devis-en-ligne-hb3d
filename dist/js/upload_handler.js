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

  // -------------------------
  // Gestion des fichiers
  // -------------------------

  var files;

  $('input[type=file]').on('change', prepareUpload);

  $("#loading").hide();
  setUploadProgress(0);
  setUploadStatus('En attente de fichier<br>Fichier 0 / 0');

  function prepareUpload(event) {
    files = event.target.files;
    console.log("FILE added to upload queue.");

    if (files && files.length > 0) {
      setUploadProgress(0);
      setUploadStatus('Fichier prêt à être envoyé<br>' + files[0].name);
    } else {
      setUploadProgress(0);
      setUploadStatus('En attente de fichier<br>Fichier 0 / 0');
    }
  }

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

    if (!files || !files.length) {
      setUploadStatus('Aucun fichier sélectionné<br>Veuillez choisir un fichier');
      return;
    }

    $("#loading").show();

    var data = new FormData();
    $.each(files, function(key, value) {
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

      url: 'php/upload.php?files',
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
 
  // On sérialise le formulaire APRES màj des champs
  var formData = $form.serialize();

   
  // Ajouter les notes (volet 2, hors form)
  var notes = $('#notes').val() || '';
  formData = formData + '&notes=' + encodeURIComponent(notes);
  // >>> FIN AJOUT <<<
  $('#message').val(notes);

  // On ajoute les noms de fichiers renvoyés par upload.php
  $.each(data.files || [], function(key, value) {
    formData = formData + '&filenames[]=' + value;
    if (key === 0) {
      $('#fichier').val(value);
    }
  });

  $.ajax({
    url: 'php/submit.php',
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
          emailjs.sendForm('service_np51rgo', 'template_9s5e5co', '#form')
          .then(function(response) {
          console.log('EmailJS OK', response.status, response.text);
          }, function(error) {
         console.error('EmailJS ERROR', error);
    });
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




