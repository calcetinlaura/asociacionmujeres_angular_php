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
    // Obtener el ID de los parámetros de consulta
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!is_numeric($id)) {
        http_response_code(400);
        echo json_encode(["message" => "ID no válido."]);
        exit();
    }else{
      echo("ID VALIDO");
    }
    // // Lee los datos de la solicitud ANTES de cualquier otra cosa
     $data = json_decode(file_get_contents('php://input'), true);
     if (json_last_error() !== JSON_ERROR_NONE) {
         http_response_code(400);
         echo json_encode(["message" => "Error al decodificar JSON: " . json_last_error_msg()]);
         exit();
     }

    // // Verifica si se ha enviado un archivo de imagen
    // $ruta = "assets/img/BOOKS/";

    // if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
    //      $task_img = uniqid() . '_' . basename($_FILES['img']['name']); // Define $task_img HERE
    //      if (!move_uploaded_file($_FILES['img']['tmp_name'], $ruta . $task_img)) {
    //          http_response_code(500);
    //          echo json_encode(["message" => "Error al subir la imagen: " . error_get_last()['message']]);
    //          exit();
    //      }
    //  } else {
    //      // Obtener el libro actual para mantener la imagen anterior
    //      $currentBook = $connection->query("SELECT img FROM books WHERE id = $id");
    //      if ($currentBook === false) {
    //          http_response_code(500);
    //          echo json_encode(["message" => "Error al obtener la imagen actual: " . $connection->error]);
    //          exit();
    //      }
    //      $currentBookData = $currentBook->fetch_assoc();
    //      $task_img = $currentBookData['img']; // Define $task_img HERE
    //  }

    //  error_log("Data before UPDATE: " . json_encode($data));
    //  error_log("Image path: " . $ruta . $task_img);
    // // La preparación de la consulta debe ir DESPUÉS de definir todas las variables que se usan.
     if ($data && isset($data['title'], $data['author'], $data['gender'], $data['year'])) {
         $stmt = $connection->prepare("UPDATE books SET title = ?, author = ?, gender = ?, year = ?, description = ?, img = ? WHERE id = ?"); // Define $stmt HERE
         if (!$stmt) {
             http_response_code(500);
             echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
             exit();
         }

         $stmt->bind_param("sssiisi", $data['title'], $data['author'], $data['gender'], $data['year'], $data['description'],$data['img'], $id);
        if ($stmt->execute()) {
             echo json_encode(["message" => "Libro actualizado con éxito."]);
         } else {
            http_response_code(500);
           error_log("Error al ejecutar la consulta: " . $stmt->error);
            echo json_encode(["message" => "Error al actualizar el libro: " . $stmt->error]);
         }
     } else {
         http_response_code(400);
         echo json_encode(["message" => "Datos incompletos para actualizar el libro."]);
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
