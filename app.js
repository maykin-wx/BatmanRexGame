const container = document.getElementById('container');
const batman = document.getElementById('batman');
const batImg = document.getElementById('batImg');
const obstaclesRoot = document.getElementById('obstacles');

const currentScoreValueEl = document.getElementById('currentScoreValue');
const highScoreValueEl = document.getElementById('highScoreValue');

const walkImg = './assets/images/batmanAndando.png';
const jumpImg = './assets/images/batmanPulando.png';
const crouchImg = './assets/images/batmanAgachado.png';
const obstaChaoImg = './assets/images/obstaChao.png';
const obstaArImg = './assets/images/obstaAr.png';

[walkImg, jumpImg, crouchImg, obstaChaoImg, obstaArImg, './assets/images/cloud.png'].forEach(src => { const i = new Image(); i.src = src; });

let gameActive = false;
let jumping = false;
let ducking = false;
let rafId = null;
let lastTime = 0;
let timeSinceLastSpawn = 0;
let score = 0;
let highScore = 0; 

const BASE_SPEED = 0.5;
const MAX_SPEED = 1.2; 
let currentSpeed = BASE_SPEED;
const SCORE_PER_MS = 0.01; 
const BASE_SPAWN_INTERVAL = 1700;
const SPEED_INCREASE_THRESHOLD = 150; 
const INITIAL_SPAWN_DELAY = 600; 

const GROUND_Y = 30;
const BATMAN_X = parseFloat(getComputedStyle(batman).getPropertyValue('--batman-initial-left')) || 36;

let obstacles = []; 

const OBSTACLE_TYPES = [
  { id: 'g_small', type: 'ground', className: 'size-small', bottom: GROUND_Y, height: 40, width: 40, imgSrc: obstaChaoImg },
  { id: 'g_medium', type: 'ground', className: 'size-medium', bottom: GROUND_Y, height: 60, width: 60, imgSrc: obstaChaoImg },
  { id: 'g_tall', type: 'ground', className: 'size-tall', bottom: GROUND_Y, height: 80, width: 40, imgSrc: obstaChaoImg },
  { id: 'a_low', type: 'air', className: 'size-air', bottom: 100, height: 50, width: 50, imgSrc: obstaArImg }, 
  { id: 'a_high', type: 'air', className: 'size-air', bottom: 125, height: 50, width: 50, imgSrc: obstaArImg } 
];

function loadHighScore() {
    const storedScore = localStorage.getItem('batmanRunnerHighScore');
    highScore = storedScore ? parseInt(storedScore, 10) : 0;
    updateScoreDisplay();
}

function saveHighScore() {
    if (Math.floor(score) > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('batmanRunnerHighScore', highScore);
    }
}

function updateScoreDisplay(){
  currentScoreValueEl.textContent = Math.floor(score);
  highScoreValueEl.textContent = Math.floor(highScore);
}

function startGame(){
  if(gameActive) return;
  
  loadHighScore(); 

  gameActive = true;
  score = 0; 
  updateScoreDisplay(); 
  
  batImg.src = walkImg;
  batman.classList.remove('duckState'); 
  batman.style.height = ''; 

  clearObstacles();
  currentSpeed = BASE_SPEED; 
  
  batman.style.bottom = GROUND_Y + 'px'; 

  lastTime = performance.now();
  timeSinceLastSpawn = -INITIAL_SPAWN_DELAY; 
  runLoop(lastTime);
}

function handleCollision(){
    if(!gameActive) return;

    gameActive = false;
    if(rafId) cancelAnimationFrame(rafId);
    
    saveHighScore(); 
}

function clearObstacles(){
  obstacles.forEach(o => {
    if(o.el && o.el.parentNode) o.el.parentNode.removeChild(o.el);
  });
  obstacles = [];
}

function runLoop(timestamp){
  if(!gameActive) return; 

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  score += deltaTime * SCORE_PER_MS;
  updateScoreDisplay();

  checkDifficultyIncrease();

  timeSinceLastSpawn += deltaTime;
  const spawnInterval = BASE_SPAWN_INTERVAL / (currentSpeed / BASE_SPEED);
  if(timeSinceLastSpawn >= spawnInterval){
    spawnObstacle();
    timeSinceLastSpawn = 0;
  }
  
  moveObstacles(deltaTime);
  checkCollision();

  rafId = requestAnimationFrame(runLoop);
}

