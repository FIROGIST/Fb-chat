// إدارة المحادثات مع Firebase
class FirebaseChat {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
        this.currentPartner = null;
        this.messagesListener = null;
    }
    
    // بدء محادثة
    async startChat(partnerUser) {
        this.currentPartner = partnerUser;
        
        const chatId = this.generateChatId(this.currentUser.username, partnerUser.username);
        
        this.listenToMessages(chatId);
        
        await sendChatNotification(this.currentUser.username, partnerUser.username);
        
        return chatId;
    }
    
    // توليد معرف المحادثة
    generateChatId(user1, user2) {
        return [user1, user2].sort().join('_');
    }
    
    // الاستماع للرسائل
    listenToMessages(chatId) {
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        this.messagesListener = db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                const messagesContainer = document.getElementById('messages');
                const welcomeMessage = messagesContainer.querySelector('.welcome-message');
                
                if (welcomeMessage) {
                    welcomeMessage.remove();
                }
                
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const messageData = change.doc.data();
                        this.displayMessage(messageData);
                    }
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
    }
    
    // إرسال رسالة
    async sendMessage(messageText) {
        if (!this.currentPartner || !messageText.trim()) {
            return false;
        }
        
        const chatId = this.generateChatId(this.currentUser.username, this.currentPartner.username);
        
        try {
            await db.collection('chats')
                .doc(chatId)
                .collection('messages')
                .add({
                    sender: this.currentUser.username,
                    sender_name: this.currentUser.name,
                    receiver: this.currentPartner.username,
                    receiver_name: this.currentPartner.name,
                    message: messageText.trim(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return true;
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return false;
        }
    }
    
    // عرض رسالة
    displayMessage(messageData) {
        const messagesContainer = document.getElementById('messages');
        
        const messageElement = document.createElement('div');
        const isSent = messageData.sender === this.currentUser.username;
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = messageData.timestamp ? 
            new Date(messageData.timestamp.toDate()).toLocaleTimeString('ar', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '';
        
        messageElement.innerHTML = `
            <div class="message-content">${messageData.message}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // تحميل قائمة المستخدمين
    async loadUsers() {
        const users = await firebaseAuth.getAllUsers();
        const chatList = document.getElementById('chatList');
        
        chatList.innerHTML = '';
        
        users.forEach(user => {
            if (user.username !== this.currentUser.username) {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.onclick = () => this.selectPartner(user);
                
                const avatar = user.avatar || 'https://via.placeholder.com/40';
                
                chatItem.innerHTML = `
                    <img src="${avatar}" alt="${user.name}" onerror="this.src='https://via.placeholder.com/40'">
                    <div class="chat-item-info">
                        <h4>${user.name}</h4>
                        <p>@${user.username}</p>
                    </div>
                    <span class="online-dot"></span>
                `;
                
                chatList.appendChild(chatItem);
            }
        });
    }
    
    // اختيار شريك المحادثة
    async selectPartner(user) {
        document.getElementById('chatPartner').textContent = `${user.name} (@${user.username})`;
        document.getElementById('messages').innerHTML = '';
        
        // تفعيل حقل الإرسال
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        
        await this.startChat(user);
    }
}

const firebaseChat = new FirebaseChat();