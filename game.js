// BULWARK 1475 - SNES-Style Castle Defense Game
// Game Engine and Logic

// ===== GAME STATE =====
const game = {
    state: 'title', // title, instructions, playing, paused, gameOver
    gold: 200,
    lives: 5,
    wave: 0,
    score: 0,
    enemiesDefeated: 0,
    selectedTower: null,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    waveActive: false,
    enemiesInWave: 0,
    enemiesSpawned: 0
};

// ===== CANVAS SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// ===== CONSTANTS =====
const GRID_SIZE = 40;
const CASTLE_X = 750;
const CASTLE_Y = 200;
const SPAWN_X = 50;
const SPAWN_POINTS = [100, 200, 300, 400];

// Tower configurations
const TOWER_TYPES = {
    archer: {
        cost: 50,
        damage: 20,
        range: 150,
        fireRate: 800,
        color: '#27ae60',
        projectileColor: '#8B4513',
        name: 'Archer'
    },
    cannon: {
        cost: 100,
        damage: 60,
        range: 180,
        fireRate: 1500,
        color: '#7f8c8d',
        projectileColor: '#34495e',
        name: 'Cannon'
    },
    mage: {
        cost: 150,
        damage: 15,
        range: 200,
        fireRate: 600,
        color: '#9b59b6',
        projectileColor: '#e74c3c',
        aoe: 60,
        name: 'Mage'
    },
    barricade: {
        cost: 75,
        health: 200,
        color: '#95a5a6',
        isWall: true,
        name: 'Wall'
    }
};

// Enemy configurations
const ENEMY_TYPES = {
    goblin: {
        health: 50,
        speed: 1.2,
        damage: 1,
        gold: 10,
        score: 10,
        color: '#27ae60',
        size: 15
    },
    orc: {
        health: 100,
        speed: 0.8,
        damage: 2,
        gold: 20,
        score: 25,
        color: '#e67e22',
        size: 18
    },
    troll: {
        health: 200,
        speed: 0.5,
        damage: 3,
        gold: 40,
        score: 50,
        color: '#c0392b',
        size: 22
    },
    dragon: {
        health: 400,
        speed: 0.6,
        damage: 5,
        gold: 100,
        score: 150,
        color: '#8e44ad',
        size: 28
    }
};

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    ['title-screen', 'instructions-screen', 'game-screen', 'game-over-screen'].forEach(id => {
        const screen = document.getElementById(id);
        if (screen) screen.style.display = 'none';
    });
    const screen = document.getElementById(screenId);
    if (screen) screen.style.display = 'block';
}

// ===== UI EVENT HANDLERS =====
function initUI() {
    const startBtn = document.getElementById('start-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');
    const menuBtn = document.getElementById('menu-btn');
    const nextWaveBtn = document.getElementById('next-wave-btn');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (instructionsBtn) instructionsBtn.addEventListener('click', () => showScreen('instructions-screen'));
    if (backBtn) backBtn.addEventListener('click', () => showScreen('title-screen'));
    if (restartBtn) restartBtn.addEventListener('click', startGame);
    if (menuBtn) menuBtn.addEventListener('click', () => {
        showScreen('title-screen');
        game.state = 'title';
    });
    if (nextWaveBtn) nextWaveBtn.addEventListener('click', startNextWave);

    // Tower selection
    document.querySelectorAll('.tower-option').forEach(option => {
        option.addEventListener('click', () => {
            const towerType = option.dataset.tower;
            const cost = parseInt(option.dataset.cost);
            if (game.gold >= cost) {
                game.selectedTower = towerType;
                updateTowerSelection();
            }
        });
    });

    // Canvas click for tower placement
    if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleMouseMove);
    }

    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
}

let mouseX = 0, mouseY = 0;

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}

