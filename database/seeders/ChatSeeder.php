<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Conversation;
use App\Models\Message;

class ChatSeeder extends Seeder
{
    public function run(): void
    {
        $user1 = User::create([
            'name' => 'Ahmed',
            'email' => 'ahmed@example.com',
            'password' => bcrypt('password')
        ]);

        $user2 = User::create([
            'name' => 'Ali',
            'email' => 'ali@example.com',
            'password' => bcrypt('password')
        ]);

        $conversation = Conversation::create([
            'type' => 'direct'
        ]);

        $conversation->users()->attach([$user1->id, $user2->id]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user2->id,
            'body' => 'أهلاً بك، متى يمكننا الاجتماع؟',
        ]);
        
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user1->id,
            'body' => 'أهلاً، يمكننا الاجتماع غداً.',
        ]);
    }
}
