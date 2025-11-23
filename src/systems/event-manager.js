// ========================================
// EVENT MANAGER
// ========================================
// Handles scripted events triggered by player position, supporting
// pausing gameplay, sequenced character/enemy movement, and dialogue integration

console.log('🎬 Loading EventManager...');

class EventManager {
    constructor(scene) {
        this.scene = scene;
        this.events = [];
        this.triggeredEvents = new Set(); // Track which events have been triggered
        this.activeEvent = null; // Currently executing event
        this.actionQueue = []; // Queue of actions for current event
        this.currentActionIndex = 0;
        this.isPaused = false;

        // Initialize protection system if not already present
        if (!this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection = new EventEnemyProtection(this.scene);
        }

        // Entity pause state tracking
        this.pausedEntities = {
            player: false,
            enemies: [],
            all: false
        };

        // Store original entity states for restoration
        this.savedEntityStates = new Map();
        
        // Track event-related timers for cleanup
        this.eventTimers = [];
        
        // Cinematic darkening effect
        this.darkenedSprites = []; // Track sprites we've darkened
        this.speakingExtra = null; // The extra currently speaking
        this.cinematicDarkeningEnabled = false; // Flag to enable/disable cinematic darkening
        
        // Initialize all action modules
        this.utilities = new EventUtilities(this);
        this.entityManager = new EventEntityManager(this);
        this.cinematicManager = new EventCinematicManager(this);
        this.enemyActions = new EnemyActions(this);
        this.bossActions = new BossActions(this);
        this.cameraActions = new CameraActions(this);
        this.movementActions = new MovementActions(this);
        this.sceneActions = new SceneActions(this);
        this.spawningActions = new SpawningActions(this);
        this.extrasActions = new ExtrasActions(this);
        this.specialActions = new SpecialActions(this);
        
        console.log('🎬 EventManager initialized');
    }
    
    // ========================================
    // EVENT REGISTRATION
    // ========================================
    
    registerEvents(events) {
        if (!events || events.length === 0) {
            console.log('🎬 No events to register');
            return;
        }

        console.log(`🎬 Registering ${events.length} event(s)`);
        this.events = events.map(event => ({
            ...event,
            triggered: false
        }));
        
        // Reset triggered events set
        this.triggeredEvents.clear();
        this._gameOverRestartLogShown = false; // Reset log flag
        
        console.log('🎬 Events registered:', this.events.map(e => e.id || 'unnamed'));
        
        // Check if any events should trigger immediately (player already past trigger)
        this.checkInitialTriggers();
    }
    
    checkInitialTriggers() {
        // Check if player exists and if any events should trigger immediately
        if (!this.scene.player) {
            // Player not created yet, will check in update loop
            return;
        }
        
        // Skip if this is a Game Over restart to prevent immediate triggering
        if (this.scene.isGameOverRestart) {
            // Only log this once to avoid spamming if called multiple times
            if (!this._gameOverRestartLogShown) {
                console.log('🎬 EventManager: Skipping initial triggers due to Game Over restart');
                this._gameOverRestartLogShown = true;
            }
            return;
        }
        
        const playerX = this.scene.player.x;
        const worldBounds = this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds 
            ? { x: this.scene.physics.world.bounds.x, width: this.scene.physics.world.bounds.width }
            : { x: 0, width: 3600 };
        const camera = this.scene.cameras.main;
        
        // Check each event for immediate trigger
        this.events.forEach(event => {
            // Skip if already triggered or not a position trigger
            if (event.triggered || !event.trigger || event.trigger.type !== 'position') {
                return;
            }
            
            // Check if player is already at or past the trigger position (with tolerance)
            const targetX = event.trigger.value;
            const tolerance = event.trigger.tolerance || 50;
            
            // If player is at or past the trigger (within tolerance), trigger immediately
            // This handles cases where player spawns past the trigger
            if (playerX >= targetX - tolerance) {
                console.log(`🎬 Player already at/past trigger position (${playerX} >= ${targetX - tolerance}) for event ${event.id}, triggering immediately`);
                this.triggerEvent(event);
            }
        });
    }
    
