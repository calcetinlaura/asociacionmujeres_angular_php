<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override, Authorization, Origin, Accept");
header("Content-Type: application/json; charset=UTF-8");

include '../config/conexion.php';
include 'utils/utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $override = $_POST['_method'] ?? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
  $override = strtoupper($override);
  if ($override === 'DELETE') {
    $method = 'DELETE';
  }
}

if ($method === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$uriParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$resource = array_pop($uriParts);

$basePath = "../uploads/img/BOOKS/";

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
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM books");
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $latestYear = $data['latestYear'];

        if ($latestYear) {
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
    }
    elseif (isset($_GET['gender'])) {
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

  // --- Acciones especiales ---
  // Eliminar imagen
   if (isset($_POST['action']) && $_POST['action'] === 'deleteImage') {
        $type = $_POST['type'];
        if (!empty($_POST['id'])) {
          $id = (int)$_POST['id'];
          if (eliminarSoloArchivo($connection, strtolower($type), 'img', $id, $basePath)) {
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

      // 🔁 Lógica normal de crear o actualizar libro
      $imgName = procesarArchivo($basePath, "img");
      $data = $_POST;
      $data['img'] = $imgName;

      // Validación de campos requeridos
      $campoRequerido = validarCamposRequeridos($data, ['title', 'year', 'gender']);
      if ($campoRequerido !== null) {
        http_response_code(400);
        echo json_encode(["message" => "El campo '$campoRequerido' es obligatorio."]);
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

        $stmtCurrent = $connection->prepare("SELECT img FROM books WHERE id = ?");
        $stmtCurrent->bind_param("i", $id);
        $stmtCurrent->execute();
        $result = $stmtCurrent->get_result();
        $current = $result->fetch_assoc();
        $oldImg = $current['img'] ?? '';

        if ($imgName === '') {
          $imgName = $oldImg;
        }

        $year = (int)$data['year'];
        $stmt = $connection->prepare("UPDATE books SET title = ?, author = ?, gender = ?, year = ?, description = ?, summary =?, img = ? WHERE id = ?");
        $stmt->bind_param("sssisssi", $data['title'], $data['author'], $data['gender'], $year, $data['description'], $data['summary'], $imgName, $id);

        if ($stmt->execute()) {
          if ($oldImg && $imgName !== $oldImg) {
            eliminarArchivoSiNoSeUsa($connection, 'books', 'img', $oldImg, $basePath);
          }
          echo json_encode(["message" => "Libro actualizado con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al actualizar el libro: " . $stmt->error]);
        }

      } else {
        $year = (int)$data['year'];
        $stmt = $connection->prepare("INSERT INTO books (title, author, gender, year, description, summary, img) VALUES (?, ?, ?, ?, ?,?, ?)");
        $stmt->bind_param("sssisss", $data['title'], $data['author'], $data['gender'], $year, $data['description'], $data['summary'], $imgName);

        if ($stmt->execute()) {
          echo json_encode(["message" => "Libro añadido con éxito."]);
        } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir el libro: " . $stmt->error]);
        }
      }
      break;

      case 'DELETE':
    $id = $_POST['id'] ?? $_GET['id'] ?? null;
        if (!is_numeric($id)) {
          http_response_code(400);
          echo json_encode(["message" => "ID no válido."]);
          exit();
        }

        // Primero recuperamos la imagen actual antes de eliminar el registro
        $stmtImg = $connection->prepare("SELECT img FROM books WHERE id = ?");
        $stmtImg->bind_param("i", $id);
        $stmtImg->execute();
        $resultImg = $stmtImg->get_result();
        $book = $resultImg->fetch_assoc();
        $imgToDelete = $book['img'] ?? '';

        $stmt = $connection->prepare("DELETE FROM books WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
          // Si se borró correctamente, intentamos borrar la imagen si no se usa en otro libro
          if ($imgToDelete) {
            eliminarArchivoSiNoSeUsa($connection, 'books', 'img', $imgToDelete, $basePath);
          }
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