function checkDifficultyIncrease(){
  const targetSpeed = BASE_SPEED + Math.floor(score / SPEED_INCREASE_THRESHOLD) * 0.1; 
  currentSpeed = Math.min(MAX_SPEED, targetSpeed);
}

function spawnObstacle(){
  const availableObstacles = OBSTACLE_TYPES.filter(o => {
    return score < 200 ? o.type === 'ground' : true; 
  });

  const selectedObstacle = availableObstacles[Math.floor(Math.random() * availableObstacles.length)];
  
  const ob = document.createElement('div');
  ob.className = `obstacle ${selectedObstacle.className}`;
  ob.style.bottom = selectedObstacle.bottom + 'px'; 
  
  const img = document.createElement('img');
  img.src = selectedObstacle.imgSrc; 
  img.alt = selectedObstacle.type;
  img.onerror = function(){ this.style.background = (selectedObstacle.type === 'air' ? 'var(--accent-blue)' : 'var(--danger-red)'); this.style.width='100%'; this.style.height='100%' };
  
  ob.appendChild(img);
  obstaclesRoot.appendChild(ob);

  const startX = container.clientWidth;
  ob.style.left = startX + 'px';

  obstacles.push({
    el: ob,
    xPos: startX,
    width: selectedObstacle.width,
    height: selectedObstacle.height,
    bottom: selectedObstacle.bottom
  });
}

function moveObstacles(deltaTime){
  const speedPx = currentSpeed * deltaTime;
  
  for(let i = obstacles.length - 1; i >= 0; i--){
    const o = obstacles[i];
    o.xPos -= speedPx;
    o.el.style.left = o.xPos + 'px';

    if(o.xPos < -o.width){
      o.el.parentNode.removeChild(o.el);
      obstacles.splice(i, 1);
    }
  }
}

function doJump(){
  if(!gameActive) { startGame(); return; } 
  if(ducking) return; 
  if(jumping) return;
  
  jumping = true;
  batImg.src = jumpImg;
  batman.classList.add('jumpAnim');
  
  setTimeout(()=>{
    batman.classList.remove('jumpAnim');
    batImg.src = walkImg;
    jumping = false;
  }, 680);
}

function doDuck(){
  if(!gameActive) { startGame(); return; }
  if(jumping) return; 
  if(ducking) return;
  
  ducking = true;
  batImg.src = crouchImg;
  batman.classList.add('duckState');
  
  setTimeout(()=>{
    batman.classList.remove('duckState');
    batImg.src = walkImg;
    ducking = false;
  }, 600);
}

function checkCollision(){
  const batBottomStyle = getComputedStyle(batman).bottom;
  const batBottom = parseFloat(batBottomStyle.replace('px', ''));
  const bLeft = BATMAN_X;
  const bWidth = batman.offsetWidth;
  const bHeight = batman.offsetHeight;
  
  const BAT_TOLERANCE_X = 15;
  const BAT_TOLERANCE_Y = 5; 
  
  const playerHitbox = {
    left: bLeft + BAT_TOLERANCE_X,
    right: bLeft + bWidth - BAT_TOLERANCE_X,
    bottom: batBottom, 
    top: batBottom + bHeight - BAT_TOLERANCE_Y
  };

  for(const o of obstacles){
    const obstacleHitbox = {
      left: o.xPos,
      right: o.xPos + o.width,
      bottom: o.bottom,
      top: o.bottom + o.height 
    };

    const overlapX = (playerHitbox.left < obstacleHitbox.right) && 
                     (playerHitbox.right > obstacleHitbox.left);
    
    const overlapY = (playerHitbox.bottom < obstacleHitbox.top) && 
                     (playerHitbox.top > obstacleHitbox.bottom);
                     
    if(overlapX && overlapY){
      handleCollision();
      return;
    }
  }
}

loadHighScore();

window.addEventListener('keydown', (e) => {
  if(e.code === 'Space' || e.code === 'ArrowUp'){
    e.preventDefault();
    doJump();
  } else if(e.code === 'ArrowDown'){
    e.preventDefault();
    doDuck();
  }
});

container.addEventListener('pointerdown', (e)=>{
  doJump();
});