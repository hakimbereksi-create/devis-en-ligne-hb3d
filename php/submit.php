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

// ----------------------
// Ton code submit.php actuel
// ----------------------

// ... ici ton code de calcul / Stripe ...

$result = json_encode($_POST);

//Create 3D Print Order Info JSON file
$content = $result;
$uploaddir = '../uploads/';

foreach($_POST['filenames'] as $file)
{
    $fp = fopen($uploaddir . "/" . basename($file) . ".json", "wb");
    fwrite($fp, $content);
    fclose($fp);
}

echo $result;

?>