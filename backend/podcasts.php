<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $override = $_POST['_method'] ?? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
  $override = strtoupper($override);
  if ($override === 'DELETE') {
    $method = 'DELETE';
  }
}

if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);

$basePathImg   = "../uploads/img/PODCASTS/";
$basePathAudio = "../uploads/audio/PODCASTS/";
$ALLOWED_IMG   = ['image/jpeg','image/png','image/webp'];
$ALLOWED_AUDIO = [
  'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
  'audio/ogg','audio/opus','audio/mp4','audio/aac','audio/x-m4a','audio/webm'
];
define('MAX_IMG_BYTES',   10 * 1024 * 1024);  // 10MB
define('MAX_AUDIO_BYTES', 800 * 1024 * 1024); // 800MB aprox.

function slugify_local(string $text): string {
  $text = iconv('UTF-8', 'ASCII//TRANSLIT', $text);
  $text = preg_replace('~[^\\pL\\d]+~u', '-', $text);
  $text = trim($text, '-');
  $text = strtolower($text);
  $text = preg_replace('~[^-a-z0-9]+~', '', $text);
  return $text ?: 'file';
}
function get_mime_from_tmp_local(string $tmpPath): ?string {
  if (!is_file($tmpPath)) return null;
  $finfo = finfo_open(FILEINFO_MIME_TYPE);
  $mime  = $finfo ? finfo_file($finfo, $tmpPath) : null;
  if ($finfo) finfo_close($finfo);
  return $mime ?: null;
}

