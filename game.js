// ============================================================================
// BULWARK 1475 - SNES-Style Castle Defense Game
// A medieval fortress defense game with cannon combat and Tetris-like building
// ============================================================================

// ===== GAME CONSTANTS =====
const TILE_SIZE = 16;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

// Phase durations (in seconds)
const PHASE_DURATION = {
    SELECT_HOME: 15,
    PLACE_CANNONS: 15,
    COMBAT: 25,
    BUILDING: 20,
    SPLASH: 3
};

// Game phases
const PHASE = {
    TITLE: 'TITLE',
    SPLASH: 'SPLASH',
    SELECT_HOME: 'SELECT_HOME',
    PLACE_CANNONS: 'PLACE_CANNONS',
    COMBAT: 'COMBAT',
    BUILDING: 'BUILDING',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY',
    WALK_PLANK: 'WALK_PLANK'
};

// Terrain types
const TERRAIN = {
    WATER: 0,
    GRASS: 1,
    SAND: 2,
    RIVER: 3
};

// ===== GAME STATE =====
const gameState = {
    phase: PHASE.TITLE,
    level: 1,
    round: 1,
    score: 0,
    phaseTimer: 0,
    nextPhaseName: '',
    homeCastle: null,
    selectedCastle: null,
    hoveredCastle: null,
    cannonsToPlace: 0,
    activeCannon: 0,
    cannonAngle: 0,
    wallPieceIndex: 0,
    wallPieceRotation: 0,
    wallPieceX: 15,
    wallPieceY: 10,
    plankProgress: 0
};

// ===== GAME OBJECTS =====
const map = {
    terrain: [],
    walls: [],
    castles: [],
    cannons: [],
    ships: [],
    cannonballs: [],
    explosions: [],
    particles: []
};

// ===== CANVAS SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let mouseX = 0, mouseY = 0;
let mouseGridX = 0, mouseGridY = 0;
let keys = {};

// ===== WALL PIECE SHAPES (Tetris-like) =====
const WALL_PIECES = [
    // I-piece (line)
    [[1,1,1,1]],
    // O-piece (square)
    [[1,1],[1,1]],
    // T-piece
    [[1,1,1],[0,1,0]],
    // L-piece
    [[1,0],[1,0],[1,1]],
    // J-piece
    [[0,1],[0,1],[1,1]],
    // S-piece
    [[0,1,1],[1,1,0]],
    // Z-piece
    [[1,1,0],[0,1,1]]
];

// ===== CASTLE POSITIONS FOR EACH LEVEL =====
const LEVEL_CASTLES = [
    // Level 1
    [
        {x: 8, y: 8}, {x: 25, y: 8}, {x: 8, y: 20},
        {x: 25, y: 20}, {x: 16, y: 14}
    ],
    // Level 2
    [
        {x: 10, y: 6}, {x: 28, y: 6}, {x: 6, y: 22},
        {x: 30, y: 22}, {x: 18, y: 15}
    ],
    // Level 3
    [
        {x: 12, y: 10}, {x: 26, y: 10}, {x: 12, y: 18},
        {x: 26, y: 18}, {x: 19, y: 14}
    ],
    // Level 4
    [
        {x: 9, y: 7}, {x: 27, y: 9}, {x: 10, y: 21},
        {x: 28, y: 19}, {x: 18, y: 14}
    ],
    // Level 5
    [
        {x: 11, y: 9}, {x: 25, y: 8}, {x: 9, y: 19},
        {x: 27, y: 20}, {x: 17, y: 14}
    ]
];

// ===== INITIALIZATION =====
function init() {
    if (!canvas || !ctx) return;
    
    // Set up canvas
    canvas.style.cursor = 'crosshair';
    
    // Event listeners
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', startNewGame);
    }
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Initialize terrain
    initTerrain();
    
    // Show title screen
    gameState.phase = PHASE.TITLE;
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// ===== TERRAIN GENERATION =====
function initTerrain() {
    map.terrain = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        map.terrain[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Water borders
            if (y < 3 || y > MAP_HEIGHT - 4 || x < 2 || x > MAP_WIDTH - 3) {
                map.terrain[y][x] = TERRAIN.WATER;
            }
            // Sand near water
            else if (y < 5 || y > MAP_HEIGHT - 6 || x < 4 || x > MAP_WIDTH - 5) {
                map.terrain[y][x] = TERRAIN.SAND;
            }
            // River in middle (vertical)
            else if (x >= MAP_WIDTH / 2 - 1 && x <= MAP_WIDTH / 2 + 1) {
                map.terrain[y][x] = TERRAIN.RIVER;
            }
            // Grass
            else {
                map.terrain[y][x] = TERRAIN.GRASS;
            }
        }
    }
}

