// ========================================
// REMOTE LOGGER (client-side)
// ========================================
// Sends console.log lines to a tiny HTTP server (scripts/remote-log-server.js)
// so you can view mobile logs from your desktop terminal.
//
// Safety properties (see remote-logging-config.js for the incident behind them):
//   - at most ONE request in flight, ever; lines are batched into it
//   - the queue is capped; when full, the oldest lines are dropped
//   - after a few failed posts the logger goes quiet for 30s instead of retrying
// So even with the mirror on and the endpoint unreachable, the game never has
// more than one pending fetch and its own asset requests are never starved.
(function setupRemoteLogger() {
    const originalLog = console.log.bind(console);
    const initialConfig = (typeof window !== 'undefined' && window.REMOTE_LOG_CONFIG) ? window.REMOTE_LOG_CONFIG : {};

    // ?remotelog=1 turns the mirror on; ?remotelog=http://host:port/log also points it
    // at that server for the session (handy when the LAN IP in the config is stale)
    const remoteParam = (typeof location !== 'undefined') ? new URLSearchParams(location.search).get('remotelog') : null;
    const urlOverride = remoteParam && /^https?:\/\//.test(remoteParam) ? remoteParam : null;
    if (urlOverride) initialConfig.serverUrl = urlOverride;
    const urlOptIn = remoteParam === '1' || Boolean(urlOverride);
    let mirrorEnabled = Boolean(initialConfig.mirrorConsole) || urlOptIn;

    const MAX_QUEUE = 200;      // lines held while waiting to send
    const FLUSH_MS = 250;       // batch window
    const MAX_FAILURES = 5;     // consecutive failed posts before backing off
    const BACKOFF_MS = 30000;

    let queue = [];
    let flushTimer = null;
    let inFlight = false;
    let failures = 0;
    let disabledUntil = 0;

    function getConfig() {
        return (typeof window !== 'undefined' && window.REMOTE_LOG_CONFIG) ? window.REMOTE_LOG_CONFIG : initialConfig;
    }

    function normalizeArgs(args) {
        return args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (err) {
                    return '[unserializable object]';
                }
            }
            return String(arg);
        });
    }

    function schedule() {
        if (!flushTimer) {
            flushTimer = setTimeout(flush, FLUSH_MS);
        }
    }

    function flush() {
        flushTimer = null;
        if (inFlight || queue.length === 0) return;

        const { serverUrl, timeoutMs = 1200 } = getConfig();
        if (!serverUrl || typeof fetch !== 'function' || Date.now() < disabledUntil) {
            queue = [];
            return;
        }

        const lines = queue.splice(0, MAX_QUEUE);
        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

        inFlight = true;
        fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ts: Date.now(),
                ua: (typeof navigator !== 'undefined' && navigator.userAgent) || 'unknown',
                // One string per batch keeps the existing server's `message` handling working
                message: [lines.join('\n')]
            }),
            signal: controller ? controller.signal : undefined
        }).then(() => {
            failures = 0;
        }).catch(() => {
            failures++;
            if (failures >= MAX_FAILURES) {
                failures = 0;
                disabledUntil = Date.now() + BACKOFF_MS;
                queue = [];
                originalLog(`📡 Remote log endpoint unreachable - pausing remote logging for ${BACKOFF_MS / 1000}s`);
            }
        }).finally(() => {
            if (timeout) clearTimeout(timeout);
            inFlight = false;
            if (queue.length) schedule();
        });
    }

    function remoteLog(...args) {
        if (queue.length >= MAX_QUEUE) {
            queue.shift(); // drop the oldest rather than grow without bound
        }
        queue.push(normalizeArgs(args).join(' '));
        schedule();
    }

    // Attach globally
    if (typeof window !== 'undefined') {
        window.remoteLog = remoteLog;
    }

    // console.remote = true / false toggles mirroring at runtime
    Object.defineProperty(console, 'remote', {
        get() {
            return mirrorEnabled;
        },
        set(value) {
            mirrorEnabled = Boolean(value);
        }
    });

    console.log = function patchedConsoleLog(...args) {
        originalLog(...args);
        if (mirrorEnabled) {
            remoteLog(...args);
        }
    };

    // Mirror warnings and errors too (the on-screen error banner reports through
    // console.error), tagged so they stand out in the server log
    ['warn', 'error'].forEach(level => {
        const original = console[level].bind(console);
        console[level] = function patchedConsole(...args) {
            original(...args);
            if (mirrorEnabled) {
                remoteLog(`[${level.toUpperCase()}]`, ...args);
            }
        };
    });

    if (mirrorEnabled) {
        originalLog(`📡 Remote console mirroring ON -> ${getConfig().serverUrl}`);
    }
})();
