<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php'; // Funciones reutilizables

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);

$imgPath = "../uploads/img/PITERAS/";
$pdfPath = "../uploads/pdf/PITERAS/";

switch ($method) {
    case 'GET':
        if (is_numeric($resource)) {
            $stmt = $connection->prepare("SELECT * FROM piteras WHERE id = ?");
            $stmt->bind_param("i", $resource);
            $stmt->execute();
            $result = $stmt->get_result();
            $pitera = $result->fetch_assoc();
            echo json_encode($pitera ?: []);
        } else {
            $stmt = $connection->prepare("SELECT * FROM piteras");
            $stmt->execute();
            $result = $stmt->get_result();
            $piteras = [];
            while ($row = $result->fetch_assoc()) {
                $piteras[] = $row;
            }
            echo json_encode($piteras);
        }
        break;

    case 'POST':
        error_reporting(E_ALL);
        ini_set('display_errors', 1);
// 🔥 Manejar eliminación de imagen si viene la acción
if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
  $type = $_POST['type'];

  if (!empty($_POST['id'])) {
    $id = (int)$_POST['id'];

    if (eliminarSoloImagen($connection, strtolower($type), 'img', $id, $basePath)) {
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
        // Procesar imagen
        $imgName = '';
        if (isset($_FILES['img']) && $_FILES['img']['error'] === 0) {
            move_uploaded_file($_FILES['img']['tmp_name'], $imgPath . $_FILES['img']['name']);
            $imgName = $_FILES['img']['name'];
        }

        // Procesar PDF
        $pdfName = '';
        if (isset($_FILES['url']) && $_FILES['url']['error'] === 0) {
            move_uploaded_file($_FILES['url']['tmp_name'], $pdfPath . $_FILES['url']['name']);
            $pdfName = $_FILES['url']['name'];
        }

        $data = $_POST;
        $data['img'] = $imgName;
        $data['url'] = $pdfName;

        // Validar campos obligatorios
        $campoFaltante = validarCamposRequeridos($data, ['title', 'year']);
        if ($campoFaltante) {
            http_response_code(400);
            echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
            exit();
        }

        $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

        if ($isUpdate) {
            $id = isset($data['id']) ? (int)$data['id'] : null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["message" => "ID no válido."]);
                exit();
            }

            $stmtCurrent = $connection->prepare("SELECT img, url FROM piteras WHERE id = ?");
            $stmtCurrent->bind_param("i", $id);
            $stmtCurrent->execute();
            $result = $stmtCurrent->get_result();
            $currentData = $result->fetch_assoc();
            $oldImg = $currentData['img'] ?? '';
            $oldPdf = $currentData['url'] ?? '';

            if (!$imgName) $imgName = $oldImg;
            if (!$pdfName) $pdfName = $oldPdf;

            $stmt = $connection->prepare("UPDATE piteras SET title = ?, theme = ?, url = ?, year = ?, img = ? WHERE id = ?");
            $stmt->bind_param("sssisi", $data['title'], $data['theme'], $pdfName, $data['year'], $imgName, $id);
            if ($stmt->execute()) {
                if ($oldImg && $imgName !== $oldImg) {
                    eliminarImagenSiNoSeUsa($connection, 'piteras', 'img', $oldImg, $imgPath);
                }
                if ($oldPdf && $pdfName !== $oldPdf) {
                    eliminarImagenSiNoSeUsa($connection, 'piteras', 'url', $oldPdf, $pdfPath);
                }
                echo json_encode(["message" => "Pitera actualizada con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar la pitera: " . $stmt->error]);
            }
        } else {
            $stmt = $connection->prepare("INSERT INTO piteras (title, theme, url, year, img) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssis", $data['title'], $data['theme'], $pdfName, $data['year'], $imgName);
            if ($stmt->execute()) {
                echo json_encode(["message" => "Pitera añadida con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al añadir la pitera: " . $stmt->error]);
            }
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "ID no válido."]);
            exit();
        }

        $stmt = $connection->prepare("SELECT img, url FROM piteras WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $data = $res->fetch_assoc();
        $imgToDelete = $data['img'] ?? '';
        $pdfToDelete = $data['url'] ?? '';

        $stmt = $connection->prepare("DELETE FROM piteras WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            if ($imgToDelete) {
                eliminarImagenSiNoSeUsa($connection, 'piteras', 'img', $imgToDelete, $imgPath);
            }
            if ($pdfToDelete) {
                eliminarImagenSiNoSeUsa($connection, 'piteras', 'url', $pdfToDelete, $pdfPath);
            }
            echo json_encode(["message" => "Pitera eliminada con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar la pitera: " . $stmt->error]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
