// ========================================
// WORLD FACTORY
// ========================================
// Creates worlds from level JSON via WorldManager

class WorldFactory {
    static log(...args) {
        if (window.LEVEL_DEBUG) console.log('[WorldFactory]', ...args);
    }

    static async create(scene, levelJson) {
        if (!levelJson) return;
        const worldId = `level_${levelJson.id}`;
        const wm = scene.worldManager;
        if (!wm) { console.error('WorldManager missing'); return; }

        if (levelJson.background && levelJson.background.type === 'segmented') {
            await this.createSegmented(scene, wm, worldId, levelJson);
        } else {
            // Simple background fallback
            wm.registerWorld(worldId, {
                bounds: { x: 0, y: 0, width: 3600, height: 720 },
                spawnPoint: { x: (levelJson.spawn?.x)||200, y: (levelJson.spawn?.y)||600 }
            });
            wm.createWorld(worldId);
        }

        // Apply world vertical bounds
        if (levelJson.world && scene.inputManager) {
            const top = levelJson.world.top ?? 410;
            const bottom = levelJson.world.bottom ?? 650;
            scene.inputManager.setStreetBounds(top, bottom);
            this.log('Applied street bounds', top, bottom);
        }

        // Music (actual playback done by caller)
    }

    static async createSegmented(scene, wm, worldId, levelJson) {
        const metaKey = `level_meta_${levelJson.id}`;
        let data = null;
        if (scene.cache.json.exists(metaKey)) {
            data = scene.cache.json.get(metaKey);
            this.log('Using cached metadata', metaKey);
        } else {
            // Load now if not present
            await new Promise((resolve) => {
                scene.load.json(metaKey, levelJson.background.metadata);
                scene.load.once('filecomplete-json-' + metaKey, () => resolve(true));
                if (!scene.load.isLoading()) scene.load.start();
            });
            data = scene.cache.json.get(metaKey);
        }
        if (!data || !data.segments) {
            console.error('Invalid metadata for segmented background');
            return;
        }
        // Register and create the world
        const worldConfig = {
            segments: data.segments,
            metadataPath: levelJson.background.metadata,
            spawnPoint: { x: (levelJson.spawn?.x) ?? (data.segments[0].x_position + 100), y: (levelJson.spawn?.y) ?? 600 },
            bounds: {
                x: data.segments[0].x_position,
                y: 0,
                width: data.segments[data.segments.length - 1].x_position + data.segments[data.segments.length - 1].width - data.segments[0].x_position,
                height: 720
            }
        };
        wm.registerWorld(worldId, worldConfig);
        wm.createWorld(worldId);
        this.log('Segmented world created', worldId);
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.WorldFactory = WorldFactory;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldFactory;
}


