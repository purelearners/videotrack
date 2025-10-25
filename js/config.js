// Configuration file for video player and Google Sheets

const CONFIG = {
    // Google Sheets Web App URL (Deploy your Apps Script as Web App)
    GOOGLE_SHEETS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxi64Nn7dbEgIbV8JNJSn3T5mHQMRrZ8yAOhx3pTIbZz0kv7cy4MPRG5RiU5v6NQ-fa7Q/exec',
    
    // YouTube API key (optional, for better error handling)
    YOUTUBE_API_KEY: 'YOUR_YOUTUBE_API_KEY',
    
    // Analytics tracking settings
    TRACKING: {
        ENABLE_DETAILED_LOGGING: true,
        PROGRESS_UPDATE_INTERVAL: 5000, // 5 seconds
        BUFFER_SIZE_CHECK_INTERVAL: 2000 // 2 seconds
    }
};

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
