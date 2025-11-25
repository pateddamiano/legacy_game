// ========================================
// TOUCH CONTROLS CONFIGURATION
// ========================================
// Configuration constants for mobile touch controls overlay

const TOUCH_CONTROLS_CONFIG = {
    // Analog Stick
    joystick: {
        baseRadius: 72,
        knobRadius: 30,
        marginLeft: 80,
        marginBottom: 60,
        opacity: 0.45,
        baseColor: 0x5c5c5c,
        baseOpacity: 0.35,
        knobColor: 0xFFFFFF,
        knobOpacity: 0.5,
        outerRingColor: 0xFFFFFF,
        outerRingOpacity: 0.8,
        outerRingThickness: 6,
        outerRingRadiusOffset: 14,
        glowColor: 0x6fd3ff,
        glowOpacity: 0.25,
        glowRadiusOffset: 26,
        horizontalPadding: 40,
        verticalPadding: 72,
        verticalOffset: 0,
        layerDepth: 6000,
        placementMode: 'auto', // 'auto' | 'screen' | 'pillar'
        screenAnchorX: 0.08,   // Percentage from left edge of the screen
        screenAnchorY: 0.74,   // Percentage from top edge of the screen
        screenOffsetX: 0,
        screenOffsetY: 0,
        minScreenPaddingX: 48,
        minScreenPaddingY: 72,
        pillarMinWidth: 140,
        pillarAnchorRatio: 0.55,
        pillarAnchorY: 0.62,
        pillarOffsetX: 0
    },
    
    // Action Buttons
    buttons: {
        size: 90,
        spacing: 65,
        marginRight: 120,
        marginBottom: 60,
        opacity: 0.5,
        backgroundColor: 0x5c5c5c,
        textColor: 0xFFFFFF,
        pressScale: 0.9,
        layerDepth: 6000,
        strokeColor: 0xFFFFFF,
        strokeAlpha: 0.9,
        strokeWidth: 3,
        glowColor: 0x6fd3ff,
        glowOpacity: 0.25
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

