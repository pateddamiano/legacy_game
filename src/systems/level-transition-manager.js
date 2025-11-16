// ========================================
// LEVEL TRANSITION MANAGER
// ========================================
// Handles complete level transitions including state preservation, cleanup, fade transitions, and new level setup

class LevelTransitionManager {
    constructor(scene) {
        this.scene = scene;
        
        // Manager references (set during initialization)
        this.livesManager = null;
        this.characterManager = null;
        this.enemySpawnManager = null;
        this.weaponManager = null;
        this.itemPickupManager = null;
        this.eventManager = null;
        this.audioManager = null;
        this.levelInitializationManager = null;
        this.worldManager = null;
        this.uiManager = null;
        
        // Preserved state
        this.preservedState = null;
        
        // Transition state
        this.isTransitioning = false;
        
        // Debug prefix for easy filtering (Ctrl+F: [leveltrans])
        this.DEBUG_PREFIX = '[leveltrans]';
        
        console.log('🔄 LevelTransitionManager initialized');
    }
    
    // Debug logging helper
    debugLog(...args) {
        console.log(this.DEBUG_PREFIX, ...args);
    }
    
    debugWarn(...args) {
        console.warn(this.DEBUG_PREFIX, ...args);
    }
    
    debugError(...args) {
        console.error(this.DEBUG_PREFIX, ...args);
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(managers) {
        this.livesManager = managers.livesManager;
        this.characterManager = managers.characterManager;
        this.enemySpawnManager = managers.enemySpawnManager;
        this.weaponManager = managers.weaponManager;
        this.itemPickupManager = managers.itemPickupManager;
        this.eventManager = managers.eventManager;
        this.audioManager = managers.audioManager;
        this.levelInitializationManager = managers.levelInitializationManager;
        this.worldManager = managers.worldManager;
        this.uiManager = managers.uiManager;
        
        console.log('🔄 LevelTransitionManager initialized with manager references');
    }
    
    // ========================================
    // MAIN TRANSITION METHOD
    // ========================================
    
    async transitionToLevel(levelId, fadeDuration = 1000) {
        if (this.isTransitioning) {
            this.debugWarn('Transition already in progress, ignoring request');
            return;
        }
        
        // Validate levelId
        if (!levelId) {
            this.debugError('Invalid levelId provided for transition');
            return;
        }
        
        this.isTransitioning = true;
        this.debugLog(`=== STARTING TRANSITION TO LEVEL ${levelId} ===`);
        this.debugLog(`Current player position: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
        this.debugLog(`Current camera scroll: (${this.scene.cameras.main.scrollX}, ${this.scene.cameras.main.scrollY})`);
        
        // Log current spawn point (from old level) for reference
        const oldSpawnPoint = this.worldManager ? this.worldManager.getSpawnPoint() : null;
        if (oldSpawnPoint) {
            this.debugLog(`Current spawn point (old level): (${oldSpawnPoint.x}, ${oldSpawnPoint.y})`);
        }
        
        try {
            // Phase 1: Preserve & Cleanup
            this.debugLog('--- PHASE 1: PRESERVE & CLEANUP ---');
            await this.phase1_PreserveAndCleanup(fadeDuration);
            
            // Phase 2: Load New Level
            this.debugLog('--- PHASE 2: LOAD NEW LEVEL ---');
            await this.phase2_LoadNewLevel(levelId);
            
            // Phase 3: Restore & Setup
            this.debugLog('--- PHASE 3: RESTORE & SETUP ---');
            await this.phase3_RestoreAndSetup(levelId, fadeDuration);
            
            this.debugLog(`=== TRANSITION TO LEVEL ${levelId} COMPLETE ===`);
            this.debugLog(`Final player position: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
            this.debugLog(`Final camera scroll: (${this.scene.cameras.main.scrollX}, ${this.scene.cameras.main.scrollY})`);
        } catch (error) {
            this.debugError('Error during level transition:', error);
            console.error('Full error:', error);
            // Fallback to scene restart if transition fails
            this.scene.scene.restart({
                character: this.preservedState?.activeCharacter || this.scene.selectedCharacter || 'tireek',
                levelId: levelId
            });
        } finally {
            this.isTransitioning = false;
        }
    }
    
    // ========================================
    // PHASE 1: PRESERVE & CLEANUP
    // ========================================
    
    async phase1_PreserveAndCleanup(fadeDuration) {
        this.debugLog('Phase 1: Preserving state and cleaning up...');
        this.debugLog(`Player before preserve: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
        
        // Disable input during transition
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = true;
            this.debugLog('Input disabled');
        }
        
        // Disable physics updates during transition
        if (this.scene.playerPhysicsManager) {
            this.scene.playerPhysicsManager.disabled = true;
            this.debugLog('Physics manager disabled');
        }
        
        // Stop player movement immediately
        if (this.scene.player && this.scene.player.body) {
            this.scene.player.body.setVelocity(0, 0);
            this.scene.player.body.setAcceleration(0, 0);
            this.debugLog('Player velocity and acceleration cleared');
        }
        
        // Preserve current state
        this.preserveState();
        
        // Fade out camera
        const camera = this.scene.cameras.main;
        this.debugLog(`Fading out camera (duration: ${fadeDuration}ms)`);
        camera.fadeOut(fadeDuration, 0, 0, 0);
        
        // Wait for fade out to complete
        await new Promise((resolve) => {
            camera.once('camerafadeoutcomplete', () => {
                this.debugLog('Fade out complete');
                resolve();
            });
        });
        
        // Cleanup previous level
        this.debugLog('Cleaning up previous level...');
        this.cleanupPreviousLevel();
        
        // Stop all audio (with null checks)
        if (this.audioManager) {
            try {
                // Stop background music without fade (faster during transition)
                if (this.audioManager.currentBackgroundMusic) {
                    this.debugLog('Stopping background music');
                    this.audioManager.stopBackgroundMusic(false);
                } else {
                    this.debugLog('No background music to stop');
                }
            } catch (error) {
                this.debugWarn('Error stopping background music:', error);
            }
            
            try {
                this.debugLog('Stopping ambiance');
                this.audioManager.stopAmbiance();
            } catch (error) {
                this.debugWarn('Error stopping ambiance:', error);
            }
        }
        
        this.debugLog('Phase 1 complete');
    }
    
    // ========================================
    // PHASE 2: LOAD NEW LEVEL
    // ========================================
    
    async phase2_LoadNewLevel(levelId) {
        this.debugLog(`Phase 2: Loading level ${levelId}...`);
        this.debugLog(`Current selectedLevelId: ${this.scene.selectedLevelId}`);
        
        // Update selected level ID
        this.scene.selectedLevelId = levelId;
        this.debugLog(`Updated selectedLevelId to: ${levelId}`);
        
        // Initialize level via LevelInitializationManager
        this.debugLog('Calling levelInitializationManager.initializeLevel...');
        await new Promise((resolve) => {
            this.levelInitializationManager.initializeLevel(
                levelId,
                () => {
                    this.debugLog('Level initialization callback fired');
                    resolve();
                }
            );
        });
        
        // CRITICAL: Reset camera scroll position immediately after level loads
        // This prevents the old camera position from the previous level from affecting the new level
        // We do this BEFORE onLevelInitializationComplete to ensure clean state
        const spawnPointAfterLoad = this.worldManager.getSpawnPoint();
        this.debugLog(`Resetting camera scroll position after level load. Spawn point: (${spawnPointAfterLoad.x}, ${spawnPointAfterLoad.y})`);
        this.debugLog(`Camera scroll before reset: (${this.scene.cameras.main.scrollX}, ${this.scene.cameras.main.scrollY})`);
        
        // Stop camera follow to prevent interference
        this.scene.cameras.main.stopFollow();
        
        // Calculate camera target X based on new level's spawn point and world bounds
        const worldBounds = this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds 
            ? this.scene.physics.world.bounds 
            : { x: 0, width: 1200 };
        const minCameraX = worldBounds.x;
        const maxCameraX = worldBounds.x + worldBounds.width - this.scene.cameras.main.width;
        const cameraTargetX = Math.max(minCameraX, Math.min(maxCameraX, spawnPointAfterLoad.x - this.scene.cameras.main.width / 2));
        
        // Reset camera scroll to spawn point
        this.scene.cameras.main.setScroll(cameraTargetX, 0);
        this.debugLog(`Camera scroll reset to: (${this.scene.cameras.main.scrollX}, ${this.scene.cameras.main.scrollY})`);
        
        // Call onLevelInitializationComplete to finish setup
        // This is normally called from GameScene.create(), but during transitions
        // we need to call it manually
        if (this.scene.onLevelInitializationComplete) {
            this.debugLog('Calling onLevelInitializationComplete...');
            const oldPlayer = this.scene.player;
            this.debugLog(`Player before onLevelInitializationComplete: ${oldPlayer ? `(${oldPlayer.x}, ${oldPlayer.y})` : 'null'}`);
            
            this.scene.onLevelInitializationComplete();
            
            // CRITICAL: Update player reference immediately after character creation
            // The old player from level 1 might still be referenced
            if (this.characterManager) {
                const newPlayer = this.characterManager.getActiveCharacter();
                this.debugLog(`CharacterManager active character: ${newPlayer ? `(${newPlayer.x}, ${newPlayer.y})` : 'null'}`);
                this.debugLog(`Scene.player reference: ${this.scene.player ? `(${this.scene.player.x}, ${this.scene.player.y})` : 'null'}`);
                
                if (newPlayer && newPlayer !== this.scene.player) {
                    this.debugLog(`⚠️ Player reference mismatch! Updating...`);
                    this.debugLog(`  Old player: ${this.scene.player ? `(${this.scene.player.x}, ${this.scene.player.y})` : 'null'}`);
                    this.debugLog(`  New player: (${newPlayer.x}, ${newPlayer.y})`);
                    this.scene.player = newPlayer;
                    this.scene.selectedCharacter = this.characterManager.getActiveCharacterName();
                    this.scene.currentCharacterConfig = this.characterManager.currentCharacterConfig;
                    this.debugLog(`  ✅ Player reference updated`);
                } else if (newPlayer === this.scene.player) {
                    this.debugLog(`✓ Player reference is correct`);
                } else {
                    this.debugWarn(`⚠️ No new player found from characterManager!`);
                }
            } else {
                this.debugWarn('CharacterManager not available');
            }
        } else {
            this.debugWarn('onLevelInitializationComplete method not found on scene');
        }
        
        // Wait a bit for everything to settle
        this.debugLog('Waiting 50ms for systems to settle...');
        await new Promise((resolve) => {
            this.scene.time.delayedCall(50, () => {
                this.debugLog('Settle delay complete');
                resolve();
            });
        });
        
        // CRITICAL: Lock player position immediately after Phase 2
        // Something is moving the player between Phase 2 and Phase 3
        const spawnPoint = this.worldManager.getSpawnPoint();
        const playerAfterPhase2 = this.scene.player;
        if (playerAfterPhase2) {
            const playerX = playerAfterPhase2.x;
            const playerY = playerAfterPhase2.y;
            this.debugLog(`Phase 2 complete. Player at: (${playerX}, ${playerY})`);
            
            // If player moved away from spawn, force it back
            if (Math.abs(playerX - spawnPoint.x) > 10) {
                this.debugWarn(`⚠️ Player moved during Phase 2! Was at spawn (379), now at (${playerX}). Forcing back to spawn.`);
                playerAfterPhase2.x = spawnPoint.x;
                playerAfterPhase2.y = spawnPoint.y;
                playerAfterPhase2.setPosition(spawnPoint.x, spawnPoint.y);
                playerAfterPhase2.setVelocity(0, 0);
                if (playerAfterPhase2.body) {
                    playerAfterPhase2.body.x = spawnPoint.x;
                    playerAfterPhase2.body.y = spawnPoint.y;
                    playerAfterPhase2.body.reset(spawnPoint.x, spawnPoint.y);
                    playerAfterPhase2.body.setVelocity(0, 0);
                    playerAfterPhase2.body.setAcceleration(0, 0);
                }
                this.debugLog(`Player forced back to spawn: (${playerAfterPhase2.x}, ${playerAfterPhase2.y})`);
            }
        }
    }
    
    // ========================================
    // PHASE 3: RESTORE & SETUP
    // ========================================
    
    async phase3_RestoreAndSetup(levelId, fadeDuration) {
        this.debugLog('Phase 3: Restoring state and setting up new level...');
        this.debugLog(`Player before restore: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
        
        // Log spawn point at start of Phase 3 to verify it's correct for new level
        const spawnPointPhase3Start = this.worldManager.getSpawnPoint();
        this.debugLog(`Spawn point at Phase 3 start: (${spawnPointPhase3Start.x}, ${spawnPointPhase3Start.y})`);
        this.debugLog(`Camera scroll at Phase 3 start: (${this.scene.cameras.main.scrollX}, ${this.scene.cameras.main.scrollY})`);
        
        // Disable checkpoint checking during transition
        if (this.scene.checkpointManager) {
            this.scene.checkpointManager.isTransitioning = true;
            this.debugLog('Checkpoint checking disabled');
        }
        
        // Restore preserved state (this may switch characters)
        this.debugLog('Restoring preserved state...');
        this.restoreState();
        this.debugLog(`Player after restore: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
        
        // CRITICAL: Position player at spawn point AFTER state restoration
        // This ensures we're positioning the correct active character
        this.debugLog('Positioning player at spawn point...');
        const spawnPointBeforePosition = this.worldManager.getSpawnPoint();
        this.debugLog(`Spawn point before positioning: (${spawnPointBeforePosition.x}, ${spawnPointBeforePosition.y})`);
        this.positionPlayerAtSpawn();
        
        // Wait a frame to ensure position is set
        this.debugLog('Waiting 10ms for position to settle...');
        await new Promise((resolve) => {
            this.scene.time.delayedCall(10, () => {
                resolve();
            });
        });
        
        // Verify player position is correct
        const spawnPoint = this.worldManager.getSpawnPoint();
        const currentPlayer = this.scene.player;
        this.debugLog(`Position verification: player at (${currentPlayer?.x || 'N/A'}, ${currentPlayer?.y || 'N/A'}), spawn at (${spawnPoint.x}, ${spawnPoint.y})`);
        this.debugLog(`Spawn point retrieved for verification: (${spawnPoint.x}, ${spawnPoint.y})`);
        
        if (currentPlayer && Math.abs(currentPlayer.x - spawnPoint.x) > 10) {
            this.debugWarn(`⚠️ Player position incorrect after positioning! Player at ${currentPlayer.x}, spawn at ${spawnPoint.x}. Forcing reset.`);
            currentPlayer.setPosition(spawnPoint.x, spawnPoint.y);
            currentPlayer.setVelocity(0, 0);
            if (currentPlayer.body) {
                currentPlayer.body.reset(spawnPoint.x, spawnPoint.y);
                currentPlayer.body.setVelocity(0, 0);
            }
            this.debugLog(`Position after force reset: (${currentPlayer.x}, ${currentPlayer.y})`);
        }
        
        // Position camera at spawn point (after player is positioned)
        this.debugLog('Positioning camera at spawn point...');
        this.positionCameraAtSpawn();
        
        // Setup new level audio
        this.debugLog('Setting up new level audio...');
        await this.setupNewLevelAudio(levelId);
        
        // Setup enemy spawner with new level config
        this.debugLog('Setting up enemy spawner...');
        await this.setupEnemySpawner(levelId);
        
        // Final position verification and reset
        this.debugLog('Performing final position verification...');
        const finalSpawnPoint = this.worldManager.getSpawnPoint();
        this.debugLog(`Final spawn point retrieved: (${finalSpawnPoint.x}, ${finalSpawnPoint.y})`);
        const finalPlayer = this.scene.player;
        if (finalPlayer) {
            const finalPlayerX = finalPlayer.x;
            const finalPlayerY = finalPlayer.y;
            this.debugLog(`Final check: player at (${finalPlayerX}, ${finalPlayerY}), spawn at (${finalSpawnPoint.x}, ${finalSpawnPoint.y})`);
            this.debugLog(`Position difference: X=${Math.abs(finalPlayerX - finalSpawnPoint.x)}, Y=${Math.abs(finalPlayerY - finalSpawnPoint.y)}`);
            
            if (Math.abs(finalPlayerX - finalSpawnPoint.x) > 10) {
                this.debugWarn(`⚠️ FINAL POSITION CHECK FAILED! Player at ${finalPlayerX}, spawn at ${finalSpawnPoint.x}. Forcing reset.`);
                finalPlayer.x = finalSpawnPoint.x;
                finalPlayer.y = finalSpawnPoint.y;
                finalPlayer.setPosition(finalSpawnPoint.x, finalSpawnPoint.y);
                finalPlayer.setVelocity(0, 0);
                if (finalPlayer.body) {
                    finalPlayer.body.x = finalSpawnPoint.x;
                    finalPlayer.body.y = finalSpawnPoint.y;
                    finalPlayer.body.reset(finalSpawnPoint.x, finalSpawnPoint.y);
                    finalPlayer.body.setVelocity(0, 0);
                    finalPlayer.body.setAcceleration(0, 0);
                }
                this.debugLog(`Position after final reset: (${finalPlayer.x}, ${finalPlayer.y})`);
            } else {
                this.debugLog(`✓ Final position verified: Player correctly at spawn`);
            }
        } else {
            this.debugWarn('⚠️ No player found for final position check!');
        }
        
        // Re-enable checkpoint checking
        if (this.scene.checkpointManager) {
            this.scene.checkpointManager.isTransitioning = false;
            this.debugLog('Checkpoint checking re-enabled');
        }
        
        // Re-enable input
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
            this.debugLog('Input re-enabled');
        }
        
        // Re-enable physics updates
        if (this.scene.playerPhysicsManager) {
            this.scene.playerPhysicsManager.disabled = false;
            this.debugLog('Physics manager re-enabled');
        }
        
        // CRITICAL: Ensure player is still at spawn point before re-enabling systems
        const finalSpawnCheck = this.worldManager.getSpawnPoint();
        if (finalSpawnCheck && this.scene.player && Math.abs(this.scene.player.x - finalSpawnCheck.x) > 10) {
            this.debugWarn(`⚠️ Final spawn check failed! Player at (${this.scene.player.x}, ${this.scene.player.y}), spawn at (${finalSpawnCheck.x}, ${finalSpawnCheck.y})`);
            this.scene.player.x = finalSpawnCheck.x;
            this.scene.player.y = finalSpawnCheck.y;
            this.scene.player.setPosition(finalSpawnCheck.x, finalSpawnCheck.y);
            if (this.scene.player.body) {
                this.scene.player.body.x = finalSpawnCheck.x;
                this.scene.player.body.y = finalSpawnCheck.y;
                this.scene.player.body.reset(finalSpawnCheck.x, finalSpawnCheck.y);
                this.scene.player.body.setVelocity(0, 0);
                this.scene.player.body.setAcceleration(0, 0);
            }
            this.debugLog(`Final position corrected to: (${this.scene.player.x}, ${this.scene.player.y})`);
        }
        
        // Check for events that should trigger immediately (after player is positioned)
        if (this.scene.eventManager && this.scene.player) {
            this.debugLog('Scheduling event trigger check in 50ms...');
            // Small delay to ensure everything is settled
            this.scene.time.delayedCall(50, () => {
                this.debugLog('Checking for events that should trigger immediately...');
                this.scene.eventManager.checkInitialTriggers();
            });
        }
        
        // Fade in camera
        const camera = this.scene.cameras.main;
        this.debugLog(`Fading in camera (duration: ${fadeDuration}ms)`);
        camera.fadeIn(fadeDuration, 0, 0, 0);
        
        this.debugLog('Phase 3 complete, transition finished');
    }
    
    // ========================================
    // STATE PRESERVATION
    // ========================================
    
    preserveState() {
        this.debugLog('Preserving game state...');
        
        const currentPlayer = this.scene.player;
        this.debugLog(`Current player: ${currentPlayer ? `(${currentPlayer.x}, ${currentPlayer.y})` : 'null'}`);
        this.debugLog(`Current active character: ${this.characterManager ? this.characterManager.getActiveCharacterName() : 'N/A'}`);
        
        this.preservedState = {
            lives: this.livesManager ? this.livesManager.getLives() : 3,
            score: this.scene.playerScore || 0,
            activeCharacter: this.characterManager ? this.characterManager.getActiveCharacterName() : 'tireek',
            characterHealth: {}
        };
        
        // Preserve health for both characters
        if (this.characterManager) {
            Object.keys(this.characterManager.characters).forEach(charName => {
                const charData = this.characterManager.characters[charName];
                this.preservedState.characterHealth[charName] = {
                    health: charData.health,
                    maxHealth: charData.maxHealth
                };
            });
        }
        
        this.debugLog('State preserved:', {
            lives: this.preservedState.lives,
            score: this.preservedState.score,
            activeCharacter: this.preservedState.activeCharacter,
            health: this.preservedState.characterHealth
        });
    }
    
    restoreState() {
        if (!this.preservedState) {
            this.debugWarn('No preserved state to restore');
            return;
        }
        
        this.debugLog('Restoring game state...');
        this.debugLog(`Player before restore: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
        
        // Restore lives
        if (this.livesManager) {
            this.debugLog(`Restoring lives: ${this.preservedState.lives}`);
            this.livesManager.setLives(this.preservedState.lives);
            if (this.uiManager) {
                this.uiManager.updateLivesDisplay(this.preservedState.lives);
            }
        }
        
        // Restore score
        if (this.scene) {
            this.debugLog(`Restoring score: ${this.preservedState.score}`);
            this.scene.playerScore = this.preservedState.score;
            if (this.uiManager) {
                this.uiManager.updateScoreDisplay(this.preservedState.score);
            }
        }
        
        // Restore character health
        if (this.characterManager && this.preservedState.characterHealth) {
            this.debugLog('Restoring character health...');
            Object.keys(this.preservedState.characterHealth).forEach(charName => {
                const savedHealth = this.preservedState.characterHealth[charName];
                const charData = this.characterManager.characters[charName];
                
                if (charData) {
                    const oldHealth = charData.health;
                    // Set health directly (heal won't work if health is higher than max)
                    charData.health = Math.min(savedHealth.health, savedHealth.maxHealth);
                    charData.maxHealth = savedHealth.maxHealth;
                    this.debugLog(`  ${charName}: ${oldHealth} -> ${charData.health}/${charData.maxHealth}`);
                }
            });
            
            // Update UI with restored health
            if (this.uiManager) {
                const activeChar = this.characterManager.getActiveCharacterData();
                this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
                this.uiManager.updateDualCharacterHealth(
                    this.characterManager.characters.tireek.health,
                    this.characterManager.characters.tryston.health,
                    this.characterManager.getActiveCharacterName()
                );
            }
        }
        
        // Switch to saved active character if different
        if (this.characterManager && this.preservedState.activeCharacter) {
            const currentActive = this.characterManager.getActiveCharacterName();
            this.debugLog(`Current active: ${currentActive}, Preserved active: ${this.preservedState.activeCharacter}`);
            
            if (currentActive !== this.preservedState.activeCharacter) {
                this.debugLog(`⚠️ Character mismatch! Switching to preserved active character: ${this.preservedState.activeCharacter}`);
                this.debugLog(`  Player before switch: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
                
                // Use character manager's switch method to properly update all systems
                const result = this.characterManager.switchCharacter(
                    true, // force switch
                    this.scene.animationManager,
                    this.scene.isJumping || false,
                    this.scene.eventCameraLocked || false
                );
                
                if (result && result.success) {
                    this.debugLog(`  ✓ Character switch successful`);
                    // Update player reference and related systems
                    this.scene.player = result.newPlayer;
                    this.scene.selectedCharacter = result.newCharacter;
                    this.scene.currentCharacterConfig = this.characterManager.currentCharacterConfig;
                    this.debugLog(`  Player after switch: (${this.scene.player.x}, ${this.scene.player.y})`);
                    
                    // CRITICAL: Ensure player is at spawn point after character switch during transition
                    const spawnPoint = this.worldManager.getSpawnPoint();
                    if (spawnPoint && Math.abs(this.scene.player.x - spawnPoint.x) > 10) {
                        this.debugWarn(`  ⚠️ Player position incorrect after switch! Correcting...`);
                        this.debugLog(`    Before correction: (${this.scene.player.x}, ${this.scene.player.y})`);
                        this.scene.player.x = spawnPoint.x;
                        this.scene.player.y = spawnPoint.y;
                        this.scene.player.setPosition(spawnPoint.x, spawnPoint.y);
                        if (this.scene.player.body) {
                            this.scene.player.body.x = spawnPoint.x;
                            this.scene.player.body.y = spawnPoint.y;
                            this.scene.player.body.reset(spawnPoint.x, spawnPoint.y);
                        }
                        this.debugLog(`    After correction: (${this.scene.player.x}, ${this.scene.player.y})`);
                    }
                    
                    // Update animation manager
                    if (this.scene.player) {
                        this.scene.animationManager = new AnimationStateManager(this.scene.player);
                        
                        // Update physics manager
                        if (this.scene.playerPhysicsManager) {
                            this.scene.playerPhysicsManager.player = this.scene.player;
                            this.scene.playerPhysicsManager.animationManager = this.scene.animationManager;
                            this.scene.playerPhysicsManager.setIsJumping(false);
                        }
                        
                        // Update combat manager
                        if (this.scene.combatManager) {
                            this.scene.combatManager.player = this.scene.player;
                            this.scene.combatManager.animationManager = this.scene.animationManager;
                        }
                    }
                } else {
                    this.debugWarn(`  ⚠️ Character switch failed!`);
                }
            } else {
                this.debugLog(`✓ Active character matches preserved state`);
            }
        }
        
        this.debugLog(`State restored. Player at: (${this.scene.player?.x || 'N/A'}, ${this.scene.player?.y || 'N/A'})`);
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    cleanupPreviousLevel() {
        console.log('🔄 Cleaning up previous level...');
        
        // Stop enemy spawning
        if (this.enemySpawnManager) {
            this.enemySpawnManager.isLoading = true;
        }
        if (this.scene) {
            this.scene.isLoading = true;
        }
        
        // Clear events
        if (this.eventManager) {
            this.eventManager.clearEvents();
        }
        
        // Destroy all enemies
        if (this.enemySpawnManager) {
            this.enemySpawnManager.destroyAll();
        }
        
        // Clear all projectiles
        if (this.weaponManager) {
            this.weaponManager.clearAllProjectiles();
        }
        
        // Clear item pickups
        if (this.itemPickupManager) {
            this.itemPickupManager.clearAllPickups();
        }
        
        console.log('🔄 Previous level cleaned up');
    }
    
    // ========================================
    // NEW LEVEL SETUP
    // ========================================
    
    async setupNewLevelAudio(levelId) {
        console.log(`🔄 Setting up audio for level ${levelId}...`);
        
        // Get level config to determine music
        const registry = window.LevelRegistry?.getInstance();
        if (registry) {
            const levelJson = await registry.ensureLevelLoaded(this.scene, levelId);
            if (levelJson && levelJson.audio && this.audioManager) {
                // Start background music if specified
                if (levelJson.audio.music) {
                    this.audioManager.playBackgroundMusic(levelJson.audio.music);
                }
                
                // Start ambiance if specified
                if (levelJson.audio.ambiance) {
                    this.audioManager.startAmbiance(levelJson.audio.ambiance, levelJson.audio.ambianceVolume || 0.15);
                }
            }
        }
    }
    
    async setupEnemySpawner(levelId) {
        console.log(`🔄 Setting up enemy spawner for level ${levelId}...`);
        
        // Get level config for enemy spawn settings
        const registry = window.LevelRegistry?.getInstance();
        if (registry && this.enemySpawnManager) {
            const levelJson = await registry.ensureLevelLoaded(this.scene, levelId);
            if (levelJson && levelJson.enemies) {
                // Update enemy spawner configuration
                const enemyConfig = levelJson.enemies;
                this.enemySpawnManager.maxEnemies = enemyConfig.max || ENEMY_CONFIG.maxEnemiesOnScreen;
                this.enemySpawnManager.enemySpawnInterval = enemyConfig.spawnRate || ENEMY_CONFIG.spawnInterval;
                
                // Re-initialize with new config
                this.enemySpawnManager.initialize({
                    maxEnemies: enemyConfig.max || ENEMY_CONFIG.maxEnemiesOnScreen,
                    spawnInterval: enemyConfig.spawnRate || ENEMY_CONFIG.spawnInterval,
                    isTestMode: this.scene.isTestMode || false,
                    isLoading: false // Enable spawning for new level
                });
                
                // Update references
                if (this.scene.player) {
                    const activeChar = this.characterManager ? this.characterManager.getActiveCharacterData() : null;
                    this.enemySpawnManager.setReferences(
                        this.scene.player,
                        this.scene.streetTopLimit || 350,
                        this.scene.streetBottomLimit || 527,
                        this.scene.eventCameraLocked || false,
                        activeChar ? activeChar.health : 100,
                        activeChar ? activeChar.maxHealth : 100,
                        this.scene.levelManager
                    );
                }
            }
        }
        
        // Re-enable spawning
        if (this.scene) {
            this.scene.isLoading = false;
        }
    }
    
    positionPlayerAtSpawn() {
        this.debugLog('Positioning player at spawn point...');
        
        if (!this.worldManager) {
            this.debugWarn('Cannot position player: worldManager not available');
            return;
        }
        
        const spawnPoint = this.worldManager.getSpawnPoint();
        this.debugLog(`Spawn point retrieved in positionPlayerAtSpawn: (${spawnPoint.x}, ${spawnPoint.y})`);
        this.debugLog(`Current level ID: ${this.scene.selectedLevelId}`);
        
        // Get the current active player (may have changed after state restoration)
        const currentPlayer = this.scene.player;
        if (!currentPlayer) {
            this.debugWarn('Cannot position player: player not available');
            return;
        }
        
        this.debugLog(`Current player position before reset: (${currentPlayer.x}, ${currentPlayer.y})`);
        this.debugLog(`Player sprite active: ${currentPlayer.active}, visible: ${currentPlayer.visible}`);
        
        // Stop camera follow before positioning
        this.scene.cameras.main.stopFollow();
        this.debugLog('Camera follow stopped');
        
        // Reset player position - use multiple methods to ensure it sticks
        this.debugLog('Setting player position via multiple methods...');
        currentPlayer.x = spawnPoint.x;
        currentPlayer.y = spawnPoint.y;
        currentPlayer.setPosition(spawnPoint.x, spawnPoint.y);
        currentPlayer.setVelocity(0, 0);
        this.debugLog(`  After setPosition: (${currentPlayer.x}, ${currentPlayer.y})`);
        
        if (currentPlayer.body) {
            this.debugLog(`  Resetting physics body...`);
            // Disable physics temporarily to prevent updates
            const wasEnabled = currentPlayer.body.enable;
            if (currentPlayer.body.setEnable) {
                currentPlayer.body.setEnable(false);
            }
            
            // Set position multiple ways to ensure it sticks
            currentPlayer.body.x = spawnPoint.x;
            currentPlayer.body.y = spawnPoint.y;
            currentPlayer.body.reset(spawnPoint.x, spawnPoint.y);
            currentPlayer.body.setVelocity(0, 0);
            currentPlayer.body.setAcceleration(0, 0);
            
            // Re-enable physics
            if (currentPlayer.body.setEnable) {
                currentPlayer.body.setEnable(true);
            }
            
            // Verify body position
            const bodyX = currentPlayer.body.x;
            const bodyY = currentPlayer.body.y;
            this.debugLog(`  Body position after reset: (${bodyX}, ${bodyY})`);
            
            // If body position is wrong, force it again
            if (Math.abs(bodyX - spawnPoint.x) > 1 || Math.abs(bodyY - spawnPoint.y) > 1) {
                this.debugWarn(`  ⚠️ Body position incorrect! Forcing correction...`);
                currentPlayer.body.x = spawnPoint.x;
                currentPlayer.body.y = spawnPoint.y;
                currentPlayer.x = spawnPoint.x;
                currentPlayer.y = spawnPoint.y;
                this.debugLog(`  Body position after force: (${currentPlayer.body.x}, ${currentPlayer.body.y})`);
            }
        } else {
            this.debugWarn('  ⚠️ Player body not available!');
        }
        
        // Reset both character sprites if character manager exists
        if (this.characterManager) {
            this.debugLog('Resetting all character sprites...');
            Object.values(this.characterManager.characters).forEach((charData, index) => {
                if (charData.sprite) {
                    const charName = Object.keys(this.characterManager.characters)[index];
                    this.debugLog(`  ${charName}: (${charData.sprite.x}, ${charData.sprite.y}) -> (${spawnPoint.x}, ${spawnPoint.y})`);
                    charData.sprite.x = spawnPoint.x;
                    charData.sprite.y = spawnPoint.y;
                    charData.sprite.setPosition(spawnPoint.x, spawnPoint.y);
                    charData.sprite.setVelocity(0, 0);
                    if (charData.sprite.body) {
                        charData.sprite.body.x = spawnPoint.x;
                        charData.sprite.body.y = spawnPoint.y;
                        charData.sprite.body.reset(spawnPoint.x, spawnPoint.y);
                        charData.sprite.body.setVelocity(0, 0);
                        charData.sprite.body.setAcceleration(0, 0);
                    }
                }
            });
        }
        
        // Final verification
        const finalX = currentPlayer.x;
        const finalY = currentPlayer.y;
        this.debugLog(`✓ Player positioned. Final position: (${finalX}, ${finalY}), spawn: (${spawnPoint.x}, ${spawnPoint.y})`);
        
        if (Math.abs(finalX - spawnPoint.x) > 1 || Math.abs(finalY - spawnPoint.y) > 1) {
            this.debugWarn(`⚠️ Position mismatch detected! Difference: X=${Math.abs(finalX - spawnPoint.x)}, Y=${Math.abs(finalY - spawnPoint.y)}`);
        }
    }
    
    positionCameraAtSpawn() {
        this.debugLog('Positioning camera at spawn point...');
        
        if (!this.worldManager || !this.scene.player) {
            this.debugWarn('Cannot position camera: worldManager or player not available');
            return;
        }
        
        const spawnPoint = this.worldManager.getSpawnPoint();
        const camera = this.scene.cameras.main;
        const currentPlayer = this.scene.player;
        
        this.debugLog(`Camera before positioning: scrollX=${camera.scrollX}, scrollY=${camera.scrollY}`);
        this.debugLog(`Player position: (${currentPlayer.x}, ${currentPlayer.y})`);
        this.debugLog(`Spawn point: (${spawnPoint.x}, ${spawnPoint.y})`);
        
        // Stop camera follow temporarily
        camera.stopFollow();
        this.debugLog('Camera follow stopped');
        
        // Verify player position one more time before positioning camera
        const playerX = currentPlayer.x;
        const playerY = currentPlayer.y;
        if (Math.abs(playerX - spawnPoint.x) > 10) {
            this.debugWarn(`⚠️ Camera positioning: Player position mismatch! Player at ${playerX}, spawn at ${spawnPoint.x}. Forcing reset.`);
            currentPlayer.x = spawnPoint.x;
            currentPlayer.y = spawnPoint.y;
            currentPlayer.setPosition(spawnPoint.x, spawnPoint.y);
            if (currentPlayer.body) {
                currentPlayer.body.x = spawnPoint.x;
                currentPlayer.body.y = spawnPoint.y;
                currentPlayer.body.reset(spawnPoint.x, spawnPoint.y);
            }
            this.debugLog(`Player position after reset: (${currentPlayer.x}, ${currentPlayer.y})`);
        }
        
        // Calculate camera target X, accounting for world bounds
        const worldBounds = this.scene.physics && this.scene.physics.world && this.scene.physics.world.bounds 
            ? this.scene.physics.world.bounds 
            : { x: 0, width: 1200 };
        const minCameraX = worldBounds.x;
        const maxCameraX = worldBounds.x + worldBounds.width - camera.width;
        
        this.debugLog(`World bounds: x=${worldBounds.x}, width=${worldBounds.width}`);
        this.debugLog(`Camera bounds: minX=${minCameraX}, maxX=${maxCameraX}, camera width=${camera.width}`);
        
        // Use actual player position (should be at spawn)
        const targetPlayerX = currentPlayer.x;
        const cameraTargetX = Math.max(minCameraX, Math.min(maxCameraX, targetPlayerX - camera.width / 2));
        
        this.debugLog(`Calculated camera target: ${cameraTargetX} (player at ${targetPlayerX}, camera center offset: ${camera.width / 2})`);
        
        camera.setScroll(cameraTargetX, 0);
        this.debugLog(`Camera positioned: scrollX=${camera.scrollX}, scrollY=${camera.scrollY}`);
        this.debugLog(`Player at: (${currentPlayer.x}, ${currentPlayer.y}), spawn at: (${spawnPoint.x}, ${spawnPoint.y})`);
        
        // Start camera following player (only if not locked by event system)
        if (!this.scene.eventCameraLocked) {
            camera.startFollow(currentPlayer, true, 0.1, 0);
            this.debugLog(`Camera following player at (${Math.round(currentPlayer.x)}, ${Math.round(currentPlayer.y)})`);
        } else {
            this.debugLog('Camera follow disabled (event camera locked)');
        }
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

