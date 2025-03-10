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

$result = $connection->query("SELECT id, password FROM users");

while ($row = $result->fetch_assoc()) {
    $hashed_password = password_hash($row['password'], PASSWORD_DEFAULT);
    $connection->query("UPDATE users SET password = '$hashed_password' WHERE id = " . $row['id']);
}

echo "Contraseñas actualizadas correctamente.";
// Leer el JSON de la petición
$data = json_decode(file_get_contents("php://input"), true);
file_put_contents("debug.txt", print_r($data, true));


if (!isset($data['name']) || !isset($data['password'])) {
    http_response_code(400); // Bad Request
    echo json_encode(["error" => "Faltan datos"]);
    exit();
}

// Escapar y sanitizar las entradas para evitar inyecciones SQL
$name = mysqli_real_escape_string($connection, $data['name']);
$password = mysqli_real_escape_string($connection, $data['password']);

// Buscar el usuario en la base de datos
$sql = "SELECT id, name, password FROM users WHERE name = ?";
$stmt = $connection->prepare($sql);
$stmt->bind_param("s", $name);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    // Verificar la contraseña
    if (password_verify($password, $user['password'])) {
        echo json_encode([
            "success" => true,
            "message" => "Login exitoso",
            "user" => [
                "id" => $user['id'],
                "name" => $user['name']
            ]
        ]);
    } else {
        http_response_code(401); // Unauthorized
        echo json_encode(["error" => "Credenciales incorrectas"]);
    }
} else {
    http_response_code(401);
    echo json_encode(["error" => "Usuario no encontrado"]);
}

$stmt->close();
$connection->close();
?>

