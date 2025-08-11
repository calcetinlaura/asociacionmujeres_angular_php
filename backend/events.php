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
      $row['ticket_prices'] = !empty($row['ticket_prices']) ? json_decode($row['ticket_prices'], true) : [];
       if (!empty($row['periodic_id'])) {
        $periodic_id = $row['periodic_id'];
        $stmt = $connection->prepare("
            SELECT
                id, periodic_id, start, end, time_start, time_end
            FROM
                events
              WHERE periodic_id = ?
        ORDER BY start ASC
        ");
        $stmt->bind_param("s", $periodic_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $periodicEvents = $result->fetch_all(MYSQLI_ASSOC);

        $row['periodicEvents'] = $periodicEvents;
    } else {
        $row['periodicEvents'] = null;
    }


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

    if (is_numeric($resource)) {
      $stmt = $connection->prepare("
        SELECT e.*,
                pg.title as periodic_title,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
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
    $year = (int) $_GET['year'];
    $periodic = isset($_GET['periodic']) ? $_GET['periodic'] : 'all';

    if ($periodic === 'latest') {
        // Consulta optimizada para "sin eventos periódicos"
      $query = "
    SELECT e.*,
        pg.title as periodic_title,
        m.title AS macroevent_title,
        pr.title AS project_title,
        p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
        s.name AS sala_name, s.location AS sala_location
    FROM events e
    LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
    LEFT JOIN macroevents m ON e.macroevent_id = m.id
    LEFT JOIN projects pr ON e.project_id = pr.id
    LEFT JOIN places p ON e.place_id = p.id
    LEFT JOIN salas s ON e.sala_id = s.sala_id
    WHERE e.id IN (
        SELECT id FROM events WHERE periodic_id IS NULL AND YEAR(start) = ?
        UNION
        SELECT e1.id
        FROM events e1
        INNER JOIN (
            SELECT periodic_id, MAX(start) AS max_start
            FROM events
            WHERE periodic_id IS NOT NULL AND YEAR(start) = ?
            GROUP BY periodic_id
        ) e2 ON e1.periodic_id = e2.periodic_id AND e1.start = e2.max_start
    )
";


        $stmt = $connection->prepare($query);
        $stmt->bind_param("ii", $year, $year);
    } else {
        // Consulta normal: "con eventos periódicos" (todos)
        $query = "
            SELECT e.*,
                pg.title as periodic_title,
                m.title AS macroevent_title,
                pr.title AS project_title,
                p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
                s.name AS sala_name, s.location AS sala_location
            FROM events e
            LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
            LEFT JOIN macroevents m ON e.macroevent_id = m.id
            LEFT JOIN projects pr ON e.project_id = pr.id
            LEFT JOIN places p ON e.place_id = p.id
            LEFT JOIN salas s ON e.sala_id = s.sala_id
            WHERE YEAR(e.start) = ?
        ";

        $stmt = $connection->prepare($query);
        $stmt->bind_param("i", $year);
    }

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
        pg.title as periodic_title,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
         LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
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
        SELECT e.*,pg.title as periodic_title,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
         LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
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
        // Obtener eventos por proyecto
    elseif (isset($_GET['periodic_id'])) {
      $periodicId = $_GET['periodic_id'];
      $stmt = $connection->prepare("
        SELECT e.*,
              pg.title as periodic_title,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
        LEFT JOIN macroevents m ON e.macroevent_id = m.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN salas s ON e.sala_id = s.sala_id
        WHERE e.periodic_id = ?
        ORDER BY e.start DESC
      ");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();
      $result = $stmt->get_result();
      $events = [];

      while ($row = $result->fetch_assoc()) {
        $events[] = enrichEventRow($row, $connection);
      }

      echo json_encode($events);
    }
    else {
      $stmt = $connection->prepare("
        SELECT e.*, pg.title as periodic_title,
               m.title AS macroevent_title,
               pr.title AS project_title,
               p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name AS sala_name, s.location AS sala_location
        FROM events e
        LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
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
  error_log("🔥 POST recibido:");
  error_log(print_r($_POST, true));
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  $data = $_POST;
  $imgName = procesarArchivoPorAnio($basePath, 'img', 'start');
  $data['img'] = $imgName;

  $periodic = isset($data['periodic']) ? (int)filter_var($data['periodic'], FILTER_VALIDATE_BOOLEAN) : 0;
  $periodicId = $periodic ? ($data['periodic_id'] ?? '') : null;
  $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;
  $capacity = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
  $ticketPrices = $data['ticket_prices'] ?? null;
  $ticketPricesJson = json_encode($ticketPrices ?: []);

  $campoFaltante = validarCamposRequeridos($data, ['title', 'start']);
  if ($campoFaltante !== null) {
    http_response_code(400);
    echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
    exit();
  }

  $organizers = isset($data['organizer']) ? json_decode($data['organizer'], true) : [];
  $collaborators = isset($data['collaborator']) ? json_decode($data['collaborator'], true) : [];
  $sponsors = isset($data['sponsor']) ? json_decode($data['sponsor'], true) : [];

  $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';
  $id = isset($data['id']) ? (int)$data['id'] : null;

  if ($isUpdate && !$id) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido para edición."]);
    exit();
  }

  // Determinar si es edición o inserción del evento principal
  if ($isUpdate) {
    // Cargar imagen previa si no hay nueva
    $stmt = $connection->prepare("SELECT img FROM events WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $prev = $res->fetch_assoc();
    $oldImg = $prev['img'] ?? '';
    if (empty($imgName)) $imgName = $oldImg;

    $stmt = $connection->prepare("UPDATE events SET
      macroevent_id=?, project_id=?, title=?, start=?, end=?, time_start=?, time_end=?, description=?, province=?, town=?,
      place_id=?, sala_id=?, capacity=?, access=?, ticket_prices=?, img=?, status=?, status_reason=?, inscription=?,
      inscription_method=?, tickets_method=?, online_link=?, periodic=?, periodic_id=?
      WHERE id=?");
    $stmt->bind_param("iissssssssiiisssssisssisi",
      $data['macroevent_id'], $data['project_id'], $data['title'], $data['start'], $data['end'],
      $data['time_start'], $data['time_end'], $data['description'], $data['province'], $data['town'],
      $data['place_id'], $data['sala_id'], $capacity, $data['access'], $ticketPricesJson, $imgName,
      $data['status'], $data['status_reason'], $inscription, $data['inscription_method'],
      $data['tickets_method'], $data['online_link'], $periodic, $periodicId, $id
    );
    $stmt->execute();

    $stmtDel = $connection->prepare("DELETE FROM event_agents WHERE event_id = ?");
    $stmtDel->bind_param("i", $id);
    $stmtDel->execute();
  } else {
    // Inserción
    $stmt = $connection->prepare("INSERT INTO events (
      macroevent_id, project_id, title, start, end, time_start, time_end, description,
      province, town, place_id, sala_id, capacity, access, ticket_prices, img,
      status, status_reason, inscription, inscription_method, tickets_method,
      online_link, periodic, periodic_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iissssssssiiisssssisssis",
      $data['macroevent_id'], $data['project_id'], $data['title'], $data['start'], $data['end'],
      $data['time_start'], $data['time_end'], $data['description'], $data['province'], $data['town'],
      $data['place_id'], $data['sala_id'], $capacity, $data['access'], $ticketPricesJson, $imgName,
      $data['status'], $data['status_reason'], $inscription, $data['inscription_method'],
      $data['tickets_method'], $data['online_link'], $periodic, $periodicId
    );
    $stmt->execute();
    $id = $connection->insert_id;
  }

  // Agentes
  insertAgents($connection, $id, $organizers, 'ORGANIZADOR');
  insertAgents($connection, $id, $collaborators, 'COLABORADOR');
  insertAgents($connection, $id, $sponsors, 'PATROCINADOR');

  // Si es periódico, gestionar repeated_dates
  if ($periodic && $periodicId && isset($data['repeated_dates'])) {
    $repeatedDates = json_decode($data['repeated_dates'], true);
    $mainDate = substr($data['start'], 0, 10);

    // Obtener existentes
    $stmt = $connection->prepare("SELECT id, start FROM events WHERE periodic_id = ?");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();
    $result = $stmt->get_result();

    $existingEvents = [];
    while ($row = $result->fetch_assoc()) {
      $existingEvents[substr($row['start'], 0, 10)] = $row['id'];
    }

    $newStarts = array_column($repeatedDates, 'start');

    // Borrar los que ya no están
    foreach ($existingEvents as $start => $eventId) {
      if (!in_array($start, $newStarts)) {
        $stmtDel = $connection->prepare("DELETE FROM events WHERE id = ?");
        $stmtDel->bind_param("i", $eventId);
        $stmtDel->execute();
      }
    }

    // Insertar o actualizar
    foreach ($repeatedDates as $rd) {
      $start = $rd['start'];
      if ($start === $mainDate) continue; // el principal ya está actualizado

      $end = $rd['end'] ?: $start;
      $time_start = $rd['time_start'] ?: null;
      $time_end = $rd['time_end'] ?: null;

      if ($time_start && (!$time_end || $time_end === '00:00:00')) {
        $parts = explode(':', $time_start);
        $h = (int)$parts[0] + 3;
        if ($h >= 24) $h -= 24;
        $time_end = sprintf('%02d:%02d:00', $h, (int)$parts[1]);
      }

      if (isset($existingEvents[$start])) {
        $eventId = $existingEvents[$start];
        $stmtUpdate = $connection->prepare("UPDATE events SET
          macroevent_id=?, project_id=?, title=?, start=?, end=?, time_start=?, time_end=?, description=?, province=?, town=?,
          place_id=?, sala_id=?, capacity=?, access=?, ticket_prices=?, img=?, status=?, status_reason=?, inscription=?,
          inscription_method=?, tickets_method=?, online_link=?, periodic=?, periodic_id=?
          WHERE id=?");
        $stmtUpdate->bind_param("iissssssssiiisssssisssisi",
          $data['macroevent_id'], $data['project_id'], $data['title'], $start, $end,
          $time_start, $time_end, $data['description'], $data['province'], $data['town'],
          $data['place_id'], $data['sala_id'], $capacity, $data['access'], $ticketPricesJson, $imgName,
          $data['status'], $data['status_reason'], $inscription, $data['inscription_method'],
          $data['tickets_method'], $data['online_link'], $periodic, $periodicId, $eventId
        );
        $stmtUpdate->execute();
      } else {
        $stmtInsert = $connection->prepare("INSERT INTO events (
          macroevent_id, project_id, title, start, end, time_start, time_end, description,
          province, town, place_id, sala_id, capacity, access, ticket_prices, img,
          status, status_reason, inscription, inscription_method, tickets_method,
          online_link, periodic, periodic_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtInsert->bind_param("iissssssssiiisssssisssis",
          $data['macroevent_id'], $data['project_id'], $data['title'], $start, $end,
          $time_start, $time_end, $data['description'], $data['province'], $data['town'],
          $data['place_id'], $data['sala_id'], $capacity, $data['access'], $ticketPricesJson, $imgName,
          $data['status'], $data['status_reason'], $inscription, $data['inscription_method'],
          $data['tickets_method'], $data['online_link'], $periodic, $periodicId
        );
        $stmtInsert->execute();
      }
    }
  }// 👇 Si el evento ya no es periódico, elimina todos los eventos con ese periodic_id EXCEPTO el actual
if (!$periodic && $periodicId && $id) {
  $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
  $stmt->bind_param("si", $periodicId, $id);
  $stmt->execute();

  // 🧹 Comprobar si quedan más eventos con ese periodic_id
  $stmt = $connection->prepare("SELECT COUNT(*) as count FROM events WHERE periodic_id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();

  if ((int)$row['count'] === 0) {
    // Eliminar también de periodic_groups si existe
    $stmt = $connection->prepare("DELETE FROM periodic_groups WHERE id = ?");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();
  }

  // 🔁 Limpiar periodic_id del evento actual
  $stmt = $connection->prepare("UPDATE events SET periodic_id = NULL WHERE id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
}


  echo json_encode(["message" => $isUpdate ? "Evento actualizado" : "Evento creado"]);
  break;

case 'DELETE':
  if (isset($_GET['periodic_id']) && isset($_GET['keep_id'])) {
  $periodicId = $_GET['periodic_id'];
  $keepId = (int)$_GET['keep_id'];

  // ✅ Elimina todos los eventos con ese periodic_id EXCEPTO el keepId
  $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
  $stmt->bind_param("si", $periodicId, $keepId);
  $stmt->execute();

  // ✅ Si ya no hay ningún evento con ese periodic_id, eliminamos el grupo también
  $stmt = $connection->prepare("SELECT COUNT(*) as count FROM events WHERE periodic_id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();

  if ((int)$row['count'] === 0) {
    $stmt = $connection->prepare("DELETE FROM periodic_groups WHERE id = ?");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();
  }

  http_response_code(200);
  echo json_encode(["message" => "Eventos repetidos eliminados (excepto keepId)."]);
  exit();
}

  // 🧹 Eliminación completa del grupo periódico (sin keepId)
  if (isset($_GET['periodic_id'])) {
    $periodicId = $_GET['periodic_id'];

    $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ?");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();

    $stmt = $connection->prepare("DELETE FROM periodic_groups WHERE id = ?");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();

    echo json_encode(["message" => "Grupo periódico y eventos eliminados."]);
    exit();
  }

  // 🗑️ Eliminación individual por ID
  $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido."]);
    exit();
  }

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

