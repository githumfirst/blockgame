/**
 * Cyberpunk Neon Block Breaker
 * Built with Phaser 3.60+ (Arcade Physics)
 */

const CONFIG = {
    width: 1080,
    height: 1920,
    backgroundColor: '#050510',
    colors: {
        primary: 0x00ffff,   // Cyan
        secondary: 0xff00ff, // Magenta
        accent: 0xffff00,    // Yellow
        danger: 0xff0000,    // Red
        text: '#0ff'
    }
};

const PHASER_CONFIG = {
    type: Phaser.AUTO,
    width: CONFIG.width,
    height: CONFIG.height,
    parent: 'game-container',
    backgroundColor: CONFIG.backgroundColor,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Enable debug to visualize bodies
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        noAudio: true // Disable Phaser audio to prevent conflicts/errors with custom AudioSynth
    }
};

// Global Variables
let game;
let paddle;
let blocks;
let lasers;
let items;
let cursors;
let GameState = {
    isGameActive: false,
    isMenuActive: false,
    upgrades: [],
    lastFired: 0,
    score: 0,
    lives: 3,
    level: 1,
    laserLevel: 0,
    paddleWidthLevel: 0
};

// High Score System
const HighScoreManager = {
    getScores: function () {
        const stored = localStorage.getItem('blockBreakerScores');
        return stored ? JSON.parse(stored) : [100, 100, 100];
    },
    saveScore: function (score) {
        let scores = this.getScores();
        scores.push(score);
        scores.sort((a, b) => b - a);
        scores = scores.slice(0, 3);
        localStorage.setItem('blockBreakerScores', JSON.stringify(scores));
        return scores;
    },
    isHighScore: function (score) {
        const scores = this.getScores();
        // Check if score is higher than the lowest score or if list is not full
        return scores.length < 3 || score > scores[scores.length - 1];
    }
};

let scoreText;
let livesText;
let introText;

// --- Audio System (Procedural) ---
const AudioSynth = {
    ctx: null,

    init: function () {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playExplosion: function () {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    playShoot: function () {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playPowerup: function () {
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.1), 100);
        setTimeout(() => this.playTone(1200, 'sine', 0.2), 200);
    }
};


// Initialize Game
window.onload = function () {
    game = new Phaser.Game(PHASER_CONFIG);
};

function preload() {
    // Assets
    const paddleGfx = this.make.graphics().fillStyle(CONFIG.colors.primary).fillRoundedRect(0, 0, 100, 20, 10);
    paddleGfx.generateTexture('paddle', 100, 20);

    const ballGfx = this.make.graphics().fillStyle(0xffffff).fillCircle(8, 8, 8);
    ballGfx.generateTexture('ball', 16, 16);

    const blockGfx = this.make.graphics();
    blockGfx.lineStyle(2, 0xffffff);
    blockGfx.strokeRect(0, 0, 64, 32);
    blockGfx.fillStyle(0xffffff, 1); // Full opacity for visibility check
    blockGfx.fillRect(0, 0, 64, 32);
    blockGfx.generateTexture('block_base', 64, 32);

    const particleGfx = this.make.graphics().fillStyle(0xffffff).fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);

    const laserGfx = this.make.graphics().fillStyle(CONFIG.colors.accent).fillRect(0, 0, 6, 30);
    laserGfx.generateTexture('laser', 6, 30);

    const itemGfx = this.make.graphics();
    itemGfx.fillStyle(CONFIG.colors.secondary);
    itemGfx.beginPath();
    itemGfx.moveTo(12, 0);
    itemGfx.lineTo(24, 12);
    itemGfx.lineTo(12, 24);
    itemGfx.lineTo(0, 12);
    itemGfx.closePath();
    itemGfx.fillPath();
    itemGfx.generateTexture('item', 24, 24);
}

