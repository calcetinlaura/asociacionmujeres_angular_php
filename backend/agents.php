<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
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

$basePath = "../uploads/img/AGENTS/";


switch ($method) {
    case 'GET':

    // ---------- Helper: normaliza el role recibido por query ----------
    function normalizeAgentRole(?string $role): ?string {
        if (!$role) return null;
        $r = strtoupper(trim($role));
        // alias comunes
        $map = [
            'ORGANIZER'    => 'ORGANIZADOR',
            'COLLABORATOR' => 'COLABORADOR',
            'SPONSOR'      => 'PATROCINADOR',
        ];
        if (isset($map[$r])) $r = $map[$r];

        return in_array($r, ['ORGANIZADOR','COLABORADOR','PATROCINADOR'], true) ? $r : null;
    }

    // ---------- Helper: adjunta eventos a un agente usando event_agents ----------
    function attachEventsToAgent(mysqli $connection, array &$agent, array $opts = []): void {
        if (empty($agent) || empty($agent['id'])) {
            $agent['events'] = [];
            return;
        }

        $agentId = (int)$agent['id'];
        $role    = normalizeAgentRole($opts['role'] ?? null);
        $year    = isset($opts['year']) && is_numeric($opts['year']) ? (int)$opts['year'] : null;
        $limit   = isset($opts['limit']) && is_numeric($opts['limit']) ? (int)$opts['limit'] : null;
        $offset  = isset($opts['offset']) && is_numeric($opts['offset']) ? (int)$opts['offset'] : null;
        $order   = strtolower($opts['order'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';

        // Construcción dinámica del SQL con filtros
        $sql = "
            SELECT
                e.*,
                GROUP_CONCAT(DISTINCT ea.type ORDER BY ea.type SEPARATOR ',') AS agent_roles
            FROM event_agents ea
            INNER JOIN events e ON e.id = ea.event_id
            WHERE ea.agent_id = ?
        ";

        $types = "i";
        $binds = [$agentId];

        if ($role) {
            $sql   .= " AND ea.type = ? ";
            $types .= "s";
            $binds[] = $role;
        }

        if ($year) {
            $sql   .= " AND YEAR(e.start) = ? ";
            $types .= "i";
            $binds[] = $year;
        }

        $sql .= " GROUP BY e.id ORDER BY e.start {$order} ";

        if ($limit !== null) {
            // MySQL no permite parametrizar LIMIT/OFFSET por nombre, pero sí con bind si usas enteros
            // aseguramos enteros arriba
            if ($offset !== null) {
                $sql .= " LIMIT ? OFFSET ? ";
                $types .= "ii";
                $binds[] = $limit;
                $binds[] = $offset;
            } else {
                $sql .= " LIMIT ? ";
                $types .= "i";
                $binds[] = $limit;
            }
        }

        $stmt = $connection->prepare($sql);
        // bind dinámico
        $stmt->bind_param($types, ...$binds);
        $stmt->execute();
        $res = $stmt->get_result();

        $events = [];
        while ($row = $res->fetch_assoc()) {
            // Opcional: si quieres enriquecer con lugares, macroevento, etc.
            // $row = enrichEventRow($row, $connection);
            $row['agent_roles'] = $row['agent_roles'] ? explode(',', $row['agent_roles']) : [];
            $events[] = $row;
        }
        $stmt->close();

        $agent['events'] = $events;
    }

    // --------- lectura de query flags comunes ----------
    $includeEvents = isset($_GET['include']) && $_GET['include'] === 'events';
    $roleFilter    = $_GET['role']   ?? null;
    $yearFilter    = $_GET['year']   ?? null;
    $limitParam    = $_GET['limit']  ?? null;
    $offsetParam   = $_GET['offset'] ?? null;
    $orderParam    = $_GET['order']  ?? null;

    // ---------- GET /agents.php?id=123 ----------
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
        $stmt = $connection->prepare("SELECT * FROM agents WHERE id = ?");
        $stmt->bind_param("i", $_GET['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $agent = $result->fetch_assoc();
        $stmt->close();

        if ($agent && $includeEvents) {
            attachEventsToAgent($connection, $agent, [
                'role'  => $roleFilter,
                'year'  => $yearFilter,
                'limit' => is_numeric($limitParam) ? (int)$limitParam : null,
                'offset'=> is_numeric($offsetParam) ? (int)$offsetParam : null,
                'order' => $orderParam,
            ]);
        }

        echo json_encode($agent ?: []);
    }

    // ---------- GET /agents.php?category=XYZ ----------
    elseif (isset($_GET['category'])) {
        $category = $_GET['category'];
        $stmt = $connection->prepare("SELECT * FROM agents WHERE category = ?");
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();

        $agents = [];
        while ($row = $result->fetch_assoc()) {
            if ($includeEvents) {
                attachEventsToAgent($connection, $row, [
                    'role'  => $roleFilter,
                    'year'  => $yearFilter,
                    'limit' => is_numeric($limitParam) ? (int)$limitParam : null,
                    'offset'=> is_numeric($offsetParam) ? (int)$offsetParam : null,
                    'order' => $orderParam,
                ]);
            }
            $agents[] = $row;
        }
        $stmt->close();

        echo json_encode($agents);
    }

    // ---------- GET /agents.php (todos) ----------
    else {
        $stmt = $connection->prepare("SELECT * FROM agents");
        $stmt->execute();
        $result = $stmt->get_result();

        $agents = [];
        while ($row = $result->fetch_assoc()) {
            if ($includeEvents) {
                attachEventsToAgent($connection, $row, [
                    'role'  => $roleFilter,
                    'year'  => $yearFilter,
                    'limit' => is_numeric($limitParam) ? (int)$limitParam : null,
                    'offset'=> is_numeric($offsetParam) ? (int)$offsetParam : null,
                    'order' => $orderParam,
                ]);
            }
            $agents[] = $row;
        }
        $stmt->close();

        echo json_encode($agents);
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
        $imgName = procesarArchivo($basePath, 'img', $data);

        // Validación de campos obligatorios
        $campoFaltante = validarCamposRequeridos($data, ['name']);
        if ($campoFaltante !== null) {
            http_response_code(400);
            echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
            exit();
        }

        $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

        if ($isUpdate) {
            $id = $data['id'] ?? null;
            if (!is_numeric($id)) {
                http_response_code(400);
                echo json_encode(["message" => "ID no válido."]);
                exit();
            }

            // Obtener imagen anterior
            $stmtCurrent = $connection->prepare("SELECT img FROM agents WHERE id = ?");
            $stmtCurrent->bind_param("i", $id);
            $stmtCurrent->execute();
            $result = $stmtCurrent->get_result();
            $existing = $result->fetch_assoc();
            $oldImg = $existing['img'] ?? '';

            if ($imgName === '') {
                $imgName = $oldImg;
            }

            $stmt = $connection->prepare("UPDATE agents SET
                name = ?, contact = ?, phone = ?, email = ?, province = ?, town = ?,
                address = ?, post_code = ?, category = ?, observations = ?, img = ?
                WHERE id = ?");
            $stmt->bind_param("sssssssssssi",
                $data['name'], $data['contact'], $data['phone'], $data['email'],
                $data['province'], $data['town'], $data['address'], $data['post_code'],
                $data['category'], $data['observations'], $imgName, $id
            );

            if ($stmt->execute()) {
                if ($oldImg && $imgName !== $oldImg) {
                    eliminarArchivoSiNoSeUsa($connection, 'agents', 'img', $oldImg, $basePath);
                }
                echo json_encode(["message" => "Agente actualizado con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar el agente: " . $stmt->error]);
            }

        } else {
            // CREATE
            $stmt = $connection->prepare("INSERT INTO agents
                (name, contact, phone, email, province, town, address, post_code, category, observations, img)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssssssss",
                $data['name'], $data['contact'], $data['phone'], $data['email'],
                $data['province'], $data['town'], $data['address'], $data['post_code'],
                $data['category'], $data['observations'], $imgName
            );

            if ($stmt->execute()) {
                echo json_encode(["message" => "Agente creado con éxito.", "id" => $stmt->insert_id]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al crear el agente: " . $stmt->error]);
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

        // Recuperar imagen
        $stmtImg = $connection->prepare("SELECT img FROM agents WHERE id = ?");
        $stmtImg->bind_param("i", $id);
        $stmtImg->execute();
        $resultImg = $stmtImg->get_result();
        $imgToDelete = $resultImg->fetch_assoc()['img'] ?? '';

        $stmt = $connection->prepare("DELETE FROM agents WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($imgToDelete) {
                eliminarArchivoSiNoSeUsa($connection, 'agents', 'img', $imgToDelete, $basePath);
            }
            echo json_encode(["message" => "Agente eliminado con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar el agente: " . $stmt->error]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
?>
