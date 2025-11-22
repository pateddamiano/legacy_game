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
        if (levelJson.world) {
            const top = levelJson.world.top ?? 410;
            const bottom = levelJson.world.bottom ?? 650;
            
            // Update input manager
            if (scene.inputManager) {
                scene.inputManager.setStreetBounds(top, bottom);
            }
            
            // Update environment manager directly (source of truth)
            if (scene.environmentManager) {
                scene.environmentManager.streetTopLimit = top;
                scene.environmentManager.streetBottomLimit = bottom;
                console.log(`🌍 [WorldFactory] Updated EnvironmentManager bounds: ${top} - ${bottom}`);
            }
            
            this.log('Applied street bounds', top, bottom);
        }
        
        // Apply enemy spawn configuration (including allowed enemy types)
        if (levelJson.enemies && scene.enemySpawnManager) {
            const enemyConfig = levelJson.enemies;
            
            // Update enemy spawner configuration
            scene.enemySpawnManager.initialize({
                maxEnemies: enemyConfig.max || ENEMY_CONFIG.maxEnemiesOnScreen,
                spawnInterval: enemyConfig.spawnRate || ENEMY_CONFIG.spawnInterval,
                isTestMode: scene.isTestMode || false,
                isLoading: false,
                allowedEnemyTypes: enemyConfig.types || [] // Pass allowed enemy types from level config
            });
            
            console.log(`🌍 [WorldFactory] Updated EnemySpawnManager: max=${enemyConfig.max || ENEMY_CONFIG.maxEnemiesOnScreen}, spawnRate=${enemyConfig.spawnRate || ENEMY_CONFIG.spawnInterval}, types=${(enemyConfig.types || []).join(', ') || 'all'}`);
        }

        // Music (actual playback done by caller)
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


