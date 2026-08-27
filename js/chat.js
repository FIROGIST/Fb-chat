// إدارة المحادثات مع Firebase
class FirebaseChat {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
        this.currentPartner = null;
        this.messagesListener = null;
        this.currentChatId = null;
        this.editingMessageId = null;
        this.longPressTimer = null;
        this.longPressDuration = 500;
        this.isLongPress = false;
        this.selectedMessageId = null;
        this.selectedMessageElement = null;
        this.chatPartners = new Set(); // قائمة الأشخاص اللي كلمتهم
    }
    
    // بدء محادثة
    async startChat(partnerUser) {
        this.currentPartner = partnerUser;
        this.currentChatId = this.generateChatId(this.currentUser.username, partnerUser.username);
        
        // إضافة للقائمة
        this.chatPartners.add(partnerUser.username);
        await this.saveChatPartners();
        
        this.listenToMessages(this.currentChatId);
        await sendChatNotification(this.currentUser.username, partnerUser.username);
        return this.currentChatId;
    }
    
    // توليد معرف المحادثة
    generateChatId(user1, user2) {
        return [user1, user2].sort().join('_');
    }
    
    // حفظ قائمة المحادثات
    async saveChatPartners() {
        try {
            const userRef = db.collection('users').doc(this.currentUser.username);
            await userRef.update({
                chat_partners: Array.from(this.chatPartners)
            });
        } catch (error) {
            console.error('خطأ في حفظ قائمة المحادثات:', error);
        }
    }
    
    // تحميل قائمة المحادثات
    async loadChatPartners() {
        try {
            const userDoc = await db.collection('users').doc(this.currentUser.username).get();
            if (userDoc.exists && userDoc.data().chat_partners) {
                this.chatPartners = new Set(userDoc.data().chat_partners);
            }
        } catch (error) {
            console.error('خطأ في تحميل قائمة المحادثات:', error);
        }
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
                messagesContainer.innerHTML = '';
                
                snapshot.docs.forEach(doc => {
                    const messageData = doc.data();
                    messageData.id = doc.id;
                    this.displayMessage(messageData);
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, error => {
                console.error('خطأ في الاستماع للرسائل:', error);
            });
    }
    
    // إرسال رسالة نصية
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
                    type: 'text',
                    sender: this.currentUser.username,
                    sender_name: this.currentUser.name,
                    receiver: this.currentPartner.username,
                    receiver_name: this.currentPartner.name,
                    message: messageText.trim(),
                    edited: false,
                    old_message: '',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return true;
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return false;
        }
    }
    
    // إرسال صورة
    async sendImage(imageDataUrl) {
        if (!this.currentPartner || !imageDataUrl) {
            return false;
        }
        
        const chatId = this.generateChatId(this.currentUser.username, this.currentPartner.username);
        
        try {
            await db.collection('chats')
                .doc(chatId)
                .collection('messages')
                .add({
                    type: 'image',
                    sender: this.currentUser.username,
                    sender_name: this.currentUser.name,
                    receiver: this.currentPartner.username,
                    receiver_name: this.currentPartner.name,
                    image_url: imageDataUrl,
                    edited: false,
                    old_message: '',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return true;
        } catch (error) {
            console.error('خطأ في إرسال الصورة:', error);
            return false;
        }
    }
    
    // عرض رسالة
    displayMessage(messageData) {
        const messagesContainer = document.getElementById('messages');
        
        const messageElement = document.createElement('div');
        const isSent = messageData.sender === this.currentUser.username;
        messageElement.className = `message ${isSent ? 'sent' : 'received'} ${messageData.edited ? 'edited' : ''}`;
        messageElement.id = `message-${messageData.id}`;
        messageElement.dataset.messageId = messageData.id;
        messageElement.dataset.sender = messageData.sender;
        
        const time = messageData.timestamp ? 
            new Date(messageData.timestamp.toDate()).toLocaleTimeString('ar', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '';
        
        let contentHtml = '';
        
        if (messageData.type === 'image') {
            contentHtml = `
                <div class="message-image" onclick="openImageViewer('${messageData.image_url}')">
                    <img src="${messageData.image_url}" alt="صورة" loading="lazy">
                </div>
            `;
        } else {
            contentHtml = `<div class="message-content">${this.escapeHtml(messageData.message)}</div>`;
        }
        
        let oldVersionHtml = '';
        if (messageData.edited && messageData.old_message) {
            oldVersionHtml = `<div class="old-version">النسخة القديمة: ${this.escapeHtml(messageData.old_message)}</div>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-content-wrapper">
                ${contentHtml}
                ${oldVersionHtml}
            </div>
            <div class="message-time">${time} ${messageData.edited ? '• معدلة' : ''}</div>
        `;
        
        // إضافة الأحداث
        this.addMessageEvents(messageElement, messageData);
        
        messagesContainer.appendChild(messageElement);
    }
    
    // إضافة أحداث الرسالة
    addMessageEvents(messageElement, messageData) {
        const isSent = messageData.sender === this.currentUser.username;
        
        if (!isSent) {
            return;
        }
        
        // كليك يمين (كمبيوتر)
        messageElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, messageElement, messageData);
        });
        
        // ضغطة مطولة (موبايل)
        messageElement.addEventListener('touchstart', (e) => {
            this.isLongPress = false;
            clearTimeout(this.longPressTimer);
            
            this.longPressTimer = setTimeout(() => {
                this.isLongPress = true;
                this.selectMessage(messageElement, messageData);
                
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, this.longPressDuration);
        }, { passive: true });
        
        messageElement.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        }, { passive: true });
        
        messageElement.addEventListener('touchmove', () => {
            clearTimeout(this.longPressTimer);
        }, { passive: true });
        
        messageElement.addEventListener('click', (e) => {
            if (!this.isLongPress) {
                this.deselectMessage();
            }
            this.isLongPress = false;
        });
    }
    
    // إظهار قائمة السياق (كمبيوتر)
    showContextMenu(e, messageElement, messageData) {
        e.preventDefault();
        this.removeContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'contextMenu';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        const isImage = messageData.type === 'image';
        const messageContent = isImage ? '' : this.escapeHtml(messageData.message);
        
        menu.innerHTML = `
            ${!isImage ? `
            <button class="context-menu-item edit-item" onclick="firebaseChat.contextEditMessage('${messageData.id}', '${messageContent}')">
                ✏️ تعديل الرسالة
            </button>
            ` : ''}
            <button class="context-menu-item delete-item" onclick="firebaseChat.contextDeleteMessage('${messageData.id}')">
                🗑️ حذف الرسالة
            </button>
        `;
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            document.addEventListener('click', this.closeContextMenu);
            document.addEventListener('contextmenu', this.closeContextMenu);
        }, 0);
    }
    
    // إغلاق قائمة السياق
    closeContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
        document.removeEventListener('click', firebaseChat.closeContextMenu);
        document.removeEventListener('contextmenu', firebaseChat.closeContextMenu);
    }
    
    // تحديد رسالة (موبايل)
    selectMessage(messageElement, messageData) {
        this.deselectMessage();
        
        this.selectedMessageId = messageData.id;
        this.selectedMessageElement = messageElement;
        
        messageElement.classList.add('selected');
        this.showMobileToolbar(messageData);
    }
    
    // إلغاء تحديد الرسالة
    deselectMessage() {
        if (this.selectedMessageElement) {
            this.selectedMessageElement.classList.remove('selected');
        }
        
        this.selectedMessageId = null;
        this.selectedMessageElement = null;
        this.hideMobileToolbar();
    }
    
    // إظهار شريط الأدوات للموبايل
    showMobileToolbar(messageData) {
        let toolbar = document.getElementById('mobileToolbar');
        
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'mobileToolbar';
            toolbar.className = 'mobile-toolbar';
            document.querySelector('.chat-area').appendChild(toolbar);
        }
        
        const isImage = messageData.type === 'image';
        
        toolbar.innerHTML = `
            ${!isImage ? `
            <button class="toolbar-btn" onclick="firebaseChat.toolbarEditMessage()">
                ✏️ تعديل
            </button>
            ` : ''}
            <button class="toolbar-btn delete" onclick="firebaseChat.toolbarDeleteMessage()">
                🗑️ حذف
            </button>
            <button class="toolbar-btn cancel" onclick="firebaseChat.deselectMessage()">
                ✕ إلغاء
            </button>
        `;
        
        toolbar.style.display = 'flex';
    }
    
    // إخفاء شريط الأدوات
    hideMobileToolbar() {
        const toolbar = document.getElementById('mobileToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }
    
    // تعديل من قائمة السياق
    contextEditMessage(messageId, currentMessage) {
        this.closeContextMenu();
        this.openEditModal(messageId, currentMessage);
    }
    
    // حذف من قائمة السياق
    contextDeleteMessage(messageId) {
        this.closeContextMenu();
        this.deleteMessage(messageId);
    }
    
    // تعديل من شريط الأدوات
    toolbarEditMessage() {
        if (this.selectedMessageId && this.selectedMessageElement) {
            const messageContent = this.selectedMessageElement.querySelector('.message-content');
            const currentMessage = messageContent ? messageContent.textContent : '';
            this.openEditModal(this.selectedMessageId, currentMessage);
            this.deselectMessage();
        }
    }
    
    // حذف من شريط الأدوات
    toolbarDeleteMessage() {
        if (this.selectedMessageId) {
            this.deleteMessage(this.selectedMessageId);
            this.deselectMessage();
        }
    }
    
    // إزالة قائمة السياق
    removeContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
    }
    
    // التحقق من جهاز اللمس
    isTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    // تهريب HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // عكس تهريب HTML
    unescapeHtml(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent;
    }
    
    // فتح نافذة التعديل
    openEditModal(messageId, currentMessage) {
        this.editingMessageId = messageId;
        
        const editTextarea = document.getElementById('editMessageText');
        editTextarea.value = this.unescapeHtml(currentMessage);
        
        document.getElementById('editModal').classList.add('show');
        
        setTimeout(() => {
            editTextarea.focus();
            editTextarea.select();
        }, 100);
    }
    
    // حفظ التعديل
    async saveEditMessage() {
        const editTextarea = document.getElementById('editMessageText');
        const newMessage = editTextarea.value.trim();
        
        if (!newMessage || !this.editingMessageId || !this.currentChatId) {
            return;
        }
        
        try {
            const messageRef = db.collection('chats')
                .doc(this.currentChatId)
                .collection('messages')
                .doc(this.editingMessageId);
            
            const messageDoc = await messageRef.get();
            
            if (!messageDoc.exists) {
                throw new Error('الرسالة غير موجودة');
            }
            
            const oldMessage = messageDoc.data().message;
            
            await messageRef.update({
                message: newMessage,
                old_message: oldMessage,
                edited: true,
                edited_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await sendEditMessageNotification(this.currentUser.username, oldMessage, newMessage);
            
            this.closeEditModal();
            
        } catch (error) {
            console.error('خطأ في تعديل الرسالة:', error);
            alert('حدث خطأ في تعديل الرسالة');
        }
    }
    
    // حذف رسالة
    async deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
            return;
        }
        
        if (!this.currentChatId) {
            return;
        }
        
        try {
            const messageRef = db.collection('chats')
                .doc(this.currentChatId)
                .collection('messages')
                .doc(messageId);
            
            const messageDoc = await messageRef.get();
            
            if (!messageDoc.exists) {
                throw new Error('الرسالة غير موجودة');
            }
            
            const deletedMessage = messageDoc.data().message || 'صورة';
            
            await messageRef.delete();
            
            await sendDeleteMessageNotification(this.currentUser.username, deletedMessage);
            
        } catch (error) {
            console.error('خطأ في حذف الرسالة:', error);
            alert('حدث خطأ في حذف الرسالة');
        }
    }
    
    // إغلاق نافذة التعديل
    closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        this.editingMessageId = null;
    }
    
    // تحميل قائمة المحادثات فقط
    async loadUsers() {
        try {
            await this.loadChatPartners();
            
            const chatList = document.getElementById('chatList');
            chatList.innerHTML = '';
            
            if (this.chatPartners.size === 0) {
                chatList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">لا توجد محادثات بعد<br>ابحث عن مستخدم للبدء</div>';
                return;
            }
            
            for (const username of this.chatPartners) {
                const userDoc = await db.collection('users').doc(username).get();
                
                if (userDoc.exists) {
                    const user = userDoc.data();
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.onclick = () => this.selectPartner(user);
                    
                    const avatar = user.avatar || 'https://via.placeholder.com/35';
                    
                    chatItem.innerHTML = `
                        <img src="${avatar}" alt="${user.name}" onerror="this.src='https://via.placeholder.com/35'">
                        <div class="chat-item-info">
                            <h4>${this.escapeHtml(user.name)}</h4>
                            <p>@${this.escapeHtml(user.username)}</p>
                        </div>
                        <span class="online-dot"></span>
                    `;
                    
                    chatList.appendChild(chatItem);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    }
    
    // اختيار شريك المحادثة
    async selectPartner(user) {
        document.getElementById('chatPartner').textContent = `${user.name} (@${user.username})`;
        document.getElementById('messages').innerHTML = '';
        
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('attachBtn').disabled = false;
        
        await this.startChat(user);
    }
}

// إنشاء نسخة من الكلاس
const firebaseChat = new FirebaseChat();

// ============ دوال عامة ============

function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    menu.classList.toggle('show');
}

function openEditModal(messageId, currentMessage) {
    firebaseChat.openEditModal(messageId, currentMessage);
}

function closeEditModal() {
    firebaseChat.closeEditModal();
}

function saveEditMessage() {
    firebaseChat.saveEditMessage();
}

async function deleteMessage(messageId) {
    await firebaseChat.deleteMessage(messageId);
}

// فتح عارض الصور
function openImageViewer(imageUrl) {
    const viewer = document.getElementById('imageViewer');
    const image = document.getElementById('viewerImage');
    image.src = imageUrl;
    viewer.classList.add('show');
}

// إغلاق عارض الصور
function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    viewer.classList.remove('show');
}

// إغلاق قائمة السياق عند النقر في أي مكان
document.addEventListener('click', function(e) {
    if (!e.target.closest('.context-menu')) {
        firebaseChat.closeContextMenu();
    }
});

// إغلاق قائمة السياق عند الضغط على ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        firebaseChat.closeContextMenu();
        firebaseChat.deselectMessage();
        closeEditModal();
        closeImageViewer();
    }
});
