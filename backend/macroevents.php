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
$basePath = "../uploads/img/MACROEVENTS/";

/* ============================
 * Helpers
 * ============================ */

// Prefetch de categorías para muchos eventos a la vez
if (!function_exists('fetchCategoriesForEventsBulk')) {
  function fetchCategoriesForEventsBulk(mysqli $connection, array $eventIds): array {
    $eventIds = array_values(array_unique(array_map('intval', $eventIds)));
    if (!$eventIds) return [];

    $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
    $types = str_repeat('i', count($eventIds));

    $sql = "SELECT event_id, category FROM event_categories WHERE event_id IN ($placeholders)";
    $stmt = $connection->prepare($sql);
    $stmt->bind_param($types, ...$eventIds);
    $stmt->execute();
    $res = $stmt->get_result();

    $map = [];
    while ($row = $res->fetch_assoc()) {
      $eid = (int)$row['event_id'];
      $cat = (string)$row['category'];
      $map[$eid][] = $cat;
    }

    foreach ($map as $eid => $cats) {
      $map[$eid] = array_values(array_unique($cats));
    }
    return $map;
  }
}

// Enriquecer un evento con place/sala (sin consultas extra)
if (!function_exists('enrichEventRow')) {
  function enrichEventRow(array $row, mysqli $connection): array {
    $row['placeData'] = !empty($row['place_id']) ? [
      'id'      => $row['place_id'],
      'name'    => $row['place_name'] ?? '',
      'address' => $row['place_address'] ?? '',
      'lat'     => $row['place_lat'] ?? '',
      'lon'     => $row['place_lon'] ?? '',
    ] : null;

    // Usamos 'room_location' para ser consistente con events.php
    $row['salaData'] = !empty($row['sala_id']) ? [
      'id'            => $row['sala_id'],
      'name'          => $row['sala_name'] ?? '',
      'room_location' => $row['sala_location'] ?? ''
    ] : null;

    // category ya viene preinyectado por el prefetch; si no, asegúralo a []
    if (!isset($row['category'])) $row['category'] = [];

    return $row;
  }
}

/* ============================
 * Rutas
 * ============================ */
