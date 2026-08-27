// التحكم في صفحة المحادثة
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // عرض معلومات المستخدم
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userUsername').textContent = '@' + currentUser.username;
    
    if (currentUser.avatar) {
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('userAvatar').onerror = function() {
            this.src = 'https://via.placeholder.com/50';
        };
    } else {
        document.getElementById('userAvatar').src = 'https://via.placeholder.com/50';
    }
    
    // تحميل قائمة المحادثات
    firebaseChat.loadUsers();
    
    // عداد الضغطات على البروفايل
    let profileClickCount = 0;
    let profileClickTimer = null;
    
    document.getElementById('userProfile').addEventListener('click', function() {
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
                alert(`❌ المستخدم @${searchInput} غير موجود في FB Chat ولا تيليجرام`);
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
        
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
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
    
    // إغلاق القائمة المنسدلة عند النقر خارجها
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('dropdownMenu');
        const dots = document.querySelector('.menu-dots');
        
        if (menu && dots && !menu.contains(e.target) && !dots.contains(e.target)) {
            menu.classList.remove('show');
        }
    });
    
    // تحديث قائمة المحادثات كل 30 ثانية
    setInterval(() => {
        if (!document.hidden) {
            firebaseChat.loadUsers();
        }
    }, 30000);
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            firebaseChat.loadUsers();
        }
    });
});

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
});
