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
        this.knobPlus = null;
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
        
        // A "+" on the knob: rides with the thumb, sits dead centre at rest
        const plusColor = this.config.plusColor ?? 0xCCAA00;
        const plusOpacity = this.config.plusOpacity ?? 0.95;
        const arm = this.knobRadius * 0.5;
        const bar = Math.max(3, this.knobRadius * 0.16);
        // Baked once into a texture: a Graphics rounded rect is re-tessellated (about 100 sin/cos
        // points per corner) on EVERY frame, which added up to milliseconds per frame on phones
        const plusKey = ActionButton.bake(this.scene, `joyPlus_${Math.round(arm * 10)}_${Math.round(bar * 10)}`, arm * 2 + 2, arm * 2 + 2, (g) => {
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(1, 1 + arm - bar / 2, arm * 2, bar, bar / 2);
            g.fillRoundedRect(1 + arm - bar / 2, 1, bar, arm * 2, bar / 2);
        });
        this.knobPlus = this.scene.add.image(0, 0, plusKey);
        this.knobPlus.setTint(plusColor);
        this.knobPlus.setAlpha(plusOpacity);
        
        // Add to container
        this.container.add([this.outerGlow, this.baseCircle, this.outerRing, this.knobCircle, this.knobPlus]);
        
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
        if (this.knobPlus) this.knobPlus.setPosition(0, 0);
        
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
        if (this.knobPlus) this.knobPlus.setPosition(dx, dy);
        
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
        console.log('📱 VirtualJoystick.destroy() - cleaning up container');
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.baseCircle = null;
        this.knobCircle = null;
        this.knobPlus = null;
        this.outerGlow = null;
        this.outerRing = null;
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
        this.throwIcon = null;
        this.switchIcon = null;
        this.jumpIcon = null;
        this.attackIcon = null;
        this.cooldownRing = null;
        this.cooldownReady = null;
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
    
    // ATTACK button: swap the text for a flat one-colour fist (punching right), the same
    // colour and see-through look as the other icons.
    useAttackIcon() {
        if (!this.container) return;
        const key = ActionButton.fistSilhouette(this.scene);
        if (!key) return; // keep the text label
        const s = this.size;
        const color = this.config.strokeColor ?? 0xCCAA00;
        
        if (this.labelText) {
            this.container.remove(this.labelText, true);
        }
        
        const icon = this.scene.add.container(0, 0);
        const fist = this.scene.add.image(0, 0, key);
        fist.setScale((s * 0.56) / Math.max(fist.width, fist.height));
        fist.setTint(color);
        fist.setAlpha(ActionButton.RECORD_ALPHA);
        icon.add([fist]);
        this.attackIcon = { fist };
        this.labelText = icon; // so the press "push" offset moves it with the button
        this.container.add(icon);
    }
    
    // JUMP button: swap the text for a flat one-frame silhouette of Tryston's jump pose with
    // a tiny up arrow under it. Same colour and see-through look as the other icons.
    useJumpIcon() {
        if (!this.container) return;
        const key = ActionButton.jumpSilhouette(this.scene);
        if (!key) return; // keep the text label
        const s = this.size;
        const color = this.config.strokeColor ?? 0xCCAA00;
        
        if (this.labelText) {
            this.container.remove(this.labelText, true);
        }
        
        const icon = this.scene.add.container(0, 0);
        
        const figure = this.scene.add.image(0, -s * 0.07, key);
        figure.setScale((s * 0.46) / figure.height);
        figure.setTint(color);
        figure.setAlpha(ActionButton.RECORD_ALPHA);
        
        // A tiny up arrow centred under the figure
        const tipY = s * 0.22, headLen = s * 0.06, tailY = s * 0.36, headHalf = s * 0.045, thick = Math.max(2, s * 0.035);
        const aw = headHalf * 2 + 2, ah = (tailY - tipY) + 2;
        const arrowKey = ActionButton.bake(this.scene, `jumpArrow_${Math.round(s)}`, aw, ah, (g) => {
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(aw / 2, 1, aw / 2 - headHalf, 1 + headLen, aw / 2 + headHalf, 1 + headLen);
            g.fillRoundedRect(aw / 2 - thick / 2, headLen, thick, ah - 1 - headLen, thick / 2);
        });
        const arrows = this.scene.add.image(0, (tipY + tailY) / 2, arrowKey);
        arrows.setTint(color);
        arrows.setAlpha(ActionButton.RECORD_ALPHA);
        
        icon.add([figure, arrows]);
        this.jumpIcon = { figure, arrows };
        this.labelText = icon; // so the press "push" offset moves it with the button
        this.container.add(icon);
    }
    
    // SWITCH button: swap the text for a flat silhouette of the tornado (first frame of its
    // spritesheet), centred. Same colour and see-through look as the other icons.
    useSwitchIcon() {
        if (!this.container || !this.scene.textures.exists('tornado')) return; // keep the text label
        const s = this.size;
        const color = this.config.strokeColor ?? 0xCCAA00;
        
        if (this.labelText) {
            this.container.remove(this.labelText, true);
        }
        
        const icon = this.scene.add.container(0, 0);
        
        // A flat one-colour silhouette of the funnel (see ActionButton.tornadoSilhouette).
        // Its texture is cropped tight to the funnel, so the default centred origin puts
        // the funnel itself dead centre - the sparks that used to skew it are gone.
        const silhouetteKey = ActionButton.tornadoSilhouette(this.scene);
        let tornado;
        if (silhouetteKey) {
            tornado = this.scene.add.image(0, 0, silhouetteKey);
            tornado.setScale((s * 0.52) / tornado.height);
        } else {
            // Canvas read-back unavailable: fall back to the sprite frame as a flat fill
            tornado = this.scene.add.image(0, 0, 'tornado', 0);
            tornado.setScale((s * 0.52) / 71);
        }
        tornado.setTint(color);
        tornado.setAlpha(ActionButton.RECORD_ALPHA);
        
        icon.add([tornado]);
        this.switchIcon = { tornado };
        this.labelText = icon; // so the press "push" offset moves it with the button
        this.container.add(icon);
    }
    
    // THROW button: swap the text for the vinyl record, nudged right, with speed lines
    // trailing off to its left; plus a ring that fills as the record recharges.
    useThrowIcon() {
        if (!this.container) return;
        const s = this.size;
        const color = this.config.strokeColor ?? 0xCCAA00;
        
        if (this.labelText) {
            this.container.remove(this.labelText, true);
        }
        
        const icon = this.scene.add.container(0, 0);
        // Flat one-colour record: solid disc with a groove line and a label ring cut out
        // of it (see ActionButton.recordIcon), same colour and see-through look as the arrows
        const disc = this.scene.add.image(s * 0.11, 0, ActionButton.recordIcon(this.scene));
        disc.setScale((s * 0.46) / disc.width);
        disc.setTint(color);
        disc.setAlpha(ActionButton.RECORD_ALPHA);
        this.iconColor = color;
        
        const thick = Math.max(2, s * 0.045);
        const specs = [[-0.13, 0.19, 0.36], [0, 0.15, 0.41], [0.13, 0.19, 0.34]];
        const xmin = -s * 0.41, xmax = -s * 0.15;
        const ymin = -s * 0.13 - thick / 2, ymax = s * 0.13 + thick / 2;
        const lw = xmax - xmin + 2, lh = ymax - ymin + 2;
        const linesKey = ActionButton.bake(this.scene, `throwLines_${Math.round(s)}`, lw, lh, (g) => {
            g.fillStyle(0xffffff, 1);
            specs.forEach(([y, x0, x1]) => {
                g.fillRoundedRect(-s * x1 - xmin + 1, s * y - thick / 2 - ymin + 1, s * (x1 - x0), thick, thick / 2);
            });
        });
        const lines = this.scene.add.image((xmin + xmax) / 2, (ymin + ymax) / 2, linesKey);
        lines.setTint(color);
        lines.setAlpha(ActionButton.RECORD_ALPHA);
        
        icon.add([disc, lines]);
        this.throwIcon = { disc, lines };
        this.labelText = icon; // so the press "push" offset moves it with the button
        
        // Recharge ring: a faint full-circle track (a cached shape) plus the charge, drawn as one
        // of RING_STEPS pre-baked arc textures (made on first use), so nothing is re-tessellated
        // per frame
        const ringRadius = s / 2 + 1;
        const track = this.scene.add.circle(0, 0, ringRadius);
        track.setStrokeStyle(5, 0xffffff, 0.15);
        this.ringProgress = this.scene.add.image(0, 0, '__WHITE');
        this.ringProgress.setTint(this.config.strokeColor ?? 0xCCAA00).setAlpha(0.95).setVisible(false);
        this.cooldownRing = this.scene.add.container(0, 0, [track, this.ringProgress]);
        this.cooldownRing.setVisible(false);
        this.ringRadius = ringRadius;
        this._ringStep = -1;
        this.container.add([icon, this.cooldownRing]);
        this.cooldownReady = null;
    }
    
    // progress 0..1 through the recharge, 1 = ready. Greys the button out while recharging.
    setCooldown(progress) {
        if (!this.throwIcon || !this.background) return;
        const ready = progress >= 1;
        
        if (ready !== this.cooldownReady) {
            this.cooldownReady = ready;
            this.throwIcon.disc.setTint(ready ? this.iconColor : 0x555555);
            this.throwIcon.disc.setAlpha(ready ? ActionButton.RECORD_ALPHA : ActionButton.RECORD_ALPHA * 0.75);
            this.throwIcon.lines.setAlpha(ready ? ActionButton.RECORD_ALPHA : 0.18);
            this.background.setFillStyle(ready ? this.config.backgroundColor : 0x222222, this.config.opacity);
            this.background.setStrokeStyle(
                this.config.strokeWidth ?? 3,
                ready ? (this.config.strokeColor ?? 0xCCAA00) : 0x777777,
                ready ? (this.config.strokeAlpha ?? 0.9) : 0.6
            );
            if (this.glow) this.glow.setVisible(ready);
        }
        
        this.cooldownRing.setVisible(!ready);
        if (ready) { this._ringStep = -1; return; }
        
        // charge sweeping clockwise from the top, in RING_STEPS visible steps
        const steps = ActionButton.RING_STEPS;
        const step = Math.min(steps - 1, Math.floor(progress * steps));
        if (step !== this._ringStep) {
            this._ringStep = step;
            if (step <= 0) {
                this.ringProgress.setVisible(false);
            } else {
                const r = this.ringRadius, box = Math.ceil((r + 5) * 2), c = box / 2;
                const key = ActionButton.bake(this.scene, `cdRing_${Math.round(r)}_${step}`, box, box, (g) => {
                    g.lineStyle(6, 0xffffff, 1);
                    g.beginPath();
                    g.arc(c, c, r, -Math.PI / 2, -Math.PI / 2 + (step / steps) * Math.PI * 2, false);
                    g.strokePath();
                });
                this.ringProgress.setTexture(key).setVisible(true);
            }
        }
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
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        if (this.container) this.container.setPosition(x, y);
    }
    
    // Greyed out and untouchable (the handheld menu controls: only the stick and ATTACK work
    // there - see HandheldControlsScene)
    setDisabled(disabled) {
        if (!this.container || !this.background) return;
        this.disabled = disabled;
        const grey = 0x6a6a6a;
        const color = this.config.strokeColor ?? 0xCCAA00;
        this.container.setAlpha(disabled ? 0.4 : 1);
        this.background.setStrokeStyle(
            this.config.strokeWidth ?? 3,
            disabled ? grey : color,
            disabled ? 0.8 : (this.config.strokeAlpha ?? 0.7)
        );
        if (this.glow) this.glow.setVisible(!disabled);
        const icons = (this.labelText && this.labelText.list) ? this.labelText.list : [this.labelText];
        icons.forEach(icon => { if (icon && icon.setTint) icon.setTint(disabled ? grey : color); });
        if (disabled) {
            this.background.disableInteractive();
            if (this.activePointerId !== null) this.onTouchEnd({ id: this.activePointerId });
        } else {
            this.background.setInteractive({ useHandCursor: false });
        }
    }

    destroy() {
        console.log(`📱 ActionButton.destroy() - cleaning up button: ${this.action}`);
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.background = null;
        this.labelText = null;
        this.depthLayer = null;
        this.glow = null;
    }
}

