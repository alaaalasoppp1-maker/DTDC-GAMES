(function () {
  "use strict";

  var GAME_ID = "last-line-coastal-defense";
  var STORAGE_PREFIX = "dtdc.lastLine.";
  var app = document.getElementById("app");
  var canvas = document.getElementById("gameCanvas");
  var fatalPanel = document.getElementById("fatalPanel");
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
  var modeLabel = document.getElementById("modeLabel");
  var waveLabel = document.getElementById("waveLabel");
  var baseHealthFill = document.getElementById("baseHealthFill");
  var baseHealthText = document.getElementById("baseHealthText");
  var p1HeatFill = document.getElementById("p1HeatFill");
  var p2HeatFill = document.getElementById("p2HeatFill");
  var p1Missiles = document.getElementById("p1Missiles");
  var p2Missiles = document.getElementById("p2Missiles");
  var p1Reticle = document.getElementById("p1Reticle");
  var p2Reticle = document.getElementById("p2Reticle");
  var statusToast = document.getElementById("statusToast");
  var waveMessage = document.getElementById("waveMessage");
  var controllerOne = document.getElementById("controllerOne");
  var controllerTwo = document.getElementById("controllerTwo");
  var resultTitle = document.getElementById("resultTitle");
  var resultDetail = document.getElementById("resultDetail");
  var finalP1Score = document.getElementById("finalP1Score");
  var finalP2Score = document.getElementById("finalP2Score");

  var state = "menu";
  var mode = "two";
  var menuMode = "two";
  var quality = readSetting("quality", "light");
  var soundEnabled = readSetting("sound", "on") !== "off";
  var baseHealth = 100;
  var wave = 1;
  var waveEvent = "MIXED ASSAULT";
  var waveBest = parseInt(readSetting("bestWave", "1"), 10) || 1;
  var spawnRemaining = 0;
  var spawnTimer = 0;
  var waveTransition = 0;
  var frameHandle = 0;
  var lastFrameTime = performance.now();
  var toastTimer = 0;
  var messageTimer = 0;
  var keys = {};
  var previousPadButtons = {};
  var idlePreviousButtons = {};
  var audio = { context: null, hum: null, gain: null };

  function readSetting(key, fallback) {
    try { var value = localStorage.getItem(STORAGE_PREFIX + key); return value === null ? fallback : value; }
    catch (error) { return fallback; }
  }
  function writeSetting(key, value) { try { localStorage.setItem(STORAGE_PREFIX + key, String(value)); } catch (error) { /* Optional storage. */ } }

  function createPlayer(index) {
    return {
      index: index,
      active: index === 0,
      aimX: index === 0 ? -0.25 : 0.25,
      aimY: 0.02,
      score: 0,
      combo: 1,
      comboTimer: 0,
      heat: 0,
      overheated: false,
      cooldown: 0,
      missiles: 3,
      fireHeld: false,
      missileQueued: false,
      hits: 0,
      shots: 0
    };
  }
  var players = [createPlayer(0), createPlayer(1)];

  if (typeof window.THREE === "undefined") { fatalPanel.hidden = false; return; }
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: quality === "high", alpha: true, powerPreference: "high-performance", precision: "mediump" });
  } catch (error) { fatalPanel.hidden = false; return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = false;

  renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x315e72, quality === "high" ? 0.005 : 0.0075);
  var camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 180);
  camera.position.set(0, 6.8, 17.8);
  camera.lookAt(0, 3.0, -12);
  var raycaster = new THREE.Raycaster();
  var rayPoint = new THREE.Vector3();
  var projectVector = new THREE.Vector3();
  var waterMaterial = null;
  var sunGlow = null;
  var clouds = [];
  var elapsedTime = 0;
  var cameraShake = 0;

  var colors = { cyan: 0x2be8ff, orange: 0xffad55, yellow: 0xffe36a, pink: 0xff6fbd, red: 0xff526d, mint: 0xbaff72, white: 0xf7fcff, dark: 0x07192b, sea: 0x17617a, steel: 0x34576b };
  scene.add(new THREE.HemisphereLight(0xd9faff, 0x152435, 2.85));
  var sunLight = new THREE.DirectionalLight(0xfff1d2, 2.6);
  sunLight.position.set(-12, 22, 8);
  scene.add(sunLight);
  var rimLight = new THREE.DirectionalLight(colors.cyan, 0.9);
  rimLight.position.set(15, 5, -20);
  scene.add(rimLight);

  var shared = createSharedAssets();
  createWorld();
  var turrets = [createTurret(0), createTurret(1)];
  var enemies = createEnemyPool();
  var tracers = createTracerPool();
  var effects = createEffectPool();

  function createSharedAssets() {
    return {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(0.5, 12, 8),
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
      dark: new THREE.MeshStandardMaterial({ color: colors.dark, roughness: 0.35, metalness: 0.7 }),
      steel: new THREE.MeshStandardMaterial({ color: colors.steel, roughness: 0.45, metalness: 0.55 }),
      cyan: new THREE.MeshBasicMaterial({ color: colors.cyan }),
      orange: new THREE.MeshBasicMaterial({ color: colors.orange })
    };
  }

  function createWorld() {
    /* The painted background already contains the sea and terrain. */
    waterMaterial = null;
    var base = new THREE.Group();
    var bunker = new THREE.Mesh(shared.box, new THREE.MeshStandardMaterial({ color: 0x294a5c, emissive: 0x071c27, emissiveIntensity: 0.25, roughness: 0.65, metalness: 0.35 }));
    bunker.scale.set(9.5, 0.62, 1.75);
    bunker.position.set(0, 0.12, 9.8);
    base.add(bunker);
    for (var index = 0; index < 5; index += 1) {
      var light = new THREE.Mesh(shared.box, index % 2 ? shared.orange : shared.cyan);
      light.scale.set(0.7, 0.07, 0.07);
      light.position.set(-6 + index * 3, 0.72, 8.9);
      base.add(light);
    }
    scene.add(base);
    var towerMaterial = new THREE.MeshStandardMaterial({ color: 0x2c5265, emissive: 0x082532, emissiveIntensity: 0.24, roughness: 0.48, metalness: 0.56 });
    [-8.2, 8.2].forEach(function (x, towerIndex) {
      var tower = new THREE.Group();
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 4.6, 8), towerMaterial);
      mast.position.y = 2.3;
      tower.add(mast);
      var radar = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 7, 22), towerIndex ? shared.orange : shared.cyan);
      radar.position.y = 4.25;
      radar.rotation.x = Math.PI / 2.6;
      tower.add(radar);
      var beacon = new THREE.Mesh(shared.sphere, towerIndex ? shared.orange : shared.cyan);
      beacon.scale.setScalar(0.22);
      beacon.position.y = 4.65;
      tower.add(beacon);
      tower.position.set(x, -0.15, 9.6);
      tower.userData.radar = radar;
      scene.add(tower);
      clouds.push({ object: tower, radar: true, speed: towerIndex ? -0.8 : 0.8 });
    });
  }

  function createTurret(index) {
    var group = new THREE.Group();
    var base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 0.75, 14), shared.steel);
    base.position.y = 0.38;
    group.add(base);
    var gun = new THREE.Group();
    gun.position.y = 0.86;
    var housing = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), shared.dark);
    gun.add(housing);
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.1, 10), shared.dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -1.42;
    gun.add(barrel);
    var muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 7, 14), index === 0 ? shared.cyan : shared.orange);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = -3.0;
    gun.add(muzzle);
    var armorLeft = new THREE.Mesh(shared.box, shared.steel);
    armorLeft.scale.set(0.26, 0.72, 1.45);
    armorLeft.position.set(-0.62, -0.02, -0.72);
    gun.add(armorLeft);
    var armorRight = armorLeft.clone();
    armorRight.position.x = 0.62;
    gun.add(armorRight);
    var ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.72, 10), shared.steel);
    ammoDrum.rotation.z = Math.PI / 2;
    ammoDrum.position.set(index === 0 ? -0.82 : 0.82, -0.12, 0.05);
    gun.add(ammoDrum);
    var flashLight = new THREE.PointLight(index === 0 ? colors.cyan : colors.orange, 0, 7, 2);
    flashLight.position.set(0, 0, -3.15);
    gun.add(flashLight);
    group.add(gun);
    group.scale.setScalar(1.18);
    group.position.set(index === 0 ? -3.7 : 3.7, 0.05, 7.7);
    scene.add(group);
    return { group: group, gun: gun, muzzle: muzzle, flashLight: flashLight };
  }

  function createEnemyPool() {
    var pool = [];
    for (var index = 0; index < 36; index += 1) {
      var group = new THREE.Group();
      var bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff6f82, emissive: 0x4b0b16, emissiveIntensity: 0.45, roughness: 0.45, metalness: 0.48 });
      var body = new THREE.Mesh(shared.box, bodyMaterial);
      group.add(body);
      var wingMaterial = new THREE.MeshStandardMaterial({ color: 0x71394c, roughness: 0.55, metalness: 0.35 });
      var wing = new THREE.Mesh(shared.box, wingMaterial);
      group.add(wing);
      var glow = new THREE.Mesh(shared.sphere, new THREE.MeshBasicMaterial({ color: colors.red }));
      group.add(glow);
      var detailMaterial = new THREE.MeshStandardMaterial({ color: 0xb9d5df, emissive: 0x102936, emissiveIntensity: 0.18, roughness: 0.34, metalness: 0.7 });
      var detail1 = new THREE.Mesh(shared.cylinder, detailMaterial);
      var detail2 = new THREE.Mesh(shared.cylinder, detailMaterial.clone());
      var detail3 = new THREE.Mesh(shared.box, detailMaterial.clone());
      var wake = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.2), new THREE.MeshBasicMaterial({ color: 0xcffcff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
      wake.rotation.x = -Math.PI / 2;
      group.add(detail1); group.add(detail2); group.add(detail3); group.add(wake);
      group.visible = false;
      scene.add(group);
      pool.push({ group: group, body: body, wing: wing, glow: glow, detail1: detail1, detail2: detail2, detail3: detail3, wake: wake, active: false, type: "drone", x: 0, y: 0, z: 0, speed: 0, hp: 1, maxHp: 1, radius: 0.1, value: 100, damage: 6, wobble: 0, phase: 0, flashTimer: 0 });
    }
    return pool;
  }

  function createTracerPool() {
    var pool = [];
    for (var index = 0; index < 18; index += 1) {
      var positions = new Float32Array(6);
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      var material = new THREE.LineBasicMaterial({ color: index % 2 ? colors.orange : colors.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      var line = new THREE.Line(geometry, material);
      line.visible = false;
      scene.add(line);
      pool.push({ line: line, geometry: geometry, positions: positions, life: 0, maxLife: 0.09 });
    }
    return pool;
  }

  function createEffectPool() {
    var pool = [];
    for (var index = 0; index < 14; index += 1) {
      var group = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), new THREE.MeshBasicMaterial({ color: colors.orange, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      var flash = new THREE.Mesh(shared.sphere, new THREE.MeshBasicMaterial({ color: colors.yellow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      var smoke = new THREE.Mesh(shared.sphere, new THREE.MeshBasicMaterial({ color: 0x203342, transparent: true, opacity: 0, depthWrite: false }));
      group.add(ring); group.add(flash); group.add(smoke);
      group.visible = false;
      scene.add(group);
      pool.push({ group: group, ring: ring, flash: flash, smoke: smoke, life: 0, maxLife: 0.58, scale: 2 });
    }
    return pool;
  }

  function configureEnemy(enemy, type) {
    enemy.type = type;
    enemy.active = true;
    enemy.phase = Math.random() * Math.PI * 2;
    enemy.x = (Math.random() * 2 - 1) * (type === "boss" ? 6 : 11.5);
    enemy.z = -34 - Math.random() * 7;
    enemy.wobble = 0.5 + Math.random() * 1.1;
    enemy.body.position.set(0, 0, 0);
    enemy.wing.position.set(0, 0, 0);
    enemy.glow.position.set(0, 0, 0);
    enemy.body.rotation.set(0, 0, 0);
    enemy.wing.rotation.set(0, 0, 0);
    enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = enemy.wake.visible = false;
    enemy.detail1.position.set(0, 0, 0); enemy.detail2.position.set(0, 0, 0); enemy.detail3.position.set(0, 0, 0); enemy.wake.position.set(0, 0.04, -2.5);
    enemy.detail1.rotation.set(0, 0, 0); enemy.detail2.rotation.set(0, 0, 0); enemy.detail3.rotation.set(0, 0, 0);
    enemy.wake.scale.set(1, 1, 1);
    enemy.group.scale.setScalar(type === "boss" ? 1.08 : 1.22);
    enemy.flashTimer = 0;
    var difficulty = 1 + Math.max(0, wave - 1) * 0.09;
    if (type === "drone") {
      enemy.y = 4 + Math.random() * 6; enemy.speed = 4.0 * difficulty; enemy.maxHp = 1 + Math.floor(wave / 7); enemy.value = 120; enemy.damage = 7; enemy.radius = 0.11;
      enemy.body.scale.set(1.05, 0.35, 1.25); enemy.wing.scale.set(3.4, 0.12, 0.46); enemy.glow.scale.setScalar(0.25); enemy.glow.position.set(0, 0, 0.8);
      enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = true;
      enemy.detail1.scale.set(1.15, 0.05, 1.15); enemy.detail1.position.set(-1.25, 0.22, 0);
      enemy.detail2.scale.set(1.15, 0.05, 1.15); enemy.detail2.position.set(1.25, 0.22, 0);
      enemy.detail3.scale.set(0.38, 0.3, 0.7); enemy.detail3.position.set(0, -0.04, 0.9);
      setEnemyColor(enemy, 0xff6687, 0x703044);
    } else if (type === "boat") {
      enemy.y = 0.5; enemy.speed = 2.7 * difficulty; enemy.maxHp = 2 + Math.floor(wave / 6); enemy.value = 180; enemy.damage = 10; enemy.radius = 0.13;
      enemy.body.scale.set(1.5, 0.6, 3.0); enemy.wing.scale.set(0.8, 0.65, 0.9); enemy.wing.position.set(0, 0.5, 0.25); enemy.glow.scale.setScalar(0.24); enemy.glow.position.set(0, 0.6, -0.3);
      enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = enemy.wake.visible = true;
      enemy.detail1.scale.set(0.48, 0.55, 0.48); enemy.detail1.position.set(0, 0.92, -0.15);
      enemy.detail2.scale.set(0.12, 1.55, 0.12); enemy.detail2.rotation.x = Math.PI / 2; enemy.detail2.position.set(0, 0.95, 0.72);
      enemy.detail3.scale.set(1.56, 0.08, 2.15); enemy.detail3.position.set(0, -0.28, 0.1);
      setEnemyColor(enemy, 0xe96565, 0x633b48);
    } else if (type === "transport") {
      enemy.y = 0.66; enemy.speed = 2.1 * difficulty; enemy.maxHp = 4 + Math.floor(wave / 4); enemy.value = 280; enemy.damage = 16; enemy.radius = 0.16;
      enemy.body.scale.set(2.15, 1.0, 3.9); enemy.wing.scale.set(1.25, 1.0, 1.2); enemy.wing.position.set(0, 0.8, -0.25); enemy.glow.scale.setScalar(0.3); enemy.glow.position.set(0, 1.15, -0.5);
      enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = enemy.wake.visible = true;
      enemy.detail1.scale.set(0.7, 0.72, 0.7); enemy.detail1.position.set(0, 1.42, -0.45);
      enemy.detail2.scale.set(0.15, 1.9, 0.15); enemy.detail2.rotation.x = Math.PI / 2; enemy.detail2.position.set(0, 1.45, 0.55);
      enemy.detail3.scale.set(1.8, 0.14, 3.15); enemy.detail3.position.set(0, -0.45, 0.1);
      enemy.wake.scale.set(1.35, 1.45, 1);
      setEnemyColor(enemy, 0xc35454, 0x493949);
    } else if (type === "bomber") {
      enemy.y = 7 + Math.random() * 3; enemy.speed = 5.2 * difficulty; enemy.maxHp = 3 + Math.floor(wave / 6); enemy.value = 260; enemy.damage = 14; enemy.radius = 0.14;
      enemy.body.scale.set(1.5, 0.5, 2.6); enemy.wing.scale.set(5.2, 0.15, 0.7); enemy.glow.scale.setScalar(0.3); enemy.glow.position.set(0, 0, 1.45);
      enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = true;
      enemy.detail1.scale.set(0.42, 1.2, 0.42); enemy.detail1.rotation.x = Math.PI / 2; enemy.detail1.position.set(-1.7, -0.08, 0.15);
      enemy.detail2.scale.set(0.42, 1.2, 0.42); enemy.detail2.rotation.x = Math.PI / 2; enemy.detail2.position.set(1.7, -0.08, 0.15);
      enemy.detail3.scale.set(0.35, 0.48, 1.0); enemy.detail3.position.set(0, 0.28, -0.25);
      setEnemyColor(enemy, 0xd05b9d, 0x54384f);
    } else {
      enemy.y = 1.2; enemy.speed = 1.35 * difficulty; enemy.maxHp = 18 + wave * 2; enemy.value = 1800; enemy.damage = 34; enemy.radius = 0.23;
      enemy.body.scale.set(4.3, 1.6, 7.2); enemy.wing.scale.set(2.6, 1.7, 2.2); enemy.wing.position.set(0, 1.25, -0.5); enemy.glow.scale.setScalar(0.48); enemy.glow.position.set(0, 1.65, -1);
      enemy.detail1.visible = enemy.detail2.visible = enemy.detail3.visible = enemy.wake.visible = true;
      enemy.detail1.scale.set(0.88, 1.1, 0.88); enemy.detail1.position.set(-1.25, 2.2, -0.8);
      enemy.detail2.scale.set(0.88, 1.1, 0.88); enemy.detail2.position.set(1.25, 2.2, -0.8);
      enemy.detail3.scale.set(3.5, 0.2, 5.8); enemy.detail3.position.set(0, -0.72, 0.2);
      enemy.wake.scale.set(2.6, 2.1, 1);
      setEnemyColor(enemy, 0xa54352, 0x302d3b);
    }
    enemy.hp = enemy.maxHp;
    enemy.group.position.set(enemy.x, enemy.y, enemy.z);
    enemy.group.visible = true;
  }

  function setEnemyColor(enemy, bodyColor, wingColor) {
    enemy.body.material.color.setHex(bodyColor);
    enemy.body.material.emissive.setHex(bodyColor);
    enemy.body.material.emissiveIntensity = 0.16;
    enemy.wing.material.color.setHex(wingColor);
  }

  function startGame(nextMode) {
    ensureAudio();
    mode = nextMode === "one" ? "one" : "two";
    app.dataset.mode = mode;
    players = [createPlayer(0), createPlayer(1)];
    players[1].active = mode === "two";
    baseHealth = 100;
    wave = 1;
    cameraShake = 0;
    enemies.forEach(deactivateEnemy);
    tracers.forEach(function (tracer) { tracer.life = 0; tracer.line.visible = false; });
    effects.forEach(function (effect) { effect.life = 0; effect.group.visible = false; });
    positionTurrets();
    startWave();
    setState("playing");
    showWaveMessage("الموجة 1", 1000);
    lastFrameTime = performance.now();
    requestFrame();
  }

  function startWave() {
    waveEvent = wave % 5 === 0 ? "COMMANDER" : wave % 4 === 0 ? "NAVAL SURGE" : wave % 3 === 0 ? "AIR RAID" : "MIXED ASSAULT";
    spawnRemaining = Math.min(25, 5 + wave * 2 + (mode === "two" ? 3 : 0));
    spawnTimer = 0.55;
    waveTransition = 0;
    players.forEach(function (player) {
      if (!player.active) return;
      player.missiles = Math.min(3, player.missiles + (wave > 1 ? 1 : 0));
      player.combo = 1;
      player.comboTimer = 0;
    });
    updateHud();
  }

  function spawnNextEnemy() {
    var enemy = enemies.find(function (candidate) { return !candidate.active; });
    if (!enemy) return;
    var type;
    if (wave % 5 === 0 && spawnRemaining === 1) type = "boss";
    else if (waveEvent === "AIR RAID") type = Math.random() < 0.46 && wave >= 4 ? "bomber" : "drone";
    else if (waveEvent === "NAVAL SURGE") type = Math.random() < 0.48 && wave >= 3 ? "transport" : "boat";
    else {
      var roll = Math.random();
      if (wave >= 4 && roll < 0.18) type = "bomber";
      else if (wave >= 3 && roll < 0.43) type = "transport";
      else if (roll < 0.68) type = "boat";
      else type = "drone";
    }
    configureEnemy(enemy, type);
    spawnRemaining -= 1;
    spawnTimer = Math.max(0.28, 1.08 - wave * 0.035) * (0.75 + Math.random() * 0.5);
  }

  function deactivateEnemy(enemy) { enemy.active = false; enemy.group.visible = false; }

  function setState(nextState) {
    state = nextState;
    app.dataset.state = nextState;
    menuPanel.hidden = nextState !== "menu";
    pausePanel.hidden = nextState !== "paused";
    resultPanel.hidden = nextState !== "result";
    pauseButton.textContent = nextState === "paused" ? "▶" : "Ⅱ";
  }

  function pauseGame() { if (state !== "playing") return; setState("paused"); setHumVolume(0); renderScene(); }
  function resumeGame() { if (state !== "paused") return; setState("playing"); lastFrameTime = performance.now(); requestFrame(); }
  function togglePause() { if (state === "playing") pauseGame(); else if (state === "paused") resumeGame(); }
  function requestFrame() { if (!frameHandle && state === "playing" && !document.hidden) frameHandle = requestAnimationFrame(frame); }

  function frame(now) {
    frameHandle = 0;
    if (state !== "playing" || document.hidden) return;
    var dt = Math.min(0.04, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    updateInput(dt);
    updateGame(dt);
    updateAudio();
    renderScene();
    if (state === "playing") requestFrame();
  }

  function updateInput(dt) {
    var p1x = 0, p1y = 0, p2x = 0, p2y = 0;
    if (keys.ArrowLeft) p1x -= 1;
    if (keys.ArrowRight) p1x += 1;
    if (keys.ArrowUp) p1y += 1;
    if (keys.ArrowDown) p1y -= 1;
    if (keys.KeyA) p2x -= 1;
    if (keys.KeyD) p2x += 1;
    if (keys.KeyW) p2y += 1;
    if (keys.KeyS) p2y -= 1;
    players[0].fireHeld = Boolean(keys.Space || keys.Enter || keys.NumpadEnter || keys.KeyZ || keys.PointerFire || keys.TouchFire);
    players[1].fireHeld = Boolean(keys.KeyF);
    if (mode === "one") {
      p1x += p2x; p1y += p2y;
      if (keys.KeyF) players[0].fireHeld = true;
    }
    var pads = getGamepads();
    pads.slice(0, 2).forEach(function (pad, padOrder) {
      var playerIndex = padOrder;
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; });
      var before = previousPadButtons[String(pad.index)] || [];
      function justPressed(index) { return Boolean(pressed[index] && !before[index]); }
      if (mode === "one" && padOrder === 1 && justPressed(0)) joinPlayerTwo();
      if (playerIndex < players.length && players[playerIndex].active) {
        var x = Math.abs(pad.axes[0] || 0) > 0.15 ? pad.axes[0] : 0;
        var y = Math.abs(pad.axes[1] || 0) > 0.15 ? -(pad.axes[1] || 0) : 0;
        if (pressed[14]) x = -1;
        if (pressed[15]) x = 1;
        if (pressed[12]) y = 1;
        if (pressed[13]) y = -1;
        if (playerIndex === 0) { p1x = x || p1x; p1y = y || p1y; }
        else { p2x = x || p2x; p2y = y || p2y; }
        players[playerIndex].fireHeld = players[playerIndex].fireHeld || Boolean(pressed[0] || pressed[5] || pressed[7]);
        if (justPressed(1) || justPressed(2) || justPressed(3) || justPressed(4)) players[playerIndex].missileQueued = true;
        if (justPressed(9)) togglePause();
      }
      previousPadButtons[String(pad.index)] = pressed;
    });
    moveAim(players[0], p1x, p1y, dt);
    if (players[1].active) moveAim(players[1], p2x, p2y, dt);
  }

  function moveAim(player, x, y, dt) {
    player.aimX = THREE.MathUtils.clamp(player.aimX + x * dt * 0.92, -0.86, 0.86);
    player.aimY = THREE.MathUtils.clamp(player.aimY + y * dt * 0.88, -0.52, 0.66);
    updateReticle(player);
    updateTurret(player);
  }

  function updateReticle(player) {
    var reticle = player.index === 0 ? p1Reticle : p2Reticle;
    reticle.style.left = ((player.aimX * 0.5 + 0.5) * 100).toFixed(2) + "%";
    reticle.style.top = ((-player.aimY * 0.5 + 0.5) * 100).toFixed(2) + "%";
  }

  function updateTurret(player) {
    var turret = turrets[player.index];
    turret.gun.rotation.y = -player.aimX * 0.74;
    turret.gun.rotation.x = 0.02 + player.aimY * 0.38;
  }

  function updateGame(dt) {
    players.forEach(function (player) {
      if (!player.active) return;
      player.cooldown = Math.max(0, player.cooldown - dt);
      player.heat = Math.max(0, player.heat - dt * (player.overheated ? 0.48 : 0.25));
      if (player.overheated && player.heat < 0.34) { player.overheated = false; showToast("P" + (player.index + 1) + " السلاح جاهز", 600); }
      if (player.comboTimer > 0) { player.comboTimer -= dt; if (player.comboTimer <= 0) player.combo = 1; }
      if (player.fireHeld) fireWeapon(player);
      if (player.missileQueued) { player.missileQueued = false; fireMissile(player); }
    });
    updateEnemies(dt);
    updateWaves(dt);
    updateTracers(dt);
    updateEffects(dt);
    updateAtmosphere(dt);
    updateHud();
  }

  function fireWeapon(player) {
    if (player.cooldown > 0 || player.overheated) return;
    var focusMode = player.combo >= 5;
    player.cooldown = focusMode ? 0.075 : 0.105;
    player.heat = Math.min(1, player.heat + (focusMode ? 0.052 : 0.075));
    player.shots += 1;
    if (player.heat >= 0.99) { player.overheated = true; showToast("P" + (player.index + 1) + " حرارة قصوى!", 700); playBeep(105, 0.18, "sawtooth", 0.045); }
    var target = findTarget(player, 0.155);
    var targetPoint;
    if (target) {
      targetPoint = new THREE.Vector3(target.x, target.y, target.z);
      damageEnemy(target, 1, player);
    } else targetPoint = pointAlongAim(player, 58);
    createTracer(player, targetPoint, false);
    turretFlash(player);
    cameraShake = Math.min(0.45, cameraShake + 0.025);
    playBeep(player.index === 0 ? 210 : 175, 0.045, "square", 0.013);
  }

  function findTarget(player, radius) {
    var best = null;
    var bestDistance = radius;
    enemies.forEach(function (enemy) {
      if (!enemy.active) return;
      projectVector.set(enemy.x, enemy.y, enemy.z).project(camera);
      if (projectVector.z < -1 || projectVector.z > 1) return;
      var dx = projectVector.x - player.aimX;
      var dy = projectVector.y - player.aimY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var threshold = radius + enemy.radius;
      if (distance < threshold && distance < bestDistance + enemy.radius) { best = enemy; bestDistance = distance; }
    });
    return best;
  }

  function pointAlongAim(player, distance) {
    raycaster.setFromCamera(new THREE.Vector2(player.aimX, player.aimY), camera);
    return raycaster.ray.at(distance, rayPoint).clone();
  }

  function damageEnemy(enemy, damage, player) {
    if (!enemy.active) return;
    enemy.hp -= damage;
    player.hits += 1;
    enemy.flashTimer = 0.1;
    var reticle = player.index === 0 ? p1Reticle : p2Reticle;
    reticle.classList.add("is-hit");
    window.setTimeout(function () { reticle.classList.remove("is-hit"); }, 70);
    enemy.glow.scale.multiplyScalar(1.14);
    window.setTimeout(function () { if (enemy.active) enemy.glow.scale.multiplyScalar(0.88); }, 40);
    if (enemy.hp <= 0) destroyEnemy(enemy, player);
  }

  function destroyEnemy(enemy, player) {
    if (!enemy.active) return;
    deactivateEnemy(enemy);
    var points = enemy.value * player.combo;
    player.score += points;
    player.combo = Math.min(9, player.combo + 1);
    player.comboTimer = 2.4;
    createExplosion(enemy.x, enemy.y, enemy.z, enemy.type === "boss" ? 7 : 2.7, enemy.type === "boss" ? colors.yellow : colors.orange);
    cameraShake = Math.min(1, cameraShake + (enemy.type === "boss" ? 0.7 : 0.12));
    if (enemy.type === "boss") { baseHealth = Math.min(100, baseHealth + 18); showWaveMessage("القائد دُمّر!", 900); }
    else if (baseHealth < 88 && Math.random() < 0.12) { baseHealth = Math.min(100, baseHealth + 4); showToast("إمداد إصلاح +4%", 520); }
    else if (player.combo >= 4) showToast("P" + (player.index + 1) + " COMBO ×" + player.combo, 480);
    playBeep(enemy.type === "boss" ? 80 : 125, enemy.type === "boss" ? 0.34 : 0.13, "sawtooth", enemy.type === "boss" ? 0.07 : 0.035);
  }

  function fireMissile(player) {
    if (player.missiles <= 0) { showToast("P" + (player.index + 1) + " لا توجد صواريخ", 600); return; }
    player.missiles -= 1;
    var targets = enemies.filter(function (enemy) { return enemy.active; }).sort(function (a, b) { return b.z - a.z; }).slice(0, quality === "high" ? 8 : 6);
    if (!targets.length) { player.missiles += 1; return; }
    targets.forEach(function (enemy, index) {
      window.setTimeout(function () {
        if (!enemy.active) return;
        createTracer(player, new THREE.Vector3(enemy.x, enemy.y, enemy.z), true);
        damageEnemy(enemy, enemy.type === "boss" ? 5 : 99, player);
      }, index * 55);
    });
    showWaveMessage("MISSILE STRIKE", 620);
    cameraShake = Math.min(1, cameraShake + 0.22);
    playBeep(360, 0.28, "sawtooth", 0.055);
  }

  function createTracer(player, target, missile) {
    var tracer = tracers.find(function (candidate) { return candidate.life <= 0; }) || tracers[0];
    var turret = turrets[player.index];
    var start = new THREE.Vector3();
    turret.muzzle.getWorldPosition(start);
    tracer.positions[0] = start.x; tracer.positions[1] = start.y; tracer.positions[2] = start.z;
    tracer.positions[3] = target.x; tracer.positions[4] = target.y; tracer.positions[5] = target.z;
    tracer.geometry.attributes.position.needsUpdate = true;
    tracer.line.material.color.setHex(missile ? colors.yellow : player.index === 0 ? colors.cyan : colors.orange);
    tracer.line.material.opacity = 1;
    tracer.life = missile ? 0.19 : tracer.maxLife;
    tracer.line.visible = true;
  }

  function turretFlash(player) {
    var turret = turrets[player.index];
    var muzzle = turret.muzzle;
    muzzle.scale.setScalar(1.5);
    turret.flashLight.intensity = quality === "high" ? 5 : 2.5;
    window.setTimeout(function () { muzzle.scale.setScalar(1); turret.flashLight.intensity = 0; }, 42);
  }

  function updateEnemies(dt) {
    enemies.forEach(function (enemy) {
      if (!enemy.active) return;
      enemy.z += enemy.speed * dt;
      enemy.phase += dt * enemy.wobble;
      if (enemy.type === "drone" || enemy.type === "bomber") enemy.x += Math.sin(enemy.phase * 2.2) * dt * (enemy.type === "bomber" ? 1.3 : 0.8);
      else enemy.y = 0.52 + Math.sin(enemy.phase * 2.6) * 0.08 + (enemy.type === "transport" ? 0.14 : enemy.type === "boss" ? 0.7 : 0);
      enemy.group.position.set(enemy.x, enemy.y, enemy.z);
      enemy.group.rotation.z = (enemy.type === "drone" || enemy.type === "bomber") ? Math.sin(enemy.phase * 2) * 0.14 : 0;
      enemy.glow.rotation.y += dt * 3;
      if (enemy.type === "drone") { enemy.detail1.rotation.y += dt * 18; enemy.detail2.rotation.y -= dt * 18; }
      if (enemy.type === "boat" || enemy.type === "transport" || enemy.type === "boss") enemy.wake.material.opacity = 0.12 + Math.sin(enemy.phase * 3) * 0.05;
      if (enemy.flashTimer > 0) { enemy.flashTimer -= dt; enemy.body.material.emissiveIntensity = 1.25; }
      else enemy.body.material.emissiveIntensity = 0.16;
      if (enemy.z > 7.8) hitBase(enemy);
    });
  }

  function hitBase(enemy) {
    if (!enemy.active) return;
    baseHealth = Math.max(0, baseHealth - enemy.damage);
    createExplosion(enemy.x, Math.max(0.5, enemy.y), 7.5, enemy.type === "boss" ? 7 : 3.2, colors.red);
    cameraShake = Math.min(1.2, cameraShake + (enemy.type === "boss" ? 1 : 0.48));
    deactivateEnemy(enemy);
    players.forEach(function (player) { player.combo = 1; player.comboTimer = 0; });
    showToast("ضربة للقاعدة −" + enemy.damage, 700);
    playBeep(72, 0.35, "sawtooth", 0.07);
    if (baseHealth <= 0) finishGame();
  }

  function updateWaves(dt) {
    if (state !== "playing") return;
    if (spawnRemaining > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawnNextEnemy();
      return;
    }
    if (enemies.some(function (enemy) { return enemy.active; })) return;
    if (waveTransition <= 0) {
      waveTransition = 2.7;
      showWaveMessage("تم صد الموجة " + wave, 900);
      baseHealth = Math.min(100, baseHealth + 5);
      playBeep(620, 0.17, "triangle", 0.045);
    } else {
      waveTransition -= dt;
      if (waveTransition <= 0) {
        wave += 1;
        waveBest = Math.max(waveBest, wave);
        writeSetting("bestWave", waveBest);
        startWave();
        showWaveMessage(wave % 5 === 0 ? "موجة القائد " + wave : "الموجة " + wave, 950);
      }
    }
  }

  function createExplosion(x, y, z, scale, color) {
    var effect = effects.find(function (candidate) { return candidate.life <= 0; }) || effects[0];
    effect.life = effect.maxLife;
    effect.scale = scale;
    effect.group.position.set(x, y, z);
    effect.group.scale.setScalar(0.15);
    effect.ring.material.color.setHex(color);
    effect.flash.material.color.setHex(color);
    effect.ring.material.opacity = 0.9;
    effect.flash.material.opacity = 1;
    effect.smoke.material.opacity = 0.44;
    effect.flash.scale.setScalar(1);
    effect.smoke.position.set(0, 0, 0);
    effect.smoke.scale.setScalar(0.6);
    effect.group.visible = true;
  }

  function updateEffects(dt) {
    effects.forEach(function (effect) {
      if (effect.life <= 0) return;
      effect.life -= dt;
      var progress = 1 - Math.max(0, effect.life) / effect.maxLife;
      effect.group.scale.setScalar(0.15 + progress * effect.scale);
      effect.ring.material.opacity = Math.max(0, (1 - progress) * 0.9);
      effect.flash.material.opacity = Math.max(0, (1 - progress * 2.3));
      effect.flash.scale.setScalar(1 + progress * 0.8);
      effect.smoke.material.opacity = Math.max(0, (1 - progress) * 0.4);
      effect.smoke.position.y = progress * 0.55;
      effect.smoke.scale.setScalar(0.6 + progress * 1.35);
      if (effect.life <= 0) effect.group.visible = false;
    });
  }

  function updateAtmosphere(dt) {
    elapsedTime += dt;
    if (waterMaterial) waterMaterial.uniforms.time.value = elapsedTime;
    if (sunGlow) {
      var pulse = 1 + Math.sin(elapsedTime * 0.65) * 0.035;
      sunGlow.scale.setScalar(pulse);
      sunGlow.material.opacity = 0.17 + Math.sin(elapsedTime * 0.8) * 0.035;
    }
    clouds.forEach(function (item) {
      if (item.radar) item.object.userData.radar.rotation.z += dt * item.speed;
      else {
        item.object.position.x += dt * item.speed;
        if (item.object.position.x > 46) item.object.position.x = -46;
      }
    });
    cameraShake = Math.max(0, cameraShake - dt * 2.2);
    var shake = cameraShake * cameraShake;
    camera.position.x = (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 6.8 + (Math.random() - 0.5) * shake * 0.28;
    camera.position.z = 17.8 + (Math.random() - 0.5) * shake * 0.2;
    camera.lookAt(0, 3.0, -12);
  }

  function updateTracers(dt) {
    tracers.forEach(function (tracer) {
      if (tracer.life <= 0) return;
      tracer.life -= dt;
      tracer.line.material.opacity = Math.max(0, tracer.life / tracer.maxLife);
      if (tracer.life <= 0) tracer.line.visible = false;
    });
  }

  function joinPlayerTwo() {
    if (mode === "two") return;
    mode = "two";
    app.dataset.mode = mode;
    players[1].active = true;
    players[1].missiles = 3;
    positionTurrets();
    showWaveMessage("PLAYER 2 JOINED", 780);
    updateHud();
  }

  function positionTurrets() {
    turrets[0].group.position.x = mode === "one" ? 0 : -3.7;
    turrets[1].group.position.x = 3.7;
    turrets[1].group.visible = mode === "two";
    players[0].aimX = mode === "one" ? 0 : -0.25;
    players[1].aimX = 0.25;
    updateReticle(players[0]); updateReticle(players[1]);
    updateTurret(players[0]); updateTurret(players[1]);
  }

  function finishGame() {
    if (state !== "playing") return;
    waveBest = Math.max(waveBest, wave);
    writeSetting("bestWave", waveBest);
    resultTitle.textContent = wave >= 10 ? "صمود أسطوري!" : wave >= 5 ? "دفاع قوي!" : "سقط خط الدفاع";
    resultDetail.textContent = "وصلتم إلى الموجة " + wave + " — أفضل موجة على الجهاز: " + waveBest;
    finalP1Score.textContent = players[0].score.toLocaleString("en-US");
    finalP2Score.textContent = mode === "two" ? players[1].score.toLocaleString("en-US") : "0";
    setState("result");
    setHumVolume(0);
    renderScene();
  }

  function updateHud() {
    p1Score.textContent = players[0].score.toLocaleString("en-US");
    p2Score.textContent = mode === "two" ? players[1].score.toLocaleString("en-US") : waveBest.toLocaleString("en-US");
    p1Combo.textContent = "COMBO ×" + players[0].combo;
    p2Combo.textContent = mode === "two" ? "COMBO ×" + players[1].combo : "BEST WAVE";
    p2Name.textContent = mode === "two" ? "PLAYER 2" : "BEST";
    modeLabel.textContent = mode === "two" ? "LOCAL CO-OP" : "SOLO DEFENSE";
    waveLabel.textContent = "WAVE " + wave + " • " + waveEvent;
    baseHealthFill.style.transform = "scaleX(" + (baseHealth / 100).toFixed(3) + ")";
    baseHealthText.textContent = "BASE " + Math.ceil(baseHealth) + "%";
    p1HeatFill.style.transform = "scaleX(" + players[0].heat.toFixed(3) + ")";
    p2HeatFill.style.transform = "scaleX(" + players[1].heat.toFixed(3) + ")";
    p1Missiles.textContent = "MISSILES ×" + players[0].missiles + (players[0].overheated ? " • COOLING" : "");
    p2Missiles.textContent = "MISSILES ×" + players[1].missiles + (players[1].overheated ? " • COOLING" : "");
  }

  function selectMenuMode(nextMode) {
    menuMode = nextMode === "one" ? "one" : "two";
    var oneButton = document.getElementById("onePlayerButton");
    var twoButton = document.getElementById("twoPlayerButton");
    oneButton.classList.toggle("is-selected", menuMode === "one");
    twoButton.classList.toggle("is-selected", menuMode === "two");
    (menuMode === "one" ? oneButton : twoButton).focus({ preventScroll: true });
  }

  function getGamepads() { return navigator.getGamepads ? Array.prototype.filter.call(navigator.getGamepads(), Boolean) : []; }
  function updateControllerStatus() {
    var pads = getGamepads();
    setControllerPill(controllerOne, pads[0], "P1");
    setControllerPill(controllerTwo, pads[1], "P2");
  }
  function setControllerPill(element, pad, label) {
    element.classList.toggle("is-connected", Boolean(pad));
    element.querySelector("span").textContent = pad ? label + " " + shortenName(pad.id || "Gamepad") : label + (label === "P2" ? " اضغط A للدخول" : " بانتظار القبضة");
  }
  function shortenName(name) { return name.length > 28 ? name.slice(0, 25) + "…" : name; }

  function pollIdleGamepads() {
    updateControllerStatus();
    if (state === "playing") return;
    getGamepads().slice(0, 2).forEach(function (pad, order) {
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; });
      var before = idlePreviousButtons[String(pad.index)] || [];
      function justPressed(index) { return Boolean(pressed[index] && !before[index]); }
      if (state === "menu" && (justPressed(12) || justPressed(13) || justPressed(14) || justPressed(15))) selectMenuMode(menuMode === "one" ? "two" : "one");
      if (state === "menu" && (justPressed(0) || justPressed(9))) {
        previousPadButtons[String(pad.index)] = pressed.slice();
        startGame(order === 1 ? "two" : menuMode);
      } else if (state === "paused" && (justPressed(0) || justPressed(9))) resumeGame();
      else if (state === "result" && (justPressed(0) || justPressed(9))) startGame(mode);
      else if ((state === "paused" || state === "result") && justPressed(1)) exitGame();
      idlePreviousButtons[String(pad.index)] = pressed;
    });
  }

  function normalizedKey(event) {
    var keyCode = event.keyCode || event.which || 0;
    var androidMap = { 4: "Escape", 19: "ArrowUp", 20: "ArrowDown", 21: "ArrowLeft", 22: "ArrowRight", 23: "Enter", 62: "Space", 66: "Enter", 96: "Enter" };
    return event.code || androidMap[keyCode] || event.key || "";
  }
  function isDirectionKey(code) { return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].indexOf(code) !== -1; }
  function isConfirmKey(code) { return code === "Space" || code === "Enter" || code === "NumpadEnter"; }

  function resize() {
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  }
  function renderScene() { renderer.render(scene, camera); }

  function setQuality(nextQuality, persist) {
    quality = nextQuality === "high" ? "high" : "light";
    if (persist) writeSetting("quality", quality);
    qualityButton.textContent = quality === "high" ? "عالي" : "خفيف";
    renderer.setPixelRatio(quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.35) : Math.min(window.devicePixelRatio || 1, 0.9));
    scene.fog.density = quality === "high" ? 0.005 : 0.0075;
    renderer.toneMappingExposure = quality === "high" ? 1.28 : 1.2;
    scene.traverse(function (object) { if (object.userData && object.userData.highOnly) object.visible = quality === "high"; });
    resize(); renderScene();
  }
  function toggleQuality() { setQuality(quality === "high" ? "light" : "high", true); showToast(quality === "high" ? "جودة عالية" : "وضع خفيف للتلفاز", 700); }
  function updateSoundButton() { soundButton.textContent = soundEnabled ? "🔊" : "🔇"; }
  function toggleSound() { soundEnabled = !soundEnabled; writeSetting("sound", soundEnabled ? "on" : "off"); if (soundEnabled) ensureAudio(); else setHumVolume(0); updateSoundButton(); }

  function ensureAudio() {
    if (!soundEnabled) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio.context) {
      audio.context = new AudioContext();
      audio.hum = audio.context.createOscillator(); audio.hum.type = "sine"; audio.hum.frequency.value = 38;
      audio.gain = audio.context.createGain(); audio.gain.gain.value = 0;
      audio.hum.connect(audio.gain); audio.gain.connect(audio.context.destination); audio.hum.start();
    }
    if (audio.context.state === "suspended") audio.context.resume();
  }
  function updateAudio() { if (!audio.context || !audio.gain) return; var now = audio.context.currentTime; audio.hum.frequency.setTargetAtTime(36 + Math.min(24, wave * 2), now, 0.1); audio.gain.gain.setTargetAtTime(soundEnabled && state === "playing" ? 0.008 : 0, now, 0.08); }
  function setHumVolume(value) { if (audio.context && audio.gain) audio.gain.gain.setTargetAtTime(value, audio.context.currentTime, 0.06); }
  function playBeep(frequency, duration, type, volume) {
    if (!soundEnabled || !audio.context) return;
    var oscillator = audio.context.createOscillator(); var gain = audio.context.createGain(); var now = audio.context.currentTime;
    oscillator.type = type || "sine"; oscillator.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(volume || 0.04, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(audio.context.destination); oscillator.start(now); oscillator.stop(now + duration + 0.02);
  }

  function showToast(message, duration) { window.clearTimeout(toastTimer); statusToast.textContent = message; statusToast.classList.add("is-visible"); toastTimer = window.setTimeout(function () { statusToast.classList.remove("is-visible"); }, duration || 700); }
  function showWaveMessage(message, duration) { window.clearTimeout(messageTimer); waveMessage.textContent = message; waveMessage.classList.add("is-visible"); messageTimer = window.setTimeout(function () { waveMessage.classList.remove("is-visible"); }, duration || 800); }

  function exitGame() {
    if (state === "playing") pauseGame();
    setHumVolume(0);
    var detail = { gameId: GAME_ID, mode: mode, wave: wave, bestWave: waveBest, scores: [players[0].score, players[1].score] };
    try { window.dispatchEvent(new CustomEvent("dtdc-game-exit", { detail: detail })); } catch (error) { /* Older WebView. */ }
    try { if (window.DTDCGameBridge && typeof window.DTDCGameBridge.exitGame === "function") { window.DTDCGameBridge.exitGame(JSON.stringify(detail)); return; } } catch (error) { /* Browser fallback. */ }
    if (window.parent && window.parent !== window) { window.parent.postMessage({ type: "DTDC_GAME_EXIT", payload: detail }, "*"); return; }
    try { window.close(); } catch (error) { /* May be blocked. */ }
    window.setTimeout(function () { if (!window.closed) showToast("يمكنك إغلاق هذا التبويب والعودة للشاشة", 2100); }, 250);
  }

  document.getElementById("onePlayerButton").addEventListener("click", function () { selectMenuMode("one"); startGame("one"); });
  document.getElementById("twoPlayerButton").addEventListener("click", function () { selectMenuMode("two"); startGame("two"); });
  document.getElementById("resumeButton").addEventListener("click", resumeGame);
  document.getElementById("restartButton").addEventListener("click", function () { startGame(mode); });
  document.getElementById("playAgainButton").addEventListener("click", function () { startGame(mode); });
  document.getElementById("exitButton").addEventListener("click", exitGame);
  document.getElementById("resultExitButton").addEventListener("click", exitGame);
  pauseButton.addEventListener("click", togglePause);
  qualityButton.addEventListener("click", toggleQuality);
  soundButton.addEventListener("click", toggleSound);

  window.addEventListener("keydown", function (event) {
    var code = normalizedKey(event);
    if (isDirectionKey(code) || isConfirmKey(code)) event.preventDefault();
    if (state === "menu") {
      if (!event.repeat && isDirectionKey(code)) selectMenuMode(menuMode === "one" ? "two" : "one");
      else if (!event.repeat && code === "Digit1") { selectMenuMode("one"); startGame("one"); }
      else if (!event.repeat && code === "Digit2") { selectMenuMode("two"); startGame("two"); }
      else if (!event.repeat && isConfirmKey(code)) startGame(menuMode);
      return;
    }
    keys[code] = true;
    if (!event.repeat) {
      if (state === "playing" && (code === "ShiftLeft" || code === "ShiftRight" || code === "Slash")) players[0].missileQueued = true;
      if (state === "playing" && (code === "KeyE" || code === "KeyX")) (mode === "two" ? players[1] : players[0]).missileQueued = true;
      if (code === "Escape") togglePause();
      if (code === "KeyM") toggleSound();
      if (state === "paused" && isConfirmKey(code)) resumeGame();
      if (state === "result" && isConfirmKey(code)) startGame(mode);
    }
  }, { passive: false });
  window.addEventListener("keyup", function (event) { keys[normalizedKey(event)] = false; });

  canvas.addEventListener("pointermove", function (event) {
    if (state !== "playing") return;
    var rect = canvas.getBoundingClientRect();
    players[0].aimX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -0.86, 0.86);
    players[0].aimY = THREE.MathUtils.clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -0.52, 0.66);
    updateReticle(players[0]); updateTurret(players[0]);
  });
  canvas.addEventListener("pointerdown", function (event) { if (state === "playing") { event.preventDefault(); keys.PointerFire = true; fireWeapon(players[0]); } });
  canvas.addEventListener("pointerup", function () { keys.PointerFire = false; });
  canvas.addEventListener("pointercancel", function () { keys.PointerFire = false; });
  document.getElementById("touchFire").addEventListener("pointerdown", function (event) { event.preventDefault(); keys.TouchFire = true; });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) { document.getElementById("touchFire").addEventListener(name, function () { keys.TouchFire = false; }); });
  document.getElementById("touchMissile").addEventListener("pointerdown", function (event) { event.preventDefault(); players[0].missileQueued = true; });

  window.addEventListener("gamepadconnected", function () { updateControllerStatus(); showToast("تم توصيل قبضة", 650); });
  window.addEventListener("gamepaddisconnected", function () { updateControllerStatus(); showToast("تم فصل قبضة", 650); });
  window.addEventListener("resize", function () { resize(); renderScene(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "playing") pauseGame(); else if (!document.hidden) renderScene(); });
  canvas.addEventListener("webglcontextlost", function (event) { event.preventDefault(); if (frameHandle) cancelAnimationFrame(frameHandle); frameHandle = 0; fatalPanel.hidden = false; });
  window.setInterval(pollIdleGamepads, 140);

  window.LastLineDefense = {
    startOnePlayer: function () { startGame("one"); },
    startTwoPlayers: function () { startGame("two"); },
    joinPlayerTwo: joinPlayerTwo,
    pause: pauseGame,
    resume: resumeGame,
    exit: exitGame,
    setQuality: function (value) { setQuality(value, true); },
    getState: function () { return { gameId: GAME_ID, state: state, mode: mode, wave: wave, bestWave: waveBest, baseHealth: baseHealth, scores: [players[0].score, players[1].score] }; }
  };

  positionTurrets();
  updateSoundButton();
  selectMenuMode("two");
  setQuality(quality, false);
  resize();
  updateHud();
  updateControllerStatus();
  renderScene();
})();
