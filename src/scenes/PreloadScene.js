// ========================================
// PRELOAD SCENE
// ========================================
// Main asset loading scene with progress tracking

class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        console.log('📦 PreloadScene: ===== PRELOAD SCENE STARTED =====');
        console.log('📦 PreloadScene: Scene key:', this.scene.key);
        console.log('📦 PreloadScene: Scene manager exists?', !!window.sceneManager);
        console.log('📦 PreloadScene: GameState exists?', !!window.gameState);
        
        // Create loading screen
        console.log('📦 PreloadScene: Creating loading screen...');
        this.createLoadingScreen();
        
        // Set up progress tracking
        console.log('📦 PreloadScene: Setting up progress tracking...');
        this.setupProgressTracking();
        
        // Load all game assets
        console.log('📦 PreloadScene: Starting asset loading...');
        this.loadAllAssets();
        
        console.log('📦 PreloadScene: Preload setup complete, waiting for assets to load...');
    }

    create() {
        console.log('📦 PreloadScene: ===== CREATE CALLED - ALL ASSETS LOADED =====');
        console.log('📦 PreloadScene: Scene manager exists?', !!window.sceneManager);
        console.log('📦 PreloadScene: Available scenes:', this.scene.manager.keys);
        console.log('📦 PreloadScene: Current scene:', this.scene.key);
        
        // Wait a moment to show completed loading, then go to main menu
        console.log('📦 PreloadScene: Setting up transition timer (1 second)...');
        this.time.delayedCall(1000, () => {
            console.log('📦 PreloadScene: 1 second timer triggered - attempting transition...');
            this.proceedToMainMenu();
        });
        
        // Failsafe: if something goes wrong, force transition after 5 seconds
        console.log('📦 PreloadScene: Setting up failsafe timer (5 seconds)...');
        this.time.delayedCall(5000, () => {
            console.log('📦 PreloadScene: ⚠️ FAILSAFE TRIGGERED - forcing transition to main menu');
            this.proceedToMainMenu();
        });
    }
    
    proceedToMainMenu() {
        console.log('📦 PreloadScene: ===== PROCEEDING TO MAIN MENU =====');
        console.log('📦 PreloadScene: Scene manager exists?', !!window.sceneManager);
        console.log('📦 PreloadScene: Available scenes:', this.scene.manager.keys);
        
        // Hide loading screen first
        console.log('📦 PreloadScene: Hiding loading screen...');
        if (this.loadingText) this.loadingText.setVisible(false);
        if (this.progressBar) this.progressBar.setVisible(false);
        if (this.progressBarBg) this.progressBarBg.setVisible(false);
        
        // Clear any timers
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }
        if (this.failsafeTimer) {
            this.failsafeTimer.remove();
            this.failsafeTimer = null;
        }
        
        if (window.sceneManager) {
            console.log('📦 PreloadScene: SceneManager found, calling goToMainMenu()...');
            try {
                window.sceneManager.goToMainMenu();
                console.log('📦 PreloadScene: ✅ SceneManager.goToMainMenu() called successfully');
            } catch (error) {
                console.error('📦 PreloadScene: ❌ Error calling SceneManager.goToMainMenu():', error);
                console.log('📦 PreloadScene: Falling back to direct scene transition...');
                this.scene.start('MainMenuScene');
            }
        } else {
            console.log('📦 PreloadScene: SceneManager not found, using direct scene transition...');
            console.log('📦 PreloadScene: Calling this.scene.start("MainMenuScene")...');
            try {
                this.scene.start('MainMenuScene');
                console.log('📦 PreloadScene: ✅ Direct scene transition called successfully');
            } catch (error) {
                console.error('📦 PreloadScene: ❌ Error with direct scene transition:', error);
            }
        }
    }
    
    createLoadingScreen() {
        // Set background
        this.cameras.main.setBackgroundColor('#0f0f23');
        
        // Create loading UI
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Game title/logo
        this.add.text(centerX, centerY - 150, 'LEGACY GAME', {
            fontSize: GAME_CONFIG.ui.fontSize.title,
            fill: '#00ff00',
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Loading text
        this.loadingText = this.add.text(centerX, centerY + 100, 'Loading...', {
            fontSize: GAME_CONFIG.ui.fontSize.body,
            fill: '#ffffff',
            fontFamily: GAME_CONFIG.ui.fontFamily
        }).setOrigin(0.5);
        
        // Progress bar background
        this.progressBarBg = this.add.rectangle(centerX, centerY + 50, 400, 20, 0x333333);
        this.progressBarBg.setStrokeStyle(2, 0x666666);
        
        // Progress bar fill
        this.progressBar = this.add.rectangle(centerX - 200, centerY + 50, 0, 16, 0x00ff00);
        this.progressBar.setOrigin(0, 0.5);
        
        // Percentage text
        this.percentText = this.add.text(centerX, centerY + 80, '0%', {
            fontSize: GAME_CONFIG.ui.fontSize.tiny,
            fill: '#00ff00',
            fontFamily: GAME_CONFIG.ui.fontFamily
        }).setOrigin(0.5);
    }
    
    setupProgressTracking() {
        // Track loading progress
        this.load.on('progress', (progress) => {
            // Update progress bar
            this.progressBar.width = 400 * progress;
            
            // Update percentage
            const percent = Math.round(progress * 100);
            this.percentText.setText(`${percent}%`);
            
            // Update loading text based on progress
            if (progress < 0.3) {
                this.loadingText.setText('Loading characters...');
            } else if (progress < 0.6) {
                this.loadingText.setText('Loading environments...');
            } else if (progress < 0.9) {
                this.loadingText.setText('Loading audio...');
            } else {
                this.loadingText.setText('Almost ready...');
            }
        });
        
        this.load.on('complete', () => {
            this.loadingText.setText('Loading complete!');
            this.progressBar.setFillStyle(0x00ff00);
            console.log('📦 PreloadScene: All assets loaded successfully');
        });
        
        this.load.on('loaderror', (file) => {
            console.error('❌ Failed to load:', file.key, file.src);
            this.loadingText.setText(`Error loading: ${file.key}`);
            // Don't let one failed asset stop the whole game
            console.log('📦 PreloadScene: Continuing despite load error...');
        });
    }
    
    loadAllAssets() {
        console.log('📦 PreloadScene: Starting asset loading...');
        
        // Check if character configs are available
        if (typeof ALL_CHARACTERS === 'undefined') {
            console.error('❌ ALL_CHARACTERS is not defined!');
            return;
        }
        if (typeof ALL_ENEMY_TYPES === 'undefined') {
            console.error('❌ ALL_ENEMY_TYPES is not defined!');
            return;
        }
        
        console.log('📦 PreloadScene: Character configs found:', ALL_CHARACTERS.length, 'characters,', ALL_ENEMY_TYPES.length, 'enemy types');
        
        // Load background assets
        this.load.image('street', 'assets/backgrounds/StreetTexture.png');
        this.load.image('cityscape', 'assets/backgrounds/Background.png');
        
        // Load all character assets
        ALL_CHARACTERS.forEach(characterConfig => {
            this.loadCharacterAssets(characterConfig);
        });
        
        // Load all enemy assets
        ALL_ENEMY_TYPES.forEach(enemyConfig => {
            this.loadCharacterAssets(enemyConfig);
        });
        
        // Load weapon assets
        this.load.image('vinylWeapon', 'assets/weapons/spritesheets/vinyl weapon.png');
        this.load.spritesheet('vinylWeaponSpinning', 'assets/weapons/spritesheets/vinyl weapon spinning.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        // Fireballs for the special attack (SpecialAttackSystem)
        if (typeof SpecialAttackSystem !== 'undefined') SpecialAttackSystem.loadAssets(this.load);
        
        // Load extras assets (static characters for events)
        if (typeof EXTRAS_REGISTRY !== 'undefined' && EXTRAS_REGISTRY) {
            Object.values(EXTRAS_REGISTRY).forEach(extra => {
                if (extra && extra.key && extra.path) {
                    this.load.image(extra.key, extra.path);
                }
            });
        }
        
        // Load item pickup assets
        this.load.image('goldenMicrophone', 'assets/pickups/GoldenMicrophone_64x64.png');

        // Note: Effect assets (like tornado) are now loaded by EffectSystem in GameScene

        // Load audio assets
        this.loadAudioAssets();
        
        console.log('📦 All asset loading configured');
    }
    
    loadCharacterAssets(characterConfig) {
        console.log(`📦 Loading assets for ${characterConfig.name}:`, characterConfig.spriteSheets);
        
        // Load all sprite sheets for the base character
        Object.entries(characterConfig.spriteSheets).forEach(([animName, path]) => {
            const spriteKey = `${characterConfig.name}_${animName}`;
            console.log(`📦 Loading spritesheet ${spriteKey} from ${path}`);
            
            this.load.spritesheet(spriteKey, path, {
                frameWidth: characterConfig.frameSize.width,
                frameHeight: characterConfig.frameSize.height
            });
        });
        
        // Load all variations if they exist
        if (characterConfig.variations && Array.isArray(characterConfig.variations)) {
            characterConfig.variations.forEach(variation => {
                if (variation.spriteSheets) {
                    Object.entries(variation.spriteSheets).forEach(([animName, path]) => {
                        const spriteKey = `${variation.name}_${animName}`;
                        console.log(`📦 Loading variation spritesheet ${spriteKey} from ${path}`);
                        
                        this.load.spritesheet(spriteKey, path, {
                            frameWidth: characterConfig.frameSize.width,
                            frameHeight: characterConfig.frameSize.height
                        });
                    });
                }
            });
        }
    }
    
    loadAudioAssets() {
        console.log('🎵 Loading audio assets...');
        
        // Try loading music with different formats
        this.load.audio('combatMusic', [
            './assets/audio/music/angeloimani_river_8bit_style.ogg',
            './assets/audio/music/angeloimani_river_8bit_style.m4a'
        ]);
        
        // Add comprehensive load event listeners
        this.load.on('filecomplete-audio-combatMusic', (key, type, data) => {
            console.log('🎵 Combat music loaded successfully!', { key, type });
        });
        
        // Future: Load sound effects when available
        // this.load.audio('playerAttack', 'assets/audio/sfx/player_attack.wav');
        // this.load.audio('playerHit', 'assets/audio/sfx/player_hit.wav');
        // etc...
        
        console.log('🎵 Audio loading configured');
    }
}

// Make PreloadScene available globally
window.PreloadScene = PreloadScene;