// ===== INPUT HANDLING =====
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mouseGridX = Math.floor(mouseX / TILE_SIZE);
    mouseGridY = Math.floor(mouseY / TILE_SIZE);
    
    // Check hovered castle in selection phase
    if (gameState.phase === PHASE.SELECT_HOME) {
        gameState.hoveredCastle = null;
        map.castles.forEach((castle, i) => {
            const dx = mouseGridX - castle.x;
            const dy = mouseGridY - castle.y;
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                gameState.hoveredCastle = i;
            }
        });
    }
}

function handleClick(e) {
    if (gameState.phase === PHASE.SELECT_HOME && gameState.hoveredCastle !== null) {
        selectHomeCastle(gameState.hoveredCastle);
    }
    else if (gameState.phase === PHASE.PLACE_CANNONS && gameState.cannonsToPlace > 0) {
        placeCannon(mouseGridX, mouseGridY);
    }
    else if (gameState.phase === PHASE.COMBAT) {
        fireCannon();
    }
    else if (gameState.phase === PHASE.BUILDING) {
        placeWallPiece();
    }
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (gameState.phase === PHASE.COMBAT) {
        if (e.key === 'q' || e.key === 'Q') {
            gameState.activeCannon = Math.max(0, gameState.activeCannon - 1);
        }
        else if (e.key === 'e' || e.key === 'E') {
            gameState.activeCannon = Math.min(map.cannons.length - 1, gameState.activeCannon + 1);
        }
        else if (e.key === 'ArrowLeft') {
            gameState.cannonAngle -= 5;
        }
        else if (e.key === 'ArrowRight') {
            gameState.cannonAngle += 5;
        }
        else if (e.key === ' ') {
            e.preventDefault();
            fireCannon();
        }
    }
    else if (gameState.phase === PHASE.BUILDING) {
        if (e.key === 'ArrowLeft') {
            gameState.wallPieceX = Math.max(0, gameState.wallPieceX - 1);
        }
        else if (e.key === 'ArrowRight') {
            gameState.wallPieceX = Math.min(MAP_WIDTH - 5, gameState.wallPieceX + 1);
        }
        else if (e.key === 'ArrowUp') {
            gameState.wallPieceY = Math.max(0, gameState.wallPieceY - 1);
        }
        else if (e.key === 'ArrowDown') {
            gameState.wallPieceY = Math.min(MAP_HEIGHT - 5, gameState.wallPieceY + 1);
        }
        else if (e.key === 'z' || e.key === 'Z') {
            gameState.wallPieceRotation = (gameState.wallPieceRotation + 3) % 4;
        }
        else if (e.key === 'x' || e.key === 'X') {
            gameState.wallPieceRotation = (gameState.wallPieceRotation + 1) % 4;
        }
        else if (e.key === ' ') {
            e.preventDefault();
            placeWallPiece();
        }
    }
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

// ===== GAME FLOW =====
function startNewGame() {
    gameState.level = 1;
    gameState.round = 1;
    gameState.score = 0;
    gameState.homeCastle = null;
    startLevel();
}

function startLevel() {
    // Clear game objects
    map.walls = [];
    map.castles = [];
    map.cannons = [];
    map.ships = [];
    map.cannonballs = [];
    map.explosions = [];
    
    // Create castles for this level
    const castlePositions = LEVEL_CASTLES[gameState.level - 1];
    castlePositions.forEach((pos, i) => {
        map.castles.push({
            x: pos.x,
            y: pos.y,
            isHome: false,
            enclosed: false,
            owner: 'neutral'
        });
    });
    
    // Start castle selection phase
    startPhase(PHASE.SELECT_HOME);
}

function startPhase(phase) {
    gameState.phase = PHASE.SPLASH;
    gameState.nextPhaseName = phase;
    gameState.phaseTimer = PHASE_DURATION.SPLASH;
}

function transitionToNextPhase() {
    gameState.phase = gameState.nextPhaseName;
    
    switch (gameState.phase) {
        case PHASE.SELECT_HOME:
            gameState.phaseTimer = PHASE_DURATION.SELECT_HOME;
            gameState.hoveredCastle = null;
            break;
            
        case PHASE.PLACE_CANNONS:
            gameState.phaseTimer = PHASE_DURATION.PLACE_CANNONS;
            gameState.activeCannon = 0;
            countEnclosedCastles();
            gameState.cannonsToPlace = getCannonsAvailable();
            break;
            
        case PHASE.COMBAT:
            gameState.phaseTimer = PHASE_DURATION.COMBAT;
            gameState.cannonAngle = -90; // Start facing up
            spawnEnemyShips();
            break;
            
        case PHASE.BUILDING:
            gameState.phaseTimer = PHASE_DURATION.BUILDING;
            gameState.wallPieceIndex = Math.floor(Math.random() * WALL_PIECES.length);
            gameState.wallPieceRotation = 0;
            gameState.wallPieceX = 15;
            gameState.wallPieceY = 10;
            break;
    }
}

function selectHomeCastle(index) {
    gameState.homeCastle = index;
    map.castles[index].isHome = true;
    map.castles[index].owner = 'player';
    
    // Build walls around home castle
    buildInitialWalls(map.castles[index]);
    
    // Move to cannon placement
    startPhase(PHASE.PLACE_CANNONS);
    playSound('place');
}

function buildInitialWalls(castle) {
    // Build a rectangle of walls around the castle
    const size = 4;
    for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
            if (Math.abs(dx) === size || Math.abs(dy) === size) {
                const wx = castle.x + dx;
                const wy = castle.y + dy;
                if (wx >= 0 && wx < MAP_WIDTH && wy >= 0 && wy < MAP_HEIGHT) {
                    if (!getWall(wx, wy)) {
                        map.walls.push({x: wx, y: wy, health: 100});
                    }
                }
            }
        }
    }
}

