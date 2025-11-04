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
            // Load the index file
            scene.load.json(this.indexKey, 'src/config/levels/index.json');
            scene.load.once('filecomplete-json-' + this.indexKey, () => {
                this.indexLoaded = true;
                this.log('Index loaded');
                resolve(true);
            });
            if (!scene.load.isLoading()) scene.load.start();
        });
    }

    getIndex(scene) {
        if (!scene.cache.json.exists(this.indexKey)) return null;
        return scene.cache.json.get(this.indexKey);
    }

    ensureLevelLoaded(scene, levelId) {
        return new Promise(async (resolve) => {
            await this.ensureIndexLoaded(scene);
            if (this.levelCache.has(levelId)) {
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
            if (scene.cache.json.exists(jsonKey)) {
                const data = scene.cache.json.get(jsonKey);
                this.levelCache.set(levelId, data);
                resolve(data);
                return;
            }
            scene.load.json(jsonKey, entry.path);
            scene.load.once('filecomplete-json-' + jsonKey, () => {
                const data = scene.cache.json.get(jsonKey);
                this.levelCache.set(levelId, data);
                this.log('Level JSON loaded', levelId, entry.path);
                resolve(data);
            });
            if (!scene.load.isLoading()) scene.load.start();
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


