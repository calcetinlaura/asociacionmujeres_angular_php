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
            $stmt = $connection->prepare("SELECT * FROM agents WHERE id = ?");
            $stmt->bind_param("i", $_GET['id']);
            $stmt->execute();
            $result = $stmt->get_result();
            $agent = $result->fetch_assoc();
            echo json_encode($agent ?: []);
        } else {
            $stmt = $connection->prepare("SELECT * FROM agents");
            $stmt->execute();
            $result = $stmt->get_result();
            $agents = [];
            while ($row = $result->fetch_assoc()) {
                $agents[] = $row;
            }
            echo json_encode($agents);
        }
        break;

    case 'POST':
        error_reporting(E_ALL);
        ini_set('display_errors', 1);

        $imgName = '';
        if (isset($_FILES['img']) && $_FILES['img']['error'] === 0) {
            $uploadDir = "../uploads/img/AGENTS/";
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $imgName = time() . '_' . basename($_FILES['img']['name']);
            move_uploaded_file($_FILES['img']['tmp_name'], $uploadDir . $imgName);
        }

        $data = $_POST;
        $data['img'] = $imgName;

        if (isset($data['_method']) && strtoupper($data['_method']) === 'PATCH') {
            // PATCH
            $id = $data['id'] ?? null;
            if (!is_numeric($id)) {
                http_response_code(400);
                echo json_encode(["message" => "ID no válido."]);
                exit();
            }

            if ($imgName === '') {
                // Recuperar imagen actual si no se envió una nueva
                $stmt = $connection->prepare("SELECT img FROM agents WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                $existing = $result->fetch_assoc();
                $imgName = $existing['img'];
            }

            $stmt = $connection->prepare("UPDATE agents SET
                name = ?, contact = ?, phone = ?, email = ?, province = ?, town = ?,
                address = ?, post_code = ?, category = ?, observations = ?, img = ?
                WHERE id = ?");

            $stmt->bind_param("sssssssssssi",
                $data['name'], $data['contact'], $data['phone'], $data['email'],
                $data['province'], $data['town'], $data['address'], $data['post_code'],
                $data['category'], $data['observations'], $imgName, $id
            );

            if ($stmt->execute()) {
                echo json_encode(["message" => "Agente actualizado con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar el agente: " . $stmt->error]);
            }

        } else {
            // CREATE
            if (empty($data['name'])) {
                http_response_code(400);
                echo json_encode(["message" => "El nombre del agente es obligatorio."]);
                exit();
            }

            $stmt = $connection->prepare("INSERT INTO agents
                (name, contact, phone, email, province, town, address, post_code, category, observations, img)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->bind_param("sssssssssss",
                $data['name'], $data['contact'], $data['phone'], $data['email'],
                $data['province'], $data['town'], $data['address'], $data['post_code'],
                $data['category'], $data['observations'], $imgName
            );

            if ($stmt->execute()) {
                echo json_encode(["message" => "Agente creado con éxito.", "id" => $stmt->insert_id]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al crear el agente: " . $stmt->error]);
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

        $stmt = $connection->prepare("DELETE FROM agents WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Agente eliminado con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar el agente: " . $stmt->error]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
?>