function getCannonsAvailable() {
    let count = 0;
    map.castles.forEach(castle => {
        if (castle.owner === 'player' && castle.enclosed) {
            count += castle.isHome ? 2 : 1;
        }
    });
    return count;
}

function placeCannon(x, y) {
    // Check if inside player's walled area
    if (!isInsidePlayerWalls(x, y)) return;
    
    // Check not overlapping castle or other cannons
    for (let castle of map.castles) {
        if (Math.abs(castle.x - x) < 2 && Math.abs(castle.y - y) < 2) return;
    }
    for (let cannon of map.cannons) {
        if (cannon.x === x && cannon.y === y) return;
    }
    
    map.cannons.push({
        x, y,
        angle: -90,
        cooldown: 0
    });
    
    gameState.cannonsToPlace--;
    playSound('place');
    
    if (gameState.cannonsToPlace === 0) {
        startPhase(PHASE.COMBAT);
    }
}

function fireCannon() {
    if (map.cannons.length === 0) return;
    
    const cannon = map.cannons[gameState.activeCannon];
    if (!cannon || cannon.cooldown > 0) return;
    
    const angle = gameState.cannonAngle * Math.PI / 180;
    const speed = 3;
    
    map.cannonballs.push({
        x: cannon.x * TILE_SIZE + TILE_SIZE / 2,
        y: cannon.y * TILE_SIZE + TILE_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        owner: 'player',
        damage: 50
    });
    
    cannon.cooldown = 30;
    playSound('cannon');
}

function placeWallPiece() {
    const piece = getRotatedPiece(WALL_PIECES[gameState.wallPieceIndex], gameState.wallPieceRotation);
    
    // Check if can place
    if (!canPlaceWallPiece(piece, gameState.wallPieceX, gameState.wallPieceY)) return;
    
    // Place the piece
    for (let py = 0; py < piece.length; py++) {
        for (let px = 0; px < piece[py].length; px++) {
            if (piece[py][px]) {
                const wx = gameState.wallPieceX + px;
                const wy = gameState.wallPieceY + py;
                if (!getWall(wx, wy)) {
                    map.walls.push({x: wx, y: wy, health: 100});
                }
            }
        }
    }
    
    // Get next random piece
    gameState.wallPieceIndex = Math.floor(Math.random() * WALL_PIECES.length);
    gameState.wallPieceRotation = 0;
    
    playSound('place');
}

