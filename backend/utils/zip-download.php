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

// Definir carpeta de PDFs
$pdfFolder = $_SERVER['DOCUMENT_ROOT'] . '/ASOC/uploads/pdf/INVOICES/';

// Crear archivo temporal para el ZIP
$tmpZipPath = tempnam(sys_get_temp_dir(), 'pdfs') . '.zip';
error_log("Archivo ZIP temporal creado: " . $tmpZipPath); // Log del archivo temporal

$zip = new ZipArchive();
if ($zip->open($tmpZipPath, ZipArchive::CREATE) !== true) {
    http_response_code(500);
    echo 'No se pudo crear el archivo ZIP';
    exit;
}

// Agregar archivos al ZIP
foreach ($data['files'] as $relativePath) {
    // Obtener la ruta completa del archivo
    $fullPath = realpath($pdfFolder . $relativePath);

    // Log de error si no se encuentra el archivo
    if (!$fullPath) {
        error_log("Archivo no encontrado: " . $pdfFolder . $relativePath);
    } else {
        // Log si se encuentra el archivo
        error_log("Archivo encontrado: " . $fullPath);
    }

    // Verifica la existencia del archivo y agregar al ZIP
    if ($fullPath && file_exists($fullPath)) {
        $zip->addFile($fullPath, basename($fullPath)); // Solo agregar el nombre al ZIP
        error_log("Archivo agregado al ZIP: " . basename($fullPath)); // Log del archivo añadido
    } else {
        error_log("Archivo no encontrado o no se pudo agregar: $relativePath"); // Registra el error si no existe el archivo
    }
}

// Cerrar archivo ZIP
$zip->close();

// Verificar si el archivo ZIP se creó correctamente
if (!file_exists($tmpZipPath) || filesize($tmpZipPath) == 0) {
    error_log("El archivo ZIP no se creó correctamente o está vacío.");
    http_response_code(500);
    echo 'Error al crear el archivo ZIP';
    exit;
}

// Log del tamaño del archivo ZIP después de cerrarlo
error_log("Tamaño del archivo ZIP: " . filesize($tmpZipPath));

// Verificar si el archivo existe antes de enviarlo
if (file_exists($tmpZipPath)) {
    // Enviar ZIP como descarga
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="facturas.zip"');
    header('Content-Length: ' . filesize($tmpZipPath));

    // Leer y enviar el archivo
    readfile($tmpZipPath);
} else {
    error_log("El archivo ZIP no existe o está vacío.");
    http_response_code(500);
    echo 'El archivo ZIP no está disponible';
}

// Eliminar archivo temporal
unlink($tmpZipPath);
exit;
?>

