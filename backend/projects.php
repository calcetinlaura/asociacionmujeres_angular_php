<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php';

/* ============================================================
   Función: enriquecer un evento con placeData y salaData
   ============================================================ */
if (!function_exists('enrichEventRow')) {
  function enrichEventRow(array $row, mysqli $connection): array {
    $row['placeData'] = !empty($row['place_id']) ? [
      'id'      => $row['place_id'],
      'name'    => $row['place_name'] ?? '',
      'address' => $row['place_address'] ?? '',
      'lat'     => $row['place_lat'] ?? '',
      'lon'     => $row['place_lon'] ?? '',
    ] : null;

    $row['salaData'] = !empty($row['sala_id']) ? [
      'id'            => $row['sala_id'],
      'name'          => $row['sala_name'] ?? '',
      'room_location' => $row['sala_location'] ?? ''
    ] : null;

    if (!isset($row['category'])) $row['category'] = [];
    return $row;
  }
}

/* ============================================================
   Configuración del método HTTP
   ============================================================ */
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
$basePath = "../uploads/img/PROJECTS/";

/* ============================================================
   Funciones auxiliares
   ============================================================ */
function getActivities($connection, $projectId) {
  $stmt = $connection->prepare("SELECT * FROM activities WHERE project_id = ?");
  $stmt->bind_param("i", $projectId);
  $stmt->execute();
  $result = $stmt->get_result();
  $activities = [];

  while ($row = $result->fetch_assoc()) {
    $activities[] = $row;
  }
  return $activities;
}

function saveActivities($connection, $projectId, $activities) {
  $connection->query("DELETE FROM activities WHERE project_id = $projectId");
  $stmt = $connection->prepare("INSERT INTO activities (project_id, name, budget, attendant, observations) VALUES (?, ?, ?, ?, ?)");

  foreach ($activities as $activity) {
    $name = $activity['name'] ?? '';
    $budget = isset($activity['budget']) ? (float)$activity['budget'] : null;
    $attendant = $activity['attendant'] ?? null;
    $observations = $activity['observations'] ?? null;

    $stmt->bind_param("isdss", $projectId, $name, $budget, $attendant, $observations);
    $stmt->execute();
  }
}

/* ============================================================
   Rutas principales
   ============================================================ */
