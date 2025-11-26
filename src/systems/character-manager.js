// ========================================
// CHARACTER MANAGER
// ========================================
// Handles dual character system, switching, health regeneration, and character lifecycle

class CharacterManager {
    constructor(scene) {
        this.scene = scene;
        
        // Dual character system
        this.characters = {
            tireek: {
                config: TIREEK_CONFIG,
                health: 100,
                maxHealth: 100,
                sprite: null,
                isActive: true,
                regenRate: 5.0, // Health per second when inactive (increased from 2.0)
                lastSwitchTime: 0,
                autoSwitchAvailable: true // Auto-switch available until used, resets at 80% health
            },
            tryston: {
                config: TRYSTON_CONFIG,
                health: 100,
                maxHealth: 100,
                sprite: null,
                isActive: false,
                regenRate: 5.0, // Health per second when inactive (increased from 2.0)
                lastSwitchTime: 0,
                autoSwitchAvailable: true // Auto-switch available until used, resets at 80% health
            }
        };
        
        this.selectedCharacter = 'tireek';
        this.currentCharacterConfig = TIREEK_CONFIG;
        this.autoSwitchThreshold = 40; // Auto-switch when health drops below 40% (increased from 25% for better responsiveness)
        this.switchCooldown = 500; // 0.5 seconds cooldown between switches (reduced from 2000ms)
        
        // References to other managers (set during initialization)
        this.uiManager = null;
        this.audioManager = null;
        this.animationManager = null;
        this.worldManager = null;
        this.eventCameraLocked = false;
        this.isJumping = false;
        
        // Prevent multiple game over calls
        this.isHandlingGameOver = false;
        
        // Track event that was active when player died (for event respawning)
        this.deathDuringEventId = null;
        
        console.log('👥 CharacterManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(selectedCharacter, selectedLevelId, managers) {
        this.selectedCharacter = selectedCharacter || 'tireek';
        this.selectedLevelId = selectedLevelId || 1;
        
        // Set current character based on selection
        this.currentCharacterConfig = ALL_CHARACTERS.find(char => char.name === this.selectedCharacter) || ALL_CHARACTERS[0];
        
        // Initialize both characters in the dual system
        this.characters.tireek.isActive = (this.selectedCharacter === 'tireek');
        this.characters.tryston.isActive = (this.selectedCharacter === 'tryston');
        
        // Store manager references
        this.uiManager = managers.uiManager;
        this.audioManager = managers.audioManager;
        this.worldManager = managers.worldManager;
        
        console.log(`👥 CharacterManager initialized with starting character: ${this.selectedCharacter}`);
    }
    
    // ========================================
    // CHARACTER CREATION
    // ========================================
    
    createCharacters() {
        console.log('👥 Creating both character sprites...');
        
        // Destroy existing sprites if they exist (e.g., from previous level)
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            if (charData.sprite) {
                console.log(`👥 Destroying existing ${charName} sprite before creating new one`);
                charData.sprite.destroy();
                charData.sprite = null;
            }
        });
        
        // Get spawn point from world manager
        const spawnPoint = this.worldManager.getSpawnPoint();
        
        // Create both character sprites
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            const spriteKey = `${charName}_idle`;
            
            console.log(`🎯 CHARACTER CREATION: Creating ${charName} at spawn point (${spawnPoint.x}, ${spawnPoint.y})`);
            
            // Ensure pixel-art crispness for all animations of this character
            if (charData.config && charData.config.spriteSheets) {
                try {
                    Object.keys(charData.config.spriteSheets).forEach(animKey => {
                        const texKey = `${charName}_${animKey}`;
                        if (this.scene.textures.exists(texKey)) {
                            const tex = this.scene.textures.get(texKey);
                            if (tex && tex.setFilter) {
                                tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
                            }
                        }
                    });
                } catch (e) {}
            }
            
            const sprite = this.scene.physics.add.sprite(Math.round(spawnPoint.x), Math.round(spawnPoint.y), spriteKey);
            console.log(`👥 📊 ${charName} sprite created at: x=${sprite.x}, y=${sprite.y}`);
            
            // Initialize ground tracking for jumps
            sprite.lastGroundY = sprite.y;
            
            // Scale up the player sprite using baseScale from character config
            // Base scale values are: Tireek 6.8322, Tryston 6.534 (these are the original hardcoded values)
            // Now we use baseScale multiplier from config (defaults to 1.0) multiplied by base scale
            const baseScaleValues = { tireek: 6.8322, tryston: 6.534 };
            const baseScale = (baseScaleValues[charName] || 6.5) * (charData.config.baseScale || 1.0);
            sprite.setScale(baseScale);
            
            // Set player physics properties
            sprite.setBounce(0.2);
            sprite.setCollideWorldBounds(true);
            
            // Store character config on sprite
            sprite.characterConfig = charData.config;
            sprite.characterName = charName;
            
            // Set visibility based on active state
            sprite.setVisible(charData.isActive);
            
            // Special handling for level 2: Tireek starts flipped
            if (charName === 'tireek' && this.selectedLevelId === 2) {
                sprite.setFlipX(true);
                console.log(`👥 Tireek flipped for level 2 start`);
            }
            
