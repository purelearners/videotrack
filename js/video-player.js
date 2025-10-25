// Main video player functionality with YouTube IFrame API

let videoAnalytics = null;
let ytPlayer = null;
let isVideoPlaying = false;

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

// YouTube API Ready Callback
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
    initializeYouTubePlayer(videoId, videoTitle);
    disableRightClick();
}

function initializeYouTubePlayer(videoId, videoTitle) {
    if (ytPlayer) {
        ytPlayer.destroy();
    }

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
            'playsinline': 0
        },
        events: {
            'onReady': function(event) {
                onPlayerReady(event, videoId, videoTitle);
            },
            'onStateChange': onPlayerStateChange,
            'onPlaybackRateChange': onPlaybackRateChange,
            'onPlaybackQualityChange': onPlaybackQualityChange
        }
    });

    console.log('📺 YouTube Player initialized for:', videoId);
}

function onPlayerReady(event, videoId, videoTitle) {
    console.log('✅ YouTube Player Ready');
    
    videoAnalytics.startTracking(videoId, videoTitle, ytPlayer);
    
    event.target.playVideo();
    
    console.log('▶️ Video started playing');
}

function onPlayerStateChange(event) {
    const currentTime = ytPlayer.getCurrentTime();
    const duration = ytPlayer.getDuration();
    const timestamp = new Date().toISOString();

    console.log('State changed:', event.data);

    if (event.data === YT.PlayerState.PLAYING) {
        console.log('▶️ PLAYING at', currentTime.toFixed(2), 'seconds');
        isVideoPlaying = true;
        
        videoAnalytics.logPlayEvent(currentTime, timestamp);
        
    } else if (event.data === YT.PlayerState.PAUSED) {
        console.log('⏸️ PAUSED at', currentTime.toFixed(2), 'seconds');
        isVideoPlaying = false;
        
        videoAnalytics.logPauseEvent(currentTime, timestamp);
        
    } else if (event.data === YT.PlayerState.ENDED) {
        console.log('✅ VIDEO ENDED');
        isVideoPlaying = false;
        
        videoAnalytics.logEndEvent(duration, timestamp);
    }
}

function onPlaybackRateChange(event) {
    const playbackRate = event.data;
    console.log('⚡ Playback rate changed to:', playbackRate + 'x');
    
    videoAnalytics.logPlaybackRateChange(playbackRate);
}

function onPlaybackQualityChange(event) {
    const quality = event.data;
    console.log('📊 Quality changed to:', quality);
    
    videoAnalytics.logQualityChange(quality);
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
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => messageDiv.remove(), 2000);
}

function closeVideoFullscreen() {
    console.log('❌ Closing fullscreen video');

    const analyticsData = videoAnalytics.stopTracking();

    if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
    }

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
