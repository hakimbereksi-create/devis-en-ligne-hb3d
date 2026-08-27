<?php
session_start();

if (empty($_SESSION['hb3d_quote_data']) || !is_array($_SESSION['hb3d_quote_data'])) {
    http_response_code(404);
    echo 'Aucune donnée de devis disponible.';
    exit;
}

$quoteData = $_SESSION['hb3d_quote_data'];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Aperçu devis HB3D</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="../dir/devis-hb3d.css">
</head>
<body>

<?php include __DIR__ . '/../dir/devis-hb3d.html'; ?>

<script>
const quoteData = <?php echo json_encode($quoteData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '';
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value ?? '';
}

function nl2br(text) {
    return (text || '').replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', function () {
    setText('company-name', quoteData.company?.name);
    setText('company-address-1', quoteData.company?.addressLine1);
    setText('company-postal-code', quoteData.company?.postalCode);
    setText('company-city', quoteData.company?.city);
    setText('company-phone', quoteData.company?.phone);
    setText('company-email', quoteData.company?.email);
    setText('company-nii', quoteData.company?.nii);
    setText('company-rcs', quoteData.company?.rcs);
    setText('company-siret', quoteData.company?.siret);
    setText('company-ape', quoteData.company?.ape);

    setText('quote-date', quoteData.quote?.date);
    setText('quote-number', quoteData.quote?.number);
    setText('client-code', quoteData.quote?.clientCode);
    setText('valid-until', quoteData.quote?.validUntil);
    setText('payment-mode', quoteData.quote?.paymentMode);

    setText('client-name', quoteData.client?.name);
    setText('client-address-line-1', quoteData.client?.addressLine1);
    setText('client-address-line-2', quoteData.client?.addressLine2);
    setText('client-postal-code', quoteData.client?.postalCode);
    setText('client-city', quoteData.client?.city);
    setText('client-country', quoteData.client?.country);

    setText('file-name', quoteData.technical?.fileName);
    setText('project-reference', quoteData.project?.reference);
    setText('delivery-mode', quoteData.project?.deliveryMode);

    setText('service-title', quoteData.item?.serviceTitle);
    setHTML('service-subtitle', nl2br(quoteData.item?.serviceSubtitle));
    setText('qty', quoteData.item?.qty);
    setText('unit-price-ht', quoteData.item?.unitPriceHt);
    setText('line-discount', quoteData.item?.lineDiscount);
    setText('vat-rate', quoteData.item?.vatRate);
    setText('line-total-ht', quoteData.item?.lineTotalHt);
    setText('line-total-ttc', quoteData.item?.lineTotalTtc);

    setText('technology', quoteData.technical?.technology);
    setText('material', quoteData.technical?.material);
    setText('color', quoteData.technical?.color);
    setText('infill', quoteData.technical?.infill);
    setText('layer-height', quoteData.technical?.layerHeight);
    setText('machine-name', quoteData.technical?.machineName);
    setText('dimensions', quoteData.technical?.dimensions);
    setText('volume-cm3', quoteData.technical?.volumeCm3);
    setText('weight-g', quoteData.technical?.weightG);

    setText('delivery-note', quoteData.project?.deliveryMode);
    setHTML('customer-notes', nl2br(quoteData.item?.customerNotes));
    setText('vat-legal-note', quoteData.totals?.vatLegalNote);

    setText('total-ht', quoteData.totals?.totalHt);
    setText('total-tva', quoteData.totals?.totalTva);
    setText('total-ttc', quoteData.totals?.totalTtc);
    setText('net-to-pay', quoteData.totals?.netToPay);

    setText('vat-label', quoteData.totals?.vatLabel);
    setText('vat-base', quoteData.totals?.vatBase);
    setText('vat-amount', quoteData.totals?.vatAmount);

    setText('signature-label', quoteData.footer?.signatureLabel);
    setText('legal-footer', quoteData.footer?.legalFooter);
});
</script>

</body>
</html>