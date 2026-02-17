const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, LobbyScene, GameScene, UpgradeScene]
};

const game = new Phaser.Game(config);

// --- Boot Scene ---
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Generate textures programmatically to avoid external asset dependencies
        this.createTextures();
    }

    create() {
        this.scene.start('LobbyScene');
    }

    createTextures() {
        // Ball Texture
        const ballGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        ballGraphics.fillStyle(0x00BFFF);
        ballGraphics.fillCircle(10, 10, 10);
        ballGraphics.generateTexture('ball', 20, 20);

        // Paddle Texture
        const paddleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        paddleGraphics.fillStyle(0x00BFFF);
        paddleGraphics.fillRect(0, 0, 100, 20);
        paddleGraphics.generateTexture('paddle', 100, 20);

        // Block Texture (Basic)
        const blockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        blockGraphics.fillStyle(0xffffff);
        blockGraphics.fillRect(0, 0, 50, 20);
        blockGraphics.generateTexture('block', 50, 20);

        // Particle Texture
        const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        particleGraphics.fillStyle(0xffffff);
        particleGraphics.fillRect(0, 0, 4, 4);
        particleGraphics.generateTexture('particle', 4, 4);
    }
}

// --- Lobby Scene ---
class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;

        // Load Saved Data
        this.loadData();

        // Title
        this.add.text(width / 2, height * 0.2, 'EVOLVED BLOCK BREAKER', {
            fontFamily: 'Segoe UI', fontSize: '48px', color: '#00BFFF', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Stats Display
        this.statsText = this.add.text(width / 2, height * 0.4, this.getStatsString(), {
            fontFamily: 'Segoe UI', fontSize: '24px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        // Start Button
        const startBtn = this.add.text(width / 2, height * 0.6, 'START GAME', {
            fontFamily: 'Segoe UI', fontSize: '32px', color: '#00ff00', backgroundColor: '#333', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerdown', () => this.scene.start('GameScene', { ...this.playerData }));
        startBtn.on('pointerover', () => startBtn.setStyle({ fill: '#fff' }));
        startBtn.on('pointerout', () => startBtn.setStyle({ fill: '#00ff00' }));

        // Upgrade Buttons (Mockup for simplicity)
        this.createUpgradeBtn(width / 2 - 150, height * 0.75, 'Upgrade Attack (100G)', () => this.buyUpgrade('attack'));
        this.createUpgradeBtn(width / 2 + 150, height * 0.75, 'Upgrade Speed (100G)', () => this.buyUpgrade('speed'));
    }

    createUpgradeBtn(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontFamily: 'Segoe UI', fontSize: '20px', color: '#ffcc00', backgroundColor: '#222', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', callback);
    }

    getStatsString() {
        return `Gold: ${this.playerData.gold}\nAttack Level: ${this.playerData.attackLvl}\nSpeed Level: ${this.playerData.speedLvl}`;
    }

    loadData() {
        const saved = localStorage.getItem('blockBreakerSave');
        if (saved) {
            this.playerData = JSON.parse(saved);
        } else {
            this.playerData = { gold: 0, attackLvl: 1, speedLvl: 1 };
        }
    }

    saveData() {
        localStorage.setItem('blockBreakerSave', JSON.stringify(this.playerData));
    }

    buyUpgrade(type) {
        if (this.playerData.gold >= 100) {
            this.playerData.gold -= 100;
            if (type === 'attack') this.playerData.attackLvl++;
            if (type === 'speed') this.playerData.speedLvl++;
            this.saveData();
            this.statsText.setText(this.getStatsString());
        }
    }
}

// --- Game Scene ---
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.playerStats = data;
        this.level = 1;
        this.lives = 3;
        this.score = 0;
        this.balls = null;
        this.paddle = null;
        this.bricks = null;
        this.isGameActive = false;
    }

    create() {
        this.physics.world.setBoundsCollision(true, true, true, false);

        // Paddle
        this.paddle = this.physics.add.image(this.scale.width / 2, this.scale.height - 50, 'paddle').setImmovable();
        this.paddle.setCollideWorldBounds(true);

        // Ball Group
        this.balls = this.physics.add.group({
            bounceX: 1, bounceY: 1, collideWorldBounds: true
        });

        // Initial Ball
        this.spawnBall();

        // Bricks Group
        this.bricks = this.physics.add.staticGroup();
        this.createLevel();

        // Particles
        this.particles = this.add.particles(0, 0, 'particle', {
            speed: 100, scale: { start: 1, end: 0 }, lifespan: 500, gravityY: 300
        });

        // Input
        this.input.on('pointermove', (pointer) => {
            this.paddle.x = Phaser.Math.Clamp(pointer.x, 50, this.scale.width - 50);
            if (!this.isGameActive) {
                this.balls.getChildren().forEach(ball => {
                    if (!ball.body.velocity.y) ball.x = this.paddle.x;
                });
            }
        });

        this.input.on('pointerdown', () => {
            if (!this.isGameActive) {
                this.isGameActive = true;
                this.balls.getChildren().forEach(ball => {
                    if (ball.getData('onPaddle')) {
                        ball.setVelocity(0, -400 - (this.playerStats.speedLvl * 20));
                        ball.setData('onPaddle', false);
                    }
                });
            }
        });

        // Collisions
        this.physics.add.collider(this.balls, this.paddle, this.hitPaddle, null, this);
        this.physics.add.collider(this.balls, this.bricks, this.hitBrick, null, this);

        // UI
        this.scoreText = this.add.text(20, 20, `Score: 0`, { fontSize: '20px', fill: '#fff' });
        this.livesText = this.add.text(this.scale.width - 100, 20, `Lives: ${this.lives}`, { fontSize: '20px', fill: '#fff' });
    }

    spawnBall() {
        const ball = this.balls.create(this.paddle.x, this.paddle.y - 30, 'ball');
        ball.setCircle(10);
        ball.setData('onPaddle', true);
        ball.setData('damage', this.playerStats.attackLvl);
        this.isGameActive = false;
    }

    createLevel() {
        const cols = 8;
        const rows = 5;
        const width = this.scale.width;
        const padding = 10;
        const brickWidth = (width - ((cols + 1) * padding)) / cols;
        const brickHeight = 30;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const bx = padding + x * (brickWidth + padding) + brickWidth / 2;
                const by = 80 + y * (brickHeight + padding) + brickHeight / 2;
                const brick = this.bricks.create(bx, by, 'block');
                brick.displayWidth = brickWidth;
                brick.displayHeight = brickHeight;
                brick.refreshBody();

                // Set brick color based on row
                const hue = 200 - (y * 20);
                brick.setTint(Phaser.Display.Color.GetColor32(0, hue, 255, 1));
                brick.setData('health', 1 + Math.floor(this.level / 2));
            }
        }
    }

    hitPaddle(ball, paddle) {
        let diff = 0;
        if (ball.x < paddle.x) {
            diff = paddle.x - ball.x;
            ball.setVelocityX(-10 * diff);
        } else if (ball.x > paddle.x) {
            diff = ball.x - paddle.x;
            ball.setVelocityX(10 * diff);
        } else {
            ball.setVelocityX(2 + Math.random() * 8);
        }
    }

    hitBrick(ball, brick) {
        const damage = ball.getData('damage');
        const health = brick.getData('health') - damage;
        brick.setData('health', health);

        if (health <= 0) {
            // Destruction effects
            this.particles.emitParticleAt(brick.x, brick.y, 10);

            // Generate debris with physics
            // Note: simple particles used for performance. For physics debris we would need dynamic bodies.

            brick.destroy();
            this.score += 10;
            this.scoreText.setText(`Score: ${this.score}`);

            // Chance to drop Gold (simulated)
            if (Math.random() > 0.7) {
                this.playerStats.gold += 10;
                // Visual feedback for gold would go here
            }

            if (this.bricks.countActive() === 0) {
                this.levelComplete();
            }
        } else {
            brick.setAlpha(health / (1 + Math.floor(this.level / 2)));
        }
    }

    update() {
        // Check for lost balls
        this.balls.children.each(ball => {
            if (ball.y > this.scale.height) {
                ball.destroy();
            }
        });

        if (this.balls.countActive() === 0) {
            this.lives--;
            this.livesText.setText(`Lives: ${this.lives}`);
            if (this.lives > 0) {
                this.spawnBall();
            } else {
                this.gameOver();
            }
        }
    }

    levelComplete() {
        this.scene.pause();
        this.scene.launch('UpgradeScene', {
            onSelect: (upgrade) => {
                this.applyUpgrade(upgrade);
                this.scene.stop('UpgradeScene');
                this.scene.resume();
                this.level++;
                this.createLevel();
                this.resetBall();
            }
        });
    }

    applyUpgrade(upgrade) {
        if (upgrade.id === 'multiball') {
            const ball = this.balls.getFirstAlive();
            if (ball) {
                const newBall = this.balls.create(ball.x, ball.y, 'ball');
                newBall.setCircle(10);
                newBall.setVelocity(ball.body.velocity.x * -1, ball.body.velocity.y);
                newBall.setData('damage', ball.getData('damage'));
            }
        } else if (upgrade.id === 'damage') {
            this.balls.children.each(b => b.setData('damage', b.getData('damage') + 1));
        } else if (upgrade.id === 'size') {
            this.balls.children.each(b => {
                b.setScale(1.5);
                b.setCircle(15);
            });
        } else if (upgrade.id === 'speed') {
            this.balls.children.each(b => {
                const currentVel = b.body.velocity;
                b.setVelocity(currentVel.x * 1.2, currentVel.y * 1.2);
            });
        } else if (upgrade.id === 'life') {
            this.lives++;
            this.livesText.setText(`Lives: ${this.lives}`);
        }
    }

    resetBall() {
        this.balls.clear(true, true);
        this.spawnBall();
    }

    gameOver() {
        this.playerStats.gold += Math.floor(this.score / 10);
        // Apply persistent save
        localStorage.setItem('blockBreakerSave', JSON.stringify(this.playerStats));
        this.scene.start('LobbyScene');
    }
}

