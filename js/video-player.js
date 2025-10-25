// Main video player functionality with YouTube IFrame API - FIXED VERSION

let videoAnalytics = null;
let ytPlayer = null;
let isVideoPlaying = false;
let lastPlayerTime = 0;
let isPlayerInitialized = false;

const videoButtons = document.querySelectorAll('.video-btn');
const fullscreenModal = document.getElementById('fullscreenModal');
const videoContainer = document.getElementById('videoContainer');
const playerDiv = document.getElementById('youtube-player');
const closeBtn = document.getElementById('closeBtn');
const analyticsDisplay = document.getElementById('analyticsDisplay');
const analyticsContent = document.getElementById('analyticsContent');
const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
const saveToSheetsBtn = document.getElementById('saveToSheetsBtn');
const savingSpinner = document.getElementById('savingSpinner');

console.log('📱 DOM elements loaded');
console.log('Buttons found:', videoButtons.length);

// YouTube API Ready Callback - GLOBAL SCOPE
function onYouTubeIframeAPIReady() {
    console.log('✅ YouTube IFrame API Ready');
}

// Add event listeners to all video buttons
videoButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        const videoId = this.dataset.videoId;
        const videoTitle = this.dataset.title;
        console.log('🖱️ Button clicked:', videoId, videoTitle);
        openVideoFullscreen(videoId, videoTitle);
    });
});

function openVideoFullscreen(videoId, videoTitle) {
    console.log('🎬 Opening video:', videoTitle, 'ID:', videoId);

    videoAnalytics = new VideoAnalytics();

    fullscreenModal.classList.add('active');
    console.log('🔳 Fullscreen modal opened');

    lockToLandscape();
    requestFullscreenMode();
    
    // Initialize player after a small delay to ensure DOM is ready
    setTimeout(() => {
        initializeYouTubePlayer(videoId, videoTitle);
    }, 100);
    
    disableRightClick();
}

function initializeYouTubePlayer(videoId, videoTitle) {
    console.log('🔄 Initializing YouTube player...');
    
    // Destroy existing player if any
    if (ytPlayer) {
        try {
            ytPlayer.destroy();
        } catch(e) {
            console.log('Error destroying old player:', e);
        }
        ytPlayer = null;
    }

    // Wait a bit before creating new player
    setTimeout(() => {
        try {
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'autoplay': 1,
                    'controls': 1,
                    'rel': 0,
                    'modestbranding': 1,
                    'fs': 1,
                    'playsinline': 0,
                    'disablekb': 0
                },
                events: {
                    'onReady': (event) => onPlayerReady(event, videoId, videoTitle),
                    'onStateChange': (event) => onPlayerStateChange(event),
                    'onPlaybackRateChange': (event) => onPlaybackRateChange(event),
                    'onPlaybackQualityChange': (event) => onPlaybackQualityChange(event),
                    'onError': (event) => onPlayerError(event)
                }
            });

            console.log('📺 YouTube Player instance created for:', videoId);
            isPlayerInitialized = true;
        } catch (error) {
            console.error('❌ Error creating YouTube player:', error);
            showMessage('Error initializing video player');
        }
    }, 200);
}

function onPlayerReady(event, videoId, videoTitle) {
    console.log('✅ YouTube Player Ready - Starting playback');
    
    try {
        // Start analytics tracking
        if (videoAnalytics) {
            videoAnalytics.startTracking(videoId, videoTitle, ytPlayer);
        }
        
        // Play video
        event.target.playVideo();
        lastPlayerTime = 0;
        
        console.log('▶️ Video playback started');
        
        // Log initial play event
        const timestamp = new Date().toISOString();
        if (videoAnalytics) {
            videoAnalytics.logPlayEvent(0, timestamp);
        }
        
    } catch (error) {
        console.error('❌ Error in onPlayerReady:', error);
    }
}

function onPlayerStateChange(event) {
    if (!ytPlayer || !isPlayerInitialized) {
        console.log('⚠️ Player not ready yet');
        return;
    }

    try {
        const currentTime = ytPlayer.getCurrentTime();
        const duration = ytPlayer.getDuration();
        const timestamp = new Date().toISOString();
        const stateName = getPlayerStateName(event.data);

        console.log('=== STATE CHANGED ===');
        console.log('State:', stateName, '(' + event.data + ')');
        console.log('Current Time:', currentTime.toFixed(2) + 's');
        console.log('Duration:', duration.toFixed(2) + 's');

        if (event.data === YT.PlayerState.PLAYING) {
            console.log('▶️ PLAYING');
            isVideoPlaying = true;
            
            // Log play event
            videoAnalytics.logPlayEvent(currentTime, timestamp);
            lastPlayerTime = currentTime;
            
        } else if (event.data === YT.PlayerState.PAUSED) {
            console.log('⏸️ PAUSED');
            isVideoPlaying = false;
            
            // Log pause event
            videoAnalytics.logPauseEvent(currentTime, timestamp);
            lastPlayerTime = currentTime;
            
        } else if (event.data === YT.PlayerState.ENDED) {
            console.log('✅ ENDED');
            isVideoPlaying = false;
            
            // Log end event
            videoAnalytics.logEndEvent(duration, timestamp);
            
        } else if (event.data === YT.PlayerState.BUFFERING) {
            console.log('⏳ BUFFERING');
            
        } else if (event.data === YT.PlayerState.CUED) {
            console.log('📌 CUED');
        }
        
        console.log('===================');
        
    } catch (error) {
        console.error('❌ Error in onPlayerStateChange:', error);
    }
}

