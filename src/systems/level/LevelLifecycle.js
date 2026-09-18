// ========================================
// LEVEL LIFECYCLE
// ========================================
// The ONE place a level is built and torn down.
//
// Every way of entering a level goes through build():
//   - fresh start   GameScene.create()  (menu flow, ?debug=true&level=N, game-over restart)
//   - transition    LevelTransitionManager: teardown() then build()
//
// Before this existed, GameScene.create() and the transition manager each had
// their own partial copy of the setup sequence and they drifted: music only
// started on one path, the spawner's max was set by one and clobbered by the
// other, "loading" flags were cleared by one only. The rule now is simple:
//
//   per-level  -> LevelLifecycle.build() / teardown()   (this file)
//   one-time   -> GameScene.create()                    (HUD, lives, weapon UI, debug)
//
// teardown() is the exhaustive inverse of build(). Every system that keeps
// per-level state is reset here, so nothing from one level leaks into the next
// (old background segments, dialogue restyling, event bounds, the enemy
// protection registry, subway cars, ...).

class LevelLifecycle {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = null;      // the level JSON currently built
        this.currentWorldId = null;    // WorldManager id of the current background
        this.parallaxBackground = null;
        this._busy = false;
        // Loud, greppable marker: if this line is missing from the console, the browser is
        // running a cached copy of the old GameScene/transition manager, not this code.
        console.log('%c🏗️ LevelLifecycle active - levels are built/torn down here (build 2026-09-17)', 'color:#0f0;font-weight:bold');
    }

    // True from the start of teardown()/build() until build() finishes.
    // GameScene.update() checks this instead of juggling five separate flags.
    get busy() {
        return this._busy;
    }

    log(...args) {
        console.log('🏗️ [Lifecycle]', ...args);
    }

    // ========================================
    // BUILD
    // ========================================

    async build(levelId) {
        const s = this.scene;
        this._setBusy(true);
        s.selectedLevelId = levelId;
        this.log(`Building level ${levelId}`);

        // 1. Level definition
        const registry = window.LevelRegistry.getInstance();
        const level = await registry.ensureLevelLoaded(s, levelId);
        if (!level) {
            console.error(`🏗️ [Lifecycle] Level ${levelId} could not be loaded - check src/config/levels/index.json`);
            this._setBusy(false);
            return false;
        }
        this.currentLevel = level;
        if (window.gameState && window.gameState.currentGame) {
            window.gameState.currentGame.levelId = levelId;
        }

        // 2. Assets, then the world: background segments, physics bounds, spawn point
        await window.LevelAssetLoader.ensureLoaded(s, level);
        this.currentWorldId = await window.WorldFactory.create(s, level);

        // 3. Walkable band. EnvironmentManager is the source of truth; everyone else
        //    that caches a copy is updated from here and nowhere else.
        this._applyStreetBounds(
            level.world && level.world.top !== undefined ? level.world.top : 410,
            level.world && level.world.bottom !== undefined ? level.world.bottom : 650
        );

        // 4. Parallax layer (only level 1 declares one today)
        this._createParallax(level);
        s.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

        // 5. Characters at the spawn point, then rebind every system to the active one
        s.characterManager.createCharacters();
        s.bindPlayer(s.characterManager.getActiveCharacter());
        s.settlePhysics();

        // 6. Camera: bounds = world, snap to the spawn, follow
        this._placeCamera();

        // 7. Per-level gameplay systems
        s.checkpointManager.initialize(level, s.physics.world.bounds);
        this._configureSpawner(level);
        // A game-over restart rolls the score back to what it was when this level began
        s.startOfLevelScore = s.playerScore;

        // 8. Audio
        this._startAudio(level);

        // 9. Scripted events - registered last so their initial trigger check sees a
        //    real, positioned player. Nothing below may throw; the busy flag must clear.
        this._setBusy(false);
        s.eventManager.registerEvents(level.events || []);
        if (s.isGameOverRestart) {
            // registerEvents() honoured the flag (no auto-trigger at spawn); consume it
            s.isGameOverRestart = false;
        }

        this.log(`Level ${levelId} (${level.name}) built`);
        return true;
    }

    // ========================================
    // TEARDOWN
    // ========================================

    teardown() {
        const s = this.scene;
        this.log(`Tearing down level ${this.currentLevel ? this.currentLevel.id : 'none'}`);

        // First, because hideDialogue() -> resumeGameplay() re-enables input and it must
        // not undo the freeze below
        if (s.dialogueManager) {
            s.dialogueManager.hideDialogue();
            s.dialogueManager.resetToDefaults();
        }

        this._setBusy(true);

        // Freeze the player where they stand
        if (s.player && s.player.body) {
            s.player.body.setVelocity(0, 0);
            s.player.body.setAcceleration(0, 0);
        }

        // Scripted events, and every piece of state the event actions hang on the scene
        const em = s.eventManager;
        if (em) {
            if (em.specialActions && em.specialActions.stopSubwayCarCycle) {
                em.specialActions.stopSubwayCarCycle();
            }
            em.clearEvents();
            if (em.cinematicManager && em.cinematicManager.removeCinematicDarkening) {
                em.cinematicManager.removeCinematicDarkening();
            }
        }
        if (s.eventEnemiesClearedCheck) {
            s.eventEnemiesClearedCheck.destroy();
            delete s.eventEnemiesClearedCheck;
        }
        s.eventWaitingForZone = null;
        s.eventWaitingForEnemiesCleared = null;
        s.eventWaitingForEnemyDestroy = null;
        s.eventPlayerBounds = null;
        s.eventCameraLocked = false;
        s.eventEnemySpawningConfig = null;
        if (s.eventEnemyMap) {
            s.eventEnemyMap.clear();
        }
        if (s.eventEnemyProtection) {
            s.eventEnemyProtection.clearAll();
        }

        // Everything that was spawned into the level
        if (s.enemySpawnManager) {
            s.enemySpawnManager.destroyAll();   // in place - the shared enemies array survives
            s.enemySpawnManager.setMaxEnemies(0);
        }
        if (s.bosses) {
            s.bosses.length = 0;
        }
        if (s.uiManager) {
            s.uiManager.hideBossHealthBar();
        }
        if (s.weaponManager) s.weaponManager.clearAllProjectiles();
        if (s.itemPickupManager) s.itemPickupManager.clearAllPickups();
        if (s.extrasManager) s.extrasManager.clearAll();
        if (s.sceneElementManager) s.sceneElementManager.clearAll();

        // Audio
        const a = s.audioManager;
        if (a) {
            a.stopBackgroundMusic(false);
            a.stopAmbiance();
            a.stopPlayerRunning();
            a.stopSubwayPassing();
        }

        // Camera
        s.cameras.main.stopFollow();

        // World. Previously the old level's background segments were never removed,
        // so every level's sprites accumulated underneath the next one.
        if (this.parallaxBackground) {
            this.parallaxBackground.destroy();
            this.parallaxBackground = null;
        }
        if (this.currentWorldId && s.worldManager) {
            s.worldManager.destroyWorld(this.currentWorldId);
        }
        this.currentWorldId = null;
        this.currentLevel = null;

        this.log('Teardown complete');
    }

    // ========================================
    // STEPS
    // ========================================

    // One switch for "gameplay is frozen". The individual flags still exist because
    // other systems read them for their own reasons (e.g. boss defeat disables input),
    // but the lifecycle is the only thing that flips them as a set.
    _setBusy(busy) {
        this._busy = busy;
        const s = this.scene;
        s.isLoading = busy;
        if (s.inputManager) s.inputManager.disabled = busy;
        if (s.playerPhysicsManager) s.playerPhysicsManager.disabled = busy;
        if (s.enemySpawnManager) s.enemySpawnManager.isLoading = busy;
        if (s.checkpointManager) s.checkpointManager.isTransitioning = busy;
    }

    _applyStreetBounds(top, bottom) {
        const s = this.scene;
        s.streetTopLimit = top;
        s.streetBottomLimit = bottom;
        if (s.environmentManager) {
            s.environmentManager.streetTopLimit = top;
            s.environmentManager.streetBottomLimit = bottom;
        }
        if (s.inputManager) s.inputManager.setStreetBounds(top, bottom);
        if (s.extrasManager) s.extrasManager.setStreetBounds(top, bottom);
        if (s.playerPhysicsManager) s.playerPhysicsManager.setStreetBounds(top, bottom);
        if (s.combatManager) {
            s.combatManager.streetTopLimit = top;
            s.combatManager.streetBottomLimit = bottom;
        }
        this.log(`Street bounds ${top} - ${bottom}`);
    }

    _placeCamera() {
        const s = this.scene;
        const cam = s.cameras.main;
        const wb = s.physics.world.bounds;
        cam.stopFollow();
        cam.setBounds(wb.x, wb.y, wb.width, wb.height);
        // centerOn clamps to the bounds, which also handles single-screen arenas
        cam.centerOn(s.player.x, wb.height / 2);
        cam.startFollow(s.player, true, 0.1, 0);
        this.log(`Camera bounds x=${wb.x} w=${wb.width}, scroll ${Math.round(cam.scrollX)}`);
    }

    _configureSpawner(level) {
        const s = this.scene;
        const sp = s.enemySpawnManager;
        if (!sp) return;
        const e = level.enemies || {};
        sp.initialize({
            maxEnemies: e.max !== undefined ? e.max : ENEMY_CONFIG.maxEnemiesOnScreen,
            spawnInterval: e.spawnRate || ENEMY_CONFIG.spawnInterval,
            isTestMode: s.isTestMode || false,
            isLoading: true,                    // released by _setBusy(false) at the end of build()
            allowedEnemyTypes: e.types || []
        });
        sp.enemySpawnTimer = 0;
        // The event actions (start/stopEnemySpawning) mirror these on the scene
        s.maxEnemies = sp.maxEnemies;
        s.enemySpawnInterval = sp.enemySpawnInterval;
        this.log(`Spawner max=${sp.maxEnemies} interval=${sp.baseSpawnInterval} types=${(e.types || []).join(', ') || 'all'}`);
    }

    _startAudio(level) {
        const a = this.scene.audioManager;
        if (!a) return;
        const audio = level.audio || {};
        if (audio.music) {
            a.playBackgroundMusic(audio.music, true, audio.musicVolume !== undefined ? audio.musicVolume : null);
        } else {
            a.stopBackgroundMusic(false);
        }
        a.stopAmbiance();
        if (audio.ambiance) {
            a.startAmbiance(audio.ambiance, audio.ambianceVolume || 0.15);
        }
    }

    _createParallax(level) {
        const s = this.scene;
        if (this.parallaxBackground) {
            this.parallaxBackground.destroy();
            this.parallaxBackground = null;
        }
        const key = level.parallaxTexture;
        if (!key) return;
        if (!s.textures.exists(key)) {
            console.error(`🏗️ [Lifecycle] Parallax texture '${key}' not found`);
            return;
        }
        const worldWidth = s.physics.world.bounds.width || 1200;
        const tile = s.add.tileSprite(0, -180, worldWidth * 2, 720, key);
        tile.setOrigin(0, 0);
        tile.setScale(1.2);
        tile.setDepth(-200);          // behind the segments (-100)
        tile.setScrollFactor(0.2);
        tile.setAlpha(0.8);
        this.parallaxBackground = tile;
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.LevelLifecycle = LevelLifecycle;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelLifecycle;
}