function handleCanvasClick(e) {
    if (game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (game.selectedTower) {
        placeTower(x, y);
    }
}

function handleKeyPress(e) {
    if (game.state !== 'playing') return;

    // Tower selection keys 1-4
    if (e.key >= '1' && e.key <= '4') {
        const towers = ['archer', 'cannon', 'mage', 'barricade'];
        const towerType = towers[parseInt(e.key) - 1];
        const cost = TOWER_TYPES[towerType].cost;
        if (game.gold >= cost) {
            game.selectedTower = towerType;
            updateTowerSelection();
        }
    }

    // Space to start wave
    if (e.key === ' ' && !game.waveActive) {
        e.preventDefault();
        startNextWave();
    }

    // ESC to pause (future feature)
    if (e.key === 'Escape') {
        // game.state = game.state === 'playing' ? 'paused' : 'playing';
    }
}

function updateTowerSelection() {
    document.querySelectorAll('.tower-option').forEach(option => {
        option.classList.remove('selected');
        const cost = parseInt(option.dataset.cost);
        if (game.gold < cost) {
            option.classList.add('disabled');
        } else {
            option.classList.remove('disabled');
        }
        if (option.dataset.tower === game.selectedTower) {
            option.classList.add('selected');
        }
    });
}

// ===== TOWER PLACEMENT =====
function placeTower(x, y) {
    const towerConfig = TOWER_TYPES[game.selectedTower];

    // Check if can afford
    if (game.gold < towerConfig.cost) return;

    // Check if valid placement (not too close to castle, not on other towers)
    if (Math.abs(x - CASTLE_X) < 80 && Math.abs(y - CASTLE_Y) < 80) return;

    for (let tower of game.towers) {
        const dist = Math.hypot(x - tower.x, y - tower.y);
        if (dist < 35) return;
    }

    // Create tower
    const tower = {
        x,
        y,
        type: game.selectedTower,
        ...towerConfig,
        lastFire: 0,
        target: null
    };

    game.towers.push(tower);
    game.gold -= towerConfig.cost;
    updateHUD();
    playSound('place');
}

// ===== WAVE MANAGEMENT =====
function startNextWave() {
    if (game.waveActive) return;

    game.wave++;
    game.waveActive = true;
    game.enemiesSpawned = 0;

    // Calculate enemies for this wave
    const baseEnemies = 5 + game.wave * 2;
    game.enemiesInWave = baseEnemies;

    updateHUD();
    spawnEnemies();

    const btn = document.getElementById('next-wave-btn');
    if (btn) btn.disabled = true;
}

function spawnEnemies() {
    if (game.enemiesSpawned >= game.enemiesInWave) return;

    // Determine enemy type based on wave
    let enemyType = 'goblin';
    if (game.wave >= 10) enemyType = 'dragon';
    else if (game.wave >= 6) enemyType = 'troll';
    else if (game.wave >= 3) enemyType = 'orc';

    // Mix in some harder enemies occasionally
    if (game.wave >= 5 && Math.random() < 0.3) {
        const types = ['orc', 'troll', 'dragon'];
        enemyType = types[Math.min(Math.floor(game.wave / 4), 2)];
    }

    const enemyConfig = ENEMY_TYPES[enemyType];
    const spawnY = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];

    const enemy = {
        x: SPAWN_X,
        y: spawnY,
        type: enemyType,
        ...enemyConfig,
        maxHealth: enemyConfig.health,
        targetX: CASTLE_X,
        targetY: CASTLE_Y
    };

    game.enemies.push(enemy);
    game.enemiesSpawned++;

    // Schedule next spawn
    if (game.enemiesSpawned < game.enemiesInWave) {
        setTimeout(spawnEnemies, 1000 - game.wave * 20);
    }
}

// ===== GAME LOOP =====
let lastTime = 0;

