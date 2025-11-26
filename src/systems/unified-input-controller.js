// ========================================
// UNIFIED INPUT CONTROLLER
// ========================================
// Central input abstraction that unifies keyboard and touch input
// Provides a single interface for game logic to read input from any source

class UnifiedInputController {
    constructor() {
        // Input state - normalized movement and action flags
        this.state = {
            // Movement (normalized -1 to 1)
            moveX: 0,
            moveY: 0,
            
            // Actions (just pressed - reset each frame)
            punch: false,
            characterSwitch: false,
            jump: false,
            recordThrow: false,
            uiConfirm: false,  // For dialogue/menus
            
            // Actions (held - continuous)
            punchHeld: false,
            characterSwitchHeld: false,
            jumpHeld: false,
            recordThrowHeld: false,
            uiConfirmHeld: false
        };
        
        // Track input source for priority handling
        this.lastMovementSource = null; // 'keyboard' | 'touch' | null
        this.lastActionSource = {}; // Track per-action source
        
        // Track if touch is active (for priority)
        this.touchActive = false;
        
        console.log('🎮 UnifiedInputController initialized');
    }
    
    // ========================================
    // UPDATE (called each frame)
    // ========================================
    
    update() {
        // Reset "just pressed" flags each frame
        // These are set to true when an action is first pressed, then reset here
        this.state.punch = false;
        this.state.characterSwitch = false;
        this.state.jump = false;
        this.state.recordThrow = false;
        this.state.uiConfirm = false;
    }
    
    // ========================================
    // MOVEMENT INPUT
    // ========================================
    
    /**
     * Set movement vector from keyboard (arrow keys/WASD)
     * @param {number} x - Horizontal direction (-1 to 1)
     * @param {number} y - Vertical direction (-1 to 1)
     */
    setMovementFromKeyboard(x, y) {
        // Keyboard input: use directly, but mark source
        this.state.moveX = x;
        this.state.moveY = y;
        this.lastMovementSource = 'keyboard';
    }
    
    /**
     * Set movement vector from touch (analog stick)
     * @param {number} x - Horizontal direction (-1 to 1)
     * @param {number} y - Vertical direction (-1 to 1)
     */
    setMovementFromTouch(x, y) {
        // Apply sensitivity tweaks before storing so the analog feels snappier.
        const adjusted = this.applyTouchMovementSensitivity(x, y);
        // Touch input: if active, it takes priority
        if (this.touchActive) {
            this.state.moveX = adjusted.x;
            this.state.moveY = adjusted.y;
            this.lastMovementSource = 'touch';
        } else {
            // Touch not active, merge with keyboard (take max magnitude, preserve direction)
            const keyboardMag = Math.sqrt(this.state.moveX * this.state.moveX + this.state.moveY * this.state.moveY);
            const touchMag = Math.sqrt(adjusted.x * adjusted.x + adjusted.y * adjusted.y);
            
            if (touchMag > keyboardMag) {
                this.state.moveX = adjusted.x;
                this.state.moveY = adjusted.y;
                this.lastMovementSource = 'touch';
            }
            // Otherwise keep keyboard input
        }
    }

    applyTouchMovementSensitivity(x, y) {
        const inputConfig = (typeof window !== 'undefined' && window.GAME_CONFIG && window.GAME_CONFIG.input) ? window.GAME_CONFIG.input : {};
        const multiplier = (typeof inputConfig.touchMovementMultiplier === 'number') ? inputConfig.touchMovementMultiplier : 1;
        const deadZone = (typeof inputConfig.touchDeadZone === 'number') ? inputConfig.touchDeadZone : 0;
        const clampValue = (value) => {
            const abs = Math.abs(value);
            if (abs < deadZone) {
                return 0;
            }
            let adjusted = value * multiplier;
            const limited = Math.min(1, Math.abs(adjusted));
            return (adjusted >= 0 ? 1 : -1) * limited;
        };
        return {
            x: clampValue(x),
            y: clampValue(y)
        };
    }
    
    /**
     * Get current movement vector
     * @returns {{x: number, y: number}} Normalized movement vector
     */
    getMovementVector() {
        return {
            x: this.state.moveX,
            y: this.state.moveY
        };
    }
    
    // ========================================
    // ACTION INPUT
    // ========================================
    
    /**
     * Set action state from keyboard
     * @param {string} action - Action name ('punch', 'jump', 'characterSwitch', 'recordThrow', 'uiConfirm')
     * @param {boolean} pressed - Whether the key is currently pressed
     */
    setActionFromKeyboard(action, pressed) {
        // For keyboard: set "just pressed" on first press, then set held
        if (pressed && !this.state[`${action}Held`]) {
            // First press - set just pressed flag
            this.state[action] = true;
        }
        this.state[`${action}Held`] = pressed;
        this.lastActionSource[action] = 'keyboard';
    }
    
    /**
     * Set action state from touch
     * @param {string} action - Action name
     * @param {boolean} pressed - Whether the button is currently pressed
     */
    setActionFromTouch(action, pressed) {
        // Touch takes priority if active
        if (pressed && !this.state[`${action}Held`]) {
            // First press - set just pressed flag
            this.state[action] = true;
        }
        this.state[`${action}Held`] = pressed;
        this.lastActionSource[action] = 'touch';
    }
    
    /**
     * Check if action was just pressed (this frame)
     * @param {string} action - Action name
     * @returns {boolean} True if action was just pressed
     */
    isActionPressed(action) {
        return this.state[action] === true;
    }
    
    /**
     * Check if action is currently held
     * @param {string} action - Action name
     * @returns {boolean} True if action is held
     */
    isActionHeld(action) {
        return this.state[`${action}Held`] === true;
    }
    
    // ========================================
    // TOUCH STATE MANAGEMENT
    // ========================================
    
    /**
     * Mark touch as active (joystick or buttons being used)
     */
    setTouchActive(active) {
        this.touchActive = active;
        
        // If touch becomes inactive, reset movement
        if (!active) {
            // Only reset if touch was the source
            if (this.lastMovementSource === 'touch') {
                this.state.moveX = 0;
                this.state.moveY = 0;
                this.lastMovementSource = null;
            }
        }
    }
    
    /**
     * Check if touch is currently active
     * @returns {boolean}
     */
    isTouchActive() {
        return this.touchActive;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    /**
     * Reset all input state (useful for cutscenes, etc.)
     */
    reset() {
        this.state.moveX = 0;
        this.state.moveY = 0;
        this.state.punch = false;
        this.state.characterSwitch = false;
        this.state.jump = false;
        this.state.recordThrow = false;
        this.state.uiConfirm = false;
        this.state.punchHeld = false;
        this.state.characterSwitchHeld = false;
        this.state.jumpHeld = false;
        this.state.recordThrowHeld = false;
        this.state.uiConfirmHeld = false;
        this.lastMovementSource = null;
        this.lastActionSource = {};
        this.touchActive = false;
    }
    
    /**
     * Get current input state (for debugging)
     * @returns {object} Copy of current state
     */
    getState() {
        return { ...this.state };
    }
}

// Make UnifiedInputController available globally
window.UnifiedInputController = UnifiedInputController;

