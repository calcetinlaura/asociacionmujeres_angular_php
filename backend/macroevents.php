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

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
      $stmt = $connection->prepare("SELECT * FROM macroevents WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $event = $result->fetch_assoc();
      echo json_encode($event ? $event: []);
    }

    elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = $_GET['year'];
      $stmt = $connection->prepare("SELECT * FROM macroevents WHERE YEAR(start) = ?");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $macroevents = [];
      while ($row = $result->fetch_assoc()) {
        $macroevents[] = $row;
      }
      echo json_encode($macroevents);
    }

    else {
      // Todos los eventos
      $stmt = $connection->prepare("SELECT * FROM macroevents");
      $stmt->execute();
      $result = $stmt->get_result();
      $macroevents = [];
      while ($row = $result->fetch_assoc()) {
        $macroevents[] = $row;
      }
      echo json_encode($macroevents);
    }
    break;

    case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);




$imgName = '';

if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
  if (!isset($_POST['start']) || empty($_POST['start'])) {
    http_response_code(400);
    echo json_encode(["message" => "Fecha de evento (start) requerida para procesar la imagen."]);
    exit();
  }

  $eventDate = $_POST['start'];
  $eventYear = date('Y', strtotime($eventDate));
  $basePath = "../uploads/img/MACROEVENTS/";
  $yearFolder = $basePath . $eventYear;

  if (!file_exists($yearFolder)) {
    mkdir($yearFolder, 0777, true);
  }

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
$data = $_POST;
$data['img'] = $imgName;

$isUpdate = isset($data['_method']) && strtoupper($data['_method']) == 'PATCH';

if ($isUpdate) {
  $id = isset($data['id']) ? (int)$data['id'] : null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(["message" => "ID no válido."]);
    exit();
  }

  if ($imgName === '') {
    $stmtCurrent = $connection->prepare("SELECT img FROM macroevents WHERE id = ?");
    $stmtCurrent->bind_param("i", $id);
    $stmtCurrent->execute();
    $result = $stmtCurrent->get_result();
    $current = $result->fetch_assoc();
    $imgName = $current['img'] ?? '';
  }
  $stmt = $connection->prepare("UPDATE macroevents SET title = ?, start = ?, end = ?, description = ?, province = ?, town = ?, img = ? WHERE id = ?");
  $stmt->bind_param("sssssssi", $data['title'], $data['start'], $data['end'], $data['description'], $data['province'], $data['town'], $imgName, $id);
  if ($stmt->execute()) {
    echo json_encode(["message" => "Macroevento actualizado con éxito."]);
  } else {
    http_response_code(500);
    echo json_encode(["message" => "Error al actualizar el evento: " . $stmt->error]);
  }
} else {
  $stmt = $connection->prepare("INSERT INTO macroevents (title, start, end, description, province, town, img) VALUES (?, ?, ?, ?, ?, ?, ?)");
  $stmt->bind_param("sssssss", $data['title'], $data['start'], $data['end'], $data['description'], $data['province'], $data['town'], $imgName);

  if ($stmt->execute()) {
    echo json_encode(["message" => "Evento creado con éxito."]);
  } else {
    http_response_code(500);
    echo json_encode(["message" => "Error al guardar el evento: " . $stmt->error]);
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
    $stmt = $connection->prepare("DELETE FROM macroevents WHERE id = ?");
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