function canPlaceWallPiece(piece, startX, startY) {
    for (let py = 0; py < piece.length; py++) {
        for (let px = 0; px < piece[py].length; px++) {
            if (piece[py][px]) {
                const wx = startX + px;
                const wy = startY + py;
                
                // Out of bounds
                if (wx < 0 || wx >= MAP_WIDTH || wy < 0 || wy >= MAP_HEIGHT) return false;
                
                // On water or river
                if (map.terrain[wy][wx] === TERRAIN.WATER || map.terrain[wy][wx] === TERRAIN.RIVER) return false;
                
                // Overlapping existing wall
                if (getWall(wx, wy)) return false;
                
                // Overlapping castle
                for (let castle of map.castles) {
                    if (Math.abs(castle.x - wx) < 2 && Math.abs(castle.y - wy) < 2) return false;
                }
                
                // Overlapping cannon
                for (let cannon of map.cannons) {
                    if (cannon.x === wx && cannon.y === wy) return false;
                }
            }
        }
    }
    return true;
}

function getRotatedPiece(piece, rotation) {
    let result = piece;
    for (let i = 0; i < rotation; i++) {
        result = rotatePiece90(result);
    }
    return result;
}

function rotatePiece90(piece) {
    const rows = piece.length;
    const cols = piece[0].length;
    const rotated = [];
    
    for (let x = 0; x < cols; x++) {
        rotated[x] = [];
        for (let y = 0; y < rows; y++) {
            rotated[x][y] = piece[rows - 1 - y][x];
        }
    }
    
    return rotated;
}

function spawnEnemyShips() {
    const shipCount = 3 + gameState.level;
    const speed = 0.3 + gameState.level * 0.1;
    
    for (let i = 0; i < shipCount; i++) {
        map.ships.push({
            x: (MAP_WIDTH / 2 + 3 + Math.random() * 5) * TILE_SIZE,
            y: (5 + i * 3) * TILE_SIZE,
            health: 50 + gameState.level * 10,
            maxHealth: 50 + gameState.level * 10,
            speed,
            fireTimer: Math.random() * 60,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
}

function countEnclosedCastles() {
    map.castles.forEach(castle => {
        if (castle.owner === 'player') {
            castle.enclosed = isCastleEnclosed(castle);
        }
    });
}

function isCastleEnclosed(castle) {
    // Use flood fill to check if castle is enclosed
    const visited = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(false));
    const queue = [{x: castle.x, y: castle.y}];
    visited[castle.y][castle.x] = true;
    
    while (queue.length > 0) {
        const pos = queue.shift();
        
        // If we reach the edge, not enclosed
        if (pos.x <= 2 || pos.x >= MAP_WIDTH - 3 || pos.y <= 2 || pos.y >= MAP_HEIGHT - 3) {
            return false;
        }
        
        // Check neighbors
        const neighbors = [
            {x: pos.x - 1, y: pos.y},
            {x: pos.x + 1, y: pos.y},
            {x: pos.x, y: pos.y - 1},
            {x: pos.x, y: pos.y + 1}
        ];
        
        for (let n of neighbors) {
            if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT) {
                if (!visited[n.y][n.x] && !getWall(n.x, n.y)) {
                    visited[n.y][n.x] = true;
                    queue.push(n);
                }
            }
        }
    }
    
    return true;
}

function isInsidePlayerWalls(x, y) {
    for (let castle of map.castles) {
        if (castle.owner === 'player' && castle.enclosed) {
            if (!canReachEdgeFromPoint(x, y)) {
                return true;
            }
        }
    }
    return false;
}

function canReachEdgeFromPoint(startX, startY) {
    const visited = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(false));
    const queue = [{x: startX, y: startY}];
    visited[startY][startX] = true;
    
    while (queue.length > 0) {
        const pos = queue.shift();
        
        if (pos.x <= 2 || pos.x >= MAP_WIDTH - 3 || pos.y <= 2 || pos.y >= MAP_HEIGHT - 3) {
            return true;
        }
        
        const neighbors = [
            {x: pos.x - 1, y: pos.y},
            {x: pos.x + 1, y: pos.y},
            {x: pos.x, y: pos.y - 1},
            {x: pos.x, y: pos.y + 1}
        ];
        
        for (let n of neighbors) {
            if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT) {
                if (!visited[n.y][n.x] && !getWall(n.x, n.y)) {
                    visited[n.y][n.x] = true;
                    queue.push(n);
                }
            }
        }
    }
    
    return false;
}