switch ($method) {
case 'GET':
  if (is_numeric($resource)) {
    $stmt = $connection->prepare("SELECT * FROM podcasts WHERE id = ?");
    $stmt->bind_param("i", $resource);
    $stmt->execute();
    $result = $stmt->get_result();
    $podcast = $result->fetch_assoc();
    echo json_encode($podcast ?: []);
  } else {
    $stmt = $connection->prepare("SELECT * FROM podcasts");
    $stmt->execute();
    $result = $stmt->get_result();
    $podcasts = [];
    while ($row = $result->fetch_assoc()) {
      $podcasts[] = $row;
    }
    echo json_encode($podcasts);
  }
  break;

  case 'POST':
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  // --- Acciones especiales ---
  // Eliminar imagen
  if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
    $type = $_POST['type'] ?? 'podcasts';
    if (!empty($_POST['id'])) {
      $id = (int)$_POST['id'];
      if (eliminarSoloArchivo($connection, strtolower($type), 'img', $id, $basePathImg)) {
        echo json_encode(["message" => "Imagen eliminada correctamente"]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al eliminar imagen"]);
      }
      exit();
    }

    http_response_code(400);
    echo json_encode(["message" => "ID requerido para eliminar imagen"]);
    exit();
  }

  // Eliminar audio
  if (isset($_POST['action']) && $_POST['action'] === 'deleteAudio') {
    $type = $_POST['type'] ?? 'podcasts';
    if (!empty($_POST['id'])) {
      $id = (int)$_POST['id'];
      if (eliminarSoloArchivo($connection, strtolower($type), 'podcast', $id, $basePathAudio)) {
        echo json_encode(["message" => "Audio eliminado correctamente"]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al eliminar audio"]);
      }
      exit();
    }
    http_response_code(400);
    echo json_encode(["message" => "ID requerido para eliminar audio"]);
    exit();
  }

  // --- Imagen (como en books) ---
$imgName = procesarArchivo($basePathImg, "img"); // puede devolver '' si no hay subida
$data = $_POST;

// Fallback defensivo: si sí llegó archivo pero procesarArchivo devolvió vacío,
// inferimos un nombre (slug + ext). Esto NO cambia el comportamiento de books;
// solo evita que subas y no guardes nombre por un edge-case.
if (
  isset($_FILES['img']) &&
  is_array($_FILES['img']) &&
  $_FILES['img']['error'] === UPLOAD_ERR_OK &&
  !$imgName
) {
  $original = basename($_FILES['img']['name']);
  $ext  = pathinfo($original, PATHINFO_EXTENSION);
  $base = pathinfo($original, PATHINFO_FILENAME);
  $fileNamePart = slugify_local($base) ?: 'img';
  $imgName = $fileNamePart . ($ext ? "." . strtolower($ext) : "");
}

$data['img'] = $imgName;
  // Normalizar/validar 'date' (formato Y-m-d). Si llega vacía => NULL
$rawDate = isset($data['date']) ? trim((string)$data['date']) : '';
if ($rawDate === '') {
  $date = null; // o: $date = date('Y-m-d');  // si quieres forzar fecha de hoy
} else {
  $dt = DateTime::createFromFormat('Y-m-d', $rawDate);
  $date = ($dt && $dt->format('Y-m-d') === $rawDate) ? $rawDate : null; // inválida => NULL
}

  // Validación de campos requeridos
  $campoRequerido = validarCamposRequeridos($data, ['title', 'season', 'episode']);
  if ($campoRequerido !== null) {
    http_response_code(400);
    echo json_encode(["message" => "El campo '$campoRequerido' es obligatorio."]);
    exit();
  }

// ---------- AUDIO en carpeta única con nombre season_episode_titulo ----------
$uploadPodcastSingleDir = function(array $data, string $basePathAudio) use ($ALLOWED_AUDIO) {
  // 1) Archivo nuevo en $_FILES['podcast']
  if (isset($_FILES['podcast']) && is_array($_FILES['podcast']) && $_FILES['podcast']['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES['podcast']['tmp_name'];
    $size = (int)($_FILES['podcast']['size'] ?? 0);

    if (defined('MAX_AUDIO_BYTES') && MAX_AUDIO_BYTES > 0 && $size > MAX_AUDIO_BYTES) {
      http_response_code(400);
      echo json_encode(["message" => "El audio supera el tamaño permitido."]);
      exit();
    }

    $mime = get_mime_from_tmp_local($tmp) ?? ($_FILES['podcast']['type'] ?? '');
    // Validación de mime (acepta comodín audio/*)
    $allowed = false;
    foreach ($ALLOWED_AUDIO as $a) {
      if ($a === $mime) { $allowed = true; break; }
      if (substr($a, -2) === '/*' && strpos($mime, substr($a, 0, -1)) === 0) { $allowed = true; break; }
    }
    if (!$allowed) {
      http_response_code(400);
      echo json_encode(["message" => "Tipo no permitido para 'podcast' ($mime)."]);
      exit();
    }

    // 1) Lee season/episode y acolcha a 2 dígitos
    $season  = isset($data['season'])  && $data['season']  !== '' ? (int)$data['season']  : null;
    $episode = isset($data['episode']) && $data['episode'] !== '' ? (int)$data['episode'] : null;

    $seasonPart  = $season  !== null ? str_pad((string)$season,  2, '0', STR_PAD_LEFT) : null; // 1 -> "01"
    $episodePart = $episode !== null ? str_pad((string)$episode, 2, '0', STR_PAD_LEFT) : null; // 3 -> "03"

    // 2) Toma el nombre del archivo subido (sin extensión) y lo "slugifica"
    $original = basename($_FILES['podcast']['name']);
    $baseName = pathinfo($original, PATHINFO_FILENAME);
    $ext      = pathinfo($original, PATHINFO_EXTENSION);

    // Fallback de extensión si viene sin ext
    if (!$ext) {
      $m = $mime;
      if (str_contains($m, 'mpeg') || str_contains($m, 'mp3')) $ext = 'mp3';
      elseif (str_contains($m, 'wav')) $ext = 'wav';
      elseif (str_contains($m, 'ogg')) $ext = 'ogg';
      elseif (str_contains($m, 'mp4') || str_contains($m, 'm4a') || str_contains($m, 'aac')) $ext = 'm4a';
      else $ext = 'bin';
    }

    $fileNamePart = slugify_local($baseName);

    // 3) Monta: season_episode_nombre-archivo
    $parts = [];
    if ($seasonPart  !== null) { $parts[] = $seasonPart; }
    if ($episodePart !== null) { $parts[] = $episodePart; }
    $parts[] = $fileNamePart;

    $seed  = implode('_', $parts);         // "01_03_mi-audio-final"
    $final = "{$seed}.{$ext}";
    $dir   = rtrim($basePathAudio, '/');   // ../uploads/audio/PODCASTS
    if (!is_dir($dir)) { mkdir($dir, 0755, true); }
    $dest  = "{$dir}/{$final}";

    // Evitar colisiones
    $i = 1;
    while (file_exists($dest)) {
      $final = "{$seed}_{$i}.{$ext}";
      $dest  = "{$dir}/{$final}";
      $i++;
    }

    if (!move_uploaded_file($_FILES['podcast']['tmp_name'], $dest)) {
      http_response_code(500);
      echo json_encode(["message" => "No se pudo mover el archivo 'podcast'."]);
      exit();
    }

    return $final; // <- Guarda este nombre en BD
  } // <-- ❗ CIERRE del if de archivo nuevo (faltaba)

  // 2) Sin archivo nuevo:
  //    - si viene string => mantener
  //    - si viene '' => borrar
  if (array_key_exists('podcast', $_POST)) {
    return (string)$_POST['podcast']; // '' => borrar; 'nombre.ext' => mantener
  }

  // 3) No vino nada del campo => '' (no cambio en update)
  return '';
};


$podcastName = $uploadPodcastSingleDir($data, $basePathAudio);


  // Normalizar numéricos
  $duration = isset($data['duration']) && $data['duration'] !== '' ? (int)$data['duration'] : null;
  $season   = isset($data['season'])   && $data['season']   !== '' ? (int)$data['season']   : null;
  $episode  = isset($data['episode'])  && $data['episode']  !== '' ? (int)$data['episode']  : null;

  $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

  if ($isUpdate) {
    $id = isset($data['id']) ? (int)$data['id'] : null;
    if (!$id) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    // Traer actuales para poder limpiar si cambian
    $stmtCurrent = $connection->prepare("SELECT img, podcast FROM podcasts WHERE id = ?");
    $stmtCurrent->bind_param("i", $id);
    $stmtCurrent->execute();
    $result = $stmtCurrent->get_result();
    $current = $result->fetch_assoc();
    $oldImg = $current['img'] ?? '';
    $oldPodcast = $current['podcast'] ?? '';

    // Imagen: mismo comportamiento que books
if ($imgName === '') {
  $imgName = $oldImg; // conservar la anterior si no llegó nueva
}

// Audio: tu lógica tal cual
if ($podcastName === '') {
  $podcastName = $oldPodcast;
}

    // UPDATE
    $stmt = $connection->prepare("
      UPDATE podcasts
      SET title = ?, date = ?, description = ?, img = ?, artists = ?, technics = ?, duration = ?, podcast = ?, season = ?, episode = ?
      WHERE id = ?
    ");
    // s s s s s s i s i i i
    $stmt->bind_param(
      "ssssssisiii",
      $data['title'],
      $date,
      $data['description'],
      $imgName,
      $data['artists'],
      $data['technics'],
      $duration,
      $podcastName,
      $season,
      $episode,
      $id
    );

    if ($stmt->execute()) {
      // limpiar ficheros antiguos si cambiaron
      if ($oldImg && $imgName !== $oldImg) {
        eliminarArchivoSiNoSeUsa($connection, 'podcasts', 'img', $oldImg, $basePathImg);
      }
      if ($oldPodcast && $podcastName !== $oldPodcast) {
        eliminarArchivoSiNoSeUsa($connection, 'podcasts', 'podcast', $oldPodcast, $basePathAudio);
      }
      echo json_encode(["message" => "Podcast actualizado con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al actualizar el podcast: " . $stmt->error]);
    }

  } else {
    $stmt = $connection->prepare("
      INSERT INTO podcasts
        (title, date, description, img, artists, technics, duration, podcast, season, episode)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->bind_param(
      "ssssssisii",
      $data['title'],
    $date,
      $data['description'],
      $imgName,
      $data['artists'],
      $data['technics'],
      $duration,
      $podcastName,
      $season,
      $episode
    );

    if ($stmt->execute()) {
      echo json_encode(["message" => "Podcast añadido con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al añadir el podcast: " . $stmt->error]);
    }
  }
  break;


  case 'DELETE':
  $id = $_POST['id'] ?? $_GET['id'] ?? null;
  if (!is_numeric($id)) {
    $id = (int)$_GET['id'];
  } elseif (isset($resource) && is_numeric($resource)) {
    $id = (int)$resource;
  }

  if (!$id) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido."]);
    break;
  }

  // 1) Leer nombres actuales para poder limpiar ficheros después
  $stmt = $connection->prepare("SELECT img, podcast FROM podcasts WHERE id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();

  if (!$row) {
    http_response_code(404);
    echo json_encode(["message" => "Podcast no encontrado."]);
    break;
  }

  $imgToDelete     = $row['img'] ?? '';
  $podcastToDelete = $row['podcast'] ?? '';

  // 2) Borrar el registro
  $stmt = $connection->prepare("DELETE FROM podcasts WHERE id = ?");
  $stmt->bind_param("i", $id);

  if ($stmt->execute()) {
    // 3) Limpiar ficheros si ya no se usan por otros registros
    if ($imgToDelete) {
      eliminarArchivoSiNoSeUsa($connection, 'podcasts', 'img', $imgToDelete, $basePathImg);
    }
    if ($podcastToDelete) {
      // Reutilizamos el mismo helper; funciona igual para audio
      eliminarArchivoSiNoSeUsa($connection, 'podcasts', 'podcast', $podcastToDelete, $basePathAudio);
    }

    echo json_encode(["message" => "Podcast eliminado con éxito."]);
  } else {
    http_response_code(500);
    echo json_encode(["message" => "Error al eliminar el podcast: " . $stmt->error]);
  }
  break;
}
