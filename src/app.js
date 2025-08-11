import { auth } from './firebase-config.js';
import { sendSignInLink, signInWithGoogle, checkEmailSignIn, signOut } from './auth.js';
import { 
  createNewChat, 
  getUserChats, 
  addMessageToChat, 
  getChatMessages, 
  deleteChat,
  callAIAPI,
  callVisionAPI
} from './chat.js';
import { 
  createThinkingAnimation, 
  createMessageBubble, 
  createChatListItem, 
  toggleSidebar, 
  initThemeToggle,
  initTemporaryToggle,
  showEmptyState
} from './ui.js';

// DOM elements
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const newChatButton = document.getElementById('new-chat-button');
const menuButton = document.getElementById('menu-button');
const authContainer = document.getElementById('auth-container');
const chatContent = document.getElementById('chat-content');
const signInEmail = document.getElementById('sign-in-email');
const sendLinkButton = document.getElementById('send-link-button');
const googleSignInButton = document.getElementById('google-sign-in-button');
const signOutButton = document.getElementById('sign-out-button');
const tempToggle = document.getElementById('temp-toggle');
const themeToggle = document.getElementById('theme-toggle');

// App state
let currentChatId = null;
let currentUserId = null;
let isTemporaryChat = false;
let unsubscribeChats = null;
let unsubscribeMessages = null;

// Initialize the app
const initApp = () => {
  // Check if coming back from email link
  checkEmailSignIn();
  
  // Set up auth state listener
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      currentUserId = user.uid;
      authContainer.style.display = 'none';
      chatContent.style.display = 'flex';
      signOutButton.style.display = 'block';
      
      // Load user chats
      loadUserChats();
      
      // Create a new chat by default
      createNewChatHandler();
    } else {
      // User is signed out
      currentUserId = null;
      authContainer.style.display = 'flex';
      chatContent.style.display = 'none';
      signOutButton.style.display = 'none';
      
      // Clear any existing chat listeners
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeMessages) unsubscribeMessages();
    }
  });
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize UI components
  initThemeToggle();
  initTemporaryToggle((isTemporary) => {
    isTemporaryChat = isTemporary;
  });
};

// Set up event listeners
const setupEventListeners = () => {
  // Send message
  sendButton.addEventListener('click', sendMessageHandler);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessageHandler();
    }
  });
  
  // New chat
  newChatButton.addEventListener('click', createNewChatHandler);
  
  // Menu button
  menuButton.addEventListener('click', toggleSidebar);
  
  // Auth buttons
  sendLinkButton.addEventListener('click', () => {
    const email = signInEmail.value.trim();
    if (email) {
      sendSignInLink(email);
    }
  });
  
  googleSignInButton.addEventListener('click', signInWithGoogle);
  
  // Sign out
  signOutButton.addEventListener('click', signOut);
};

// Load user chats
const loadUserChats = () => {
  const chatList = document.getElementById('chat-list');
  chatList.innerHTML = '';
  
  unsubscribeChats = getUserChats(currentUserId, (chats) => {
    // Filter out temporary chats
    const nonTempChats = chats.filter(chat => !chat.isTemporary);
    
    if (nonTempChats.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'empty-chat-list';
      emptyItem.textContent = 'No chats yet';
      chatList.appendChild(emptyItem);
    } else {
      nonTempChats.forEach(chat => {
        const listItem = createChatListItem(chat, (chatId) => {
          loadChat(chatId);
        });
        chatList.appendChild(listItem);
      });
    }
  });
};

// Create new chat handler
const createNewChatHandler = async () => {
  // Clear any existing message listener
  if (unsubscribeMessages) unsubscribeMessages();
  
  // Create a new chat
  currentChatId = await createNewChat(currentUserId, isTemporaryChat);
  
  if (currentChatId) {
    // Clear the chat container
    chatContainer.innerHTML = '';
    
    // Show empty state if it's a brand new chat
    if (!isTemporaryChat) {
      loadUserChats(); // Refresh chat list
    }
    
    // Set up listener for this chat's messages
    unsubscribeMessages = getChatMessages(currentChatId, (messages) => {
      renderMessages(messages);
    });
  }
};

