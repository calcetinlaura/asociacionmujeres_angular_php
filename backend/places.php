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

$basePath = "../uploads/img/PLACES/";

// Función para obtener salas de un lugar
function getSalas($connection, $placeId) {
  $stmt = $connection->prepare("SELECT * FROM salas WHERE place_id = ?");
  $stmt->bind_param("i", $placeId);
  $stmt->execute();
  $result = $stmt->get_result();
  $salas = [];
  while ($row = $result->fetch_assoc()) {
    $salas[] = $row;
  }
  return $salas;
}

// Función para guardar las salas de un lugar
function saveSalas($connection, $placeId, $salas) {
  $connection->query("DELETE FROM salas WHERE place_id = $placeId");

  $stmt = $connection->prepare("INSERT INTO salas (place_id, name, type, capacity, location) VALUES (?, ?, ?, ?, ?)");
  foreach ($salas as $sala) {
    $name = $sala['name'] ?? '';
    $type = $sala['type'] ?? '';
    $capacity = isset($sala['capacity']) ? (int)$sala['capacity'] : 0;
    $location = $sala['location'] ?? '';
    $stmt->bind_param("issis", $placeId, $name, $type, $capacity, $location);
    $stmt->execute();
  }
}

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
      $stmt = $connection->prepare("SELECT * FROM places WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $place = $result->fetch_assoc();

      if ($place) {
        $place['salas'] = getSalas($connection, $resource);
      }

      echo json_encode($place ?: []);
    } elseif (isset($_GET['town'])) {
      $town = $_GET['town'];
      $stmt = $connection->prepare("SELECT * FROM places WHERE town = ?");
      $stmt->bind_param("s", $town);
      $stmt->execute();
      $result = $stmt->get_result();
      $places = [];
      while ($row = $result->fetch_assoc()) {
        $row['salas'] = getSalas($connection, $row['id']);
        $places[] = $row;
      }
      echo json_encode($places);
    } elseif (isset($_GET['place_id'])) {
      $placeId = intval($_GET['place_id']);
      echo json_encode(getSalas($connection, $placeId));
    } elseif (isset($_GET['withSalas']) && $_GET['withSalas'] === 'true') {
      $stmt = $connection->prepare("SELECT * FROM places");
      $stmt->execute();
      $result = $stmt->get_result();
      $places = [];
      while ($place = $result->fetch_assoc()) {
        $place['salas'] = getSalas($connection, $place['id']);
        $places[] = $place;
      }
      echo json_encode($places);
    } else {
      $stmt = $connection->prepare("SELECT * FROM places");
      $stmt->execute();
      $result = $stmt->get_result();
      $places = [];
      while ($row = $result->fetch_assoc()) {
        $row['salas'] = getSalas($connection, $row['id']);
        $places[] = $row;
      }
      echo json_encode($places);
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
    $salas = isset($data['salas']) ? json_decode($data['salas'], true) : [];

    $campoFaltante = validarCamposRequeridos($data, ['name', 'town', 'province']);
    if ($campoFaltante) {
      http_response_code(400);
      echo json_encode(["message" => "Campo obligatorio campoFaltantente: '$campoFaltante'"]);
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

      $stmtCurrent = $connection->prepare("SELECT img FROM places WHERE id = ?");
      $stmtCurrent->bind_param("i", $id);
      $stmtCurrent->execute();
      $res = $stmtCurrent->get_result();
      $current = $res->fetch_assoc();
      $oldImg = $current['img'] ?? '';

      if (!$imgName) {
        $imgName = $oldImg;
      }

      $stmt = $connection->prepare("UPDATE places SET name = ?, province = ?, lat = ?, lon = ?, capacity = ?, address = ?, town = ?, post_code = ?, description = ?, observations = ?, management = ?, type = ?, img = ? WHERE id = ?");
      $stmt->bind_param("ssddissssssssi",
        $data['name'], $data['province'], $data['lat'], $data['lon'], $data['capacity'],
        $data['address'], $data['town'], $data['post_code'], $data['description'],
        $data['observations'], $data['management'], $data['type'], $imgName, $id
      );

      if ($stmt->execute()) {
        if ($oldImg && $imgName !== $oldImg) {
          eliminarImagenSiNoSeUsa($connection, 'places', 'img', $oldImg, $basePath);
        }
        saveSalas($connection, $id, $salas);
        echo json_encode(["message" => "Lugar actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
      }

    } else {
      $stmt = $connection->prepare("INSERT INTO places (name, province, lat, lon, capacity, address, town, post_code, description, observations, management, type, img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      $stmt->bind_param("ssddissssssss",
        $data['name'], $data['province'], $data['lat'], $data['lon'], $data['capacity'],
        $data['address'], $data['town'], $data['post_code'], $data['description'],
        $data['observations'], $data['management'], $data['type'], $imgName
      );

      if ($stmt->execute()) {
        $newId = $connection->insert_id;
        saveSalas($connection, $newId, $salas);
        echo json_encode(["message" => "Lugar añadido con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al guardar el lugar: " . $stmt->error]);
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

      // Obtener imagen antes de borrar
      $stmtImg = $connection->prepare("SELECT img FROM places WHERE id = ?");
      $stmtImg->bind_param("i", $id);
      $stmtImg->execute();
      $resultImg = $stmtImg->get_result();
      $imgData = $resultImg->fetch_assoc();
      $imgToDelete = $imgData['img'] ?? '';

      // Borrar el lugar
      $stmt = $connection->prepare("DELETE FROM places WHERE id = ?");
      $stmt->bind_param("i", $id);
      if ($stmt->execute()) {
        if ($imgToDelete) {
          $basePath = "../uploads/img/PLACES/";
          eliminarImagenSiNoSeUsa($connection, 'places', 'img', $imgToDelete, $basePath);
        }
        echo json_encode(["message" => "Lugar eliminado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al eliminar: " . $stmt->error]);
      }
      break;


  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