switch ($method) {
  case 'GET':

    if (is_numeric($resource)) {
      // ---------- GET macroevento por ID ----------
      $stmt = $connection->prepare("SELECT * FROM macroevents WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $macroevent = $stmt->get_result()->fetch_assoc();

      if ($macroevent) {
        $stmt = $connection->prepare("
          SELECT e.*,
                 p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
                 s.name AS sala_name,  s.room_location AS sala_location
          FROM events e
          LEFT JOIN places p ON e.place_id = p.id
          LEFT JOIN salas  s ON e.sala_id = s.sala_id
          WHERE e.macroevent_id = ?
          ORDER BY e.start ASC
        ");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        // Prefetch de categorías en bloque y asignación
        $ids = array_column($events, 'id');
        $catsMap = fetchCategoriesForEventsBulk($connection, $ids);
        foreach ($events as &$e) {
          $e['category'] = $catsMap[$e['id']] ?? [];
        }
        unset($e);

        // Enriquecer filas (placeData, salaData, etc.)
        $events = array_map(fn($e) => enrichEventRow($e, $connection), $events);

        $macroevent['events'] = $events;
        echo json_encode($macroevent);
      } else {
        echo json_encode([]);
      }
      break;
    }

    if (isset($_GET['year']) && is_numeric($_GET['year'])) {
      // ---------- GET macroeventos por año ----------
      $year = (int) $_GET['year'];

      $stmt = $connection->prepare("SELECT * FROM macroevents WHERE YEAR(start) = ?");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $macroevents = $result->fetch_all(MYSQLI_ASSOC);

      $macroeventIds = array_column($macroevents, 'id');

      if (!empty($macroeventIds)) {
        $placeholders = implode(',', array_fill(0, count($macroeventIds), '?'));
        $types = str_repeat('i', count($macroeventIds));

        $stmt2 = $connection->prepare("
          SELECT e.*,
                 p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
                 s.name AS sala_name,  s.room_location AS sala_location
          FROM events e
          LEFT JOIN places p ON e.place_id = p.id
          LEFT JOIN salas  s ON e.sala_id = s.sala_id
          WHERE e.macroevent_id IN ($placeholders)
          ORDER BY e.start ASC
        ");
        $stmt2->bind_param($types, ...$macroeventIds);
        $stmt2->execute();
        $eventsResult = $stmt2->get_result();
        $allEvents = $eventsResult->fetch_all(MYSQLI_ASSOC);

        // Prefetch categorías y asignación
        $ids = array_column($allEvents, 'id');
        $catsMap = fetchCategoriesForEventsBulk($connection, $ids);
        foreach ($allEvents as &$e) {
          $e['category'] = $catsMap[$e['id']] ?? [];
        }
        unset($e);

        // Enriquecer filas
        $allEvents = array_map(fn($e) => enrichEventRow($e, $connection), $allEvents);

        // Agrupar por macroevent_id
        $groupedEvents = [];
        foreach ($allEvents as $event) {
          $groupedEvents[$event['macroevent_id']][] = $event;
        }

        // Inyectar a cada macroevento
        foreach ($macroevents as &$macroevent) {
          $macroevent['events'] = $groupedEvents[$macroevent['id']] ?? [];
        }
        unset($macroevent);
      }

      echo json_encode($macroevents);
      break;
    }

    // ---------- GET listado de macroeventos ----------
    $stmt = $connection->prepare("SELECT * FROM macroevents");
    $stmt->execute();
    $result = $stmt->get_result();
    $macroevents = $result->fetch_all(MYSQLI_ASSOC);

    $macroeventIds = array_column($macroevents, 'id');

    if (!empty($macroeventIds)) {
      $placeholders = implode(',', array_fill(0, count($macroeventIds), '?'));
      $types = str_repeat('i', count($macroeventIds));

      $stmt2 = $connection->prepare("
        SELECT e.*,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name,  s.room_location AS sala_location
        FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas  s ON e.sala_id = s.sala_id
        WHERE e.macroevent_id IN ($placeholders)
        ORDER BY e.start ASC
      ");
      $stmt2->bind_param($types, ...$macroeventIds);
      $stmt2->execute();
      $eventsResult = $stmt2->get_result();
      $allEvents = $eventsResult->fetch_all(MYSQLI_ASSOC);

      // Prefetch categorías y asignación
      $ids = array_column($allEvents, 'id');
      $catsMap = fetchCategoriesForEventsBulk($connection, $ids);
      foreach ($allEvents as &$e) {
        $e['category'] = $catsMap[$e['id']] ?? [];
      }
      unset($e);

      // Enriquecer filas
      $allEvents = array_map(fn($e) => enrichEventRow($e, $connection), $allEvents);

      // Agrupar por macroevent_id
      $groupedEvents = [];
      foreach ($allEvents as $event) {
        $groupedEvents[$event['macroevent_id']][] = $event;
      }

      // Inyectar a cada macroevento
      foreach ($macroevents as &$macroevent) {
        $macroevent['events'] = $groupedEvents[$macroevent['id']] ?? [];
      }
      unset($macroevent);
    }

    echo json_encode($macroevents);
    break;

  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    // --- Eliminar imagen si viene la acción específica ---
    if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
      $type = $_POST['type'] ?? 'macroevents';
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
    $campoFaltante = validarCamposRequeridos($data, ['title', 'start']);
    if ($campoFaltante !== null) {
      http_response_code(400);
      echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
      exit();
    }

    // Subida de imagen (por año del start)
    $imgName = '';
    if (isset($_FILES['img']) && $_FILES['img']['error'] === 0) {
      $fechaEvento = $_POST['start'] ?? '';
      if (!$fechaEvento) {
        http_response_code(400);
        echo json_encode(["message" => "Fecha de evento (start) requerida para procesar la imagen."]);
        exit();
      }
      $anio = date('Y', strtotime($fechaEvento));
      $rutaPorAnio = rtrim($basePath, '/').'/'.$anio.'/';
      if (!file_exists($rutaPorAnio)) {
        @mkdir($rutaPorAnio, 0777, true);
      }

      $imgName = $anio . "_" . basename($_FILES['img']['name']);
      @move_uploaded_file($_FILES['img']['tmp_name'], $rutaPorAnio . $imgName);
    }

    $data['img'] = $imgName;
    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    if ($isUpdate) {
      // ---------- UPDATE ----------
      $id = isset($data['id']) ? (int)$data['id'] : null;
      if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      // Imagen anterior
      $stmtCurrent = $connection->prepare("SELECT img FROM macroevents WHERE id = ?");
      $stmtCurrent->bind_param("i", $id);
      $stmtCurrent->execute();
      $current = $stmtCurrent->get_result()->fetch_assoc();
      $oldImg = $current['img'] ?? '';

      if ($imgName === '') {
        $imgName = $oldImg;
      }

      $stmt = $connection->prepare("
        UPDATE macroevents
        SET title = ?, start = ?, end = ?, description = ?, summary =?, province = ?, town = ?, img = ?
        WHERE id = ?
      ");
      $stmt->bind_param(
        "ssssssssi",
        $data['title'],
        $data['start'],
        $data['end'],
        $data['description'],$data['summary'],
        $data['province'],
        $data['town'],
        $imgName,
        $id
      );

      if ($stmt->execute()) {
        if ($oldImg && $oldImg !== $imgName) {
          eliminarArchivoSiNoSeUsa($connection, 'macroevents', 'img', $oldImg, $basePath, true);
        }
        echo json_encode(["message" => "Macroevento actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar el macroevento: " . $stmt->error]);
      }

    } else {
      // ---------- INSERT ----------
      $stmt = $connection->prepare("
        INSERT INTO macroevents (title, start, end, description, summary, province, town, img)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->bind_param(
        "ssssssss",
        $data['title'],
        $data['start'],
        $data['end'],
        $data['description'], $data['summary'],
        $data['province'],
        $data['town'],
        $imgName
      );

      if ($stmt->execute()) {
        echo json_encode(["message" => "Macroevento creado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al crear el macroevento: " . $stmt->error]);
      }
    }
    break;

  case 'DELETE':
    $id = $_POST['id'] ?? $_GET['id'] ?? null;
    if (!$id) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    // Capturar imagen para limpieza posterior
    $stmtImg = $connection->prepare("SELECT img FROM macroevents WHERE id = ?");
    $stmtImg->bind_param("i", $id);
    $stmtImg->execute();
    $imgData = $stmtImg->get_result()->fetch_assoc();
    $imgToDelete = $imgData['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM macroevents WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarArchivoSiNoSeUsa($connection, 'macroevents', 'img', $imgToDelete, $basePath, true);
      }
      echo json_encode(["message" => "Macroevento eliminado con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar el macroevento: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
