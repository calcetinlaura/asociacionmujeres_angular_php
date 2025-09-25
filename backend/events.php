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

// ======= CATEGORY WHITELIST (EN) =======
if (!defined('CATEGORY_WHITELIST')) {
  // Puede ser JSON, CSV o incluso array; dejamos un valor por defecto seguro
  define('CATEGORY_WHITELIST', '["CINEMA","WORKSHOP","THEATER","ACTIVISM","MUSIC","TALK", "EXPOSURE","LEISURE","LITERATURE","COURSE"]');
}

/// ===== CATEGORIES HELPERS (safe, no redeclare) =====
if (!function_exists('getCategoryWhitelist')) {
  function getCategoryWhitelist(): array {
    $raw = CATEGORY_WHITELIST;

    // Si alguien definió la constante como array directamente
    if (is_array($raw)) {
      return array_values(array_unique(array_map(
        fn($v) => strtoupper(trim((string)$v)), $raw
      )));
    }

    // Si es string, probamos JSON primero
    if (is_string($raw)) {
      $json = json_decode($raw, true);
      if (is_array($json)) {
        return array_values(array_unique(array_map(
          fn($v) => strtoupper(trim((string)$v)), $json
        )));
      }

      $csv = array_filter(array_map('trim', explode(',', $raw)));
      if ($csv) {
        return array_values(array_unique(array_map('strtoupper', $csv)));
      }
    }

    // Fallback ultra seguro
    return ["CINEMA","WORKSHOP","THEATER","ACTIVISM","MUSIC","TALK", "EXPOSURE","LEISURE", "LITERATURE","COURSE"];
  }
}

if (!function_exists('normalizeCategories')) {
  /**
   * Acepta null | string (JSON/CSV/HTML-escaped) | array.
   * Si $whitelist viene null/omitido, se usa getCategoryWhitelist().
   */
  function normalizeCategories($cats, ?array $whitelist = null): array {
    if ($whitelist === null) {
      $whitelist = getCategoryWhitelist();
    }

    if ($cats === null || $cats === '') return [];

    if (is_string($cats)) {
      $s = html_entity_decode($cats, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
      $decoded = json_decode($s, true);
      if (is_array($decoded)) {
        $arr = $decoded;
      } else {
        $arr = array_map('trim', explode(',', $s));
      }
    } elseif (is_array($cats)) {
      $arr = $cats;
    } else {
      $arr = [];
    }

    $out = [];
    foreach ($arr as $c) {
      $c = strtoupper(trim((string)$c));
      if ($c !== '' && in_array($c, $whitelist, true)) {
        $out[] = $c;
      }
    }
    return array_values(array_unique($out));
  }
}

// Devuelve array de categorías (EN) para un evento
if (!function_exists('fetchCategoriesForEvent')) {
  function fetchCategoriesForEvent(mysqli $connection, int $eventId): array {
    $stmt = $connection->prepare("SELECT category FROM event_categories WHERE event_id = ?");
    $stmt->bind_param("i", $eventId);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) $out[] = $row['category'];
    return $out;
  }
}

// Reemplaza categorías de un evento (sobrescribe)
if (!function_exists('replaceEventCategories')) {
  function replaceEventCategories(mysqli $conn, int $eventId, array $cats): void {
    $del = $conn->prepare("DELETE FROM event_categories WHERE event_id = ?");
    $del->bind_param("i", $eventId);
    $del->execute();

    if (!$cats) return;
    $ins = $conn->prepare("INSERT INTO event_categories (event_id, category) VALUES (?, ?)");
    foreach ($cats as $c) {
      $ins->bind_param("is", $eventId, $c);
      $ins->execute();
    }
  }
}

