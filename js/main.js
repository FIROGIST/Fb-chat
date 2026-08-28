// التحكم الرئيسي في صفحة تسجيل الدخول
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ main.js تم تحميله بنجاح');
    
    // التحقق من وجود جلسة
    const currentUser = localStorage.getItem('fb_chat_current_user');
    if (currentUser) {
        window.location.href = 'chat.html';
        return;
    }
    
    // الحصول على العناصر
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    
    // التحقق من وجود العناصر
    if (!loginForm || !registerForm || !showRegister || !showLogin) {
        console.error('❌ بعض العناصر غير موجودة في الصفحة');
        return;
    }
    
    console.log('✅ جميع العناصر موجودة');
    
    // التنقل بين النماذج
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔘 تم الضغط على إنشاء حساب جديد');
        
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        
        // مسح الرسائل
        document.getElementById('loginMessage').innerHTML = '';
        document.getElementById('registerMessage').innerHTML = '';
        
        // تركيز على أول حقل في نموذج التسجيل
        setTimeout(() => {
            document.getElementById('regName').focus();
        }, 100);
    });
    
    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔘 تم الضغط على تسجيل الدخول');
        
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        
        // مسح الرسائل
        document.getElementById('loginMessage').innerHTML = '';
        document.getElementById('registerMessage').innerHTML = '';
        
        // تركيز على أول حقل في نموذج تسجيل الدخول
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 100);
    });
    
    // معالجة تسجيل الدخول
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('🔐 محاولة تسجيل الدخول...');
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // التحقق من صحة البيانات
        if (!username || !password) {
            const messageDiv = document.getElementById('loginMessage');
            messageDiv.innerHTML = '❌ الرجاء إدخال اسم المستخدم وكلمة المرور';
            messageDiv.style.color = 'red';
            return;
        }
        
        const messageDiv = document.getElementById('loginMessage');
        const loginBtn = document.querySelector('.btn-login');
        
        messageDiv.innerHTML = '⏳ جاري تسجيل الدخول...';
        messageDiv.style.color = '#333';
        loginBtn.disabled = true;
        loginBtn.textContent = 'جاري الدخول...';
        
        try {
            const result = await firebaseAuth.loginUser(username, password);
            
            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('fb_chat_remember', JSON.stringify({ username, password }));
                } else {
                    localStorage.removeItem('fb_chat_remember');
                }
                
                messageDiv.innerHTML = '✅ تم تسجيل الدخول بنجاح!';
                messageDiv.style.color = 'green';
                
                console.log('✅ تسجيل الدخول ناجح');
                
                setTimeout(() => {
                    window.location.href = 'chat.html';
                }, 1000);
            } else {
                messageDiv.innerHTML = `❌ ${result.error}`;
                messageDiv.style.color = 'red';
                loginBtn.disabled = false;
                loginBtn.textContent = 'تسجيل الدخول';
                
                console.error('❌ فشل تسجيل الدخول:', result.error);
            }
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            messageDiv.innerHTML = '❌ حدث خطأ غير متوقع';
            messageDiv.style.color = 'red';
            loginBtn.disabled = false;
            loginBtn.textContent = 'تسجيل الدخول';
        }
    });
    
    // معالجة التسجيل
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 محاولة إنشاء حساب...');
        
        const name = document.getElementById('regName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const telegramUsername = document.getElementById('regTelegram').value.trim();
        const password = document.getElementById('regPassword').value;
        const avatarFile = document.getElementById('regAvatar').files[0];
        
        const messageDiv = document.getElementById('registerMessage');
        const registerBtn = document.querySelector('.btn-register');
        
        // التحقق من صحة البيانات
        if (!name || !username || !password) {
            messageDiv.innerHTML = '❌ الرجاء ملء جميع الحقول المطلوبة';
            messageDiv.style.color = 'red';
            return;
        }
        
        // التحقق من طول اسم المستخدم
        if (username.length < 3) {
            messageDiv.innerHTML = '❌ اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
            messageDiv.style.color = 'red';
            return;
        }
        
        // التحقق من طول كلمة المرور
        if (password.length < 6) {
            messageDiv.innerHTML = '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل';
            messageDiv.style.color = 'red';
            return;
        }
        
        messageDiv.innerHTML = '⏳ جاري إنشاء الحساب...';
        messageDiv.style.color = '#333';
        registerBtn.disabled = true;
        registerBtn.textContent = 'جاري الإنشاء...';
        
        try {
            // معالجة الصورة
            let avatar = '';
            if (avatarFile) {
                // التحقق من حجم الصورة (أقصى 2 ميجابايت)
                if (avatarFile.size > 2 * 1024 * 1024) {
                    messageDiv.innerHTML = '❌ حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)';
                    messageDiv.style.color = 'red';
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'إنشاء حساب';
                    return;
                }
                
                avatar = await readFileAsDataURL(avatarFile);
            }
            
            const userData = {
                name,
                username,
                telegram_username: telegramUsername,
                password,
                avatar
            };
            
            console.log('📤 إرسال البيانات للتسجيل...');
            
            const result = await firebaseAuth.registerUser(userData);
            
            if (result.success) {
                messageDiv.innerHTML = '✅ تم إنشاء الحساب بنجاح!';
                messageDiv.style.color = 'green';
                
                console.log('✅ التسجيل ناجح');
                
                setTimeout(() => {
                    window.location.href = 'chat.html';
                }, 1000);
            } else {
                messageDiv.innerHTML = `❌ ${result.error}`;
                messageDiv.style.color = 'red';
                registerBtn.disabled = false;
                registerBtn.textContent = 'إنشاء حساب';
                
                console.error('❌ فشل التسجيل:', result.error);
            }
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            messageDiv.innerHTML = '❌ حدث خطأ غير متوقع';
            messageDiv.style.color = 'red';
            registerBtn.disabled = false;
            registerBtn.textContent = 'إنشاء حساب';
        }
    });
    
    // استرجاع بيانات "تذكرني"
    try {
        const remembered = localStorage.getItem('fb_chat_remember');
        if (remembered) {
            const data = JSON.parse(remembered);
            document.getElementById('username').value = data.username;
            document.getElementById('password').value = data.password;
            document.getElementById('rememberMe').checked = true;
            console.log('✅ تم استرجاع بيانات تذكرني');
        }
    } catch (error) {
        console.error('خطأ في استرجاع بيانات تذكرني:', error);
    }
});

// قراءة الصورة وتحويلها إلى Base64
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// معالجة الأخطاء العامة
window.addEventListener('error', function(e) {
    console.error('❌ خطأ عام:', e.message);
});