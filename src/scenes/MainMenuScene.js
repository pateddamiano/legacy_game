// ========================================
// MAIN MENU SCENE
// ========================================
// Primary navigation hub for the game

class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
        this.assetsLoaded = false;
    }
    
    preload() {
        // Load essential assets if not already loaded
        if (!this.assetsLoaded) {
            console.log('🏠 MainMenuScene: Loading essential assets...');
            
            // Load essential assets only
            if (typeof ALL_CHARACTERS !== 'undefined' && typeof ALL_ENEMY_TYPES !== 'undefined') {
                // Load weapon assets
                this.load.image('vinylWeapon', 'assets/weapons/spritesheets/vinyl weapon.png');
                this.load.image('vinylWeaponSpinning', 'assets/weapons/spritesheets/vinyl weapon spinning.png');
                
                // Load background assets
                this.load.image('streetBackground', 'assets/backgrounds/Background.png');
                this.load.image('streetTexture', 'assets/backgrounds/StreetTexture.png');
                
                // Load pickup assets
                this.load.image('goldenMicrophone', 'assets/pickups/GoldenMicrophone_64x64.png');
                
                // Load title card and menu background
                this.load.image('titleCard', 'assets/title/TitleCard.png');
                this.load.image('menuBackground', 'assets/title/MenuBackground.png');
                
                // Menu music is now loaded in AudioBootScene
                
                console.log('🏠 MainMenuScene: Essential assets loading configured');
            }
            
            this.load.on('complete', () => {
                console.log('🏠 MainMenuScene: Essential assets loaded');
                this.assetsLoaded = true;
            });
        }
    }

    create() {
        console.log('🏠 ===== MAIN MENU SCENE CREATED =====');
        
        // Ensure UIScene is stopped (in case we returned from GameScene)
        if (this.scene.isActive('UIScene')) {
            console.log('🏠 Stopping UIScene...');
            this.scene.stop('UIScene');
        }

        // Use the same fixed virtual dimensions as the game world
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        
        // Apply the same layout manager as GameScene to maintain consistent aspect ratio
        LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        
        // Handle window resizing - reapply layout to maintain aspect ratio
        this.scale.on('resize', (gameSize) => {
            console.log('📏 Resizing MainMenuScene...');
            LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        });
        
        // Check for debug mode - immediately redirect to test level
        if (window.DIRECT_LEVEL_LOAD && window.TEST_LEVEL_ID === 'test') {
            console.log('%c🧪 DEBUG MODE: Redirecting from MainMenuScene to test level', 'color: #00ff00; font-weight: bold;');
            this.time.delayedCall(100, () => {
                this.scene.start('GameScene', {
                    character: 'tireek',
                    levelId: 'test'
                });
            });
            return;
        }
        
        // Legal / accessibility "i" button: menu only (it would cover the touch buttons in game)
        if (window.LegalInfo) {
            window.LegalInfo.show();
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.LegalInfo.hide());
        }
        
        // Initialize core systems if not already done
        this.initializeCoreServices();
        
        // Initialize DeviceManager specifically here to ensure it's ready
        if (window.DeviceManager) {
            window.DeviceManager.initialize(this.game);
        }
        
        // Create menu audio feedback
        this.createMenuSounds();
        
        // Start background music
        this.startBackgroundMusic();
        
        try {
            console.log('🏠 MainMenuScene: Scene key:', this.scene.key);
            console.log('🏠 MainMenuScene: Scene manager exists?', !!window.sceneManager);
            console.log('🏠 MainMenuScene: GameState exists?', !!window.gameState);
            console.log('🏠 MainMenuScene: this.cameras exists?', !!this.cameras);
            console.log('🏠 MainMenuScene: this.cameras.main exists?', !!this.cameras?.main);
            console.log('🏠 MainMenuScene: this.add exists?', !!this.add);
            
            // Set background
            console.log('🏠 MainMenuScene: Setting background color...');
            this.cameras.main.setBackgroundColor('#1a1a2e');
            console.log('🏠 MainMenuScene: ✅ Background color set successfully');
            
            // Create background elements
            console.log('🏠 MainMenuScene: Creating background...');
            this.createBackground();
            
            // Create menu UI
            console.log('🏠 MainMenuScene: Creating menu UI...');
            this.createMenuUI();
            
            // Check orientation and show prompt if needed
            this.checkOrientation();
            
            // Set up input handling
            console.log('🏠 MainMenuScene: Setting up input...');
            this.setupInput();
            
            // Set up automatic fullscreen on first interaction
            this.setupAutoFullscreen();
            
            console.log('🏠 ✅ MainMenuScene: All components created successfully!');
            
        } catch (error) {
            console.error('🏠 ❌ MainMenuScene: CRITICAL ERROR during creation:', error);
            console.error('🏠 ❌ MainMenuScene: Stack trace:', error.stack);
            
            try {
                // Create minimal fallback UI
                this.add.text(600, 360, 'MAIN MENU\n(Error in UI creation)\n\nPress ENTER to continue', {
                    fontSize: GAME_CONFIG.ui.fontSize.button,
                    fill: '#ffffff',
                    fontFamily: GAME_CONFIG.ui.fontFamily,
                    align: 'center'
                }).setOrigin(0.5);
                
                // Simple fallback input
                this.input.keyboard.on('keydown-ENTER', () => {
                    console.log('🏠 Fallback: Going to character select...');
                    window.sceneManager.goToCharacterSelect();
                });
                
                console.log('🏠 ✅ Fallback UI created successfully');
            } catch (fallbackError) {
                console.error('🏠 💥 FATAL: Even fallback UI failed:', fallbackError);
            }
        }
    }
    
    initializeCoreServices() {
        console.log('🏠 MainMenuScene: Initializing core services...');
        
        // Initialize GameState if not already done
        if (!window.gameState) {
            console.log('🏠 MainMenuScene: Creating GameState...');
            window.gameState = new GameState();
        }
        
        // Initialize SceneManager if not already done
        if (!window.sceneManager) {
            console.log('🏠 MainMenuScene: Creating SceneManager...');
            window.sceneManager = new SceneManager(this.game);
        }
        
        console.log('🏠 ✅ Core services initialized');
    }

    createMenuSounds() {
        console.log('🎵 MainMenuScene: Creating menu audio feedback...');
        
        try {
            // Create simple 8-bit style menu sounds using Web Audio API
            this.menuSounds = {
                hover: this.createMenuHoverSound(),
                click: this.createMenuClickSound(),
                back: this.createMenuBackSound()
            };
            
            console.log('🎵 ✅ Menu sounds created successfully');
        } catch (error) {
            console.warn('🎵 ⚠️ Could not create menu sounds (audio may be disabled):', error);
            // Create silent fallbacks
            this.menuSounds = {
                hover: { play: () => {} },
                click: { play: () => {} },
                back: { play: () => {} }
            };
        }
    }

    createMenuHoverSound() {
        // Create a simple beep sound for hover (higher pitch)
        const context = this.sound.context;
        if (!context) return { play: () => {} };
        
        return {
            play: () => {
                try {
                    const sfx = window.GameSettings ? window.GameSettings.sfx() : 1;
                    if (sfx <= 0) return; // muted in Settings
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(800, context.currentTime); // High pitch
                    oscillator.type = 'square'; // 8-bit style
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.1 * sfx, context.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
                    
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.1);
                } catch (e) {
                    console.warn('Could not play hover sound:', e);
                }
            }
        };
    }

    createMenuClickSound() {
        // Create a more satisfying click sound (lower pitch with quick attack)
        const context = this.sound.context;
        if (!context) return { play: () => {} };
        
        return {
            play: () => {
                try {
                    const sfx = window.GameSettings ? window.GameSettings.sfx() : 1;
                    if (sfx <= 0) return; // muted in Settings
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(400, context.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.1);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.15 * sfx, context.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
                    
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.15);
                } catch (e) {
                    console.warn('Could not play click sound:', e);
                }
            }
        };
    }

    createMenuBackSound() {
        // Create a "back" sound (descending tone)
        const context = this.sound.context;
        if (!context) return { play: () => {} };
        
        return {
            play: () => {
                try {
                    const sfx = window.GameSettings ? window.GameSettings.sfx() : 1;
                    if (sfx <= 0) return; // muted in Settings
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(600, context.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.2);
                    oscillator.type = 'triangle';
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.08 * sfx, context.currentTime + 0.02);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
                    
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + 0.2);
                } catch (e) {
                    console.warn('Could not play back sound:', e);
                }
            }
        };
    }

    startBackgroundMusic() {
        console.log('🎵 MainMenuScene: Checking background music...');
        
        try {
            // Check if music is already playing from AudioBootScene
            if (window.menuMusic && window.menuMusic.isPlaying) {
                console.log('🎵 ✅ Menu music already playing from AudioBootScene');
                this.backgroundMusic = window.menuMusic;
                return;
            }
            
            // Check if music is ready to be activated on interaction
            if (window.menuMusicReady) {
                console.log('🎵 Music ready - activating on interaction');
                window.menuMusicReady();
                this.backgroundMusic = window.menuMusic;
                return;
            }
            
            // Fallback: try to start music if not already playing
            if (this.cache.audio.exists('menuMusic')) {
                this.backgroundMusic = this.sound.add('menuMusic', {
                    volume: 0.3,
                    loop: true
                });
                
                this.backgroundMusic.play();
                console.log('🎵 ✅ Main menu music started as fallback');
            } else {
                console.warn('🎵 ⚠️ Menu music not found in cache');
            }
        } catch (error) {
            console.warn('🎵 ⚠️ Could not start background music:', error);
        }
    }

    stopBackgroundMusic() {
        console.log('🎵 MainMenuScene: Stopping background music...');
        
        // Stop the global menu music
        if (window.menuMusic) {
            window.menuMusic.stop();
            window.menuMusic.destroy();
            window.menuMusic = null;
            console.log('🎵 ✅ Global menu music stopped');
        }
        
        // Also stop local reference if it exists
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = null;
            console.log('🎵 ✅ Local background music stopped');
        }
    }

    createAnimatedBackground() {
        console.log('🎨 MainMenuScene: Creating animated tiled background...');
        
        // Use virtual dimensions for background (matches game world size)
        const screenWidth = this.virtualWidth;
        const screenHeight = this.virtualHeight;
        const originalTileSize = 768; // Original size of your background tile
        const scaleFactor = 0.3; // Make tiles much smaller (30% of original size)
        const tileSize = originalTileSize * scaleFactor;
        
        // Calculate how many tiles we need to cover the screen plus some extra for movement
        const tilesX = Math.ceil(screenWidth / tileSize) + 3;
        const tilesY = Math.ceil(screenHeight / tileSize) + 3;
        
        // Create a container for all the background tiles
        this.backgroundContainer = this.add.container(0, 0);
        
        // Create the tiled background
        this.backgroundTiles = [];
        for (let x = 0; x < tilesX; x++) {
            for (let y = 0; y < tilesY; y++) {
                const tile = this.add.image(
                    (x * tileSize) - tileSize, // Start one tile off-screen to the left
                    (y * tileSize) - tileSize, // Start one tile off-screen above
                    'menuBackground'
                ).setOrigin(0, 0)
                 .setScale(scaleFactor); // Scale down the tiles
                
                this.backgroundContainer.add(tile);
                this.backgroundTiles.push(tile);
            }
        }
        
        // Start the animation
        this.animateMenuBackground();
        
        console.log(`🎨 ✅ MainMenu: Created ${this.backgroundTiles.length} small background tiles with downward animation`);
    }

    animateMenuBackground() {
        // Create downward drift animation (faster, same as loading screen)
        const tileSize = 768 * 0.3; // Scaled tile size
        this.tweens.add({
            targets: this.backgroundContainer,
            y: tileSize, // Move down by one tile height
            duration: 10000, // 45 seconds for faster movement
            ease: 'Linear',
            repeat: -1, // Infinite loop
            onRepeat: () => {
                // Reset position when animation completes one tile cycle
                this.backgroundContainer.y = 0;
            }
        });
        
        console.log('🎨 ✅ MainMenu: Faster downward background animation started');
    }
    
    createBackground() {
        // Create animated tiled background (same as loading screen)
        this.createAnimatedBackground();
        
        // Add some visual flair - floating particles or vinyl records
        this.createFloatingVinyls();
    }
    
    createFloatingVinyls() {
        console.log('🏠 MainMenuScene: Creating floating vinyls...');
        console.log('🏠 MainMenuScene: vinylWeapon texture exists?', this.textures.exists('vinylWeapon'));
        
        try {
            // Create some floating vinyl records in the background
            for (let i = 0; i < 5; i++) {
                const x = Phaser.Math.Between(0, this.cameras.main.width);
                const y = Phaser.Math.Between(0, this.cameras.main.height);
                
                if (this.textures.exists('vinylWeapon')) {
                    const vinyl = this.add.image(x, y, 'vinylWeapon');
                    vinyl.setScale(0.5);
                    vinyl.setAlpha(0.1);
                    vinyl.setDepth(-1);
            
                    // Slow rotation
                    this.tweens.add({
                        targets: vinyl,
                        rotation: Math.PI * 2,
                        duration: 20000 + Phaser.Math.Between(0, 10000),
                        repeat: -1,
                        ease: 'Linear'
                    });
                    
                    // Slow floating movement
                    this.tweens.add({
                        targets: vinyl,
                        y: y + Phaser.Math.Between(-50, 50),
                        duration: 8000 + Phaser.Math.Between(0, 4000),
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                } else {
                    console.log('🏠 MainMenuScene: vinylWeapon texture not found, skipping vinyl', i);
                }
            }
            console.log('🏠 MainMenuScene: ✅ Floating vinyls created successfully');
        } catch (error) {
            console.error('🏠 MainMenuScene: ❌ Error creating floating vinyls:', error);
        }
    }
    
    createMenuUI() {
        console.log('🏠 MainMenuScene: Starting createMenuUI...');
        
        // Use virtual world center coordinates (same coordinate system as game)
        const centerX = this.virtualWidth / 2;
        const centerY = this.virtualHeight / 2;
        
        console.log('🏠 MainMenuScene: Center coordinates:', centerX, centerY);
        
        try {
            // Simple test text first
            console.log('🏠 MainMenuScene: Creating simple test text...');
            
            console.log('🏠 MainMenuScene: ✅ Simple text created successfully');
            
            // Game title image
            console.log('🏠 MainMenuScene: Creating game title image...');
            const titleImage = this.add.image(centerX, centerY - 150, 'titleCard').setOrigin(0.5);
            
            // Make title responsive - scale relative to virtual dimensions
            const maxWidth = this.virtualWidth * 0.7; // 70% of virtual width
            const maxHeight = this.virtualHeight * 0.4; // 40% of virtual height
            const scaleX = maxWidth / titleImage.width;
            const scaleY = maxHeight / titleImage.height;
            const scale = Math.min(scaleX, scaleY, 2); // Allow scaling up to 2x
            
            titleImage.setScale(scale);
            console.log('🏠 MainMenuScene: ✅ Game title image created and scaled responsively');
            
            
            // Menu buttons (moved up since we removed subtitle)
            console.log('🏠 MainMenuScene: Creating menu buttons...');
            this.createMenuButtons(centerX, centerY + 50);
            
            console.log('🏠 MainMenuScene: ✅ Menu buttons created');
            
        } catch (error) {
            console.error('🏠 MainMenuScene: ❌ Error in createMenuUI:', error);
            throw error; // Re-throw to trigger the main catch block
        }
    }
    
    createMenuButtons(centerX, centerY) {
        console.log('🏠 MainMenuScene: Starting createMenuButtons...');
        
        try {
            // 8-bit style button configuration
            const buttonStyle = {
                fontSize: GAME_CONFIG.ui.fontSize.button,
                fill: '#FFD700', // Golden yellow like title
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                stroke: '#B8860B', // Dark gold outline
                strokeThickness: 4,
                shadow: {
                    offsetX: 3,
                    offsetY: 3,
                    color: '#8B4513', // Brown shadow
                    blur: 0, // Sharp 8-bit shadow
                    stroke: false,
                    fill: true
                }
            };
            
            const buttonHoverStyle = {
                fontSize: GAME_CONFIG.ui.fontSize.buttonHover, // Slightly bigger on hover
                fill: '#FF6B35', // Orange like title highlights
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                stroke: '#CC4125', // Dark orange outline
                strokeThickness: 4,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#8B0000', // Dark red shadow
                    blur: 0,
                    stroke: false,
                    fill: true
                }
            };
            
            console.log('🏠 MainMenuScene: 8-bit button styles defined');
        
        // Standard button dimensions for all buttons
        const buttonWidth = 300;
        const buttonHeight = 60;
        const buttonSpacing = 80;
        
        // Start Game button with stylized background
        console.log('🏠 MainMenuScene: Creating START GAME button...');
        
        // Create button background box
        const startBg = this.add.rectangle(centerX, centerY, buttonWidth, buttonHeight, 0x2C1810, 0.9);
        startBg.setStrokeStyle(3, 0xFFD700);
        
        this.startButton = this.add.text(centerX, centerY, 'START GAME', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.menuSounds.hover.play(); // Play hover sound
                this.startButton.setStyle(buttonHoverStyle);
                startBg.setFillStyle(0x4A2818, 0.9);
                startBg.setStrokeStyle(4, 0xFF6B35);
            })
            .on('pointerout', () => {
                this.startButton.setStyle(buttonStyle);
                startBg.setFillStyle(0x2C1810, 0.9);
                startBg.setStrokeStyle(3, 0xFFD700);
            })
            .on('pointerdown', () => {
                this.menuSounds.click.play(); // Play click sound
                this.startGame();
            });
        
        console.log('🏠 MainMenuScene: ✅ START GAME button created');
        
        // Continue button (only show if player has progress)
        if (window.gameState.player.stats.totalGamesPlayed > 0) {
            const continueBg = this.add.rectangle(centerX, centerY + buttonSpacing, buttonWidth, buttonHeight, 0x2C1810, 0.9);
            continueBg.setStrokeStyle(3, 0xFFD700);
            
            this.continueButton = this.add.text(centerX, centerY + buttonSpacing, 'CONTINUE', buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    this.menuSounds.hover.play(); // Play hover sound
                    this.continueButton.setStyle(buttonHoverStyle);
                    continueBg.setFillStyle(0x4A2818, 0.9);
                    continueBg.setStrokeStyle(4, 0xFF6B35);
                })
                .on('pointerout', () => {
                    this.continueButton.setStyle(buttonStyle);
                    continueBg.setFillStyle(0x2C1810, 0.9);
                    continueBg.setStrokeStyle(3, 0xFFD700);
                })
                .on('pointerdown', () => {
                    this.menuSounds.click.play(); // Play click sound
                    this.continueGame();
                });
        }
        
        // Settings button
        const settingsY = window.gameState.player.stats.totalGamesPlayed > 0 ? centerY + (buttonSpacing * 2) : centerY + buttonSpacing;
        const settingsBg = this.add.rectangle(centerX, settingsY, buttonWidth, buttonHeight, 0x2C1810, 0.9);
        settingsBg.setStrokeStyle(3, 0xFFD700);
        
        this.settingsButton = this.add.text(centerX, settingsY, 'SETTINGS', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.menuSounds.hover.play(); // Play hover sound
                this.settingsButton.setStyle(buttonHoverStyle);
                settingsBg.setFillStyle(0x4A2818, 0.9);
                settingsBg.setStrokeStyle(4, 0xFF6B35);
            })
            .on('pointerout', () => {
                this.settingsButton.setStyle(buttonStyle);
                settingsBg.setFillStyle(0x2C1810, 0.9);
                settingsBg.setStrokeStyle(3, 0xFFD700);
            })
            .on('pointerdown', () => {
                this.menuSounds.click.play(); // Play click sound
                this.openSettings();
            });
        
        // Credits button
        const creditsY = settingsY + buttonSpacing;
        const creditsBg = this.add.rectangle(centerX, creditsY, buttonWidth, buttonHeight, 0x2C1810, 0.9);
        creditsBg.setStrokeStyle(3, 0xFFD700);
        
        this.creditsButton = this.add.text(centerX, creditsY, 'CREDITS', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.menuSounds.hover.play(); // Play hover sound
                this.creditsButton.setStyle(buttonHoverStyle);
                creditsBg.setFillStyle(0x4A2818, 0.9);
                creditsBg.setStrokeStyle(4, 0xFF6B35);
            })
            .on('pointerout', () => {
                this.creditsButton.setStyle(buttonStyle);
                creditsBg.setFillStyle(0x2C1810, 0.9);
                creditsBg.setStrokeStyle(3, 0xFFD700);
            })
            .on('pointerdown', () => {
                this.menuSounds.click.play(); // Play click sound
                this.showCredits();
            });
            
        console.log('🏠 MainMenuScene: ✅ All buttons created successfully');
        
        } catch (error) {
            console.error('🏠 MainMenuScene: ❌ Error in createMenuButtons:', error);
            throw error; // Re-throw to trigger the main catch block
        }
    }
    
    
    setupInput() {
        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => {
            this.startGame();
        });
        
        this.input.keyboard.on('keydown-ESC', () => {
            // Could add quit confirmation here
        });
    }
    
    setupAutoFullscreen() {
        // Request fullscreen on first user interaction (click or touch)
        if (window.FullscreenManager && window.FullscreenManager.shouldAutoRequest) {
            // Create invisible overlay to catch first interaction
            const fullscreenTrigger = this.add.rectangle(
                this.virtualWidth / 2,
                this.virtualHeight / 2,
                this.virtualWidth,
                this.virtualHeight,
                0x000000,
                0
            );
            fullscreenTrigger.setDepth(10000); // Above everything
            fullscreenTrigger.setInteractive({ useHandCursor: false });
            
            // One-time fullscreen request on first click/touch
            const requestFullscreen = (pointer) => {
                if (window.FullscreenManager) {
                    window.FullscreenManager.requestFullscreenOnInteraction(pointer);
                }
                // Remove the trigger after first interaction
                fullscreenTrigger.destroy();
            };
            
            fullscreenTrigger.on('pointerdown', requestFullscreen);
            
            // Also listen to keyboard (for desktop testing)
            this.input.keyboard.once('keydown', () => {
                if (window.FullscreenManager) {
                    window.FullscreenManager.requestFullscreenOnInteraction(null);
                }
                fullscreenTrigger.destroy();
            });
            
            console.log('📱 MainMenuScene: Auto-fullscreen trigger set up');
        }
    }
    
    // ========================================
    // MENU ACTIONS
    // ========================================
    
    startGame() {
        console.log('🎮 Starting new game with dynamic character switching...');
        
        // Stop menu music before transitioning
        this.stopBackgroundMusic();
        
        // Fade to black
        console.log('🎮 Fading to black...');
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        
        // After fade completes, go to intro dialogue
        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log('🎮 Fade complete, transitioning to IntroDialogueScene');
            try {
                this.scene.start('IntroDialogueScene', { 
                    character: 'tireek', // Start with Tireek as default
                    levelId: 1 
                });
                console.log('🎮 ✅ Transition to IntroDialogueScene initiated');
            } catch (error) {
                console.error('🎮 ❌ Transition failed:', error);
                // Fallback - go directly to game
                this.scene.start('GameScene', { 
                    character: 'tireek',
                    levelId: 1 
                });
            }
        });
    }
    
    continueGame() {
        console.log('🔄 Continuing game...');
        
        // Stop menu music before transitioning
        this.stopBackgroundMusic();
        
        // Continue from last played level with last character
        const lastCharacter = window.gameState.player.preferences.lastSelectedCharacter;
        const nextLevel = window.gameState.getNextUnlockedLevel();
        
        window.sceneManager.startGameplay(lastCharacter, nextLevel);
    }
    
    openSettings() {
        console.log('⚙️ Opening settings...');
        // Create settings overlay instead of transitioning to a new scene
        this.createSettingsOverlay();
    }
    
    showCredits() {
        console.log('🎬 Showing credits...');
        // Create simple credits overlay
        this.createCreditsOverlay();
    }
    
    createCreditsOverlay() {
        // Darken screen
        const overlay = this.add.rectangle(
            this.virtualWidth / 2,
            this.virtualHeight / 2,
            this.virtualWidth * 2,   // oversized: always covers everything the camera shows
            this.virtualHeight * 2,
            0x000000,
            0.8
        );
        // Above every menu button (so the tap that closes it can't also press one beneath)
        overlay.setDepth(5000);
        overlay.setInteractive();

        // Credits text
        const creditsText = this.add.text(this.virtualWidth / 2, this.virtualHeight / 2,
            'LEGACY: SOUNDTRACK FOR SURVIVAL\n\n' +
            'A game by ++ (@foreverplusplus)\n\n' +
            'Development: Patrick Damiano (@pat__damiano)\n' +
            'Music: ++ (@foreverplusplus)\n\n' +
            'With special guest appearances by\n' +
            'Rozotadi (@rozotadi)\n' +
            'Misfit (@notyur_ordinary)\n' +
            'Brianna Emily (@briannaemily__)\n\n' +
            'Click anywhere to close', {
            fontSize: GAME_CONFIG.ui.fontSize.label, // 32px: the longer list needs the room
            fill: '#ffffff',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: this.virtualWidth - 120 }
        }).setOrigin(0.5).setDepth(5001);
        
        // Close on click
        overlay.on('pointerdown', () => {
            this.menuSounds.back.play(); // Play back sound
            overlay.destroy();
            creditsText.destroy();
        });
    }
    
    createSettingsOverlay() {
        const cx = this.virtualWidth / 2;
        const cy = this.virtualHeight / 2;
        const DEPTH = 5000; // above every menu button
        const fontFamily = GAME_CONFIG.ui.fontFamily;
        const created = [];
        const add = (obj, depthOffset = 1) => { obj.setDepth(DEPTH + depthOffset); created.push(obj); return obj; };
        const closeSettings = () => created.forEach(obj => obj.destroy());
        
        // Darken screen (oversized: always covers everything the camera shows)
        const overlay = add(this.add.rectangle(cx, cy, this.virtualWidth * 2, this.virtualHeight * 2, 0x000000, 0.8), 0)
            .setInteractive();
        
        // Settings panel. Interactive so a tap on empty panel space is swallowed here
        // instead of falling through to the overlay and closing the whole menu.
        add(this.add.rectangle(cx, cy, 900, 640, 0x2C1810, 0.95))
            .setStrokeStyle(4, 0xFFD700)
            .setInteractive();
        
        add(this.add.text(cx, cy - 265, 'SETTINGS', {
            fontSize: GAME_CONFIG.ui.fontSize.subtitle,
            fill: '#FFD700',
            fontFamily,
            fontWeight: 'bold',
            stroke: '#B8860B',
            strokeThickness: 3
        }).setOrigin(0.5));
        
        // A real button: the rectangle is the click zone (much bigger than the glyph), the
        // label is just drawn on top of it
        const makeButton = (x, y, width, height, label, fontSize, onPress) => {
            const bg = add(this.add.rectangle(x, y, width, height, 0x2C1810, 0.9))
                .setStrokeStyle(3, 0xFFD700)
                .setInteractive({ useHandCursor: true });
            const text = add(this.add.text(x, y, label, {
                fontSize,
                fill: '#FFD700',
                fontFamily,
                fontWeight: 'bold'
            }).setOrigin(0.5), 2);
            bg.on('pointerover', () => {
                if (this.menuSounds && this.menuSounds.hover) this.menuSounds.hover.play();
                bg.setFillStyle(0x4A2818, 0.95).setStrokeStyle(4, 0xFF6B35);
                text.setStyle({ fill: '#FF6B35' });
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(0x2C1810, 0.9).setStrokeStyle(3, 0xFFD700);
                text.setStyle({ fill: '#FFD700' });
            });
            bg.on('pointerdown', () => {
                onPress();
                if (this.menuSounds && this.menuSounds.click) this.menuSounds.click.play();
            });
            return { bg, text };
        };
        
        const labelStyle = { fontSize: GAME_CONFIG.ui.fontSize.body, fill: '#FFD700', fontFamily, fontWeight: 'bold' };
        const valueStyle = { fontSize: GAME_CONFIG.ui.fontSize.heading, fill: '#FF6B35', fontFamily, fontWeight: 'bold' };
        const labelX = cx - 400;   // row labels, left-aligned
        const valueX = cx + 230;   // value between the two arrow buttons
        
        // One "◀ 70% ▶" row. get/set work in 0-1.
        const volumeRow = (y, label, get, set) => {
            add(this.add.text(labelX, y, label, labelStyle).setOrigin(0, 0.5));
            const valueText = add(this.add.text(valueX, y, `${Math.round(get() * 100)}%`, valueStyle).setOrigin(0.5));
            const step = (delta) => {
                // Round to one decimal so repeated +/-0.1 steps don't drift (0.30000000000000004)
                const v = Math.round(Phaser.Math.Clamp(get() + delta, 0, 1) * 10) / 10;
                set(v);
                valueText.setText(`${Math.round(v * 100)}%`);
            };
            makeButton(valueX - 130, y, 110, 90, '◀', GAME_CONFIG.ui.fontSize.title, () => step(-0.1));
            makeButton(valueX + 130, y, 110, 90, '▶', GAME_CONFIG.ui.fontSize.title, () => step(0.1));
        };
        
        // Music: the menu track that is playing now (window.menuMusic)
        volumeRow(cy - 150, 'MUSIC',
            () => (window.menuMusic ? window.menuMusic.volume : 1),
            (v) => { if (window.menuMusic) window.menuMusic.setVolume(v); });
        
        // Sound effects: saved in GameSettings, applied to every effect in the game.
        // The click beep after each press previews the new level.
        volumeRow(cy - 40, 'SOUND FX',
            () => GameSettings.get('sfxVolume'),
            (v) => GameSettings.set('sfxVolume', v));
        
        // Reduce flashing & shake (photosensitivity / motion sensitivity)
        add(this.add.text(labelX, cy + 70, 'REDUCE FLASHING\n& SCREEN SHAKE', { ...labelStyle, lineSpacing: -6 }).setOrigin(0, 0.5));
        const toggleLabel = () => (GameSettings.reduceEffects() ? 'ON' : 'OFF');
        const toggle = makeButton(valueX, cy + 70, 370, 90, toggleLabel(), GAME_CONFIG.ui.fontSize.button, () => {
            GameSettings.set('reduceEffects', !GameSettings.reduceEffects());
            toggle.text.setText(toggleLabel());
        });
        
        makeButton(cx, cy + 225, 280, 90, 'CLOSE', GAME_CONFIG.ui.fontSize.button, closeSettings);
        
        // Tapping outside the panel also closes it
        overlay.on('pointerdown', () => {
            if (this.menuSounds && this.menuSounds.back) this.menuSounds.back.play();
            closeSettings();
        });
    }
    
    checkOrientation() {
        if (!window.DeviceManager) return;
        
        // Create orientation warning overlay (hidden by default)
        this.orientationOverlay = this.add.container(0, 0).setDepth(9999).setVisible(false);
        
        // Black background covering everything
        // We use a large size to ensure coverage regardless of scale
        const bg = this.add.rectangle(0, 0, 5000, 5000, 0x000000).setOrigin(0.5);
        
        const text = this.add.text(0, 0, 'PLEASE ROTATE DEVICE\nTO LANDSCAPE', {
            fontSize: '48px',
            fill: '#FFD700',
            fontFamily: 'VT323',
            align: 'center'
        }).setOrigin(0.5);
        
        const icon = this.add.text(0, -100, '📱➡️📱', {
            fontSize: '64px',
            align: 'center'
        }).setOrigin(0.5);
        
        this.orientationOverlay.add([bg, text, icon]);
        
        let viewportSettleTimer = null;
        const scheduleViewportSettle = () => {
            if (viewportSettleTimer) {
                clearTimeout(viewportSettleTimer);
            }
            viewportSettleTimer = setTimeout(() => {
                LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
            }, 200);
        };
        
        // Function to update overlay position and visibility
        const updateOrientationCheck = () => {
            if (window.DeviceManager) {
                window.DeviceManager.checkOrientation();
            }
            
            // Always hide overlay on non-mobile
            if (!window.DeviceManager || !window.DeviceManager.isMobile) {
                this.orientationOverlay.setVisible(false);
                return;
            }
            
            const shouldShow = window.DeviceManager.shouldShowRotatePrompt();
            if (shouldShow) {
                this.wasPortrait = true;
                const centerX = this.cameras.main.midPoint.x;
                const centerY = this.cameras.main.midPoint.y;
                this.orientationOverlay.setPosition(centerX, centerY);
                this.orientationOverlay.setVisible(true);
                // Pause game inputs if possible
            } else {
                this.wasPortrait = false;
                this.orientationOverlay.setVisible(false);
                // Ensure layout re-applies after overlay hides
                setTimeout(() => LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight), 0);
            }
        };
        
        // Check initially
        updateOrientationCheck();
        
        // Check on Phaser scale resize
        this.scale.on('resize', updateOrientationCheck);
        
        // Additional listeners for native resize/orientation events (some mobile browsers skip Phaser resize)
        const reapplyLayout = () => {
            if (this.scale?.refresh) {
                this.scale.refresh();
            }
            LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
            updateOrientationCheck();
        };
        
        this.orientationResizeHandler = () => {
            // Allow visualViewport to update before recalculating
            setTimeout(reapplyLayout, 50);
        };
        
        this.orientationChangeHandler = () => {
            // Slightly longer delay on orientationchange for mobile browsers
            setTimeout(reapplyLayout, 200);
        };
        
        if (window.visualViewport) {
            this.visualViewportHandler = () => {
                setTimeout(reapplyLayout, 50);
            };
            window.visualViewport.addEventListener('resize', this.visualViewportHandler);
            window.visualViewport.addEventListener('scroll', scheduleViewportSettle);
        }
        
        window.addEventListener('resize', this.orientationResizeHandler);
        window.addEventListener('orientationchange', this.orientationChangeHandler);
        
        // Clean up listeners when scene shuts down
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('resize', this.orientationResizeHandler);
            window.removeEventListener('orientationchange', this.orientationChangeHandler);
            if (window.visualViewport && this.visualViewportHandler) {
                window.visualViewport.removeEventListener('resize', this.visualViewportHandler);
                window.visualViewport.removeEventListener('scroll', scheduleViewportSettle);
            }
            if (viewportSettleTimer) {
                clearTimeout(viewportSettleTimer);
            }
        });
    }
}

// Make MainMenuScene available globally
window.MainMenuScene = MainMenuScene;
