// ========================================
// FUTURISTIC HEALTH BAR SYSTEM
// ========================================
// Stacked card health bar with shuffle animations
// Both character cards visible, layered with active card in front

class FuturisticHealthBar {
    constructor(scene) {
        this.scene = scene;
        
        // Character data
        this.characters = {
            tireek: {
                name: 'TIREEK',
                color: 0x00FFFF, // Cyan
                inactiveColor: 0x008888, // Muted cyan
                health: 100,
                maxHealth: 100
            },
            tryston: {
                name: 'TRYSTON',
                color: 0x0088FF, // Blue
                inactiveColor: 0x004488, // Muted blue
                health: 100,
                maxHealth: 100
            }
        };
        
        this.activeCharacter = 'tireek';
        this.isAnimating = false;
        
        // Main container
        this.container = null;
        
        // Card containers (one per character)
        this.tireekCard = null;
        this.trystonCard = null;
        
        // Card elements storage
        this.cards = {
            tireek: {
                container: null,
                bg: null,
                border: null,
                healthFill: null,
                healthGlow: null,
                portrait: null,
                nameText: null,
                healthText: null,
                healthBarBg: null,
                patternSymbols: [], // Array to store pattern symbols
                damageFlash: null // Graphics for damage flash effect
            },
            tryston: {
                container: null,
                bg: null,
                border: null,
                healthFill: null,
                healthGlow: null,
                portrait: null,
                nameText: null,
                healthText: null,
                healthBarBg: null,
                patternSymbols: [], // Array to store pattern symbols
                damageFlash: null // Graphics for damage flash effect
            }
        };
        
        // Animation tweens
        this.glowTween = null;
        this.pulseTween = null;
        this.shuffleTween = null;
        
        // Configuration
        this.config = {
            x: 70,
            y: 60,
            width: 350, // Match health bar width
            height: 50, // Will be extended to fit name + health bar
            borderWidth: 8,
            shuffleDuration: 200,
            cardOffset: { x: -25, y: -30 }, // Offset for inactive card (left and above)
            activeDepth: 2002,
            inactiveDepth: 2001,
            healthBarWidth: 350, // Width of health bar (increased from 300)
            healthBarHeight: 38, // Height of health bar (slightly reduced from 45px)
            nameTextHeight: 46, // Height for name text area (slightly reduced from 54px)
            nameTextPadding: 8, // Padding from left edge for name text
            patternSpacing: 45, // Horizontal spacing between grid pattern symbols (1.5x from 30)
            patternRowSpacing: 18, // Vertical spacing between rows (1.5x from 12)
            patternOffset: 23, // Offset for staggered grid pattern (1.5x from 15, rounded)
            patternSymbolSize: 32 // Font size for pattern symbols (1.5x from 21, rounded)
        };
        
        console.log('✨ FuturisticHealthBar initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    create() {
        console.log('🔍 HEALTHBAR_DEBUG: Creating health bar');
        console.log('🔍 HEALTHBAR_DEBUG: Scene:', this.scene.scene.key);
        console.log('🔍 HEALTHBAR_DEBUG: Config position:', { x: this.config.x, y: this.config.y });
        console.log('🔍 HEALTHBAR_DEBUG: Scene camera:', {
            zoom: this.scene.cameras.main.zoom,
            scrollX: this.scene.cameras.main.scrollX,
            scrollY: this.scene.cameras.main.scrollY,
            width: this.scene.cameras.main.width,
            height: this.scene.cameras.main.height
        });
        
        // Create main container (position & scale will be applied via virtual coordinate helper)
        this.container = this.scene.add.container(this.config.x, this.config.y);
        this.container.setDepth(2000);
        this.container.setScrollFactor(0);
        this.updateContainerTransform(this.scene?.uiScale, this.scene?.viewportInfo);
        
        console.log('🔍 HEALTHBAR_DEBUG: Container created at:', { x: this.container.x, y: this.container.y, depth: this.container.depth });
        
        if (this.scene?.events?.on) {
            this.scene.events.on('uiScaleChanged', this.handleUiScaleChanged, this);
        }
        
        // Determine initial positions based on active character
        // Active card is at (0, 0), inactive card is offset left and above
        const tireekIsActive = this.activeCharacter === 'tireek';
        const tireekX = tireekIsActive ? 0 : this.config.cardOffset.x;
        const tireekY = tireekIsActive ? 0 : this.config.cardOffset.y;
        const trystonX = tireekIsActive ? this.config.cardOffset.x : 0;
        const trystonY = tireekIsActive ? this.config.cardOffset.y : 0;
        
        // Create inactive card FIRST (so it's behind), then active card (so it's on top)
        if (tireekIsActive) {
            // Tireek is active, create Tryston first (inactive)
            this.createCard('tryston', trystonX, trystonY);
            // Then create Tireek (active) - will be on top
            this.createCard('tireek', tireekX, tireekY);
        } else {
            // Tryston is active, create Tireek first (inactive)
            this.createCard('tireek', tireekX, tireekY);
            // Then create Tryston (active) - will be on top
            this.createCard('tryston', trystonX, trystonY);
        }
        
        // Set initial active state
        this.updateActiveState();
        
        // Start glow animation
        this.startGlowAnimation();
        
        console.log('✨ FuturisticHealthBar created');
    }

    handleUiScaleChanged(newScale, viewportInfo) {
        this.updateContainerTransform(newScale, viewportInfo);
    }

    updateContainerTransform(newScale, viewportInfo) {
        if (!this.container) return;
        
        const camera = this.scene?.cameras?.main;
        const uiScale = (typeof newScale === 'number')
            ? newScale
            : (this.scene?.uiScale ?? camera?.zoom ?? 1);
        
        const screenX = this.config.x * uiScale;
        const screenY = this.config.y * uiScale;
        
        this.container.setScale(uiScale);
        this.container.setPosition(screenX, screenY);
        
        this.logPositionDiagnostics('updateContainerTransform', viewportInfo, uiScale);
    }

    logPositionDiagnostics(context = 'unspecified', viewportInfo = null, forcedScale = null) {
        if (!this.container || !this.scene || !this.scene.cameras?.main) {
            console.warn('🔍 HEALTHBAR_DEBUG: Unable to log position diagnostics (missing camera/container)', { context });
            return;
        }
        
        const camera = this.scene.cameras.main;
        const viewport = viewportInfo || this.scene.viewportInfo || camera.viewport || {
            x: 0,
            y: 0,
            width: camera.width,
            height: camera.height
        };
        const uiScale = forcedScale ?? this.scene.uiScale ?? camera.zoom ?? 1;
        const zoom = camera.zoom ?? 1;
        const scrollX = camera.scrollX ?? 0;
        const scrollY = camera.scrollY ?? 0;
        
        const actualMarginX = (this.container.x - scrollX) * zoom;
        const actualMarginY = (this.container.y - scrollY) * zoom;
        const expectedMarginX = this.config.x * uiScale;
        const expectedMarginY = this.config.y * uiScale;
        
        const actualScreenX = viewport.x + actualMarginX;
        const actualScreenY = viewport.y + actualMarginY;
        const expectedScreenX = viewport.x + expectedMarginX;
        const expectedScreenY = viewport.y + expectedMarginY;
        
        console.log('🔍 HEALTHBAR_DEBUG: Position diagnostics', {
            context,
            uiScale,
            viewport,
            camera: {
                zoom,
                scrollX,
                scrollY
            },
            configPosition: {
                x: this.config.x,
                y: this.config.y
            },
            containerPosition: {
                x: this.container.x,
                y: this.container.y,
                scaleX: this.container.scaleX,
                scaleY: this.container.scaleY
            },
            expectedScreenPosition: {
                x: expectedScreenX,
                y: expectedScreenY
            },
            actualScreenPosition: {
                x: actualScreenX,
                y: actualScreenY
            },
            marginDeltaPx: {
                x: actualMarginX - expectedMarginX,
                y: actualMarginY - expectedMarginY
            }
        });
    }
    
    createCard(characterName, offsetX, offsetY) {
        const card = this.cards[characterName];
        const charData = this.characters[characterName];
        
        // Calculate total card height (name area + health bar)
        const totalCardHeight = this.config.nameTextHeight + this.config.healthBarHeight;
        
        // Create card container
        card.container = this.scene.add.container(offsetX, offsetY);
        const isActive = characterName === this.activeCharacter;
        card.container.setDepth(isActive ? this.config.activeDepth : this.config.inactiveDepth);
        card.container.setScale(1.0); // Same scale for both
        card.container.setAlpha(1.0); // Same opacity, will be dimmed via tint
        
        // Drop shadow for card (positioned behind the card)
        // Store shadow properties for later updates
        card.shadowOffset = 4; // Offset for drop shadow
        card.shadowBlur = 8; // Blur amount (simulated with larger size)
        card.shadow = this.scene.add.graphics();
        // Shadow should be behind the card - use much lower depth
        card.shadow.setDepth(isActive ? this.config.activeDepth - 10 : this.config.inactiveDepth - 10);
        // offsetX and offsetY are already relative to container, so use them directly
        this.updateShadow(card, offsetX, offsetY, totalCardHeight, isActive);
        card.shadow.setVisible(true); // Show shadow for both cards
        
        // Background (dark) - extended to fit name + health bar
        card.bg = this.scene.add.rectangle(
            0, 0,
            this.config.width,
            totalCardHeight,
            0x1a1a2e
        );
        card.bg.setOrigin(0, 0);
        card.container.add(card.bg);
        
        // Name text position (at top of card)
        const nameTextX = this.config.nameTextPadding;
        const nameTextY = this.config.nameTextHeight / 2;
        
        // Health bar position (below name)
        const healthBarX = 0;
        const healthBarY = this.config.nameTextHeight;
        
        // Health bar background (dark, shows missing health)
        card.healthBarBg = this.scene.add.rectangle(
            healthBarX,
            healthBarY,
            this.config.healthBarWidth,
            this.config.healthBarHeight,
            0x2a2a2a
        );
        card.healthBarBg.setOrigin(0, 0);
        card.container.add(card.healthBarBg);
        
        // Health fill graphics (yellow, shrinks with damage) - above health bar bg
        card.healthFill = this.scene.add.graphics();
        card.healthFill.setDepth(1); // Above rectangles
        card.container.add(card.healthFill);
        
        // Damage flash graphics (red flash when taking damage)
        card.damageFlash = this.scene.add.graphics();
        card.damageFlash.setDepth(1.2); // Above health fill, below pattern
        card.container.add(card.damageFlash);
        
        // Heal flash graphics (green flash when healing)
        card.healFlash = this.scene.add.graphics();
        card.healFlash.setDepth(1.2); // Above health fill, below pattern
        card.container.add(card.healFlash);
        
        // Create grid pattern symbols (will be positioned and shown based on health)
        this.createHealthBarPattern(card, healthBarX, healthBarY);
        
        // Name text (at top of card, above health bar)
        card.nameText = this.scene.add.text(
            nameTextX,
            nameTextY,
            charData.name,
            {
                fontSize: GAME_CONFIG.ui.fontSize.small,
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                fill: '#FFFFFF'
            }
        );
        card.nameText.setOrigin(0, 0.5); // Left-aligned, vertically centered in name area
        card.nameText.setDepth(2); // Above rectangles
        card.container.add(card.nameText);
        
        // Health percentage text (top right, opposite name)
        card.healthText = this.scene.add.text(
            this.config.width - this.config.nameTextPadding, // Right side with padding
            nameTextY, // Same Y as name (in name area)
            '100%',
            {
                fontSize: GAME_CONFIG.ui.fontSize.small,
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                fill: '#FFFFFF'
            }
        );
        card.healthText.setOrigin(1, 0.5); // Right-aligned, vertically centered
        card.healthText.setDepth(3); // Above everything
        card.container.add(card.healthText);
        
        // Grey border - add last so it's on top
        card.border = this.scene.add.graphics();
        card.border.setDepth(4); // Top layer
        this.updateCardBorder(characterName);
        card.container.add(card.border);
        
        console.log(`✅ Created card for ${characterName}:`, {
            bg: !!card.bg,
            nameText: !!card.nameText,
            healthBarBg: !!card.healthBarBg,
            healthFill: !!card.healthFill,
            healthText: !!card.healthText,
            border: !!card.border,
            containerChildren: card.container.list.length
        });
        
        // Add card to main container
        this.container.add(card.container);
        
        // Update card health display
        this.updateCardHealth(characterName);
    }
    
    createHealthBarPattern(card, healthBarX, healthBarY) {
        // Create grid pattern of "+" symbols
        const horizontalSpacing = this.config.patternSpacing;
        const verticalSpacing = this.config.patternRowSpacing;
        const offset = this.config.patternOffset;
        const barWidth = this.config.healthBarWidth;
        const barHeight = this.config.healthBarHeight;
        const symbolSize = this.config.patternSymbolSize;
        
        // Estimate symbol bounding box (text symbols are roughly square)
        // For a "+" symbol, the actual rendered size is typically smaller than font size
        const symbolHalfWidth = symbolSize * 0.4; // More realistic estimate for text rendering
        const symbolHalfHeight = symbolSize * 0.4; // More realistic estimate for text rendering
        
        // Calculate grid positions (staggered pattern)
        // Center symbols vertically in the health bar
        const centerY = healthBarY + (barHeight / 2);
        
        // Calculate rows and cols - allow symbols to fit even if they slightly overflow
        // For vertical: if bar is too small, just use center; otherwise space them
        const canFitMultipleRows = barHeight >= symbolSize;
        const rows = canFitMultipleRows ? Math.max(1, Math.floor(barHeight / verticalSpacing)) : 1;
        const cols = Math.max(1, Math.floor(barWidth / horizontalSpacing));
        
        card.patternSymbols = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Staggered pattern: offset every other row
                const xOffset = (row % 2 === 0) ? 0 : offset;
                const x = healthBarX + (col * horizontalSpacing) + xOffset + (horizontalSpacing / 2);
                
                // Position vertically: center if only one row, otherwise space them
                let y;
                if (rows === 1) {
                    y = centerY; // Center in the bar
                } else {
                    y = healthBarY + (row * verticalSpacing) + (verticalSpacing / 2);
                }
                
                // More lenient bounds check - allow symbols to slightly extend beyond edges
                // since text rendering is often smaller than font size
                const symbolLeft = x - symbolHalfWidth;
                const symbolRight = x + symbolHalfWidth;
                const symbolTop = y - symbolHalfHeight;
                const symbolBottom = y + symbolHalfHeight;
                
                // Allow slight overflow (5px margin) since text rendering is imprecise
                if (symbolLeft >= healthBarX - 5 && 
                    symbolRight <= healthBarX + barWidth + 5 && 
                    symbolTop >= healthBarY - 5 && 
                    symbolBottom <= healthBarY + barHeight + 5) {
                    
                    const symbol = this.scene.add.text(x, y, '+', {
                        fontSize: `${symbolSize}px`,
                        fontFamily: GAME_CONFIG.ui.fontFamily,
                        fontWeight: 'bold',
                        fill: '#FFFFFF'
                    });
                    symbol.setOrigin(0.5, 0.5);
                    symbol.setAlpha(0.25); // Low opacity - use setAlpha() method instead of style property
                    symbol.setDepth(1.5); // Between health fill and text
                    symbol.setVisible(false); // Hidden by default, shown based on health
                    card.container.add(symbol);
                    card.patternSymbols.push(symbol);
                }
            }
        }
        
