// ========================================
// UI MANAGER
// ========================================
// Centralized UI management system for health bars, debug overlays, and HUD elements
// Handles all visual interface elements and their updates

class UIManager {
    constructor(scene, uiScene) {
        this.scene = scene; // Game scene (for logic/data)
        this.uiScene = uiScene || scene; // UI scene (for rendering) - fallback to scene if not provided
        
        // UI state
        this.debugMode = false;
        
        // UI elements will be created by methods
        this.healthBarGraphics = null; // Legacy - kept for compatibility
        this.futuristicHealthBar = null; // New futuristic health bar system
        this.debugText = null;
        this.debugGraphics = null;
        this.characterIndicator = null;
        this.characterText = null;
        this.attackIndicator = null;
        this.attackText = null;
        this.scoreText = null;
        this.scoreContainer = null;
        this.scoreMicrophone = null;
        
        this.currentUiScale = this.uiScene?.uiScale ?? 1;
        this.viewportInfo = this.uiScene?.viewportInfo ?? null;
        
        if (this.uiScene?.events?.on) {
            this.uiScene.events.on('uiScaleChanged', this.handleUiScaleChanged, this);
        }
        
        // Boss health bar elements
        this.bossHealthBar = null;
        this.bossHealthBarBg = null;
        this.bossHealthBarBorder = null;
        this.bossHealthBarGraphics = null;
        this.bossNameText = null;
        this.bossHealthBarVisible = false;
        this.currentBoss = null;
        
        // Lives display elements
        this.livesContainer = null;
        this.livesBox = null;
        this.livesPlusSymbols = [];
        
        // Death overlay elements
        this.deathOverlay = null;
        this.deathOverlayText = null;
        this.deathOverlayFade = null;
        
        // Typewriter effect for game over
        this.gameOverTypewriterTimer = null;
        this.gameOverFullText = '';
        this.gameOverDisplayedText = '';
        this.gameOverCharIndex = 0;
        this.gameOverTypewriterSpeed = 100; // ms per character
        
        // Lives flash animation reference
        this.livesFlashTween = null;
        
        console.log('🎨 UIManager initialized!');
    }
    
    // ========================================
    // INITIALIZATION METHODS
    // ========================================
    
    initializeUI() {
        // Create debug graphics layer - MUST be on GameScene (this.scene) to align with world coordinates
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(1500); // Below UI but above game objects
        
        // Create debug text
        this.createDebugText();
        
        // Create debug-only UI elements
        this.createDebugUI();
        
        // Create health bar UI
        this.createHealthBar();
        
        // Create lives display
        this.createLivesDisplay();
        
        // Create score display
        this.createScoreDisplay();
        
        // Create boss health bar (hidden by default)
        this.createBossHealthBar();
    }
    
    createDebugText() {
        // Add visual debug text on screen - positioned in bottom left corner
        // Use virtual coordinates (1200x720)
        const virtualHeight = 720;
        this.debugText = this.uiScene.add.text(10, virtualHeight - 10, 'Debug: OFF (Press D to toggle)', {
            fontSize: '10px', // Smaller font size
            fill: '#ff0000',
            backgroundColor: '#ffffff',
            padding: { x: 8, y: 4 }
        });
        this.debugText.setOrigin(0, 1); // Anchor to bottom-left
        this.debugText.setDepth(2000);
        this.debugText.setScrollFactor(0);
        this.debugText.setVisible(false); // Hidden by default
    }
    
    createDebugUI() {
        // Position debug UI elements below health bar and main debug text
        const debugUIStartY = 250; // Start well below health bar
        
        // Character selection indicator (debug only)
        this.characterIndicator = this.uiScene.add.rectangle(10, debugUIStartY, 200, 40, 0x000080);
        this.characterIndicator.setDepth(2000);
        this.characterIndicator.setScrollFactor(0);
        this.characterIndicator.setOrigin(0, 0);
        this.characterIndicator.setVisible(false); // Hidden by default
        
        this.characterText = this.uiScene.add.text(15, debugUIStartY + 20, '', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
            fill: '#ffffff'
        }).setOrigin(0, 0.5);
        this.characterText.setDepth(2001);
        this.characterText.setScrollFactor(0);
        this.characterText.setVisible(false); // Hidden by default
        
