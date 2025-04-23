<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);
$basePath = "../uploads/img/MACROEVENTS/";

switch ($method) {
  case 'GET':

    function enrichEventRow($row, $connection) {
      $row['placeData'] = !empty($row['place_id']) ? [
        'id' => $row['place_id'],
        'name' => $row['place_name'] ?? '',
        'address' => $row['place_address'] ?? '',
        'lat' => $row['place_lat'] ?? '',
        'lon' => $row['place_lon'] ?? ''
      ] : null;

      $row['salaData'] = !empty($row['sala_id']) ? [
        'id' => $row['sala_id'],
        'name' => $row['sala_name'] ?? '',
        'location' => $row['sala_location'] ?? ''
      ] : null;

      return $row;
    }

    if (is_numeric($resource)) {
      // Obtener macroevento específico
      $stmt = $connection->prepare("SELECT * FROM macroevents WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $macroevent = $stmt->get_result()->fetch_assoc();

      if ($macroevent) {
        $stmt = $connection->prepare("
          SELECT e.*,
                 p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
                 s.name AS sala_name, s.location AS sala_location
          FROM events e
          LEFT JOIN places p ON e.place_id = p.id
          LEFT JOIN salas s ON e.sala_id = s.sala_id
          WHERE e.macroevent_id = ?
          ORDER BY e.start ASC
        ");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        $events = array_map(fn($e) => enrichEventRow($e, $connection), $events);

        $macroevent['events'] = $events;
        echo json_encode($macroevent);
      } else {
        echo json_encode([]);
      }

    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = $_GET['year'];

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
                 s.name AS sala_name, s.location AS sala_location
          FROM events e
          LEFT JOIN places p ON e.place_id = p.id
          LEFT JOIN salas s ON e.sala_id = s.sala_id
          WHERE e.macroevent_id IN ($placeholders)
          ORDER BY e.start ASC
        ");
        $stmt2->bind_param($types, ...$macroeventIds);
        $stmt2->execute();
        $eventsResult = $stmt2->get_result();
        $allEvents = $eventsResult->fetch_all(MYSQLI_ASSOC);

        $allEvents = array_map(fn($e) => enrichEventRow($e, $connection), $allEvents);

        $groupedEvents = [];
        foreach ($allEvents as $event) {
          $groupedEvents[$event['macroevent_id']][] = $event;
        }

        foreach ($macroevents as &$macroevent) {
          $macroevent['events'] = $groupedEvents[$macroevent['id']] ?? [];
        }
      }

      echo json_encode($macroevents);

    } else {
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
                 s.name AS sala_name, s.location AS sala_location
          FROM events e
          LEFT JOIN places p ON e.place_id = p.id
          LEFT JOIN salas s ON e.sala_id = s.sala_id
          WHERE e.macroevent_id IN ($placeholders)
          ORDER BY e.start ASC
        ");
        $stmt2->bind_param($types, ...$macroeventIds);
        $stmt2->execute();
        $eventsResult = $stmt2->get_result();
        $allEvents = $eventsResult->fetch_all(MYSQLI_ASSOC);

        $allEvents = array_map(fn($e) => enrichEventRow($e, $connection), $allEvents);

        $groupedEvents = [];
        foreach ($allEvents as $event) {
          $groupedEvents[$event['macroevent_id']][] = $event;
        }

        foreach ($macroevents as &$macroevent) {
          $macroevent['events'] = $groupedEvents[$macroevent['id']] ?? [];
        }
      }

      echo json_encode($macroevents);
    }
    break;



  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
// 🔥 Manejar eliminación de imagen si viene la acción
if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
  $type = $_POST['type'];

  if (!empty($_POST['id'])) {
    $id = (int)$_POST['id'];

    if (eliminarSoloImagen($connection, strtolower($type), 'img', $id, $basePath)) {
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

    $imgName = '';
    if (isset($_FILES['img']) && $_FILES['img']['error'] === 0) {
      $fechaEvento = $_POST['start'] ?? '';
      if (!$fechaEvento) {
        http_response_code(400);
        echo json_encode(["message" => "Fecha de evento (start) requerida para procesar la imagen."]);
        exit();
      }
      $año = date('Y', strtotime($fechaEvento));
      $rutaPorAño = $basePath . $año . '/';
      if (!file_exists($rutaPorAño)) {
        mkdir($rutaPorAño, 0777, true);
      }

      $imgName = $año . "_" . basename($_FILES['img']['name']);
      move_uploaded_file($_FILES['img']['tmp_name'], $rutaPorAño . $imgName);
    }

    $data['img'] = $imgName;
    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    if ($isUpdate) {
      $id = isset($data['id']) ? (int)$data['id'] : null;
      if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

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
        SET title = ?, start = ?, end = ?, description = ?, province = ?, town = ?, img = ?
        WHERE id = ?
      ");
      $stmt->bind_param("sssssssi",
        $data['title'], $data['start'], $data['end'], $data['description'],
        $data['province'], $data['town'], $imgName, $id
      );

      if ($stmt->execute()) {
        if ($oldImg && $oldImg !== $imgName) {
          eliminarImagenSiNoSeUsa($connection, 'macroevents', 'img', $oldImg, $basePath, true);
        }
        echo json_encode(["message" => "Macroevento actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar el evento: " . $stmt->error]);
      }

    } else {
      $stmt = $connection->prepare("
        INSERT INTO macroevents (title, start, end, description, province, town, img)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->bind_param("sssssss",
        $data['title'], $data['start'], $data['end'], $data['description'],
        $data['province'], $data['town'], $imgName
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
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    $stmtImg = $connection->prepare("SELECT img FROM macroevents WHERE id = ?");
    $stmtImg->bind_param("i", $id);
    $stmtImg->execute();
    $imgData = $stmtImg->get_result()->fetch_assoc();
    $imgToDelete = $imgData['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM macroevents WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarImagenSiNoSeUsa($connection, 'macroevents', 'img', $imgToDelete, $basePath, true);
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
