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

            // Background metadata for segmented types - load metadata first, then segments
            if (levelJson.background && levelJson.background.type === 'segmented') {
                const metaKey = this.getMetadataKey(levelJson);
                const worldId = `level_${levelJson.id}`;
                
                // Load metadata if not already cached
                if (!scene.cache.json.exists(metaKey)) {
                    await new Promise((metaResolve) => {
                        scene.load.json(metaKey, levelJson.background.metadata);
                        scene.load.once('filecomplete-json-' + metaKey, () => {
                            this.log('Metadata loaded', metaKey);
                            metaResolve();
                        });
                        if (!scene.load.isLoading()) scene.load.start();
                    });
                }
                
                // Now load segment images if not already cached
                const metadata = scene.cache.json.get(metaKey);
                if (metadata && metadata.segments) {
                    metadata.segments.forEach(segment => {
                        const segmentKey = `${worldId}_segment_${segment.index.toString().padStart(3, '0')}`;
                        if (!scene.textures.exists(segmentKey)) {
                            const segmentPath = `${levelJson.background.dir}/${segment.filename}`;
                            scene.load.image(segmentKey, segmentPath);
                            this.log('Queue segment', segmentKey, segmentPath);
                        }
                    });
                }
            }

            // Wait for all queued assets to load
            if (scene.load.list.size === 0) { 
                resolve(true); 
                return; 
            }
            
            scene.load.once('complete', () => {
                this.log('All assets loaded for level', levelJson.id);
                resolve(true);
            });
            
            if (!scene.load.isLoading()) {
                scene.load.start();
            }
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


