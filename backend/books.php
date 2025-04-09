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
        $stmt = $connection->prepare("SELECT * FROM books WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $book = $result->fetch_assoc();
        echo json_encode($book ? $book : []);
    } elseif (isset($_GET['latest'])) {
        // Obtener el año más reciente
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM books");
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $latestYear = $data['latestYear'];

        if ($latestYear) {
            // Obtener libros filtrando por el último año
            $stmt = $connection->prepare("SELECT * FROM books WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
            $result = $stmt->get_result();
            $books = [];
            while ($row = $result->fetch_assoc()) {
                $books[] = $row;
            }
            echo json_encode($books);
        } else {
            echo json_encode([]);
        }
    } elseif (isset($_GET['year'])) {
        // Obtener libros filtrando por año
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM books WHERE year = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $books = [];
        while ($row = $result->fetch_assoc()) {
            $books[] = $row;
        }
        echo json_encode($books);
    } elseif (isset($_GET['gender'])) {
        // Obtener libros filtrando por género
        $gender = $_GET['gender'];
        $stmt = $connection->prepare("SELECT * FROM books WHERE gender = ?");
        $stmt->bind_param("s", $gender);
        $stmt->execute();
        $result = $stmt->get_result();
        $books = [];
        while ($row = $result->fetch_assoc()) {
            $books[] = $row;
        }
        echo json_encode($books);
    } else {
        // Obtener todos los libros
        $stmt = $connection->prepare("SELECT * FROM books");
        $stmt->execute();
        $result = $stmt->get_result();
        $books = [];
        while ($row = $result->fetch_assoc()) {
            $books[] = $row;
        }
        echo json_encode($books);
    }
    break;

    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      // Procesar la imagen
      if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
        $ruta = "../uploads/img/BOOKS/";
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
          $author = isset($data['author']) ? $data['author'] : null;
          $gender = isset($data['gender']) ? $data['gender'] : null;
          $year = isset($data['year']) ? $data['year'] : null;
          $description = isset($data['description']) ? $data['description'] : '';
// Si no se envió una nueva imagen, recuperar la actual de la base de datos
if ($imgName == '') {
  $stmtCurrent = $connection->prepare("SELECT img FROM books WHERE id = ?");
  $stmtCurrent->bind_param("i", $id);
  $stmtCurrent->execute();
  $result = $stmtCurrent->get_result();
  $currentBook = $result->fetch_assoc();
  $imgName = $currentBook['img'];
}
          // Validar que se hayan recibido los datos obligatorios
          if ($title && $gender && $year !== null) {
               $stmt = $connection->prepare("UPDATE books SET title = ?, author = ?, gender = ?, year = ?, description = ?, img = ? WHERE id = ?");
               if (!$stmt) {
                   http_response_code(500);
                   echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
                   exit();
               }

               // Convertir el año a número
               $year = (int)$year;

               $stmt->bind_param("sssissi", $title, $author, $gender, $year, $description, $imgName, $id);
               if ($stmt->execute()) {
                   echo json_encode(["message" => "Libro actualizado con éxito."]);
               } else {
                   http_response_code(500);
                   echo json_encode(["message" => "Error al actualizar el libro: " . $stmt->error]);
               }
          } else {
               http_response_code(400);
               echo json_encode(["message" => "Datos incompletos para actualizar el libro."]);
          }
      } else {
          $stmt = $connection->prepare("INSERT INTO books (title, author, gender, year, description, img) VALUES (?, ?, ?, ?, ?, ?)");
          $stmt->bind_param("sssiss", $data['title'], $data['author'], $data['gender'], $data['year'], $data['description'], $data['img']);

          if ($stmt->execute()) {
            echo json_encode(["message" => "Libro añadido con éxito."]);
          } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al añadir el libro: " . $stmt->error]);
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
          $stmt = $connection->prepare("DELETE FROM books WHERE id = ?");
          $stmt->bind_param("i", $id);
          if ($stmt->execute()) {
              echo json_encode(["message" => "Libro eliminado con éxito."]);
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
