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
     // Verifica si se ha enviado un archivo
     if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
      // Ruta para almacenar la imagen
      $ruta = "../src/assets/img/BOOKS/";
      // Mueve el archivo subido a la carpeta deseada
      move_uploaded_file($_FILES['img']['tmp_name'], $ruta . $_FILES['img']['name']);
      // Capturamos el nombre del archivo
      $imgName = $_FILES['img']['name'];
  } else {
      $imgName = ''; // En caso que no se suba una imagen
  }

  // Lee los datos del cuerpo en formato JSON
  $data = json_decode(file_get_contents('php://input'), true);

  // Aquí asignamos el nombre de la imagen en caso de que se haya subido
  $data['img'] = $imgName;

  // Preparar la declaración de inserción
  $stmt = $connection->prepare("INSERT INTO books (title, author, gender, year, description, img) VALUES (?, ?, ?, ?, ?, ?)");
  $stmt->bind_param("sssiss", $data['title'], $data['author'], $data['gender'], $data['year'], $data['description'], $data['img']);

  // Ejecutar la declaración
  if ($stmt->execute()) {
      echo json_encode(["message" => "Libro añadido con éxito."]);
  } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al añadir el libro: " . $stmt->error]);
  }
  break;

  case 'PATCH':

    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!is_numeric($id)) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
    }
    var_dump($id);
    var_dump($_POST);
    var_dump($_FILES);

    $title = isset($_POST['title']) ? $_POST['title'] : null;
    $author = isset($_POST['author']) ? $_POST['author'] : null;
    if (empty($title) || empty($author)) {
      http_response_code(400);
      echo json_encode(["message" => "Título y autor son requeridos."]);
      exit();
  }
    if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
        // Maneja la carga de imagen
        $imgName = $_FILES['img']['name'];
        $ruta = "assets/img/BOOKS/";
        move_uploaded_file($_FILES['img']['tmp_name'], $ruta . $imgName);
    }

    // Ahora podemos acceder a los otros campos del FormData
    $data = [];
    if (isset($_POST['title'])) $data['title'] = $_POST['title'];
    if (isset($_POST['author'])) $data['author'] = $_POST['author'];
    if (isset($_POST['gender'])) $data['gender'] = $_POST['gender'];
    if (isset($_POST['year'])) $data['year'] = $_POST['year'];
    if (isset($_POST['description'])) $data['description'] = $_POST['description'];
    $data['img'] = isset($imgName) ? $imgName : ''; // Asigna el nombre de la imagen

    // Preparar la declaración de actualización aquí
    // Por ejemplo:
    var_dump($data);
    if ($data) {
        $stmt = $connection->prepare("UPDATE books SET title = ?, author = ?, gender = ?, year = ?, description = ?, img = ? WHERE id = ?");
        $stmt->bind_param("sssiisi", $data['title'], $data['author'], $data['gender'], $data['year'], $data['description'], $data['img'], $id);
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
    break;

    case 'DELETE':
          // Extraer el ID de la URI
          $uriParts = explode('/', $_SERVER['REQUEST_URI']);
          $id = end($uriParts); // Tomar el último segmento como el ID
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
