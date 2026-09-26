// ========================================
// HANDHELD CONTROLS SCENE
// ========================================
// Phone held upright (handheld mode): keeps the console's controls on screen the whole
// time, not only during gameplay. Whenever the gameplay controls (GameScene's
// TouchControlsOverlay) are not showing - main menu, loading, intro, cutscenes, dialogue,
// the pause menu - a second copy of the same controls is drawn here in the same spots, in
// "menu mode": the stick moves between the screen's buttons and ATTACK presses them
// (HandheldMenuNav); the other buttons are greyed out.
//
// Runs from boot and stays on; in landscape it draws nothing.

class HandheldControlsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HandheldControlsScene', active: true });
    }

    preload() {
        // The button icons (normally loaded with the first level) so the menu controls
        // look the same as the gameplay ones from the start
        if (!this.textures.exists('tornado')) {
            this.load.spritesheet('tornado', 'assets/effects/Tornado.png', { frameWidth: 96, frameHeight: 96 });
        }
        if (!this.textures.exists('fistIcon')) {
            this.load.image('fistIcon', 'assets/effects/fist_icon.png');
        }
        // (the JUMP icon's sprite comes with the characters, loaded by AudioBootScene - see
        // update(), which swaps it in once it is there)
    }

    create() {
        this.configureCamera();
        const onResize = () => {
            this.configureCamera();
            if (this.overlay) this.overlay.relayout();
        };
        this.scale.on('resize', onResize);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

        // The overlay reads its sizing from a UI scene; there is none here, and in handheld
        // mode it lays itself out from LayoutManager.getHandheldLayout anyway
        const uiStub = { uiScale: 1, viewportInfo: null, events: new Phaser.Events.EventEmitter() };
        this.overlay = new TouchControlsOverlay(null, uiStub, null, this);
        this.overlay.create();
        this.overlay.setMenuMode(true);
        this.overlay.setVisible(false);
        this.nav = new HandheldMenuNav(this, this.overlay);
        this.sizeKey = '';
    }

    configureCamera() {
        const width = (this.scale && this.scale.width) || window.innerWidth;
        const height = (this.scale && this.scale.height) || window.innerHeight;
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.setBounds();
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    }

    // GameScene's own controls are up (then these stay hidden)
    gameplayControlsShowing() {
        const gs = this.scene.get('GameScene');
        return !!(gs && gs.sys.isActive() && gs.touchControlsOverlay && gs.touchControlsOverlay.visible);
    }

    update(time, delta) {
        if (!this.overlay) return;
        const jump = this.overlay.buttons.jump;
        if (jump && !this.jumpIconTried && this.textures.exists('tryston_jump')) {
            this.jumpIconTried = true;
            jump.useJumpIcon();
            jump.setDisabled(this.overlay.menuMode);
        }
        const show = !!(window.DeviceManager && window.DeviceManager.isHandheldMode()) &&
            !this.gameplayControlsShowing();

        if (show !== this.overlay.visible) {
            this.overlay.releaseAll();
            this.nav.reset();
            this.overlay.setVisible(show);
        }
        if (!show) return;

        // Above every other scene (the pause menu's dimmed backdrop included), so the
        // controls stay bright and get the touches first
        const scenes = this.game.scene.scenes;
        if (scenes[scenes.length - 1] !== this) this.scene.bringToTop();

        const size = LayoutManager.getScreenSize();
        const key = `${size.width}x${size.height}`;
        if (key !== this.sizeKey) {
            this.sizeKey = key;
            this.overlay.relayout();
        }

        this.nav.update(delta);
    }
}

if (typeof window !== 'undefined') {
    window.HandheldControlsScene = HandheldControlsScene;
}