    clearEvents() {
        console.log('🎬 Clearing all events');
        this.events = [];
        this.triggeredEvents.clear();
        this.activeEvent = null;
        this.actionQueue = [];
        this.currentActionIndex = 0;
        // Reset pause state properties without breaking references
        this.pausedEntities.player = false;
        this.pausedEntities.enemies = [];
        this.pausedEntities.all = false;
        this.savedEntityStates.clear();
    }
    
    // ========================================
    // UPDATE LOOP
    // ========================================
    
    update(playerX, worldBounds, camera) {
        // Check for zone triggers first (if waiting for zone)
        if (this.scene.eventWaitingForZone) {
            this.checkZoneTrigger();
        }
        
        // Don't check triggers if an event is currently executing
        if (this.activeEvent) {
            return;
        }
        
        // Check each event for trigger conditions
        this.events.forEach(event => {
            // Skip if already triggered and marked as once-only
            if (event.triggered || (event.trigger && event.trigger.once && this.triggeredEvents.has(event.id))) {
                return;
            }
            
            // Check trigger condition
            if (this.checkTrigger(event.trigger, playerX, worldBounds, camera)) {
                console.log(`🎬 Triggering event: ${event.id || 'unnamed'}`);
                this.triggerEvent(event);
            }
        });
    }
    
    // ========================================
    // TRIGGER DETECTION
    // ========================================
    
    checkTrigger(trigger, playerX, worldBounds, camera) {
        if (!trigger) return false;
        
        const worldStart = worldBounds.x || 0;
        const worldWidth = worldBounds.width || 3600;
        const worldEnd = worldStart + worldWidth;
        
        switch (trigger.type) {
            case 'position':
                // Trigger at specific pixel X coordinate
                const targetX = trigger.value;
                const positionTolerance = trigger.tolerance || 50; // Default tolerance of 50px
                return Math.abs(playerX - targetX) <= positionTolerance;
                
            case 'percentage':
                // Trigger at percentage through level (0.0 to 1.0)
                const currentProgress = (playerX - worldStart) / worldWidth;
                const targetProgress = trigger.value;
                const progressTolerance = trigger.tolerance || 0.02; // Default 2% tolerance
                return Math.abs(currentProgress - targetProgress) <= progressTolerance;
                
            case 'camera_at_end':
                // Trigger when camera reaches the end of the world
                if (!camera) return false;
                const cameraRightEdge = camera.scrollX + camera.width;
                const worldRightEdge = worldStart + worldWidth;
                const cameraTolerance = trigger.tolerance || 10; // Default tolerance of 10px
                return cameraRightEdge >= worldRightEdge - cameraTolerance;
                
            default:
                console.warn(`🎬 Unknown trigger type: ${trigger.type}`);
                return false;
        }
    }
    
    // ========================================
    // EVENT EXECUTION
    // ========================================
    
    triggerEvent(event) {
        if (!event.actions || event.actions.length === 0) {
            console.warn(`🎬 Event ${event.id || 'unnamed'} has no actions`);
            return;
        }

        // Mark event as triggered
        event.triggered = true;
        this.triggeredEvents.add(event.id);

        // Set as active event
        this.activeEvent = event;
        this.actionQueue = [...event.actions]; // Copy actions array
        this.currentActionIndex = 0;

        console.log(`🎬 Started event: ${event.id || 'unnamed'}`);

        // Set special checkpoint for level end events (e.g., level_1_end)
        if (event.id === 'level_1_end' && this.scene.checkpointManager && this.scene.player) {
            const playerX = this.scene.player.x;
            const playerY = this.scene.player.y;
            this.scene.checkpointManager.setEventCheckpoint(event.id, { x: playerX, y: playerY });
            console.log(`📍 Special checkpoint set for ${event.id} at (${playerX}, ${playerY})`);
        }

        // NOTE: Enemies are NOT automatically paused at event start
        // Enemies must be explicitly paused/resumed using 'pause' and 'resume' actions in the event JSON
        // This gives full control over when enemies are frozen during events

        // Apply cinematic darkening effect for the entire event
        this.cinematicManager.applyCinematicDarkening(null); // Start with no specific speaker (will update when dialogue shows)

        // Execute first action
        this.executeNextAction();
    }
    
