/**
 * AudioBootScene - Simple scene to handle initial audio activation
 * Displays a "Click to Start" screen that enables audio and starts music
 */
class AudioBootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AudioBootScene' });
        this.audioActivated = false;
        this.loadProgress = 0; // Initialize progress tracking
        this.uiCreated = false; // Track if UI has been created
        this.loadingComplete = false; // Track if loading is complete
        this.transitioned = false; // Prevent multiple transitions
    }

    preload() {
        console.log('📦 AudioBootScene: Loading essential assets...');
        
        // Load essential UI assets
        this.load.image('titleCard', 'assets/title/TitleCard.png');
        this.load.image('menuBackground', 'assets/title/MenuBackground.png');
        
        // Load character assets immediately - needed for GameScene
        this.loadAllCharacterAssets();
        
        // Load environment assets
        this.loadAllEnvironmentAssets();
        
        // Load weapon and pickup assets
        this.loadAllGameplayAssets();
        
        console.log('📦 AudioBootScene: Essential assets loading configured...');
    }

    create() {
        console.log('🎵 ===== AUDIO BOOT SCENE CREATED =====');
        
        // Initialize core systems
        this.initializeCoreServices();
        
        // Create animated tiled background
        this.createAnimatedBackground();
        
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Create UI first before any loading callbacks can fire
        this.createBootUI(centerX, centerY);
        
        // Set up input to activate audio
        this.setupAudioActivation(centerX, centerY);
        
        // Add emergency skip option
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('🎵 Emergency skip activated!');
            this.forceTransition();
        });
        
        // Add backup timer to force transition if loading gets stuck
        this.backupTimer = this.time.delayedCall(15000, () => {
            if (!this.transitioned) {
                console.log('⏰ Backup timer triggered - forcing transition to main menu');
                this.forceTransition();
            }
        });
        
        console.log('🎵 ✅ AudioBootScene UI created and ready for progress updates');
    }

    initializeCoreServices() {
        console.log('🎵 AudioBootScene: Initializing core services...');
        
        // Initialize GameState if not already done
        if (!window.gameState) {
            console.log('🎵 AudioBootScene: Creating GameState...');
            window.gameState = new GameState();
        }
        
        // Initialize SceneManager if not already done
        if (!window.sceneManager) {
            console.log('🎵 AudioBootScene: Creating SceneManager...');
            window.sceneManager = new SceneManager(this.game);
        }
        
        console.log('🎵 ✅ Core services initialized');
    }

    createAnimatedBackground() {
        console.log('🎨 Creating animated tiled background...');
        
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
        this.animateBackground();
        
        console.log(`🎨 ✅ Created ${this.backgroundTiles.length} small background tiles with downward animation`);
    }

    animateBackground() {
        // Create downward drift animation (faster)
        const tileSize = 768 * 0.3; // Scaled tile size
        this.tweens.add({
            targets: this.backgroundContainer,
            y: tileSize, // Move down by one tile height
            duration: 10000, // 20 seconds for faster movement
            ease: 'Linear',
            repeat: -1, // Infinite loop
            onRepeat: () => {
                // Reset position when animation completes one tile cycle
                this.backgroundContainer.y = 0;
            }
        });
        
        console.log('🎨 ✅ Faster downward background animation started');
    }

    loadAllAudioAssets() {
        console.log('🎵 Loading ALL audio assets...');
        
        // Main menu music
        this.load.audio('menuMusic', 'assets/audio/music/angeloimani_legacy_8bit_style.m4a');
        
        // Load ALL the new music tracks for different levels/situations
        this.load.audio('malibuMusic', 'assets/audio/music/angeloimani_malibu_8bit_style.m4a');
        this.load.audio('casinoMusic', 'assets/audio/music/angeloimani_casino_8bit_style.m4a');
        this.load.audio('fireMusic', 'assets/audio/music/angeloimani_in_fire_8bit_style_v2.m4a');
        this.load.audio('crisisMusic', 'assets/audio/music/angeloimani_crisis_8bit_style.m4a');
        this.load.audio('riverMusic', ['assets/audio/music/angeloimani_river_8bit_style.ogg', 'assets/audio/music/angeloimani_river_8bit_style.m4a']);
        this.load.audio('staminaMusic', 'assets/audio/music/angeloimani_stamina_8bit_style.m4a');
        this.load.audio('bsMusic', 'assets/audio/music/angeloimani_bs_8bit_style.m4a');
        this.load.audio('satellitesMusic', 'assets/audio/music/angeloimani_satellites_8bit_style.m4a');
        this.load.audio('fallbackMusic', 'assets/audio/music/angeloimani_fallback_8bit_style.m4a');
        this.load.audio('fadeMusic', 'assets/audio/music/angeloimani_fade_8bit_style.m4a');
        
        // Load Sound Effects
        console.log('🔊 Loading sound effects...');
        
        // Ambient sounds
        this.load.audio('streetAmbiance', 'assets/audio/sfx/street_ambiance.mp3');
        
        // Player attack sounds
        this.load.audio('mainPunch', 'assets/audio/sfx/main_punch.mp3');
        this.load.audio('mainPunch2', 'assets/audio/sfx/main_punch_2.mp3');
        this.load.audio('mainKick', 'assets/audio/sfx/main_kick.mp3');
        this.load.audio('mainJump', 'assets/audio/sfx/main_jump.mp3');
        this.load.audio('playerRunning', 'assets/audio/sfx/player_running.mp3');
        
        // Player damage sounds (4 variations)
        this.load.audio('mainDamage1', 'assets/audio/sfx/main_damage_1.mp3');
        this.load.audio('mainDamage2', 'assets/audio/sfx/main_damage_2.mp3');
        this.load.audio('mainDamage3', 'assets/audio/sfx/main_damage_3.mp3');
        this.load.audio('mainDamage4', 'assets/audio/sfx/main_damage_4.mp3');
        
        // Enemy attack sounds (type-specific)
        this.load.audio('enemyCrackheadAttack', 'assets/audio/sfx/enemy_crackhead_attack.mp3');
        this.load.audio('enemyGreenThugAttack', 'assets/audio/sfx/enemy_green_thug_attack.mp3');
        this.load.audio('enemyBlackThugAttack', 'assets/audio/sfx/enemy_black_thug_attack.mp3');
        
        // Enemy death sounds (3 variations)
        this.load.audio('enemyDeath1', 'assets/audio/sfx/enemy_death_sound_1.mp3');
        this.load.audio('enemyDeath2', 'assets/audio/sfx/enemy_death_sound_2.mp3');
        this.load.audio('enemyDeath3', 'assets/audio/sfx/enemy_death_sound_3.mp3');
        
        // Weapon sounds
        this.load.audio('weaponRecordThrow', 'assets/audio/sfx/weapon_record_throw.mp3');
        
        // Item pickup sounds
        this.load.audio('healthPickup', 'assets/audio/sfx/item_health_item_pickup.mp3');
        this.load.audio('microphonePickup', 'assets/audio/sfx/item_golden_microphone_pickup.mp3');
        
        console.log('🎵 All audio assets configured for loading');
    }

    loadAllCharacterAssets() {
        console.log('👥 Loading ALL character assets...');
        
        // Check if characters config exists
        if (typeof ALL_CHARACTERS !== 'undefined') {
            ALL_CHARACTERS.forEach(character => {
                if (character.spriteSheets) {
                    Object.entries(character.spriteSheets).forEach(([animKey, path]) => {
                        const spriteKey = `${character.name}_${animKey}`;
                        this.load.spritesheet(spriteKey, path, {
                            frameWidth: character.frameSize.width,
                            frameHeight: character.frameSize.height
                        });
                        console.log(`👥 Loading ${spriteKey} from ${path}`);
                    });
                }
            });
        } else {
            console.log('👥 ALL_CHARACTERS is undefined!');
        }
        
        // Also load enemy assets
        if (typeof ALL_ENEMY_TYPES !== 'undefined') {
            ALL_ENEMY_TYPES.forEach(enemy => {
                if (enemy.spriteSheets) {
                    Object.entries(enemy.spriteSheets).forEach(([animKey, path]) => {
                        const spriteKey = `${enemy.name}_${animKey}`;
                        this.load.spritesheet(spriteKey, path, {
                            frameWidth: enemy.frameSize.width,
                            frameHeight: enemy.frameSize.height
                        });
                        console.log(`🦹 Loading ${spriteKey} from ${path}`);
                    });
                }
            });
        }
        
        console.log('👥 All character assets configured for loading');
    }

    loadAllEnvironmentAssets() {
        console.log('🌍 Loading ALL environment assets...');
        
        // Load parallax background texture (will be tiled)
        this.load.image('parallax_background', 'assets/level_1_pieces/Background.png');
        console.log('🌍 Loading parallax background: assets/level_1_pieces/Background.png');
        
        // Load level 1 background segments
        this.loadLevel1Background();
        
        console.log('🌍 All environment assets configured for loading');
    }

    loadLevel1Background() {
        console.log('🌍 Loading Level 1 background segments...');
        
        // Load metadata first to get the number of segments dynamically
        this.load.json('level_1_metadata', 'assets/backgrounds/level_1_segments/metadata.json');
        
        // For now, load all 8 segments (updated from 5 to handle new wider background)
        for (let i = 0; i < 8; i++) {
            const segmentKey = `level_1_segment_${i.toString().padStart(3, '0')}`;
            const segmentPath = `assets/backgrounds/level_1_segments/segment_${i.toString().padStart(3, '0')}.png`;
            this.load.image(segmentKey, segmentPath);
            console.log(`🌍 Loading segment: ${segmentKey} from ${segmentPath}`);
        }
    }

    loadAllGameplayAssets() {
        console.log('⚔️ Loading ALL gameplay assets...');
        
        // Weapon assets
        this.load.image('vinylWeapon', 'assets/weapons/spritesheets/vinyl weapon.png');
        this.load.spritesheet('vinylWeaponSpinning', 'assets/weapons/spritesheets/vinyl weapon spinning.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Pickup assets
        this.load.image('goldenMicrophone', 'assets/pickups/GoldenMicrophone_64x64.png');
        
        console.log('⚔️ All gameplay assets configured for loading');
    }

    setupProgressTracking() {
        console.log('📊 Setting up progress tracking...');
        
        // Reset progress tracking for the main loading phase
        this.loadProgress = 0;
        this.totalFiles = 0;
        this.loadedFiles = 0;
        
        // Clear any existing listeners to prevent duplicates
        this.load.off('progress');
        this.load.off('fileprogress');
        this.load.off('filecomplete');
        this.load.off('complete');
        
        // Track loading progress
        this.load.on('progress', (value) => {
            this.loadProgress = value; // Always store the progress
            console.log(`📊 Loading progress: ${Math.round(value * 100)}%`);
            this.updateProgressBar(value);
        });
        
        this.load.on('fileprogress', (file) => {
            console.log(`📦 Loading: ${file.key} (${file.type})`);
        });
        
        this.load.on('filecomplete', (key, type, data) => {
            this.loadedFiles++;
            console.log(`✅ Loaded: ${key} (${type})`);
            if (key === 'parallax_background') {
                console.log('🎨 Parallax background texture loaded successfully!');
            }
        });
        
        this.load.on('loaderror', (file) => {
            console.error(`❌ Failed to load: ${file.key} from ${file.src}`);
        });
        
        this.load.on('complete', () => {
            console.log('🎉 ALL ASSETS LOADED! Game is fully cached!');
            this.loadingComplete = true;
            this.onLoadComplete();
        });
        
        console.log('📊 Progress tracking configured');
    }

    createBootUI(centerX, centerY) {
        // Game title logo (your custom title card)
        this.titleLogo = this.add.image(centerX, centerY - 100, 'titleCard').setOrigin(0.5);
        
        // Scale the logo to fit nicely
        const logoMaxWidth = this.cameras.main.width * 0.8;
        const logoMaxHeight = this.cameras.main.height * 0.4;
        const logoScaleX = logoMaxWidth / this.titleLogo.width;
        const logoScaleY = logoMaxHeight / this.titleLogo.height;
        const logoScale = Math.min(logoScaleX, logoScaleY, 1.5);
        this.titleLogo.setScale(logoScale);

        // Loading text
        this.loadingText = this.add.text(centerX, centerY + 100, 'LOADING...', {
            fontSize: '32px',
            fill: '#FFD700',
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#B8860B',
            strokeThickness: 3,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#8B4513',
                blur: 0,
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5);

        // Create 8-bit style loading bar with pixel squares
        this.createPixelLoadingBar(centerX, centerY + 150);

        // Percentage text
        this.percentText = this.add.text(centerX, centerY + 190, '0%', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Mark UI as created
        this.uiCreated = true;
        
        // Apply any progress that may have been cached before UI was ready
        if (this.loadProgress > 0) {
            console.log('📊 Applying cached progress:', this.loadProgress);
            this.updateProgressBar(this.loadProgress);
        }
        
        // Now that UI is created, start loading all the game assets
        this.startAssetLoading();
    }

    createPixelLoadingBar(centerX, centerY) {
        // Create 8-bit style loading bar with individual pixel squares
        this.pixelSquares = [];
        this.totalSquares = 20; // Number of squares in the loading bar
        const squareSize = 16; // Size of each square
        const spacing = 2; // Space between squares
        const totalWidth = (this.totalSquares * squareSize) + ((this.totalSquares - 1) * spacing);
        
        // Starting X position to center the bar
        const startX = centerX - (totalWidth / 2);
        
        // Create background squares (dark)
        for (let i = 0; i < this.totalSquares; i++) {
            const x = startX + (i * (squareSize + spacing));
            
            // Background square (dark border)
            const bgSquare = this.add.rectangle(x, centerY, squareSize, squareSize, 0x222222);
            bgSquare.setStrokeStyle(1, 0x444444);
            
            // Progress square (hidden initially)
            const progressSquare = this.add.rectangle(x, centerY, squareSize - 2, squareSize - 2, 0x00ff00);
            progressSquare.setVisible(false);
            
            this.pixelSquares.push({
                background: bgSquare,
                progress: progressSquare
            });
        }
        
        console.log(`🎮 Created ${this.totalSquares} pixel squares for 8-bit loading bar`);
    }

    startAssetLoading() {
        console.log('📦 Starting main asset loading NOW that UI is ready...');
        
        // Create a new loader for the main assets
        const mainLoader = this.load;
        
        // Set up progress tracking for the main loading
        this.setupProgressTracking();
        
        // Load ALL audio assets for client-side caching
        this.loadAllAudioAssets();
        
        // Note: Character, environment, and gameplay assets already loaded in preload()
        console.log('📦 Character, environment, and gameplay assets already loaded in preload()');
        
        // Start the actual loading
        console.log('📦 Starting asset loading with visible progress...');
        mainLoader.start();
    }

    updateProgressBar(progress) {
        // Safety check - only update if UI elements exist and UI is marked as created
        if (!this.uiCreated || !this.pixelSquares || !this.percentText) {
            console.log('📊 Progress update before UI ready:', Math.round(progress * 100) + '%');
            return;
        }
        
        // Update percentage text
        const percentage = Math.round(progress * 100);
        this.percentText.setText(`${percentage}%`);
        
        // Calculate how many squares should be filled
        const squaresToFill = Math.floor(progress * this.totalSquares);
        
        // Update pixel squares
        for (let i = 0; i < this.totalSquares; i++) {
            const square = this.pixelSquares[i];
            if (i < squaresToFill) {
                // Show progress square with color based on progress
                square.progress.setVisible(true);
                
                // Change color based on progress
                if (progress < 0.3) {
                    square.progress.setFillStyle(0xff6b35); // Orange
                } else if (progress < 0.7) {
                    square.progress.setFillStyle(0xffd700); // Gold
                } else {
                    square.progress.setFillStyle(0x00ff00); // Green
                }
            } else {
                // Hide this square
                square.progress.setVisible(false);
            }
        }
        
        console.log(`📊 Progress: ${percentage}% (${squaresToFill}/${this.totalSquares} squares)`);
    }

    setupAudioActivation(centerX, centerY) {
        // Auto-activate audio when any user interaction occurs during loading
        this.input.once('pointerdown', () => {
            this.enableAudioOnInteraction();
        });

        this.input.keyboard.once('keydown', () => {
            this.enableAudioOnInteraction();
        });
    }

    enableAudioOnInteraction() {
        if (!this.audioActivated) {
            console.log('🎵 User interaction detected - enabling audio context');
            this.audioActivated = true;
            
            // Enable audio context for later use
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        }
    }

    onLoadComplete() {
        console.log('🎉 All assets loaded! Starting audio and transitioning...');
        
        if (this.transitioned) {
            console.log('⚠️ Already transitioned, skipping');
            return;
        }
        
        // Safety check - ensure scene is still active
        if (!this.scene || !this.scene.isActive()) {
            console.log('⚠️ Scene no longer active, skipping completion');
            return;
        }
        
        // Update UI to show completion (with safety checks)
        if (this.loadingText) {
            this.loadingText.setText('COMPLETE!');
        }
        
        // Update progress bar to 100% using pixel squares
        if (this.pixelSquares && this.percentText) {
            // Fill all squares with green
            this.pixelSquares.forEach(square => {
                square.progress.setVisible(true);
                square.progress.setFillStyle(0x00ff00);
            });
            this.percentText.setText('100%');
        }
        
        // Prepare audio if needed
        this.prepareAudio();
        
        // Transition after a brief pause
        this.time.delayedCall(500, () => {
            this.forceTransition();
        });
    }

    prepareAudio() {
        try {
            // Ensure audio is ready
            if (!this.audioActivated) {
                console.log('⚠️ No user interaction yet - audio will be activated on first interaction');
            }

            // Start the music if audio has been activated
            if (this.audioActivated && this.cache.audio.exists('menuMusic')) {
                window.menuMusic = this.sound.add('menuMusic', {
                    volume: 0.3,
                    loop: true
                });
                
                window.menuMusic.play();
                console.log('🎵 ✅ Menu music started after loading');
            } else if (this.cache.audio.exists('menuMusic')) {
                // Prepare music for later activation
                window.menuMusicReady = () => {
                    if (!window.menuMusic) {
                        window.menuMusic = this.sound.add('menuMusic', {
                            volume: 0.3,
                            loop: true
                        });
                        window.menuMusic.play();
                        console.log('🎵 ✅ Menu music started after user interaction');
                    }
                };
            }
        } catch (error) {
            console.warn('🎵 ⚠️ Could not prepare audio:', error);
        }
    }

    forceTransition() {
        if (this.transitioned) {
            console.log('⚠️ Transition already in progress');
            return;
        }
        
        this.transitioned = true;
        console.log('🎵 AudioBootScene: FORCING transition to MainMenuScene...');
        
        // Cancel backup timer
        if (this.backupTimer) {
            this.backupTimer.destroy();
        }
        
        try {
            this.scene.start('MainMenuScene');
            console.log('🎵 ✅ Forced transition completed successfully');
        } catch (transitionError) {
            console.error('🎵 ❌ Even forced transition failed:', transitionError);
            // Last resort - try again in 100ms
            this.time.delayedCall(100, () => {
                try {
                    this.scene.start('MainMenuScene');
                } catch (finalError) {
                    console.error('🎵 💥 FINAL TRANSITION ATTEMPT FAILED:', finalError);
                }
            });
        }
    }
}

// Make AudioBootScene available globally
window.AudioBootScene = AudioBootScene;
