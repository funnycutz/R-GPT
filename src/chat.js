import { db } from './firebase-config.js';

// Create a new chat
export const createNewChat = async (userId, isTemporary = false) => {
  try {
    const chatRef = await db.collection('chats').add({
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isTemporary,
      messages: []
    });
    return chatRef.id;
  } catch (error) {
    console.error("Error creating new chat:", error);
    return null;
  }
};

// Get all chats for a user
export const getUserChats = (userId, callback) => {
  return db.collection('chats')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const chats = [];
      snapshot.forEach(doc => {
        chats.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(chats);
    });
};

// Add a message to a chat
export const addMessageToChat = async (chatId, message) => {
  try {
    await db.collection('chats').doc(chatId).update({
      messages: firebase.firestore.FieldValue.arrayUnion(message),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error adding message:", error);
    return false;
  }
};

// Get chat messages
export const getChatMessages = (chatId, callback) => {
  return db.collection('chats').doc(chatId)
    .onSnapshot(doc => {
      if (doc.exists) {
        callback(doc.data().messages || []);
      } else {
        callback([]);
      }
    });
};

// Delete a chat
export const deleteChat = async (chatId) => {
  try {
    await db.collection('chats').doc(chatId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// AI API call
export const callAIAPI = async (messages, streamCallback) => {
  const url = "https://text.pollinations.ai/openai";
  
  const payload = {
    model: "openai",
    messages,
    stream: true
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      buffer += chunkText;

      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.replace('data: ', '').trim();
          
          if (data === '[DONE]') {
            return fullResponse;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            
            if (content) {
              fullResponse += content;
              streamCallback(content);
            }
          } catch (err) {
            console.warn("Non-JSON data:", data);
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error during streaming request:", error);
    throw error;
  }
};

// Vision API call
export const callVisionAPI = async (imageUrl, question) => {
  const url = "https://text.pollinations.ai/openai";
  
  const payload = {
    model: "openai",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: question },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 500
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling vision API:", error);
    throw error;
  }
};
