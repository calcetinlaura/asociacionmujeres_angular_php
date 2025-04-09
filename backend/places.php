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

// Cargar salas de un lugar
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

// Insertar o actualizar salas
function saveSalas($connection, $placeId, $salas) {
  // Borrar las actuales primero
  $stmtDelete = $connection->prepare("DELETE FROM salas WHERE place_id = ?");
  $stmtDelete->bind_param("i", $placeId);
  $stmtDelete->execute();

  $stmtInsert = $connection->prepare("INSERT INTO salas (place_id, name, type, capacity, location) VALUES (?, ?, ?, ?, ?)");

  foreach ($salas as $sala) {
    $name = $sala['name'] ?? '';
    $type = $sala['type'] ?? '';
    $capacity = isset($sala['capacity']) ? (int)$sala['capacity'] : null;
    $location = $sala['location'] ?? '';
    $stmtInsert->bind_param("issis", $placeId, $name, $type, $capacity, $location);
    $stmtInsert->execute();
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

      $stmt = $connection->prepare("SELECT * FROM salas WHERE place_id = ?");
      $stmt->bind_param("i", $placeId);
      $stmt->execute();

      $result = $stmt->get_result();
      $salas = [];

      while ($row = $result->fetch_assoc()) {
          $salas[] = $row;
      }

      echo json_encode($salas);
  }elseif (isset($_GET['withSalas']) && $_GET['withSalas'] === 'true') {
    $stmtPlaces = $connection->prepare("SELECT * FROM places");
    $stmtPlaces->execute();
    $resultPlaces = $stmtPlaces->get_result();

    $places = [];
    while ($place = $resultPlaces->fetch_assoc()) {
      // Buscar salas asociadas a este lugar
      $stmtSalas = $connection->prepare("SELECT * FROM salas WHERE place_id = ?");
      $stmtSalas->bind_param("i", $place['id']);
      $stmtSalas->execute();
      $resultSalas = $stmtSalas->get_result();

      $salas = [];
      while ($sala = $resultSalas->fetch_assoc()) {
        $salas[] = $sala;
      }

      $place['salas'] = $salas;
      $places[] = $place;
    }

    echo json_encode($places);
  }else {
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

    if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
      $ruta = "../uploads/img/PLACES/";
      move_uploaded_file($_FILES['img']['tmp_name'], $ruta . $_FILES['img']['name']);
      $imgName = $_FILES['img']['name'];
    } else {
      $imgName = '';
    }

    $data = $_POST;
    $data['img'] = $imgName;
    $salas = !empty($data['salas']) ? json_decode($data['salas'], true) : [];

    if (isset($data['_method']) && strtoupper($data['_method']) == 'PATCH') {
      $id = isset($data['id']) ? (int)$data['id'] : null;
      if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      if ($imgName == '') {
        $stmtCurrent = $connection->prepare("SELECT img FROM places WHERE id = ?");
        $stmtCurrent->bind_param("i", $id);
        $stmtCurrent->execute();
        $result = $stmtCurrent->get_result();
        $currentPlace = $result->fetch_assoc();
        $imgName = $currentPlace['img'];
      }

      $stmt = $connection->prepare("UPDATE places
        SET name = ?, province = ?, lat = ?, lon = ?, capacity = ?, address = ?,
            town = ?, post_code = ?, description = ?, observations = ?,
            management = ?, type = ?, img = ?
        WHERE id = ?");
      $stmt->bind_param("ssddissssssssi",
        $data['name'], $data['province'], $data['lat'], $data['lon'],
        $data['capacity'], $data['address'], $data['town'], $data['post_code'],
        $data['description'], $data['observations'], $data['management'],
        $data['type'], $imgName, $id
      );

      if ($stmt->execute()) {
        saveSalas($connection, $id, $salas);
        echo json_encode(["message" => "Lugar actualizado con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
      }
    } else {
      $stmt = $connection->prepare("INSERT INTO places
        (name, province, lat, lon, capacity, address, town, post_code,
         description, observations, management, type, img)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      $stmt->bind_param("ssddissssssss",
        $data['name'], $data['province'], $data['lat'], $data['lon'],
        $data['capacity'], $data['address'], $data['town'], $data['post_code'],
        $data['description'], $data['observations'], $data['management'],
        $data['type'], $imgName
      );

      if ($stmt->execute()) {
        $newPlaceId = $connection->insert_id;
        saveSalas($connection, $newPlaceId, $salas);
        echo json_encode(["message" => "Lugar añadido con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al añadir el lugar: " . $stmt->error]);
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
    $stmt = $connection->prepare("DELETE FROM places WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
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
?>
