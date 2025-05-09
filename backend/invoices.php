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
$pdfPath = "../uploads/pdf/INVOICES/";

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        // Obtener una factura por ID
        $stmt = $connection->prepare("
            SELECT invoices.*,
                   creditors.company AS creditor_company,
                   creditors.contact AS creditor_contact,
                   subsidies.name AS subsidy_name,
                   projects.title AS project_title
            FROM invoices
            LEFT JOIN creditors ON invoices.creditor_id = creditors.id
            LEFT JOIN subsidies ON invoices.subsidy_id = subsidies.id
            LEFT JOIN projects ON invoices.project_id = projects.id
            WHERE invoices.id = ?
        ");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $invoice = $result->fetch_assoc();
        echo json_encode($invoice ? $invoice : []);
    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
        // Filtrar facturas por año
        $year = $_GET['year'];
        $stmt = $connection->prepare("
            SELECT invoices.*,
                   creditors.company AS creditor_company,
                   creditors.contact AS creditor_contact,
                   subsidies.name AS subsidy_name,
                   projects.title AS project_title
            FROM invoices
            LEFT JOIN creditors ON invoices.creditor_id = creditors.id
            LEFT JOIN subsidies ON invoices.subsidy_id = subsidies.id
            LEFT JOIN projects ON invoices.project_id = projects.id
            WHERE YEAR(invoices.date_invoice) = ?
        ");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $invoices = [];
        while ($row = $result->fetch_assoc()) {
            $invoices[] = $row;
        }
        echo json_encode($invoices);
    }  elseif (isset($_GET['subsidy']) && isset($_GET['subsidy_year'])) {
      $subsidy = $_GET['subsidy'];
      $year = $_GET['subsidy_year'];

      $stmt = $connection->prepare("
          SELECT invoices.*,
                 creditors.company AS creditor_company,
                 creditors.contact AS creditor_contact,
                 subsidies.name AS subsidy_name,
                 projects.title AS project_title
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          LEFT JOIN subsidies ON invoices.subsidy_id = subsidies.id
          LEFT JOIN projects ON invoices.project_id = projects.id
          WHERE subsidies.name = ? AND YEAR(invoices.date_invoice) = ?
      ");
      $stmt->bind_param("si", $subsidy, $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $invoices = [];
      while ($row = $result->fetch_assoc()) {
          $invoices[] = $row;
      }
      echo json_encode($invoices);
      }
  else {
        // Obtener todas las facturas
        $stmt = $connection->prepare("
            SELECT invoices.*,
                   creditors.company AS creditor_company,
                   creditors.contact AS creditor_contact,
                   subsidies.name AS subsidy_name,
                   projects.title AS project_title
            FROM invoices
            LEFT JOIN creditors ON invoices.creditor_id = creditors.id
            LEFT JOIN subsidies ON invoices.subsidy_id = subsidies.id
            LEFT JOIN projects ON invoices.project_id = projects.id
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

      // 🔥 Manejo de eliminación de PDF
      if (isset($_POST['action']) && $_POST['action'] === 'deletePdf') {
          $type = $_POST['type'];
          $id = $_POST['id'] ?? null;

          if ($id) {
              if (eliminarSoloImagen($connection, strtolower($type), 'invoice_pdf', $id, $pdfPath)) {
                  echo json_encode(["message" => "PDF eliminado correctamente"]);
              } else {
                  http_response_code(500);
                  echo json_encode(["message" => "Error al eliminar PDF"]);
              }
              exit();
          }

          http_response_code(400);
          echo json_encode(["message" => "ID requerido para eliminar PDF"]);
          exit();
      }

      // 🔄 Procesar archivo PDF
      $pdfName = procesarArchivoPorAnio($pdfPath, 'invoice_pdf', 'date_invoice');
      $data = $_POST;
      $data['invoice_pdf'] = $pdfName;

      // Fallback para JSON
      if (empty($data)) {
          $json = file_get_contents('php://input');
          $data = json_decode($json, true);
      }

      // Variables
      $number_invoice = $data['number_invoice'] ?? null;
      $type_invoice = $data['type_invoice'] ?? null;
      $date_invoice = $_POST['date_invoice'] ?? null;
      $date_accounting = !empty($data['date_accounting']) ? $data['date_accounting'] : null;
      $date_payment = !empty($data['date_payment']) ? $data['date_payment'] : null;
      $creditor_id = isset($data['creditor_id']) && is_numeric($data['creditor_id']) ? (int)$data['creditor_id'] : null;
      $description = $data['description'] ?? '';
      $amount = isset($data['amount']) ? (float)$data['amount'] : 0;
      $irpf = isset($data['irpf']) ? (float)$data['irpf'] : 0;
      $iva = isset($data['iva']) ? (float)$data['iva'] : 0;
      $total_amount = isset($data['total_amount']) ? (float)$data['total_amount'] : 0;
      $total_amount_irpf = isset($data['total_amount_irpf']) ? (float)$data['total_amount_irpf'] : 0;
      $subsidy_id = isset($data['subsidy_id']) && is_numeric($data['subsidy_id']) ? (int)$data['subsidy_id'] : null;
      $project_id = isset($data['project_id']) && is_numeric($data['project_id']) ? (int)$data['project_id'] : null;

      // 🔄 PATCH (editar)
      if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
          $id = $data['id'] ?? null;
          if (!is_numeric($id)) {
              http_response_code(400);
              echo json_encode(["message" => "ID no válido."]);
              exit();
          }

          $stmtCurrent = $connection->prepare("SELECT invoice_pdf FROM invoices WHERE id = ?");
          $stmtCurrent->bind_param("i", $id);
          $stmtCurrent->execute();
          $currentData = $stmtCurrent->get_result()->fetch_assoc();
          $oldPdf = $currentData['invoice_pdf'] ?? '';

          // Si no hay nuevo PDF, mantener el anterior
          if ($pdfName === '' && isset($_POST['invoice_pdf']) && $_POST['invoice_pdf'] === '') {
              // Eliminar si el frontend lo manda explícitamente como vacío
              if ($oldPdf) {
                  eliminarImagenSiNoSeUsa($connection, 'invoices', 'invoice_pdf', $oldPdf, $pdfPath);
              }
          } elseif ($pdfName === '') {
              $pdfName = $oldPdf;
          }

          $stmt = $connection->prepare("UPDATE invoices SET
              number_invoice = ?, type_invoice = ?, date_invoice = ?, date_accounting = ?, date_payment = ?,
              creditor_id = ?, description = ?, amount = ?, irpf = ?, iva = ?,
              total_amount = ?, total_amount_irpf = ?, subsidy_id = ?, project_id = ?, invoice_pdf = ?
              WHERE id = ?");

          if (!$stmt) {
              http_response_code(500);
              echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
              exit();
          }

          $stmt->bind_param(
              "sssssisddddsiisi",
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
              $subsidy_id,
              $project_id,
              $pdfName,
              $id
          );

          if ($stmt->execute()) {
              echo json_encode(["message" => "Factura actualizada con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al actualizar la factura: " . $stmt->error]);
          }

      } else {
          // ➕ POST (nuevo)
          $stmt = $connection->prepare("INSERT INTO invoices
              (number_invoice, type_invoice, date_invoice, date_accounting, date_payment,
              creditor_id, description, amount, irpf, iva,
              total_amount, total_amount_irpf, subsidy_id, project_id, invoice_pdf)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

          if (!$stmt) {
              http_response_code(500);
              echo json_encode(["message" => "Error al preparar la inserción: " . $connection->error]);
              exit();
          }

          $stmt->bind_param(
              "sssssisddddsiis",
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
              $subsidy_id,
              $project_id,
              $pdfName
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

      // 🔍 1. Obtener el nombre del archivo PDF antes de eliminar la factura
      $stmt = $connection->prepare("SELECT invoice_pdf FROM invoices WHERE id = ?");
      $stmt->bind_param("i", $id);
      $stmt->execute();
      $result = $stmt->get_result();
      $row = $result->fetch_assoc();
      $pdfToDelete = $row['invoice_pdf'] ?? '';

      // 🗑️ 2. Eliminar la factura
      $stmt = $connection->prepare("DELETE FROM invoices WHERE id = ?");
      $stmt->bind_param("i", $id);

      if ($stmt->execute()) {
        // 🧹 3. Eliminar el archivo del servidor si existe
        if ($pdfToDelete) {
          eliminarImagenSiNoSeUsa($connection, 'invoices', 'invoice_pdf', $pdfToDelete, $pdfPath);
        }

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