function gameLoop(timestamp) {
    if (!ctx) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (game.state === 'playing') {
        update(deltaTime);
        render();
    }

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update enemies
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];

        // Move towards castle
        const dx = enemy.targetX - enemy.x;
        const dy = enemy.targetY - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 30) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        } else {
            // Reached castle
            game.lives -= enemy.damage;
            game.enemies.splice(i, 1);
            updateHUD();
            playSound('damage');

            if (game.lives <= 0) {
                gameOver();
            }
            continue;
        }
    }

    // Update towers
    for (let tower of game.towers) {
        if (tower.isWall) continue;

        // Find target
        tower.target = null;
        let closestDist = tower.range;

        for (let enemy of game.enemies) {
            const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
            if (dist < closestDist) {
                closestDist = dist;
                tower.target = enemy;
            }
        }

        // Fire at target
        if (tower.target && Date.now() - tower.lastFire > tower.fireRate) {
            fireTower(tower);
            tower.lastFire = Date.now();
        }
    }

    // Update projectiles
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const proj = game.projectiles[i];

        if (!proj.target || proj.target.health <= 0) {
            game.projectiles.splice(i, 1);
            continue;
        }

        const dx = proj.target.x - proj.x;
        const dy = proj.target.y - proj.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 10) {
            // Hit target
            hitEnemy(proj.target, proj.damage, proj.aoe, proj.x, proj.y);
            game.projectiles.splice(i, 1);
        } else {
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
        }
    }

    // Update particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.life -= deltaTime;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity

        if (p.life <= 0) {
            game.particles.splice(i, 1);
        }
    }

    // Check if wave is complete
    if (game.waveActive && game.enemies.length === 0 && game.enemiesSpawned >= game.enemiesInWave) {
        game.waveActive = false;
        game.gold += 50 + game.wave * 10; // Wave completion bonus
        updateHUD();

        const btn = document.getElementById('next-wave-btn');
        if (btn) btn.disabled = false;
    }
}

function fireTower(tower) {
    const projectile = {
        x: tower.x,
        y: tower.y,
        target: tower.target,
        damage: tower.damage,
        speed: 5,
        color: tower.projectileColor,
        aoe: tower.aoe || 0
    };

    game.projectiles.push(projectile);
    playSound('shoot');
}

function hitEnemy(enemy, damage, aoe, x, y) {
    enemy.health -= damage;

    // AoE damage
    if (aoe) {
        for (let e of game.enemies) {
            if (e !== enemy) {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist < aoe) {
                    e.health -= damage * 0.5;
                }
            }
        }
        createExplosion(x, y, aoe);
    }

    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    const index = game.enemies.indexOf(enemy);
    if (index > -1) {
        game.enemies.splice(index, 1);
        game.gold += enemy.gold;
        game.score += enemy.score;
        game.enemiesDefeated++;
        updateHUD();
        createParticles(enemy.x, enemy.y, enemy.color);
        playSound('kill');
    }
}

// ===== RENDERING =====
function render() {
    // Clear canvas
    ctx.fillStyle = '#2d4739';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw path indicator
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.lineWidth = 40;
    SPAWN_POINTS.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(SPAWN_X, y);
        ctx.lineTo(CASTLE_X, CASTLE_Y);
        ctx.stroke();
    });

    // Draw castle
    drawCastle();

    // Draw towers
    for (let tower of game.towers) {
        drawTower(tower);
    }

    // Draw enemies
    for (let enemy of game.enemies) {
        drawEnemy(enemy);
    }

    // Draw projectiles
    for (let proj of game.projectiles) {
        drawProjectile(proj);
    }

    // Draw particles
    for (let p of game.particles) {
        drawParticle(p);
    }

    // Draw tower preview
    if (game.selectedTower && mouseX && mouseY) {
        drawTowerPreview(mouseX, mouseY);
    }
}

function drawCastle() {
    const x = CASTLE_X;
    const y = CASTLE_Y;

    // Castle base
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x - 30, y - 20, 60, 40);

    // Castle top
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(x - 35, y - 40, 70, 20);

    // Crenellations
    ctx.fillStyle = '#7f8c8d';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x - 30 + i * 15, y - 50, 10, 10);
    }

    // Door
    ctx.fillStyle = '#34495e';
    ctx.fillRect(x - 10, y, 20, 20);

    // Flag
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 50);
    ctx.lineTo(x, y - 75);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x, y - 75);
    ctx.lineTo(x + 15, y - 68);
    ctx.lineTo(x, y - 61);
    ctx.fill();
}

