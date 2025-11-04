// ========================================
// LEVEL ASSET LOADER
// ========================================
// Hybrid cache-aware loader for per-level assets

class LevelAssetLoader {
    static log(...args) {
        if (window.LEVEL_DEBUG) console.log('[LevelAssetLoader]', ...args);
    }

    static ensureLoaded(scene, levelJson) {
        return new Promise(async (resolve) => {
            if (!levelJson) { resolve(true); return; }

            // Load explicit image assets (optional)
            const images = (levelJson.assets && levelJson.assets.images) || [];
            images.forEach(img => {
                if (!scene.textures.exists(img.key)) {
                    scene.load.image(img.key, img.path);
                    this.log('Queue image', img.key, img.path);
                }
            });

            // Background metadata for segmented types will be handled by WorldFactory
            // but we can pre-queue here to reduce latency
            if (levelJson.background && levelJson.background.type === 'segmented') {
                const metaKey = this.getMetadataKey(levelJson);
                if (!scene.cache.json.exists(metaKey)) {
                    scene.load.json(metaKey, levelJson.background.metadata);
                    this.log('Queue metadata', metaKey, levelJson.background.metadata);
                }
            }

            if (scene.load.list.size === 0) { resolve(true); return; }
            scene.load.once('complete', () => resolve(true));
            if (!scene.load.isLoading()) scene.load.start();
        });
    }

    static getMetadataKey(levelJson) {
        return `level_meta_${levelJson.id}`;
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.LevelAssetLoader = LevelAssetLoader;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelAssetLoader;
}


