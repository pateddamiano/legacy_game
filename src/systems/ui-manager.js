// ========================================
// UI MANAGER
// ========================================
// Centralized UI management system for health bars, debug overlays, and HUD elements
// Handles all visual interface elements and their updates

class UIManager {
    constructor(scene) {
        this.scene = scene;
        
        // UI state
        this.debugMode = false;
        
        // UI elements will be created by methods
        this.healthBarGraphics = null;
        this.debugText = null;
        this.debugGraphics = null;
        this.characterIndicator = null;
        this.characterText = null;
        this.attackIndicator = null;
        this.attackText = null;
        this.scoreText = null;
        this.scoreContainer = null;
        this.scoreMicrophone = null;
        
        // Boss health bar elements
        this.bossHealthBar = null;
        this.bossHealthBarBg = null;
        this.bossHealthBarBorder = null;
        this.bossHealthBarGraphics = null;
        this.bossNameText = null;
        this.bossHealthBarVisible = false;
        this.currentBoss = null;
        
        console.log('🎨 UIManager initialized!');
    }
    
    // ========================================
    // INITIALIZATION METHODS
    // ========================================
    
    initializeUI() {
        // Create debug graphics layer
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(1500); // Below UI but above game objects
        
        // Create debug text
        this.createDebugText();
        
        // Create debug-only UI elements
        this.createDebugUI();
        
        // Create health bar UI
        this.createHealthBar();
        
        // Create score display
        this.createScoreDisplay();
        
        // Create boss health bar (hidden by default)
        this.createBossHealthBar();
    }
    
