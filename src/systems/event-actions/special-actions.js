// ========================================
// EVENT ACTIONS: SPECIAL OPERATIONS
// ========================================
// Handles pause, resume, subway, and trigger actions

class SpecialActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
    }
    
    advanceAction() {
        this.eventManager.advanceAction();
    }
    
    pauseEntities(targets) {
        return this.eventManager.entityManager.pauseEntities(targets);
    }
    
    resumeEntities(targets) {
        return this.eventManager.entityManager.resumeEntities(targets);
    }
    
    getEntity(target) {
        return this.eventManager.getEntity(target);
    }
    
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
        this.eventManager.triggeredEvents.add(event.id);
        this.eventManager.activeEvent = event;
        this.eventManager.actionQueue = [...event.actions]; // Copy actions array
        this.eventManager.currentActionIndex = 0;

        // Execute first action
        this.eventManager.executeNextAction();

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
}

// Export for use in event-manager.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpecialActions };
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
    window.SpecialActions = SpecialActions;
}

