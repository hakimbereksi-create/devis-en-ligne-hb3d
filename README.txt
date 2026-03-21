README
========

0. Upload the contents of the downloaded archive to web server.

1. In a browser, open http://<SERVER_URL>/index.html to test the functioning of the downloaded package.

2. index.html : Specifies the HTML layout of the viewer and meta-information.

3. js/object_viewer.js : Contains 3D viewer logic.

4. css/style.css : Required for displaying transluscent overlay of the tip on interations.

5. Click "Browse" to slect local STL file (binary or ASCII). 3D view of the file will appear.

6. Click "Get Quote" to being the upload process.

7. After successful upload, the file will be saved in the uploads/ folder on your server.

8. The 3D print order information associated with the 3D object file is saved in a companion JSON file, also in the uploads/ folder.


For any queries, please contact : pushkarparanjpe@gmail.com

Thank you for buying this product :-)

Cheers!

Pushkar


README
========

0. Téléchargez le contenu de l'archive téléchargée sur le serveur Web.

1. Dans un navigateur, ouvrez http: // <SERVER_URL> /index.html pour tester le fonctionnement du package téléchargé.

2. index.html: Spécifie la disposition HTML de la visionneuse et des méta-informations.

3. js / object_viewer.js: contient la logique du visualiseur 3D.

4. css / style.css: Requis pour afficher la superposition translucide de la pointe sur les interations.

5. Cliquez sur "Parcourir" pour sélectionner un fichier STL local (binaire ou ASCII). La vue 3D du fichier apparaîtra.

6. Cliquez sur "Obtenir un devis" pour être le processus de téléchargement.

7. Une fois le téléchargement réussi, le fichier sera sauvegardé dans le dossier uploads / sur votre serveur.

8. Les informations de commande d'impression 3D associées au fichier objet 3D sont enregistrées dans un fichier JSON associé, également dans le dossier uploads /.


Pour toute question, s'il vous plaît contacter: pushkarparanjpe@gmail.com

Merci d'avoir acheté ce produit :-)

À votre santé!

Pushkar


-----------------------------------------------------------------------------------------------------------------------------------------

CHANGEMENTS
========

v1.3
--------
1. Prend en charge le rendu des modèles OBJ 3D.


v1.2
--------
1. Affichez un modèle 3D par défaut dans la visionneuse avant que l'utilisateur ne sélectionne un modèle.
viewer.setParameter ("SceneUrl", "<chemin du fichier stl>")


v1.1
--------
1. Gestionnaire POST
2. Téléchargeur de fichiers
3. Enregistrez les détails de la commande d'impression 3D dans <3DFILENAME.stl> .json