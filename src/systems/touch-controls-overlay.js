// ========================================
// TOUCH CONTROLS OVERLAY
// ========================================
// Manages visual overlay and touch event handling for mobile controls
// Includes virtual analog stick and action buttons

// ========================================
// VIRTUAL JOYSTICK
// ========================================

class VirtualJoystick {
    constructor(scene, x, y, baseRadius, knobRadius, config) {
        this.scene = scene;
        this.baseX = x;
        this.baseY = y;
        this.baseRadius = baseRadius;
        this.knobRadius = knobRadius;
        this.config = config;
        
        // Current knob position (relative to base center)
        this.knobX = 0;
        this.knobY = 0;
        
        // Active touch pointer ID
        this.activePointerId = null;
        
        // Visual elements
        this.baseCircle = null;
        this.knobCircle = null;
        this.container = null;
        
        // Output vector
        this.outputX = 0;
        this.outputY = 0;
    }
    
    create(container) {
        // Create container for joystick elements
        this.container = this.scene.add.container(this.baseX, this.baseY);
        this.container.setDepth(3000); // Above game, below UI text
        this.container.setScrollFactor(0); // Fixed to camera
        
        // Base circle (background)
        this.baseCircle = this.scene.add.circle(0, 0, this.baseRadius, this.config.baseColor, this.config.opacity);
        this.baseCircle.setStrokeStyle(2, 0xFFFFFF, 0.5);
        
        // Knob circle (movable)
        this.knobCircle = this.scene.add.circle(0, 0, this.knobRadius, this.config.knobColor, this.config.opacity);
        this.knobCircle.setStrokeStyle(2, 0xFFFFFF, 0.7);
        
        // Add to container
        this.container.add([this.baseCircle, this.knobCircle]);
        
        // Make base circle interactive for touch detection
        this.baseCircle.setInteractive({ useHandCursor: false });
        
        // Touch event handlers
        this.baseCircle.on('pointerdown', (pointer) => {
            this.onTouchStart(pointer);
        });
        
        // Also listen on scene for pointer move/up (to handle dragging outside base)
        this.scene.input.on('pointermove', (pointer) => {
            if (this.activePointerId === pointer.id) {
                this.onTouchMove(pointer);
            }
        });
        
        this.scene.input.on('pointerup', (pointer) => {
            if (this.activePointerId === pointer.id) {
                this.onTouchEnd(pointer);
            }
        });
        
        // Also handle pointer cancel (e.g., when touch is interrupted)
        this.scene.input.on('pointercancel', (pointer) => {
            if (this.activePointerId === pointer.id) {
                this.onTouchEnd(pointer);
            }
        });
    }
    
    onTouchStart(pointer) {
        // Convert pointer position to world coordinates
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        
        // Check if touch is within base circle
        const containerWorldX = this.container.x;
        const containerWorldY = this.container.y;
        const dx = worldX - containerWorldX;
        const dy = worldY - containerWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.baseRadius) {
            this.activePointerId = pointer.id;
            this.updateKnobPosition(worldX, worldY);
        }
    }
    
    onTouchMove(pointer) {
        if (this.activePointerId !== pointer.id) return;
        
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        this.updateKnobPosition(worldX, worldY);
    }
    
    onTouchEnd(pointer) {
        if (this.activePointerId !== pointer.id) return;
        
        // Snap knob back to center
        this.knobX = 0;
        this.knobY = 0;
        this.knobCircle.setPosition(0, 0);
        
        // Reset output
        this.outputX = 0;
        this.outputY = 0;
        
        this.activePointerId = null;
    }
    
    updateKnobPosition(worldX, worldY) {
        // Calculate position relative to base center
        const containerWorldX = this.container.x;
        const containerWorldY = this.container.y;
        let dx = worldX - containerWorldX;
        let dy = worldY - containerWorldY;
        
        // Clamp to base radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.baseRadius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * this.baseRadius;
            dy = Math.sin(angle) * this.baseRadius;
        }
        
        // Update knob position
        this.knobX = dx;
        this.knobY = dy;
        this.knobCircle.setPosition(dx, dy);
        
        // Calculate normalized output vector (-1 to 1)
        this.outputX = dx / this.baseRadius;
        this.outputY = dy / this.baseRadius;
    }
    
    getOutputVector() {
        return {
            x: this.outputX,
            y: this.outputY
        };
    }
    
    isActive() {
        return this.activePointerId !== null;
    }
    
    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}

// ========================================
// ACTION BUTTON
// ========================================

class ActionButton {
    constructor(scene, x, y, size, label, action, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.size = size;
        this.label = label;
        this.action = action;
        this.config = config;
        
        // Pressed state
        this.isPressed = false;
        
        // Visual elements
        this.background = null;
        this.labelText = null;
        this.container = null;
        
        // Active touch pointer ID
        this.activePointerId = null;
    }
    
