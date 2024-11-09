import { ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { storage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Chat initialization
function initializeChat() {
    const chatRef = database.ref(`rooms/${roomName}/chat`);
    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');

    // Listen for new messages
    chatRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });

    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Send message function
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        const chatRef = database.ref(`rooms/${roomName}/chat`);
        chatRef.push({
            sender: userName,
            message: message,
            timestamp: Date.now(),
            type: 'text'
        });
        messageInput.value = '';
    }
}

// Display message in chat
function displayMessage(message) {
    const chatBox = document.getElementById('chatBox');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(message.sender === userName ? 'sent' : 'received');

    if (message.type === 'file') {
        // Handle different file types
        if (message.fileType.startsWith('image/')) {
            messageElement.innerHTML = `
                <strong>${message.sender}</strong><br>
                <img src="${message.message}" alt="${message.fileName}" class="chat-image"><br>
                <small>${message.fileName}</small>
            `;
        } else if (message.fileType.startsWith('video/')) {
            messageElement.innerHTML = `
                <strong>${message.sender}</strong><br>
                <video controls class="chat-video">
                    <source src="${message.message}" type="${message.fileType}">
                </video><br>
                <small>${message.fileName}</small>
            `;
        } else {
            messageElement.innerHTML = `
                <strong>${message.sender}</strong><br>
                <a href="${message.message}" target="_blank" class="file-link">
                    📎 ${message.fileName}
                </a>
            `;
        }
    } else {
        // Regular text message
        messageElement.innerHTML = `
            <strong>${message.sender}</strong><br>
            ${message.message}
        `;
    }

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Enhanced file upload with progress
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Please choose a file under 10MB.');
        return;
    }

    // Create progress element
    const progressElement = document.createElement('div');
    progressElement.innerHTML = `
        <div>Uploading ${file.name}...</div>
        <div class="upload-progress">
            <div class="upload-progress-bar" style="width: 0%"></div>
        </div>
    `;
    document.getElementById('chatBox').appendChild(progressElement);

    try {
        const fileRef = storage.ref(`rooms/${roomName}/files/${Date.now()}_${file.name}`);
        
        // Upload with progress tracking
        const uploadTask = fileRef.put(file);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Update progress bar
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressElement.querySelector('.upload-progress-bar').style.width = progress + '%';
            },
            (error) => {
                console.error('Upload failed:', error);
                progressElement.innerHTML = 'Upload failed';
                setTimeout(() => progressElement.remove(), 3000);
            },
            async () => {
                // Upload completed
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                progressElement.remove();

                // Send message to chat
                const chatRef = database.ref(`rooms/${roomName}/chat`);
                chatRef.push({
                    sender: userName,
                    message: downloadURL,
                    fileName: file.name,
                    fileType: file.type,
                    timestamp: Date.now(),
                    type: 'file'
                });
            }
        );
    } catch (error) {
        console.error('Error starting upload:', error);
        progressElement.innerHTML = 'Upload failed';
        setTimeout(() => progressElement.remove(), 3000);
    }
}
