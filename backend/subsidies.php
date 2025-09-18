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


switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
      // Obtener una subvención por ID con invoices y projects
      $stmt = $connection->prepare("SELECT * FROM subsidies WHERE id = ?");
      $stmt->bind_param("i", $resource);
      $stmt->execute();
      $result = $stmt->get_result();
      $subsidy = $result->fetch_assoc();

      if ($subsidy) {
        $id = $subsidy['id'];

        // Invoices
        $stmtInvoices = $connection->prepare("
          SELECT invoices.*, creditors.cif AS creditor_cif, creditors.company AS creditor_company, creditors.contact AS creditor_contact, projects.title AS project_title
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          LEFT JOIN projects ON invoices.project_id = projects.id
          WHERE invoices.subsidy_id = ?
          ORDER BY invoices.date_invoice ASC
        ");
        $stmtInvoices->bind_param("i", $id);
        $stmtInvoices->execute();
        $subsidy['invoices'] = $stmtInvoices->get_result()->fetch_all(MYSQLI_ASSOC);

        // Projects + Activities
        $stmtProjects = $connection->prepare("SELECT * FROM projects WHERE subsidy_id = ?");
        $stmtProjects->bind_param("i", $id);
        $stmtProjects->execute();
        $projectsResult = $stmtProjects->get_result()->fetch_all(MYSQLI_ASSOC);

        $projectIds = array_column($projectsResult, 'id');
        $projectsById = [];
        foreach ($projectsResult as $p) {
          $projectsById[$p['id']] = $p;
          $projectsById[$p['id']]['activities'] = [];
        }

        if (!empty($projectIds)) {
          $ph = implode(',', array_fill(0, count($projectIds), '?'));
          $types = str_repeat('i', count($projectIds));
          $stmtActivities = $connection->prepare("SELECT * FROM activities WHERE project_id IN ($ph)");
          $stmtActivities->bind_param($types, ...$projectIds);
          $stmtActivities->execute();
          $activities = $stmtActivities->get_result()->fetch_all(MYSQLI_ASSOC);

          foreach ($activities as $activity) {
            $projectsById[$activity['project_id']]['activities'][] = $activity;
          }
        }

        $subsidy['projects'] = array_values($projectsById);
      }

      echo json_encode($subsidy ?: []);
      exit;

    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      $year = $_GET['year'];

      $stmt = $connection->prepare("SELECT * FROM subsidies WHERE year = ?");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $subsidies = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

      $subsidyIds = array_column($subsidies, 'id');
      $subsidiesById = [];
      foreach ($subsidies as $sub) {
        $subsidiesById[$sub['id']] = $sub;
        $subsidiesById[$sub['id']]['invoices'] = [];
        $subsidiesById[$sub['id']]['projects'] = [];
      }

      if (!empty($subsidyIds)) {
        $placeholders = implode(',', array_fill(0, count($subsidyIds), '?'));
        $types = str_repeat('i', count($subsidyIds));

        // Invoices
        $stmtInvoices = $connection->prepare("
          SELECT invoices.*, creditors.cif AS creditor_cif, creditors.company AS creditor_company, creditors.contact AS creditor_contact, projects.title AS project_title
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          LEFT JOIN projects ON invoices.project_id = projects.id
          WHERE invoices.subsidy_id IN ($placeholders)
          ORDER BY invoices.date_invoice ASC
        ");
        $stmtInvoices->bind_param($types, ...$subsidyIds);
        $stmtInvoices->execute();
        $invoices = $stmtInvoices->get_result()->fetch_all(MYSQLI_ASSOC);

        foreach ($invoices as $invoice) {
          $subsidiesById[$invoice['subsidy_id']]['invoices'][] = $invoice;
        }

        // Projects
        $stmtProjects = $connection->prepare("SELECT * FROM projects WHERE subsidy_id IN ($placeholders)");
        $stmtProjects->bind_param($types, ...$subsidyIds);
        $stmtProjects->execute();
        $projects = $stmtProjects->get_result()->fetch_all(MYSQLI_ASSOC);

        $projectIds = array_column($projects, 'id');
        $projectsById = [];
        foreach ($projects as $proj) {
          $projectsById[$proj['id']] = $proj;
          $projectsById[$proj['id']]['activities'] = [];
          $subsidiesById[$proj['subsidy_id']]['projects'][] = &$projectsById[$proj['id']];
        }

        // Activities
        if (!empty($projectIds)) {
          $ph = implode(',', array_fill(0, count($projectIds), '?'));
          $t = str_repeat('i', count($projectIds));
          $stmtActivities = $connection->prepare("SELECT * FROM activities WHERE project_id IN ($ph)");
          $stmtActivities->bind_param($t, ...$projectIds);
          $stmtActivities->execute();
          $activities = $stmtActivities->get_result()->fetch_all(MYSQLI_ASSOC);

          foreach ($activities as $act) {
            $projectsById[$act['project_id']]['activities'][] = $act;
          }
        }
      }

      echo json_encode(array_values($subsidiesById));
      exit;

    } else {
      $stmt = $connection->prepare("SELECT * FROM subsidies");
      $stmt->execute();
      $subsidies = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

      $subsidyIds = array_column($subsidies, 'id');
      $subsidiesById = [];
      foreach ($subsidies as $sub) {
        $subsidiesById[$sub['id']] = $sub;
        $subsidiesById[$sub['id']]['invoices'] = [];
        $subsidiesById[$sub['id']]['projects'] = [];
      }

      if (!empty($subsidyIds)) {
        $placeholders = implode(',', array_fill(0, count($subsidyIds), '?'));
        $types = str_repeat('i', count($subsidyIds));

        $stmtInvoices = $connection->prepare("
          SELECT invoices.*, creditors.cif AS creditor_cif, creditors.company AS creditor_company, creditors.contact AS creditor_contact, projects.title AS project_title
          FROM invoices
          LEFT JOIN creditors ON invoices.creditor_id = creditors.id
          LEFT JOIN projects ON invoices.project_id = projects.id
          WHERE invoices.subsidy_id IN ($placeholders)
          ORDER BY invoices.date_invoice ASC
        ");
        $stmtInvoices->bind_param($types, ...$subsidyIds);
        $stmtInvoices->execute();
        $invoices = $stmtInvoices->get_result()->fetch_all(MYSQLI_ASSOC);

        foreach ($invoices as $invoice) {
          $subsidiesById[$invoice['subsidy_id']]['invoices'][] = $invoice;
        }

        $stmtProjects = $connection->prepare("SELECT * FROM projects WHERE subsidy_id IN ($placeholders)");
        $stmtProjects->bind_param($types, ...$subsidyIds);
        $stmtProjects->execute();
        $projects = $stmtProjects->get_result()->fetch_all(MYSQLI_ASSOC);

        $projectIds = array_column($projects, 'id');
        $projectsById = [];
        foreach ($projects as $proj) {
          $projectsById[$proj['id']] = $proj;
          $projectsById[$proj['id']]['activities'] = [];
          $subsidiesById[$proj['subsidy_id']]['projects'][] = &$projectsById[$proj['id']];
        }

        if (!empty($projectIds)) {
          $ph = implode(',', array_fill(0, count($projectIds), '?'));
          $t = str_repeat('i', count($projectIds));
          $stmtActivities = $connection->prepare("SELECT * FROM activities WHERE project_id IN ($ph)");
          $stmtActivities->bind_param($t, ...$projectIds);
          $stmtActivities->execute();
          $activities = $stmtActivities->get_result()->fetch_all(MYSQLI_ASSOC);

          foreach ($activities as $act) {
            $projectsById[$act['project_id']]['activities'][] = $act;
          }
        }
      }

      echo json_encode(array_values($subsidiesById));
      exit;
    }
 case 'POST':
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  // 1) Leer datos: primero FormData ($_POST); si viene vacío, intenta JSON (php://input)
  $data = $_POST;
  if (empty($data)) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true) ?? [];
  }

  // 2) Mapear campos (opcionales permiten null)
  $name               = $data['name'] ?? null;
  $year               = isset($data['year']) ? (int)$data['year'] : null;
 $date_presentation  = normDate($data['date_presentation'] ?? null);
