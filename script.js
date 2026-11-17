const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub = document.getElementById("overlay-sub");
const actionBtn = document.getElementById("action-btn");
const actionLabel = document.getElementById("action-label");

const GRID_SIZE = 21;
const TILE_SIZE = canvas.width / GRID_SIZE;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 14, y: 10 };
let score = 0;
let bestScore = Number(localStorage.getItem("pinkSnakeBest") || 0);
let gameState = "IDLE"; // IDLE | RUNNING | PAUSED | SWEET
let loopTimer = null;
let particles = [];
let bannerTimer = null;
let sweetBannerText = "";

function formatScore(num) {
  return String(num).padStart(2, "0");
}

function updateScoreUI() {
  scoreEl.textContent = formatScore(score);
  bestScoreEl.textContent = formatScore(bestScore);
}

function spawnFood() {
  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((seg) => seg.x === candidate.x && seg.y === candidate.y));
  food = candidate;
}

function spawnBurst(gridX, gridY, count = 26) {
  const originX = (gridX + 0.5) * TILE_SIZE;
  const originY = (gridY + 0.5) * TILE_SIZE;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 1.5 + Math.random() * 4.2;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 24 + Math.floor(Math.random() * 14),
      color: i % 2 === 0 ? "#ff85bd" : "#ffe1f0",
    });
  }
}

function resetGame() {
  snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  particles = [];
  sweetBannerText = "";
  updateScoreUI();
  spawnFood();
}

function setState(newState) {
  gameState = newState;
  clearInterval(loopTimer);

  if (newState === "IDLE") {
    actionLabel.textContent = "START";
    overlayTitle.textContent = "PRESS SPACE";
    overlaySub.textContent = "OR AN ARROW KEY";
    overlay.classList.remove("hidden");
  } else if (newState === "RUNNING") {
    actionLabel.textContent = "PAUSE";
    overlay.classList.add("hidden");
    loopTimer = setInterval(tick, 130);
  } else if (newState === "PAUSED") {
    actionLabel.textContent = "START";
    overlayTitle.textContent = "PAUSED";
    overlaySub.textContent = "PRESS SPACE TO RESUME";
    overlay.classList.remove("hidden");
  } else if (newState === "SWEET") {
    actionLabel.textContent = "START";
    overlayTitle.textContent = "SWEET!";
    overlaySub.textContent = "SPACE TO KEEP PLAYING";
    overlay.classList.remove("hidden");
  }
}

function drawBoard() {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#6b3d66" : "#582f54";
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawHeartFood() {
  const px = (food.x + 0.5) * TILE_SIZE;
  const py = (food.y + 0.5) * TILE_SIZE;
  const s = TILE_SIZE * 0.34;

  ctx.fillStyle = "#ff5ca8";
  ctx.fillRect(px - s, py - s * 0.5, s * 0.9, s * 0.9);
  ctx.fillRect(px + s * 0.1, py - s * 0.5, s * 0.9, s * 0.9);
  ctx.fillRect(px - s, py + s * 0.2, s * 2, s * 0.7);
  ctx.fillRect(px - s * 0.5, py + s * 0.85, s, s * 0.5);
}

function drawSnake() {
  snake.forEach((seg, idx) => {
    const pad = 2;
    ctx.fillStyle = idx === 0 ? "#ffb6d9" : "#ff85bd";
    ctx.fillRect(
      seg.x * TILE_SIZE + pad,
      seg.y * TILE_SIZE + pad,
      TILE_SIZE - pad * 2,
      TILE_SIZE - pad * 2
    );
  });
}

function drawParticlesAndBanner() {
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
  }

  if (sweetBannerText) {
    ctx.fillStyle = "#ffe6f3";
    ctx.font = 'bold 22px "Silkscreen", monospace';
    ctx.textAlign = "center";
    ctx.fillText(sweetBannerText, canvas.width / 2, canvas.height / 2);
  }
}

function render() {
  drawBoard();
  drawHeartFood();
  drawSnake();
  drawParticlesAndBanner();
}

function tick() {
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // Tabrak dinding atau badan sendiri -> SWEET! overlay
  const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
  const hitSelf = snake.some((seg) => seg.x === head.x && seg.y === head.y);

  if (hitWall || hitSelf) {
    spawnBurst(snake[0].x, snake[0].y, 36);
    render();
    setState("SWEET");
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("pinkSnakeBest", String(bestScore));
    }
    updateScoreUI();
    spawnBurst(food.x, food.y, 28);

    if (score === 1) {
      sweetBannerText = "HELLO WORLD";
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => {
        sweetBannerText = "";
      }, 1400);
    }

    spawnFood();
  } else {
    snake.pop();
  }

  render();
}

function handleDirection(dx, dy) {
  if (gameState === "IDLE" || gameState === "SWEET") {
    resetGame();
    nextDirection = { x: dx, y: dy };
    setState("RUNNING");
    return;
  }
  if (gameState !== "RUNNING") return;
  if (dx === -direction.x && dy === -direction.y) return;
  nextDirection = { x: dx, y: dy };
}

function handleSpace() {
  if (gameState === "IDLE" || gameState === "SWEET") {
    resetGame();
    setState("RUNNING");
  } else if (gameState === "RUNNING") {
    setState("PAUSED");
  } else if (gameState === "PAUSED") {
    setState("RUNNING");
  }
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    e.preventDefault();
  }

  if (key === "arrowup" || key === "w") handleDirection(0, -1);
  else if (key === "arrowdown" || key === "s") handleDirection(0, 1);
  else if (key === "arrowleft" || key === "a") handleDirection(-1, 0);
  else if (key === "arrowright" || key === "d") handleDirection(1, 0);
  else if (key === " ") handleSpace();
});

actionBtn.addEventListener("click", handleSpace);

// Inisialisasi awal
updateScoreUI();
resetGame();
setState("IDLE");
render();