function create() {
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Reset Game State on Start/Restart
    GameState.isGameActive = false;
    GameState.isMenuActive = false;

    // Dynamic Background
    this.grid = this.add.grid(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 80, 80, 0x000000, 0, 0x00ffff, 0.05);

    // Glow FX
    if (this.renderer.pipelines) {
        this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
    }

    cursors = this.input.keyboard.createCursorKeys();
    this.input.addPointer(1);

    blocks = this.physics.add.staticGroup();
    balls = this.physics.add.group({
        bounceX: 1, bounceY: 1, collideWorldBounds: true
    });
    lasers = this.physics.add.group();
    items = this.physics.add.group();

    createPaddle(this);
    createBall(this);
    loadLevel(this, GameState.level);

    this.physics.add.collider(balls, paddle, handlePaddleCollision, null, this);
    this.physics.add.collider(balls, blocks, handleBlockCollision, null, this);
    this.physics.add.overlap(lasers, blocks, handleLaserCollision, null, this);
    this.physics.add.overlap(paddle, items, collectItem, null, this);

    this.input.on('pointermove', (p) => {
        paddle.x = Phaser.Math.Clamp(p.x, paddle.width / 2, CONFIG.width - paddle.width / 2);
    });

    // Start Game Input
    this.input.on('pointerdown', () => {
        if (!AudioSynth.ctx) AudioSynth.init();
        if (GameState.isMenuActive) return;

        if (!GameState.isGameActive) startGame(this);
        else if (GameState.upgrades.includes('laser')) fireLaser(this);
    });

    this.input.keyboard.on('keydown', (event) => {
        if (GameState.isMenuActive) return;
        if (!GameState.isGameActive) {
            if (!AudioSynth.ctx) AudioSynth.init();
            startGame(this);
        }
    });

    createUI(this);
}

function update(time, delta) {
    // Keyboard Input
    if (cursors.left.isDown) {
        paddle.setVelocityX(-600);
    } else if (cursors.right.isDown) {
        paddle.setVelocityX(600);
    } else {
        paddle.setVelocityX(0);
    }

    // Action Input (Space/Up for manual fire if supported)
    if (Phaser.Input.Keyboard.JustDown(cursors.space) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        if (!AudioSynth.ctx) AudioSynth.init();
        if (GameState.isMenuActive) return;
        // Start handled by keydown listener above for global keys
        if (GameState.isGameActive && GameState.upgrades.includes('laser')) fireLaser(this);
    }

    // Auto-Fire Logic
    if (GameState.isGameActive && !GameState.isMenuActive && GameState.upgrades.includes('laser')) {
        if (time > GameState.lastFired + 400) { // Fire every 400ms
            fireLaser(this);
            GameState.lastFired = time;
        }
    }

    // Item Cleanup
    items.children.each(item => {
        if (item.y > CONFIG.height) item.destroy();
    });

    if (!GameState.isGameActive) {
        balls.getChildren().forEach(ball => {
            if (ball.getData('locked')) {
                ball.x = paddle.x;
                ball.y = paddle.y - 25;
            }
        });
    } else {
        const activeBalls = balls.getChildren().filter(b => b.y < CONFIG.height);
        if (activeBalls.length === 0 && balls.getLength() > 0) {
            loseLife(this);
        }

        // Audio beat visual sync
        const beat = Math.sin(time / 200);
        this.grid.alpha = 0.05 + Math.abs(beat) * 0.05;

        lasers.children.each(laser => {
            if (laser.y < 0) laser.destroy();
        });
    }
}

function createPaddle(scene) {
    paddle = scene.physics.add.image(CONFIG.width / 2, CONFIG.height - 150, 'paddle').setImmovable();
    paddle.setCollideWorldBounds(true);
    if (paddle.preFX) paddle.preFX.addGlow(CONFIG.colors.primary, 4, 0, false, 0.1, 10);
}

function createBall(scene) {
    const ball = balls.create(paddle.x, paddle.y - 25, 'ball');
    ball.setData('locked', true);
    ball.setCircle(8);

    const particles = scene.add.particles(0, 0, 'particle', {
        speed: 10,
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 150,
        follow: ball,
        tint: CONFIG.colors.primary
    });
    ball.setData('trail', particles);

    if (ball.preFX) ball.preFX.addGlow(CONFIG.colors.primary, 2, 0, false, 0.1, 10);
    return ball;
}

