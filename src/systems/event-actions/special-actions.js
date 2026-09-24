// ========================================
// EVENT ACTIONS: SPECIAL OPERATIONS
// ========================================
// Handles pause, resume, subway, and trigger actions

class SpecialActions {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.scene = eventManager.scene;
        // Track active subway cars for sound management
        this.activeSubwayCars = new Set();
        // Track the next spawn timer so we can cancel it
        this.subwayCarSpawnTimer = null;
        // Track if the cycle is active
        this.subwayCarCycleActive = false;
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
    
    // Get subway passing volume from level config (centralized)
    getSubwayPassingVolume(levelConfig) {
        if (levelConfig && levelConfig.audio && levelConfig.audio.subwayPassingVolume !== undefined) {
            return levelConfig.audio.subwayPassingVolume;
        }
        // Fallback: the level currently built by the lifecycle
        const currentConfig = this.scene.levelLifecycle ? this.scene.levelLifecycle.currentLevel : null;
        if (currentConfig && currentConfig.audio && currentConfig.audio.subwayPassingVolume !== undefined) {
            return currentConfig.audio.subwayPassingVolume;
        }
        // Final fallback (should rarely be needed)
        return 0.1;
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

        // Look the event up among the ones registered for this level
        const event = this.eventManager.events.find(e => e.id === eventId);
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
        this.eventManager.recordEventStart(event);

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

        // Set up continuous monitoring to destroy when off-screen, update panning, and handle fade in/out
        const FADE_DISTANCE = 400; // Distance in pixels for fade in/out zones
        let carFadeState = 'fadingIn'; // 'fadingIn', 'onScreen', 'fadingOut', 'offScreen'

        const checkOffScreen = () => {
            if (!entity || !entity.active || !entity.subwayMovementActive) {
                return; // Already destroyed or movement stopped
            }

            const camera = this.scene.cameras.main;
            const cameraLeft = camera.scrollX;
            const cameraRight = camera.scrollX + camera.width;
            const cameraCenterX = camera.scrollX + camera.width / 2;

            // Calculate fade zones
            const fadeInStart = cameraLeft - FADE_DISTANCE;
            const fadeInEnd = cameraLeft;
            const fadeOutStart = cameraRight;
            const fadeOutEnd = cameraRight + FADE_DISTANCE;

            // Update panning based on car position relative to camera center
            if (this.scene.audioManager && this.scene.audioManager.subwayPassingSound) {
                // Calculate pan: -1 (left) to 1 (right) based on car position
                const screenWidth = camera.width;
                const relativeX = entity.x - cameraCenterX;
                const panRange = screenWidth * 0.6; // Use 60% of screen width for panning range
                const pan = Phaser.Math.Clamp(relativeX / panRange, -1, 1);
                this.scene.audioManager.subwayPassingSound.setPan(pan);
            }

            // Calculate volume contribution for this car based on position
            // Store it on the entity so we can find the max volume across all cars
            // Get target volume from AudioManager (set from level config)
            const targetVolume = this.scene.audioManager ? 
                (this.scene.audioManager.subwayPassingTargetVolume || 0.1) : 0.1;
            let carVolume = 0;

            if (entity.x < fadeInStart) {
                // Before fade-in zone - volume 0
                carFadeState = 'fadingIn';
                carVolume = 0;
            } else if (entity.x >= fadeInStart && entity.x <= fadeInEnd) {
                // In fade-in zone - gradually increase volume
                carFadeState = 'fadingIn';
                const fadeProgress = (entity.x - fadeInStart) / (fadeInEnd - fadeInStart);
                carVolume = targetVolume * fadeProgress;
            } else if (entity.x > fadeInEnd && entity.x < fadeOutStart) {
                // On screen - full volume
                carFadeState = 'onScreen';
                carVolume = targetVolume;
            } else if (entity.x >= fadeOutStart && entity.x <= fadeOutEnd) {
                // In fade-out zone - gradually decrease volume
                carFadeState = 'fadingOut';
                const fadeProgress = (entity.x - fadeOutStart) / (fadeOutEnd - fadeOutStart);
                carVolume = targetVolume * (1 - fadeProgress);
            } else {
                // Past fade-out zone - volume 0
                carFadeState = 'offScreen';
                carVolume = 0;
            }

            // Store volume contribution on entity
            entity.subwayVolumeContribution = carVolume;

            // Update audio manager with maximum volume from all active cars
            if (this.scene.audioManager && this.scene.audioManager.subwayPassingSound) {
                // Find maximum volume contribution from all active subway cars
                let maxVolume = 0;
                this.activeSubwayCars.forEach(carId => {
                    const carEntity = this.getEntity(carId);
                    if (carEntity && carEntity.subwayVolumeContribution !== undefined) {
                        maxVolume = Math.max(maxVolume, carEntity.subwayVolumeContribution);
                    }
                });
                
                // Update volume to the maximum (so multiple cars don't cancel each other out)
                this.scene.audioManager.setSubwayPassingVolume(maxVolume);
            }

            // Destroy if subway car has moved well past the right edge of camera
            if (entity.x > fadeOutEnd + 200) {
                console.log(`🎬 Subway car ${target} went off-screen, destroying`);
                entity.subwayMovementActive = false;
                entity.setVelocityX(0);
                
                // Remove from active cars
                this.activeSubwayCars.delete(target);
                
                // If this was the last car, check if we need to stop the sound
                // (volume should already be 0 from fade-out, but ensure cleanup)
                if (this.activeSubwayCars.size === 0 && this.scene.audioManager) {
                    // Small delay to ensure fade-out completes, then stop
                    this.scene.time.delayedCall(500, () => {
                        if (this.activeSubwayCars.size === 0 && this.scene.audioManager) {
                            this.scene.audioManager.stopSubwayPassing();
                        }
                    });
                }
                
                this.scene.extrasManager.destroyExtraById(target);
                return;
            }

            // Continue checking
            this.scene.time.delayedCall(50, checkOffScreen); // Check more frequently for smoother fades
        };

        // Start the monitoring loop
        this.scene.time.delayedCall(100, checkOffScreen);

        // Advance to next action immediately (movement continues in background)
        this.advanceAction();
    }

