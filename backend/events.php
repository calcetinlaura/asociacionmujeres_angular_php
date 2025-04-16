<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE");
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

$basePath = "../uploads/img/EVENTS/";

function insertAgents($connection, $eventId, $agents, $type) {
  if (!is_array($agents)) return;

  $stmt = $connection->prepare("INSERT INTO event_agents (event_id, agent_id, type) VALUES (?, ?, ?)");

  foreach ($agents as $agentId) {
    if (is_numeric($agentId)) {
      $stmt->bind_param("iis", $eventId, $agentId, $type);
      $stmt->execute();
    }
  }
}

switch ($method) {
  case 'GET':
    function enrichEventRow($row, $connection) {
      $row['macroeventData'] = !empty($row['macroevent_id']) && !empty($row['macroevent_title']) ? [
        'id' => $row['macroevent_id'],
        'title' => $row['macroevent_title']
      ] : null;

      $row['projectData'] = !empty($row['project_id']) && !empty($row['project_title']) ? [
        'id' => $row['project_id'],
        'title' => $row['project_title']
      ] : null;

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

      $row['organizer'] = [];
      $row['collaborator'] = [];
      $row['sponsor'] = [];

      $stmtAgents = $connection->prepare("
        SELECT ea.agent_id, ea.type, a.name
        FROM event_agents ea
        JOIN agents a ON ea.agent_id = a.id
        WHERE ea.event_id = ?
      ");
      $stmtAgents->bind_param("i", $row['id']);
      $stmtAgents->execute();
      $resultAgents = $stmtAgents->get_result();

      while ($agent = $resultAgents->fetch_assoc()) {
        $agentData = [
          'id' => (int)$agent['agent_id'],
          'name' => $agent['name']
        ];

        switch ($agent['type']) {
          case 'ORGANIZADOR': $row['organizer'][] = $agentData; break;
          case 'COLABORADOR': $row['collaborator'][] = $agentData; break;
          case 'PATROCINADOR': $row['sponsor'][] = $agentData; break;
        }
      }

      return $row;
    }


    // Obtener evento individual
    if (is_numeric($resource)) {
      $stmt = $connection->prepare("
        SELECT e.*,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
        WHERE e.id = ?
      ");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $event = $result->fetch_assoc();

      if ($event) {
        $event = enrichEventRow($event, $connection);
      }

      echo json_encode($event ?: []);
    }

    // Obtener eventos por año
    elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = $_GET['year'];
      $stmt = $connection->prepare("
        SELECT e.*,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
        WHERE YEAR(e.start) = ?
      ");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $events = [];

      while ($row = $result->fetch_assoc()) {
        $events[] = enrichEventRow($row, $connection);
      }

      echo json_encode($events);
    }

    // Obtener eventos por macroevento
    elseif (isset($_GET['macroevent_id']) && is_numeric($_GET['macroevent_id'])) {
      $macroeventId = (int)$_GET['macroevent_id'];
      $stmt = $connection->prepare("
        SELECT e.*,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
        WHERE e.macroevent_id = ?
      ");
      $stmt->bind_param("i", $macroeventId);
      $stmt->execute();
      $result = $stmt->get_result();
      $events = [];

      while ($row = $result->fetch_assoc()) {
        $events[] = enrichEventRow($row, $connection);
      }

      echo json_encode($events);
    }
    // Obtener eventos por proyecto
    elseif (isset($_GET['project_id']) && is_numeric($_GET['project_id'])) {
      $projectId = (int)$_GET['project_id'];
      $stmt = $connection->prepare("
        SELECT e.*,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
        WHERE e.project_id = ?
      ");
      $stmt->bind_param("i", $projectId);
      $stmt->execute();
      $result = $stmt->get_result();
      $events = [];

      while ($row = $result->fetch_assoc()) {
        $events[] = enrichEventRow($row, $connection); // Asumiendo que tienes esta función definida
      }

      echo json_encode($events);
    }


    // Todos los eventos
    else {
      $stmt = $connection->prepare("
        SELECT e.*,
              m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
      ");
      $stmt->execute();
      $result = $stmt->get_result();
      $events = [];

      while ($row = $result->fetch_assoc()) {
        $events[] = enrichEventRow($row, $connection);
      }

      echo json_encode($events);
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
      $imgName = procesarImagenPorAnio($basePath, 'img', 'start');
      $data = $_POST;
      $data['img'] = $imgName;

      $campoFaltante = validarCamposRequeridos($data, ['title', 'start', 'end']);
      if ($campoFaltante !== null) {
        http_response_code(400);
        echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
        exit();
      }

      $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

      $eventDate = $data['start'] ?? null;
      $eventYear = $eventDate ? date('Y', strtotime($eventDate)) : null;
      $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;
      $capacity = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
      $price = isset($data['price']) && $data['price'] !== '' ? $data['price'] : null;

      $organizers = isset($data['organizer']) ? json_decode($data['organizer'], true) : [];
      $collaborators = isset($data['collaborator']) ? json_decode($data['collaborator'], true) : [];
      $sponsors = isset($data['sponsor']) ? json_decode($data['sponsor'], true) : [];

      if ($isUpdate) {
        $id = isset($data['id']) ? (int)$data['id'] : null;
        if (!$id) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        $stmt = $connection->prepare("SELECT img FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $prev = $res->fetch_assoc();
        $oldImg = $prev['img'] ?? '';

        if (empty($imgName)) {
          $imgName = $oldImg;
        }

        $stmt = $connection->prepare("UPDATE events
          SET macroevent_id=?, project_id=?,title=?, start=?, end=?, time=?, description=?, province=?, town=?, place_id=?, sala_id=?, capacity=?, price=?, img=?, status=?, status_reason=?, inscription=?
          WHERE id=?");
        $stmt->bind_param("iisssssssiiissssii",
          $data['macroevent_id'], $data['project_id'], $data['title'], $data['start'], $data['end'],
          $data['time'], $data['description'], $data['province'], $data['town'], $data['place_id'], $data['sala_id'],
          $capacity, $price, $imgName, $data['status'], $data['status_reason'], $inscription, $id
        );

        if ($stmt->execute()) {
          if ($oldImg && $imgName !== $oldImg) {
            eliminarImagenSiNoSeUsa($connection, 'events', 'img', $oldImg, $basePath . $eventYear . '/');
          }

          // 🧹 Limpiar agentes previos
          $stmtDel = $connection->prepare("DELETE FROM event_agents WHERE event_id = ?");
          $stmtDel->bind_param("i", $id);
          $stmtDel->execute();

          // ✅ Insertar nuevos
          insertAgents($connection, $id, $organizers, 'ORGANIZADOR');
          insertAgents($connection, $id, $collaborators, 'COLABORADOR');
          insertAgents($connection, $id, $sponsors, 'PATROCINADOR');

          echo json_encode(["message" => "Evento actualizado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
        }

      } else {
        $stmt = $connection->prepare("INSERT INTO events (macroevent_id, project_id, title, start, end, time, description, province, town, place_id, sala_id, capacity, price, img, status, status_reason, inscription)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iisssssssiiissssi",
          $data['macroevent_id'], $data['project_id'], $data['title'], $data['start'], $data['end'],
          $data['time'], $data['description'], $data['province'], $data['town'], $data['place_id'], $data['sala_id'],
          $capacity, $price, $imgName, $data['status'], $data['status_reason'], $inscription
        );

        if ($stmt->execute()) {
          $newEventId = $connection->insert_id;

          // ✅ Insertar agentes
          insertAgents($connection, $newEventId, $organizers, 'ORGANIZADOR');
          insertAgents($connection, $newEventId, $collaborators, 'COLABORADOR');
          insertAgents($connection, $newEventId, $sponsors, 'PATROCINADOR');

          echo json_encode(["message" => "Evento añadido con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir el evento: " . $stmt->error]);
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

        // Obtener imagen actual
        $stmt = $connection->prepare("SELECT img, start FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $event = $result->fetch_assoc();
        $imgToDelete = $event['img'] ?? '';
        $eventYear = isset($event['start']) ? date('Y', strtotime($event['start'])) : null;

        $stmt = $connection->prepare("DELETE FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
          if ($imgToDelete && $eventYear) {
            eliminarImagenSiNoSeUsa($connection, 'events', 'img', $imgToDelete, $basePath . $eventYear . '/');
          }
          echo json_encode(["message" => "Evento eliminado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al eliminar el evento: " . $stmt->error]);
        }
        break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
