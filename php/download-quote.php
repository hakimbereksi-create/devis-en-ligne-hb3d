<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Cache-Control: private, no-store, max-age=0');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');

function hb3dDownloadUnavailable()
{
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Document indisponible ou lien expiré.';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

$token = $_GET['token'] ?? '';

if (
    !is_string($token) ||
    !preg_match('/^[a-f0-9]{64}$/D', $token)
) {
    hb3dDownloadUnavailable();
}

// Configuration locale XAMPP, à adapter en production.
$storageDirectory = 'C:/xampp/hb3d-private/quotes';
$accessDirectory = 'C:/xampp/hb3d-private/quote-access';

$tokenHash = hash('sha256', $token);
$accessFile = $accessDirectory . '/' . $tokenHash . '.json';

if (!is_file($accessFile) || !is_readable($accessFile)) {
    hb3dDownloadUnavailable();
}

$accessJson = @file_get_contents($accessFile);
$access = is_string($accessJson)
    ? json_decode($accessJson, true)
    : null;

if (
    !is_array($access) ||
    !isset(
        $access['filename'],
        $access['quote_number'],
        $access['expires_at']
    ) ||
    !is_string($access['filename']) ||
    !is_string($access['quote_number']) ||
    !is_int($access['expires_at']) ||
    $access['expires_at'] <= time()
) {
    hb3dDownloadUnavailable();
}

$quoteNumber = $access['quote_number'];
$filename = $access['filename'];

if (
    !preg_match('/^DC-\d{4}-\d{4}-\d+$/D', $quoteNumber) ||
    !preg_match(
        '/^DC-\d{4}-\d{4}-\d+-[a-f0-9]{16}\.pdf$/D',
        $filename
    ) ||
    strpos($filename, $quoteNumber . '-') !== 0
) {
    hb3dDownloadUnavailable();
}

$storageRoot = realpath($storageDirectory);
$pdfPath = realpath($storageDirectory . '/' . $filename);

if (
    $storageRoot === false ||
    $pdfPath === false ||
    strcasecmp(dirname($pdfPath), $storageRoot) !== 0 ||
    !is_file($pdfPath) ||
    !is_readable($pdfPath)
) {
    hb3dDownloadUnavailable();
}

$handle = @fopen($pdfPath, 'rb');

if ($handle === false) {
    hb3dDownloadUnavailable();
}

$fileInfo = fstat($handle);

if ($fileInfo === false || $fileInfo['size'] <= 0) {
    fclose($handle);
    hb3dDownloadUnavailable();
}

header('Content-Type: application/pdf');
header(
    'Content-Disposition: attachment; filename="' .
    $quoteNumber . '.pdf"'
);
header('Content-Length: ' . $fileInfo['size']);

fpassthru($handle);
fclose($handle);
exit;
