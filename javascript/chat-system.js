// Real-time Chat System for NethwinLK
class ChatSystem {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.currentThreadId = null;
        this.isOpen = false;
        this.adminId = 'admin';
        this.init();
    }

    init() {
        // Get current user ID from localStorage or generate guest ID
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                this.currentUserId = user._id;
                this.currentUserName = user.fullName;
                this.currentUserEmail = user.email;
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.currentUserId = 'guest_' + Date.now();
                this.currentUserName = 'Guest User';
                this.currentUserEmail = 'guest@example.com';
            }
        } else {
            this.currentUserId = 'guest_' + Date.now();
            this.currentUserName = 'Guest User';
            this.currentUserEmail = 'guest@example.com';
        }
        
        // Initialize Socket.IO connection
        this.initializeSocket();
        
        // Create chat UI
        this.createChatUI();
        
        // Bind events
        this.bindEvents();
    }

    initializeSocket() {
        // Load Socket.IO client
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = () => {
                this.connectSocket();
            };
            document.head.appendChild(script);
        } else {
            this.connectSocket();
        }
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to chat server');
            this.socket.emit('join_user_room', this.currentUserId);
        });

        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('message_read', (data) => {
            this.handleMessageRead(data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
        });
    }

    createChatUI() {
        // Create chat button
        const chatButton = document.createElement('div');
        chatButton.id = 'chatButton';
        chatButton.innerHTML = `
            <div class="fixed bottom-6 right-6 z-50">
                <button id="openChatBtn" class="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l.8-4A8.94 8.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                </button>
                <div id="unreadBadge" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center hidden">
                    <span id="unreadCount">0</span>
                </div>
            </div>
        `;

        // Create chat window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'chatWindow';
        chatWindow.className = 'fixed bottom-24 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 hidden flex flex-col';
        chatWindow.innerHTML = `
            <div class="bg-green-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <div>
                    <h3 class="font-semibold">Chat with Admin</h3>
                    <p class="text-sm text-green-100">We're here to help!</p>
                </div>
                <button id="closeChatBtn" class="text-white hover:text-green-200">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3">
                <div class="text-center text-gray-500 text-sm">
                    <p>Start a conversation with our admin team!</p>
                </div>
            </div>
            
            <div class="border-t p-4">
                <div class="flex space-x-2">
                    <input 
                        type="text" 
                        id="messageInput" 
                        placeholder="Type your message..." 
                        class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        maxlength="1000"
                    >
                    <button 
                        id="sendMessageBtn" 
                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(chatButton);
        document.body.appendChild(chatWindow);
    }

    bindEvents() {
        // Open/close chat
        document.addEventListener('click', (e) => {
            if (e.target.id === 'openChatBtn' || e.target.closest('#openChatBtn')) {
                this.openChat();
            }
            if (e.target.id === 'closeChatBtn' || e.target.closest('#closeChatBtn')) {
                this.closeChat();
            }
        });

        // Send message
        document.addEventListener('click', (e) => {
            if (e.target.id === 'sendMessageBtn' || e.target.closest('#sendMessageBtn')) {
                this.sendMessage();
            }
        });

        // Enter key to send message
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'messageInput' && e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    async openChat() {
        const chatWindow = document.getElementById('chatWindow');
        const chatButton = document.getElementById('openChatBtn');
        
        chatWindow.classList.remove('hidden');
        chatButton.style.display = 'none';
        this.isOpen = true;

        // Load conversation history
        await this.loadConversation();
        
        // Focus on input
        document.getElementById('messageInput').focus();
    }

    closeChat() {
        const chatWindow = document.getElementById('chatWindow');
        const chatButton = document.getElementById('openChatBtn');
        
        chatWindow.classList.add('hidden');
        chatButton.style.display = 'block';
        this.isOpen = false;
    }

    async loadConversation() {
        try {
            console.log('Loading conversation for user:', this.currentUserId, 'with admin:', this.adminId);
            const response = await fetch(`/api/messages/thread/${this.currentUserId}?otherUserId=${this.adminId}`);
            const data = await response.json();

            console.log('Conversation response:', data);

            if (data.success) {
                this.currentThreadId = data.threadId;
                this.displayMessages(data.messages);
            } else {
                console.error('Failed to load conversation:', data.error);
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    <p>Start a conversation with our admin team!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = '';
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const isOwnMessage = message.senderId === this.currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
        
        const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwnMessage ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}">
                <p class="text-sm">${this.escapeHtml(message.text)}</p>
                <p class="text-xs mt-1 opacity-75">${time}</p>
            </div>
        `;
        
        return messageDiv;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text) return;

        // Get user details
        const senderName = this.currentUserName || 'Guest User';
        const receiverName = 'Admin';

        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    senderId: this.currentUserId,
                    receiverId: this.adminId,
                    text: text,
                    senderName: senderName,
                    receiverName: receiverName
                })
            });

            const data = await response.json();

            if (data.success) {
                messageInput.value = '';
                
                // Add message to UI immediately
                const messageElement = this.createMessageElement(data.message);
                const messagesContainer = document.getElementById('chatMessages');
                
                // Remove "start conversation" message if it exists
                const startMessage = messagesContainer.querySelector('.text-center');
                if (startMessage) {
                    startMessage.remove();
                }
                
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    handleNewMessage(data) {
        // Only handle messages for current user
        if (data.receiverId !== this.currentUserId) return;

        // Update unread count
        this.updateUnreadCount();

        // If chat is open, add message to UI
        if (this.isOpen && data.threadId === this.currentThreadId) {
            const messageElement = this.createMessageElement(data);
            const messagesContainer = document.getElementById('chatMessages');
            
            // Remove "start conversation" message if it exists
            const startMessage = messagesContainer.querySelector('.text-center');
            if (startMessage) {
                startMessage.remove();
            }
            
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    handleMessageRead(data) {
        // Update message status in UI if needed
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            // Add read indicator
            const readIndicator = messageElement.querySelector('.read-indicator');
            if (readIndicator) {
                readIndicator.classList.remove('hidden');
            }
        }
    }

    updateUnreadCount() {
        // This would typically fetch unread count from server
        // For now, we'll show a simple indicator
        const unreadBadge = document.getElementById('unreadBadge');
        if (unreadBadge) {
            unreadBadge.classList.remove('hidden');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to open chat from external buttons
    openChatFromButton() {
        this.openChat();
    }
}

// Initialize chat system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatSystem;
}
