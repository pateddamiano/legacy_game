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
        knobColor: 0xCC8800,          // health bar's orange-yellow
        knobOpacity: 0.65,
        knobStrokeColor: 0xCCAA00,    // health bar's yellow
        knobStrokeAlpha: 0.95,
        plusColor: 0xCCAA00,          // the + on the knob
        plusOpacity: 0.95,
        outerRingColor: 0xCCAA00,
        outerRingOpacity: 0.85,
        outerRingThickness: 6,
        outerRingRadiusOffset: 14,
        glowColor: 0xCC8800,
        glowOpacity: 0.28,
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
        opacity: 0.36,
        backgroundColor: 0x5c5c5c,
        textColor: 0xCCAA00,          // health bar's yellow
        pressScale: 0.9,
        layerDepth: 6000,
        strokeColor: 0xCCAA00,
        strokeAlpha: 0.75,
        strokeWidth: 3,
        glowColor: 0xCC8800,          // health bar's orange-yellow
        glowOpacity: 0.2,
        depthOffset: 5,
        depthColor: 0x2a2a2a,
        depthOpacity: 0.42
    },
    
    // Pause button (bottom centre): see-through so it never hides the action
    pauseButton: {
        alpha: 0.28
    },
    
    // Portrait "handheld console" mode (phone held upright): the game screen sits at the
    // top of a console body and the controls below it. See LayoutManager.getHandheldLayout.
    handheld: {
        topGap: 0.07,           // space above the game screen, as a share of the screen height
        controlsBias: 0.65,     // where the controls sit in the space below (0 top - 1 bottom)
        bodyMargin: 12,         // gap above / below the controls area
        bezelBottom: 30,        // dark strip under the screen (power LED + logo)
        maxScreenHeight: 0.52,  // screen height cap, as a share of the screen height
        sidePadding: 16,        // screen edge -> stick / diamond
        middleGap: 18,          // min gap between stick and diamond
        buttonSize: 0.82,       // action buttons relative to landscape, for a tighter diamond
        buttonSpacing: 0.88,    // diamond spacing, as a multiple of the button size (glows never touch)
        maxScale: 1.25,         // largest control size multiplier
        pauseSize: 44,          // pause button diameter at scale 1
        pauseAlpha: 0.9         // solid: it sits on the console body, not over the game
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

