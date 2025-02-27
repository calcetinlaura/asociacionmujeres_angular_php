<?php
$servername = "PMYSQL158.dns-servicio.com:3306";
$username = "asociacionMujeres";
$password = "asociacionMujeres_2022";
$database = "9165729_asociacionmujerescallosa";
// Crear conexión
$connection = mysqli_connect($servername, $username, $password, $database);
// Verificar conexión
if (!$connection) {
    die("Error de conexión: " . mysqli_connect_error());
}
// Establecer el conjunto de caracteres adecuado
mysqli_set_charset($connection, 'utf8');
?>