// --- Upgrade Scene (Roguelike Elements) ---
class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    init(data) {
        this.onSelect = data.onSelect;
    }

    create() {
        // Blur background
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7).setOrigin(0);

        const upgrades = [
            { id: 'multiball', name: 'Multi-Ball', desc: 'Add an extra ball immediately.' },
            { id: 'damage', name: 'Power Up', desc: 'Balls deal +1 Damage.' },
            { id: 'size', name: 'Giant Ball', desc: 'Balls become larger.' },
            { id: 'speed', name: 'Fast Ball', desc: 'Increase ball speed.' }, // Not impl in apply yet
            { id: 'life', name: 'Extra Life', desc: '+1 Life.' } // Not impl in apply yet
        ];

        // Pick 3 random
        const choices = Phaser.Utils.Array.Shuffle(upgrades).slice(0, 3);

        const container = document.createElement('div');
        container.className = 'upgrade-container';

        choices.forEach(choice => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${choice.name}</h3>
                <p>${choice.desc}</p>
                <button>SELECT</button>
            `;
            card.onclick = () => {
                const uiLayer = document.getElementById('ui-layer');
                uiLayer.innerHTML = ''; // Clear UI
                this.onSelect(choice);
            };
            container.appendChild(card);
        });

        const uiLayer = document.getElementById('ui-layer');
        uiLayer.appendChild(container);
    }
}
