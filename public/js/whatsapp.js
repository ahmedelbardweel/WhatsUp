document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const langToggle = document.getElementById('langToggle');
    const body = document.body;
    const html = document.documentElement;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const currentUserId = parseInt(document.querySelector('meta[name="user-id"]').getAttribute('content'));

    let activeConversationId = null;
    let pollInterval = null;
    const loadedImages = new Set(); 
    const wavesurfers = new Map(); // Store Wavesurfer instances by message ID

    // Theme Toggle Logic
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            themeToggle.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            themeToggle.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
        }
    });

    // Language Toggle Logic
    langToggle.addEventListener('click', () => {
        const currentLang = html.getAttribute('lang');
        if (currentLang === 'ar') {
            html.setAttribute('lang', 'en');
            html.setAttribute('dir', 'ltr');
            updateTexts('en');
        } else {
            html.setAttribute('lang', 'ar');
            html.setAttribute('dir', 'rtl');
            updateTexts('ar');
        }
    });

    function updateTexts(lang) {
        if (!window.translations || !window.translations[lang]) return;
        const dict = window.translations[lang];
        document.title = dict['title'];
        document.getElementById('searchInput').placeholder = dict['searchPlaceholder'];
        document.getElementById('messageInput').placeholder = dict['messagePlaceholder'];
        document.querySelector('.chat-status').textContent = dict['status'];
    }

    // Chat functionality
    const chatListContainer = document.getElementById('chatList');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendBtn');

    function fetchConversations() {
        fetch('/api/conversations')
            .then(res => res.json())
            .then(data => {
                renderConversations(data);
                if (data.length > 0 && !activeConversationId) {
                    const { name, targetUserId } = getConversationNameAndTargetUser(data[0]);
                    selectConversation(data[0].id, name, data[0].type, targetUserId);
                }
            });
    }

    function getConversationNameAndTargetUser(conv) {
        const otherUser = conv.users.find(u => u.id !== currentUserId);
        const name = conv.name ? conv.name : (otherUser ? otherUser.name : 'Unknown');
        const targetUserId = otherUser ? otherUser.id : null;
        return { name, targetUserId };
    }

    function renderConversations(conversations) {
        chatListContainer.innerHTML = '';
        conversations.forEach(conv => {
            const { name, targetUserId } = getConversationNameAndTargetUser(conv);
            let lastMsg = '...';
            if (conv.messages.length > 0) {
                const m = conv.messages[0];
                if (m.type === 'text') lastMsg = m.body;
                else if (m.type === 'audio') lastMsg = '🎵 رسالة صوتية';
                else if (m.type === 'image') lastMsg = '📷 صورة';
                else if (m.type === 'video') lastMsg = '🎥 فيديو';
                else if (m.type === 'file') lastMsg = '📁 ملف';
                else lastMsg = m.body || '...';
            }
            const isActive = conv.id === activeConversationId ? 'active' : '';

            const item = document.createElement('div');
            item.className = `chat-item ${isActive}`;
            item.dataset.convId = conv.id;
            item.onclick = () => selectConversation(conv.id, name, conv.type, targetUserId);
            const isGroup = conv.type === 'group';
            const avatarBg = isGroup ? '667781' : '00a884';
            const groupBadge = isGroup
                ? `<span class="group-badge">مجموعة</span>`
                : '';

            item.innerHTML = `
                <div class="avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${avatarBg}&color=fff&rounded=false" alt="${name}">
                </div>
                <div class="chat-info">
                    <div class="chat-header-info">
                        <span class="chat-name">${name} ${groupBadge}</span>
                        <span class="chat-time">الآن</span>
                    </div>
                    <div class="chat-last-message">
                        <p>${lastMsg}</p>
                    </div>
                </div>
            `;
            chatListContainer.appendChild(item);
        });
    }

    let activeTargetUserId = null;

    function selectConversation(id, name, type, targetUserId = null) {
        activeConversationId = id;
        activeTargetUserId = targetUserId;
        document.querySelector('.chat-title-name').textContent = name;

        const addMemberBtn = document.getElementById('addMemberBtn');
        if (type === 'group') {
            addMemberBtn.style.display = 'inline-flex';
        } else {
            addMemberBtn.style.display = 'none';
        }

        // Update active class in list
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));

        // Mobile: slide to chat panel
        document.querySelector('.app-container').classList.add('chat-open');

        fetchMessages();

        // Setup polling
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchMessages, 3000);
    }

    // Back button (mobile only)
    const backToListBtn = document.getElementById('backToListBtn');
    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => {
            document.querySelector('.app-container').classList.remove('chat-open');
            if (pollInterval) clearInterval(pollInterval);
            activeConversationId = null;
        });
    }

    function fetchMessages() {
        if (!activeConversationId) return;
        fetch(`/api/conversations/${activeConversationId}/messages`)
            .then(res => res.json())
            .then(data => {
                // Destroy old wavesurfer instances before rendering new ones
                wavesurfers.forEach(ws => ws.destroy());
                wavesurfers.clear();
                
                renderMessages(data);
                
                // Initialize Wavesurfer for each audio message
                data.forEach(msg => {
                    if (msg.type === 'audio' && msg.media_url) {
                        initWavesurfer(msg.id);
                    }
                });
            });
    }

    function initWavesurfer(id) {
        const container = document.getElementById(`waveform-${id}`);
        if (!container) return;

        const ws = WaveSurfer.create({
            container: `#waveform-${id}`,
            waveColor: '#667781',
            progressColor: '#00a884',
            cursorWidth: 0,
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 40,
            url: container.dataset.url,
        });

        const icon = document.getElementById(`ws-icon-${id}`);
        const loader = document.getElementById(`ws-loader-${id}`);

        ws.on('loading', () => {
            icon.classList.add('hidden');
            loader.classList.remove('hidden');
        });

        ws.on('ready', () => {
            icon.classList.remove('hidden');
            loader.classList.add('hidden');
            const dur = ws.getDuration();
            document.getElementById(`ws-dur-${id}`).textContent = formatDuration(Math.round(dur));
        });

        ws.on('play', () => {
            icon.textContent = 'pause';
            // Stop other playing wavesurfers
            wavesurfers.forEach((otherWs, otherId) => {
                if (otherId !== id && otherWs.isPlaying()) otherWs.pause();
            });
        });

        ws.on('pause', () => icon.textContent = 'play_arrow');
        ws.on('finish', () => icon.textContent = 'play_arrow');

        wavesurfers.set(id, ws);
    }

    window.toggleWS = function(id) {
        const ws = wavesurfers.get(id);
        if (ws) ws.playPause();
    };

    function renderMessages(messages) {
        messagesContainer.innerHTML = '<div class="date-badge">اليوم</div>';
        messages.forEach(msg => {
            const isSent = msg.sender_id === currentUserId;
            const msgClass = isSent ? 'sent' : 'received';
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('div');
            item.className = `message ${msgClass} sharp-corners`;

            let contentHtml = '';
            if (msg.type === 'audio' && msg.media_url) {
                const dur = msg.duration ? formatDuration(msg.duration) : '0:00';
                const mediaUrl = msg.media_url.startsWith('data:') ? msg.media_url : `/storage/${msg.media_url}`;
                contentHtml = `
                    <div class="voice-message ws-message" id="voice-${msg.id}">
                        <button class="voice-play-btn" onclick="toggleWS(${msg.id})">
                            <span class="material-symbols-outlined" id="ws-icon-${msg.id}">play_arrow</span>
                            <div class="voice-loader hidden" id="ws-loader-${msg.id}"></div>
                        </button>
                        <div class="voice-waveform ws-waveform" id="waveform-${msg.id}" data-url="${mediaUrl}"></div>
                        <span class="voice-dur" id="ws-dur-${msg.id}">${dur}</span>
                    </div>`;
            } else if (msg.type === 'image' && msg.media_url) {
                const imgUrl = msg.media_url.startsWith('data:') ? msg.media_url : `/storage/${msg.media_url}`;
                const isLoaded = loadedImages.has(msg.id) || msg.media_url.startsWith('data:');
                contentHtml = `
                    <div class="image-wrapper" id="img-wrapper-${msg.id}">
                        <div class="image-placeholder ${isLoaded ? 'hidden' : ''}" onclick="loadFullImage('${imgUrl}', ${msg.id})">
                            <span class="material-symbols-outlined download-icon">download</span>
                            <div class="loading-spinner hidden"></div>
                        </div>
                        <img src="${isLoaded ? imgUrl : ''}" class="message-img ${isLoaded ? '' : 'hidden'}" id="img-${msg.id}" onclick="window.open(this.src)">
                    </div>
                    ${(msg.body && !msg.body.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? `<div class="message-caption">${msg.body}</div>` : ''}
                `;
            } else if (msg.type === 'video' && msg.media_url) {
                const videoUrl = msg.media_url.startsWith('data:') ? msg.media_url : `/storage/${msg.media_url}`;
                contentHtml = `
                    <video src="${videoUrl}" controls class="message-video"></video>
                    ${msg.body ? `<div class="message-caption">${msg.body}</div>` : ''}
                `;
            } else if (msg.type === 'file' && msg.media_url) {
                const fileUrl = msg.media_url.startsWith('data:') ? msg.media_url : `/storage/${msg.media_url}`;
                contentHtml = `
                    <div class="message-file">
                        <span class="material-symbols-outlined">description</span>
                        <div class="file-info">
                            <div class="file-name">${msg.body || 'ملف'}</div>
                            <a href="${fileUrl}" download class="file-download">تحميل</a>
                        </div>
                    </div>`;
            } else {
                contentHtml = `<div class="message-content">${msg.body ?? ''}</div>`;
            }

            item.innerHTML = `
                ${contentHtml}
                <div class="message-meta">
                    <span class="message-time">${time}</span>
                    ${isSent ? '<span class="material-symbols-outlined check-icon read">done_all</span>' : ''}
                </div>
            `;
            messagesContainer.appendChild(item);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatDuration(secs) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    window.loadFullImage = function (url, msgId) {
        const placeholder = document.querySelector(`#img-wrapper-${msgId} .image-placeholder`);
        const img = document.getElementById(`img-${msgId}`);
        const icon = placeholder.querySelector('.download-icon');
        const spinner = placeholder.querySelector('.loading-spinner');

        icon.classList.add('hidden');
        spinner.classList.remove('hidden');

        const tempImg = new Image();
        tempImg.onload = () => {
            loadedImages.add(msgId); // Mark as loaded
            img.src = url;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        tempImg.onerror = () => {
            icon.classList.remove('hidden');
            spinner.classList.add('hidden');
            alert('فشل تحميل الصورة');
        };
        tempImg.src = url;
    };

    function sendMessage() {
        const body = messageInput.value.trim();
        if (!body || !activeConversationId) return;

        messageInput.value = '';

        fetch(`/api/conversations/${activeConversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({ body })
        })
            .then(res => res.json())
            .then(() => {
                fetchMessages();
                fetchConversations(); // Update last message
            });
    }

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
            // Change mic icon back to mic if it was send
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        }
    });

    // ============================================
    // Voice Recording (Hold-to-Record)
    // ============================================
    let isRecordingRequested = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let recordStart = null;
    let recordingTimer = null;
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTime = document.getElementById('recordingTime');

    function startRecording() {
        if (!activeConversationId) return;
        isRecordingRequested = true;

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            if (!isRecordingRequested) {
                // User released before permission was granted
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            audioChunks = [];
            recordStart = Date.now();
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const duration = Math.round((Date.now() - recordStart) / 1000);
                if (duration < 1) return; // too short, ignore
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                uploadVoice(blob, duration);
            };
            mediaRecorder.start();

            // Show recording UI
            recordingIndicator.classList.remove('hidden');
            let secs = 0;
            recordingTimer = setInterval(() => {
                secs++;
                recordingTime.textContent = formatDuration(secs);
            }, 1000);
        }).catch(() => {
            isRecordingRequested = false;
            alert('لا يمكن الوصول إلى الميكروفون');
        });
    }

    function stopRecording() {
        isRecordingRequested = false;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder = null; // Reset for next time
        }
        recordingIndicator.classList.add('hidden');
        clearInterval(recordingTimer);
        recordingTime.textContent = '0:00';
    }

    function uploadVoice(blob, duration) {
        if (!activeConversationId) return;

        // Show "Sending" feedback
        recordingIndicator.classList.remove('hidden');
        recordingIndicator.querySelector('.rec-label').textContent = 'جاري الإرسال...';
        recordingIndicator.querySelector('.rec-dot').style.animation = 'none';
        recordingIndicator.querySelector('.rec-dot').style.backgroundColor = 'var(--primary-color)';

        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');
        formData.append('duration', duration);

        fetch(`/api/conversations/${activeConversationId}/voice`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken },
            body: formData
        })
            .then(res => {
                if (!res.ok) throw new Error('Upload failed');
                return res.json();
            })
            .then(() => {
                fetchMessages();
                fetchConversations();
            })
            .catch(err => {
                console.error(err);
                alert('فشل إرسال الرسالة الصوتية');
            })
            .finally(() => {
                recordingIndicator.classList.add('hidden');
                // Reset indicator text for next time
                recordingIndicator.querySelector('.rec-label').textContent = 'جاري التسجيل...';
                recordingIndicator.querySelector('.rec-dot').style.animation = '';
                recordingIndicator.querySelector('.rec-dot').style.backgroundColor = '';
            });
    }

    // Mic button logic
    let isRecording = false;

    function handleStartInteraction(e) {
        if (messageInput.value.trim().length > 0) return;

        // Prevent default on touch to avoid double firing with mousedown
        if (e.type === 'touchstart') {
            // iOS needs this to prevent text selection / magnifying glass
            e.preventDefault();
        }

        // Avoid starting multiple times
        if (isRecording) return;

        isRecording = true;
        sendButton.innerHTML = '<span class="material-symbols-outlined" style="color:#ef4444">stop_circle</span>';

        // Start immediately to satisfy iOS Safari's requirement for synchronous user-gesture getUserMedia
        startRecording();
    }

    function handleEndInteraction(e) {
        if (isRecording) {
            isRecording = false;
            stopRecording();
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        }
    }

    sendButton.addEventListener('mousedown', handleStartInteraction);
    sendButton.addEventListener('touchstart', handleStartInteraction, { passive: false });

    window.addEventListener('mouseup', handleEndInteraction);
    window.addEventListener('touchend', handleEndInteraction);
    window.addEventListener('touchcancel', handleEndInteraction);

    // Mic button click (if not holding)
    sendButton.addEventListener('click', (e) => {
        if (messageInput.value.trim().length > 0 && !isRecording) {
            sendMessage();
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        }
    });

    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim().length > 0) {
            sendButton.innerHTML = '<span class="material-symbols-outlined">send</span>';
        } else {
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim().length > 0) {
            sendMessage();
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        }
    });

    // Cancel recording button
    const cancelRecBtn = document.getElementById('cancelRecBtn');
    if (cancelRecBtn) {
        cancelRecBtn.addEventListener('click', () => {
            // Stop recording but discard the audio
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                // Override onstop to do nothing (discard)
                mediaRecorder.onstop = () => { };
                mediaRecorder.stop();
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(t => t.stop());
                }
            }
            isRecording = false;
            recordingIndicator.classList.add('hidden');
            clearInterval(recordingTimer);
            recordingTime.textContent = '0:00';
            sendButton.innerHTML = '<span class="material-symbols-outlined">mic</span>';
        });
    }

    // Modals Logic
    const newChatBtn = document.querySelector('button[title="محادثة جديدة"]');
    const newGroupBtn = document.querySelector('button[title="إنشاء مجموعة"]');
    const newChatModal = document.getElementById('newChatModal');
    const newGroupModal = document.getElementById('newGroupModal');

    newChatBtn.addEventListener('click', () => newChatModal.classList.remove('hidden'));
    newGroupBtn.addEventListener('click', () => newGroupModal.classList.remove('hidden'));

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal-overlay').classList.add('hidden');
        });
    });

    const addMemberBtn = document.getElementById('addMemberBtn');
    const addMemberModal = document.getElementById('addMemberModal');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => addMemberModal.classList.remove('hidden'));
    }

    document.getElementById('confirmAddMemberBtn').addEventListener('click', () => {
        const email = document.getElementById('addMemberEmail').value;
        const errDiv = document.getElementById('addMemberError');
        errDiv.classList.add('hidden');

        if (!email) return;

        fetch(`/api/conversations/${activeConversationId}/add-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ email })
        }).then(res => res.json()).then(data => {
            if (data.error) {
                errDiv.textContent = data.error;
                errDiv.classList.remove('hidden');
            } else {
                addMemberModal.classList.add('hidden');
                document.getElementById('addMemberEmail').value = '';
                // Optionally show a success message
            }
        });
    });

    // Attachments Logic
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const previewModal = document.getElementById('previewModal');
    const previewBody = document.getElementById('previewBody');
    const closePreview = document.getElementById('closePreview');
    const sendPreview = document.getElementById('sendPreview');
    const fileCaptionInput = document.getElementById('fileCaption');
    let pendingFile = null;

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                pendingFile = fileInput.files[0];
                showFilePreview(pendingFile);
                fileInput.value = ''; // Reset input
            }
        });
    }

    function showFilePreview(file) {
        previewBody.innerHTML = '';
        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewBody.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.autoplay = true;
            previewBody.appendChild(video);
        } else {
            // Document or other file
            previewBody.innerHTML = `
                <div style="text-align:center; color:white;">
                    <span class="material-symbols-outlined" style="font-size:100px;">description</span>
                    <p style="margin-top:10px;">${file.name}</p>
                </div>`;
        }

        fileCaptionInput.value = '';
        previewModal.classList.remove('hidden');
    }

    if (closePreview) {
        closePreview.addEventListener('click', () => {
            previewModal.classList.add('hidden');
            pendingFile = null;
        });
    }

    if (sendPreview) {
        sendPreview.addEventListener('click', () => {
            if (pendingFile) {
                uploadFile(pendingFile, fileCaptionInput.value);
                previewModal.classList.add('hidden');
                pendingFile = null;
            }
        });
    }

    function uploadFile(file, caption = '') {
        if (!activeConversationId) return;

        // Show loading state in preview modal if possible, or just an alert
        console.log('Starting upload for:', file.name);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', caption);

        // Make sure activeConversationId is valid
        if (!activeConversationId) {
            alert('يرجى اختيار محادثة أولاً');
            return;
        }

        // Use absolute path to avoid ambiguity
        const uploadUrl = window.location.origin + '/api/conversations/' + activeConversationId + '/files';

        fetch(uploadUrl, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken },
            body: formData
        })
            .then(async res => {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || data.message || ('خطأ ' + res.status));
                    return data;
                } else {
                    const text = await res.text();
                    console.error('Server error response:', text);
                    throw new Error('فشل السيرفر في الرفع (خطأ ' + res.status + '). قد يكون الملف كبيراً جداً.');
                }
            })
            .then(() => {
                console.log('Upload successful');
                fetchMessages();
                fetchConversations();
            })
            .catch(err => {
                console.error('Upload Error:', err);
                alert('خطأ في الرفع: ' + err.message);
            });
    }

    // Emoji Logic
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-picker hidden';
    emojiPicker.innerHTML = `
        <div class="emoji-grid">
            ${['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾', '🤲', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '💍', '💄', '💋', '👄', '👅', '👂', '🦻', '👃', '👣', '👁', '👀', '🧠', '🦴', '🦷', '🗣', '👤', '👥']
            .map(e => `<span>${e}</span>`).join('')}
        </div>
    `;
    // Append to chat-footer for relative positioning
    const chatFooter = document.querySelector('.chat-footer');
    if (chatFooter) chatFooter.appendChild(emojiPicker);

    if (emojiBtn) {
        emojiBtn.addEventListener('click', (e) => {
            emojiPicker.classList.toggle('hidden');
            e.stopPropagation();
        });
    }

    emojiPicker.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            messageInput.value += e.target.textContent;
            messageInput.focus();
            messageInput.dispatchEvent(new Event('input'));
        }
    });

    window.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.classList.add('hidden');
        }
    });

    document.getElementById('startNewChatBtn').addEventListener('click', () => {
        const email = document.getElementById('newChatEmail').value;
        const errDiv = document.getElementById('newChatError');
        errDiv.classList.add('hidden');

        fetch('/api/conversations/direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ email })
        }).then(res => res.json()).then(data => {
            if (data.error) {
                errDiv.textContent = data.error;
                errDiv.classList.remove('hidden');
            } else {
                newChatModal.classList.add('hidden');
                document.getElementById('newChatEmail').value = '';
                fetchConversations();
                selectConversation(data.id, email);
            }
        });
    });

    document.getElementById('startNewGroupBtn').addEventListener('click', () => {
        const name = document.getElementById('newGroupName').value;
        const errDiv = document.getElementById('newGroupError');
        errDiv.classList.add('hidden');

        if (!name) return;

        fetch('/api/conversations/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ name })
        }).then(res => res.json()).then(data => {
            if (data.error) {
                errDiv.textContent = data.error;
                errDiv.classList.remove('hidden');
            } else {
                newGroupModal.classList.add('hidden');
                document.getElementById('newGroupName').value = '';
                fetchConversations();
                selectConversation(data.id, name);
            }
        });
    });

    // Initial load
    fetchConversations();

    // ============================================
    // Right-click Context Menu for Conversations
    // ============================================
    const contextMenu = document.getElementById('chatContextMenu');
    let contextConversationId = null;

    // Show context menu on right-click on chat item
    document.getElementById('chatList').addEventListener('contextmenu', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (!chatItem) return;
        e.preventDefault();
        contextConversationId = chatItem.dataset.convId;

        // Position the menu at the click point
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.classList.remove('hidden');
    });

    // Hide context menu when clicking anywhere else
    document.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });
    document.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('#chatList')) {
            contextMenu.classList.add('hidden');
        }
    });

    // Delete conversation button
    document.getElementById('deleteConvBtn').addEventListener('click', () => {
        if (!contextConversationId) return;
        contextMenu.classList.add('hidden');

        const label = document.querySelector(`.chat-item[data-conv-id="${contextConversationId}"] .chat-name`)?.textContent || 'هذه المحادثة';
        if (!confirm(`هل تريد حذف "${label}"؟`)) return;

        fetch(`/api/conversations/${contextConversationId}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': csrfToken }
        }).then(res => res.json()).then(data => {
            if (data.success) {
                // If the deleted conversation was open, reset the main area
                if (parseInt(contextConversationId) === activeConversationId) {
                    activeConversationId = null;
                    if (pollInterval) clearInterval(pollInterval);
                    document.querySelector('.chat-title-name').textContent = '';
                    document.querySelector('.chat-status').textContent = '';
                    document.getElementById('messagesContainer').innerHTML = `
                        <div class="empty-chat-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);text-align:center;">
                            <span class="material-symbols-outlined" style="font-size:64px;margin-bottom:20px;opacity:0.5;">chat</span>
                            <h2>لا توجد محادثة مفتوحة</h2>
                            <p>اضغط على أيقونة المحادثة الجديدة للبدء.</p>
                        </div>`;
                }
                fetchConversations();
                contextConversationId = null;
            }
        });
    });
    // WebRTC Voice Calling via PeerJS
    // ============================================
    const peer = new Peer("chat_app_demo_user_" + currentUserId);
    let currentCall = null;
    let localStream = null;

    const incomingModal = document.getElementById("incomingCallModal");
    const activeModal = document.getElementById("activeCallModal");
    const remoteAudio = document.getElementById("remoteAudio");

    // UI Elements
    const incomingCallerName = document.getElementById("incomingCallerName");
    const activeCallName = document.getElementById("activeCallName");
    const activeCallStatus = document.getElementById("activeCallStatus");

    let callDurationInterval = null;

    function startCallDuration() {
        let secs = 0;
        activeCallStatus.textContent = "0:00";
        callDurationInterval = setInterval(() => {
            secs++;
            const mins = Math.floor(secs / 60);
            const rSecs = secs % 60;
            activeCallStatus.textContent = `${mins}:${rSecs.toString().padStart(2, "0")}`;
        }, 1000);
    }

    function stopCallDuration() {
        clearInterval(callDurationInterval);
    }

    function cleanupCall() {
        if (currentCall) {
            currentCall.close();
            currentCall = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        stopCallDuration();
        if (activeModal) activeModal.classList.add("hidden");
        if (incomingModal) incomingModal.classList.add("hidden");
        if (remoteAudio) remoteAudio.srcObject = null;
    }

    // Handle incoming call
    peer.on("call", (call) => {
        // Extract caller ID
        const callerId = parseInt(call.peer.replace("chat_app_demo_user_", ""));
        if (incomingCallerName) incomingCallerName.textContent = "مكالمة واردة"; // Fallback

        if (incomingModal) incomingModal.classList.remove("hidden");

        const acceptBtn = document.getElementById("acceptCallBtn");
        if (acceptBtn) {
            acceptBtn.onclick = () => {
                incomingModal.classList.add("hidden");
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert("ميزة المكالمات غير مدعومة في هذا المتصفح أو تتطلب اتصالاً آمناً (HTTPS / Localhost).");
                    call.close();
                    return;
                }

                navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                    localStream = stream;
                    call.answer(stream);
                    setupCallEvents(call);
                }).catch(err => {
                    alert("لا يمكن الوصول إلى الميكروفون. يرجى إعطاء الصلاحية.");
                    call.close();
                });
            };
        }

        const declineBtn = document.getElementById("declineCallBtn");
        if (declineBtn) {
            declineBtn.onclick = () => {
                incomingModal.classList.add("hidden");
                call.close();
            };
        }
    });

    function setupCallEvents(call) {
        currentCall = call;
        if (activeModal) activeModal.classList.remove("hidden");
        if (activeCallName) activeCallName.textContent = "مكالمة صوتية";
        if (activeCallStatus) activeCallStatus.textContent = "جاري الاتصال...";

        call.on("stream", (remoteStream) => {
            if (remoteAudio) remoteAudio.srcObject = remoteStream;
            startCallDuration();
        });

        call.on("close", () => {
            cleanupCall();
        });

        call.on("error", () => {
            alert("حدث خطأ في المكالمة");
            cleanupCall();
        });
    }

    // Initiate call
    const callBtns = Array.from(document.querySelectorAll(".header-actions span"));
    const phoneBtn = callBtns.find(el => el.textContent.trim() === "call");

    if (phoneBtn) {
        phoneBtn.addEventListener("click", () => {
            if (!activeConversationId || !activeTargetUserId) {
                alert("لا يمكن الاتصال (يرجى اختيار محادثة فردية أولاً)");
                return;
            }

            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                localStream = stream;
                const targetPeerId = "chat_app_demo_user_" + activeTargetUserId;
                const call = peer.call(targetPeerId, stream);
                setupCallEvents(call);
            }).catch(err => {
            }).then(res => res.json()).then(data => {
                if (data.error) {
                    errDiv.textContent = data.error;
                    errDiv.classList.remove('hidden');
                } else {
                    newGroupModal.classList.add('hidden');
                    document.getElementById('newGroupName').value = '';
                    fetchConversations();
                    selectConversation(data.id, name);
                }
            });
        });

        // Initial load
        fetchConversations();

        // ============================================
        // Right-click Context Menu for Conversations
        // ============================================
        const contextMenu = document.getElementById('chatContextMenu');
        let contextConversationId = null;

        // Show context menu on right-click on chat item
        document.getElementById('chatList').addEventListener('contextmenu', (e) => {
            const chatItem = e.target.closest('.chat-item');
            if (!chatItem) return;
            e.preventDefault();
            contextConversationId = chatItem.dataset.convId;

            // Position the menu at the click point
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.classList.remove('hidden');
        });

        // Hide context menu when clicking anywhere else
        document.addEventListener('click', () => {
            contextMenu.classList.add('hidden');
        });
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('#chatList')) {
                contextMenu.classList.add('hidden');
            }
        });

        // Delete conversation button
        document.getElementById('deleteConvBtn').addEventListener('click', () => {
            if (!contextConversationId) return;
            contextMenu.classList.add('hidden');

            const label = document.querySelector(`.chat-item[data-conv-id="${contextConversationId}"] .chat-name`)?.textContent || 'هذه المحادثة';
            if (!confirm(`هل تريد حذف "${label}"؟`)) return;

            fetch(`/api/conversations/${contextConversationId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': csrfToken }
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    // If the deleted conversation was open, reset the main area
                    if (parseInt(contextConversationId) === activeConversationId) {
                        activeConversationId = null;
                        if (pollInterval) clearInterval(pollInterval);
                        document.querySelector('.chat-title-name').textContent = '';
                        document.querySelector('.chat-status').textContent = '';
                        document.getElementById('messagesContainer').innerHTML = `
                        <div class="empty-chat-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);text-align:center;">
                            <span class="material-symbols-outlined" style="font-size:64px;margin-bottom:20px;opacity:0.5;">chat</span>
                            <h2>لا توجد محادثة مفتوحة</h2>
                            <p>اضغط على أيقونة المحادثة الجديدة للبدء.</p>
                        </div>`;
                    }
                    fetchConversations();
                    contextConversationId = null;
                }
            });
        });

        // ============================================
        // WebRTC Voice Calling via PeerJS
        // ============================================
        const peer = new Peer("chat_app_demo_user_" + currentUserId);
        let currentCall = null;
        let localStream = null;

        const incomingModal = document.getElementById("incomingCallModal");
        const activeModal = document.getElementById("activeCallModal");
        const remoteAudio = document.getElementById("remoteAudio");

        // UI Elements
        const incomingCallerName = document.getElementById("incomingCallerName");
        const activeCallName = document.getElementById("activeCallName");
        const activeCallStatus = document.getElementById("activeCallStatus");

        let callDurationInterval = null;

        function startCallDuration() {
            let secs = 0;
            activeCallStatus.textContent = "0:00";
            callDurationInterval = setInterval(() => {
                secs++;
                const mins = Math.floor(secs / 60);
                const rSecs = secs % 60;
                activeCallStatus.textContent = `${mins}:${rSecs.toString().padStart(2, "0")}`;
            }, 1000);
        }

        function stopCallDuration() {
            clearInterval(callDurationInterval);
        }

        function cleanupCall() {
            if (currentCall) {
                currentCall.close();
                currentCall = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            stopCallDuration();
            if (activeModal) activeModal.classList.add("hidden");
            if (incomingModal) incomingModal.classList.add("hidden");
            if (remoteAudio) remoteAudio.srcObject = null;
        }

        // Handle incoming call
        peer.on("call", (call) => {
            // Extract caller ID
            const callerId = parseInt(call.peer.replace("chat_app_demo_user_", ""));
            if (incomingCallerName) incomingCallerName.textContent = "مكالمة واردة"; // Fallback

            if (incomingModal) incomingModal.classList.remove("hidden");

            const acceptBtn = document.getElementById("acceptCallBtn");
            if (acceptBtn) {
                acceptBtn.onclick = () => {
                    incomingModal.classList.add("hidden");
                    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                        localStream = stream;
                        call.answer(stream);
                        setupCallEvents(call);
                    }).catch(err => {
                        alert("لا يمكن الوصول إلى الميكروفون");
                        call.close();
                    });
                };
            }

            const declineBtn = document.getElementById("declineCallBtn");
            if (declineBtn) {
                declineBtn.onclick = () => {
                    incomingModal.classList.add("hidden");
                    call.close();
                };
            }
        });

        function setupCallEvents(call) {
            currentCall = call;
            if (activeModal) activeModal.classList.remove("hidden");
            if (activeCallName) activeCallName.textContent = "مكالمة صوتية";
            if (activeCallStatus) activeCallStatus.textContent = "جاري الاتصال...";

            call.on("stream", (remoteStream) => {
                if (remoteAudio) remoteAudio.srcObject = remoteStream;
                startCallDuration();
            });

            call.on("close", () => {
                cleanupCall();
            });

            call.on("error", () => {
                alert("حدث خطأ في المكالمة");
                cleanupCall();
            });
        }

        // Initiate call
        const callBtns = Array.from(document.querySelectorAll(".chat-header .actions button"));
        const phoneBtn = callBtns.find(btn => btn.querySelector('span')?.textContent.trim() === "call");

        if (phoneBtn) {
            phoneBtn.addEventListener("click", () => {
                if (!activeConversationId || !activeTargetUserId) {
                    alert("لا يمكن الاتصال (يرجى اختيار محادثة فردية أولاً)");
                    return;
                }

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert("ميزة المكالمات غير مدعومة في هذا المتصفح أو تتطلب اتصالاً آمناً (HTTPS / Localhost).");
                    return;
                }

                navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                    localStream = stream;
                    const targetPeerId = "chat_app_demo_user_" + activeTargetUserId;
                    const call = peer.call(targetPeerId, stream);
                    setupCallEvents(call);
                }).catch(err => {
                    alert("لا يمكن الوصول إلى الميكروفون. يرجى إعطاء الصلاحية.");
                });
            });
        }

        const endBtn = document.getElementById("endCallBtn");
        if (endBtn) {
            endBtn.addEventListener("click", () => {
                cleanupCall();
            });
        }

    }
});
