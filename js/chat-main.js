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
    } else {
        document.getElementById('userAvatar').src = 'https://via.placeholder.com/80';
    }
    
    // تحميل قائمة المستخدمين
    firebaseChat.loadUsers();
    
    // البحث عن مستخدم
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
    
    // إرسال بالضغط على Enter
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // تحديث قائمة المستخدمين كل 30 ثانية
    setInterval(() => {
        firebaseChat.loadUsers();
    }, 30000);
});

// تسجيل الخروج
function logout() {
    localStorage.removeItem('fb_chat_current_user');
    localStorage.removeItem('fb_chat_remember');
    window.location.href = 'index.html';
}