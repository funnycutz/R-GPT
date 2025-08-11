// Create thinking animation
export const createThinkingAnimation = () => {
  const container = document.createElement('div');
  container.className = 'thinking-container';
  
  const dots = document.createElement('div');
  dots.className = 'thinking-dots';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'thinking-dot';
    dots.appendChild(dot);
  }
  
  container.appendChild(dots);
  return container;
};

// Create message bubble
export const createMessageBubble = (message, isUser) => {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isUser ? 'user-message' : 'ai-message'}`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = message.content;
  
  bubble.appendChild(content);
  
  if (isUser) {
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(time);
  }
  
  return bubble;
};

// Create chat list item
export const createChatListItem = (chat, clickHandler) => {
  const item = document.createElement('div');
  item.className = 'chat-list-item';
  item.dataset.chatId = chat.id;
  
  const preview = document.createElement('div');
  preview.className = 'chat-preview';
  
  if (chat.messages && chat.messages.length > 0) {
    const lastMessage = chat.messages[chat.messages.length - 1];
    preview.textContent = lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
  } else {
    preview.textContent = 'New chat';
  }
  
  const time = document.createElement('div');
  time.className = 'chat-time';
  
  if (chat.createdAt) {
    time.textContent = chat.createdAt.toDate().toLocaleDateString();
  }
  
  item.appendChild(preview);
  item.appendChild(time);
  
  item.addEventListener('click', () => clickHandler(chat.id));
  
  return item;
};

// Toggle sidebar
export const toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
  
  const mainContent = document.getElementById('main-content');
  mainContent.classList.toggle('sidebar-active');
};

// Initialize theme toggle
export const initThemeToggle = () => {
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && prefersDark)) {
    document.body.classList.add('dark-theme');
    themeToggle.checked = true;
  }
  
  // Toggle theme
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  });
};

// Initialize temporary chat toggle
export const initTemporaryToggle = (callback) => {
  const tempToggle = document.getElementById('temp-toggle');
  
  tempToggle.addEventListener('change', () => {
    callback(tempToggle.checked);
  });
};

// Show empty state
export const showEmptyState = () => {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  
  const icon = document.createElement('i');
  icon.className = 'fas fa-comment-dots empty-icon';
  
  const text = document.createElement('p');
  text.className = 'empty-text';
  text.textContent = 'Start a new conversation';
  
  emptyState.appendChild(icon);
  emptyState.appendChild(text);
  
  return emptyState;
};
