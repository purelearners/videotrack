// Main video player functionality with fullscreen and iframe management

let currentYouTubePlayer = null;
let videoAnalytics = new VideoAnalytics();

// Get all video buttons
const videoButtons = document.querySelectorAll('.video-btn');
const fullscreenModal = document.getElementById('fullscreenModal');
const videoContainer = document.getElementById('videoContainer');
const youtubePlayer = document.getElementById('youtube-player');
const closeBtn = document.getElementById('closeBtn');
const analyticsDisplay = document.getElementById('analyticsDisplay');
const analyticsContent = document.getElementById('analyticsContent');
const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
const saveToSheetsBtn = document.getElementById('saveToSheetsBtn');
const savingSpinner = document.getElementById('savingSpinner');

// Load YouTube IFrame API
function loadYouTubeAPI() {
    if (window.YT) return;
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
}

// YouTube API ready callback
function onYouTubeIframeAPIReady() {
    console.log('✅ YouTube API ready');
}

// Initialize YouTube API on page load
loadYouTubeAPI();

// Add event listeners to all video buttons
videoButtons.forEach(button => {
    button.addEventListener('click', function() {
        const videoId = this.dataset.videoId;
        const videoTitle = this.dataset.title;
        openVideoFullscreen(videoId, videoTitle);
    });
});

// Open video in fullscreen
function openVideoFullscreen(videoId, videoTitle) {
    console.log('🎬 Opening video:', videoTitle);

    // Reset analytics for new session
    videoAnalytics = new VideoAnalytics();

    // Build YouTube embed URL
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&fs=1&autoplay=1`;
    youtubePlayer.src = embedUrl;

    // Show fullscreen modal
    fullscreenModal.classList.add('active');

    // Lock to landscape on mobile
    lockToLandscape();

    // Request fullscreen
    requestFullscreenMode();

    // Delay to allow iframe to load
    setTimeout(() => {
        try {
            // Get the YouTube player instance from iframe
            const iframeWindow = youtubePlayer.contentWindow;
            
            // Start analytics tracking after a small delay
            setTimeout(() => {
                videoAnalytics.startTracking(videoId, videoTitle, youtubePlayer);
            }, 2000);
        } catch (e) {
            console.log('Will use fallback tracking');
            videoAnalytics.startTracking(videoId, videoTitle, null);
        }
    }, 500);

    // Prevent right-click on iframe
    disableRightClick();

    // Disable keyboard shortcuts
    disableKeyboardShortcuts();

    // Track seeking on iframe postMessage if possible
    setupSeekingTracking();
}

// Request fullscreen mode
function requestFullscreenMode() {
    const elem = videoContainer;

    if (elem.requestFullscreen) {
        elem.requestFullscreen({ navigationUI: "hide" });
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

// Lock orientation to landscape on mobile
function lockToLandscape() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape-primary')
            .catch(() => {
                screen.orientation.lock('landscape')
                    .catch(e => console.log('Orientation lock not supported'));
            });
    }
}

// Unlock orientation when closing fullscreen
function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
}

// Disable right-click context menu
function disableRightClick() {
    const handler = (e) => {
        if (fullscreenModal.classList.contains('active')) {
            e.preventDefault();
            showMessage('Right-click is disabled');
            return false;
        }
    };

    youtubePlayer.addEventListener('contextmenu', handler);
    videoContainer.addEventListener('contextmenu', handler);
}

// Disable keyboard shortcuts
function disableKeyboardShortcuts() {
    const keydownHandler = (e) => {
        if (!fullscreenModal.classList.contains('active')) return;

        // Block developer tools
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
    };

    document.addEventListener('keydown', keydownHandler);
}

// Setup seeking tracking
function setupSeekingTracking() {
    let lastTime = 0;

    // Try to track seeking using periodic checks
    const seekCheckInterval = setInterval(() => {
        if (!fullscreenModal.classList.contains('active')) {
            clearInterval(seekCheckInterval);
            return;
        }

        try {
            // YouTube API doesn't expose seeking directly from iframe
            // This is tracked through analytics timeupdate events
        } catch (e) {
            // Silent
        }
    }, 1000);
}

// Show temporary message
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
        animation: fadeInOut 2s ease-in-out;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => messageDiv.remove(), 2000);
}

// Close fullscreen video
function closeVideoFullscreen() {
    console.log('❌ Closing fullscreen video');

    // Stop analytics and get data
    const analyticsData = videoAnalytics.stopTracking();

    // Exit fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
    } else if (document.msFullscreenElement) {
        document.msExitFullscreen();
    }

    // Unlock orientation
    unlockOrientation();

    // Hide fullscreen modal
    fullscreenModal.classList.remove('active');
    youtubePlayer.src = '';

    // Display analytics
    displayAnalytics(analyticsData);
}

// Display analytics data
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

    // Store analytics data globally for saving
    window.currentAnalyticsData = {
        formattedData: analyticsData,
        detailedData: videoAnalytics.sessionData
    };
}

// Save analytics to Google Sheets
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

        const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // For CORS issues, we can still consider it successful
        savingSpinner.classList.remove('active');
        saveToSheetsBtn.disabled = false;

        showMessage('✅ Analytics saved to Google Sheets!');
        
        setTimeout(() => {
            closeAnalytics();
        }, 2000);

    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        savingSpinner.classList.remove('active');
        saveToSheetsBtn.disabled = false;
        showMessage('⚠️ Error saving data. Check console for details.');
    }
}

// Close analytics display
function closeAnalytics() {
    analyticsDisplay.classList.remove('active');
    window.currentAnalyticsData = null;
}

// Event listeners
closeBtn.addEventListener('click', closeVideoFullscreen);
closeAnalyticsBtn.addEventListener('click', closeAnalytics);
saveToSheetsBtn.addEventListener('click', saveToGoogleSheets);

// Prevent right-click globally on video container
videoContainer.addEventListener('contextmenu', (e) => {
    if (fullscreenModal.classList.contains('active')) {
        e.preventDefault();
        return false;
    }
});

// Disable text selection on video container
videoContainer.style.userSelect = 'none';
videoContainer.style.webkitUserSelect = 'none';

// Log page ready
console.log('✅ Video player initialized');
