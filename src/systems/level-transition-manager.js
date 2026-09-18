// ========================================
// LEVEL TRANSITION MANAGER
// ========================================
// Switches levels in place (without restarting GameScene) so lives, score and
// character health carry over.
//
// All of the actual building and tearing down lives in LevelLifecycle; this
// class only sequences it and preserves the cross-level player state:
//
//   preserve -> fade out -> teardown -> build -> restore -> fade in

class LevelTransitionManager {
    constructor(scene) {
        this.scene = scene;
        this.isTransitioning = false;
        console.log('🔄 LevelTransitionManager initialized');
    }

    get lifecycle() {
        return this.scene.levelLifecycle;
    }

    async transitionToLevel(levelId, fadeDuration = 1000) {
        if (!levelId) {
            console.error('🔄 transitionToLevel: no levelId given');
            return;
        }
        if (this.isTransitioning || (this.lifecycle && this.lifecycle.busy)) {
            console.warn(`🔄 Transition to level ${levelId} ignored - a transition is already in progress`);
            return;
        }

        const s = this.scene;
        this.isTransitioning = true;
        console.log(`🔄 === TRANSITION ${s.selectedLevelId} -> ${levelId} ===`);

        try {
            const preserved = this._preserveState();

            await this._fadeOut(fadeDuration);
            this.lifecycle.teardown();

            const built = await this.lifecycle.build(levelId);
            if (!built) {
                throw new Error(`Level ${levelId} failed to build`);
            }

            this._restoreState(preserved);
            s.cameras.main.fadeIn(fadeDuration, 0, 0, 0);
            console.log(`🔄 === TRANSITION TO LEVEL ${levelId} COMPLETE ===`);
        } catch (error) {
            console.error(`🔄 Level transition to ${levelId} failed:`, error);
            // Deliberately NO scene.restart() here. A restart redraws the HUD on the
            // still-alive UIScene, and if anything in the restarted create() then throws,
            // Phaser's frame loop dies: black screen, two HUDs, frozen. Show the error
            // on screen instead and leave the scene inspectable.
            if (window.__showGameError) {
                window.__showGameError(`Level transition to ${levelId} failed`, error);
            }
            if (this.lifecycle) this.lifecycle._setBusy(false);
            if (s.player) s.cameras.main.fadeIn(fadeDuration, 0, 0, 0);
        } finally {
            this.isTransitioning = false;
        }
    }

    // ========================================
    // CROSS-LEVEL STATE
    // ========================================

    _preserveState() {
        const s = this.scene;
        const cm = s.characterManager;
        const state = {
            lives: s.livesManager ? s.livesManager.getLives() : 3,
            score: s.playerScore || 0,
            characterHealth: {}
        };
        if (cm) {
            Object.keys(cm.characters).forEach(name => {
                state.characterHealth[name] = {
                    health: cm.characters[name].health,
                    maxHealth: cm.characters[name].maxHealth
                };
            });
        }
        console.log('🔄 Preserved:', JSON.stringify(state));
        return state;
    }

    _restoreState(state) {
        const s = this.scene;
        const cm = s.characterManager;
        const ui = s.uiManager;

        if (s.livesManager) {
            s.livesManager.setLives(state.lives);
            if (ui) ui.updateLivesDisplay(state.lives);
        }

        s.playerScore = state.score;
        if (ui) ui.updateScoreDisplay(state.score);

        if (cm) {
            Object.keys(state.characterHealth).forEach(name => {
                const saved = state.characterHealth[name];
                const data = cm.characters[name];
                if (!data) return;
                data.maxHealth = saved.maxHealth;
                data.health = Math.min(saved.health, saved.maxHealth);
            });
            if (ui) {
                const active = cm.getActiveCharacterData();
                ui.updateHealthBar(active.health, active.maxHealth);
                ui.updateDualCharacterHealth(
                    cm.characters.tireek.health,
                    cm.characters.tryston.health,
                    cm.getActiveCharacterName()
                );
            }
        }
    }

    // ========================================
    // FADE
    // ========================================

    // Resolves once the camera is fully black. Handles all three starting states:
    // already black (the level's own 'fade' action ran first), mid-fade, or visible.
    _fadeOut(duration) {
        return new Promise((resolve) => {
            const cam = this.scene.cameras.main;
            const fx = cam.fadeEffect;

            if (fx && fx.isRunning && fx.direction === true) {
                cam.once('camerafadeoutcomplete', () => resolve());
                return;
            }
            if (fx && fx.alpha >= 0.99) {
                resolve();
                return;
            }
            cam.once('camerafadeoutcomplete', () => resolve());
            cam.fadeOut(duration, 0, 0, 0);
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelTransitionManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.LevelTransitionManager = LevelTransitionManager;
}