    executeNextAction() {
        if (!this.activeEvent) return;
        
        // Check if all actions are complete
        if (this.currentActionIndex >= this.actionQueue.length) {
            console.log(`🎬 Event ${this.activeEvent.id || 'unnamed'} complete`);
            this.completeEvent();
            return;
        }
        
        const action = this.actionQueue[this.currentActionIndex];
        console.log(`🎬 Executing action ${this.currentActionIndex + 1}/${this.actionQueue.length}: ${action.type}`);
        
        // Execute action based on type - delegate to appropriate module
        switch (action.type) {
            case 'pause':
                this.specialActions.executePause(action);
                break;
            case 'resume':
                this.specialActions.executeResume(action);
                break;
            case 'move':
                this.movementActions.executeMove(action);
                break;
            case 'dialogue':
                this.sceneActions.executeDialogue(action);
                break;
            case 'wait':
                this.sceneActions.executeWait(action);
                break;
            case 'camera':
                this.cameraActions.executeCamera(action);
                break;
            case 'spawnEnemy':
                this.enemyActions.executeSpawnEnemy(action);
                break;
            case 'moveAllEnemies':
                this.enemyActions.executeMoveAllEnemies(action);
                break;
            case 'destroyEnemy':
                this.enemyActions.executeDestroyEnemy(action);
                break;
            case 'flip':
                this.movementActions.executeFlip(action);
                break;
            case 'setPlayerBounds':
                this.movementActions.executeSetPlayerBounds(action);
                break;
            case 'startEnemySpawning':
                this.spawningActions.executeStartEnemySpawning(action);
                break;
            case 'stopEnemySpawning':
                this.spawningActions.executeStopEnemySpawning(action);
                break;
            case 'waitForZone':
                this.sceneActions.executeWaitForZone(action);
                break;
            case 'waitForEnemiesCleared':
                this.spawningActions.executeWaitForEnemiesCleared(action);
                break;
            case 'waitForEnemyDestroy':
                this.enemyActions.executeWaitForEnemyDestroy(action);
                break;
            case 'fade':
                this.sceneActions.executeFade(action);
                break;
            case 'loadLevel':
                this.sceneActions.executeLoadLevel(action);
                break;
            case 'clearEnemiesOffscreen':
                this.enemyActions.executeClearEnemiesOffscreen(action);
                break;
            case 'clearAllEnemies':
                this.enemyActions.executeClearAllEnemies(action);
                break;
            case 'spawnExtra':
                this.extrasActions.executeSpawnExtra(action);
                break;
            case 'destroyExtra':
                this.extrasActions.executeDestroyExtra(action);
                break;
            case 'triggerEvent':
                this.specialActions.executeTriggerEvent(action);
                break;
            case 'startSubwayMovement':
                this.specialActions.executeStartSubwayMovement(action);
                break;
            case 'spawnSubwayCarCycle':
                this.specialActions.executeSpawnSubwayCarCycle(action);
                break;
            case 'spawnBoss':
                this.bossActions.executeSpawnBoss(action);
                break;
            case 'showBossHealthBar':
                this.bossActions.executeShowBossHealthBar(action);
                break;
            case 'setBossBehavior':
                this.bossActions.executeSetBossBehavior(action);
                break;
            case 'waitForBossDefeated':
                this.bossActions.executeWaitForBossDefeated(action);
                break;
            case 'bossDefeatedDialogue':
                this.bossActions.executeBossDefeatedDialogue(action);
                break;
            default:
                console.warn(`🎬 Unknown action type: ${action.type}`);
                this.advanceAction();
        }
    }
    
    advanceAction() {
        this.currentActionIndex++;
        // Small delay before next action to prevent frame conflicts
        this.scene.time.delayedCall(10, () => {
            this.executeNextAction();
        });
    }
    