        // Attack state indicator (debug only)
        this.attackIndicator = this.uiScene.add.rectangle(10, debugUIStartY + 50, 150, 30, 0x00ff00);
        this.attackIndicator.setDepth(2000);
        this.attackIndicator.setScrollFactor(0);
        this.attackIndicator.setOrigin(0, 0);
        this.attackIndicator.setVisible(false); // Hidden by default
        
        this.attackText = this.uiScene.add.text(15, debugUIStartY + 65, 'READY', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
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
        // Create new futuristic health bar system
        if (typeof FuturisticHealthBar !== 'undefined') {
            this.futuristicHealthBar = new FuturisticHealthBar(this.uiScene);
            this.futuristicHealthBar.create();
        } else {
            console.warn('⚠️ FuturisticHealthBar not loaded, falling back to legacy system');
            // Fallback to old system if module not loaded
            this.createDualCharacterHealthDisplay();
        }
    }
    
    // Legacy method - kept for fallback only
    createDualCharacterHealthDisplay() {
        const displayX = 40;
        const displayY = 80;
        const barWidth = 160;
        const barHeight = 20;
        const spacing = 10;
        
        // Tireek health bar
        this.tireekHealthBorder = this.uiScene.add.rectangle(
            displayX, displayY, barWidth + 4, barHeight + 4, 0x2a2a2a
        );
        this.tireekHealthBorder.setOrigin(0, 0);
        this.tireekHealthBorder.setDepth(2000);
        this.tireekHealthBorder.setScrollFactor(0);
        
        this.tireekHealthBg = this.uiScene.add.rectangle(
            displayX + 2, displayY + 2, barWidth, barHeight, 0x404040
        );
        this.tireekHealthBg.setOrigin(0, 0);
        this.tireekHealthBg.setDepth(2001);
        this.tireekHealthBg.setScrollFactor(0);
        
        this.tireekHealthGraphics = this.uiScene.add.graphics();
        this.tireekHealthGraphics.setDepth(2002);
        this.tireekHealthGraphics.setScrollFactor(0);
        
        // Tryston health bar
        this.trystonHealthBorder = this.uiScene.add.rectangle(
            displayX + barWidth + spacing, displayY, barWidth + 4, barHeight + 4, 0x2a2a2a
        );
        this.trystonHealthBorder.setOrigin(0, 0);
        this.trystonHealthBorder.setDepth(2000);
        this.trystonHealthBorder.setScrollFactor(0);
        
        this.trystonHealthBg = this.uiScene.add.rectangle(
            displayX + barWidth + spacing + 2, displayY + 2, barWidth, barHeight, 0x404040
        );
        this.trystonHealthBg.setOrigin(0, 0);
        this.trystonHealthBg.setDepth(2001);
        this.trystonHealthBg.setScrollFactor(0);
        
        this.trystonHealthGraphics = this.uiScene.add.graphics();
        this.trystonHealthGraphics.setDepth(2002);
        this.trystonHealthGraphics.setScrollFactor(0);
        
        // Character labels
        this.tireekLabel = this.uiScene.add.text(displayX + 5, displayY - 25, 'TIREEK', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold'
        });
        this.tireekLabel.setDepth(2003);
        this.tireekLabel.setScrollFactor(0);
        
        this.trystonLabel = this.uiScene.add.text(displayX + barWidth + spacing + 5, displayY - 25, 'TRYSTON', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
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
        // Legacy method - kept for compatibility but does nothing
        // Health updates now go through updateDualCharacterHealth
    }
    
