// إدارة تيليجرام
const BOT_TOKEN = '8941299403:AAGTMnpCSrScnk3fJSBMo0Sv4e6JhH38JFg';
const ADMIN_ID = '5511952564';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// إرسال بيانات مستخدم جديد للبوت
async function sendUserToTelegram(userData) {
    const message = `
👤 *مستخدم جديد في FB Chat*

📝 *الاسم:* ${userData.name}
🔑 *اليوزرنيم:* @${userData.username}
📱 *تيليجرام:* ${userData.telegram_username ? '@' + userData.telegram_username : 'غير محدد'}
📅 *التاريخ:* ${new Date().toLocaleString('ar')}
    `;
    
    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('خطأ في إرسال البيانات:', error);
        return null;
    }
}

// البحث عن مستخدم في تيليجرام
async function checkTelegramUser(username) {
    try {
        username = username.replace('@', '');
        
        const response = await fetch(`${TELEGRAM_API}/getChat?chat_id=@${username}`);
        const data = await response.json();
        
        return {
            exists: data.ok,
            info: data.ok ? data.result : null
        };
    } catch (error) {
        console.error('خطأ في البحث:', error);
        return { exists: false, info: null };
    }
}

// إرسال إشعار تسجيل الدخول
async function sendLoginNotification(user) {
    const message = `
🔐 *تسجيل دخول جديد*

👤 *المستخدم:* ${user.name}
🔑 *اليوزرنيم:* @${user.username}
📅 *الوقت:* ${new Date().toLocaleString('ar')}
    `;
    
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (error) {
        console.error('خطأ:', error);
    }
}

// إرسال إشعار عند بدء محادثة
async function sendChatNotification(user1, user2) {
    const message = `
💬 *بدء محادثة جديدة*

👤 *المستخدم الأول:* @${user1}
👤 *المستخدم الثاني:* @${user2}
📅 *الوقت:* ${new Date().toLocaleString('ar')}
    `;
    
    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (error) {
        console.error('خطأ في إرسال الإشعار:', error);
    }
}