function getWall(x, y) {
    return map.walls.find(w => w.x === x && w.y === y);
}

function endPhase() {
    switch (gameState.phase) {
        case PHASE.SELECT_HOME:
            // Auto-select if time ran out
            if (gameState.homeCastle === null) {
                selectHomeCastle(0);
            }
            break;
            
        case PHASE.PLACE_CANNONS:
            // Just move to combat even if not all cannons placed
            startPhase(PHASE.COMBAT);
            break;
            
        case PHASE.COMBAT:
            startPhase(PHASE.BUILDING);
            break;
            
        case PHASE.BUILDING:
            // Check enclosure
            countEnclosedCastles();
            const enclosedCount = map.castles.filter(c => c.owner === 'player' && c.enclosed).length;
            
            if (enclosedCount === 0) {
                gameState.phase = PHASE.GAME_OVER;
            } else {
                // Next round
                gameState.round++;
                if (gameState.round > 3) {
                    // Next level
                    gameState.level++;
                    gameState.round = 1;
                    
                    if (gameState.level > 5) {
                        gameState.phase = PHASE.VICTORY;
                        gameState.plankProgress = 0;
                    } else {
                        startLevel();
                    }
                } else {
                    startPhase(PHASE.PLACE_CANNONS);
                }
            }
            break;
    }
}

// ===== UPDATE LOOP =====
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    update(dt);
    render();
    
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameState.phase === PHASE.TITLE || gameState.phase === PHASE.GAME_OVER) {
        return;
    }
    
    // Update timer
    if (gameState.phase === PHASE.SPLASH) {
        gameState.phaseTimer -= dt;
        if (gameState.phaseTimer <= 0) {
            transitionToNextPhase();
        }
        return;
    }
    
    // Phase-specific updates
    if (gameState.phaseTimer > 0) {
        gameState.phaseTimer -= dt;
        if (gameState.phaseTimer <= 0) {
            endPhase();
            return;
        }
    }
    
    // Update cannons
    map.cannons.forEach(cannon => {
        if (cannon.cooldown > 0) cannon.cooldown--;
    });
    
    // Update ships
    if (gameState.phase === PHASE.COMBAT) {
        updateShips(dt);
    }
    
    // Update cannonballs
    updateCannonballs(dt);
    
    // Update explosions
    updateExplosions(dt);
    
    // Update particles
    updateParticles(dt);
    
    // Victory animation
    if (gameState.phase === PHASE.VICTORY) {
        gameState.plankProgress += dt * 30;
    }
}

function updateShips(dt) {
    map.ships.forEach((ship, i) => {
        // Bob animation
        ship.bobOffset += dt * 2;
        
        // Move ship
        ship.y += ship.speed;
        
        // Fire at player walls
        ship.fireTimer -= dt * 60;
        if (ship.fireTimer <= 0) {
            ship.fireTimer = 60 + Math.random() * 60;
            fireEnemyCannon(ship);
        }
        
        // Remove if off screen
        if (ship.y > CANVAS_HEIGHT + 50) {
            map.ships.splice(i, 1);
        }
    });
}

function fireEnemyCannon(ship) {
    // Find random player wall to target
    if (map.walls.length === 0) return;
    
    const target = map.walls[Math.floor(Math.random() * map.walls.length)];
    const dx = target.x * TILE_SIZE - ship.x;
    const dy = target.y * TILE_SIZE - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2;
    
    map.cannonballs.push({
        x: ship.x,
        y: ship.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        owner: 'enemy',
        damage: 30 + gameState.level * 5
    });
    
    playSound('cannon');
}

