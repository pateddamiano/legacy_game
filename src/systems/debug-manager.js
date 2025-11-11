// ========================================
// DEBUG MANAGER
// ========================================
// Handles debug overlay, coordinate recording, grid overlay, and debug visuals

class DebugManager {
    constructor(scene) {
        this.scene = scene;
        
        // State
        this.isTestMode = false;
        this.coordinateRecordingEnabled = false;
        this.debugOverlayVisible = false;
        this.gridOverlayVisible = false;
        this.debugMode = false;
        this.recordedPositions = [];
        
        // UI elements
        this.debugOverlayContainer = null;
        this.debugPositionText = null;
        this.debugCameraText = null;
        this.debugInstructionsText = null;
        this.gridGraphics = null;
        this.debugGraphics = null;
        this.characterIndicator = null;
        this.characterText = null;
        this.attackIndicator = null;
        this.attackText = null;
        
        // Input
        this.recordKey = null;
        this.recordKeyCooldown = 0;
        this.debugToggleKey = null;
        this.gridToggleKey = null;
        
        // References (set during initialization)
        this.player = null;
        this.enemies = null;
        this.streetTopLimit = 0;
        this.streetBottomLimit = 0;
        this.getPlayerAttackHitbox = null; // Function reference
        
        console.log('🧪 DebugManager initialized');
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    
    initialize(isTestMode, coordinateRecordingEnabled, debugOverlayVisible) {
        this.isTestMode = isTestMode || false;
        this.coordinateRecordingEnabled = coordinateRecordingEnabled || false;
        this.debugOverlayVisible = debugOverlayVisible || false;
        
        if (this.isTestMode || window.DEBUG_MODE) {
            this.createDebugOverlay();
            this.setupCoordinateRecording();
            this.createDebugUI();
        }
    }
    
    setReferences(player, enemies, streetTopLimit, streetBottomLimit, getPlayerAttackHitbox) {
        this.player = player;
        this.enemies = enemies;
        this.streetTopLimit = streetTopLimit;
        this.streetBottomLimit = streetBottomLimit;
        this.getPlayerAttackHitbox = getPlayerAttackHitbox;
    }
    
    // ========================================
    // UPDATE LOOP
    // ========================================
    
    update() {
        if (this.isTestMode || window.DEBUG_MODE) {
            this.updateCoordinateRecording();
            this.updateDebugOverlay();
        }
    }
    
    // ========================================
    // DEBUG OVERLAY
    // ========================================
    
    createDebugOverlay() {
        console.log('🧪 Creating debug overlay...');
        
        // Don't create if already exists
        if (this.debugOverlayContainer) {
            return;
        }
        
        // Create container for debug overlay
        this.debugOverlayContainer = this.scene.add.container(0, 0);
        this.debugOverlayContainer.setDepth(20000);
        this.debugOverlayContainer.setScrollFactor(0); // Fixed to screen
        
        // Position display (top-left)
        this.debugPositionText = this.scene.add.text(10, 10, '', {
            fontSize: '14px',
            fill: '#00ff00',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.debugPositionText.setOrigin(0, 0);
        this.debugPositionText.setScrollFactor(0);
        this.debugPositionText.setDepth(20001);
        
        // Camera info (top-right)
        this.debugCameraText = this.scene.add.text(1190, 10, '', {
            fontSize: '14px',
            fill: '#00ffff',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.debugCameraText.setOrigin(1, 0);
        this.debugCameraText.setScrollFactor(0);
        this.debugCameraText.setDepth(20001);
        
        // Instructions (bottom-left)
        this.debugInstructionsText = this.scene.add.text(10, 710, 'R: Record | D: Toggle Overlay | G: Grid', {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.debugInstructionsText.setOrigin(0, 1);
        this.debugInstructionsText.setScrollFactor(0);
        this.debugInstructionsText.setDepth(20001);
        
        // Grid overlay (initially hidden)
        this.gridOverlayVisible = false;
        this.gridGraphics = this.scene.add.graphics();
        this.gridGraphics.setDepth(19999);
        this.gridGraphics.setScrollFactor(1);
        
        // Set up toggle keys (only if not already set)
        if (!this.debugToggleKey) {
            this.debugToggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        }
        if (!this.gridToggleKey) {
            this.gridToggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
        }
        
        // Add overlay elements to container
        this.debugOverlayContainer.add([
            this.debugPositionText,
            this.debugCameraText,
            this.debugInstructionsText
        ]);
        
        // Set initial visibility based on test mode
        this.debugOverlayContainer.setVisible(this.debugOverlayVisible);
    }
    
    updateDebugOverlay() {
        if ((!this.isTestMode && !window.DEBUG_MODE) || !this.player) return;
        
        // Initialize overlay if it doesn't exist yet
        if (!this.debugOverlayContainer && (this.isTestMode || window.DEBUG_MODE)) {
            this.createDebugOverlay();
            this.setupCoordinateRecording();
        }
        
        // Toggle overlay visibility
        if (Phaser.Input.Keyboard.JustDown(this.debugToggleKey)) {
            this.toggleOverlay();
        }
        
        // Toggle grid overlay
        if (Phaser.Input.Keyboard.JustDown(this.gridToggleKey)) {
            this.toggleGrid();
        }
        
        if (!this.debugOverlayVisible || !this.debugPositionText || !this.scene.physics || !this.scene.physics.world || !this.scene.physics.world.bounds) return;
        
        // Update position display
        const worldBounds = this.scene.physics.world.bounds;
        const percentage = ((this.player.x - worldBounds.x) / worldBounds.width * 100).toFixed(2);
        
        this.debugPositionText.setText(
            `Player Position\n` +
            `X: ${Math.round(this.player.x)}\n` +
            `Y: ${Math.round(this.player.y)}\n` +
            `Progress: ${percentage}%\n` +
            `Recorded: ${this.recordedPositions.length}`
        );
        
        // Update camera display
        const camera = this.scene.cameras.main;
        const cameraRightEdge = camera.scrollX + camera.width;
        const worldRightEdge = worldBounds.x + worldBounds.width;
        const atEnd = cameraRightEdge >= worldRightEdge - 10;
        
        this.debugCameraText.setText(
            `Camera\n` +
            `X: ${Math.round(camera.scrollX)}\n` +
            `Right: ${Math.round(cameraRightEdge)}\n` +
            `World End: ${Math.round(worldRightEdge)}\n` +
            `At End: ${atEnd ? 'YES' : 'NO'}`
        );
        
        // Update grid overlay
        if (this.gridOverlayVisible) {
            this.updateGridOverlay();
        }
    }
    
    toggleOverlay() {
        this.debugOverlayVisible = !this.debugOverlayVisible;
        if (this.debugOverlayContainer) {
            this.debugOverlayContainer.setVisible(this.debugOverlayVisible);
        }
        console.log(`🧪 Debug overlay: ${this.debugOverlayVisible ? 'ON' : 'OFF'}`);
    }
    
    toggleGrid() {
        this.gridOverlayVisible = !this.gridOverlayVisible;
        this.updateGridOverlay();
        console.log(`🧪 Grid overlay: ${this.gridOverlayVisible ? 'ON' : 'OFF'}`);
    }
    
    updateGridOverlay() {
        if (!this.gridOverlayVisible || !this.scene.physics || !this.scene.physics.world || !this.scene.physics.world.bounds) {
            if (this.gridGraphics) this.gridGraphics.clear();
            return;
        }
        
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x00ff00, 0.3);
        
        const camera = this.scene.cameras.main;
        const worldBounds = this.scene.physics.world.bounds;
        const startX = Math.floor(camera.scrollX / 100) * 100;
        const endX = Math.ceil((camera.scrollX + camera.width) / 100) * 100;
        const startY = 0;
        const endY = 720;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += 100) {
            this.gridGraphics.moveTo(x, startY);
            this.gridGraphics.lineTo(x, endY);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += 100) {
            this.gridGraphics.moveTo(startX, y);
            this.gridGraphics.lineTo(endX, y);
        }
        
        // Highlight current player X position
        this.gridGraphics.lineStyle(2, 0xff0000, 0.8);
        this.gridGraphics.moveTo(this.player.x, startY);
        this.gridGraphics.lineTo(this.player.x, endY);
        
        // Highlight world boundaries
        this.gridGraphics.lineStyle(2, 0x0000ff, 0.8);
        this.gridGraphics.moveTo(worldBounds.x, startY);
        this.gridGraphics.lineTo(worldBounds.x, endY);
        this.gridGraphics.moveTo(worldBounds.x + worldBounds.width, startY);
        this.gridGraphics.lineTo(worldBounds.x + worldBounds.width, endY);
    }
    
    // ========================================
    // COORDINATE RECORDING
    // ========================================
    
    setupCoordinateRecording() {
        console.log('🧪 Setting up coordinate recording...');
        
        // Create hotkey for recording coordinates
        this.recordKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.recordKeyCooldown = 0;
        
        console.log('🧪 Coordinate recording ready! Press R to record position.');
    }
    
    updateCoordinateRecording() {
        if ((!this.isTestMode && !window.DEBUG_MODE) || !this.player) return;
        
        // Initialize if not already done
        if (!this.recordKey && (this.isTestMode || window.DEBUG_MODE)) {
            this.setupCoordinateRecording();
        }
        
        if (!this.coordinateRecordingEnabled || !this.recordKey) return;
        
        // Update cooldown
        if (this.recordKeyCooldown > 0) {
            this.recordKeyCooldown -= 16; // Assume ~60fps
        }
        
        // Check if R key is pressed
        if (Phaser.Input.Keyboard.JustDown(this.recordKey) && this.recordKeyCooldown <= 0) {
            this.recordPosition();
            this.recordKeyCooldown = 250; // 250ms cooldown
        }
    }
    
    recordPosition() {
        if (!this.player || !this.scene.physics || !this.scene.physics.world || !this.scene.physics.world.bounds) return;
        
        const worldBounds = this.scene.physics.world.bounds;
        const camera = this.scene.cameras.main;
        
        const coords = {
            player: { 
                x: Math.round(this.player.x), 
                y: Math.round(this.player.y) 
            },
            camera: { 
                x: Math.round(camera.scrollX), 
                y: Math.round(camera.scrollY),
                rightEdge: Math.round(camera.scrollX + camera.width),
                width: camera.width
            },
            world: { 
                x: worldBounds.x,
                width: worldBounds.width,
                left: worldBounds.x,
                right: worldBounds.x + worldBounds.width
            },
            percentage: ((this.player.x - worldBounds.x) / worldBounds.width * 100).toFixed(2)
        };
        
        // Store recorded position
        this.recordedPositions.push({
            ...coords,
            timestamp: Date.now()
        });
        
        // Output to console with formatting
        console.log('%c📍 Position Recorded:', 'color: #00ff00; font-weight: bold; font-size: 14px;');
        console.log(JSON.stringify(coords, null, 2));
        console.log('%c📋 Copy-paste format:', 'color: #00ffff; font-weight: bold;');
        console.log(`{ x: ${coords.player.x}, y: ${coords.player.y} }`);
        console.log(`Percentage: ${coords.percentage}%`);
        console.log(`Camera right edge: ${coords.camera.rightEdge} (world end: ${coords.world.right})`);
        
        // Visual feedback
        this.showPositionMarker(coords.player.x, coords.player.y);
    }
    
    showPositionMarker(x, y) {
        // Create a visual marker at the recorded position
        const marker = this.scene.add.circle(x, y, 10, 0xff0000, 0.8);
        marker.setDepth(10000);
        marker.setStrokeStyle(2, 0xffffff);
        
        // Add text label
        const label = this.scene.add.text(x, y - 20, `${this.recordedPositions.length}`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            backgroundColor: '#ff0000',
            padding: { x: 4, y: 2 }
        });
        label.setOrigin(0.5);
        label.setDepth(10001);
        
        // Fade out after 3 seconds
        this.scene.tweens.add({
            targets: [marker, label],
            alpha: 0,
            duration: 3000,
            onComplete: () => {
                marker.destroy();
                label.destroy();
            }
        });
    }
    
    // ========================================
    // DEBUG UI
    // ========================================
    
    createDebugUI() {
        // Position debug UI elements below health bar and main debug text
        const debugUIStartY = 250; // Start well below health bar
        
        // Character selection indicator (debug only)
        this.characterIndicator = this.scene.add.rectangle(10, debugUIStartY, 200, 40, 0x000080);
        this.characterIndicator.setDepth(2000);
        this.characterIndicator.setScrollFactor(0);
        this.characterIndicator.setOrigin(0, 0);
        this.characterIndicator.setVisible(false); // Hidden by default
        
        this.characterText = this.scene.add.text(15, debugUIStartY + 20, `Character: UNKNOWN\nPress C to switch`, {
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
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        // Show/hide debug UI elements
        if (this.characterIndicator) this.characterIndicator.setVisible(this.debugMode);
        if (this.characterText) this.characterText.setVisible(this.debugMode);
        if (this.attackIndicator) this.attackIndicator.setVisible(this.debugMode);
        if (this.attackText) this.attackText.setVisible(this.debugMode);
        
        if (!this.debugMode) {
            // Clear debug graphics when turning off
            if (this.debugGraphics) this.debugGraphics.clear();
        }
        
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
    }
    
    // ========================================
    // DEBUG VISUALS
    // ========================================
    
    updateVisuals(debugData) {
        if (!this.debugMode || !this.debugGraphics) return;
        
        // Clear previous debug drawings
        this.debugGraphics.clear();
        
        // Draw player hitbox
        this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0x00ff00); // Green for player
        const playerBounds = this.player.getBounds();
        this.debugGraphics.strokeRect(
            playerBounds.x,
            playerBounds.y,
            playerBounds.width,
            playerBounds.height
        );
        
        // Draw player collision radius (scaled)
        const playerBodyRadius = HitboxHelpers.getBodyRadius(this.player, 'player');
        this.debugGraphics.lineStyle(1, 0x00ff00, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light green for collision radius
        this.debugGraphics.strokeCircle(this.player.x, this.player.y, playerBodyRadius);
        
        // Draw player attack hitbox if attacking
        const playerHitbox = this.getPlayerAttackHitbox ? this.getPlayerAttackHitbox() : null;
        if (playerHitbox) {
            this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000); // Red for attack hitbox
            this.debugGraphics.strokeRect(
                playerHitbox.x,
                playerHitbox.y,
                playerHitbox.width,
                playerHitbox.height
            );
        }
        
        // Draw enemy hitboxes and attack ranges
        if (this.enemies) {
            this.enemies.forEach(enemy => {
                if (!enemy.sprite) return;
                
                // Enemy body hitbox
                this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.bodyLineWidth, 0xff8800); // Orange for enemies
                const enemyBounds = enemy.sprite.getBounds();
                this.debugGraphics.strokeRect(
                    enemyBounds.x,
                    enemyBounds.y,
                    enemyBounds.width,
                    enemyBounds.height
                );
                
                // Enemy collision radius (scaled)
                const enemyBodyRadius = HitboxHelpers.getBodyRadius(enemy.sprite, 'enemy');
                this.debugGraphics.lineStyle(1, 0xff8800, HITBOX_CONFIG.debug.bodyCollisionAlpha); // Light orange for collision radius
                this.debugGraphics.strokeCircle(enemy.sprite.x, enemy.sprite.y, enemyBodyRadius);
                
                // Enemy detection range
                this.debugGraphics.lineStyle(1, 0x888888, 0.3); // Gray, semi-transparent
                this.debugGraphics.strokeCircle(
                    enemy.sprite.x,
                    enemy.sprite.y,
                    enemy.detectionRange
                );
                
                // Enemy attack range
                this.debugGraphics.lineStyle(1, 0xff0000, 0.5); // Red, semi-transparent
                this.debugGraphics.strokeCircle(
                    enemy.sprite.x,
                    enemy.sprite.y,
                    enemy.attackRange
                );
                
                // Enemy attack hitbox if attacking and can deal damage
                const enemyHitbox = enemy.getAttackHitbox();
                if (enemyHitbox) {
                    this.debugGraphics.lineStyle(HITBOX_CONFIG.debug.attackHitboxLineWidth, 0xff0000); // Red for active attack hitbox
                    this.debugGraphics.strokeRect(
                        enemyHitbox.x,
                        enemyHitbox.y,
                        enemyHitbox.width,
                        enemyHitbox.height
                    );
                }
                
                // Show windup indicator if enemy is winding up attack
                if (enemy.isWindingUp) {
                    this.debugGraphics.lineStyle(2, 0xffff00); // Yellow for windup
                    const windupRadius = 30 + (enemy.windupTimer / ENEMY_CONFIG.attackWindupDelay) * 20;
                    this.debugGraphics.strokeCircle(enemy.sprite.x, enemy.sprite.y - 40, windupRadius);
                }
            });
        }
        
        // Draw street boundaries
        this.debugGraphics.lineStyle(2, 0x0000ff, 0.7); // Blue for boundaries
        this.debugGraphics.strokeRect(0, this.streetTopLimit, 3600, this.streetBottomLimit - this.streetTopLimit);
    }
    
    setDebugGraphics(graphics) {
        this.debugGraphics = graphics;
    }
}

