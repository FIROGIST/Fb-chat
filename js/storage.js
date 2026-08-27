// إدارة التخزين المحلي
class LocalStorage {
    constructor() {
        this.storageKey = 'fb_chat_users';
        this.currentUserKey = 'fb_chat_current_user';
    }
    
    // حفظ بيانات المستخدم
    saveUser(userData) {
        let users = this.getAllUsers();
        const existingIndex = users.findIndex(u => u.username === userData.username);
        
        if (existingIndex !== -1) {
            users[existingIndex] = { ...users[existingIndex], ...userData };
        } else {
            users.push(userData);
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(users));
        return true;
    }
    
    // الحصول على جميع المستخدمين
    getAllUsers() {
        const users = localStorage.getItem(this.storageKey);
        return users ? JSON.parse(users) : [];
    }
    
    // البحث عن مستخدم
    findUser(username, password) {
        const users = this.getAllUsers();
        return users.find(u => u.username === username && u.password === password);
    }
    
    // حفظ الجلسة الحالية
    saveCurrentUser(userData) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(userData));
    }
    
    // الحصول على المستخدم الحالي
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }
    
    // تسجيل الخروج
    clearCurrentUser() {
        localStorage.removeItem(this.currentUserKey);
    }
    
    // حفظ تفضيل "تذكرني"
    saveRememberMe(username, password) {
        localStorage.setItem('fb_chat_remember', JSON.stringify({ username, password }));
    }
    
    // الحصول على بيانات "تذكرني"
    getRememberMe() {
        const data = localStorage.getItem('fb_chat_remember');
        return data ? JSON.parse(data) : null;
    }
    
    // مسح بيانات "تذكرني"
    clearRememberMe() {
        localStorage.removeItem('fb_chat_remember');
    }
}

const storage = new LocalStorage();