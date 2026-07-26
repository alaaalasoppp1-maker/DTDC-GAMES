(function () {
  "use strict";

  var GAME_ID = "pulse-arena-core-clash";
  var MATCH_SECONDS = 120;
  var WIN_SCORE = 5;
  var ARENA_X = 12.4;
  var ARENA_Z = 7.4;
  var GOAL_X = 11.15;
  var GOAL_HALF_Z = 2.55;
  var STORAGE_PREFIX = "dtdc.pulseArena.";

  var app = document.getElementById("app");
  var canvas = document.getElementById("gameCanvas");
  var fatalPanel = document.getElementById("fatalPanel");
  var menuPanel = document.getElementById("menuPanel");
  var pausePanel = document.getElementById("pausePanel");
  var resultPanel = document.getElementById("resultPanel");
  var statusToast = document.getElementById("statusToast");
  var roundMessage = document.getElementById("roundMessage");
  var timeValue = document.getElementById("timeValue");
  var matchState = document.getElementById("matchState");
  var suddenDeathLabel = document.getElementById("suddenDeathLabel");
  var playerOneScore = document.getElementById("playerOneScore");
  var playerTwoScore = document.getElementById("playerTwoScore");
  var playerTwoName = document.getElementById("playerTwoName");
  var p1DashFill = document.getElementById("p1DashFill");
  var p1PulseFill = document.getElementById("p1PulseFill");
  var p2DashFill = document.getElementById("p2DashFill");
  var p2PulseFill = document.getElementById("p2PulseFill");
  var p1Shield = document.getElementById("p1Shield");
  var p2Shield = document.getElementById("p2Shield");
  var controllerOne = document.getElementById("controllerOne");
  var controllerTwo = document.getElementById("controllerTwo");
  var qualityButton = document.getElementById("qualityButton");
  var soundButton = document.getElementById("soundButton");
  var pauseButton = document.getElementById("pauseButton");
  var winnerTitle = document.getElementById("winnerTitle");
  var finalP1Score = document.getElementById("finalP1Score");
  var finalP2Score = document.getElementById("finalP2Score");
  var resultDetail = document.getElementById("resultDetail");

  var state = "menu";
  var mode = "two";
  var quality = readSetting("quality", "light");
  var soundEnabled = readSetting("sound", "on") !== "off";
  var matchTime = MATCH_SECONDS;
  var scores = [0, 0];
  var suddenDeath = false;
  var roundPause = 0;
  var lastRoundNumber = -1;
  var frameHandle = 0;
  var lastFrameTime = performance.now();
  var toastTimer = 0;
  var roundMessageTimer = 0;
  var goalSerial = 0;
  var keys = {};
  var actionQueue = [{ dash: false, pulse: false }, { dash: false, pulse: false }];
  var previousPadButtons = [[], []];
  var idlePadArmed = [false, false];
  var hazardTimer = 22;
  var hazardWarned = false;
  var powerupTimer = 5;
  var audio = { context: null, hum: null, humGain: null };

  function readSetting(key, fallback) {
    try {
      var value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeSetting(key, value) {
    try { localStorage.setItem(STORAGE_PREFIX + key, String(value)); } catch (error) { /* Optional storage. */ }
  }

  if (typeof window.THREE === "undefined") {
    fatalPanel.hidden = false;
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: quality === "high",
      alpha: false,
      powerPreference: "high-performance",
      precision: "mediump"
    });
  } catch (error) {
    fatalPanel.hidden = false;
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.33;
  renderer.shadowMap.enabled = false;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b2943);
  scene.fog = new THREE.FogExp2(0x123a55, quality === "high" ? 0.014 : 0.017);

  var camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 240);
  camera.position.set(0, 17.8, 16.4);
  camera.lookAt(0, 0, 0);

  var colors = {
    cyan: 0x24e8ff,
    cyanSoft: 0xa1f8ff,
    pink: 0xff58d3,
    pinkSoft: 0xffc2ef,
    mint: 0xc9ff62,
    orange: 0xffc15b,
    red: 0xff617d,
    violet: 0xa276ff,
    floor: 0x10283a,
    wall: 0x234b63,
    dark: 0x08121e,
    white: 0xf4fcff
  };

  scene.add(new THREE.HemisphereLight(0xb8f2ff, 0x0a1625, 3.15));
  var keyLight = new THREE.DirectionalLight(0xf5fcff, 2.5);
  keyLight.position.set(-8, 18, 10);
  scene.add(keyLight);
  var pinkLight = new THREE.DirectionalLight(colors.pink, 1.1);
  pinkLight.position.set(12, 7, -10);
  scene.add(pinkLight);

  var shared = createSharedAssets();
  var arena = createArena();
  var players = [createPlayer(0, colors.cyan), createPlayer(1, colors.pink)];
  var core = createCore();
  var bumpers = createBumpers();
  var powerups = createPowerups();
  var pulseEffects = createPulseEffects();
  var sparks = createSparkSystem();
  createSky();

  function createSharedAssets() {
    var box = new THREE.BoxGeometry(1, 1, 1);
    return {
      box: box,
      white: new THREE.MeshBasicMaterial({ color: colors.white }),
      cyan: new THREE.MeshBasicMaterial({ color: colors.cyan }),
      pink: new THREE.MeshBasicMaterial({ color: colors.pink }),
      mint: new THREE.MeshBasicMaterial({ color: colors.mint }),
      orange: new THREE.MeshBasicMaterial({ color: colors.orange }),
      dark: new THREE.MeshStandardMaterial({ color: colors.dark, roughness: 0.38, metalness: 0.62 }),
      floor: new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.74, metalness: 0.23 }),
      wall: new THREE.MeshStandardMaterial({ color: colors.wall, emissive: 0x0a2938, emissiveIntensity: 0.28, roughness: 0.52, metalness: 0.28 })
    };
  }

  function createArena() {
    var group = new THREE.Group();
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(26.2, 16.2), shared.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    group.add(floor);

    for (var x = -10; x <= 10; x += 2) {
      var xLine = new THREE.Mesh(shared.box, x === 0 ? shared.white : shared.cyan);
      xLine.scale.set(x === 0 ? 0.045 : 0.018, 0.018, 14.5);
      xLine.position.set(x, 0.025, 0);
      xLine.material = x % 4 === 0 ? shared.cyan : new THREE.MeshBasicMaterial({ color: 0x34718a, transparent: true, opacity: 0.5 });
      group.add(xLine);
    }
    for (var z = -6; z <= 6; z += 2) {
      var zLine = new THREE.Mesh(shared.box, z === 0 ? shared.white : shared.pink);
      zLine.scale.set(24.7, 0.018, z === 0 ? 0.045 : 0.018);
      zLine.position.set(0, 0.026, z);
      zLine.material = z % 4 === 0 ? shared.pink : new THREE.MeshBasicMaterial({ color: 0x664d79, transparent: true, opacity: 0.48 });
      group.add(zLine);
    }

    var centerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.43, 48),
      new THREE.MeshBasicMaterial({ color: colors.mint, transparent: true, opacity: 0.64, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.035;
    group.add(centerRing);

    addWall(group, 0, -7.72, 25.6, 0.34, shared.cyan);
    addWall(group, 0, 7.72, 25.6, 0.34, shared.pink);
    [-5.25, 5.25].forEach(function (z) {
      addWall(group, -12.72, z, 0.34, 5.15, shared.cyan);
      addWall(group, 12.72, z, 0.34, 5.15, shared.pink);
    });

    addGoal(group, -1, shared.cyan);
    addGoal(group, 1, shared.pink);

    for (var index = 0; index < 12; index += 1) {
      var angle = index / 12 * Math.PI * 2;
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), index % 2 ? shared.pink : shared.cyan);
      lamp.position.set(Math.cos(angle) * 15.4, 2.4 + (index % 3) * 0.55, Math.sin(angle) * 10.2);
      lamp.userData.highOnly = true;
      group.add(lamp);
    }

    scene.add(group);
    return group;
  }

  function addWall(group, x, z, width, depth, neonMaterial) {
    var wall = new THREE.Mesh(shared.box, shared.wall);
    wall.scale.set(width, 0.62, depth);
    wall.position.set(x, 0.31, z);
    group.add(wall);
    var neon = new THREE.Mesh(shared.box, neonMaterial);
    neon.scale.set(width + 0.04, 0.055, depth + 0.04);
    neon.position.set(x, 0.66, z);
    group.add(neon);
  }

  function addGoal(group, side, material) {
    var x = side * 12.48;
    var zoneMaterial = new THREE.MeshBasicMaterial({ color: side < 0 ? colors.cyan : colors.pink, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    var zone = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5), zoneMaterial);
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(side * 11.45, 0.04, 0);
    group.add(zone);
    [-2.85, 2.85].forEach(function (z) {
      var post = new THREE.Mesh(shared.box, material);
      post.scale.set(0.16, 2.9, 0.16);
      post.position.set(x, 1.45, z);
      group.add(post);
    });
    var beam = new THREE.Mesh(shared.box, material);
    beam.scale.set(0.16, 0.16, 5.86);
    beam.position.set(x, 2.9, 0);
    group.add(beam);
  }

  function createPlayer(index, color) {
    var mesh = new THREE.Group();
    var bodyMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.16, roughness: 0.22, metalness: 0.78 });
    var body = new THREE.Mesh(shared.box, bodyMaterial);
    body.scale.set(1.35, 0.38, 1.9);
    body.position.y = 0.62;
    mesh.add(body);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.63, 0.85, 4), bodyMaterial);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.z = Math.PI / 4;
    nose.position.set(0, 0.62, -1.26);
    mesh.add(nose);
    var cabin = new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 7), shared.dark);
    cabin.scale.set(1, 0.58, 1.18);
    cabin.position.set(0, 0.93, 0.08);
    mesh.add(cabin);
    var trimMaterial = index === 0 ? shared.mint : shared.orange;
    var trim = new THREE.Mesh(shared.box, trimMaterial);
    trim.scale.set(0.09, 0.035, 1.55);
    trim.position.set(0, 0.84, -0.05);
    mesh.add(trim);
    [-0.78, 0.78].forEach(function (x) {
      var pod = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.28, 10), shared.dark);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(x, 0.42, 0.18);
      mesh.add(pod);
      var glow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), index === 0 ? shared.cyan : shared.pink);
      glow.position.set(x, 0.43, 0.88);
      mesh.add(glow);
    });
    var underglowMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false });
    var underglow = new THREE.Mesh(new THREE.CircleGeometry(1.18, 24), underglowMaterial);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.07;
    mesh.add(underglow);
    var shieldMaterial = new THREE.MeshBasicMaterial({ color: colors.mint, transparent: true, opacity: 0.16, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 8), shieldMaterial);
    shieldMesh.position.y = 0.62;
    shieldMesh.visible = false;
    mesh.add(shieldMesh);
    scene.add(mesh);
    return {
      index: index,
      mesh: mesh,
      shieldMesh: shieldMesh,
      color: color,
      x: index === 0 ? -7.3 : 7.3,
      z: 0,
      vx: 0,
      vz: 0,
      dirX: index === 0 ? 1 : -1,
      dirZ: 0,
      dashCd: 0,
      pulseCd: 0,
      dashTime: 0,
      shield: 0,
      boostTime: 0,
      carrier: false,
      hits: 0
    };
  }

  function createCore() {
    var group = new THREE.Group();
    var material = new THREE.MeshStandardMaterial({ color: colors.mint, emissive: colors.mint, emissiveIntensity: 2.2, roughness: 0.14, metalness: 0.48 });
    var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 1), material);
    group.add(orb);
    var ringMaterial = new THREE.MeshBasicMaterial({ color: colors.white, transparent: true, opacity: 0.76, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.79, 24), ringMaterial);
    group.add(ring);
    var ringTwo = ring.clone();
    ringTwo.rotation.y = Math.PI / 2;
    group.add(ringTwo);
    group.position.set(0, 0.72, 0);
    scene.add(group);
    return { mesh: group, orb: orb, ring: ring, ringTwo: ringTwo, x: 0, z: 0, vx: 0, vz: 0, carrier: -1, lockout: 0 };
  }

  function createBumpers() {
    var list = [];
    [[-4.4, -3.6], [-4.4, 3.6], [4.4, -3.6], [4.4, 3.6]].forEach(function (position, index) {
      var group = new THREE.Group();
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.74, 16), shared.wall);
      base.position.y = 0.37;
      group.add(base);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 7, 20), index % 2 ? shared.pink : shared.cyan);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.76;
      group.add(ring);
      group.position.set(position[0], 0, position[1]);
      scene.add(group);
      list.push({ mesh: group, x: position[0], z: position[1], radius: 0.92, ring: ring });
    });
    return list;
  }

  function createPowerups() {
    var types = ["shield", "turbo", "pulse"];
    return types.map(function (type, index) {
      var color = type === "shield" ? colors.mint : type === "turbo" ? colors.orange : colors.violet;
      var material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.9, roughness: 0.2, metalness: 0.44 });
      var mesh = new THREE.Mesh(type === "shield" ? new THREE.IcosahedronGeometry(0.46, 0) : new THREE.OctahedronGeometry(0.48, 0), material);
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.7, 20), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.64, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      var group = new THREE.Group();
      mesh.position.y = 0.72;
      ring.position.y = 0.72;
      group.add(mesh, ring);
      group.visible = false;
      scene.add(group);
      return { type: type, mesh: group, ring: ring, active: false, life: 0, x: 0, z: 0, phase: index * 2.1 };
    });
  }

  function createPulseEffects() {
    var effects = [];
    for (var index = 0; index < 5; index += 1) {
      var material = new THREE.MeshBasicMaterial({ color: index < 2 ? (index === 0 ? colors.cyan : colors.pink) : colors.orange, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), material);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      effects.push({ mesh: ring, life: 0, maxLife: 0.5, maxScale: 4.6 });
    }
    return effects;
  }

  function createSparkSystem() {
    var count = 112;
    var positions = new Float32Array(count * 3);
    var colorData = new Float32Array(count * 3);
    var particles = [];
    for (var index = 0; index < count; index += 1) {
      positions[index * 3 + 1] = -100;
      colorData[index * 3] = colorData[index * 3 + 1] = colorData[index * 3 + 2] = 1;
      particles.push({ life: 0, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0 });
    }
    var geometry = new THREE.BufferGeometry();
    var positionAttribute = new THREE.BufferAttribute(positions, 3);
    var colorAttribute = new THREE.BufferAttribute(colorData, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("color", colorAttribute);
    var points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: quality === "high" ? 0.2 : 0.16, vertexColors: true, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(points);
    return { points: points, geometry: geometry, positions: positions, colors: colorData, particles: particles };
  }

  function createSky() {
    var material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x071a3e) },
        midColor: { value: new THREE.Color(0x226b91) },
        bottomColor: { value: new THREE.Color(0x8f3f80) }
      },
      vertexShader: "varying float h; void main(){ h=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor; varying float h; void main(){ float y=clamp(h*.5+.5,0.0,1.0); vec3 c=mix(bottomColor,midColor,smoothstep(.15,.56,y)); c=mix(c,topColor,smoothstep(.5,.95,y)); gl_FragColor=vec4(c,1.0); }",
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(190, quality === "high" ? 24 : 16, 12), material);
    sky.renderOrder = -100;
    scene.add(sky);
    var points = [];
    for (var index = 0; index < (quality === "high" ? 380 : 190); index += 1) points.push((Math.random() - 0.5) * 180, 18 + Math.random() * 62, (Math.random() - 0.5) * 150);
    var starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: colors.cyanSoft, size: 0.13, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  function resetPlayer(player, x, z, dirX) {
    player.x = x;
    player.z = z;
    player.vx = player.vz = 0;
    player.dirX = dirX;
    player.dirZ = 0;
    player.dashTime = 0;
    player.dashCd = 0;
    player.pulseCd = 0;
    player.shield = 0;
    player.boostTime = 0;
    player.carrier = false;
    player.mesh.position.set(x, 0, z);
    player.shieldMesh.visible = false;
  }

  function resetCore() {
    core.x = core.z = core.vx = core.vz = 0;
    core.carrier = -1;
    core.lockout = 0.75;
    core.mesh.position.set(0, 0.72, 0);
    players[0].carrier = players[1].carrier = false;
  }

  function resetRound(delay) {
    resetPlayer(players[0], -7.3, 0, 1);
    resetPlayer(players[1], 7.3, 0, -1);
    resetCore();
    roundPause = delay;
    lastRoundNumber = -1;
    actionQueue[0].dash = actionQueue[0].pulse = false;
    actionQueue[1].dash = actionQueue[1].pulse = false;
  }

  function startMatch(nextMode) {
    ensureAudio();
    mode = nextMode === "one" ? "one" : "two";
    app.dataset.mode = mode;
    playerTwoName.textContent = mode === "one" ? "PULSE AI" : "PLAYER 2";
    scores = [0, 0];
    matchTime = MATCH_SECONDS;
    suddenDeath = false;
    suddenDeathLabel.classList.remove("is-visible");
    matchState.textContent = "CORE CLASH";
    hazardTimer = 22;
    hazardWarned = false;
    powerupTimer = 5;
    powerups.forEach(function (item) { item.active = false; item.mesh.visible = false; });
    players.forEach(function (player) { player.dashCd = player.pulseCd = player.hits = 0; });
    resetRound(3.2);
    setState("playing");
    updateHud();
    lastFrameTime = performance.now();
    requestFrame();
  }

  function setState(nextState) {
    state = nextState;
    app.dataset.state = nextState;
    menuPanel.hidden = nextState !== "menu";
    pausePanel.hidden = nextState !== "paused";
    resultPanel.hidden = nextState !== "result";
    pauseButton.textContent = nextState === "paused" ? "▶" : "Ⅱ";
  }

  function pauseMatch() {
    if (state !== "playing") return;
    setState("paused");
    setHumVolume(0);
    renderScene();
  }

  function resumeMatch() {
    if (state !== "paused") return;
    setState("playing");
    lastFrameTime = performance.now();
    requestFrame();
  }

  function togglePause() {
    if (state === "playing") pauseMatch();
    else if (state === "paused") resumeMatch();
  }

  function requestFrame() {
    if (!frameHandle && state === "playing" && !document.hidden) frameHandle = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameHandle = 0;
    if (state !== "playing" || document.hidden) return;
    var dt = Math.min(0.04, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    updateGame(dt);
    updateCamera(dt);
    updateAudio();
    renderScene();
    if (state === "playing") requestFrame();
  }

  function updateGame(dt) {
    updateVisualEffects(dt);
    updatePowerups(dt);
    if (roundPause > 0) {
      roundPause -= dt;
      updateRoundCountdown();
      updateMeshes(dt);
      updateHud();
      return;
    }

    var p1Controls = getControls(0);
    var p2Controls = mode === "one" ? getAiControls(dt) : getControls(1);
    updatePlayer(players[0], p1Controls, dt);
    updatePlayer(players[1], p2Controls, dt);
    resolvePlayerCollision();
    resolveBumperCollisions(dt);
    updateCore(dt);
    checkPowerupCollection();
    updateHazard(dt);
    updateMeshes(dt);

    if (!suddenDeath) {
      matchTime = Math.max(0, matchTime - dt);
      if (matchTime <= 0) {
        if (scores[0] === scores[1]) {
          suddenDeath = true;
          suddenDeathLabel.classList.add("is-visible");
          matchState.textContent = "GOLDEN CORE";
          showRoundMessage("هدف ذهبي", 1200);
          playBeep(520, 0.2, "triangle", 0.05);
        } else {
          finishMatch(scores[0] > scores[1] ? 0 : 1);
        }
      }
    }
    updateHud();
  }

  function updateRoundCountdown() {
    var number = Math.ceil(roundPause);
    if (number !== lastRoundNumber) {
      lastRoundNumber = number;
      if (number > 0 && number <= 3) {
        showRoundMessage(String(number), 600);
        playBeep(300 + (3 - number) * 90, 0.08, "sine", 0.035);
      }
    }
    if (roundPause <= 0) {
      showRoundMessage("انطلق!", 650);
      playBeep(670, 0.12, "triangle", 0.045);
    }
  }

  function getControls(index) {
    var pad = getGamepad(index);
    var x = 0;
    var z = 0;
    if (index === 0) {
      x += keys.KeyD ? 1 : 0;
      x -= keys.KeyA ? 1 : 0;
      z += keys.KeyS ? 1 : 0;
      z -= keys.KeyW ? 1 : 0;
    } else {
      x += keys.ArrowRight ? 1 : 0;
      x -= keys.ArrowLeft ? 1 : 0;
      z += keys.ArrowDown ? 1 : 0;
      z -= keys.ArrowUp ? 1 : 0;
    }
    var dashPressed = actionQueue[index].dash;
    var pulsePressed = actionQueue[index].pulse;
    actionQueue[index].dash = actionQueue[index].pulse = false;

    if (pad) {
      var padX = Math.abs(pad.axes[0] || 0) > 0.16 ? pad.axes[0] : 0;
      var padZ = Math.abs(pad.axes[1] || 0) > 0.16 ? pad.axes[1] : 0;
      if (pad.buttons[14] && pad.buttons[14].pressed) padX = -1;
      if (pad.buttons[15] && pad.buttons[15].pressed) padX = 1;
      if (pad.buttons[12] && pad.buttons[12].pressed) padZ = -1;
      if (pad.buttons[13] && pad.buttons[13].pressed) padZ = 1;
      if (Math.abs(padX) + Math.abs(padZ) > 0.05) { x = padX; z = padZ; }
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; });
      function justPressed(buttonIndex) { return Boolean(pressed[buttonIndex] && !previousPadButtons[index][buttonIndex]); }
      dashPressed = dashPressed || justPressed(0) || justPressed(7);
      pulsePressed = pulsePressed || justPressed(1) || justPressed(2);
      if (justPressed(9)) togglePause();
      previousPadButtons[index] = pressed;
    }
    var length = Math.sqrt(x * x + z * z);
    if (length > 1) { x /= length; z /= length; }
    return { x: x, z: z, dash: dashPressed, pulse: pulsePressed };
  }

  function getAiControls(dt) {
    var ai = players[1];
    var targetX;
    var targetZ;
    if (core.carrier === 1) {
      targetX = -11.6;
      targetZ = Math.sin(matchTime * 0.8) * 1.1;
    } else if (core.carrier === 0) {
      targetX = players[0].x;
      targetZ = players[0].z;
    } else {
      targetX = core.x;
      targetZ = core.z;
    }
    var dx = targetX - ai.x;
    var dz = targetZ - ai.z;
    var distanceToTarget = Math.sqrt(dx * dx + dz * dz) || 1;
    var x = dx / distanceToTarget;
    var z = dz / distanceToTarget;
    var dash = ai.dashCd <= 0 && (distanceToTarget > 4.6 || (core.carrier === 0 && distanceToTarget < 2.8));
    var pulse = ai.pulseCd <= 0 && core.carrier === 0 && distanceToTarget < 4.4;
    if (ai.x < -10.7 && Math.abs(ai.z) > GOAL_HALF_Z) z += ai.z > 0 ? -0.7 : 0.7;
    return { x: x, z: z, dash: dash, pulse: pulse };
  }

  function updatePlayer(player, controls, dt) {
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.pulseCd = Math.max(0, player.pulseCd - dt);
    player.dashTime = Math.max(0, player.dashTime - dt);
    player.boostTime = Math.max(0, player.boostTime - dt);

    if (controls.dash && player.dashCd <= 0) startDash(player);
    if (controls.pulse && player.pulseCd <= 0) firePulse(player);

    var moving = Math.abs(controls.x) + Math.abs(controls.z) > 0.04;
    if (moving) {
      player.dirX += (controls.x - player.dirX) * Math.min(1, dt * 9);
      player.dirZ += (controls.z - player.dirZ) * Math.min(1, dt * 9);
      var dirLength = Math.sqrt(player.dirX * player.dirX + player.dirZ * player.dirZ) || 1;
      player.dirX /= dirLength;
      player.dirZ /= dirLength;
    }

    var maxSpeed = player.carrier ? 5.7 : player.boostTime > 0 ? 8.4 : 7;
    if (player.dashTime > 0) {
      player.vx = player.dirX * 14.5;
      player.vz = player.dirZ * 14.5;
    } else {
      var targetVx = controls.x * maxSpeed;
      var targetVz = controls.z * maxSpeed;
      player.vx += (targetVx - player.vx) * Math.min(1, dt * 7.4);
      player.vz += (targetVz - player.vz) * Math.min(1, dt * 7.4);
      if (!moving) {
        player.vx *= Math.max(0, 1 - dt * 4.5);
        player.vz *= Math.max(0, 1 - dt * 4.5);
      }
    }

    player.x += player.vx * dt;
    player.z += player.vz * dt;
    containPlayer(player);
  }

  function startDash(player) {
    player.dashCd = 1.35;
    player.dashTime = 0.22;
    createPulseEffect(player.x, 0.08, player.z, player.index, 1.6);
    playBeep(player.index === 0 ? 220 : 250, 0.09, "sawtooth", 0.028);
  }

  function firePulse(player) {
    player.pulseCd = 4.6;
    createPulseEffect(player.x, 0.08, player.z, player.index, 4.6);
    var opponent = players[1 - player.index];
    var dx = opponent.x - player.x;
    var dz = opponent.z - player.z;
    var distanceToOpponent = Math.sqrt(dx * dx + dz * dz) || 1;
    if (distanceToOpponent < 4.55) hitPlayer(player, opponent, dx / distanceToOpponent, dz / distanceToOpponent, 8.8, true);
    if (core.carrier < 0) {
      var coreDx = core.x - player.x;
      var coreDz = core.z - player.z;
      var coreDistance = Math.sqrt(coreDx * coreDx + coreDz * coreDz) || 1;
      if (coreDistance < 5) {
        core.vx += coreDx / coreDistance * 11;
        core.vz += coreDz / coreDistance * 11;
      }
    }
    playBeep(player.index === 0 ? 480 : 540, 0.16, "triangle", 0.045);
  }

  function containPlayer(player) {
    if (player.z < -ARENA_Z) { player.z = -ARENA_Z; player.vz = Math.abs(player.vz) * 0.45; }
    if (player.z > ARENA_Z) { player.z = ARENA_Z; player.vz = -Math.abs(player.vz) * 0.45; }
    if (player.x < -ARENA_X) { player.x = -ARENA_X; player.vx = Math.abs(player.vx) * 0.45; }
    if (player.x > ARENA_X) { player.x = ARENA_X; player.vx = -Math.abs(player.vx) * 0.45; }
  }

  function resolvePlayerCollision() {
    var one = players[0];
    var two = players[1];
    var dx = two.x - one.x;
    var dz = two.z - one.z;
    var distanceBetween = Math.sqrt(dx * dx + dz * dz) || 0.001;
    var minimum = 1.48;
    if (distanceBetween >= minimum) return;
    var nx = dx / distanceBetween;
    var nz = dz / distanceBetween;
    var overlap = minimum - distanceBetween;
    one.x -= nx * overlap * 0.5;
    one.z -= nz * overlap * 0.5;
    two.x += nx * overlap * 0.5;
    two.z += nz * overlap * 0.5;
    if (one.dashTime > 0 && two.dashTime <= 0) hitPlayer(one, two, nx, nz, 9.5, false);
    else if (two.dashTime > 0 && one.dashTime <= 0) hitPlayer(two, one, -nx, -nz, 9.5, false);
    else {
      one.vx -= nx * 1.7;
      one.vz -= nz * 1.7;
      two.vx += nx * 1.7;
      two.vz += nz * 1.7;
    }
  }

  function hitPlayer(attacker, target, nx, nz, force, pulseHit) {
    if (target.shield > 0) {
      target.shield = 0;
      target.shieldMesh.visible = false;
      showToast("درع اللاعب " + (target.index + 1) + " امتص الضربة", 850);
      burstSparks(target.x, 0.8, target.z, colors.mint, quality === "high" ? 26 : 16, 4);
      return;
    }
    target.vx += nx * force;
    target.vz += nz * force;
    target.hits += 1;
    if (core.carrier === target.index) dropCore(target, nx * 7, nz * 7);
    burstSparks(target.x, 0.72, target.z, attacker.color, quality === "high" ? 34 : 22, 5.2);
    if (!pulseHit) playBeep(120, 0.12, "square", 0.04);
  }

  function dropCore(player, forceX, forceZ) {
    player.carrier = false;
    core.carrier = -1;
    core.x = player.x + player.dirX * 1.2;
    core.z = player.z + player.dirZ * 1.2;
    core.vx = forceX + player.vx * 0.35;
    core.vz = forceZ + player.vz * 0.35;
    core.lockout = 0.55;
    showToast("سقطت نواة الطاقة!", 700);
  }

  function updateCore(dt) {
    core.lockout = Math.max(0, core.lockout - dt);
    if (core.carrier >= 0) {
      var carrier = players[core.carrier];
      core.x += (carrier.x - core.x) * Math.min(1, dt * 13);
      core.z += (carrier.z - core.z) * Math.min(1, dt * 13);
      core.vx = core.vz = 0;
      if (carrier.index === 0 && carrier.x > GOAL_X && Math.abs(carrier.z) < GOAL_HALF_Z) scoreGoal(0);
      else if (carrier.index === 1 && carrier.x < -GOAL_X && Math.abs(carrier.z) < GOAL_HALF_Z) scoreGoal(1);
      return;
    }

    core.x += core.vx * dt;
    core.z += core.vz * dt;
    core.vx *= Math.max(0, 1 - dt * 1.8);
    core.vz *= Math.max(0, 1 - dt * 1.8);
    if (core.x < -ARENA_X) { core.x = -ARENA_X; core.vx = Math.abs(core.vx) * 0.7; }
    if (core.x > ARENA_X) { core.x = ARENA_X; core.vx = -Math.abs(core.vx) * 0.7; }
    if (core.z < -ARENA_Z) { core.z = -ARENA_Z; core.vz = Math.abs(core.vz) * 0.7; }
    if (core.z > ARENA_Z) { core.z = ARENA_Z; core.vz = -Math.abs(core.vz) * 0.7; }

    if (core.lockout <= 0) {
      players.forEach(function (player) {
        if (core.carrier >= 0) return;
        var dx = core.x - player.x;
        var dz = core.z - player.z;
        if (dx * dx + dz * dz < 1.25 * 1.25) pickCore(player);
      });
    }
  }

  function pickCore(player) {
    core.carrier = player.index;
    player.carrier = true;
    core.vx = core.vz = 0;
    showToast("اللاعب " + (player.index + 1) + " يحمل النواة", 900);
    burstSparks(core.x, 0.8, core.z, player.color, quality === "high" ? 26 : 16, 3.5);
    playBeep(player.index === 0 ? 640 : 700, 0.12, "sine", 0.04);
  }

  function scoreGoal(playerIndex) {
    if (roundPause > 0 || state !== "playing") return;
    scores[playerIndex] += 1;
    goalSerial += 1;
    burstSparks(players[playerIndex].x, 1, players[playerIndex].z, players[playerIndex].color, quality === "high" ? 60 : 38, 7.5);
    showRoundMessage("هدف!", 1100);
    playGoalSound(playerIndex);
    updateHud();
    if (suddenDeath || scores[playerIndex] >= WIN_SCORE) {
      roundPause = 1;
      resetCore();
      window.setTimeout(function () {
        if (state === "playing" && (suddenDeath || scores[playerIndex] >= WIN_SCORE)) finishMatch(playerIndex);
      }, 700);
    } else {
      resetRound(4.05);
    }
  }

  function resolveBumperCollisions(dt) {
    bumpers.forEach(function (bumper, bumperIndex) {
      bumper.ring.rotation.z += dt * (bumperIndex % 2 ? 1.3 : -1.3);
      players.forEach(function (player) {
        var dx = player.x - bumper.x;
        var dz = player.z - bumper.z;
        var distanceBetween = Math.sqrt(dx * dx + dz * dz) || 0.001;
        var minimum = bumper.radius + 0.74;
        if (distanceBetween < minimum) {
          var nx = dx / distanceBetween;
          var nz = dz / distanceBetween;
          player.x = bumper.x + nx * minimum;
          player.z = bumper.z + nz * minimum;
          player.vx += nx * 5.8;
          player.vz += nz * 5.8;
          if (player.carrier && Math.abs(player.vx) + Math.abs(player.vz) > 11) dropCore(player, nx * 6, nz * 6);
        }
      });
      if (core.carrier < 0) {
        var coreDx = core.x - bumper.x;
        var coreDz = core.z - bumper.z;
        var coreDistance = Math.sqrt(coreDx * coreDx + coreDz * coreDz) || 0.001;
        var coreMinimum = bumper.radius + 0.5;
        if (coreDistance < coreMinimum) {
          var coreNx = coreDx / coreDistance;
          var coreNz = coreDz / coreDistance;
          core.x = bumper.x + coreNx * coreMinimum;
          core.z = bumper.z + coreNz * coreMinimum;
          core.vx += coreNx * 7;
          core.vz += coreNz * 7;
        }
      }
    });
  }

  function updatePowerups(dt) {
    if (state !== "playing") return;
    powerupTimer -= dt;
    if (powerupTimer <= 0) {
      spawnPowerup();
      powerupTimer = 7 + Math.random() * 3;
    }
    powerups.forEach(function (item) {
      if (!item.active) return;
      item.life -= dt;
      item.phase += dt * 2;
      item.mesh.rotation.y += dt * 1.5;
      item.ring.rotation.z += dt * 1.1;
      item.mesh.position.y = 0.08 + Math.sin(item.phase) * 0.09;
      if (item.life <= 0) { item.active = false; item.mesh.visible = false; }
    });
  }

  function spawnPowerup() {
    var available = powerups.filter(function (item) { return !item.active; });
    if (!available.length) return;
    var item = available[Math.floor(Math.random() * available.length)];
    var positions = [[0, -5.7], [0, 5.7], [-7, -4.8], [-7, 4.8], [7, -4.8], [7, 4.8]];
    var position = positions[Math.floor(Math.random() * positions.length)];
    item.x = position[0];
    item.z = position[1];
    item.life = 11;
    item.active = true;
    item.mesh.position.set(item.x, 0.08, item.z);
    item.mesh.visible = true;
    showToast(item.type === "shield" ? "ظهر درع" : item.type === "turbo" ? "ظهر Turbo" : "ظهرت شحنة Pulse", 750);
  }

  function checkPowerupCollection() {
    powerups.forEach(function (item) {
      if (!item.active) return;
      players.forEach(function (player) {
        if (!item.active) return;
        var dx = item.x - player.x;
        var dz = item.z - player.z;
        if (dx * dx + dz * dz < 1.25 * 1.25) collectPowerup(player, item);
      });
    });
  }

  function collectPowerup(player, item) {
    item.active = false;
    item.mesh.visible = false;
    if (item.type === "shield") {
      player.shield = 1;
      player.shieldMesh.visible = true;
      showToast("درع للاعب " + (player.index + 1), 900);
    } else if (item.type === "turbo") {
      player.boostTime = 5;
      showToast("Turbo للاعب " + (player.index + 1), 900);
    } else {
      player.pulseCd = 0;
      showToast("Pulse جاهزة للاعب " + (player.index + 1), 900);
    }
    burstSparks(player.x, 0.8, player.z, item.type === "shield" ? colors.mint : item.type === "turbo" ? colors.orange : colors.violet, quality === "high" ? 28 : 18, 4.2);
    playBeep(760, 0.15, "triangle", 0.04);
  }

  function updateHazard(dt) {
    hazardTimer -= dt;
    if (hazardTimer < 2.6 && !hazardWarned) {
      hazardWarned = true;
      showToast("تحذير: موجة صدمة مركزية", 1700);
    }
    if (hazardTimer <= 0) {
      hazardTimer = 23 + Math.random() * 5;
      hazardWarned = false;
      createPulseEffect(0, 0.08, 0, 2, 8.8);
      players.forEach(function (player) {
        var distanceFromCenter = Math.sqrt(player.x * player.x + player.z * player.z) || 0.01;
        if (distanceFromCenter < 8.7) {
          player.vx += player.x / distanceFromCenter * 8;
          player.vz += player.z / distanceFromCenter * 8;
          if (player.carrier && distanceFromCenter < 6.2) dropCore(player, player.x / distanceFromCenter * 7, player.z / distanceFromCenter * 7);
        }
      });
      if (core.carrier < 0) {
        var coreDistance = Math.sqrt(core.x * core.x + core.z * core.z) || 0.01;
        core.vx += core.x / coreDistance * 9;
        core.vz += core.z / coreDistance * 9;
      }
      playBeep(92, 0.35, "sawtooth", 0.065);
    }
  }

  function createPulseEffect(x, y, z, owner, maxScale) {
    var effect = pulseEffects.find(function (candidate) { return candidate.life <= 0; }) || pulseEffects[0];
    effect.life = effect.maxLife;
    effect.maxScale = maxScale;
    effect.mesh.position.set(x, y, z);
    effect.mesh.scale.setScalar(0.15);
    effect.mesh.material.color.setHex(owner === 0 ? colors.cyan : owner === 1 ? colors.pink : colors.orange);
    effect.mesh.material.opacity = 0.9;
    effect.mesh.visible = true;
  }

  function updateVisualEffects(dt) {
    pulseEffects.forEach(function (effect) {
      if (effect.life <= 0) return;
      effect.life -= dt;
      var progress = 1 - Math.max(0, effect.life) / effect.maxLife;
      effect.mesh.scale.setScalar(0.15 + progress * effect.maxScale);
      effect.mesh.material.opacity = Math.max(0, (1 - progress) * 0.88);
      if (effect.life <= 0) effect.mesh.visible = false;
    });
    updateSparks(dt);
  }

  function burstSparks(x, y, z, color, amount, power) {
    var tint = new THREE.Color(color);
    var spawned = 0;
    for (var index = 0; index < sparks.particles.length && spawned < amount; index += 1) {
      var particle = sparks.particles[index];
      if (particle.life > 0) continue;
      var angle = Math.random() * Math.PI * 2;
      var force = (0.45 + Math.random() * 0.7) * power;
      particle.life = 0.38 + Math.random() * 0.55;
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.vx = Math.cos(angle) * force;
      particle.vy = 1 + Math.random() * power * 0.75;
      particle.vz = Math.sin(angle) * force;
      sparks.colors[index * 3] = tint.r;
      sparks.colors[index * 3 + 1] = tint.g;
      sparks.colors[index * 3 + 2] = tint.b;
      spawned += 1;
    }
    sparks.geometry.attributes.color.needsUpdate = true;
  }

  function updateSparks(dt) {
    var changed = false;
    sparks.particles.forEach(function (particle, index) {
      if (particle.life > 0) {
        changed = true;
        particle.life -= dt;
        particle.vy -= dt * 3.9;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
      } else {
        particle.y = -100;
      }
      sparks.positions[index * 3] = particle.x;
      sparks.positions[index * 3 + 1] = particle.y;
      sparks.positions[index * 3 + 2] = particle.z;
    });
    if (changed) sparks.geometry.attributes.position.needsUpdate = true;
  }

  function updateMeshes(dt) {
    players.forEach(function (player) {
      player.mesh.position.x += (player.x - player.mesh.position.x) * Math.min(1, dt * 18);
      player.mesh.position.z += (player.z - player.mesh.position.z) * Math.min(1, dt * 18);
      player.mesh.position.y = 0.07 + Math.sin((matchTime + player.index) * 5.5) * 0.035;
      var targetRotation = Math.atan2(-player.dirX, -player.dirZ);
      var delta = Math.atan2(Math.sin(targetRotation - player.mesh.rotation.y), Math.cos(targetRotation - player.mesh.rotation.y));
      player.mesh.rotation.y += delta * Math.min(1, dt * 10);
      player.mesh.rotation.z = THREE.MathUtils.lerp(player.mesh.rotation.z, -player.vx * 0.012, Math.min(1, dt * 8));
      player.shieldMesh.rotation.y += dt * 1.4;
    });
    core.mesh.position.x = core.x;
    core.mesh.position.z = core.z;
    core.mesh.position.y = core.carrier >= 0 ? 1.72 + Math.sin(matchTime * 7) * 0.08 : 0.72 + Math.sin(matchTime * 5) * 0.08;
    core.orb.rotation.x += dt * 1.8;
    core.orb.rotation.y += dt * 2.2;
    core.ring.rotation.z += dt * 1.5;
    core.ringTwo.rotation.z -= dt * 1.2;
  }

  function updateCamera(dt) {
    var focusX = (players[0].x + players[1].x + core.x) / 3;
    var focusZ = (players[0].z + players[1].z + core.z) / 3;
    focusX = THREE.MathUtils.clamp(focusX * 0.22, -1.7, 1.7);
    focusZ = THREE.MathUtils.clamp(focusZ * 0.18, -1.2, 1.2);
    var desired = new THREE.Vector3(focusX, 17.8, 16.4 + focusZ * 0.25);
    camera.position.lerp(desired, Math.min(1, dt * 2.7));
    camera.lookAt(focusX * 0.45, 0, focusZ);
  }

  function scoreRatio(cooldown, maximum) {
    return Math.max(0, Math.min(1, 1 - cooldown / maximum));
  }

  function updateHud() {
    playerOneScore.textContent = String(scores[0]);
    playerTwoScore.textContent = String(scores[1]);
    timeValue.textContent = suddenDeath ? "∞" : formatTime(matchTime);
    p1DashFill.style.transform = "scaleX(" + scoreRatio(players[0].dashCd, 1.35).toFixed(3) + ")";
    p1PulseFill.style.transform = "scaleX(" + scoreRatio(players[0].pulseCd, 4.6).toFixed(3) + ")";
    p2DashFill.style.transform = "scaleX(" + scoreRatio(players[1].dashCd, 1.35).toFixed(3) + ")";
    p2PulseFill.style.transform = "scaleX(" + scoreRatio(players[1].pulseCd, 4.6).toFixed(3) + ")";
    updateShieldLabel(p1Shield, players[0]);
    updateShieldLabel(p2Shield, players[1]);
  }

  function updateShieldLabel(element, player) {
    element.textContent = player.shield > 0 ? "SHIELD READY" : player.boostTime > 0 ? "TURBO" : "NO SHIELD";
    element.classList.toggle("has-shield", player.shield > 0 || player.boostTime > 0);
  }

  function formatTime(seconds) {
    var total = Math.max(0, Math.ceil(seconds));
    var minutes = Math.floor(total / 60);
    var remainder = total % 60;
    return "0" + minutes + ":" + (remainder < 10 ? "0" : "") + remainder;
  }

  function showToast(message, duration) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () { statusToast.classList.remove("is-visible"); }, duration || 900);
  }

  function showRoundMessage(message, duration) {
    window.clearTimeout(roundMessageTimer);
    roundMessage.textContent = message;
    roundMessage.classList.add("is-visible");
    roundMessageTimer = window.setTimeout(function () { roundMessage.classList.remove("is-visible"); }, duration || 700);
  }

  function finishMatch(winner) {
    if (state !== "playing") return;
    winnerTitle.textContent = mode === "one" && winner === 1 ? "فاز الذكاء الاصطناعي" : "فاز اللاعب " + (winner + 1) + "!";
    finalP1Score.textContent = String(scores[0]);
    finalP2Score.textContent = String(scores[1]);
    resultDetail.textContent = suddenDeath ? "حُسمت المباراة بالهدف الذهبي" : scores[winner] >= WIN_SCORE ? "حسم المباراة قبل انتهاء الوقت" : "انتهى الوقت";
    setState("result");
    setHumVolume(0);
    playBeep(winner === 0 ? 720 : 620, 0.18, "triangle", 0.05);
    window.setTimeout(function () { playBeep(winner === 0 ? 930 : 820, 0.24, "sine", 0.045); }, 140);
    renderScene();
  }

  function setQuality(nextQuality, persist) {
    quality = nextQuality === "high" ? "high" : "light";
    if (persist) writeSetting("quality", quality);
    qualityButton.textContent = quality === "high" ? "عالي" : "خفيف";
    renderer.setPixelRatio(quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.35) : Math.min(window.devicePixelRatio || 1, 0.88));
    scene.fog.density = quality === "high" ? 0.014 : 0.017;
    renderer.toneMappingExposure = quality === "high" ? 1.38 : 1.31;
    scene.traverse(function (object) { if (object.userData && object.userData.highOnly) object.visible = quality === "high"; });
    if (sparks && sparks.points) sparks.points.material.size = quality === "high" ? 0.2 : 0.16;
    resize();
    renderScene();
  }

  function toggleQuality() {
    setQuality(quality === "high" ? "light" : "high", true);
    showToast(quality === "high" ? "جودة عالية" : "وضع خفيف للتلفاز", 900);
  }

  function updateSoundButton() {
    soundButton.textContent = soundEnabled ? "🔊" : "🔇";
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    writeSetting("sound", soundEnabled ? "on" : "off");
    if (soundEnabled) ensureAudio(); else setHumVolume(0);
    updateSoundButton();
    showToast(soundEnabled ? "تم تشغيل الصوت" : "تم إيقاف الصوت", 750);
  }

  function ensureAudio() {
    if (!soundEnabled) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio.context) {
      audio.context = new AudioContext();
      audio.hum = audio.context.createOscillator();
      audio.hum.type = "sine";
      audio.hum.frequency.value = 48;
      audio.humGain = audio.context.createGain();
      audio.humGain.gain.value = 0;
      audio.hum.connect(audio.humGain);
      audio.humGain.connect(audio.context.destination);
      audio.hum.start();
    }
    if (audio.context.state === "suspended") audio.context.resume();
  }

  function updateAudio() {
    if (!audio.context || !audio.humGain) return;
    var now = audio.context.currentTime;
    audio.hum.frequency.setTargetAtTime(core.carrier >= 0 ? 62 : 48, now, 0.09);
    audio.humGain.gain.setTargetAtTime(soundEnabled && state === "playing" ? 0.012 : 0, now, 0.08);
  }

  function setHumVolume(value) {
    if (audio.context && audio.humGain) audio.humGain.gain.setTargetAtTime(value, audio.context.currentTime, 0.06);
  }

  function playBeep(frequency, duration, type, volume) {
    if (!soundEnabled || !audio.context) return;
    var oscillator = audio.context.createOscillator();
    var gain = audio.context.createGain();
    var now = audio.context.currentTime;
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume || 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audio.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playGoalSound(playerIndex) {
    playBeep(playerIndex === 0 ? 560 : 500, 0.12, "triangle", 0.05);
    window.setTimeout(function () { playBeep(playerIndex === 0 ? 760 : 700, 0.16, "triangle", 0.045); }, 90);
    window.setTimeout(function () { playBeep(playerIndex === 0 ? 980 : 900, 0.21, "sine", 0.04); }, 190);
  }

  function getGamepads() {
    if (!navigator.getGamepads) return [];
    return Array.prototype.filter.call(navigator.getGamepads(), Boolean);
  }

  function getGamepad(index) {
    var pads = getGamepads();
    return pads[index] || null;
  }

  function updateControllerStatus() {
    var pads = getGamepads();
    setControllerPill(controllerOne, pads[0], "P1");
    setControllerPill(controllerTwo, pads[1], "P2");
  }

  function pollIdleGamepads() {
    updateControllerStatus();
    if (state === "playing") return;
    var pads = getGamepads();
    pads.slice(0, 2).forEach(function (pad, index) {
      var a = Boolean(pad.buttons[0] && pad.buttons[0].pressed);
      var b = Boolean(pad.buttons[1] && pad.buttons[1].pressed);
      var start = Boolean(pad.buttons[9] && pad.buttons[9].pressed);
      if (!a && !b && !start) {
        idlePadArmed[index] = true;
        return;
      }
      if (!idlePadArmed[index]) return;
      idlePadArmed[index] = false;
      if (state === "menu" && (a || start)) startMatch(pads.length > 1 ? "two" : "one");
      else if (state === "paused" && start) resumeMatch();
      else if (state === "result" && (a || start)) startMatch(mode);
      else if ((state === "paused" || state === "result") && b) exitGame();
    });
  }

  function setControllerPill(element, pad, label) {
    var text = element.querySelector("span");
    element.classList.toggle("is-connected", Boolean(pad));
    text.textContent = pad ? label + " " + shortenName(pad.id || "Gamepad") : label + " بانتظار القبضة";
  }

  function shortenName(name) {
    return name.length > 30 ? name.slice(0, 27) + "…" : name;
  }

  function resize() {
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderScene() { renderer.render(scene, camera); }

  function exitGame() {
    if (state === "playing") pauseMatch();
    setHumVolume(0);
    var detail = { gameId: GAME_ID, scores: scores.slice(), mode: mode, goalSerial: goalSerial };
    try { window.dispatchEvent(new CustomEvent("dtdc-game-exit", { detail: detail })); } catch (error) { /* Older WebView. */ }
    try {
      if (window.DTDCGameBridge && typeof window.DTDCGameBridge.exitGame === "function") {
        window.DTDCGameBridge.exitGame(JSON.stringify(detail));
        return;
      }
    } catch (error) { /* Browser fallback. */ }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "DTDC_GAME_EXIT", payload: detail }, "*");
      return;
    }
    try { window.close(); } catch (error) { /* May be blocked. */ }
    window.setTimeout(function () { if (!window.closed) showToast("يمكنك إغلاق هذا التبويب والعودة للشاشة", 2200); }, 250);
  }

  function bindTouchHold(id, key) {
    var button = document.getElementById(id);
    function set(value, event) {
      if (event) event.preventDefault();
      keys[key] = value;
      button.classList.toggle("is-active", value);
    }
    button.addEventListener("pointerdown", function (event) { set(true, event); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (eventName) { button.addEventListener(eventName, function (event) { set(false, event); }); });
  }

  function bindTouchAction(id, action) {
    var button = document.getElementById(id);
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      actionQueue[0][action] = true;
      button.classList.add("is-active");
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (eventName) { button.addEventListener(eventName, function () { button.classList.remove("is-active"); }); });
  }

  bindTouchHold("touchUp", "KeyW");
  bindTouchHold("touchDown", "KeyS");
  bindTouchHold("touchLeft", "KeyA");
  bindTouchHold("touchRight", "KeyD");
  bindTouchAction("touchDash", "dash");
  bindTouchAction("touchPulse", "pulse");

  document.getElementById("onePlayerButton").addEventListener("click", function () { startMatch("one"); });
  document.getElementById("twoPlayerButton").addEventListener("click", function () { startMatch("two"); });
  document.getElementById("resumeButton").addEventListener("click", resumeMatch);
  document.getElementById("restartButton").addEventListener("click", function () { startMatch(mode); });
  document.getElementById("playAgainButton").addEventListener("click", function () { startMatch(mode); });
  document.getElementById("exitButton").addEventListener("click", exitGame);
  document.getElementById("resultExitButton").addEventListener("click", exitGame);
  pauseButton.addEventListener("click", togglePause);
  qualityButton.addEventListener("click", toggleQuality);
  soundButton.addEventListener("click", toggleSound);

  window.addEventListener("keydown", function (event) {
    var blocked = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
    if (blocked.indexOf(event.code) !== -1) event.preventDefault();
    keys[event.code] = true;
    if (!event.repeat) {
      if (event.code === "Space") actionQueue[0].dash = true;
      if (event.code === "KeyE") actionQueue[0].pulse = true;
      if (event.code === "Enter" || event.code === "NumpadEnter") actionQueue[1].dash = true;
      if (event.code === "Slash" || event.code === "Numpad0") actionQueue[1].pulse = true;
      if (event.code === "Escape") togglePause();
      if (event.code === "KeyM") toggleSound();
      if (state === "menu" && event.code === "Digit1") startMatch("one");
      if (state === "menu" && event.code === "Digit2") startMatch("two");
    }
  }, { passive: false });

  window.addEventListener("keyup", function (event) { keys[event.code] = false; });
  window.addEventListener("gamepadconnected", function () { updateControllerStatus(); showToast("تم توصيل قبضة", 750); });
  window.addEventListener("gamepaddisconnected", function () { updateControllerStatus(); showToast("تم فصل قبضة", 750); });
  window.addEventListener("resize", function () { resize(); renderScene(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "playing") pauseMatch();
    else if (!document.hidden) renderScene();
  });
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    fatalPanel.hidden = false;
  });
  window.setInterval(pollIdleGamepads, 140);

  window.PulseArena = {
    startOnePlayer: function () { startMatch("one"); },
    startTwoPlayers: function () { startMatch("two"); },
    pause: pauseMatch,
    resume: resumeMatch,
    exit: exitGame,
    setQuality: function (value) { setQuality(value, true); },
    getState: function () { return { gameId: GAME_ID, state: state, mode: mode, scores: scores.slice(), time: Math.round(matchTime), suddenDeath: suddenDeath, coreCarrier: core.carrier, quality: quality }; }
  };

  resetRound(0);
  updateSoundButton();
  setQuality(quality, false);
  resize();
  updateMeshes(0.1);
  updateHud();
  updateControllerStatus();
  renderScene();
})();
