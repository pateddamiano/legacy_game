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
        const healthBarWidth = 250;
        const healthBarHeight = 25;
        const healthBarX = 20;
        const healthBarY = 20; // Top left position - mobile friendly
        
        // Create outer box container (darker border)
        this.healthBarBorder = this.scene.add.rectangle(
            healthBarX, 
            healthBarY, 
            healthBarWidth + 8, 
            healthBarHeight + 8, 
            0x2a2a2a
        );
        this.healthBarBorder.setOrigin(0, 0);
        this.healthBarBorder.setDepth(2000);
        this.healthBarBorder.setScrollFactor(0);
        
        // Create inner box background (slightly lighter)
        this.healthBarBg = this.scene.add.rectangle(
            healthBarX + 4, 
            healthBarY + 4, 
            healthBarWidth, 
            healthBarHeight, 
            0x404040
        );
        this.healthBarBg.setOrigin(0, 0);
        this.healthBarBg.setDepth(2001);
        this.healthBarBg.setScrollFactor(0);
        
        // Create health bar graphics
        this.healthBarGraphics = this.scene.add.graphics();
        this.healthBarGraphics.setDepth(2002);
        this.healthBarGraphics.setScrollFactor(0);
        
        // Store health bar dimensions for updates
        this.healthBarWidth = healthBarWidth;
        this.healthBarHeight = healthBarHeight;
        this.healthBarX = healthBarX + 4;
        this.healthBarY = healthBarY + 4;
    }
    
    updateHealthBar(currentHealth, maxHealth) {
        if (!this.healthBarGraphics) return;
        
        // Clear previous graphics
        this.healthBarGraphics.clear();
        
        // Calculate health percentage
        const healthPercent = currentHealth / maxHealth;
        const currentWidth = this.healthBarWidth * healthPercent;
        
        // Orange gradient based on health percentage
        let healthColor;
        if (healthPercent > 0.6) {
            // High health: Bright orange
            healthColor = 0xFF8C00;
        } else if (healthPercent > 0.3) {
            // Medium health: Standard orange
            healthColor = 0xFF7F00;
        } else {
            // Low health: Dark orange/red
            healthColor = 0xFF4500;
        }
        
        // Draw the health bar
        if (currentWidth > 0) {
            // Main health bar fill
            this.healthBarGraphics.fillStyle(healthColor);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY,
                currentWidth,
                this.healthBarHeight
            );
            
            // Add a subtle highlight on top for depth
            this.healthBarGraphics.fillStyle(0xffffff, 0.25);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY,
                currentWidth,
                this.healthBarHeight * 0.4
            );
            
            // Add a subtle shadow on bottom for depth
            this.healthBarGraphics.fillStyle(0x000000, 0.15);
            this.healthBarGraphics.fillRect(
                this.healthBarX,
                this.healthBarY + this.healthBarHeight * 0.7,
                currentWidth,
                this.healthBarHeight * 0.3
            );
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
            fontSize: '24px',
            fill: '#FFD700',  // Golden color
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
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
        this.scoreMicrophone = this.scene.add.sprite(-60, 0, 'goldenMicrophone');
        this.scoreMicrophone.setScale(0.5); // Scale down the 64x64 image to 32x32
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
            playerY 
        } = debugData;
        
        this.debugText.setText(`🐛 DEBUG MODE (Press D to toggle)
Character: ${charName}
State: ${state} | Locked: ${locked}
Timer: ${timer}ms | VelX: ${velX}
Health: ${health}/${maxHealth}
Enemies: ${enemies}/${maxEnemies}
Player: (${Math.round(playerX)}, ${Math.round(playerY)})

Controls:
K = Clear All Enemies | H = Heal Player
M = Toggle Music | N = Toggle SFX

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
        // Create or update level display
        if (!this.levelText) {
            this.levelText = this.scene.add.text(10, 80, '', {
                fontSize: '18px',
                fill: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            });
            this.levelText.setDepth(2000);
            this.levelText.setScrollFactor(0);
        }
        
        this.levelText.setText(`Level ${levelIndex + 1}: ${levelName}`);
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
    
    // Cleanup method for scene destruction
    destroy() {
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
        if (this.healthBarGraphics) {
            this.healthBarGraphics.destroy();
        }
        
        console.log('🗑️ UIManager destroyed');
    }
}

// Make UIManager available globally
window.UIManager = UIManager;