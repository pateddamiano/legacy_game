// ========================================
// TUTORIAL OVERLAY
// ========================================
// The visuals for the level 1 controls tutorial (driven by TutorialActions):
//   - a dim over the street, drawn in GameScene just above the backgrounds (depth -50)
//     but under every character (depth = y), so the player and thugs stay bright
//   - a prompt box (tap it, or press ENTER, for the next message), a pulsing ring +
//     arrow on the control being taught, the other touch controls faded out, and a
//     SKIP TUTORIAL button at the bottom - all in TouchControlsScene, the topmost
//     layer, in screen pixels
// Everything is re-positioned every frame from the live control positions and the game
// viewport, so resizes / rotations need no special handling.

class TutorialOverlay {
    // onNext: the box was tapped / ENTER pressed (move on to the next message)
    // onSkip: SKIP TUTORIAL (end the whole tutorial)
    constructor(gameScene, { onNext, onSkip }) {
        this.scene = gameScene;
        this.onNext = onNext;
        this.onSkip = onSkip;
        this.nextArmedAt = 0;
        this.target = null;      // 'move' | 'jump' | 'throw' | 'punch' | 'switch' | null
        this.lastFitKey = '';
        this.allTexts = [];
        this.box = null;
        this.destroyed = false;

        this.touchScene = gameScene.scene.get('TouchControlsScene');
        if (!this.touchScene || !this.touchScene.sys.isActive()) this.touchScene = gameScene.uiScene || gameScene;

        this.build();

        this._onUpdate = () => this.layout();
        gameScene.events.on('update', this._onUpdate);
        this._onEnter = () => this.next();
        if (gameScene.input.keyboard) gameScene.input.keyboard.on('keydown-ENTER', this._onEnter);
    }

    build() {
        const s = this.scene;
        const t = this.touchScene;
        const font = GAME_CONFIG.ui.fontFamily;

        // Street dim (camera-fixed, oversized so it always covers the view)
        this.dim = s.add.rectangle(600, 360, 6000, 4000, 0x000000, 1)
            .setScrollFactor(0).setDepth(-50).setAlpha(0);
        s.tweens.add({ targets: this.dim, alpha: 0.55, duration: 400 });

        this.layer = t.add.container(0, 0).setDepth(6000);

        this.ring = t.add.graphics();
        this.arrow = t.add.text(0, 0, '▼', { fontFamily: font, color: '#FFD700', stroke: '#000000', strokeThickness: 4 })
            .setOrigin(0.5, 1);

        // The box itself is the "next" button
        this.panel = t.add.rectangle(0, 0, 10, 10, 0x000000, 0.85).setStrokeStyle(3, 0xFFD700)
            .setInteractive({ useHandCursor: true });
        this.panel.on('pointerdown', () => this.next());
        this.prompt = t.add.text(0, 0, '', { fontFamily: font, color: '#FFFFFF', align: 'center' }).setOrigin(0.5);
        this.nextHint = t.add.text(0, 0, this.isTouch() ? 'tap for next ▸' : 'ENTER: next ▸',
            { fontFamily: font, color: '#9A9A9A' }).setOrigin(1, 1);

        // SKIP TUTORIAL: bottom centre, clear of the joystick and the buttons
        this.skipBg = t.add.rectangle(0, 0, 10, 10, 0x2C1810, 0.9).setStrokeStyle(2, 0xFFD700)
            .setInteractive({ useHandCursor: true });
        this.skipText = t.add.text(0, 0, 'SKIP TUTORIAL', { fontFamily: font, color: '#FFD700' }).setOrigin(0.5);
        this.skipBg.on('pointerdown', () => this.skip());

        this.layer.add([this.ring, this.arrow, this.panel, this.prompt, this.nextHint, this.skipBg, this.skipText]);
        this.layer.setAlpha(0);
        t.tweens.add({ targets: this.layer, alpha: 1, duration: 300 });

        // HUD out of the way for a cleaner screen: health bars, lives, score + combo box
        // (the record's recharge meter stays - the throw step points at it on desktop)
        this.setHudVisible(false);

        // Pause button hidden for the tutorial (restored in destroy)
        const overlay = s.touchControlsOverlay;
        if (overlay && overlay.pauseButton && overlay.pauseButton.container) {
            this.pauseWasVisible = overlay.pauseButton.container.visible;
            overlay.pauseButton.container.setVisible(false);
        }
    }

