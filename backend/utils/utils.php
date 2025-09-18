<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

/* =======================
 * Helpers genéricos
 * ======================= */

function slugify(string $text): string {
  $text = iconv('UTF-8', 'ASCII//TRANSLIT', $text);
  $text = preg_replace('~[^\\pL\\d]+~u', '-', $text);
  $text = trim($text, '-');
  $text = strtolower($text);
  $text = preg_replace('~[^-a-z0-9]+~', '', $text);
  return $text ?: 'file';
}

function ensure_dir(string $dir): void {
  if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
  }
}

/** Inferir extensión desde MIME, con fallback */
function ext_from_mime(string $mime, string $fallback = 'bin'): string {
  static $map = [
    // imágenes
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
    // audio
    'audio/mpeg' => 'mp3', 'audio/mp3' => 'mp3', 'audio/mp4' => 'm4a',
    'audio/aac' => 'aac', 'audio/ogg' => 'ogg', 'audio/wav' => 'wav',
  ];
  return $map[$mime] ?? $fallback;
}
function normDate(?string $v): ?string {
  $v = trim((string)$v);
  // Acepta solo YYYY-MM-DD; si viene vacío o inválido -> NULL
  return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
}
// Para los campos númerico se guaden vacios si vienen vacíos
function normNumber($v): ?float {
  if ($v === null) return null;
  if (is_string($v)) {
    $v = trim($v);
    if ($v === '') return null; // <- vacío => NULL
  }
  return is_numeric($v) ? (float)$v : null; // no numérico => NULL
}
/** Año desde fecha YYYY-MM-DD, o año actual */
function year_from_date(?string $date): string {
  if ($date && preg_match('/^(\d{4})/', $date, $m)) return $m[1];
  return date('Y');
}

/** Obtener MIME real con finfo */
function get_mime_from_tmp(string $tmpPath): ?string {
  if (!is_file($tmpPath)) return null;
  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime = $finfo ? finfo_file($finfo, $tmpPath) : null;
  if ($finfo) finfo_close($finfo);
  return $mime ?: null;
}

/* =======================
 * Subida por año con mantener/borrar
 * =======================
 * - $basePath: ruta base FS (e.g. ../uploads/img/PODCASTS)
 * - $inputName: nombre del campo FILE (e.g. 'img' / 'podcast')
 * - $fechaCampo: campo POST con fecha (e.g. 'date')
 * - $fallbackField: campo POST string si no hay archivo (mismo nombre suele valer)
 * - $allowedMimes: lista opcional de MIMEs permitidos
 * - $seed: para nombrar el archivo (título, por ejemplo)
 * - $maxBytes: límite opcional de tamaño
 *
 * Devuelve:
 *  - nombre de archivo (p.ej. 2025_mi-podcast.mp3) si sube o mantiene
 *  - '' si no vino nada y no hay fallback (útil para "no tocar" en update si lo manejas aparte)
 *  - '' si hay error al mover (te permite detectar y responder)
 *  - '' si $fallbackField viene vacío => señal de borrar en UPDATE (poner NULL en DB)
 */

