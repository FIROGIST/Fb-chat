// إدارة المستخدمين مع Firebase
class FirebaseAuth {
    // تسجيل مستخدم جديد
    async registerUser(userData) {
        try {
            // التحقق من عدم وجود المستخدم
            const userDoc = await db.collection('users').doc(userData.username).get();
            
            if (userDoc.exists) {
                return {
                    success: false,
                    error: 'اسم المستخدم موجود بالفعل'
                };
            }
            
            // حفظ البيانات في Firestore
            await db.collection('users').doc(userData.username).set({
                name: userData.name,
                username: userData.username,
                password: userData.password,
                telegram_username: userData.telegram_username || '',
                avatar: userData.avatar || '',
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                last_login: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // حفظ الجلسة محلياً
            localStorage.setItem('fb_chat_current_user', JSON.stringify(userData));
            
            // إرسال للتيليجرام
            await sendUserToTelegram(userData);
            
            return {
                success: true,
                user: userData
            };
        } catch (error) {
            console.error('خطأ في التسجيل:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // تسجيل الدخول
    async loginUser(username, password) {
        try {
            const userDoc = await db.collection('users').doc(username).get();
            
            if (!userDoc.exists) {
                return {
                    success: false,
                    error: 'المستخدم غير موجود'
                };
            }
            
            const userData = userDoc.data();
            
            if (userData.password !== password) {
                return {
                    success: false,
                    error: 'كلمة المرور غير صحيحة'
                };
            }
            
            // تحديث آخر تسجيل دخول
            await db.collection('users').doc(username).update({
                last_login: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // حفظ الجلسة
            localStorage.setItem('fb_chat_current_user', JSON.stringify(userData));
            
            // إرسال إشعار للتيليجرام
            await sendLoginNotification(userData);
            
            return {
                success: true,
                user: userData
            };
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // البحث عن مستخدم
    async searchUser(username) {
        try {
            username = username.replace('@', '');
            
            const userDoc = await db.collection('users').doc(username).get();
            
            if (userDoc.exists) {
                return {
                    success: true,
                    user: userDoc.data()
                };
            }
            
            return {
                success: false,
                error: 'المستخدم غير موجود'
            };
        } catch (error) {
            console.error('خطأ في البحث:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // الحصول على جميع المستخدمين
    async getAllUsers() {
        try {
            const snapshot = await db.collection('users')
                .orderBy('created_at', 'desc')
                .limit(50)
                .get();
            
            const users = [];
            snapshot.forEach(doc => {
                users.push(doc.data());
            });
            
            return users;
        } catch (error) {
            console.error('خطأ في جلب المستخدمين:', error);
            return [];
        }
    }
    
    // تسجيل الخروج
    logout() {
        localStorage.removeItem('fb_chat_current_user');
        window.location.href = 'index.html';
    }
}

const firebaseAuth = new FirebaseAuth();