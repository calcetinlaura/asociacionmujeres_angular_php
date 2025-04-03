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
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $recipe = $result->fetch_assoc();
        echo json_encode($recipe ? $recipe : []);
    } elseif (isset($_GET['latest'])) {
        // Obtener el año más reciente
        $stmt = $connection->prepare("SELECT MAX(year) AS latestYear FROM recipes");
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $latestYear = $data['latestYear'];

        if ($latestYear) {
            // Obtener recetas filtrando por el último año
            $stmt = $connection->prepare("SELECT * FROM recipes WHERE year = ?");
            $stmt->bind_param("i", $latestYear);
            $stmt->execute();
            $result = $stmt->get_result();
            $recipes = [];
            while ($row = $result->fetch_assoc()) {
                $recipes[] = $row;
            }
            echo json_encode($recipes);
        } else {
            echo json_encode([]);
        }
    } elseif (isset($_GET['year'])) {
        // Obtener recetas filtrando por año
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE year = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
    } elseif (isset($_GET['category'])) {
        // Obtener recetas filtrando por género
        $category = $_GET['category'];
        $stmt = $connection->prepare("SELECT * FROM recipes WHERE category = ?");
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
    } else {
        // Obtener todos los recetas
        $stmt = $connection->prepare("SELECT * FROM recipes");
        $stmt->execute();
        $result = $stmt->get_result();
        $recipes = [];
        while ($row = $result->fetch_assoc()) {
            $recipes[] = $row;
        }
        echo json_encode($recipes);
    }
    break;

    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      // Procesar la imagen
      if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
        $ruta = "../uploads/img/RECIPES/";
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

// Recuperar datos desde $_POST
$title = isset($data['title']) ? $data['title'] : null;
$category = isset($data['category']) ? $data['category'] : null;
$owner = isset($data['owner']) ? $data['owner'] : null;
$ingredients = isset($data['ingredients']) ? $data['ingredients'] : null;
$recipe = isset($data['recipe']) ? $data['recipe'] : null;
$year = isset($data['year']) ? (int)$data['year'] : null;

if ($imgName == '') {
  $stmtCurrent = $connection->prepare("SELECT img FROM recipes WHERE id = ?");
  $stmtCurrent->bind_param("i", $id);
  $stmtCurrent->execute();
  $result = $stmtCurrent->get_result();
  $currentBook = $result->fetch_assoc();
  $imgName = $currentBook['img'];
}
          // Validar que se hayan recibido los datos obligatorios
          if ($title && $category && $year !== null) {
            $stmt = $connection->prepare("UPDATE recipes SET title = ?, category = ?, owner = ?, ingredients = ?, recipe = ?, img = ?, year = ? WHERE id = ?");
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
                exit();
            }

            $stmt->bind_param("ssssssii", $title, $category, $owner, $ingredients, $recipe, $imgName, $year, $id);
            if ($stmt->execute()) {
                echo json_encode(["message" => "Receta actualizada con éxito."]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar la receta: " . $stmt->error]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos para actualizar la receta."]);
        }
      } else {
        // Si no es una actualización, se inserta una nueva receta
        $stmt = $connection->prepare("INSERT INTO recipes (title, category, owner, ingredients, recipe, img, year) VALUES (?, ?, ?, ?, ?, ?, ?)");
      $stmt->bind_param(
            "ssssssi",
            $data['title'],
            $data['category'],
            $data['owner'],
            $data['ingredients'],
            $data['recipe'],
            $data['img'],
            $data['year']
        );

        if ($stmt->execute()) {
            echo json_encode(["message" => "Receta añadida con éxito."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al añadir la receta: " . $stmt->error]);
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
          $stmt = $connection->prepare("DELETE FROM recipes WHERE id = ?");
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