// ======= AGENTS =======
if (!function_exists('insertAgents')) {
  function insertAgents(mysqli $connection, int $eventId, $agents, string $type): void {
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
}

if (!function_exists('normalizeAgentField')) {
  function normalizeAgentField($value): array {
    if ($value === null || $value === '') return [];
    if (is_array($value)) {
      $arr = $value;
    } elseif (is_string($value)) {
      $decoded = json_decode($value, true);
      $arr = is_array($decoded) ? $decoded : [];
    } else {
      $arr = [];
    }
    $arr = array_map('intval', array_filter($arr, 'is_numeric'));
    return array_values(array_unique($arr));
  }
}

// ======= IMAGES =======
if (!function_exists('duplicarImagenEventoSiempre')) {
  function duplicarImagenEventoSiempre(
    mysqli $connection,
    string $basePath,
    string $imgNameEnviado,
    string $targetStart,
    ?int $duplicateFromId
  ): ?string {
    if (!$duplicateFromId || $imgNameEnviado === '' || $targetStart === '') {
      error_log("⛔ duplicarImagenEventoSiempre: params inválidos duplicateFromId={$duplicateFromId}, img='{$imgNameEnviado}', start='{$targetStart}'");
      return null;
    }

    $basename = basename($imgNameEnviado);

    // Año origen
    $srcYear = null;
    $stmt = $connection->prepare("SELECT start FROM events WHERE id = ?");
    $stmt->bind_param("i", $duplicateFromId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
      $srcYear = date('Y', strtotime($row['start']));
    }
    if (!$srcYear) return null;

    $destYear = date('Y', strtotime($targetStart));
    $srcDir = rtrim($basePath, '/')."/{$srcYear}/";
    $dstDir = rtrim($basePath, '/')."/{$destYear}/";

    $candidatos = [
      $srcDir.$basename,
      rtrim($basePath, '/').'/'.$basename,
    ];
    $glob = glob(rtrim($basePath, '/')."*/".$basename) ?: [];
    $candidatos = array_merge($candidatos, $glob);

    $srcPath = null;
    foreach ($candidatos as $cand) { if (is_file($cand)) { $srcPath = $cand; break; } }
    if (!$srcPath) return null;

    if (!is_dir($dstDir)) { @mkdir($dstDir, 0777, true); if (!is_dir($dstDir)) return null; }

    $ext  = pathinfo($basename, PATHINFO_EXTENSION);
    $name = pathinfo($basename, PATHINFO_FILENAME);
    $newName = $name.'-copy-'.uniqid('', true).($ext ? '.'.$ext : '');
    $dstPath = $dstDir.$newName;

    $ok = @copy($srcPath, $dstPath);
    if (!$ok || !is_file($dstPath)) return null;

    return $newName;
  }
}

// ======= ENRICH ROW =======
if (!function_exists('enrichEventRow')) {
  function enrichEventRow(array $row, mysqli $connection): array {
    $row['macroeventData'] = (!empty($row['macroevent_id']) && !empty($row['macroevent_title'])) ? [
      'id' => $row['macroevent_id'], 'title' => $row['macroevent_title']
    ] : null;

    $row['projectData'] = (!empty($row['project_id']) && !empty($row['project_title'])) ? [
      'id' => $row['project_id'], 'title' => $row['project_title']
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
      $stmt = $connection->prepare("
        SELECT id, periodic_id, start, end, time_start, time_end
        FROM events WHERE periodic_id = ? ORDER BY start ASC
      ");
      $stmt->bind_param("s", $row['periodic_id']);
      $stmt->execute();
      $row['periodicEvents'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
      $row['periodicEvents'] = null;
    }

    // Agents del evento
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
      $agentData = ['id' => (int)$agent['agent_id'], 'name' => $agent['name']];
      switch ($agent['type']) {
        case 'ORGANIZADOR':  $row['organizer'][]    = $agentData; break;
        case 'COLABORADOR':  $row['collaborator'][] = $agentData; break;
        case 'PATROCINADOR': $row['sponsor'][]      = $agentData; break;
      }
    }

    // Categorías (EN)
    $row['category'] = fetchCategoriesForEvent($connection, (int)$row['id']);
    return $row;
  }
}


/** ================================
 *  GET
 *  ================================ */
switch ($method) {
  case 'GET':
 $rawCats = $_GET['categories'] ?? $_GET['category'] ?? null;
// ahora puedes llamar SIN segundo argumento:
$catsParam = normalizeCategories($rawCats);
$match = (isset($_GET['match']) && strtolower($_GET['match']) === 'all') ? 'all' : 'any';

  // --- GET por ID ---
  if (is_numeric($resource)) {
    $stmt = $connection->prepare("
      SELECT e.*,
             pg.title as periodic_title,
             m.title  AS macroevent_title,
             pr.title AS project_title,
             p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
             s.name   AS sala_name,  s.room_location AS sala_location
      FROM events e
      LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
      LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
      LEFT JOIN projects      pr ON e.project_id   = pr.id
      LEFT JOIN places        p  ON e.place_id     = p.id
      LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
      WHERE e.id = ?
    ");
    $stmt->bind_param("i", $resource);
    $stmt->execute();
    $result = $stmt->get_result();
    $event = $result->fetch_assoc();
    if ($event) $event = enrichEventRow($event, $connection);
    echo json_encode($event ?: []);
    break;
  }

  // --- GET por año ---
  if (isset($_GET['year']) && is_numeric($_GET['year'])) {
    $year     = (int) $_GET['year'];
    $periodic = $_GET['periodic'] ?? 'all';

    if ($periodic === 'latest') {
      // subconsulta base (incluye columnas enriquecibles)
      $baseQuery = "
        SELECT e.*,
               pg.title as periodic_title,
               m.title  AS macroevent_title,
               pr.title AS project_title,
               p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name   AS sala_name, s.room_location AS sala_location
        FROM events e
        LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
        LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
        LEFT JOIN projects      pr ON e.project_id   = pr.id
        LEFT JOIN places        p  ON e.place_id     = p.id
        LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
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

      if ($catsParam) {
        $ph = implode(',', array_fill(0, count($catsParam), '?'));
        if ($match === 'all') {
          $query = "
            SELECT e.*
            FROM ( $baseQuery ) e
            INNER JOIN event_categories ec ON ec.event_id = e.id
            WHERE ec.category IN ($ph)
            GROUP BY e.id
            HAVING COUNT(DISTINCT ec.category) = ?
          ";
        } else {
          $query = "
            SELECT DISTINCT e.*
            FROM ( $baseQuery ) e
            INNER JOIN event_categories ec ON ec.event_id = e.id
            WHERE ec.category IN ($ph)
          ";
        }
      } else {
        $query = $baseQuery;
      }

      $stmt = $connection->prepare($query);
      if ($catsParam) {
        if ($match === 'all') {
          $types  = "ii" . str_repeat('s', count($catsParam)) . "i";
          $params = [$year, $year];
          foreach ($catsParam as $c) { $params[] = $c; }
          $params[] = count($catsParam);
          $stmt->bind_param($types, ...$params);
        } else {
          $types  = "ii" . str_repeat('s', count($catsParam));
          $params = [$year, $year];
          foreach ($catsParam as $c) { $params[] = $c; }
          $stmt->bind_param($types, ...$params);
        }
      } else {
        $stmt->bind_param("ii", $year, $year);
      }
    } else {
      // todos los eventos del año (incluye periódicos)
      $query = "
        SELECT e.*,
               pg.title as periodic_title,
               m.title  AS macroevent_title,
               pr.title AS project_title,
               p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
               s.name   AS sala_name, s.room_location AS sala_location
        FROM events e
        LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
        LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
        LEFT JOIN projects      pr ON e.project_id   = pr.id
        LEFT JOIN places        p  ON e.place_id     = p.id
        LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
        WHERE YEAR(e.start) = ?
      ";

      if ($catsParam) {
        $ph = implode(',', array_fill(0, count($catsParam), '?'));
        if ($match === 'all') {
          $query .= " AND e.id IN (
            SELECT ec.event_id
            FROM event_categories ec
            WHERE ec.category IN ($ph)
            GROUP BY ec.event_id
            HAVING COUNT(DISTINCT ec.category) = ?
          )";
        } else {
          $query .= " AND e.id IN (
            SELECT DISTINCT ec.event_id
            FROM event_categories ec
            WHERE ec.category IN ($ph)
          )";
        }
      }

      $stmt = $connection->prepare($query);
      if ($catsParam) {
        if ($match === 'all') {
          $types  = "i" . str_repeat('s', count($catsParam)) . "i";
          $params = [$year];
          foreach ($catsParam as $c) { $params[] = $c; }
          $params[] = count($catsParam);
          $stmt->bind_param($types, ...$params);
        } else {
          $types  = "i" . str_repeat('s', count($catsParam));
          $params = [$year];
          foreach ($catsParam as $c) { $params[] = $c; }
          $stmt->bind_param($types, ...$params);
        }
      } else {
        $stmt->bind_param("i", $year);
      }
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $events = [];
    while ($row = $result->fetch_assoc()) {
      $events[] = enrichEventRow($row, $connection);
    }
    echo json_encode($events);
    break;
  }

  // --- GET por macroevento ---
  if (isset($_GET['macroevent_id']) && is_numeric($_GET['macroevent_id'])) {
    $macroeventId = (int)$_GET['macroevent_id'];
    $query = "
      SELECT e.*,
             pg.title as periodic_title,
             m.title  AS macroevent_title,
             pr.title AS project_title,
             p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
             s.name   AS sala_name, s.room_location AS sala_location
      FROM events e
      LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
      LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
      LEFT JOIN projects      pr ON e.project_id   = pr.id
      LEFT JOIN places        p  ON e.place_id     = p.id
      LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
      WHERE e.macroevent_id = ?
    ";

    if ($catsParam) {
      $ph = implode(',', array_fill(0, count($catsParam), '?'));
      if ($match === 'all') {
        $query .= " AND e.id IN (
          SELECT ec.event_id FROM event_categories ec
          WHERE ec.category IN ($ph)
          GROUP BY ec.event_id
          HAVING COUNT(DISTINCT ec.category) = ?
        )";
      } else {
        $query .= " AND e.id IN (
          SELECT DISTINCT ec.event_id FROM event_categories ec
          WHERE ec.category IN ($ph)
        )";
      }
    }

    $stmt = $connection->prepare($query);
    if ($catsParam) {
      if ($match === 'all') {
        $types  = "i" . str_repeat('s', count($catsParam)) . "i";
        $params = [$macroeventId];
        foreach ($catsParam as $c) { $params[] = $c; }
        $params[] = count($catsParam);
        $stmt->bind_param($types, ...$params);
      } else {
        $types  = "i" . str_repeat('s', count($catsParam));
        $params = [$macroeventId];
        foreach ($catsParam as $c) { $params[] = $c; }
        $stmt->bind_param($types, ...$params);
      }
    } else {
      $stmt->bind_param("i", $macroeventId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $events = [];
    while ($row = $result->fetch_assoc()) {
      $events[] = enrichEventRow($row, $connection);
    }
    echo json_encode($events);
    break;
  }

  // --- GET por agente ---
  if (isset($_GET['agent_id']) && is_numeric($_GET['agent_id'])) {
    $agentId = (int)$_GET['agent_id'];
    $role    = isset($_GET['role']) ? strtoupper($_GET['role']) : null;

    $base = "
      SELECT e.*,
             pg.title as periodic_title,
             m.title  AS macroevent_title,
             pr.title AS project_title,
             p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
             s.name   AS sala_name, s.room_location AS sala_location
      FROM event_agents ea
      INNER JOIN events e ON e.id = ea.event_id
      LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
      LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
      LEFT JOIN projects      pr ON e.project_id   = pr.id
      LEFT JOIN places        p  ON e.place_id     = p.id
      LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
      WHERE ea.agent_id = ?
    ";

    if ($role && in_array($role, ['ORGANIZADOR','COLABORADOR','PATROCINADOR'], true)) {
      $base .= " AND ea.type = ? ";
      if ($catsParam) {
        $ph = implode(',', array_fill(0, count($catsParam), '?'));
        if ($match === 'all') {
          $base .= " AND e.id IN (
            SELECT ec.event_id FROM event_categories ec
            WHERE ec.category IN ($ph)
            GROUP BY ec.event_id
            HAVING COUNT(DISTINCT ec.category) = ?
          )";
        } else {
          $base .= " AND e.id IN (
            SELECT DISTINCT ec.event_id FROM event_categories ec
            WHERE ec.category IN ($ph)
          )";
        }
      }
      $stmt = $connection->prepare($base . " ORDER BY e.start ASC");
      if ($catsParam) {
        if ($match === 'all') {
          $types  = "is" . str_repeat('s', count($catsParam)) . "i";
          $params = [$agentId, $role];
          foreach ($catsParam as $c) { $params[] = $c; }
          $params[] = count($catsParam);
          $stmt->bind_param($types, ...$params);
        } else {
          $types  = "is" . str_repeat('s', count($catsParam));
          $params = [$agentId, $role];
          foreach ($catsParam as $c) { $params[] = $c; }
          $stmt->bind_param($types, ...$params);
        }
      } else {
        $stmt->bind_param("is", $agentId, $role);
      }
    } else {
      if ($catsParam) {
        $ph = implode(',', array_fill(0, count($catsParam), '?'));
        if ($match === 'all') {
          $base .= " AND e.id IN (
            SELECT ec.event_id FROM event_categories ec
            WHERE ec.category IN ($ph)
            GROUP BY ec.event_id
            HAVING COUNT(DISTINCT ec.category) = ?
          )";
        } else {
          $base .= " AND e.id IN (
            SELECT DISTINCT ec.event_id FROM event_categories ec
            WHERE ec.category IN ($ph)
          )";
        }
      }
      $stmt = $connection->prepare($base . " ORDER BY e.start ASC");
      if ($catsParam) {
        if ($match === 'all') {
          $types  = "i" . str_repeat('s', count($catsParam)) . "i";
          $params = [$agentId];
          foreach ($catsParam as $c) { $params[] = $c; }
          $params[] = count($catsParam);
          $stmt->bind_param($types, ...$params);
        } else {
          $types  = "i" . str_repeat('s', count($catsParam));
          $params = [$agentId];
          foreach ($catsParam as $c) { $params[] = $c; }
          $stmt->bind_param($types, ...$params);
        }
      } else {
        $stmt->bind_param("i", $agentId);
      }
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $events = [];
    while ($row = $res->fetch_assoc()) { $events[] = enrichEventRow($row, $connection); }
    echo json_encode($events);
    break;
  }

  // --- GET por proyecto ---
  if (isset($_GET['project_id']) && is_numeric($_GET['project_id'])) {
    $projectId = (int)$_GET['project_id'];
    $query = "
      SELECT e.*, pg.title as periodic_title,
             m.title AS macroevent_title,
             pr.title AS project_title,
             p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
             s.name AS sala_name, s.room_location AS sala_location
      FROM events e
      LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
      LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
      LEFT JOIN projects      pr ON e.project_id   = pr.id
      LEFT JOIN places        p  ON e.place_id     = p.id
      LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
      WHERE e.project_id = ?
    ";

    if ($catsParam) {
      $ph = implode(',', array_fill(0, count($catsParam), '?'));
      if ($match === 'all') {
        $query .= " AND e.id IN (
          SELECT ec.event_id FROM event_categories ec
          WHERE ec.category IN ($ph)
          GROUP BY ec.event_id
          HAVING COUNT(DISTINCT ec.category) = ?
        )";
      } else {
        $query .= " AND e.id IN (
          SELECT DISTINCT ec.event_id FROM event_categories ec
          WHERE ec.category IN ($ph)
        )";
      }
    }

    $stmt = $connection->prepare($query);
    if ($catsParam) {
      if ($match === 'all') {
        $types  = "i" . str_repeat('s', count($catsParam)) . "i";
        $params = [$projectId];
        foreach ($catsParam as $c) { $params[] = $c; }
        $params[] = count($catsParam);
        $stmt->bind_param($types, ...$params);
      } else {
        $types  = "i" . str_repeat('s', count($catsParam));
        $params = [$projectId];
        foreach ($catsParam as $c) { $params[] = $c; }
        $stmt->bind_param($types, ...$params);
      }
    } else {
      $stmt->bind_param("i", $projectId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $events = [];
    while ($row = $result->fetch_assoc()) { $events[] = enrichEventRow($row, $connection); }
    echo json_encode($events);
    break;
  }

  // --- GET por periodic_id (listado de pases del grupo) ---
  if (isset($_GET['periodic_id'])) {
    $periodicId = $_GET['periodic_id'];
    $stmt = $connection->prepare("
      SELECT e.*,
             pg.title as periodic_title,
             m.title  AS macroevent_title,
             pr.title AS project_title,
             p.name   AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
             s.name   AS sala_name, s.room_location AS sala_location
      FROM events e
      LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
      LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
      LEFT JOIN projects      pr ON e.project_id   = pr.id
      LEFT JOIN places        p  ON e.place_id     = p.id
      LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
      WHERE e.periodic_id = ?
      ORDER BY e.start DESC
    ");
    $stmt->bind_param("s", $periodicId);
    $stmt->execute();
    $result = $stmt->get_result();
    $events = [];
    while ($row = $result->fetch_assoc()) { $events[] = enrichEventRow($row, $connection); }
    echo json_encode($events);
    break;
  }

  // --- GET por defecto: todos (con filtro categorías opcional) ---
  $query = "
    SELECT e.*, pg.title as periodic_title,
           m.title AS macroevent_title,
           pr.title AS project_title,
           p.name AS place_name, p.address AS place_address, p.lat AS place_lat, p.lon AS place_lon,
           s.name AS sala_name, s.room_location AS sala_location
    FROM events e
    LEFT JOIN periodic_groups pg ON e.periodic_id = pg.id
    LEFT JOIN macroevents   m  ON e.macroevent_id = m.id
    LEFT JOIN projects      pr ON e.project_id   = pr.id
    LEFT JOIN places        p  ON e.place_id     = p.id
    LEFT JOIN salas         s  ON e.sala_id      = s.sala_id
    WHERE 1=1
  ";
  if ($catsParam) {
    $ph = implode(',', array_fill(0, count($catsParam), '?'));
    if ($match === 'all') {
      $query .= " AND e.id IN (
        SELECT ec.event_id FROM event_categories ec
        WHERE ec.category IN ($ph)
        GROUP BY ec.event_id
        HAVING COUNT(DISTINCT ec.category) = ?
      )";
    } else {
      $query .= " AND e.id IN (
        SELECT DISTINCT ec.event_id FROM event_categories ec
        WHERE ec.category IN ($ph)
      )";
    }
  }

  $stmt = $connection->prepare($query);
  if ($catsParam) {
    if ($match === 'all') {
      $types  = str_repeat('s', count($catsParam)) . "i";
      $params = [];
      foreach ($catsParam as $c) { $params[] = $c; }
      $params[] = count($catsParam);
      $stmt->bind_param($types, ...$params);
    } else {
      $types  = str_repeat('s', count($catsParam));
      $params = [];
      foreach ($catsParam as $c) { $params[] = $c; }
      $stmt->bind_param($types, ...$params);
    }
  }
  $stmt->execute();
  $result = $stmt->get_result();
  $events = [];
  while ($row = $result->fetch_assoc()) { $events[] = enrichEventRow($row, $connection); }
  echo json_encode($events);
  break;

 /** ================================
 *  POST (CREATE / PATCH)
 *  ================================ */
  case 'POST':
    error_log("🔥 POST recibido:");
    error_log(print_r($_POST, true));
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    $data = $_POST;

    $isUpdate = false;
    if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
      $isUpdate = true;
    }
    if (!$isUpdate && isset($data['_method'])) {
      unset($data['_method']);
    }

    // Imagen
    $hasNewUpload = isset($_FILES['img']) && is_array($_FILES['img']) && $_FILES['img']['error'] === UPLOAD_ERR_OK;
    if ($hasNewUpload) {
      $uploadedImg = procesarArchivoPorAnio($basePath, 'img', 'start', 'img');
      $imgName     = $uploadedImg;
    } else {
      $imgName = $data['img'] ?? '';
    }

    $duplicateFromId = isset($data['duplicate_from_id']) && is_numeric($data['duplicate_from_id'])
      ? (int)$data['duplicate_from_id'] : null;

    if (
      !$isUpdate && $duplicateFromId && !$hasNewUpload &&
      !empty($imgName) && !empty($data['start'])
    ) {
      $dup = duplicarImagenEventoSiempre($connection, $basePath, $imgName, $data['start'], $duplicateFromId);
      if ($dup) $imgName = $dup;
    }

    $yaEsCopia = strpos($imgName, '-copy-') !== false;
    if (!$yaEsCopia && !empty($imgName) && !empty($data['start'])) {
      $newYear = date('Y', strtotime($data['start']));
      $srcYear = null;
      if (!$srcYear && $duplicateFromId) {
        $srcStmt = $connection->prepare("SELECT start FROM events WHERE id = ?");
        $srcStmt->bind_param("i", $duplicateFromId);
        $srcStmt->execute();
        $srcRes = $srcStmt->get_result()->fetch_assoc();
        if ($srcRes && !empty($srcRes['start'])) $srcYear = date('Y', strtotime($srcRes['start']));
      }
      if ($srcYear && $srcYear !== $newYear) {
        $basename = basename($imgName);
        $srcPath  = rtrim($basePath, '/')."/{$srcYear}/".$basename;
        $dstDir   = rtrim($basePath, '/')."/{$newYear}/";
        $dstPath  = $dstDir.$basename;
        if (!is_dir($dstDir)) @mkdir($dstDir, 0777, true);
        if (is_file($srcPath) && !is_file($dstPath)) @copy($srcPath, $dstPath);
      }
    }

    // Parseo
    $periodic    = isset($data['periodic']) ? (int)filter_var($data['periodic'], FILTER_VALIDATE_BOOLEAN) : 0;
    $periodicId  = $periodic ? ($data['periodic_id'] ?? '') : null;
    $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;
    $capacity    = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
    $ticketPrices      = $data['ticket_prices'] ?? null;
    $ticketPricesJson  = json_encode($ticketPrices ?: []);
    $status = isset($data['status']) && $data['status'] !== '' ? (string)$data['status'] : 'EJECUCION';

    // Categorías EN
    global $CATEGORY_WHITELIST;
    $categories = normalizeCategories($data['category'] ?? null, $CATEGORY_WHITELIST);

    // Validación mínima
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

    // ID (para PATCH)
    $id = isset($data['id']) ? (int)$data['id']
        : (isset($_GET['id']) ? (int)$_GET['id']
        : (is_numeric($resource) ? (int)$resource : null));

    if ($isUpdate && !$id) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido para edición."]);
      exit();
    }

    // Insert / Update
    if ($isUpdate) {
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
    insertAgents($connection, $id, $organizers,    'ORGANIZADOR');
    insertAgents($connection, $id, $collaborators, 'COLABORADOR');
    insertAgents($connection, $id, $sponsors,      'PATROCINADOR');

    // Categorías (reemplazar)
    replaceEventCategories($connection, $id, $categories);

    // Periódicos (pases)
    if ($periodic && $periodicId && isset($data['repeated_dates'])) {
      $repeatedDates = json_decode($data['repeated_dates'], true) ?: [];

      $normTime = function($t) {
        if (!$t) return '00:00:00';
        $p = explode(':', $t);
        $h = str_pad((string)($p[0] ?? '0'), 2, '0', STR_PAD_LEFT);
        $m = str_pad((string)($p[1] ?? '0'), 2, '0', STR_PAD_LEFT);
        return "{$h}:{$m}:00";
      };

      $stmt = $connection->prepare("SELECT id, start, end, time_start, time_end FROM events WHERE periodic_id = ?");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();
      $res = $stmt->get_result();
      $existingById  = [];
      $existingByKey = [];
      while ($row = $res->fetch_assoc()) {
        $rid = (int)$row['id'];
        $d   = substr($row['start'], 0, 10);
        $ts  = $normTime($row['time_start'] ?? '');
        $key = "{$d}|{$ts}";
        $existingById[$rid]   = $row;
        $existingByKey[$key]  = $row;
      }

      $payloadRows = [];
      foreach ($repeatedDates as $rd) {
        $d = isset($rd['start']) ? substr($rd['start'], 0, 10) : null;
        if (!$d) continue;
        $e  = isset($rd['end']) ? substr($rd['end'], 0, 10) : $d;
        $ts = $normTime($rd['time_start'] ?? '');
        $te = $rd['time_end'] ?? '';
        if ($te === '' || $te === '00:00' || $te === '00:00:00') {
          if ($ts !== '00:00:00') {
            [$hh,$mm] = explode(':', $ts);
            $hh = (int)$hh + 3; if ($hh >= 24) $hh -= 24;
            $te = sprintf('%02d:%02d:00', $hh, (int)$mm);
          } else {
            $te = '00:00:00';
          }
        }
        $payloadRows[] = [
          'id'         => (isset($rd['id']) && is_numeric($rd['id'])) ? (int)$rd['id'] : null,
          'start'      => $d,
          'end'        => $e,
          'time_start' => $ts,
          'time_end'   => $te,
        ];
      }

      $keptIds = [];
      foreach ($payloadRows as $rd) {
        $start      = $rd['start'];
        $end        = $rd['end'];
        $time_start = $rd['time_start'];
        $time_end   = $rd['time_end'];

        if ($rd['id'] && isset($existingById[$rd['id']])) {
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

        // INSERT nuevo pase
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
        $newId = $connection->insert_id;
        $keptIds[$newId] = true;

        // Copiar categorías del principal a los pases nuevos (coherencia)
        replaceEventCategories($connection, $newId, $categories);

        // Copiar agentes si te interesa (opcional)
      }

      // Borrado diferido de pases que ya no están
      $stmt = $connection->prepare("SELECT id FROM events WHERE periodic_id = ?");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();
      $res = $stmt->get_result();
      while ($row = $res->fetch_assoc()) {
        $eid = (int)$row['id'];
        if (isset($keptIds[$eid])) continue;
        $stmtDel = $connection->prepare("DELETE FROM events WHERE id = ?");
        $stmtDel->bind_param("i", $eid);
        $stmtDel->execute();
      }
    }

    // Si dejó de ser periódico, limpieza del grupo (manteniendo actual) — (igual que tenías)
    if (!$periodic && $periodicId && $id) {
      $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
      $stmt->bind_param("si", $periodicId, $id);
      $stmt->execute();

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

      $stmt = $connection->prepare("UPDATE events SET periodic_id = NULL WHERE id = ?");
      $stmt->bind_param("i", $id);
      $stmt->execute();
    }

    echo json_encode(["message" => $isUpdate ? "Evento actualizado" : "Evento creado"]);
    break;

/** ================================
 *  DELETE
 *  ================================ */
  case 'DELETE':
    $periodicId = $_POST['periodic_id'] ?? $_GET['periodic_id'] ?? null;
    $keepIdRaw  = $_POST['keep_id']     ?? $_GET['keep_id']     ?? null;

    if ($periodicId && $keepIdRaw !== null) {
      $keepId = (int)$keepIdRaw;

      $stmt = $connection->prepare("SELECT id, img, start FROM events WHERE periodic_id = ? AND id != ?");
      $stmt->bind_param("si", $periodicId, $keepId);
      $stmt->execute();
      $imgs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

      $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ? AND id != ?");
      $stmt->bind_param("si", $periodicId, $keepId);
      $stmt->execute();

      foreach ($imgs as $row) {
        $img = $row['img'] ?? '';
        $yr  = isset($row['start']) ? date('Y', strtotime($row['start'])) : null;
        if ($img && $yr) {
          eliminarArchivoSiNoSeUsa($connection, 'events', 'img', $img, $basePath . $yr . '/');
        }
      }

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
      $stmt = $connection->prepare("SELECT img, start FROM events WHERE periodic_id = ?");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();
      $imgs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

      $stmt = $connection->prepare("DELETE FROM events WHERE periodic_id = ?");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();

      $stmt = $connection->prepare("DELETE FROM periodic_groups WHERE id = ?");
      $stmt->bind_param("s", $periodicId);
      $stmt->execute();

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

    // Borrado individual
    $idRaw = $_POST['id'] ?? $_GET['id'] ?? (is_numeric($resource) ? $resource : null);
    if (!is_numeric($idRaw)) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      break;
    }
    $id = (int)$idRaw;

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
