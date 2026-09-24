// ========================================
// PAUSE SCENE
// ========================================
// Transparent overlay launched by GameScene.requestPause(). GameScene and
// TouchControlsScene are paused underneath it (their update loops, physics,
// tweens, timers and input all stop); UIScene keeps drawing the HUD.
// Resume: RESUME button, P or ESC. MAIN MENU quits the run.
class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene', active: false });
    }

    create() {
        this.configureCamera();
        this.build();

        this._onResize = () => {
            this.children.removeAll(true);
            this.configureCamera();
            this.build();
        };
        this.scale.on('resize', this._onResize);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this._onResize);
        });

        this.input.keyboard.on('keydown-P', () => this.resumeGame());
        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    }

    configureCamera() {
        const width = (this.scale && this.scale.width) || window.innerWidth || 1200;
        const height = (this.scale && this.scale.height) || window.innerHeight || 720;
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.setBounds();
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    }

    build() {
        const w = this.scale.width;
        const h = this.scale.height;
        const unit = Math.min(w / 1200, h / 720); // 1 at the virtual 1200x720 size
        const font = (window.GAME_CONFIG && GAME_CONFIG.ui.fontFamily) || 'VT323';

        // Dim the game and swallow every touch that is not on a button
        this.add.rectangle(0, 0, w, h, 0x000000, 0.65).setOrigin(0).setInteractive();

        this.add.text(w / 2, h * 0.30, 'PAUSED', {
            fontFamily: font,
            fontSize: `${Math.round(84 * unit)}px`,
            fill: '#FFD700',
            stroke: '#000000',
            strokeThickness: Math.max(2, Math.round(6 * unit))
        }).setOrigin(0.5);

        this.makeButton(w / 2, h * 0.52, 'RESUME', unit, font, () => this.resumeGame());
        this.makeButton(w / 2, h * 0.68, 'MAIN MENU', unit, font, () => this.quitToMenu());

        this.add.text(w / 2, h * 0.86, 'P or ESC to resume', {
            fontFamily: font,
            fontSize: `${Math.round(26 * unit)}px`,
            fill: '#bbbbbb'
        }).setOrigin(0.5);
    }

    makeButton(x, y, label, unit, font, onClick) {
        const width = 360 * unit;
        const height = 76 * unit;
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.92)
            .setStrokeStyle(Math.max(2, Math.round(3 * unit)), 0xffffff, 0.9);
        const text = this.add.text(0, 0, label, {
            fontFamily: font,
            fontSize: `${Math.round(44 * unit)}px`,
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add([bg, text]);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { bg.setFillStyle(0x333333, 0.95); text.setFill('#FFD700'); });
        bg.on('pointerout', () => { bg.setFillStyle(0x1a1a1a, 0.92); text.setFill('#ffffff'); container.setScale(1); });
        bg.on('pointerdown', () => container.setScale(0.95));
        // Fire on release, so the tap that opened the menu can never also trigger a button
        bg.on('pointerup', () => { container.setScale(1); onClick(); });
        return container;
    }

    resumeGame() {
        const game = this.scene.get('GameScene');
        this.scene.stop();
        if (game && typeof game.resumeFromPause === 'function') {
            game.resumeFromPause();
        }
    }

    quitToMenu() {
        const game = this.scene.get('GameScene');
        this.scene.stop();
        if (game && typeof game.quitToMenu === 'function') {
            game.quitToMenu();
        }
    }
}

if (typeof window !== 'undefined') {
    window.PauseScene = PauseScene;
}
