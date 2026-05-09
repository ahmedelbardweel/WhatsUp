<?php
// Temporary debug file - REMOVE AFTER DEBUGGING
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h2>Debug Info</h2><pre>";

// Check PHP version
echo "PHP Version: " . PHP_VERSION . "\n";

// Check extensions
echo "PDO: " . (extension_loaded('pdo') ? 'YES' : 'NO') . "\n";
echo "PDO MySQL: " . (extension_loaded('pdo_mysql') ? 'YES' : 'NO') . "\n";

// Check env vars
echo "\nEnvironment Variables:\n";
$vars = ['APP_KEY', 'APP_ENV', 'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME'];
foreach ($vars as $var) {
    $val = getenv($var);
    echo "$var: " . ($val ? (strlen($val) > 20 ? substr($val, 0, 20) . '...' : $val) : 'NOT SET') . "\n";
}

// Check storage path
echo "\n/tmp writable: " . (is_writable('/tmp') ? 'YES' : 'NO') . "\n";

// Test DB connection
echo "\nTesting DB Connection...\n";
try {
    $host = getenv('DB_HOST');
    $port = getenv('DB_PORT') ?: '3306';
    $db   = getenv('DB_DATABASE');
    $user = getenv('DB_USERNAME');
    $pass = getenv('DB_PASSWORD');
    
    if ($host && $db && $user) {
        $pdo = new PDO(
            "mysql:host=$host;port=$port;dbname=$db",
            $user,
            $pass,
            [PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false]
        );
        echo "DB Connection: SUCCESS\n";
    } else {
        echo "DB Connection: SKIPPED (missing credentials)\n";
    }
} catch (Exception $e) {
    echo "DB Connection Error: " . $e->getMessage() . "\n";
}

echo "</pre>";
