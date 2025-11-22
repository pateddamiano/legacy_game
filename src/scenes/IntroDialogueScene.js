// ========================================
// INTRO DIALOGUE SCENE
// ========================================
// Scene that plays before the game starts
// Shows story intro with placeholder dialogue

class IntroDialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroDialogueScene' });
        this.dialogueLines = [];
        this.currentLineIndex = 0;
        this.isTyping = false;
        this.typingSpeed = 30; // ms per character
    }

    init(data) {
        this.selectedCharacter = data.character || 'tireek';
        this.selectedLevelId = data.levelId || 1;
        console.log(`💬 IntroDialogueScene: Init with character=${this.selectedCharacter}, level=${this.selectedLevelId}`);
    }

    preload() {
        console.log('💬 IntroDialogueScene: Loading dialogue assets...');
        
        // Load character portraits
        this.load.image('dialogueTireek', 'assets/dialogue_objects/characters/tireek.png');
        this.load.image('dialogueTryston', 'assets/dialogue_objects/characters/tryston.png');
        
        // Load music studio background
        this.load.image('musicStudio', 'assets/dialogue_objects/backgrounds/music_studio.png');
    }

    create() {
        console.log('💬 IntroDialogueScene: Creating intro dialogue...');
        
        // Check for debug mode - skip dialogue and go directly to test level
        if (window.DIRECT_LEVEL_LOAD && window.TEST_LEVEL_ID === 'test') {
            console.log('%c🧪 DEBUG MODE: Skipping dialogue, going directly to test level', 'color: #00ff00; font-weight: bold;');
            this.time.delayedCall(100, () => {
                this.scene.start('GameScene', {
                    character: 'tireek',
                    levelId: 'test'
                });
            });
            return;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Add music studio background
        this.add.image(centerX, centerY, 'musicStudio').setOrigin(0.5, 0.5).setDepth(0);

        // Add character portraits
        this.createCharacterPortraits();
        
        // Add cinematic black bars (letterbox)
        this.createCinematicBars();

        // Dialogue lines
        this.dialogueLines = [
            {
                speaker: 'TRYSTON',
                text: 'Yo… someone jacked the drive with the album!'
            },
            {
                speaker: 'TIREEK',
                text: 'Nah, that\'s not just a leaker — this feels intentional.'
            },
            {
                speaker: 'TRYSTON',
                text: 'Without that album, we\'re ghosts. Our voice, our story — gone.'
            },
            {
                speaker: 'TIREEK',
                text: 'Then we get it back. Every track. Every bar. One fight at a time.'
            }
        ];

        // Create dialogue UI
        this.createDialogueUI();

        // Show first line
        this.showNextLine();

        // Input handling
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => this.handleSpacePress());

        // Skip text at bottom
        this.skipText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 50,
            'Press SPACE to continue',
            {
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontSize: GAME_CONFIG.ui.fontSize.label,
                color: '#888888'
            }
        ).setOrigin(0.5).setDepth(11);

        // Start background music - 'fade' music
        console.log('🎵 Starting fade music for dialogue scene...');
        // Get the audio manager from the game scene (it's shared across scenes)
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.audioManager) {
            this.audioManager = gameScene.audioManager;
            this.audioManager.playBackgroundMusic('fadeMusic');
        } else {
            // If GameScene isn't available, create a temporary audio manager
            this.audioManager = new AudioManager(this);
            this.audioManager.playBackgroundMusic('fadeMusic');
        }

        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    createCharacterPortraits() {
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const centerX = screenWidth / 2;
        
        // Tireek on the left (closer to center, moved down)
        this.tireekPortrait = this.add.image(centerX - 300, screenHeight / 2 + 50, 'dialogueTireek');
        this.tireekPortrait.setOrigin(0.5, 0.5);
        // Scale to fit nicely (adjust as needed based on image size)
        const tireekScale = Math.min(screenHeight * 0.7 / this.tireekPortrait.height, 450 / this.tireekPortrait.width);
        this.tireekPortrait.setScale(tireekScale);
        this.tireekPortrait.setDepth(1);
        
        // Avery/Tryston on the right (flipped horizontally, closer to center, moved down)
        this.trystonPortrait = this.add.image(centerX + 300, screenHeight / 2 + 50, 'dialogueTryston');
        this.trystonPortrait.setOrigin(0.5, 0.5);
        this.trystonPortrait.setFlipX(true); // Flip horizontally
        // Scale to fit nicely (adjust as needed based on image size)
        const trystonScale = Math.min(screenHeight * 0.7 / this.trystonPortrait.height, 450 / this.trystonPortrait.width);
        this.trystonPortrait.setScale(trystonScale);
        this.trystonPortrait.setDepth(1);
        
        console.log('💬 Character portraits created: Tireek (left), Avery (right, flipped)');
    }
    
    createCinematicBars() {
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const barHeight = 100; // Height of each black bar
        
        // Top black bar
        this.topBar = this.add.rectangle(0, 0, screenWidth, barHeight, 0x000000);
        this.topBar.setOrigin(0, 0);
        this.topBar.setDepth(5);
        
        // Bottom black bar
        this.bottomBar = this.add.rectangle(0, screenHeight - barHeight, screenWidth, barHeight, 0x000000);
        this.bottomBar.setOrigin(0, 0);
        this.bottomBar.setDepth(5);
        
        console.log('💬 Cinematic black bars added');
    }

    createDialogueUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Dialogue box background (centered, smaller horizontally, moved down further) - set depth above characters and bars
        this.dialogueBox = this.add.rectangle(
            centerX,
            centerY + 230,
            700,
            200,
            0x000000,
            0.9
        );
        this.dialogueBox.setStrokeStyle(3, 0xFFD700);
        this.dialogueBox.setDepth(10);

        // Speaker name - above dialogue box (moved down further)
        this.speakerText = this.add.text(
            centerX - 330,
            centerY + 140,
            '',
            {
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontSize: GAME_CONFIG.ui.fontSize.body,
                color: '#FFD700',
                fontStyle: 'bold'
            }
        );
        this.speakerText.setDepth(11);

        // Dialogue text (moved down further)
        this.messageText = this.add.text(
            centerX - 330,
            centerY + 180,
            '',
            {
                fontFamily: GAME_CONFIG.ui.fontFamily,
                fontSize: GAME_CONFIG.ui.fontSize.body,
                color: '#FFFFFF',
                wordWrap: { width: 650 }
            }
        );
        this.messageText.setDepth(11);
    }

    showNextLine() {
        if (this.currentLineIndex >= this.dialogueLines.length) {
            // All dialogue shown, transition to game
            this.transitionToGame();
            return;
        }

        const line = this.dialogueLines[this.currentLineIndex];
        
        // Update speaker
        this.speakerText.setText(line.speaker);

        // Type out the text
        this.messageText.setText('');
        this.isTyping = true;
        this.typeText(line.text);

        this.currentLineIndex++;
    }

    typeText(text) {
        // Start typing sound
        if (this.audioManager) {
            this.audioManager.startTextTyping();
        }
        
        let charIndex = 0;
        
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                this.messageText.setText(text.substring(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                this.isTyping = false;
                
                // Stop typing sound when typing completes
                if (this.audioManager) {
                    this.audioManager.stopTextTyping();
                }
            }
        }, this.typingSpeed);

        // Store interval so we can skip it
        this.currentTypeInterval = typeInterval;
    }

    handleSpacePress() {
        if (this.isTyping) {
            // Skip typing animation, show full text
            clearInterval(this.currentTypeInterval);
            const line = this.dialogueLines[this.currentLineIndex - 1];
            this.messageText.setText(line.text);
            this.isTyping = false;
            
            // Stop typing sound when skipped
            if (this.audioManager) {
                this.audioManager.stopTextTyping();
            }
        } else {
            // Move to next line
            this.showNextLine();
        }
    }

    transitionToGame() {
        console.log('💬 IntroDialogueScene: Dialogue complete, transitioning to game...');

        // Fade to black
        this.cameras.main.fadeOut(1000, 0, 0, 0);

        // After fade completes, start game
        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log('💬 IntroDialogueScene: Starting GameScene...');
            this.scene.start('GameScene', {
                character: this.selectedCharacter,
                levelId: this.selectedLevelId
            });
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.IntroDialogueScene = IntroDialogueScene;
}

