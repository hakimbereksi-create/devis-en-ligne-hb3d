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

header('Content-Type: application/json; charset=utf-8');

// Pré-requêtes OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// On n'accepte que POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// ----------------------
// Lecture des données POST (form serialize())
// ----------------------
$email       = isset($_POST['email'])       ? trim($_POST['email'])       : '';
$quantite    = isset($_POST['quantite'])    ? intval($_POST['quantite'])  : 1;
$commentaire = isset($_POST['commentaire']) ? trim($_POST['commentaire']) : '';
$prixAffiche = isset($_POST['prix_affiche'])? trim($_POST['prix_affiche']): '';

// Fichiers (tableau de noms)
$filenames = isset($_POST['filenames']) ? $_POST['filenames'] : [];
if (!is_array($filenames)) {
    $filenames = [$filenames];
}

// Infos serveur
$ip        = $_SERVER['REMOTE_ADDR']     ?? '';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$date      = date('c');

// Tableau propre pour le JSON joli
$cleanData = [
    'date'        => $date,
    'email'       => $email,
    'quantite'    => $quantite,
    'commentaire' => $commentaire,
    'prix_affiche'=> $prixAffiche,
    'filenames'   => $filenames,
    'ip'          => $ip,
    'user_agent'  => $userAgent,
];

// ----------------------
// LOG LISIBLE DANS devis_log.txt
// ----------------------

// Remplacements pour les champs vides
$emailLog    = $email       !== '' ? $email       : '-';
$quantiteLog = $quantite    !== '' ? $quantite    : '-';
$prixLog     = $prixAffiche !== '' ? $prixAffiche : '-';
$fichiersLog = count($filenames) > 0 ? implode(',', $filenames) : '-';
$ipLog       = $ip          !== '' ? $ip          : '-';

// 1) Ligne résumé
$lineSummary = sprintf(
    "[%s] email=\"%s\" | qte=%s | prix=%s | fichier=\"%s\" | ip=%s",
    $date,
    $emailLog,
    $quantiteLog,
    $prixLog,
    $fichiersLog,
    $ipLog
);

// 2) JSON joli
$entryJson = json_encode($cleanData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

// 3) Bloc final à écrire
$finalLogBlock  = $lineSummary . PHP_EOL;
$finalLogBlock .= $entryJson . PHP_EOL;
$finalLogBlock .= "------------------------" . PHP_EOL;

$logFile = __DIR__ . '/devis_log.txt';
file_put_contents($logFile, $finalLogBlock, FILE_APPEND);

// ----------------------
// Réponse JSON au frontend
// ----------------------
echo json_encode([
    'success'      => true,
    'message'      => 'Devis HB3D reçu et enregistré',
    'email'        => $email,
    'quantite'     => $quantite,
    'commentaire'  => $commentaire,
    'prix_affiche' => $prixAffiche,
    'filenames'    => $filenames,
]);
