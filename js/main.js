// التحكم الرئيسي في صفحة تسجيل الدخول
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود جلسة
    const currentUser = localStorage.getItem('fb_chat_current_user');
    if (currentUser) {
        window.location.href = 'chat.html';
        return;
    }
    
    // التنقل بين النماذج
    document.getElementById('showRegister').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginMessage').innerHTML = '';
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerMessage').innerHTML = '';
    });
    
    // معالجة تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        const messageDiv = document.getElementById('loginMessage');
        const loginBtn = document.querySelector('.btn-login');
        
        messageDiv.innerHTML = '⏳ جاري تسجيل الدخول...';
        loginBtn.disabled = true;
        
        const result = await firebaseAuth.loginUser(username, password);
        
        if (result.success) {
            if (rememberMe) {
                localStorage.setItem('fb_chat_remember', JSON.stringify({ username, password }));
            } else {
                localStorage.removeItem('fb_chat_remember');
            }
            
            messageDiv.innerHTML = '✅ تم تسجيل الدخول بنجاح!';
            messageDiv.style.color = 'green';
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            messageDiv.innerHTML = `❌ ${result.error}`;
            messageDiv.style.color = 'red';
            loginBtn.disabled = false;
        }
    });
    
    // معالجة التسجيل
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('regName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const telegramUsername = document.getElementById('regTelegram').value.trim();
        const password = document.getElementById('regPassword').value;
        const avatarFile = document.getElementById('regAvatar').files[0];
        
        const messageDiv = document.getElementById('registerMessage');
        const registerBtn = document.querySelector('.btn-register');
        
        // التحقق من صحة البيانات
        if (username.length < 3) {
            messageDiv.innerHTML = '❌ اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
            messageDiv.style.color = 'red';
            return;
        }
        
        if (password.length < 6) {
            messageDiv.innerHTML = '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل';
            messageDiv.style.color = 'red';
            return;
        }
        
        messageDiv.innerHTML = '⏳ جاري إنشاء الحساب...';
        registerBtn.disabled = true;
        
        // معالجة الصورة
        let avatar = '';
        if (avatarFile) {
            avatar = await readFileAsDataURL(avatarFile);
        }
        
        const userData = {
            name,
            username,
            telegram_username: telegramUsername,
            password,
            avatar
        };
        
        const result = await firebaseAuth.registerUser(userData);
        
        if (result.success) {
            messageDiv.innerHTML = '✅ تم إنشاء الحساب بنجاح!';
            messageDiv.style.color = 'green';
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            messageDiv.innerHTML = `❌ ${result.error}`;
            messageDiv.style.color = 'red';
            registerBtn.disabled = false;
        }
    });
    
    // استرجاع بيانات "تذكرني"
    const remembered = localStorage.getItem('fb_chat_remember');
    if (remembered) {
        const data = JSON.parse(remembered);
        document.getElementById('username').value = data.username;
        document.getElementById('password').value = data.password;
        document.getElementById('rememberMe').checked = true;
    }
});

// قراءة الصورة وتحويلها إلى Base64
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}