    hudParts() {
        const ui = this.scene.uiManager;
        if (!ui) return [];
        return [
            ui.futuristicHealthBar && ui.futuristicHealthBar.container,
            ui.livesContainer,
            ui.scoreContainer
        ].filter(part => part && part.active);
    }

    setHudVisible(visible) {
        const parts = this.hudParts();
        const ui = this.scene.uiScene;
        if (!parts.length || !ui) return;
        ui.tweens.killTweensOf(parts);
        ui.tweens.add({ targets: parts, alpha: visible ? 1 : 0, duration: visible ? 500 : 300 });
    }

    // True when the on-screen touch controls are showing (phones/tablets); otherwise
    // the prompts name keyboard keys
    // (the device setting, not current visibility: the controls are briefly hidden while
    // the intro hands over to the tutorial - see GameScene.updateTouchControlsVisibility)
    isTouch() {
        return !!(this.scene.touchControlsOverlay && this.scene.touchControlsWanted);
    }

    setStep(target, text) {
        this.target = target;
        this.setText(text);
    }

    // Swap the prompt text without changing the highlighted control (retry hints).
    // Each new message ignores taps for a moment, so a quick double tap can't skip a
    // line before it's been read.
    setText(text, color = '#FFFFFF') {
        this.prompt.setColor(color);
        this.prompt.setText(text || '');
        this.nextArmedAt = this.scene.time.now + 800;
    }

    // Step done: green check, no highlight. detail: text kept under the check (the
    // step's instructions, for steps that wait for a tap)
    showSuccess(text, detail) {
        this.target = null;
        const check = `✓ ${text || 'Nice!'}`;
        this.setText(detail ? `${check}\n\n${detail}` : check, '#7CFC7C');
    }

    next() {
        if (this.destroyed || !this.onNext || this.scene.time.now < this.nextArmedAt) return;
        this.onNext();
    }

    skip() {
        if (this.destroyed || !this.onSkip) return;
        const onSkip = this.onSkip;
        this.onSkip = null;
        onSkip();
    }

    // Map a virtual (1200x720) point to screen pixels in the touch scene
    viewport() {
        const ui = this.scene.uiScene;
        const vp = (ui && ui.viewportInfo) || null;
        if (vp && vp.scale) return vp;
        const w = this.touchScene.scale.width, h = this.touchScene.scale.height;
        const scale = Math.min(w / 1200, h / 720);
        return { x: (w - 1200 * scale) / 2, y: (h - 720 * scale) / 2, scale };
    }

    // Screen-space circles to ring for the current step
    targetCircles() {
        const out = [];
        if (!this.target) return out;
        const overlay = this.scene.touchControlsOverlay;
        if (this.isTouch() && overlay) {
            const buttonFor = { jump: 'jump', throw: 'recordThrow', punch: 'punch', switch: 'characterSwitch' };
            if (this.target === 'move' && overlay.joystick && overlay.joystick.container) {
                const c = overlay.joystick.container;
                out.push({ x: c.x, y: c.y, r: overlay.joystick.baseRadius * c.scaleX + 12 });
            } else if (buttonFor[this.target]) {
                const b = overlay.buttons[buttonFor[this.target]];
                if (b && b.container) {
                    out.push({ x: b.container.x, y: b.container.y, r: (b.size / 2) * b.container.scaleX + 12 });
                }
            }
        }
        // The record's recharge meter in the HUD (UIScene draws it inside its viewport)
        if (this.target === 'throw') {
            const wm = this.scene.weaponManager;
            const ui = this.scene.uiScene;
            if (wm && wm.weaponUIContainer && ui && ui.cameras && ui.cameras.main) {
                const c = wm.weaponUIContainer;
                const cam = ui.cameras.main;
                out.push({ x: cam.x + c.x, y: cam.y + c.y, r: 45 * c.scaleX + 10 });
            }
        }
        return out;
    }

