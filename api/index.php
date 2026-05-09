<?php

/**
 * Vercel entry point for Laravel
 * Handles read-only filesystem by redirecting writable paths to /tmp
 */

require __DIR__ . '/../vendor/autoload.php';

// Create all writable directories in /tmp (Vercel has read-only filesystem)
$tmpDirs = [
    '/tmp/storage/app/public',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/framework/testing',
    '/tmp/storage/framework/views',
    '/tmp/storage/logs',
    '/tmp/bootstrap/cache',
];

foreach ($tmpDirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

// Copy bootstrap cache files from read-only to writable /tmp if they exist
$bootstrapCacheSrc = __DIR__ . '/../bootstrap/cache';
if (is_dir($bootstrapCacheSrc)) {
    foreach (glob($bootstrapCacheSrc . '/*.php') as $file) {
        $dest = '/tmp/bootstrap/cache/' . basename($file);
        if (!file_exists($dest)) {
            copy($file, $dest);
        }
    }
}

// Boot the application
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->useStoragePath('/tmp/storage');

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);
$response->send();
$kernel->terminate($request, $response);
