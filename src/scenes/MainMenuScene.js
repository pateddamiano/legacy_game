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
        
        // Initialize core systems if not already done
        this.initializeCoreServices();
        
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
            
            // Set up input handling
            console.log('🏠 MainMenuScene: Setting up input...');
            this.setupInput();
            
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
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(800, context.currentTime); // High pitch
                    oscillator.type = 'square'; // 8-bit style
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);
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
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(400, context.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.1);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.01);
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
                    const oscillator = context.createOscillator();
                    const gainNode = context.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    
                    oscillator.frequency.setValueAtTime(600, context.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.2);
                    oscillator.type = 'triangle';
                    
                    gainNode.gain.setValueAtTime(0, context.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.02);
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
        
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
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
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        console.log('🏠 MainMenuScene: Center coordinates:', centerX, centerY);
        
        try {
            // Simple test text first
            console.log('🏠 MainMenuScene: Creating simple test text...');
            
            console.log('🏠 MainMenuScene: ✅ Simple text created successfully');
            
            // Game title image
            console.log('🏠 MainMenuScene: Creating game title image...');
            const titleImage = this.add.image(centerX, centerY-(this.cameras.main.height*0.2), 'titleCard').setOrigin(0.5);
            
            // Make title responsive and bigger - scale with window size
            const maxWidth = this.cameras.main.width * 1.2 // 90% of screen width (bigger)
            const maxHeight = this.cameras.main.height * 0.6; // 50% of screen height (responsive)
            const scaleX = maxWidth / titleImage.width;
            const scaleY = maxHeight / titleImage.height;
            const scale = Math.min(scaleX, scaleY, 2); // Allow scaling up to 2x
            
            titleImage.setScale(scale);
            console.log('🏠 MainMenuScene: ✅ Game title image created and scaled responsively');
            
            
            // Menu buttons (moved up since we removed subtitle)
            console.log('🏠 MainMenuScene: Creating menu buttons...');
            this.createMenuButtons(centerX, centerY + (this.cameras.main.height*0.05));
            
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
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        );
        overlay.setInteractive();
        
        // Credits text
        const creditsText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 
            'LEGACY: SOUNDTRACK FOR SURVIVAL\n\n' +
            'A 2D Beat \'em Up Street Fighter\n\n' +
            'Development: Patrick Damiano (@pat__damiano)\n' +
            'Music: ++ (@foreverplusplus)\n' +
            'Click anywhere to close', {
            fontSize: GAME_CONFIG.ui.fontSize.body,
            fill: '#ffffff',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        
        // Close on click
        overlay.on('pointerdown', () => {
            this.menuSounds.back.play(); // Play back sound
            overlay.destroy();
            creditsText.destroy();
        });
    }
    
    createSettingsOverlay() {
        // Darken screen
        const overlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        ).setInteractive();
        
        // Settings panel background
        const panelBg = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            300,
            0x2C1810,
            0.95
        );
        panelBg.setStrokeStyle(4, 0xFFD700);
        
        // Settings title
        const titleText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 120,
            'SETTINGS',
            {
                fontSize: GAME_CONFIG.ui.fontSize.subtitle,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                stroke: '#B8860B',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        // Music volume control - much better spacing
        const musicVolumeText = this.add.text(
            this.cameras.main.centerX - 160,
            this.cameras.main.centerY - 60,
            'Music Volume:',
            {
                fontSize: GAME_CONFIG.ui.fontSize.small,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold'
            }
        ).setOrigin(0, 0.5);
        
        // Current music volume (get from global music if it exists)
        const currentVolume = window.menuMusic ? Math.round(window.menuMusic.volume * 100) : 100;
        
        // Volume decrease button
        const volumeDownBtn = this.add.text(
            this.cameras.main.centerX + 2,
            this.cameras.main.centerY - 60,
            '◀',
            {
                fontSize: GAME_CONFIG.ui.fontSize.body,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
             this.menuSounds.click.play();
             if (window.menuMusic) {
                 const newVolume = Math.max(0, window.menuMusic.volume - 0.1);
                 window.menuMusic.setVolume(newVolume);
                 volumeText.setText(`${Math.round(newVolume * 100)}%`);
             }
         });
        
        // Volume percentage text - centered
        const volumeText = this.add.text(
            this.cameras.main.centerX + 80, 
            this.cameras.main.centerY - 60,
            `${currentVolume}%`,
            {
                fontSize: GAME_CONFIG.ui.fontSize.small,
                fill: '#FF6B35',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);
        
        // Volume increase button
        const volumeUpBtn = this.add.text(
            this.cameras.main.centerX + 160,
            this.cameras.main.centerY - 60,
            '▶',
            {
                fontSize: GAME_CONFIG.ui.fontSize.body,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerdown', () => {
             this.menuSounds.click.play();
             if (window.menuMusic) {
                 const newVolume = Math.min(1, window.menuMusic.volume + 0.1);
                 window.menuMusic.setVolume(newVolume);
                 volumeText.setText(`${Math.round(newVolume * 100)}%`);
             }
         });
        
        // Close button
        const closeBtn = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 80,
            'CLOSE',
            {
                fontSize: GAME_CONFIG.ui.fontSize.body,
                fill: '#FFD700',
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontWeight: 'bold',
                stroke: '#B8860B',
                strokeThickness: 2
            }
        ).setOrigin(0.5)
         .setInteractive({ useHandCursor: true })
         .on('pointerover', () => {
             this.menuSounds.hover.play();
             closeBtn.setStyle({ fill: '#FF6B35', stroke: '#CC4125' });
         })
         .on('pointerout', () => {
             closeBtn.setStyle({ fill: '#FFD700', stroke: '#B8860B' });
         })
         .on('pointerdown', () => {
             this.menuSounds.click.play();
             // Destroy all settings UI elements
             overlay.destroy();
             panelBg.destroy();
             titleText.destroy();
             musicVolumeText.destroy();
             volumeText.destroy();
             volumeDownBtn.destroy();
             volumeUpBtn.destroy();
             closeBtn.destroy();
         });
        
        // Close on overlay click
        overlay.on('pointerdown', () => {
            this.menuSounds.back.play();
            // Destroy all settings UI elements
            overlay.destroy();
            panelBg.destroy();
            titleText.destroy();
            musicVolumeText.destroy();
            volumeText.destroy();
            volumeDownBtn.destroy();
            volumeUpBtn.destroy();
            closeBtn.destroy();
        });
    }
}

// Make MainMenuScene available globally
window.MainMenuScene = MainMenuScene;