function drawTower(tower) {
    ctx.save();

    if (tower.isWall) {
        // Draw wall/barricade
        ctx.fillStyle = tower.color;
        ctx.fillRect(tower.x - 15, tower.y - 15, 30, 30);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect(tower.x - 15, tower.y - 15, 30, 30);

        // Health bar
        if (tower.health < 200) {
            const healthPercent = tower.health / 200;
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(tower.x - 15, tower.y - 25, 30, 4);
            ctx.fillStyle = healthPercent > 0.3 ? '#27ae60' : '#e74c3c';
            ctx.fillRect(tower.x - 15, tower.y - 25, 30 * healthPercent, 4);
        }
    } else {
        // Draw attacking tower
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Range indicator when selected
        if (game.selectedTower === tower.type) {
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw weapon indicator
        ctx.fillStyle = '#2c3e50';
        if (tower.target) {
            const angle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
            ctx.save();
            ctx.translate(tower.x, tower.y);
            ctx.rotate(angle);
            ctx.fillRect(8, -2, 8, 4);
            ctx.restore();
        } else {
            ctx.fillRect(tower.x + 8, tower.y - 2, 8, 4);
        }
    }

    ctx.restore();
}

function drawEnemy(enemy) {
    // Enemy body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Enemy outline
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Health bar
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(enemy.x - 15, enemy.y - enemy.size / 2 - 8, 30, 4);
    ctx.fillStyle = healthPercent > 0.5 ? '#27ae60' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(enemy.x - 15, enemy.y - enemy.size / 2 - 8, 30 * healthPercent, 4);
}

function drawProjectile(proj) {
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.aoe ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    if (proj.aoe) {
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawTowerPreview(x, y) {
    const tower = TOWER_TYPES[game.selectedTower];

    // Range
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.lineWidth = 2;
    if (tower.range) {
        ctx.beginPath();
        ctx.arc(x, y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Tower preview
    ctx.globalAlpha = 0.6;
    if (tower.isWall) {
        ctx.fillStyle = tower.color;
        ctx.fillRect(x - 15, y - 15, 30, 30);
    } else {
        ctx.fillStyle = tower.color;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawParticle(p) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 1000;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
}

// ===== EFFECTS =====
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        game.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            life: 500 + Math.random() * 500,
            color,
            size: 3 + Math.random() * 3
        });
    }
}

function createExplosion(x, y, radius) {
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        game.particles.push({
            x,
            y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 300,
            color: '#e74c3c',
            size: 4
        });
    }
}

// ===== SOUND =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;

    switch(type) {
        case 'shoot':
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'kill':
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'damage':
            oscillator.frequency.value = 100;
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
        case 'place':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;
    }
}

// ===== HUD UPDATE =====
function updateHUD() {
    const goldEl = document.getElementById('gold');
    const waveEl = document.getElementById('wave');
    const livesEl = document.getElementById('lives');
    const scoreEl = document.getElementById('score');

    if (goldEl) goldEl.textContent = game.gold;
    if (waveEl) waveEl.textContent = game.wave;
    if (scoreEl) scoreEl.textContent = game.score;
    if (livesEl) {
        livesEl.textContent = '❤️'.repeat(Math.max(0, game.lives));
    }

    updateTowerSelection();
}

// ===== GAME FLOW =====
function startGame() {
    game.state = 'playing';
    game.gold = 200;
    game.lives = 5;
    game.wave = 0;
    game.score = 0;
    game.enemiesDefeated = 0;
    game.selectedTower = null;
    game.towers = [];
    game.enemies = [];
    game.projectiles = [];
    game.particles = [];
    game.waveActive = false;
    game.enemiesInWave = 0;
    game.enemiesSpawned = 0;

    showScreen('game-screen');
    updateHUD();

    const btn = document.getElementById('next-wave-btn');
    if (btn) btn.disabled = false;
}

function gameOver() {
    game.state = 'gameOver';

    const finalScore = document.getElementById('final-score');
    const finalWave = document.getElementById('final-wave');
    const enemiesDefeated = document.getElementById('enemies-defeated');

    if (finalScore) finalScore.textContent = game.score;
    if (finalWave) finalWave.textContent = game.wave;
    if (enemiesDefeated) enemiesDefeated.textContent = game.enemiesDefeated;

    showScreen('game-over-screen');
}

// ===== INITIALIZATION =====
function init() {
    initUI();
    if (ctx) {
        requestAnimationFrame(gameLoop);
    }
}

// Start the game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
