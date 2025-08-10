/**
 * FIRST OFF - Brooklyn Street Mini Game
 * A complete JavaScript implementation featuring Tireek and Tryston
 * from rap group "++" surviving Brooklyn's urban obstacles
 */

class FirstOffGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
        this.lastFrameTime = 0;
        this.frameCount = 0;
        
        // Game configuration
        this.config = {
            canvas: { width: 800, height: 600 },
            player: {
                width: 40, height: 60, speed: 6, jumpPower: -16,
                gravity: 0.7, maxHealth: 100
            },
            game: {
                duration: 180, // 3 minutes
                baseSpeed: 3, maxSpeed: 8,
                bossWaveStart: 150 // Last 30 seconds
            }
        };
        
        // Game state
        this.score = 0;
        this.gameTime = this.config.game.duration;
        this.gameSpeed = 1;
        this.currentCharacter = 'tireek';
        this.highScore = this.loadHighScore();
        
        // Characters data
        this.characters = {
            tireek: {
                name: 'Tireek',
                color: '#3498db',
                secondaryColor: '#2980b9',
                superMove: 'punch',
                superCooldown: 0,
                maxHealth: 100,
                currentHealth: 100,
                description: 'Powerful Punch'
            },
            tryston: {
                name: 'Tryston',
                color: '#e67e22',
                secondaryColor: '#d35400',
                superMove: 'yell',
                superCooldown: 0,
                maxHealth: 100,
                currentHealth: 100,
                description: 'Knockback Yell'
            }
        };
        
        // Player object
        this.player = {
            x: 100, y: 400, width: 40, height: 60,
            velocityY: 0, onGround: false,
            isInvulnerable: false, invulnerabilityTime: 0
        };
        
        // Game objects
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        this.backgroundElements = [];
        
        // Controls
        this.keys = {};
        this.touchControls = {};
        
        // Brooklyn street atmosphere
        this.atmosphere = {
            buildings: [],
            graffiti: [],
            streetLights: []
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupControls();
        this.generateBrooklynAtmosphere();
        this.startGameLoop();
        this.showLoadingScreen();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.canvas.width;
        this.canvas.height = this.config.canvas.height;
        this.canvas.id = 'firstOffCanvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        
        // Style canvas
        this.canvas.style.border = '3px solid #e74c3c';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 0 30px rgba(231, 76, 60, 0.5)';
        this.canvas.style.backgroundColor = '#2c3e50';
        
        document.body.appendChild(this.canvas);
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch controls setup
        this.setupTouchControls();
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    setupTouchControls() {
        const touchHandler = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touches = e.touches || [e];
            
            // Reset touch states
            this.touchControls = { left: false, right: false, jump: false, switch: false, super: false };
            
            for (let touch of touches) {
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Define touch areas
                if (x < 150 && y > this.canvas.height - 120) {
                    if (x < 75) this.touchControls.left = true;
                    else this.touchControls.right = true;
                } else if (x > this.canvas.width - 150 && y > this.canvas.height - 120) {
                    if (x > this.canvas.width - 75) this.touchControls.super = true;
                    else this.touchControls.switch = true;
                } else if (y > this.canvas.height - 80) {
                    this.touchControls.jump = true;
                }
            }
        };
        
        this.canvas.addEventListener('touchstart', touchHandler);
        this.canvas.addEventListener('touchmove', touchHandler);
        this.canvas.addEventListener('touchend', () => {
            this.touchControls = {};
        });
    }
    
    handleKeyDown(e) {
        const key = e.code || e.key;
        
        switch(key) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                if (key === 'Space' && this.gameState === 'playing') {
                    this.switchCharacter();
                } else {
                    this.keys.jump = true;
                }
                e.preventDefault();
                break;
            case 'Enter':
            case 'KeyX':
                this.useSuperMove();
                break;
            case 'KeyP':
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                }
                break;
            case 'KeyR':
                if (this.gameState === 'gameOver' || this.gameState === 'victory') {
                    this.resetGame();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        const key = e.code || e.key;
        
        switch(key) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.keys.jump = false;
                break;
        }
    }
    
    generateBrooklynAtmosphere() {
        // Generate Brooklyn skyline
        for (let i = 0; i < 15; i++) {
            this.atmosphere.buildings.push({
                x: i * 60 - 100,
                width: 50 + Math.random() * 30,
                height: 100 + Math.random() * 150,
                color: `hsl(${200 + Math.random() * 60}, 20%, ${20 + Math.random() * 20}%)`
            });
        }
        
        // Street lights
        for (let i = 0; i < 8; i++) {
            this.atmosphere.streetLights.push({
                x: i * 120 + 50,
                y: this.canvas.height - 120,
                flickering: Math.random() > 0.8
            });
        }
        
        // Graffiti spots
        const graffiti = ['++', 'BK', 'NYC', 'FIRST OFF', 'TIREEK', 'TRYSTON'];
        for (let i = 0; i < 6; i++) {
            this.atmosphere.graffiti.push({
                x: Math.random() * this.canvas.width,
                y: this.canvas.height - 200 - Math.random() * 100,
                text: graffiti[Math.floor(Math.random() * graffiti.length)],
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                size: 12 + Math.random() * 8
            });
        }
    }
    
    showLoadingScreen() {
        setTimeout(() => {
            this.gameState = 'menu';
        }, 2000);
    }
    
    // Character and game mechanics
    switchCharacter() {
        if (this.gameState !== 'playing') return;
        
        this.currentCharacter = this.currentCharacter === 'tireek' ? 'tryston' : 'tireek';
        
        // Visual feedback
        this.createParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            this.characters[this.currentCharacter].color,
            15,
            'switch'
        );
    }
    
    useSuperMove() {
        if (this.gameState !== 'playing') return;
        
        const character = this.characters[this.currentCharacter];
        if (character.superCooldown > 0) return;
        
        character.superCooldown = 300; // 5 seconds at 60fps
        
        if (character.superMove === 'punch') {
            this.tireekPunch();
        } else {
            this.trystonYell();
        }
    }
    
    tireekPunch() {
        const punchRange = 150;
        const punchY = this.player.y;
        let enemiesHit = 0;
        
        // Clear enemies in front
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            if (obstacle.x >= this.player.x && 
                obstacle.x <= this.player.x + punchRange &&
                Math.abs(obstacle.y - punchY) < 80) {
                
                this.obstacles.splice(i, 1);
                this.score += 10;
                enemiesHit++;
                
                this.createParticleEffect(obstacle.x, obstacle.y, '#e74c3c', 8, 'explosion');
            }
        }
        
        // Visual effect
        this.createSuperMoveEffect('PUNCH!', '#3498db', enemiesHit);
    }
    
    trystonYell() {
        let enemiesAffected = 0;
        
        // Knockback and slow all enemies
        this.obstacles.forEach(obstacle => {
            obstacle.x += 80 + Math.random() * 40;
            obstacle.speed *= 0.6;
            enemiesAffected++;
        });
        
        // Screen shake effect
        this.screenShake = 15;
        
        // Visual effect
        this.createSuperMoveEffect('YELL!', '#e67e22', enemiesAffected);
    }
    
    createSuperMoveEffect(text, color, count) {
        // Screen flash
        this.flashEffect = { intensity: 0.8, color: color, duration: 20 };
        
        // Floating text
        this.particles.push({
            type: 'text',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            text: text,
            color: color,
            size: 36,
            life: 60,
            maxLife: 60,
            vx: 0,
            vy: -2
        });
        
        if (count > 0) {
            this.particles.push({
                type: 'text',
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                text: `+${count * 10} POINTS`,
                color: '#f1c40f',
                size: 20,
                life: 90,
                maxLife: 90,
                vx: 0,
                vy: -1
            });
        }
    }
    
    // Obstacle management
    spawnObstacle() {
        const types = ['vinyl', 'gangster', 'homeless'];
        const weights = this.gameTime < 30 ? [0.3, 0.5, 0.2] : [0.4, 0.4, 0.2]; // More enemies near end
        
        let type = this.weightedChoice(types, weights);
        
        const obstacle = {
            type: type,
            x: this.canvas.width + 50,
            y: this.canvas.height - 120,
            width: 35,
            height: 50,
            speed: this.config.game.baseSpeed * this.gameSpeed + Math.random() * 2,
            health: 1,
            rotation: 0
        };
        
        // Type-specific properties
        switch(type) {
            case 'vinyl':
                obstacle.width = 30;
                obstacle.height = 30;
                obstacle.y = this.canvas.height - 90;
                obstacle.rotationSpeed = 0.15 + Math.random() * 0.1;
                obstacle.color = '#2c3e50';
                break;
                
            case 'gangster':
                obstacle.speed *= 1.3;
                obstacle.health = 2;
                obstacle.color = '#8e44ad';
                obstacle.pattern = 'zigzag';
                obstacle.amplitude = 20;
                obstacle.frequency = 0.05;
                break;
                
            case 'homeless':
                obstacle.speed *= 0.7;
                obstacle.width = 45;
                obstacle.color = '#95a5a6';
                obstacle.blocking = true;
                break;
        }
        
        this.obstacles.push(obstacle);
    }
    
    spawnMicrophone() {
        if (Math.random() < 0.008) { // Rare spawn
            this.microphones.push({
                x: this.canvas.width + 30,
                y: this.canvas.height - 180 - Math.random() * 80,
                width: 15,
                height: 25,
                speed: this.config.game.baseSpeed * this.gameSpeed * 0.8,
                bobOffset: Math.random() * Math.PI * 2,
                collected: false,
                glow: 0
            });
        }
    }
    
    weightedChoice(items, weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        
        return items[items.length - 1];
    }
    
    // Physics and collision
    updatePlayer() {
        if (this.gameState !== 'playing') return;
        
        const isLeft = this.keys.left || this.touchControls.left;
        const isRight = this.keys.right || this.touchControls.right;
        const isJump = this.keys.jump || this.touchControls.jump;
        
        // Horizontal movement
        if (isLeft && this.player.x > 0) {
            this.player.x -= this.config.player.speed;
        }
        if (isRight && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.config.player.speed;
        }
        
        // Jumping
        if (isJump && this.player.onGround) {
            this.player.velocityY = this.config.player.jumpPower;
            this.player.onGround = false;
        }
        
        // Gravity
        this.player.y += this.player.velocityY;
        this.player.velocityY += this.config.player.gravity;
        
        // Ground collision
        const groundY = this.canvas.height - this.player.height - 50;
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Update invulnerability
        if (this.player.isInvulnerable) {
            this.player.invulnerabilityTime--;
            if (this.player.invulnerabilityTime <= 0) {
                this.player.isInvulnerable = false;
            }
        }
    }
    
    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Movement patterns
            if (obstacle.pattern === 'zigzag') {
                obstacle.y += Math.sin(this.frameCount * obstacle.frequency) * obstacle.amplitude * 0.1;
            }
            
            obstacle.x -= obstacle.speed;
            
            if (obstacle.type === 'vinyl') {
                obstacle.rotation += obstacle.rotationSpeed;
            }
            
            // Remove off-screen obstacles
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 5; // Points for survival
                continue;
            }
            
            // Collision detection
            if (!this.player.isInvulnerable && this.checkCollision(this.player, obstacle)) {
                this.playerHit(obstacle);
            }
        }
    }
    
    updateMicrophones() {
        for (let i = this.microphones.length - 1; i >= 0; i--) {
            const mic = this.microphones[i];
            
            mic.x -= mic.speed;
            mic.bobOffset += 0.1;
            mic.glow = Math.sin(this.frameCount * 0.1) * 0.5 + 0.5;
            
            // Remove off-screen
            if (mic.x + mic.width < 0) {
                this.microphones.splice(i, 1);
                continue;
            }
            
            // Collection
            if (this.checkCollision(this.player, mic)) {
                this.microphones.splice(i, 1);
                this.collectMicrophone();
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    playerHit(obstacle) {
        const character = this.characters[this.currentCharacter];
        const damage = obstacle.type === 'gangster' ? 25 : 20;
        
        character.currentHealth -= damage;
        this.player.isInvulnerable = true;
        this.player.invulnerabilityTime = 120; // 2 seconds
        
        // Knockback
        this.player.x -= 20;
        if (this.player.x < 0) this.player.x = 0;
        
        // Visual feedback
        this.createParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#e74c3c', 12, 'hit'
        );
        
        // Screen shake
        this.screenShake = 10;
        
        if (character.currentHealth <= 0) {
            this.gameState = 'gameOver';
            this.saveHighScore();
        }
    }
    
    collectMicrophone() {
        const character = this.characters[this.currentCharacter];
        character.superCooldown = Math.max(0, character.superCooldown - 120);
        this.score += 25;
        
        this.createParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#f1c40f', 15, 'collect'
        );
    }
    
    // Particle effects
    createParticleEffect(x, y, color, count, type) {
        for (let i = 0; i < count; i++) {
            let particle = {
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: color,
                life: 30 + Math.random() * 30,
                maxLife: 60,
                size: 2 + Math.random() * 3,
                type: type
            };
            
            if (type === 'switch') {
                particle.vx *= 1.5;
                particle.vy = -Math.abs(particle.vy) * 1.5;
            } else if (type === 'collect') {
                particle.vy = -Math.abs(particle.vy) * 2;
                particle.gravity = 0.1;
            }
            
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (particle.type === 'text') {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;
            } else {
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                if (particle.gravity) {
                    particle.vy += particle.gravity;
                }
                
                particle.life--;
                particle.vx *= 0.98;
                particle.vy *= 0.98;
            }
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // Game logic
    updateGameLogic() {
        if (this.gameState !== 'playing') return;
        
        this.frameCount++;
        
        // Update cooldowns
        Object.values(this.characters).forEach(char => {
            if (char.superCooldown > 0) {
                char.superCooldown--;
            }
        });
        
        // Time progression
        this.gameTime -= 1/60;
        if (this.gameTime <= 0) {
            this.gameState = 'victory';
            this.saveHighScore();
            return;
        }
        
        // Increase difficulty
        const timeProgress = 1 - (this.gameTime / this.config.game.duration);
        this.gameSpeed = 1 + timeProgress * 2;
        
        // Boss wave mechanics
        const inBossWave = this.gameTime <= this.config.game.bossWaveStart;
        const spawnRate = inBossWave ? 0.04 : 0.025;
        
        // Spawn obstacles
        if (Math.random() < spawnRate * this.gameSpeed) {
            this.spawnObstacle();
        }
        
        // Spawn microphones
        this.spawnMicrophone();
        
        // Update screen effects
        if (this.screenShake > 0) {
            this.screenShake--;
        }
        
        if (this.flashEffect && this.flashEffect.duration > 0) {
            this.flashEffect.duration--;
        }
    }
    
    // Rendering
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake;
            shakeY = (Math.random() - 0.5) * this.screenShake;
        }
        
        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);
        
        if (this.gameState === 'loading') {
            this.renderLoadingScreen();
        } else if (this.gameState === 'menu') {
            this.renderMainMenu();
        } else if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.renderGame();
            if (this.gameState === 'paused') {
                this.renderPauseOverlay();
            }
        } else if (this.gameState === 'gameOver') {
            this.renderGame();
            this.renderGameOverScreen();
        } else if (this.gameState === 'victory') {
            this.renderGame();
            this.renderVictoryScreen();
        }
        
        this.ctx.restore();
        
        // Flash effect
        if (this.flashEffect && this.flashEffect.duration > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.flashEffect.intensity * (this.flashEffect.duration / 20);
            this.ctx.fillStyle = this.flashEffect.color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }
    
    renderLoadingScreen() {
        // Background
        this.ctx.fillStyle = 'linear-gradient(135deg, #2c3e50, #34495e)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIRST OFF', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Brooklyn Street Challenge', this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        // Loading bar
        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height / 2 + 60;
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        const progress = Math.min(1, this.frameCount / 120);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);
        
        this.ctx.textAlign = 'left';
    }
    
    renderMainMenu() {
        // Brooklyn skyline background
        this.renderBrooklynBackground();
        
        // Overlay
        this.ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIRST OFF', this.canvas.width / 2, 150);
        
        // Character selection
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Choose Your Character', this.canvas.width / 2, 220);
        
        // Character previews
        const tireekX = this.canvas.width / 2 - 100;
        const trystonX = this.canvas.width / 2 + 100;
        const charY = 300;
        
        // Tireek
        this.ctx.fillStyle = this.characters.tireek.color;
        this.ctx.fillRect(tireekX - 30, charY - 40, 60, 80);
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('TIREEK', tireekX, charY + 60);
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.fillText('Powerful Punch', tireekX, charY + 80);
        
        // Tryston
        this.ctx.fillStyle = this.characters.tryston.color;
        this.ctx.fillRect(trystonX - 30, charY - 40, 60, 80);
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('TRYSTON', trystonX, charY + 60);
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.fillText('Knockback Yell', trystonX, charY + 80);
        
        // Selected character indicator
        const selectedX = this.currentCharacter === 'tireek' ? tireekX : trystonX;
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(selectedX - 35, charY - 45, 70, 90);
        
        // Instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Arrow Keys: Move & Jump  |  Space: Switch Character  |  Enter: Super Move', this.canvas.width / 2, 450);
        this.ctx.fillText('Press SPACE to start!', this.canvas.width / 2, 500);
        
        // High Score
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, 550);
        
        this.ctx.textAlign = 'left';
        
        // Handle menu input
        if (this.keys.left || this.keys.right) {
            this.switchCharacter();
            this.keys.left = this.keys.right = false;
        }
        
        if (this.keys.jump || this.touchControls.jump) {
            this.startGame();
        }
    }
    
    renderGame() {
        // Brooklyn street background
        this.renderBrooklynBackground();
        
        // Ground
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        
        // Street markings
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 25);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 25);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Render game objects
        this.renderObstacles();
        this.renderMicrophones();
        this.renderPlayer();
        this.renderParticles();
        this.renderUI();
        
        // Boss wave indicator
        if (this.gameTime <= this.config.game.bossWaveStart && Math.floor(this.frameCount / 30) % 2) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('BOSS WAVE!', this.canvas.width / 2, 50);
            this.ctx.textAlign = 'left';
        }
    }
    
    renderBrooklynBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.6);
        gradient.addColorStop(0, '#34495e');
        gradient.addColorStop(0.5, '#2c3e50');
        gradient.addColorStop(1, '#1a252f');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.6);
        
        // Buildings
        this.atmosphere.buildings.forEach(building => {
            this.ctx.fillStyle = building.color;
            this.ctx.fillRect(
                building.x - this.frameCount * 0.2, 
                this.canvas.height - building.height - 50,
                building.width,
                building.height
            );
            
            // Windows
            this.ctx.fillStyle = Math.random() > 0.7 ? '#f1c40f' : '#2c3e50';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < Math.floor(building.height / 20); j++) {
                    this.ctx.fillRect(
                        building.x - this.frameCount * 0.2 + 5 + i * 15,
                        this.canvas.height - building.height - 50 + 10 + j * 20,
                        8, 12
                    );
                }
            }
        });
        
        // Street lights
        this.atmosphere.streetLights.forEach(light => {
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.fillRect(light.x - this.frameCount * 0.1, light.y, 5, 100);
            
            // Light glow
            if (!light.flickering || Math.floor(this.frameCount / 10) % 2) {
                this.ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(light.x - this.frameCount * 0.1 + 2.5, light.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Graffiti
        this.atmosphere.graffiti.forEach(graf => {
            this.ctx.fillStyle = graf.color;
            this.ctx.font = `bold ${graf.size}px Arial`;
            this.ctx.fillText(graf.text, graf.x - this.frameCount * 0.05, graf.y);
        });
    }
    
    renderPlayer() {
        const character = this.characters[this.currentCharacter];
        
        // Invulnerability flashing
        if (this.player.isInvulnerable && Math.floor(this.frameCount / 5) % 2) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Character body
        this.ctx.fillStyle = character.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Character details
        this.ctx.fillStyle = character.secondaryColor;
        this.ctx.fillRect(this.player.x + 5, this.player.y + 5, this.player.width - 10, 20);
        
        // Face
        this.ctx.fillStyle = '#f4d03f';
        this.ctx.fillRect(this.player.x + 10, this.player.y + 10, 20, 20);
        
        // Eyes
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(this.player.x + 13, this.player.y + 15, 3, 3);
        this.ctx.fillRect(this.player.x + 19, this.player.y + 15, 3, 3);
        
        // Character name
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(character.name, this.player.x + this.player.width / 2, this.player.y - 5);
        this.ctx.textAlign = 'left';
        
        this.ctx.globalAlpha = 1;
    }
    
    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            
            if (obstacle.type === 'vinyl') {
                // Rotating vinyl record
                const centerX = obstacle.x + obstacle.width / 2;
                const centerY = obstacle.y + obstacle.height / 2;
                
                this.ctx.translate(centerX, centerY);
                this.ctx.rotate(obstacle.rotation);
                
                // Record
                this.ctx.fillStyle = obstacle.color;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Center hole
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Reflection lines
                this.ctx.strokeStyle = '#34495e';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 8 + i * 3, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                
            } else {
                // Gangster or homeless person
                this.ctx.fillStyle = obstacle.color;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Simple character details
                this.ctx.fillStyle = '#f4d03f';
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, 15);
                
                // Type indicator
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                const label = obstacle.type === 'gangster' ? 'G' : 'H';
                this.ctx.fillText(label, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height + 12);
                this.ctx.textAlign = 'left';
                
                // Gangster special effects
                if (obstacle.type === 'gangster') {
                    this.ctx.strokeStyle = '#9b59b6';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(obstacle.x - 2, obstacle.y - 2, obstacle.width + 4, obstacle.height + 4);
                }
            }
            
            this.ctx.restore();
        });
    }
    
    renderMicrophones() {
        this.microphones.forEach(mic => {
            const bobY = mic.y + Math.sin(mic.bobOffset) * 8;
            
            // Glow effect
            this.ctx.save();
            this.ctx.globalAlpha = mic.glow * 0.8;
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2, bobY + mic.height / 2, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            
            // Microphone body
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(mic.x, bobY, mic.width, mic.height);
            
            // Microphone head
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2, bobY + 5, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Shine
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.beginPath();
            this.ctx.arc(mic.x + mic.width / 2 - 2, bobY + 3, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            if (particle.type === 'text') {
                const alpha = particle.life / particle.maxLife;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.font = `bold ${particle.size}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(particle.text, particle.x, particle.y);
                this.ctx.restore();
                this.ctx.textAlign = 'left';
            } else {
                const alpha = particle.life / particle.maxLife;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }
    
    renderUI() {
        // UI Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, this.canvas.width - 20, 80);
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, this.canvas.width - 20, 80);
        
        // Score
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 35);
        
        // Time
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.ctx.fillText(`Time: ${timeStr}`, 20, 55);
        
        // Current character
        const character = this.characters[this.currentCharacter];
        this.ctx.fillStyle = character.color;
        this.ctx.fillText(`Character: ${character.name}`, 200, 35);
        
        // Health bar
        const healthBarX = 200;
        const healthBarY = 45;
        const healthBarWidth = 150;
        const healthBarHeight = 12;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        const healthPercent = character.currentHealth / character.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#27ae60' : 
                           healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
        
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // Super move cooldown
        const superCooldownX = 400;
        if (character.superCooldown > 0) {
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.fillText(`Super: ${Math.ceil(character.superCooldown / 60)}s`, superCooldownX, 35);
        } else {
            this.ctx.fillStyle = '#27ae60';
            this.ctx.fillText('Super: Ready!', superCooldownX, 35);
        }
        
        // Game speed indicator
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillText(`Speed: ${this.gameSpeed.toFixed(1)}x`, superCooldownX, 55);
        
        // High score
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`High: ${this.highScore}`, 600, 35);
        
        // Touch controls overlay for mobile
        if (window.innerWidth <= 768) {
            this.renderTouchControls();
        }
    }
    
    renderTouchControls() {
        const buttonSize = 50;
        const margin = 20;
        
        // Left/Right buttons
        this.drawTouchButton(margin, this.canvas.height - buttonSize - margin, buttonSize, '←', this.touchControls.left);
        this.drawTouchButton(margin + buttonSize + 10, this.canvas.height - buttonSize - margin, buttonSize, '→', this.touchControls.right);
        
        // Jump button
        this.drawTouchButton(this.canvas.width / 2 - buttonSize / 2, this.canvas.height - buttonSize - margin, buttonSize * 1.2, 'JUMP', this.touchControls.jump);
        
        // Switch/Super buttons
        this.drawTouchButton(this.canvas.width - buttonSize * 2 - margin - 10, this.canvas.height - buttonSize - margin, buttonSize, 'SWITCH', this.touchControls.switch);
        this.drawTouchButton(this.canvas.width - buttonSize - margin, this.canvas.height - buttonSize - margin, buttonSize, 'SUPER', this.touchControls.super);
    }
    
    drawTouchButton(x, y, size, text, pressed) {
        this.ctx.save();
        
        // Button background
        this.ctx.fillStyle = pressed ? 'rgba(231, 76, 60, 0.8)' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, size, size);
        
        // Button border
        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, size, size);
        
        // Button text
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = `bold ${size / 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x + size / 2, y + size / 2 + size / 8);
        
        this.ctx.restore();
        this.ctx.textAlign = 'left';
    }
    
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press P to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.textAlign = 'left';
    }
    
    renderGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        if (this.score >= this.highScore) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
        
        this.ctx.textAlign = 'left';
    }
    
    renderVictoryScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Victory text with golden glow
        this.ctx.save();
        this.ctx.shadowColor = '#f1c40f';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        this.ctx.restore();
        
        this.ctx.fillStyle = '#27ae60';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('You collected the song fragment!', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        if (this.score >= this.highScore) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to play again', this.canvas.width / 2, this.canvas.height / 2 + 100);
        
        this.ctx.textAlign = 'left';
    }
    
    // Game management
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
    }
    
    resetGame() {
        this.score = 0;
        this.gameTime = this.config.game.duration;
        this.gameSpeed = 1;
        this.frameCount = 0;
        
        // Reset characters
        Object.values(this.characters).forEach(char => {
            char.currentHealth = char.maxHealth;
            char.superCooldown = 0;
        });
        
        // Reset player
        this.player.x = 100;
        this.player.y = this.canvas.height - 120;
        this.player.velocityY = 0;
        this.player.onGround = true;
        this.player.isInvulnerable = false;
        this.player.invulnerabilityTime = 0;
        
        // Clear arrays
        this.obstacles = [];
        this.microphones = [];
        this.particles = [];
        
        this.gameState = 'playing';
    }
    
    loadHighScore() {
        return parseInt(localStorage.getItem('firstOffHighScore') || '0');
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('firstOffHighScore', this.highScore.toString());
        }
    }
    
    // Game loop
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            // Update
            this.updatePlayer();
            this.updateObstacles();
            this.updateMicrophones();
            this.updateParticles();
            this.updateGameLogic();
            
            // Render
            this.render();
            
            // Continue loop
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    // Set up page styles
    document.body.style.margin = '0';
    document.body.style.padding = '20px';
    document.body.style.backgroundColor = '#2c3e50';
    document.body.style.display = 'flex';
    document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'center';
    document.body.style.minHeight = '100vh';
    document.body.style.fontFamily = 'Arial, sans-serif';
    
    // Create game instance
    const game = new FirstOffGame();
    
    // Make game globally accessible for debugging
    window.firstOffGame = game;
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.firstOffGame) {
        // Responsive adjustments could be added here
    }
});