function updateCannonballs(dt) {
    for (let i = map.cannonballs.length - 1; i >= 0; i--) {
        const ball = map.cannonballs[i];
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        const gridX = Math.floor(ball.x / TILE_SIZE);
        const gridY = Math.floor(ball.y / TILE_SIZE);
        
        // Check collision with walls
        const wall = getWall(gridX, gridY);
        if (wall) {
            wall.health -= ball.damage;
            if (wall.health <= 0) {
                const idx = map.walls.indexOf(wall);
                if (idx > -1) map.walls.splice(idx, 1);
                gameState.score += 5;
            }
            createExplosion(ball.x, ball.y);
            map.cannonballs.splice(i, 1);
            continue;
        }
        
        // Check collision with ships (player shots)
        if (ball.owner === 'player') {
            for (let j = 0; j < map.ships.length; j++) {
                const ship = map.ships[j];
                const dx = ball.x - ship.x;
                const dy = ball.y - ship.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    ship.health -= ball.damage;
                    if (ship.health <= 0) {
                        map.ships.splice(j, 1);
                        gameState.score += 100;
                    }
                    createExplosion(ball.x, ball.y);
                    map.cannonballs.splice(i, 1);
                    break;
                }
            }
        }
        
        // Remove if off screen
        if (ball.x < 0 || ball.x > CANVAS_WIDTH || ball.y < 0 || ball.y > CANVAS_HEIGHT) {
            map.cannonballs.splice(i, 1);
        }
    }
}

function updateExplosions(dt) {
    for (let i = map.explosions.length - 1; i >= 0; i--) {
        map.explosions[i].life -= dt;
        map.explosions[i].radius += dt * 50;
        if (map.explosions[i].life <= 0) {
            map.explosions.splice(i, 1);
        }
    }
}

function updateParticles(dt) {
    for (let i = map.particles.length - 1; i >= 0; i--) {
        const p = map.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= dt;
        if (p.life <= 0) {
            map.particles.splice(i, 1);
        }
    }
}

