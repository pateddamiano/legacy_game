// ========================================
// FULLSCREEN MANAGER
// ========================================
// Handles automatic fullscreen requests on first user interaction
// Browsers require user gesture, so we request on first click/touch

const FullscreenManager = {
    hasRequestedFullscreen: false,
    game: null,
    
    initialize(game) {
        this.game = game;
        this.hasRequestedFullscreen = false;
        
        // Check if we should auto-request fullscreen
        // Only on mobile devices by default, or if explicitly enabled
        const shouldAutoRequest = (window.DeviceManager && window.DeviceManager.isMobile) ||
                                  (window.DEBUG_MODE && window.DeviceManager);
        
        if (shouldAutoRequest) {
            console.log('📱 FullscreenManager: Auto-request enabled for mobile devices');
        } else {
            console.log('📱 FullscreenManager: Auto-request disabled (desktop mode)');
        }
        
        this.shouldAutoRequest = shouldAutoRequest;
    },
    
    /**
     * Request fullscreen on first user interaction
     * Call this from scene input handlers (pointerdown, etc.)
     */
    requestFullscreenOnInteraction(pointer) {
        // Only request once
        if (this.hasRequestedFullscreen) {
            return;
        }
        
        // Only auto-request if enabled
        if (!this.shouldAutoRequest) {
            return;
        }
        
        // Check if already in fullscreen
        if (this.game && this.game.scale && this.game.scale.isFullscreen) {
            this.hasRequestedFullscreen = true;
            return;
        }
        
        // Mark as requested (even if it fails, don't keep trying)
        this.hasRequestedFullscreen = true;
        
        console.log('📱 FullscreenManager: Requesting fullscreen on first interaction...');
        
        // Small delay to ensure the user gesture is still valid
        setTimeout(() => {
            this.enterFullscreen();
        }, 100);
    },
    
    /**
     * Enter fullscreen using Phaser API or native fallback
     */
    enterFullscreen() {
        try {
            if (this.game && this.game.scale) {
                const scaleManager = this.game.scale;
                
                if (!scaleManager.isFullscreen) {
                    console.log('📱 FullscreenManager: Attempting to enter fullscreen via Phaser...');
                    scaleManager.startFullscreen();
                }
            }
        } catch (error) {
            console.warn('📱 FullscreenManager: Phaser fullscreen failed, trying native API...', error);
            
            // Fallback to native fullscreen API
            try {
                const element = document.getElementById('game-container') || document.documentElement;
                
                if (!document.fullscreenElement && 
                    !document.webkitFullscreenElement && 
                    !document.msFullscreenElement &&
                    !document.mozFullScreenElement) {
                    
                    console.log('📱 FullscreenManager: Attempting native fullscreen...');
                    
                    if (element.requestFullscreen) {
                        element.requestFullscreen();
                    } else if (element.webkitRequestFullscreen) {
                        element.webkitRequestFullscreen();
                    } else if (element.msRequestFullscreen) {
                        element.msRequestFullscreen();
                    } else if (element.mozRequestFullScreen) {
                        element.mozRequestFullScreen();
                    } else {
                        console.warn('📱 FullscreenManager: Fullscreen API not supported');
                    }
                }
            } catch (fallbackError) {
                console.error('📱 FullscreenManager: Native fullscreen also failed:', fallbackError);
            }
        }
    },
    
    /**
     * Reset the fullscreen request flag (useful for testing)
     */
    reset() {
        this.hasRequestedFullscreen = false;
        console.log('📱 FullscreenManager: Reset - will request again on next interaction');
    }
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.FullscreenManager = FullscreenManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FullscreenManager;
}

