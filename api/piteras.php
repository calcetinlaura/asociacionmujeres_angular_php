<?php
header("Access-Control-Allow-Origin: *"); // Permite todas las orígenes, puedes restringirlo a tu dominio específico si es necesario
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type"); // Cabeceras permitidas
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php'; // Incluye aquí la conexión a la base de datos

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
      if (isset($_GET['latest'])) {
        // Obtener el año más reciente
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM piteras");
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $latestYear = $data['latestYear']; // Este es el año más reciente

        if ($latestYear) {
            // Obtener libros filtrando por el último año
            $stmt->prepare("SELECT * FROM piteras WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
        } else {
            echo json_encode([]);
            exit();
        }
      } elseif (isset($_GET['year'])) {
            // Obtener libros filtrando por año
            $year = $_GET['year'];

            // Preparar la declaración
            $stmt = $connection->prepare("SELECT * FROM piteras WHERE year = ?");
            $stmt->bind_param("i", $year); // "i" indica que es un entero
            $stmt->execute();
        } elseif (isset($_GET['gender'])) {
            // Obtener libros filtrando por género
            $gender = $_GET['gender'];

            // Preparar la declaración
            $stmt = $connection->prepare("SELECT * FROM piteras WHERE gender = ?");
            $stmt->bind_param("s", $gender); // "s" indica que es una cadena
            $stmt->execute();
        } else {
            // Obtener todos los libros
            $stmt = $connection->prepare("SELECT * FROM piteras");
            $stmt->execute();
        }

        // Obtener los resultados
        $result = $stmt->get_result();
        $piteras = [];

        // Acumular resultados en un array
        while ($row = $result->fetch_assoc()) {
            $piteras[] = $row;
        }

        // Devolver los resultados en formato JSON
        echo json_encode($piteras);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $connection->prepare("INSERT INTO piteras (title, author, gender, year) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $data['title'], $data['author'], $data['gender'], $data['year']);
        $stmt->execute();
        echo json_encode(["message" => "Libro añadido con éxito."]);
        break;

    case 'PATCH':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'];
        $stmt = $connection->prepare("UPDATE piteras SET title = ?, author = ?, gender = ?, year = ? WHERE id = ?");
        $stmt->bind_param("sssii", $data['title'], $data['author'], $data['gender'], $data['year'], $id);
        $stmt->execute();
        echo json_encode(["message" => "Libro actualizado con éxito."]);
        break;

    case 'DELETE':
        $id = $_GET['id'];
        $stmt = $connection->prepare("DELETE FROM piteras WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        echo json_encode(["message" => "Libro eliminado con éxito."]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;
}
?>
