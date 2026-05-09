<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="user-id" content="{{ auth()->id() }}">
    <title>محادثات - تجريبي (WhatsApp Clone)</title>
    <!-- Google Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <!-- PeerJS for WebRTC -->
    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
    <link rel="stylesheet" href="{{ asset('css/whatsapp.css') }}">
</head>
<body class="light-mode">
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <!-- Sidebar Header -->
            <header class="header">
                <div class="avatar">
                    <img src="https://ui-avatars.com/api/?name=User&background=random&rounded=false" alt="Profile">
                </div>
                <div class="actions">
                    <!-- Toggles -->
                    <button id="langToggle" class="icon-btn" title="تغيير اللغة (عربي/إنجليزي)"><span class="material-symbols-outlined">language</span></button>
                    <button id="themeToggle" class="icon-btn" title="الوضع الليلي/النهاري"><span class="material-symbols-outlined">dark_mode</span></button>
                    <button class="icon-btn" title="إنشاء مجموعة"><span class="material-symbols-outlined">groups</span></button>
                    <button class="icon-btn" title="الحالة"><span class="material-symbols-outlined">data_usage</span></button>
                    <button class="icon-btn" title="محادثة جديدة"><span class="material-symbols-outlined">chat</span></button>
                    <button class="icon-btn" title="القائمة"><span class="material-symbols-outlined">more_vert</span></button>
                </div>
            </header>

            <!-- Search Bar -->
            <div class="search-container">
                <div class="search-box">
                    <span class="material-symbols-outlined search-icon">search</span>
                    <input type="text" id="searchInput" placeholder="البحث أو بدء محادثة جديدة" class="sharp-corners">
                    <span class="material-symbols-outlined filter-icon">filter_list</span>
                </div>
            </div>

            <!-- Chat List -->
            <div class="chat-list" id="chatList">
                <!-- Chats will be populated here -->
            </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="chat-area">
            <!-- Chat Header -->
            <header class="header chat-header">
                <div class="chat-title-container">
                    <button class="back-btn" id="backToListBtn"><span class="material-symbols-outlined">arrow_back</span></button>
                    <div class="avatar">
                        <img src="https://ui-avatars.com/api/?name=Ahmed&background=008069&color=fff&rounded=false" alt="User">
                    </div>
                    <div class="chat-title-info">
                        <span class="chat-title-name">أحمد محمد</span>
                        <span class="chat-status">متصل الآن</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="icon-btn" id="addMemberBtn" title="إضافة عضو" style="display:none;"><span class="material-symbols-outlined">person_add</span></button>
                    <button class="icon-btn"><span class="material-symbols-outlined">videocam</span></button>
                    <button class="icon-btn"><span class="material-symbols-outlined">call</span></button>
                    <div class="separator"></div>
                    <button class="icon-btn"><span class="material-symbols-outlined">search</span></button>
                    <button class="icon-btn"><span class="material-symbols-outlined">more_vert</span></button>
                </div>
            </header>

            <!-- Messages Container -->
            <div class="messages-container" id="messagesContainer">
                <div class="empty-chat-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); text-align:center;">
                    <span class="material-symbols-outlined" style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">chat</span>
                    <h2>لا توجد محادثة مفتوحة</h2>
                    <p>اضغط على أيقونة المحادثة الجديدة للبدء، أو اختر محادثة من القائمة الجانبية.</p>
                </div>
            </div>

            <!-- Chat Input Footer -->
            <footer class="chat-footer">
                <!-- Recording Indicator (hidden by default) -->
                <div id="recordingIndicator" class="recording-indicator hidden">
                    <span class="rec-dot"></span>
                    <span class="rec-label">جاري التسجيل...</span>
                    <span id="recordingTime" class="rec-time">0:00</span>
                    <button id="cancelRecBtn" class="icon-btn" style="margin-right:auto;">
                        <span class="material-symbols-outlined" style="color:#ef4444;">delete</span>
                    </button>
                </div>
                <button class="icon-btn" id="emojiBtn"><span class="material-symbols-outlined">sentiment_satisfied</span></button>
                <button class="icon-btn" id="attachBtn"><span class="material-symbols-outlined">attach_file</span></button>
                <input type="file" id="fileInput" hidden accept="image/*,video/*,.pdf,.doc,.docx,.zip">
                <div class="input-container">
                    <input type="text" id="messageInput" placeholder="اكتب رسالة" class="sharp-corners">
                </div>
                <button class="icon-btn" id="sendBtn"><span class="material-symbols-outlined">mic</span></button>
            </footer>
        </main>
    </div>

    <!-- Modals -->
    <!-- File Preview Modal -->
    <div id="previewModal" class="modal hidden">
        <div class="modal-content preview-content sharp-corners">
            <div class="preview-header">
                <button class="icon-btn" id="closePreview"><span class="material-symbols-outlined">close</span></button>
                <h3>معاينة المرفق</h3>
            </div>
            <div class="preview-body" id="previewBody">
                <!-- Preview will be injected here -->
            </div>
            <div class="preview-footer">
                <input type="text" id="fileCaption" placeholder="أضف وصفاً للرسالة..." class="sharp-corners">
                <button class="send-preview-btn" id="sendPreview"><span class="material-symbols-outlined">send</span></button>
            </div>
        </div>
    </div>
    <div id="newChatModal" class="modal-overlay hidden">
        <div class="modal-content sharp-corners">
            <div class="modal-header">
                <h3>محادثة جديدة</h3>
                <button class="close-modal icon-btn"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="modal-body">
                <input type="email" id="newChatEmail" class="modal-input sharp-corners" placeholder="أدخل البريد الإلكتروني لصديقك">
                <button id="startNewChatBtn" class="modal-btn sharp-corners">بدء المحادثة</button>
                <div id="newChatError" class="modal-error hidden"></div>
            </div>
        </div>
    </div>

    <!-- New Group Modal -->
    <div id="newGroupModal" class="modal-overlay hidden">
        <div class="modal-content sharp-corners">
            <div class="modal-header">
                <h3>إنشاء مجموعة جديدة</h3>
                <button class="close-modal icon-btn"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="modal-body">
                <input type="text" id="newGroupName" class="modal-input sharp-corners" placeholder="اسم المجموعة">
                <button id="startNewGroupBtn" class="modal-btn sharp-corners">إنشاء</button>
                <div id="newGroupError" class="modal-error hidden"></div>
            </div>
        </div>
    </div>

    <!-- Add Member Modal -->
    <div id="addMemberModal" class="modal-overlay hidden">
        <div class="modal-content sharp-corners">
            <div class="modal-header">
                <h3>إضافة عضو للمجموعة</h3>
                <button class="close-modal icon-btn"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="modal-body">
                <input type="email" id="addMemberEmail" class="modal-input sharp-corners" placeholder="البريد الإلكتروني للعضو">
                <button id="confirmAddMemberBtn" class="modal-btn sharp-corners">إضافة</button>
                <div id="addMemberError" class="modal-error hidden"></div>
            </div>
        </div>
    </div>

    <!-- Context Menu (Right-click on chat) -->
    <div id="chatContextMenu" class="context-menu hidden">
        <button id="deleteConvBtn" class="context-menu-item danger">
            <span class="material-symbols-outlined">delete</span>
            <span>حذف المحادثة</span>
        </button>
    </div>

    <!-- WebRTC Remote Audio -->
    <audio id="remoteAudio" autoplay class="hidden"></audio>

    <!-- Incoming Call Modal -->
    <div id="incomingCallModal" class="call-modal hidden">
        <div class="call-modal-content">
            <img src="" id="incomingCallerAvatar" alt="Avatar" class="call-avatar">
            <h3 id="incomingCallerName">اسم المتصل</h3>
            <p>مكالمة صوتية واردة...</p>
            <div class="call-actions">
                <button id="declineCallBtn" class="call-btn decline">
                    <span class="material-symbols-outlined">call_end</span>
                </button>
                <button id="acceptCallBtn" class="call-btn accept">
                    <span class="material-symbols-outlined">call</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Active Call Modal -->
    <div id="activeCallModal" class="call-modal hidden">
        <div class="call-modal-content">
            <img src="" id="activeCallAvatar" alt="Avatar" class="call-avatar pulsing">
            <h3 id="activeCallName">اسم المتصل</h3>
            <p id="activeCallStatus">جاري الاتصال...</p>
            <div class="call-actions single">
                <button id="endCallBtn" class="call-btn decline">
                    <span class="material-symbols-outlined">call_end</span>
                </button>
            </div>
        </div>
    </div>

    <script>
        window.translations = {
            'ar': {
                'title': 'محادثات - تجريبي',
                'searchPlaceholder': 'البحث أو بدء محادثة جديدة',
                'messagePlaceholder': 'اكتب رسالة',
                'status': 'متصل الآن',
                'today': 'اليوم',
                'yesterday': 'أمس',
                'monday': 'الإثنين'
            },
            'en': {
                'title': 'Chats - Prototype',
                'searchPlaceholder': 'Search or start new chat',
                'messagePlaceholder': 'Type a message',
                'status': 'Online',
                'today': 'Today',
                'yesterday': 'Yesterday',
                'monday': 'Monday'
            }
        };
    </script>
    <script src="{{ asset('js/whatsapp.js') }}"></script>
</body>
</html>
