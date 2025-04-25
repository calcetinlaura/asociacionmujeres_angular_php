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
$basePath = "../uploads/img/PODCASTS/";

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
      $stmt = $connection->prepare("SELECT * FROM podcasts WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $podcast = $result->fetch_assoc();
      echo json_encode($podcast ?: []);
    } else {
      $stmt = $connection->prepare("SELECT * FROM podcasts");
      $stmt->execute();
      $result = $stmt->get_result();
      $podcasts = [];
      while ($row = $result->fetch_assoc()) {
        $podcasts[] = $row;
      }
      echo json_encode($podcasts);
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
    $imgName = procesarArchivo($basePath, "img");
    $data = $_POST;
    $data['img'] = $imgName;

    // Validación de campos requeridos
    $falta = validarCamposRequeridos($data, ['title', 'date']);
    if ($falta) {
      http_response_code(400);
      echo json_encode(["message" => "El campo '$falta' es obligatorio."]);
      exit();
    }

    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    if ($isUpdate) {
      $id = isset($data['id']) ? (int)$data['id'] : null;
      if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      $stmtCurrent = $connection->prepare("SELECT img FROM podcasts WHERE id = ?");
      $stmtCurrent->bind_param("i", $id);
      $stmtCurrent->execute();
      $res = $stmtCurrent->get_result();
      $current = $res->fetch_assoc();
      $oldImg = $current['img'] ?? '';

      if (!$imgName) {
        $imgName = $oldImg;
      }

      $stmt = $connection->prepare("UPDATE podcasts SET title = ?, date = ?, description = ?, img = ? WHERE id = ?");
      $stmt->bind_param("ssssi", $data['title'], $data['date'], $data['description'], $imgName, $id);

      if ($stmt->execute()) {
        if ($oldImg && $imgName !== $oldImg) {
          eliminarImagenSiNoSeUsa($connection, 'podcasts', 'img', $oldImg, $basePath);
        }
        echo json_encode(["message" => "Podcast actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar el podcast: " . $stmt->error]);
      }

    } else {
      $stmt = $connection->prepare("INSERT INTO podcasts (title, date, description, img) VALUES (?, ?, ?, ?)");
      $stmt->bind_param("ssss", $data['title'], $data['date'], $data['description'], $imgName);

      if ($stmt->execute()) {
        echo json_encode(["message" => "Podcast añadido con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al añadir el podcast: " . $stmt->error]);
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

    $stmt = $connection->prepare("SELECT img FROM podcasts WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $podcast = $res->fetch_assoc();
    $imgToDelete = $podcast['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM podcasts WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarImagenSiNoSeUsa($connection, 'podcasts', 'img', $imgToDelete, $basePath);
      }
      echo json_encode(["message" => "Podcast eliminado con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar el podcast: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
