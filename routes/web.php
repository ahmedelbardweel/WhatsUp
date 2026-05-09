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
    Route::get('/', [ChatController::class, 'index']);
    
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
