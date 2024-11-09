let localStream;
let peers = {};
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize video chat
async function initializeVideoChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const localVideo = document.createElement('video');
        localVideo.muted = true;
        localVideo.autoplay = true;
        localVideo.srcObject = localStream;
        document.getElementById('localVideo').appendChild(localVideo);

        // Listen for new peers
        const peersRef = database.ref(`rooms/${roomName}/peers`);
        peersRef.on('child_added', (snapshot) => {
            const peerId = snapshot.key;
            if (peerId !== userName) {
                handleNewPeer(peerId);
            }
        });

        // Add self to peers
        peersRef.child(userName).set(true);
        peersRef.child(userName).onDisconnect().remove();

    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Failed to access camera/microphone');
    }
}

// Handle new peer connection
async function handleNewPeer(peerId) {
    const peerConnection = new RTCPeerConnection(configuration);
    peers[peerId] = peerConnection;

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = event => {
        const remoteVideo = document.createElement('video');
        remoteVideo.autoplay = true;
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.setAttribute('data-peer-id', peerId);
        document.getElementById('remoteVideos').appendChild(remoteVideo);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            database.ref(`rooms/${roomName}/candidates/${peerId}`).push({
                candidate: event.candidate
            });
        }
    };

    // Create and send offer
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        database.ref(`rooms/${roomName}/offers/${peerId}`).set({
            offer: {
                type: offer.type,
                sdp: offer.sdp
            }
        });
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

// Video controls
function toggleVideo() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
}

function toggleAudio() {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
}

// Clean up when leaving
window.onbeforeunload = () => {
    Object.values(peers).forEach(peer => peer.close());
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
};

// Video sharing using external links
function shareVideo() {
    const videoUrl = document.getElementById('videoUrl').value.trim();
    
    if (!videoUrl) {
        alert('Please enter a valid video URL');
        return;
    }

    // Support for YouTube and direct links
    let embedUrl = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = extractYouTubeId(videoUrl);
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else {
        embedUrl = videoUrl;
    }

    const videoRef = database.ref(`rooms/${roomName}/video`);
    videoRef.set({
        url: embedUrl,
        sharedBy: userName,
        timestamp: Date.now()
    });

    loadVideo(embedUrl);
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideo(url) {
    const videoPlayer = document.getElementById('videoPlayer');
    if (url.includes('youtube.com')) {
        videoPlayer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="${url}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>`;
    } else {
        videoPlayer.innerHTML = `
            <video id="sharedVideo" controls style="width: 100%; height: 100%;">
                <source src="${url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
    }
}
