// ========================================
// HANDHELD MENU NAVIGATION
// ========================================
// With the phone held upright the console's controls stay on screen outside gameplay too
// (HandheldControlsScene). There the stick moves a focus between the buttons of whatever
// screen is showing and ATTACK presses the focused one - like a real handheld.
//
// It works on any scene without per-scene code: the "buttons" are the scene's own
// interactive objects that react to a press (pointerdown / pointerup listeners). Focusing
// one emits the pointerover/pointerout events the scene already uses for its hover look,
// and pressing emits pointerdown + pointerup, exactly what a tap on it would do.
//
//   - A visible full-screen interactive object (a dimmed backdrop: settings, credits,
//     pause menu) is modal: only buttons drawn above it count.
//   - An invisible full-screen one is a "tap anywhere" zone (dialogue, cutscenes):
//     with nothing focused, ATTACK taps it.
//   - A scene with neither gets a scene-wide tap (loading screen).
//   - Objects flagged handheldNavIgnore are skipped (the main menu's fullscreen catcher).

class HandheldMenuNav {
    constructor(controlsScene, overlay) {
        this.controlsScene = controlsScene;
        this.overlay = overlay;
        this.target = null;     // scene being navigated
        this.focused = null;    // its focused button
        this.stickArmed = true; // the stick must come back to the middle between steps
        this.pressed = null;    // what the current ATTACK press went to (for its pointerup)

        // ATTACK presses/releases, queued straight from the button's own touch events so
        // even a tap shorter than a frame is never missed
        this.attackEvents = [];
        this.attackPointerId = null;
        const attack = overlay.buttons.punch;
        if (attack && attack.background) {
            attack.background.on('pointerdown', (pointer) => {
                if (this.attackPointerId !== null) return;
                this.attackPointerId = pointer.id;
                this.attackEvents.push('down');
            });
            const release = (pointer) => {
                if (pointer.id !== this.attackPointerId) return;
                this.attackPointerId = null;
                this.attackEvents.push('up');
            };
            attack.scene.input.on('pointerup', release);
            attack.scene.input.on('pointercancel', release);
        }
    }

    // The scene to navigate: the topmost running one with something to press. During a
    // level that can be UIScene (GameScene's dialogue box is drawn there). With nothing to
    // press anywhere, the top game scene gets a scene-wide tap (loading screen).
    findTarget() {
        const skip = ['TouchControlsScene', 'HandheldControlsScene'];
        const scenes = this.controlsScene.game.scene.getScenes(true, true) // running, top first
            .filter(s => skip.indexOf(s.sys.settings.key) === -1 && s.input && s.cameras && s.cameras.main);
        for (const scene of scenes) {
            const found = this.collect(scene);
            // (a dimmed backdrop also stops the search: nothing below it can be pressed)
            if (found.buttons.length || found.zone || found.blocker) return { scene, found };
        }
        const scene = scenes.find(s => s.sys.settings.key !== 'UIScene');
        return scene ? { scene, found: { buttons: [], zone: null, scenewide: true } } : null;
    }

    update(delta) {
        const hit = this.findTarget();
        const target = hit ? hit.scene : null;
        if (target !== this.target) {
            this.blur();
            this.target = target;
            this.pressed = null;
        }
        if (!target) return;

        const { buttons, zone, scenewide } = hit.found;

        // The focused button went away (menu closed, scene changed), or a panel opened over
        // it - remember it, to go back to it when the panel closes
        if (this.focused && buttons.indexOf(this.focused) === -1) {
            if (this.focused.active && !this.remembered) this.remembered = this.focused;
            this.focused = null;
        }
        // Nothing to tap anywhere: start on a button so ATTACK does something (the one
        // focused before the panel that just closed, or else the first)
        if (!this.focused && !zone && buttons.length) {
            const back = this.remembered && buttons.indexOf(this.remembered) !== -1 ? this.remembered : null;
            if (back || (this.remembered && !this.remembered.active)) this.remembered = null;
            this.focus(back || this.readingOrder(buttons)[0]);
        }

        this.updateStick(buttons);
        this.updateAttack(target, zone, scenewide);
    }

    // One step per push: the stick has to come back towards the middle before the next.
    // (Auto-repeat while held ran straight to the last button - it felt stuck there.)
    updateStick(buttons) {
        const joystick = this.overlay.joystick;
        const v = joystick ? joystick.getOutputVector() : { x: 0, y: 0 };
        const amount = Math.hypot(v.x, v.y);
        if (amount < 0.3) {
            this.stickArmed = true;
            return;
        }
        if (!this.stickArmed || amount < 0.5) return;
        this.stickArmed = false;
        const dir = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : (v.y < 0 ? 'up' : 'down');
        this.move(dir, buttons);
    }

    updateAttack(target, zone, scenewide) {
        this.attackEvents.splice(0).forEach(type => {
            if (type === 'down') {
                // The focused button, or with nothing focused the tap-anywhere zone / the scene
                this.pressed = this.focused || zone || (scenewide ? target.input : null);
                if (this.pressed) this.pressed.emit('pointerdown', this.fakePointer(this.pressed), 0, 0, { stopPropagation() {} });
            } else {
                const obj = this.pressed;
                this.pressed = null;
                // pointerup: some buttons act on release (pause menu, end card)
                if (obj && (obj === target.input || obj.active)) {
                    obj.emit('pointerup', this.fakePointer(obj), 0, 0, { stopPropagation() {} });
                }
            }
        });
    }

