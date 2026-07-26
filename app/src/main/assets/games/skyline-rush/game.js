(function () {
  "use strict";

  var GAME_ID = "skyline-rush-neon-couriers";
  var STORAGE_PREFIX = "dtdc.skylineRush.";
  var W = 1280, H = 720;
  var ROUTES = [
    { name: "Sunset Run", duration: 45, target: 1650, speed: 325, density: 1.18 },
    { name: "Neon Gates", duration: 48, target: 2150, speed: 355, density: 1.09 },
    { name: "Drone Alley", duration: 51, target: 2700, speed: 385, density: 1.00 },
    { name: "Storm Circuit", duration: 54, target: 3250, speed: 420, density: 0.92 },
    { name: "Overdrive", duration: 57, target: 3850, speed: 455, density: 0.86 },
    { name: "Skyline Legend", duration: 60, target: 4500, speed: 495, density: 0.79 }
  ];

  var app = document.getElementById("app");
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var menuPanel = document.getElementById("menuPanel");
  var pausePanel = document.getElementById("pausePanel");
  var resultPanel = document.getElementById("resultPanel");
  var soundButton = document.getElementById("soundButton");
  var qualityButton = document.getElementById("qualityButton");
  var pauseButton = document.getElementById("pauseButton");
  var p1Score = document.getElementById("p1Score");
  var p2Score = document.getElementById("p2Score");
  var p1Combo = document.getElementById("p1Combo");
  var p2Combo = document.getElementById("p2Combo");
  var p2Name = document.getElementById("p2Name");
  var p1Hull = document.getElementById("p1Hull");
  var p2Hull = document.getElementById("p2Hull");
  var p1Energy = document.getElementById("p1Energy");
  var p2Energy = document.getElementById("p2Energy");
  var modeLabel = document.getElementById("modeLabel");
  var missionLabel = document.getElementById("missionLabel");
  var timerLabel = document.getElementById("timerLabel");
  var timeFill = document.getElementById("timeFill");
  var statusToast = document.getElementById("statusToast");
  var eventMessage = document.getElementById("eventMessage");
  var campaignProgress = document.getElementById("campaignProgress");
  var controllerOne = document.getElementById("controllerOne");
  var controllerTwo = document.getElementById("controllerTwo");
  var resultTitle = document.getElementById("resultTitle");
  var resultDetail = document.getElementById("resultDetail");
  var finalP1Score = document.getElementById("finalP1Score");
  var finalP2Score = document.getElementById("finalP2Score");
  var playAgainButton = document.getElementById("playAgainButton");

  var background = new Image(); background.src = "assets/skyline-sunset.webp";
  var bikeImages = [new Image(), new Image()];
  bikeImages[0].src = "assets/bike-cyan.webp"; bikeImages[1].src = "assets/bike-violet.webp";

  var state = "menu";
  var mode = "two";
  var menuMode = "two";
  var quality = readSetting("quality", "light");
  var soundEnabled = readSetting("sound", "on") !== "off";
  var maxUnlockedRoute = clamp(parseInt(readSetting("maxUnlockedRoute", "0"), 10) || 0, 0, ROUTES.length - 1);
  var routeIndex = maxUnlockedRoute;
  var routeTime = ROUTES[routeIndex].duration;
  var routeDuration = routeTime;
  var soloSuccess = false;
  var elapsed = 0;
  var distance = 0;
  var spawnTimer = 0.8;
  var frameHandle = 0;
  var lastFrame = performance.now();
  var cameraShake = 0;
  var keys = {};
  var previousPadButtons = {};
  var idlePreviousButtons = {};
  var obstacles = [];
  var rivals = [];
  var pickups = [];
  var particles = [];
  var streaks = createStreaks();
  var toastTimer = 0, messageTimer = 0;
  var pointerPlayer = -1;
  var rivalTimer = 7, rivalsDefeated = 0;
  var audio = { context: null, gain: null, hum: null };

  function readSetting(key, fallback) { try { var value = localStorage.getItem(STORAGE_PREFIX + key); return value === null ? fallback : value; } catch (error) { return fallback; } }
  function writeSetting(key, value) { try { localStorage.setItem(STORAGE_PREFIX + key, String(value)); } catch (error) { /* optional */ } }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function random(min, max) { return min + Math.random() * (max - min); }

  function createPlayer(index) {
    return {
      index: index, active: index === 0, alive: true, respawn: 0,
      x: index === 0 ? 245 : 330, y: index === 0 ? 315 : 455,
      vx: 0, vy: 0, targetY: null, score: 0, combo: 1, bestCombo: 1,
      energy: 72, hull: 3, invulnerable: 0, boost: 0, pulse: 0,
      boostQueued: false, pulseQueued: false, axisX: 0, axisY: 0, padX: 0, padY: 0, touchY: 0
    };
  }
  var players = [createPlayer(0), createPlayer(1)];

  function createStreaks() {
    var list = [];
    for (var index = 0; index < 34; index += 1) list.push({ x: random(0, W), y: random(180, H - 50), length: random(18, 90), alpha: random(0.08, 0.34), speed: random(0.45, 1.45) });
    return list;
  }

  function setState(next) {
    state = next; app.dataset.state = next;
    menuPanel.hidden = next !== "menu"; pausePanel.hidden = next !== "paused"; resultPanel.hidden = next !== "result";
    pauseButton.textContent = next === "paused" ? "▶" : "Ⅱ";
  }

  function startGame(nextMode, requestedRoute) {
    ensureAudio();
    mode = nextMode === "one" ? "one" : "two"; app.dataset.mode = mode;
    routeIndex = typeof requestedRoute === "number" ? clamp(Math.round(requestedRoute), 0, ROUTES.length - 1) : maxUnlockedRoute;
    players = [createPlayer(0), createPlayer(1)]; players[1].active = mode === "two";
    if (mode === "one") { players[0].x = 270; players[0].y = 385; }
    obstacles.length = 0; rivals.length = 0; pickups.length = 0; particles.length = 0;
    routeDuration = mode === "one" ? ROUTES[routeIndex].duration : 75;
    routeTime = routeDuration; elapsed = 0; distance = 0; spawnTimer = 0.75; rivalTimer = 6.5; rivalsDefeated = 0; cameraShake = 0; soloSuccess = false;
    setState("playing");
    showEvent(mode === "one" ? "ROUTE " + (routeIndex + 1) : "COURIER DUEL", 1050);
    lastFrame = performance.now(); updateHud(); requestFrame();
    try { canvas.focus({ preventScroll: true }); } catch (error) { canvas.focus(); }
  }

  function pauseGame() { if (state !== "playing") return; setState("paused"); setHum(0); render(); }
  function resumeGame() { if (state !== "paused") return; setState("playing"); lastFrame = performance.now(); requestFrame(); }
  function togglePause() { if (state === "playing") pauseGame(); else if (state === "paused") resumeGame(); }
  function requestFrame() { if (!frameHandle && state === "playing" && !document.hidden) frameHandle = requestAnimationFrame(frame); }
  function frame(now) {
    frameHandle = 0; if (state !== "playing" || document.hidden) return;
    var dt = Math.min(0.04, Math.max(0.001, (now - lastFrame) / 1000)); lastFrame = now;
    updateGamepads(); update(dt); updateAudio(); render();
    if (state === "playing") requestFrame();
  }

  function update(dt) {
    elapsed += dt; routeTime = Math.max(0, routeTime - dt);
    var route = ROUTES[routeIndex];
    var worldSpeed = route.speed * (mode === "two" ? 1.04 : 1) * (1 + Math.min(0.22, elapsed / 240));
    updateKeyboardAxes();
    players.forEach(function (player) { if (player.active) updatePlayer(player, dt, worldSpeed); });
    updateWorld(dt, worldSpeed); updateRivals(dt); updateParticles(dt); updateStreaks(dt, worldSpeed);
    cameraShake = Math.max(0, cameraShake - dt * 3.2);
    distance += worldSpeed * dt;
    if (routeTime <= 0) finishGame();
    updateHud();
  }

  function updateKeyboardAxes() {
    var p1x = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    var p1y = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    var p2x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    var p2y = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    if (mode === "one") { p1x += p2x; p1y += p2y; p2x = 0; p2y = 0; }
    players[0].axisX = clamp(p1x + players[0].padX, -1, 1); players[0].axisY = clamp(p1y + players[0].padY + players[0].touchY, -1, 1);
    players[1].axisX = clamp(p2x + players[1].padX, -1, 1); players[1].axisY = clamp(p2y + players[1].padY + players[1].touchY, -1, 1);
  }

  function updatePlayer(player, dt, worldSpeed) {
    if (!player.alive) {
      player.respawn -= dt;
      if (mode === "two" && player.respawn <= 0) { player.alive = true; player.hull = 2; player.energy = 55; player.invulnerable = 2; player.x = player.index ? 330 : 245; player.y = player.index ? 455 : 315; showToast("P" + (player.index + 1) + " عاد للمطاردة", 650); }
      return;
    }
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.boost = Math.max(0, player.boost - dt); player.pulse = Math.max(0, player.pulse - dt);
    if (player.boostQueued) { player.boostQueued = false; activateBoost(player); }
    if (player.pulseQueued) { player.pulseQueued = false; activatePulse(player); }
    var moveSpeed = player.boost > 0 ? 380 : 285;
    if (player.targetY !== null && Math.abs(player.targetY - player.y) > 5 && Math.abs(player.axisY) < 0.1) player.axisY = player.targetY > player.y ? 1 : -1;
    else if (player.targetY !== null && Math.abs(player.targetY - player.y) <= 5) player.targetY = null;
    player.vx += (player.axisX * moveSpeed - player.vx) * Math.min(1, dt * 8.5);
    player.vy += (player.axisY * moveSpeed - player.vy) * Math.min(1, dt * 8.5);
    player.x = clamp(player.x + player.vx * dt, 145, 500);
    player.y = clamp(player.y + player.vy * dt, 195, 620);
    player.energy = Math.min(100, player.energy + dt * (player.boost > 0 ? 1.5 : 6));
    player.score += dt * worldSpeed * 0.055 * (player.boost > 0 ? 1.8 : 1) * (1 + (player.combo - 1) * 0.035);
    if (player.boost > 0 && Math.random() < dt * 24) spawnTrailParticle(player);
  }

  function activateBoost(player) {
    if (!player.alive) return;
    if (player.energy < 24) { showToast("P" + (player.index + 1) + " يحتاج طاقة", 420); playBeep(115, 0.09, "square", 0.025); return; }
    player.energy -= 24; player.boost = 0.78; player.invulnerable = Math.max(player.invulnerable, 0.82);
    player.score += 35 * player.combo; cameraShake = Math.min(0.42, cameraShake + 0.08);
    playBeep(player.index ? 310 : 370, 0.13, "sawtooth", 0.035);
  }

  function activatePulse(player) {
    if (!player.alive) return;
    if (player.energy < 34) { showToast("P" + (player.index + 1) + " يحتاج 34 طاقة", 450); return; }
    player.energy -= 34; player.pulse = 0.42; player.invulnerable = Math.max(player.invulnerable, 0.35);
    var destroyed = 0;
    obstacles.forEach(function (item) {
      if (!item.active || item.type === "gate") return;
      var dx = item.x - player.x, dy = item.y - player.y;
      if (dx > -80 && dx < 330 && dx * dx + dy * dy < 125000) { item.active = false; destroyed += 1; burst(item.x, item.y, player.index ? "#c282ff" : "#63f4ff", 16); }
    });
    rivals.forEach(function (rival) {
      if (!rival.active) return;
      var dx = rival.x - player.x, dy = rival.y - player.y;
      if (dx > -120 && dx < 360 && dx * dx + dy * dy < 150000) { rival.active = false; destroyed += 1; rivalsDefeated += 1; burst(rival.x, rival.y, "#ff5d88", 24); }
    });
    if (destroyed) { player.combo = Math.min(12, player.combo + destroyed); player.score += destroyed * 160 * player.combo; showEvent("PULSE ×" + destroyed, 520); }
    else showToast("النبضة لم تصب هدفًا", 380);
    cameraShake = Math.min(0.7, cameraShake + 0.18); playBeep(680, 0.22, "sine", 0.045);
  }

  function updateWorld(dt, worldSpeed) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnPattern(); spawnTimer = ROUTES[routeIndex].density * random(0.78, 1.18); }
    obstacles.forEach(function (item) {
      if (!item.active) return;
      item.x -= worldSpeed * dt * item.speed; item.spin += dt * 2.5;
      players.forEach(function (player) { if (player.active && player.alive) testObstacle(item, player); });
      if (item.x < -120) item.active = false;
      if (!item.awarded && item.x < 120) {
        item.awarded = true;
        players.forEach(function (player) { if (player.active && player.alive && !item.hit[player.index]) { player.score += (item.type === "gate" ? 95 : 45) * player.combo; player.combo = Math.min(12, player.combo + 1); player.bestCombo = Math.max(player.bestCombo, player.combo); } });
      }
    });
    pickups.forEach(function (item) {
      if (!item.active) return;
      item.x -= worldSpeed * dt; item.spin += dt * 4;
      players.forEach(function (player) {
        if (!player.active || !player.alive || !item.active) return;
        var dx = item.x - player.x, dy = item.y - player.y;
        if (dx * dx + dy * dy < 3900) { item.active = false; player.energy = Math.min(100, player.energy + 30); player.score += 110 * player.combo; player.combo = Math.min(12, player.combo + 1); burst(item.x, item.y, player.index ? "#bd83ff" : "#68f7ff", 11); playBeep(740, 0.08, "triangle", 0.025); }
      });
      if (item.x < -60) item.active = false;
    });
    obstacles = obstacles.filter(function (item) { return item.active; });
    pickups = pickups.filter(function (item) { return item.active; });
  }

  function updateRivals(dt) {
    rivalTimer -= dt;
    if (rivalTimer <= 0 && state === "playing") {
      var activePlayers = players.filter(function (p) { return p.active && p.alive; });
      if (activePlayers.length) {
        var target = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        rivals.push({ active:true, target:target.index, x:-130, y:clamp(target.y + random(-150,150),210,600), speed:170 + routeIndex * 18 + random(0,45), wobble:random(0,6.2), hit:false });
        showEvent("RIVAL IN PURSUIT", 620); playBeep(155,0.18,"square",0.035);
      }
      rivalTimer = Math.max(4.6, 9.2 - routeIndex * .55) * random(.82,1.14);
    }
    rivals.forEach(function (rival) {
      if (!rival.active) return; var target=players[rival.target];
      if (!target || !target.alive) { rival.active=false; return; }
      rival.wobble += dt * 4; rival.x += rival.speed * dt; rival.y += (target.y + Math.sin(rival.wobble)*24 - rival.y) * Math.min(1,dt*2.1);
      if (target.boost > 0 && rival.x > target.x - 120) { rival.active=false; rivalsDefeated += 1; target.score += 280 * target.combo; burst(rival.x,rival.y,"#ffd36a",20); showToast("P"+(target.index+1)+" أفلت من المطارد!",520); return; }
      var dx=rival.x-target.x,dy=rival.y-target.y;
      if (!rival.hit && dx*dx+dy*dy<5200) { rival.hit=true;rival.active=false;damagePlayer(target,rival.x,rival.y);showEvent("RIVAL HIT",420); }
      if (rival.x>620)rival.active=false;
    });
    rivals=rivals.filter(function (r) { return r.active; });
  }

  function spawnPattern() {
    var roll = Math.random();
    if (roll < 0.24 + routeIndex * 0.025) {
      obstacles.push({ type: "gate", x: W + 90, y: 0, gapY: random(280, 525), gapH: Math.max(145, 205 - routeIndex * 8), active: true, speed: 1, spin: 0, hit: [false, false], awarded: false });
      if (Math.random() < 0.78) pickups.push({ x: W + 95, y: clamp(random(245, 565), 210, 600), active: true, spin: 0 });
      return;
    }
    var count = roll > 0.78 ? 3 : 2;
    var baseY = random(230, 575);
    for (var index = 0; index < count; index += 1) {
      obstacles.push({ type: Math.random() < 0.58 ? "mine" : "drone", x: W + 80 + index * random(75, 135), y: clamp(baseY + (index - 1) * random(-90, 90), 210, 605), radius: 30, active: true, speed: random(0.92, 1.12), spin: random(0, 6), hit: [false, false], awarded: false });
    }
    if (Math.random() < 0.62) {
      for (var pickupIndex = 0; pickupIndex < 3; pickupIndex += 1) pickups.push({ x: W + 120 + pickupIndex * 66, y: clamp(baseY + 125, 215, 600), active: true, spin: pickupIndex });
    }
  }

  function testObstacle(item, player) {
    if (item.hit[player.index] || player.invulnerable > 0) return;
    var collided = false;
    if (item.type === "gate") {
      if (Math.abs(item.x - player.x) < 54 && (player.y < item.gapY - item.gapH * 0.5 || player.y > item.gapY + item.gapH * 0.5)) collided = true;
    } else {
      var dx = item.x - player.x, dy = item.y - player.y;
      collided = dx * dx + dy * dy < 4300;
    }
    if (!collided) return;
    item.hit[player.index] = true;
    if (player.boost > 0 && item.type !== "gate") { item.active = false; player.score += 130 * player.combo; burst(item.x, item.y, player.index ? "#c282ff" : "#63f4ff", 18); return; }
    damagePlayer(player, item.x, item.type === "gate" ? player.y : item.y);
  }

  function damagePlayer(player, x, y) {
    player.hull -= 1; player.combo = 1; player.invulnerable = 1.55; player.score = Math.max(0, player.score - 120);
    burst(x, y, "#ff667d", 24); cameraShake = Math.min(1, cameraShake + 0.55);
    showToast("P" + (player.index + 1) + " إصابة!", 550); playBeep(92, 0.24, "sawtooth", 0.055);
    if (player.hull <= 0) {
      player.alive = false; player.respawn = 2.2;
      if (mode === "one") finishGame(); else showEvent("P" + (player.index + 1) + " RESPAWN", 750);
    }
  }

  function spawnTrailParticle(player) { particles.push({ x: player.x - 95, y: player.y + random(-16, 16), vx: random(-190, -80), vy: random(-25, 25), life: random(0.24, 0.5), maxLife: 0.5, color: player.index ? "#b16dff" : "#55efff", size: random(4, 11) }); }
  function burst(x, y, color, count) { for (var index = 0; index < count; index += 1) particles.push({ x: x, y: y, vx: random(-210, 210), vy: random(-210, 210), life: random(0.25, 0.72), maxLife: 0.72, color: color, size: random(3, 10) }); }
  function updateParticles(dt) { particles.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; }); particles = particles.filter(function (p) { return p.life > 0; }); }
  function updateStreaks(dt, worldSpeed) { streaks.forEach(function (s) { s.x -= worldSpeed * s.speed * dt; if (s.x + s.length < 0) { s.x = W + random(0, 240); s.y = random(185, H - 55); } }); }

  function finishGame() {
    if (state !== "playing") return;
    if (mode === "one") {
      soloSuccess = players[0].score >= ROUTES[routeIndex].target && players[0].hull > 0;
      if (soloSuccess && routeIndex < ROUTES.length - 1) { maxUnlockedRoute = Math.max(maxUnlockedRoute, routeIndex + 1); writeSetting("maxUnlockedRoute", maxUnlockedRoute); }
      resultTitle.textContent = soloSuccess ? (routeIndex === ROUTES.length - 1 ? "أسطورة السماء!" : "تم تسليم الشحنة!") : "لم يكتمل الطريق";
      resultDetail.textContent = (soloSuccess ? (routeIndex === ROUTES.length - 1 ? "أنهيت جميع طرق المدينة" : "فُتح الطريق " + (routeIndex + 2) + " — " + ROUTES[routeIndex + 1].name) : "الهدف " + ROUTES[routeIndex].target.toLocaleString("en-US") + " — اجمع الطاقة واستخدم BOOST") + " • مطاردون مهزومون: " + rivalsDefeated;
      finalP1Score.textContent = Math.round(players[0].score).toLocaleString("en-US"); finalP2Score.textContent = ROUTES[routeIndex].target.toLocaleString("en-US");
      playAgainButton.textContent = soloSuccess && routeIndex < ROUTES.length - 1 ? "الطريق التالي" : "إعادة الطريق";
    } else {
      var scoreOne = Math.round(players[0].score), scoreTwo = Math.round(players[1].score); var winner = scoreOne === scoreTwo ? -1 : scoreOne > scoreTwo ? 0 : 1;
      resultTitle.textContent = winner < 0 ? "تعادل فوق المدينة!" : "فاز اللاعب " + (winner + 1) + "!";
      resultDetail.textContent = "أفضل كومبو: " + players[0].bestCombo + " مقابل " + players[1].bestCombo + " • مطاردون مهزومون: " + rivalsDefeated + " • الطاقة: " + Math.round(players[0].energy) + " / " + Math.round(players[1].energy);
      finalP1Score.textContent = scoreOne.toLocaleString("en-US"); finalP2Score.textContent = scoreTwo.toLocaleString("en-US"); playAgainButton.textContent = "سباق جديد";
    }
    updateCampaignProgress(); setState("result"); setHum(0); render();
  }
  function playAgain() { var next = mode === "one" && soloSuccess && routeIndex < ROUTES.length - 1 ? routeIndex + 1 : routeIndex; startGame(mode, next); }

  function render() {
    var scale = canvas.width / W; ctx.setTransform(scale, 0, 0, canvas.height / H, 0, 0); ctx.clearRect(0, 0, W, H);
    var shakeX = cameraShake > 0 ? random(-7, 7) * cameraShake : 0, shakeY = cameraShake > 0 ? random(-5, 5) * cameraShake : 0;
    ctx.save(); ctx.translate(shakeX, shakeY); drawBackground();
    if (state === "menu") drawMenuBikes();
    else { drawStreaks(); pickups.forEach(drawPickup); obstacles.forEach(drawObstacle); rivals.forEach(drawRival); players.forEach(function (player) { if (player.active) drawPlayer(player); }); drawParticles(); }
    ctx.restore();
  }

  function drawBackground() {
    if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, W, H); else { var fill = ctx.createLinearGradient(0, 0, 0, H); fill.addColorStop(0, "#334d8b"); fill.addColorStop(1, "#f28a76"); ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H); }
    var tint = ctx.createLinearGradient(0, 0, 0, H); tint.addColorStop(0, "rgba(13,28,74,.04)"); tint.addColorStop(0.62, "rgba(20,30,68,.08)"); tint.addColorStop(1, "rgba(7,16,45,.25)"); ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  }
  function drawMenuBikes() { drawBikeImage(0, 130, 455, 290, -0.02, 0.9); drawBikeImage(1, 400, 535, 260, 0.02, 0.86); }
  function drawStreaks() { ctx.save(); ctx.lineCap = "round"; streaks.forEach(function (s) { var gradient = ctx.createLinearGradient(s.x, 0, s.x + s.length, 0); gradient.addColorStop(0, "rgba(255,255,255,0)"); gradient.addColorStop(1, "rgba(117,239,255," + s.alpha + ")"); ctx.strokeStyle = gradient; ctx.lineWidth = s.y > 520 ? 2 : 1; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.length, s.y); ctx.stroke(); }); ctx.restore(); }

  function drawPlayer(player) {
    if (!player.alive) { ctx.save(); ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.font = "900 18px Segoe UI"; ctx.textAlign = "center"; ctx.fillText("P" + (player.index + 1) + " RESPAWN " + Math.max(1, Math.ceil(player.respawn)), player.x, player.y); ctx.restore(); return; }
    if (player.invulnerable > 0 && player.boost <= 0 && Math.floor(player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.42;
    var trail = ctx.createLinearGradient(player.x - 170, 0, player.x - 30, 0); trail.addColorStop(0, "rgba(0,0,0,0)"); trail.addColorStop(1, player.index ? "rgba(177,109,255,.68)" : "rgba(85,239,255,.68)"); ctx.fillStyle = trail; ctx.beginPath(); ctx.moveTo(player.x - 175, player.y - 16); ctx.lineTo(player.x - 34, player.y - 8); ctx.lineTo(player.x - 34, player.y + 8); ctx.lineTo(player.x - 175, player.y + 16); ctx.closePath(); ctx.fill();
    drawBikeImage(player.index, player.x - 115, player.y - 52, 230, clamp(player.vy / 850, -0.12, 0.12), player.boost > 0 ? 1.05 : 1);
    if (player.pulse > 0) { var progress = 1 - player.pulse / 0.42; ctx.save(); ctx.strokeStyle = player.index ? "rgba(196,128,255," + (1 - progress) + ")" : "rgba(99,244,255," + (1 - progress) + ")"; ctx.lineWidth = 8 * (1 - progress); ctx.beginPath(); ctx.arc(player.x, player.y, 40 + progress * 250, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  function drawRival(rival) {
    ctx.save();ctx.translate(rival.x,rival.y);ctx.rotate(Math.sin(rival.wobble)*.05);ctx.shadowBlur=28;ctx.shadowColor="#ff416d";
    var trail=ctx.createLinearGradient(-120,0,-10,0);trail.addColorStop(0,"rgba(255,65,109,0)");trail.addColorStop(1,"rgba(255,65,109,.75)");ctx.fillStyle=trail;ctx.beginPath();ctx.moveTo(-130,-13);ctx.lineTo(-20,-7);ctx.lineTo(-20,7);ctx.lineTo(-130,13);ctx.closePath();ctx.fill();
    ctx.fillStyle="#291d43";ctx.beginPath();ctx.moveTo(-36,-24);ctx.lineTo(43,-16);ctx.lineTo(62,0);ctx.lineTo(43,16);ctx.lineTo(-36,24);ctx.lineTo(-58,0);ctx.closePath();ctx.fill();ctx.strokeStyle="#ff537d";ctx.lineWidth=5;ctx.stroke();ctx.fillStyle="#ffd36a";ctx.fillRect(24,-7,25,14);ctx.restore();
  }
  function drawBikeImage(index, x, y, width, rotation, alpha) { var image = bikeImages[index]; if (!image.complete || !image.naturalWidth) return; var height = width * image.naturalHeight / image.naturalWidth; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + width * 0.5, y + height * 0.5); ctx.rotate(rotation); ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height); ctx.restore(); }

  function drawObstacle(item) {
    if (!item.active) return;
    if (item.type === "gate") { drawGate(item); return; }
    ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.spin);
    if (item.type === "mine") {
      ctx.shadowBlur = 24; ctx.shadowColor = "#ff4f70"; var glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 35); glow.addColorStop(0, "#fff1c6"); glow.addColorStop(0.25, "#ff6b7c"); glow.addColorStop(1, "#5a1735"); ctx.fillStyle = glow;
      for (var spike = 0; spike < 8; spike += 1) { ctx.rotate(Math.PI / 4); ctx.fillRect(24, -3, 18, 6); }
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,222,171,.8)"; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.shadowBlur = 20; ctx.shadowColor = "#ff5576"; ctx.fillStyle = "#253451"; ctx.beginPath(); ctx.ellipse(0, 0, 42, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a6c8d8"; ctx.fillRect(-55, -5, 110, 10); ctx.fillStyle = "#ff5576"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffcf6b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawGate(item) {
    var topEnd = item.gapY - item.gapH * 0.5, bottomStart = item.gapY + item.gapH * 0.5;
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "rgba(255,92,119,.65)"; var gradient = ctx.createLinearGradient(item.x - 24, 0, item.x + 24, 0); gradient.addColorStop(0, "rgba(75,28,75,.88)"); gradient.addColorStop(0.5, "rgba(255,82,115,.96)"); gradient.addColorStop(1, "rgba(86,35,111,.88)"); ctx.fillStyle = gradient; ctx.fillRect(item.x - 25, 150, 50, Math.max(0, topEnd - 150)); ctx.fillRect(item.x - 25, bottomStart, 50, H - bottomStart);
    ctx.fillStyle = "#ffd36a"; for (var y = 165; y < topEnd; y += 35) ctx.fillRect(item.x - 30, y, 60, 5); for (var by = bottomStart + 10; by < H; by += 35) ctx.fillRect(item.x - 30, by, 60, 5);
    ctx.shadowBlur = 28; ctx.strokeStyle = "rgba(142,255,194,.9)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(item.x, topEnd); ctx.lineTo(item.x, bottomStart); ctx.stroke(); ctx.restore();
  }
  function drawPickup(item) { if (!item.active) return; ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.spin); ctx.shadowBlur = 24; ctx.shadowColor = "#73f5ff"; ctx.strokeStyle = "#d6fdff"; ctx.fillStyle = "rgba(69,224,255,.62)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(17, 0); ctx.lineTo(0, 22); ctx.lineTo(-17, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function drawParticles() { particles.forEach(function (p) { ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size); }); ctx.globalAlpha = 1; }

  function updateHud() {
    p1Score.textContent = Math.round(players[0].score).toLocaleString("en-US");
    p2Score.textContent = mode === "two" ? Math.round(players[1].score).toLocaleString("en-US") : ROUTES[routeIndex].target.toLocaleString("en-US");
    p1Combo.textContent = "COMBO ×" + players[0].combo; p2Combo.textContent = mode === "two" ? "COMBO ×" + players[1].combo : "TARGET SCORE";
    p2Name.textContent = mode === "two" ? "PLAYER 2" : "TARGET";
    modeLabel.textContent = mode === "two" ? "LOCAL COURIER DUEL" : "COURIER CAMPAIGN";
    missionLabel.textContent = mode === "two" ? "SKYLINE DUEL" : "ROUTE " + (routeIndex + 1) + " • " + ROUTES[routeIndex].name.toUpperCase();
    timerLabel.textContent = formatTime(routeTime); timeFill.style.transform = "scaleX(" + clamp(routeTime / routeDuration, 0, 1).toFixed(3) + ")";
    p1Hull.textContent = "HULL " + hullIcons(players[0].hull); p2Hull.textContent = "HULL " + hullIcons(players[1].hull);
    p1Energy.style.transform = "scaleX(" + (players[0].energy / 100).toFixed(3) + ")"; p2Energy.style.transform = "scaleX(" + (players[1].energy / 100).toFixed(3) + ")";
  }
  function hullIcons(value) { return "◆".repeat(Math.max(0, value)) + "◇".repeat(Math.max(0, 3 - value)); }
  function formatTime(seconds) { var value = Math.max(0, Math.ceil(seconds)); return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0"); }
  function updateCampaignProgress() { campaignProgress.textContent = "الحملة: الطريق " + (maxUnlockedRoute + 1) + " من " + ROUTES.length + " — " + ROUTES[maxUnlockedRoute].name; }

  function normalizedKey(event) { var code = event.keyCode || event.which || 0; var map = { 4:"Escape", 13:"Enter", 19:"ArrowUp", 20:"ArrowDown", 21:"ArrowLeft", 22:"ArrowRight", 23:"Enter", 32:"Space", 62:"Space", 66:"Enter", 96:"Enter" }; var value = event.code || map[code] || event.key || ""; if (value === " " || value === "Spacebar") return "Space"; if (value === "Esc") return "Escape"; if (value.length === 1 && /[a-z]/i.test(value)) return "Key" + value.toUpperCase(); return value; }
  function directionKey(code) { return ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"].indexOf(code) !== -1; }
  function confirmKey(code) { return code === "Space" || code === "Enter" || code === "NumpadEnter"; }
  window.addEventListener("keydown", function (event) {
    var code = normalizedKey(event); if (directionKey(code) || confirmKey(code)) event.preventDefault();
    if (state === "menu") { if (!event.repeat && directionKey(code)) selectMenuMode(menuMode === "one" ? "two" : "one"); else if (!event.repeat && code === "Digit1") startGame("one"); else if (!event.repeat && code === "Digit2") startGame("two"); else if (!event.repeat && confirmKey(code)) startGame(menuMode); return; }
    keys[code] = true; if (event.repeat) return;
    if (state === "playing") {
      if (code === "Space" || code === "Enter" || code === "KeyZ" || code === "Numpad0") players[0].boostQueued = true;
      if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyX") players[0].pulseQueued = true;
      if (code === "KeyF" || code === "KeyJ") (mode === "one" ? players[0] : players[1]).boostQueued = true;
      if (code === "KeyG" || code === "KeyK") (mode === "one" ? players[0] : players[1]).pulseQueued = true;
    }
    if (code === "Escape") togglePause(); if (code === "KeyM") toggleSound();
    if (state === "paused" && confirmKey(code)) resumeGame(); if (state === "result" && confirmKey(code)) playAgain();
  }, { passive:false });
  window.addEventListener("keyup", function (event) { keys[normalizedKey(event)] = false; });
  window.addEventListener("blur", function () { keys = {}; players.forEach(function (p) { p.axisX = 0; p.axisY = 0; }); });

  function getGamepads() { return navigator.getGamepads ? Array.prototype.filter.call(navigator.getGamepads(), Boolean) : []; }
  function updateGamepads() {
    players.forEach(function (player) { player.padX = 0; player.padY = 0; });
    getGamepads().slice(0, 2).forEach(function (pad, order) {
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; }); var before = previousPadButtons[String(pad.index)] || [];
      function just(index) { return Boolean(pressed[index] && !before[index]); }
      if (mode === "one" && order === 1 && just(0)) { startGame("two", routeIndex); return; }
      var player = players[order]; if (player && player.active) {
        var x = Math.abs(pad.axes[0] || 0) > 0.16 ? pad.axes[0] : 0, y = Math.abs(pad.axes[1] || 0) > 0.16 ? pad.axes[1] : 0;
        if (pressed[14]) x = -1; if (pressed[15]) x = 1; if (pressed[12]) y = -1; if (pressed[13]) y = 1;
        player.padX = x; player.padY = y;
        if (just(0) || just(3) || just(5) || just(7)) player.boostQueued = true;
        if (just(1) || just(2) || just(4) || just(6)) player.pulseQueued = true; if (just(9)) togglePause();
      }
      previousPadButtons[String(pad.index)] = pressed;
    });
  }
  function updateControllerStatus() { var pads = getGamepads(); setController(controllerOne, pads[0], "P1"); setController(controllerTwo, pads[1], "P2"); }
  function setController(element, pad, label) { element.classList.toggle("is-connected", Boolean(pad)); element.querySelector("span").textContent = pad ? label + " " + shortenName(pad.id || "Gamepad") : label + (label === "P2" ? " اضغط A للدخول" : " بانتظار القبضة"); }
  function shortenName(name) { return name.length > 28 ? name.slice(0, 25) + "…" : name; }
  function pollIdleGamepads() {
    updateControllerStatus(); if (state === "playing") return;
    getGamepads().slice(0, 2).forEach(function (pad, order) { var pressed = Array.prototype.map.call(pad.buttons, function (b) { return b.pressed; }); var before = idlePreviousButtons[String(pad.index)] || []; function just(i) { return Boolean(pressed[i] && !before[i]); }
      if (state === "menu" && (just(12) || just(13) || just(14) || just(15))) selectMenuMode(menuMode === "one" ? "two" : "one");
      if (state === "menu" && (just(0) || just(9))) { previousPadButtons[String(pad.index)] = pressed.slice(); startGame(order === 1 ? "two" : menuMode); }
      else if (state === "paused" && (just(0) || just(9))) resumeGame(); else if (state === "result" && (just(0) || just(9))) playAgain(); else if ((state === "paused" || state === "result") && just(1)) exitGame(); idlePreviousButtons[String(pad.index)] = pressed;
    });
  }
  function selectMenuMode(next) { menuMode = next === "one" ? "one" : "two"; var one = document.getElementById("onePlayerButton"), two = document.getElementById("twoPlayerButton"); one.classList.toggle("is-selected", menuMode === "one"); two.classList.toggle("is-selected", menuMode === "two"); try { (menuMode === "one" ? one : two).focus({ preventScroll:true }); } catch (error) { (menuMode === "one" ? one : two).focus(); } }

  function bindHold(id, playerIndex, direction) { var button = document.getElementById(id); button.addEventListener("pointerdown", function (event) { event.preventDefault(); players[playerIndex].touchY = direction; }); ["pointerup","pointercancel","pointerleave"].forEach(function (name) { button.addEventListener(name, function () { players[playerIndex].touchY = 0; }); }); }
  function bindAction(id, playerIndex, key) { document.getElementById(id).addEventListener("pointerdown", function (event) { event.preventDefault(); ensureAudio(); players[playerIndex][key] = true; }); }
  bindHold("p1Up",0,-1); bindHold("p1Down",0,1); bindAction("p1Boost",0,"boostQueued"); bindAction("p1Pulse",0,"pulseQueued"); bindHold("p2Up",1,-1); bindHold("p2Down",1,1); bindAction("p2Boost",1,"boostQueued"); bindAction("p2Pulse",1,"pulseQueued");
  canvas.addEventListener("pointerdown", function (event) { if (state !== "playing") return; event.preventDefault(); var rect = canvas.getBoundingClientRect(); pointerPlayer = mode === "two" && event.clientX - rect.left > rect.width * 0.52 ? 1 : 0; players[pointerPlayer].targetY = clamp((event.clientY - rect.top) / rect.height * H, 195, 620); try { canvas.focus({preventScroll:true}); } catch (error) { canvas.focus(); } });
  canvas.addEventListener("pointermove", function (event) { if (pointerPlayer < 0 || state !== "playing") return; var rect = canvas.getBoundingClientRect(); players[pointerPlayer].targetY = clamp((event.clientY - rect.top) / rect.height * H, 195, 620); });
  ["pointerup","pointercancel","pointerleave"].forEach(function (name) { canvas.addEventListener(name, function () { pointerPlayer = -1; }); });

  function resize() { var ratio = quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 0.9); canvas.width = Math.max(640, Math.round(W * ratio)); canvas.height = Math.max(360, Math.round(H * ratio)); render(); }
  function setQuality(next, persist) { quality = next === "high" ? "high" : "light"; if (persist) writeSetting("quality", quality); qualityButton.textContent = quality === "high" ? "عالي" : "خفيف"; resize(); }
  function toggleQuality() { setQuality(quality === "high" ? "light" : "high", true); showToast(quality === "high" ? "جودة عالية" : "وضع خفيف للتلفاز", 600); }

  function ensureAudio() { if (!soundEnabled) return; var AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; if (!audio.context) { audio.context = new AudioContext(); audio.hum = audio.context.createOscillator(); audio.hum.type = "sawtooth"; audio.hum.frequency.value = 48; audio.gain = audio.context.createGain(); audio.gain.gain.value = 0; audio.hum.connect(audio.gain); audio.gain.connect(audio.context.destination); audio.hum.start(); } if (audio.context.state === "suspended") audio.context.resume(); }
  function updateAudio() { if (!audio.context || !audio.gain) return; var boosting = players.some(function (p) { return p.active && p.boost > 0; }); var now = audio.context.currentTime; audio.hum.frequency.setTargetAtTime(boosting ? 96 : 48, now, 0.06); audio.gain.gain.setTargetAtTime(soundEnabled && state === "playing" ? (boosting ? 0.015 : 0.004) : 0, now, 0.08); }
  function setHum(value) { if (audio.context && audio.gain) audio.gain.gain.setTargetAtTime(value, audio.context.currentTime, 0.06); }
  function playBeep(frequency, duration, type, volume) { if (!soundEnabled || !audio.context) return; var oscillator = audio.context.createOscillator(), gain = audio.context.createGain(), now = audio.context.currentTime; oscillator.type = type || "sine"; oscillator.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(volume || 0.03, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); oscillator.connect(gain); gain.connect(audio.context.destination); oscillator.start(now); oscillator.stop(now + duration + 0.02); }
  function updateSoundButton() { soundButton.textContent = soundEnabled ? "🔊" : "🔇"; }
  function toggleSound() { soundEnabled = !soundEnabled; writeSetting("sound", soundEnabled ? "on" : "off"); if (soundEnabled) ensureAudio(); else setHum(0); updateSoundButton(); }
  function showToast(message, duration) { window.clearTimeout(toastTimer); statusToast.textContent = message; statusToast.classList.add("is-visible"); toastTimer = window.setTimeout(function () { statusToast.classList.remove("is-visible"); }, duration || 600); }
  function showEvent(message, duration) { window.clearTimeout(messageTimer); eventMessage.textContent = message; eventMessage.classList.add("is-visible"); messageTimer = window.setTimeout(function () { eventMessage.classList.remove("is-visible"); }, duration || 700); }

  function exitGame() { if (state === "playing") pauseGame(); setHum(0); var detail = { gameId:GAME_ID, mode:mode, route:routeIndex + 1, scores:[Math.round(players[0].score),Math.round(players[1].score)], maxUnlockedRoute:maxUnlockedRoute + 1 }; try { window.dispatchEvent(new CustomEvent("dtdc-game-exit", { detail:detail })); } catch (error) {} try { if (window.DTDCGameBridge && typeof window.DTDCGameBridge.exitGame === "function") { window.DTDCGameBridge.exitGame(JSON.stringify(detail)); return; } } catch (error) {} if (window.parent && window.parent !== window) { window.parent.postMessage({type:"DTDC_GAME_EXIT",payload:detail},"*"); return; } try { window.close(); } catch (error) {} window.setTimeout(function () { if (!window.closed) showToast("يمكنك إغلاق التبويب والعودة للشاشة", 2100); }, 250); }

  document.getElementById("onePlayerButton").addEventListener("click", function () { selectMenuMode("one"); startGame("one"); });
  document.getElementById("twoPlayerButton").addEventListener("click", function () { selectMenuMode("two"); startGame("two"); });
  document.getElementById("resumeButton").addEventListener("click", resumeGame); document.getElementById("restartButton").addEventListener("click", function () { startGame(mode, routeIndex); }); playAgainButton.addEventListener("click", playAgain);
  document.getElementById("exitButton").addEventListener("click", exitGame); document.getElementById("resultExitButton").addEventListener("click", exitGame); pauseButton.addEventListener("click", togglePause); qualityButton.addEventListener("click", toggleQuality); soundButton.addEventListener("click", toggleSound);
  window.addEventListener("gamepadconnected", function () { updateControllerStatus(); showToast("تم توصيل قبضة", 600); }); window.addEventListener("gamepaddisconnected", updateControllerStatus); window.addEventListener("resize", resize); document.addEventListener("visibilitychange", function () { if (document.hidden && state === "playing") pauseGame(); else if (!document.hidden) render(); }); window.setInterval(pollIdleGamepads, 140);

  window.SkylineRush = { startOnePlayer:function(){startGame("one");}, startTwoPlayers:function(){startGame("two");}, pause:pauseGame, resume:resumeGame, exit:exitGame, setQuality:function(value){setQuality(value,true);}, getState:function(){return{gameId:GAME_ID,state:state,mode:mode,route:routeIndex+1,time:routeTime,scores:[Math.round(players[0].score),Math.round(players[1].score)]};} };
  background.addEventListener("load", render); bikeImages.forEach(function (image) { image.addEventListener("load", render); }); updateSoundButton(); updateCampaignProgress(); selectMenuMode("two"); setQuality(quality, false); updateHud(); updateControllerStatus(); render();
})();
