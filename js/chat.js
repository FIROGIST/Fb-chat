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
        this.chatPartners = new Set();
        this.hiddenChats = new Set();
        this.developerUsername = 'FIROGIST'; // اليوزرنيم المميز
    }
    
    // التحقق من المطور
    isDeveloper(username) {
        return username === this.developerUsername;
    }
    
    // الحصول على علامة المطور
    getDeveloperBadge(username) {
        if (this.isDeveloper(username)) {
            return {
                name: '<span class="verified-name">' + this.escapeHtml(username) + ' <span class="gold-check">✓</span></span>',
                username: '@' + this.escapeHtml(username) + ' <span class="dev-badge">مطور</span>'
            };
        }
        return {
            name: this.escapeHtml(username),
            username: '@' + this.escapeHtml(username)
        };
    }
    
    // بدء محادثة
    async startChat(partnerUser) {
        this.currentPartner = partnerUser;
        this.currentChatId = this.generateChatId(this.currentUser.username, partnerUser.username);
        
        this.chatPartners.add(partnerUser.username);
        this.hiddenChats.delete(partnerUser.username);
        await this.saveChatData();
        
        this.listenToMessages(this.currentChatId);
        await sendChatNotification(this.currentUser.username, partnerUser.username);
        return this.currentChatId;
    }
    
    generateChatId(user1, user2) {
        return [user1, user2].sort().join('_');
    }
    
    // حفظ بيانات المحادثات
    async saveChatData() {
        try {
            const userRef = db.collection('users').doc(this.currentUser.username);
            await userRef.update({
                chat_partners: Array.from(this.chatPartners),
                hidden_chats: Array.from(this.hiddenChats)
            });
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
        }
    }
    
    // تحميل بيانات المحادثات
    async loadChatData() {
        try {
            const userDoc = await db.collection('users').doc(this.currentUser.username).get();
            if (userDoc.exists) {
                if (userDoc.data().chat_partners) {
                    this.chatPartners = new Set(userDoc.data().chat_partners);
                }
                if (userDoc.data().hidden_chats) {
                    this.hiddenChats = new Set(userDoc.data().hidden_chats);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
        }
    }
    
    // إخفاء شات
    async hideChat(username) {
        this.hiddenChats.add(username);
        this.chatPartners.delete(username);
        await this.saveChatData();
        await this.loadUsers();
    }
    
    // إظهار شات مخفي
    async unhideChat(username) {
        this.hiddenChats.delete(username);
        this.chatPartners.add(username);
        await this.saveChatData();
        await this.loadUsers();
        this.closeHiddenChats();
    }
    
    // حذف شات نهائياً
    async deleteChat(username) {
        if (!confirm('هل أنت متأكد من حذف هذا الشات نهائياً؟')) {
            return;
        }
        
        this.hiddenChats.delete(username);
        this.chatPartners.delete(username);
        
        const chatId = this.generateChatId(this.currentUser.username, username);
        
        try {
            const messagesRef = db.collection('chats').doc(chatId).collection('messages');
            const snapshot = await messagesRef.get();
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            await this.saveChatData();
            await this.loadUsers();
            this.closeHiddenChats();
            
        } catch (error) {
            console.error('خطأ في حذف الشات:', error);
            alert('حدث خطأ في حذف الشات');
        }
    }
    
    // عرض قائمة الشاتات المخفية
    async showHiddenChats() {
        const modal = document.getElementById('hiddenChatsModal');
        const list = document.getElementById('hiddenChatsList');
        
        list.innerHTML = '';
        
        if (this.hiddenChats.size === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">لا توجد شاتات مخفية</div>';
        } else {
            for (const username of this.hiddenChats) {
                const userDoc = await db.collection('users').doc(username).get();
                
                if (userDoc.exists) {
                    const user = userDoc.data();
                    const item = document.createElement('div');
                    item.className = 'hidden-chat-item';
                    
                    const avatar = user.avatar || 'https://via.placeholder.com/35';
                    const badge = this.getDeveloperBadge(user.username);
                    
                    item.innerHTML = `
                        <img src="${avatar}" alt="${user.name}" onerror="this.src='https://via.placeholder.com/35'">
                        <div class="hidden-chat-info">
                            <h4>${badge.name}</h4>
                            <p>${badge.username}</p>
                        </div>
                        <button class="unhide-btn" onclick="firebaseChat.unhideChat('${username}')" title="إظهار">👁️</button>
                        <button class="delete-chat-btn" onclick="firebaseChat.deleteChat('${username}')" title="حذف نهائي">🗑️</button>
                    `;
                    
                    list.appendChild(item);
                }
            }
        }
        
        modal.classList.add('show');
    }
    
    // إغلاق نافذة الشاتات المخفية
    closeHiddenChats() {
        const modal = document.getElementById('hiddenChatsModal');
        modal.classList.remove('show');
    }
    
    // عرض قائمة السياق للشات
    showChatContextMenu(e, username) {
        e.preventDefault();
        e.stopPropagation();
        
        this.removeChatContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'chatContextMenu';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        menu.innerHTML = `
            <button class="context-menu-item" onclick="firebaseChat.hideChat('${username}'); firebaseChat.removeChatContextMenu();">
                👁️ إخفاء الشات
            </button>
            <button class="context-menu-item delete-item" onclick="firebaseChat.deleteChat('${username}'); firebaseChat.removeChatContextMenu();">
                🗑️ حذف الشات نهائياً
            </button>
        `;
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            document.addEventListener('click', this.closeChatContextMenu);
        }, 0);
    }
    
    closeChatContextMenu() {
        this.removeChatContextMenu();
        document.removeEventListener('click', firebaseChat.closeChatContextMenu);
    }
    
    removeChatContextMenu() {
        const menu = document.getElementById('chatContextMenu');
        if (menu) {
            menu.remove();
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
        
        this.addMessageEvents(messageElement, messageData);
        
        messagesContainer.appendChild(messageElement);
    }
    
    // إضافة أحداث الرسالة
    addMessageEvents(messageElement, messageData) {
        const isSent = messageData.sender === this.currentUser.username;
        
        if (!isSent) {
            return;
        }
        
        messageElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, messageElement, messageData);
        });
        
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
    
    // إظهار قائمة السياق للرسالة
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
    
    closeContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
        document.removeEventListener('click', firebaseChat.closeContextMenu);
        document.removeEventListener('contextmenu', firebaseChat.closeContextMenu);
    }
    
    selectMessage(messageElement, messageData) {
        this.deselectMessage();
        
        this.selectedMessageId = messageData.id;
        this.selectedMessageElement = messageElement;
        
        messageElement.classList.add('selected');
        this.showMobileToolbar(messageData);
    }
    
    deselectMessage() {
        if (this.selectedMessageElement) {
            this.selectedMessageElement.classList.remove('selected');
        }
        
        this.selectedMessageId = null;
        this.selectedMessageElement = null;
        this.hideMobileToolbar();
    }
    
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
    
    hideMobileToolbar() {
        const toolbar = document.getElementById('mobileToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }
    
    contextEditMessage(messageId, currentMessage) {
        this.closeContextMenu();
        this.openEditModal(messageId, currentMessage);
    }
    
    contextDeleteMessage(messageId) {
        this.closeContextMenu();
        this.deleteMessage(messageId);
    }
    
    toolbarEditMessage() {
        if (this.selectedMessageId && this.selectedMessageElement) {
            const messageContent = this.selectedMessageElement.querySelector('.message-content');
            const currentMessage = messageContent ? messageContent.textContent : '';
            this.openEditModal(this.selectedMessageId, currentMessage);
            this.deselectMessage();
        }
    }
    
    toolbarDeleteMessage() {
        if (this.selectedMessageId) {
            this.deleteMessage(this.selectedMessageId);
            this.deselectMessage();
        }
    }
    
    removeContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
    }
    
    isTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    unescapeHtml(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent;
    }
    
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
    
    closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        this.editingMessageId = null;
    }
    
    // تحميل قائمة المحادثات (بدون المخفية)
    async loadUsers() {
        try {
            await this.loadChatData();
            
            const chatList = document.getElementById('chatList');
            chatList.innerHTML = '';
            
            const visibleChats = Array.from(this.chatPartners).filter(u => !this.hiddenChats.has(u));
            
            if (visibleChats.length === 0) {
                chatList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">لا توجد محادثات<br>ابحث عن مستخدم للبدء</div>';
                return;
            }
            
            for (const username of visibleChats) {
                const userDoc = await db.collection('users').doc(username).get();
                
                if (userDoc.exists) {
                    const user = userDoc.data();
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.dataset.username = username;
                    chatItem.onclick = () => this.selectPartner(user);
                    
                    chatItem.addEventListener('contextmenu', (e) => {
                        this.showChatContextMenu(e, username);
                    });
                    
                    chatItem.addEventListener('touchstart', (e) => {
                        this.isLongPress = false;
                        clearTimeout(this.longPressTimer);
                        
                        this.longPressTimer = setTimeout(() => {
                            this.isLongPress = true;
                            this.showChatContextMenu(e, username);
                            
                            if (navigator.vibrate) {
                                navigator.vibrate(50);
                            }
                        }, this.longPressDuration);
                    }, { passive: true });
                    
                    chatItem.addEventListener('touchend', () => {
                        clearTimeout(this.longPressTimer);
                    }, { passive: true });
                    
                    chatItem.addEventListener('touchmove', () => {
                        clearTimeout(this.longPressTimer);
                    }, { passive: true });
                    
                    const avatar = user.avatar || 'https://via.placeholder.com/35';
                    const badge = this.getDeveloperBadge(user.username);
                    
                    chatItem.innerHTML = `
                        <img src="${avatar}" alt="${user.name}" onerror="this.src='https://via.placeholder.com/35'">
                        <div class="chat-item-info">
                            <h4>${badge.name}</h4>
                            <p>${badge.username}</p>
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
    
    async selectPartner(user) {
        const badge = this.getDeveloperBadge(user.name);
        document.getElementById('chatPartner').innerHTML = `${badge.name} (${badge.username})`;
        document.getElementById('messages').innerHTML = '';
        
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('attachBtn').disabled = false;
        
        await this.startChat(user);
    }
}

const firebaseChat = new FirebaseChat();

// ============ دوال الثيم ============

async function saveThemeToFirebase(theme) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
        await db.collection('users').doc(currentUser.username).update({
            theme: theme
        });
        return true;
    } catch (error) {
        console.error('خطأ في حفظ الثيم:', error);
        return false;
    }
}

async function loadThemeFromFirebase() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('fb_chat_current_user'));
        const userDoc = await db.collection('users').doc(currentUser.username).get();
        if (userDoc.exists && userDoc.data().theme) {
            return userDoc.data().theme;
        }
        return null;
    } catch (error) {
        console.error('خطأ في تحميل الثيم:', error);
        return null;
    }
}

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

function openImageViewer(imageUrl) {
    const viewer = document.getElementById('imageViewer');
    const image = document.getElementById('viewerImage');
    image.src = imageUrl;
    viewer.classList.add('show');
}

function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    viewer.classList.remove('show');
}

function closeHiddenChats() {
    firebaseChat.closeHiddenChats();
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.context-menu')) {
        firebaseChat.closeContextMenu();
        firebaseChat.closeChatContextMenu();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        firebaseChat.closeContextMenu();
        firebaseChat.closeChatContextMenu();
        firebaseChat.deselectMessage();
        closeEditModal();
        closeImageViewer();
        closeHiddenChats();
        closeThemeModal();
    }
});
