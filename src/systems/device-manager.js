/**
 * DeviceManager
 * Handles device detection, orientation, and mobile-specific state.
 */
const DeviceManager = {
    // Device State
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isPortrait: false,
    isLandscape: true,
    
    // Reference to the game instance
    game: null,

    initialize(game) {
        this.game = game;
        
        // Detect device type using Phaser's built-in device detection
        // Access via game instance (game.device.os) instead of static property which may be undefined
        const os = game.device.os;
        
        // Check for specific mobile OS
        this.isMobile = os.android || os.iOS || os.iPad || os.iPhone || os.windowsPhone;
        this.isDesktop = os.desktop;
        
        // Refine tablet detection (Phaser treats iPads as mobile, but we might want to distinct)
        // For now, we'll consider tablets as mobile for scaling purposes
        this.isTablet = os.iPad || (os.android && !os.mobileSafari); 

        console.log(`📱 DeviceManager Initialized: Mobile=${this.isMobile}, Desktop=${this.isDesktop}`);

        // Initial orientation check
        this.checkOrientation();
        
        // Add resizing listener to monitor orientation changes
        window.addEventListener('resize', () => {
            this.checkOrientation();
        });
        
        // Also check on orientationchange event for mobile
        window.addEventListener('orientationchange', () => {
            // Small delay to allow layout to settle
            setTimeout(() => this.checkOrientation(), 100);
        });
    },

    checkOrientation() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const wasPortrait = this.isPortrait;
        
        this.isPortrait = height > width;
        this.isLandscape = width >= height;
        
        if (wasPortrait !== this.isPortrait) {
            console.log(`📱 Orientation Changed: ${this.isPortrait ? 'Portrait' : 'Landscape'}`);
            // Emit event if we had an event system attached, or just let scenes poll
        }
    },

    /**
     * Returns true if the device is mobile and currently in portrait mode.
     * This is typically when we want to show a "Please rotate" message.
     */
    shouldShowRotatePrompt() {
        return this.isMobile && this.isPortrait;
    },
    
    /**
     * Get the safe visual viewport dimensions.
     * Uses visualViewport API if available, falling back to window inner dimensions.
     */
    getViewport() {
        if (window.visualViewport) {
            return {
                width: window.visualViewport.width,
                height: window.visualViewport.height,
                scale: window.visualViewport.scale,
                offsetLeft: window.visualViewport.offsetLeft,
                offsetTop: window.visualViewport.offsetTop
            };
        }
        
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            scale: 1,
            offsetLeft: 0,
            offsetTop: 0
        };
    }
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.DeviceManager = DeviceManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceManager;
}