    // Every line the tutorial will show: the box is sized once, for the longest, so it
    // never grows, shrinks or moves from one step to the next
    setAllTexts(texts) {
        this.allTexts = texts.filter(Boolean);
        this.lastFitKey = '';
    }

    // All the on-screen touch controls (screen px), highlighted or not
    controlCircles() {
        const overlay = this.scene.touchControlsOverlay;
        const out = [];
        if (!this.isTouch() || !overlay) return out;
        if (overlay.joystick && overlay.joystick.container) {
            const c = overlay.joystick.container;
            out.push({ x: c.x, y: c.y, r: overlay.joystick.baseRadius * c.scaleX + 12 });
        }
        ['jump', 'recordThrow', 'punch', 'characterSwitch'].forEach(key => {
            const b = overlay.buttons[key];
            if (b && b.container) out.push({ x: b.container.x, y: b.container.y, r: (b.size / 2) * b.container.scaleX + 12 });
        });
        return out;
    }

    // One fixed box: centred on the screen, as big a font as lets the longest line fit,
    // and kept above every touch control (plus room for the bouncing arrow) - so it is
    // independent of which control is being taught. Only redone when the screen changes.
    fitBox(vp, k, phone) {
        const s = vp.scale;
        // Phone held upright: the game screen is small (about a third of a landscape one), and
        // the box - sized for the LONGEST message - used to fill nearly all of it
        const handheld = !!(window.DeviceManager && window.DeviceManager.isHandheldMode && window.DeviceManager.isHandheldMode());
        const baseSize = Math.round(42 * s * k);
        const hintSize = Math.round(26 * s * k);
        const skipSize = Math.round(28 * s * k);
        const arrowSize = Math.round(48 * s * k);
        // Handheld: nearly the full width of the game screen means fewer, shorter lines
        const W = handheld ? 1130 * s : (phone ? 900 : 760) * s;
        const pad = 16 * s;
        const cx = vp.x + 600 * s;

        this.prompt.setWordWrapWidth(W - 2 * pad);
        this.nextHint.setFontSize(hintSize);
        this.skipText.setFontSize(skipSize);
        this.arrow.setFontSize(arrowSize);
        const hintH = this.nextHint.height;

        let bottomLimit = vp.y + 700 * s;
        this.controlCircles().forEach(c => {
            if (c.x + c.r < cx - W / 2 || c.x - c.r > cx + W / 2) return; // not under the box
            bottomLimit = Math.min(bottomLimit, c.y - c.r - 8 * s - arrowSize - 16 * s);
        });
        const topLimit = vp.y + 12 * s;

        // Largest font at which the longest line fits. Handheld: also never taller than about
        // half the game screen (and allowed to shrink a bit further to manage that)
        const availH = handheld ? Math.min(bottomLimit - topLimit, 720 * s * 0.48) : (bottomLimit - topLimit);
        const factors = handheld ? [1, 0.9, 0.8, 0.72, 0.65, 0.58, 0.52] : [1, 0.9, 0.8, 0.72, 0.65];
        const current = this.prompt.text;
        const texts = this.allTexts && this.allTexts.length ? this.allTexts : [current];
        let textH = 0;
        for (const f of factors) {
            this.prompt.setFontSize(Math.round(baseSize * f));
            textH = Math.max(...texts.map(t => { this.prompt.setText(t); return this.prompt.height; }));
            if (pad + textH + 6 * s + hintH + 8 * s <= availH) break;
        }
        this.prompt.setText(current);

        const H = pad + textH + 6 * s + hintH + 8 * s;
        let top = vp.y + 330 * s - H / 2;                 // centred on the screen's middle...
        top = Math.min(top, bottomLimit - H);            // ...unless that reaches the controls
        top = Math.max(top, topLimit);
        // Handheld: sit at the top of the small game screen, so the street (the lower half,
        // where the fighting is) stays visible instead of being covered
        if (handheld) top = topLimit;
        this.box = { cx, top, W, H, pad, hintH };
    }