// Draw a static shape ONCE into a texture and reuse it as an Image. Phaser re-tessellates a
// Graphics object's curves (rounded rects, arcs) with sin/cos on every frame, so a handful of
// them cost milliseconds per frame on a phone; an Image of the same shape costs almost nothing.
ActionButton.bake = function (scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)));
    g.destroy();
    return key;
};
ActionButton.RING_STEPS = 40; // the recharge ring fills in this many visible steps

// A soft round dark blob (solid in the middle, fading to nothing at the edge), used as a halo
// behind the touch controls: it dims the page backdrop's pluses around them.
ActionButton.haloTexture = function (scene) {
    const key = 'controlHalo';
    if (scene.textures.exists(key)) return key;
    const size = 256, c = size / 2;
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(0,0,0,0.8)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.62)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    return key;
};

// How opaque the button icons (record, tornado, arrows, speed lines) are (1 = solid).
// They are all drawn in the button's outline colour.
ActionButton.RECORD_ALPHA = 0.62;

// Flat white record on a canvas texture, built once and tinted per use: a solid disc with
// a groove line and the label edge cut out as real holes, and a spindle hole.
ActionButton.recordIcon = function (scene) {
    const key = 'throwRecordIcon';
    if (scene.textures.exists(key)) return key;
    const size = 128, c = size / 2;
    const tex = scene.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(c, c, 62, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(c, c, 46, 0, Math.PI * 2); ctx.stroke();   // groove line
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(c, c, 27, 0, Math.PI * 2); ctx.stroke();   // label edge
    ctx.beginPath(); ctx.arc(c, c, 6, 0, Math.PI * 2); ctx.fill();      // spindle hole
    tex.refresh();
    return key;
};

// Flat white silhouette of one spritesheet frame, cropped tight to what is kept, as a canvas
// texture that can be tinted to any colour. keep(r, g, b, a) says which pixels belong to the
// shape. Returns the texture key, or null if the frame or canvas read-back isn't available.
ActionButton.flatSilhouette = function (scene, sourceKey, frameIndex, outKey, keep) {
    if (scene.textures.exists(outKey)) return outKey;
    try {
        if (!scene.textures.exists(sourceKey)) return null;
        const frame = scene.textures.getFrame(sourceKey, frameIndex);
        if (!frame) return null;
        const w = frame.cutWidth, h = frame.cutHeight;
        const scratch = document.createElement('canvas');
        scratch.width = w; scratch.height = h;
        const sctx = scratch.getContext('2d');
        sctx.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
        const data = sctx.getImageData(0, 0, w, h);
        const px = data.data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (keep(px[i], px[i + 1], px[i + 2], px[i + 3])) {
                    px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = 255;
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                } else {
                    px[i + 3] = 0;
                }
            }
        }
        if (maxX < 0) return null;
        const tex = scene.textures.createCanvas(outKey, maxX - minX + 1, maxY - minY + 1);
        tex.getContext().putImageData(data, -minX, -minY);
        tex.refresh();
        return outKey;
    } catch (e) {
        console.warn(`📱 Could not build the ${outKey} silhouette:`, e);
        return null;
    }
};

