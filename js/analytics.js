// Enhanced Analytics with YouTube Event Tracking

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
        this.lastRecordedTime = 0;
        this.trackingInterval = null;
        this.tabActiveTime = 0;
        this.tabStartTime = null;
        this.visibilityChangeHandler = null;
        this.player = null;
    }

    startTracking(videoId, videoTitle, player) {
        this.sessionData.videoId = videoId;
        this.sessionData.videoTitle = videoTitle;
        this.sessionData.openTime = new Date().toISOString();
        this.isTracking = true;
        this.player = player;

        console.log('🎬 Analytics tracking started for:', videoTitle);

        this.setupTabVisibilityTracking();
        this.startProgressTracking();
    }

    logPlayEvent(currentTime, timestamp) {
        this.sessionData.playPauseLog.push({
            action: 'PLAY',
            time: currentTime.toFixed(2),
            timestamp: timestamp
        });

        this.lastTime = currentTime;
        this.lastRecordedTime = currentTime;

        console.log('📝 Logged PLAY event at', currentTime.toFixed(2));
    }

    logPauseEvent(currentTime, timestamp) {
        const watchedDuration = currentTime - this.lastTime;
        this.sessionData.totalWatchTime += Math.max(0, watchedDuration);

        if (Math.abs(currentTime - this.lastRecordedTime) > 2) {
            this.logSeekEvent(this.lastRecordedTime, currentTime);
        }

        this.sessionData.playPauseLog.push({
            action: 'PAUSE',
            time: currentTime.toFixed(2),
            watchedDuration: watchedDuration.toFixed(2),
            timestamp: timestamp
        });

        this.lastRecordedTime = currentTime;

        console.log('📝 Logged PAUSE event at', currentTime.toFixed(2), '| Watched:', watchedDuration.toFixed(2), 's');
    }

    logEndEvent(duration, timestamp) {
        this.sessionData.playPauseLog.push({
            action: 'ENDED',
            time: duration.toFixed(2),
            timestamp: timestamp
        });

        console.log('📝 Logged ENDED event');
    }

    logSeekEvent(fromTime, toTime) {
        this.sessionData.seekHistory.push({
            from: fromTime.toFixed(2),
            to: toTime.toFixed(2),
            timestamp: new Date().toISOString(),
            duration: Math.abs(toTime - fromTime).toFixed(2)
        });

        console.log('📝 Logged SEEK event:', fromTime.toFixed(2), '→', toTime.toFixed(2));
    }

    logPlaybackRateChange(playbackRate) {
        if (!this.sessionData.playbackRates.includes(playbackRate)) {
            this.sessionData.playbackRates.push(playbackRate);
        }

        console.log('📝 Logged playback rate:', playbackRate + 'x');
    }

    logQualityChange(quality) {
        this.sessionData.playbackQuality = quality;

        console.log('📝 Logged quality:', quality);
    }

    setupTabVisibilityTracking() {
        this.tabStartTime = Date.now();

        this.visibilityChangeHandler = () => {
            const now = Date.now();
            
            if (document.hidden) {
                this.tabActiveTime += (now - this.tabStartTime);
                this.sessionData.tabVisibilityLog.push({
                    action: 'LEFT_TAB',
                    timestamp: new Date().toISOString(),
                    tabActiveTime: (this.tabActiveTime / 1000).toFixed(2)
                });
                console.log('⚠️ User left tab. Time spent:', (this.tabActiveTime / 1000).toFixed(2), 'seconds');
            } else {
                this.tabStartTime = Date.now();
                this.sessionData.tabVisibilityLog.push({
                    action: 'RETURNED_TO_TAB',
                    timestamp: new Date().toISOString()
                });
                console.log('✅ User returned to tab');
            }
        };

        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    startProgressTracking() {
        if (this.trackingInterval) clearInterval(this.trackingInterval);

        this.trackingInterval = setInterval(() => {
            if (!this.isTracking || !this.player) return;

            try {
                const currentTime = this.player.getCurrentTime();
                const duration = this.player.getDuration();

                this.sessionData.currentTime = currentTime;
                this.sessionData.duration = duration;

                if (duration > 0) {
                    this.sessionData.completionPercentage = (currentTime / duration) * 100;
                }

                if (Math.abs(currentTime - this.lastRecordedTime) > 3) {
                    this.logSeekEvent(this.lastRecordedTime, currentTime);
                    this.lastRecordedTime = currentTime;
                }

            } catch (e) {
                // Player might not be ready yet
            }
        }, CONFIG.TRACKING.PROGRESS_UPDATE_INTERVAL);
    }

    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
        }

        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        }

        this.sessionData.closeTime = new Date().toISOString();
        
        const openTime = new Date(this.sessionData.openTime);
        const closeTime = new Date(this.sessionData.closeTime);
        this.sessionData.totalSessionDuration = (closeTime - openTime) / 1000;

        if (!document.hidden) {
            this.tabActiveTime += (Date.now() - this.tabStartTime);
        }

        this.sessionData.tabVisibilityLog.push({
            action: 'SESSION_ENDED',
            totalTabTime: (this.tabActiveTime / 1000).toFixed(2),
            timestamp: new Date().toISOString()
        });

        this.isTracking = false;

        console.log('🛑 Analytics tracking stopped');
        console.log('📊 Final Session Data:', this.sessionData);

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
            'Completion Percentage': this.sessionData.completionPercentage.toFixed(2) + '%',
            'Tab Active Time (seconds)': (this.tabActiveTime / 1000).toFixed(2),
            'Play/Pause Events': this.sessionData.playPauseLog.length,
            'Seek Events': this.sessionData.seekHistory.length,
            'Tab Visibility Changes': this.sessionData.tabVisibilityLog.length,
            'Playback Rates Used': this.sessionData.playbackRates.join(', ') || '1',
            'Playback Quality': this.sessionData.playbackQuality || 'auto'
        };
    }

    getDetailedJSON() {
        return this.sessionData;
    }
}

console.log('✅ Enhanced Analytics class loaded');
