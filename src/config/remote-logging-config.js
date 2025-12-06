// ========================================
// REMOTE LOGGING CONFIG
// ========================================
// Set your LAN IP/hostname once and the client logger will reuse it.
// Example: http://192.168.1.42:9000/log
const REMOTE_LOG_CONFIG = {
    serverUrl: 'http://192.168.1.71:9000/log', // Change to your LAN IP for phone access
    timeoutMs: 1200,                           // Abort fetch quickly so the game never stalls
    mirrorConsole: true                        // Mirror console.log to remoteLog by default
};

if (typeof window !== 'undefined') {
    window.REMOTE_LOG_CONFIG = REMOTE_LOG_CONFIG;
}