            // Store sprite reference
            charData.sprite = sprite;
        });
        
        console.log(`👥 Both characters created, active: ${this.selectedCharacter}`);
    }
    
    // ========================================
    // POSITION VALIDATION
    // ========================================
    
    validateCharacterPosition(x, y) {
        // Get current world bounds for validation
        const worldBounds = this.scene.physics?.world?.bounds;
        
        let validX = x;
        let validY = y;
        
        // Only validate world bounds - don't check distance from spawn during normal gameplay
        // Distance validation should only happen during level transitions
        if (worldBounds) {
            // Ensure position is within world bounds
            if (validX < worldBounds.x) {
                console.log(`👥 🔧 VALIDATION: X position ${validX} below world minimum ${worldBounds.x}, clamping`);
                validX = worldBounds.x + 50; // Small buffer
            } else if (validX > worldBounds.x + worldBounds.width) {
                console.log(`👥 🔧 VALIDATION: X position ${validX} above world maximum ${worldBounds.x + worldBounds.width}, clamping`);
                validX = worldBounds.x + worldBounds.width - 50; // Small buffer
            }
        }
        
        return { x: validX, y: validY };
    }
    
    // ========================================
    // CHARACTER SWITCHING
    // ========================================
    
    switchCharacter(forceSwitch = false, animationManager, isJumping, eventCameraLocked) {
        // Check cooldown unless forced switch
        const currentTime = this.scene.time.now;
        const lastAttemptTime = this.characters[this.selectedCharacter].lastSwitchTime || 0;
        
        if (!forceSwitch && currentTime - lastAttemptTime < this.switchCooldown) {
            return false;
        }
        
        // DEBOUNCE: Update last attempt time immediately to prevent rapid retries
        // This prevents multiple switch attempts from a single button press
        this.characters[this.selectedCharacter].lastSwitchTime = currentTime;

        // Only allow switching if not in middle of an action (unless forced)
        if (!forceSwitch && animationManager) {
            const lockAlmostExpired = animationManager.lockTimer && animationManager.lockTimer <= 200;
            const isInAttackAnimation = animationManager.currentState === 'attack' || animationManager.currentState === 'airkick';
            const shouldBlock = (animationManager.animationLocked && isInAttackAnimation && !lockAlmostExpired) ||
                                (isJumping && isInAttackAnimation && !lockAlmostExpired);

            if (shouldBlock) {
                return false;
            }
        }

        // Determine which character to switch to
        const currentChar = this.selectedCharacter;
        const newChar = currentChar === 'tireek' ? 'tryston' : 'tireek';

        // SAFETY CHECK: Ensure we are not switching TO a dead character when forced
        if (forceSwitch && this.characters[newChar].health <= 0) {
             console.error(`🛑 Blocked switch to dead character ${newChar} (HP: ${this.characters[newChar].health})`);
             return { success: false, reason: "target_dead" };
        }

        // Check if the other character is available (not dead)
        if (this.characters[newChar].health <= 0) {
            return false;
        }

        // Get current player sprite
        const currentPlayer = this.characters[currentChar].sprite;
        
        // Log what we're about to do
        console.log(`👥 switchCharacter called: ${currentChar} → ${newChar}`);
        console.log(`👥   Current player sprite position: (${currentPlayer.x}, ${currentPlayer.y})`);
        
        // Check if we're in a level transition - if so, use spawn point instead of current position
        const isLevelTransition = this.scene.levelTransitionManager?.isTransitioning || false;
        let currentX, currentY;
        
        if (isLevelTransition && this.worldManager) {
            // During level transitions, always use spawn point
            const spawnPoint = this.worldManager.getSpawnPoint();
            currentX = spawnPoint.x;
            currentY = spawnPoint.y;
            console.log(`👥   ⚠️ [leveltransition-playerpos] Level transition detected - using spawn point (${currentX}, ${currentY}) instead of current position`);
        } else {
            // Read position from sprite - character switching should always use current position
            currentX = currentPlayer.x;
            currentY = currentPlayer.y;
        }
        const currentScale = currentPlayer.scaleX;
        const currentFlipX = currentPlayer.flipX;
        const currentVelX = (currentPlayer.body && currentPlayer.body.velocity) ? currentPlayer.body.velocity.x : 0;
        const currentVelY = (currentPlayer.body && currentPlayer.body.velocity) ? currentPlayer.body.velocity.y : 0;

        // Check if character is jumping (has upward velocity or is above ground)
        const isCurrentlyJumping = isJumping || (currentVelY < 0) || (currentPlayer.lastGroundY && currentY < currentPlayer.lastGroundY - 10);
        
        // If jumping, use ground position instead of current position
        const groundY = currentPlayer.lastGroundY || currentY;
        const finalY = isCurrentlyJumping ? groundY : currentY;
        
        // If jumping, reset velocities to 0 (don't carry over jump state)
        const finalVelX = isCurrentlyJumping ? 0 : currentVelX;
        const finalVelY = 0; // Always reset vertical velocity on switch

        // Hide current character
        console.log(`👥 Starting character switch: ${currentChar} → ${newChar} (was jumping: ${isCurrentlyJumping})`);
        
        // CRITICAL FIX: Ensure the old character is properly hidden immediately
        // We do this before creating the new one or starting effects to avoid visual glitches
        const oldSprite = this.characters[currentChar].sprite;
        if (oldSprite) {
            oldSprite.setVisible(false);
            oldSprite.setActive(false); // Also set inactive so it doesn't process updates
            if (oldSprite.body) {
                oldSprite.body.enable = false; // Disable physics body
            }
            console.log(`👥 Hidden old character ${currentChar}`);
        }
        
        this.characters[currentChar].isActive = false;

        // Update references immediately for synchronous behavior
        this.selectedCharacter = newChar;
        this.currentCharacterConfig = this.characters[newChar].config;
        const newPlayer = this.characters[newChar].sprite;
        
        // Set lastSwitchTime for new character too (prevents immediate switch back)
        this.characters[newChar].lastSwitchTime = currentTime;

        // Position the new character but keep it hidden initially
        // Use calculated position with validation
        const validatedPosition = this.validateCharacterPosition(currentX, finalY);
        const finalPositionX = validatedPosition.x;
        const finalPositionY = validatedPosition.y;
        
        console.log(`👥   Final position for new character: (${finalPositionX}, ${finalPositionY})`);
        
        newPlayer.x = finalPositionX;
        newPlayer.y = finalPositionY;
        newPlayer.setPosition(finalPositionX, finalPositionY);
        newPlayer.setScale(currentScale);
        newPlayer.setFlipX(currentFlipX);
        newPlayer.lastGroundY = finalPositionY; // Set ground position
        
        // CRITICAL: Ensure body is active and enabled for GameScene to use
        newPlayer.setActive(true);
        
        if (newPlayer.body) {
            // Enable physics body immediately so playerPhysicsManager can work
            newPlayer.body.enable = true;
            
            newPlayer.setVelocityX(0); // Always 0 during transitions
            newPlayer.setVelocityY(0); // Always 0
            // Reset gravity to ensure character is on ground
            if (newPlayer.setGravityY) {
                newPlayer.setGravityY(0);
            }
            // CRITICAL: Reset body position properly
            newPlayer.body.x = finalPositionX;
            newPlayer.body.y = finalPositionY;
            newPlayer.body.reset(finalPositionX, finalPositionY);
            newPlayer.body.velocity.x = 0;
            newPlayer.body.velocity.y = 0;
            newPlayer.body.acceleration.x = 0;
            newPlayer.body.acceleration.y = 0;
        }
        newPlayer.setVisible(false); // Keep hidden during animation (but body is active)

        // Clear any damage tint from previous hit
        newPlayer.clearTint();

            // Spawn tornado effect using EffectSystem
            let animationDuration = 0;
            
            // Define callback function separately so we can attach the target property to it
            const onSwitchComplete = () => {
                // Animation complete callback
                // Show new character
                newPlayer.setVisible(true);
                newPlayer.setActive(true); // Re-enable active state
                if (newPlayer.body) {
                    newPlayer.body.enable = true; // Re-enable physics body
                }
                
                // CRITICAL: Mark new character as active in CharacterManager state
                this.characters[newChar].isActive = true;
                this.characters[newChar].lastSwitchTime = currentTime;
                
                // Double check old character is hidden (sometimes race conditions occur)
                const recheckOldSprite = this.characters[currentChar].sprite;
                if (recheckOldSprite && recheckOldSprite.visible) {
                        console.log(`👥 ⚠️ Fixing lingering old character ${currentChar} after switch`);
                        recheckOldSprite.setVisible(false);
                        recheckOldSprite.setActive(false);
                        if (recheckOldSprite.body) recheckOldSprite.body.enable = false;
                }
                
                // CRITICAL: Ensure physics body is fully functional
                if (newPlayer.body) {
                    newPlayer.body.enable = true;
                    newPlayer.setVelocity(0, 0);
                    newPlayer.body.velocity.x = 0;
                    newPlayer.body.velocity.y = 0;
                    newPlayer.body.acceleration.x = 0;
                    newPlayer.body.acceleration.y = 0;
                }
                
                // Reset animation state to idle (in case old character was in attack/airkick)
                if (newPlayer.anims) {
                    const charName = this.characters[newChar].config.name;
                    newPlayer.anims.play(`${charName}_idle`, true);
                }
                
                // Ensure character is on ground and not jumping
                if (newPlayer.body) {
                    newPlayer.setVelocityY(0);
                    if (newPlayer.setGravityY) {
                        newPlayer.setGravityY(0);
                    }
                    newPlayer.body.velocity.y = 0;
                    newPlayer.body.acceleration.y = 0;
                }

                // Update health bar with new character's health
                if (this.uiManager) {
                    this.uiManager.updateHealthBar(this.characters[newChar].health, this.characters[newChar].maxHealth);
                    this.uiManager.updateDualCharacterHealth(
                        this.characters.tireek.health,
                        this.characters.tryston.health,
                        this.selectedCharacter
                    );
                    this.uiManager.updateCharacterDisplay(this.currentCharacterConfig);
                }

                console.log(`🔄 Character switch animation complete: ${this.currentCharacterConfig.name} (${this.characters[newChar].health}/100 HP)`);
            };
            
            // Attach the new player sprite as the target for the effect to follow
            // Note: Even though newPlayer is invisible initially, we want the tornado to follow where it IS (which moves with physics/input)
            onSwitchComplete.target = newPlayer;

            if (this.scene.effectSystem) {
                const effectResult = this.scene.effectSystem.spawnTornadoEffect(
                    finalPositionX,
                    finalPositionY,
                    currentScale,
                    currentPlayer.depth,
                    onSwitchComplete
                );
                animationDuration = effectResult.duration;
            } else {
                // Fallback: instant switch if effectSystem not available
                newPlayer.setVisible(true);
                newPlayer.setActive(true);
                if (newPlayer.body) newPlayer.body.enable = true;
                
                this.characters[newChar].isActive = true;
                this.characters[newChar].lastSwitchTime = currentTime;
                
                // Reset animation state to idle
                if (newPlayer.anims) {
                    const charName = this.characters[newChar].config.name;
                    newPlayer.anims.play(`${charName}_idle`, true);
                }
                
                if (this.uiManager) {
                    this.uiManager.updateHealthBar(this.characters[newChar].health, this.characters[newChar].maxHealth);
                    this.uiManager.updateDualCharacterHealth(
                        this.characters.tireek.health,
                        this.characters.tryston.health,
                        this.selectedCharacter
                    );
                    this.uiManager.updateCharacterDisplay(this.currentCharacterConfig);
                }
            }

        console.log(`🔄 Character switch initiated: ${currentChar} → ${newChar} (animation: ${animationDuration}ms)`);
        return { success: true, newPlayer, newCharacter: newChar };
    }
    
    // ========================================
    // AUTO-SWITCH AVAILABILITY
    // ========================================
    
    canAutoSwitchTo(characterName) {
        const charData = this.characters[characterName];
        if (!charData) return false;
        
        // Character must be alive
        if (charData.health <= 0) return false;
        
        // Character must have at least 80% health to be available for auto-switch
        const healthPercent = (charData.health / charData.maxHealth) * 100;
        return healthPercent >= 80;
    }
    
    useAutoSwitch(characterName) {
        const charData = this.characters[characterName];
        if (!charData) return;
        
        charData.autoSwitchAvailable = false;
        console.log(`🔄 Auto-switch used for ${characterName}. Will reset when health reaches 80%`);
    }
    
    // ========================================
    // HEALTH MANAGEMENT
    // ========================================
    
    update(delta) {
        this.updateHealthRegeneration(delta);
    }
    
    updateHealthRegeneration(delta) {
        // Regenerate health for inactive character
        let didRegenerate = false;

        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            if (!charData.isActive && charData.health < charData.maxHealth && charData.health > 0) {
                // Regenerate health over time
                const regenAmount = (charData.regenRate * delta) / 1000; // Convert to per-second
                const oldHealth = charData.health;
                const oldHealthPercent = (oldHealth / charData.maxHealth) * 100;
                charData.health = Math.min(charData.maxHealth, charData.health + regenAmount);
                const newHealthPercent = (charData.health / charData.maxHealth) * 100;
                
                // Restore auto-switch availability when health reaches 80%
                if (oldHealthPercent < 80 && newHealthPercent >= 80 && !charData.autoSwitchAvailable) {
                    charData.autoSwitchAvailable = true;
                    console.log(`🔄 Auto-switch restored for ${charName} (health reached 80%)`);
                }
                
                // console.log(`💚 ${charName} regenerating: ${oldHealth.toFixed(1)} → ${charData.health.toFixed(1)} HP (+${regenAmount.toFixed(2)})`);
                didRegenerate = true;
            }
        });

        // Update dual character health bars if any regeneration occurred
        if (didRegenerate && this.uiManager) {
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.selectedCharacter
            );
        }
    }
    
    takeDamage(characterName, damage) {
        const charData = this.characters[characterName];
        if (!charData) return;
        
        charData.health = Math.max(0, charData.health - damage);
        
        // Update health bar
        if (this.uiManager) {
            this.uiManager.updateHealthBar(charData.health, charData.maxHealth);
            
            // Update dual character health display
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health, 
                this.characters.tryston.health, 
                this.selectedCharacter
            );
        }
        
        // Play player damage sound effect
        if (this.audioManager) {
            this.audioManager.playPlayerDamage();
        }
        
        console.log(`${characterName} takes ${damage} damage! Health: ${charData.health}/${charData.maxHealth}`);
        
        return charData.health;
    }
    
    heal(characterName, amount) {
        const charData = this.characters[characterName];
        if (!charData) return;
        
        charData.health = Math.min(charData.maxHealth, charData.health + amount);
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.updateHealthBar(charData.health, charData.maxHealth);
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.selectedCharacter
            );
        }
        
        return charData.health;
    }
    
    // ========================================
    // CHARACTER STATE MANAGEMENT
    // ========================================
    
    getActiveCharacter() {
        return this.characters[this.selectedCharacter].sprite;
    }
    
    getActiveCharacterName() {
        return Object.keys(this.characters).find(name => this.characters[name].isActive) || 'tireek';
    }
    
    getActiveCharacterData() {
        return this.characters[this.selectedCharacter];
    }
    
    handleCharacterDown(animationManager, isJumping, eventCameraLocked, onGameOver) {
        // Prevent handling if game over is already being processed
        if (this.isHandlingGameOver) {
            console.log("⚠️ Character down ignored - game over already being handled");
            return;
        }
        
        const activeCharName = this.selectedCharacter;
        const activeCharData = this.characters[activeCharName];
        
        // Explicitly verify health of both characters
        const tireekHealth = this.characters.tireek.health;
        const trystonHealth = this.characters.tryston.health;
        
        console.log(`💀 Handle Character Down: ${activeCharName} (Health: ${activeCharData.health})`);
        console.log(`💀 Status Check: Tireek=${tireekHealth}, Tryston=${trystonHealth}`);

        // 1. Prevent Self-Switching: If the currently active character is actually alive
        if (activeCharData.health > 0) {
            console.warn(`⚠️ Character down aborted: Active character ${activeCharName} is still alive (${activeCharData.health} HP)!`);
            return;
        }
        
        // Check if both characters are down
        const bothDown = tireekHealth <= 0 && trystonHealth <= 0;
        
        if (bothDown) {
            console.log("💀 Both characters are down! Game Over!");
            this.handleGameOver(onGameOver);
        } else {
            // 2. Guaranteed Switch: One character is dead, the other is alive
            // Determine which character is still alive
            const aliveCharacterName = tireekHealth > 0 ? 'tireek' : 'tryston';
            console.log(`❤️ SURVIVOR FOUND: Switching to ${aliveCharacterName} (${this.characters[aliveCharacterName].health} HP)`);

            // Force switch to the alive character, regardless of cooldowns or current animation states
            // We pass 'true' for forceSwitch to bypass checks
            const switchResult = this.switchCharacter(true, animationManager, isJumping, eventCameraLocked);
            
            // 3. Fail-Safe Fallback
            if (!switchResult || !switchResult.success) {
                console.error("CRITICAL: Standard switch failed! Executing MANUAL FORCE SWITCH.");
                
                try {
                    // Manually force the state change to ensure game continues
                    const deadCharName = activeCharName;
                    const deadSprite = this.characters[deadCharName].sprite;
                    const aliveSprite = this.characters[aliveCharacterName].sprite;
                    const currentTime = this.scene.time.now;

                    // Hide dead character
                    if (deadSprite) {
                        deadSprite.setVisible(false);
                        deadSprite.setActive(false);
                        if (deadSprite.body) deadSprite.body.enable = false;
                    }
                    this.characters[deadCharName].isActive = false;

                    // Show and activate alive character
                    this.selectedCharacter = aliveCharacterName;
                    this.currentCharacterConfig = this.characters[aliveCharacterName].config;
                    
                    if (aliveSprite) {
                        // Ensure it's positioned correctly (at dead character's pos)
                        if (deadSprite) {
                            aliveSprite.setPosition(deadSprite.x, deadSprite.y);
                        }
                        
                        aliveSprite.setVisible(true);
                        aliveSprite.setActive(true);
                        if (aliveSprite.body) {
                            aliveSprite.body.enable = true;
                            aliveSprite.body.velocity.x = 0;
                            aliveSprite.body.velocity.y = 0;
                        }
                        
                        // Reset animation
                        if (aliveSprite.anims) {
                            aliveSprite.anims.play(`${aliveCharacterName}_idle`, true);
                        }
                    }
                    
                    this.characters[aliveCharacterName].isActive = true;
                    this.characters[aliveCharacterName].lastSwitchTime = currentTime;

                    // Update UI
                    if (this.uiManager) {
                        this.uiManager.updateHealthBar(this.characters[aliveCharacterName].health, this.characters[aliveCharacterName].maxHealth);
                        this.uiManager.updateDualCharacterHealth(
                            this.characters.tireek.health,
                            this.characters.tryston.health,
                            this.selectedCharacter
                        );
                        this.uiManager.updateCharacterDisplay(this.currentCharacterConfig);
                    }
                    
                    // Update scene references if needed (GameScene usually handles this via update loop or direct ref)
                    // Note: We can't easily update GameScene.player from here if it's just a property, 
                    // but SceneManager usually queries CharacterManager.getActiveCharacter().
                    // However, GameScene often caches 'this.player'.
                    if (this.scene.player && this.scene.player !== aliveSprite) {
                        console.log("Updating scene.player reference from manual switch");
                        this.scene.player = aliveSprite;
                        
                        // Update physics/combat manager refs if they exist on scene
                        if (this.scene.playerPhysicsManager) this.scene.playerPhysicsManager.player = aliveSprite;
                        if (this.scene.combatManager) this.scene.combatManager.player = aliveSprite;
                        if (this.scene.animationManager) this.scene.animationManager.sprite = aliveSprite;

                        // Re-setup camera if needed
                        if (!this.eventCameraLocked && this.scene.cameras && this.scene.cameras.main) {
                            this.scene.cameras.main.startFollow(aliveSprite, true, 0.1, 0);
                        }
                    }
                    
                    console.log("✅ Manual force switch complete");
                    
                } catch (e) {
                    console.error("❌ MANUAL SWITCH CRASHED:", e);
                    // Only if manual switch ALSO crashes do we game over
                    this.handleGameOver(onGameOver);
                }
            }
        }
    }
    
    handleGameOver(onGameOver) {
        // Prevent multiple calls
        if (this.isHandlingGameOver) {
            console.log("⚠️ Game over already being handled, ignoring duplicate call");
            return;
        }
        
        this.isHandlingGameOver = true;
        console.log("Game Over! Both characters are down!");
        
        // Pause game immediately to prevent continued attacks
        this.pauseGameOnDeath();
        
        // Check if we have lives manager and checkpoint manager
        const livesManager = this.scene.livesManager;
        const checkpointManager = this.scene.checkpointManager;
        
        if (!livesManager || !checkpointManager) {
            console.warn("⚠️ LivesManager or CheckpointManager not available, using fallback respawn");
            // Fallback to old behavior
            this.scene.time.delayedCall(3000, () => {
                this.characters.tireek.health = this.characters.tireek.maxHealth;
                this.characters.tryston.health = this.characters.tryston.maxHealth;
                if (this.uiManager) {
                    this.uiManager.updateHealthBar(this.characters[this.selectedCharacter].health, this.characters[this.selectedCharacter].maxHealth);
                }
                this.resumeGameAfterDeath();
                console.log("Both characters respawned!");
                if (onGameOver) {
                    onGameOver();
                }
            });
            return;
        }
        
        // Check current lives (don't lose yet - will lose on respawn)
        const currentLives = livesManager.getLives();
        console.log(`💀 DEATH LOGIC CHECK: Current Lives: ${currentLives}`);
        
        // Determine respawn behavior
        // Changed from > 0 to > 1: when player has 1 life showing, that's the last chance
        if (currentLives > 1) {
            console.log(`💀 DEATH LOGIC: Entering TRY AGAIN path (lives > 1)`);
            // TRY AGAIN PATH: Check if player died during an event (like boss fight or level end)
            // Only track event for Try Again - NOT for Game Over
            this.deathDuringEventId = null;
            if (this.scene.eventManager && this.scene.eventManager.isEventActive()) {
                const activeEvent = this.scene.eventManager.getActiveEvent();
                if (activeEvent && activeEvent.id) {
                    this.deathDuringEventId = activeEvent.id;
                    console.log(`🔄 TRY AGAIN: Death occurred during event: ${this.deathDuringEventId} - will restart event`);
                }
            }
            
            // Show "Try Again" message (life will be lost on respawn)
            if (this.uiManager) {
                this.uiManager.showTryAgainOverlay();
            }
            
            // Play try again sound
            if (this.audioManager) {
                this.audioManager.playTryAgainSound();
            }
            
            // Respawn at last checkpoint (life will be lost when respawning)
            console.log(`❤️ Respawn at checkpoint (${currentLives} lives remaining - will lose one on respawn)`);
            this.scene.time.delayedCall(2000, () => {
                this.respawnAtCheckpoint(checkpointManager, onGameOver, true); // true = lose life on respawn
            });
        } else {
            console.log(`💀 DEATH LOGIC: Entering GAME OVER path (lives <= 1)`);
            // GAME OVER PATH: Full level restart (NOT event restart)
            // Clear any event tracking - we're doing a complete level restart
            this.deathDuringEventId = null;
            console.log('💀 GAME OVER PATH: Will perform full level restart (NOT event restart)');
            
            // Last life - show game over (life counter will show 0 during game over)
            // Lose the final life to bring counter to 0
            const remainingLives = livesManager.loseLife(); // Should be 0 after this
            console.log(`💀 GAME OVER FLOW: Final life lost! Remaining: ${remainingLives}`);
            
            // Update lives display (should show 0 lives)
            if (this.uiManager) {
                this.uiManager.updateLivesDisplay(remainingLives, false); // No flash needed, already at 0
            }
            
            // Show "Game Over" overlay (will be typed out)
            console.log('💀 GAME OVER FLOW: Showing game over overlay');
            if (this.uiManager) {
                this.uiManager.showGameOverOverlay();
            }
            
            // Play game over music
            let gameOverMusic = null;
            if (this.audioManager) {
                console.log('💀 GAME OVER FLOW: Playing game over music');
                gameOverMusic = this.audioManager.playGameOverMusic();
                console.log(`💀 GAME OVER FLOW: Music object received:`, {
                    hasObject: !!gameOverMusic,
                    hasOnMethod: gameOverMusic && typeof gameOverMusic.on === 'function',
                    hasDuration: gameOverMusic && !!gameOverMusic.duration
                });
            }
            
            // Fade in the screen, then start typewriter
            if (this.uiManager) {
                console.log('💀 GAME OVER FLOW: Starting fade in');
                this.uiManager.fadeInGameOverScreen(() => {
                    console.log('💀 GAME OVER FLOW: Fade complete, starting typewriter');
                    // After fade completes, start typewriter
                    this.uiManager.startGameOverTypewriter(() => {
                        // Typewriter complete - music should still be playing
                        console.log('💀 GAME OVER FLOW: Typewriter complete');
                    });
                });
            }
            
            // When music finishes, play voice and then restart
            console.log('💀 GAME OVER FLOW: Setting up music completion handlers');
            if (gameOverMusic) {
                // Use Phaser sound event system - check if sound has on method
                if (typeof gameOverMusic.on === 'function') {
                    console.log('💀 GAME OVER FLOW: Using event-based music completion');
                    // Listen for completion using 'on' (one-time listener)
                    const onComplete = () => {
                        console.log('💀 GAME OVER FLOW: Music finished via event, playing voice');
                        // Remove listener to prevent multiple calls
                        gameOverMusic.off('complete', onComplete);
                        
                        // Play voice after music
                        if (this.audioManager) {
                            this.audioManager.playGameOverVoice();
                        }
                        
                        // Wait a bit for voice to play, then restart level
                        console.log('💀 GAME OVER FLOW: Scheduling level restart in 2000ms');
                        this.scene.time.delayedCall(2000, () => {
                            console.log('💀 GAME OVER FLOW: ⚡ CALLING RESTART LEVEL NOW ⚡');
                            this.restartLevel(onGameOver);
                        });
                    };
                    gameOverMusic.on('complete', onComplete);
                } else if (gameOverMusic.duration) {
                    // Fallback: use duration to calculate when music finishes
                    const musicDuration = gameOverMusic.duration * 1000; // Convert to ms
                    console.log(`💀 GAME OVER FLOW: Using duration-based timing (${musicDuration}ms)`);
                    this.scene.time.delayedCall(musicDuration, () => {
                        console.log('💀 GAME OVER FLOW: Music finished via duration, playing voice');
                        // Play voice after music
                        if (this.audioManager) {
                            this.audioManager.playGameOverVoice();
                        }
                        
                        // Wait a bit for voice to play, then restart level
                        console.log('💀 GAME OVER FLOW: Scheduling level restart in 2000ms');
                        this.scene.time.delayedCall(2000, () => {
                            console.log('💀 GAME OVER FLOW: ⚡ CALLING RESTART LEVEL NOW ⚡');
                            this.restartLevel(onGameOver);
                        });
                    });
                } else {
                    // Fallback if we can't determine duration
                    console.warn('💀 GAME OVER FLOW: Music object invalid, using fallback timing (3000ms)');
                    this.scene.time.delayedCall(3000, () => {
                        console.log('💀 GAME OVER FLOW: Fallback timer triggered, playing voice');
                        if (this.audioManager) {
                            this.audioManager.playGameOverVoice();
                        }
                        console.log('💀 GAME OVER FLOW: Scheduling level restart in 2000ms');
                        this.scene.time.delayedCall(2000, () => {
                            console.log('💀 GAME OVER FLOW: ⚡ CALLING RESTART LEVEL NOW ⚡');
                            this.restartLevel(onGameOver);
                        });
                    });
                }
            } else {
                // Fallback if music doesn't load - wait a bit then restart
                console.warn('💀 GAME OVER FLOW: No music available, using fallback timing (3000ms)');
                this.scene.time.delayedCall(3000, () => {
                    console.log('💀 GAME OVER FLOW: No-music fallback timer triggered, playing voice');
                    if (this.audioManager) {
                        this.audioManager.playGameOverVoice();
                    }
                    console.log('💀 GAME OVER FLOW: Scheduling level restart in 2000ms');
                    this.scene.time.delayedCall(2000, () => {
                        console.log('💀 GAME OVER FLOW: ⚡ CALLING RESTART LEVEL NOW ⚡');
                        this.restartLevel(onGameOver);
                    });
                });
            }
        }
    }
    
    respawnAtCheckpoint(checkpointManager, onGameOver, loseLifeOnRespawn = false) {
        const checkpoint = checkpointManager.getLastCheckpoint();
        if (!checkpoint) {
            console.warn("⚠️ No checkpoint available, using spawn point");
            // Fallback to level spawn from world manager
            if (this.worldManager) {
                const spawnPoint = this.worldManager.getSpawnPoint();
                this.respawnAtPosition(spawnPoint.x, spawnPoint.y, onGameOver, loseLifeOnRespawn);
            } else {
                console.error("⚠️ WorldManager not available - cannot respawn!");
            }
            return;
        }
        
        // Check if death occurred during an event - if so, restart the event
        if (this.deathDuringEventId && this.scene.eventManager) {
            console.log(`🔄 Respawning during event: ${this.deathDuringEventId} - will re-trigger event`);
            this.respawnAtPosition(checkpoint.x, checkpoint.y, onGameOver, loseLifeOnRespawn, this.deathDuringEventId);
        } else {
            this.respawnAtPosition(checkpoint.x, checkpoint.y, onGameOver, loseLifeOnRespawn);
        }
    }
    
    respawnAtPosition(x, y, onGameOver, loseLifeOnRespawn = false, retriggerEventId = null) {
        console.log(`📍 RESPAWN: Starting respawn at position (${x}, ${y}), loseLife: ${loseLifeOnRespawn}, retriggerEvent: ${retriggerEventId || 'none'}`);
        
        // Hide death overlay
        if (this.uiManager) {
            this.uiManager.hideDeathOverlay();
        }
        
        // Lose a life on respawn if requested (with visual flash)
        if (loseLifeOnRespawn && this.scene.livesManager) {
            const remainingLives = this.scene.livesManager.loseLife();
            console.log(`❤️ Life lost on respawn! Remaining: ${remainingLives}`);
            
            // Play try again start sound when life is taken
            if (this.audioManager) {
                this.audioManager.playTryAgainStartSound();
            }
            
            // Update lives display with flash effect for lost life
            if (this.uiManager) {
                this.uiManager.updateLivesDisplay(remainingLives, true); // true = flash the lost life
            }
        }
        
        // Reset game over flag BEFORE doing anything else to prevent race conditions
        this.isHandlingGameOver = false;
        
        // Clear the death event tracking (will be set again if they die in the event)
        const eventToRetrigger = retriggerEventId;
        this.deathDuringEventId = null;
        
        // Restore both characters to full health
        console.log(`📍 RESPAWN: Before health restore - Tireek: ${this.characters.tireek.health}/${this.characters.tireek.maxHealth}, Tryston: ${this.characters.tryston.health}/${this.characters.tryston.maxHealth}`);
        this.characters.tireek.health = this.characters.tireek.maxHealth;
        this.characters.tryston.health = this.characters.tryston.maxHealth;
        console.log(`📍 RESPAWN: After health restore - Tireek: ${this.characters.tireek.health}, Tryston: ${this.characters.tryston.health}`);
        
        // Reset auto-switch availability for both characters
        this.characters.tireek.autoSwitchAvailable = true;
        this.characters.tryston.autoSwitchAvailable = true;
        
        // Clear all enemies
        if (this.scene.enemySpawnManager) {
            this.scene.enemySpawnManager.destroyAll();
        }
        
        // Resume game after respawn
        if (eventToRetrigger) {
            // Event restart: only resume basic systems
            // Event manager will handle all event-specific state (enemies, spawning, etc.)
            console.log(`📍 RESPAWN: Event restart - resuming basic systems only`);
            if (this.scene.physics && this.scene.physics.world) {
                this.scene.physics.world.isPaused = false;
            }
            if (this.scene.inputManager) {
                this.scene.inputManager.disabled = false;
            }
        } else {
            // Normal checkpoint respawn - resume everything
            this.resumeGameAfterDeath();
        }
        
        // Reset both character sprites to checkpoint position
        Object.values(this.characters).forEach(charData => {
            if (charData.sprite) {
                charData.sprite.setPosition(x, y);
                if (charData.sprite.body) {
                    charData.sprite.body.reset(x, y);
                    charData.sprite.body.setVelocity(0, 0);
                }
            }
        });
        
        // Reset active player position
        if (this.scene.player) {
            this.scene.player.x = x;
            this.scene.player.y = y;
            if (this.scene.player.body) {
                this.scene.player.body.reset(x, y);
                this.scene.player.body.setVelocity(0, 0);
            }
        }
        
        // Reset camera to checkpoint position and restart follow
        if (this.scene.cameras && this.scene.cameras.main) {
            const camera = this.scene.cameras.main;
            camera.stopFollow(); // Stop any existing follow
            camera.setScroll(x - camera.width / 2, 0);
            
            // Restart camera follow on player (only if not locked by event system)
            if (!this.scene.eventCameraLocked) {
                const activePlayer = this.getActiveCharacter();
                if (activePlayer) {
                    camera.startFollow(activePlayer, true, 0.1, 0);
                    console.log(`📷 Camera follow restarted on player after respawn`);
                }
            }
        }
        
        // Update health display
        if (this.uiManager) {
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.selectedCharacter
            );
            
            // Force immediate visual update if using futuristic health bar
            // This bypasses the delayed update system to ensure health shows correctly
            // even if timers are cleared (e.g., during event restart)
            if (this.uiManager.futuristicHealthBar) {
                this.uiManager.futuristicHealthBar.characters.tireek.health = this.characters.tireek.health;
                this.uiManager.futuristicHealthBar.characters.tryston.health = this.characters.tryston.health;
                this.uiManager.futuristicHealthBar.updateCardHealth('tireek');
                this.uiManager.futuristicHealthBar.updateCardHealth('tryston');
            }
        }
        
        console.log(`📍 Respawned at checkpoint (${x}, ${y})`);
        
        // Re-trigger event if death occurred during an event (like boss fight)
        if (eventToRetrigger && this.scene.eventManager) {
            console.log(`🎬 Restarting event after respawn: ${eventToRetrigger}`);
            console.log(`📍 RESPAWN: Current health - Tireek: ${this.characters.tireek.health}, Tryston: ${this.characters.tryston.health}`);
            
            // Small delay to ensure player is fully positioned and health is updated before event starts
            this.scene.time.delayedCall(100, () => {
                if (this.scene.eventManager) {
                    console.log(`🎬 About to restart event - Health check - Tireek: ${this.characters.tireek.health}, Tryston: ${this.characters.tryston.health}`);
                    this.scene.eventManager.restartActiveEvent();
                }
            });
        }
        
        if (onGameOver) {
            onGameOver();
        }
    }
    
    restartLevel(onGameOver) {
        console.log('🔄 GAME OVER RESTART: Complete scene teardown starting...');
        
        // Store only what we need to preserve
        // Use startOfLevelScore if available to reset score to what it was at level start
        const preservedScore = (this.scene.startOfLevelScore !== undefined) ? this.scene.startOfLevelScore : 0;
        const startOfLevelScore = preservedScore; // Keep passing it forward
        const currentLevelId = window.gameState?.currentGame?.levelId || 1;
        const currentCharacter = this.selectedCharacter || 'tireek';
        
        console.log(`🔄 Preserving: score=${preservedScore} (start of level), level=${currentLevelId}, char=${currentCharacter}`);
        
        // Clear ALL state that could persist
        this.deathDuringEventId = null;
        this.isHandlingGameOver = false;
        
        if (this.scene.checkpointManager) {
            this.scene.checkpointManager.reset();
        }
        
        if (this.scene.levelTransitionManager) {
            this.scene.levelTransitionManager.preservedState = null;
        }
        
        if (this.uiManager) {
            this.uiManager.hideDeathOverlay();
        }
        
        // Hide the scene first
        this.scene.scene.setVisible(false);
        
        // Complete teardown: STOP then START
        console.log('🔄 GAME OVER RESTART: Stopping scene...');
        this.scene.scene.stop();
        
        console.log('🔄 GAME OVER RESTART: Starting fresh scene...');
        this.scene.scene.start('GameScene', {
            levelId: currentLevelId,
            character: currentCharacter,
            preservedScore: preservedScore,
            startOfLevelScore: startOfLevelScore,
            isGameOverRestart: true  // Flag to prevent event auto-triggering
        });
    }
    
    // ========================================
    // GAME PAUSE/RESUME FOR DEATH
    // ========================================
    
    pauseGameOnDeath() {
        console.log('💀 Pausing game on death');
        
        // Pause physics world
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.isPaused = true;
        }
        
        // Disable input
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = true;
        }
        
        // Pause all enemies
        if (this.scene.enemies && this.scene.enemies.length > 0) {
            this.scene.enemies.forEach((enemy, index) => {
                if (enemy && enemy.sprite && enemy.sprite.body) {
                    // Save velocity
                    if (!enemy.savedVelocityOnDeath) {
                        enemy.savedVelocityOnDeath = {
                            x: enemy.sprite.body.velocity.x,
                            y: enemy.sprite.body.velocity.y
                        };
                    }
                    // Stop physics
                    enemy.sprite.body.setVelocity(0, 0);
                    // Pause AI
                    enemy.deathPaused = true;
                }
            });
        }
        
        // Stop enemy spawning
        if (this.scene.enemySpawnManager) {
            this.scene.enemySpawnManager.setMaxEnemies(0);
        }
    }
    
    resumeGameAfterDeath() {
        console.log('💀 Resuming game after death');
        
        // Reset game over flag
        this.isHandlingGameOver = false;
        
        // Resume physics world
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.isPaused = false;
        }
        
        // Enable input
        if (this.scene.inputManager) {
            this.scene.inputManager.disabled = false;
        }
        
        // Resume all enemies
        if (this.scene.enemies && this.scene.enemies.length > 0) {
            this.scene.enemies.forEach((enemy) => {
                if (enemy && enemy.sprite && enemy.sprite.body) {
                    // Restore velocity if saved
                    if (enemy.savedVelocityOnDeath) {
                        enemy.sprite.body.setVelocity(
                            enemy.savedVelocityOnDeath.x,
                            enemy.savedVelocityOnDeath.y
                        );
                        enemy.savedVelocityOnDeath = null;
                    }
                    // Resume AI
                    enemy.deathPaused = false;
                }
            });
        }
        
        // Resume enemy spawning (restore to previous max if needed)
        // Note: EnemySpawnManager will handle spawning based on level config
        if (this.scene.enemySpawnManager) {
            // Restore maxEnemies from scene or use level config default
            const maxEnemies = this.scene.maxEnemies !== undefined ? this.scene.maxEnemies : 4;
            this.scene.enemySpawnManager.setMaxEnemies(maxEnemies);
            console.log(`💀 Enemy spawning re-enabled: maxEnemies=${maxEnemies}`);
        }
    }
    
    // ========================================
    // RESET / CLEANUP
    // ========================================
    
    resetPlayerState(spawnPoint) {
        // Reset both character sprites to spawn point
        Object.values(this.characters).forEach(charData => {
            if (charData.sprite) {
                charData.sprite.setPosition(spawnPoint.x, spawnPoint.y);
                charData.sprite.setVelocity(0, 0);
                charData.sprite.body.reset(spawnPoint.x, spawnPoint.y);
            }
        });
        
        // Partially restore health (75% of max)
        Object.keys(this.characters).forEach(charName => {
            const charData = this.characters[charName];
            charData.health = Math.min(charData.maxHealth, charData.health + (charData.maxHealth * 0.75));
        });
        
        // Reset auto-switch availability for both characters
        this.characters.tireek.autoSwitchAvailable = true;
        this.characters.tryston.autoSwitchAvailable = true;
        
        // Update UI
        if (this.uiManager) {
            const activeChar = this.characters[this.getActiveCharacterName()];
            this.uiManager.updateHealthBar(activeChar.health, activeChar.maxHealth);
            this.uiManager.updateDualCharacterHealth(
                this.characters.tireek.health,
                this.characters.tryston.health,
                this.getActiveCharacterName()
            );
        }
    }
}

