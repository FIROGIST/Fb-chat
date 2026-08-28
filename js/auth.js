// إدارة المستخدمين مع Firebase
class FirebaseAuth {
    // تسجيل مستخدم جديد
    async registerUser(userData) {
        try {
            const userDoc = await db.collection('users').doc(userData.username).get();
            
            if (userDoc.exists) {
                return {
                    success: false,
                    error: 'اسم المستخدم موجود بالفعل'
                };
            }
            
            await db.collection('users').doc(userData.username).set({
                name: userData.name,
                username: userData.username,
                password: userData.password,
                telegram_username: userData.telegram_username || '',
                avatar: userData.avatar || '',
                chat_partners: [],
                hidden_chats: [],
                is_online: false,
                last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                last_username_change: null,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                last_login: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            localStorage.setItem('fb_chat_current_user', JSON.stringify(userData));
            
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
            
            await db.collection('users').doc(username).update({
                last_login: firebase.firestore.FieldValue.serverTimestamp(),
                is_online: true
            });
            
            // تحديث الجلسة مع كل البيانات
            const fullUserData = {
                ...userData,
                password: password
            };
            
            localStorage.setItem('fb_chat_current_user', JSON.stringify(fullUserData));
            
            await sendLoginNotification(fullUserData);
            
            return {
                success: true,
                user: fullUserData
            };
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // تحديث الصورة الشخصية
    async updateAvatar(username, avatarDataUrl) {
        try {
            await db.collection('users').doc(username).update({
                avatar: avatarDataUrl
            });
            
            const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
            currentUser.avatar = avatarDataUrl;
            localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
            
            return {
                success: true,
                avatar: avatarDataUrl
            };
        } catch (error) {
            console.error('خطأ في تحديث الصورة:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // تحديث الاسم
    async updateName(username, newName) {
        try {
            await db.collection('users').doc(username).update({
                name: newName
            });
            
            const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
            currentUser.name = newName;
            localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
            
            return {
                success: true,
                name: newName
            };
        } catch (error) {
            console.error('خطأ في تحديث الاسم:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // تحديث اسم المستخدم
    async updateUsername(oldUsername, newUsername) {
        try {
            // التحقق من عدم وجود المستخدم الجديد
            const existingUser = await db.collection('users').doc(newUsername).get();
            if (existingUser.exists) {
                return {
                    success: false,
                    error: 'اسم المستخدم موجود بالفعل'
                };
            }
            
            // الحصول على بيانات المستخدم القديم
            const oldUserDoc = await db.collection('users').doc(oldUsername).get();
            const oldUserData = oldUserDoc.data();
            
            // إنشاء مستند جديد بالبيانات
            await db.collection('users').doc(newUsername).set({
                ...oldUserData,
                username: newUsername,
                last_username_change: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // حذف المستند القديم
            await db.collection('users').doc(oldUsername).delete();
            
            // تحديث الجلسة المحلية
            const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
            currentUser.username = newUsername;
            currentUser.last_username_change = new Date().toISOString();
            localStorage.setItem('fb_chat_current_user', JSON.stringify(currentUser));
            
            return {
                success: true,
                username: newUsername
            };
        } catch (error) {
            console.error('خطأ في تحديث اسم المستخدم:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // التحقق من إمكانية تغيير اليوزرنيم
    canChangeUsername(userData) {
        if (!userData.last_username_change) {
            return { can: true, daysLeft: 0 };
        }
        
        const lastChange = new Date(userData.last_username_change);
        const now = new Date();
        const diffDays = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 7) {
            return { can: true, daysLeft: 0 };
        }
        
        return { can: false, daysLeft: 7 - diffDays };
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
    async logout() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
            if (currentUser) {
                await db.collection('users').doc(currentUser.username).update({
                    is_online: false,
                    last_seen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('خطأ في تحديث الحالة:', error);
        }
        
        localStorage.removeItem('fb_chat_current_user');
        window.location.href = 'index.html';
    }
}

const firebaseAuth = new FirebaseAuth();