    completeEvent() {
        console.log(`🎬 Completed event: ${this.activeEvent?.id || 'unnamed'}`);

        // Remove cinematic darkening effect
        this.cinematicManager.removeCinematicDarkening();

        // Validate protection registry on event completion
        if (this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection.validateRegistry();
        }

        // NOTE: Enemies are NOT automatically resumed when events complete
        // Enemies must be explicitly resumed using 'resume' actions in the event JSON
        // This ensures enemies stay paused if the event doesn't explicitly resume them

        this.activeEvent = null;
        this.actionQueue = [];
        this.currentActionIndex = 0;
    }
    
    // ========================================
    // ZONE TRIGGER CHECKING
    // ========================================
    
    checkZoneTrigger() {
        if (!this.scene.eventWaitingForZone || !this.scene.player) {
            return false;
        }
        
        const zone = this.scene.eventWaitingForZone;
        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;
        
        if (playerX >= zone.x1 && playerX <= zone.x2 && 
            playerY >= zone.y1 && playerY <= zone.y2) {
            console.log(`🎬 Player entered zone at (${playerX}, ${playerY})`);
            this.scene.eventWaitingForZone = null;
            // Advance to next action
            this.advanceAction();
            return true;
        }
        
        return false;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getEntity(target) {
        return this.utilities.getEntity(target);
    }
    
    getEnemyById(enemyId) {
        return this.utilities.getEnemyById(enemyId);
    }
    
    isEventActive() {
        return this.activeEvent !== null;
    }
    
    getActiveEvent() {
        return this.activeEvent;
    }
    
    // ========================================
    // EVENT STATE CLEANUP
    // ========================================
    
    /**
     * Centralized cleanup of ALL event-related state
     * This ensures events always start with a clean slate
     * Called before triggering/restarting events
     */
    cleanupEventState() {
        console.log('🎬 Cleaning up all event-related state...');
        console.log(`🎬 Cleanup: pausedEntities before cleanup:`, {
            player: this.pausedEntities.player,
            enemiesCount: this.pausedEntities.enemies.length,
            all: this.pausedEntities.all
        });
        
        // 1. Clear all pending timers from the scene
        if (this.scene.time && this.scene.time.removeAllEvents) {
            const pendingCount = this.scene.time._pendingInsertion ? this.scene.time._pendingInsertion.length : 0;
            const activeCount = this.scene.time._active ? this.scene.time._active.length : 0;
            const timerCount = pendingCount + activeCount;
            this.scene.time.removeAllEvents();
            if (timerCount > 0) {
                console.log(`🎬 Cleared ${timerCount} pending timers`);
            }
        }
        
        // 2. Complete any active event
        if (this.activeEvent) {
            const eventId = this.activeEvent.id;
            console.log(`🎬 Completing active event: ${eventId}`);
            this.completeEvent();
        }
        
        // 3. Stop enemy spawning
        if (this.scene.enemySpawnManager) {
            this.scene.enemySpawnManager.setMaxEnemies(0);
        }
        
        // 4. Clear all enemies
        if (this.scene.enemies && this.scene.enemies.length > 0) {
            const enemyCount = this.scene.enemies.length;
            if (this.scene.enemySpawnManager) {
                this.scene.enemySpawnManager.destroyAll();
            }
            console.log(`🎬 Cleared ${enemyCount} enemies`);
        }
        
        // 5. Clear event-related scene flags
        this.scene.eventWaitingForZone = null;
        this.scene.eventWaitingForEnemyDestroy = null;
        this.scene.eventWaitingForEnemiesCleared = false;
        
        // 6. Clear enemy protection registry
        if (this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection.clearAll();
        }
        
        // 7. Clear extras (event NPCs like the critic)
        if (this.scene.extrasManager) {
            this.scene.extrasManager.clearAll();
        }
        
        // 8. Clear all projectiles
        if (this.scene.weaponManager) {
            this.scene.weaponManager.clearAllProjectiles();
        }
        
        // 9. Resume all entities and reset pause states
        // Important: Actually resume the entities, don't just reset the tracking flags
        if (this.pausedEntities.player || this.pausedEntities.all) {
            this.entityManager.resumeEntities(['player']);
            console.log(`🎬 Resumed player during cleanup`);
        }
        if (this.pausedEntities.enemies.length > 0 || this.pausedEntities.all) {
            this.entityManager.resumeEntities(['enemies']);
            console.log(`🎬 Resumed enemies during cleanup`);
        }
        
        // Now reset pause state tracking (modify properties, don't replace object to preserve references)
        this.pausedEntities.player = false;
        this.pausedEntities.enemies = [];
        this.pausedEntities.all = false;
        this.savedEntityStates.clear();
        
        // 10. Clear cinematic effects
        this.cinematicManager.removeCinematicDarkening();
        
        console.log('🎬 Event state cleanup complete');
    }
    
    // ========================================
    // EVENT RESTART API
    // ========================================
    
    /**
     * Restart the currently active event from the beginning
     * Simple public API for lives system integration
     * @returns {boolean} True if event was restarted, false if no active event
     */
    restartActiveEvent() {
        if (!this.activeEvent) {
            console.warn('🎬 Cannot restart event: no active event');
            return false;
        }
        
        const eventId = this.activeEvent.id;
        console.log(`🎬 ========== RESTARTING EVENT: ${eventId} ==========`);
        
        // Find the event
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            console.warn(`🎬 Cannot restart event ${eventId}: not found`);
            return false;
        }
        
        // Clean up all event state
        this.cleanupEventState();
        
        // Reset event's triggered state
        event.triggered = false;
        this.triggeredEvents.delete(eventId);
        
        // Trigger the event fresh
        console.log(`🎬 Triggering cleaned event: ${eventId}`);
        this.triggerEvent(event);
        console.log(`🎬 ========== EVENT RESTART COMPLETE ==========`);
        
        return true;
    }
    
