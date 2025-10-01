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
  if ($override === 'DELETE') {
    $method = 'DELETE';
  }
}

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);
$basePath = "../uploads/img/PARTNERS/";
function sanitizeCuotas(string $raw): string {
  $arr = json_decode($raw, true);
  if (!is_array($arr)) return json_encode([]);

  $clean = [];
  foreach ($arr as $c) {
    if (!is_array($c)) continue;
    $year = isset($c['year']) ? (int)$c['year'] : null;
    $paid = isset($c['paid']) ? (bool)$c['paid'] : false;
    if ($year === null) continue; // year es obligatorio
    $item = ['year' => $year, 'paid' => $paid];

    // opcionales
    $item['date_payment'] = isset($c['date_payment']) ? ($c['date_payment'] ?: null) : null;
    $item['method_payment'] = isset($c['method_payment']) ? ($c['method_payment'] ?: null) : null;

    $clean[] = $item;
  }
  return json_encode($clean);
}

switch ($method) {
  case 'GET':
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
      $stmt = $connection->prepare("SELECT * FROM partners WHERE id = ?");
      $stmt->bind_param("i", $_GET['id']);
      $stmt->execute();
      $result = $stmt->get_result();
      $partner = $result->fetch_assoc();
      $partner['cuotas'] = isset($partner['cuotas']) ? json_decode($partner['cuotas'], true) : [];
      echo json_encode($partner ?: []);
    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = (int)$_GET['year'];

      // Buscar objetos { "year": <year>, "paid": true } dentro de cuotas (array de objetos)
      $candidate = json_encode(['year' => $year, 'paid' => true]);
      $stmt = $connection->prepare("SELECT * FROM partners WHERE JSON_CONTAINS(cuotas, ?, '$')");
      $stmt->bind_param("s", $candidate);
      $stmt->execute();

      $result = $stmt->get_result();
      $partners = [];
      while ($row = $result->fetch_assoc()) {
        $row['cuotas'] = json_decode($row['cuotas'], true) ?? [];
        $partners[] = $row;
      }
      echo json_encode($partners);
    } else {
      $stmt = $connection->prepare("SELECT * FROM partners");
      $stmt->execute();
      $result = $stmt->get_result();
      $partners = [];
      while ($row = $result->fetch_assoc()) {
        $row['cuotas'] = json_decode($row['cuotas'], true) ?? [];
        $partners[] = $row;
      }
      echo json_encode($partners);
    }
    break;

  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    // Acción: eliminar imagen
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

    // Validación obligatoria
    $campoFaltante = validarCamposRequeridos($data, ['name']);
    if ($campoFaltante) {
      http_response_code(400);
      echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
      exit();
    }

    // Normaliza 'cuotas' (array de objetos) o vacío
    $cuotasJson = isset($data['cuotas']) ? sanitizeCuotas($data['cuotas']) : json_encode([]);


    $birthday    = !empty($data['birthday']) ? $data['birthday'] : null;
    $death       = isset($data['death']) ? (int)filter_var($data['death'], FILTER_VALIDATE_BOOLEAN) : 0;
    $unsubscribe = isset($data['unsubscribe']) ? (int)filter_var($data['unsubscribe'], FILTER_VALIDATE_BOOLEAN) : 0;

    $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

    if ($isUpdate) {
      $id = (int)($data['id'] ?? 0);
      if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      // Imagen actual
      $stmtImg = $connection->prepare("SELECT img FROM partners WHERE id = ?");
      $stmtImg->bind_param("i", $id);
      $stmtImg->execute();
      $oldImg = $stmtImg->get_result()->fetch_assoc()['img'] ?? '';

      if ($imgName === '') {
        $imgName = $oldImg;
      }

      $stmt = $connection->prepare("
        UPDATE partners
           SET name=?, surname=?, birthday=?, post_code=?, address=?, phone=?, email=?, province=?, town=?,
               cuotas=?, img=?, observations=?, death=?, unsubscribe=?
         WHERE id=?
      ");
      $stmt->bind_param(
        "ssssssssssssiii",
        $data['name'], $data['surname'], $birthday, $data['post_code'], $data['address'],
        $data['phone'], $data['email'], $data['province'], $data['town'], $cuotasJson,
        $imgName, $data['observations'], $death, $unsubscribe, $id
      );

      if ($stmt->execute()) {
        if ($oldImg && $imgName !== $oldImg) {
          eliminarArchivoSiNoSeUsa($connection, 'partners', 'img', $oldImg, $basePath);
        }
        echo json_encode(["message" => "Socia actualizada correctamente."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar: " . $stmt->error]);
      }
    } else {
      // Insertar nueva
      $stmt = $connection->prepare("
        INSERT INTO partners (name, surname, birthday, post_code, address, phone, email, province, town, cuotas, img, observations, death, unsubscribe)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->bind_param(
        "ssssssssssssii",
        $data['name'], $data['surname'], $birthday, $data['post_code'], $data['address'],
        $data['phone'], $data['email'], $data['province'], $data['town'], $cuotasJson,
        $imgName, $data['observations'], $death, $unsubscribe
      );

      if ($stmt->execute()) {
        echo json_encode(["message" => "Socia registrada con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al registrar: " . $stmt->error]);
      }
    }
    break;

  case 'DELETE':
    $id = $_POST['id'] ?? $_GET['id'] ?? null;
    if (!$id) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    $stmtImg = $connection->prepare("SELECT img FROM partners WHERE id = ?");
    $stmtImg->bind_param("i", $id);
    $stmtImg->execute();
    $result = $stmtImg->get_result();
    $imgToDelete = $result->fetch_assoc()['img'] ?? '';

    $stmt = $connection->prepare("DELETE FROM partners WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
      if ($imgToDelete) {
        eliminarArchivoSiNoSeUsa($connection, 'partners', 'img', $imgToDelete, $basePath);
      }
      echo json_encode(["message" => "Socia eliminada correctamente."]);
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
