/**
 * LayoutManager
 * Handles calculating the game viewport to maintain a fixed aspect ratio
 * within a responsive full-screen canvas.
 */

const LayoutManager = {
    /**
     * Calculate the viewport for the game camera to maintain aspect ratio.
     * 
     * @param {number} windowWidth - Current window/canvas width
     * @param {number} windowHeight - Current window/canvas height
     * @param {number} targetWidth - The virtual width of the game (e.g. 1200)
     * @param {number} targetHeight - The virtual height of the game (e.g. 720)
     * @returns {object} { x, y, width, height, zoom } - Viewport rect and zoom level
     */
    calculateGameViewport(windowWidth, windowHeight, targetWidth, targetHeight) {
        // Check for Visual Viewport API (better for mobile with virtual keyboards/bars)
        // Prefer the larger of inner* and visualViewport to avoid toolbar-induced shrink
        // Chrome iOS sometimes reports a very small visualViewport height while toolbars animate.
        const vv = window.visualViewport;
        const availableWidth = vv ? Math.max(windowWidth, vv.width) : windowWidth;
        const availableHeight = vv ? Math.max(windowHeight, vv.height) : windowHeight;

        // Phone held upright: the game is the screen of a handheld console, at the top
        if (window.DeviceManager && window.DeviceManager.isHandheldMode()) {
            const screen = this.getHandheldLayout(availableWidth, availableHeight, targetWidth, targetHeight).screen;
            return { x: screen.x, y: screen.y, width: screen.width, height: screen.height, scale: screen.scale };
        }

        // Calculate how much we need to scale to fit the target dimensions
        const scaleX = availableWidth / targetWidth;
        const scaleY = availableHeight / targetHeight;
        
        // Use the smaller scale factor to ensure the entire world fits (letterbox/pillarbox)
        const scale = Math.min(scaleX, scaleY);
        
        // The viewport size in SCREEN PIXELS (how big the game appears on screen)
        const viewportWidth = Math.round(targetWidth * scale);
        const viewportHeight = Math.round(targetHeight * scale);
        
        // Center the viewport in the available space
        let x = Math.round((availableWidth - viewportWidth) / 2);
        let y = Math.round((availableHeight - viewportHeight) / 2);
        
        return {
            x,
            y,
            width: viewportWidth,
            height: viewportHeight,
            scale: scale
        };
    },

    /** Screen size used for layout: the larger of inner* and visualViewport (see above). */
    getScreenSize() {
        const vv = window.visualViewport;
        return {
            width: Math.max(window.innerWidth, vv ? vv.width : 0),
            height: Math.max(window.innerHeight, vv ? vv.height : 0)
        };
    },

    /** The device's safe-area insets (notch, home indicator) in CSS px, read through a probe. */
    getSafeAreaInsets() {
        let probe = document.getElementById('safe-area-probe');
        if (!probe) {
            probe = document.createElement('div');
            probe.id = 'safe-area-probe';
            probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
                'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
            document.body.appendChild(probe);
        }
        const cs = getComputedStyle(probe);
        return {
            top: parseFloat(cs.paddingTop) || 0,
            right: parseFloat(cs.paddingRight) || 0,
            bottom: parseFloat(cs.paddingBottom) || 0,
            left: parseFloat(cs.paddingLeft) || 0
        };
    },

    /**
     * HANDHELD MODE (phone held upright): where everything goes, in screen (CSS) pixels.
     * The single source of truth for the game viewport (calculateGameViewport), the console
     * shell drawn behind the canvas (src/ui/handheld-shell.js) and the touch controls
     * (TouchControlsOverlay.relayout). Sizes are picked so that nothing overlaps.
     *
     * Returns { screenW, screenH, bezel, screen, controls, scale (control size multiplier),
     *           stick: {x, y, radius, footprint}, buttons: {x, y, size, spacing, footprint},
     *           pause: {x, y, size, labelY}, grille: {x, y, width, height} | null }
     */
    getHandheldLayout(screenW, screenH, targetWidth = 1200, targetHeight = 720) {
        const tc = window.TOUCH_CONTROLS_CONFIG || {};
        const hh = tc.handheld || {};
        const joy = tc.joystick || {};
        const btn = tc.buttons || {};
        const safe = this.getSafeAreaInsets();

        const margin = hh.bodyMargin ?? 12;
        const bezelBottom = hh.bezelBottom ?? 26;
        const side = (hh.sidePadding ?? 16) + Math.max(safe.left, safe.right);
        const middleGap = hh.middleGap ?? 24;

        // The game screen: edge to edge across the top (below the notch), as big as the
        // 1200x720 shape allows; capped in height on wide portrait screens (tablets)
        let gameW = screenW - safe.left - safe.right;
        let gameH = gameW * (targetHeight / targetWidth);
        const maxGameH = screenH * (hh.maxScreenHeight ?? 0.52);
        if (gameH > maxGameH) {
            gameH = maxGameH;
            gameW = gameH * (targetWidth / targetHeight);
        }
        gameW = Math.round(gameW);
        gameH = Math.round(gameH);
        const gameX = Math.round((screenW - gameW) / 2);
        const gameY = Math.round(safe.top + screenH * (hh.topGap ?? 0.07));
        const screen = { x: gameX, y: gameY, width: gameW, height: gameH, scale: gameW / targetWidth };
        // The dark glass panel: the whole top of the console, down to a strip under the
        // screen that holds the power LED and the logo
        const bezel = { x: 0, y: 0, width: screenW, height: gameY + gameH + bezelBottom };

        // The controls area: under the bezel down to the bottom of the body
        const areaTop = bezel.y + bezel.height + margin;
        const areaBottom = screenH - margin - safe.bottom;
        const controls = { x: 0, y: areaTop, width: screenW, height: Math.max(0, areaBottom - areaTop) };

        // Footprints at scale 1 (radius of everything a control draws, glow included)
        const baseR = joy.baseRadius ?? 72;
        const stickFoot1 = baseR + (joy.outerRingRadiusOffset ?? 14) + 4;
        const size1 = (btn.size ?? 90) * (hh.buttonSize ?? 1); // buttons a little smaller than landscape
        const spacingMul = hh.buttonSpacing ?? 0.9;
        const diamondFoot1 = size1 * spacingMul + size1 / 2 + 10; // + the button glow
        const pause1 = hh.pauseSize ?? 44;
        const labelH = 18, pauseGap = 18;

        // Biggest scale that fits side by side, and stacked above the pause button
        const fitW = (screenW - side * 2 - middleGap) / (2 * stickFoot1 + 2 * diamondFoot1);
        const fitH = (controls.height - labelH) / (2 * Math.max(stickFoot1, diamondFoot1) + pauseGap + pause1);
        const minTouch = tc.minTouchTarget || 44;
        const minScale = minTouch / size1;
        const scale = Math.max(minScale, Math.min(fitW, fitH, hh.maxScale ?? 1.25));

        const stickFoot = stickFoot1 * scale;
        const diamondFoot = diamondFoot1 * scale;
        const clusterR = Math.max(stickFoot, diamondFoot);
        const pauseSize = Math.max(pause1 * scale, 36);

        // The whole group (clusters + pause) in the controls area, low (a thumb's reach)
        const groupH = clusterR * 2 + pauseGap + pauseSize + labelH;
        const groupTop = controls.y + Math.max(0, (controls.height - groupH) * (hh.controlsBias ?? 0.65));
        const rowY = groupTop + clusterR;

        const stick = { x: side + stickFoot, y: rowY, radius: baseR * scale, footprint: stickFoot };
        const buttonSize = size1 * scale;
        const buttons = {
            x: screenW - side - diamondFoot,
            y: rowY,
            size: buttonSize,
            spacing: buttonSize * spacingMul,
            footprint: diamondFoot
        };
        const pauseY = rowY + clusterR + pauseGap + pauseSize / 2;
        const pause = { x: screenW / 2, y: pauseY, size: pauseSize, labelY: pauseY + pauseSize / 2 + 4 };

        // Speaker grille: bottom right, under the buttons, when there is room for it
        let grille = null;
        const grilleTop = rowY + clusterR + 20;
        const grilleH = areaBottom - grilleTop - 10;
        const grilleLeft = pause.x + pauseSize + 24; // clear of the PAUSE pill
        if (grilleH >= 50) {
            const h = Math.min(grilleH, 110);
            const w = Math.min(h * 1.1, screenW - side - grilleLeft);
            if (w >= 50) grille = { x: screenW - side - w, y: areaBottom - 10 - h, width: w, height: h };
        }

        const layout = { screenW, screenH, safe, bezel, screen, controls, scale, stick, buttons, pause, grille };
        if (window.DEBUG_MODE) this.warnOnOverlap(layout);
        return layout;
    },

    // Debug check: no two touch controls may overlap
    warnOnOverlap(layout) {
        const b = layout.buttons;
        const r = b.size / 2;
        const circles = [
            ['stick', layout.stick.x, layout.stick.y, layout.stick.footprint],
            ['jump', b.x, b.y - b.spacing, r],
            ['attack', b.x, b.y + b.spacing, r],
            ['switch', b.x - b.spacing, b.y, r],
            ['throw', b.x + b.spacing, b.y, r],
            ['pause', layout.pause.x, layout.pause.y, layout.pause.size / 2]
        ];
        for (let i = 0; i < circles.length; i++) {
            for (let j = i + 1; j < circles.length; j++) {
                const [n1, x1, y1, r1] = circles[i];
                const [n2, x2, y2, r2] = circles[j];
                if (Math.hypot(x1 - x2, y1 - y2) < r1 + r2) {
                    console.warn(`📏 Handheld layout: ${n1} overlaps ${n2}`);
                }
            }
        }
    },

    /**
     * Apply the calculated viewport to a scene's main camera.
     * 
     * @param {Phaser.Scene} scene - The scene to update
     * @param {number} targetWidth - Virtual width
     * @param {number} targetHeight - Virtual height
     */
    applyToScene(scene, targetWidth, targetHeight) {
        if (!scene || !scene.cameras || !scene.cameras.main) {
            console.warn('📏 LayoutManager: Scene camera not ready, skipping layout.');
            return {
                x: 0,
                y: 0,
                width: targetWidth,
                height: targetHeight,
                scale: 1
            };
        }
        
        const camera = scene.cameras.main;
        const scaleWidth = scene.scale ? scene.scale.width : targetWidth;
        const scaleHeight = scene.scale ? scene.scale.height : targetHeight;
        
        // Always use window dimensions for calculation (more reliable than scale manager)
        // Use the larger of inner* vs visualViewport to avoid transient shrinking (Chrome iOS bars).
        const calcWidth = Math.max(window.innerWidth, window.visualViewport?.width || 0);
        const calcHeight = Math.max(window.innerHeight, window.visualViewport?.height || 0);
        
        const viewport = this.calculateGameViewport(calcWidth, calcHeight, targetWidth, targetHeight);

        // Skip re-apply if nothing changed to avoid resize loops. Kept on the camera, not the
        // scene: Phaser makes a fresh camera each time a scene restarts, and with the
        // signature on the (reused) scene object a revisited menu kept the new camera
        // unconfigured - drawn at zoom 1 from the top-left, far too big on a phone.
        const signature = `${viewport.x},${viewport.y},${viewport.width},${viewport.height},${viewport.scale.toFixed(4)}`;
        if (camera._lastLayoutSignature === signature) {
            return viewport;
        }
        camera._lastLayoutSignature = signature;

        // Extra diagnostics to compare platforms
        const vv = window.visualViewport;
        const canvas = scene.game && scene.game.canvas;
        console.log('📏 Layout diagnostics:', {
            window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
            visualViewport: vv ? { width: vv.width, height: vv.height, offsetTop: vv.offsetTop, offsetLeft: vv.offsetLeft, scale: vv.scale } : null,
            devicePixelRatio: window.devicePixelRatio,
            calcWidth,
            calcHeight,
            scaleManager: scene.scale ? { width: scene.scale.width, height: scene.scale.height } : null,
            canvas: canvas ? { width: canvas.width, height: canvas.height } : null
        });
        
        // Check if event system has camera locked (should not modify during events)
        const eventCameraLocked = scene.eventCameraLocked || false;
        if (eventCameraLocked) {
            console.warn(`📏 [LAYOUT] ⚠️ LayoutManager.applyToScene called while eventCameraLocked=true!`);
            console.warn(`📏 [LAYOUT] ⚠️ This may interfere with event camera positioning!`);
            console.trace('📏 [LAYOUT] Call stack:');
        }
        
        const oldZoom = camera.zoom;
        const oldScrollX = camera.scrollX;
        const oldScrollY = camera.scrollY;
        const oldBounds = camera.getBounds();
        
        // Apply the scale as zoom so that targetWidth x targetHeight fits in the viewport
        camera.setZoom(viewport.scale);
        
        // Set camera bounds to match the virtual world size
        camera.setBounds(0, 0, targetWidth, targetHeight);
        
        // The canvas is transparent (game.js) so the page backdrop shows beside the game view:
        // fill THIS view with opaque black, as the canvas clear colour used to. Scenes that set
        // their own background colour keep it (they run after this), and the HUD scene opts out
        // with transparentCamera because it is drawn on top of the game.
        if (!scene.transparentCamera && camera.transparent) {
            camera.setBackgroundColor('#000000');
        }
        
        // Set viewport to the calculated centered rectangle (in screen pixels)
        camera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        
        // Center the camera on the middle of the virtual world
        // BUT skip this if camera is locked by event system (during pans, etc.)
        // to prevent interrupting camera animations on mobile resize events
        if (!eventCameraLocked) {
            camera.centerOn(targetWidth / 2, targetHeight / 2);
        }
        
        // Log if significant changes occurred
        if (eventCameraLocked) {
            const newScrollX = camera.scrollX;
            const newScrollY = camera.scrollY;
            const newZoom = camera.zoom;
            const newBounds = camera.getBounds();
            
            if (Math.abs(oldScrollX - newScrollX) > 0.1 || Math.abs(oldScrollY - newScrollY) > 0.1) {
                console.warn(`📏 [LAYOUT] ⚠️ Scroll changed during event: (${oldScrollX.toFixed(1)}, ${oldScrollY.toFixed(1)}) → (${newScrollX.toFixed(1)}, ${newScrollY.toFixed(1)})`);
            }
            if (Math.abs(oldZoom - newZoom) > 0.001) {
                console.warn(`📏 [LAYOUT] ⚠️ Zoom changed during event: ${oldZoom.toFixed(3)} → ${newZoom.toFixed(3)}`);
            }
            if (oldBounds.width !== newBounds.width) {
                console.warn(`📏 [LAYOUT] ⚠️ Bounds changed during event: ${oldBounds.width.toFixed(1)} → ${newBounds.width.toFixed(1)}`);
            }
        }
        
        console.log(`📏 Layout updated: Viewport ${viewport.width}x${viewport.height} at (${viewport.x}, ${viewport.y}), Zoom: ${viewport.scale.toFixed(2)}`);
        
        return viewport;
    },

    /**
     * Where the title card and the column under/next to it go, in virtual coordinates.
     * Shared by the loading screen (AudioBootScene) and MainMenuScene so the logo stays
     * put when one hands over to the other.
     * Desktop: logo top-centre, column (buttons / loading bar) below it.
     * Phone: a bigger logo on the left half, the column on the right - there isn't the
     * height to stack a bigger logo over bigger buttons.
     */
    getTitleLayout(virtualWidth, virtualHeight) {
        if (window.DeviceManager && window.DeviceManager.isPhone()) {
            return {
                phone: true,
                logo: { x: 320, y: virtualHeight / 2, maxWidth: 580, maxHeight: 620 },
                column: { x: 905, y: virtualHeight / 2 }
            };
        }
        return {
            phone: false,
            logo: { x: virtualWidth / 2, y: virtualHeight / 2 - 150, maxWidth: virtualWidth * 0.7, maxHeight: virtualHeight * 0.4 },
            column: { x: virtualWidth / 2, y: virtualHeight / 2 + 50 }
        };
    },

    /** Place and scale a title card image into a getTitleLayout() logo box. */
    fitTitleCard(image, logo) {
        const scale = Math.min(logo.maxWidth / image.width, logo.maxHeight / image.height, 2);
        image.setPosition(logo.x, logo.y).setOrigin(0.5).setScale(scale);
        return image;
    }
};

// Export for global usage
if (typeof window !== 'undefined') {
    window.LayoutManager = LayoutManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutManager;
}