// Load chat
const loadChat = (chatId) => {
  currentChatId = chatId;
  
  // Clear any existing message listener
  if (unsubscribeMessages) unsubscribeMessages();
  
  // Set up listener for this chat's messages
  unsubscribeMessages = getChatMessages(currentChatId, (messages) => {
    renderMessages(messages);
  });
  
  // Hide the sidebar on mobile
  if (window.innerWidth < 768) {
    toggleSidebar();
  }
};

// Render messages
const renderMessages = (messages) => {
  chatContainer.innerHTML = '';
  
  if (messages.length === 0) {
    chatContainer.appendChild(showEmptyState());
    return;
  }
  
  messages.forEach(message => {
    const bubble = createMessageBubble(message, message.role === 'user');
    chatContainer.appendChild(bubble);
  });
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
};

// Send message handler
const sendMessageHandler = async () => {
  const messageText = messageInput.value.trim();
  
  if (!messageText || !currentChatId) return;
  
  // Create user message
  const userMessage = {
    role: 'user',
    content: messageText,
    timestamp: new Date().toISOString()
  };
  
  // Add user message to chat
  await addMessageToChat(currentChatId, userMessage);
  
  // Clear input
  messageInput.value = '';
  
  // Show thinking animation
  const thinkingElement = createThinkingAnimation();
  chatContainer.appendChild(thinkingElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  try {
    // Get all messages in this chat to maintain context
    const messagesSnapshot = await db.collection('chats').doc(currentChatId).get();
    const allMessages = messagesSnapshot.data().messages || [];
    
    // Prepare messages for AI (include system message if it's the first AI message)
    const aiMessages = [];
    
    if (allMessages.filter(m => m.role === 'assistant').length === 0) {
      aiMessages.push({
        role: 'system',
        content: 'You are a helpful assistant. Respond in a clear and concise manner.'
      });
    }
    
    aiMessages.push(...allMessages.map(m => ({
      role: m.role,
      content: m.content
    })));
    
    // Call AI API
    let aiResponse = '';
    
    await callAIAPI(aiMessages, (chunk) => {
      // Remove thinking animation if it's still there
      if (thinkingElement.parentNode) {
        chatContainer.removeChild(thinkingElement);
      }
      
      aiResponse += chunk;
      
      // Update or create AI message bubble
      let aiBubble = document.querySelector('.ai-message:last-child');
      
      if (!aiBubble) {
        aiBubble = createMessageBubble({
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }, false);
        chatContainer.appendChild(aiBubble);
      } else {
        aiBubble.querySelector('.message-content').textContent = aiResponse;
      }
      
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
    
    // Add final AI message to chat
    await addMessageToChat(currentChatId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error in AI conversation:", error);
    
    // Remove thinking animation
    if (thinkingElement.parentNode) {
      chatContainer.removeChild(thinkingElement);
    }
    
    // Show error message
    const errorBubble = createMessageBubble({
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date().toISOString()
    }, false);
    
    chatContainer.appendChild(errorBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

// Handle image upload
const handleImageUpload = async (file) => {
  if (!file) return;
  
  // Convert image to base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = async () => {
    const base64String = reader.result.split(',')[1];
    const imageUrl = `data:image/${file.type.split('/')[1]};base64,${base64String}`;
    
    // Show thinking animation
    const thinkingElement = createThinkingAnimation();
    chatContainer.appendChild(thinkingElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
      // Call vision API
      const response = await callVisionAPI(imageUrl, "What's in this image?");
      
      // Remove thinking animation
      if (thinkingElement.parentNode) {
        chatContainer.removeChild(thinkingElement);
      }
      
      // Add AI message to chat
      await addMessageToChat(currentChatId, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      
      // Remove thinking animation
      if (thinkingElement.parentNode) {
        chatContainer.removeChild(thinkingElement);
      }
      
      // Show error message
      const errorBubble = createMessageBubble({
        role: 'assistant',
        content: 'Sorry, I couldn\'t analyze that image. Please try another one.',
        timestamp: new Date().toISOString()
      }, false);
      
      chatContainer.appendChild(errorBubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
