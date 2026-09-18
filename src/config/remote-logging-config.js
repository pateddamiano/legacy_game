// ========================================
// REMOTE LOGGING CONFIG
// ========================================
// Mirrors console.log to a tiny HTTP server (scripts/remote-log-server.js) so
// you can read a phone's logs from your desktop terminal.
//
// Set your LAN IP/hostname once and the client logger will reuse it.
// Example: http://192.168.1.42:9000/log
//
// mirrorConsole is OFF by default. Enable it per session with ?remotelog=1 in
// the URL, or `console.remote = true` in DevTools. Why: with it on and the
// endpoint unreachable (wrong network, server not running), the old logger
// fired one pending fetch() per console.log line. A real brawl logs thousands
// of lines, which blew through Chrome's outstanding-request cap, and the next
// real request the game made - the next level's JSON - failed on the client
// side ("Failed to fetch"). That was the "stuck on black after the level 1
// stairway" bug. The logger now batches and backs off, but keep it opt-in.
const REMOTE_LOG_CONFIG = {
    serverUrl: 'http://192.168.1.71:9000/log', // Change to your LAN IP for phone access
    timeoutMs: 1200,                           // Abort fetch quickly so the game never stalls
    mirrorConsole: false                       // Opt in with ?remotelog=1 or console.remote = true
};

if (typeof window !== 'undefined') {
    window.REMOTE_LOG_CONFIG = REMOTE_LOG_CONFIG;
}