    createDebugText() {
        // Add visual debug text on screen - positioned below health bar to avoid overlap
        this.debugText = this.scene.add.text(10, 55, 'Debug: OFF (Press D to toggle)', {
            fontSize: '16px',
            fill: '#ff0000',
            backgroundColor: '#ffffff',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setDepth(2000);
        this.debugText.setScrollFactor(0);
        this.debugText.setVisible(false); // Hidden by default
    }
    
    createDebugUI() {
        // Position debug UI elements below health bar and main debug text
        const debugUIStartY = 250; // Start well below health bar
        
        // Character selection indicator (debug only)
        this.characterIndicator = this.scene.add.rectangle(10, debugUIStartY, 200, 40, 0x000080);
        this.characterIndicator.setDepth(2000);
        this.characterIndicator.setScrollFactor(0);
        this.characterIndicator.setOrigin(0, 0);
        this.characterIndicator.setVisible(false); // Hidden by default
        
        this.characterText = this.scene.add.text(15, debugUIStartY + 20, '', {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        this.characterText.setDepth(2001);
        this.characterText.setScrollFactor(0);
        this.characterText.setVisible(false); // Hidden by default
        
        // Attack state indicator (debug only)
        this.attackIndicator = this.scene.add.rectangle(10, debugUIStartY + 50, 150, 30, 0x00ff00);
        this.attackIndicator.setDepth(2000);
        this.attackIndicator.setScrollFactor(0);
        this.attackIndicator.setOrigin(0, 0);
        this.attackIndicator.setVisible(false); // Hidden by default
        
        this.attackText = this.scene.add.text(15, debugUIStartY + 65, 'READY', {
            fontSize: '14px',
            fill: '#000000'
        }).setOrigin(0, 0.5);
        this.attackText.setDepth(2001);
        this.attackText.setScrollFactor(0);
        this.attackText.setVisible(false); // Hidden by default
    }
    
    // ========================================
    // HEALTH BAR SYSTEM
    // ========================================
    
    createHealthBar() {
        // OLD LARGE HEALTH BAR REMOVED - Using only dual character health bars now
        
        // Create dual character health display (small bars for both characters)
        this.createDualCharacterHealthDisplay();
    }
    
    createDualCharacterHealthDisplay() {
        const displayX = 20;
        const displayY = 20; // Top left corner (was 60, moved up since large bar removed)
        const barWidth = 160; // Increased from 120
        const barHeight = 20; // Increased from 15
        const spacing = 10;
        
        // Tireek health bar
        this.tireekHealthBorder = this.scene.add.rectangle(
            displayX, 
            displayY, 
            barWidth + 4, 
            barHeight + 4, 
            0x2a2a2a
        );
        this.tireekHealthBorder.setOrigin(0, 0);
        this.tireekHealthBorder.setDepth(2000);
        this.tireekHealthBorder.setScrollFactor(0);
        
        this.tireekHealthBg = this.scene.add.rectangle(
            displayX + 2, 
            displayY + 2, 
            barWidth, 
            barHeight, 
            0x404040
        );
        this.tireekHealthBg.setOrigin(0, 0);
        this.tireekHealthBg.setDepth(2001);
        this.tireekHealthBg.setScrollFactor(0);
        
        this.tireekHealthGraphics = this.scene.add.graphics();
        this.tireekHealthGraphics.setDepth(2002);
        this.tireekHealthGraphics.setScrollFactor(0);
        
        // Tryston health bar
        this.trystonHealthBorder = this.scene.add.rectangle(
            displayX + barWidth + spacing, 
            displayY, 
            barWidth + 4, 
            barHeight + 4, 
            0x2a2a2a
        );
        this.trystonHealthBorder.setOrigin(0, 0);
        this.trystonHealthBorder.setDepth(2000);
        this.trystonHealthBorder.setScrollFactor(0);
        
        this.trystonHealthBg = this.scene.add.rectangle(
            displayX + barWidth + spacing + 2, 
            displayY + 2, 
            barWidth, 
            barHeight, 
            0x404040
        );
        this.trystonHealthBg.setOrigin(0, 0);
        this.trystonHealthBg.setDepth(2001);
        this.trystonHealthBg.setScrollFactor(0);
        
        this.trystonHealthGraphics = this.scene.add.graphics();
        this.trystonHealthGraphics.setDepth(2002);
        this.trystonHealthGraphics.setScrollFactor(0);
        
        // Character labels
        this.tireekLabel = this.scene.add.text(displayX + 5, displayY - 25, 'TIREEK', {
            fontSize: '14px', // Increased from 12px
            fill: '#FFD700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });
        this.tireekLabel.setDepth(2003);
        this.tireekLabel.setScrollFactor(0);
        
        this.trystonLabel = this.scene.add.text(displayX + barWidth + spacing + 5, displayY - 25, 'TRYSTON', {
            fontSize: '14px', // Increased from 12px
            fill: '#FFD700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });
        this.trystonLabel.setDepth(2003);
        this.trystonLabel.setScrollFactor(0);
        
        // Store dimensions for updates
        this.dualBarWidth = barWidth;
        this.dualBarHeight = barHeight;
        this.tireekBarX = displayX + 2;
        this.tireekBarY = displayY + 2;
        this.trystonBarX = displayX + barWidth + spacing + 2;
        this.trystonBarY = displayY + 2;
    }
    
    updateHealthBar(currentHealth, maxHealth) {
        // OLD LARGE HEALTH BAR REMOVED - Using only dual character health bars now
        // This method is kept for compatibility but does nothing
    }
    
    updateDualCharacterHealth(tireekHealth, trystonHealth, activeCharacter) {
        // Update Tireek health bar
        this.updateCharacterHealthBar(this.tireekHealthGraphics, tireekHealth, 100, 
            this.tireekBarX, this.tireekBarY, this.dualBarWidth, this.dualBarHeight,
            activeCharacter === 'tireek');
        
        // Update Tryston health bar
        this.updateCharacterHealthBar(this.trystonHealthGraphics, trystonHealth, 100,
            this.trystonBarX, this.trystonBarY, this.dualBarWidth, this.dualBarHeight,
            activeCharacter === 'tryston');
        
        // Update labels to show active character
        if (activeCharacter === 'tireek') {
            this.tireekLabel.setStyle({ fill: '#FFD700', fontWeight: 'bold' });
            this.trystonLabel.setStyle({ fill: '#888888', fontWeight: 'normal' });
        } else {
            this.tireekLabel.setStyle({ fill: '#888888', fontWeight: 'normal' });
            this.trystonLabel.setStyle({ fill: '#FFD700', fontWeight: 'bold' });
        }
    }
    
    updateCharacterHealthBar(graphics, currentHealth, maxHealth, x, y, width, height, isActive) {
        if (!graphics) return;
        
        // Clear previous graphics
        graphics.clear();
        
        // Calculate health percentage
        const healthPercent = currentHealth / maxHealth;
        const currentWidth = width * healthPercent;
        
        // Color based on health and active status
        let healthColor;
        if (isActive) {
            // Active character - brighter colors
            if (healthPercent > 0.6) {
                healthColor = 0xFF8C00; // Bright orange
            } else if (healthPercent > 0.3) {
                healthColor = 0xFF7F00; // Standard orange
            } else {
                healthColor = 0xFF4500; // Dark orange/red
            }
        } else {
            // Inactive character - dimmer colors
            if (healthPercent > 0.6) {
                healthColor = 0xCC7000; // Dimmed orange
            } else if (healthPercent > 0.3) {
                healthColor = 0xCC5F00; // Dimmed orange
            } else {
                healthColor = 0xCC3500; // Dimmed red
            }
        }
        
        // Draw the health bar
        if (currentWidth > 0) {
            // Main health bar fill
            graphics.fillStyle(healthColor);
            graphics.fillRect(x, y, currentWidth, height);
            
            // Add highlight for active character
            if (isActive) {
                graphics.fillStyle(0xffffff, 0.3);
                graphics.fillRect(x, y, currentWidth, height * 0.4);
            }
        }
    }
    
    // ========================================
    // SCORE DISPLAY SYSTEM
    // ========================================
    
    createScoreDisplay() {
        // Create container for score display elements
        this.scoreContainer = this.scene.add.container(this.scene.cameras.main.width - 20, 20);
        this.scoreContainer.setDepth(2003);
        this.scoreContainer.setScrollFactor(0);
        
        // Create the score text first (positioned to the left)
        this.scoreText = this.scene.add.text(-10, 0, '0', {
            fontSize: '32px', // Increased from 24px
            fill: '#FFD700',  // Golden color
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3, // Increased from 2
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 0,
                stroke: false,
                fill: true
            }
        });
        this.scoreText.setOrigin(1, 0.5); // Right-aligned, vertically centered
        
        // Create the golden microphone sprite (positioned to the right of the text)
        this.scoreMicrophone = this.scene.add.sprite(-75, 0, 'goldenMicrophone');
        this.scoreMicrophone.setScale(0.8); // Increased from 0.5 (64x64 image to ~51x51)
        this.scoreMicrophone.setOrigin(0, 0.5); // Left-aligned, vertically centered
        
        // Add both elements to the container
        this.scoreContainer.add([this.scoreMicrophone, this.scoreText]);
        
        console.log('🎤 Score display with golden microphone created');
    }
    
    updateScoreDisplay(score) {
        if (!this.scoreText || !this.scoreContainer) return;
        
        // Update score text (no emoji needed since we have the actual microphone sprite)
        this.scoreText.setText(`${score}`);
        
        // Create a brief pulse effect when score changes (pulse the entire container)
        if (score > 0) {
            this.scene.tweens.add({
                targets: this.scoreContainer,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 150,
                yoyo: true,
                ease: 'Power2'
            });
        }
    }
    
    // ========================================
    // DEBUG SYSTEM
    // ========================================
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.debugText.setVisible(this.debugMode);
        
        // Show/hide debug UI elements
        this.characterIndicator.setVisible(this.debugMode);
        this.characterText.setVisible(this.debugMode);
        this.attackIndicator.setVisible(this.debugMode);
        this.attackText.setVisible(this.debugMode);
        
        if (!this.debugMode) {
            // Clear debug graphics when turning off
            this.debugGraphics.clear();
        }
        
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        return this.debugMode;
    }
    
    updateDebugDisplay(debugData) {
        if (!this.debugMode) return;
        
        const { 
            state, 
            locked, 
            timer, 
            velX, 
            charName, 
            health, 
            maxHealth, 
            enemies, 
            maxEnemies, 
            playerX, 
            playerY,
            tireekHealth,
            trystonHealth
        } = debugData;
        
        this.debugText.setText(`🐛 DEBUG MODE (Press D to toggle)
Active Character: ${charName}
State: ${state} | Locked: ${locked}
Timer: ${timer}ms | VelX: ${velX}
Active Health: ${Math.round(health)}/${maxHealth}
Tireek Health: ${Math.round(tireekHealth || 0)}/100
Tryston Health: ${Math.round(trystonHealth || 0)}/100
Enemies: ${enemies}/${maxEnemies}
Player: (${Math.round(playerX)}, ${Math.round(playerY)})

Controls:
C = Switch Character | K = Clear All Enemies
H = Heal Player | M = Toggle Music | N = Toggle SFX

Legend:
🟢 Green = Player Hitbox
🟠 Orange = Enemy Hitboxes
⭕ Light Green/Orange = Collision Radius
🔴 Red = Active Attack Hitboxes  
🟡 Yellow = Attack Windup (Safe!)
⭕ Gray = Detection Range
⭕ Red = Attack Range
🔵 Blue = Street Boundaries`);
    }
    
    updateAttackIndicator(animationManager) {
        if (!this.debugMode) return;
        
        const currentState = animationManager.currentState;
        const currentLocked = animationManager.animationLocked;
        
        if (currentState === 'attack' || currentLocked) {
            this.attackIndicator.setFillStyle(0xff0000); // Red when attacking
            this.attackText.setText('ATTACKING');
        } else {
            this.attackIndicator.setFillStyle(0x00ff00); // Green when ready
            this.attackText.setText('READY');
        }
    }
    
    updateCharacterDisplay(characterConfig) {
        if (this.characterText) {
            this.characterText.setText(`Character: ${characterConfig.name.toUpperCase()}\nPress C to switch`);
        }
    }
    
    // ========================================
    // DEBUG VISUAL RENDERING
    // ========================================
    
    updateDebugVisuals(debugVisualData) {
        if (!this.debugMode) return;
        
        // Clear previous debug visuals
        this.debugGraphics.clear();
        
        const { 
            player, 
            enemies, 
            streetTopLimit, 
            streetBottomLimit, 
            playerAttackHitbox,
            camera 
        } = debugVisualData;
        
        // Draw street boundaries
        this.debugGraphics.lineStyle(2, 0x0000ff, 0.5);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(0, streetTopLimit);
        this.debugGraphics.lineTo(3600, streetTopLimit);
        this.debugGraphics.moveTo(0, streetBottomLimit);
        this.debugGraphics.lineTo(3600, streetBottomLimit);
        this.debugGraphics.strokePath();
        
        // Draw player hitbox
        this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0x00ff00, 0.8);
        this.debugGraphics.strokeCircle(player.x, player.y, HITBOX_CONFIG.player.bodyRadius);
        
        // Draw player collision radius (lighter)
        this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0x00ff00, HITBOX_CONFIG.debug.bodyCollisionAlpha);
        this.debugGraphics.strokeCircle(player.x, player.y, HITBOX_CONFIG.enemy.playerCollisionRadius);
        
        // Draw player attack hitbox if attacking
        if (playerAttackHitbox) {
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000, 0.9);
            this.debugGraphics.strokeRect(
                playerAttackHitbox.x,
                playerAttackHitbox.y,
                playerAttackHitbox.width,
                playerAttackHitbox.height
            );
        }
        
        // Draw enemy debug visuals
        enemies.forEach(enemy => {
            if (!enemy.sprite || enemy.state === ENEMY_STATES.DEAD) return;
            
            const sprite = enemy.sprite;
            
            // Enemy body collision
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0xffa500, 0.8);
            this.debugGraphics.strokeCircle(sprite.x, sprite.y, HITBOX_CONFIG.enemy.bodyRadius);
            
            // Enemy collision radius with player (lighter)
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0xffa500, HITBOX_CONFIG.debug.bodyCollisionAlpha);
            this.debugGraphics.strokeCircle(sprite.x, sprite.y, HITBOX_CONFIG.enemy.playerCollisionRadius);
            
            // Enemy detection range
            this.debugGraphics.lineStyle(1, 0x888888, 0.3);
            this.debugGraphics.strokeCircle(sprite.x, sprite.y, ENEMY_CONFIG.detectionRange);
            
            // Enemy attack range
            this.debugGraphics.lineStyle(1, 0xff0000, 0.4);
            this.debugGraphics.strokeCircle(sprite.x, sprite.y, ENEMY_CONFIG.attackRange);
            
            // Enemy attack hitbox
            const enemyAttackHitbox = enemy.getAttackHitbox();
            if (enemyAttackHitbox) {
                if (enemy.canDealDamage) {
                    // Red when can deal damage
                    this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000, 0.9);
                } else {
                    // Yellow during windup
                    this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xffff00, 0.7);
                }
                this.debugGraphics.strokeRect(
                    enemyAttackHitbox.x,
                    enemyAttackHitbox.y,
                    enemyAttackHitbox.width,
                    enemyAttackHitbox.height
                );
            }
        });
    }
    
    // ========================================
    // LEVEL DISPLAY METHODS
    // ========================================
    
    updateLevelDisplay(levelIndex, levelName) {
        // LEVEL DISPLAY REMOVED - No longer showing level name on screen
        // Players can see level info in debug mode if needed
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    // Get current UI state
    getUIState() {
        return {
            debugMode: this.debugMode,
            healthBarVisible: this.healthBarGraphics && this.healthBarGraphics.visible
        };
    }
    
    // Show/hide entire UI (useful for cutscenes, etc.)
    setUIVisible(visible) {
        if (this.healthBarBorder) this.healthBarBorder.setVisible(visible);
        if (this.healthBarBg) this.healthBarBg.setVisible(visible);
        if (this.healthBarGraphics) this.healthBarGraphics.setVisible(visible);
        
        // Debug UI stays controlled by debug mode
        if (!this.debugMode) {
            if (this.debugText) this.debugText.setVisible(false);
        }
    }
    
    // ========================================
    // BOSS HEALTH BAR SYSTEM
    // ========================================
    
    createBossHealthBar() {
        const cam = this.scene.cameras.main;
        const barWidth = 400;
        const barHeight = 30;
        const barX = cam.width / 2; // Center horizontally
        const barY = 100; // Below player health bars
        
        // Boss name text
        this.bossNameText = this.scene.add.text(barX, barY - 30, '', {
            fontSize: '24px',
            fill: '#FFD700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.bossNameText.setOrigin(0.5, 0.5);
        this.bossNameText.setDepth(2004);
        this.bossNameText.setScrollFactor(0);
        this.bossNameText.setVisible(false);
        
        // Border
        this.bossHealthBarBorder = this.scene.add.rectangle(
            barX,
            barY,
            barWidth + 6,
            barHeight + 6,
            0x000000
        );
        this.bossHealthBarBorder.setOrigin(0.5, 0.5);
        this.bossHealthBarBorder.setDepth(2003);
        this.bossHealthBarBorder.setScrollFactor(0);
        this.bossHealthBarBorder.setVisible(false);
        
        // Background
        this.bossHealthBarBg = this.scene.add.rectangle(
            barX,
            barY,
            barWidth,
            barHeight,
            0x404040
        );
        this.bossHealthBarBg.setOrigin(0.5, 0.5);
        this.bossHealthBarBg.setDepth(2004);
        this.bossHealthBarBg.setScrollFactor(0);
        this.bossHealthBarBg.setVisible(false);
        
        // Health fill graphics
        this.bossHealthBarGraphics = this.scene.add.graphics();
        this.bossHealthBarGraphics.setDepth(2005);
        this.bossHealthBarGraphics.setScrollFactor(0);
        
        // Store dimensions
        this.bossBarWidth = barWidth;
        this.bossBarHeight = barHeight;
        this.bossBarX = barX;
        this.bossBarY = barY;
        
        console.log('👹 Boss health bar created');
    }
    
    showBossHealthBar(bossName, bossInstance = null) {
        if (!this.bossHealthBarBorder || !this.bossNameText) {
            console.warn('👹 Boss health bar not initialized');
            return;
        }
        
        this.bossHealthBarVisible = true;
        this.currentBoss = bossInstance;
        
        // Show all elements
        this.bossNameText.setText(bossName || 'BOSS');
        this.bossNameText.setVisible(true);
        this.bossHealthBarBorder.setVisible(true);
        this.bossHealthBarBg.setVisible(true);
        
        // Update health bar immediately if boss instance provided
        if (bossInstance) {
            this.updateBossHealthBar(bossInstance.health, bossInstance.maxHealth);
        }
        
        console.log(`👹 Boss health bar shown for: ${bossName}`);
    }
    
    hideBossHealthBar() {
        if (!this.bossHealthBarBorder || !this.bossNameText) {
            return;
        }
        
        this.bossHealthBarVisible = false;
        this.currentBoss = null;
        
        // Hide all elements
        this.bossNameText.setVisible(false);
        this.bossHealthBarBorder.setVisible(false);
        this.bossHealthBarBg.setVisible(false);
        
        // Clear graphics
        if (this.bossHealthBarGraphics) {
            this.bossHealthBarGraphics.clear();
        }
        
        console.log('👹 Boss health bar hidden');
    }
    
    updateBossHealthBar(currentHealth, maxHealth) {
        if (!this.bossHealthBarGraphics || !this.bossHealthBarVisible) {
            return;
        }
        
        // Clear previous graphics
        this.bossHealthBarGraphics.clear();
        
        // Calculate health percentage
        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
        const currentWidth = this.bossBarWidth * healthPercent;
        
        // Color based on health
        let healthColor;
        if (healthPercent > 0.6) {
            healthColor = 0xFF0000; // Bright red
        } else if (healthPercent > 0.3) {
            healthColor = 0xFF4500; // Darker red/orange
        } else {
            healthColor = 0x8B0000; // Dark red
        }
        
        // Draw the health bar fill
        if (currentWidth > 0) {
            // Main health bar fill
            this.bossHealthBarGraphics.fillStyle(healthColor);
            this.bossHealthBarGraphics.fillRect(
                this.bossBarX - this.bossBarWidth / 2,
                this.bossBarY - this.bossBarHeight / 2,
                currentWidth,
                this.bossBarHeight
            );
            
            // Add highlight
            this.bossHealthBarGraphics.fillStyle(0xffffff, 0.3);
            this.bossHealthBarGraphics.fillRect(
                this.bossBarX - this.bossBarWidth / 2,
                this.bossBarY - this.bossBarHeight / 2,
                currentWidth,
                this.bossBarHeight * 0.4
            );
        }
    }
    
    // Cleanup method for scene destruction
    destroy() {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
        if (this.healthBarGraphics) {
            this.healthBarGraphics.destroy();
        }
        if (this.bossHealthBarGraphics) {
            this.bossHealthBarGraphics.destroy();
        }
        
        console.log('🗑️ UIManager destroyed');
    }
}

// Make UIManager available globally
window.UIManager = UIManager;