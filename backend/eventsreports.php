<?php
// ------------------------------------------------------
// CORS / Headers
// ------------------------------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

// ------------------------------------------------------
// Includes
// ------------------------------------------------------
include '../config/conexion.php';

// ------------------------------------------------------
// Método HTTP + preflight
// ------------------------------------------------------
$method = $_SERVER['REQUEST_METHOD'];
error_log("🔹 Método recibido: $method");

if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

// Permitimos override solo para DELETE (PATCH se maneja dentro de POST)
if ($method === 'POST') {
  $override = $_POST['_method'] ?? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
  $override = strtoupper($override);
  if ($override === 'DELETE') {
    $method = 'DELETE';
  }
  error_log("🔹 Override detectado: $override");
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function respond($payload, int $status = 200) {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit();
}

function get_int_or_null($v) {
  return (isset($v) && $v !== '' && is_numeric($v)) ? (int)$v : null;
}
function get_str_or_null($v) {
  return (isset($v) && $v !== '') ? (string)$v : null;
}

// ------------------------------------------------------
// Lógica principal
// ------------------------------------------------------
switch ($method) {

  // ────────────────────────────────
  // GET → obtener informes
  // ────────────────────────────────
  case 'GET':

    // 🔹 1. Resumen: solo devolver los event_id que tienen informe
    if (isset($_GET['list']) && $_GET['list'] === 'event_ids') {
  error_log("🟢 list=event_ids solicitado");

  $sql = "SELECT DISTINCT event_id FROM event_report"; // 👈 usa el nombre real
  $res = $connection->query($sql);

  $ids = [];
  if ($res) {
    while ($row = $res->fetch_assoc()) {
      if (!empty($row['event_id'])) {
        $ids[] = (int)$row['event_id'];
      }
    }
  }

  error_log("📋 IDs encontrados: " . json_encode($ids));
  echo json_encode($ids);
  exit();
}

    // 🔹 2. Obtener un informe por su ID
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
      $id = (int)$_GET['id'];
      $stmt = $connection->prepare("SELECT * FROM event_report WHERE id = ?");
      $stmt->bind_param("i", $id);
      $stmt->execute();
      $result = $stmt->get_result();
      respond($result->fetch_assoc() ?: []);
    }

    // 🔹 3. Obtener informes por event_id
    if (isset($_GET['event_id']) && is_numeric($_GET['event_id'])) {
      $event_id = (int)$_GET['event_id'];
      $stmt = $connection->prepare("SELECT * FROM event_report WHERE event_id = ? ORDER BY created_at DESC");
      $stmt->bind_param("i", $event_id);
      $stmt->execute();
      $res = $stmt->get_result();
      $rows = [];
      while ($r = $res->fetch_assoc()) $rows[] = $r;
      respond($rows);
    }

    // 🔹 4. Obtener todos los informes
    $res = $connection->query("SELECT * FROM event_report ORDER BY created_at DESC");
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    respond($rows);
    break;


  // ────────────────────────────────
  // POST → crear o actualizar informe
  // ────────────────────────────────
  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    $data = $_POST;
    error_log("📦 POST recibido: " . print_r($data, true));

    if (empty($data['event_id'])) {
      respond(["message" => "El campo 'event_id' es obligatorio."], 400);
    }

    $event_id           = get_int_or_null($data['event_id']);
    $attendance_real    = get_int_or_null($data['attendance_real'] ?? null);
    $satisfaction_avg   = get_str_or_null($data['satisfaction_avg'] ?? null);
    $incidents          = get_str_or_null($data['incidents'] ?? null);
    $highlights         = get_str_or_null($data['highlights'] ?? null);
    $improvements       = get_str_or_null($data['improvements'] ?? null);
    $collaborators_eval = get_str_or_null($data['collaborators_eval'] ?? null);
    $notes              = get_str_or_null($data['notes'] ?? null);
    $author             = get_int_or_null($data['author'] ?? null);

    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';
    error_log("🧩 isUpdate = " . ($isUpdate ? 'true' : 'false'));

    if ($isUpdate) {
      $id = isset($data['id']) ? (int)$data['id'] : 0;
      if ($id <= 0) respond(["message" => "ID no válido para actualizar informe."], 400);

      $sql = "
        UPDATE event_report
        SET
          event_id = ?,
          attendance_real = ?,
          satisfaction_avg = ?,
          incidents = ?,
          highlights = ?,
          improvements = ?,
          collaborators_eval = ?,
          notes = ?,
          author = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      ";
      $stmt = $connection->prepare($sql);
      if (!$stmt) {
        respond(["message" => "Error preparando UPDATE: " . $connection->error], 500);
      }

      $stmt->bind_param(
        "iissssssii",
        $event_id,
        $attendance_real,
        $satisfaction_avg,
        $incidents,
        $highlights,
        $improvements,
        $collaborators_eval,
        $notes,
        $author,
        $id
      );

      if ($stmt->execute()) {
        respond(["message" => "Informe actualizado con éxito."]);
      } else {
        respond(["message" => "Error al actualizar informe: " . $stmt->error], 500);
      }

    } else {
      $sql = "
        INSERT INTO event_report (
          event_id, attendance_real, satisfaction_avg,
          incidents, highlights, improvements,
          collaborators_eval, notes, author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ";
      $stmt = $connection->prepare($sql);
      if (!$stmt) {
        respond(["message" => "Error preparando INSERT: " . $connection->error], 500);
      }

      $stmt->bind_param(
        "iissssssi",
        $event_id,
        $attendance_real,
        $satisfaction_avg,
        $incidents,
        $highlights,
        $improvements,
        $collaborators_eval,
        $notes,
        $author
      );

      if ($stmt->execute()) {
        respond(["message" => "Informe creado con éxito.", "id" => $connection->insert_id]);
      } else {
        respond(["message" => "Error al crear informe: " . $stmt->error], 500);
      }
    }
    break;

  // ────────────────────────────────
  // DELETE → eliminar informe
  // ────────────────────────────────
  case 'DELETE':
    $id = $_POST['id'] ?? $_GET['id'] ?? null;
    if (!is_numeric($id)) respond(["message" => "ID no válido."], 400);

    $stmt = $connection->prepare("DELETE FROM event_report WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      respond(["message" => "Informe eliminado con éxito."]);
    } else {
      respond(["message" => "Error al eliminar informe: " . $stmt->error], 500);
    }
    break;

  // ────────────────────────────────
  // Método no permitido
  // ────────────────────────────────
  default:
    respond(["message" => "Método no permitido"], 405);
}
?>
