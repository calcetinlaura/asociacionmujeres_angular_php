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
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
        // Obtener un socio por ID
        $stmt = $connection->prepare("SELECT * FROM partners WHERE id = ?");
        $stmt->bind_param("i", $_GET['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $partner = $result->fetch_assoc();

        $partner['cuotas'] = isset($partner['cuotas']) ? json_decode($partner['cuotas'], true) : [];

        echo json_encode($partner ? $partner : []);
    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
        // Filtrar socios por el año de cuota
        $year = (int)$_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM partners WHERE JSON_CONTAINS(cuotas, ?)");
        $yearJson = json_encode($year);
        $stmt->bind_param("s", $yearJson);
        $stmt->execute();
        $result = $stmt->get_result();
        $partners = [];

        while ($row = $result->fetch_assoc()) {
            $row['cuotas'] = isset($row['cuotas']) ? json_decode($row['cuotas'], true) : [];
            $partners[] = $row;
        }
        echo json_encode($partners);
    } else {
        // Obtener todos los socios
        $stmt = $connection->prepare("SELECT * FROM partners");
        $stmt->execute();
        $result = $stmt->get_result();
        $partners = [];

        while ($row = $result->fetch_assoc()) {
            $row['cuotas'] = isset($row['cuotas']) ? json_decode($row['cuotas'], true) : [];
            $partners[] = $row;
        }
        echo json_encode($partners);
    }
    break;



    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      $data = json_decode(file_get_contents("php://input"), true);

      if (!$data || !isset($data['name'], $data['surname'])) {
          http_response_code(400);
          echo json_encode(["message" => "Nombre y apellido son obligatorios"]);
          exit();
      }

      // Convertir cuotas a JSON antes de insertar
      $cuotasJson = json_encode($data['cuotas'] ?? []);

      // **Asignar valores a variables antes de bind_param()**
      $name = $data['name'];
      $surname = $data['surname'] ? $data['surname'] : null;
      $birthday = !empty($data['birthday']) ? $data['birthday'] : null;
      $post_code = !empty($data['post_code']) ? $data['post_code'] : null;
      $address = !empty($data['address']) ? $data['address'] : null;
      $phone = !empty($data['phone']) ? $data['phone'] : null;
      $email = !empty($data['email']) ? $data['email'] : null;
      $town = !empty($data['town']) ? $data['town'] : null;


      $stmt = $connection->prepare("INSERT INTO partners
          (name, surname, birthday, post_code, address, phone, email, town, cuotas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

      if (!$stmt) {
          http_response_code(500);
          echo json_encode(["message" => "Error en la preparación de la consulta: " . $connection->error]);
          exit();
      }

      // **Ahora bind_param() recibe solo valores válidos, evitando '' en fechas**
      $stmt->bind_param("sssssssss",
          $name,
          $surname,
          $birthday,
          $post_code,
          $address,
          $phone,
          $email,
          $town,
          $cuotasJson
      );

      if ($stmt->execute()) {
          echo json_encode(["message" => "Socio añadido con éxito.", "id" => $stmt->insert_id]);
      } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir el socio: " . $stmt->error]);
      }
      break;



      case 'PATCH':
        error_reporting(E_ALL);
        ini_set('display_errors', 1);

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['id']) || !is_numeric($data['id'])) {
            http_response_code(400);
            echo json_encode(["message" => "ID no válido."]);
            exit();
        }

        $id = (int)$data['id'];

        // Convertir cuotas a JSON
        $cuotasJson = json_encode($data['cuotas'] ?? []);

        // **Asignar valores a variables antes de bind_param()**
        $name = $data['name'];
        $surname = $data['surname'] ? $data['surname'] : null;
        $birthday = !empty($data['birthday']) ? $data['birthday'] : null;
        $post_code = !empty($data['post_code']) ? $data['post_code'] : null;
        $address = !empty($data['address']) ? $data['address'] : null;
        $phone = !empty($data['phone']) ? $data['phone'] : null;
        $email = !empty($data['email']) ? $data['email'] : null;
        $town = !empty($data['town']) ? $data['town'] : null;

        $stmt = $connection->prepare("UPDATE partners
            SET name = ?, surname = ?, birthday = ?, post_code = ?, address = ?, phone = ?,
                email = ?, town = ?, cuotas = ?
            WHERE id = ?");

        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["message" => "Error en la preparación de la consulta: " . $connection->error]);
            exit();
        }

        // **Ahora bind_param() recibe solo valores válidos, evitando '' en fechas**
        $stmt->bind_param("sssssssssi",
            $name,
            $surname,
            $birthday,
            $post_code,
            $address,
            $phone,
            $email,
            $town,
            $cuotasJson,
            $id
        );

        if ($stmt->execute()) {
            echo json_encode(["message" => "Socio actualizado con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar el socio: " . $stmt->error]);
        }
        break;


    case 'DELETE':
        $id = isset($_GET['id']) ? $_GET['id'] : null;

        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(["message" => "ID para eliminar no válido."]);
            exit();
        }

        $stmt = $connection->prepare("DELETE FROM partners WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Socio eliminado con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar el socio: " . $stmt->error]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
?>

