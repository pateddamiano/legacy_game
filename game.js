// ========================================
// GAME ENTRY POINT
// ========================================
// This file initializes Phaser and starts the game with the new scene flow

// ========================================
// DEBUG MODE DETECTION
// ========================================
const urlParams = new URLSearchParams(window.location.search);
window.DEBUG_MODE = urlParams.get('debug') === 'true' || urlParams.get('test') === 'true';
window.TEST_LEVEL_ID = urlParams.get('level') ? parseInt(urlParams.get('level'), 10) : null;
window.DIRECT_LEVEL_LOAD = window.DEBUG_MODE && window.TEST_LEVEL_ID;

// Debug logging
console.log('🔍 URL Parameters:', {
    debug: urlParams.get('debug'),
    test: urlParams.get('test'),
    level: urlParams.get('level'),
    allParams: Object.fromEntries(urlParams)
});

if (window.DEBUG_MODE) {
    console.log('%c🧪 DEBUG MODE ENABLED', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    console.log('Debug mode:', window.DEBUG_MODE);
    console.log('Test level ID:', window.TEST_LEVEL_ID);
    console.log('Direct level load:', window.DIRECT_LEVEL_LOAD);
    console.log('Full URL:', window.location.href);
} else {
    console.log('🧪 Debug mode: OFF');
}

// ========================================
// ERROR VISIBILITY + FRAME LOOP WATCHDOG
// ========================================
// Phaser's frame loop requests the next frame AFTER running the current one, so a
// single uncaught exception inside a frame kills the loop for good and the game
// freezes on whatever was last drawn - usually a black fade. Two things here:
//   1. every uncaught error / rejection is shown on screen (plain DOM, so it works
//      even when Phaser is dead), instead of only in a console nobody has open
//   2. if the frame loop stops advancing after an error, it is restarted
(() => {
    const seen = [];
    function banner() {
        let el = document.getElementById('game-error-banner');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'game-error-banner';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;margin:0;padding:10px 44px 10px 14px;' +
            'background:rgba(120,0,0,0.94);color:#fff;font:13px/1.4 monospace;white-space:pre-wrap;' +
            'max-height:45vh;overflow:auto;border-bottom:3px solid #f55;user-select:text;cursor:text';
        const close = document.createElement('button');
        close.textContent = '✕';
        close.title = 'Dismiss';
        close.style.cssText = 'position:absolute;top:6px;right:8px;background:#f55;color:#fff;border:0;' +
            'border-radius:4px;font:bold 14px/1 monospace;padding:4px 8px;cursor:pointer';
        close.addEventListener('click', () => el.remove());
        const text = document.createElement('pre');
        text.id = 'game-error-banner-text';
        text.style.cssText = 'margin:0;font:inherit;white-space:pre-wrap';
        el.appendChild(close);
        el.appendChild(text);
        // Inside the fullscreen target, or it is invisible while the game is fullscreen
        (document.getElementById('game-container') || document.body).appendChild(el);
        return el;
    }
    // Renders one error as: "Name: message", then "at file:line:col", then stack frames.
    // Safari's err.stack has no message line and Chrome's does, so both are normalised
    // here - otherwise on a phone the banner showed only this handler's own frame.
    function describeError(err, loc) {
        const isObj = err && typeof err === 'object';
        const name = (isObj && err.name) || 'Error';
        const message = isObj ? (err.message || String(err)) : String(err);
        const origin = window.location.origin + '/';
        let frames = (isObj && typeof err.stack === 'string') ? err.stack.split('\n') : [];
        if (frames.length && frames[0].indexOf(message) !== -1) frames = frames.slice(1); // Chrome repeats the message
        frames = frames.map(f => f.trim().split(origin).join('')).filter(Boolean).slice(0, 6);
        const lines = [`${name}: ${message}`];
        if (loc && loc.filename) {
            lines.push(`at ${String(loc.filename).split(origin).join('')}:${loc.lineno}:${loc.colno}`);
        }
        return lines.concat(frames);
    }
    window.__showGameError = function (title, err, loc) {
        const line = `[${new Date().toLocaleTimeString()}] ${title}\n    ${describeError(err, loc).join('\n    ')}`;
        seen.push(line);
        console.error('🛑', title, err);
        try {
            banner();
            document.getElementById('game-error-banner-text').textContent =
                'GAME ERROR - select to copy, ✕ to dismiss\n\n' + seen.slice(-4).join('\n\n');
        } catch (e) {}
        // Ship it to the remote log server (remote-logging-config.js) so it can be read
        // from the desktop even when nobody copies it off the phone
        try {
            if (typeof window.remoteLog === 'function') window.remoteLog('[GAME ERROR]', line);
        } catch (e) {}
        // And to the dev server, for servers that accept it
        try {
            fetch('/__error', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: line, keepalive: true }).catch(() => {});
        } catch (e) {}
    };
    
    let loopRestarts = 0;
    function ensureLoopAlive() {
        const game = window.__legacyGameInstance;
        if (!game || !game.loop || !game.loop.running) return;
        const frame = game.loop.frame;
        setTimeout(() => {
            if (!game.loop.running || game.loop.frame !== frame) return; // still ticking
            if (++loopRestarts > 10) return;
            console.error('💀 Frame loop died after an uncaught exception - restarting it');
            try {
                game.loop.raf.stop();
                game.loop.raf.start(game.loop.step.bind(game.loop), game.loop.forceSetTimeOut, 0);
            } catch (e) {
                console.error('Could not restart the frame loop:', e);
            }
        }, 300);
    }
    // Errors thrown by scripts the browser itself injects into the page (crypto wallet
    // providers like window.ethereum from Brave / MetaMask / Coinbase Wallet browsers,
    // extensions, in-app browsers) arrive here too. They are reported against the page
    // URL at line 1, or with no filename at all, and they say nothing about the game -
    // so log them but keep them off the banner.
    function isInjectedScriptError(e) {
        const msg = String(e.message || '');
        if (/window\.ethereum|selectedAddress|solana|tronWeb|__CHROME_EXT|extension:\/\//i.test(msg)) return true;
        if (!e.filename) return true;                                   // cross-origin "Script error."
        const pageUrl = window.location.href.split('#')[0];
        return e.filename === pageUrl && e.lineno <= 1;                 // page:1 = injected, not index.html
    }
    window.addEventListener('error', (e) => {
        if (isInjectedScriptError(e)) {
            console.warn('⚠️ Ignoring error from a browser-injected script (not the game):', e.message, '@', e.filename + ':' + e.lineno);
            return;
        }
        const loc = { filename: e.filename, lineno: e.lineno, colno: e.colno };
        window.__showGameError('Uncaught error', e.error || new Error(e.message || 'Script error (no details from the browser)'), loc);
        ensureLoopAlive();
    });
    window.addEventListener('unhandledrejection', (e) => {
        window.__showGameError('Unhandled promise rejection', e.reason);
        ensureLoopAlive();
    });
})();

(() => {
    let gameInstance = null;
    
    function bootPhaserGame() {
        if (gameInstance) {
            console.warn('🎮 Game already started, ignoring duplicate start request.');
            return gameInstance;
        }
        
        // Game configuration
        const config = {
            type: Phaser.AUTO,
            scale: {
                mode: Phaser.Scale.RESIZE,
                parent: 'game-container',
                width: '100%',
                height: '100%',
                autoCenter: Phaser.Scale.NO_CENTER,
                fullscreenTarget: 'game-container' // Enable fullscreen on the game container
            },
            parent: 'game-container',
            backgroundColor: '#000000', // Black background for letterboxing
            input: {
                activePointers: 10, // Enable multi-touch (up to 10 simultaneous touches)
                touch: true,
                mouse: true
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: [
                AudioBootScene,
                MainMenuScene,
                IntroDialogueScene,
                CutsceneScene,
                UIScene,
                TouchControlsScene,
                PauseScene,
                GameScene
            ]
        };
        
        console.log('🎮 ===== STARTING PHASER GAME =====');
        console.log('🎮 Config:', config);
        console.log('🎮 Available scenes:', config.scene.map(s => s.name || s.key || 'Unknown'));
        
        gameInstance = new Phaser.Game(config);
        window.__legacyGameInstance = gameInstance; // for the frame-loop watchdog above
        
        if (window.DeviceManager) {
            window.DeviceManager.initialize(gameInstance);
        }
        
        if (window.FullscreenManager) {
            window.FullscreenManager.initialize(gameInstance);
        }
        
        console.log('🎮 ✅ Phaser Game instance created successfully');
        console.log('🎮 Game object:', gameInstance);
        console.log('🚀 Legacy Game started with new scene architecture!');
        
        return gameInstance;
    }
    
    window.startLegacyGame = function startLegacyGame() {
        return bootPhaserGame();
    };
})();
