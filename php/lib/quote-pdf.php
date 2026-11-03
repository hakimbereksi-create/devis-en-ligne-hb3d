<?php

/**
 * Génère une estimation PDF et l'enregistre hors du dossier public.
 * Aucun affichage, aucun envoi d'e-mail.
 */
function hb3dGenerateQuotePdf(array $data, string $storageDirectory): array
{
    require_once __DIR__ . '/dompdf/autoload.inc.php';

    $escape = static function ($value): string {
        return htmlspecialchars(
            (string) $value,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );
    };

    $money = static function ($value): string {
        return number_format((float) $value, 2, ',', ' ') . ' €';
    };

    $pricing = $data['pricing'];
    $configurations = $data['configurations'];

    $quoteNumber = (string) $data['quote_number'];

    if (!preg_match('/^DC-\d{4}-\d{4}-\d+$/D', $quoteNumber)) {
        throw new RuntimeException('Référence de devis invalide.');
    }

    if (
        !is_dir($storageDirectory) &&
        !@mkdir($storageDirectory, 0700, true) &&
        !is_dir($storageDirectory)
    ) {
        throw new RuntimeException(
            'Impossible de créer le dossier privé des PDF.'
        );
    }

    if (!is_writable($storageDirectory)) {
        throw new RuntimeException(
            'Le dossier privé des PDF est inaccessible en écriture.'
        );
    }

    $date = new DateTimeImmutable((string) $data['date']);

     $thumbnails = $data['thumbnails'] ?? [];

if (
    !is_array($thumbnails) ||
    count($thumbnails) !== count($configurations)
) {
    throw new RuntimeException(
        'Les vignettes du PDF sont incomplètes.'
    );
}

$rowsHtml = '';

foreach ($configurations as $index => $piece) {
    $thumbnail = $thumbnails[$index] ?? null;

    if (
        !is_array($thumbnail) ||
        !isset($thumbnail['filename'], $thumbnail['image']) ||
        $thumbnail['filename'] !== $piece['filename'] ||
        !is_string($thumbnail['image']) ||
        strncmp(
        $thumbnail['image'],
        'data:image/png;base64,',
        strlen('data:image/png;base64,')
        ) !== 0
    ) {
        throw new RuntimeException(
            'Vignette PDF invalide à la ligne ' . ($index + 1)
        );
    }

    $configurationText =
    'Technologie : ' . $piece['tech'] . "\n" .
    'Matériau : ' . $piece['material'] . "\n" .
    'Couleur : ' . $piece['color'] . "\n" .
    'Finition : ' . $piece['finish'];

    $rowsHtml .=
        '<tr>' .
            '<td class="thumbnail-cell">' .
                '<img class="piece-thumbnail" src="' .
                    $escape($thumbnail['image']) .
                '" alt="Vue 3D de la pièce">' .
                '<div class="piece-index">' .
                    'Pièce ' . ($index + 1) .
                '</div>' .
            '</td>' .
            '<td>' .
                '<div class="piece-name">' .
                    $escape($piece['original_name']) .
                '</div>' .
                '<div class="configuration">' .
                nl2br($escape($configurationText)) .
            '</div>' .
            '</td>' .
            '<td class="number">' .
                $escape($piece['quantity']) .
            '</td>' .
            '<td class="number">' .
                $escape($money($piece['unit'])) .
            '</td>' .
            '<td class="number">' .
                $escape($money($piece['amount'])) .
            '</td>' .
        '</tr>';
}

    $contactHtml =
        '<strong>' . $escape($data['nom']) . '</strong>';

    foreach (['societe', 'email', 'tel'] as $field) {
        $value = trim((string) ($data[$field] ?? ''));

        if ($value !== '') {
            $contactHtml .= '<br>' . $escape($value);
        }
    }

    
    $comment = trim((string) ($data['commentaire'] ?? ''));
    $commentHtml = '';

    if ($comment !== '') {
        $commentHtml =
            '<div class="comments">' .
                '<h2>Précisions du client</h2>' .
                '<div>' . nl2br($escape($comment)) . '</div>' .
            '</div>';
    }

    $referenceHtml = $escape($quoteNumber);
    $dateHtml = $escape($date->format('d/m/Y à H:i'));

    /*
     * Durée commerciale proposée pour le devis.
     * Modifier cette valeur si nécessaire.
    */
    $quoteValidityDays = 30;

    $validUntil = $date->add(
    new DateInterval('P' . $quoteValidityDays . 'D')
  );

    $validUntilHtml = $escape(
    $validUntil->format('d/m/Y')
  );
    $quantityHtml = $escape($pricing['quantity']);
    $grossHtml = $escape($money($pricing['gross']));
    $discountHtml = $escape($money($pricing['discount']));
    $netHtml = $escape($money($pricing['net']));

    $rateHtml = $escape(
        number_format((float) $pricing['rate'] * 100, 0, ',', ' ')
    );

    /*
 * Logo HB3D.
 * Depuis php/lib, remonter à la racine du projet.
 */
$logoPath = dirname(__DIR__, 2) . '/images/hb3d-logo.png';

$logoHtml = '<div class="brand-name">HB3D</div>';

if (is_file($logoPath) && is_readable($logoPath)) {
    $logoContent = @file_get_contents($logoPath);

    if (
        is_string($logoContent) &&
        substr($logoContent, 0, 8) === "\x89PNG\r\n\x1a\n"
    ) {
        $logoSource =
            'data:image/png;base64,' .
            base64_encode($logoContent);

        $logoHtml =
            '<img class="brand-logo" src="' .
            $escape($logoSource) .
            '" alt="HB3D">';
    }
}

$clientCodeValue = trim(
    (string) ($data['client_code'] ?? '')
);

$clientCodeLineHtml = '';

if ($clientCodeValue !== '') {
    $clientCodeLineHtml =
        '<div class="quote-information-line">' .
            '<span class="quote-information-label">' .
                'Code client : ' .
            '</span>' .
            $escape($clientCodeValue) .
        '</div>';
}

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>

.quote-header .brand-cell {
    width: 70%;
    padding-top: 2mm;
    text-align: left;
}

.quote-header .quote-meta {
    width: 30%;
    padding-top: 2mm;
    text-align: right;
    vertical-align: middle;
}

.company-heading {
    margin-bottom: 1mm;
    font-size: 10pt;
    font-weight: bold;
}

.company-details {
    font-size: 7.5pt;
    line-height: 1.35;
}

.company-details a {
    color: #1f2937;
    text-decoration: none;
}

.brand-logo {
    width: 27mm;
    height: auto;
}

.brand-name {
    color: #e00000;
}

/* Informations du devis face au client */
.contacts-table {
    margin-bottom: 4mm;
}

.quote-information {
    padding: 1mm 2mm 0 0;
}

.quote-title {
    margin: 0 0 2mm;
    color: #e00000;
    font-size: 23pt;
    line-height: 1.1;
}

.quote-information-line {
    margin-bottom: 1mm;
    font-size: 7.5pt;
    line-height: 1.3;
}

.quote-information-label {
    font-weight: bold;
}

.customer-card {
    border: 0.7pt solid #9ca3af;
    border-top: 2pt solid #e00000;
    border-radius: 3mm;
    padding: 3mm;
}

.contact-label {
    color: #374151;
    font-size: 7pt;
}

/* Tableau des pièces */
.items-table {
    table-layout: fixed;
}

.items-table th {
    background: #e00000;
    color: #ffffff;
    font-size: 7pt;
    font-weight: bold;
    vertical-align: middle;
}

.items-table td {
    font-size: 7.5pt;
}

.items-table .piece-name {
    margin-bottom: 1mm;
}

.items-table .configuration {
    font-size: 7pt;
    line-height: 1.3;
}

.items-table th.number {
    white-space: normal;
}

.items-table td.number {
    white-space: nowrap;
}

/* Récapitulatif */
.totals {
    width: 65%;
    margin-top: 3mm;
}

.total td {
    background: #fde8e8;
    color: #b00000;
    font-size: 11pt;
}

/* Bas de document */
.notice {
    margin-top: 3mm;
    padding: 2mm;
    background: #fafafa;
    font-size: 7pt;
}

.approval {
    margin-top: 3mm;
    padding: 2.5mm;
}

.signature-space {
    height: 8mm;
}

/* Pied de page unique */
.pdf-footer {
    position: fixed;
    bottom: -7mm;
    left: 0;
    right: 0;
    border-top: 0.7pt solid #e00000;
    padding-top: 1mm;
    text-align: center;
    font-size: 6.5pt;
    line-height: 1.2;
    color: #4b5563;
}

       @page {
    size: A4 portrait;
    margin: 10mm 12mm 14mm;
}

body {
    margin: 0;
    padding: 0;
    font-family: "DejaVu Sans", sans-serif;
    font-size: 8pt;
    color: #1f2937;
    line-height: 1.25;
}

h1 {
    color: #c90045;
    font-size: 21pt;
    margin: 0 0 3mm;
}

h2 {
    font-size: 9pt;
    margin: 0 0 2mm;
}

/* Structure des tableaux */
table {
    width: 100%;
    border-collapse: collapse;
}

thead {
    display: table-header-group;
}

th,
td {
    border: 1px solid #d1d5db;
    padding: 1.5mm;
    vertical-align: top;
}

th {
    background: #f3f4f6;
    font-size: 7pt;
    text-align: left;
}

tr {
    page-break-inside: avoid;
}

.number {
    text-align: right;
    white-space: nowrap;
}

/* En-tête */
.quote-header {
    width: 100%;
    margin-bottom: 4mm;
    border-collapse: collapse;
    page-break-inside: avoid;
}

.quote-header td {
    border: none;
    border-bottom: 1.5pt solid #c90045;
    padding: 0 0 2.5mm;
    vertical-align: top;
}

.quote-header .brand-cell {
    width: 55%;
    text-align: left;
}

.quote-header .quote-meta {
    width: 45%;
    text-align: right;
}

.brand-logo {
    width: 25mm;
    height: auto;
}

.brand-name {
    font-size: 25pt;
    font-weight: bold;
    color: #c90045;
}

.brand-description {
    margin-top: 1mm;
    font-size: 7pt;
    color: #6b7280;
}

.quote-title {
    margin: 0 0 1mm;
    font-size: 23pt;
    line-height: 1.1;
    font-weight: bold;
    color: #c90045;
}

.quote-reference {
    font-size: 8pt;
    font-weight: bold;
    color: #1f2937;
}

.quote-date {
    margin-top: 0.5mm;
    font-size: 7pt;
    color: #6b7280;
}

.quote-type {
    margin-top: 1mm;
    font-size: 6.5pt;
    color: #6b7280;
}

/* Coordonnées entreprise et client */
.contacts-table {
    width: 100%;
    margin-bottom: 4mm;
    border-collapse: collapse;
    table-layout: fixed;
    page-break-inside: avoid;
}

.contacts-table td {
    border: none;
    padding: 0;
    vertical-align: top;
}

.contacts-table .company-cell {
    width: 48%;
}

.contacts-table .contact-gap {
    width: 4%;
}

.contacts-table .customer-cell {
    width: 48%;
}

.contact-card {
    border: 1px solid #d1d5db;
    padding: 2.5mm;
    font-size: 7.5pt;
    line-height: 1.3;
    word-wrap: break-word;
}

.company-card {
    border-top: 2pt solid #c90045;
    background: #fafafa;
}

.customer-card {
    border-top: 2pt solid #374151;
}

.contact-label {
    margin-bottom: 1mm;
    font-size: 6.5pt;
    font-weight: bold;
    color: #6b7280;
    letter-spacing: 0.5pt;
}

.company-name {
    margin-bottom: 0.5mm;
    font-size: 10pt;
    font-weight: bold;
    color: #1f2937;
}

.contact-card a {
    color: #1f2937;
    text-decoration: none;
}

/* Pièces et configurations */
.piece-name {
    font-weight: bold;
    word-wrap: break-word;
}

.configuration {
    margin-top: 0.5mm;
    font-size: 7pt;
    color: #6b7280;
    word-wrap: break-word;
}

/* Vignettes 3D : dimensions conservées */
.thumbnail-cell {
    text-align: center;
    vertical-align: middle;
    background: #ffffff;
}

.piece-thumbnail {
    display: block;
    width: 28mm;
    height: 21mm;
    margin: 0 auto;
}

.piece-index {
    margin-top: 0.5mm;
    font-size: 6.5pt;
    color: #6b7280;
}

/* Récapitulatif financier */
.totals {
    width: 70%;
    margin: 3mm 0 0 auto;
    page-break-inside: avoid;
}

.totals td {
    border: none;
    padding: 1.2mm 2mm;
}

.total td {
    background: #fce8ef;
    color: #c90244;
    font-size: 10pt;
    font-weight: bold;
}

/* Précisions du client */
.comments {
    margin-top: 3mm;
    font-size: 7.5pt;
}

/* Réserves techniques */
.notice {
    margin-top: 3mm;
    padding: 2mm;
    border: 1px solid #d1d5db;
    font-size: 7pt;
    line-height: 1.25;
    color: #4b5563;
    page-break-inside: avoid;
}

/* Accord client */
.approval {
    margin-top: 3mm;
    border: 1px solid #d1d5db;
    padding: 2.5mm;
    page-break-inside: avoid;
}

.approval h2 {
    margin: 0 0 1mm;
    font-size: 9pt;
}

.approval-description {
    margin-bottom: 2mm;
    font-size: 6.5pt;
    line-height: 1.2;
    color: #6b7280;
}

.approval-table {
    width: 100%;
    table-layout: fixed;
}

.approval-table td {
    border: none;
    padding: 0;
    font-size: 7pt;
    vertical-align: top;
}

.approval-date {
    width: 40%;
}

.approval-signature {
    width: 60%;
}

.signature-space {
    height: 0mm;
}

/* Pied de page compact */
.pdf-footer {
    position: fixed;
    bottom: -7mm;
    left: 0;
    right: 0;
    border-top: 0.3pt solid #fc0404;
    padding-top: 1mm;
    text-align: center;
    font-size: 6.5pt;
    line-height: 1.2;
    color: #6b7280;
}

       /* Mention fiscale rattachée au récapitulatif */
.totals .tax-notice {
    padding: 1.5mm 2mm 0;
    font-size: 6.5pt;
    line-height: 1.2;
    text-align: right;
    color: #6b7280;
}

        /* Trait de séparation plus fin sous l'en-tête */
.quote-header td {
    border-top: none;
    border-bottom: 0.4pt solid #d8034d;
}

/* En-tête sans bordure */
table.quote-header,
table.quote-header tr,
table.quote-header td {
    border: none !important;
}

table.quote-header {
    margin-bottom: 0;
}

/* Trait fin indépendant du tableau */
.header-rule {
    height: 0;
    margin: 0 0 4mm;
    padding: 0;
    border: none;
    border-top: 0.3pt solid #fc0404;
    font-size: 0;
    line-height: 0;
}



    </style>
</head>
<body>

  <!-- Pied de page fixe -->
  <body>
    <div class="pdf-footer">
        SAS au capital de 10 000,00 euros - SIRET : 81333255800010
    </div>
<!-- En-tête, coordonnées, pièces, totaux et accord -->
    <table class="quote-header">
        <tr>
            <td class="brand-cell">
                <div class="company-heading">HB3D SAS</div>

                <div class="company-details">
                    129, rue de Dunkerque<br>
                    59155 Faches-Thumesnil<br>
                    Tél. : 06 84 88 25 54<br>
                    E-mail :
                    <a href="mailto:hbereksi@hb3d.fr">hbereksi@hb3d.fr</a>
                </div>
            </td>

            <td class="quote-meta">
                {$logoHtml}
            </td>
        </tr>
    </table>

    <div class="header-rule"></div>

    <table class="contacts-table">
        <tr>
            <td class="company-cell">
                <div class="quote-information">
                    <div class="quote-title">DEVIS</div>

                    <div class="quote-information-line">
                        <span class="quote-information-label">
                            Référence :
                        </span>
                        {$referenceHtml}
                    </div>

                    <div class="quote-information-line">
                        <span class="quote-information-label">
                            Date :
                        </span>
                        {$dateHtml}
                    </div>

                    {$clientCodeLineHtml}

                    <div class="quote-information-line">
    <span class="quote-information-label">
        Valable jusqu’au :
    </span>
    {$validUntilHtml}
</div>

                    <div class="quote-type">
                        Estimation soumise à validation technique
                    </div>
                </div>
            </td>

            <td class="contact-gap"></td>

            <td class="customer-cell">
                <div class="contact-card customer-card">
                    <div class="contact-label">CLIENT</div>
                    {$contactHtml}
                </div>
            </td>
        </tr>
    </table>

    <h2>Pièces et configurations</h2>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 18%; text-align: center;">
                    Vue 3D
                </th>

                <th style="width: 38%;">
                    Pièce / configuration
                </th>

                <th style="width: 8%;" class="number">
                    Qté
                </th>

                <th style="width: 18%;" class="number">
                    PU HT avant remise
                </th>

                <th style="width: 18%;" class="number">
                    Montant HT avant remise
                </th>
            </tr>
        </thead>

        <tbody>
            {$rowsHtml}
        </tbody>
    </table>

    <table class="totals">
    <tr>
        <td>Quantité totale</td>
        <td class="number">{$quantityHtml}</td>
    </tr>

    <tr>
        <td>Sous-total HT avant remise</td>
        <td class="number">{$grossHtml}</td>
    </tr>

    <tr>
        <td>Remise lot ({$rateHtml} %)</td>
        <td class="number">− {$discountHtml}</td>
    </tr>

    <tr>
        <td>Total HT après remise</td>
        <td class="number">{$netHtml}</td>
    </tr>

    <tr class="total">
        <td>TOTAL ESTIMATIF TTC</td>
        <td class="number">{$netHtml}</td>
    </tr>

    <tr>
        <td colspan="2" class="tax-notice">
            TVA non applicable, art. 293 B du CGI
        </td>
    </tr>
</table>

    {$commentHtml}

    <div class="notice">
        Suppléments de finition non inclus.<br>
        Estimation soumise à validation technique humaine.<br>
        Ce document ne constitue pas une validation technique
        ni une confirmation de lancement en fabrication.
    </div>

    <div class="approval">
        <h2>Bon pour accord</h2>

        <div class="approval-description">
            Accord du client sur la présente estimation,
            sous réserve de validation technique par HB3D.
            La signature ne vaut pas autorisation de lancement
            en fabrication.
        </div>

        <table class="approval-table">
            <tr>
                <td class="approval-date">
                    Date : ____ / ____ / ________
                </td>

                <td class="approval-signature">
                    Nom et signature du client :
                    <div class="signature-space"></div>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
HTML;

    $options = new \Dompdf\Options();
    $options->set('isRemoteEnabled', false);
    $options->set('isPhpEnabled', false);
    $options->set('isJavascriptEnabled', false);
    $options->set('defaultFont', 'DejaVu Sans');

    $pdf = new \Dompdf\Dompdf($options);
    $pdf->loadHtml($html, 'UTF-8');
    $pdf->setPaper('A4', 'portrait');
    $pdf->render();

    $content = $pdf->output();

    if (
        !is_string($content) ||
        strncmp($content, '%PDF-', 5) !== 0
    ) {
        throw new RuntimeException('Le document PDF généré est invalide.');
    }

    $filename =
        $quoteNumber . '-' . bin2hex(random_bytes(8)) . '.pdf';

    $destination =
        rtrim($storageDirectory, '/\\') .
        DIRECTORY_SEPARATOR .
        $filename;

    $written = @file_put_contents(
        $destination,
        $content,
        LOCK_EX
    );

    if ($written === false || $written !== strlen($content)) {
        @unlink($destination);

        throw new RuntimeException(
            'Impossible d’enregistrer le document PDF complet.'
        );
    }

    return [
        'filename' => $filename,
        'path' => $destination
    ];
}