        // Debug: log pattern symbol creation
        console.log(`✨ Created ${card.patternSymbols.length} pattern symbols for ${card.nameText ? card.nameText.text : 'card'}`);
    }
    
    // ========================================
    // UPDATE METHODS
    // ========================================
    
    update(tireekHealth, trystonHealth, activeCharacter) {
        // console.log(`💊 FuturisticHealthBar.update() called - New: Tireek=${tireekHealth}, Tryston=${trystonHealth}, Active=${activeCharacter}`);
        // console.log(`💊 FuturisticHealthBar previous stored - Tireek=${this.characters.tireek.health}, Tryston=${this.characters.tryston.health}`);
        
        // Check if health decreased (damage taken) or increased (healing)
        const previousTireekHealth = this.characters.tireek.health;
        const previousTrystonHealth = this.characters.tryston.health;
        const tireekDamage = previousTireekHealth - tireekHealth;
        const trystonDamage = previousTrystonHealth - trystonHealth;
        const tireekHeal = tireekHealth - previousTireekHealth;
        const trystonHeal = trystonHealth - previousTrystonHealth;
        const healthDecreased = (tireekDamage > 0) || (trystonDamage > 0);
        const healthIncreased = (tireekHeal > 0) || (trystonHeal > 0);
        // console.log(`💊 Health changes - Tireek: ${tireekHeal > 0 ? '+' : ''}${-tireekDamage} (heal:${tireekHeal}, dmg:${tireekDamage}), Tryston: ${trystonHeal > 0 ? '+' : ''}${-trystonDamage} (heal:${trystonHeal}, dmg:${trystonDamage})`);
        // console.log(`💊 healthDecreased: ${healthDecreased}, healthIncreased: ${healthIncreased}`);
        
        // Show damage flash before updating health
        if (healthDecreased) {
            if (tireekDamage > 0) {
                this.showDamageFlash('tireek', tireekDamage, previousTireekHealth);
            }
            if (trystonDamage > 0) {
                this.showDamageFlash('tryston', trystonDamage, previousTrystonHealth);
            }
        }
        
        // Show heal flash before updating health
        if (healthIncreased) {
            if (tireekHeal > 0) {
                this.showHealFlash('tireek', tireekHeal, previousTireekHealth);
            }
            if (trystonHeal > 0) {
                this.showHealFlash('tryston', trystonHeal, previousTrystonHealth);
            }
        }
        
        // Update character data
        this.characters.tireek.health = tireekHealth;
        this.characters.tryston.health = trystonHealth;
        
        const previousActive = this.activeCharacter;
        this.activeCharacter = activeCharacter;
        
        // Update health displays for both cards (after a brief delay to show flash)
        if (healthDecreased || healthIncreased) {
            // Delay health update to show flash first
            // console.log(`💊 Health changed - delaying UI update by 150ms to show flash`);
            this.scene.time.delayedCall(150, () => {
                // console.log(`💊 Delayed UI update executing now`);
                this.updateCardHealth('tireek');
                this.updateCardHealth('tryston');
            });
        } else {
            // Update immediately if no health change
            // console.log(`💊 No health change detected - updating UI immediately`);
            this.updateCardHealth('tireek');
            this.updateCardHealth('tryston');
        }
        
        // If character changed, trigger shuffle animation
        if (previousActive !== activeCharacter && !this.isAnimating) {
            this.shuffleCards(activeCharacter);
        } else if (previousActive === activeCharacter) {
            // Update active state (in case opacity/colors need refresh)
            this.updateActiveState();
            
            // Pulse effect if damage was taken
            if (healthDecreased) {
                this.pulseOnDamage();
            }
        }
    }
    
    showDamageFlash(characterName, damageAmount, previousHealth) {
        const card = this.cards[characterName];
        if (!card.damageFlash) return;
        
        // Calculate the area that will be lost
        const healthBarX = 0;
        const healthBarY = this.config.nameTextHeight;
        const maxHealth = this.characters[characterName].maxHealth;
        
        // Calculate position and width of damage area
        // The damage area is from the new health position to the previous health position
        const newHealth = previousHealth - damageAmount;
        const newHealthPercent = newHealth / maxHealth;
        const previousHealthPercent = previousHealth / maxHealth;
        
        // Damage area starts at new health position and extends to previous health position
        const damageStartX = healthBarX + (this.config.healthBarWidth * newHealthPercent);
        const damageEndX = healthBarX + (this.config.healthBarWidth * previousHealthPercent);
        const damageWidth = damageEndX - damageStartX;
        
        // Clear previous flash
        card.damageFlash.clear();
        
        // Draw red flash over the damage area
        card.damageFlash.fillStyle(0xFF0000, 0.8); // Bright red, high opacity
        card.damageFlash.fillRect(
            damageStartX,
            healthBarY,
            damageWidth,
            this.config.healthBarHeight
        );
        
        // Fade out the flash
        this.scene.tweens.add({
            targets: { alpha: 0.8 },
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onUpdate: (tween) => {
                const alpha = tween.getValue();
                card.damageFlash.clear();
                card.damageFlash.fillStyle(0xFF0000, alpha);
                card.damageFlash.fillRect(
                    damageStartX,
                    healthBarY,
                    damageWidth,
                    this.config.healthBarHeight
                );
            },
            onComplete: () => {
                card.damageFlash.clear();
            }
        });
    }
    
    showHealFlash(characterName, healAmount, previousHealth) {
        const card = this.cards[characterName];
        if (!card.healFlash) return;
        
        // Calculate the area that will be gained
        const healthBarX = 0;
        const healthBarY = this.config.nameTextHeight;
        const maxHealth = this.characters[characterName].maxHealth;
        
        // Calculate position and width of heal area
        // The heal area is from the previous health position to the new health position
        const newHealth = previousHealth + healAmount;
        const newHealthPercent = Math.min(1, newHealth / maxHealth);
        const previousHealthPercent = previousHealth / maxHealth;
        
        // Heal area starts at previous health position and extends to new health position
        const healStartX = healthBarX + (this.config.healthBarWidth * previousHealthPercent);
        const healEndX = healthBarX + (this.config.healthBarWidth * newHealthPercent);
        const healWidth = healEndX - healStartX;
        
        // Clear previous flash
        card.healFlash.clear();
        
        // Draw green flash over the heal area
        card.healFlash.fillStyle(0x00FF00, 0.8); // Bright green, high opacity
        card.healFlash.fillRect(
            healStartX,
            healthBarY,
            healWidth,
            this.config.healthBarHeight
        );
        
        // Fade out the flash
        this.scene.tweens.add({
            targets: { alpha: 0.8 },
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onUpdate: (tween) => {
                const alpha = tween.getValue();
                card.healFlash.clear();
                card.healFlash.fillStyle(0x00FF00, alpha);
                card.healFlash.fillRect(
                    healStartX,
                    healthBarY,
                    healWidth,
                    this.config.healthBarHeight
                );
            },
            onComplete: () => {
                card.healFlash.clear();
            }
        });
    }
    
    updateShadow(card, containerX, containerY, height, isActive) {
        if (!card.shadow || !this.container) return;
        
        const scale = this.container.scaleX || 1;
        const absoluteX = this.container.x + (containerX * scale);
        const absoluteY = this.container.y + (containerY * scale);
        const width = (this.config.width + card.shadowBlur) * scale;
        const rectHeight = (height + card.shadowBlur) * scale;
        const offset = card.shadowOffset * scale;
        const cornerRadius = 4 * scale;
        
        card.shadow.clear();
        const shadowOpacity = isActive ? 0.3 : 0.15;
        card.shadow.fillStyle(0x000000, shadowOpacity);
        card.shadow.fillRoundedRect(
            absoluteX + offset,
            absoluteY + offset,
            width,
            rectHeight,
            cornerRadius
        );
    }
    
    shuffleCards(newActiveCharacter) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        const tireekCard = this.cards.tireek.container;
        const trystonCard = this.cards.tryston.container;
        const tireekCardData = this.cards.tireek;
        const trystonCardData = this.cards.tryston;
        
        // Determine which card should be in front
        const activeCard = newActiveCharacter === 'tireek' ? tireekCard : trystonCard;
        const inactiveCard = newActiveCharacter === 'tireek' ? trystonCard : tireekCard;
        const activeCardData = newActiveCharacter === 'tireek' ? tireekCardData : trystonCardData;
        const inactiveCardData = newActiveCharacter === 'tireek' ? trystonCardData : tireekCardData;
        
        // Store current positions
        const activeStartX = activeCard.x;
        const activeStartY = activeCard.y;
        const inactiveStartX = inactiveCard.x;
        const inactiveStartY = inactiveCard.y;
        
        // Calculate target positions (active goes to front position, inactive to offset)
        const activeTargetX = 0;
        const activeTargetY = 0;
        const inactiveTargetX = this.config.cardOffset.x;
        const inactiveTargetY = this.config.cardOffset.y;
        
        // Calculate total card height for shadow updates
        const totalCardHeight = this.config.nameTextHeight + this.config.healthBarHeight;
        
        // Animate cards shuffling (slide past each other)
        // Active card moves to front position (0, 0), inactive moves to offset position (left and above)
        this.scene.tweens.add({
            targets: activeCard,
            x: activeTargetX,
            y: activeTargetY,
            duration: this.config.shuffleDuration,
            ease: 'Power2',
            onUpdate: () => {
                // Update shadow position during animation
                this.updateShadow(activeCardData, activeCard.x, activeCard.y, totalCardHeight, true);
            }
        });
        
        this.scene.tweens.add({
            targets: inactiveCard,
            x: inactiveTargetX,
            y: inactiveTargetY,
            duration: this.config.shuffleDuration,
            ease: 'Power2',
            onUpdate: () => {
                // Update shadow position during animation
                this.updateShadow(inactiveCardData, inactiveCard.x, inactiveCard.y, totalCardHeight, false);
            },
            onComplete: () => {
                this.isAnimating = false;
                this.updateActiveState();
            }
        });
        
        // Update depths and reorder in container (order matters more than depth in containers)
        activeCard.setDepth(this.config.activeDepth);
        inactiveCard.setDepth(this.config.inactiveDepth);
        
        // Reorder children in main container so active card renders on top
        // Remove both cards
        this.container.remove(activeCard);
        this.container.remove(inactiveCard);
        // Add inactive first (behind), then active (on top)
        this.container.add(inactiveCard);
        this.container.add(activeCard);
    }
    
    updateActiveState() {
        // Update visual state for both cards based on active character
        const tireekIsActive = this.activeCharacter === 'tireek';
        
        // Tireek card
        this.updateCardVisualState('tireek', tireekIsActive);
        
        // Tryston card
        this.updateCardVisualState('tryston', !tireekIsActive);
    }
    
    updateCardVisualState(characterName, isActive) {
        const card = this.cards[characterName];
        
        if (!card.container) {
            console.warn(`⚠️ Card container not found for ${characterName}`);
            return;
        }
        
        // Update depth (active on top)
        card.container.setDepth(isActive ? this.config.activeDepth : this.config.inactiveDepth);
        
        // Update shadow visibility and depth
        if (card.shadow) {
            card.shadow.setDepth(isActive ? this.config.activeDepth - 10 : this.config.inactiveDepth - 10);
            card.shadow.setVisible(true); // Show shadow for both cards
            // Update shadow opacity based on active state
            const totalCardHeight = this.config.nameTextHeight + this.config.healthBarHeight;
            // Get current card position relative to container
            const containerX = card.container.x;
            const containerY = card.container.y;
            this.updateShadow(card, containerX, containerY, totalCardHeight, isActive);
        }
        
        // Dim inactive card by changing fill colors (rectangles don't support tint)
        if (!this.isAnimating) {
            if (isActive) {
                // Active card: full brightness colors
                if (card.bg) {
                    card.bg.setFillStyle(0x1a1a2e); // Original dark background
                }
                if (card.healthBarBg) {
                    card.healthBarBg.setFillStyle(0x2a2a2a); // Original dark grey
                }
                // Text objects can use tint
                if (card.nameText) {
                    if (typeof card.nameText.clearTint === 'function') {
                        card.nameText.clearTint();
                    } else if (typeof card.nameText.setTint === 'function') {
                        card.nameText.setTint(0xffffff);
                    }
                }
                if (card.healthText) {
                    if (typeof card.healthText.clearTint === 'function') {
                        card.healthText.clearTint();
                    } else if (typeof card.healthText.setTint === 'function') {
                        card.healthText.setTint(0xffffff);
                    }
                }
            } else {
                // Inactive card: dimmed colors (darker versions)
                if (card.bg) {
                    card.bg.setFillStyle(0x0f0f1a); // Dimmed dark background
                }
                if (card.healthBarBg) {
                    card.healthBarBg.setFillStyle(0x1a1a1a); // Dimmed dark grey
                }
                // Text objects can use tint
                if (card.nameText && typeof card.nameText.setTint === 'function') {
                    card.nameText.setTint(0x999999); // Dimmed white
                }
                if (card.healthText && typeof card.healthText.setTint === 'function') {
                    card.healthText.setTint(0x666666); // Dimmed text
                }
            }
        }
        
        // Update border
        this.updateCardBorder(characterName);
    }
    
    updateCardHealth(characterName) {
        const card = this.cards[characterName];
        const charData = this.characters[characterName];
        
        // console.log(`💊 updateCardHealth(${characterName}) - Health: ${charData.health}/${charData.maxHealth}`);
        
        if (!card.healthFill || !card.healthText) {
            // console.warn(`💊 updateCardHealth(${characterName}) - Missing healthFill or healthText!`);
            return;
        }
        
        // Clear previous graphics
        card.healthFill.clear();
        
        // Calculate health percentage
        const healthPercent = Math.max(0, Math.min(1, charData.health / charData.maxHealth));
        const healthWidth = this.config.healthBarWidth * healthPercent;
        // console.log(`💊 updateCardHealth(${characterName}) - HealthPercent: ${(healthPercent * 100).toFixed(1)}%, HealthWidth: ${healthWidth.toFixed(1)}px`);
        
        // Health bar position (below name)
        const healthBarX = 0;
        const healthBarY = this.config.nameTextHeight;
        
        // Health fill color - transitions from yellow to red as health decreases
        const isActive = characterName === this.activeCharacter;
        
        // Calculate color based on health percentage (interpolate from yellow to red)
        // Both active and inactive cards get smooth color transition, inactive is just dimmed
        let healthColor;
        if (healthPercent > 0.5) {
            // High health: yellow to orange-yellow transition
            const t = (healthPercent - 0.5) / 0.5; // 0 to 1 as health goes from 50% to 100%
            const baseColor = this.interpolateColor(0xCCAA00, 0xCC8800, t); // Yellow to orange-yellow
            // Dim inactive card colors
            healthColor = isActive ? baseColor : this.desaturateColor(baseColor, 0.4);
        } else {
            // Low health: orange-yellow to red transition
            const t = healthPercent / 0.5; // 0 to 1 as health goes from 0% to 50%
            const baseColor = this.interpolateColor(0xFF4400, 0xCC8800, t); // Red to orange-yellow
            // Dim inactive card colors
            healthColor = isActive ? baseColor : this.desaturateColor(baseColor, 0.4);
        }
        
        // Draw yellow health fill
        if (healthWidth > 0) {
            card.healthFill.fillStyle(healthColor, 1.0);
            card.healthFill.fillRect(healthBarX, healthBarY, healthWidth, this.config.healthBarHeight);
            
            // Subtle highlight on top (less prominent for inactive)
            card.healthFill.fillStyle(0xFFFFFF, isActive ? 0.2 : 0.1);
            card.healthFill.fillRect(healthBarX, healthBarY, healthWidth, this.config.healthBarHeight * 0.3);
        }
        
        // Update pattern symbols visibility (show over filled health area for both cards)
        if (card.patternSymbols && card.patternSymbols.length > 0) {
            card.patternSymbols.forEach(symbol => {
                // Get symbol position relative to card container
                // Symbols are added to card.container, so their x is already relative
                const symbolX = symbol.x;
                // Show symbol if it's within the filled health area (with small margin for visibility)
                const isVisible = symbolX >= healthBarX - 5 && symbolX <= healthBarX + healthWidth + 5;
                symbol.setVisible(isVisible); // Show on both active and inactive cards
                // Dim inactive card symbols slightly
                if (!isActive) {
                    symbol.setAlpha(0.1); // Lower opacity for inactive
                } else {
                    symbol.setAlpha(0.25); // Normal opacity for active
                }
            });
        }
        
        // Update health text
        const healthPercentText = Math.round(healthPercent * 100);
        card.healthText.setText(`${healthPercentText}%`);
        // console.log(`💊 updateCardHealth(${characterName}) - Set health text to: "${healthPercentText}%"`);
        
        // Text color (white, same as name)
        card.healthText.setStyle({ fill: '#FFFFFF' });
        // Same opacity for both (dimming handled via tint)
        card.healthText.setAlpha(1.0);
        // console.log(`💊 updateCardHealth(${characterName}) - COMPLETE`);
    }
    
    updateCardBorder(characterName) {
        const card = this.cards[characterName];
        const isActive = characterName === this.activeCharacter;
        
        if (!card.border) return;
        
        card.border.clear();
        
        // Simple grey border
        const borderColor = 0x808080; // Grey
        const borderWidth = this.config.borderWidth;
        const width = this.config.width;
        const totalHeight = this.config.nameTextHeight + this.config.healthBarHeight;
        const alpha = isActive ? 1.0 : 0.6;
        
        // Main border (grey) - extended to fit name + health bar
        card.border.lineStyle(borderWidth, borderColor, alpha);
        card.border.strokeRect(0, 0, width, totalHeight);
    }
    
    desaturateColor(color, factor) {
        // Simple desaturation by mixing with grey
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        const grey = (r + g + b) / 3;
        
        const newR = Math.round(r * (1 - factor) + grey * factor);
        const newG = Math.round(g * (1 - factor) + grey * factor);
        const newB = Math.round(b * (1 - factor) + grey * factor);
        
        return (newR << 16) | (newG << 8) | newB;
    }
    
    interpolateColor(color1, color2, t) {
        // Interpolate between two colors (t: 0 = color1, 1 = color2)
        t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
        
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;
        
        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return (r << 16) | (g << 8) | b;
    }
    
    // ========================================
    // ANIMATIONS
    // ========================================
    
    startGlowAnimation() {
        // No glow animation needed with grey borders
        // This method kept for compatibility but does nothing
    }
    
    pulseOnDamage() {
        // Pulse effect when taking damage (only on active card)
        if (this.pulseTween) {
            this.pulseTween.stop();
        }
        
        const activeCard = this.cards[this.activeCharacter].container;
        if (!activeCard) return;
        
        this.pulseTween = this.scene.tweens.add({
            targets: activeCard,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
    }
    
    // ========================================
    // CLEANUP
    // ========================================
    
    destroy() {
        if (this.scene?.events?.off) {
            this.scene.events.off('uiScaleChanged', this.handleUiScaleChanged, this);
        }
        
        // Stop all tweens
        if (this.glowTween) {
            this.glowTween.stop();
        }
        if (this.pulseTween) {
            this.pulseTween.stop();
        }
        if (this.shuffleTween) {
            this.shuffleTween.stop();
        }
        
        // Destroy container (will destroy all children)
        if (this.container) {
            this.container.destroy();
        }
        
        // console.log('✨ FuturisticHealthBar destroyed');
    }
}

// Make available globally
window.FuturisticHealthBar = FuturisticHealthBar;
