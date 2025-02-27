<?php
header("Access-Control-Allow-Origin: *"); // Permite todas las orígenes, puedes restringirlo a tu dominio específico si es necesario
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type"); // Cabeceras permitidas
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
      if (isset($_GET['year'])) {
            // Obtener eventos filtrando por año
            $year = $_GET['year'];

            // Preparar la declaración
            $stmt = $connection->prepare("SELECT * FROM events WHERE YEAR(start) = ?");
            $stmt->bind_param("i", $year); // "i" indica que es un entero
            $stmt->execute();
        } elseif (isset($_GET['gender'])) {
            // Obtener eventos filtrando por género
            $gender = $_GET['gender'];

            // Preparar la declaración
            $stmt = $connection->prepare("SELECT * FROM events WHERE gender = ?");
            $stmt->bind_param("s", $gender); // "s" indica que es una cadena
            $stmt->execute();
        } else {
            // Obtener todos los eventos
            $stmt = $connection->prepare("SELECT * FROM events");
            $stmt->execute();
        }

        // Obtener los resultados
        $result = $stmt->get_result();
        $events = [];

        // Acumular resultados en un array
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }

        // Devolver los resultados en formato JSON
        echo json_encode($events);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $connection->prepare("INSERT INTO events (title, author, gender, year) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $data['title'], $data['author'], $data['gender'], $data['year']);
        $stmt->execute();
        echo json_encode(["message" => "Evento añadido con éxito."]);
        break;

    case 'PATCH':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'];
        $stmt = $connection->prepare("UPDATE events SET title = ?, author = ?, gender = ?, year = ? WHERE id = ?");
        $stmt->bind_param("sssii", $data['title'], $data['author'], $data['gender'], $data['year'], $id);
        $stmt->execute();
        echo json_encode(["message" => "Evento actualizado con éxito."]);
        break;

    case 'DELETE':
        $id = $_GET['id'];
        $stmt = $connection->prepare("DELETE FROM events WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        echo json_encode(["message" => "Evento eliminado con éxito."]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
?>