function procesarArchivoPorAnio(
  string $basePath,
  string $inputName,
  string $fechaCampo,
  string $fallbackField,
  array $allowedMimes = [],
  ?string $seed = null,
  ?int $maxBytes = null
): string {
  // Caso 1: archivo nuevo
  if (isset($_FILES[$inputName]) && is_array($_FILES[$inputName]) && $_FILES[$inputName]['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES[$inputName]['tmp_name'];
    $size = $_FILES[$inputName]['size'] ?? 0;

    if ($maxBytes !== null && $size > $maxBytes) {
      return ''; // excede tamaño
    }

    $mime = get_mime_from_tmp($tmp) ?? '';
    if ($allowedMimes && !in_array($mime, $allowedMimes, true)) {
      return ''; // mime no permitido
    }

    $year = year_from_date($_POST[$fechaCampo] ?? null);
    $dir  = rtrim($basePath, '/')."/{$year}";
    ensure_dir($dir);

    $orig = basename($_FILES[$inputName]['name']);
    $ext  = pathinfo($orig, PATHINFO_EXTENSION) ?: ext_from_mime($mime, 'bin');

    $seed = $seed ?: pathinfo($orig, PATHINFO_FILENAME);
    $safe = slugify($seed);
    $final = "{$year}_{$safe}.{$ext}";
    $dest  = "{$dir}/{$final}";

    // Evitar colisiones
    $i = 1;
    while (file_exists($dest)) {
      $final = "{$year}_{$safe}_{$i}.{$ext}";
      $dest  = "{$dir}/{$final}";
      $i++;
    }

    if (move_uploaded_file($tmp, $dest)) {
      return $final; // nombre para guardar en BD
    }
    return ''; // error moviendo
  }

  // Caso 2: no hay archivo => usar fallback POST
  if (array_key_exists($fallbackField, $_POST)) {
    // puede ser string con nombre (mantener) o '' (borrar)
    return (string)$_POST[$fallbackField];
  }

  // Caso 3: no vino ni FILE ni fallback => ''
  return '';
}
/* =======================
 * Aliases compatibles (para no romper tu código)
 * ======================= */

function procesarArchivo(string $basePath, string $inputName, array $postData = []): string {
  // Conservamos la firma, pero recomendamos usar procesarArchivoPorAnio
  if (!isset($_FILES[$inputName]) || $_FILES[$inputName]['error'] !== 0) {
    return '';
  }
  $dir = rtrim($basePath, '/').'/';
  ensure_dir($dir);
  $orig = basename($_FILES[$inputName]['name']);
  $dest = $dir.$orig;
  $i = 1;
  $nameOnly = pathinfo($orig, PATHINFO_FILENAME);
  $ext = pathinfo($orig, PATHINFO_EXTENSION);
  while (file_exists($dest)) {
    $try  = "{$nameOnly}_{$i}.{$ext}";
    $dest = $dir.$try;
    $i++;
  }
  if (move_uploaded_file($_FILES[$inputName]['tmp_name'], $dest)) {
    return basename($dest);
  }
  return '';
}
/* =======================
 * Borrado y búsqueda (genéricos)
 * ======================= */

/** Elimina físicamente el archivo apuntado por $campo en el registro $id y vacía el campo */
function eliminarSoloArchivo($connection, string $tabla, string $campo, int $id, string $carpetaBase): bool {
  $stmt = $connection->prepare("SELECT $campo FROM $tabla WHERE id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $result = $stmt->get_result();
  $record = $result->fetch_assoc();
  $name = $record[$campo] ?? '';

  $path = buscarRutaDeArchivo($carpetaBase, $name);
  if ($path && file_exists($path)) {
    @unlink($path);
  }

  $stmt = $connection->prepare("UPDATE $tabla SET $campo = NULL WHERE id = ?");
  $stmt->bind_param("i", $id);
  return $stmt->execute();
}

/** Elimina el archivo en disco si ya no lo referencia ningún registro */
function eliminarArchivoSiNoSeUsa($connection, string $tabla, string $campo, string $nombre, string $carpetaBase): void {
  if (!$nombre) return;

  $stmt = $connection->prepare("SELECT COUNT(*) as total FROM $tabla WHERE $campo = ?");
  $stmt->bind_param("s", $nombre);
  $stmt->execute();
  $result = $stmt->get_result();
  $row = $result->fetch_assoc();

  if ((int)$row['total'] <= 1) {
    // Buscar en subcarpetas por año y raíz
    $pattern = rtrim($carpetaBase, '/')."*/".$nombre;
    foreach (glob($pattern) ?: [] as $path) {
      if (file_exists($path)) @unlink($path);
    }
    $directPath = rtrim($carpetaBase, '/').'/'.$nombre;
    if (file_exists($directPath)) @unlink($directPath);
  }
}

/** Busca el path de un archivo por nombre en carpeta/AAAA/nombre o carpeta/nombre */
function buscarRutaDeArchivo(string $basePath, string $nombre): ?string {
  if (!$nombre) return null;
  $pattern = rtrim($basePath, '/').'*/'.$nombre;
  $matches = glob($pattern);
  if (!empty($matches)) return $matches[0];

  $direct = rtrim($basePath, '/').'/'.$nombre;
  if (file_exists($direct)) return $direct;

  return null;
}



function validarCamposRequeridos(array $data, array $campos): ?string {
  foreach ($campos as $campo) {
    if (!array_key_exists($campo, $data) || trim((string)$data[$campo]) === '') {
      return $campo;
    }
  }
  return null;
}

function calcAmountSpent(mysqli $connection, int $subsidyId): float {
  $stmt = $connection->prepare(
    "SELECT COALESCE(SUM(total_amount), 0) AS spent
     FROM invoices
     WHERE subsidy_id = ?"
  );
  $stmt->bind_param("i", $subsidyId);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return (float)($row['spent'] ?? 0);
}

function calcAmountSpentIrpf(mysqli $connection, int $subsidyId): float {
  $stmt = $connection->prepare(
    "SELECT COALESCE(SUM(total_amount_irpf), 0) AS spentIrpf
     FROM invoices
     WHERE subsidy_id = ?"
  );
  $stmt->bind_param("i", $subsidyId);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return (float)($row['spentIrpf'] ?? 0);
}