function startGame(scene) {
    GameState.isGameActive = true;

    // Hide Start Screen Elements
    if (scene.startScreenElements) {
        scene.startScreenElements.forEach(el => el.destroy());
        scene.startScreenElements = [];
    }

    balls.getChildren().forEach(ball => {
        if (ball.getData('locked')) {
            ball.setData('locked', false);
            ball.setVelocity(Phaser.Math.Between(-50, 50), -600);
            AudioSynth.playShoot(); // Launch sound
        }
    });
}

function loadLevel(scene, level) {
    console.log('Loading Level ' + level);
    blocks.clear(true, true);

    // Explicitly define grid properties for 1080p
    const rows = 5; // Reduced to 5 rows as requested
    const cols = 10;
    const blockWidth = 80;
    const blockHeight = 40;
    const padding = 20;

    const totalWidth = cols * blockWidth + (cols - 1) * padding;
    const startX = (CONFIG.width - totalWidth) / 2 + blockWidth / 2;

    const colors = [CONFIG.colors.primary, CONFIG.colors.secondary, CONFIG.colors.accent, CONFIG.colors.danger];

    console.log(`Grid Info: Rows=${rows}, Cols=${cols}, StartX=${startX}`);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Remove random skip for debugging visibility
            // if (Math.random() > 0.9) continue;

            const bx = startX + x * (blockWidth + padding);
            const by = 350 + y * (blockHeight + padding); // Start lower to avoid title overlap

            const block = blocks.create(bx, by, 'block_base');
            block.setDisplaySize(blockWidth, blockHeight);
            block.refreshBody(); // Sync physics body with display size

            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            block.setTint(randomColor);

            // Debug: Ensure visible
            block.setAlpha(1);
            block.setVisible(true);

            // Disable debug lines for blocks (User Request: Only Paddle/Ball)
            if (block.body) {
                block.body.debugShowBody = false;
                block.body.debugShowVelocity = false;
            }
        }
    }
    console.log(`Blocks created: ${blocks.getLength()}`);
}

function handlePaddleCollision(paddle, ball) {
    AudioSynth.playTone(440, 'triangle', 0.1); // Bounce sound

    let diff = 0;
    if (ball.x < paddle.x) {
        diff = paddle.x - ball.x;
        ball.setVelocityX(-10 * diff);
    } else {
        diff = ball.x - paddle.x;
        ball.setVelocityX(10 * diff);
    }

    paddle.scene.tweens.add({
        targets: paddle,
        y: paddle.y + 2,
        duration: 50,
        yoyo: true
    });
}

function handleBlockCollision(ball, block) {
    destroyBlock(this, block);
    this.cameras.main.shake(50, 0.005);
}

function handleLaserCollision(laser, block) {
    laser.destroy();
    destroyBlock(this, block);
}

function destroyBlock(scene, block) {
    AudioSynth.playExplosion();

    const x = block.x;
    const y = block.y;
    const tint = block.tintTopLeft;

    block.destroy();

    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        lifespan: 300,
        tint: tint,
        quantity: 10
    });
    scene.time.delayedCall(350, () => emitter.destroy());

    GameState.score += 10;
    scoreText.setText(`SCORE: ${GameState.score}`);

    if (blocks.countActive() === 0) {
        winLevel(scene);
    } else {
        // Chance to drop item (20%)
        if (Math.random() < 0.2) {
            spawnItem(scene, x, y);
        }
    }
}

function spawnItem(scene, x, y) {
    const item = items.create(x, y, 'item');
    item.setVelocityY(150);
    // Add glow
    if (item.preFX) item.preFX.addGlow(CONFIG.colors.secondary, 2, 0, false, 0.1, 10);

    // Disable debug lines for items (User Request: Only Paddle/Ball)
    if (item.body) {
        item.body.debugShowBody = false;
        item.body.debugShowVelocity = false;
    }
}

