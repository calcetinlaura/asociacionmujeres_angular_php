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
$basePath = "../uploads/img/PROJECTS/";

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        // Obtener un proyecto por ID con su subvención, eventos e invoices
        $stmt = $connection->prepare("
            SELECT
                p.*,
                s.name AS subsidy_name
            FROM
                projects p
            LEFT JOIN
                subsidies s ON p.subsidy_id = s.id
            WHERE p.id = ?
        ");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $project = $result->fetch_assoc();

        if ($project) {
            // Obtener eventos
            $eventStmt = $connection->prepare("SELECT id, title, start FROM events WHERE project_id = ?");
            $eventStmt->bind_param("i", $project['id']);
            $eventStmt->execute();
            $eventResult = $eventStmt->get_result();
            $events = [];
            while ($event = $eventResult->fetch_assoc()) {
                $events[] = $event;
            }
            $project['events'] = $events;

            // Obtener invoices
            $invoiceStmt = $connection->prepare("SELECT * FROM invoices WHERE project_id = ?");
            $invoiceStmt->bind_param("i", $project['id']);
            $invoiceStmt->execute();
            $invoiceResult = $invoiceStmt->get_result();
            $invoices = [];
            while ($invoice = $invoiceResult->fetch_assoc()) {
                $invoices[] = $invoice;
            }
            $project['invoices'] = $invoices;
        }

        echo json_encode($project ? $project : []);
    }

    elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
        // Obtener proyectos por año con subvención, eventos e invoices
        $year = $_GET['year'];
        $stmt = $connection->prepare("
            SELECT
                p.*,
                s.name AS subsidy_name
            FROM
                projects p
            LEFT JOIN
                subsidies s ON p.subsidy_id = s.id
            WHERE p.year = ?
        ");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $projects = [];

        while ($row = $result->fetch_assoc()) {
            // Eventos
            $eventStmt = $connection->prepare("SELECT id, title, start FROM events WHERE project_id = ?");
            $eventStmt->bind_param("i", $row['id']);
            $eventStmt->execute();
            $eventResult = $eventStmt->get_result();
            $events = [];
            while ($event = $eventResult->fetch_assoc()) {
                $events[] = $event;
            }
            $row['events'] = $events;

            // Invoices
            $invoiceStmt = $connection->prepare("SELECT * FROM invoices WHERE project_id = ?");
            $invoiceStmt->bind_param("i", $row['id']);
            $invoiceStmt->execute();
            $invoiceResult = $invoiceStmt->get_result();
            $invoices = [];
            while ($invoice = $invoiceResult->fetch_assoc()) {
                $invoices[] = $invoice;
            }
            $row['invoices'] = $invoices;

            $projects[] = $row;
        }

        echo json_encode($projects);
    }

    else {
        // Obtener todos los proyectos con subvención, eventos e invoices
        $stmt = $connection->prepare("
            SELECT
                p.*,
                s.name AS subsidy_name
            FROM
                projects p
            LEFT JOIN
                subsidies s ON p.subsidy_id = s.id
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $projects = [];

        while ($row = $result->fetch_assoc()) {
            // Eventos
            $eventStmt = $connection->prepare("SELECT id, title, start FROM events WHERE project_id = ?");
            $eventStmt->bind_param("i", $row['id']);
            $eventStmt->execute();
            $eventResult = $eventStmt->get_result();
            $events = [];
            while ($event = $eventResult->fetch_assoc()) {
                $events[] = $event;
            }
            $row['events'] = $events;

            // Invoices
            $invoiceStmt = $connection->prepare("SELECT * FROM invoices WHERE project_id = ?");
            $invoiceStmt->bind_param("i", $row['id']);
            $invoiceStmt->execute();
            $invoiceResult = $invoiceStmt->get_result();
            $invoices = [];
            while ($invoice = $invoiceResult->fetch_assoc()) {
                $invoices[] = $invoice;
            }
            $row['invoices'] = $invoices;

            $projects[] = $row;
        }

        echo json_encode($projects);
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
        echo json_encode(["message" => "Proyecto actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar el proyecto: " . $stmt->error]);
      }
    } else {
      $stmt = $connection->prepare("INSERT INTO projects (title, description, subsidy_id, year) VALUES (?, ?, ?, ?)");
      $stmt->bind_param("ssii", $data['title'], $data['description'], $data['subsidy_id'], $data['year']);
      if ($stmt->execute()) {
        echo json_encode(["message" => "Proyecto creado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al guardar el proyecto: " . $stmt->error]);
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