// The tornado's funnel: it is grey, while the lightning and sparks around it are teal/orange,
// so keeping only low-saturation pixels drops them.
ActionButton.tornadoSilhouette = function (scene) {
    return ActionButton.flatSilhouette(scene, 'tornado', 0, 'switchTornadoIcon',
        (r, g, b, a) => a > 40 && (Math.max(r, g, b) - Math.min(r, g, b)) < 28);
};

// The fist: keep only the skin-coloured pixels. That drops the black outline (it becomes
// cut-out lines between the knuckles and fingers) and the dark sleeve (which breaks up into
// speckles as a flat shape).
ActionButton.fistSilhouette = function (scene) {
    return ActionButton.flatSilhouette(scene, 'fistIcon', undefined, 'attackFistIcon',
        (r, g, b, a) => a > 40 && (r - b) > 25);
};

// Tryston's jump pose, whole figure
ActionButton.jumpSilhouette = function (scene) {
    return ActionButton.flatSilhouette(scene, 'tryston_jump', 0, 'jumpCharacterIcon',
        (r, g, b, a) => a > 40);
};

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
        
        // Pause button (top centre of the screen; taps call GameScene.requestPause)
        this.pauseButton = null;
        
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
                marginRight: 50,
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
        console.log('📱 ========== TouchControlsOverlay.create() START ==========');
        
        // Get UI scale from UIScene (for responsive scaling)
        const uiScale = this.uiScene.uiScale || 1.0;
        this.viewportInfo = this.uiScene.viewportInfo || null;
        
        console.log('📱 UIScene state:', {
            uiScale: uiScale,
            viewportInfo: this.viewportInfo,
            'uiScene.scale.width': this.uiScene.scale?.width,
            'uiScene.scale.height': this.uiScene.scale?.height
        });
        
        // Calculate responsive scale (clamp between min and max)
        const config = window.TOUCH_CONTROLS_CONFIG || this.config;
        const minScale = config.minScale || 0.8;
        const maxScale = config.maxScale || 1.2;
        const responsiveScale = Math.max(minScale, Math.min(maxScale, uiScale));
        
        console.log('📱 Scale calculation:', {
            uiScale: uiScale,
            minScale: minScale,
            maxScale: maxScale,
            responsiveScale: responsiveScale
        });
        
        // Calculate current screen metrics so controls can live outside the gameplay viewport
        const metrics = this.getScreenMetrics();
        this.screenMetrics = metrics;
        
        console.log('📱 Screen metrics:', {
            screenWidth: metrics.screenWidth,
            screenHeight: metrics.screenHeight,
            viewport: metrics.viewport
        });
        
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
            this.buttons.jump.useJumpIcon();
            this.buttons.jump.setBaseScale(responsiveScale);
        }
        
        // Bottom: Attack (Punch)
        this.buttons.punch = new ActionButton(
            this.renderScene,
            buttonCenterX,
            buttonCenterY + spacing,
            finalButtonSize,
            'ATTACK',
            'punch',
            this.config.buttons
        );
        this.buttons.punch.create();
        if (this.buttons.punch) {
            this.buttons.punch.useAttackIcon();
            this.buttons.punch.setBaseScale(responsiveScale);
        }
        
        // Left: Switch (Character Switch)
        this.buttons.characterSwitch = new ActionButton(
            this.renderScene,
            buttonCenterX - spacing,
            buttonCenterY,
            finalButtonSize,
            'SWITCH',
            'characterSwitch',
            this.config.buttons
        );
        this.buttons.characterSwitch.create();
        if (this.buttons.characterSwitch) {
            this.buttons.characterSwitch.useSwitchIcon();
            this.buttons.characterSwitch.setBaseScale(responsiveScale);
        }
        
        // Right: Throw (Record Throw)
        this.buttons.recordThrow = new ActionButton(
            this.renderScene,
            buttonCenterX + spacing,
            buttonCenterY,
            finalButtonSize,
            'THROW',
            'recordThrow',
            this.config.buttons
        );
        this.buttons.recordThrow.create();
        if (this.buttons.recordThrow) {
            this.buttons.recordThrow.useThrowIcon();
            this.buttons.recordThrow.setBaseScale(responsiveScale);
        }
        
        this.createPauseButton(metrics, responsiveScale);
        this.createHalos();
        
        // Store scale for potential updates on resize
        this.currentScale = responsiveScale;
        
        // Initially hidden
        this.setVisible(false);
        
        // Listen for UI scale changes (on window resize)
        if (this.uiScene) {
            this.onUiScaleChanged = (newScale, viewportInfo) => this.updateScale(newScale, viewportInfo);
            this.uiScene.events.on('uiScaleChanged', this.onUiScaleChanged);
        }
        
        // Upright phone: move everything into the handheld console layout
        this.relayout();
        
        console.log('📱 Final control sizes:', {
            responsiveScale: responsiveScale,
            joystickBaseRadius: finalBaseRadius,
            joystickKnobRadius: finalKnobRadius,
            buttonSize: finalButtonSize,
            joystickContainerScale: this.joystick.container?.scaleX,
            joystickPosition: { x: joystickPosition.x, y: joystickPosition.y },
            buttonCenterPosition: { x: buttonCenterX, y: buttonCenterY }
        });
        console.log('📱 ========== TouchControlsOverlay.create() END ==========');
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
        
        this.currentScale = responsiveScale;
        this.relayout();
        console.log('📱 Touch controls scale updated to:', responsiveScale);
    }
    
    // ========================================
    // LAYOUT
    // ========================================
    // Places the stick, the four buttons and the pause button for the current screen:
    // landscape (stick left, diamond right, pause bottom centre - as before) or, with the
    // phone upright, the handheld console layout under the game screen
    // (LayoutManager.getHandheldLayout). Called on create, on every resize and by the
    // handheld shell when the phone is turned.
    relayout() {
        if (!this.joystick || !this.joystick.container) return; // destroyed
        this.handheld = !!(window.DeviceManager && window.DeviceManager.isHandheldMode());
        if (this.handheld) {
            this.layoutHandheld();
        } else {
            this.layoutLandscape();
        }
        if (this.pauseButton && this.pauseButton.container) {
            this.pauseButton.container.setAlpha(this.getPauseAlpha());
        }
        // The console shell has its own wells under the controls, so no halos there
        if (this.halos) this.halos.forEach(h => h.img.setVisible(this.visible && !this.handheld));
        this.syncHalos();
    }
    
    layoutLandscape() {
        const scale = this.currentScale || 1;
        this.joystick.container.setScale(scale);
        this.repositionJoystick(scale);
        
        // Diamond aligned with the stick, near the right edge
        const metrics = this.getScreenMetrics();
        const spacing = this.config.buttons.spacing;
        const centerX = metrics.screenWidth - this.config.buttons.marginRight - (spacing * 0.7);
        const centerY = this.joystick.container.y;
        this.placeButtons(centerX, centerY, spacing, () => scale);
        this.repositionPauseButton(scale);
    }
    
    layoutHandheld() {
        const size = LayoutManager.getScreenSize();
        const layout = LayoutManager.getHandheldLayout(size.width, size.height);
        
        this.joystick.container.setPosition(layout.stick.x, layout.stick.y);
        this.joystick.container.setScale(layout.stick.radius / this.joystick.baseRadius);
        
        const b = layout.buttons;
        this.placeButtons(b.x, b.y, b.spacing, (button) => b.size / button.size);
        
        if (this.pauseButton && this.pauseButton.container) {
            this.pauseButton.baseScale = layout.pause.size / this.pauseButton.size;
            this.pauseButton.container.setPosition(layout.pause.x, layout.pause.y);
            this.pauseButton.container.setScale(this.pauseButton.baseScale);
        }
    }
    
    // Menu controls (HandheldControlsScene): the stick moves between menu buttons and ATTACK
    // presses them, so every other button is greyed out
    setMenuMode(on) {
        this.menuMode = on;
        ['jump', 'characterSwitch', 'recordThrow'].forEach(key => {
            if (this.buttons[key]) this.buttons[key].setDisabled(on);
        });
        if (this.pauseButton && this.pauseButton.container) {
            this.pauseButton.container.setAlpha(this.getPauseAlpha());
            if (on) this.pauseButton.bg.disableInteractive();
            else this.pauseButton.bg.setInteractive({ useHandCursor: false });
        }
    }
    
    // Diamond: jump top, attack bottom, switch left, throw right
    placeButtons(centerX, centerY, spacing, scaleFor) {
        const offsets = { jump: [0, -1], punch: [0, 1], characterSwitch: [-1, 0], recordThrow: [1, 0] };
        Object.keys(offsets).forEach(key => {
            const button = this.buttons[key];
            if (!button) return;
            const [ox, oy] = offsets[key];
            button.setPosition(centerX + ox * spacing, centerY + oy * spacing);
            button.setBaseScale(scaleFor(button));
        });
    }
    
    getPauseAlpha() {
        if (this.menuMode) return 0.3; // greyed out (see setMenuMode)
        const cfg = window.TOUCH_CONTROLS_CONFIG || {};
        if (this.handheld) {
            return (cfg.handheld && typeof cfg.handheld.pauseAlpha === 'number') ? cfg.handheld.pauseAlpha : 0.9;
        }
        return (cfg.pauseButton && typeof cfg.pauseButton.alpha === 'number') ? cfg.pauseButton.alpha : 0.28;
    }
    
    // ========================================
    // HALOS
    // ========================================
    // The page behind the (transparent) game canvas has a backdrop of faint yellow pluses. A
    // soft dark halo under the joystick and each button fades those out around the controls, so
    // the controls sit on a calm patch. Halos are masked to the strips OUTSIDE the game view, so
    // they never dim the gameplay itself.
    createHalos() {
        const scene = this.renderScene;
        const key = ActionButton.haloTexture(scene);
        const depth = ((this.config.buttons && this.config.buttons.layerDepth) || 6000) - 10;
        this.halos = [];
        const make = (kind, ref) => {
            const img = scene.add.image(0, 0, key).setDepth(depth).setScrollFactor(0);
            this.halos.push({ img, kind, ref });
        };
        if (this.joystick) make('joystick', this.joystick);
        Object.values(this.buttons).forEach(b => { if (b) make('button', b); });
        
        // Mask = everything except the game viewport (invertAlpha)
        this.haloMaskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        this.haloMask = this.haloMaskGfx.createGeometryMask();
        this.haloMask.setInvertAlpha(true);
        this.halos.forEach(h => h.img.setMask(this.haloMask));
        
        this.syncHalos();
    }
    
    syncHalos() {
        if (!this.halos || !this.haloMaskGfx) return;
        const vp = this.getScreenMetrics().viewport;
        this.haloMaskGfx.clear();
        this.haloMaskGfx.fillStyle(0xffffff, 1);
        this.haloMaskGfx.fillRect(vp.x, vp.y, vp.width, vp.height);
        
        this.halos.forEach(h => {
            const ref = h.ref;
            if (!ref || !ref.container || !ref.container.active) return;
            let radius;
            if (h.kind === 'joystick') {
                radius = (ref.baseRadius + 26) * (ref.container.scaleX || 1) * 2.0;
            } else {
                radius = ((ref.size * (ref.baseScale || 1)) / 2 + 10) * 2.1;
            }
            h.img.setPosition(ref.container.x, ref.container.y);
            h.img.setDisplaySize(radius * 2, radius * 2);
        });
    }
    
    // ========================================
    // PAUSE BUTTON
    // ========================================
    // A small "||" button at the bottom centre of the screen - clear of the HUD along the
    // top (health bar + weapon recharge icon, score) and of both thumbs.
    createPauseButton(metrics, scale) {
        const s = this.renderScene;
        const cfg = this.config.buttons;
        const size = Math.max(cfg.size * 0.46 * scale, 38);
        const layerDepth = (typeof cfg.layerDepth === 'number') ? cfg.layerDepth : 5000;
        
        const container = s.add.container(0, 0);
        container.setDepth(layerDepth);
        container.setScrollFactor(0);
        
        const depth = s.add.circle(cfg.depthOffset ?? 5, cfg.depthOffset ?? 5, size / 2, cfg.depthColor ?? 0x2a2a2a, cfg.depthOpacity ?? 0.6);
        const glow = s.add.circle(0, 0, size / 2 + 5, cfg.glowColor ?? 0x6fd3ff, (typeof cfg.glowOpacity === 'number') ? cfg.glowOpacity : 0.25);
        if (glow.setBlendMode) glow.setBlendMode(Phaser.BlendModes.ADD);
        const bg = s.add.circle(0, 0, size / 2, cfg.backgroundColor, cfg.opacity);
        bg.setStrokeStyle(cfg.strokeWidth ?? 3, cfg.strokeColor ?? 0xFFFFFF, cfg.strokeAlpha ?? 0.7);
        
        // Two vertical bars
        const bars = s.add.graphics();
        bars.fillStyle(cfg.textColor ?? 0xFFFFFF, 1);
        const barW = size * 0.13, barH = size * 0.42, gap = size * 0.12;
        bars.fillRect(-gap - barW, -barH / 2, barW, barH);
        bars.fillRect(gap, -barH / 2, barW, barH);
        
        container.add([depth, glow, bg, bars]);
        // Much more see-through than the action buttons so it doesn't hide the player
        // (solid in the handheld layout, where it sits on the console body - see relayout)
        container.setAlpha(this.getPauseAlpha());
        
        bg.setInteractive({ useHandCursor: false });
        bg.on('pointerdown', () => {
            const base = this.pauseButton ? this.pauseButton.baseScale : 1;
            container.setScale(base * 0.9);
            // TouchControlsScene is paused right after this, so its pointerup never
            // arrives - onGameResumed() restores the scale instead
            if (this.scene && typeof this.scene.requestPause === 'function') {
                if (!this.scene.requestPause()) container.setScale(base);
            } else {
                container.setScale(base);
            }
        });
        
        this.pauseButton = { container, bg, size, baseScale: 1 };
        this.repositionPauseButton(scale);
    }
    
    repositionPauseButton(scale) {
        if (!this.pauseButton || !this.pauseButton.container) return;
        const metrics = this.getScreenMetrics();
        // Bottom centre of the whole screen: clear of both thumb clusters (stick on the
        // left, buttons on the right) and of the HUD along the top. The boss health bar
        // also sits bottom-centre but higher up (80 virtual px above the game's bottom
        // edge), so a small margin keeps the button below it.
        const margin = 12 * scale;
        this.pauseButton.container.setPosition(
            metrics.screenWidth / 2,
            metrics.screenHeight - margin - this.pauseButton.size / 2
        );
        this.pauseButton.baseScale = 1;
        this.pauseButton.container.setScale(1);
    }
    
    // Called by GameScene.resumeFromPause(): the touch scene missed every pointerup
    // while it was paused, so drop whatever was held when the pause tap landed
    onGameResumed() {
        if (this.pauseButton && this.pauseButton.container) this.pauseButton.container.setScale(this.pauseButton.baseScale || 1);
        this.releaseAll();
    }
    
    releaseAll() {
        if (this.joystick && this.joystick.activePointerId !== null) {
            this.joystick.onTouchEnd({ id: this.joystick.activePointerId });
        }
        Object.values(this.buttons).forEach(button => {
            if (button && button.activePointerId !== null) {
                button.onTouchEnd({ id: button.activePointerId });
            }
        });
        if (this.unifiedInput) {
            this.unifiedInput.reset();
            this.unifiedInput.setTouchActive(false);
        }
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
            const wm = this.scene && this.scene.weaponManager;
            this.buttons.recordThrow.setCooldown(wm && wm.getCooldownProgress ? wm.getCooldownProgress() : 1);
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
        
        if (this.pauseButton && this.pauseButton.container) {
            this.pauseButton.container.setVisible(visible);
        }
        
        if (this.halos) this.halos.forEach(h => h.img.setVisible(visible && !this.handheld));
    }
    
    destroy() {
        console.log('📱 ========== TouchControlsOverlay.destroy() START ==========');
        if (this.uiScene && this.onUiScaleChanged) {
            this.uiScene.events.off('uiScaleChanged', this.onUiScaleChanged);
            this.onUiScaleChanged = null;
        }
        if (this.halos) { this.halos.forEach(h => h.img.destroy()); this.halos = null; }
        if (this.haloMask) { this.haloMask.destroy(); this.haloMask = null; }
        if (this.haloMaskGfx) { this.haloMaskGfx.destroy(); this.haloMaskGfx = null; }
        console.log('📱 Destroying joystick and buttons...');
        
        if (this.joystick) {
            console.log('📱 Destroying joystick');
            this.joystick.destroy();
            this.joystick = null;
        }
        
        Object.values(this.buttons).forEach(button => {
            if (button) {
                console.log(`📱 Destroying button: ${button.action}`);
                button.destroy();
            }
        });
        this.buttons = {};
        
        if (this.pauseButton && this.pauseButton.container) {
            this.pauseButton.container.destroy();
        }
        this.pauseButton = null;
        
        console.log('📱 ========== TouchControlsOverlay.destroy() END ==========');
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

