// ========================================
// CUTSCENE SCENE
// ========================================
// Generic still-image story beat, built the same way as IntroDialogueScene:
// static background, letterbox bars, typed dialogue, SPACE/tap to advance.
//
// Unlike IntroDialogueScene (which replaces the scene it came from), this one is
// LAUNCHED on top of a paused GameScene so that lives, score, health and the
// level transition already in flight all survive the cutscene untouched.
//
// Launch it through the 'cutscene' event action rather than directly - see
// SceneActions.executeCutscene(), which handles pausing/restoring GameScene.

class CutsceneScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CutsceneScene' });
        this.lines = [];
        this.currentLineIndex = 0;
        this.isTyping = false;
        this.typingSpeed = 30; // ms per character
    }

    init(data) {
        this.cutsceneId = data.cutsceneId;
        this.onComplete = data.onComplete || null;
        this.config = (window.CUTSCENE_CONFIGS && window.CUTSCENE_CONFIGS[this.cutsceneId]) || null;

        this.currentLineIndex = 0;
        this.isTyping = false;
        this.isFinishing = false;
        this.showcaseReady = false;

        console.log(`🎬 CutsceneScene: Init with cutscene '${this.cutsceneId}'`);
        if (!this.config) {
            console.error(`🎬 CutsceneScene: No cutscene config found for '${this.cutsceneId}'`);
        }
    }

    preload() {
        if (!this.config) return;

        const bg = this.config.background;
        if (bg && bg.key && bg.path && !this.textures.exists(bg.key)) {
            console.log(`🎬 CutsceneScene: Loading background ${bg.key} from ${bg.path}`);
            this.load.image(bg.key, bg.path);
        }

        const showcaseImage = this.config.showcase && this.config.showcase.image;
        if (showcaseImage && !this.textures.exists(showcaseImage.key)) {
            this.load.image(showcaseImage.key, showcaseImage.path);
        }

        // Portraits are optional, and shared with IntroDialogueScene
        if (this.config.portraits) {
            if (!this.textures.exists('dialogueTireek')) {
                this.load.image('dialogueTireek', 'assets/dialogue_objects/characters/tireek.png');
            }
            if (!this.textures.exists('dialogueTryston')) {
                this.load.image('dialogueTryston', 'assets/dialogue_objects/characters/tryston.png');
            }
        }
    }

    create() {
        console.log(`🎬 CutsceneScene: Creating cutscene '${this.cutsceneId}'...`);

        // Phaser does not call shutdown() automatically - wire it up ourselves
        this.events.once('shutdown', this.onShutdown, this);

        if (!this.config) {
            // Nothing to show - hand control straight back so the level flow continues
            this.finish();
            return;
        }

        // Use the same fixed virtual dimensions as the game world
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
        LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);

        this.onResize = () => LayoutManager.applyToScene(this, this.virtualWidth, this.virtualHeight);
        this.scale.on('resize', this.onResize);

        const centerX = this.virtualWidth / 2;
        const centerY = this.virtualHeight / 2;

        // Opaque backdrop so the paused GameScene underneath never shows through
        this.add.rectangle(centerX, centerY, this.virtualWidth, this.virtualHeight, 0x000000)
            .setDepth(-1);

        // Static background image, scaled to cover the virtual screen
        const bg = this.config.background;
        if (bg && this.textures.exists(bg.key)) {
            const image = this.add.image(centerX, centerY, bg.key).setOrigin(0.5, 0.5).setDepth(0);
            const coverScale = Math.max(
                this.virtualWidth / image.width,
                this.virtualHeight / image.height
            );
            image.setScale(coverScale);
        } else if (bg) {
            console.warn(`🎬 CutsceneScene: Background texture missing for '${this.cutsceneId}'`);
        }

        if (this.config.portraits) {
            this.createCharacterPortraits();
        }

        if (this.config.characters) {
            this.createCutsceneCharacters();
        }

        this.showcase = this.config.showcase || null;
        if (this.showcase) {
            this.createShowcase();
        } else {
            this.createCinematicBars();
            this.createDialogueUI();
        }

        this.lines = this.config.lines || [];

        // Audio: reuse GameScene's AudioManager so the track carries into the next
        // level cleanly. GameScene is PAUSED while we run, so its tween manager is
        // frozen - always start music without a fade or it would stick at volume 0.
        const gameScene = this.scene.get('GameScene');
        this.audioManager = (gameScene && gameScene.audioManager) ? gameScene.audioManager : null;
        if (this.audioManager && this.config.music) {
            const volume = this.config.musicVolume !== undefined ? this.config.musicVolume : null;
            this.audioManager.playBackgroundMusic(this.config.music, false, volume);
        }

        this.setupInput();

        if (this.showcase) {
            // End card: no dialogue, no skip prompt. Fade in and let it sit.
            this.cameras.main.fadeIn(1500, 0, 0, 0);
            return;
        }

        // Skip prompt
        const promptText = (window.DeviceManager && window.DeviceManager.shouldShowTouchControls())
            ? 'Tap to continue'
            : 'Press SPACE to continue';
        this.add.text(centerX, this.virtualHeight - 50, promptText, {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: GAME_CONFIG.ui.fontSize.label,
            color: '#888888'
        }).setOrigin(0.5).setDepth(11);

        this.showNextLine();

        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    setupInput() {
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => this.handleAdvance());

        // Full-screen tap target for touch devices
        this.touchOverlay = this.add.rectangle(
            this.virtualWidth / 2,
            this.virtualHeight / 2,
            this.virtualWidth,
            this.virtualHeight,
            0x000000,
            0
        );
        this.touchOverlay.setDepth(9);
        this.touchOverlay.setInteractive({ useHandCursor: false });
        this.touchOverlay.on('pointerdown', () => this.handleAdvance());
    }

    createCharacterPortraits() {
        const centerX = this.virtualWidth / 2;
        const screenHeight = this.virtualHeight;

        const tireek = this.add.image(centerX - 300, screenHeight / 2 + 50, 'dialogueTireek');
        tireek.setOrigin(0.5, 0.5);
        tireek.setScale(Math.min(screenHeight * 0.7 / tireek.height, 450 / tireek.width));
        tireek.setDepth(1);

        const tryston = this.add.image(centerX + 300, screenHeight / 2 + 50, 'dialogueTryston');
        tryston.setOrigin(0.5, 0.5);
        tryston.setFlipX(true);
        tryston.setScale(Math.min(screenHeight * 0.7 / tryston.height, 450 / tryston.width));
        tryston.setDepth(1);
    }

    // In-world character models (the real idle sprites, not dialogue portraits).
    // Textures are already loaded by PreloadScene; 'player' entries use the character's
    // idle sheet, 'extra' entries use a static image from EXTRAS_REGISTRY.
    createCutsceneCharacters() {
        this.config.characters.forEach(def => {
            let textureKey;
            let isPlayer = def.type === 'player';

            if (isPlayer) {
                textureKey = `${def.name}_idle`;
            } else {
                const extra = window.EXTRAS_REGISTRY && window.EXTRAS_REGISTRY[def.name];
                textureKey = extra ? extra.key : null;
            }

            if (!textureKey || !this.textures.exists(textureKey)) {
                console.warn(`🎬 CutsceneScene: Texture missing for character '${def.name}', skipping`);
                return;
            }

            this.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

            const sprite = this.add.sprite(def.x, def.feetY, textureKey, 0);
            sprite.setOrigin(0.5, def.originY !== undefined ? def.originY : 1);
            sprite.setScale(def.scale || 1);
            sprite.setFlipX(!!def.flipX);
            sprite.setDepth(1);

            if (isPlayer) {
                const animKey = this.anims.exists(`${def.name}_idle`) ? `${def.name}_idle` : `${def.name}_idle_cutscene`;
                if (!this.anims.exists(animKey)) {
                    this.anims.create({
                        key: animKey,
                        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: -1 }),
                        frameRate: 12,
                        repeat: -1
                    });
                }
                sprite.anims.play(animKey);
            }
        });
    }

    // End card: a hovering image over a radial glow (yellow centre fading to dark),
    // with a title and subtitle, then a prompt to return to the main menu.
    createShowcase() {
        const s = this.showcase;
        const centerX = this.virtualWidth / 2;
        const imageY = s.y !== undefined ? s.y : 290;

        // Radial glow: opaque yellow in the middle, fully transparent at the edge
        const glowSize = s.glowSize || 760;
        if (this.textures.exists('cutsceneShowcaseGlow')) {
            this.textures.remove('cutsceneShowcaseGlow');
        }
        const glowTexture = this.textures.createCanvas('cutsceneShowcaseGlow', glowSize, glowSize);
        const ctx = glowTexture.getContext();
        const half = glowSize / 2;
        const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, 'rgba(255, 224, 80, 0.95)');
        gradient.addColorStop(0.35, 'rgba(255, 190, 30, 0.55)');
        gradient.addColorStop(0.7, 'rgba(180, 120, 10, 0.18)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, glowSize, glowSize);
        glowTexture.refresh();

        const glow = this.add.image(centerX, imageY, 'cutsceneShowcaseGlow').setDepth(1);
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.8, to: 1 },
            duration: 2200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // The hovering image itself
        const image = this.add.image(centerX, imageY, s.image.key).setDepth(2);
        image.setScale((s.height || 400) / image.height);
        const bob = s.bobDistance !== undefined ? s.bobDistance : 12;
        this.tweens.add({
            targets: image,
            y: imageY - bob,
            duration: s.bobDuration || 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Title + subtitle fade in after the picture has settled
        const title = this.add.text(centerX, 560, s.title || '', {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: '72px',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3).setAlpha(0);

        const subtitle = this.add.text(centerX, 625, s.subtitle || '', {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: '36px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(3).setAlpha(0);

        this.tweens.add({ targets: [title, subtitle], alpha: 1, delay: 1800, duration: 1500 });

        // After a few seconds, offer the way back to the menu
        const promptText = (window.DeviceManager && window.DeviceManager.shouldShowTouchControls())
            ? 'Tap to return to the main menu'
            : 'Press SPACE to return to the main menu';
        const prompt = this.add.text(centerX, this.virtualHeight - 40, promptText, {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: GAME_CONFIG.ui.fontSize.label,
            color: '#888888'
        }).setOrigin(0.5).setDepth(3).setAlpha(0);

        this.time.delayedCall(5000, () => {
            this.showcaseReady = true;
            this.tweens.add({ targets: prompt, alpha: 1, duration: 800 });
        });
    }

    returnToMainMenu() {
        if (this.isFinishing) return;
        this.isFinishing = true;

        if (this.audioManager) {
            this.audioManager.stopBackgroundMusic(false);
        }

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (window.sceneManager && window.sceneManager.exitToMainMenu) {
                window.sceneManager.exitToMainMenu();
            } else {
                console.error('🎬 CutsceneScene: sceneManager unavailable, cannot return to main menu');
                this.isFinishing = false;
            }
        });
    }

    createCinematicBars() {
        const barHeight = 100;

        this.add.rectangle(0, 0, this.virtualWidth, barHeight, 0x000000)
            .setOrigin(0, 0)
            .setDepth(5);

        this.add.rectangle(0, this.virtualHeight - barHeight, this.virtualWidth, barHeight, 0x000000)
            .setOrigin(0, 0)
            .setDepth(5);
    }

    createDialogueUI() {
        const centerX = this.virtualWidth / 2;
        const centerY = this.virtualHeight / 2;

        this.defaultBoxColor = 0xFFD700;
        this.defaultSpeakerColor = '#FFD700';

        this.dialogueBox = this.add.rectangle(centerX, centerY + 230, 700, 200, 0x000000, 0.9);
        this.dialogueBox.setStrokeStyle(3, this.defaultBoxColor);
        this.dialogueBox.setDepth(10);

        this.speakerText = this.add.text(centerX - 330, centerY + 140, '', {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: GAME_CONFIG.ui.fontSize.body,
            color: '#FFD700',
            fontStyle: 'bold'
        });
        this.speakerText.setDepth(11);

        this.messageText = this.add.text(centerX - 330, centerY + 180, '', {
            fontFamily: GAME_CONFIG.ui.fontFamily,
            fontSize: GAME_CONFIG.ui.fontSize.body,
            color: '#FFFFFF',
            wordWrap: { width: 650 }
        });
        this.messageText.setDepth(11);
    }

    showNextLine() {
        if (this.currentLineIndex >= this.lines.length) {
            this.transitionOut();
            return;
        }

        const line = this.lines[this.currentLineIndex];
        this.speakerText.setText(line.speaker || '');
        this.messageText.setText('');

        // Per-line dialogue box/speaker color override (e.g. a different character's box color)
        this.dialogueBox.setStrokeStyle(3, line.boxColor !== undefined ? line.boxColor : this.defaultBoxColor);
        this.speakerText.setColor(line.speakerColor !== undefined ? line.speakerColor : this.defaultSpeakerColor);

        this.isTyping = true;
        this.typeText(line.text || '');

        this.currentLineIndex++;
    }

    typeText(text) {
        if (this.audioManager) {
            this.audioManager.startTextTyping();
        }

        this.stopTyping();

        let charIndex = 0;
        // Use this scene's clock (GameScene's is paused underneath us)
        this.typeTimer = this.time.addEvent({
            delay: this.typingSpeed,
            repeat: Math.max(text.length - 1, 0),
            callback: () => {
                charIndex++;
                this.messageText.setText(text.substring(0, charIndex));
                if (charIndex >= text.length) {
                    this.finishTyping();
                }
            }
        });
    }

    finishTyping() {
        this.isTyping = false;
        this.stopTyping();
        if (this.audioManager) {
            this.audioManager.stopTextTyping();
        }
    }

    stopTyping() {
        if (this.typeTimer) {
            this.typeTimer.remove(false);
            this.typeTimer = null;
        }
    }

    handleAdvance() {
        if (this.isFinishing) return;

        if (this.showcase) {
            if (this.showcaseReady) this.returnToMainMenu();
            return;
        }

        if (this.isTyping) {
            // Skip the typing animation and show the full line
            const line = this.lines[this.currentLineIndex - 1];
            this.messageText.setText(line ? (line.text || '') : '');
            this.finishTyping();
        } else {
            this.showNextLine();
        }
    }

    transitionOut() {
        if (this.isFinishing) return;
        this.isFinishing = true;

        console.log(`🎬 CutsceneScene: '${this.cutsceneId}' complete, fading out...`);
        this.finishTyping();

        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.finish());
    }

    finish() {
        const callback = this.onComplete;
        this.onComplete = null;

        console.log(`🎬 CutsceneScene: Handing control back after '${this.cutsceneId}'`);
        this.scene.stop();

        if (callback) {
            callback();
        }
    }

    onShutdown() {
        this.stopTyping();
        if (this.onResize) {
            this.scale.off('resize', this.onResize);
            this.onResize = null;
        }
        if (this.audioManager) {
            this.audioManager.stopTextTyping();
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CutsceneScene = CutsceneScene;
}
