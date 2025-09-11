// ========================================
// CHARACTER SELECT SCENE
// ========================================
// Character selection screen with character previews and stats

class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.selectedCharacter = null;
        this.characterSprites = [];
        this.characterInfo = [];
        this.backgroundContainer = null;
        this.backgroundTiles = [];
        this.menuSounds = null;
    }
    
    preload() {
        console.log('👤 CharacterSelectScene: Loading character select assets...');
        
        // Load character idle sprites - these are our main character sprites
        this.load.spritesheet('tireek_idle', 'assets/characters/tireek/spritesheets/Tireek_Idle.png', {
            frameWidth: 128,
            frameHeight: 96
        });
        
        this.load.spritesheet('tryston_idle', 'assets/characters/tryston/spritesheets/Tryston_Idle.png', {
            frameWidth: 128,
            frameHeight: 96
        });
        
        // Background is already loaded from AudioBootScene, but check if it exists
        if (!this.textures.exists('menuBackground')) {
            this.load.image('menuBackground', 'assets/backgrounds/MenuBackground.png');
        }
    }
    

    create() {
        console.log('👤 CharacterSelectScene: Creating character selection...');
        
        // Create animated background (same as main menu)
        this.createAnimatedBackground();
        
        // Create animations for character sprites
        this.createCharacterAnimations();
        
        // Create menu sounds (same as main menu)
        this.createMenuSounds();
        
        // Create UI
        this.createUI();
        
        // Create character displays
        this.createCharacterDisplays();
        
        // Set up input
        this.setupInput();
        
        // Start with no character selected - player must choose
        this.selectedCharacter = null;
        this.updateCharacterSelection();
        
        console.log('👤 CharacterSelectScene: Character selection created successfully');
    }
    
    createAnimatedBackground() {
        console.log('🎨 CharacterSelectScene: Creating animated tiled background...');
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const originalTileSize = 768; // Original size of background tile
        const scaleFactor = 0.3; // Make tiles much smaller (30% of original size)
        const tileSize = originalTileSize * scaleFactor;
        
        const tilesX = Math.ceil(screenWidth / tileSize) + 3;
        const tilesY = Math.ceil(screenHeight / tileSize) + 3;
        
        this.backgroundContainer = this.add.container(0, 0);
        this.backgroundTiles = [];
        for (let x = 0; x < tilesX; x++) {
            for (let y = 0; y < tilesY; y++) {
                const tile = this.add.image(
                    (x * tileSize) - tileSize,
                    (y * tileSize) - tileSize,
                    'menuBackground'
                ).setOrigin(0, 0)
                 .setScale(scaleFactor); // Scale down the tiles
                this.backgroundContainer.add(tile);
                this.backgroundTiles.push(tile);
            }
        }
        this.animateCharacterSelectBackground();
        console.log(`🎨 ✅ CharacterSelect: Created ${this.backgroundTiles.length} small background tiles with downward animation`);
    }
    
    animateCharacterSelectBackground() {
        const tileSize = 768 * 0.3; // Scaled tile size
        this.tweens.add({
            targets: this.backgroundContainer,
            y: tileSize, // Move down by one tile height
            duration: 10000, // 10 seconds for consistent movement with main menu
            ease: 'Linear',
            repeat: -1,
            onRepeat: () => {
                this.backgroundContainer.y = 0;
            }
        });
        console.log('🎨 ✅ CharacterSelect: Downward background animation started');
    }
    
    createCharacterAnimations() {
        console.log('👤 CharacterSelectScene: Creating character animations...');
        
        // Tireek idle animation
        if (!this.anims.exists('tireek_idle_anim')) {
            this.anims.create({
                key: 'tireek_idle_anim',
                frames: this.anims.generateFrameNumbers('tireek_idle', { start: 0, end: -1 }),
                frameRate: 6,
                repeat: -1
            });
        }
        
        // Tryston idle animation
        if (!this.anims.exists('tryston_idle_anim')) {
            this.anims.create({
                key: 'tryston_idle_anim',
                frames: this.anims.generateFrameNumbers('tryston_idle', { start: 0, end: -1 }),
                frameRate: 6,
                repeat: -1
            });
        }
        
        console.log('👤 ✅ CharacterSelectScene: Character animations created');
    }
    
    createMenuSounds() {
        console.log('🔊 CharacterSelectScene: Creating menu sounds...');
        try {
            // Create 8-bit style menu sounds using Web Audio API (same as main menu)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.menuSounds = {
                hover: {
                    play: () => {
                        // 8-bit hover sound - quick beep
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);
                        
                        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.1);
                    }
                },
                click: {
                    play: () => {
                        // 8-bit click sound - double beep
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.05);
                        
                        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
                        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + 0.05);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.15);
                    }
                },
                back: {
                    play: () => {
                        // 8-bit back sound - descending tone
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
                        
                        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.2);
                    }
                }
            };
            
            console.log('🔊 ✅ CharacterSelectScene: Menu sounds created successfully');
        } catch (error) {
            console.warn('🔊 ⚠️ CharacterSelectScene: Could not create menu sounds:', error);
            // Fallback - create silent functions
            this.menuSounds = {
                hover: { play: () => {} },
                click: { play: () => {} },
                back: { play: () => {} }
            };
        }
    }
    
    createUI() {
        const centerX = this.cameras.main.centerX;
        
        // Title with golden theme
        this.add.text(centerX, 80, 'SELECT YOUR FIGHTER!', {
            fontSize: '48px',
            fill: '#FFD700', // Golden yellow
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#B8860B', // Dark gold outline
            strokeThickness: 4,
            shadow: {
                offsetX: 4,
                offsetY: 4,
                color: '#8B4513', // Brown shadow
                blur: 0, // Sharp 8-bit shadow
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5);
        
        // Back button
        this.createBackButton();
        
        // Continue button (initially hidden)
        this.createContinueButton();
    }
    
    createCharacterDisplays() {
        console.log('👤 CharacterSelectScene: Creating character displays...');
        
        // Our two main characters - both unlocked from the start
        const characters = [
            {
                name: 'tireek',
                displayName: 'TIREEK',
                spriteKey: 'tireek_idle',
                animKey: 'tireek_idle_anim'
            },
            {
                name: 'tryston',
                displayName: 'TRYSTON',
                spriteKey: 'tryston_idle',
                animKey: 'tryston_idle_anim'
            }
        ];
        
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const spacing = 350; // Increased spacing for bigger boxes
        
        // Calculate starting position for centering both characters
        const startX = centerX - (spacing / 2);
        
        characters.forEach((character, index) => {
            const x = startX + (index * spacing);
            
            // Create character container
            const container = this.createCharacterContainer(character, x, centerY);
            const characterData = {
                character: character,
                container: container,
                characterName: character.name, // Explicitly set the characterName
                x: x,
                y: centerY
            };
            this.characterSprites.push(characterData);
            
            console.log(`👤 Added character to sprites array:`, character.name, characterData);
        });
        
        console.log('👤 ✅ CharacterSelectScene: Character displays created');
    }
    
    createCharacterContainer(character, x, y) {
        const container = this.add.container(x, y);
        
        // Character frame/background - grey by default, make it bigger
        const frame = this.add.rectangle(0, 0, 320, 360, 0x333333, 0.9);
        frame.setStrokeStyle(3, 0x666666); // Grey border by default
        container.add(frame);
        
        // Character sprite (idle animation) - bigger and centered
        const sprite = this.add.sprite(0, -50, character.spriteKey);
        sprite.setScale(3); // Good size to show the character clearly with correct aspect ratio
        
        // Flip Tryston to face Tireek for classic fighting game face-off
        if (character.name === 'tryston') {
            sprite.setFlipX(true);
        }
        
        container.add(sprite);
        
        // Play idle animation
        sprite.anims.play(character.animKey, true);
        
        // Character name - white by default, will change to yellow when selected
        const nameText = this.add.text(0, 100, character.displayName, {
            fontSize: '32px',
            fill: '#FFFFFF', // White by default
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#000000', // Black outline
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#333333', // Dark shadow
                blur: 0, // Sharp 8-bit shadow
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5);
        container.add(nameText);
        
        // Make container interactive
        frame.setInteractive({ useHandCursor: true });
        frame.on('pointerover', () => {
            this.menuSounds.hover.play(); // Play hover sound
            this.highlightCharacter(character.name);
        });
        frame.on('pointerout', () => {
            // Reset highlighting when not hovering
            this.resetHighlighting();
        });
        frame.on('pointerdown', () => {
            this.menuSounds.click.play(); // Play click sound
            this.selectCharacter(character.name);
        });
        
        // Store references
        container.frame = frame;
        container.sprite = sprite;
        container.nameText = nameText;
        container.characterName = character.name;
        
        console.log(`👤 Created character container for: ${character.name}`);
        
        return container;
    }
    
    
    createBackButton() {
        // Create button background
        const buttonBg = this.add.rectangle(130, 50, 160, 50, 0x2C1810, 0.9);
        buttonBg.setStrokeStyle(3, 0xFFD700);
        
        const backButton = this.add.text(130, 50, '← BACK', {
            fontSize: '24px',
            fill: '#FFD700', // Golden yellow
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#B8860B', // Dark gold outline
            strokeThickness: 2
        }).setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
              this.menuSounds.hover.play(); // Play hover sound
              backButton.setStyle({ fill: '#FF6B35', stroke: '#CC4125' }); // Orange on hover
              buttonBg.setFillStyle(0x4A2818, 0.9);
              buttonBg.setStrokeStyle(4, 0xFF6B35);
          })
          .on('pointerout', () => {
              backButton.setStyle({ fill: '#FFD700', stroke: '#B8860B' }); // Back to golden
              buttonBg.setFillStyle(0x2C1810, 0.9);
              buttonBg.setStrokeStyle(3, 0xFFD700);
          })
          .on('pointerdown', () => {
              console.log('🔙 Back button clicked!');
              this.menuSounds.back.play(); // Play back sound
              
              // Force transition directly using Phaser's scene management
              console.log('🔙 Forcing direct scene transition to MainMenuScene');
              try {
                  // Update the scene manager tracking before transition
                  if (window.sceneManager) {
                      window.sceneManager.currentScene = 'CharacterSelectScene'; // Fix tracking
                  }
                  
                  // Stop current scene and start main menu
                  this.scene.start('MainMenuScene');
                  console.log('🔙 ✅ Direct scene transition initiated');
              } catch (error) {
                  console.error('🔙 ❌ Error with direct transition:', error);
                  // Fallback to scene manager
                  try {
                      window.sceneManager.goToMainMenu();
                      console.log('🔙 ✅ Fallback via sceneManager worked');
                  } catch (fallbackError) {
                      console.error('🔙 ❌ Fallback also failed:', fallbackError);
                  }
              }
          });
    }
    
    createContinueButton() {
        const centerX = this.cameras.main.centerX;
        const buttonY = this.cameras.main.height - 80;
        
        // Create button background
        this.continueButtonBg = this.add.rectangle(centerX, buttonY, 300, 60, 0x2C1810, 0.9);
        this.continueButtonBg.setStrokeStyle(3, 0xFFD700);
        this.continueButtonBg.setVisible(false); // Hidden initially
        
        this.continueButton = this.add.text(centerX, buttonY, 'START GAME', {
            fontSize: '32px',
            fill: '#FFD700', // Golden yellow
            fontFamily: 'Arial Black, Arial',
            fontWeight: 'bold',
            stroke: '#B8860B', // Dark gold outline
            strokeThickness: 3,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#8B4513', // Brown shadow
                blur: 0, // Sharp 8-bit shadow
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
              this.menuSounds.hover.play(); // Play hover sound
              this.continueButton.setStyle({ 
                  fill: '#FF6B35', 
                  stroke: '#CC4125',
                  fontSize: '34px'
              });
              this.continueButtonBg.setFillStyle(0x4A2818, 0.9);
              this.continueButtonBg.setStrokeStyle(4, 0xFF6B35);
          })
          .on('pointerout', () => {
              this.continueButton.setStyle({ 
                  fill: '#FFD700', 
                  stroke: '#B8860B',
                  fontSize: '32px'
              });
              this.continueButtonBg.setFillStyle(0x2C1810, 0.9);
              this.continueButtonBg.setStrokeStyle(3, 0xFFD700);
          })
          .on('pointerdown', () => {
              this.menuSounds.click.play(); // Play click sound
              this.startGameWithCharacter();
          })
          .setVisible(false); // Hidden initially
    }
    
    setupInput() {
        // Keyboard navigation
        this.input.keyboard.on('keydown-LEFT', () => {
            this.selectPreviousCharacter();
        });
        
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.selectNextCharacter();
        });
        
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.selectedCharacter) {
                this.startGameWithCharacter();
            }
        });
        
        this.input.keyboard.on('keydown-ESC', () => {
            window.sceneManager.goToMainMenu();
        });
    }
    
    // ========================================
    // CHARACTER SELECTION LOGIC
    // ========================================
    
    selectCharacter(characterName) {
        // Both characters are always unlocked
        this.selectedCharacter = characterName;
        
        console.log(`👤 Character selected: ${characterName}`);
        console.log(`👤 Available character sprites:`, this.characterSprites.map(c => c.characterName));
        
        // Update visual selection
        this.updateCharacterSelection();
        
        // Show continue button
        this.continueButton.setVisible(true);
        this.continueButtonBg.setVisible(true);
        
        console.log(`👤 Selection update completed for: ${characterName}`);
    }
    
    highlightCharacter(characterName) {
        // Add hover effects - brighten the border if not selected
        this.characterSprites.forEach(charData => {
            if (charData.characterName === characterName && charData.characterName !== this.selectedCharacter) {
                charData.container.frame.setStrokeStyle(5, 0xFFFFFF); // White border on hover
                charData.container.frame.setFillStyle(0x444444, 0.9); // Slightly lighter grey background
            }
        });
    }
    
    resetHighlighting() {
        // Reset all highlighting and return to proper selection states
        this.updateCharacterSelection();
    }
    
    updateCharacterSelection() {
        console.log(`🎨 Updating character selection. Selected: ${this.selectedCharacter}`);
        this.characterSprites.forEach(charData => {
            console.log(`🎨 Processing character: ${charData.characterName}, Selected: ${charData.characterName === this.selectedCharacter}`);
            if (charData.characterName === this.selectedCharacter) {
                // Selected character - YELLOW border and background, larger scale
                console.log(`🟡 Making ${charData.characterName} YELLOW`);
                charData.container.frame.setFillStyle(0xFFD700, 0.3); // Yellow background with transparency
                charData.container.frame.setStrokeStyle(5, 0xFFD700); // Yellow border
                charData.container.setScale(1.1);
                charData.container.nameText.setStyle({ 
                    fill: '#FFD700', // Yellow text
                    stroke: '#B8860B' // Dark yellow outline
                });
            } else {
                // Non-selected character - GREY appearance
                console.log(`⚫ Making ${charData.characterName || 'unknown'} GREY`);
                charData.container.frame.setFillStyle(0x333333, 0.9); // Grey background
                charData.container.frame.setStrokeStyle(3, 0x666666); // Grey border
                charData.container.setScale(1.0);
                charData.container.nameText.setStyle({ 
                    fill: '#FFFFFF', // White text
                    stroke: '#000000' // Black outline
                });
            }
        });
    }
    
    selectPreviousCharacter() {
        const availableCharacters = this.characterSprites.map(c => c.characterName);
        const currentIndex = availableCharacters.indexOf(this.selectedCharacter);
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : availableCharacters.length - 1;
        this.selectCharacter(availableCharacters[previousIndex]);
    }
    
    selectNextCharacter() {
        const availableCharacters = this.characterSprites.map(c => c.characterName);
        const currentIndex = availableCharacters.indexOf(this.selectedCharacter);
        const nextIndex = currentIndex < availableCharacters.length - 1 ? currentIndex + 1 : 0;
        this.selectCharacter(availableCharacters[nextIndex]);
    }
    
    
    startGameWithCharacter() {
        if (!this.selectedCharacter) return;
        
        console.log(`🎮 Starting Level 1 with ${this.selectedCharacter}`);
        
        // Stop menu music before entering gameplay
        console.log('🎵 Stopping menu music for gameplay...');
        this.stopMenuMusic();
        
        // Save the selected character to game state
        window.gameState.player.preferences.lastSelectedCharacter = this.selectedCharacter;
        
        // Start Level 1 with the selected character
        window.sceneManager.startGameplay(this.selectedCharacter, 'level1');
    }
    
    stopMenuMusic() {
        try {
            if (window.menuMusic && window.menuMusic.isPlaying) {
                window.menuMusic.stop();
                console.log('🎵 ✅ Menu music stopped');
            } else if (window.menuMusic) {
                console.log('🎵 Menu music was not playing');
            } else {
                console.log('🎵 No menu music found to stop');
            }
        } catch (error) {
            console.error('🎵 ❌ Error stopping menu music:', error);
        }
    }
}

// Make CharacterSelectScene available globally
window.CharacterSelectScene = CharacterSelectScene;
