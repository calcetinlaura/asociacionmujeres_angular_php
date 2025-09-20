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
  if ($override === 'DELETE')  $method = 'DELETE';
}

if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);

$basePath = "../uploads/img/EVENTS/";

function insertAgents($connection, $eventId, $agents, $type) {
  if (!is_array($agents)) return;
  $stmt = $connection->prepare("
    INSERT IGNORE INTO event_agents (event_id, agent_id, type)
    VALUES (?, ?, ?)
  ");
  foreach ($agents as $agentId) {
    if (is_numeric($agentId)) {
      $aid = (int)$agentId;
      $stmt->bind_param("iis", $eventId, $aid, $type);
      $stmt->execute();
    }
  }
}

function normalizeAgentField($value) {
  // 👉 cortar rápido si no viene nada
  if ($value === null || $value === '') {
    return [];
  }

  if (is_array($value)) {
    $arr = $value;
  } elseif (is_string($value)) {
    $decoded = json_decode($value, true);
    $arr = is_array($decoded) ? $decoded : [];
  } else {
    $arr = [];
  }

  // Filtra solo numéricos, normaliza y deduplica
  $arr = array_map('intval', array_filter($arr, 'is_numeric'));
  return array_values(array_unique($arr));
}
function duplicarImagenEventoSiempre(
  mysqli $connection,
  string $basePath,
  string $imgNameEnviado,   // lo que viene en $_POST['img'] (p.ej. "2024_portada.jpg" o "foto.jpg")
  string $targetStart,      // $_POST['start'] del nuevo evento
  ?int $duplicateFromId
): ?string {
  if (!$duplicateFromId || $imgNameEnviado === '' || $targetStart === '') {
    error_log("⛔ duplicarImagenEventoSiempre: params inválidos duplicateFromId={$duplicateFromId}, img='{$imgNameEnviado}', start='{$targetStart}'");
    return null;
  }

  $basename = basename($imgNameEnviado);

  // Año origen desde el evento original
  $srcYear = null;
  $stmt = $connection->prepare("SELECT start FROM events WHERE id = ?");
  $stmt->bind_param("i", $duplicateFromId);
  $stmt->execute();
  if ($row = $stmt->get_result()->fetch_assoc()) {
    $srcYear = date('Y', strtotime($row['start']));
  }
  if (!$srcYear) {
    error_log("⛔ duplicarImagenEventoSiempre: no pude resolver srcYear del evento {$duplicateFromId}");
    return null;
  }

  $destYear = date('Y', strtotime($targetStart));
  $srcDir = rtrim($basePath, '/')."/{$srcYear}/";
  $dstDir = rtrim($basePath, '/')."/{$destYear}/";

  // 1) rutas candidatas (mismo año)
  $candidatos = [
    $srcDir.$basename,                       // .../EVENTS/2024/foto.jpg
    rtrim($basePath, '/').'/'.$basename,     // .../EVENTS/foto.jpg
  ];
  // 2) si no está, busca en cualquier subcarpeta de año por si el nombre ya llevaba el año en el nombre
  $glob = glob(rtrim($basePath, '/')."*/".$basename) ?: [];
  $candidatos = array_merge($candidatos, $glob);

  $srcPath = null;
  foreach ($candidatos as $cand) {
    if (is_file($cand)) { $srcPath = $cand; break; }
  }

  if (!$srcPath) {
    error_log("⛔ duplicarImagenEventoSiempre: no encuentro origen para '{$basename}' en ".rtrim($basePath, '/')."/{*}/ o raíz");
    return null;
  }

  if (!is_dir($dstDir)) {
    @mkdir($dstDir, 0777, true);
    if (!is_dir($dstDir)) {
      error_log("⛔ duplicarImagenEventoSiempre: no pude crear destino {$dstDir}");
      return null;
    }
  }

  $ext  = pathinfo($basename, PATHINFO_EXTENSION);
  $name = pathinfo($basename, PATHINFO_FILENAME);
  $newName = $name.'-copy-'.uniqid('', true).($ext ? '.'.$ext : '');
  $dstPath = $dstDir.$newName;

  $ok = @copy($srcPath, $dstPath);
  if (!$ok || !is_file($dstPath)) {
    error_log("⛔ duplicarImagenEventoSiempre: fallo copy '{$srcPath}' -> '{$dstPath}'");
    return null;
  }

  error_log("✅ duplicarImagenEventoSiempre: copiado como '{$newName}'");
  return $newName;
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
        'room_location' => $row['sala_location'] ?? ''
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
               s.name AS sala_name, s.room_location AS sala_location
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
        s.name AS sala_name, s.room_location AS sala_location
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
                s.name AS sala_name, s.room_location AS sala_location
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
               s.name AS sala_name, s.room_location AS sala_location
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
    // Obtener eventos por agente
    elseif (isset($_GET['agent_id']) && is_numeric($_GET['agent_id'])) {
  $agentId = (int)$_GET['agent_id'];
  $role    = isset($_GET['role']) ? strtoupper($_GET['role']) : null; // ORGANIZADOR|COLABORADOR|PATROCINADOR|null

  $base = "
    SELECT e.*,
           pg.title as periodic_title,
           m.title  AS macroevent_title,
           pr.title AS project_title,
           p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
           s.name   AS sala_name,  s.room_location AS sala_location
    FROM event_agents ea
    INNER JOIN events e ON e.id = ea.event_id
    LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
    LEFT JOIN macroevents m ON e.macroevent_id = m.id
    LEFT JOIN projects   pr ON e.project_id   = pr.id
    LEFT JOIN places     p  ON e.place_id     = p.id
    LEFT JOIN salas      s  ON e.sala_id      = s.sala_id
    WHERE ea.agent_id = ?
  ";

  if ($role && in_array($role, ['ORGANIZADOR','COLABORADOR','PATROCINADOR'], true)) {
    $base .= " AND ea.type = ? ";
    $stmt = $connection->prepare($base . " ORDER BY e.start ASC");
    $stmt->bind_param("is", $agentId, $role);
  } else {
    $stmt = $connection->prepare($base . " ORDER BY e.start ASC");
    $stmt->bind_param("i", $agentId);
  }

  $stmt->execute();
  $res = $stmt->get_result();
  $events = [];
  while ($row = $res->fetch_assoc()) {
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
               s.name AS sala_name, s.room_location AS sala_location
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
               s.name AS sala_name, s.room_location AS sala_location
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
               s.name AS sala_name, s.room_location AS sala_location
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

  // ✅ Detectar si es UPDATE (PATCH)
  $isUpdate = false;
  if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
    $isUpdate = true;
  }
  // Si vienes de duplicar y por accidente trae _method, límpialo
  if (!$isUpdate && isset($data['_method'])) {
    unset($data['_method']);
  }

  // =========================
  //  Imagen: upload vs duplicado
  // =========================
  // ¿Hay subida real de archivo?
  $hasNewUpload = isset($_FILES['img']) && is_array($_FILES['img']) && $_FILES['img']['error'] === UPLOAD_ERR_OK;

  if ($hasNewUpload) {
    // Subir al año del 'start' (usa tu helper)
    $uploadedImg = procesarArchivoPorAnio($basePath, 'img', 'start', 'img');
    $imgName     = $uploadedImg; // puede ser '' si algo falla
  } else {
    // Sin subida: tomar lo que venga en POST (p.ej. "2025_portada.jpg")
    $imgName = $data['img'] ?? '';
  }

  // ID de origen para duplicado
  $duplicateFromId = isset($data['duplicate_from_id']) && is_numeric($data['duplicate_from_id'])
    ? (int)$data['duplicate_from_id']
    : null;

  // Duplicar físicamente la imagen SOLO cuando:
  // - es inserción (no PATCH),
  // - hay duplicate_from_id,
  // - NO hay subida nueva,
  // - y viene img + start
  if (
    !$isUpdate &&
    $duplicateFromId &&
    !$hasNewUpload &&
    !empty($imgName) &&
    !empty($data['start'])
  ) {
    error_log("🔁 Intentando duplicar imagen: dupFromId={$duplicateFromId}, img='{$imgName}', start='{$data['start']}'");
    $dup = duplicarImagenEventoSiempre($connection, $basePath, $imgName, $data['start'], $duplicateFromId);
    if ($dup) {
      $imgName = $dup; // ← guardar SIEMPRE el nuevo nombre único (-copy-...)
      error_log("✅ Imagen duplicada como '{$imgName}'");
    } else {
      error_log("⚠️ No se pudo duplicar; se mantendrá '{$imgName}'");
    }
  }

  // 👮 Evitar copiar entre años si ya es una copia recién generada
  $yaEsCopia = strpos($imgName, '-copy-') !== false;

  // (Opcional) Copiar entre años si hace falta y NO es copia ya
  if (!$yaEsCopia && !empty($imgName) && !empty($data['start'])) {
    $newYear = date('Y', strtotime($data['start']));
    $srcYear = null;

    // Podemos intentar inferir el año de origen mirando el evento original si viene duplicate_from_id
    if (!$srcYear && $duplicateFromId) {
      $srcStmt = $connection->prepare("SELECT start FROM events WHERE id = ?");
      $srcStmt->bind_param("i", $duplicateFromId);
      $srcStmt->execute();
      $srcRes = $srcStmt->get_result()->fetch_assoc();
      if ($srcRes && !empty($srcRes['start'])) {
        $srcYear = date('Y', strtotime($srcRes['start']));
      }
    }

    if ($srcYear && $srcYear !== $newYear) {
      $basename = basename($imgName);
      $srcPath  = rtrim($basePath, '/')."/{$srcYear}/".$basename;
      $dstDir   = rtrim($basePath, '/')."/{$newYear}/";
      $dstPath  = $dstDir.$basename;

      if (!is_dir($dstDir)) @mkdir($dstDir, 0777, true);
      if (is_file($srcPath) && !is_file($dstPath)) {
        @copy($srcPath, $dstPath);
      }
    }
  }

  // =========================
  //  Parseo de campos
  // =========================
  $periodic    = isset($data['periodic']) ? (int)filter_var($data['periodic'], FILTER_VALIDATE_BOOLEAN) : 0;
  $periodicId  = $periodic ? ($data['periodic_id'] ?? '') : null;
  $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;
  $capacity    = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
  $ticketPrices      = $data['ticket_prices'] ?? null;
  $ticketPricesJson  = json_encode($ticketPrices ?: []);
  $status = isset($data['status']) && $data['status'] !== '' ? (string)$data['status'] : 'EJECUCION';

  // =========================
  //  Validación básica
  // =========================
  $campoFaltante = validarCamposRequeridos($data, ['title', 'start']);
  if ($campoFaltante !== null) {
    http_response_code(400);
    echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
    exit();
  }

  // Agents normalizados
  $organizers    = normalizeAgentField($data['organizer']    ?? null);
  $collaborators = normalizeAgentField($data['collaborator'] ?? null);
  $sponsors      = normalizeAgentField($data['sponsor']      ?? null);

  // ID (para PATCH) o null
  $id = isset($data['id']) ? (int)$data['id']
      : (isset($_GET['id']) ? (int)$_GET['id']
      : (is_numeric($resource) ? (int)$resource : null));

  if ($isUpdate && !$id) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido para edición."]);
    exit();
  }

  // =========================
  //  Insert / Update
  // =========================
  if ($isUpdate) {
    // Cargar imagen previa si no hay nueva ni nombre decidido
    $stmt = $connection->prepare("SELECT img FROM events WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res   = $stmt->get_result();
    $prev  = $res->fetch_assoc();
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

    // Reemplazar agentes
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

  // =========================
  //  Agentes
  // =========================
  insertAgents($connection, $id, $organizers,    'ORGANIZADOR');
  insertAgents($connection, $id, $collaborators, 'COLABORADOR');
  insertAgents($connection, $id, $sponsors,      'PATROCINADOR');

  //  Periódicos (pases) — MODELO SIMÉTRICO
// =========================
if ($periodic && $periodicId && isset($data['repeated_dates'])) {
  $repeatedDates = json_decode($data['repeated_dates'], true) ?: [];

  // 1) Normalizador de hora HH:MM:SS (vacío -> 00:00:00)
  $normTime = function($t) {
    if (!$t) return '00:00:00';
    $p = explode(':', $t);
    $h = str_pad((string)($p[0] ?? '0'), 2, '0', STR_PAD_LEFT);
    $m = str_pad((string)($p[1] ?? '0'), 2, '0', STR_PAD_LEFT);
    return "{$h}:{$m}:00";
  };

  // 2) Cargar estado actual del grupo
  $stmt = $connection->prepare("SELECT id, start, end, time_start, time_end FROM events WHERE periodic_id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();
  $res = $stmt->get_result();

  $existingById  = [];                // id => row
  $existingByKey = [];                // "YYYY-MM-DD|HH:MM:SS" => row
  while ($row = $res->fetch_assoc()) {
    $id  = (int)$row['id'];
    $d   = substr($row['start'], 0, 10);
    $ts  = $normTime($row['time_start'] ?? '');
    $key = "{$d}|{$ts}";
    $existingById[$id]  = $row;
    $existingByKey[$key] = $row;
  }

  // 3) Preparar payload normalizado
  $payloadById   = [];                // id => pase
  $payloadKeys   = [];                // set de claves nuevas (para los que no traen id)
  $payloadRows   = [];                // lista final normalizada
  foreach ($repeatedDates as $rd) {
    $d = isset($rd['start']) ? substr($rd['start'], 0, 10) : null;
    if (!$d) continue;
    $e  = isset($rd['end']) ? substr($rd['end'], 0, 10) : $d;
    $ts = $normTime($rd['time_start'] ?? '');
    $te = $rd['time_end'] ?? '';
    if ($te === '' || $te === '00:00' || $te === '00:00:00') {
      // autocompleta +3h si hay time_start
      if ($ts !== '00:00:00') {
        [$hh,$mm] = explode(':', $ts);
        $hh = (int)$hh + 3; if ($hh >= 24) $hh -= 24;
        $te = sprintf('%02d:%02d:00', $hh, (int)$mm);
      } else {
        $te = '00:00:00';
      }
    }
    $row = [
      'id'         => (isset($rd['id']) && is_numeric($rd['id'])) ? (int)$rd['id'] : null,
      'start'      => $d,
      'end'        => $e,
      'time_start' => $ts,
      'time_end'   => $te,
    ];
    $payloadRows[] = $row;
    if ($row['id']) {
      $payloadById[$row['id']] = true;
    } else {
      $payloadKeys["{$d}|{$ts}"] = true;
    }
  }

  // 4) UPSERT
  $keptIds = []; // ids que quedan tras upsert
  foreach ($payloadRows as $rd) {
    $start      = $rd['start'];
    $end        = $rd['end'];
    $time_start = $rd['time_start'];
    $time_end   = $rd['time_end'];

    if ($rd['id'] && isset($existingById[$rd['id']])) {
      // UPDATE por id
      $eid = (int)$rd['id'];
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
        $data['tickets_method'], $data['online_link'], $periodic, $periodicId, $eid
      );
      $stmtUpdate->execute();
      $keptIds[$eid] = true;
      continue;
    }

    $key = "{$start}|{$time_start}";
    if (isset($existingByKey[$key])) {
      // UPDATE por clave
      $eid = (int)$existingByKey[$key]['id'];
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
        $data['tickets_method'], $data['online_link'], $periodic, $periodicId, $eid
      );
      $stmtUpdate->execute();
      $keptIds[$eid] = true;
      continue;
    }

    // INSERT nuevo
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
    $keptIds[$connection->insert_id] = true;
  }
  // --- construir set de IDs del payload (solo los que venían con id) ---
$payloadIdSet = [];
foreach ($payloadRows as $pr) {
  if (!empty($pr['id'])) {
    $payloadIdSet[(int)$pr['id']] = true;
  }
}

  // 5) BORRADO diferido: elimina lo que NO está en el payload
//    Regla: si el pase EXISTE en BD y su id NO viene en payload -> borrar.
//    (Las 'claves' solo valen para los NUEVOS que no traen id)
$stmt = $connection->prepare("SELECT id FROM events WHERE periodic_id = ?");
$stmt->bind_param("s", $periodicId);
$stmt->execute();
$res = $stmt->get_result();

while ($row = $res->fetch_assoc()) {
  $eid = (int)$row['id'];

  // Si el id vino en el payload, NUNCA borrar
  if (isset($payloadIdSet[$eid])) continue;

  // Si se insertó en esta pasada (nuevo) también lo preservamos
  if (isset($keptIds[$eid])) continue;

  // → No aparece en el payload: usuario lo quitó -> borrar
  $stmtDel = $connection->prepare("DELETE FROM events WHERE id = ?");
  $stmtDel->bind_param("i", $eid);
  $stmtDel->execute();
}
}
  // 👇 Si ya no es periódico, elimina todos los eventos con ese periodic_id EXCEPTO el actual
  if (!$periodic && $periodicId && $id) {
    $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
    $stmt->bind_param("si", $periodicId, $id);
    $stmt->execute();

    // ¿Queda alguien con ese periodic_id?
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

    // Limpiar periodic_id del actual
    $stmt = $connection->prepare("UPDATE events SET periodic_id = NULL WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
  }

  echo json_encode(["message" => $isUpdate ? "Evento actualizado" : "Evento creado"]);
  break;


case 'DELETE':
  // -- Rutas de borrado por periodic_id (acepta POST y GET)
  $periodicId = $_POST['periodic_id'] ?? $_GET['periodic_id'] ?? null;
  $keepIdRaw  = $_POST['keep_id']     ?? $_GET['keep_id']     ?? null;

 if ($periodicId && $keepIdRaw !== null) {
  $keepId = (int)$keepIdRaw;

  // 1) Recoger imágenes y años de los que se van a borrar
  $stmt = $connection->prepare("SELECT id, img, start FROM events WHERE periodic_id = ? AND id != ?");
  $stmt->bind_param("si", $periodicId, $keepId);
  $stmt->execute();
  $imgs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

  // 2) Borrar los eventos (menos keepId)
  $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
  $stmt->bind_param("si", $periodicId, $keepId);
  $stmt->execute();

  // 3) Intentar borrar archivos si quedan huérfanos
  foreach ($imgs as $row) {
    $img = $row['img'] ?? '';
    $yr  = isset($row['start']) ? date('Y', strtotime($row['start'])) : null;
    if ($img && $yr) {
      eliminarArchivoSiNoSeUsa($connection, 'events', 'img', $img, $basePath . $yr . '/');
    }
  }

  // 4) Limpieza de periodic_groups si ya no quedan
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
  break;
}


  if ($periodicId && $keepIdRaw === null) {
  // 1) Recoger imágenes y años de TODO el grupo
  $stmt = $connection->prepare("SELECT img, start FROM events WHERE periodic_id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();
  $imgs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

  // 2) Borrar eventos del grupo
  $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();

  // 3) Borrar grupo
  $stmt = $connection->prepare("DELETE FROM periodic_groups WHERE id = ?");
  $stmt->bind_param("s", $periodicId);
  $stmt->execute();

  // 4) Intentar borrar archivos si quedan huérfanos
  foreach ($imgs as $row) {
    $img = $row['img'] ?? '';
    $yr  = isset($row['start']) ? date('Y', strtotime($row['start'])) : null;
    if ($img && $yr) {
      eliminarArchivoSiNoSeUsa($connection, 'events', 'img', $img, $basePath . $yr . '/');
    }
  }

  echo json_encode(["message" => "Grupo periódico y eventos eliminados."]);
  break;
}


  // -- Borrado individual por ID (acepta POST override y GET, y /events.php/{id})
  $idRaw = $_POST['id'] ?? $_GET['id'] ?? (is_numeric($resource) ? $resource : null);
  if (!is_numeric($idRaw)) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido."]);
    break;
  }
  $id = (int)$idRaw;

  // Recupera info de imagen/año antes de borrar
  $stmt = $connection->prepare("SELECT img, start FROM events WHERE id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $result = $stmt->get_result();
  $event = $result->fetch_assoc();
  $imgToDelete = $event['img'] ?? '';
  $eventYear = isset($event['start']) ? date('Y', strtotime($event['start'])) : null;

  // Borra el evento
  $stmt = $connection->prepare("DELETE FROM events WHERE id = ?");
  $stmt->bind_param("i", $id);

  if ($stmt->execute()) {
    if ($imgToDelete && $eventYear) {
      eliminarArchivoSiNoSeUsa($connection, 'events', 'img', $imgToDelete, $basePath . $eventYear . '/');
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

