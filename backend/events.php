<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);

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
      $row['macroeventData'] = [
        'id' => $row['macroevent_id'],
        'title' => $row['macro_title']
      ];

      $row['placeData'] = [
        'id' => $row['place_id'],
        'name' => $row['place_name'],
        'address' => $row['place_address'],
        'lat' => $row['place_lat'],
        'lon' => $row['place_lon'],
      ];

      $row['salaData'] = [
        'id' => $row['sala_id'],
        'name' => $row['sala_name'],
        'location' => $row['sala_location']
      ];

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
               m.title AS macro_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
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
               m.title AS macro_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
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
               m.title AS macro_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
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

    // Todos los eventos
    else {
      $stmt = $connection->prepare("
        SELECT e.*,
               m.title AS macro_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
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
      file_put_contents('log.txt', print_r($_POST, true));

      $organizers = isset($_POST['organizer']) ? json_decode($_POST['organizer'], true) : [];
      $collaborators = isset($_POST['collaborator']) ? json_decode($_POST['collaborator'], true) : [];
      $sponsors = isset($_POST['sponsor']) ? json_decode($_POST['sponsor'], true) : [];

      $place_id = isset($_POST['place_id']) && is_numeric($_POST['place_id']) ? (int)$_POST['place_id'] : null;
      $sala_id  = isset($_POST['sala_id']) && is_numeric($_POST['sala_id']) ? (int)$_POST['sala_id'] : null;

      $imgName = '';
      $copiedImage = '';
      $eventDate = isset($_POST['start']) ? $_POST['start'] : null;
      $eventYear = $eventDate ? date('Y', strtotime($eventDate)) : null;

      $basePath = "../uploads/img/EVENTS/";
      $yearFolder = $basePath . $eventYear;

      if ($eventYear && !file_exists($yearFolder)) {
        mkdir($yearFolder, 0777, true);
      }

      // Si viene un archivo nuevo
      if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
        $originalFileName = $_FILES['img']['name'];
        $newFileName = $eventYear . "_" . $originalFileName;
        $finalPath = $yearFolder . "/" . $newFileName;

        if (move_uploaded_file($_FILES['img']['tmp_name'], $finalPath)) {
          $imgName = $newFileName;
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al guardar la imagen."]);
          exit();
        }
      }

      // Si no se subió archivo, pero se está duplicando un evento con imagen
      if ($imgName === '' && isset($_POST['img']) && !empty($_POST['img']) && $eventYear) {
        $originalImgName = basename($_POST['img']);
        $originalFilePath = $yearFolder . "/" . $originalImgName;
        $copiedFileName = $eventYear . "_copy_" . $originalImgName;
        $copiedFilePath = $yearFolder . "/" . $copiedFileName;

        if (file_exists($originalFilePath)) {
          if (copy($originalFilePath, $copiedFilePath)) {
            $copiedImage = $copiedFileName;
          }
        }
      }

      if ($sala_id !== null) {
        $stmtSala = $connection->prepare("SELECT place_id FROM salas WHERE sala_id = ?");
        $stmtSala->bind_param("i", $sala_id);
        $stmtSala->execute();
        $resSala = $stmtSala->get_result();
        $sala = $resSala->fetch_assoc();

        if (!$sala || $sala['place_id'] != $place_id) {
          http_response_code(400);
          echo json_encode(["message" => "La sala no pertenece al espacio seleccionado."]);
          exit();
        }
      }

      $data = $_POST;
      $data['img'] = $imgName !== '' ? $imgName : $copiedImage;

      $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;
      $capacity    = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
      $price       = isset($data['price']) && $data['price'] !== '' ? $data['price'] : null;
      $time        = !empty($data['time']) ? $data['time'] : null;
      $description = !empty($data['description']) ? $data['description'] : null;
      $status      = !empty($data['status']) ? $data['status'] : null;
      $status_reason = !empty($data['status_reason']) ? $data['status_reason'] : null;

      $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

      if ($isUpdate) {
        $id = isset($data['id']) && is_numeric($data['id']) ? (int)$data['id'] : null;
        if (!$id) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        if ($imgName === '' && $copiedImage === '') {
          $stmtCurrent = $connection->prepare("SELECT img FROM events WHERE id = ?");
          $stmtCurrent->bind_param("i", $id);
          $stmtCurrent->execute();
          $result = $stmtCurrent->get_result();
          $currentEvent = $result->fetch_assoc();
          $data['img'] = $currentEvent['img'];
        }

        $stmt = $connection->prepare("UPDATE events
          SET macroevent_id = ?, title = ?, start = ?, end = ?, time = ?, description = ?, province = ?, town = ?, place_id = ?, sala_id=?, capacity = ?, price = ?, img = ?, status = ?, status_reason = ?, inscription = ?
          WHERE id = ?");
        $stmt->bind_param("isssssssiiissssii",
          $data['macroevent_id'], $data['title'], $data['start'], $data['end'],
          $time, $description, $data['province'], $data['town'], $place_id, $sala_id,
          $capacity, $price, $data['img'], $status, $status_reason, $inscription, $id
        );

        if ($stmt->execute()) {
          $stmtDelete = $connection->prepare("DELETE FROM event_agents WHERE event_id = ?");
          $stmtDelete->bind_param("i", $id);
          $stmtDelete->execute();

          insertAgents($connection, $id, $organizers, 'ORGANIZADOR');
          insertAgents($connection, $id, $collaborators, 'COLABORADOR');
          insertAgents($connection, $id, $sponsors, 'PATROCINADOR');

          echo json_encode(["message" => "Evento actualizado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
        }
      } else {
        $stmt = $connection->prepare("INSERT INTO events
          (macroevent_id, title, start, end, time, description, province, town, place_id, sala_id, capacity, price, img, status, status_reason, inscription)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssssssiiissssi",
          $data['macroevent_id'], $data['title'], $data['start'], $data['end'],
          $time, $description, $data['province'], $data['town'], $place_id, $sala_id,
          $capacity, $price, $data['img'], $status, $status_reason, $inscription
        );

        if ($stmt->execute()) {
          $newEventId = $connection->insert_id;
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
    if (!is_numeric($id)) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    $stmt = $connection->prepare("DELETE FROM events WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
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
