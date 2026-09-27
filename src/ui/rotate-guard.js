// ========================================
// ROTATE GUARD
// ========================================
// Turning a phone upright during play freezes the whole game behind a "rotate your
// device" screen until it is turned back to landscape.
//
// The main menu has its own rotate prompt; this covers everything after it - gameplay,
// dialogue, cutscenes, the intro and the pause menu. GameScene's own pause menu can't be
// used for this (it refuses during dialogue, cutscenes and level transitions), so the
// Phaser game itself is paused: no updates, timers, tweens or physics, and the canvas
// stops redrawing, so nothing gets laid out for the upright screen in the meantime.
//
// Plain DOM rather than Phaser: the message has to stay readable while the canvas is
// frozen, and at real CSS pixel sizes instead of the scaled-down game.

(function () {
    // Scenes during which turning the phone upright freezes the game
    const GUARDED_SCENES = ['GameScene', 'IntroDialogueScene', 'CutsceneScene'];

    const CSS = `
        #rotate-guard {
            position: fixed;
            inset: 0;
            z-index: 10003;             /* above the legal-info button and panel */
            background-color: #000;
            /* the same backdrop as the pre-game screen (index.html) */
            background-image:
                radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 100%),
                var(--backdrop-pluses),
                radial-gradient(ellipse at 50% 50%, #3c3c40 0%, #222226 48%, #050506 100%);
            background-size: 100% 100%, 320px 320px, 100% 100%;
            background-repeat: no-repeat, repeat, no-repeat;
            color: #FFD700;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            padding: 24px;
            box-sizing: border-box;
            font-family: 'VT323', monospace;
            text-align: center;
            touch-action: none;
        }
        #rotate-guard[hidden] { display: none; }
        #rotate-guard .rotate-guard-icon { font-size: 64px; line-height: 1; }
        #rotate-guard .rotate-guard-title { font-size: 44px; line-height: 1.05; }
        #rotate-guard .rotate-guard-note { font-size: 26px; color: #ccc; }
    `;

    let overlay = null;
    let locked = false;
    let soundsPausedByGuard = [];
    let checkTimer = null;

    function build() {
        if (overlay) return;
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        overlay = document.createElement('div');
        overlay.id = 'rotate-guard';
        overlay.hidden = true;
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-live', 'assertive');
        overlay.innerHTML = `
            <div class="rotate-guard-icon" aria-hidden="true">📱➡️📱</div>
            <div class="rotate-guard-title">PLEASE ROTATE DEVICE<br>TO LANDSCAPE</div>
            <div class="rotate-guard-note">Game paused</div>`;
        // Swallow every touch so nothing reaches the frozen game underneath
        ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click'].forEach(type =>
            overlay.addEventListener(type, (e) => { e.preventDefault(); e.stopPropagation(); }));

        (document.getElementById('game-container') || document.body).appendChild(overlay);
    }

    function inGuardedScene(game) {
        return GUARDED_SCENES.some(key => {
            const scene = game.scene.getScene(key);
            return scene && (scene.sys.isActive() || scene.sys.isPaused());
        });
    }

    function lock(game) {
        build();
        locked = true;
        overlay.hidden = false;

        // Silence only what is playing now, so unlocking never revives a sound that the
        // pause menu (or anything else) had paused or stopped on purpose
        soundsPausedByGuard = (game.sound.sounds || []).filter(s => s && s.isPlaying);
        soundsPausedByGuard.forEach(s => s.pause());

        game.pause();
        console.log('📱 RotateGuard: portrait during play - game frozen');
    }

    function unlock(game) {
        locked = false;
        if (overlay) overlay.hidden = true;

        game.resume();
        soundsPausedByGuard.forEach(s => { if (s && s.isPaused) s.resume(); });
        soundsPausedByGuard = [];

        // Re-fit the canvas and every scene to the landscape screen. refresh() alone reuses
        // the parent size measured before the phone turned, so re-measure first. Phones
        // keep reporting in-between sizes for a moment after rotating, so do it again
        // once things have settled - fitting only once left the game in half the screen.
        const refit = () => {
            if (locked || !game.scale) return;
            game.scale.getParentBounds();
            game.scale.refresh();
        };
        [0, 250, 700].forEach(ms => setTimeout(refit, ms));

        // Keys and touches held when the phone was turned never got their release events
        const gameScene = game.scene.getScene('GameScene');
        if (gameScene && (gameScene.sys.isActive() || gameScene.sys.isPaused())) {
            if (gameScene.input && gameScene.input.keyboard) gameScene.input.keyboard.resetKeys();
            if (gameScene.touchControlsOverlay) gameScene.touchControlsOverlay.releaseAll();
        }
        console.log('📱 RotateGuard: landscape again - game resumed');
    }

    function check() {
        const game = window.__legacyGameInstance;
        const device = window.DeviceManager;
        if (!game || !game.scene || !device || !device.isMobile) return;

        device.checkOrientation();
        const upright = device.shouldShowRotatePrompt();

        if (upright && !locked && inGuardedScene(game)) {
            lock(game);
        } else if (!upright && locked) {
            unlock(game);
        }
    }

    // Orientation events are unreliable across mobile browsers (and the viewport settles
    // a moment after them), so check shortly after each one and also on a slow poll
    function scheduleCheck() {
        clearTimeout(checkTimer);
        checkTimer = setTimeout(check, 150);
    }
    window.addEventListener('resize', scheduleCheck);
    window.addEventListener('orientationchange', scheduleCheck);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleCheck);
    setInterval(check, 500);

    window.RotateGuard = { check, isLocked: () => locked };
})();
