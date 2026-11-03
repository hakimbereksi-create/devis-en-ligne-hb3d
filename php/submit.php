<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ----------------------
// CORS pour GitHub Pages
// ----------------------
$allowedOrigins = [
    'https://hakimbereksi-create.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
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

// ----------------------
// Données détaillées destinées au devis PDF
// ----------------------
function hb3dInvalidQuoteData($message)
{
    http_response_code(400);

    echo json_encode(
        ['error' => $message],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

$configurationsRaw = $_POST['configurations_json'] ?? '';
$pricingRaw = $_POST['pricing_json'] ?? '';

if (
    !is_string($configurationsRaw) ||
    !is_string($pricingRaw) ||
    $configurationsRaw === '' ||
    $pricingRaw === ''
) {
    hb3dInvalidQuoteData(
        'Les détails du devis sont incomplets.'
    );
}

$configurations = json_decode($configurationsRaw, true);

if (
    json_last_error() !== JSON_ERROR_NONE ||
    !is_array($configurations) ||
    count($configurations) === 0 ||
    array_keys($configurations) !==
        range(0, count($configurations) - 1)
) {
    hb3dInvalidQuoteData(
        'La liste des configurations est invalide.'
    );
}

$pricingData = json_decode($pricingRaw, true);

if (
    json_last_error() !== JSON_ERROR_NONE ||
    !is_array($pricingData)
) {
    hb3dInvalidQuoteData(
        'Le récapitulatif financier est invalide.'
    );
}

$requiredPricingFields = [
    'quantity',
    'gross',
    'rate',
    'discount',
    'net'
];

foreach ($requiredPricingFields as $field) {
    $value = $pricingData[$field] ?? null;

    if (
        (!is_int($value) && !is_float($value)) ||
        !is_finite((float) $value) ||
        $value < 0
    ) {
        hb3dInvalidQuoteData(
            'Valeur financière invalide : ' . $field
        );
    }
}

if (
    $pricingData['quantity'] < 1 ||
    floor((float) $pricingData['quantity']) !==
        (float) $pricingData['quantity'] ||
    $pricingData['rate'] > 1
) {
    hb3dInvalidQuoteData(
        'La quantité totale ou le taux de remise est invalide.'
    );
}

if (count($configurations) !== count($filenames)) {
    hb3dInvalidQuoteData(
        'Le nombre de configurations ne correspond pas aux fichiers.'
    );
}

$textFields = [
    'filename',
    'original_name',
    'tech',
    'material',
    'color',
    'finish'
];

foreach ($configurations as $index => $configuration) {
    if (!is_array($configuration)) {
        hb3dInvalidQuoteData(
            'Configuration invalide à la ligne ' . ($index + 1)
        );
    }

    foreach ($textFields as $field) {
        if (
            !isset($configuration[$field]) ||
            !is_string($configuration[$field])
        ) {
            hb3dInvalidQuoteData(
                'Champ de configuration invalide : ' . $field
            );
        }
    }

    if (
        $configuration['filename'] === '' ||
        $configuration['original_name'] === '' ||
        $configuration['filename'] !== $filenames[$index]
    ) {
        hb3dInvalidQuoteData(
            'Le fichier de la ligne ' . ($index + 1) .
            ' ne correspond pas au transfert.'
        );
    }

    foreach (['quantity', 'unit', 'amount'] as $field) {
        $value = $configuration[$field] ?? null;

        if (
            (!is_int($value) && !is_float($value)) ||
            !is_finite((float) $value) ||
            $value < 0
        ) {
            hb3dInvalidQuoteData(
                'Valeur de ligne invalide : ' . $field
            );
        }
    }

    if (
        $configuration['quantity'] < 1 ||
        floor((float) $configuration['quantity']) !==
            (float) $configuration['quantity']
    ) {
        hb3dInvalidQuoteData(
            'Quantité invalide à la ligne ' . ($index + 1)
        );
    }
}

// ----------------------
// Vignettes PDF : contrôle séparé des données journalisées
// ----------------------
$thumbnailsRaw = $_POST['thumbnails_json'] ?? '';

if (
    !is_string($thumbnailsRaw) ||
    $thumbnailsRaw === '' ||
    strlen($thumbnailsRaw) > 3000000
) {
    hb3dInvalidQuoteData(
        'Les vignettes du devis sont absentes ou trop volumineuses.'
    );
}

$thumbnailsData = json_decode($thumbnailsRaw, true);

if (
    json_last_error() !== JSON_ERROR_NONE ||
    !is_array($thumbnailsData) ||
    count($thumbnailsData) < 1 ||
    count($thumbnailsData) > 5 ||
    count($thumbnailsData) !== count($configurations) ||
    array_keys($thumbnailsData) !==
        range(0, count($thumbnailsData) - 1)
) {
    hb3dInvalidQuoteData(
        'La liste des vignettes ne correspond pas aux pièces.'
    );
}

if (
    !function_exists('getimagesizefromstring') ||
    !function_exists('imagecreatefromstring') ||
    !function_exists('imagepng')
) {
    http_response_code(500);

    echo json_encode(
        [
            'error' =>
                'Le traitement des vignettes nécessite ' .
                'l’extension PHP GD avec le support PNG.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

$quoteThumbnails = [];
$thumbnailPrefix = 'data:image/png;base64,';

foreach ($thumbnailsData as $index => $thumbnail) {
    $lineNumber = $index + 1;

    if (
        !is_array($thumbnail) ||
        !isset($thumbnail['filename'], $thumbnail['image']) ||
        !is_string($thumbnail['filename']) ||
        !is_string($thumbnail['image']) ||
        $thumbnail['filename'] !== $filenames[$index]
    ) {
        hb3dInvalidQuoteData(
            'Correspondance de vignette invalide à la ligne ' .
            $lineNumber
        );
    }

    $imageData = $thumbnail['image'];

    if (
        strlen($imageData) > 550000 ||
        strncmp(
            $imageData,
            $thumbnailPrefix,
            strlen($thumbnailPrefix)
        ) !== 0
    ) {
        hb3dInvalidQuoteData(
            'Format ou taille de vignette invalide à la ligne ' .
            $lineNumber
        );
    }

    $binary = base64_decode(
        substr($imageData, strlen($thumbnailPrefix)),
        true
    );

    if (
        $binary === false ||
        strlen($binary) > 400 * 1024 ||
        substr($binary, 0, 8) !== "\x89PNG\r\n\x1a\n"
    ) {
        hb3dInvalidQuoteData(
            'Données PNG invalides à la ligne ' . $lineNumber
        );
    }

    /*
     * Vérifier les dimensions avant le décodage GD.
     * Ce contrôle ne remplace pas le décodage ci-dessous.
     */
    $imageInfo = @getimagesizefromstring($binary);

    if (
        $imageInfo === false ||
        $imageInfo[0] !== 480 ||
        $imageInfo[1] !== 360 ||
        $imageInfo[2] !== IMAGETYPE_PNG
    ) {
        hb3dInvalidQuoteData(
            'La vignette doit être un PNG de 480 × 360 pixels ' .
            'à la ligne ' . $lineNumber
        );
    }

    $image = @imagecreatefromstring($binary);

    if ($image === false) {
        hb3dInvalidQuoteData(
            'Vignette illisible à la ligne ' . $lineNumber
        );
    }

    /*
     * Réencoder l’image : ne pas transmettre directement
     * le contenu reçu au générateur PDF.
     */
    ob_start();

    try {
        $encoded = @imagepng($image, null, 6);
        $normalizedPng = ob_get_contents();
    } finally {
        ob_end_clean();
        imagedestroy($image);
    }

    if (
        !$encoded ||
        !is_string($normalizedPng) ||
        $normalizedPng === '' ||
        strlen($normalizedPng) > 400 * 1024
    ) {
        hb3dInvalidQuoteData(
            'Préparation de vignette impossible à la ligne ' .
            $lineNumber
        );
    }

    $quoteThumbnails[] = [
        'filename' => $filenames[$index],
        'image' =>
            $thumbnailPrefix . base64_encode($normalizedPng)
    ];
}

unset(
    $thumbnailsRaw,
    $thumbnailsData,
    $binary,
    $imageData,
    $normalizedPng
);

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
'configurations' => $configurations,
'pricing' => $pricingData,
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

$logWritten = @file_put_contents(
    $logFile,
    $finalLogBlock,
    FILE_APPEND | LOCK_EX
);

if (
    $logWritten === false ||
    $logWritten !== strlen($finalLogBlock)
) {
    error_log(
        '[HB3D] Écriture du journal non confirmée pour ' .
        $quoteNumber
    );

    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'error' =>
                'Enregistrement non confirmé. ' .
                'Vérifiez le journal avant toute nouvelle tentative.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// ----------------------
// Génération du PDF privé
// ----------------------
$pdfGenerated = false;
$pdfWarning = null;
$pdfFilename = null;

$pdfDownloadPath = null;
$pdfDownloadWarning = null;

/*
 * Chemin local XAMPP, hors de C:\xampp\htdocs.
 * À adapter explicitement lors d'une mise en production.
 */
$pdfStorageDirectory = 'C:/xampp/hb3d-private/quotes';

try {
    require_once __DIR__ . '/lib/quote-pdf.php';

    /*
 * Ajouter les vignettes uniquement aux données du PDF.
 * Ne pas modifier $cleanData, utilisé pour le journal.
 */
$pdfData = $cleanData;
$pdfData['thumbnails'] = $quoteThumbnails;

$pdfResult = hb3dGenerateQuotePdf(
    $pdfData,
    $pdfStorageDirectory
);

/*
 * Données d'aperçu : uniquement sur le XAMPP local.
 * Le fichier reste hors de htdocs.
 * Un échec de sauvegarde ne bloque pas le devis.
 */
if (
    PHP_OS_FAMILY === 'Windows' &&
    in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        ['127.0.0.1', '::1'],
        true
    )
) {
    try {
        $previewJson = json_encode(
            $pdfData,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

        $previewDataPath =
            'C:/xampp/hb3d-private/quotes/preview-data.json';

        $previewWritten = @file_put_contents(
            $previewDataPath,
            $previewJson,
            LOCK_EX
        );

        if (
            $previewWritten === false ||
            $previewWritten !== strlen($previewJson)
        ) {
            error_log(
                '[HB3D PREVIEW] Sauvegarde des données incomplète.'
            );
        }
    } catch (\Throwable $previewError) {
        error_log(
            '[HB3D PREVIEW] Impossible de préparer les données.'
        );
    }
}

unset($pdfData);

    $pdfFilename = $pdfResult['filename'];
    $pdfGenerated = true;

    error_log(
        '[HB3D PDF] Généré pour ' .
        $quoteNumber . ' : ' . $pdfFilename
    );
} catch (\Throwable $error) {
    $pdfWarning =
        'Demande enregistrée, mais PDF indisponible.';

    error_log(
        '[HB3D PDF] Échec pour ' .
        $quoteNumber . ' : ' . $error->getMessage()
    );
}

// ----------------------
// Création d'un accès temporaire au PDF
// ----------------------
if ($pdfGenerated && $pdfFilename !== null) {
    try {
        $accessDirectory = 'C:/xampp/hb3d-private/quote-access';

        if (
            !is_dir($accessDirectory) &&
            !@mkdir($accessDirectory, 0700, true) &&
            !is_dir($accessDirectory)
        ) {
            throw new RuntimeException(
                'Impossible de créer le dossier des accès PDF.'
            );
        }

        $downloadToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $downloadToken);

        $accessData = [
            'quote_number' => $quoteNumber,
            'filename' => $pdfFilename,
            'expires_at' => time() + (7 * 24 * 60 * 60)
        ];

        $accessJson = json_encode(
            $accessData,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($accessJson === false) {
            throw new RuntimeException(
                'Impossible de préparer l’accès PDF.'
            );
        }

        $accessFile =
            $accessDirectory . '/' . $tokenHash . '.json';

        $accessWritten = @file_put_contents(
            $accessFile,
            $accessJson,
            LOCK_EX
        );

        if (
            $accessWritten === false ||
            $accessWritten !== strlen($accessJson)
        ) {
            @unlink($accessFile);

            throw new RuntimeException(
                'Impossible d’enregistrer l’accès PDF.'
            );
        }

        /*
         * Chemin relatif à submit.php.
         * Aucun domaine calculé à partir des en-têtes HTTP.
         */
        $pdfDownloadPath =
            'download-quote.php?token=' . $downloadToken;
    } catch (\Throwable $error) {
        $pdfDownloadWarning =
            'PDF généré, mais lien de téléchargement indisponible.';

        error_log(
            '[HB3D PDF ACCESS] Échec pour ' .
            $quoteNumber . ' : ' . $error->getMessage()
        );
    }
}

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
'pdf_generated' => $pdfGenerated,
'pdf_filename' => $pdfFilename,
'pdf_warning' => $pdfWarning,
'pdf_download_path' => $pdfDownloadPath,
'pdf_download_warning' => $pdfDownloadWarning,
]);

