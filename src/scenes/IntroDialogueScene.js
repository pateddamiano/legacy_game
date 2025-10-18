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

    create() {
        console.log('💬 IntroDialogueScene: Creating intro dialogue...');

        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Placeholder dialogue lines
        this.dialogueLines = [
            {
                speaker: 'NARRATOR',
                text: '[Placeholder] The streets have taken everything from you...'
            },
            {
                speaker: 'NARRATOR',
                text: '[Placeholder] Time to take it back. One block at a time.'
            },
            {
                speaker: 'TIREEK',
                text: '[Placeholder] Let\'s do this.'
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
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#888888'
            }
        ).setOrigin(0.5);

        // Fade in from black
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    createDialogueUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Dialogue box background (centered, large)
        this.dialogueBox = this.add.rectangle(
            centerX,
            centerY + 150,
            1000,
            200,
            0x000000,
            0.8
        );
        this.dialogueBox.setStrokeStyle(3, 0xFFD700);

        // Speaker name
        this.speakerText = this.add.text(
            centerX - 480,
            centerY + 60,
            '',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#FFD700',
                fontStyle: 'bold'
            }
        );

        // Dialogue text
        this.messageText = this.add.text(
            centerX - 480,
            centerY + 100,
            '',
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#FFFFFF',
                wordWrap: { width: 950 }
            }
        );
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
        let charIndex = 0;
        
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                this.messageText.setText(text.substring(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                this.isTyping = false;
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

