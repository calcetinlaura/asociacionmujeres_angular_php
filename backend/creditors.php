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

switch ($method) {
    case 'GET':
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            // Obtener un acreedor por ID
            $stmt = $connection->prepare("SELECT * FROM creditors WHERE id = ?");
            $stmt->bind_param("i", $_GET['id']);
            $stmt->execute();
            $result = $stmt->get_result();
            $creditor = $result->fetch_assoc();

            echo json_encode($creditor ? $creditor : []);
        } elseif  (isset($_GET['q'])) {
          $query = '%' . $connection->real_escape_string($_GET['q']) . '%';

          $stmt = $connection->prepare("SELECT * FROM creditors WHERE company LIKE ? OR contact LIKE ? LIMIT 10");
          $stmt->bind_param("ss", $query, $query);
          $stmt->execute();
          $result = $stmt->get_result();
          $creditors = [];

          while ($row = $result->fetch_assoc()) {
              $creditors[] = $row;
          }

          echo json_encode($creditors);
      }
        else {
            // Obtener todos los acreedores
            $stmt = $connection->prepare("SELECT * FROM creditors");
            $stmt->execute();
            $result = $stmt->get_result();
            $creditors = [];

            while ($row = $result->fetch_assoc()) {
                $creditors[] = $row;
            }
            echo json_encode($creditors);
        }
        break;

    case 'POST':
        error_reporting(E_ALL);
        ini_set('display_errors', 1);

        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || !isset($data['company'])) {
            http_response_code(400);
            echo json_encode(["message" => "El nombre de la empresa es obligatorio"]);
            exit();
        }

        // **Asignar valores a variables antes de bind_param()**
        $company = $data['company'];
        $cif = !empty($data['cif']) ? $data['cif'] : null;
        $contact = !empty($data['contact']) ? $data['contact'] : null;
        $phone = !empty($data['phone']) ? $data['phone'] : null;
        $email = !empty($data['email']) ? $data['email'] : null;
        $town = !empty($data['town']) ? $data['town'] : null;
        $address = !empty($data['address']) ? $data['address'] : null;
        $post_code = !empty($data['post_code']) ? $data['post_code'] : null;
        $category = !empty($data['category']) ? $data['category'] : null;
        $key_words = !empty($data['key_words']) ? $data['key_words'] : null;
        $observations = !empty($data['observations']) ? $data['observations'] : null;

        $stmt = $connection->prepare("INSERT INTO creditors
            (company, cif, contact, phone, email, town, address, post_code, category, key_words, observations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $stmt->bind_param("sssssssssss",
            $company, $cif, $contact, $phone, $email, $town, $address, $post_code, $category, $key_words, $observations
        );

        if ($stmt->execute()) {
            echo json_encode(["message" => "Acreedor añadido con éxito.", "id" => $stmt->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al añadir el acreedor: " . $stmt->error]);
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

        // **Asignar valores antes de actualizar**
        $company = $data['company'];
        $cif = !empty($data['cif']) ? $data['cif'] : null;
        $contact = !empty($data['contact']) ? $data['contact'] : null;
        $phone = !empty($data['phone']) ? $data['phone'] : null;
        $email = !empty($data['email']) ? $data['email'] : null;
        $town = !empty($data['town']) ? $data['town'] : null;
        $address = !empty($data['address']) ? $data['address'] : null;
        $post_code = !empty($data['post_code']) ? $data['post_code'] : null;
        $category = !empty($data['category']) ? $data['category'] : null;
        $key_words = !empty($data['key_words']) ? $data['key_words'] : null;
        $observations = !empty($data['observations']) ? $data['observations'] : null;

        $stmt = $connection->prepare("UPDATE creditors
            SET company = ?, cif = ?, contact = ?, phone = ?, email = ?, town = ?, address = ?, post_code = ?,
                category = ?, key_words = ?, observations = ?
            WHERE id = ?");

        $stmt->bind_param("sssssssssssi",
            $company, $cif, $contact, $phone, $email, $town, $address, $post_code, $category, $key_words, $observations, $id
        );

        if ($stmt->execute()) {
            echo json_encode(["message" => "Acreedor actualizado con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar el acreedor: " . $stmt->error]);
        }
        break; case 'DELETE':
          $id = isset($_GET['id']) ? $_GET['id'] : null;

          if (!is_numeric($id)) {
              http_response_code(400);
              echo json_encode(["message" => "ID para eliminar no válido."]);
              exit();
          }

          $stmt = $connection->prepare("DELETE FROM creditors WHERE id = ?");
          $stmt->bind_param("i", $id);

          if ($stmt->execute()) {
              echo json_encode(["message" => "Acreedor eliminado con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al eliminar el acreedor: " . $stmt->error]);
          }
          break;

      default:
          http_response_code(405);
          echo json_encode(["message" => "Método no permitido"]);
          break;
}
?>
