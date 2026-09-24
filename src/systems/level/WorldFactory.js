// ========================================
// WORLD FACTORY
// ========================================
// Creates worlds from level JSON via WorldManager

class WorldFactory {
    static log(...args) {
        if (window.LEVEL_DEBUG) console.log('[WorldFactory]', ...args);
    }

    static async create(scene, levelJson) {
        if (!levelJson) return null;
        const worldId = `level_${levelJson.id}`;
        const wm = scene.worldManager;
        if (!wm) { console.error('WorldManager missing'); return null; }

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

        // Street bounds, enemy spawner and music are applied by LevelLifecycle.build()
        // in one place - this factory only builds the world itself.
        return worldId;
    }

    static async createSegmented(scene, wm, worldId, levelJson) {
        console.log('🌍 🏭 [WorldFactory] createSegmented called for level:', levelJson.id);
        console.log('🌍 🏭 [WorldFactory] Level JSON spawn:', levelJson.spawn);
        
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
        
        // Calculate spawn point
        const spawnX = (levelJson.spawn?.x) ?? (data.segments[0].x_position + 100);
        const spawnY = (levelJson.spawn?.y) ?? 600;
        console.log('🌍 🏭 [WorldFactory] Calculated spawn point:', { x: spawnX, y: spawnY });
        console.log('🌍 🏭 [WorldFactory] First segment position:', data.segments[0]?.x_position);
        console.log('🌍 🏭 [WorldFactory] Used levelJson.spawn?:', levelJson.spawn ? 'YES' : 'NO (using fallback)');
        
        // Register and create the world
        const worldConfig = {
            segments: data.segments,
            metadataPath: levelJson.background.metadata,
            spawnPoint: { x: spawnX, y: spawnY },
            bounds: {
                x: data.segments[0].x_position,
                y: 0,
                width: data.segments[data.segments.length - 1].x_position + data.segments[data.segments.length - 1].width - data.segments[0].x_position,
                height: 720
            }
        };
        
        console.log('🌍 🏭 [WorldFactory] World config spawnPoint:', worldConfig.spawnPoint);
        console.log('🌍 🏭 [WorldFactory] World bounds:', worldConfig.bounds);
        
        wm.registerWorld(worldId, worldConfig);
        wm.createWorld(worldId);
        this.log('Segmented world created', worldId);
        
        // Verify spawn point was set
        const verifySpawn = wm.getSpawnPoint();
        console.log('🌍 🏭 [WorldFactory] Verified spawn point after creation:', verifySpawn);
    }
}

// Export globally
if (typeof window !== 'undefined') {
    window.WorldFactory = WorldFactory;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldFactory;
}


