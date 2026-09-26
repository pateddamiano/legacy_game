// ========================================
// PERF PROBE (opt-in, zero cost unless asked for)
// ========================================
// Open the game with ?perf=1 (or ?perf=2 to also time every manager method) and it sends a
// one-line summary every few seconds to the remote log server (remote-logging-config.js),
// so a phone's real performance can be read from the desktop. Without the URL parameter
// this file does nothing at all.
//
//   ?perf=1   frame times, draw calls, console-log volume, object counts, memory
//   ?perf=2   the above plus the most expensive methods (small overhead of its own)
//   ?perf=auto  one-link experiment: once you are in a fight it cycles through switching one
//               thing off at a time (5s each: HUD, background, enemies, and the touch controls'
//               glows / shadows / icons / recharge ring - never the controls themselves, so
//               you can keep playing) and sends a summary comparing them. Just keep fighting.
//
// Experiments (add to the URL to switch one thing off and compare the numbers):
//   &nofx=1     remove the full-screen post effect(s) from the game camera (the low-health vignette)
//   &nohud=1    hide the HUD scene (health bars, score, weapon icon)
//   &notouch=1  hide the on-screen touch controls
//
// Lines start with [PERF].
(function () {
    const rawPerf = new URLSearchParams(location.search).get('perf') || '0';
    const AUTO = rawPerf === 'auto';
    const level = AUTO ? 1 : parseInt(rawPerf, 10);
    if (!level) return;

    const send = (...parts) => { try { if (window.remoteLog) window.remoteLog('[PERF]', ...parts); } catch (e) {} };
    const R = { logCount: 0, logMs: 0, draw: 0, longTasks: 0, longTaskMs: 0, upd: 0, rend: 0, frames: 0, worst: 0, methods: {} };
    window.__perfProbe = R;

    // console volume: how many console.log calls the game makes, and what they cost
    ['log', 'info', 'debug'].forEach(k => {
        const o = console[k].bind(console);
        console[k] = function (...a) { const t = performance.now(); o(...a); R.logMs += performance.now() - t; R.logCount++; };
    });

    // draw calls (each is a GPU batch; many small ones is what makes UI-heavy scenes slow)
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(C => {
        if (!C) return;
        ['drawElements', 'drawArrays'].forEach(fn => {
            const o = C.prototype[fn]; C.prototype[fn] = function () { R.draw++; return o.apply(this, arguments); };
        });
    });

    try {
        new PerformanceObserver(list => list.getEntries().forEach(e => { R.longTasks++; R.longTaskMs += e.duration; }))
            .observe({ entryTypes: ['longtask'] });
    } catch (e) { /* not supported (e.g. iOS Safari) */ }

    function wrapProto(label, proto) {
        if (!proto) return;
        Object.getOwnPropertyNames(proto).forEach(name => {
            if (name === 'constructor') return;
            const d = Object.getOwnPropertyDescriptor(proto, name);
            if (!d || typeof d.value !== 'function' || d.value.__perfWrapped) return;
            const orig = d.value, key = label + '.' + name;
            const w = function () {
                const t = performance.now();
                try { return orig.apply(this, arguments); }
                finally { const m = R.methods[key] || (R.methods[key] = { ms: 0, calls: 0 }); m.ms += performance.now() - t; m.calls++; }
            };
            w.__perfWrapped = true; proto[name] = w;
        });
    }
    function wrapObject(label, obj) {
        let proto = Object.getPrototypeOf(obj), depth = 0;
        while (proto && proto !== Object.prototype && depth < 3) { wrapProto(label, proto); proto = Object.getPrototypeOf(proto); depth++; }
    }

    function textureReport(game) {
        const rows = []; let total = 0;
        Object.keys(game.textures.list).forEach(k => {
            const t = game.textures.list[k]; const s = t.source && t.source[0];
            if (!s || !s.width) return;
            const mb = s.width * s.height * 4 / 1048576; total += mb; rows.push([k, s.width, s.height, mb]);
        });
        rows.sort((a, b) => b[3] - a[3]);
        return `${rows.length} textures, ~${Math.round(total)}MB decoded; biggest: ` +
            rows.slice(0, 6).map(r => `${r[0]} ${r[1]}x${r[2]}=${Math.round(r[3])}MB`).join(', ');
    }

    function start(game) {
        const gl = game.renderer && game.renderer.gl;
        send('INIT', `ua=${navigator.userAgent.slice(0, 90)}`, `screen=${innerWidth}x${innerHeight}`, `dpr=${devicePixelRatio}`,
            `canvas=${game.canvas.width}x${game.canvas.height}`, `renderer=${game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS'}`,
            gl ? `maxTex=${gl.getParameter(gl.MAX_TEXTURE_SIZE)}` : '');
        send('TEXTURES', textureReport(game));

        const ev = Phaser.Core.Events; let tStep = 0, tRender = 0;
        game.events.on(ev.PRE_STEP, () => { tStep = performance.now(); });
        game.events.on(ev.POST_STEP, () => { const d = performance.now() - tStep; R.upd += d; if (d > R.worst) R.worst = d; });
        game.events.on(ev.PRE_RENDER, () => { tRender = performance.now(); });
        game.events.on(ev.POST_RENDER, () => { R.rend += performance.now() - tRender; R.frames++; });

        // Per-scene render time (CPU side): which scene's drawing is expensive?
        R.sceneRender = {};
        const hookScene = (sc) => {
            if (!sc || sc.__perfHooked) return;
            sc.__perfHooked = true;
            let t0 = 0;
            sc.events.on('prerender', () => { t0 = performance.now(); });
            sc.events.on('render', () => { R.sceneRender[sc.sys.settings.key] = (R.sceneRender[sc.sys.settings.key] || 0) + (performance.now() - t0); });
        };
        const flags = new URLSearchParams(location.search);

        // ---- ?perf=auto: run the A/B experiments on the player's own fight ----
        const PHASES = [['BASE', {}], ['NOHUD', { hud: 1 }], ['NOBG', { bg: 1 }], ['NOENEMY', { enemy: 1 }],
            ['NOGLOW', { glow: 1 }], ['NOSHADOW', { shadow: 1 }], ['NOICONS', { icons: 1 }], ['NORING', { ring: 1 }],
            ['BASE2', {}]];
        const PHASE_SECS = 5, SETTLE = 2;                // seconds per phase; seconds ignored while it settles
        const auto = { started: false, done: false, idx: -1, t: 0, stats: {}, inGameTicks: 0 };
        const hiddenBg = new Set(), hiddenEnemies = new Set(), hiddenTouch = new Map();
        let vignetteRemoved = false;
        let sec = { frames: 0, rend: 0, upd: 0, draw: 0 };

        function restoreAll(gs) {
            const ui = game.scene.getScene('UIScene'), tc = game.scene.getScene('TouchControlsScene');
            if (ui) ui.sys.setVisible(true);
            if (tc) tc.sys.setVisible(true);
            if (vignetteRemoved && gs.effectSystem && gs.cameras.main.postFX) {
                gs.effectSystem._vignette = gs.cameras.main.postFX.addVignette(0.5, 0.5, 1, 0);
            }
            vignetteRemoved = false;
            hiddenTouch.forEach((wasVisible, o) => { if (o.active) o.setVisible(wasVisible); }); hiddenTouch.clear();
            hiddenBg.forEach(o => { if (o.active) o.setVisible(true); }); hiddenBg.clear();
            hiddenEnemies.forEach(o => { if (o.active) o.setVisible(true); }); hiddenEnemies.clear();
        }
        function applySpec(gs, spec) {                    // called every second: new objects appear as you play
            const cam = gs.cameras.main;
            if (spec.fx && cam.postFX && cam.postFX.list.length) { cam.postFX.clear(); vignetteRemoved = true; }
            if (spec.hud) { const ui = game.scene.getScene('UIScene'); if (ui) ui.sys.setVisible(false); }
            // Touch-control decorations only (the tappable circles stay, so you can keep playing)
            const ov = gs.touchControlsOverlay;
            if (ov && ov.visible && (spec.glow || spec.shadow || spec.icons || spec.ring)) {
                const hide = (o) => { if (o && o.active && o.visible) { hiddenTouch.set(o, true); o.setVisible(false); } };
                const btns = Object.values(ov.buttons || {});
                if (spec.glow) { btns.forEach(b => b && hide(b.glow)); if (ov.joystick) hide(ov.joystick.outerGlow); }
                if (spec.shadow) btns.forEach(b => b && hide(b.depthLayer));
                if (spec.icons) btns.forEach(b => b && hide(b.labelText));
                if (spec.ring) { btns.forEach(b => b && hide(b.cooldownRing)); if (ov.joystick) { hide(ov.joystick.outerRing); hide(ov.joystick.knobPlus); } }
            }
            if (spec.bg) gs.children.list.forEach(o => { if (o.visible && o.type !== 'Container' && o.displayWidth > 700) { o.setVisible(false); hiddenBg.add(o); } });
            if (spec.enemy) (gs.enemies || []).forEach(e => { const sp = e.sprite; if (sp && sp.visible) { sp.setVisible(false); hiddenEnemies.add(sp); } });
        }
        function autoSummary(reason) {
            const line = PHASES.map(([name]) => {
                const st = auto.stats[name]; if (!st || !st.n) return name + ' (no data)';
                return `${name} fps=${(st.fps / st.n).toFixed(0)} render=${(st.rend / st.n).toFixed(1)}ms update=${(st.upd / st.n).toFixed(1)}ms draws=${(st.draw / st.n).toFixed(0)} enemies=${(st.enemies / st.n).toFixed(1)}`;
            }).join(' | ');
            send('AUTO-SUMMARY', reason, line);
        }
        function autoTick(gs, inGame, fps) {
            if (auto.done) return;
            const f = Math.max(1, R.frames - sec.frames);
            const cur = { rend: (R.rend - sec.rend) / f, upd: (R.upd - sec.upd) / f, draw: (R.draw - sec.draw) / f };
            sec = { frames: R.frames, rend: R.rend, upd: R.upd, draw: R.draw };
            
            if (!auto.started) {
                auto.inGameTicks = inGame ? auto.inGameTicks + 1 : 0;
                if (inGame && auto.inGameTicks >= 8 && (gs.enemies || []).length >= 2) {
                    auto.started = true; auto.idx = 0; auto.t = 0;
                    send('AUTO-START', `${PHASES.length} phases x ${PHASE_SECS}s - keep fighting, moving right`);
                    send('PHASE', PHASES[0][0]);
                }
                return;
            }
            if (!inGame) { restoreAll(gs || {}); auto.done = true; autoSummary('aborted (left the game scene)'); return; }
            
            const name = PHASES[auto.idx][0];
            applySpec(gs, PHASES[auto.idx][1]);
            if (auto.t >= SETTLE) {
                const st = auto.stats[name] || (auto.stats[name] = { n: 0, fps: 0, rend: 0, upd: 0, draw: 0, enemies: 0 });
                st.n++; st.fps += fps; st.rend += cur.rend; st.upd += cur.upd; st.draw += cur.draw; st.enemies += (gs.enemies || []).length;
            }
            auto.t++;
            if (auto.t >= PHASE_SECS) {
                restoreAll(gs);
                auto.idx++; auto.t = 0;
                if (auto.idx >= PHASES.length) { auto.done = true; autoSummary('complete'); return; }
                send('PHASE', PHASES[auto.idx][0]);
            }
        }

        let wrapped = false;
        function wrapGameClasses(gs) {
            if (wrapped || level < 2) return;
            wrapped = true;
            Object.keys(gs).forEach(k => {
                const v = gs[k];
                if (v && typeof v === 'object' && v.constructor && /Manager|System|Controller|Overlay|Lifecycle/.test(v.constructor.name)) wrapObject(v.constructor.name, v);
            });
            wrapProto('GameScene', Object.getPrototypeOf(gs));
            [['Enemy', () => Enemy], ['Boss', () => Boss], ['Projectile', () => Projectile], ['ItemPickup', () => ItemPickup]]
                .forEach(([n, f]) => { try { wrapProto(n, f().prototype); } catch (e) {} });
            try { if (gs.uiScene) wrapProto('UIScene', Object.getPrototypeOf(gs.uiScene)); } catch (e) {}
            send('INIT', 'method timing on (perf=2)');
        }

        let texReported = false;
        let last = { logs: 0, logMs: 0, draw: 0, frames: 0, upd: 0, rend: 0, lt: 0, ltMs: 0 };
        let tick = 0, minFps = 999, fpsSum = 0, fpsN = 0;
        const REPORT_EVERY = 5;
        setInterval(() => {
            if (document.hidden) return;
            game.scene.scenes.forEach(hookScene);
            const gs = game.scene.getScene('GameScene');
            const inGame = gs && gs.sys.isActive() && gs.isSceneReady && gs.player;
            if (inGame) {
                if (flags.get('nofx') && gs.cameras.main.postFX && gs.cameras.main.postFX.list.length) gs.cameras.main.postFX.clear();
                if (flags.get('nohud')) { const ui = game.scene.getScene('UIScene'); if (ui && ui.sys.isVisible()) ui.sys.setVisible(false); }
                if (flags.get('notouch')) { const tc = game.scene.getScene('TouchControlsScene'); if (tc && tc.sys.isVisible()) tc.sys.setVisible(false); }
            }
            if (inGame) wrapGameClasses(gs);
            if (inGame && !texReported) { texReported = true; send('TEXTURES', textureReport(game)); }
            if (AUTO) autoTick(gs, !!inGame, game.loop.actualFps);
            const fps = game.loop.actualFps; fpsSum += fps; fpsN++; if (fps < minFps) minFps = fps;
            tick++;
            if (tick % REPORT_EVERY) return;

            const f = Math.max(1, R.frames - last.frames);
            const bit = (a, b) => ((a - b) / f);
            const parts = [
                `t=${tick}s`, inGame ? 'game' : 'menu', (AUTO && auto.started && !auto.done) ? `phase=${PHASES[auto.idx][0]}` : '',
                `fps=${(fpsSum / fpsN).toFixed(0)}(min ${minFps.toFixed(0)})`,
                `update=${bit(R.upd, last.upd).toFixed(1)}ms`, `worst=${R.worst.toFixed(0)}ms`,
                `render=${bit(R.rend, last.rend).toFixed(1)}ms`,
                `draws=${bit(R.draw, last.draw).toFixed(0)}/f`,
                `logs=${bit(R.logCount, last.logs).toFixed(0)}/f(${bit(R.logMs, last.logMs).toFixed(2)}ms)`,
                R.longTasks - last.lt ? `longtasks=${R.longTasks - last.lt}(${(R.longTaskMs - last.ltMs).toFixed(0)}ms)` : ''
            ];
            const sr = Object.entries(R.sceneRender).filter(([, v]) => v > 0)
                .map(([k, v]) => `${k.replace('Scene', '')}=${(v / f).toFixed(1)}`).join(' ');
            if (sr) parts.push(`render[ms]: ${sr}`);
            if (inGame) {
                const cam = gs.cameras.main;
                parts.push(`postfx=${cam.postFX ? cam.postFX.list.length : 0}`);
                const types = {};
                gs.children.list.forEach(o => { types[o.type] = (types[o.type] || 0) + 1; });
                parts.push('types{' + Object.entries(types).map(([k, v]) => k + ':' + v).join(',') + '}');
                parts.push(`enemies=${(gs.enemies || []).length}`,
                    `objs=${gs.children.list.length}+ui${gs.uiScene ? gs.uiScene.children.list.length : 0}`,
                    `tweens=${gs.tweens.getTweens().length + (gs.uiScene ? gs.uiScene.tweens.getTweens().length : 0)}`,
                    `bodies=${gs.physics.world.bodies ? gs.physics.world.bodies.size : 0}`);
            }
            if (performance.memory) parts.push(`heap=${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`);
            send(...parts.filter(Boolean));

            if (level >= 2 && inGame && tick % (REPORT_EVERY * 2) === 0) {
                const mf = Math.max(1, R.frames - (R.methodsSince || 0));
                const top = Object.entries(R.methods).map(([k, m]) => [k, m.ms / mf, m.calls / mf])
                    .sort((a, b) => b[1] - a[1]).slice(0, 14);
                send('TOP-METHODS ms/frame (calls/frame)', top.map(([k, ms, c]) => `${k} ${ms.toFixed(2)}(${c.toFixed(1)})`).join(' | '));
                R.methods = {}; R.methodsSince = R.frames;
            }
            last = { logs: R.logCount, logMs: R.logMs, draw: R.draw, frames: R.frames, upd: R.upd, rend: R.rend, lt: R.longTasks, ltMs: R.longTaskMs };
            R.worst = 0; minFps = 999; fpsSum = 0; fpsN = 0; R.sceneRender = {};
        }, 1000);
    }

    const iv = setInterval(() => {
        const g = window.__legacyGameInstance;
        if (g && g.renderer && g.canvas && g.textures && g.scene) { clearInterval(iv); start(g); }
    }, 250);
})();