switch ($method) {

  // ============================================================
  // GET: obtener proyectos (uno, por año o todos)
  // ============================================================
  case 'GET':

    // 1️⃣ Obtener un proyecto por ID
    if (is_numeric($resource)) {
      $stmt = $connection->prepare("
        SELECT p.*, s.name AS subsidy_name
        FROM projects p
        LEFT JOIN subsidies s ON p.subsidy_id = s.id
        WHERE p.id = ?
      ");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $project = $result->fetch_assoc();

      if ($project) {
        // Eventos con datos de lugar y sala
        $eventStmt = $connection->prepare("
         SELECT
  e.id, e.title, e.start, e.time_start, e.description,
  e.published, e.publish_day, e.img,
  e.town,                         -- 👈 añade esto
  e.place_id, e.sala_id,
  p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
  s.name AS sala_name, s.room_location AS sala_location
FROM events e
LEFT JOIN places p ON e.place_id = p.id
LEFT JOIN salas s ON e.sala_id = s.sala_id
WHERE e.project_id = ?
ORDER BY e.start ASC
        ");
        $eventStmt->bind_param("i", $project['id']);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $events = [];
        while ($event = $eventResult->fetch_assoc()) {
          $events[] = enrichEventRow($event, $connection);
        }
        $project['events'] = $events;

        // Facturas (invoices)
        $invoiceStmt = $connection->prepare("
          SELECT
            invoices.*, creditors.cif AS creditor_cif,
            creditors.company AS creditor_company,
            creditors.contact AS creditor_contact
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          WHERE invoices.project_id = ?
          ORDER BY invoices.date_invoice ASC
        ");
        $invoiceStmt->bind_param("i", $project['id']);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        $invoices = [];
        while ($invoice = $invoiceResult->fetch_assoc()) {
          $invoices[] = $invoice;
        }
        $project['invoices'] = $invoices;

        // Actividades
        $project['activities'] = getActivities($connection, $project['id']);
      }

      echo json_encode($project ?: []);
      break;
    }

    // 2️⃣ Obtener proyectos por año
    elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = $_GET['year'];
      $stmt = $connection->prepare("
        SELECT p.*, s.name AS subsidy_name
        FROM projects p
        LEFT JOIN subsidies s ON p.subsidy_id = s.id
        WHERE p.year = ?
      ");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $projects = [];

      while ($row = $result->fetch_assoc()) {
        $projectId = $row['id'];

        $eventStmt = $connection->prepare("
         SELECT
  e.id, e.title, e.start, e.time_start, e.description,
  e.published, e.publish_day, e.img,
  e.town,                         -- 👈 añade esto
  e.place_id, e.sala_id,
  p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
  s.name AS sala_name, s.room_location AS sala_location
FROM events e
LEFT JOIN places p ON e.place_id = p.id
LEFT JOIN salas s ON e.sala_id = s.sala_id
WHERE e.project_id = ?
ORDER BY e.start ASC
        ");
        $eventStmt->bind_param("i", $projectId);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $events = [];
        while ($event = $eventResult->fetch_assoc()) {
          $events[] = enrichEventRow($event, $connection);
        }
        $row['events'] = $events;

        $invoiceStmt = $connection->prepare("
          SELECT
            invoices.*, creditors.cif AS creditor_cif,
            creditors.company AS creditor_company,
            creditors.contact AS creditor_contact
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          WHERE invoices.project_id = ?
          ORDER BY invoices.date_invoice ASC
        ");
        $invoiceStmt->bind_param("i", $projectId);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        $invoices = [];
        while ($invoice = $invoiceResult->fetch_assoc()) {
          $invoices[] = $invoice;
        }
        $row['invoices'] = $invoices;

        $row['activities'] = getActivities($connection, $projectId);
        $projects[] = $row;
      }

      echo json_encode($projects);
      break;
    }

    // 3️⃣ Obtener todos los proyectos
    else {
      $stmt = $connection->prepare("
        SELECT p.*, s.name AS subsidy_name
        FROM projects p
        LEFT JOIN subsidies s ON p.subsidy_id = s.id
      ");
      $stmt->execute();
      $result = $stmt->get_result();
      $projects = [];

      while ($row = $result->fetch_assoc()) {
        $projectId = $row['id'];

        $eventStmt = $connection->prepare("
         SELECT
  e.id, e.title, e.start, e.time_start, e.description,
  e.published, e.publish_day, e.img,
  e.town,                         -- 👈 añade esto
  e.place_id, e.sala_id,
  p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
  s.name AS sala_name, s.room_location AS sala_location
FROM events e
LEFT JOIN places p ON e.place_id = p.id
LEFT JOIN salas s ON e.sala_id = s.sala_id
WHERE e.project_id = ?
ORDER BY e.start ASC
        ");
        $eventStmt->bind_param("i", $projectId);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $events = [];
        while ($event = $eventResult->fetch_assoc()) {
          $events[] = enrichEventRow($event, $connection);
        }
        $row['events'] = $events;

        $invoiceStmt = $connection->prepare("
          SELECT
            invoices.*, creditors.cif AS creditor_cif,
            creditors.company AS creditor_company,
            creditors.contact AS creditor_contact
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          WHERE invoices.project_id = ?
          ORDER BY invoices.date_invoice ASC
        ");
        $invoiceStmt->bind_param("i", $projectId);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();
        $invoices = [];
        while ($invoice = $invoiceResult->fetch_assoc()) {
          $invoices[] = $invoice;
        }
        $row['invoices'] = $invoices;

        $row['activities'] = getActivities($connection, $projectId);
        $projects[] = $row;
      }

      echo json_encode($projects);

    }

break;


    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      // 🔥 Eliminar imagen
      if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
        $type = $_POST['type'];

        if (!empty($_POST['id'])) {
          $id = (int)$_POST['id'];
          if (eliminarSoloArchivo($connection, strtolower($type), 'img', $id, $basePath)) {
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

      $data = $_POST;
      $activities = isset($data['activities']) ? json_decode($data['activities'], true) : [];
      $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

      if ($isUpdate) {
        $id = isset($data['id']) ? (int)$data['id'] : null;
        if (!$id) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        $stmt = $connection->prepare("UPDATE projects SET title = ?, description = ?, subsidy_id = ?, year = ? WHERE id = ?");
        $stmt->bind_param("ssiii", $data['title'], $data['description'], $data['subsidy_id'], $data['year'], $id);
        if ($stmt->execute()) {
          // 🔥 Guardar actividades
          saveActivities($connection, $id, $activities);
          echo json_encode(["message" => "Proyecto actualizado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar el proyecto: " . $stmt->error]);
        }
      } else {
        $stmt = $connection->prepare("INSERT INTO projects (title, description, subsidy_id, year) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssii", $data['title'], $data['description'], $data['subsidy_id'], $data['year']);
        if ($stmt->execute()) {
          $newId = $connection->insert_id;
          // 🔥 Guardar actividades nuevas
          saveActivities($connection, $newId, $activities);
          echo json_encode(["message" => "Proyecto creado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al guardar el proyecto: " . $stmt->error]);
        }
      }
      break;


  case 'DELETE':
   $id = $_POST['id'] ?? $_GET['id'] ?? null;
    if (!is_numeric($id)) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }
    $stmt = $connection->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
      echo json_encode(["message" => "Proyecto eliminado con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar el proyecto: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
