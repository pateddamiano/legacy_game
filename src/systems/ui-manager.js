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
        this.bossHealthBarContainer = null;
        this.bossHealthBar = null;
        this.bossHealthBarBg = null;
        this.bossHealthBarBorder = null;
        this.bossHealthBarGraphics = null;
        this.bossNameText = null;
        this.bossHealthBarVisible = false;
        this.currentBoss = null;
        this.bossHealthBarConfig = null;
        
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
        
        // Create the combo counter (under the score)
        this.createComboDisplay();
        
        // Create the special attack meter (under the combo)
        this.createSpecialDisplay();
        
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
        // Position below health bar (FuturisticHealthBar is at y:60, height ~84px, so lives at y:160 for spacing).
        // On phones the health bar and this box are both bigger (hudScale), so drop it to match.
        this.hudScale = window.DeviceManager ? window.DeviceManager.getHudScale() : 1;
        const livesX = 70;
        const livesY = 60 + 84 * this.hudScale + 16;
        const boxHeight = 40;
        const boxPadding = 10;
        const plusSize = 32; // Increased from 24 to 32
        const plusSpacing = 32; // Adjusted spacing for bigger symbols
        
        // "LIVES:" label on the left of the box, the three + symbols after it.
        // Made first so the box can be sized around it (added to the container below).
        const livesLabel = this.uiScene.add.text(boxPadding, boxHeight / 2, 'LIVES:', {
            fontSize: GAME_CONFIG.ui.fontSize.tiny,
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            fill: '#FFFFFF'
        });
        livesLabel.setOrigin(0, 0.5);
        const plusStartX = boxPadding + livesLabel.width + 8 + plusSize * 0.3; // first + centre
        const boxWidth = Math.ceil(plusStartX + 2 * plusSpacing + plusSize * 0.3 + boxPadding);
        
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
        bezelGraphics.fillRect(0, 0, boxWidth, boxHeight); // (was a 4px rounded rect: curves are re-tessellated every frame)
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
        this.livesContainer.add(livesLabel);
        
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
        this.updateBossHealthBarTransform();
    }

    updateLivesTransform() {
        if (!this.livesContainer || !this.livesConfig) return;
        
        const scale = this.currentUiScale ?? 1;
        const screenX = this.livesConfig.x * scale;
        const screenY = this.livesConfig.y * scale;
        
        this.livesContainer.setScale(scale * (this.hudScale || 1));
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
    
    // Top-right HUD box: golden microphone count on top, the hit combo under it
    // (ComboSystem). Anchored at its top-right corner, so scaling it up on phones keeps
    // it tucked into the corner.
    createScoreDisplay() {
        const W = UIManager.SCORE_BOX.width, H = UIManager.SCORE_BOX.height, pad = 12;
        
        // Bigger on phones: the HUD scale plus the extra icon scale for the golden microphone
        const hudScale = window.DeviceManager ? window.DeviceManager.getHudScale() : 1;
        this.scoreScale = hudScale * (window.DeviceManager ? window.DeviceManager.getHudIconScale() : 1);
        
        this.scoreConfig = { x: 1200 - 12, y: 12 };
        this.scoreContainer = this.uiScene.add.container(0, 0);
        this.scoreContainer.setDepth(2003);
        this.scoreContainer.setScrollFactor(0);
        
        // The box
        // Baked once at 2x into a texture (sharp when the HUD is scaled up): drawn as Graphics it
        // re-tessellated three rounded-rect outlines on every frame
        const BS = 2, M = 2;   // bake scale, and margin so the outer half of the stroke fits
        const boxKey = `hudScoreBox_${W}x${H}`;
        if (!this.uiScene.textures.exists(boxKey)) {
            const g = this.uiScene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x000000, 0.55);
            g.fillRoundedRect(M * BS, M * BS, W * BS, H * BS, 12 * BS);
            g.lineStyle(2 * BS, 0xFFD700, 0.55);
            g.strokeRoundedRect(M * BS, M * BS, W * BS, H * BS, 12 * BS);
            g.lineStyle(1 * BS, 0xFFD700, 0.3);
            g.lineBetween((pad + M) * BS, (56 + M) * BS, (W - pad + M) * BS, (56 + M) * BS); // score | combo
            g.lineBetween((pad + M) * BS, (102 + M) * BS, (W - pad + M) * BS, (102 + M) * BS); // combo | special
            g.generateTexture(boxKey, (W + 2 * M) * BS, (H + 2 * M) * BS);
            g.destroy();
        }
        const box = this.uiScene.add.image(-W - M, -M, boxKey).setOrigin(0, 0).setScale(1 / BS);
        
        // Row 1: microphone on the left, count on the right
        this.scoreMicrophone = this.uiScene.add.sprite(-W + pad, 30, 'goldenMicrophone');
        this.scoreMicrophone.setScale(0.8); // 64x64 image to ~51x51
        this.scoreMicrophone.setOrigin(0, 0.5);
        this.scoreText = this.uiScene.add.text(-pad, 30, '0', {
            fontSize: GAME_CONFIG.ui.fontSize.golden_microphone_count,
            fill: '#FFD700',  // Golden color
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, stroke: false, fill: true }
        });
        this.scoreText.setOrigin(1, 0.5); // Right-aligned, vertically centered
        
        this.scoreContainer.add([box, this.scoreMicrophone, this.scoreText]);
        this.updateScoreTransform();
        
        console.log('🎤 Score display with golden microphone created');
    }

    // ========================================
    // COMBO COUNTER
    // ========================================
    // Row 2 of the score box: the fist (same art as the ATTACK button), the multiplier
    // (x1-x5) and pips filling toward the next one. Dimmed at x1 when there's no combo;
    // lights up on the first hit and flashes red when the player gets hit. Driven by
    // ComboSystem.
    createComboDisplay() {
        if (!this.scoreContainer) return;
        const W = UIManager.SCORE_BOX.width, pad = 12;
        // Row container centred in the row, so its pulse scales from the middle
        this.comboRow = this.uiScene.add.container(-W / 2, 79);
        
        const left = -W / 2 + pad;
        let fist = null;
        if (this.uiScene.textures.exists('fistIcon')) {
            fist = this.uiScene.add.image(left, 0, 'fistIcon').setOrigin(0, 0.5);
            fist.setScale(44 / fist.height);
        }
        this.comboText = this.uiScene.add.text(left + 52, 0, 'x1', {
            fontSize: GAME_CONFIG.ui.fontSize.heading,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0.5);
        
        // Hits toward the next multiplier, right-aligned in the row
        this.comboPips = [];
        const pipCount = ComboSystem.HITS_PER_LEVEL;
        const lastX = W / 2 - pad - 5;
        for (let i = 0; i < pipCount; i++) {
            const pip = this.uiScene.add.rectangle(lastX - (pipCount - 1 - i) * 15, 0, 10, 12, 0x444444, 1);
            pip.setStrokeStyle(1, 0x000000, 0.8);
            this.comboPips.push(pip);
        }
        
        this.comboRow.add([...(fist ? [fist] : []), this.comboText, ...this.comboPips]);
        this.scoreContainer.add(this.comboRow);
        this.updateComboDisplay(0, 1);
    }
    
    // ========================================
    // SPECIAL ATTACK METER
    // ========================================
    // Row 3 of the score box: the current fighter's fireball, a bar that fills as the special
    // charges (SpecialAttackSystem) and, on keyboard, the key that fires it. Dimmed while
    // charging; full, the bar turns yellow and the row pulses. In landscape touch play the row
    // itself is the button: full, it reads TAP, and tapping it throws the fireball. (Upright
    // phones have a SPECIAL bar on the console instead - SpecialBarButton.)
    createSpecialDisplay() {
        if (!this.scoreContainer) return;
        const W = UIManager.SCORE_BOX.width, pad = 12;
        this.specialRow = this.uiScene.add.container(-W / 2, 123);
        
        const left = -W / 2 + pad;
        const fb = SpecialAttackSystem.FIREBALLS.tireek;
        this.specialIcon = this.uiScene.add.image(left + 18, 0, fb.key, 8);
        this.specialIcon.setScale(1.3);
        this.specialIcon.setVisible(this.uiScene.textures.exists(fb.key));
        
        // Bar: a dark track and a fill that grows to the right
        const barX = left + 42, barW = W - 2 * pad - 42 - 26, barH = 14;
        this.specialBar = { x: barX, w: barW, h: barH };
        this.specialTrack = this.uiScene.add.rectangle(barX, 0, barW, barH, 0x222222, 1).setOrigin(0, 0.5);
        this.specialTrack.setStrokeStyle(1, 0x000000, 0.8);
        this.specialFill = this.uiScene.add.rectangle(barX, 0, 0, barH, SpecialAttackSystem.HUD_COLORS.tireek, 1).setOrigin(0, 0.5);
        
        // "TAP" on the full bar (landscape touch only)
        this.specialTap = this.uiScene.add.text(barX + barW / 2, 0, 'TAP', {
            fontSize: '15px',
            fill: '#1A1200',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);
        
        // The whole row is the tap target (only acts in landscape touch play, when full)
        this.specialHit = this.uiScene.add.rectangle(0, 0, W, 40, 0x000000, 0).setInteractive({ useHandCursor: false });
        this.specialHit.on('pointerdown', () => {
            const gs = this.scene;
            if (!this.isSpecialTapLayout() || !gs || !gs.specialAttack) return;
            if (gs.scene && gs.scene.isPaused()) return;
            gs.specialAttack.tryFire();
        });
        
        // Key hint (keyboard only)
        this.specialKey = this.uiScene.add.text(W / 2 - pad, 0, 'V', {
            fontSize: GAME_CONFIG.ui.fontSize.micro,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0.5);
        
        this.specialRow.add([this.specialIcon, this.specialTrack, this.specialFill, this.specialTap, this.specialKey, this.specialHit]);
        this.scoreContainer.add(this.specialRow);
        this.specialReadyShown = null;
        this.updateSpecialDisplay(0, false, fb.key);
    }
    
    // Landscape touch play: the HUD's special row is the button
    isSpecialTapLayout() {
        const DM = window.DeviceManager;
        if (!DM || !DM.shouldShowTouchControls || !DM.shouldShowTouchControls()) return false;
        return !(DM.isHandheldMode && DM.isHandheldMode());
    }
    
    // charge 0..1; ready: full; fireballKey: the current fighter's fireball texture
    updateSpecialDisplay(charge, ready, fireballKey) {
        if (!this.specialRow || !this.specialRow.active) return;
        const char = fireballKey && fireballKey.split('_')[0];
        const color = SpecialAttackSystem.HUD_COLORS[char] || SpecialAttackSystem.HUD_COLORS.tireek;
        
        if (fireballKey && this.uiScene.textures.exists(fireballKey)) {
            if (this.specialIcon.texture.key !== fireballKey) this.specialIcon.setTexture(fireballKey, 8);
            this.specialIcon.setVisible(true);
        }
        this.specialFill.setSize(Math.max(0.01, this.specialBar.w * Math.max(0, Math.min(1, charge))), this.specialBar.h);
        this.specialFill.setFillStyle(ready ? 0xFFD700 : color, 1);
        
        const touch = !!(window.DeviceManager && window.DeviceManager.shouldShowTouchControls && window.DeviceManager.shouldShowTouchControls());
        this.specialKey.setVisible(!touch);
        this.specialTap.setVisible(!!ready && this.isSpecialTapLayout());
        
        if (ready === this.specialReadyShown) return;
        this.specialReadyShown = ready;
        const tweens = this.uiScene.tweens;
        tweens.killTweensOf(this.specialRow);
        this.specialRow.setScale(1);
        this.specialRow.setAlpha(ready ? 1 : 0.6);
        this.specialTrack.setStrokeStyle(ready ? 2 : 1, ready ? 0xFFF3B0 : 0x000000, 0.9);
        if (ready) {
            tweens.add({ targets: this.specialRow, scale: 1.08, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
    }
    
    // hits: hits in the current combo (0 = no combo); multiplier: 1-5; levelUp: the
    // multiplier just went up; broken: the player just got hit
    updateComboDisplay(hits, multiplier, levelUp = false, broken = false) {
        if (!this.comboRow || !this.comboRow.active) return;
        const tweens = this.uiScene.tweens;
        tweens.killTweensOf(this.comboRow);
        this.comboRow.setScale(1);
        
        const maxed = multiplier >= ComboSystem.MAX_MULTIPLIER;
        const filled = hits <= 0 ? 0 : (maxed ? this.comboPips.length : hits % ComboSystem.HITS_PER_LEVEL);
        this.comboPips.forEach((pip, i) => pip.setFillStyle(i < filled ? 0xFFD700 : 0x444444, 1));
        this.comboText.setText(`x${hits <= 0 ? 1 : multiplier}`);
        
        if (hits <= 0) {
            // No combo: dimmed x1. Just broken: flash red first.
            if (broken) {
                this.comboRow.setAlpha(1);
                this.comboText.setColor('#FF3B3B');
                tweens.add({
                    targets: this.comboRow, alpha: 0.4, duration: 450, delay: 300,
                    onComplete: () => { if (this.comboText && this.comboText.active) this.comboText.setColor('#FFD700'); }
                });
            } else {
                this.comboText.setColor('#FFD700');
                this.comboRow.setAlpha(0.4);
            }
            return;
        }
        
        this.comboRow.setAlpha(1);
        this.comboText.setColor(levelUp ? '#FFFFFF' : '#FFD700');
        if (levelUp) {
            tweens.add({
                targets: this.comboRow, scale: 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut',
                onComplete: () => { if (this.comboText && this.comboText.active) this.comboText.setColor('#FFD700'); }
            });
        } else {
            tweens.add({ targets: this.comboRow, scale: 1.06, duration: 80, yoyo: true });
        }
    }

    // A big instruction across the upper-middle of the screen that pops in and fades out
    // (boss fights: "DODGE THE BAD RATINGS!", "ATTACK NOW!"). The same line again within
    // a second is ignored.
    showCallout(text, color = '#FFD700') {
        if (!text || !this.uiScene || !this.uiScene.sys || !this.uiScene.sys.isActive()) return;
        const now = this.uiScene.time.now;
        if (this._lastCallout && this._lastCallout.text === text && now - this._lastCallout.at < 1000) return;
        this._lastCallout = { text, at: now };
        
        if (this.calloutText && this.calloutText.active) {
            this.uiScene.tweens.killTweensOf(this.calloutText);
            this.calloutText.destroy();
        }
        const scale = this.currentUiScale ?? 1;
        const k = window.DeviceManager ? window.DeviceManager.getTextScale() : 1;
        const callout = this.uiScene.add.text(600 * scale, 250 * scale, text, {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: `${Math.round(44 * scale * k)}px`,
            color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: Math.max(3, Math.round(6 * scale)),
            align: 'center'
        }).setOrigin(0.5).setDepth(5000).setScale(0.4).setAlpha(0);
        this.calloutText = callout;
        this.uiScene.tweens.add({
            targets: callout, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut',
            onComplete: () => {
                this.uiScene.tweens.add({
                    targets: callout, alpha: 0, y: callout.y - 20 * scale, delay: 1300, duration: 400,
                    onComplete: () => { callout.destroy(); if (this.calloutText === callout) this.calloutText = null; }
                });
            }
        });
    }

    // A flying golden microphone has just reached the counter: show the new number and make
    // the microphone icon swell and settle, with a gold ring flashing out from it
    onMicrophoneArrived(score) {
        // The level may have been torn down while the microphone was in the air
        if (!this.scoreText || !this.scoreText.active || !this.scoreContainer || !this.scoreContainer.active) return;
        this.updateScoreDisplay(score);
        
        const mic = this.scoreMicrophone;
        if (!mic || !mic.active || !this.uiScene) return;
        const tweens = this.uiScene.tweens;
        
        // Swell up fast, then settle back with a little rebound
        const base = 0.8;
        tweens.killTweensOf(mic);
        mic.setScale(base);
        mic.setTint(0xfff2a8);
        tweens.add({
            targets: mic, scale: base * 1.6, duration: 110, ease: 'Quad.easeOut',
            onComplete: () => {
                mic.clearTint();
                tweens.add({ targets: mic, scale: base, duration: 320, ease: 'Back.easeOut' });
            }
        });
        // Gold ring expanding out of the icon
        const m = mic.getWorldTransformMatrix();
        const c = m.transformPoint((0.5 - mic.originX) * mic.width, (0.5 - mic.originY) * mic.height);
        const scale = Math.hypot(m.a, m.b);
        const ring = this.uiScene.add.circle(c.x, c.y, 28 * scale, 0xffd700, 0.55);
        ring.setDepth(2004);
        if (ring.setBlendMode) ring.setBlendMode(Phaser.BlendModes.ADD);
        tweens.add({
            targets: ring, scale: 2.4, alpha: 0, duration: 320, ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }
    
    updateScoreTransform() {
        if (!this.scoreContainer || !this.scoreConfig) return;
        const scale = this.currentUiScale ?? 1;
        this.scoreContainer.setScale(scale * (this.scoreScale || 1));
        this.scoreContainer.setPosition(this.scoreConfig.x * scale, this.scoreConfig.y * scale);
    }

    updateBossHealthBarTransform() {
        if (!this.bossHealthBarContainer || !this.bossHealthBarConfig) return;
        
        const scale = this.currentUiScale ?? 1;
        const screenX = this.bossHealthBarConfig.x * scale;
        const screenY = this.bossHealthBarConfig.y * scale;
        
        this.bossHealthBarContainer.setScale(scale);
        this.bossHealthBarContainer.setPosition(screenX, screenY);
    }
    
    updateScoreDisplay(score) {
        if (!this.scoreText || !this.scoreContainer) return;
        
        // Update score text (no emoji needed since we have the actual microphone sprite)
        this.scoreText.setText(`${score}`);
        
        // Brief pulse of the number (not the whole box) when it changes
        if (score > 0) {
            const tweens = this.uiScene.tweens;
            tweens.killTweensOf(this.scoreText);
            this.scoreText.setScale(1);
            tweens.add({ targets: this.scoreText, scale: 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
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
        // Use virtual coordinates (1200x720) for positioning
        const virtualWidth = 1200;
        const virtualHeight = 720;
        const barWidth = 400;
        const barHeight = 30;
        const containerX = virtualWidth / 2; // Center horizontally
        const containerY = virtualHeight - 80; // Position at bottom of screen with 80px margin from bottom
        
        // Store config for transform updates
        this.bossHealthBarConfig = { x: containerX, y: containerY };
        
        // Create container for boss health bar elements
        this.bossHealthBarContainer = this.uiScene.add.container(containerX, containerY);
        this.bossHealthBarContainer.setDepth(2003);
        this.bossHealthBarContainer.setScrollFactor(0);
        
        // Boss name text (positioned above the health bar, relative to container)
        this.bossNameText = this.uiScene.add.text(0, -35, '', {
            fontSize: GAME_CONFIG.ui.fontSize.body,
            fill: '#FFD700',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.bossNameText.setOrigin(0.5, 0.5);
        this.bossNameText.setVisible(false);
        
        // Border (relative to container)
        this.bossHealthBarBorder = this.uiScene.add.rectangle(
            0,
            0,
            barWidth + 6,
            barHeight + 6,
            0x000000
        );
        this.bossHealthBarBorder.setOrigin(0.5, 0.5);
        this.bossHealthBarBorder.setVisible(false);
        
        // Background (relative to container)
        this.bossHealthBarBg = this.uiScene.add.rectangle(
            0,
            0,
            barWidth,
            barHeight,
            0x404040
        );
        this.bossHealthBarBg.setOrigin(0.5, 0.5);
        this.bossHealthBarBg.setVisible(false);
        
        // Health fill graphics (relative to container)
        this.bossHealthBarGraphics = this.uiScene.add.graphics();
        
        // Add all elements to container
        this.bossHealthBarContainer.add([
            this.bossHealthBarBorder,
            this.bossHealthBarBg,
            this.bossHealthBarGraphics,
            this.bossNameText
        ]);
        
        // Store dimensions
        this.bossBarWidth = barWidth;
        this.bossBarHeight = barHeight;
        
        // Apply initial transform
        this.updateBossHealthBarTransform();
        
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
        
        // Draw the health bar fill (relative to container at 0,0)
        if (currentWidth > 0) {
            // Main health bar fill
            this.bossHealthBarGraphics.fillStyle(healthColor);
            this.bossHealthBarGraphics.fillRect(
                -this.bossBarWidth / 2,
                -this.bossBarHeight / 2,
                currentWidth,
                this.bossBarHeight
            );
            
            // Add highlight
            this.bossHealthBarGraphics.fillStyle(0xffffff, 0.3);
            this.bossHealthBarGraphics.fillRect(
                -this.bossBarWidth / 2,
                -this.bossBarHeight / 2,
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
        if (this.bossHealthBarContainer) {
            this.bossHealthBarContainer.destroy();
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
    
    // The UI camera sits at zoom 1 inside the letterboxed game viewport (LayoutManager), so UI
    // coordinates run 0..camera.width x 0..camera.height. scene.scale.width/height is the whole
    // canvas INCLUDING the black bars, so centring on it put "TRY AGAIN" / "GAME OVER" right of
    // centre on any window wider than the game's aspect ratio (most obviously on phones).
    getUiViewportSize() {
        const cam = this.uiScene?.cameras?.main;
        return { width: cam?.width || 1200, height: cam?.height || 720 };
    }
    
    showTryAgainOverlay() {
        this.showDeathOverlay('TRY AGAIN');
    }
    
    showGameOverOverlay() {
        // Remove existing overlay if present
        this.hideDeathOverlay();
        
        // Size of the area the UI camera actually renders (see getUiViewportSize)
        const { width: screenWidth, height: screenHeight } = this.getUiViewportSize();
        
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
        
        // Size of the area the UI camera actually renders (see getUiViewportSize)
        const { width: screenWidth, height: screenHeight } = this.getUiViewportSize();
        
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

// Size of the top-right score + combo + special box (virtual px, before the phone HUD scale)
UIManager.SCORE_BOX = { width: 200, height: 144 };

// Make UIManager available globally
window.UIManager = UIManager;