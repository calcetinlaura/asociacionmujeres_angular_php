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
        $stmt = $connection->prepare("SELECT invoices.*,
        creditors.company AS creditor_company,
        creditors.contact AS creditor_contact
      FROM invoices
      LEFT JOIN creditors ON invoices.creditor_id = creditors.id WHERE invoices.id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $invoice = $result->fetch_assoc();
        echo json_encode($invoice ? $invoice : []);
    }  elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      // Filtrar facturas por año
      $year = $_GET['year'];
      $stmt = $connection->prepare("SELECT invoices.*,
        creditors.company AS creditor_company,
        creditors.contact AS creditor_contact
      FROM invoices
      LEFT JOIN creditors ON invoices.creditor_id = creditors.id WHERE YEAR(date_invoice) = ?");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $Invoices = [];
      while ($row = $result->fetch_assoc()) {
          $Invoices[] = $row;
      }
      echo json_encode($Invoices);
    }elseif (isset($_GET['subsidy']) && isset($_GET['subsidy_year']) && is_numeric($_GET['subsidy_year'])) {
      // Filtrar subvenciones por nombre y año
      $subsidy = $_GET['subsidy'];
      $year = $_GET['subsidy_year'];

      $stmt = $connection->prepare("SELECT * FROM invoices WHERE subsidy = ? AND subsidy_year = ?");
      $stmt->bind_param("si", $subsidy, $year); // s = string, i = integer
      $stmt->execute();
      $result = $stmt->get_result();
      $subsidies = [];

      while ($row = $result->fetch_assoc()) {
          $subsidies[] = $row;
      }

      echo json_encode($subsidies);

    }else {
      $stmt = $connection->prepare("
      SELECT
        invoices.*,
        creditors.company AS creditor_company,
        creditors.contact AS creditor_contact
      FROM invoices
      LEFT JOIN creditors ON invoices.creditor_id = creditors.id
    ");
        $stmt->execute();
        $result = $stmt->get_result();
        $invoices = [];
        while ($row = $result->fetch_assoc()) {
            $invoices[] = $row;
        }
        echo json_encode($invoices);
    }
    break;

  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    $data = $_POST;

    // Fallback para JSON (por si no viene de form-data)
    if (empty($data)) {
      $json = file_get_contents('php://input');
      $data = json_decode($json, true);
    }

    $number_invoice = $data['number_invoice'] ?? null;
    $type_invoice = $data['type_invoice'] ?? null;
    $date_invoice = isset($data['date_invoice']) ? $data['date_invoice'] : null;
    $date_accounting = isset($data['date_accounting']) ? $data['date_accounting'] : null;
    $date_payment = isset($data['date_payment']) ? $data['date_payment'] : null;
    $creditor_id = isset($data['creditor_id']) && is_numeric($data['creditor_id']) ? (int)$data['creditor_id'] : null;
    $description = $data['description'] ?? '';
    $amount = isset($data['amount']) ? (float)$data['amount'] : 0;
    $irpf = isset($data['irpf']) ? (float)$data['irpf'] : 0;
    $iva = isset($data['iva']) ? (float)$data['iva'] : 0;
    $total_amount = isset($data['total_amount']) ? (float)$data['total_amount'] : 0;
    $total_amount_irpf = isset($data['total_amount_irpf']) ? (float)$data['total_amount_irpf'] : 0;
    $subsidy = $data['subsidy'] ?? null;
    $subsidy_year = isset($data['subsidy_year']) ? (int)$data['subsidy_year'] : null;

    // PATCH (actualización)
    if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
      $id = $data['id'] ?? null;
      if (!is_numeric($id)) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      $stmt = $connection->prepare("UPDATE invoices SET
        number_invoice = ?, type_invoice = ?, date_invoice = ?, date_accounting = ?, date_payment = ?,
        creditor_id = ?, description = ?, amount = ?, irpf = ?, iva = ?,
        total_amount = ?, total_amount_irpf = ?, subsidy = ?, subsidy_year = ?
        WHERE id = ?");

      if (!$stmt) {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
        exit();
      }

      $stmt->bind_param(
        "sssssisddddssii",
        $number_invoice,
        $type_invoice,
        $date_invoice,
        $date_accounting,
        $date_payment,
        $creditor_id,
        $description,
        $amount,
        $irpf,
        $iva,
        $total_amount,
        $total_amount_irpf,
        $subsidy,
        $subsidy_year,
        $id
      );

      if ($stmt->execute()) {
        echo json_encode(["message" => "Factura actualizada con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar la factura: " . $stmt->error]);
      }

    } else {
      // POST (crear nueva)
      $stmt = $connection->prepare("INSERT INTO invoices
        (number_invoice, type_invoice, date_invoice, date_accounting, date_payment,
        creditor_id, description, amount, irpf, iva,
        total_amount, total_amount_irpf, subsidy, subsidy_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

      if (!$stmt) {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la inserción: " . $connection->error]);
        exit();
      }

      $stmt->bind_param(
        "sssssisddddssi",
        $number_invoice,
        $type_invoice,
        $date_invoice,
        $date_accounting,
        $date_payment,
        $creditor_id,
        $description,
        $amount,
        $irpf,
        $iva,
        $total_amount,
        $total_amount_irpf,
        $subsidy,
        $subsidy_year
      );

      if ($stmt->execute()) {
        echo json_encode(["message" => "Factura añadida con éxito."]);
      } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al añadir la factura: " . $stmt->error]);
      }
    }
    break;

  case 'DELETE':
    $id = $_GET['id'] ?? null;
    if (!is_numeric($id)) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    $stmt = $connection->prepare("DELETE FROM invoices WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      echo json_encode(["message" => "Factura eliminada con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar la factura: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
