// ========================================
// TOUCH CONTROLS CONFIGURATION
// ========================================
// Configuration constants for mobile touch controls overlay

const TOUCH_CONTROLS_CONFIG = {
    // Analog Stick
    joystick: {
        baseRadius: 80,
        knobRadius: 30,
        marginLeft: 60,
        marginBottom: 60,
        opacity: 0.85,
        baseColor: 0x000000,
        knobColor: 0xFFFFFF
    },
    
    // Action Buttons
    buttons: {
        size: 70,
        spacing: 100,
        marginRight: 60,
        marginBottom: 60,
        opacity: 0.85,
        backgroundColor: 0x000000,
        textColor: 0xFFFFFF,
        pressScale: 0.9
    },
    
    // Responsive scaling
    minScale: 0.8,  // Minimum scale on very small screens
    maxScale: 1.2,  // Maximum scale on large tablets
    minTouchTarget: 44  // Minimum touch target size in pixels (iOS/Android guidelines)
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.TOUCH_CONTROLS_CONFIG = TOUCH_CONTROLS_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOUCH_CONTROLS_CONFIG;
}