    /**
     * DEPRECATED: Use restartActiveEvent() instead
     * Legacy method kept for backward compatibility
     * Simply delegates to restartActiveEvent()
     */
    retriggerEvent(eventId) {
        console.warn(`🎬 retriggerEvent() is deprecated, use restartActiveEvent() instead`);
        return this.restartActiveEvent();
    }
    
    // ========================================
    // PUBLIC API METHODS (delegated to modules)
    // ========================================
    
    // These methods are kept for backward compatibility
    // They delegate to the appropriate modules
    
    pauseEntities(targets) {
        return this.entityManager.pauseEntities(targets);
    }
    
    resumeEntities(targets) {
        return this.entityManager.resumeEntities(targets);
    }
    
    pausePlayer() {
        return this.entityManager.pausePlayer();
    }
    
    resumePlayer() {
        return this.entityManager.resumePlayer();
    }
    
    pauseEnemies() {
        return this.entityManager.pauseEnemies();
    }
    
    resumeEnemies() {
        return this.entityManager.resumeEnemies();
    }
    
    pauseEnemy(index) {
        return this.entityManager.pauseEnemy(index);
    }
    
    resumeEnemy(index) {
        return this.entityManager.resumeEnemy(index);
    }
    
    applyCinematicDarkening(speakerName) {
        return this.cinematicManager.applyCinematicDarkening(speakerName);
    }
    
    removeCinematicDarkening() {
        return this.cinematicManager.removeCinematicDarkening();
    }
    
    updateSpeakingExtra(speakerName) {
        return this.cinematicManager.updateSpeakingExtra(speakerName);
    }
    
    // ========================================
    // CLEANUP
    // ========================================

    destroy() {
        // Resume all paused entities before destroying
        if (this.pausedEntities.player) {
            this.entityManager.resumePlayer();
        }
        if (this.pausedEntities.enemies.length > 0) {
            this.entityManager.resumeEnemies();
        }
        
        // Clear all events
        this.clearEvents();
        
        console.log('🎬 EventManager destroyed');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
    console.log('🎬 EventManager registered globally');
} else {
    console.error('🎬 Window object not available!');
}