    executeSpawnSubwayCarCycle(action) {
        console.log('🎬 Starting subway car spawning cycle');
        
        // Mark cycle as active
        this.subwayCarCycleActive = true;

        const spawnNextCar = () => {
            // Check if cycle was stopped
            if (!this.subwayCarCycleActive) {
                console.log('🎬 Subway car cycle stopped, not spawning more cars');
                return;
            }

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

                // Add to active cars set
                this.activeSubwayCars.add(carId);
                
                // Start subway passing sound if this is the first car
                if (this.activeSubwayCars.size === 1 && this.scene.audioManager) {
                    // Get volume from level config (centralized)
                    const levelConfig = this.scene.levelLifecycle ? this.scene.levelLifecycle.currentLevel : null;
                    const volume = this.getSubwayPassingVolume(levelConfig);
                    this.scene.audioManager.startSubwayPassing(volume);
                }

                // Start movement
                this.executeStartSubwayMovement({
                    target: carId,
                    speed: 1000 // Match the speed from the config
                });
            } else {
                console.warn('🎬 Failed to spawn subway car');
            }

            // Schedule next spawn with random delay (3-6 seconds as set by user)
            // Only if cycle is still active
            if (this.subwayCarCycleActive) {
            const delay = Phaser.Math.Between(4000, 8000);
            console.log(`🎬 Next subway car in ${delay}ms`);
                this.subwayCarSpawnTimer = this.scene.time.delayedCall(delay, spawnNextCar);
            }
        };

        // Start the cycle
        spawnNextCar();

