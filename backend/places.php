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
        $stmt = $connection->prepare("SELECT * FROM places WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $place = $result->fetch_assoc();
        echo json_encode($place ? $place : []);
    } elseif (isset($_GET['management'])) {
      // Obtener libros filtrando por gestióngénero
      $management = $_GET['management'];
      $stmt = $connection->prepare("SELECT * FROM places WHERE management = ?");
      $stmt->bind_param("s", $management);
      $stmt->execute();
      $result = $stmt->get_result();
      $places = [];
      while ($row = $result->fetch_assoc()) {
          $places[] = $row;
      }
      echo json_encode($places);
    } elseif (isset($_GET['town'])) {
      // Obtener libros filtrando por gestióngénero
      $town = $_GET['town'];
      $stmt = $connection->prepare("SELECT * FROM places WHERE town = ?");
      $stmt->bind_param("s", $town);
      $stmt->execute();
      $result = $stmt->get_result();
      $places = [];
      while ($row = $result->fetch_assoc()) {
          $places[] = $row;
      }
      echo json_encode($places);
    } else {
        $stmt = $connection->prepare("SELECT * FROM places");
        $stmt->execute();
        $result = $stmt->get_result();
        $places = [];
        while ($row = $result->fetch_assoc()) {
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
      $place = []; // ✅ Inicializar la variable

      // ✅ Evitar `null` en `json_decode()`
      if (!empty($data['salas'])) {
          $place['salas'] = json_decode($data['salas'], true);
      } else {
          $place['salas'] = [];
      }

      if (isset($data['_method']) && strtoupper($data['_method']) == 'PATCH') {
          $id = isset($data['id']) ? $data['id'] : null;
          if (!is_numeric($id)) {
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
                  management = ?, type = ?, img = ?, salas = ? WHERE id = ?");
          $salasJson = json_encode($place['salas']); // ✅ Guardamos el JSON en una variable
          $stmt->bind_param("ssddisssssssssi", $data['name'], $data['province'], $data['lat'],
              $data['lon'], $data['capacity'], $data['address'], $data['town'],
              $data['post_code'], $data['description'], $data['observations'],
              $data['management'], $data['type'], $imgName, $salasJson, $id);


          if ($stmt->execute()) {
              echo json_encode(["message" => "Lugar actualizado con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al actualizar el lugar: " . $stmt->error]);
          }
      } else {
          $stmt = $connection->prepare("INSERT INTO places
              (name, province, lat, lon, capacity, address, town, post_code,
              description, observations, management, type, img, salas)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
         $salasJson = json_encode($place['salas']); // ✅ Guardamos el JSON en una variable
         $stmt->bind_param("ssddisssssssss", $data['name'], $data['province'], $data['lat'],
             $data['lon'], $data['capacity'], $data['address'], $data['town'],
             $data['post_code'], $data['description'], $data['observations'],
             $data['management'], $data['type'], $imgName, $salasJson);


          if ($stmt->execute()) {
              echo json_encode(["message" => "Lugar añadido con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al añadir el lugar: " . $stmt->error]);
          }
      }
      break;

  case 'DELETE':
      $id = isset($_GET['id']) ? $_GET['id'] : null;
      if (!is_numeric($id)) {
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
          echo json_encode(["message" => "Error al eliminar el lugar: " . $stmt->error]);
      }
      break;
  default:
      http_response_code(405);
      echo json_encode(["message" => "Método no permitido"]);
      break;
}
