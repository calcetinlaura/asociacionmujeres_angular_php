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
        $stmt = $connection->prepare("SELECT * FROM subsidies WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $subsidy = $result->fetch_assoc();
        echo json_encode($subsidy ? $subsidy : []);
    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
      // Filtrar subvenciones por año
      $year = $_GET['year'];
      $stmt = $connection->prepare("SELECT * FROM subsidies WHERE YEAR(year) = ?");
      $stmt->bind_param("i", $year);
      $stmt->execute();
      $result = $stmt->get_result();
      $Invoices = [];
      while ($row = $result->fetch_assoc()) {
          $Invoices[] = $row;
      }
      echo json_encode($Invoices);
    }else {
        $stmt = $connection->prepare("SELECT * FROM subsidies");
        $stmt->execute();
        $result = $stmt->get_result();
        $subsidies = [];
        while ($row = $result->fetch_assoc()) {
            $subsidies[] = $row;
        }
        echo json_encode($subsidies);
    }
    break;

  case 'POST':
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    $data = $_POST;

    if (empty($data)) {
      $json = file_get_contents('php://input');
      $data = json_decode($json, true);
    }

    $name = $data['name'] ?? null;
    $year = isset($data['year']) ? (int)$data['year'] : null;
    $date_presentation = $data['date_presentation'] ?? null;
    $date_justification = $data['date_justification'] ?? null;
    $period_start = $data['period_start'] ?? null;
    $period_end = $data['period_end'] ?? null;
    $activities = $data['activities'] ?? null;
    $invoices = $data['invoices'] ?? null;
    $url_presentation = $data['url_presentation'] ?? null;
    $url_justification = $data['url_justification'] ?? null;
    $amount_requested = isset($data['amount_requested']) ? (float)$data['amount_requested'] : 0;
    $amount_granted = isset($data['amount_granted']) ? (float)$data['amount_granted'] : null;
    $amount_justified = isset($data['amount_justified']) ? (float)$data['amount_justified'] : null;
    $amount_association = isset($data['amount_association']) ? (float)$data['amount_association'] : null;
    $observations = $data['observations'] ?? null;

    // PATCH (update)
    if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
      $id = $data['id'] ?? null;
      if (!is_numeric($id)) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
      }

      $stmt = $connection->prepare("UPDATE subsidies SET
        name = ?, year = ?, date_presentation = ?, date_justification = ?, period_start = ?,
        period_end = ?, activities = ?, invoices = ?, url_presentation = ?, url_justification = ?,
        amount_requested = ?, amount_granted = ?, amount_justified = ?, amount_association = ?, observations = ?
        WHERE id = ?");

      $stmt->bind_param(
        "sissssssssddddsi",
        $name,
        $year,
        $date_presentation,
        $date_justification,
        $period_start,
        $period_end,
        $activities,
        $invoices,
        $url_presentation,
        $url_justification,
        $amount_requested,
        $amount_granted,
        $amount_justified,
        $amount_association,
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
      // POST (create)
      $stmt = $connection->prepare("INSERT INTO subsidies
        (name, year, date_presentation, date_justification, period_start, period_end, activities, invoices, url_presentation, url_justification,
         amount_requested, amount_granted, amount_justified, amount_association, observations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

      $stmt->bind_param(
        "sissssssssdddds",
        $name,
        $year,
        $date_presentation,
        $date_justification,
        $period_start,
        $period_end,
        $activities,
        $invoices,
        $url_presentation,
        $url_justification,
        $amount_requested,
        $amount_granted,
        $amount_justified,
        $amount_association,
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
    $id = $_GET['id'] ?? null;
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