        // Advance to next action immediately (cycle continues in background)
        this.advanceAction();
    }
    
    executeStopSubwayCarCycle(action) {
        this.stopSubwayCarCycle();
        
        // Advance to next action
        this.advanceAction();
    }
    
    // Also called directly by LevelLifecycle.teardown() so a level that never ran the
    // stop action (e.g. the player died) cannot leave a spawn timer running
    stopSubwayCarCycle() {
        console.log('🎬 Stopping subway car spawning cycle');
        
        // Stop the cycle
        this.subwayCarCycleActive = false;
        
        // Cancel the next spawn timer if it exists
        if (this.subwayCarSpawnTimer) {
            this.scene.time.removeEvent(this.subwayCarSpawnTimer);
            this.subwayCarSpawnTimer = null;
        }
        
        // Destroy all active subway cars
        const carsToDestroy = Array.from(this.activeSubwayCars);
        carsToDestroy.forEach(carId => {
            console.log(`🎬 Destroying subway car: ${carId}`);
            const entity = this.getEntity(carId);
            if (entity) {
                entity.subwayMovementActive = false;
                entity.setVelocityX(0);
            }
            this.scene.extrasManager.destroyExtraById(carId);
        });
        
        // Clear the active cars set
        this.activeSubwayCars.clear();
        
        // Stop subway passing sound
        if (this.scene.audioManager) {
            this.scene.audioManager.stopSubwayPassing();
        }
    }

    // Force the active player character to a specific character (e.g. before a
    // mirror-match boss duel that requires a particular character to be in control).
    // No-ops if the requested character is already active.
    // { "type": "showEmote", "target": "player", "text": "!", "duration": 2500 }
    // Pops a piece of text above a character's head (default: red "!" over the player),
    // bobs it, and fades it after `duration`. Non-blocking - the event continues at once.
    // Optional: color, fontSize, offsetY (default: just above the visible head).
    // Looping fire behind the player, e.g. { "type": "playerAura", "effect": "bluefire", "hue": 190 }
    // (hue rotates the sprite's colours in degrees - 190 turns the blue fire yellow).
    // { "type": "playerAura", "enabled": false } removes it.
    executePlayerAura(action) {
        if (this.scene.effectSystem) {
            if (action.enabled === false) {
                this.scene.effectSystem.clearPlayerAura();
            } else {
                this.scene.effectSystem.setPlayerAura(action);
            }
        } else {
            console.warn('🎬 PlayerAura: effectSystem unavailable');
        }
        this.advanceAction();
    }

    // Refill both characters' health, e.g. { "type": "healPlayers" } before a boss fight
    executeHealPlayers(action) {
        const cm = this.scene.characterManager;
        if (cm && typeof cm.healAll === 'function') {
            cm.healAll();
            // Quick green flash so the player notices
            const player = this.scene.player;
            if (player && player.active) {
                player.setTint(0x66ff88);
                this.scene.time.delayedCall(350, () => { if (player.active) player.clearTint(); });
            }
        } else {
            console.warn('🎬 HealPlayers: characterManager unavailable');
        }
        this.advanceAction();
    }

    executeShowEmote(action) {
        const target = (!action.target || action.target === 'player') ? this.scene.player : this.getEntity(action.target);
        if (!target) {
            console.warn('🎬 ShowEmote: target not found', action.target);
            this.advanceAction();
            return;
        }
        this.clearEmote(true);
        
        const text = action.text !== undefined ? action.text : '!';
        const duration = action.duration || 2000;
        // The sprite frame has a lot of transparent margin; the visible head sits well
        // below the frame top, so anchor a bit above the sprite's vertical third.
        const offsetY = action.offsetY !== undefined ? action.offsetY : -Math.round(target.displayHeight * 0.32);
        
        const emote = this.scene.add.text(target.x, target.y + offsetY, text, {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: `${action.fontSize || 72}px`,
            color: action.color || '#ff2a2a',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5, 1).setDepth(9999).setScale(0);
        this.scene._eventEmote = emote;
        
        // Pop in, then bob until it is cleared
        this.scene.tweens.add({
            targets: emote, scale: 1, duration: 260, ease: 'Back.easeOut',
            onComplete: () => {
                if (emote.active) {
                    this.scene.tweens.add({ targets: emote, y: emote.y - 8, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                }
            }
        });
        this.scene.time.delayedCall(duration, () => {
            if (this.scene._eventEmote === emote) this.clearEmote(false);
        });
        
        this.advanceAction();
    }
    
    clearEmote(immediate) {
        const emote = this.scene._eventEmote;
        if (!emote) return;
        this.scene._eventEmote = null;
        this.scene.tweens.killTweensOf(emote);
        if (immediate || !emote.active) {
            emote.destroy();
            return;
        }
        this.scene.tweens.add({ targets: emote, alpha: 0, scale: 0.6, duration: 160, onComplete: () => emote.destroy() });
    }
    
    executeSetActiveCharacter(action) {
        const target = action.character;
        const characterManager = this.scene.characterManager;

        if (!target || !characterManager) {
            console.warn('🎬 SetActiveCharacter action missing character or characterManager unavailable');
            this.advanceAction();
            return;
        }

        if (characterManager.selectedCharacter === target) {
            console.log(`🎬 SetActiveCharacter: already playing as ${target}, no switch needed`);
            this.advanceAction();
            return;
        }

        console.log(`🎬 SetActiveCharacter: forcing switch to ${target}`);
        const result = characterManager.switchCharacter(
            true,
            this.scene.animationManager,
            this.scene.isJumping,
            this.scene.eventCameraLocked || false
        );

        if (result && result.success) {
            // Full rebind (animation state, physics, combat, camera) - the previous partial
            // rebind left scene.animationManager pointing at the old sprite
            this.scene.bindPlayer(result.newPlayer);
        } else {
            console.warn(`🎬 SetActiveCharacter: switch to ${target} failed`, result);
        }

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

