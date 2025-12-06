// ========================================
// REMOTE LOGGER (client-side)
// ========================================
// Sends lightweight POST logs to a tiny HTTP server so you can
// view mobile logs from your desktop terminal.
(function setupRemoteLogger() {
    const originalLog = console.log.bind(console);
    const initialConfig = (typeof window !== 'undefined' && window.REMOTE_LOG_CONFIG) ? window.REMOTE_LOG_CONFIG : {};
    let mirrorEnabled = Boolean(initialConfig.mirrorConsole);

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

    function remoteLog(...args) {
        const { serverUrl, timeoutMs = 1200 } = getConfig();
        if (!serverUrl || typeof fetch !== 'function') return;

        const supportsAbort = typeof AbortController !== 'undefined';
        const controller = supportsAbort ? new AbortController() : null;
        const timeout = supportsAbort ? setTimeout(() => controller.abort(), timeoutMs) : null;

        fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ts: Date.now(),
                ua: (typeof navigator !== 'undefined' && navigator.userAgent) || 'unknown',
                message: normalizeArgs(args)
            }),
            signal: controller ? controller.signal : undefined
        }).catch(() => {
            /* Network errors are intentionally swallowed to avoid breaking gameplay */
        }).finally(() => {
            if (timeout) clearTimeout(timeout);
        });
    }

    // Attach globally
    if (typeof window !== 'undefined') {
        window.remoteLog = remoteLog;
    }

    // Mirror console.log when console.remote is set to true
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
})();