function onPlaybackRateChange(event) {
    try {
        const playbackRate = event.data;
        console.log('⚡ Playback rate changed to:', playbackRate + 'x');
        
        if (videoAnalytics) {
            videoAnalytics.logPlaybackRateChange(playbackRate);
        }
    } catch (error) {
        console.error('❌ Error in onPlaybackRateChange:', error);
    }
}

function onPlaybackQualityChange(event) {
    try {
        const quality = event.data;
        console.log('📊 Quality changed to:', quality);
        
        if (videoAnalytics) {
            videoAnalytics.logQualityChange(quality);
        }
    } catch (error) {
        console.error('❌ Error in onPlaybackQualityChange:', error);
    }
}

function onPlayerError(event) {
    console.error('❌ YouTube Player Error:', event.data);
    showMessage('Error: Video could not be loaded');
}

function getPlayerStateName(state) {
    const states = {
        '-1': 'UNSTARTED',
        '0': 'ENDED',
        '1': 'PLAYING',
        '2': 'PAUSED',
        '3': 'BUFFERING',
        '5': 'CUED'
    };
    return states[state] || 'UNKNOWN';
}

function requestFullscreenMode() {
    const elem = videoContainer;

    if (elem.requestFullscreen) {
        elem.requestFullscreen({ navigationUI: "hide" }).catch(err => console.log('Fullscreen error:', err));
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function lockToLandscape() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape-primary')
            .catch(() => {
                screen.orientation.lock('landscape')
                    .catch(e => console.log('Orientation lock not supported'));
            });
    }
}

function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
}

function disableRightClick() {
    const handler = (e) => {
        if (fullscreenModal.classList.contains('active')) {
            e.preventDefault();
            showMessage('Right-click is disabled');
            return false;
        }
    };

    playerDiv.addEventListener('contextmenu', handler);
    videoContainer.addEventListener('contextmenu', handler);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        z-index: 10001;
        font-size: 16px;
        text-align: center;
        font-weight: bold;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => messageDiv.remove(), 2000);
}

function closeVideoFullscreen() {
    console.log('❌ Closing fullscreen video');

    const analyticsData = videoAnalytics.stopTracking();

    // Destroy YouTube player
    if (ytPlayer) {
        try {
            ytPlayer.destroy();
        } catch(e) {
            console.log('Error destroying player:', e);
        }
        ytPlayer = null;
    }

    isPlayerInitialized = false;

    // Exit fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
    } else if (document.msFullscreenElement) {
        document.msExitFullscreen();
    }

    unlockOrientation();

    fullscreenModal.classList.remove('active');

    displayAnalytics(analyticsData);
}

function displayAnalytics(analyticsData) {
    analyticsContent.innerHTML = '';

    Object.entries(analyticsData).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'analytics-item';
        item.innerHTML = `
            <div class="analytics-label">${key}</div>
            <div class="analytics-value">${value}</div>
        `;
        analyticsContent.appendChild(item);
    });

    analyticsDisplay.classList.add('active');

    window.currentAnalyticsData = {
        formattedData: analyticsData,
        detailedData: videoAnalytics.sessionData
    };
}

async function saveToGoogleSheets() {
    if (!window.currentAnalyticsData) {
        alert('No analytics data to save');
        return;
    }

    savingSpinner.classList.add('active');
    saveToSheetsBtn.disabled = true;

    try {
        const payload = {
            data: window.currentAnalyticsData.formattedData,
            timestamp: new Date().toISOString(),
            detailedData: window.currentAnalyticsData.detailedData
        };

        console.log('📤 Sending data to Google Sheets:', payload);

        const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('✅ Data sent to Google Sheets');

        savingSpinner.classList.remove('active');
        saveToSheetsBtn.disabled = false;

        showMessage('✅ Analytics saved to Google Sheets!');
        
        setTimeout(() => {
            closeAnalytics();
        }, 2000);

    } catch (error) {
        console.error('❌ Error saving to Google Sheets:', error);
        savingSpinner.classList.remove('active');
        saveToSheetsBtn.disabled = false;
        showMessage('⚠️ Error saving data. Check console.');
    }
}

function closeAnalytics() {
    analyticsDisplay.classList.remove('active');
    window.currentAnalyticsData = null;
}

// Event Listeners
closeBtn.addEventListener('click', closeVideoFullscreen);
closeAnalyticsBtn.addEventListener('click', closeAnalytics);
saveToSheetsBtn.addEventListener('click', saveToGoogleSheets);

videoContainer.addEventListener('contextmenu', (e) => {
    if (fullscreenModal.classList.contains('active')) {
        e.preventDefault();
        return false;
    }
});

videoContainer.style.userSelect = 'none';
videoContainer.style.webkitUserSelect = 'none';

console.log('✅ Video player fully initialized and ready');
