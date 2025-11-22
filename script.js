const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let lives = 3;

// Paddle
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// Ball
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 6; // Double the speed
let dy = -6; // Double the speed
const ballRadius = 10; // Make ball slightly bigger for 3D effect

// Bricks
const brickRowCount = 5;
const brickColumnCount = 7;
const brickWidth = 50;
const brickHeight = 15;
const brickPadding = 8;
const brickOffsetTop = 40;
const brickOffsetLeft = 35;

let rightPressed = false;
let leftPressed = false;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
document.addEventListener('mousemove', mouseMoveHandler, false);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
    }
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy;
                    b.status = 0;
                    score++;
                    if (score === brickRowCount * brickColumnCount) {
                        // All bricks cleared
                        gameState = 'win';
                    }
                }
            }
        }
    }
}

function drawBall() {
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, ballRadius);
    gradient.addColorStop(0, '#e0f7ff');
    gradient.addColorStop(1, '#00BFFF');
    
    ctx.fillStyle = gradient;
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    const x = paddleX;
    const y = canvas.height - paddleHeight;
    const w = paddleWidth;
    const h = paddleHeight;

    ctx.beginPath();
    
    // Main body
    ctx.fillStyle = '#00BFFF';
    ctx.fillRect(x, y, w, h);
    
    // Highlight
    ctx.fillStyle = '#67DFFF'; 
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y + 3);
    ctx.lineTo(x + w - 3, y + 3);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    // Shadow
    ctx.fillStyle = '#008bcc';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 3, y + h - 3);
    ctx.lineTo(x + w - 3, y + h - 3);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                const mainColor = `hsl(208, 81%, ${50 - r * 6}%)`;
                const highlightColor = `hsl(208, 81%, ${55 - r * 6}%)`;
                const shadowColor = `hsl(208, 81%, ${40 - r * 6}%)`;
                
                const w = brickWidth;
                const h = brickHeight;

                // Main body
                ctx.beginPath();
                ctx.rect(brickX, brickY, w, h);
                ctx.fillStyle = mainColor;
                ctx.fill();
                ctx.closePath();

                // Highlight
                ctx.fillStyle = highlightColor;
                ctx.beginPath();
                ctx.moveTo(brickX, brickY);
                ctx.lineTo(brickX + 3, brickY + 3);
                ctx.lineTo(brickX + w - 3, brickY + 3);
                ctx.lineTo(brickX + w, brickY);
                ctx.closePath();
                ctx.fill();

                // Shadow
                ctx.fillStyle = shadowColor;
                ctx.beginPath();
                ctx.moveTo(brickX, brickY + h);
                ctx.lineTo(brickX + 3, brickY + h - 3);
                ctx.lineTo(brickX + w - 3, brickY + h - 3);
                ctx.lineTo(brickX + w, brickY + h);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

function drawScore() {
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 8, 20);
}

function drawLives() {
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${lives}`, canvas.width - 8, 20);
}

function resetGame() {
    lives = 3;
    score = 0;
    // Reset ball and paddle position
    x = canvas.width / 2;
    y = canvas.height - 30;
    dx = 3;
    dy = -3;
    paddleX = (canvas.width - paddleWidth) / 2;
    // Reset all bricks
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r].status = 1;
        }
    }
}

function drawGameState() {
    ctx.font = '30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';

    if (gameState === 'gameOver') {
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Click to Play Again', canvas.width / 2, canvas.height / 2 + 30);
    } else if (gameState === 'win') {
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Click to Play Again', canvas.width / 2, canvas.height / 2 + 30);
    } else if (gameState === 'start') {
        ctx.fillText('CLICK TO START', canvas.width / 2, canvas.height / 2);
    }
}


let gameState = 'start'; // 'start', 'playing', 'gameOver', 'win'
canvas.addEventListener('click', () => {
    if (gameState !== 'playing') {
        resetGame();
        // A short delay to prevent the player from accidentally losing a life instantly
        setTimeout(() => {
             gameState = 'playing';
        }, 100);
    }
}, false);


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        drawBricks();
        drawBall();
        drawPaddle();
        drawScore();
        drawLives();
        collisionDetection();

        // Wall collision
        if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
            dx = -dx;
        }
        if (y + dy < ballRadius) {
            dy = -dy;
        } else if (y + dy > canvas.height - ballRadius) {
            // Paddle collision
            if (x > paddleX && x < paddleX + paddleWidth) {
                dy = -dy;
            } else { // Ball missed paddle
                lives--;
                if (!lives) {
                    gameState = 'gameOver';
                } else {
                    // Reset ball and paddle for next life
                    x = canvas.width / 2;
                    y = canvas.height - 30;
                    dx = 3;
                    dy = -3;
                    paddleX = (canvas.width - paddleWidth) / 2;
                }
            }
        }

        // Paddle movement
        if (rightPressed && paddleX < canvas.width - paddleWidth) {
            paddleX += 7;
        } else if (leftPressed && paddleX > 0) {
            paddleX -= 7;
        }

        // Move ball
        x += dx;
        y += dy;
    } else {
        // Draw non-playing states (start, game over, win)
        drawBricks(); // Draw bricks in the background
        drawScore();
        drawLives();
        drawGameState();
    }


    requestAnimationFrame(draw);
}

draw();
