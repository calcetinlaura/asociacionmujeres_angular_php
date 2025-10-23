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
$pdfPath = "../uploads/pdf/INVOICES/";
function updateSubsidyAggregates(mysqli $connection, int $subsidyId): void {
  // sumatorios
  $spent      = calcAmountSpent($connection, $subsidyId);
  $spentIrpf  = calcAmountSpentIrpf($connection, $subsidyId);

  // leer granted
  $s = $connection->prepare("SELECT COALESCE(amount_granted,0) AS granted FROM subsidies WHERE id = ?");
  $s->bind_param("i", $subsidyId);
  $s->execute();
  $gRow = $s->get_result()->fetch_assoc();
  $granted = (float)($gRow['granted'] ?? 0);

  // asociaciones
  $assoc     = $spent     - $granted;
  $assocIrpf = $spentIrpf - $granted;


  $u = $connection->prepare(
    "UPDATE subsidies
     SET amount_spent = ?, amount_spent_irpf = ?, amount_association = ?, amount_association_irpf = ?
     WHERE id = ?"
  );
  $u->bind_param("ddddi", $spent, $spentIrpf, $assoc, $assocIrpf, $subsidyId);
  $u->execute();
}

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        // Obtener una factura por ID
        $stmt = $connection->prepare("
            SELECT invoices.*,
            creditors.cif AS creditor_cif,
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
            SELECT invoices.*,creditors.cif AS creditor_cif,
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
          SELECT invoices.*,creditors.cif AS creditor_cif,
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
            SELECT invoices.*,creditors.cif AS creditor_cif,
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
     // 🔥 Manejo de eliminación de PDF
if (isset($_POST['action']) && $_POST['action'] === 'deletePdf') {
    // type puede ser: 'invoice_pdf' o 'proof_pdf'
    $field = $_POST['type'] ?? 'invoice_pdf';
    $id = isset($_POST['id']) ? (int)$_POST['id'] : null;

    if ($id) {
        // Obtén el nombre del archivo actual
        $stmt = $connection->prepare("SELECT $field FROM invoices WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $current = $stmt->get_result()->fetch_assoc();
        $currentFile = $current[$field] ?? '';

        if ($currentFile) {
            // Limpia el valor en BD
            $stmtU = $connection->prepare("UPDATE invoices SET $field = NULL WHERE id = ?");
            $stmtU->bind_param("i", $id);
            $okUpdate = $stmtU->execute();

            // Borra el archivo si no está en uso
            $okFile = eliminarArchivoSiNoSeUsa($connection, 'invoices', $field, $currentFile, $pdfPath);

            if ($okUpdate && $okFile) {
                echo json_encode(["message" => "PDF eliminado correctamente"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al eliminar PDF"]);
            }
        } else {
            echo json_encode(["message" => "No hay PDF para eliminar"]);
        }
        exit();
    }

    http_response_code(400);
    echo json_encode(["message" => "ID requerido para eliminar PDF"]);
    exit();
}


      // Lee primero POST (para tener invoice_pdf_existing / proof_pdf_existing)
$data = $_POST ?? [];

// Sube archivos ('' si no hay upload)
$invoiceUpload = procesarArchivoPorAnio($pdfPath, 'invoice_pdf', 'date_invoice', 'invoice_pdf');
$proofUpload   = procesarArchivoPorAnio($pdfPath, 'proof_pdf',   'date_invoice', 'proof_pdf');

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
      $concept = $data['concept'] ?? '';
      $description = $data['description'] ?? '';
      $amount = normNumber($data['amount'] ?? null);
      $irpf = normNumber($data['irpf'] ?? null);
      $iva = normNumber($data['iva'] ?? null);
      $total_amount = normNumber($data['total_amount'] ?? null);
      $total_amount_irpf = normNumber($data['total_amount_irpf'] ?? null);
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
 //  AÑADE AQUÍ: capturamos el subsidy_id ANTERIOR antes de actualizar
    $stmtPrev = $connection->prepare("SELECT subsidy_id FROM invoices WHERE id = ?");
    $stmtPrev->bind_param("i", $id);
    $stmtPrev->execute();
    $prevRow = $stmtPrev->get_result()->fetch_assoc();
    $oldSubsidyId = $prevRow['subsidy_id'] ?? null;
    //
          // Traer los PDFs actuales
$stmtCurrent = $connection->prepare("SELECT invoice_pdf, proof_pdf FROM invoices WHERE id = ?");
$stmtCurrent->bind_param("i", $id);
$stmtCurrent->execute();
$currentData = $stmtCurrent->get_result()->fetch_assoc();
$oldInvoicePdf = $currentData['invoice_pdf'] ?? '';
$oldProofPdf   = $currentData['proof_pdf'] ?? '';

// Valores finales por defecto = mantener
$finalInvoice = $oldInvoicePdf;
$finalProof   = $oldProofPdf;

// --- INVOICE_PDF ---
if ($invoiceUpload !== '') {
    // nuevo archivo
    $finalInvoice = $invoiceUpload;
    if ($oldInvoicePdf && $oldInvoicePdf !== $finalInvoice) {
        eliminarArchivoSiNoSeUsa($connection, 'invoices', 'invoice_pdf', $oldInvoicePdf, $pdfPath);
    }
} else if (array_key_exists('invoice_pdf_existing', $data)) {
    if ($data['invoice_pdf_existing'] === '') {
        // borrado explícito
        if ($oldInvoicePdf) {
            eliminarArchivoSiNoSeUsa($connection, 'invoices', 'invoice_pdf', $oldInvoicePdf, $pdfPath);
        }
        $finalInvoice = ''; // o NULL si prefieres
    } // si viene con nombre → mantener (ya lo es)
}

// --- PROOF_PDF ---
if ($proofUpload !== '') {
    $finalProof = $proofUpload;
    if ($oldProofPdf && $oldProofPdf !== $finalProof) {
        eliminarArchivoSiNoSeUsa($connection, 'invoices', 'proof_pdf', $oldProofPdf, $pdfPath);
    }
} else if (array_key_exists('proof_pdf_existing', $data)) {
    if ($data['proof_pdf_existing'] === '') {
        if ($oldProofPdf) {
            eliminarArchivoSiNoSeUsa($connection, 'invoices', 'proof_pdf', $oldProofPdf, $pdfPath);
        }
        $finalProof = '';
    } // si viene con nombre → mantener
}
          $stmt = $connection->prepare("UPDATE invoices SET
              number_invoice = ?, type_invoice = ?, date_invoice = ?, date_accounting = ?, date_payment = ?,
              creditor_id = ?, description = ?, concept = ?, amount = ?, irpf = ?, iva = ?,
              total_amount = ?, total_amount_irpf = ?, subsidy_id = ?, project_id = ?, invoice_pdf = ?, proof_pdf = ?
              WHERE id = ?");

          if (!$stmt) {
              http_response_code(500);
              echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
              exit();
          }

          $stmt->bind_param(
              "sssssissdddddiissi",
              $number_invoice,
              $type_invoice,
              $date_invoice,
              $date_accounting,
              $date_payment,
              $creditor_id,
              $description, $concept,
              $amount,
              $irpf,
              $iva,
              $total_amount,
              $total_amount_irpf,
              $subsidy_id,
              $project_id,
             $finalInvoice,
  $finalProof,
              $id
          );

          if ($stmt->execute()) {if (!empty($subsidy_id)) {
    updateSubsidyAggregates($connection, (int)$subsidy_id);
  }
  if (!empty($oldSubsidyId) && $oldSubsidyId != $subsidy_id) {
    updateSubsidyAggregates($connection, (int)$oldSubsidyId);
  }
              echo json_encode(["message" => "Factura actualizada con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al actualizar la factura: " . $stmt->error]);
          }

      } else {
         $finalInvoice = $invoiceUpload;
$finalProof   = $proofUpload;
          $stmt = $connection->prepare("INSERT INTO invoices
              (number_invoice, type_invoice, date_invoice, date_accounting, date_payment,
              creditor_id, description, concept, amount, irpf, iva,
              total_amount, total_amount_irpf, subsidy_id, project_id, invoice_pdf, proof_pdf)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

          if (!$stmt) {
              http_response_code(500);
              echo json_encode(["message" => "Error al preparar la inserción: " . $connection->error]);
              exit();
          }

          $stmt->bind_param(
              "sssssissdddddiiss",
              $number_invoice,
              $type_invoice,
              $date_invoice,
              $date_accounting,
              $date_payment,
              $creditor_id,
              $description,$concept,
              $amount,
              $irpf,
              $iva,
              $total_amount,
              $total_amount_irpf,
              $subsidy_id,
              $project_id,
              $finalInvoice,
              $finalProof
          );

          if ($stmt->execute()) {
  if (!empty($subsidy_id)) {
    updateSubsidyAggregates($connection, (int)$subsidy_id);
  }
  echo json_encode(["message" => "Factura añadida con éxito."]);
} else {
              http_response_code(500);
              echo json_encode(["message" => "Error al añadir la factura: " . $stmt->error]);
          }
      }

      break;

    case 'DELETE':
      $id = $_POST['id'] ?? $_GET['id'] ?? null;
      if (!is_numeric($id)) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      // 🔍 1. Obtener el nombre del archivo PDF antes de eliminar la factura
     $stmt = $connection->prepare("SELECT invoice_pdf, proof_pdf FROM invoices WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$pdfToDeleteInvoice = $row['invoice_pdf'] ?? '';
$pdfToDeleteProof   = $row['proof_pdf'] ?? '';
$subsidyId          = $row['subsidy_id'] ?? null;

// 2. Eliminar la factura (registro)
$stmt = $connection->prepare("DELETE FROM invoices WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    // 3. Eliminar archivos del servidor si existen (y no se usan en otros registros)
    if ($pdfToDeleteInvoice) {
        eliminarArchivoSiNoSeUsa($connection, 'invoices', 'invoice_pdf', $pdfToDeleteInvoice, $pdfPath);
    }
    if ($pdfToDeleteProof) {
        eliminarArchivoSiNoSeUsa($connection, 'invoices', 'proof_pdf', $pdfToDeleteProof, $pdfPath);
    }
    // Recalcular amount_spent del subsidio afectado
     if (!empty($subsidy_id)) {
    updateSubsidyAggregates($connection, (int)$subsidy_id);
  }
  if (!empty($oldSubsidyId) && $oldSubsidyId != $subsidy_id) {
    updateSubsidyAggregates($connection, (int)$oldSubsidyId);
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
