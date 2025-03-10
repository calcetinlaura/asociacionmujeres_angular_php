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
            $stmt = $connection->prepare("SELECT * FROM piteras WHERE id = ?");
            $stmt->bind_param("i", $resource);
            $stmt->execute();
            $result = $stmt->get_result();
            $pitera = $result->fetch_assoc();
            echo json_encode($pitera ? $pitera : []);
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

        // Procesar imagen si se sube
        $imgName = '';
        if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
            $imgPath = "../uploads/img/PITERAS/";
            move_uploaded_file($_FILES['img']['tmp_name'], $imgPath . $_FILES['img']['name']);
            $imgName = $_FILES['img']['name'];
        }

        // Procesar archivo PDF si se sube
        $pdfName = '';
        if (isset($_FILES['url']) && $_FILES['url']['error'] == 0) {
            $pdfPath = "../uploads/pdf/PITERAS/";
            move_uploaded_file($_FILES['url']['tmp_name'], $pdfPath . $_FILES['url']['name']);
            $pdfName = $_FILES['url']['name'];
        }

        $data = $_POST;
        $data['img'] = $imgName;
        $data['url'] = $pdfName; // Guardamos el PDF

        // Verificar si es una actualización
        if (isset($data['_method']) && strtoupper($data['_method']) == 'PATCH') {
            $id = isset($data['id']) ? $data['id'] : null;
            if (!is_numeric($id)) {
                http_response_code(400);
                echo json_encode(["message" => "ID no válido."]);
                exit();
            }

            // Recuperar datos actuales si no se sube un nuevo archivo
            $stmtCurrent = $connection->prepare("SELECT img, url FROM piteras WHERE id = ?");
            $stmtCurrent->bind_param("i", $id);
            $stmtCurrent->execute();
            $result = $stmtCurrent->get_result();
            $currentData = $result->fetch_assoc();
            if (!$imgName) $imgName = $currentData['img'];
            if (!$pdfName) $pdfName = $currentData['url'];

            // Actualizar Pitera
            $stmt = $connection->prepare("UPDATE piteras SET title = ?, theme = ?, url = ?, year = ?, img = ? WHERE id = ?");
            $stmt->bind_param("sssisi", $data['title'], $data['theme'], $pdfName, $data['year'], $imgName, $id);
            if ($stmt->execute()) {
                echo json_encode(["message" => "Pitera actualizada con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar la pitera: " . $stmt->error]);
            }
        } else {
            // Insertar nueva Pitera
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
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(["message" => "ID no válido."]);
            exit();
        }

        $stmt = $connection->prepare("DELETE FROM piteras WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
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
?>

