class TouchControlsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TouchControlsScene', active: false });
        this.virtualWidth = 1200;
        this.virtualHeight = 720;
    }
    
    create() {
        this.configureCamera();
        
        // Recalculate camera on resize so overlay always spans the full screen
        // (removed on shutdown so a stopped scene doesn't touch its missing camera)
        const onResize = () => this.configureCamera();
        this.scale.on('resize', onResize);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
    }
    
    configureCamera() {
        const width = (this.scale && this.scale.width) || window.innerWidth || this.virtualWidth;
        const height = (this.scale && this.scale.height) || window.innerHeight || this.virtualHeight;
        
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.setBounds();
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    }
}

if (typeof window !== 'undefined') {
    window.TouchControlsScene = TouchControlsScene;
}


