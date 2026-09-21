<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ----------------------
// CORS pour GitHub Pages
// ----------------------
$allowedOrigins = [
    'https://hakimbereksi-create.github.io',
    'http://localhost:8080'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
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

// require __DIR__ . '/vendor/autoload.php'; // adapte le chemin si besoin
// La clé Stripe est chargée depuis une configuration locale non versionnée.


// ----------------------
// Lecture des données POST (form serialize())
// ----------------------
$email       = isset($_POST['email'])        ? trim($_POST['email'])        : '';
$quantite    = isset($_POST['quantite'])     ? intval($_POST['quantite'])   : 1;
$commentaire = isset($_POST['commentaire'])  ? trim($_POST['commentaire'])  : '';
$prixAffiche = isset($_POST['prix_affiche']) ? trim($_POST['prix_affiche']) : '';
// Normalisation du prix pour l'email (2 décimales, virgule, espace, €)
$prixAfficheBrut = $prixAffiche;

// On retire tout sauf chiffres, virgule, point
$clean = preg_replace('/[^0-9\.,]/', '', $prixAfficheBrut);

// On remplace la virgule par un point pour PHP
$clean = str_replace(',', '.', $clean);

// Conversion en float
$prixFloat = is_numeric($clean) ? (float)$clean : 0.0;

// Format FR : 2 décimales, virgule, séparateur de milliers espace
$prixAfficheFormatte = number_format($prixFloat, 2, ',', ' ') . ' €';
$notes       = isset($_POST['notes'])        ? trim($_POST['notes'])        : '';
$nom         = isset($_POST['nom'])          ? trim($_POST['nom'])      : '';
$tel         = isset($_POST['tel'])          ? trim($_POST['tel'])      : '';
$societe     = isset($_POST['societe'])      ? trim($_POST['societe'])  : '';

// Fichiers (tableau de noms)
$filenames = isset($_POST['filenames']) ? $_POST['filenames'] : [];
if (!is_array($filenames)) {
    $filenames = [$filenames];
}

// Infos serveur
$ip        = $_SERVER['REMOTE_ADDR']     ?? '';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$date      = date('c');

// ID devis lisible : HB3D-YYYYMMDD-HHMMSS
$devisId = 'HB3D-' . date('Ymd-His');

// Compteur automatique des devis
$counterFile = __DIR__ . '/quote_counter.txt';
$fp = fopen($counterFile, 'c+');

if (!$fp) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible d’ouvrir le compteur de devis']);
    exit;
}

flock($fp, LOCK_EX);

$counterValue = trim(stream_get_contents($fp));
$lastNumber = is_numeric($counterValue) ? (int)$counterValue : 1348; // base actuelle
$nextQuoteSeq = $lastNumber + 1;

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, (string)$nextQuoteSeq);
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

$quoteNumber = 'DC-' . date('Y') . '-' . date('md') . '-' . $nextQuoteSeq;

// ----------------------
// Code client persistant : même e-mail = même code.
// Le premier nouveau client reçoit CL0778.
// ----------------------
$clientCode = '';

$emailKey = strtolower(trim($email));

if ($emailKey !== '' && filter_var($emailKey, FILTER_VALIDATE_EMAIL)) {
    $clientCodesFile = __DIR__ . '/client_codes.json';
    $clientCodesLockFile = __DIR__ . '/client_codes.lock';

    $clientCodesLock = fopen($clientCodesLockFile, 'c+');

    if ($clientCodesLock && flock($clientCodesLock, LOCK_EX)) {
        $clientCodes = [];

        if (is_file($clientCodesFile) && is_readable($clientCodesFile)) {
            $clientCodesJson = file_get_contents($clientCodesFile);
            $clientCodesDecoded = json_decode($clientCodesJson, true);

            if (is_array($clientCodesDecoded)) {
                $clientCodes = $clientCodesDecoded;
            }
        }

        if (isset($clientCodes[$emailKey])) {
            $clientCode = (string) $clientCodes[$emailKey];
        } else {
            $lastClientNumber = 777;

            foreach ($clientCodes as $existingClientCode) {
                if (preg_match('/^CL(\d+)$/', (string) $existingClientCode, $matches)) {
                    $existingNumber = (int) $matches[1];

                    if ($existingNumber > $lastClientNumber) {
                        $lastClientNumber = $existingNumber;
                    }
                }
            }

            $nextClientNumber = $lastClientNumber + 1;
            $clientCode = 'CL' . str_pad((string) $nextClientNumber, 4, '0', STR_PAD_LEFT);
            $clientCodes[$emailKey] = $clientCode;

            $clientCodesJson = json_encode(
                $clientCodes,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );

            if ($clientCodesJson !== false) {
                file_put_contents($clientCodesFile, $clientCodesJson . PHP_EOL, LOCK_EX);
            }
        }

        flock($clientCodesLock, LOCK_UN);
    }

    if ($clientCodesLock) {
        fclose($clientCodesLock);
    }
}