    updateDualCharacterHealth(tireekHealth, trystonHealth, activeCharacter) {
        // Use new futuristic health bar if available
        if (this.futuristicHealthBar) {
            this.futuristicHealthBar.update(tireekHealth, trystonHealth, activeCharacter);
            return;
        }
        
        // Fallback to legacy system
        if (!this.tireekHealthGraphics || !this.trystonHealthGraphics) return;
        
        // Update Tireek health bar
        this.updateCharacterHealthBar(this.tireekHealthGraphics, tireekHealth, 100, 
            this.tireekBarX, this.tireekBarY, this.dualBarWidth, this.dualBarHeight,
            activeCharacter === 'tireek');
        
        // Update Tryston health bar
        this.updateCharacterHealthBar(this.trystonHealthGraphics, trystonHealth, 100,
            this.trystonBarX, this.trystonBarY, this.dualBarWidth, this.dualBarHeight,
            activeCharacter === 'tryston');
        
        // Update labels to show active character
        if (this.tireekLabel && this.trystonLabel) {
            if (activeCharacter === 'tireek') {
                this.tireekLabel.setStyle({ fill: '#FFD700', fontWeight: 'bold' });
                this.trystonLabel.setStyle({ fill: '#888888', fontWeight: 'normal' });
            } else {
                this.tireekLabel.setStyle({ fill: '#888888', fontWeight: 'normal' });
                this.trystonLabel.setStyle({ fill: '#FFD700', fontWeight: 'bold' });
            }
        }
    }
    
    // Legacy method - kept for fallback only
    updateCharacterHealthBar(graphics, currentHealth, maxHealth, x, y, width, height, isActive) {
        if (!graphics) return;
        
        graphics.clear();
        
        const healthPercent = currentHealth / maxHealth;
        const currentWidth = width * healthPercent;
        
        let healthColor;
        if (isActive) {
            if (healthPercent > 0.6) {
                healthColor = 0xFF8C00;
            } else if (healthPercent > 0.3) {
                healthColor = 0xFF7F00;
            } else {
                healthColor = 0xFF4500;
            }
        } else {
            if (healthPercent > 0.6) {
                healthColor = 0xCC7000;
            } else if (healthPercent > 0.3) {
                healthColor = 0xCC5F00;
            } else {
                healthColor = 0xCC3500;
            }
        }
        
        if (currentWidth > 0) {
            graphics.fillStyle(healthColor);
            graphics.fillRect(x, y, currentWidth, height);
            
            if (isActive) {
                graphics.fillStyle(0xffffff, 0.3);
                graphics.fillRect(x, y, currentWidth, height * 0.4);
            }
        }
    }
    
    // ========================================
    // LIVES DISPLAY SYSTEM
    // ========================================
    
    createLivesDisplay() {
        // Position below health bar (FuturisticHealthBar is at y:60, height ~84px, so lives at y:160 for spacing)
        const livesX = 70;
        const livesY = 160; // Moved down from 120 to avoid overlap
        const boxWidth = 120;
        const boxHeight = 40;
        const plusSize = 32; // Increased from 24 to 32
        const plusSpacing = 32; // Adjusted spacing for bigger symbols
        
        // Create container for lives display
        this.livesConfig = { x: livesX, y: livesY };
        this.livesContainer = this.uiScene.add.container(livesX, livesY);
        this.livesContainer.setDepth(2000);
        this.livesContainer.setScrollFactor(0);
        
        this.updateLivesTransform();
        console.log(`❤️ LIVES_DEBUG: Lives container positioned with scale ${this.currentUiScale}`);
        
        // Create gray box background with bezel
        // Outer border (bezel effect)
        const bezelGraphics = this.uiScene.add.graphics();
        bezelGraphics.fillStyle(0x000000, 0.6); // Dark outer border
        bezelGraphics.fillRoundedRect(0, 0, boxWidth, boxHeight, 4);
        bezelGraphics.setDepth(0);
        this.livesContainer.add(bezelGraphics);
        
        // Inner box (gray background)
        this.livesBox = this.uiScene.add.rectangle(
            boxWidth / 2,
            boxHeight / 2,
            boxWidth - 4,
            boxHeight - 4,
            0x2a2a2a
        );
        this.livesBox.setOrigin(0.5, 0.5);
        this.livesBox.setDepth(1);
        this.livesContainer.add(this.livesBox);
        
        // Calculate centered position for plus symbols
        // We have 3 symbols with spacing between their centers
        // Total span from first to last center: 2 * spacing (2 gaps between 3 symbols)
        const totalSpan = 2 * plusSpacing; // Distance from first to last symbol center
        const plusStartX = (boxWidth - totalSpan) / 2; // Center the group horizontally
        const plusY = boxHeight / 2; // Center vertically in box
        
        // Create 3 plus symbols with drop shadows
        this.livesPlusSymbols = [];
        for (let i = 0; i < 3; i++) {
            const plusX = plusStartX + (i * plusSpacing); // Relative to container, centered
            
            // Drop shadow (offset slightly down and right)
            const shadow = this.uiScene.add.text(plusX + 2, plusY + 2, '+', {
                fontSize: `${plusSize}px`,
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                fill: '#000000',
                alpha: 0.5
            });
            shadow.setOrigin(0.5, 0.5);
            shadow.setDepth(2);
            this.livesContainer.add(shadow);
            
            // Plus symbol (yellow)
            const plusSymbol = this.uiScene.add.text(plusX, plusY, '+', {
                fontSize: `${plusSize}px`,
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                fill: '#FFD700' // Yellow
            });
            plusSymbol.setOrigin(0.5, 0.5);
            plusSymbol.setDepth(3);
            this.livesContainer.add(plusSymbol);
            
            this.livesPlusSymbols.push({
                symbol: plusSymbol,
                shadow: shadow
            });
        }
        
        console.log('❤️ Lives display created');
    }

