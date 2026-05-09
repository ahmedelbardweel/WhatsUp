<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$db   = $_ENV['DB_DATABASE'];
$user = $_ENV['DB_USERNAME'];
$pass = $_ENV['DB_PASSWORD'];

echo "Connecting to: $host:$port / $db\n";

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db",
        $user,
        $pass,
        [PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false]
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "SUCCESS! Connected.\n";
    $result = $pdo->query('SHOW TABLES');
    foreach ($result as $row) {
        echo "Table: " . implode(', ', $row) . "\n";
    }
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
