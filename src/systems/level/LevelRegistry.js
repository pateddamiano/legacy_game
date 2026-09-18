// ========================================
// LEVEL REGISTRY (JSON-BASED)
// ========================================
// Loads per-level JSON configs via Phaser loader with a small index
// Provides cache-aware accessors used by GameScene

class LevelRegistry {
    constructor() {
        this.indexLoaded = false;
        this.indexKey = 'levels_index';
        this.levelCache = new Map(); // id -> json
    }

    static getInstance() {
        if (!window.__levelRegistry) {
            window.__levelRegistry = new LevelRegistry();
        }
        return window.__levelRegistry;
    }

    log(...args) {
        if (window.LEVEL_DEBUG) console.log('[LevelRegistry]', ...args);
    }

    ensureIndexLoaded(scene) {
        return new Promise((resolve) => {
            if (this.indexLoaded && scene.cache.json.exists(this.indexKey)) {
                this.log('Index already loaded');
                resolve(true);
                return;
            }
            // Load the index file.
            // NOTE: always pair the success listener with a 'loaderror' listener. Without
            // one, a single failed request leaves this promise pending forever and the
            // awaiting GameScene.create() never finishes - the game just sits on black.
            const onError = (file) => {
                if (file.key !== this.indexKey) return;
                cleanup();
                console.error('[LevelRegistry] Failed to load level index from', file.src);
                resolve(false);
            };
            const onDone = () => {
                cleanup();
                this.indexLoaded = true;
                this.log('Index loaded');
                resolve(true);
            };
            const cleanup = () => {
                scene.load.off('filecomplete-json-' + this.indexKey, onDone);
                scene.load.off('loaderror', onError);
            };
            
            scene.load.json(this.indexKey, 'src/config/levels/index.json');
            scene.load.once('filecomplete-json-' + this.indexKey, onDone);
            scene.load.on('loaderror', onError);
            if (!scene.load.isLoading()) scene.load.start();
        });
    }

    getIndex(scene) {
        if (!scene.cache.json.exists(this.indexKey)) return null;
        return scene.cache.json.get(this.indexKey);
    }

    clearLevelCache(levelId = null, scene = null) {
        if (levelId === null) {
            // Clear all levels
            this.levelCache.clear();
            this.log('Cleared all level cache');
            // Also clear Phaser cache for all level JSONs
            if (scene && scene.cache && scene.cache.json) {
                // Clear all level_json_* entries
                const keysToRemove = [];
                scene.cache.json.entries.forEach((entry, key) => {
                    if (key.startsWith('level_json_')) {
                        keysToRemove.push(key);
                    }
                });
                keysToRemove.forEach(key => {
                    scene.cache.json.remove(key);
                    this.log('Removed from Phaser cache:', key);
                });
            }
        } else {
            // Clear specific level
            this.levelCache.delete(levelId);
            this.log('Cleared cache for level', levelId);
            // Also clear from Phaser cache
            if (scene && scene.cache && scene.cache.json) {
                const jsonKey = `level_json_${levelId}`;
                if (scene.cache.json.exists(jsonKey)) {
                    scene.cache.json.remove(jsonKey);
                    this.log('Removed from Phaser cache:', jsonKey);
                }
            }
        }
    }

    ensureLevelLoaded(scene, levelId, forceReload = false) {
        return new Promise(async (resolve) => {
            await this.ensureIndexLoaded(scene);
            
            // In development/debug mode, always force reload to pick up JSON changes
            const isDevelopment = window.DEBUG_MODE || window.LEVEL_DEBUG || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (isDevelopment) {
                forceReload = true;
            }
            
            // Clear cache if force reload is requested
            if (forceReload) {
                this.clearLevelCache(levelId, scene);
            }
            
            if (this.levelCache.has(levelId) && !forceReload) {
                resolve(this.levelCache.get(levelId));
                return;
            }
            const index = this.getIndex(scene);
            const entry = index && (index[levelId] || index[String(levelId)]);
            if (!entry || !entry.path) {
                this.log('No entry for level', levelId);
                resolve(null);
                return;
            }
            const jsonKey = `level_json_${levelId}`;
            if (scene.cache.json.exists(jsonKey) && !forceReload) {
                const data = scene.cache.json.get(jsonKey);
                this.levelCache.set(levelId, data);
                resolve(data);
                return;
            }
            // A level's JSON is a tiny request, but it is the first real request the game
            // makes after a level's worth of play, so a transient client-side failure
            // (network blip, request-cap pressure) must not brick the transition. Retry a
            // few times before giving up; a missing 'loaderror' handler would hang forever.
            const MAX_ATTEMPTS = 4;
            const RETRY_DELAY_MS = 500;
            
            const attempt = (n) => {
                // Cache-busting query parameter when force reloading (fresh per attempt)
                const path = forceReload ? `${entry.path}?t=${Date.now()}` : entry.path;
                const onError = (file) => {
                    if (file.key !== jsonKey) return;
                    cleanup();
                    if (n < MAX_ATTEMPTS) {
                        console.warn(`[LevelRegistry] Level ${levelId} JSON failed to load (attempt ${n}/${MAX_ATTEMPTS}) - retrying`, file.src);
                        setTimeout(() => attempt(n + 1), RETRY_DELAY_MS);
                    } else {
                        console.error(`[LevelRegistry] Failed to load level ${levelId} after ${MAX_ATTEMPTS} attempts from`, file.src);
                        resolve(null);
                    }
                };
                const onDone = () => {
                    cleanup();
                    const data = scene.cache.json.get(jsonKey);
                    this.levelCache.set(levelId, data);
                    this.log('Level JSON loaded', levelId, entry.path);
                    resolve(data);
                };
                const cleanup = () => {
                    scene.load.off('filecomplete-json-' + jsonKey, onDone);
                    scene.load.off('loaderror', onError);
                };
                
                scene.load.json(jsonKey, path);
                scene.load.once('filecomplete-json-' + jsonKey, onDone);
                scene.load.on('loaderror', onError);
                if (!scene.load.isLoading()) scene.load.start();
            };
            attempt(1);
        });
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.LevelRegistry = LevelRegistry;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelRegistry;
}


