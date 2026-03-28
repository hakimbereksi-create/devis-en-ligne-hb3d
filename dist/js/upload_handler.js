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

  if (qteText !== '') {
    $('#quantite').val(qteText);
  }
  if (prixText !== '') {
    $('#prix_affiche').val(prixText);
  }
  // ------------------------------------------------------------

  // On sérialise le formulaire APRES màj des champs
  var formData = $form.serialize();

  // On ajoute les noms de fichiers renvoyés par upload.php
  $.each(data.files || [], function(key, value) {
    formData = formData + '&filenames[]=' + value;
    if (key === 0) {
      $('#fichier').val(value);
    }
  });

  $.ajax({
    url: 'https://unamusable-nonacidic-wilfred.ngrok-free.dev/devis/php/submit.php',
    type: 'POST',
    data: formData,
    cache: false,
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      if (typeof data.error === 'undefined') {
        console.log('SUCCESS: ' + data.success);

        // --- HB3D: EmailJS après succès submit.php ---
        try {
          console.log('EmailJS: préparation des champs cachés');
          var now = new Date();
          $('#time').val(now.toLocaleString());
          $('#message').val('Nouveau devis HB3D depuis le formulaire web.');

          console.log('EmailJS: envoi sendForm');
          emailjs.sendForm('service_np51rgo', 'template_7mjwzt9', '#form')
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
        setUploadStatus('Commande envoyée<br>Merci !');

                // Modal HB3D
        var modal = document.createElement('div');
        modal.className = 'hb3d-modal';
        modal.innerHTML = '\
        <div class="hb3d-modal-box">\
          <div class="hb3d-modal-title">HB3D</div>\
          <p class="hb3d-modal-text">\
            Votre demande d\'impression 3D<br>\
            a bien été envoyée !<br><br>\
            Nous revenons vers vous rapidement.\
          </p>\
          <button class="hb3d-modal-btn" onclick="document.querySelector(\'.hb3d-modal\').remove()">FERMER</button>\
        </div>';
        document.body.appendChild(modal);
      }, 700);
    }
  });
}
});



