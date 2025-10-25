// Analytics tracking for video viewing sessions

class VideoAnalytics {
    constructor() {
        this.sessionData = {
            videoId: null,
            videoTitle: null,
            openTime: null,
            closeTime: null,
            totalSessionDuration: 0,
            totalWatchTime: 0,
            playPauseLog: [],
            seekHistory: [],
            tabVisibilityLog: [],
            playbackQuality: null,
            playbackRates: [],
            currentTime: 0,
            duration: 0,
            completionPercentage: 0
        };

        this.isTracking = false;
        this.lastTime = 0;
        this.trackingInterval = null;
        this.tabActiveTime = 0;
        this.tabStartTime = null;
        this.playerState = -1;
    }

    startTracking(videoId, videoTitle, player) {
        this.sessionData.videoId = videoId;
        this.sessionData.videoTitle = videoTitle;
        this.sessionData.openTime = new Date().toISOString();
        this.isTracking = true;
        this.player = player;

        console.log('🎬 Analytics tracking started for:', videoTitle);

        // Setup YouTube Player tracking
        this.setupYouTubeTracking();
        
        // Track tab visibility
        this.setupTabVisibilityTracking();
        
        // Periodic progress update
        this.startProgressTracking();
    }

    setupYouTubeTracking() {
        if (!this.player) return;

        // Track play/pause events
        this.player.addEventListener('onStateChange', (event) => {
            this.handlePlayerStateChange(event);
        });

        // Get video duration
        setTimeout(() => {
            try {
                const duration = this.player.getDuration();
                this.sessionData.duration = duration;
            } catch (e) {
                console.log('Could not get duration');
            }
        }, 1000);
    }

    handlePlayerStateChange(event) {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        const playbackRate = this.player.getPlaybackRate();
        const quality = this.player.getPlaybackQuality();

        const timestamp = new Date().toISOString();

        if (event.data === YT.PlayerState.PLAYING) {
            console.log('▶️ Play event at', currentTime.toFixed(2), 'seconds');
            
            this.sessionData.playPauseLog.push({
                action: 'PLAY',
                time: currentTime,
                timestamp: timestamp
            });

            this.lastTime = currentTime;
            
            if (playbackRate && !this.sessionData.playbackRates.includes(playbackRate)) {
                this.sessionData.playbackRates.push(playbackRate);
            }
        } 
        else if (event.data === YT.PlayerState.PAUSED) {
            console.log('⏸️ Pause event at', currentTime.toFixed(2), 'seconds');
            
            const watchedDuration = currentTime - this.lastTime;
            this.sessionData.totalWatchTime += watchedDuration;

            this.sessionData.playPauseLog.push({
                action: 'PAUSE',
                time: currentTime,
                watchedDuration: watchedDuration,
                timestamp: timestamp
            });
        } 
        else if (event.data === YT.PlayerState.ENDED) {
            console.log('✅ Video ended');
            
            this.sessionData.playPauseLog.push({
                action: 'ENDED',
                time: duration,
                timestamp: timestamp
            });
        }
        else if (event.data === YT.PlayerState.BUFFERING) {
            console.log('⏳ Video buffering');
        }

        // Track quality
        if (quality) {
            this.sessionData.playbackQuality = quality;
        }
    }

    trackSeeking(fromTime, toTime) {
        this.sessionData.seekHistory.push({
            from: fromTime,
            to: toTime,
            timestamp: new Date().toISOString(),
            duration: Math.abs(toTime - fromTime)
        });

        console.log('📍 Seek event:', fromTime.toFixed(2), '→', toTime.toFixed(2));
    }

    setupTabVisibilityTracking() {
        this.tabStartTime = Date.now();

        document.addEventListener('visibilitychange', () => {
            const now = Date.now();
            
            if (document.hidden) {
                // User left tab
                this.tabActiveTime += (now - this.tabStartTime);
                
                this.sessionData.tabVisibilityLog.push({
                    action: 'LEFT_TAB',
                    timestamp: new Date().toISOString(),
                    tabActiveTime: this.tabActiveTime / 1000
                });

                console.log('⚠️ User left tab. Active time:', (this.tabActiveTime / 1000).toFixed(2), 'seconds');
            } else {
                // User returned to tab
                this.tabStartTime = Date.now();
                
                this.sessionData.tabVisibilityLog.push({
                    action: 'RETURNED_TO_TAB',
                    timestamp: new Date().toISOString()
                });

                console.log('✅ User returned to tab');
            }
        });
    }

    startProgressTracking() {
        this.trackingInterval = setInterval(() => {
            if (!this.player || !this.isTracking) return;

            try {
                const currentTime = this.player.getCurrentTime();
                const duration = this.player.getDuration();
                const playerState = this.player.getPlayerState();

                this.sessionData.currentTime = currentTime;
                this.sessionData.duration = duration;

                if (duration > 0) {
                    this.sessionData.completionPercentage = (currentTime / duration) * 100;
                }

                if (CONFIG.TRACKING.ENABLE_DETAILED_LOGGING) {
                    console.log(`Progress: ${currentTime.toFixed(2)}/${duration.toFixed(2)}s (${this.sessionData.completionPercentage.toFixed(1)}%)`);
                }
            } catch (e) {
                console.log('Error tracking progress:', e);
            }
        }, CONFIG.TRACKING.PROGRESS_UPDATE_INTERVAL);
    }

    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
        }

        this.sessionData.closeTime = new Date().toISOString();
        
        // Calculate final session duration
        const openTime = new Date(this.sessionData.openTime);
        const closeTime = new Date(this.sessionData.closeTime);
        this.sessionData.totalSessionDuration = (closeTime - openTime) / 1000;

        // Final tab activity
        if (!document.hidden) {
            this.tabActiveTime += (Date.now() - this.tabStartTime);
        }

        this.sessionData.tabVisibilityLog.push({
            action: 'SESSION_ENDED',
            totalTabTime: this.tabActiveTime / 1000,
            timestamp: new Date().toISOString()
        });

        this.isTracking = false;

        console.log('🛑 Analytics tracking stopped');
        console.log('📊 Session Data:', this.sessionData);

        return this.getFormattedAnalytics();
    }

    getFormattedAnalytics() {
        return {
            'Video Title': this.sessionData.videoTitle,
            'Video ID': this.sessionData.videoId,
            'Open Time': this.sessionData.openTime,
            'Close Time': this.sessionData.closeTime,
            'Total Session Duration (seconds)': this.sessionData.totalSessionDuration.toFixed(2),
            'Total Watch Time (seconds)': this.sessionData.totalWatchTime.toFixed(2),
            'Completion Percentage': this.sessionData.completionPercentage.toFixed(2),
            'Final Current Time': this.sessionData.currentTime.toFixed(2),
            'Video Duration': this.sessionData.duration.toFixed(2),
            'Playback Rates Used': this.sessionData.playbackRates.join(', '),
            'Playback Quality': this.sessionData.playbackQuality || 'Not tracked',
            'Tab Active Time (seconds)': (this.tabActiveTime / 1000).toFixed(2),
            'Play/Pause Events': this.sessionData.playPauseLog.length,
            'Seek Events': this.sessionData.seekHistory.length,
            'Tab Visibility Changes': this.sessionData.tabVisibilityLog.length
        };
    }

    getDetailedJSON() {
        return this.sessionData;
    }
}

// Create global analytics instance
const videoAnalytics = new VideoAnalytics();
