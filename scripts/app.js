// Your Firebase configuration
const firebaseConfig = {
    const firebaseConfig = {

  apiKey: "AIzaSyBT6qPRvbKJmOOPaFOrQTsQaQU0DYsOvZA",

  authDomain: "watch-party-89042.firebaseapp.com",

  databaseURL: "https://watch-party-89042-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "watch-party-89042",

  storageBucket: "watch-party-89042.firebasestorage.app",

  messagingSenderId: "801694983399",

  appId: "1:801694983399:web:32ac147c52f19e4bd56e42",

  measurementId: "G-2VB13DYW85"

};

// Initialize Firebase (with storage)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// Global variables
let userName = '';
let roomName = '';
let isAdmin = false;

// UI Functions
function showCreateRoom() {
    document.getElementById('joinRoomForm').style.display = 'none';
    document.getElementById('createRoomForm').style.display = 'block';
}

function showJoinRoom() {
    document.getElementById('createRoomForm').style.display = 'none';
    document.getElementById('joinRoomForm').style.display = 'block';
}

function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

// Room Functions
async function createRoom() {
    const roomName = document.getElementById('newMeetingName').value;
    const password = document.getElementById('newRoomPassword').value;
    userName = document.getElementById('newUserName').value;

    if (!roomName || !password || !userName) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const roomRef = database.ref(`rooms/${roomName}`);
        const snapshot = await roomRef.once('value');
        
        if (snapshot.exists()) {
            alert('Room already exists');
            return;
        }

        await roomRef.set({
            password: password,
            createdBy: userName,
            createdAt: Date.now(),
            users: {},
            isLocked: false
        });

        isAdmin = true;
        enterRoom(roomName);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room');
    }
}

async function joinRoom() {
    roomName = document.getElementById('meetingName').value;
    const password = document.getElementById('roomPassword').value;
    userName = document.getElementById('userName').value;

    if (!roomName || !password || !userName) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const roomRef = database.ref(`rooms/${roomName}`);
        const snapshot = await roomRef.once('value');
        
        if (!snapshot.exists()) {
            alert('Room not found');
            return;
        }

        const room = snapshot.val();
        if (room.password !== password) {
            alert('Incorrect password');
            return;
        }

        if (room.isLocked) {
            alert('Room is locked');
            return;
        }

        enterRoom(roomName);
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Failed to join room');
    }
}

function enterRoom(roomName) {
    // Hide login, show main container
    document.getElementById('loginContainer').style.display = 'none';
    document.querySelector('.container').style.display = 'grid';

    // Initialize user in room
    const userRef = database.ref(`rooms/${roomName}/users/${userName}`);
    userRef.set({
        name: userName,
        joinedAt: Date.now(),
        isAdmin: isAdmin
    });

    // Remove user when they leave
    userRef.onDisconnect().remove();

    // Initialize video and chat
    initializeVideoChat();
    initializeChat();

    // Setup admin controls if admin
    if (isAdmin) {
        initializeAdmin(roomName, userName);
    }
}
