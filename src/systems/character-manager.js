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
                lastSwitchTime: 0
            },
            tryston: {
                config: TRYSTON_CONFIG,
                health: 100,
                maxHealth: 100,
                sprite: null,
                isActive: false,
                regenRate: 5.0, // Health per second when inactive (increased from 2.0)
                lastSwitchTime: 0
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
    // CHARACTER SWITCHING
    // ========================================
    
    switchCharacter(forceSwitch = false, animationManager, isJumping, eventCameraLocked) {
        // Check cooldown unless forced switch
        const currentTime = this.scene.time.now;
        if (!forceSwitch && currentTime - this.characters[this.selectedCharacter].lastSwitchTime < this.switchCooldown) {
            return false;
        }

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

        // Check if the other character is available (not dead)
        if (this.characters[newChar].health <= 0) {
            return false;
        }

        // Get current player sprite
        const currentPlayer = this.characters[currentChar].sprite;

        // Store current position and state
        const currentX = currentPlayer.x;
        const currentY = currentPlayer.y;
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
        this.characters[currentChar].sprite.setVisible(false);
        this.characters[currentChar].isActive = false;
        this.characters[currentChar].lastSwitchTime = currentTime;

        // Update references immediately for synchronous behavior
        this.selectedCharacter = newChar;
        this.currentCharacterConfig = this.characters[newChar].config;
        const newPlayer = this.characters[newChar].sprite;

        // Position the new character but keep it hidden initially
        newPlayer.x = currentX;
        newPlayer.y = finalY; // Use ground position if was jumping
        newPlayer.setScale(currentScale);
        newPlayer.setFlipX(currentFlipX);
        newPlayer.lastGroundY = finalY; // Set ground position
        if (newPlayer.body) {
            newPlayer.setVelocityX(finalVelX);
            newPlayer.setVelocityY(finalVelY); // Always 0
            // Reset gravity to ensure character is on ground
            if (newPlayer.setGravityY) {
                newPlayer.setGravityY(0);
            }
            if (newPlayer.body) {
                newPlayer.body.velocity.y = 0;
                newPlayer.body.acceleration.y = 0;
            }
        }
        newPlayer.setVisible(false); // Keep hidden during animation

        // Clear any damage tint from previous hit
        newPlayer.clearTint();

        // Spawn tornado effect using EffectSystem
        let animationDuration = 0;
        if (this.scene.effectSystem) {
            const effectResult = this.scene.effectSystem.spawnTornadoEffect(
                currentX,
                currentY,
                currentScale,
                currentPlayer.depth,
                () => {
                    // Animation complete callback
                    // Show new character
                    newPlayer.setVisible(true);
                    this.characters[newChar].isActive = true;
                    this.characters[newChar].lastSwitchTime = currentTime;
                    
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
                }
            );
            animationDuration = effectResult.duration;
        } else {
            // Fallback: instant switch if effectSystem not available
            newPlayer.setVisible(true);
            this.characters[newChar].isActive = true;
            this.characters[newChar].lastSwitchTime = currentTime;
            
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
                charData.health = Math.min(charData.maxHealth, charData.health + regenAmount);
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
        const activeChar = this.characters[this.selectedCharacter];
        console.log(`${this.selectedCharacter} is down!`);
        
        // Check if both characters are down
        const bothDown = this.characters.tireek.health <= 0 && this.characters.tryston.health <= 0;
        
        if (bothDown) {
            console.log("Both characters are down! Game Over!");
            this.handleGameOver(onGameOver);
        } else {
            // Try to switch to the other character
            const switchResult = this.switchCharacter(true, animationManager, isJumping, eventCameraLocked);
            if (!switchResult || !switchResult.success) {
                console.log("Both characters are down!");
                this.handleGameOver(onGameOver);
            }
        }
    }
    
    handleGameOver(onGameOver) {
        console.log("Game Over! Both characters are down!");
        // Add game over effects here later
        // For now, just reset both characters after a delay
        this.scene.time.delayedCall(3000, () => {
            this.characters.tireek.health = this.characters.tireek.maxHealth;
            this.characters.tryston.health = this.characters.tryston.maxHealth;
            if (this.uiManager) {
                this.uiManager.updateHealthBar(this.characters[this.selectedCharacter].health, this.characters[this.selectedCharacter].maxHealth);
            }
            console.log("Both characters respawned!");
            if (onGameOver) {
                onGameOver();
            }
        });
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

