// ========================================
// HANDHELD SHELL
// ========================================
// With the phone held upright the game plays as a handheld console: the game screen sits
// in a bezel at the top and the touch controls below it (LayoutManager.getHandheldLayout
// works out where everything goes; LayoutManager.calculateGameViewport puts every scene's
// camera into the screen and TouchControlsOverlay.relayout moves the controls).
//
// This draws the console body itself: plain DOM inside #game-container, BEHIND the
// (transparent) canvas, so it shows everywhere outside the game view and survives
// fullscreen. The body uses the page's backdrop (grey radial gradient + yellow pluses),
// with a bezel around the screen, recessed wells under the stick, the buttons and the
// pause button, and a speaker grille. It is purely decorative: every touch goes to the
// canvas on top.
//
// It also handles the phone being turned (this replaces the old "rotate your device"
// guard, which froze the game in portrait): the canvas is re-fitted as the viewport
// settles, and keys / touches held while turning are released.

(function () {
    const CSS = `
        #game-container { position: relative; }
        #game-container > canvas { position: relative; z-index: 1; }
        #handheld-shell {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            background: #000;
            font-family: 'VT323', monospace;
        }
        #handheld-shell[hidden] { display: none; }
        #handheld-shell .hh-body {
            position: absolute;
            inset: 0;
            /* the page backdrop (index.html), with the full-strength pluses */
            background-color: #000;
            background-image:
                radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 100%),
                var(--backdrop-pluses),
                radial-gradient(ellipse at 50% 45%, #3c3c40 0%, #222226 55%, #0b0b0d 100%);
            background-size: 100% 100%, 320px 320px, 100% 100%;
            background-repeat: no-repeat, repeat, no-repeat;
            /* the classic big curve on the bottom-right corner */
            border-radius: 26px 26px 96px 26px;
            box-shadow:
                inset 0 1px 0 rgba(255,255,255,0.10),
                inset 0 0 0 1px rgba(255,255,255,0.05),
                inset 0 -6px 18px rgba(0,0,0,0.45);
        }
        #handheld-shell .hh-bezel {
            position: absolute;
            box-sizing: border-box;
            background: linear-gradient(180deg, #1c1c21 0%, #111114 100%);
            border-radius: 26px 26px 40px 14px;
            box-shadow:
                inset 0 2px 6px rgba(0,0,0,0.8),
                0 1px 0 rgba(255,255,255,0.07),
                0 8px 18px rgba(0,0,0,0.45);
        }
        #handheld-shell .hh-led {
            position: absolute;
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #FFD54A;
            box-shadow: 0 0 6px 2px rgba(255,213,74,0.55);
        }
        #handheld-shell .hh-led-label,
        #handheld-shell .hh-label {
            position: absolute;
            color: rgba(204,170,0,0.7);
            letter-spacing: 2px;
            line-height: 1;
            white-space: nowrap;
        }
        #handheld-shell .hh-led-label { font-size: 12px; }
        #handheld-shell .hh-logo {
            position: absolute;
            color: #FFD700;
            font-size: 20px;
            font-style: italic;
            letter-spacing: 3px;
            line-height: 1;
            white-space: nowrap;
            text-shadow: 0 0 8px rgba(255,215,0,0.25);
        }
        #handheld-shell .hh-logo span { color: #CC8800; font-style: normal; margin-left: 4px; }
        #handheld-shell .hh-well {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle at 50% 42%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.18) 100%);
            box-shadow:
                inset 0 4px 10px rgba(0,0,0,0.65),
                inset 0 -1px 0 rgba(255,255,255,0.05),
                0 1px 0 rgba(255,255,255,0.07);
        }
        #handheld-shell .hh-pause-well { border-radius: 999px; transform: rotate(-22deg); }
        #handheld-shell .hh-label { font-size: 16px; transform: translateX(-50%); }
        #handheld-shell .hh-grille {
            position: absolute;
            display: flex;
            justify-content: space-between;
            transform: rotate(-28deg);
            transform-origin: 50% 50%;
        }
        /* The menu's "i" (legal info) button: up in the gap above the screen */
        body.handheld-mode #legal-info-btn {
            top: var(--hh-info-top, 10px);
            bottom: auto;
            right: max(12px, env(safe-area-inset-right));
            width: 32px;
            height: 32px;
            font-size: 21px;
        }
        #handheld-shell .hh-grille i {
            display: block;
            width: 7px;
            height: 100%;
            border-radius: 4px;
            background: rgba(0,0,0,0.5);
            box-shadow: inset 0 2px 3px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07);
        }
    `;

    let shell = null;
    let parts = null;
    let lastHandheld = null;
    let timer = null;
    let drawnFor = null;

    function build() {
        if (shell) return true;
        const container = document.getElementById('game-container');
        if (!container) return false;

        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        shell = document.createElement('div');
        shell.id = 'handheld-shell';
        shell.hidden = true;
        shell.setAttribute('aria-hidden', 'true');
        shell.innerHTML = `
            <div class="hh-body"></div>
            <div class="hh-bezel">
                <div class="hh-led"></div>
                <div class="hh-led-label">POWER</div>
                <div class="hh-logo">LEGACY<span>+</span></div>
            </div>
            <div class="hh-well hh-stick-well"></div>
            <div class="hh-well hh-buttons-well"></div>
            <div class="hh-well hh-pause-well"></div>
            <div class="hh-label hh-pause-label">PAUSE</div>
            <div class="hh-grille"><i></i><i></i><i></i><i></i><i></i><i></i></div>`;
        // Behind the canvas (which Phaser appends later, or already has)
        container.insertBefore(shell, container.firstChild);

        const q = (sel) => shell.querySelector(sel);
        parts = {
            bezel: q('.hh-bezel'), led: q('.hh-led'), ledLabel: q('.hh-led-label'), logo: q('.hh-logo'),
            stickWell: q('.hh-stick-well'), buttonsWell: q('.hh-buttons-well'),
            pauseWell: q('.hh-pause-well'), pauseLabel: q('.hh-pause-label'), grille: q('.hh-grille')
        };
        return true;
    }

    function place(el, x, y, w, h) {
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        el.style.width = `${Math.round(w)}px`;
        el.style.height = `${Math.round(h)}px`;
    }

    function circle(el, cx, cy, r) {
        place(el, cx - r, cy - r, r * 2, r * 2);
    }

    function draw() {
        if (!build()) return;
        const size = LayoutManager.getScreenSize();
        const L = LayoutManager.getHandheldLayout(size.width, size.height);
        const hh = (window.TOUCH_CONTROLS_CONFIG && TOUCH_CONTROLS_CONFIG.handheld) || {};
        const bezelBottom = hh.bezelBottom ?? 30;

        // The dark panel across the top, with the LED + POWER at the left of the strip under
        // the screen and the logo at the right
        place(parts.bezel, L.bezel.x, L.bezel.y, L.bezel.width, L.bezel.height);
        const stripMid = L.screen.y + L.screen.height + bezelBottom / 2;
        const inset = 16 + Math.max(L.safe.left, L.safe.right);
        place(parts.led, inset, stripMid - 3.5, 7, 7);
        parts.ledLabel.style.left = `${inset + 13}px`;
        parts.ledLabel.style.top = `${Math.round(stripMid - 6)}px`;
        parts.logo.style.right = `${inset + 18}px`;
        parts.logo.style.top = `${Math.round(stripMid - 9)}px`;

        // Wells under the controls
        circle(parts.stickWell, L.stick.x, L.stick.y, L.stick.footprint + 8);
        circle(parts.buttonsWell, L.buttons.x, L.buttons.y, L.buttons.footprint + 6);
        const p = L.pause;
        place(parts.pauseWell, p.x - p.size * 0.95, p.y - p.size * 0.62, p.size * 1.9, p.size * 1.24);
        parts.pauseLabel.style.left = `${Math.round(p.x)}px`;
        parts.pauseLabel.style.top = `${Math.round(p.labelY + 6)}px`;

        // The "i" button, centred in the gap above the screen
        const gap = L.screen.y - L.safe.top;
        document.body.style.setProperty('--hh-info-top', `${Math.round(L.safe.top + Math.max(4, (gap - 32) / 2))}px`);

        // Speaker grille, if there is room for it
        if (L.grille) {
            parts.grille.style.display = '';
            place(parts.grille, L.grille.x, L.grille.y, L.grille.width, L.grille.height);
        } else {
            parts.grille.style.display = 'none';
        }
    }

    function isHandheld() {
        return !!(window.DeviceManager && window.LayoutManager && window.DeviceManager.isHandheldMode());
    }

    // The phone was turned: re-fit the canvas and every scene. refresh() alone reuses the
    // parent size measured before the turn, so re-measure first. Phones keep reporting
    // in-between sizes for a moment after rotating, so do it again once things settle.
    function onTurned() {
        const game = window.__legacyGameInstance;
        if (!game || !game.scale) return;
        const refit = () => {
            game.scale.getParentBounds();
            game.scale.refresh();
            const gameScene = game.scene.getScene('GameScene');
            if (gameScene && gameScene.touchControlsOverlay) gameScene.touchControlsOverlay.relayout();
            drawnFor = null; // redraw the shell for the settled size
            check();
        };
        [0, 250, 700].forEach(ms => setTimeout(refit, ms));

        // Keys and touches held while the phone was turned never got their release events
        const gameScene = game.scene.getScene('GameScene');
        if (gameScene && (gameScene.sys.isActive() || gameScene.sys.isPaused())) {
            if (gameScene.input && gameScene.input.keyboard) gameScene.input.keyboard.resetKeys();
            if (gameScene.touchControlsOverlay) gameScene.touchControlsOverlay.releaseAll();
        }
    }

    function check() {
        const handheld = isHandheld();
        if (handheld) {
            // Only redraw when the screen size changed (this also runs on a slow poll)
            const size = LayoutManager.getScreenSize();
            const key = `${size.width}x${size.height}`;
            if (key !== drawnFor) {
                drawnFor = key;
                draw();
            }
        }
        if (shell) shell.hidden = !handheld;
        document.body.classList.toggle('handheld-mode', handheld);
        if (lastHandheld !== null && handheld !== lastHandheld) {
            console.log(`📱 HandheldShell: ${handheld ? 'upright - handheld layout' : 'landscape layout'}`);
            onTurned();
        }
        lastHandheld = handheld;
    }

    function scheduleCheck() {
        clearTimeout(timer);
        timer = setTimeout(check, 150);
    }
    window.addEventListener('resize', scheduleCheck);
    window.addEventListener('orientationchange', scheduleCheck);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleCheck);
    // Orientation events are unreliable across mobile browsers: a slow poll as a backstop
    setInterval(check, 500);

    window.HandheldShell = { check, draw };
})();
