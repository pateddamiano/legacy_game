// ========================================
// TUTORIAL ACTIONS
// ========================================
// The level 1 controls tutorial (event "level_1_tutorial" in 1-streets.json, started by
// the intro event once Rozotadi is done talking). Actions:
//   tutorialStart  - stops spawning, pins the camera and the player to this screen, and
//                    puts up the TutorialOverlay (dim, prompt, SKIP). Plays on every run
//                    of level 1; the player can SKIP it.
//   tutorialSpawn  - thugs run in and become "dummies" (Enemy.tutorialDummy): they stand
//                    there, flinch, get knocked back and blown away, but can't attack or die
//   tutorialStep   - teaches one control: highlight it, prompt, and advance only once the
//                    player has actually done it (signals emitted by GameScene / combat /
//                    weapons: 'tutorial:jump', 'tutorial:throw', 'player:recordHit',
//                    'player:punchHit', 'tutorial:switch')
//   tutorialEnd    - last message, then everything goes back to normal play: dummies turn
//                    into regular enemies, spawning resumes, the camera follows again
// GameScene.tutorialAllowedActions limits the controls to the ones taught so far (see
// InputManager.isActionAllowed) - the player can't even walk until the move step. The
// ones that touch the thugs (TutorialActions.ONE_SHOT) only work during their own step,
// until it's done once, so the player can't beat the dummies around the screen.

class TutorialActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
        this.state = null;   // non-null while a tutorial is running
        this.overlay = null;

        this.scene.events.once('shutdown', () => this.finish({ sceneGone: true }));
    }

    advanceAction() {
        this.eventManager.advanceAction();
    }

    // ----------------------------------------
    // tutorialStart
    // ----------------------------------------
    executeTutorialStart(action) {
        const scene = this.scene;
        console.log('🎓 Tutorial starting');

        const spawnManager = scene.enemySpawnManager;
        this.state = {
            eventId: this.eventManager.activeEvent && this.eventManager.activeEvent.id,
            learned: new Set(),
            dummies: [],
            listeners: [],
            next: null,   // what a tap on the box (or ENTER) does right now; null = nothing
            savedMaxEnemies: spawnManager ? spawnManager.maxEnemies : null
        };
        if (spawnManager) spawnManager.setMaxEnemies(0);

        // No controls at all until each is taught (movement included)
        scene.tutorialAllowedActions = new Set();

        // Hold the camera and keep the player on this screen
        const cam = scene.cameras.main;
        cam.stopFollow();
        scene.eventCameraLocked = true;
        const view = cam.worldView;
        scene.eventPlayerBounds = { minX: view.left + 90, maxX: view.right - 90, minY: null, maxY: null };

        this.overlay = new TutorialOverlay(scene, { onNext: () => this.next(), onSkip: () => this.skip() });
        this.overlay.setAllTexts(this.collectTexts(this.overlay.isTouch()));
        this.overlay.setText(action.text || '');

        this.advanceAction();
    }

    // ----------------------------------------
    // tutorialSpawn
    // ----------------------------------------
    // enemies: [{ type, id, x, y }]  x/y = where they stop, x in screen space (0-1200)
    //          or { type, id, nearPlayer: dx } to stop dx from the player, in their lane
    // They run in from the nearest screen edge; the action advances once all have arrived.
    executeTutorialSpawn(action) {
        const st = this.state;
        if (!st) { this.advanceAction(); return; }
        const scene = this.scene;
        const view = scene.cameras.main.worldView;
        const defs = action.enemies || [];
        let pending = defs.length;
        const T = TutorialActions.TIMING;
        const arrived = () => {
            pending--;
            if (pending === 0 && this.state === st) {
                scene.time.delayedCall(T.afterArrive, () => { if (this.state === st) this.advanceAction(); });
            }
        };
        if (pending === 0) { this.advanceAction(); return; }

        defs.forEach((def, i) => {
            const config = (typeof ALL_ENEMY_TYPES !== 'undefined') && ALL_ENEMY_TYPES.find(c => c.name === def.type);
            if (!config) {
                console.warn(`🎓 Tutorial: unknown enemy type ${def.type}`);
                arrived();
                return;
            }
            const player = scene.player;
            const toX = def.nearPlayer !== undefined
                ? Phaser.Math.Clamp(player.x + def.nearPlayer, view.left + 80, view.right - 80)
                : view.left + (def.x !== undefined ? def.x : 900);
            const toY = def.y !== undefined ? def.y : player.y;
            const fromLeft = toX < view.centerX;
            const fromX = fromLeft ? view.left - 160 : view.right + 160;

            const enemy = new Enemy(scene, fromX, toY, config);
            enemy.setPlayer(player);
            enemy.eventId = def.id || `tut_${i}`; // spawn-manager cleanup leaves event enemies alone
            // Event-paused while running in (no AI); keep the walk cycle instead of idle
            enemy.eventPaused = true;
            enemy._idleWhilePaused = true;
            enemy.playAnimIfExists(`${enemy.variationName}_walk`);
            enemy.sprite.setFlipX(fromX > toX);
            // May start outside the world: enter freely, collide again once inside
            enemy.sprite.setCollideWorldBounds(false);
            enemy.reenableWorldBoundsOnEntry = true;

            this.eventManager.utilities.getEnemiesArray();
            scene.enemies.push(enemy);
            st.dummies.push(enemy);

            scene.tweens.add({
                targets: enemy.sprite,
                x: toX,
                duration: Math.abs(toX - fromX) / T.runInSpeed,
                delay: i * T.runInStagger,
                ease: 'Linear',
                onComplete: () => {
                    if (!enemy.sprite || !enemy.sprite.active) { arrived(); return; }
                    enemy.eventPaused = false;
                    enemy._idleWhilePaused = false;
                    if (this.state === st) enemy.tutorialDummy = true;
                    arrived();
                }
            });
        });
    }

    // ----------------------------------------
    // tutorialStep
    // ----------------------------------------
    // { step: 'move'|'jump'|'throw'|'punch'|'switch'|'info', touchText, keyText,
    //   retryTouchText, retryKeyText (throw misses), rechargeText (throw hit, waiting
    //   for the recharge), successText,
    //   waitForTap: true -> once done, keep the instructions up under the ✓ and wait for
    //   a tap instead of moving on by itself (for lines too long to read mid-action) }
    // 'info' teaches nothing to press: it shows the text until the box is tapped.
    // A tap on the box (or ENTER) always moves on: mid-lesson it counts the lesson as
    // done, on a ✓ line it skips the wait.
    executeTutorialStep(action) {
        const st = this.state;
        if (!st) { this.advanceAction(); return; }
        const scene = this.scene;
        const step = action.step;
        const touch = this.overlay.isTouch();

        const oneShot = TutorialActions.ONE_SHOT;
        scene.tutorialAllowedActions = new Set([...st.learned].filter(a => !oneShot.has(a)).concat(step));
        this.overlay.setStep(step, touch ? action.touchText : action.keyText);
        console.log(`🎓 Tutorial step: ${step}`);

        const T = TutorialActions.TIMING;
        const shownAt = scene.time.now;
        let finished = false;   // the lesson is done (by doing it, or by tapping past it)
        let advanced = false;   // moved on to the next action - exactly once
        const goOn = () => {
            if (advanced || this.state !== st) return;
            advanced = true;
            st.next = null;
            this.advanceAction();
        };
        const finishLesson = () => {
            if (finished || this.state !== st) return false;
            finished = true;
            this.clearListeners();
            st.learned.add(step);
            if (TutorialActions.ONE_SHOT.has(step)) this.lock(step);
            return true;
        };
        // Tapping the box before doing it: count the lesson as done and move on
        st.next = () => { finishLesson(); goOn(); };

        // Did it. delay: time to let the move play out (land, see the push). The ✓ line
        // also waits until the prompt has been up for minPromptTime, so a quick player
        // still gets to read it. A tap from here on just skips the wait.
        const complete = (delay = 0) => {
            if (!finishLesson()) return;
            st.next = goOn;
            const succeed = () => {
                if (advanced || this.state !== st) return;
                if (action.waitForTap) {
                    this.overlay.showSuccess(action.successText, touch ? action.touchText : action.keyText);
                    return; // only a tap on the box moves on
                }
                this.overlay.showSuccess(action.successText);
                scene.time.delayedCall(T.successHold, goOn);
            };
            const wait = Math.max(delay, shownAt + T.minPromptTime - scene.time.now);
            if (wait > 0) scene.time.delayedCall(wait, succeed); else succeed();
        };

        switch (step) {
            case 'move': {
                const startX = scene.player.x;
                this.listen('update', () => {
                    if (scene.player && Math.abs(scene.player.x - startX) >= 150) complete();
                });
                break;
            }
            case 'jump':
                this.listen('tutorial:jump', () => complete(T.afterJump)); // let them land first
                break;
            case 'throw': {
                // Needs a hit, then waits for the full recharge so the meter is seen filling.
                // On the hit the prompt switches to the recharge line, which stays up at
                // least minPromptTime.
                let hit = false, thrown = false, hinted = false, rechargeShownAt = 0;
                this.listen('tutorial:throw', () => { thrown = true; hinted = false; });
                this.listen('player:recordHit', () => {
                    if (hit) return;
                    hit = true;
                    this.lock('throw'); // one hit is the lesson; no more throws while it recharges
                    rechargeShownAt = scene.time.now;
                    if (action.rechargeText) this.overlay.setText(action.rechargeText);
                });
                this.listen('update', () => {
                    const ready = scene.weaponManager && scene.weaponManager.canUseWeapon();
                    if (hit && ready && scene.time.now - rechargeShownAt >= T.minPromptTime) {
                        complete();
                    } else if (thrown && !hit && ready && !hinted) {
                        hinted = true;
                        this.overlay.setText(touch ? action.retryTouchText : action.retryKeyText);
                    }
                });
                break;
            }
            case 'punch':
                this.listen('player:punchHit', () => complete(T.afterPunch));
                break;
            case 'switch':
                this.listen('tutorial:switch', () => complete(T.afterSwitch)); // watch the wind push
                break;
            case 'info':
                break; // only a tap on the box moves on (st.next above)
            default:
                console.warn(`🎓 Unknown tutorial step ${step}`);
                complete();
        }
    }

    // Every line this tutorial event will show, formatted as shown, so the overlay can
    // size its (fixed) box once for the longest
    collectTexts(touch) {
        const out = [];
        (this.eventManager.actionQueue || []).forEach(a => {
            if (a.type === 'tutorialStart' || a.type === 'tutorialEnd') out.push(a.text);
            if (a.type !== 'tutorialStep') return;
            out.push(touch ? a.touchText : a.keyText);
            if (a.step !== 'info') out.push(touch ? a.retryTouchText : a.retryKeyText, a.rechargeText, `✓ ${a.successText || 'Nice!'}`);
            if (a.waitForTap) out.push(`✓ ${a.successText || 'Nice!'}\n\n${touch ? a.touchText : a.keyText}`);
        });
        return out;
    }

    // Turn one control off again for the rest of the tutorial
    lock(action) {
        const allowed = this.scene.tutorialAllowedActions;
        if (allowed) allowed.delete(action);
    }

    listen(eventName, fn) {
        this.scene.events.on(eventName, fn);
        this.state.listeners.push([eventName, fn]);
    }

    clearListeners() {
        if (!this.state) return;
        this.state.listeners.forEach(([name, fn]) => this.scene.events.off(name, fn));
        this.state.listeners = [];
    }

    // ----------------------------------------
    // tutorialEnd
    // ----------------------------------------
    executeTutorialEnd(action) {
        const st = this.state;
        if (!st) { this.advanceAction(); return; }
        this.scene.tutorialAllowedActions = null;
        this.overlay.target = null;
        this.overlay.setText(action.text || '', '#FFD700');
        const end = () => {
            if (this.state !== st) return;
            this.finish();
            this.advanceAction();
        };
        st.next = end; // tap the box to start playing right away
        this.scene.time.delayedCall(action.duration || TutorialActions.TIMING.endHold, end);
    }

    // Tap on the box / ENTER: whatever "next" means right now (see executeTutorialStep)
    next() {
        if (this.state && this.state.next) this.state.next();
    }

    // SKIP TUTORIAL button: end the whole tutorial
    skip() {
        if (!this.state) return;
        console.log('🎓 Tutorial skipped');
        this.finish();
        this.endEventNow();
    }

    // End the tutorial event right here (skips its remaining actions)
    endEventNow() {
        const em = this.eventManager;
        em.currentActionIndex = em.actionQueue.length;
        em.executeNextAction(); // completes the event
    }

    // Back to normal play
    finish({ sceneGone = false } = {}) {
        const st = this.state;
        if (!st) return;
        this.clearListeners();
        this.state = null;
        if (this.overlay) {
            if (!sceneGone) this.overlay.destroy();
            this.overlay = null;
        }
        if (sceneGone) return;

        const scene = this.scene;
        scene.tutorialAllowedActions = null;
        scene.eventPlayerBounds = null;
        scene.eventCameraLocked = false;
        if (scene.player && scene.cameras && scene.cameras.main) {
            scene.cameras.main.startFollow(scene.player, true, 0.1, 0);
        }

        // Dummies become regular enemies (AI on, killable, cleaned up normally)
        st.dummies.forEach(enemy => {
            if (!enemy || !enemy.sprite || !enemy.sprite.active) return;
            scene.tweens.killTweensOf(enemy.sprite);
            enemy.tutorialDummy = false;
            enemy.health = enemy.maxHealth; // hits taken as a dummy don't count
            enemy.eventPaused = false;
            enemy._idleWhilePaused = false;
            delete enemy.eventId;
            // The switch step swapped the player sprite; chase the current one
            if (scene.player) enemy.setPlayer(scene.player);
            if (enemy.state === ENEMY_STATES.WALKING) enemy.playAnimIfExists(`${enemy.variationName}_walk`);
        });

        if (scene.enemySpawnManager && st.savedMaxEnemies !== null) {
            scene.enemySpawnManager.setMaxEnemies(st.savedMaxEnemies);
        }
        console.log('🎓 Tutorial finished - normal play');
    }
}

// Pacing (ms unless noted) - raise these to slow the tutorial down further
TutorialActions.TIMING = {
    runInSpeed: 0.3,      // thugs running in, px per ms (300px/s)
    runInStagger: 450,    // gap between each thug starting to run
    afterArrive: 1200,    // pause once they've arrived, before the next prompt
    minPromptTime: 1800,  // each prompt stays up at least this long, even if done instantly
    successHold: 2000,    // how long "✓ Nice!" stays before the next prompt
    afterJump: 900,       // let the player land before the ✓
    afterPunch: 600,
    afterSwitch: 1800,    // watch the wind push them away
    endHold: 3500         // the final "You're ready" line
};

// Controls that hit or shove the thugs: allowed only during their own step, until done once
TutorialActions.ONE_SHOT = new Set(['throw', 'punch', 'switch']);

if (typeof window !== 'undefined') {
    window.TutorialActions = TutorialActions;
}
