<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
//Función para subir imagen
function procesarArchivo(string $basePath, string $inputName, array $postData = []): string {
  if (!isset($_FILES[$inputName]) || $_FILES[$inputName]['error'] !== 0) {
    return '';
  }

  // Si hay una fecha de evento, usar año como subcarpeta
  $useYearFolder = isset($postData['start']);
  $yearFolder = '';

  if ($useYearFolder) {
    $eventYear = date('Y', strtotime($postData['start']));
    $yearFolder = $basePath . $eventYear . '/';

    if (!file_exists($yearFolder)) {
      mkdir($yearFolder, 0777, true);
    }
  } else {
    $yearFolder = $basePath; // sin subcarpeta
  }

  $originalFileName = $_FILES[$inputName]['name'];
  $finalFileName = ($useYearFolder ? $eventYear . '_' : '') . $originalFileName;
  $finalPath = $yearFolder . $finalFileName;

  if (move_uploaded_file($_FILES[$inputName]['tmp_name'], $finalPath)) {
    return $finalFileName;
  }

  return '';
}

function procesarArchivoPorAnio($basePath, $inputName, $fechaCampo) {
  if (!isset($_FILES[$inputName]) || $_FILES[$inputName]['error'] !== 0) {
    return $_POST['img'] ?? '';  // 👈 esto soluciona el problema
  }

  if (!isset($_POST[$fechaCampo]) || empty($_POST[$fechaCampo])) {
    return '';
  }

  $fecha = $_POST[$fechaCampo];
  $anio = date('Y', strtotime($fecha));

  $folderPath = rtrim($basePath, '/') . '/' . $anio . '/';

  if (!file_exists($folderPath)) {
    mkdir($folderPath, 0777, true);
  }

  $originalName = basename($_FILES[$inputName]['name']);
  $newFileName = $anio . "_" . $originalName;
  $fullPath = $folderPath . $newFileName;

  if (move_uploaded_file($_FILES[$inputName]['tmp_name'], $fullPath)) {
    return $newFileName;
  }

  return '';
}


function eliminarSoloImagen($connection, $tabla, $campoImg, $id, $carpetaBase) {
  // Obtener nombre de la imagen
  $stmt = $connection->prepare("SELECT $campoImg FROM $tabla WHERE id = ?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $result = $stmt->get_result();
  $record = $result->fetch_assoc();
  $img = $record[$campoImg] ?? '';

  // Intentar encontrar la ruta real de la imagen
  $path = buscarRutaDeImagen($carpetaBase, $img);
  if ($path && file_exists($path)) {
    unlink($path);
  }

  // Actualizar el registro para borrar el campo de imagen
  $stmt = $connection->prepare("UPDATE $tabla SET $campoImg = NULL WHERE id = ?");
  $stmt->bind_param("i", $id);
  return $stmt->execute();
}

//Función para eliminar imagen si ya no se usa
function eliminarImagenSiNoSeUsa($connection, $tabla, $campoImg, $imgNombre, $carpetaBase) {
  $stmt = $connection->prepare("SELECT COUNT(*) as total FROM $tabla WHERE $campoImg = ?");
  $stmt->bind_param("s", $imgNombre);
  $stmt->execute();
  $result = $stmt->get_result();
  $row = $result->fetch_assoc();

  if ((int)$row['total'] <= 1 && !empty($imgNombre)) {
    $pattern = $carpetaBase . "*/" . $imgNombre;
    $paths = glob($pattern);
    foreach ($paths as $path) {
      if (file_exists($path)) {
        unlink($path);
      }
    }

    // También probar en el directorio raíz si no usa subcarpeta
    $directPath = $carpetaBase . $imgNombre;
    if (file_exists($directPath)) {
      unlink($directPath);
    }
  }
}


//Función auxiliar para encontrar imagen en carpetas por año en eventos, macroeventos...
function buscarRutaDeImagen(string $basePath, string $imgName): ?string {
  // Buscar en subcarpetas tipo ../uploads/img/MACROEVENTS/2023/imagen.jpg
  $pattern = $basePath . '*/' . $imgName;
  $matches = glob($pattern);

  // Si se encontró, devolver el path
  if (!empty($matches)) {
    return $matches[0];
  }

  // En caso de que no esté en subcarpeta, buscar en la raíz directamente
  $directPath = $basePath . $imgName;
  if (file_exists($directPath)) {
    return $directPath;
  }

  return null;
}

function validarCamposRequeridos($data, $campos) {
  foreach ($campos as $campo) {
    if (!isset($data[$campo]) || trim($data[$campo]) === '') {
      return $campo;
    }
  }
  return null;
}
?>