    create(container) {
        // Create container for button elements
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(3000); // Above game, below UI text
        this.container.setScrollFactor(0); // Fixed to camera
        
        // Background circle
        this.background = this.scene.add.circle(0, 0, this.size / 2, this.config.backgroundColor, this.config.opacity);
        this.background.setStrokeStyle(2, 0xFFFFFF, 0.7);
        
        // Label text
        this.labelText = this.scene.add.text(0, 0, this.label, {
            fontSize: `${Math.floor(this.size * 0.4)}px`,
            fill: `#${this.config.textColor.toString(16).padStart(6, '0')}`,
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            align: 'center'
        });
        this.labelText.setOrigin(0.5);
        
        // Add to container
        this.container.add([this.background, this.labelText]);
        
        // Make interactive
        this.background.setInteractive({ useHandCursor: false });
        
        // Touch event handlers
        this.background.on('pointerdown', (pointer) => {
            this.onTouchStart(pointer);
        });
        
        this.scene.input.on('pointerup', (pointer) => {
            if (this.activePointerId === pointer.id) {
                this.onTouchEnd(pointer);
            }
        });
        
        this.scene.input.on('pointercancel', (pointer) => {
            if (this.activePointerId === pointer.id) {
                this.onTouchEnd(pointer);
            }
        });
    }
    
    onTouchStart(pointer) {
        this.activePointerId = pointer.id;
        this.isPressed = true;
        
        // Visual feedback: scale down
        this.container.setScale(this.config.pressScale);
    }
    
    onTouchEnd(pointer) {
        if (this.activePointerId !== pointer.id) return;
        
        this.isPressed = false;
        this.activePointerId = null;
        
        // Visual feedback: scale back
        this.container.setScale(1.0);
    }
    
    isButtonPressed() {
        return this.isPressed;
    }
    
    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}

// ========================================
// TOUCH CONTROLS OVERLAY
// ========================================

class TouchControlsOverlay {
    constructor(scene, uiScene, unifiedInputController) {
        this.scene = scene; // Game scene (for input events)
        this.uiScene = uiScene; // UI scene (for rendering)
        this.unifiedInput = unifiedInputController;
        
        // Virtual joystick
        this.joystick = null;
        
        // Action buttons
        this.buttons = {
            punch: null,
            jump: null,
            characterSwitch: null,
            recordThrow: null
        };
        
        // Visibility state
        this.visible = false;
        
        // Configuration
        this.config = window.TOUCH_CONTROLS_CONFIG || {
            joystick: { baseRadius: 80, knobRadius: 30, marginLeft: 60, marginBottom: 60, opacity: 0.85, baseColor: 0x000000, knobColor: 0xFFFFFF },
            buttons: { size: 70, spacing: 100, marginRight: 60, marginBottom: 60, opacity: 0.85, backgroundColor: 0x000000, textColor: 0xFFFFFF, pressScale: 0.9 }
        };
        
        // Virtual dimensions
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        
        console.log('📱 TouchControlsOverlay initialized');
    }
    
    create() {
        // Get UI scale from UIScene (for responsive scaling)
        const uiScale = this.uiScene.uiScale || 1.0;
        
        // Calculate responsive scale (clamp between min and max)
        const config = window.TOUCH_CONTROLS_CONFIG || this.config;
        const minScale = config.minScale || 0.8;
        const maxScale = config.maxScale || 1.2;
        const responsiveScale = Math.max(minScale, Math.min(maxScale, uiScale));
        
        // Calculate positions using virtual coordinates
        const joystickX = this.config.joystick.marginLeft + this.config.joystick.baseRadius;
        const joystickY = this.virtualHeight - this.config.joystick.marginBottom - this.config.joystick.baseRadius;
        
        // Scale joystick sizes
        const scaledBaseRadius = this.config.joystick.baseRadius * responsiveScale;
        const scaledKnobRadius = this.config.joystick.knobRadius * responsiveScale;
        
        // Ensure minimum touch target size
        const minTouchTarget = config.minTouchTarget || 44;
        const finalBaseRadius = Math.max(scaledBaseRadius, minTouchTarget);
        const finalKnobRadius = Math.max(scaledKnobRadius, minTouchTarget * 0.375);
        
        // Create virtual joystick
        this.joystick = new VirtualJoystick(
            this.uiScene,
            joystickX,
            joystickY,
            finalBaseRadius,
            finalKnobRadius,
            this.config.joystick
        );
        this.joystick.create();
        
        // Apply scale to joystick container
        if (this.joystick.container) {
            this.joystick.container.setScale(responsiveScale);
        }
        
        // Calculate button positions (diamond layout)
        const buttonCenterX = this.virtualWidth - this.config.buttons.marginRight - (this.config.buttons.spacing * 0.7);
        const buttonCenterY = this.virtualHeight - this.config.buttons.marginBottom - (this.config.buttons.spacing * 0.5);
        const spacing = this.config.buttons.spacing;
        
        // Scale button size
        const scaledButtonSize = this.config.buttons.size * responsiveScale;
        const finalButtonSize = Math.max(scaledButtonSize, minTouchTarget);
        
        // Create action buttons in diamond pattern
        // Top: Jump
        this.buttons.jump = new ActionButton(
            this.uiScene,
            buttonCenterX,
            buttonCenterY - spacing,
            finalButtonSize,
            'J',
            'jump',
            this.config.buttons
        );
        this.buttons.jump.create();
        if (this.buttons.jump.container) {
            this.buttons.jump.container.setScale(responsiveScale);
        }
        
        // Left: Punch
        this.buttons.punch = new ActionButton(
            this.uiScene,
            buttonCenterX - spacing,
            buttonCenterY,
            finalButtonSize,
            'P',
            'punch',
            this.config.buttons
        );
        this.buttons.punch.create();
        if (this.buttons.punch.container) {
            this.buttons.punch.container.setScale(responsiveScale);
        }
        
        // Right: Character Switch
        this.buttons.characterSwitch = new ActionButton(
            this.uiScene,
            buttonCenterX + spacing,
            buttonCenterY,
            finalButtonSize,
            'C',
            'characterSwitch',
            this.config.buttons
        );
        this.buttons.characterSwitch.create();
        if (this.buttons.characterSwitch.container) {
            this.buttons.characterSwitch.container.setScale(responsiveScale);
        }
        
        // Bottom: Record Throw
        this.buttons.recordThrow = new ActionButton(
            this.uiScene,
            buttonCenterX,
            buttonCenterY + spacing,
            finalButtonSize,
            'T',
            'recordThrow',
            this.config.buttons
        );
        this.buttons.recordThrow.create();
        if (this.buttons.recordThrow.container) {
            this.buttons.recordThrow.container.setScale(responsiveScale);
        }
        
        // Store scale for potential updates on resize
        this.currentScale = responsiveScale;
        
        // Initially hidden
        this.setVisible(false);
        
        // Listen for UI scale changes (on window resize)
        if (this.uiScene) {
            this.uiScene.events.on('uiScaleChanged', (newScale) => {
                this.updateScale(newScale);
            });
        }
        
        console.log('📱 Touch controls overlay created with scale:', responsiveScale);
    }
    
