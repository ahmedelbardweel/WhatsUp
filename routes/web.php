<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\AuthController;

// Auth Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected Routes
Route::middleware('auth')->group(function () {
    Route::get('/', [ChatController::class, 'index'])->name('index');
    
    // Serve storage files from /tmp on Vercel with Range Request support
    Route::get('/storage/{path}', function ($path) {
        $fullPath = storage_path('app/public/' . $path);
        if (!file_exists($fullPath)) abort(404);
        
        $size = filesize($fullPath);
        $type = mime_content_type($fullPath);
        $file = fopen($fullPath, 'rb');
        
        $start = 0;
        $end = $size - 1;
        
        if (request()->hasHeader('Range')) {
            $range = request()->header('Range');
            preg_match('/bytes=(\d+)-(\d+)?/', $range, $matches);
            $start = intval($matches[1]);
            $end = isset($matches[2]) ? intval($matches[2]) : $size - 1;
            
            header('HTTP/1.1 206 Partial Content');
            header("Content-Range: bytes $start-$end/$size");
            header('Content-Length: ' . ($end - $start + 1));
        } else {
            header('Content-Length: ' . $size);
        }
        
        header("Content-Type: $type");
        header('Accept-Ranges: bytes');
        
        fseek($file, $start);
        $buffer = 1024 * 8;
        while (!feof($file) && ($pos = ftell($file)) <= $end) {
            if ($pos + $buffer > $end) {
                $buffer = $end - $pos + 1;
            }
            echo fread($file, $buffer);
            flush();
        }
        fclose($file);
        exit;
    })->where('path', '.*');
    
    // API Routes for Chat
    Route::get('/api/conversations', [ChatController::class, 'getConversations']);
    Route::get('/api/conversations/{id}/messages', [ChatController::class, 'getMessages']);
    Route::post('/api/conversations/{id}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/api/conversations/{id}/voice', [ChatController::class, 'sendVoiceMessage']);
    Route::post('/api/conversations/{id}/files', [ChatController::class, 'sendFileMessage']);
    
    // API Routes for New Chat/Group
    Route::post('/api/conversations/direct', [ChatController::class, 'createDirectChat']);
    Route::post('/api/conversations/group', [ChatController::class, 'createGroupChat']);
    Route::post('/api/conversations/{id}/add-user', [ChatController::class, 'addUserToGroup']);
    Route::delete('/api/conversations/{id}', [ChatController::class, 'deleteConversation']);
});
