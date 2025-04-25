<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight request (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Método no permitido';
    exit;
}

// Leer contenido JSON
$data = json_decode(file_get_contents('php://input'), true);

// Validar
if (!isset($data['files']) || !is_array($data['files'])) {
    http_response_code(400);
    echo 'Solicitud inválida';
    exit;
}

$pdfFolder = $_SERVER['DOCUMENT_ROOT'] . '/ASOC/uploads/pdf/INVOICES/';
$tmpZipPath = tempnam(sys_get_temp_dir(), 'pdfs') . '.zip';

$zip = new ZipArchive();
if ($zip->open($tmpZipPath, ZipArchive::CREATE) !== true) {
    http_response_code(500);
    echo 'No se pudo crear el archivo ZIP';
    exit;
}

foreach ($data['files'] as $relativePath) {
    $fullPath = realpath($pdfFolder . $relativePath);
    if ($fullPath && file_exists($fullPath)) {
        $zip->addFile($fullPath, basename($fullPath)); // Solo el nombre en el ZIP
    }
}

$zip->close();

// Enviar ZIP como descarga
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="facturas.zip"');
header('Content-Length: ' . filesize($tmpZipPath));

readfile($tmpZipPath);
unlink($tmpZipPath); // Eliminar archivo temporal
exit;
?>
