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
        el = document.createElement('pre');
        el.id = 'game-error-banner';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;margin:0;padding:10px 14px;' +
            'background:rgba(120,0,0,0.92);color:#fff;font:13px/1.4 monospace;white-space:pre-wrap;' +
            'max-height:45vh;overflow:auto;border-bottom:3px solid #f55;cursor:pointer';
        el.title = 'Click to dismiss';
        el.addEventListener('click', () => el.remove());
        document.body.appendChild(el);
        return el;
    }
    window.__showGameError = function (title, err) {
        const stack = err && err.stack ? err.stack.split('\n').slice(0, 5).join('\n    ') : String(err);
        const line = `[${new Date().toLocaleTimeString()}] ${title}\n    ${stack}`;
        seen.push(line);
        console.error('🛑', title, err);
        try { banner().textContent = 'GAME ERROR (click to dismiss)\n\n' + seen.slice(-4).join('\n\n'); } catch (e) {}
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
    window.addEventListener('error', (e) => {
        window.__showGameError('Uncaught error', e.error || new Error(e.message + ' @ ' + e.filename + ':' + e.lineno));
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