function collectItem(paddle, item) {
    item.destroy();
    AudioSynth.playPowerup();

    // Random effect
    const rand = Math.random();
    if (rand < 0.4) {
        GameState.laserLevel++;
        if (!GameState.upgrades.includes('laser')) {
            GameState.upgrades.push('laser');
            // Visual feedback
            const txt = paddle.scene.add.text(paddle.x, paddle.y - 60, 'LASER!', { fontFamily: 'Orbitron', fontSize: '80px', color: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
            paddle.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
        } else {
            // Already has laser, level up!
            const txt = paddle.scene.add.text(paddle.x, paddle.y - 60, 'LASER UP!', { fontFamily: 'Orbitron', fontSize: '80px', color: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
            paddle.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
        }

        // Apply width upgrade every time laser is picked up (Max 3 times)
        if (GameState.paddleWidthLevel < 3) {
            paddle.scaleX *= 1.25;
            paddle.body.updateFromGameObject();
            GameState.paddleWidthLevel++;
        }
    } else if (rand < 0.7) {
        applyUpgrade(paddle.scene, 'multiball');
        const txt = paddle.scene.add.text(paddle.x, paddle.y - 60, 'MULTI-BALL!', { fontFamily: 'Orbitron', fontSize: '80px', color: '#0ff', fontStyle: 'bold' }).setOrigin(0.5);
        paddle.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    } else {
        const txt = paddle.scene.add.text(paddle.x, paddle.y - 60, '+100', { fontFamily: 'Orbitron', fontSize: '80px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        paddle.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
        GameState.score += 100;
    }
}

function fireLaser(scene) {
    if (!GameState.isGameActive || GameState.isMenuActive) return;
    AudioSynth.playShoot();
    const l1 = lasers.create(paddle.x - 20, paddle.y - 10, 'laser');
    const l2 = lasers.create(paddle.x + 20, paddle.y - 10, 'laser');

    // Scale and speed based on level
    const speed = -600 - (GameState.laserLevel * 100);
    const scale = 1 + (GameState.laserLevel * 0.5);

    l1.setVelocityY(speed);
    l2.setVelocityY(speed);

    l1.scaleX = scale;
    l2.scaleX = scale;

    // Disable debug lines for lasers (User Request: Only Paddle/Ball)
    if (l1.body) {
        l1.body.debugShowBody = false;
        l1.body.debugShowVelocity = false;
    }
    if (l2.body) {
        l2.body.debugShowBody = false;
        l2.body.debugShowVelocity = false;
    }
}

function winLevel(scene) {
    GameState.isGameActive = false;
    GameState.isMenuActive = true;
    scene.physics.pause();
    balls.setVelocity(0, 0);
    showUpgradeMenu(scene);
}

function showUpgradeMenu(scene) {
    const overlay = scene.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0x000000, 0.8).setInteractive();

    const title = scene.add.text(CONFIG.width / 2, CONFIG.height * 0.3, 'LEVEL COMPLETE', {
        fontFamily: 'Orbitron', fontSize: '60px', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const sub = scene.add.text(CONFIG.width / 2, CONFIG.height * 0.3 + 80, 'CHOOSE AN UPGRADE', {
        fontFamily: 'Orbitron', fontSize: '30px', color: CONFIG.colors.primary
    }).setOrigin(0.5);

    const options = [
        { name: 'MULTI-BALL', desc: 'Spawn 2 extra balls', key: 'multiball' },
        { name: 'LASER PADDLE', desc: 'Shoot lasers on click', key: 'laser' },
        { name: 'WIDER PADDLE', desc: 'Increase paddle size', key: 'width' },
        { name: 'EXTRA LIFE', desc: '+1 Heart', key: 'life' }
    ];

    Phaser.Utils.Array.Shuffle(options);
    const choices = options.slice(0, 3);
    const buttons = [];

    choices.forEach((opt, idx) => {
        const yPos = CONFIG.height * 0.45 + idx * 140;
        const bg = scene.add.rectangle(CONFIG.width / 2, yPos, 700, 100, 0x222222).setStrokeStyle(3, CONFIG.colors.primary).setInteractive();
        const txt = scene.add.text(CONFIG.width / 2, yPos - 15, opt.name, { fontSize: '35px', fontFamily: 'Orbitron', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        const desc = scene.add.text(CONFIG.width / 2, yPos + 25, opt.desc, { fontSize: '20px', fontFamily: 'Orbitron', color: '#aaa' }).setOrigin(0.5);

        buttons.push(bg, txt, desc);

        bg.on('pointerover', () => bg.setFillStyle(0x444444));
        bg.on('pointerout', () => bg.setFillStyle(0x222222));

        bg.on('pointerdown', () => {
            applyUpgrade(scene, opt.key);
            overlay.destroy();
            title.destroy();
            sub.destroy();
            buttons.forEach(b => b.destroy());

            nextLevel(scene);
        });
    });
}

function applyUpgrade(scene, key) {
    AudioSynth.playPowerup();
    if (key === 'multiball') {
        const primaryBall = balls.getFirstAlive();
        if (primaryBall) {
            for (let i = 0; i < 2; i++) {
                const b = createBall(scene);
                b.setData('locked', false);
                b.x = primaryBall.x;
                b.y = primaryBall.y;
                b.setVelocity(Phaser.Math.Between(-200, 200), -300);
            }
        }
    } else if (key === 'laser') {
        GameState.laserLevel++;
        if (!GameState.upgrades.includes('laser')) GameState.upgrades.push('laser');
        // User Request: Laser paddle should also widen (Max 3 times)
        if (GameState.paddleWidthLevel < 3) {
            paddle.scaleX *= 1.25;
            paddle.body.updateFromGameObject();
            GameState.paddleWidthLevel++;
        }
    } else if (key === 'width') {
        if (GameState.paddleWidthLevel < 3) {
            paddle.scaleX *= 1.25;
            paddle.body.updateFromGameObject();
            GameState.paddleWidthLevel++;
        }
    } else if (key === 'life') {
        GameState.lives++;
        livesText.setText(`LIVES: ${GameState.lives}`);
    }
}

function nextLevel(scene) {
    GameState.level++;
    scene.physics.resume();

    // Destroy ball trails before clearing balls
    balls.getChildren().forEach(ball => {
        const trail = ball.getData('trail');
        if (trail) trail.destroy();
    });

    balls.clear(true, true);
    lasers.clear(true, true);

    createBall(scene);
    loadLevel(scene, GameState.level);
    GameState.isGameActive = false;
    GameState.isMenuActive = false;
    introText.alpha = 1;
    introText.setText('LEVEL ' + GameState.level + '\nTAP TO START');
}

function loseLife(scene) {
    GameState.lives--;
    livesText.setText(`LIVES: ${GameState.lives}`);

    // Always set inactive to stop game loop logic
    GameState.isGameActive = false;

    if (GameState.lives <= 0) {
        gameOver(scene);
    } else {
        // Destroy ball trails before clearing balls
        balls.getChildren().forEach(ball => {
            const trail = ball.getData('trail');
            if (trail) trail.destroy();
        });

        balls.clear(true, true);
        lasers.clear(true, true);
        createBall(scene);
        introText.alpha = 1;
        introText.setText('TAP TO START');
    }
}

function gameOver(scene) {
    GameState.isMenuActive = true;
    scene.physics.pause();

    // Save Score
    const topScores = HighScoreManager.saveScore(GameState.score);

    const overlay = scene.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0x000000, 0.85);

    // Styles adjustments
    const gameOverText = scene.add.text(CONFIG.width / 2, CONFIG.height / 3, 'GAME OVER', {
        fontFamily: 'Orbitron', fontSize: '100px', color: CONFIG.colors.danger, fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    if (gameOverText.preFX) gameOverText.preFX.addGlow(CONFIG.colors.danger, 4, 0, false, 0.1, 10);

    scene.tweens.add({
        targets: gameOverText,
        y: CONFIG.height / 3 - 20,
        alpha: 1,
        duration: 800,
        ease: 'Back.out'
    });

    // Score Display
    scene.add.text(CONFIG.width / 2, CONFIG.height / 3 + 120, `FINAL SCORE: ${GameState.score}`, {
        fontFamily: 'Orbitron', fontSize: '50px', color: '#fff'
    }).setOrigin(0.5);

    // Top 3 Display
    scene.add.text(CONFIG.width / 2, CONFIG.height / 2 + 50, 'TOP THREE\nHIGH SCORES', {
        fontFamily: 'Orbitron', fontSize: '50px', color: CONFIG.colors.accent, align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5);

    topScores.forEach((s, i) => {
        scene.add.text(CONFIG.width / 2, CONFIG.height / 2 + 150 + (i * 70), `${i + 1}.  ${s}`, {
            fontFamily: 'Orbitron', fontSize: '40px', color: i === 0 ? CONFIG.colors.primary : '#ccc'
        }).setOrigin(0.5);
    });

    // Tap to Restart
    const restartText = scene.add.text(CONFIG.width / 2, CONFIG.height - 300, 'TAP TO RESTART', {
        fontFamily: 'Orbitron', fontSize: '50px', color: '#fff'
    }).setOrigin(0.5).setAlpha(0.5);

    scene.tweens.add({
        targets: restartText,
        alpha: 1,
        duration: 1000,
        yoyo: true,
        repeat: -1
    });

    // Global Restart Handler
    const restartGame = () => {
        if (!GameState.isMenuActive) return;
        GameState.score = 0;
        GameState.lives = 3;
        GameState.level = 1;
        GameState.upgrades = [];
        // State flags reset in create()
        scene.scene.restart();
    };

    // Slight delay before input accepted
    scene.time.delayedCall(500, () => {
        scene.input.once('pointerdown', restartGame);
        scene.input.keyboard.once('keydown-SPACE', restartGame);
    });
}

function createUI(scene) {
    scoreText = scene.add.text(40, 40, 'SCORE: 0', { fontFamily: 'Orbitron', fontSize: '40px', fill: CONFIG.colors.text });
    livesText = scene.add.text(CONFIG.width - 250, 40, 'LIVES: 3', { fontFamily: 'Orbitron', fontSize: '40px', fill: CONFIG.colors.text });

    // STYLISH START SCREEN GROUP
    scene.startScreenElements = [];

    // Stylish Start Screen Title
    const title = scene.add.text(CONFIG.width / 2, CONFIG.height / 3, 'NEON\nBREAKER', {
        fontFamily: 'Orbitron', fontSize: '140px', fill: CONFIG.colors.primary, align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    scene.startScreenElements.push(title);

    scene.tweens.add({
        targets: title,
        alpha: 1,
        scale: { from: 0.8, to: 1 },
        duration: 1000,
        ease: 'Elastic.out'
    });

    // Top Scores on Start
    const scores = HighScoreManager.getScores();
    const scoreTitle = scene.add.text(CONFIG.width / 2, CONFIG.height / 2 + 50, 'TOP THREE\nHIGH SCORES', {
        fontFamily: 'Orbitron', fontSize: '50px', color: CONFIG.colors.accent, align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5);
    scene.startScreenElements.push(scoreTitle);

    scores.forEach((s, i) => {
        const t = scene.add.text(CONFIG.width / 2, CONFIG.height / 2 + 150 + (i * 70), `${i + 1}.  ${s}`, {
            fontFamily: 'Orbitron', fontSize: '40px', color: '#ccc'
        }).setOrigin(0.5);
        scene.startScreenElements.push(t);
    });

    introText = scene.add.text(CONFIG.width / 2, CONFIG.height - 400, 'TAP TO START', {
        fontFamily: 'Orbitron', fontSize: '60px', fill: '#fff', align: 'center'
    }).setOrigin(0.5);
    scene.startScreenElements.push(introText);

    if (introText.preFX) introText.preFX.addGlow(CONFIG.colors.secondary, 2, 0, false, 0.1, 10);

    scene.tweens.add({
        targets: introText,
        scale: { from: 1, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1
    });
}
