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
        this.outerRing = null;
        this.outerGlow = null;
        this.container = null;
        
        // Output vector
        this.outputX = 0;
        this.outputY = 0;
    }
    
    create(container) {
        // Create container for joystick elements
        this.container = this.scene.add.container(this.baseX, this.baseY);
        const layerDepth = (this.config && typeof this.config.layerDepth === 'number') ? this.config.layerDepth : 5000;
        this.container.setDepth(layerDepth); // Above game and UI HUD
        this.container.setScrollFactor(0); // Fixed to camera
        
        const baseColor = this.config.baseColor ?? 0x5c5c5c;
        const baseOpacity = (this.config.baseOpacity ?? this.config.opacity ?? 0.95);
        const outerRingRadiusOffset = this.config.outerRingRadiusOffset ?? 12;
        const outerRingThickness = this.config.outerRingThickness ?? 6;
        const outerRingColor = this.config.outerRingColor ?? 0xffffff;
        const outerRingOpacity = this.config.outerRingOpacity ?? 0.85;
        const glowColor = this.config.glowColor ?? 0xffffff;
        const glowOpacity = (typeof this.config.glowOpacity === 'number') ? this.config.glowOpacity : 0.25;
        const glowRadiusOffset = this.config.glowRadiusOffset ?? (outerRingRadiusOffset + 10);
        
        // Base circle (background)
        this.baseCircle = this.scene.add.circle(0, 0, this.baseRadius, baseColor, baseOpacity);
        
        // Soft glow behind the base
        this.outerGlow = this.scene.add.circle(0, 0, this.baseRadius + glowRadiusOffset, glowColor, glowOpacity);
        if (this.outerGlow.setBlendMode) {
            this.outerGlow.setBlendMode(Phaser.BlendModes.ADD);
        }
        
        // Decorative outer ring
        this.outerRing = this.scene.add.circle(0, 0, this.baseRadius + outerRingRadiusOffset, 0x000000, 0);
        this.outerRing.setStrokeStyle(outerRingThickness, outerRingColor, outerRingOpacity);
        
        // Knob circle (movable)
        const knobColor = this.config.knobColor ?? 0xffffff;
        const knobOpacity = this.config.knobOpacity ?? this.config.opacity ?? 1;
        const knobStrokeColor = this.config.knobStrokeColor ?? 0xffffff;
        const knobStrokeAlpha = this.config.knobStrokeAlpha ?? 0.9;
        const knobStrokeWidth = this.config.knobStrokeWidth ?? 3;
        this.knobCircle = this.scene.add.circle(0, 0, this.knobRadius, knobColor, knobOpacity);
        this.knobCircle.setStrokeStyle(knobStrokeWidth, knobStrokeColor, knobStrokeAlpha);
        
        // Add to container
        this.container.add([this.outerGlow, this.baseCircle, this.outerRing, this.knobCircle]);
        
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
        // Skip if already tracking a pointer
        if (this.activePointerId !== null) return;
        
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
        this.depthLayer = null;
        this.background = null;
        this.glow = null;
        this.labelText = null;
        this.container = null;
        
        // Active touch pointer ID
        this.activePointerId = null;
        this.baseScale = 1;
    }
    
    create(container) {
        // Create container for button elements
        this.container = this.scene.add.container(this.x, this.y);
        const layerDepth = (this.config && typeof this.config.layerDepth === 'number') ? this.config.layerDepth : 5000;
        this.container.setDepth(layerDepth); // Above game and UI HUD
        this.container.setScrollFactor(0); // Fixed to camera
        
        // 3D depth layer (backing circle) - offset to create raised effect
        const depthOffset = this.config.depthOffset ?? 5;
        const depthColor = this.config.depthColor ?? 0x2a2a2a;
        const depthOpacity = this.config.depthOpacity ?? 0.6;
        this.depthLayer = this.scene.add.circle(depthOffset, depthOffset, this.size / 2, depthColor, depthOpacity);
        
        // Soft glow (like joystick)
        const glowColor = this.config.glowColor ?? 0x6fd3ff;
        const glowOpacity = (typeof this.config.glowOpacity === 'number') ? this.config.glowOpacity : 0.25;
        const glowRadius = (this.size / 2) + 10;
        this.glow = this.scene.add.circle(0, 0, glowRadius, glowColor, glowOpacity);
        if (this.glow.setBlendMode) {
            this.glow.setBlendMode(Phaser.BlendModes.ADD);
        }
        
        // Background circle
        this.background = this.scene.add.circle(0, 0, this.size / 2, this.config.backgroundColor, this.config.opacity);
        const strokeColor = this.config.strokeColor ?? 0xFFFFFF;
        const strokeAlpha = this.config.strokeAlpha ?? 0.7;
        const strokeWidth = this.config.strokeWidth ?? 3;
        this.background.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
        
        // Label text
        this.labelText = this.scene.add.text(0, 0, this.label, {
            fontSize: `${Math.floor(this.size * 0.22)}px`,
            fill: `#${this.config.textColor.toString(16).padStart(6, '0')}`,
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            align: 'center'
        });
        this.labelText.setOrigin(0.5);
        
        // Add to container (depth layer first, then glow, background, and text on top)
        this.container.add([this.depthLayer, this.glow, this.background, this.labelText]);
        
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
        // Skip if already tracking a pointer
        if (this.activePointerId !== null) return;
        
        this.activePointerId = pointer.id;
        this.isPressed = true;
        
        // Visual feedback: scale down and push into depth layer
        const pressScale = (typeof this.config.pressScale === 'number') ? this.config.pressScale : 0.95;
        if (this.container) {
            this.container.setScale(this.baseScale * pressScale);
        }
        const depthOffset = this.config.depthOffset ?? 5;
        const pushOffset = depthOffset * 0.6; // Push 60% toward the depth layer
        
        // Shift background, glow, and text toward depth layer
        if (this.background) this.background.setPosition(pushOffset, pushOffset);
        if (this.glow) this.glow.setPosition(pushOffset, pushOffset);
        if (this.labelText) this.labelText.setPosition(pushOffset, pushOffset);
    }
    
    onTouchEnd(pointer) {
        if (this.activePointerId !== pointer.id) return;
        
        this.isPressed = false;
        this.activePointerId = null;
        
        // Visual feedback: scale back to base scale and restore position
        if (this.container) {
            this.container.setScale(this.baseScale);
        }
        
        // Reset positions
        if (this.background) this.background.setPosition(0, 0);
        if (this.glow) this.glow.setPosition(0, 0);
        if (this.labelText) this.labelText.setPosition(0, 0);
    }
    
    isButtonPressed() {
        return this.isPressed;
    }
    
    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }
    
    setBaseScale(scale) {
        this.baseScale = scale;
        if (this.container) {
            this.container.setScale(scale);
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
    constructor(scene, uiScene, unifiedInputController, renderScene = null) {
        this.scene = scene; // Game scene (for input events)
        this.uiScene = uiScene; // UI scene (for rendering)
        this.renderScene = renderScene || uiScene; // Scene actually drawing the controls
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
        
        // Cached viewport info from UIScene
        this.viewportInfo = null;
        this.screenMetrics = null;
        
        // Configuration
        this.config = window.TOUCH_CONTROLS_CONFIG || {
            joystick: {
                baseRadius: 72,
                knobRadius: 30,
                marginLeft: 60,
                marginBottom: 60,
                opacity: 0.45,
                baseColor: 0x5c5c5c,
                baseOpacity: 0.25,
                knobColor: 0xffffff,
                knobOpacity: 0.5,
                outerRingColor: 0xffffff,
                outerRingOpacity: 0.8,
                outerRingThickness: 6,
                outerRingRadiusOffset: 14,
                glowColor: 0x6fd3ff,
                glowOpacity: 0.25,
                glowRadiusOffset: 26,
                horizontalPadding: 32,
                verticalPadding: 48,
                verticalOffset: 0,
                layerDepth: 6000,
                placementMode: 'auto',
                screenAnchorX: 0.08,
                screenAnchorY: 0.74,
                screenOffsetX: 0,
                screenOffsetY: 0,
                minScreenPaddingX: 48,
                minScreenPaddingY: 72,
                pillarMinWidth: 140,
                pillarAnchorRatio: 0.55,
                pillarAnchorY: 0.62,
                pillarOffsetX: 0
            },
            buttons: {
                size: 70,
                spacing: 100,
                marginRight: 60,
                marginBottom: 60,
                opacity: 0.85,
                backgroundColor: 0x000000,
                textColor: 0xFFFFFF,
                pressScale: 0.9
            }
        };
        
        // Virtual dimensions
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        
        console.log('📱 TouchControlsOverlay initialized');
    }
    
    create() {
        // Get UI scale from UIScene (for responsive scaling)
        const uiScale = this.uiScene.uiScale || 1.0;
        this.viewportInfo = this.uiScene.viewportInfo || null;
        
        // Calculate responsive scale (clamp between min and max)
        const config = window.TOUCH_CONTROLS_CONFIG || this.config;
        const minScale = config.minScale || 0.8;
        const maxScale = config.maxScale || 1.2;
        const responsiveScale = Math.max(minScale, Math.min(maxScale, uiScale));
        
        // Calculate current screen metrics so controls can live outside the gameplay viewport
        const metrics = this.getScreenMetrics();
        this.screenMetrics = metrics;
        
        // Scale joystick sizes
        const scaledBaseRadius = this.config.joystick.baseRadius * responsiveScale;
        const scaledKnobRadius = this.config.joystick.knobRadius * responsiveScale;
        
        // Ensure minimum touch target size
        const minTouchTarget = config.minTouchTarget || 44;
        const finalBaseRadius = Math.max(scaledBaseRadius, minTouchTarget);
        const finalKnobRadius = Math.max(scaledKnobRadius, minTouchTarget * 0.375);
        
        const displayBaseRadius = finalBaseRadius * responsiveScale;
        const joystickPosition = this.calculateJoystickPosition(
            metrics.screenWidth,
            metrics.screenHeight,
            metrics.viewport,
            displayBaseRadius
        );
        
        // Create virtual joystick
        this.joystick = new VirtualJoystick(
            this.renderScene,
            joystickPosition.x,
            joystickPosition.y,
            finalBaseRadius,
            finalKnobRadius,
            this.config.joystick
        );
        this.joystick.create();
        
        // Apply scale to joystick container
        if (this.joystick.container) {
            this.joystick.container.setScale(responsiveScale);
        }
        
        // Calculate button positions (diamond layout) using actual screen dimensions
        // Align button center vertically with the joystick
        const buttonCenterX = metrics.screenWidth - this.config.buttons.marginRight - (this.config.buttons.spacing * 0.7);
        const buttonCenterY = joystickPosition.y; // Align with joystick Y position
        const spacing = this.config.buttons.spacing;
        
        // Scale button size
        const scaledButtonSize = this.config.buttons.size * responsiveScale;
        const finalButtonSize = Math.max(scaledButtonSize, minTouchTarget);
        
        // Create action buttons in diamond pattern
        // Top: Jump
        this.buttons.jump = new ActionButton(
            this.renderScene,
            buttonCenterX,
            buttonCenterY - spacing,
            finalButtonSize,
            'JUMP',
            'jump',
            this.config.buttons
        );
        this.buttons.jump.create();
        if (this.buttons.jump) {
            this.buttons.jump.setBaseScale(responsiveScale);
        }
        
        // Left: Attack (Punch)
        this.buttons.punch = new ActionButton(
            this.renderScene,
            buttonCenterX - spacing,
            buttonCenterY,
            finalButtonSize,
            'ATTACK',
            'punch',
            this.config.buttons
        );
        this.buttons.punch.create();
        if (this.buttons.punch) {
            this.buttons.punch.setBaseScale(responsiveScale);
        }
        
        // Right: Switch (Character Switch)
        this.buttons.characterSwitch = new ActionButton(
            this.renderScene,
            buttonCenterX + spacing,
            buttonCenterY,
            finalButtonSize,
            'SWITCH',
            'characterSwitch',
            this.config.buttons
        );
        this.buttons.characterSwitch.create();
        if (this.buttons.characterSwitch) {
            this.buttons.characterSwitch.setBaseScale(responsiveScale);
        }
        
        // Bottom: Throw (Record Throw)
        this.buttons.recordThrow = new ActionButton(
            this.renderScene,
            buttonCenterX,
            buttonCenterY + spacing,
            finalButtonSize,
            'THROW',
            'recordThrow',
            this.config.buttons
        );
        this.buttons.recordThrow.create();
        if (this.buttons.recordThrow) {
            this.buttons.recordThrow.setBaseScale(responsiveScale);
        }
        
        // Store scale for potential updates on resize
        this.currentScale = responsiveScale;
        
        // Initially hidden
        this.setVisible(false);
        
        // Listen for UI scale changes (on window resize)
        if (this.uiScene) {
            this.uiScene.events.on('uiScaleChanged', (newScale, viewportInfo) => {
                this.updateScale(newScale, viewportInfo);
            });
        }
        
        console.log('📱 Touch controls overlay created with scale:', responsiveScale);
    }
    
    /**
     * Update scale of all controls (called on window resize)
     * @param {number} newScale - New UI scale factor
     */
    updateScale(newScale, viewportInfo = null) {
        if (viewportInfo) {
            this.viewportInfo = viewportInfo;
        }
        
        const config = window.TOUCH_CONTROLS_CONFIG || this.config;
        const minScale = config.minScale || 0.8;
        const maxScale = config.maxScale || 1.2;
        const responsiveScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        if (this.joystick && this.joystick.container) {
            this.joystick.container.setScale(responsiveScale);
        }
        
        Object.values(this.buttons).forEach(button => {
            if (button) {
                button.setBaseScale(responsiveScale);
            }
        });
        
        this.currentScale = responsiveScale;
        this.repositionJoystick(responsiveScale);
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
        
        Object.values(this.buttons).forEach((button, index) => {
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
    
    getScreenMetrics() {
        const scaleManager = (this.renderScene && this.renderScene.scale) || (this.uiScene && this.uiScene.scale);
        const screenWidth = (window.visualViewport && window.visualViewport.width) ||
            window.innerWidth ||
            (scaleManager ? scaleManager.width : this.virtualWidth);
        const screenHeight = (window.visualViewport && window.visualViewport.height) ||
            window.innerHeight ||
            (scaleManager ? scaleManager.height : this.virtualHeight);
        const viewport = this.viewportInfo || (this.uiScene ? this.uiScene.viewportInfo : null) || {
            x: 0,
            y: 0,
            width: this.virtualWidth,
            height: this.virtualHeight
        };
        
        return {
            screenWidth,
            screenHeight,
            viewport
        };
    }
    
    calculateJoystickPosition(screenWidth, screenHeight, viewport, displayBaseRadius) {
        const joystickConfig = this.config.joystick || {};
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const horizontalPadding = joystickConfig.horizontalPadding || 32;
        const verticalPadding = joystickConfig.verticalPadding || 48;
        const placementMode = joystickConfig.placementMode || 'auto'; // auto | screen | pillar
        const anchorX = typeof joystickConfig.screenAnchorX === 'number' ? joystickConfig.screenAnchorX : 0.1;
        const anchorY = typeof joystickConfig.screenAnchorY === 'number' ? joystickConfig.screenAnchorY : 0.7;
        const screenOffsetX = joystickConfig.screenOffsetX || 0;
        const screenOffsetY = joystickConfig.screenOffsetY || 0;
        const minScreenPaddingX = joystickConfig.minScreenPaddingX || horizontalPadding;
        const minScreenPaddingY = joystickConfig.minScreenPaddingY || verticalPadding;
        
        // Base screen-anchored position (percent of actual display)
        const screenAnchoredX = clamp(
            (screenWidth * anchorX) + screenOffsetX,
            displayBaseRadius + minScreenPaddingX,
            screenWidth - displayBaseRadius - minScreenPaddingX
        );
        const screenAnchoredY = clamp(
            (screenHeight * anchorY) + screenOffsetY,
            displayBaseRadius + minScreenPaddingY,
            screenHeight - displayBaseRadius - minScreenPaddingY
        );
        
        const leftSafeArea = viewport ? viewport.x : 0;
        const hasPillarSpace = leftSafeArea > (joystickConfig.pillarMinWidth || (displayBaseRadius * 1.25));
        const shouldUsePillar = (placementMode === 'pillar') || (placementMode === 'auto' && hasPillarSpace);
        
        if (shouldUsePillar && hasPillarSpace) {
            const pillarAnchorRatio = (typeof joystickConfig.pillarAnchorRatio === 'number') ? joystickConfig.pillarAnchorRatio : 0.5;
            const pillarOffsetX = joystickConfig.pillarOffsetX || 0;
            const pillarAnchorY = (typeof joystickConfig.pillarAnchorY === 'number') ? joystickConfig.pillarAnchorY : anchorY;
            const pillarX = clamp(
                (leftSafeArea * pillarAnchorRatio) - pillarOffsetX,
                displayBaseRadius + horizontalPadding,
                screenAnchoredX
            );
            const viewportTop = viewport ? viewport.y : 0;
            const viewportHeight = viewport ? viewport.height : screenHeight;
            const pillarY = clamp(
                viewportTop + (viewportHeight * pillarAnchorY),
                displayBaseRadius + verticalPadding,
                screenHeight - displayBaseRadius - verticalPadding
            );
            return { x: pillarX, y: pillarY };
        }
        
        // Fallback to pure screen anchoring so controls remain independent of the game window
        return {
            x: screenAnchoredX,
            y: screenAnchoredY
        };
    }
    
    repositionJoystick(scaleFactor) {
        if (!this.joystick || !this.joystick.container) return;
        
        const metrics = this.getScreenMetrics();
        this.screenMetrics = metrics;
        const scale = scaleFactor || this.currentScale || 1;
        const displayBaseRadius = this.joystick.baseRadius * scale;
        const { x, y } = this.calculateJoystickPosition(
            metrics.screenWidth,
            metrics.screenHeight,
            metrics.viewport,
            displayBaseRadius
        );
        this.joystick.container.setPosition(x, y);
    }
}

// Make classes available globally
window.VirtualJoystick = VirtualJoystick;
window.ActionButton = ActionButton;
window.TouchControlsOverlay = TouchControlsOverlay;

