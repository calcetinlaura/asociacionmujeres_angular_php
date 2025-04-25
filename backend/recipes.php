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
$basePath = "../uploads/img/RECIPES/";

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        echo json_encode($result->fetch_assoc() ?: []);
    } elseif (isset($_GET['latest'])) {
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM recipes");
        $stmt->execute();
        $latestYear = $stmt->get_result()->fetch_assoc()['latestYear'];

        if ($latestYear) {
            $stmt = $connection->prepare("SELECT * FROM recipes WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
            $result = $stmt->get_result();
            $recipes = [];
            while ($row = $result->fetch_assoc()) {
                $recipes[] = $row;
            }
            echo json_encode($recipes);
        } else {
            echo json_encode([]);
        }
    } elseif (isset($_GET['year'])) {
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE year = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
    } elseif (isset($_GET['category'])) {
        $category = $_GET['category'];
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE category = ?");
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
    } else {
        $stmt = $connection->prepare("SELECT * FROM recipes");
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
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
    $imgName = procesarArchivo($basePath, 'img', $data);
    $data['img'] = $imgName;
    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    // Validar campos obligatorios
    $campoFaltante = validarCamposRequeridos($data, ['title', 'category', 'year']);
    if ($campoFaltante !== null) {
      http_response_code(400);
      echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
      exit();
    }

    $year = (int)$data['year'];

    if ($isUpdate) {
        $id = isset($data['id']) ? (int)$data['id'] : null;
        if (!$id) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        $stmtCurrent = $connection->prepare("SELECT img FROM recipes WHERE id = ?");
        $stmtCurrent->bind_param("i", $id);
        $stmtCurrent->execute();
        $result = $stmtCurrent->get_result();
        $current = $result->fetch_assoc();
        $oldImg = $current['img'] ?? '';

        if ($imgName === '') {
          $imgName = $oldImg;
        }

        $stmt = $connection->prepare("
          UPDATE recipes SET title = ?, category = ?, owner = ?, ingredients = ?, recipe = ?, img = ?, year = ? WHERE id = ?
        ");
        $stmt->bind_param("ssssssii", $data['title'], $data['category'], $data['owner'], $data['ingredients'], $data['recipe'], $imgName, $year, $id);

        if ($stmt->execute()) {
          if ($oldImg && $imgName !== $oldImg) {
            eliminarImagenSiNoSeUsa($connection, 'recipes', 'img', $oldImg, $basePath);
          }
          echo json_encode(["message" => "Receta actualizada con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar la receta: " . $stmt->error]);
        }

    } else {
        $stmt = $connection->prepare("
          INSERT INTO recipes (title, category, owner, ingredients, recipe, img, year)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("ssssssi", $data['title'], $data['category'], $data['owner'], $data['ingredients'], $data['recipe'], $imgName, $year);

        if ($stmt->execute()) {
          echo json_encode(["message" => "Receta añadida con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir la receta: " . $stmt->error]);
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

    $stmtImg = $connection->prepare("SELECT img FROM recipes WHERE id = ?");
    $stmtImg->bind_param("i", $id);
    $stmtImg->execute();
    $imgResult = $stmtImg->get_result();
    $imgToDelete = $imgResult->fetch_assoc()['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM recipes WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarImagenSiNoSeUsa($connection, 'recipes', 'img', $imgToDelete, $basePath);
      }
      echo json_encode(["message" => "Receta eliminada con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar la receta: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