$date_justification = normDate($data['date_justification'] ?? null);
$start              = normDate($data['start'] ?? null);
$end                = normDate($data['end'] ?? null);
  $url_presentation   = $data['url_presentation'] ?? null;
  $url_justification  = $data['url_justification'] ?? null;
$amount_requested   = normNumber($data['amount_requested'] ?? null);
$amount_granted     = normNumber($data['amount_granted']   ?? null);
$amount_justified   = normNumber($data['amount_justified'] ?? null);
  $observations       = $data['observations'] ?? null;

  // 3) Detección de UPDATE por override de método
  $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

  if ($isUpdate) {
    // ---- UPDATE ----
    $id = isset($data['id']) ? (int)$data['id'] : 0;
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(["message" => "ID no válido."]);
      exit();
    }

    // Recalcular importes dependientes de facturas
    $amount_spent       = calcAmountSpent($connection, $id);
    $amount_spent_irpf  = calcAmountSpentIrpf($connection, $id);
    $amount_association = ($amount_spent !== null && $amount_granted !== null)
  ? ($amount_spent - $amount_granted)
  : null;

$amount_association_irpf = ($amount_spent_irpf !== null && $amount_granted !== null)
  ? ($amount_spent_irpf - $amount_granted)
  : null;

    $stmt = $connection->prepare("UPDATE subsidies SET
      name = ?, year = ?, date_presentation = ?, date_justification = ?, start = ?,
      end = ?, url_presentation = ?, url_justification = ?,
      amount_requested = ?, amount_granted = ?, amount_justified = ?, amount_spent = ?, amount_spent_irpf = ?, amount_association = ?, amount_association_irpf = ?, observations = ?
      WHERE id = ?");

    $stmt->bind_param(
      "sissssssdddddddsi",
      $name,
      $year,
      $date_presentation,
      $date_justification,
      $start,
      $end,
      $url_presentation,
      $url_justification,
      $amount_requested,
      $amount_granted,
      $amount_justified,
      $amount_spent,
      $amount_spent_irpf,
      $amount_association,
      $amount_association_irpf,
      $observations,
      $id
    );

    if ($stmt->execute()) {
      echo json_encode(["message" => "Subvención actualizada con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al actualizar la subvención: " . $stmt->error]);
    }

  } else {
    // ---- INSERT ----
    $amount_spent       = 0.0;
    $amount_spent_irpf  = 0.0;
    $amount_association = $amount_spent - (float)($amount_granted ?? 0.0);
    $amount_association_irpf = $amount_spent_irpf - (float)($amount_granted ?? 0.0);

    $stmt = $connection->prepare("INSERT INTO subsidies
      (name, year, date_presentation, date_justification, start, end, url_presentation, url_justification,
       amount_requested, amount_granted, amount_justified, amount_spent, amount_spent_irpf, amount_association, amount_association_irpf, observations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->bind_param(
      "sissssssddddddds",
      $name,
      $year,
      $date_presentation,
      $date_justification,
      $start,
      $end,
      $url_presentation,
      $url_justification,
      $amount_requested,
      $amount_granted,
      $amount_justified,
      $amount_spent,
      $amount_spent_irpf,
      $amount_association,
      $amount_association_irpf,
      $observations
    );

    if ($stmt->execute()) {
      echo json_encode(["message" => "Subvención añadida con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al añadir la subvención: " . $stmt->error]);
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

    $stmt = $connection->prepare("DELETE FROM subsidies WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
      echo json_encode(["message" => "Subvención eliminada con éxito."]);
    } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al eliminar la subvención: " . $stmt->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["message" => "Método no permitido"]);
    break;
}
?>
