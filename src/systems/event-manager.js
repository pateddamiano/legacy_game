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
        
        // Entity pause state tracking
        this.pausedEntities = {
            player: false,
            enemies: [],
            all: false
        };
        
        // Store original entity states for restoration
        this.savedEntityStates = new Map();
        
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
        
        console.log(`🎬 Moving ${target} to (${destination.x}, ${destination.y}) over ${duration}ms`);
        
        // Create tween for smooth movement
        const tween = this.scene.tweens.add({
            targets: entity,
            x: destination.x,
            y: destination.y !== undefined ? destination.y : entity.y,
            duration: duration,
            ease: action.ease || 'Power2', // Default easing
            onComplete: () => {
                console.log(`🎬 Move complete for ${target}`);
                this.advanceAction();
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
        
        // Use DialogueManager if available
        if (this.scene.dialogueManager) {
            // Show dialogue with callback to advance to next action
            this.scene.dialogueManager.showDialogue(dialogue, () => {
                this.advanceAction();
            });
        } else {
            console.warn('🎬 DialogueManager not available');
            this.advanceAction();
        }
    }
    
    executeWait(action) {
        const duration = action.duration || 1000;
        
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
            console.log(`🎬 Panning camera to (${action.pan.x}, ${action.pan.y})`);
            
            // Stop following before panning
            camera.stopFollow();
            
            this.scene.tweens.add({
                targets: camera,
                scrollX: action.pan.x,
                scrollY: action.pan.y !== undefined ? action.pan.y : camera.scrollY,
                duration: duration,
                ease: action.ease || 'Power2',
                onComplete: () => {
                    this.advanceAction();
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
            console.log(`🎬 Setting camera bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);
            camera.setBounds(
                bounds.x !== undefined ? bounds.x : camera.getBounds().x,
                bounds.y !== undefined ? bounds.y : camera.getBounds().y,
                bounds.width !== undefined ? bounds.width : camera.getBounds().width,
                bounds.height !== undefined ? bounds.height : camera.getBounds().height
            );
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
        
        // Add to enemies array
        if (!this.scene.enemies) {
            this.scene.enemies = [];
        }
        const enemyIndex = this.scene.enemies.length;
        this.scene.enemies.push(enemy);
        
        // Store special reference for targeting (e.g., "enemy_critic")
        if (action.id) {
            // Store mapping: "enemy_critic" -> enemyIndex
            if (!this.scene.eventEnemyMap) {
                this.scene.eventEnemyMap = new Map();
            }
            this.scene.eventEnemyMap.set(action.id, enemyIndex);
            console.log(`🎬 Stored enemy reference: ${action.id} -> index ${enemyIndex}`);
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
        
        console.log(`🎬 Flipping ${target}: flipX=${flipX}, flipY=${flipY}`);
        
        sprite.setFlipX(flipX);
        if (flipY !== undefined) {
            sprite.setFlipY(flipY);
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
        
        // Build a fast lookup of indices that should be excluded based on special IDs
        const excludedIndices = new Set();
        if (this.scene.eventEnemyMap && excludeIds.length > 0) {
            for (const [id, mapIndex] of this.scene.eventEnemyMap.entries()) {
                if (excludeIds.includes(id)) {
                    excludedIndices.add(mapIndex);
                }
            }
        }
        
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
            
            if (!shouldRemove) return;
            
            // Respect exclusions (by special ID or explicit enemy_<index>)
            if (excludedIndices.has(index)) return;
            if (excludeIds.includes(`enemy_${index}`)) return;
            
            enemiesToRemove.push(index);
        });
        
        // Remove enemies in reverse order to maintain indices
        for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
            const index = enemiesToRemove[i];
            const enemy = this.scene.enemies[index];
            
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
                for (const [key, value] of this.scene.eventEnemyMap.entries()) {
                    if (value === index) {
                        this.scene.eventEnemyMap.delete(key);
                    } else if (value > index) {
                        this.scene.eventEnemyMap.set(key, value - 1);
                    }
                }
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
            
            // Check eventEnemyMap first for special IDs
            if (this.scene.eventEnemyMap && this.scene.eventEnemyMap.has(target)) {
                const index = this.scene.eventEnemyMap.get(target);
                if (this.scene.enemies && this.scene.enemies[index] && this.scene.enemies[index].sprite) {
                    return this.scene.enemies[index].sprite;
                }
            }
            
            // Otherwise, try parsing as index (e.g., "enemy_0")
            const index = parseInt(restOfString);
            if (!isNaN(index) && this.scene.enemies && this.scene.enemies[index] && this.scene.enemies[index].sprite) {
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
            multiplier: action.multiplier
        };
        console.log('🎬 executeSpawnExtra:', { name, x, y, opts });
        const extra = this.scene.extrasManager.spawnExtra(name, x, y, opts);
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
        if (this.scene.player) {
            this.savedEntityStates.set('player', {
                velocityX: this.scene.player.body.velocity.x,
                velocityY: this.scene.player.body.velocity.y,
                gravityY: this.scene.player.body.gravity.y,
                isJumping: this.scene.isJumping || false,
                animationState: this.scene.animationManager?.currentState || 'idle',
                animationLocked: this.scene.animationManager?.animationLocked || false,
                lockTimer: this.scene.animationManager?.lockTimer || 0
            });
            
            // Freeze physics
            this.scene.player.body.setVelocity(0, 0);
            this.scene.player.body.setGravityY(0);
            
            // Clear animation lock if in airkick to prevent stuck state
            if (this.scene.animationManager && this.scene.animationManager.currentState === 'airkick') {
                console.log('🎬 Clearing airkick animation lock on pause');
                this.scene.animationManager.currentState = 'idle';
                this.scene.animationManager.animationLocked = false;
                this.scene.animationManager.lockTimer = 0;
                // Play idle animation
                const charName = this.scene.currentCharacterConfig?.name || 'tireek';
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
        if (!this.pausedEntities.player) return; // Not paused
        
        console.log('🎬 Resuming player');
        this.pausedEntities.player = false;
        
        // Restore state
        if (this.scene.player && this.savedEntityStates.has('player')) {
            const savedState = this.savedEntityStates.get('player');
            this.scene.player.body.setVelocity(savedState.velocityX, savedState.velocityY);
            this.scene.player.body.setGravityY(savedState.gravityY);
            
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
    
    isEventActive() {
        return this.activeEvent !== null;
    }
    
    getActiveEvent() {
        return this.activeEvent;
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

