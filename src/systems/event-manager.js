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
        
        // Cinematic darkening effect
        this.darkenedSprites = []; // Track sprites we've darkened
        this.speakingExtra = null; // The extra currently speaking
        this.cinematicDarkeningEnabled = false; // Flag to enable/disable cinematic darkening
        
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
        
        console.log('🎬 Events registered:', this.events.map(e => e.id || 'unnamed'));
    }
    
    clearEvents() {
        console.log('🎬 Clearing all events');
        this.events = [];
        this.triggeredEvents.clear();
        this.activeEvent = null;
        this.actionQueue = [];
        this.currentActionIndex = 0;
        this.pausedEntities = {
            player: false,
            enemies: [],
            all: false
        };
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

        // Automatically pause all enemies at the start of events to prevent attacks during camera pans, dialogue, etc.
        // They will be resumed explicitly by resume actions or when the event completes
        this.pauseEnemies();

        // Apply cinematic darkening effect for the entire event
        this.applyCinematicDarkening(null); // Start with no specific speaker (will update when dialogue shows)

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
        
        // Execute action based on type
        switch (action.type) {
            case 'pause':
                this.executePause(action);
                break;
            case 'resume':
                this.executeResume(action);
                break;
            case 'move':
                this.executeMove(action);
                break;
            case 'dialogue':
                this.executeDialogue(action);
                break;
            case 'wait':
                this.executeWait(action);
                break;
            case 'camera':
                this.executeCamera(action);
                break;
            case 'spawnEnemy':
                this.executeSpawnEnemy(action);
                break;
            case 'moveAllEnemies':
                this.executeMoveAllEnemies(action);
                break;
            case 'destroyEnemy':
                this.executeDestroyEnemy(action);
                break;
            case 'flip':
                this.executeFlip(action);
                break;
            case 'setPlayerBounds':
                this.executeSetPlayerBounds(action);
                break;
            case 'startEnemySpawning':
                this.executeStartEnemySpawning(action);
                break;
            case 'stopEnemySpawning':
                this.executeStopEnemySpawning(action);
                break;
            case 'waitForZone':
                this.executeWaitForZone(action);
                break;
            case 'waitForEnemiesCleared':
                this.executeWaitForEnemiesCleared(action);
                break;
            case 'waitForEnemyDestroy':
                this.executeWaitForEnemyDestroy(action);
                break;
            case 'fade':
                this.executeFade(action);
                break;
            case 'loadLevel':
                this.executeLoadLevel(action);
                break;
            case 'clearEnemiesOffscreen':
                this.executeClearEnemiesOffscreen(action);
                break;
            case 'spawnExtra':
                this.executeSpawnExtra(action);
                break;
            case 'destroyExtra':
                this.executeDestroyExtra(action);
                break;
            case 'triggerEvent':
                this.executeTriggerEvent(action);
                break;
            case 'startSubwayMovement':
                this.executeStartSubwayMovement(action);
                break;
            case 'spawnSubwayCarCycle':
                this.executeSpawnSubwayCarCycle(action);
                break;
            case 'spawnBoss':
                this.executeSpawnBoss(action);
                break;
            case 'showBossHealthBar':
                this.executeShowBossHealthBar(action);
                break;
            case 'setBossBehavior':
                this.executeSetBossBehavior(action);
                break;
            case 'waitForBossDefeated':
                this.executeWaitForBossDefeated(action);
                break;
            case 'bossDefeatedDialogue':
                this.executeBossDefeatedDialogue(action);
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

        // Stop darkening monitor
        if (this.darkeningMonitorTimer) {
            console.log(`[CINEMA-DARKEN] Stopping darkening monitor`);
            this.darkeningMonitorTimer.destroy();
            this.darkeningMonitorTimer = null;
        }

        // Remove cinematic darkening effect
        this.removeCinematicDarkening();

        // Validate protection registry on event completion
        if (this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection.validateRegistry();
        }

        this.activeEvent = null;
        this.actionQueue = [];
        this.currentActionIndex = 0;
    }
    
    // ========================================
    // ACTION EXECUTORS
    // ========================================
    
    executePause(action) {
        const targets = action.targets || ['all'];
        console.log(`🎬 Pausing entities: ${targets.join(', ')}`);
        
        this.pauseEntities(targets);
        
        // Advance to next action immediately
        this.advanceAction();
    }
    
    executeResume(action) {
        const targets = action.targets || ['all'];
        console.log(`🎬 Resuming entities: ${targets.join(', ')}`);
        
        this.resumeEntities(targets);
        
        // Advance to next action immediately
        this.advanceAction();
    }
    
    executeMove(action) {
        const target = action.target;
        const destination = action.to;
        const duration = action.duration || 1000; // Default 1 second
        
        if (!target || !destination) {
            console.warn('🎬 Move action missing target or destination');
            this.advanceAction();
            return;
        }
        
        // Get entity to move
        const entity = this.getEntity(target);
        if (!entity) {
            console.warn(`🎬 Could not find entity: ${target}`);
            this.advanceAction();
            return;
        }
        
        // Support relative syntax like '+=3600' or '-=500' for x/y
        const parseRelative = (raw, current) => {
            if (typeof raw === 'string') {
                // Handle camera-relative expressions (e.g., "camera.x+1400")
                if (raw.includes('camera.x')) {
                    const cameraX = this.scene.cameras.main.scrollX;
                    const expr = raw.replace('camera.x', cameraX.toString());
                    try {
                        return eval(expr);
                    } catch (e) {
                        console.warn('🎬 Failed to evaluate camera expression:', raw);
                        return current; // fallback
                    }
                }

                // Handle relative syntax like '+=3600' or '-=500'
                const m = raw.match(/^([+\-]=)(-?\d+(?:\.\d+)?)$/);
                if (m) {
                    const delta = parseFloat(m[2]);
                    return m[1] === '+=' ? current + delta : current - delta;
                }
            }
            return (raw !== undefined && raw !== null) ? raw : current;
        };
        const destX = parseRelative(destination.x, entity.x);
        const destY = parseRelative(destination.y, entity.y);
        
        console.log(`🎬 Moving ${target} to (${destX}, ${destY}) over ${duration}ms`);
        
        // Stop any physics movement and disable physics temporarily for smooth tween movement
        if (entity.body) {
            entity.body.setVelocity(0, 0);
            entity.body.setImmovable(true); // Prevent physics from interfering
        }
        
        // If this is an enemy, ensure it's paused and set velocity to 0
        if (target.startsWith('enemy_')) {
            const restOfString = target.substring(6);
            let enemyIndex = null;
            
            // Check eventEnemyMap first for special IDs
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                enemyIndex = this.scene.eventEnemyMap.get(target);
            } else {
                // Try parsing as index
                const index = parseInt(restOfString);
                if (!isNaN(index)) {
                    enemyIndex = index;
                }
            }
            
            if (enemyIndex !== null && this.scene.enemies && this.scene.enemies[enemyIndex]) {
                const enemy = this.scene.enemies[enemyIndex];
                enemy.eventPaused = true; // Ensure enemy AI is paused
                if (enemy.sprite && enemy.sprite.body) {
                    enemy.sprite.body.setVelocity(0, 0);
                    enemy.sprite.body.setImmovable(true);
                }
            }
        }
        
        // Create tween for smooth movement
        const tween = this.scene.tweens.add({
            targets: entity,
            x: destX,
            y: destY,
            duration: duration,
            ease: action.ease || 'Power2', // Default easing
            onStart: () => {
                console.log(`🎬 Started moving ${target} to (${destX}, ${destY})`);
            },
            onUpdate: () => {
                // Keep velocity at 0 during tween to prevent physics interference
                if (entity.body) {
                    entity.body.setVelocity(0, 0);
                }
            },
            onComplete: () => {
                console.log(`🎬 Move complete for ${target}`);
                // Re-enable physics if it was disabled
                if (entity.body) {
                    entity.body.setImmovable(false);
                }
                
                // If destroyOnComplete is set, destroy the enemy immediately
                if (action.destroyOnComplete && target.startsWith('enemy_')) {
                    console.log(`🎬 Destroying ${target} immediately after movement completes`);
                    // Use a small delay to ensure tween cleanup happens first
                    this.scene.time.delayedCall(10, () => {
                        this.executeDestroyEnemy({ target: target });
                    });
                } else {
                    this.advanceAction();
                }
            }
        });
        
        // Store tween reference in case we need to cancel it
        if (!entity.eventTweens) {
            entity.eventTweens = [];
        }
        entity.eventTweens.push(tween);
    }
    
    executeDialogue(action) {
        const dialogue = action.dialogue;
        
        if (!dialogue) {
            console.warn('🎬 Dialogue action missing dialogue data');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Showing dialogue: "${dialogue.text}"`);
        
        // CRITICAL: Pause all enemies during dialogue to prevent them from attacking the frozen player
        this.pauseEnemies();
        
        // Ensure event-managed enemies stay visible during dialogue
        if (this.scene.enemies && this.scene.eventEnemyMap) {
            this.scene.eventEnemyMap.forEach((enemyIndex, enemyId) => {
                const enemy = this.scene.enemies[enemyIndex];
                if (enemy && enemy.sprite) {
                    enemy.sprite.setVisible(true);
                    enemy.sprite.setActive(true);
                }
            });
        }
        
        // Update speaking extra for cinematic darkening
        this.updateSpeakingExtra(dialogue.speaker);
        
        // Use DialogueManager if available
        if (this.scene.dialogueManager) {
            // Show dialogue with callback to advance to next action
            this.scene.dialogueManager.showDialogue(dialogue, () => {
                // Resume enemies when dialogue completes
                this.resumeEnemies();
                this.advanceAction();
            });
        } else {
            console.warn('🎬 DialogueManager not available');
            // Resume enemies even if dialogue manager isn't available
            this.resumeEnemies();
            this.advanceAction();
        }
    }
    
    executeWait(action) {
        let duration = action.duration || 1000;

        // Support random duration in format: "random(min,max)"
        if (typeof duration === 'string' && duration.startsWith('random(')) {
            const match = duration.match(/random\((\d+),(\d+)\)/);
            if (match) {
                const min = parseInt(match[1]);
                const max = parseInt(match[2]);
                duration = Phaser.Math.Between(min, max);
                console.log(`🎬 Random wait: ${min}-${max}ms, selected: ${duration}ms`);
            }
        }

        console.log(`🎬 Waiting ${duration}ms`);

        // Wait for specified duration, then advance
        this.scene.time.delayedCall(duration, () => {
            this.advanceAction();
        });
    }
    
    executeCamera(action) {
        const camera = this.scene.cameras.main;
        
        if (action.pan) {
            // Pan camera to position
            const duration = action.duration || 1000;
            const currentScrollX = camera.scrollX;
            const currentScrollY = camera.scrollY;
            const targetX = action.pan.x;
            const targetY = action.pan.y !== undefined ? action.pan.y : camera.scrollY;
            console.log(`🎬 [PAN] Starting camera pan from (${currentScrollX.toFixed(0)}, ${currentScrollY.toFixed(0)}) to (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) over ${duration}ms`);
            console.log(`🎬 [PAN] Camera bounds: ${JSON.stringify(camera.getBounds())}`);

            // Stop following before panning
            camera.stopFollow();
            
            const panTween = this.scene.tweens.add({
                targets: camera,
                scrollX: targetX,
                scrollY: targetY,
                duration: duration,
                ease: action.ease || 'Power2',
                onStart: () => {
                    console.log(`🎬 [PAN] ✅ Tween STARTED - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onUpdate: () => {
                    // console.log(`🎬 [PAN] Tween update - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                },
                onComplete: () => {
                    console.log(`🎬 [PAN] ✅ Tween COMPLETED - Camera at (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                    this.advanceAction();
                }
            });

            console.log(`🎬 [PAN] Tween created: ID=${panTween.key}, isPlaying=${panTween.isPlaying()}`);

            // Safety timeout in case tween fails
            this.scene.time.delayedCall(duration + 500, () => {
                console.log(`🎬 [PAN] Safety timeout fired - Tween state: destroyed=${panTween.isDestroyed()}, playing=${panTween.isPlaying()}`);
                if (panTween && !panTween.isDestroyed() && panTween.isPlaying()) {
                    console.warn(`🎬 [PAN] ⚠️ Camera pan tween still running after ${duration + 500}ms, forcing completion`);
                    panTween.stop();
                    camera.scrollX = targetX;
                    camera.scrollY = targetY;
                    console.log(`🎬 [PAN] Forced camera to (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
                    this.advanceAction();
                } else {
                    console.log(`🎬 [PAN] Tween already completed or destroyed, safety timeout skipping`);
                }
            });
        } else if (action.stopFollow) {
            // Stop camera follow
            console.log('🎬 Stopping camera follow');
            camera.stopFollow();
            this.scene.eventCameraLocked = true; // Mark camera as locked
            this.advanceAction();
        } else if (action.setBounds) {
            // Set camera bounds
            const bounds = action.setBounds;
            const oldBounds = camera.getBounds();
            const oldScrollX = camera.scrollX;
            const oldScrollY = camera.scrollY;
            console.log(`🎬 Setting camera bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);
            console.log(`🎬 Camera position before bounds: (${oldScrollX}, ${oldScrollY})`);
            console.log(`🎬 Old camera bounds: ${oldBounds.x}, ${oldBounds.y}, ${oldBounds.width}x${oldBounds.height}`);

            camera.setBounds(
                bounds.x !== undefined ? bounds.x : camera.getBounds().x,
                bounds.y !== undefined ? bounds.y : camera.getBounds().y,
                bounds.width !== undefined ? bounds.width : camera.getBounds().width,
                bounds.height !== undefined ? bounds.height : camera.getBounds().height
            );

            const newBounds = camera.getBounds();
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;
            console.log(`🎬 New camera bounds: ${newBounds.x}, ${newBounds.y}, ${newBounds.width}x${newBounds.height}`);
            console.log(`🎬 Camera position after bounds: (${newScrollX}, ${newScrollY})`);

            // Check if camera was clamped
            if (oldScrollX !== newScrollX || oldScrollY !== newScrollY) {
                console.log(`🎬 Camera was clamped from (${oldScrollX}, ${oldScrollY}) to (${newScrollX}, ${newScrollY})`);
            }

            this.advanceAction();
        } else if (action.follow) {
            // Set camera follow target
            const target = action.follow === 'player' ? this.scene.player : this.getEntity(action.follow);
            if (target) {
                console.log(`🎬 Camera following: ${action.follow}`);
                camera.startFollow(target, action.followOffset !== undefined, 
                    action.followX || 0.1, action.followY || 0.1);
                this.scene.eventCameraLocked = false; // Clear camera lock when re-enabling follow
                this.advanceAction();
            } else {
                console.warn(`🎬 Could not find camera follow target: ${action.follow}`);
                this.advanceAction();
            }
        } else if (action.zoom) {
            // Zoom camera
            const duration = action.duration || 1000;
            console.log(`🎬 Zooming camera to ${action.zoom}`);
            
            this.scene.tweens.add({
                targets: camera,
                zoom: action.zoom,
                duration: duration,
                ease: action.ease || 'Power2',
                onComplete: () => {
                    this.advanceAction();
                }
            });
        } else {
            console.warn('🎬 Camera action missing pan/follow/zoom/stopFollow/setBounds');
            this.advanceAction();
        }
    }
    
    executeSpawnEnemy(action) {
        const enemyType = action.enemyType;
        const position = action.position;
        
        if (!enemyType || !position) {
            console.warn('🎬 SpawnEnemy action missing enemyType or position');
            this.advanceAction();
            return;
        }
        
        // Find enemy config
        let enemyConfig = null;
        if (typeof ALL_ENEMY_TYPES !== 'undefined' && ALL_ENEMY_TYPES) {
            enemyConfig = ALL_ENEMY_TYPES.find(config => config.name === enemyType);
        }
        
        if (!enemyConfig) {
            console.warn(`🎬 Could not find enemy config for type: ${enemyType}`);
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Spawning enemy: ${enemyType} at (${position.x}, ${position.y})`);
        
        // Create enemy instance
        if (typeof Enemy === 'undefined') {
            console.error('🎬 Enemy class not defined! Make sure enemy-system.js loads before event-manager.js');
            this.advanceAction();
            return;
        }
        
        const enemy = new Enemy(this.scene, position.x, position.y, enemyConfig);
        enemy.setPlayer(this.scene.player);
        
        // Disable AI for spawned enemy (they'll be controlled by events)
        enemy.eventPaused = true;
        
        // Store the event ID on the enemy for easier identification
        if (action.id) {
            enemy.eventId = action.id;
        }
        
        // Ensure sprite is visible and has proper depth for event sequences
        if (enemy.sprite) {
            enemy.sprite.setVisible(true);
            enemy.sprite.setActive(true);
            // Use Y-position based depth for proper layering (same as regular enemies)
            enemy.sprite.setDepth(enemy.sprite.y);
        }
        
        // Set initial flip state IMMEDIATELY if specified in action (before anything else can override it)
        if (action.flipX !== undefined && enemy.sprite) {
            enemy.sprite.setFlipX(action.flipX);
            // Also update the enemy's facingLeft property to match
            enemy.facingLeft = action.flipX;
            console.log(`🎬 Set initial flipX=${action.flipX} for spawned enemy ${action.id || enemyType} (immediate)`);
        }
        
        // Add to enemies array
        if (!this.scene.enemies) {
            this.scene.enemies = [];
        }
        const enemyIndex = this.scene.enemies.length;
        this.scene.enemies.push(enemy);
        
        // Store special reference for targeting (e.g., "enemy_critic")
        // IMPORTANT: Store this BEFORE setting flipX to ensure exclusion checks work
        if (action.id) {
            // Store mapping: "enemy_critic" -> enemyIndex
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            this.scene.eventEnemyMap.set(action.id, enemyIndex);
            console.log(`🎬 Stored enemy reference: ${action.id} -> index ${enemyIndex}`);
            
            // Register enemy for protection in centralized system
            const protectionLevel = action.protectionLevel || PROTECTION_LEVELS.EVENT_CONTROLLED;
            const metadata = {
                eventName: this.activeEvent?.id || 'unknown',
                spawnedAt: this.scene.time.now,
                enemyType: enemyType,
                position: { x: position.x, y: position.y }
            };
            
            if (this.scene.eventEnemyProtection) {
                this.scene.eventEnemyProtection.registerEnemy(action.id, enemy, protectionLevel, metadata);
            }
        }
        
        // Ensure flipX persists (set again after a tiny delay to override any AI behavior)
        if (action.flipX !== undefined) {
            this.scene.time.delayedCall(1, () => {
                if (enemy.sprite && enemy.sprite.active) {
                    enemy.sprite.setFlipX(action.flipX);
                    enemy.facingLeft = action.flipX;
                }
            });
        }
        
        // Advance to next action
        this.advanceAction();
    }
    
    executeMoveAllEnemies(action) {
        const direction = action.direction || 'left'; // 'left' or 'right'
        const speed = action.speed || 300; // pixels per second
        const duration = action.duration || 2000; // milliseconds
        
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies to move');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Moving all ${this.scene.enemies.length} enemies ${direction} at speed ${speed}px/s`);
        
        const moveDistance = (speed * duration) / 1000; // Calculate distance based on speed and duration
        const directionMultiplier = direction === 'left' ? -1 : 1;
        
        let completedMovements = 0;
        const totalEnemies = this.scene.enemies.length;
        
        // Move each enemy
        this.scene.enemies.forEach((enemy, index) => {
            if (!enemy.sprite || (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD)) {
                completedMovements++;
                if (completedMovements >= totalEnemies) {
                    this.advanceAction();
                }
                return;
            }
            
            const targetX = enemy.sprite.x + (moveDistance * directionMultiplier);
            
            // Create tween for smooth movement
            const tween = this.scene.tweens.add({
                targets: enemy.sprite,
                x: targetX,
                duration: duration,
                ease: action.ease || 'Power2',
                onComplete: () => {
                    completedMovements++;
                    
                    // If all enemies have moved, advance to next action
                    if (completedMovements >= totalEnemies) {
                        console.log('🎬 All enemies moved');
                        this.advanceAction();
                    }
                }
            });
            
            // Store tween reference
            if (!enemy.sprite.eventTweens) {
                enemy.sprite.eventTweens = [];
            }
            enemy.sprite.eventTweens.push(tween);
        });
        
        // If no valid enemies, advance immediately
        if (completedMovements >= totalEnemies) {
            this.advanceAction();
        }
    }
    
    executeDestroyEnemy(action) {
        const target = action.target;
        
        if (!target) {
            console.warn('🎬 DestroyEnemy action missing target');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Destroying enemy: ${target}`);
        
        // Get enemy entity
        let enemy = null;
        let enemyIndex = -1;
        
        if (target.startsWith('enemy_')) {
            // Check if it's a special ID (e.g., "enemy_critic")
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                enemyIndex = this.scene.eventEnemyMap.get(target);
                if (this.scene.enemies && this.scene.enemies[enemyIndex]) {
                    enemy = this.scene.enemies[enemyIndex];
                }
            } else {
                // Try parsing as index
                const index = parseInt(target.substring(6));
                if (!isNaN(index) && this.scene.enemies && this.scene.enemies[index]) {
                    enemyIndex = index;
                    enemy = this.scene.enemies[index];
                }
            }
        }
        
        if (!enemy || !enemy.sprite) {
            console.warn(`🎬 Could not find enemy to destroy: ${target}`);
            this.advanceAction();
            return;
        }
        
        // Destroy the enemy sprite properly
        // First, stop any tweens
        if (enemy.sprite && enemy.sprite.eventTweens) {
            enemy.sprite.eventTweens.forEach(tween => {
                if (tween && tween.stop) {
                    tween.stop();
                }
            });
            enemy.sprite.eventTweens = [];
        }
        
        // Set sprite to inactive first
        if (enemy.sprite) {
            enemy.sprite.setActive(false);
            enemy.sprite.setVisible(false);
        }
        
        // Call the Enemy's destroy method which properly cleans up
        if (enemy.destroy && typeof enemy.destroy === 'function') {
            enemy.destroy();
        } else if (enemy.sprite) {
            // Fallback: destroy sprite directly
            enemy.sprite.destroy();
        }
        
        // Mark enemy as destroyed
        enemy.destroyed = true;
        
        // Unregister from protection system
        if (this.scene.eventEnemyProtection) {
            this.scene.eventEnemyProtection.unregisterEnemy(target);
        }
        
        // Remove from enemies array
        if (enemyIndex >= 0 && this.scene.enemies) {
            this.scene.enemies.splice(enemyIndex, 1);
            // Update eventEnemyMap indices if needed
            if (this.scene.eventEnemyMap) {
                for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                    if (value > enemyIndex) {
                        this.scene.eventEnemyMap.set(key, value - 1);
                    }
                }
                this.scene.eventEnemyMap.delete(target);
            }
        }
        
        console.log(`🎬 Enemy destroyed: ${target} (removed from array)`);
        
        // Wait a frame to ensure sprite is fully destroyed before advancing
        this.scene.time.delayedCall(50, () => {
            // Verify enemy is actually gone
            const stillExists = this.scene.enemies && this.scene.enemies.includes(enemy);
            if (stillExists) {
                console.warn(`🎬 Warning: Enemy ${target} still in array after destruction attempt`);
            }
            this.advanceAction();
        });
    }
    
    executeWaitForEnemyDestroy(action) {
        const target = action.target;
        
        if (!target) {
            console.warn('🎬 WaitForEnemyDestroy action missing target');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Waiting for enemy ${target} to be destroyed...`);
        
        // Check if enemy exists
        let enemy = null;
        let enemyIndex = -1;
        
        if (target.startsWith('enemy_')) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                enemyIndex = this.scene.eventEnemyMap.get(target);
                if (this.scene.enemies && this.scene.enemies[enemyIndex]) {
                    enemy = this.scene.enemies[enemyIndex];
                }
            }
        }
        
        // If enemy doesn't exist, it's already destroyed
        if (!enemy || !enemy.sprite || !enemy.sprite.active) {
            console.log(`🎬 Enemy ${target} already destroyed`);
            this.advanceAction();
            return;
        }
        
        // Poll for enemy destruction
        const checkInterval = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                // Re-check if enemy still exists
                let stillExists = false;
                if (this.scene.enemies && enemyIndex >= 0 && this.scene.enemies[enemyIndex] === enemy) {
                    stillExists = enemy.sprite && enemy.sprite.active;
                } else {
                    // Enemy not in array anymore - it's destroyed
                    stillExists = false;
                }
                
                if (!stillExists) {
                    console.log(`🎬 Enemy ${target} confirmed destroyed`);
                    checkInterval.destroy();
                    this.advanceAction();
                }
            },
            repeat: -1 // Repeat indefinitely until enemy is destroyed
        });
        
        // Safety timeout - if enemy isn't destroyed in 5 seconds, advance anyway
        this.scene.time.delayedCall(5000, () => {
            if (checkInterval && checkInterval.active) {
                console.warn(`🎬 Timeout waiting for enemy ${target} destruction`);
                checkInterval.destroy();
                this.advanceAction();
            }
        });
    }
    
    executeFlip(action) {
        const target = action.target;
        const flipX = action.flipX !== undefined ? action.flipX : true;
        const flipY = action.flipY !== undefined ? action.flipY : false;
        
        if (!target) {
            console.warn('🎬 Flip action missing target');
            this.advanceAction();
            return;
        }
        
        // Get entity to flip
        const entity = this.getEntity(target);
        if (!entity) {
            console.warn(`🎬 Could not find entity to flip: ${target}`);
            this.advanceAction();
            return;
        }
        
        // getEntity returns the sprite directly for enemies, or the sprite for players
        // So entity should already be the sprite
        const sprite = entity;
        
        if (!sprite || typeof sprite.setFlipX !== 'function') {
            console.warn(`🎬 Entity ${target} does not support flipping`);
            this.advanceAction();
            return;
        }
        
        // Skip flip if already in desired state (optimization)
        if (flipX !== undefined && sprite.flipX === flipX) {
            console.log(`🎬 Skipping flip for ${target} - already flipped to ${flipX}`);
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Flipping ${target}: flipX=${flipX}, flipY=${flipY}`);
        
        sprite.setFlipX(flipX);
        if (flipY !== undefined) {
            sprite.setFlipY(flipY);
        }
        
        // Also update facingLeft for enemies if applicable
        if (target.startsWith('enemy_') && this.scene.enemies) {
            const enemyIndex = this.scene.eventEnemyMap?.get(target);
            if (enemyIndex !== undefined && this.scene.enemies[enemyIndex]) {
                this.scene.enemies[enemyIndex].facingLeft = flipX;
            }
        }
        
        this.advanceAction();
    }
    
    executeSetPlayerBounds(action) {
        const bounds = action.bounds;
        if (!bounds || !this.scene.player) {
            console.warn('🎬 SetPlayerBounds action missing bounds or player');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Setting player bounds: ${JSON.stringify(bounds)}`);
        
        // Store bounds on scene for checking in update loop
        if (!this.scene.eventPlayerBounds) {
            this.scene.eventPlayerBounds = {};
        }
        
        this.scene.eventPlayerBounds.minX = bounds.minX !== undefined ? bounds.minX : null;
        this.scene.eventPlayerBounds.maxX = bounds.maxX !== undefined ? bounds.maxX : null;
        this.scene.eventPlayerBounds.minY = bounds.minY !== undefined ? bounds.minY : null;
        this.scene.eventPlayerBounds.maxY = bounds.maxY !== undefined ? bounds.maxY : null;
        
        // Also update physics world bounds if needed
        if (bounds.minX !== undefined || bounds.maxX !== undefined) {
            const currentBounds = this.scene.physics.world.bounds;
            const newMinX = bounds.minX !== undefined ? bounds.minX : currentBounds.x;
            const newMaxX = bounds.maxX !== undefined ? bounds.maxX : currentBounds.x + currentBounds.width;
            
            this.scene.physics.world.setBounds(
                newMinX,
                currentBounds.y,
                newMaxX - newMinX,
                currentBounds.height
            );
        }
        
        this.advanceAction();
    }
    
    executeStartEnemySpawning(action) {
        const config = action.config || {};
        console.log(`🎬 Starting enemy spawning: ${JSON.stringify(config)}`);
        
        // Enable enemy spawning
        this.scene.maxEnemies = config.maxEnemies !== undefined ? config.maxEnemies : 4;
        this.scene.enemySpawnInterval = config.spawnInterval !== undefined ? config.spawnInterval : 1200;
        this.scene.enemySpawnTimer = 0; // Reset timer
        
        // Store original spawn settings if needed
        if (!this.scene.eventEnemySpawningConfig) {
            this.scene.eventEnemySpawningConfig = {};
        }
        this.scene.eventEnemySpawningConfig.enabled = true;
        this.scene.eventEnemySpawningConfig.maxEnemies = this.scene.maxEnemies;
        this.scene.eventEnemySpawningConfig.spawnInterval = this.scene.enemySpawnInterval;
        
        this.advanceAction();
    }
    
    executeStopEnemySpawning(action) {
        console.log('🎬 Stopping enemy spawning');
        
        // Disable enemy spawning (but don't clear existing enemies)
        this.scene.maxEnemies = 0;
        this.scene.enemySpawnInterval = 999999;
        
        if (this.scene.eventEnemySpawningConfig) {
            this.scene.eventEnemySpawningConfig.enabled = false;
        }
        
        // Only clear enemies if explicitly requested
        if (action.clearEnemies) {
            if (this.scene.enemies && this.scene.enemies.length > 0) {
                this.scene.enemies.forEach(enemy => {
                    if (enemy.sprite) {
                        enemy.sprite.destroy();
                    }
                });
                this.scene.enemies = [];
            }
        }
        
        this.advanceAction();
    }
    
    executeWaitForEnemiesCleared(action) {
        console.log('🎬 Waiting for all enemies to be cleared...');
        
        // Check if enemies are already cleared
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies present, advancing immediately');
            this.advanceAction();
            return;
        }
        
        // Store interval reference on scene for cleanup if needed
        const checkInterval = this.scene.time.addEvent({
            delay: 100, // Check every 100ms
            callback: () => {
                // Filter out dead/destroyed enemies
                const activeEnemies = this.scene.enemies.filter(enemy => {
                    if (!enemy || !enemy.sprite) return false;
                    if (typeof ENEMY_STATES !== 'undefined' && enemy.state === ENEMY_STATES.DEAD) return false;
                    return enemy.sprite.active;
                });
                
                // Update enemies array to remove dead ones
                if (activeEnemies.length !== this.scene.enemies.length) {
                    this.scene.enemies = activeEnemies;
                }
                
                // If no active enemies remain, advance
                if (activeEnemies.length === 0) {
                    console.log('🎬 All enemies cleared!');
                    checkInterval.destroy();
                    if (this.scene.eventEnemiesClearedCheck) {
                        delete this.scene.eventEnemiesClearedCheck;
                    }
                    this.advanceAction();
                }
            },
            repeat: -1 // Repeat indefinitely until enemies are cleared
        });
        
        // Store reference for cleanup
        this.scene.eventEnemiesClearedCheck = checkInterval;
        
        // Safety timeout - if enemies aren't cleared in 60 seconds, advance anyway
        this.scene.time.delayedCall(60000, () => {
            if (checkInterval && checkInterval.active) {
                console.warn('🎬 Timeout waiting for enemies to clear (60s), advancing anyway');
                checkInterval.destroy();
                if (this.scene.eventEnemiesClearedCheck) {
                    delete this.scene.eventEnemiesClearedCheck;
                }
                this.advanceAction();
            }
        });
    }
    
    executeWaitForZone(action) {
        const zone = action.zone;
        if (!zone || !zone.x1 || !zone.x2 || !zone.y1 || !zone.y2) {
            console.warn('🎬 WaitForZone action missing zone coordinates');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Waiting for player to enter zone: (${zone.x1}, ${zone.y1}) to (${zone.x2}, ${zone.y2})`);
        
        // Store zone check in scene for update loop
        this.scene.eventWaitingForZone = {
            x1: Math.min(zone.x1, zone.x2),
            x2: Math.max(zone.x1, zone.x2),
            y1: Math.min(zone.y1, zone.y2),
            y2: Math.max(zone.y1, zone.y2),
            actionIndex: this.currentActionIndex
        };
        
        // Don't advance - wait for zone check in update loop
    }
    
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
    
    executeFade(action) {
        const direction = action.direction || 'out'; // 'in' or 'out'
        const duration = action.duration || 1000;
        const color = action.color || { r: 0, g: 0, b: 0 }; // Default black
        
        console.log(`🎬 Fading ${direction} over ${duration}ms`);
        
        const camera = this.scene.cameras.main;
        
        if (direction === 'out') {
            // Fade out
            camera.fadeOut(duration, color.r, color.g, color.b);
            
            // Wait for fade to complete
            camera.once('camerafadeoutcomplete', () => {
                console.log('🎬 Fade out complete');
                this.advanceAction();
            });
        } else if (direction === 'in') {
            // Fade in
            camera.fadeIn(duration, color.r, color.g, color.b);
            
            // Wait for fade to complete
            camera.once('camerafadeincomplete', () => {
                console.log('🎬 Fade in complete');
                this.advanceAction();
            });
        } else {
            console.warn(`🎬 Unknown fade direction: ${direction}`);
            this.advanceAction();
        }
    }
    
    executeLoadLevel(action) {
        const levelId = action.levelId;
        if (!levelId) {
            console.warn('🎬 LoadLevel action missing levelId');
            this.advanceAction();
            return;
        }
        
        console.log(`🎬 Loading level: ${levelId}`);
        
        // Transition to next level
        // Use scene restart with new level ID
        this.scene.scene.restart({
            character: this.scene.selectedCharacter || 'tireek',
            levelId: levelId
        });
        
        // Note: advanceAction won't be called since scene is restarting
    }
    
    executeClearEnemiesOffscreen(action) {
        const xThreshold = action.xThreshold;
        const direction = action.direction || 'right';
        
        if (xThreshold === undefined) {
            console.warn('🎬 ClearEnemiesOffscreen action missing xThreshold');
            this.advanceAction();
            return;
        }
        
        if (!this.scene.enemies || this.scene.enemies.length === 0) {
            console.log('🎬 No enemies to clear');
            this.advanceAction();
            return;
        }
        
        let clearedCount = 0;
        const enemiesToRemove = [];
        const excludeIds = Array.isArray(action.excludeIds) ? action.excludeIds : [];
        
        console.log(`🎬 ClearEnemiesOffscreen: threshold=${xThreshold}, direction=${direction}, excludeIds=${JSON.stringify(excludeIds)}`);
        console.log(`🎬 Current eventEnemyMap:`, this.scene.eventEnemyMap);
        console.log(`🎬 Current enemies count: ${this.scene.enemies.length}`);
        
        // Build a fast lookup of indices that should be excluded based on special IDs
        const excludedIndices = new Set();
        if (this.scene.eventEnemyMap && excludeIds.length > 0) {
            for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                if (excludeIds.includes(id)) {
                    excludedIndices.add(mapIndex);
                    console.log(`🎬 Adding index ${mapIndex} to exclusions for ID ${id}`);
                }
            }
        }
        
        console.log(`🎬 Excluded indices:`, excludedIndices);
        
        // Filter enemies based on position
        this.scene.enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.sprite) return;
            
            const enemyX = enemy.sprite.x;
            let shouldRemove = false;
            
            if (direction === 'right') {
                shouldRemove = enemyX > xThreshold;
            } else if (direction === 'left') {
                shouldRemove = enemyX < xThreshold;
            }
            
            console.log(`🎬 Enemy at index ${index}: x=${enemyX}, shouldRemove=${shouldRemove} (${direction} of ${xThreshold}), eventId=${enemy.eventId || 'none'}`);
            
            if (!shouldRemove) return;
            
            // Respect exclusions (by special ID or explicit enemy_<index>)
            // FIRST: Check if this enemy has an eventId that should be excluded
            if (enemy.eventId && excludeIds.includes(enemy.eventId)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (eventId: ${enemy.eventId})`);
                return;
            }
            
            // SECOND: Check if this enemy is in the excludedIndices set (based on eventEnemyMap)
            if (excludedIndices.has(index)) {
                console.log(`🎬 ✅ Excluding enemy at index ${index} from cleanup (in excludedIndices)`);
                return;
            }
            
            // THIRD: Also check if this enemy's ID is in the excludeIds list by searching eventEnemyMap
            if (this.scene.eventEnemyMap) {
                for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                    if (mapIndex === index && excludeIds.includes(id)) {
                        console.log(`🎬 ✅ Excluding enemy ${id} at index ${index} from cleanup (eventEnemyMap match)`);
                        return;
                    }
                }
            }
            
            // FOURTH: Check explicit enemy_<index> format
            if (excludeIds.includes(`enemy_${index}`)) {
                console.log(`🎬 ✅ Excluding enemy_${index} from cleanup (explicit index)`);
                return;
            }
            
            console.log(`🎬 ❌ Marking enemy at index ${index} for removal (x=${enemyX})`);
            enemiesToRemove.push(index);
        });
        
        // Remove enemies in reverse order to maintain indices
        for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
            const index = enemiesToRemove[i];
            const enemy = this.scene.enemies[index];
            
            console.log(`🎬 Removing enemy at index ${index}, eventId=${enemy?.eventId || 'none'}`);
            
            if (enemy) {
                // Stop any active tweens
                if (enemy.sprite && enemy.sprite.eventTweens) {
                    enemy.sprite.eventTweens.forEach(tween => {
                        if (tween && tween.stop) {
                            tween.stop();
                        }
                    });
                    enemy.sprite.eventTweens = [];
                }
                
                // Properly destroy enemy (cleanup physics, timers, etc.)
                if (enemy.sprite) {
                    enemy.sprite.setActive(false);
                    enemy.sprite.setVisible(false);
                }
                if (enemy.destroy && typeof enemy.destroy === 'function') {
                    enemy.destroy();
                } else if (enemy.sprite) {
                    enemy.sprite.destroy();
                }
                enemy.destroyed = true;
                clearedCount++;
            }
            
            // Remove from array
            this.scene.enemies.splice(index, 1);
            
            // Update and prune eventEnemyMap
            if (this.scene.eventEnemyMap) {
                console.log(`🎬 EventEnemyMap before cleanup:`, this.scene.eventEnemyMap);
                for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                    if (value === index) {
                        console.log(`🎬 Removing eventEnemyMap entry: ${key} -> ${value}`);
                        this.scene.eventEnemyMap.delete(key);
                    } else if (value > index) {
                        const newIndex = value - 1;
                        console.log(`🎬 Updating eventEnemyMap entry: ${key} ${value} -> ${newIndex}`);
                        this.scene.eventEnemyMap.set(key, newIndex);
                    }
                }
                console.log(`🎬 EventEnemyMap after cleanup:`, this.scene.eventEnemyMap);
            }
        }
        
        console.log(`🎬 Cleared ${clearedCount} enemies ${direction} of x=${xThreshold}`);
        this.advanceAction();
    }
    
    // ========================================
    // ENTITY MANAGEMENT
    // ========================================
    
    getEntity(target) {
        if (target === 'player') {
            return this.scene.player;
        } else if (target.startsWith('enemy_')) {
            // Check if it's a special ID (e.g., "enemy_critic")
            const restOfString = target.substring(6); // Remove "enemy_" prefix
            
            // FIRST: Try protection system lookup (most reliable)
            if (this.scene.eventEnemyProtection) {
                const protectionInfo = this.scene.eventEnemyProtection.getProtectionById(target);
                if (protectionInfo && protectionInfo.enemy && protectionInfo.enemy.sprite && 
                    protectionInfo.enemy.sprite.active && !protectionInfo.enemy.destroyed) {
                    return protectionInfo.enemy.sprite;
                }
            }
            
            // FALLBACK: Check eventEnemyMap for special IDs
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                const index = this.scene.eventEnemyMap.get(target);
                // Validate index and enemy existence
                if (this.scene.enemies && 
                    index >= 0 && 
                    index < this.scene.enemies.length && 
                    this.scene.enemies[index] && 
                    this.scene.enemies[index].sprite && 
                    this.scene.enemies[index].sprite.active &&
                    !this.scene.enemies[index].destroyed) {
                    return this.scene.enemies[index].sprite;
                } else {
                    // Enemy was removed but map entry still exists - clean it up
                    console.warn(`🎬 Enemy ${target} at index ${index} no longer exists, cleaning up map entry`);
                    this.scene.eventEnemyMap.delete(target);
                }
            }
            
            // Otherwise, try parsing as index (e.g., "enemy_0")
            const index = parseInt(restOfString);
            if (!isNaN(index) && 
                this.scene.enemies && 
                index >= 0 && 
                index < this.scene.enemies.length && 
                this.scene.enemies[index] && 
                this.scene.enemies[index].sprite &&
                this.scene.enemies[index].sprite.active &&
                !this.scene.enemies[index].destroyed) {
                return this.scene.enemies[index].sprite;
            }
        } else if (target.startsWith('extra_')) {
            // Resolve extras by special id map first
            if (this.scene.extrasManager && this.scene.extrasManager.eventExtraMap && this.scene.extrasManager.eventExtraMap.has(target)) {
                const index = this.scene.extrasManager.eventExtraMap.get(target);
                if (this.scene.extrasManager.extras[index]) {
                    return this.scene.extrasManager.extras[index].sprite;
                }
            }
            // or by numeric index suffix
            const rest = target.substring(6);
            const idx = parseInt(rest);
            if (!isNaN(idx) && this.scene.extrasManager && this.scene.extrasManager.extras[idx]) {
                return this.scene.extrasManager.extras[idx].sprite;
            }
        } else if (target.startsWith('character_')) {
            // Support for specific character (e.g., "character_tireek")
            const charName = target.split('_')[1];
            if (this.scene.characters && this.scene.characters[charName] && this.scene.characters[charName].sprite) {
                return this.scene.characters[charName].sprite;
            }
        }
        
        return null;
    }

    executeSpawnExtra(action) {
        const name = action.name;
        if (!name) {
            console.warn('🎬 SpawnExtra missing name');
            this.advanceAction();
            return;
        }
        if (!this.scene.extrasManager) {
            console.warn('🎬 ExtrasManager not available');
            this.advanceAction();
            return;
        }
        // Determine position
        let x = action.position?.x;
        let y = action.position?.y;

        // Handle camera-relative positioning (e.g., "camera.x-200")
        if (typeof x === 'string' && x.includes('camera.x')) {
            const cameraX = this.scene.cameras.main.scrollX;
            // Evaluate simple expressions like "camera.x-200"
            const expr = x.replace('camera.x', cameraX.toString());
            try {
                x = eval(expr);
            } catch (e) {
                console.warn('🎬 Failed to evaluate camera expression:', x);
                x = cameraX - 200; // fallback
            }
        }

        if (action.relativeTo === 'player' && this.scene.player) {
            const ox = action.offset?.x || 0;
            const oy = action.offset?.y || 0;
            x = this.scene.player.x + ox;
            y = this.scene.player.y + oy;
        }
        if (x === undefined || y === undefined) {
            // Fallback near player if available
            if (this.scene.player) {
                x = this.scene.player.x + 60;
                y = this.scene.player.y;
            } else {
                x = 200; y = 500;
            }
        }
        const opts = {
            id: action.id,
            scale: action.scale,
            matchPlayer: action.matchPlayer,
            matchPlayerScale: action.matchPlayerScale,
            multiplier: action.multiplier,
            depth: action.depth,
            bottomY: action.bottomY
        };
        console.log('🎬 executeSpawnExtra:', { name, x, y, opts });
        const extra = this.scene.extrasManager.spawnExtra(name, x, y, opts);
        
        // If event is active and cinematic darkening is applied, re-apply darkening to handle new extra
        // Use a small delay to ensure the extra is fully initialized
        // All extras will stay bright automatically
        if (this.activeEvent && this.darkenedSprites.length > 0) {
            this.scene.time.delayedCall(10, () => {
                // Re-apply darkening - all extras will stay bright
                this.applyCinematicDarkening(null);
            });
        }
        if (!extra) {
            console.warn('🎬 Failed to spawn extra');
        }
        this.advanceAction();
    }

    executeDestroyExtra(action) {
        const target = action.target;
        if (!this.scene.extrasManager) {
            console.warn('🎬 ExtrasManager not available');
            this.advanceAction();
            return;
        }
        if (!target) {
            console.warn('🎬 DestroyExtra missing target');
            this.advanceAction();
            return;
        }
        this.scene.extrasManager.destroyExtraById(target);
        this.advanceAction();
    }

    executeTriggerEvent(action) {
        const eventId = action.eventId;
        if (!eventId) {
            console.warn('🎬 TriggerEvent missing eventId');
            this.advanceAction();
            return;
        }

        console.log(`🎬 Triggering event: ${eventId}`);

        // Find the event in the current level config
        const levelConfig = this.scene.levelManager ? this.scene.levelManager.getCurrentLevelConfig() : null;
        if (!levelConfig || !levelConfig.events) {
            console.warn('🎬 No level config or events found');
            this.advanceAction();
            return;
        }

        const event = levelConfig.events.find(e => e.id === eventId);
        if (!event) {
            console.warn(`🎬 Event ${eventId} not found`);
            this.advanceAction();
            return;
        }

        // Start the event (same as startEvent method)
        event.triggered = true;
        this.triggeredEvents.add(event.id);
        this.activeEvent = event;
        this.actionQueue = [...event.actions]; // Copy actions array
        this.currentActionIndex = 0;

        // Execute first action
        this.executeNextAction();

        // Don't advance to next action since we're starting a new event
    }

    executeStartSubwayMovement(action) {
        const target = action.target;
        const speed = action.speed || 500; // pixels per second

        if (!target) {
            console.warn('🎬 StartSubwayMovement missing target');
            this.advanceAction();
            return;
        }

        // Get the subway car sprite
        const entity = this.getEntity(target);
        if (!entity) {
            console.warn(`🎬 Could not find subway car: ${target}`);
            this.advanceAction();
            return;
        }

        console.log(`🎬 Starting smart subway movement for ${target} at speed ${speed}px/s`);

        // Set constant velocity for smooth movement
        entity.setVelocityX(speed);

        // Store reference for cleanup
        entity.subwayMovementActive = true;
        entity.subwaySpeed = speed;

        // Set up continuous monitoring to destroy when off-screen
        const checkOffScreen = () => {
            if (!entity || !entity.active || !entity.subwayMovementActive) {
                return; // Already destroyed or movement stopped
            }

            const camera = this.scene.cameras.main;
            const cameraRight = camera.scrollX + camera.width;

            // Destroy if subway car has moved well past the right edge of camera
            if (entity.x > cameraRight + 400) {
                console.log(`🎬 Subway car ${target} went off-screen, destroying`);
                entity.subwayMovementActive = false;
                entity.setVelocityX(0);
                this.scene.extrasManager.destroyExtraById(target);
                return;
            }

            // Continue checking
            this.scene.time.delayedCall(100, checkOffScreen);
        };

        // Start the monitoring loop
        this.scene.time.delayedCall(100, checkOffScreen);

        // Advance to next action immediately (movement continues in background)
        this.advanceAction();
    }

    executeSpawnSubwayCarCycle(action) {
        console.log('🎬 Starting subway car spawning cycle');

        const spawnNextCar = () => {
            // Generate unique ID for this subway car instance
            const carId = `extra_subway_car_${Date.now()}`;

            // Spawn the subway car
            const extra = this.scene.extrasManager.spawnExtra('subwaycar', this.scene.cameras.main.scrollX - 400, 300, {
                id: carId,
                bottomY: 410,
                depth: -100
            });

            if (extra) {
                console.log(`🎬 Spawned subway car: ${carId}`);

                // Start movement
                this.executeStartSubwayMovement({
                    target: carId,
                    speed: 1000 // Match the speed from the config
                });
            } else {
                console.warn('🎬 Failed to spawn subway car');
            }

            // Schedule next spawn with random delay (3-6 seconds as set by user)
            const delay = Phaser.Math.Between(4000, 8000);
            console.log(`🎬 Next subway car in ${delay}ms`);
            this.scene.time.delayedCall(delay, spawnNextCar);
        };

        // Start the cycle
        spawnNextCar();

        // Advance to next action immediately (cycle continues in background)
        this.advanceAction();
    }

    pauseEntities(targets) {
        targets.forEach(target => {
            if (target === 'player') {
                this.pausePlayer();
            } else if (target === 'enemies') {
                this.pauseEnemies();
            } else if (target === 'all') {
                this.pausePlayer();
                this.pauseEnemies();
            } else if (target.startsWith('enemy_')) {
                const index = parseInt(target.split('_')[1]);
                this.pauseEnemy(index);
            }
        });
    }
    
    resumeEntities(targets) {
        targets.forEach(target => {
            if (target === 'player') {
                this.resumePlayer();
            } else if (target === 'enemies') {
                this.resumeEnemies();
            } else if (target === 'all') {
                this.resumePlayer();
                this.resumeEnemies();
            } else if (target.startsWith('enemy_')) {
                const index = parseInt(target.split('_')[1]);
                this.resumeEnemy(index);
            }
        });
    }
    
    pausePlayer() {
        if (this.pausedEntities.player) return; // Already paused
        
        console.log('🎬 Pausing player');
        this.pausedEntities.player = true;
        
        // Save current state
        if (this.scene.player && this.scene.player.body) {
            this.savedEntityStates.set('player', {
                velocityX: this.scene.player.body.velocity.x,
                velocityY: this.scene.player.body.velocity.y,
                gravityY: (this.scene.player.body.gravity && this.scene.player.body.gravity.y !== undefined) ? this.scene.player.body.gravity.y : 0,
                isJumping: this.scene.isJumping || false,
                animationState: this.scene.animationManager?.currentState || 'idle',
                animationLocked: this.scene.animationManager?.animationLocked || false,
                lockTimer: this.scene.animationManager?.lockTimer || 0
            });
            
            // Freeze physics
            this.scene.player.body.setVelocity(0, 0);
            this.scene.player.body.setGravityY(0);
            
            // Stop running sound effect immediately
            if (this.scene.audioManager) {
                this.scene.audioManager.stopPlayerRunning();
            }
            
            // Reset animation state to idle and stop running animation
            const charName = this.scene.currentCharacterConfig?.name || 'tireek';
            if (this.scene.animationManager) {
                // Clear any animation locks
                if (this.scene.animationManager.currentState === 'airkick' || 
                    this.scene.animationManager.currentState === 'run') {
                    console.log(`🎬 Clearing ${this.scene.animationManager.currentState} animation state on pause`);
                    this.scene.animationManager.currentState = 'idle';
                    this.scene.animationManager.animationLocked = false;
                    this.scene.animationManager.lockTimer = 0;
                    // Play idle animation
                    this.scene.player.anims.play(`${charName}_idle`, true);
                } else if (this.scene.animationManager.currentState === 'attack') {
                    // For attacks, we might want to let them finish, but if we're pausing, clear it
                    this.scene.animationManager.currentState = 'idle';
                    this.scene.animationManager.animationLocked = false;
                    this.scene.animationManager.lockTimer = 0;
                    this.scene.player.anims.play(`${charName}_idle`, true);
                } else {
                    // Ensure idle animation is playing
                    this.scene.player.anims.play(`${charName}_idle`, true);
                }
            } else {
                // Fallback: just play idle animation
                this.scene.player.anims.play(`${charName}_idle`, true);
            }
            
            // Reset jumping state
            this.scene.isJumping = false;
            
            // Disable input
            if (this.scene.inputManager) {
                this.scene.inputManager.disabled = true;
            }
            
            // Pause physics world for player
            if (this.scene.physics && this.scene.physics.world) {
                // Store original physics state
                if (!this.savedEntityStates.has('physics')) {
                    this.savedEntityStates.set('physics', {
                        isPaused: this.scene.physics.world.isPaused
                    });
                }
                this.scene.physics.world.isPaused = true;
            }
        }
    }
    
    resumePlayer() {
        if (!this.pausedEntities.player) return;
        
        console.log(`🎬 Resuming player - current animation state: ${this.scene.animationManager.currentState}, locked: ${this.scene.animationManager.animationLocked}`);
        
        this.pausedEntities.player = false;
        
        // Restore state
        if (this.scene.player && this.scene.player.body && this.savedEntityStates.has('player')) {
            const savedState = this.savedEntityStates.get('player');
            this.scene.player.body.setVelocity(savedState.velocityX, savedState.velocityY);
            if (savedState.gravityY !== undefined) {
                this.scene.player.body.setGravityY(savedState.gravityY);
            }
            
            // Ensure animation state is cleared (don't restore airkick state)
            if (this.scene.animationManager) {
                // Force clear any stuck animation states, especially airkick
                if (this.scene.animationManager.currentState === 'airkick' || 
                    this.scene.animationManager.animationLocked) {
                    
                    // If animation was locked, check if timer expired
                    const wasLocked = this.scene.animationManager.animationLocked;
                    const lockTimer = this.scene.animationManager.lockTimer || 0;
                    
                    // Always clear airkick state on resume
                    if (this.scene.animationManager.currentState === 'airkick') {
                        console.log('🎬 Clearing stuck airkick state on resume');
                        this.scene.animationManager.currentState = 'idle';
                        this.scene.animationManager.animationLocked = false;
                        this.scene.animationManager.lockTimer = 0;
                        const charName = this.scene.currentCharacterConfig?.name || 'tireek';
                        this.scene.player.anims.play(`${charName}_idle`, true);
                    } else if (wasLocked && lockTimer <= 0) {
                        // Lock timer expired, clear lock
                        console.log('🎬 Animation lock expired, clearing on resume');
                        this.scene.animationManager.animationLocked = false;
                        this.scene.animationManager.lockTimer = 0;
                        if (this.scene.animationManager.currentState === 'attack') {
                            this.scene.animationManager.currentState = 'idle';
                            const charName = this.scene.currentCharacterConfig?.name || 'tireek';
                            this.scene.player.anims.play(`${charName}_idle`, true);
                        }
                    }
                }
            }
            
            // Don't restore jumping state - player should be on ground after pause
            this.scene.isJumping = false;
            
            this.savedEntityStates.delete('player');
        }
        
        // Re-enable input
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
        }
        
        // Resume physics world
        if (this.scene.physics && this.scene.physics.world && this.savedEntityStates.has('physics')) {
            const savedState = this.savedEntityStates.get('physics');
            this.scene.physics.world.isPaused = savedState.isPaused;
            this.savedEntityStates.delete('physics');
        }
    }
    
    pauseEnemies() {
        if (this.pausedEntities.all) return; // Already paused
        
        console.log('🎬 Pausing all enemies');
        
        if (!this.scene.enemies) return;
        
        this.scene.enemies.forEach((enemy, index) => {
            if (!this.pausedEntities.enemies.includes(index)) {
                this.pauseEnemy(index);
            }
        });
    }
    
    resumeEnemies() {
        console.log('🎬 Resuming all enemies');
        
        if (!this.scene.enemies) return;
        
        // Resume all paused enemies
        const pausedIndices = [...this.pausedEntities.enemies];
        pausedIndices.forEach(index => {
            this.resumeEnemy(index);
        });
    }
    
    pauseEnemy(index) {
        if (this.pausedEntities.enemies.includes(index)) return; // Already paused
        
        if (!this.scene.enemies || !this.scene.enemies[index] || !this.scene.enemies[index].sprite) {
            return;
        }
        
        console.log(`🎬 Pausing enemy ${index}`);
        this.pausedEntities.enemies.push(index);
        
        const enemy = this.scene.enemies[index];
        const sprite = enemy.sprite;
        
        // Save current state
        const stateKey = `enemy_${index}`;
        this.savedEntityStates.set(stateKey, {
            velocityX: sprite.body.velocity.x,
            velocityY: sprite.body.velocity.y,
            state: enemy.state
        });
        
        // Freeze physics
        sprite.body.setVelocity(0, 0);
        
        // Stop enemy AI updates (set a flag)
        enemy.eventPaused = true;
    }
    
    resumeEnemy(index) {
        if (!this.pausedEntities.enemies.includes(index)) return; // Not paused
        
        if (!this.scene.enemies || !this.scene.enemies[index] || !this.scene.enemies[index].sprite) {
            // Remove from paused list even if enemy doesn't exist anymore
            this.pausedEntities.enemies = this.pausedEntities.enemies.filter(i => i !== index);
            return;
        }
        
        console.log(`🎬 Resuming enemy ${index}`);
        this.pausedEntities.enemies = this.pausedEntities.enemies.filter(i => i !== index);
        
        const enemy = this.scene.enemies[index];
        const sprite = enemy.sprite;
        
        // Restore state
        const stateKey = `enemy_${index}`;
        if (this.savedEntityStates.has(stateKey)) {
            const savedState = this.savedEntityStates.get(stateKey);
            sprite.body.setVelocity(savedState.velocityX, savedState.velocityY);
            this.savedEntityStates.delete(stateKey);
        }
        
        // Resume enemy AI updates
        enemy.eventPaused = false;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    executeSpawnBoss(action) {
        const bossType = action.bossType || action.enemyType; // Support both names
        const position = action.position;
        const bossConfig = action.config || {};
        
        if (!bossType || !position) {
            console.warn('🎬 SpawnBoss action missing bossType or position');
            this.advanceAction();
            return;
        }
        
        // Check if Boss class is available
        if (typeof Boss === 'undefined') {
            console.error('🎬 Boss class not defined! Make sure boss-system.js loads before event-manager.js');
            this.advanceAction();
            return;
        }
        
        // Find character config
        let characterConfig = null;
        if (typeof ALL_ENEMY_TYPES !== 'undefined' && ALL_ENEMY_TYPES) {
            characterConfig = ALL_ENEMY_TYPES.find(config => config.name === bossType);
        }
        
        if (!characterConfig) {
            console.warn(`🎬 Could not find character config for boss type: ${bossType}`);
            this.advanceAction();
            return;
        }
        
        // Merge boss config
        const mergedConfig = {
            type: bossType,
            name: bossConfig.name || BOSS_TYPE_CONFIGS[bossType]?.name || bossType,
            ...bossConfig
        };
        
        console.log(`👹 Spawning boss: ${mergedConfig.name} at (${position.x}, ${position.y})`);
        
        // Create boss instance
        const boss = new Boss(this.scene, position.x, position.y, characterConfig, mergedConfig);
        boss.setPlayer(this.scene.player);
        
        // Enable AI for boss (unlike regular enemies spawned by events)
        boss.eventPaused = false;
        
        // Add to enemies array
        if (!this.scene.enemies) {
            this.scene.enemies = [];
        }
        const bossIndex = this.scene.enemies.length;
        this.scene.enemies.push(boss);
        
        // Store special reference for targeting (e.g., "boss_critic")
        if (action.id) {
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            this.scene.eventEnemyMap.set(action.id, bossIndex);
            console.log(`👹 Stored boss reference: ${action.id} -> index ${bossIndex}`);
        }
        
        // Store boss reference separately for easy access
        if (!this.scene.bosses) {
            this.scene.bosses = [];
        }
        this.scene.bosses.push(boss);
        
        // Advance to next action
        this.advanceAction();
    }
    
    executeShowBossHealthBar(action) {
        const bossId = action.bossId || action.target;
        let boss = null;
        
        if (bossId) {
            // Find boss by ID
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            // Use first boss if no ID specified
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to show health bar for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        const bossName = boss.bossName || action.bossName || 'BOSS';
        
        console.log(`👹 Showing boss health bar for: ${bossName}`);
        
        if (this.scene.uiManager && this.scene.uiManager.showBossHealthBar) {
            this.scene.uiManager.showBossHealthBar(bossName, boss);
        }
        
        this.advanceAction();
    }
    
    executeSetBossBehavior(action) {
        const bossId = action.bossId || action.target;
        const behaviors = action.behaviors || {};
        
        let boss = null;
        if (bossId) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to set behavior for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Setting boss behaviors: ${JSON.stringify(behaviors)}`);
        
        // Update boss behaviors
        if (behaviors.jumpOnDamage !== undefined) {
            boss.behaviors.jumpOnDamage = behaviors.jumpOnDamage;
        }
        if (behaviors.throwWeapons !== undefined) {
            boss.behaviors.throwWeapons = behaviors.throwWeapons;
        }
        if (behaviors.chase !== undefined) {
            boss.behaviors.chase = behaviors.chase;
        }
        if (behaviors.attack !== undefined) {
            boss.behaviors.attack = behaviors.attack;
        }
        
        this.advanceAction();
    }
    
    executeWaitForBossDefeated(action) {
        const bossId = action.bossId || action.target;
        
        let boss = null;
        if (bossId) {
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(bossId)) {
                const bossIndex = this.scene.eventEnemyMap.get(bossId);
                if (this.scene.enemies && this.scene.enemies[bossIndex]) {
                    boss = this.scene.enemies[bossIndex];
                }
            }
        } else if (this.scene.bosses && this.scene.bosses.length > 0) {
            boss = this.scene.bosses[0];
        }
        
        if (!boss || !boss.isBoss) {
            console.warn(`👹 Could not find boss to wait for: ${bossId || 'first boss'}`);
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Waiting for boss ${boss.bossName} to be defeated...`);
        console.log(`👹 [WAIT_BOSS] Boss state check: health=${boss.health}/${boss.maxHealth}, state=${boss.state}, isDying=${boss.state === BOSS_STATES.DYING}, isDead=${boss.state === BOSS_STATES.DEAD}`);
        
        // Set up callback to advance when boss is defeated
        const previousCallback = boss.onBossDefeated;
        boss.onBossDefeated = (defeatedBoss) => {
            console.log(`👹 [WAIT_BOSS] ✅ onBossDefeated CALLBACK FIRED`);
            console.log(`👹 Boss ${defeatedBoss.bossName} defeated!`);
            // Small delay before advancing to next action
            this.scene.time.delayedCall(500, () => {
                this.advanceAction();
            });
        };
        console.log(`👹 [WAIT_BOSS] Callback set. Previous callback was: ${previousCallback ? 'YES' : 'NO'}`);
        
        // Check if already defeated
        if (boss.health <= 0 || boss.state === BOSS_STATES.DYING || boss.state === BOSS_STATES.DEAD) {
            console.log(`👹 [WAIT_BOSS] ⚠️ Boss already in defeated state! health=${boss.health}, state=${boss.state}`);
            console.log(`👹 Boss already defeated, advancing immediately`);
            this.advanceAction();
            return;
        }
        
        // Don't advance - wait for callback
    }
    
    executeBossDefeatedDialogue(action) {
        const dialogue = action.dialogue;
        
        if (!dialogue) {
            console.warn('👹 BossDefeatedDialogue action missing dialogue data');
            this.advanceAction();
            return;
        }
        
        console.log(`👹 Showing post-fight dialogue: "${dialogue.text}"`);
        
        // Use DialogueManager if available
        if (this.scene.dialogueManager) {
            this.scene.dialogueManager.showDialogue(dialogue, () => {
                this.advanceAction();
            });
        } else {
            console.warn('👹 DialogueManager not available');
            this.advanceAction();
        }
    }
    
    isEventActive() {
        return this.activeEvent !== null;
    }
    
    getActiveEvent() {
        return this.activeEvent;
    }
    
    // ========================================
    // CINEMATIC DARKENING EFFECT
    // ========================================
    
    applyCinematicDarkening(speakerName) {
        // Check if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Cinematic darkening is DISABLED - skipping darkening effect`);
            return;
        }
        
        console.log(`🎬 Applying cinematic darkening for event (speaker: ${speakerName || 'none'})`);
        console.log(`[CINEMA-DARKEN] ========== START applyCinematicDarkening ==========`);
        console.log(`[CINEMA-DARKEN] Speaker: ${speakerName || 'none'}`);
        
        // STEP 1: FIRST, ensure player and ALL extras are bright BEFORE any darkening
        // This must happen first to prevent them from being darkened
        if (this.scene.player) {
            const playerBefore = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                depth: this.scene.player.depth
            };
            console.log(`[CINEMA-DARKEN] STEP1: Player BEFORE - alpha=${playerBefore.alpha}, tint=${playerBefore.tint.toString(16)}, darkened=${playerBefore.darkened}, depth=${playerBefore.depth}`);
            
            // Ensure player is not darkened and is bright
            this.scene.player.clearTint();
            this.scene.player.setAlpha(1.0);
            this.scene.player._cinematicDarkened = false;
            // Set player depth ABOVE the dialogue overlay (which is at depth 10000) so it renders on top
            // Store original depth if not already stored
            if (this.scene.player.originalDepth === undefined) {
                this.scene.player.originalDepth = this.scene.player.depth;
            }
            this.scene.player.setDepth(10001); // Above dialogue overlay
            // Restore original values if they were stored
            if (this.scene.player.originalAlpha !== undefined) {
                this.scene.player.originalAlpha = undefined;
            }
            if (this.scene.player.originalTint !== undefined) {
                this.scene.player.originalTint = undefined;
            }
            
            const playerAfter = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                depth: this.scene.player.depth
            };
            console.log(`[CINEMA-DARKEN] STEP1: Player AFTER - alpha=${playerAfter.alpha}, tint=${playerAfter.tint.toString(16)}, darkened=${playerAfter.darkened}, depth=${playerAfter.depth}`);
        } else {
            console.log(`[CINEMA-DARKEN] STEP1: Player is NULL - cannot brighten`);
        }
        
        // Keep ALL extras at full brightness (they're story characters)
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`[CINEMA-DARKEN] STEP1: Found ${extras.length} extras to brighten`);
            extras.forEach((extra, index) => {
                if (extra && extra.sprite) {
                    const extraBefore = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        name: extra.name || 'unnamed',
                        depth: extra.sprite.depth
                    };
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] "${extraBefore.name}" BEFORE - alpha=${extraBefore.alpha}, tint=${extraBefore.tint.toString(16)}, darkened=${extraBefore.darkened}, depth=${extraBefore.depth}`);
                    
                    // Ensure extra is not darkened and is bright
                    extra.sprite.clearTint();
                    extra.sprite.setAlpha(1.0);
                    extra.sprite._cinematicDarkened = false;
                    // Set extra depth ABOVE the dialogue overlay (which is at depth 10000) so it renders on top
                    // Store original depth if not already stored
                    if (extra.sprite.originalDepth === undefined) {
                        extra.sprite.originalDepth = extra.sprite.depth;
                    }
                    extra.sprite.setDepth(10001); // Above dialogue overlay
                    // Restore original values if they were stored
                    if (extra.sprite.originalAlpha !== undefined) {
                        extra.sprite.originalAlpha = undefined;
                    }
                    if (extra.sprite.originalTint !== undefined) {
                        extra.sprite.originalTint = undefined;
                    }
                    
                    const extraAfter = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        depth: extra.sprite.depth
                    };
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] "${extraBefore.name}" AFTER - alpha=${extraAfter.alpha}, tint=${extraAfter.tint.toString(16)}, darkened=${extraAfter.darkened}, depth=${extraAfter.depth}`);
                } else {
                    console.log(`[CINEMA-DARKEN] STEP1: Extra[${index}] is NULL or has no sprite`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP1: ExtrasManager is NULL`);
        }
        
        // STEP 2: Rebuild darkenedSprites array from existing flags, but EXCLUDE player and extras
        // This ensures we don't lose track of already-darkened enemy sprites
        console.log(`[CINEMA-DARKEN] STEP2: Rebuilding darkenedSprites array (excluding player/extras)`);
        this.darkenedSprites = [];
        let rebuildCount = 0;
        if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
            this.scene.enemies.forEach((enemy, index) => {
                if (enemy && enemy.sprite && enemy.sprite._cinematicDarkened) {
                    // Explicitly exclude player and extras from rebuild
                    if (enemy.sprite === this.scene.player) {
                        console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] sprite is PLAYER - EXCLUDING from rebuild`);
                        return;
                    }
                    const isExtra = this.scene.extrasManager && 
                        this.scene.extrasManager.extras.some(e => e.sprite === enemy.sprite);
                    if (isExtra) {
                        console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] sprite is EXTRA - EXCLUDING from rebuild`);
                        return;
                    }
                    this.darkenedSprites.push(enemy.sprite);
                    rebuildCount++;
                    console.log(`[CINEMA-DARKEN] STEP2: Enemy[${index}] added to darkenedSprites (rebuild)`);
                }
            });
        }
        console.log(`[CINEMA-DARKEN] STEP2: Rebuilt ${rebuildCount} enemy sprites into darkenedSprites`);
        // DO NOT rebuild extras into darkenedSprites - they should never be darkened
        
        // Find the speaking extra by matching speaker name to extra name
        if (speakerName && this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`🎬 Looking for speaking extra: "${speakerName}", available extras:`, extras.map(e => e?.name));
            for (const extra of extras) {
                if (extra && extra.name) {
                    const extraNameLower = extra.name.toLowerCase();
                    const speakerNameLower = speakerName.toLowerCase();
                    if (extraNameLower === speakerNameLower) {
                        this.speakingExtra = extra.sprite;
                        console.log(`🎬 Found speaking extra: ${extra.name} (sprite: ${extra.sprite ? 'exists' : 'missing'})`);
                        break;
                    }
                }
            }
            if (!this.speakingExtra) {
                console.log(`🎬 No matching extra found for speaker: "${speakerName}"`);
            }
        }
        
        // Get dialogue manager overlay
        // NOTE: We're NOT using the overlay for darkening anymore because it darkens everything
        // including player and extras. Instead, we only darken enemies directly via their alpha/tint.
        const dialogueManager = this.scene.dialogueManager;
        if (dialogueManager && dialogueManager.overlay) {
            // Store original overlay alpha if not already stored
            if (dialogueManager.overlay.originalAlpha === undefined) {
                dialogueManager.overlay.originalAlpha = dialogueManager.overlay.alpha;
            }
            // Keep overlay visible but at minimal alpha (just for subtle effect, not darkening)
            // The actual darkening is done by darkening enemies directly
            dialogueManager.overlay.setVisible(true);
            dialogueManager.overlay.setAlpha(0.1); // Very subtle, just for slight dimming, not darkening
            console.log(`[CINEMA-DARKEN] Overlay set to minimal alpha 0.1 (darkening done via enemy alpha/tint only)`);
            console.log(`[CINEMA-DARKEN] Player depth: ${this.scene.player ? this.scene.player.depth : 'N/A'}, should be 10001`);
            if (this.scene.extrasManager) {
                const extras = this.scene.extrasManager.extras || [];
                extras.forEach((extra, idx) => {
                    if (extra && extra.sprite) {
                        console.log(`[CINEMA-DARKEN] Extra[${idx}] "${extra.name || 'unnamed'}" depth: ${extra.sprite.depth}, should be 10001`);
                    }
                });
            }
        }
        
        // STEP 3: Darken all enemies (but NOT the player or any extras)
        // Add explicit checks to ensure player/extras are never darkened
        console.log(`[CINEMA-DARKEN] STEP3: Darkening enemies (excluding player/extras)`);
        let darkenedCount = 0;
        let skippedCount = 0;
        if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
            console.log(`[CINEMA-DARKEN] STEP3: Processing ${this.scene.enemies.length} enemies`);
            this.scene.enemies.forEach((enemy, index) => {
                if (enemy && enemy.sprite && enemy.sprite.active) {
                    // CRITICAL: Explicitly exclude player
                    if (enemy.sprite === this.scene.player) {
                        console.warn(`[CINEMA-DARKEN] STEP3: Enemy[${index}] sprite IS PLAYER - SKIPPING darkening`);
                        skippedCount++;
                        return;
                    }
                    
                    // CRITICAL: Explicitly exclude extras
                    const isExtra = this.scene.extrasManager && 
                        this.scene.extrasManager.extras.some(e => e.sprite === enemy.sprite);
                    if (isExtra) {
                        const extraName = this.scene.extrasManager.extras.find(e => e.sprite === enemy.sprite)?.name || 'unnamed';
                        console.warn(`[CINEMA-DARKEN] STEP3: Enemy[${index}] sprite IS EXTRA "${extraName}" - SKIPPING darkening`);
                        skippedCount++;
                        return;
                    }
                    
                    // Only darken if it's actually an enemy
                    const beforeAlpha = enemy.sprite.alpha;
                    const beforeTint = enemy.sprite.tint;
                    // Store original alpha and tint state if not already stored
                    if (enemy.sprite.originalAlpha === undefined) {
                        enemy.sprite.originalAlpha = enemy.sprite.alpha;
                    }
                    if (enemy.sprite.originalTint === undefined) {
                        enemy.sprite.originalTint = enemy.sprite.tint;
                    }
                    // Darken enemy
                    enemy.sprite.setAlpha(0.3);
                    enemy.sprite.setTint(0x333333); // Dark gray tint
                    enemy.sprite._cinematicDarkened = true; // Mark as darkened by cinematic effect
                    // Add to list if not already there
                    if (this.darkenedSprites.indexOf(enemy.sprite) === -1) {
                        this.darkenedSprites.push(enemy.sprite);
                    }
                    darkenedCount++;
                    console.log(`[CINEMA-DARKEN] STEP3: Enemy[${index}] DARKENED - alpha: ${beforeAlpha} -> ${enemy.sprite.alpha}, tint: ${beforeTint.toString(16)} -> ${enemy.sprite.tint.toString(16)}`);
                } else {
                    console.log(`[CINEMA-DARKEN] STEP3: Enemy[${index}] is NULL, has no sprite, or is inactive - skipping`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP3: No enemies array or not an array`);
        }
        console.log(`[CINEMA-DARKEN] STEP3: Darkened ${darkenedCount} enemies, skipped ${skippedCount} (player/extras)`);
        
        // STEP 4: Final safety check - ensure player and extras are still bright and not in darkenedSprites
        console.log(`[CINEMA-DARKEN] STEP4: Final safety check for player and extras`);
        if (this.scene.player) {
            const playerIndex = this.darkenedSprites.indexOf(this.scene.player);
            const playerState = {
                alpha: this.scene.player.alpha,
                tint: this.scene.player.tint,
                darkened: this.scene.player._cinematicDarkened,
                inDarkenedList: playerIndex > -1
            };
            console.log(`[CINEMA-DARKEN] STEP4: Player state - alpha=${playerState.alpha}, tint=${playerState.tint.toString(16)}, darkened=${playerState.darkened}, inList=${playerState.inDarkenedList}`);
            
            if (playerIndex > -1) {
                console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Player found in darkenedSprites at index ${playerIndex} - REMOVING`);
                this.darkenedSprites.splice(playerIndex, 1);
            }
            // Double-check player is bright
            if (this.scene.player.alpha < 1.0 || this.scene.player._cinematicDarkened) {
                console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Player was darkened (alpha=${this.scene.player.alpha}, darkened=${this.scene.player._cinematicDarkened}) - RESTORING brightness`);
                this.scene.player.clearTint();
                this.scene.player.setAlpha(1.0);
                this.scene.player._cinematicDarkened = false;
                console.log(`[CINEMA-DARKEN] STEP4: Player restored - alpha=${this.scene.player.alpha}, tint=${this.scene.player.tint.toString(16)}, darkened=${this.scene.player._cinematicDarkened}`);
            } else {
                console.log(`[CINEMA-DARKEN] STEP4: ✅ Player is bright (alpha=${this.scene.player.alpha}, darkened=${this.scene.player._cinematicDarkened})`);
            }
        } else {
            console.log(`[CINEMA-DARKEN] STEP4: Player is NULL - cannot check`);
        }
        
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            console.log(`[CINEMA-DARKEN] STEP4: Checking ${extras.length} extras`);
            extras.forEach((extra, index) => {
                if (extra && extra.sprite) {
                    const extraIndex = this.darkenedSprites.indexOf(extra.sprite);
                    const extraState = {
                        alpha: extra.sprite.alpha,
                        tint: extra.sprite.tint,
                        darkened: extra.sprite._cinematicDarkened,
                        inDarkenedList: extraIndex > -1,
                        name: extra.name || 'unnamed'
                    };
                    console.log(`[CINEMA-DARKEN] STEP4: Extra[${index}] "${extraState.name}" state - alpha=${extraState.alpha}, tint=${extraState.tint.toString(16)}, darkened=${extraState.darkened}, inList=${extraState.inDarkenedList}`);
                    
                    if (extraIndex > -1) {
                        console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Extra "${extraState.name}" found in darkenedSprites at index ${extraIndex} - REMOVING`);
                        this.darkenedSprites.splice(extraIndex, 1);
                    }
                    // Double-check extra is bright
                    if (extra.sprite.alpha < 1.0 || extra.sprite._cinematicDarkened) {
                        console.warn(`[CINEMA-DARKEN] STEP4: ⚠️ Extra "${extraState.name}" was darkened (alpha=${extra.sprite.alpha}, darkened=${extra.sprite._cinematicDarkened}) - RESTORING brightness`);
                        extra.sprite.clearTint();
                        extra.sprite.setAlpha(1.0);
                        extra.sprite._cinematicDarkened = false;
                        console.log(`[CINEMA-DARKEN] STEP4: Extra "${extraState.name}" restored - alpha=${extra.sprite.alpha}, tint=${extra.sprite.tint.toString(16)}, darkened=${extra.sprite._cinematicDarkened}`);
                    } else {
                        console.log(`[CINEMA-DARKEN] STEP4: ✅ Extra "${extraState.name}" is bright (alpha=${extra.sprite.alpha}, darkened=${extra.sprite._cinematicDarkened})`);
                    }
                } else {
                    console.log(`[CINEMA-DARKEN] STEP4: Extra[${index}] is NULL or has no sprite`);
                }
            });
        } else {
            console.log(`[CINEMA-DARKEN] STEP4: ExtrasManager is NULL - cannot check extras`);
        }
        
        console.log(`[CINEMA-DARKEN] ========== END applyCinematicDarkening ==========`);
        console.log(`[CINEMA-DARKEN] Final darkenedSprites count: ${this.darkenedSprites.length}`);
        
        // Start monitoring player and extras to detect if they get darkened after this function
        this.startDarkeningMonitor();
    }
    
    startDarkeningMonitor() {
        // Don't start monitor if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Monitor not started - darkening is disabled`);
            return;
        }
        
        // Clear any existing monitor
        if (this.darkeningMonitorTimer) {
            this.darkeningMonitorTimer.destroy();
        }
        
        // Monitor every 100ms to check if player/extras get darkened
        let checkCount = 0;
        this.darkeningMonitorTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                // Only monitor while event is active and darkening is enabled
                if (!this.activeEvent || !this.cinematicDarkeningEnabled) {
                    if (this.darkeningMonitorTimer) {
                        this.darkeningMonitorTimer.destroy();
                        this.darkeningMonitorTimer = null;
                    }
                    return;
                }
                
                checkCount++;
                let issuesFound = false;
                
                // Check player
                if (this.scene.player) {
                    const playerAlpha = this.scene.player.alpha;
                    const playerTint = this.scene.player.tint;
                    const playerDarkened = this.scene.player._cinematicDarkened;
                    const inDarkenedList = this.darkenedSprites.indexOf(this.scene.player) > -1;
                    
                    if (playerAlpha < 1.0 || playerDarkened || inDarkenedList || playerTint !== 0xffffff) {
                        console.warn(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ⚠️ Player state changed! alpha=${playerAlpha}, tint=${playerTint.toString(16)}, darkened=${playerDarkened}, inList=${inDarkenedList}`);
                        issuesFound = true;
                        
                        // Auto-fix
                        this.scene.player.clearTint();
                        this.scene.player.setAlpha(1.0);
                        this.scene.player._cinematicDarkened = false;
                        const idx = this.darkenedSprites.indexOf(this.scene.player);
                        if (idx > -1) {
                            this.darkenedSprites.splice(idx, 1);
                        }
                        console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ Player auto-fixed`);
                    }
                }
                
                // Check extras
                if (this.scene.extrasManager) {
                    const extras = this.scene.extrasManager.extras || [];
                    extras.forEach((extra, index) => {
                        if (extra && extra.sprite) {
                            const extraAlpha = extra.sprite.alpha;
                            const extraTint = extra.sprite.tint;
                            const extraDarkened = extra.sprite._cinematicDarkened;
                            const inDarkenedList = this.darkenedSprites.indexOf(extra.sprite) > -1;
                            
                            if (extraAlpha < 1.0 || extraDarkened || inDarkenedList || extraTint !== 0xffffff) {
                                console.warn(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ⚠️ Extra[${index}] "${extra.name || 'unnamed'}" state changed! alpha=${extraAlpha}, tint=${extraTint.toString(16)}, darkened=${extraDarkened}, inList=${inDarkenedList}`);
                                issuesFound = true;
                                
                                // Auto-fix
                                extra.sprite.clearTint();
                                extra.sprite.setAlpha(1.0);
                                extra.sprite._cinematicDarkened = false;
                                const idx = this.darkenedSprites.indexOf(extra.sprite);
                                if (idx > -1) {
                                    this.darkenedSprites.splice(idx, 1);
                                }
                                console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ Extra "${extra.name || 'unnamed'}" auto-fixed`);
                            }
                        }
                    });
                }
                
                // Log status every 10 checks (1 second) if no issues, or immediately if issues found
                if (checkCount % 10 === 0 || issuesFound) {
                    if (!issuesFound) {
                        console.log(`[CINEMA-DARKEN] MONITOR[${checkCount}]: ✅ All checks passed - player and extras still bright`);
                    }
                }
            },
            repeat: -1
        });
    }
    
    updateSpeakingExtra(speakerName) {
        // No longer needed - all extras stay bright now
        // Keeping method for compatibility but it just re-applies darkening
        console.log(`🎬 Updating speaking extra: "${speakerName}" (all extras stay bright)`);
        
        // Re-apply darkening to ensure everything is correct
        // This will ensure player and all extras stay bright
        this.applyCinematicDarkening(null);
    }
    
    removeCinematicDarkening() {
        // Check if darkening is disabled
        if (!this.cinematicDarkeningEnabled) {
            console.log(`[CINEMA-DARKEN] Cinematic darkening is DISABLED - skipping removal`);
            return;
        }
        
        console.log('🎬 Removing cinematic darkening effect');
        console.log(`[CINEMA-DARKEN] Removing darkening - restoring player/extras depth`);
        
        // Restore overlay opacity
        const dialogueManager = this.scene.dialogueManager;
        if (dialogueManager && dialogueManager.overlay) {
            if (dialogueManager.overlay.originalAlpha !== undefined) {
                dialogueManager.overlay.setAlpha(dialogueManager.overlay.originalAlpha);
                dialogueManager.overlay.originalAlpha = undefined;
            } else {
                dialogueManager.overlay.setAlpha(0.3); // Back to default
            }
        }
        
        // Restore player depth if it was changed
        if (this.scene.player && this.scene.player.originalDepth !== undefined) {
            console.log(`[CINEMA-DARKEN] Restoring player depth from ${this.scene.player.depth} to ${this.scene.player.originalDepth}`);
            this.scene.player.setDepth(this.scene.player.originalDepth);
            this.scene.player.originalDepth = undefined;
        }
        
        // Restore extras depth if it was changed
        if (this.scene.extrasManager) {
            const extras = this.scene.extrasManager.extras || [];
            extras.forEach(extra => {
                if (extra && extra.sprite && extra.sprite.originalDepth !== undefined) {
                    console.log(`[CINEMA-DARKEN] Restoring extra "${extra.name || 'unnamed'}" depth from ${extra.sprite.depth} to ${extra.sprite.originalDepth}`);
                    extra.sprite.setDepth(extra.sprite.originalDepth);
                    extra.sprite.originalDepth = undefined;
                }
            });
        }
        
        // Restore all darkened sprites
        this.darkenedSprites.forEach(sprite => {
            if (sprite && sprite.active && sprite._cinematicDarkened) {
                // Restore original alpha
                if (sprite.originalAlpha !== undefined) {
                    sprite.setAlpha(sprite.originalAlpha);
                    sprite.originalAlpha = undefined;
                } else {
                    sprite.setAlpha(1.0);
                }
                // Restore original tint or clear it
                if (sprite.originalTint !== undefined && sprite.originalTint !== 0xffffff) {
                    sprite.setTint(sprite.originalTint);
                    sprite.originalTint = undefined;
                } else {
                    sprite.clearTint();
                }
                // Remove marker
                sprite._cinematicDarkened = false;
            }
        });
        
        // Clear tracking
        this.darkenedSprites = [];
        this.speakingExtra = null;
    }

    // ========================================
    // CLEANUP
    // ========================================

    destroy() {
        // Resume all paused entities before destroying
        if (this.pausedEntities.player) {
            this.resumePlayer();
        }
        if (this.pausedEntities.enemies.length > 0) {
            this.resumeEnemies();
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

