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
$basePath = "../uploads/img/MOVIES/";

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        $stmt = $connection->prepare("SELECT * FROM movies WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $movie = $result->fetch_assoc();
        echo json_encode($movie ?: []);
    } elseif (isset($_GET['latest'])) {
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM movies");
        $stmt->execute();
        $latestYear = $stmt->get_result()->fetch_assoc()['latestYear'];

        if ($latestYear) {
            $stmt = $connection->prepare("SELECT * FROM movies WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
            $result = $stmt->get_result();
            $movies = [];
            while ($row = $result->fetch_assoc()) {
                $movies[] = $row;
            }
            echo json_encode($movies);
        } else {
            echo json_encode([]);
        }
    } elseif (isset($_GET['year'])) {
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM movies WHERE year = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    } elseif (isset($_GET['gender'])) {
        $gender = $_GET['gender'];
        $stmt = $connection->prepare("SELECT * FROM movies WHERE gender = ?");
        $stmt->bind_param("s", $gender);
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    } else {
        $stmt = $connection->prepare("SELECT * FROM movies");
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
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
    $imgName = procesarArchivo($basePath, 'img');
    $data = $_POST;
    $data['img'] = $imgName;

    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    if ($isUpdate) {
        $id = isset($data['id']) ? (int)$data['id'] : null;
        if (!$id) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        $stmtCurrent = $connection->prepare("SELECT img FROM movies WHERE id = ?");
        $stmtCurrent->bind_param("i", $id);
        $stmtCurrent->execute();
        $result = $stmtCurrent->get_result();
        $current = $result->fetch_assoc();
        $oldImg = $current['img'] ?? '';

        if ($imgName === '') {
          $imgName = $oldImg;
        }

        $campoFaltante = validarCamposRequeridos($data, ['title', 'year', 'gender']);
        if ($campoFaltante !== null) {
          http_response_code(400);
          echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
          exit();
        }

        $year = (int)$data['year'];
        $stmt = $connection->prepare("
          UPDATE movies SET title = ?, director = ?, gender = ?, year = ?, description = ?, img = ? WHERE id = ?
        ");
        $stmt->bind_param("sssissi", $data['title'], $data['director'], $data['gender'], $year, $data['description'], $imgName, $id);

        if ($stmt->execute()) {
          if ($oldImg && $imgName !== $oldImg) {
            eliminarImagenSiNoSeUsa($connection, 'movies', 'img', $oldImg, $basePath);
          }
          echo json_encode(["message" => "Película actualizada con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
        }

    } else {
        $year = (int)$data['year'];
        $stmt = $connection->prepare("
          INSERT INTO movies (title, director, gender, year, description, img)
          VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssiss", $data['title'], $data['director'], $data['gender'], $year, $data['description'], $imgName);

        if ($stmt->execute()) {
          echo json_encode(["message" => "Película añadida con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir la película: " . $stmt->error]);
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

    $stmtImg = $connection->prepare("SELECT img FROM movies WHERE id = ?");
    $stmtImg->bind_param("i", $id);
    $stmtImg->execute();
    $imgResult = $stmtImg->get_result();
    $imgToDelete = $imgResult->fetch_assoc()['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM movies WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarImagenSiNoSeUsa($connection, 'movies', 'img', $imgToDelete, $basePath);
      }
      echo json_encode(["message" => "Película eliminada con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar la película: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
