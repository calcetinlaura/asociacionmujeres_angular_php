<?php
header("Access-Control-Allow-Origin: *"); // Permite todas las orígenes, puedes restringirlo a tu dominio específico si es necesario
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type"); // Cabeceras permitidas
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php'; // Incluye aquí la conexión a la base de datos

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

// Extraer la URI
$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts); // Obtener el último segmento como el recurso

switch ($method) {
  case 'GET':
    if (is_numeric($resource)) {
        // Obtener libro por ID
        $stmt = $connection->prepare("SELECT * FROM movies WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $movie = $result->fetch_assoc();
        echo json_encode($movie ? $movie : []);
    } elseif (isset($_GET['latest'])) {
        // Obtener el año más reciente
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM movies");
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $latestYear = $data['latestYear'];

        if ($latestYear) {
            // Obtener libros filtrando por el último año
            $stmt = $connection->prepare("SELECT * FROM movies WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
            $result = $stmt->get_result();
            $movies = [];
            while ($row = $result->fetch_assoc()) {
                $movies[] = $row;
            }
            echo json_encode($movies);
        } else {
            echo json_encode([]);
        }
    } elseif (isset($_GET['year'])) {
        // Obtener libros filtrando por año
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM movies WHERE year = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    } elseif (isset($_GET['gender'])) {
        // Obtener libros filtrando por género
        $gender = $_GET['gender'];
        $stmt = $connection->prepare("SELECT * FROM movies WHERE gender = ?");
        $stmt->bind_param("s", $gender);
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    } else {
        // Obtener todos los libros
        $stmt = $connection->prepare("SELECT * FROM movies");
        $stmt->execute();
        $result = $stmt->get_result();
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    }
    break;

    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      // Procesar la imagen
      if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
        $ruta = "../uploads/img/MOVIES/";
        move_uploaded_file($_FILES['img']['tmp_name'], $ruta . $_FILES['img']['name']);
        $imgName = $_FILES['img']['name'];
      } else {
        $imgName = '';
      }

      // Leer los datos del formulario
      $data = $_POST;
      $data['img'] = $imgName;

      // Verificar si se indica que se trata de una actualización (override a PATCH)
      if (isset($data['_method']) && strtoupper($data['_method']) == 'PATCH') {
          // Obtener el ID enviado en el formulario
          $id = isset($data['id']) ? $data['id'] : null;
          if (!is_numeric($id)) {
              http_response_code(400);
              echo json_encode(["message" => "ID no válido."]);
              exit();
          }

          // Recuperar datos
          $title = isset($data['title']) ? $data['title'] : null;
          $director = isset($data['director']) ? $data['director'] : null;
          $gender = isset($data['gender']) ? $data['gender'] : null;
          $year = isset($data['year']) ? $data['year'] : null;
          $description = isset($data['description']) ? $data['description'] : '';
// Si no se envió una nueva imagen, recuperar la actual de la base de datos
if ($imgName == '') {
  $stmtCurrent = $connection->prepare("SELECT img FROM movies WHERE id = ?");
  $stmtCurrent->bind_param("i", $id);
  $stmtCurrent->execute();
  $result = $stmtCurrent->get_result();
  $currentBook = $result->fetch_assoc();
  $imgName = $currentBook['img'];
}
          // Validar que se hayan recibido los datos obligatorios
          if ($title && $gender && $year !== null) {
               $stmt = $connection->prepare("UPDATE movies SET title = ?, director = ?, gender = ?, year = ?, description = ?, img = ? WHERE id = ?");
               if (!$stmt) {
                   http_response_code(500);
                   echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
                   exit();
               }

               // Convertir el año a número
               $year = (int)$year;

               $stmt->bind_param("sssissi", $title, $director, $gender, $year, $description, $imgName, $id);
               if ($stmt->execute()) {
                   echo json_encode(["message" => "Película actualizado con éxito."]);
               } else {
                   http_response_code(500);
                   echo json_encode(["message" => "Error al actualizar el libro: " . $stmt->error]);
               }
          } else {
               http_response_code(400);
               echo json_encode(["message" => "Datos incompletos para actualizar el libro."]);
          }
      } else {
          // Si no es una actualización, se inserta una nueva película
          $stmt = $connection->prepare("INSERT INTO movies (title, director, gender, year, description, img) VALUES (?, ?, ?, ?, ?, ?)");
          $stmt->bind_param("sssiss", $data['title'], $data['director'], $data['gender'], $data['year'], $data['description'], $data['img']);

          if ($stmt->execute()) {
            echo json_encode(["message" => "Película añadida con exito."]);
          } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al añadir la película: " . $stmt->error]);
          }
      }
      break;

    case 'DELETE':
          // Extraer el ID de la URI
          $id = isset($_GET['id']) ? $_GET['id'] : null;
          if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(["message" => "ID no válido."]);
            exit();
        }
          $stmt = $connection->prepare("DELETE FROM movies WHERE id = ?");
          $stmt->bind_param("i", $id);
          if ($stmt->execute()) {
              echo json_encode(["message" => "Película eliminada con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al eliminar el libro: " . $stmt->error]);
          }
          break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;

}

?>