    /**
     * Update scale of all controls (called on window resize)
     * @param {number} newScale - New UI scale factor
     */
    updateScale(newScale) {
        const config = window.TOUCH_CONTROLS_CONFIG || this.config;
        const minScale = config.minScale || 0.8;
        const maxScale = config.maxScale || 1.2;
        const responsiveScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        if (this.joystick && this.joystick.container) {
            this.joystick.container.setScale(responsiveScale);
        }
        
        Object.values(this.buttons).forEach(button => {
            if (button && button.container) {
                button.container.setScale(responsiveScale);
            }
        });
        
        this.currentScale = responsiveScale;
        console.log('📱 Touch controls scale updated to:', responsiveScale);
    }
    
    update() {
        if (!this.visible) return;
        
        // Update joystick output to unified input controller
        if (this.joystick && this.joystick.isActive()) {
            const vector = this.joystick.getOutputVector();
            this.unifiedInput.setMovementFromTouch(vector.x, vector.y);
            this.unifiedInput.setTouchActive(true);
        } else {
            // If joystick not active, check if we should clear touch movement
            if (this.unifiedInput && this.unifiedInput.isTouchActive() && !this.hasActiveButtons()) {
                this.unifiedInput.setTouchActive(false);
            }
        }
        
        // Update button states to unified input controller
        if (this.buttons.punch) {
            this.unifiedInput.setActionFromTouch('punch', this.buttons.punch.isButtonPressed());
        }
        if (this.buttons.jump) {
            this.unifiedInput.setActionFromTouch('jump', this.buttons.jump.isButtonPressed());
        }
        if (this.buttons.characterSwitch) {
            this.unifiedInput.setActionFromTouch('characterSwitch', this.buttons.characterSwitch.isButtonPressed());
        }
        if (this.buttons.recordThrow) {
            this.unifiedInput.setActionFromTouch('recordThrow', this.buttons.recordThrow.isButtonPressed());
        }
        
        // Update touch active state
        const hasActiveInput = (this.joystick && this.joystick.isActive()) || this.hasActiveButtons();
        this.unifiedInput.setTouchActive(hasActiveInput);
    }
    
    hasActiveButtons() {
        return (this.buttons.punch && this.buttons.punch.isButtonPressed()) ||
               (this.buttons.jump && this.buttons.jump.isButtonPressed()) ||
               (this.buttons.characterSwitch && this.buttons.characterSwitch.isButtonPressed()) ||
               (this.buttons.recordThrow && this.buttons.recordThrow.isButtonPressed());
    }
    
    setVisible(visible) {
        this.visible = visible;
        
        if (this.joystick) {
            this.joystick.setVisible(visible);
        }
        
        Object.values(this.buttons).forEach(button => {
            if (button) {
                button.setVisible(visible);
            }
        });
    }
    
    destroy() {
        if (this.joystick) {
            this.joystick.destroy();
        }
        
        Object.values(this.buttons).forEach(button => {
            if (button) {
                button.destroy();
            }
        });
    }
}

// Make classes available globally
window.VirtualJoystick = VirtualJoystick;
window.ActionButton = ActionButton;
window.TouchControlsOverlay = TouchControlsOverlay;

