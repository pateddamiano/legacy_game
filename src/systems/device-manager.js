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
    hasTouchSupport: false,
    
    // Manual toggle state (for testing on desktop)
    touchControlsEnabled: null, // null = auto-detect, true/false = manual override
    
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
        
        // Detect touch support
        this.hasTouchSupport = 'ontouchstart' in window || 
                               navigator.maxTouchPoints > 0 || 
                               navigator.msMaxTouchPoints > 0;

        console.log(`📱 DeviceManager Initialized: Mobile=${this.isMobile}, Desktop=${this.isDesktop}, TouchSupport=${this.hasTouchSupport}`);

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
        
        // Load manual toggle state from sessionStorage
        const storedToggle = sessionStorage.getItem('touchControlsEnabled');
        if (storedToggle !== null) {
            this.touchControlsEnabled = storedToggle === 'true';
            console.log(`📱 Loaded touch controls toggle from sessionStorage: ${this.touchControlsEnabled}`);
        }
    },

    checkOrientation() {
        // Prefer visualViewport when available; fallback to inner dimensions
        const vw = window.visualViewport;
        const width = vw ? vw.width : window.innerWidth;
        const height = vw ? vw.height : window.innerHeight;
        
        const wasPortrait = this.isPortrait;
        
        // Add a small hysteresis to avoid flip-flop when bars show/hide
        this.isPortrait = height > width * 1.02;
        this.isLandscape = !this.isPortrait;
        
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
    },
    
    /**
     * Determine if touch controls overlay should be shown.
     * Checks URL parameter first, then manual toggle, then auto-detection.
     * @returns {boolean} True if touch controls should be visible
     */
    shouldShowTouchControls() {
        // Check URL parameter first (for testing)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('touchControls')) {
            const urlValue = urlParams.get('touchControls');
            const shouldShow = urlValue === 'true' || urlValue === '1';
            console.log(`📱 Touch controls from URL parameter: ${shouldShow}`);
            return shouldShow;
        }
        
        // Check manual toggle (from sessionStorage or T key)
        if (this.touchControlsEnabled !== null) {
            console.log(`📱 Touch controls from manual toggle: ${this.touchControlsEnabled}`);
            return this.touchControlsEnabled;
        }
        
        // Auto-detect: show on touch devices
        const shouldShow = this.hasTouchSupport && this.isMobile;
        console.log(`📱 Touch controls auto-detected: ${shouldShow} (hasTouchSupport=${this.hasTouchSupport}, isMobile=${this.isMobile})`);
        return shouldShow;
    },
    
    /**
     * Toggle touch controls visibility (for testing on desktop).
     * Persists to sessionStorage.
     * @param {boolean|null} enabled - true to enable, false to disable, null to reset to auto-detect
     */
    setTouchControlsEnabled(enabled) {
        this.touchControlsEnabled = enabled;
        
        if (enabled !== null) {
            sessionStorage.setItem('touchControlsEnabled', enabled.toString());
            console.log(`📱 Touch controls manually set to: ${enabled}`);
        } else {
            sessionStorage.removeItem('touchControlsEnabled');
            console.log(`📱 Touch controls reset to auto-detect`);
        }
    },
    
    /**
     * Toggle touch controls (for T key binding).
     */
    toggleTouchControls() {
        if (this.touchControlsEnabled === null) {
            // Currently auto-detect, enable manually
            this.setTouchControlsEnabled(true);
        } else if (this.touchControlsEnabled === true) {
            // Currently enabled, disable
            this.setTouchControlsEnabled(false);
        } else {
            // Currently disabled, reset to auto-detect
            this.setTouchControlsEnabled(null);
        }
    }
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.DeviceManager = DeviceManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceManager;
}

