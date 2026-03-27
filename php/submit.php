<?php
// ----------------------
// CORS pour GitHub Pages
// ----------------------
$allowedOrigin = 'https://hakimbereksi-create.github.io';
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: $allowedOrigin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// ----------------------
// Lecture des données POST
// ----------------------

// Champs natifs du <form> (via serialize())
$email       = isset($_POST['email']) ? trim($_POST['email']) : '';
$quantite    = isset($_POST['quantite']) ? intval($_POST['quantite']) : 1;

// Champs ajoutés manuellement
$commentaire = isset($_POST['commentaire']) ? trim($_POST['commentaire']) : '';
$prixAffiche = isset($_POST['prix_affiche']) ? trim($_POST['prix_affiche']) : '';

// Fichiers (tableau de noms)
$filenames = isset($_POST['filenames']) ? $_POST['filenames'] : [];
if (!is_array($filenames)) {
    $filenames = [$filenames];
}

// ----------------------
// Logging simple du devis
// ----------------------
$logEntry = [
    'date'        => date('c'),
    'email'       => $email,
    'quantite'    => $quantite,
    'commentaire' => $commentaire,
    'prix_affiche'=> $prixAffiche,
    'filenames'   => $filenames,
    'ip'          => $_SERVER['REMOTE_ADDR'] ?? '',
    'user_agent'  => $_SERVER['HTTP_USER_AGENT'] ?? '',
];

// Fichier de log dans le même dossier
$logFile = __DIR__ . '/devis_log.txt';
file_put_contents($logFile, json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);

// ----------------------
// Réponse JSON au frontend
// ----------------------
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success'      => true,
    'message'      => 'Devis HB3D reçu et enregistré',
    'email'        => $email,
    'quantite'     => $quantite,
    'commentaire'  => $commentaire,
    'prix_affiche' => $prixAffiche,
    'filenames'    => $filenames,
]);
// --- LOG LISIBLES DANS devis_log.txt ---

// 1) Version JSON jolie sur plusieurs lignes
$entryJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

// 2) Version résumé sur une seule ligne
$lineSummary = sprintf(
    "[%s] email=%s | quantite=%s | prix=%s | fichiers=%s | ip=%s",
    $data['date'] ?? date('c'),
    $data['email'] ?? '',
    $data['quantite'] ?? '',
    $data['prix_affiche'] ?? '',
    isset($data['filenames']) && is_array($data['filenames']) ? implode(',', $data['filenames']) : '',
    $data['ip'] ?? ''
);

// 3) Écriture dans le log
$finalLogBlock  = $lineSummary . PHP_EOL;
$finalLogBlock .= $entryJson . PHP_EOL;
$finalLogBlock .= "------------------------" . PHP_EOL;

file_put_contents('devis_log.txt', $finalLogBlock, FILE_APPEND);
