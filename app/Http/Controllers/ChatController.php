<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    // For prototype purposes, auto-login user 1
    public function index()
    {
        return view('prototype');
    }

    public function getConversations()
    {
        $user = Auth::user();
        $conversations = $user->conversations()->with(['users', 'messages' => function($query) {
            $query->latest()->limit(1);
        }])->get();

        return response()->json($conversations);
    }

    public function getMessages($conversation_id)
    {
        $messages = Message::with('sender')
            ->where('conversation_id', $conversation_id)
            ->oldest()
            ->get();
            
        return response()->json($messages);
    }

    public function sendMessage(Request $request, $conversation_id)
    {
        $request->validate(['body' => 'required|string']);

        $message = Message::create([
            'conversation_id' => $conversation_id,
            'sender_id' => Auth::id(),
            'body' => $request->body,
            'type' => 'text',
        ]);

        return response()->json($message->load('sender'));
    }

    public function sendVoiceMessage(Request $request, $conversation_id)
    {
        $request->validate(['audio' => 'required|file|mimes:webm,ogg,wav,mp4,m4a|max:10240']);

        $path = $request->file('audio')->store('voice-messages', 'public');

        $message = Message::create([
            'conversation_id' => $conversation_id,
            'sender_id' => Auth::id(),
            'body' => null,
            'type' => 'audio',
            'media_url' => $path,
            'duration' => $request->input('duration', 0),
        ]);

        return response()->json($message->load('sender'));
    }

    public function sendFileMessage(Request $request, $conversation_id)
    {
        \Log::info('File upload attempt for conversation: ' . $conversation_id);
        
        try {
            $request->validate(['file' => 'required|file|max:20480']);
        } catch (\Exception $e) {
            \Log::error('Validation failed: ' . $e->getMessage());
            return response()->json(['error' => 'حجم الملف كبير جداً أو نوعه غير مدعوم'], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mime = $file->getMimeType();

        $type = 'file';
        if (str_starts_with($mime, 'image/')) $type = 'image';
        elseif (str_starts_with($mime, 'video/')) $type = 'video';

        // Ensure directory exists in /tmp storage
        $storagePath = storage_path('app/public/attachments');
        if (!file_exists($storagePath)) {
            mkdir($storagePath, 0777, true);
        }

        $path = $file->store('attachments', 'public');

        $message = Message::create([
            'conversation_id' => $conversation_id,
            'sender_id' => Auth::id(),
            'body' => $request->input('caption') ?: $originalName,
            'type' => $type,
            'media_url' => $path,
        ]);

        return response()->json($message->load('sender'));
    }

    public function createDirectChat(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $otherUser = User::where('email', $request->email)->first();
        if (!$otherUser) {
            return response()->json(['error' => 'المستخدم غير موجود'], 404);
        }

        if ($otherUser->id === Auth::id()) {
            return response()->json(['error' => 'لا يمكنك بدء محادثة مع نفسك'], 400);
        }

        // Check if conversation already exists
        $existing = Auth::user()->conversations()
            ->where('type', 'direct')
            ->whereHas('users', function($q) use ($otherUser) {
                $q->where('users.id', $otherUser->id);
            })->first();

        if ($existing) {
            return response()->json($existing);
        }

        $conversation = Conversation::create(['type' => 'direct']);
        $conversation->users()->attach([Auth::id(), $otherUser->id]);

        return response()->json($conversation);
    }

    public function createGroupChat(Request $request)
    {
        $request->validate(['name' => 'required|string']);

        $conversation = Conversation::create([
            'name' => $request->name,
            'type' => 'group'
        ]);

        $conversation->users()->attach([Auth::id() => ['role' => 'admin']]);

        return response()->json($conversation);
    }

    public function addUserToGroup(Request $request, $conversation_id)
    {
        $request->validate(['email' => 'required|email']);

        $conversation = Conversation::where('id', $conversation_id)->where('type', 'group')->firstOrFail();
        
        // Ensure current user is part of the group (or admin)
        if (!$conversation->users()->where('users.id', Auth::id())->exists()) {
            return response()->json(['error' => 'ليس لديك صلاحية'], 403);
        }

        $userToAdd = User::where('email', $request->email)->first();
        if (!$userToAdd) {
            return response()->json(['error' => 'المستخدم غير موجود'], 404);
        }

        if ($conversation->users()->where('users.id', $userToAdd->id)->exists()) {
            return response()->json(['error' => 'المستخدم موجود بالفعل في المجموعة'], 400);
        }

        $conversation->users()->attach($userToAdd->id, ['role' => 'member']);

        return response()->json(['success' => true, 'message' => 'تم إضافة المستخدم بنجاح']);
    }

    public function deleteConversation($conversation_id)
    {
        $conversation = Conversation::findOrFail($conversation_id);

        // Make sure the user belongs to this conversation
        if (!$conversation->users()->where('users.id', Auth::id())->exists()) {
            return response()->json(['error' => 'ليس لديك صلاحية'], 403);
        }

        // Detach user from conversation
        $conversation->users()->detach(Auth::id());

        // If no users left, delete the conversation and all messages
        if ($conversation->users()->count() === 0) {
            $conversation->messages()->delete();
            $conversation->delete();
        }

        return response()->json(['success' => true]);
    }
}