// Tableau propre pour le JSON joli
$cleanData = [
'date' => $date,
'devis_id' => $devisId,
'quote_number' => $quoteNumber,
'email' => $email,
'client_code' => $clientCode,
'nom' => $nom,
'tel' => $tel,
'societe' => $societe,
'quantite' => $quantite,
'commentaire' => $commentaire,
'prix_affiche'=> $prixAffiche,
'notes' => $notes,
'filenames' => $filenames,
'ip' => $ip,
'user_agent' => $userAgent,
];

// ----------------------
// LOG LISIBLE DANS devis_log.txt
// ----------------------

// Remplacements pour les champs vides (pour la ligne résumé)
$emailLog    = $email       !== '' ? $email       : '-';
$quantiteLog = $quantite    !== '' ? $quantite    : '-';
$prixLog     = $prixAffiche !== '' ? $prixAffiche : '-';
$fichiersLog = count($filenames) > 0 ? implode(',', $filenames) : '-';
$ipLog       = $ip          !== '' ? $ip          : '-';

// 1) Ligne résumé
$lineSummary = sprintf(
    "[%s] id=%s | email=\"%s\" | qte=%s | prix=%s | fichier=\"%s\" | ip=%s",
    $date,
    $devisId,
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
// Construction du corps d'email
// ----------------------

// On formate la liste de fichiers pour l'email
$fichiersListe = '-';
if (is_array($filenames) && count($filenames) > 0) {
    $fichiersListe = implode("\n- ", $filenames);
    $fichiersListe = "- " . $fichiersListe;
}

// Corps de l'email
$body = "✅ NOUVEAU DEVIS AUTOMATIQUE HB3D\n"
      . "🆔 Devis : {$devisId}\n"
      . "🌐 Source : Interface de devis HB3D en ligne\n\n"
      . "📅 Date : {$date}\n\n"
      . "👤 Nom / Prénom : " . ($nom !== '' ? $nom : '-') . "\n"
      . "🏢 Société : " . ($societe !== '' ? $societe : '-') . "\n"
      . "📧 Email : " . ($email !== '' ? $email : '-') . "\n"
      . "📞 Téléphone : " . ($tel !== '' ? $tel : '-') . "\n\n"
      . "🔢 Quantité : {$quantite}\n"
      . "💰 Prix affiché : " . ($prixAffiche !== '' ? $prixAfficheFormatte : '-') . "\n\n"
      . "📄 Fichiers envoyés :\n{$fichiersListe}\n\n"
      . "💬 Commentaire (champ message court) :\n"
      . ($commentaire !== '' ? $commentaire : '-') . "\n\n"
      . "📝 Détails client (notes) :\n"
      . ($notes !== '' ? $notes : '-') . "\n\n"
      . "🌐 IP : " . ($ip !== '' ? $ip : '-') . "\n"
      . "🖥️ User-Agent : {$userAgent}\n";

// ----------------------
// Envoi de l'email
// ----------------------
$to = 'contact@hb3d.fr';

// Sujet avec nom de fichier + prix
$firstFile = (is_array($filenames) && count($filenames) > 0) ? $filenames[0] : 'Aucun fichier';
$prixSujet = ($prixAffiche !== '' ? $prixAfficheFormatte : 'prix ?');

$subject = '[' . $devisId . '] Devis HB3D - ' . $firstFile . ' - ' . $prixSujet;

$headers = "From: HB3D <no-reply@hb3d.fr>\r\n"
         . "Reply-To: " . ($email !== '' ? $email : 'contact@hb3d.fr') . "\r\n"
         . "Content-Type: text/plain; charset=utf-8\r\n";

@mail($to, $subject, $body, $headers);

// ----------------------
// Stripe: création de la session Checkout
// ----------------------
$amount_cents = (int) round($prixFloat * 100);
$stripe_link = null;

// if ($amount_cents > 0) {
    // try {
    //    $session = \Stripe\Checkout\Session::create([
    //        'mode' => 'payment',
    //        'success_url' => 'https://hb3d.fr/success?devis_id=' . urlencode($devisId),
    //        'cancel_url'  => 'https://hb3d.fr/cancel?devis_id=' . urlencode($devisId),
    //        'line_items' => [[
    //            'price_data' => [
    //                'currency' => 'eur',
    //                'product_data' => [
    //                    'name' => 'Devis HB3D ' . $devisId,
    //                    'description' => $firstFile,
    //                ],
    //                'unit_amount' => $amount_cents,
    //            ],
    //            'quantity' => $quantite,
    //        ]],
    //        'customer_email' => $email ?: null,
    //    ]);

    //    $stripe_link = $session->url;
    // } catch (\Exception $e) {
    //    error_log('Stripe error for ' . $devisId . ' : ' . $e->getMessage());
    // }
// }
// ----------------------

// ----------------------
// Réponse JSON au frontend
// ----------------------
echo json_encode([
'success' => true,
'message' => 'Devis HB3D reçu et enregistré',
'devis_id' => $devisId,
'quote_number' => $quoteNumber,
'email' => $email,
'client_code' => $clientCode,
'nom' => $nom,
'tel' => $tel,
'societe' => $societe,
'quantite' => $quantite,
'commentaire' => $commentaire,
'prix_affiche' => $prixAffiche,
'notes' => $notes,
'filenames' => $filenames,
'stripe_link' => $stripe_link,
]);

