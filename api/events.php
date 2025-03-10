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
        // Obtener evento por ID
        $stmt = $connection->prepare("SELECT * FROM events WHERE id = ?");
        $stmt->bind_param("i", $resource);
        $stmt->execute();
        $result = $stmt->get_result();
        $event = $result->fetch_assoc();
        echo json_encode($event ? $event : []);
    } elseif (isset($_GET['year']) && is_numeric($_GET['year'])) {
        // Obtener eventos filtrando por año extraído del campo `start`
        $year = $_GET['year'];
        $stmt = $connection->prepare("SELECT * FROM events WHERE YEAR(start) = ?");
        $stmt->bind_param("i", $year);
        $stmt->execute();
        $result = $stmt->get_result();
        $events = [];
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }
        echo json_encode($events);
    } else {
        // Obtener todos los eventos
        $stmt = $connection->prepare("SELECT * FROM events");
        $stmt->execute();
        $result = $stmt->get_result();
        $events = [];
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }
        echo json_encode($events);
    }
    break;


    case 'POST':
      error_reporting(E_ALL);
      ini_set('display_errors', 1);

      // Procesar la imagen
// Procesar la imagen
if (isset($_FILES['img']) && $_FILES['img']['error'] == 0) {
  // Verificar que se recibió el campo 'start' para extraer el año
  if (!isset($_POST['start']) || empty($_POST['start'])) {
      http_response_code(400);
      echo json_encode(["message" => "Fecha de evento (start) requerida para procesar la imagen."]);
      exit();
  }

  // Extraer el año del campo 'start'
  $eventDate = $_POST['start'];
  $eventYear = date('Y', strtotime($eventDate));

  // Ruta base de almacenamiento
  $basePath = "../uploads/img/EVENTS/";

  // Crear la carpeta del año si no existe
  $yearFolder = $basePath . $eventYear;
  if (!file_exists($yearFolder)) {
      mkdir($yearFolder, 0777, true);
  }

  // Obtener el nombre original del archivo y agregar el año al principio
  $originalFileName = $_FILES['img']['name'];
  $newFileName = $eventYear . "_" . $originalFileName;

  // Ruta final del archivo
  $finalPath = $yearFolder . "/" . $newFileName;

  // Mover el archivo al destino final
  if (move_uploaded_file($_FILES['img']['tmp_name'], $finalPath)) {
      $imgName = $newFileName;
  } else {
      http_response_code(500);
      echo json_encode(["message" => "Error al guardar la imagen."]);
      exit();
  }
} else {
  $imgName = ''; // No se subió imagen
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
          $start = isset($data['start']) ? $data['start'] : null;
          $end = isset($data['end']) ? $data['end'] : null;
          $time = isset($data['time']) && $data['time'] !== '' ? $data['time'] : null;
          $description = isset($data['description']) && $data['description'] !== '' ? $data['description'] : null;
          $town = isset($data['town']) && $data['town'] !== '' ? $data['town'] : null;
          $place = isset($data['place']) && $data['place'] !== '' ? $data['place'] : null;
          $capacity = isset($data['capacity']) && is_numeric($data['capacity']) ? (int)$data['capacity'] : null;
          $price = isset($data['price']) && $data['price'] !== '' ? $data['price'] : null;
          $status = isset($data['status']) && $data['status'] !== '' ? $data['status'] : null;
          $status_reason = isset($data['status_reason']) && $data['status_reason'] !== '' ? $data['status_reason'] : null;
          $inscription = isset($data['inscription']) ? (int)filter_var($data['inscription'], FILTER_VALIDATE_BOOLEAN) : 0;


// Si no se envió una nueva imagen, recuperar la actual de la base de datos
if ($imgName == '') {
  $stmtCurrent = $connection->prepare("SELECT img FROM events WHERE id = ?");
  $stmtCurrent->bind_param("i", $id);
  $stmtCurrent->execute();
  $result = $stmtCurrent->get_result();
  $currentEvent = $result->fetch_assoc();
  $imgName = $currentEvent['img'];
}
          // Validar que se hayan recibido los datos obligatorios
          if ($title && $start && $end  !== null) {
            $stmt = $connection->prepare("UPDATE events
            SET title = ?, start = ?, end = ?, time = ?, description = ?, town = ?, place = ?, capacity = ?, price = ?, img = ?, status = ?, status_reason = ?, inscription = ?
            WHERE id = ?");
            if (!$stmt) {
                   http_response_code(500);
                   echo json_encode(["message" => "Error al preparar la consulta: " . $connection->error]);
                   exit();
               }

               $stmt->bind_param("sssssssissssii",
               $title, $start, $end, $time,
               $description, $town, $place, $capacity,
               $price, $imgName, $status, $status_reason,
               $inscription, $id
           );
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
          // Si no es una actualización, se inserta un nuevo libro
          $stmt = $connection->prepare("INSERT INTO events
          (title, start, end, time, description, town, place, capacity, price, img, status, status_reason, inscription)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

$stmt->bind_param("sssssssissssi",
$data['title'], $data['start'], $data['end'], $data['time'],
$data['description'], $data['town'],$data['place'], $data['capacity'],
$data['price'], $data['img'], $data['status'],$data['status_reason'],
$inscription
);


      if ($stmt->execute()) {
          echo json_encode(["message" => "Evento añadido con éxito."]);
      } else {
          http_response_code(500);
          echo json_encode(["message" => "Error al añadir el evento: " . $stmt->error]);
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
          $stmt = $connection->prepare("DELETE FROM events WHERE id = ?");
          $stmt->bind_param("i", $id);
          if ($stmt->execute()) {
              echo json_encode(["message" => "Evento eliminado con éxito."]);
          } else {
              http_response_code(500);
              echo json_encode(["message" => "Error al eliminar el evento: " . $stmt->error]);
          }
          break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
        break;

}

?>

