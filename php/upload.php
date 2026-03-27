<?php

// ----------------------
// CORS pour GitHub Pages
// ----------------------

// Domaine de ton front (GitHub Pages)
$allowedOrigin = 'https://hakimbereksi-create.github.io';

// Origin envoyé par le navigateur (preflight et requêtes réelles)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Si l'origine correspond à ton site GitHub, on autorise
if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: $allowedOrigin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
}

// Gestion de la requête preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // On peut éventuellement ajouter un max-age si tu veux
    // header("Access-Control-Max-Age: 86400");
    http_response_code(200);
    exit;
}
error_reporting(E_ERROR | E_PARSE);

$data = array();

if (isset($_GET['files'])) {

    // Formats autorisés
    $formats_autorises = array('stl', 'obj');
    
    // Taille max : 50 Mo
    $taille_max = 50 * 1024 * 1024;

    $error  = false;
    $files  = array();
    $uploaddir = '../uploads/';

    // Créer le dossier uploads s'il n'existe pas
    if (!is_dir($uploaddir)) {
        mkdir($uploaddir, 0755, true);
    }

    foreach ($_FILES as $file) {

        // Vérifier la taille
        if ($file['size'] > $taille_max) {
            $error = true;
            $data  = array('error' => 'Fichier trop volumineux (max 50 Mo) : ' . basename($file['name']));
            break;
        }

        // Vérifier l'extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $formats_autorises)) {
            $error = true;
            $data  = array('error' => 'Format non supporté. Utilisez STL ou OBJ.');
            break;
        }

        // Renommer le fichier de façon unique
        $nom_unique = uniqid('hb3d_', true) . '_' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($file['name']));
        $destination = $uploaddir . $nom_unique;

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            $files[] = $nom_unique;
        } else {
            $error = true;
            $data  = array('error' => 'Erreur lors du déplacement du fichier.');
            break;
        }
    }

    if (!$error) {
        $data = array(
            'success' => true,
            'files'   => $files
        );
    }

} else {
    $data = array('success' => 'Formulaire soumis', 'formData' => $_POST);
}

echo json_encode($data);
?>