function createExplosion(x, y) {
    map.explosions.push({
        x, y,
        radius: 5,
        life: 0.3
    });
    
    // Create particles
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        map.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 0.5 + Math.random() * 0.5,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`
        });
    }
    
    playSound('explosion');
}

// ===== RENDERING =====
function render() {
    ctx.fillStyle = '#2d4739';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (gameState.phase === PHASE.TITLE) {
        renderTitleScreen();
        return;
    }
    
    if (gameState.phase === PHASE.GAME_OVER) {
        renderGameOverScreen();
        return;
    }
    
    if (gameState.phase === PHASE.VICTORY) {
        renderVictoryScreen();
        return;
    }
    
    if (gameState.phase === PHASE.SPLASH) {
        renderSplashScreen();
        return;
    }
    
    // Render terrain
    renderTerrain();
    
    // Render walls
    renderWalls();
    
    // Render castles
    renderCastles();
    
    // Render cannons
    renderCannons();
    
    // Render ships
    renderShips();
    
    // Render cannonballs
    renderCannonballs();
    
    // Render explosions
    renderExplosions();
    
    // Render particles
    renderParticles();
    
    // Phase-specific rendering
    if (gameState.phase === PHASE.BUILDING) {
        renderWallPiecePreview();
    }
    
    if (gameState.phase === PHASE.COMBAT && map.cannons.length > 0) {
        renderCannonAim();
    }
    
    // Render HUD
    renderHUD();
}

function renderTerrain() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const terrain = map.terrain[y][x];
            let color;
            
            switch (terrain) {
                case TERRAIN.WATER:
                    color = '#4a90e2';
                    break;
                case TERRAIN.SAND:
                    color = '#d4a574';
                    break;
                case TERRAIN.RIVER:
                    color = '#3a7ac2';
                    break;
                case TERRAIN.GRASS:
                    color = ((x + y) % 2 === 0) ? '#5a8f4a' : '#4a7f3a';
                    break;
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function renderWalls() {
    map.walls.forEach(wall => {
        const healthPercent = wall.health / 100;
        ctx.fillStyle = healthPercent > 0.5 ? '#8b7355' : '#6b5d4f';
        ctx.fillRect(wall.x * TILE_SIZE, wall.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        ctx.strokeStyle = '#4a4035';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x * TILE_SIZE, wall.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

function renderCastles() {
    map.castles.forEach((castle, i) => {
        const x = castle.x * TILE_SIZE;
        const y = castle.y * TILE_SIZE;
        const size = TILE_SIZE * 2;
        
        // Highlight if hovered in selection phase
        if (gameState.phase === PHASE.SELECT_HOME && gameState.hoveredCastle === i) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(x - size/2, y - size/2, size, size);
        }
        
        // Castle color
        ctx.fillStyle = castle.isHome ? '#5a7fa0' : '#7f7f7f';
        ctx.fillRect(x - TILE_SIZE/2, y - TILE_SIZE/2, TILE_SIZE, TILE_SIZE * 1.5);
        
        // Tower
        ctx.fillStyle = castle.isHome ? '#4a6f90' : '#6f6f6f';
        ctx.fillRect(x - TILE_SIZE/3, y - TILE_SIZE, TILE_SIZE * 0.66, TILE_SIZE);
        
        // Flag
        if (castle.isHome) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y - TILE_SIZE * 1.5);
            ctx.lineTo(x, y - TILE_SIZE * 2);
            ctx.stroke();
            
            ctx.fillStyle = '#d4170a';
            ctx.beginPath();
            ctx.moveTo(x, y - TILE_SIZE * 2);
            ctx.lineTo(x + 8, y - TILE_SIZE * 1.8);
            ctx.lineTo(x, y - TILE_SIZE * 1.6);
            ctx.fill();
        }
    });
}

function renderCannons() {
    map.cannons.forEach((cannon, i) => {
        const x = cannon.x * TILE_SIZE + TILE_SIZE / 2;
        const y = cannon.y * TILE_SIZE + TILE_SIZE / 2;
        
        // Cannon base
        ctx.fillStyle = '#4a4035';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Cannon barrel (points to angle in combat mode)
        const angle = (gameState.phase === PHASE.COMBAT && i === gameState.activeCannon) 
            ? gameState.cannonAngle * Math.PI / 180 
            : -Math.PI / 2;
        
        ctx.strokeStyle = '#2a2025';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
        ctx.stroke();
        
        // Highlight active cannon
        if (gameState.phase === PHASE.COMBAT && i === gameState.activeCannon) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

function renderShips() {
    map.ships.forEach(ship => {
        const bob = Math.sin(ship.bobOffset) * 2;
        const x = ship.x;
        const y = ship.y + bob;
        
        // Ship hull
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - 15, y, 30, 20);
        
        // Sail
        ctx.fillStyle = '#f0e68c';
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 15, y + 5);
        ctx.lineTo(x, y + 15);
        ctx.fill();
        
        // Health bar
        const healthPercent = ship.health / ship.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 15, y - 10, 30, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(x - 15, y - 10, 30 * healthPercent, 4);
    });
}

function renderCannonballs() {
    map.cannonballs.forEach(ball => {
        ctx.fillStyle = ball.owner === 'player' ? '#2a2025' : '#4a2015';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function renderExplosions() {
    map.explosions.forEach(exp => {
        const alpha = exp.life / 0.3;
        ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function renderParticles() {
    map.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
}

function renderWallPiecePreview() {
    const piece = getRotatedPiece(WALL_PIECES[gameState.wallPieceIndex], gameState.wallPieceRotation);
    const canPlace = canPlaceWallPiece(piece, gameState.wallPieceX, gameState.wallPieceY);
    
    ctx.fillStyle = canPlace ? 'rgba(139, 115, 85, 0.6)' : 'rgba(220, 20, 20, 0.6)';
    
    for (let py = 0; py < piece.length; py++) {
        for (let px = 0; px < piece[py].length; px++) {
            if (piece[py][px]) {
                const x = (gameState.wallPieceX + px) * TILE_SIZE;
                const y = (gameState.wallPieceY + py) * TILE_SIZE;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#4a4035';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function renderCannonAim() {
    if (map.cannons.length === 0 || gameState.activeCannon >= map.cannons.length) return;
    
    const cannon = map.cannons[gameState.activeCannon];
    const x = cannon.x * TILE_SIZE + TILE_SIZE / 2;
    const y = cannon.y * TILE_SIZE + TILE_SIZE / 2;
    const angle = gameState.cannonAngle * Math.PI / 180;
    const length = 100;
    
    // Aiming line
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
    ctx.setLineDash([]);
}

function renderHUD() {
    const padding = 10;
    const fontSize = 14;
    
    // HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 40);
    ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
    
    ctx.fillStyle = '#ffd700';
    ctx.font = `${fontSize}px Courier New`;
    ctx.textAlign = 'left';
    
    // Top HUD
    ctx.fillText(`LEVEL ${gameState.level}-${gameState.round}`, padding, 25);
    
    const phaseName = {
        SELECT_HOME: 'CHOOSE HOME CASTLE',
        PLACE_CANNONS: 'PLACE CANNONS',
        COMBAT: 'BATTLE',
        BUILDING: 'REBUILD WALLS'
    }[gameState.phase] || '';
    
    ctx.textAlign = 'center';
    ctx.fillText(phaseName, CANVAS_WIDTH / 2, 25);
    
    ctx.textAlign = 'right';
    const timer = Math.ceil(gameState.phaseTimer);
    ctx.fillText(`TIME: ${timer}s`, CANVAS_WIDTH - padding, 25);
    
    // Bottom HUD
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${gameState.score}`, padding, CANVAS_HEIGHT - 15);
    
    const enclosedCount = map.castles.filter(c => c.owner === 'player' && c.enclosed).length;
    ctx.textAlign = 'center';
    ctx.fillText(`CASTLES: ${enclosedCount}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15);
    
    ctx.textAlign = 'right';
    if (gameState.phase === PHASE.PLACE_CANNONS) {
        ctx.fillText(`CANNONS: ${gameState.cannonsToPlace}`, CANVAS_WIDTH - padding, CANVAS_HEIGHT - 15);
    } else {
        ctx.fillText(`CANNONS: ${map.cannons.length}`, CANVAS_WIDTH - padding, CANVAS_HEIGHT - 15);
    }
}

function renderTitleScreen() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('BULWARK 1475', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    
    ctx.fillStyle = '#c9a961';
    ctx.font = '20px Courier New';
    ctx.fillText('Castle Defense', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    ctx.fillStyle = '#8b7355';
    ctx.font = '16px Courier New';
    ctx.fillText('Click PLAY NOW to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
}

function renderGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#d4170a';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('CASTLE FALLEN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    
    ctx.fillStyle = '#c9a961';
    ctx.font = '24px Courier New';
    ctx.fillText(`Level ${gameState.level} - Round ${gameState.round}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    
    ctx.fillStyle = '#8b7355';
    ctx.font = '16px Courier New';
    ctx.fillText('Click PLAY NOW to try again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
}

function renderVictoryScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, 80);
    
    ctx.fillStyle = '#c9a961';
    ctx.font = '20px Courier New';
    ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, 130);
    
    // Walk the plank animation
    ctx.fillText('The enemy commander walks the plank...', CANVAS_WIDTH / 2, 180);
    
    const plankX = CANVAS_WIDTH / 2;
    const plankY = 250;
    const plankLength = 150;
    
    // Ship
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(plankX - 100, plankY, 100, 60);
    
    // Plank
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(plankX, plankY + 20, plankLength, 10);
    
    // Commander walking
    const commanderProgress = Math.min(plankLength - 20, gameState.plankProgress);
    const commanderY = commanderProgress > plankLength - 30 ? plankY + 30 + (gameState.plankProgress - (plankLength - 30)) * 2 : plankY + 10;
    
    // Simple commander sprite
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(plankX + commanderProgress, commanderY, 15, 20);
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(plankX + commanderProgress + 3, commanderY - 8, 9, 9);
    
    // Water
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, plankY + 80, CANVAS_WIDTH, CANVAS_HEIGHT - plankY - 80);
    
    // Splash if fallen
    if (commanderProgress >= plankLength - 20 && commanderY > plankY + 50) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        const splashSize = (gameState.plankProgress - (plankLength - 20)) * 3;
        ctx.beginPath();
        ctx.arc(plankX + commanderProgress + 7, plankY + 80, splashSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderSplashScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const phaseName = {
        SELECT_HOME: 'CHOOSE YOUR HOME CASTLE',
        PLACE_CANNONS: 'PLACE YOUR CANNONS',
        COMBAT: 'GET READY FOR BATTLE!',
        BUILDING: 'REBUILD YOUR WALLS'
    }[gameState.nextPhaseName] || '';
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(phaseName, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

// ===== AUDIO =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    
    switch (type) {
        case 'cannon':
            oscillator.frequency.value = 80;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
            
        case 'explosion':
            oscillator.frequency.value = 120;
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
            
        case 'place':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
    }
}

// ===== START GAME =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
