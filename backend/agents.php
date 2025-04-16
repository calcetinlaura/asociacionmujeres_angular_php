<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$basePath = "../uploads/img/AGENTS/";

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

        $data = $_POST;
        $imgName = procesarImagen($basePath, 'img', $data);

        // Validación de campos obligatorios
        $campoFaltante = validarCamposRequeridos($data, ['name']);
        if ($campoFaltante !== null) {
            http_response_code(400);
            echo json_encode(["message" => "El campo '$campoFaltante' es obligatorio."]);
            exit();
        }

        $isUpdate = isset($data['_method']) && strtoupper($data['_method']) === 'PATCH';

        if ($isUpdate) {
            $id = $data['id'] ?? null;
            if (!is_numeric($id)) {
                http_response_code(400);
                echo json_encode(["message" => "ID no válido."]);
                exit();
            }

            // Obtener imagen anterior
            $stmtCurrent = $connection->prepare("SELECT img FROM agents WHERE id = ?");
            $stmtCurrent->bind_param("i", $id);
            $stmtCurrent->execute();
            $result = $stmtCurrent->get_result();
            $existing = $result->fetch_assoc();
            $oldImg = $existing['img'] ?? '';

            if ($imgName === '') {
                $imgName = $oldImg;
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
                if ($oldImg && $imgName !== $oldImg) {
                    eliminarImagenSiNoSeUsa($connection, 'agents', 'img', $oldImg, $basePath);
                }
                echo json_encode(["message" => "Agente actualizado con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar el agente: " . $stmt->error]);
            }

        } else {
            // CREATE
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

        // Recuperar imagen
        $stmtImg = $connection->prepare("SELECT img FROM agents WHERE id = ?");
        $stmtImg->bind_param("i", $id);
        $stmtImg->execute();
        $resultImg = $stmtImg->get_result();
        $imgToDelete = $resultImg->fetch_assoc()['img'] ?? '';

        $stmt = $connection->prepare("DELETE FROM agents WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($imgToDelete) {
                eliminarImagenSiNoSeUsa($connection, 'agents', 'img', $imgToDelete, $basePath);
            }
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