    // ----------------------------------------
    // Finding the buttons
    // ----------------------------------------

    collect(scene) {
        const list = (scene.input && scene.input._list) || [];
        const view = scene.cameras.main.worldView;
        const blockers = [];
        const zones = [];
        let buttons = [];

        list.forEach(obj => {
            if (!obj || !obj.active || !obj.input || !obj.input.enabled || obj.handheldNavIgnore) return;
            if (!this.isShown(obj) || typeof obj.getBounds !== 'function') return;
            const b = obj.getBounds();
            const full = b.width >= view.width * 0.9 && b.height >= view.height * 0.9;
            const pressable = obj.listenerCount('pointerdown') + obj.listenerCount('pointerup') > 0;
            if (full) {
                if (this.isDrawn(obj)) blockers.push(obj);
                else if (pressable) zones.push(obj);
            } else if (pressable) {
                buttons.push(obj);
            }
        });

        const order = (o) => this.drawOrder(scene, o);
        const above = (a, b) => {
            const oa = order(a), ob = order(b);
            return oa[0] !== ob[0] ? oa[0] > ob[0] : oa[1] > ob[1];
        };

        // A dimmed backdrop: only what is drawn above it counts
        let blocker = null;
        blockers.forEach(o => { if (!blocker || above(o, blocker)) blocker = o; });
        let zone = null;
        if (blocker) {
            buttons = buttons.filter(o => above(o, blocker));
            const zonesAbove = zones.filter(o => above(o, blocker));
            // Nothing above it (credits): ATTACK taps the backdrop itself, closing it
            const pressable = blocker.listenerCount('pointerdown') + blocker.listenerCount('pointerup') > 0;
            zone = zonesAbove[0] || (!buttons.length && pressable ? blocker : null);
        } else {
            zones.forEach(o => { if (!zone || above(o, zone)) zone = o; });
        }
        return { buttons, zone, blocker };
    }

    // Visible and not faded out, all the way up its containers
    isShown(obj) {
        for (let o = obj; o; o = o.parentContainer) {
            if (!o.visible || o.alpha <= 0.01) return false;
        }
        return true;
    }

    // Draws something (a shape with no fill and no stroke only catches taps)
    isDrawn(obj) {
        if (obj.isFilled !== undefined || obj.isStroked !== undefined) {
            return (obj.isFilled && obj.fillAlpha > 0.01) || (obj.isStroked && obj.strokeAlpha > 0.01);
        }
        return true;
    }

    // [depth, index] of its top-level container in the scene's display list
    drawOrder(scene, obj) {
        let top = obj;
        while (top.parentContainer) top = top.parentContainer;
        return [top.depth || 0, scene.children.getIndex(top)];
    }

    center(obj) {
        const b = obj.getBounds();
        return { x: b.centerX, y: b.centerY };
    }

    readingOrder(buttons) {
        return buttons.slice().sort((a, b) => {
            const ca = this.center(a), cb = this.center(b);
            return Math.abs(ca.y - cb.y) > 8 ? ca.y - cb.y : ca.x - cb.x;
        });
    }

    // ----------------------------------------
    // Moving the focus
    // ----------------------------------------

    move(dir, buttons) {
        if (!buttons.length) return;
        if (!this.focused) {
            this.focus(this.readingOrder(buttons)[0]);
            return;
        }
        const from = this.center(this.focused);
        const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        let best = null, bestScore = Infinity;
        buttons.forEach(obj => {
            if (obj === this.focused) return;
            const c = this.center(obj);
            const along = (c.x - from.x) * dx + (c.y - from.y) * dy;
            const across = Math.abs((c.x - from.x) * dy - (c.y - from.y) * dx);
            if (along <= 4 || across > along * 2.5) return; // not in that direction
            const score = along + across * 2;
            if (score < bestScore) { bestScore = score; best = obj; }
        });
        if (best) this.focus(best);
    }

    focus(obj) {
        if (obj === this.focused) return;
        this.blur();
        this.focused = obj;
        if (obj) obj.emit('pointerover', this.fakePointer(obj), 0, 0, { stopPropagation() {} });
    }

    blur() {
        if (this.focused && this.focused.active) {
            this.focused.emit('pointerout', this.fakePointer(this.focused), { stopPropagation() {} });
        }
        this.focused = null;
    }

    // Enough of a Phaser pointer for the scenes' handlers, placed on the object
    fakePointer(obj) {
        let x = 0, y = 0;
        if (obj && typeof obj.getBounds === 'function') {
            const c = this.center(obj);
            x = c.x; y = c.y;
        }
        return {
            id: -1, x, y, worldX: x, worldY: y, downX: x, downY: y, upX: x, upY: y,
            isDown: true, button: 0, event: null, wasTouch: true, handheldNav: true,
            leftButtonDown: () => true, rightButtonDown: () => false,
            getDistance: () => 0, getDuration: () => 0
        };
    }

    reset() {
        this.blur();
        this.target = null;
        this.pressed = null;
        this.remembered = null;
        this.attackEvents.length = 0;
        this.attackPointerId = null;
        this.stickArmed = true;
    }
}

window.HandheldMenuNav = HandheldMenuNav;