    handleUiScaleChanged(newScale, viewportInfo) {
        if (typeof newScale === 'number') {
            this.currentUiScale = newScale;
        }
        if (viewportInfo) {
            this.viewportInfo = viewportInfo;
        }
        this.updateLivesTransform();
        this.updateScoreTransform();
    }

    updateLivesTransform() {
        if (!this.livesContainer || !this.livesConfig) return;
        
        const scale = this.currentUiScale ?? 1;
        const screenX = this.livesConfig.x * scale;
        const screenY = this.livesConfig.y * scale;
        
        this.livesContainer.setScale(scale);
        this.livesContainer.setPosition(screenX, screenY);
    }
    
    updateLivesDisplay(lives, flashLostLife = false) {
        if (!this.livesPlusSymbols || this.livesPlusSymbols.length === 0) {
            return;
        }
        
        // Stop any existing flash animations to prevent overlapping flashes
        if (this.livesFlashTween) {
            this.livesFlashTween.stop();
            this.livesFlashTween = null;
        }
        
        // Update each plus symbol based on remaining lives
        for (let i = 0; i < this.livesPlusSymbols.length; i++) {
            const life = this.livesPlusSymbols[i];
            const isActive = i < lives;
            
            if (isActive) {
                // Active life: yellow with visible shadow
                life.symbol.setFill('#FFD700');
                life.symbol.setAlpha(1.0);
                life.shadow.setAlpha(0.5);
            } else {
                // Lost life: greyed out (default state)
                life.symbol.setFill('#666666');
                life.symbol.setAlpha(0.5);
                life.shadow.setAlpha(0.2);
                
                // Flash red if this life was just lost (only flash the one that was just lost)
                if (flashLostLife && i === lives) {
                    // Flash red for 1 second
                    life.symbol.setFill('#FF0000');
                    life.symbol.setAlpha(1.0);
                    
                    // Create flash animation and store reference
                    this.livesFlashTween = this.uiScene.tweens.add({
                        targets: [life.symbol, life.shadow],
                        alpha: 0.5,
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => {
                            // Restore greyed out state
                            life.symbol.setFill('#666666');
                            life.symbol.setAlpha(0.5);
                            life.shadow.setAlpha(0.2);
                            this.livesFlashTween = null;
                        }
                    });
                }
            }
        }
    }
    
    // ========================================
    // SCORE DISPLAY SYSTEM
    // ========================================
    
