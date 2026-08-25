(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const hint = document.getElementById('hint');
  const countdownEl = document.getElementById('countdown');
  const muteBtn = document.getElementById('mute-btn');
  const glassOverlay = document.getElementById('glass-overlay');
  const birthdayAudioBtn = document.getElementById('glass-birthday-btn');
  const madridAduioBtn = document.getElementById('glass-madrid-btn');
  const glassRestartBtn = document.getElementById('glass-restart-btn');

  // ---- Audio ----
  const mainBgm = new Audio('assets/audio/bgm-theme.mp3');
  mainBgm.loop = true;
  mainBgm.volume = 0.4;

  const birthdayBGM = new Audio('assets/audio/birthday-france.mp3');
  birthdayBGM.volume = 0.5;

  const madridBGM = new Audio('assets/audio/madrid-anthem.mp3');
  madridBGM.volume = 0.5;

  const jumpSfx = new Audio('assets/audio/jump.wav');
  jumpSfx.volume = 0.7;
  
  const breakSfx = new Audio('assets/audio/break.wav');
  breakSfx.volume = 0.7;

  const MUTE_KEY = 'runner_muted';
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch(e) { muted = false; }
  mainBgm.muted = muted;
  jumpSfx.muted = muted;
  updateMuteBtn();

  function updateMuteBtn() {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('muted', muted);
    birthdayAudioBtn.textContent = muted ? '🔇' : '🔊';
  }

  function toggleMute() {
    muted = !muted;
    mainBgm.muted = muted;
    jumpSfx.muted = muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch(e) {}
    updateMuteBtn();
  }

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
  });

  birthdayAudioBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    birthdayBGM.currentTime = 0;
    birthdayBGM.play().catch(() => {});
  });

  madridAduioBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    madridBGM.currentTime = 0;
    madridBGM.play().catch(() => {});
  });

  glassRestartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    glassOverlay.style.display = 'none';
    beginCountdown();
  });

  let bgmStarted = false;
  function startBgm() {
    if (bgmStarted) return;
    bgmStarted = true;
    mainBgm.currentTime = 0;
    mainBgm.play().catch(() => {});
  }

  function playJumpSfx() {
    const sfx = jumpSfx.cloneNode();
    sfx.volume = jumpSfx.volume;
    sfx.muted = muted;
    sfx.play().catch(() => {});
  }

  function playBreakSfx() {
    const sfx = breakSfx.cloneNode();
    sfx.volume = breakSfx.volume;
    sfx.muted = muted;
    sfx.play().catch(() => {});
  }

  // ---- Canvas sizing ----
  let W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const maxW = Math.min(window.innerWidth, 900);
    const maxH = window.innerHeight;
    // 16:9-ish but capped
    W = maxW;
    H = maxH;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = H * 0.72;
  }

  let groundY;
  window.addEventListener('resize', resize);

  // ---- Game state ----
  const STATE = { READY: 0, COUNTDOWN: 1, PLAYING: 2, DEAD: 3 };
  let state = STATE.READY;

  const BEST_KEY = 'runner_best_score';
  let best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch(e) { best = 0; }
  bestEl.textContent = 'SEKOR: ' + best;

  let score = 0;
  let speed = 0;
  let elapsed = 0;
  let lastTime = 0;
  const baseSpeed = 3;

  // player
  const player = {
    x: 70, y: 0, w: 34, h: 46,
    vy: 0, grounded: true,
    ducking: false,
    duckH: 26
  };
  const GRAVITY = 0.75;
  const JUMP_V = -14.5;

  function groundTopY() { return groundY; }

  function resetPlayer() {
    player.h = 46;
    player.y = groundTopY() - player.h;
    player.vy = 0;
    player.grounded = true;
    player.ducking = false;
  }

  // obstacles
  let obstacles = [];
  let spawnTimer = 0;
  let nextSpawnGap = 70;

  // particles for ground dust / stars bg
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * groundY * 0.8,
        r: Math.random() * 1.6 + 0.4,
        s: Math.random() * 0.3 + 0.05
      });
    }
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnObstacle() {
    const type = Math.random();
    if (type < 0.62) {
      // ground cactus-like block (jump over)
      const h = rand(32, 58);
      const w = rand(18, 30);
      obstacles.push({
        x: W + 20, y: groundY - h, w, h, type: 'ground'
      });
    } else {
      // flying obstacle (duck under) — positioned so duck clears it
      const h = 26;
      const w = 34;
      const flyY = groundY - player.h - 6; // gap for ducking player to pass under
      obstacles.push({
        x: W + 20, y: flyY - h + 4, w, h, type: 'fly'
      });
    }
  }

  function reset() {
    score = 0;
    speed = baseSpeed;
    elapsed = 0;
    obstacles = [];
    spawnTimer = 0;
    nextSpawnGap = 70;
    resetPlayer();
    initStars();
    scoreEl.textContent = '0';
  }

  function jump() {
    if (state !== STATE.PLAYING) return;
    if (player.grounded) {
      player.vy = JUMP_V;
      player.grounded = false;
      playJumpSfx();
    }
  }

  function setDuck(v) {
    if (state !== STATE.PLAYING) return;
    player.ducking = v && player.grounded;
  }

  // ---- Input ----
  window.addEventListener('keydown', (e) => {
    if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (state === STATE.READY || state === STATE.DEAD) beginCountdown();
      else if (state === STATE.PLAYING) jump();
    } else if (e.code === 'ArrowDown') {
      setDuck(true);
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') setDuck(false);
  });

  let touchStartY = 0;
  let touchActive = false;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (state === STATE.READY || state === STATE.DEAD) { beginCountdown(); return; }
    if (state !== STATE.PLAYING) return;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
    jump();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchActive) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 30) setDuck(true);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchActive = false;
    setDuck(false);
  }, { passive: false });

  // mouse fallback for desktop click-hold duck
  canvas.addEventListener('mousedown', () => {
    if (state === STATE.READY || state === STATE.DEAD) { beginCountdown(); return; }
    if (state === STATE.PLAYING) jump();
  });

  startBtn.addEventListener('click', beginCountdown);

  function beginCountdown() {
    if (state === STATE.COUNTDOWN) return;
    state = STATE.COUNTDOWN;
    startBgm();
    reset();
    draw();
    glassOverlay.style.display = 'none';
    startBtn.style.display = 'none';
    overlay.querySelector('p').style.display = 'none';
    countdownEl.style.display = 'block';

    let n = 3;
    countdownEl.textContent = n;
    const tick = setInterval(() => {
      n -= 1;
      if (n > 0) {
        countdownEl.textContent = n;
      } else {
        clearInterval(tick);
        countdownEl.textContent = 'GO!';
        setTimeout(startGame, 350);
      }
    }, 700);
  }

  function startGame() {
    state = STATE.PLAYING;
    overlay.style.display = 'none';
    countdownEl.style.display = 'none';
    hint.style.opacity = '0';
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  let gameOverCount = 0;
  function gameOver() {
    state = STATE.DEAD;
    mainBgm.pause();
    bgmStarted = false;
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch(e) {}
    }
    bestEl.textContent = 'SEKOR: ' + best;
    gameOverCount += 1;

    if (gameOverCount >= 1) {
      overlay.style.display = 'none';
      glassOverlay.style.display = 'flex';
      return;
    }

    overlay.querySelector('h1').textContent = 'GAME OVER';
    overlay.querySelector('p').style.display = 'none';
    let scoreLine = overlay.querySelector('.score-line');
    if (!scoreLine) {
      scoreLine = document.createElement('div');
      scoreLine.className = 'score-line';
      overlay.insertBefore(scoreLine, startBtn);
    }
    scoreLine.innerHTML = 'Score <b>' + score + '</b>' + (score >= best && score > 0 ? ' — New Best!' : '');
    startBtn.textContent = 'Retry';
    startBtn.style.display = 'inline-block';
    countdownEl.style.display = 'none';
    overlay.style.display = 'flex';
  }

  // ---- Collision ----
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---- Update ----
  function update(dt) {
    elapsed += dt;
    speed = baseSpeed + Math.min(elapsed / 1000 * 0.35, 10);
    score += dt * 0.01 * (speed / baseSpeed);
    scoreEl.textContent = Math.floor(score);

    // player physics
    const curH = player.ducking ? player.duckH : 46;
    if (player.h !== curH) {
      const bottom = player.y + player.h;
      player.h = curH;
      player.y = bottom - player.h;
    }
    if (!player.grounded) {
      player.vy += GRAVITY;
      player.y += player.vy;
      if (player.y + player.h >= groundY) {
        player.y = groundY - player.h;
        player.vy = 0;
        player.grounded = true;
      }
    } else {
      player.y = groundY - player.h;
    }

    // spawn
    spawnTimer += dt / 16.67;
    if (spawnTimer > nextSpawnGap) {
      spawnTimer = 0;
      nextSpawnGap = rand(55, 100) - Math.min(elapsed / 4000, 25);
      nextSpawnGap = Math.max(nextSpawnGap, 38);
      spawnObstacle();
    }

    // move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      if (o.x + o.w < -10) obstacles.splice(i, 1);
    }

    // stars parallax
    for (const s of stars) {
      s.x -= s.s * (speed / baseSpeed);
      if (s.x < 0) s.x = W;
    }

    // collisions
    const playerBox = { x: player.x + 6, y: player.y + 4, w: player.w - 12, h: player.h - 6 };
    for (const o of obstacles) {
      if (rectsOverlap(playerBox, o)) {
        playBreakSfx();
        gameOver();
        return;
      }
    }
  }

  // ---- Draw ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ground line
    const grad = ctx.createLinearGradient(0, groundY, 0, H);
    grad.addColorStop(0, '#0f3460');
    grad.addColorStop(1, '#0a1f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // player
    ctx.save();
    ctx.translate(player.x, player.y);
    const grd = ctx.createLinearGradient(0, 0, 0, player.h);
    grd.addColorStop(0, '#ffd166');
    grd.addColorStop(1, '#f4a261');
    ctx.fillStyle = grd;
    roundRect(ctx, 0, 0, player.w, player.h, 8);
    ctx.fill();
    // eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(player.w * 0.68, player.h * 0.28, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // obstacles
    for (const o of obstacles) {
      const og = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      if (o.type === 'ground') {
        og.addColorStop(0, '#ef476f');
        og.addColorStop(1, '#b8324f');
      } else {
        og.addColorStop(0, '#06d6a0');
        og.addColorStop(1, '#049c74');
      }
      ctx.fillStyle = og;
      roundRect(ctx, o.x, o.y, o.w, o.h, 6);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- Loop ----
  function loop(t) {
    if (state !== STATE.PLAYING) return;
    const dt = Math.min(t - lastTime, 40);
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // init
  resize();
  resetPlayer();
  initStars();
  draw();
})();