    layout() {
        if (this.destroyed) return;
        const vp = this.viewport();
        const s = vp.scale;
        const k = window.DeviceManager ? window.DeviceManager.getTextScale() : 1;
        const phone = k > 1;

        const controlsKey = this.controlCircles().map(c => `${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.r)}`).join(';');
        const fitKey = `${Math.round(vp.x)}|${Math.round(vp.y)}|${s.toFixed(3)}|${k}|${controlsKey}|${this.allTexts ? this.allTexts.length : 0}`;
        if (fitKey !== this.lastFitKey || !this.box) {
            this.lastFitKey = fitKey;
            this.fitBox(vp, k, phone);
        }
        const { cx, top, W, H, pad, hintH } = this.box;

        this.panel.setPosition(cx, top + H / 2).setSize(W, H);

        // "tap for next" in the box's bottom-right corner; the prompt centred above it
        this.nextHint.setPosition(cx + W / 2 - pad, top + H - 8 * s);
        const textBottom = top + H - 8 * s - hintH - 6 * s;
        this.prompt.setPosition(cx, (top + pad + textBottom) / 2);

        // SKIP TUTORIAL at the bottom centre of the game area
        const skipW = this.skipText.width + 28 * s, skipH = this.skipText.height + 12 * s;
        const skipX = cx, skipY = vp.y + 720 * s - 16 * s - skipH / 2;
        this.skipBg.setPosition(skipX, skipY).setSize(skipW, skipH);
        this.skipText.setPosition(skipX, skipY);

        // Highlight ring(s) + arrow on the control being taught, pulsing
        const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 180);
        const circles = this.targetCircles();
        this.ring.clear();
        circles.forEach(c => {
            this.ring.lineStyle(Math.max(3, 6 * s), 0xFFD700, 0.55 + 0.45 * pulse);
            this.ring.strokeCircle(c.x, c.y, c.r + 6 * pulse);
        });
        const main = circles[0];
        this.arrow.setVisible(!!main);
        if (main) this.arrow.setPosition(main.x, main.y - main.r - 8 * s - 10 * pulse);

        this.fadeOtherControls();
        
        // No pause button during the tutorial (the controls can be re-shown underneath us)
        const overlay = this.scene.touchControlsOverlay;
        if (overlay && overlay.pauseButton && overlay.pauseButton.container && overlay.pauseButton.container.visible) {
            overlay.pauseButton.container.setVisible(false);
        }
    }

    // Everything but the taught control drops to 25% so the eye goes straight to it
    fadeOtherControls() {
        const overlay = this.scene.touchControlsOverlay;
        if (!overlay) return;
        const bright = {
            move: overlay.joystick && overlay.joystick.container,
            jump: overlay.buttons.jump && overlay.buttons.jump.container,
            throw: overlay.buttons.recordThrow && overlay.buttons.recordThrow.container,
            punch: overlay.buttons.punch && overlay.buttons.punch.container,
            switch: overlay.buttons.characterSwitch && overlay.buttons.characterSwitch.container
        };
        Object.keys(bright).forEach(key => {
            const c = bright[key];
            if (c) c.setAlpha(!this.target || key === this.target ? 1 : 0.25);
        });
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.target = null;
        const s = this.scene;
        s.events.off('update', this._onUpdate);
        if (s.input && s.input.keyboard) s.input.keyboard.off('keydown-ENTER', this._onEnter);

        this.setHudVisible(true);

        // Controls back to full, pause button back
        const overlay = s.touchControlsOverlay;
        if (overlay) {
            this.fadeOtherControls();
            if (overlay.pauseButton && overlay.pauseButton.container && this.pauseWasVisible !== undefined) {
                overlay.pauseButton.container.setVisible(overlay.visible);
            }
        }

        const dim = this.dim;
        if (dim && dim.active && s.tweens) {
            s.tweens.add({ targets: dim, alpha: 0, duration: 400, onComplete: () => dim.destroy() });
        } else if (dim) {
            dim.destroy();
        }
        if (this.layer && this.layer.active) this.layer.destroy();
    }
}

if (typeof window !== 'undefined') {
    window.TutorialOverlay = TutorialOverlay;
}