    createScoreDisplay() {
        const virtualWidth = 1200;
        const containerX = virtualWidth - 100;
        const containerY = 100;
        
        // Create container for score display elements
        this.scoreConfig = { x: containerX, y: containerY };
        this.scoreContainer = this.uiScene.add.container(containerX, containerY);
        this.scoreContainer.setDepth(2003);
        this.scoreContainer.setScrollFactor(0);
        this.updateScoreTransform();
        
        // Create the score text first (positioned to the left)
        this.scoreText = this.uiScene.add.text(-10, 0, '0', {
            fontSize: GAME_CONFIG.ui.fontSize.golden_microphone_count,
            fill: '#FFD700',  // Golden color
            fontFamily: GAME_CONFIG.ui.fontFamily,
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
        this.scoreMicrophone = this.uiScene.add.sprite(-100, 0, 'goldenMicrophone');
        this.scoreMicrophone.setScale(0.8); // Increased from 0.5 (64x64 image to ~51x51)
        this.scoreMicrophone.setOrigin(0, 0.5); // Left-aligned, vertically centered
        
        // Calculate bounding box of both elements to center the circle
        // Microphone: at (-100, 0) with origin (0, 0.5), scale 0.8, original size 64x64
        const micWidth = 64 * 0.8; // 51.2
        const micHeight = 64 * 0.8; // 51.2
        const micLeft = -100; // Left edge (origin is at left)
        const micRight = micLeft + micWidth; // -48.8
        const micTop = 0 - (micHeight / 2); // -25.6 (origin is at vertical center)
        const micBottom = 0 + (micHeight / 2); // 25.6
        
        // Text: at (-10, 0) with origin (1, 0.5), so right edge is at -10
        const textWidth = this.scoreText.width;
        const textHeight = this.scoreText.height;
        const textRight = -10; // Right edge (origin is at right)
        const textLeft = textRight - textWidth;
        const textTop = 0 - (textHeight / 2); // (origin is at vertical center)
        const textBottom = 0 + (textHeight / 2);
        
        // Find the overall bounding box
        const minX = Math.min(micLeft, textLeft);
        const maxX = Math.max(micRight, textRight);
        const minY = Math.min(micTop, textTop);
        const maxY = Math.max(micBottom, textBottom);
        
        // Calculate center point
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Calculate radius (distance from center to farthest corner, plus padding)
        const width = maxX - minX;
        const height = maxY - minY;
        const diagonal = Math.sqrt(width * width + height * height);
        const padding = 15; // Padding around the elements
        const circleRadius = (diagonal / 2) + padding;
        
        // Create background circle to separate from background
        this.scoreCircle = this.uiScene.add.graphics();
        this.scoreCircle.fillStyle(0x000000, 0.50); // Black with low opacity
        this.scoreCircle.fillCircle(centerX, centerY, circleRadius); // Centered on the elements
        this.scoreCircle.setDepth(0); // Behind other elements
        
        // Add all elements to the container (circle first so it's behind)
        this.scoreContainer.add([this.scoreCircle, this.scoreMicrophone, this.scoreText]);
        
        console.log('🎤 Score display with golden microphone created');
    }

    updateScoreTransform() {
        if (!this.scoreContainer || !this.scoreConfig) return;
        const scale = this.currentUiScale ?? 1;
        const screenX = this.scoreConfig.x * scale;
        const screenY = this.scoreConfig.y * scale;
        
        // Only update scale if no tween is actively animating it
        const hasTween = this.uiScene.tweens.getTweensOf(this.scoreContainer).length > 0;
        if (!hasTween) {
            this.scoreContainer.setScale(scale);
        }
        
        // Always update position (doesn't conflict with pulse animation)
        this.scoreContainer.setPosition(screenX, screenY);
    }
    
    updateScoreDisplay(score) {
        if (!this.scoreText || !this.scoreContainer) return;
        
        // Update score text (no emoji needed since we have the actual microphone sprite)
        this.scoreText.setText(`${score}`);
        
        // Create a brief pulse effect when score changes (pulse relative to current UI scale)
        if (score > 0) {
            const baseScale = this.currentUiScale ?? 1;
            const pulseScale = baseScale * 1.15; // 15% larger than current scale
            
            this.uiScene.tweens.add({
                targets: this.scoreContainer,
                scaleX: pulseScale,
                scaleY: pulseScale,
                duration: 150,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    // Ensure we return to the correct base scale
                    this.scoreContainer.setScale(baseScale);
                }
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
        if (!this.debugMode || !this.debugText) return;
        
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
        // Use virtual coordinates (1200x720) instead of screen coordinates
        const virtualWidth = 1200;
        const virtualHeight = 720;
        const barWidth = 400;
        const barHeight = 30;
        const barX = virtualWidth / 2; // Center horizontally
        const barY = virtualHeight - 80; // Position at bottom of screen with 80px margin from bottom
        
        // Boss name text (positioned above the health bar)
        this.bossNameText = this.uiScene.add.text(barX, barY - 35, '', {
            fontSize: GAME_CONFIG.ui.fontSize.body,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.bossNameText.setOrigin(0.5, 0.5);
        this.bossNameText.setDepth(2004);
        this.bossNameText.setScrollFactor(0);
        this.bossNameText.setVisible(false);
        
        // Border
        this.bossHealthBarBorder = this.uiScene.add.rectangle(
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
        this.bossHealthBarBg = this.uiScene.add.rectangle(
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
        this.bossHealthBarGraphics = this.uiScene.add.graphics();
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
        if (this.uiScene?.events?.off) {
            this.uiScene.events.off('uiScaleChanged', this.handleUiScaleChanged, this);
        }
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
        }
        if (this.healthBarGraphics) {
            this.healthBarGraphics.destroy();
        }
        if (this.bossHealthBarGraphics) {
            this.bossHealthBarGraphics.destroy();
        }
        if (this.futuristicHealthBar) {
            this.futuristicHealthBar.destroy();
        }
        
        // Clean up death overlay
        this.hideDeathOverlay();
        
        console.log('🗑️ UIManager destroyed');
    }
    
    // ========================================
    // DEATH OVERLAY METHODS
    // ========================================
    
    showTryAgainOverlay() {
        this.showDeathOverlay('TRY AGAIN');
    }
    
    showGameOverOverlay() {
        // Remove existing overlay if present
        this.hideDeathOverlay();
        
        // Get actual screen dimensions
        const screenWidth = this.uiScene?.scale?.width || 1200;
        const screenHeight = this.uiScene?.scale?.height || 720;
        
        // Center is the absolute screen center
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Create fully opaque black overlay (will fade in) - covers entire screen
        this.deathOverlay = this.uiScene.add.rectangle(
            centerX,
            centerY,
            screenWidth,
            screenHeight,
            0x000000,
            1.0
        );
        this.deathOverlay.setDepth(3000);
        this.deathOverlay.setScrollFactor(0);
        this.deathOverlay.setAlpha(0); // Start invisible for fade
        
        // Scale font size based on UI scale
        const baseFontSize = 72;
        const scaledFontSize = Math.floor(baseFontSize * (this.currentUiScale || 1));
        const scaledStroke = Math.max(4, Math.floor(8 * (this.currentUiScale || 1)));
        
        // Create message text (empty initially, will be typed out)
        this.deathOverlayText = this.uiScene.add.text(
            centerX,
            centerY,
            '',
            {
                fontSize: `${scaledFontSize}px`,
                fill: '#FF0000',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: scaledStroke
            }
        );
        this.deathOverlayText.setOrigin(0.5);
        this.deathOverlayText.setDepth(3001);
        this.deathOverlayText.setScrollFactor(0);
        
        // Initialize typewriter
        this.gameOverFullText = 'GAME OVER';
        this.gameOverDisplayedText = '';
        this.gameOverCharIndex = 0;
        
        console.log('💀 Game over overlay created (will fade in and type)', {
            screenWidth,
            screenHeight,
            centerX,
            centerY,
            fontSize: scaledFontSize,
            scale: this.currentUiScale
        });
    }
    
    fadeInGameOverScreen(callback) {
        // Fade in the black overlay
        this.uiScene.tweens.add({
            targets: this.deathOverlay,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                if (callback) callback();
            }
        });
    }
    
    startGameOverTypewriter(onComplete) {
        // Start typing sound
        if (this.scene.audioManager) {
            this.scene.audioManager.startTextTyping();
        }
        
        // Clear any existing timer
        if (this.gameOverTypewriterTimer) {
            this.gameOverTypewriterTimer.remove();
        }
        
        // Start typewriter effect
        // Use scene.time since it's logical, but uiScene.time works too
        this.gameOverTypewriterTimer = this.uiScene.time.addEvent({
            delay: this.gameOverTypewriterSpeed,
            callback: () => {
                if (this.gameOverCharIndex < this.gameOverFullText.length) {
                    this.gameOverDisplayedText += this.gameOverFullText[this.gameOverCharIndex];
                    this.deathOverlayText.setText(this.gameOverDisplayedText);
                    this.gameOverCharIndex++;
                } else {
                    // Typewriter complete
                    if (this.scene.audioManager) {
                        this.scene.audioManager.stopTextTyping();
                    }
                    if (this.gameOverTypewriterTimer) {
                        this.gameOverTypewriterTimer.remove();
                        this.gameOverTypewriterTimer = null;
                    }
                    if (onComplete) {
                        onComplete();
                    }
                }
            },
            loop: true
        });
    }
    
    showDeathOverlay(message) {
        // Remove existing overlay if present
        this.hideDeathOverlay();
        
        // Get actual screen dimensions
        const screenWidth = this.uiScene?.scale?.width || 1200;
        const screenHeight = this.uiScene?.scale?.height || 720;
        
        // Center is the absolute screen center
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        // Create semi-transparent dark overlay - covers entire screen
        this.deathOverlay = this.uiScene.add.rectangle(
            centerX,
            centerY,
            screenWidth,
            screenHeight,
            0x000000,
            0.7
        );
        this.deathOverlay.setDepth(3000);
        this.deathOverlay.setScrollFactor(0);
        
        // Scale font size based on UI scale
        const baseFontSize = 72;
        const scaledFontSize = Math.floor(baseFontSize * (this.currentUiScale || 1));
        const scaledStroke = Math.max(4, Math.floor(8 * (this.currentUiScale || 1)));
        
        // Create message text
        this.deathOverlayText = this.uiScene.add.text(
            centerX,
            centerY,
            message,
            {
                fontSize: `${scaledFontSize}px`,
                fill: '#FF0000',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: scaledStroke
            }
        );
        this.deathOverlayText.setOrigin(0.5);
        this.deathOverlayText.setDepth(3001);
        this.deathOverlayText.setScrollFactor(0);
        
        // Add pulsing animation
        this.uiScene.tweens.add({
            targets: this.deathOverlayText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        console.log(`💀 Death overlay shown: ${message}`, {
            screenWidth,
            screenHeight,
            centerX,
            centerY,
            fontSize: scaledFontSize,
            scale: this.currentUiScale
        });
    }
    
    hideDeathOverlay() {
        // Stop typewriter if running
        if (this.gameOverTypewriterTimer) {
            this.gameOverTypewriterTimer.remove();
            this.gameOverTypewriterTimer = null;
        }
        
        // Stop typing sound
        if (this.scene.audioManager) {
            this.scene.audioManager.stopTextTyping();
        }
        
        if (this.deathOverlay) {
            this.deathOverlay.destroy();
            this.deathOverlay = null;
        }
        if (this.deathOverlayText) {
            this.deathOverlayText.destroy();
            this.deathOverlayText = null;
        }
        if (this.deathOverlayFade) {
            this.deathOverlayFade.destroy();
            this.deathOverlayFade = null;
        }
        
        // Reset typewriter state
        this.gameOverFullText = '';
        this.gameOverDisplayedText = '';
        this.gameOverCharIndex = 0;
    }
}

// Make UIManager available globally
window.UIManager = UIManager;