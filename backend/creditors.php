<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';

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

switch ($method) {
  case 'GET':
    function attachInvoicesToCreditor($connection, &$creditor) {
        $invoiceStmt = $connection->prepare("SELECT * FROM invoices WHERE creditor_id = ? ORDER BY date_invoice ASC");
        $invoiceStmt->bind_param("i", $creditor['id']);
        $invoiceStmt->execute();
        $invoiceResult = $invoiceStmt->get_result();

        $invoices = [];
        while ($inv = $invoiceResult->fetch_assoc()) {
            $invoices[] = $inv;
        }

        $creditor['invoices'] = $invoices;
    }

    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
        $stmt = $connection->prepare("SELECT * FROM creditors WHERE id = ?");
        $stmt->bind_param("i", $_GET['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $creditor = $result->fetch_assoc();

        if ($creditor) {
            attachInvoicesToCreditor($connection, $creditor);
        }

        echo json_encode($creditor ? $creditor : []);
    }

    elseif (isset($_GET['category'])) {
        $category = $_GET['category'];
        $stmt = $connection->prepare("SELECT * FROM creditors WHERE category = ?");
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
        $creditors = [];

        while ($row = $result->fetch_assoc()) {
            attachInvoicesToCreditor($connection, $row);
            $creditors[] = $row;
        }
        echo json_encode($creditors);
    }
    elseif (isset($_GET['q'])) {
        // NO incluye invoices
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
        $stmt = $connection->prepare("SELECT * FROM creditors");
        $stmt->execute();
        $result = $stmt->get_result();
        $creditors = [];
        while ($row = $result->fetch_assoc()) {
            attachInvoicesToCreditor($connection, $row);
            $creditors[] = $row;
        }
        echo json_encode($creditors);
    }
    break;

   case 'POST':
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  $data = $_POST; // FormData
  // Validación mínima
  if (empty($data['company'])) {
    http_response_code(400);
    echo json_encode(["message" => "El nombre de la empresa es obligatorio"]);
    exit();
  }

  $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

  // Campos
  $company = $data['company'];
  $cif = $data['cif'] ?? null;
  $contact = $data['contact'] ?? null;
  $phone = $data['phone'] ?? null;
  $email = $data['email'] ?? null;
  $province = $data['province'] ?? null;
  $town = $data['town'] ?? null;
  $address = $data['address'] ?? null;
  $post_code = $data['post_code'] ?? null;
  $category = $data['category'] ?? null;
  $key_words = $data['key_words'] ?? null;
  $observations = $data['observations'] ?? null;

  if ($isUpdate) {
    $id = isset($data['id']) ? (int)$data['id'] : 0;
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    $stmt = $connection->prepare("UPDATE creditors
      SET company = ?, cif = ?, contact = ?, phone = ?, email = ?, province = ?, town = ?, address = ?, post_code = ?,
          category = ?, key_words = ?, observations = ?
      WHERE id = ?");

    $stmt->bind_param(
      "ssssssssssssi",
      $company, $cif, $contact, $phone, $email, $province, $town, $address, $post_code, $category, $key_words, $observations, $id
    );

    if ($stmt->execute()) {
      echo json_encode(["message" => "Acreedor actualizado con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al actualizar el acreedor: " . $stmt->error]);
    }

  } else {
    $stmt = $connection->prepare("INSERT INTO creditors
      (company, cif, contact, phone, email, province, town, address, post_code, category, key_words, observations)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");

    $stmt->bind_param(
      "ssssssssssss",
      $company, $cif, $contact, $phone, $email, $province, $town, $address, $post_code, $category, $key_words, $observations
    );

    if ($stmt->execute()) {
      echo json_encode(["message" => "Acreedor añadido con éxito.", "id" => $stmt->insert_id]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al añadir el acreedor: " . $stmt->error]);
    }
  }
  break;

        case 'DELETE':
          $id = $_POST['id'] ?? $_GET['id'] ?? null;
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
