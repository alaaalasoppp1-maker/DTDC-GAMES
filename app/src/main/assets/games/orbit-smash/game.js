(function () {
  "use strict";

  var GAME_ID = "orbit-smash-gravity-siege";
  var GRAVITY = -10.8;
  var GROUND_Y = 0.24;
  var STORAGE_PREFIX = "dtdc.orbitSmash.";
  var AMMO_SEQUENCE = ["pulse", "split", "drill", "pulse", "split"];
  var LEVELS = [
    {
      name: "بوابة النيون", shots: 6, wind: 0,
      blocks: [
        [6.8, 0.55, 5.1, 0.58, "metal", 105, 110], [5.05, 1.85, 0.62, 2.2, "glass", 44, 150],
        [8.55, 1.85, 0.62, 2.2, "glass", 44, 150], [6.8, 3.08, 4.35, 0.55, "crystal", 64, 190],
        [5.65, 4.35, 0.58, 2.05, "glass", 42, 150], [7.95, 4.35, 0.58, 2.05, "glass", 42, 150],
        [6.8, 5.52, 3.35, 0.5, "metal", 92, 170], [9.65, 1.4, 0.72, 2.45, "metal", 96, 160],
        [10.3, 2.8, 1.8, 0.5, "crystal", 60, 140], [4.1, 0.95, 0.75, 1.55, "crystal", 56, 130]
      ],
      cores: [[6.8, 1.48], [6.8, 4.08], [9.65, 1.32]]
    },
    {
      name: "البرجان التوأمان", shots: 6, wind: -0.32,
      blocks: [
        [6.9, 0.55, 6.2, 0.58, "metal", 122, 120], [4.45, 1.75, 0.65, 2.1, "glass", 52, 150],
        [6.9, 1.75, 0.68, 2.1, "metal", 112, 165], [9.35, 1.75, 0.65, 2.1, "glass", 52, 150],
        [6.9, 2.95, 5.6, 0.5, "crystal", 78, 200], [5.6, 4.1, 0.6, 1.9, "glass", 50, 160],
        [8.2, 4.1, 0.6, 1.9, "glass", 50, 160], [6.9, 5.2, 3.4, 0.5, "metal", 118, 180],
        [10.35, 1.2, 0.75, 1.9, "metal", 118, 170], [3.55, 0.95, 0.7, 1.45, "crystal", 68, 140]
      ],
      cores: [[5.55, 1.55], [8.25, 1.55], [6.9, 4.05]]
    },
    {
      name: "حصن الجسر", shots: 5, wind: 0.42,
      blocks: [
        [7.0, 0.58, 7.0, 0.66, "metal", 145, 130], [4.25, 1.9, 0.78, 2.35, "metal", 128, 175],
        [9.75, 1.9, 0.78, 2.35, "metal", 128, 175], [7.0, 3.18, 6.25, 0.58, "crystal", 88, 215],
        [5.25, 4.45, 0.62, 2.1, "glass", 56, 165], [8.75, 4.45, 0.62, 2.1, "glass", 56, 165],
        [7.0, 5.65, 4.25, 0.55, "metal", 132, 190], [7.0, 1.75, 0.72, 2.15, "glass", 54, 170],
        [3.35, 3.45, 1.65, 0.52, "crystal", 76, 155], [10.65, 3.45, 1.65, 0.52, "crystal", 76, 155]
      ],
      cores: [[5.3, 1.55], [8.7, 1.55], [7.0, 4.35]]
    },
    {
      name: "هرم الطاقة", shots: 5, wind: -0.58,
      blocks: [
        [7.0, 0.58, 7.4, 0.68, "metal", 158, 140], [4.35, 1.65, 0.68, 1.75, "crystal", 78, 165],
        [9.65, 1.65, 0.68, 1.75, "crystal", 78, 165], [7.0, 2.65, 6.1, 0.58, "metal", 148, 205],
        [5.35, 3.75, 0.68, 1.75, "glass", 61, 170], [8.65, 3.75, 0.68, 1.75, "glass", 61, 170],
        [7.0, 4.75, 4.05, 0.55, "crystal", 94, 220], [7.0, 5.82, 0.76, 1.65, "metal", 136, 190],
        [3.45, 0.98, 0.78, 1.5, "metal", 125, 160], [10.55, 0.98, 0.78, 1.5, "metal", 125, 160]
      ],
      cores: [[5.35, 1.55], [8.65, 1.55], [7.0, 3.72]]
    },
    {
      name: "بوابة العاصفة", shots: 5, wind: 0.75,
      blocks: [
        [7.0, 0.6, 7.6, 0.7, "metal", 172, 150], [4.1, 2.15, 0.8, 2.8, "metal", 148, 190],
        [9.9, 2.15, 0.8, 2.8, "metal", 148, 190], [7.0, 3.68, 6.6, 0.62, "crystal", 108, 230],
        [5.05, 5.05, 0.65, 2.2, "glass", 68, 180], [8.95, 5.05, 0.65, 2.2, "glass", 68, 180],
        [7.0, 6.28, 4.7, 0.58, "metal", 158, 210], [7.0, 2.05, 0.78, 2.65, "crystal", 98, 205],
        [3.15, 4.2, 1.55, 0.58, "metal", 128, 175], [10.85, 4.2, 1.55, 0.58, "metal", 128, 175]
      ],
      cores: [[5.15, 2.15], [8.85, 2.15], [7.0, 5.0]]
    },
    {
      name: "القلعة الحديدية", shots: 4, wind: -0.92,
      blocks: [
        [7.0, 0.62, 8.0, 0.74, "metal", 195, 170], [3.95, 2.25, 0.88, 2.95, "metal", 168, 210],
        [10.05, 2.25, 0.88, 2.95, "metal", 168, 210], [7.0, 3.88, 7.0, 0.68, "metal", 184, 250],
        [5.0, 5.25, 0.72, 2.15, "crystal", 112, 205], [9.0, 5.25, 0.72, 2.15, "crystal", 112, 205],
        [7.0, 6.48, 4.8, 0.62, "metal", 176, 235], [7.0, 2.15, 0.88, 2.75, "metal", 168, 225],
        [3.0, 4.65, 1.75, 0.64, "crystal", 108, 195], [11.0, 4.65, 1.75, 0.64, "crystal", 108, 195]
      ],
      cores: [[5.0, 2.12], [9.0, 2.12], [7.0, 5.2]]
    }
  ];

  var app = document.getElementById("app");
  var canvas = document.getElementById("gameCanvas");
  var fatalPanel = document.getElementById("fatalPanel");
  var menuPanel = document.getElementById("menuPanel");
  var pausePanel = document.getElementById("pausePanel");
  var resultPanel = document.getElementById("resultPanel");
  var p1Score = document.getElementById("p1Score");
  var p2Score = document.getElementById("p2Score");
  var p1Shots = document.getElementById("p1Shots");
  var p2Shots = document.getElementById("p2Shots");
  var p2Name = document.getElementById("p2Name");
  var modeLabel = document.getElementById("modeLabel");
  var turnLabel = document.getElementById("turnLabel");
  var coresLabel = document.getElementById("coresLabel");
  var ammoIcon = document.getElementById("ammoIcon");
  var ammoName = document.getElementById("ammoName");
  var abilityHint = document.getElementById("abilityHint");
  var angleValue = document.getElementById("angleValue");
  var powerValue = document.getElementById("powerValue");
  var angleFill = document.getElementById("angleFill");
  var powerFill = document.getElementById("powerFill");
  var statusToast = document.getElementById("statusToast");
  var bigMessage = document.getElementById("bigMessage");
  var controllerOne = document.getElementById("controllerOne");
  var controllerTwo = document.getElementById("controllerTwo");
  var qualityButton = document.getElementById("qualityButton");
  var soundButton = document.getElementById("soundButton");
  var pauseButton = document.getElementById("pauseButton");
  var winnerTitle = document.getElementById("winnerTitle");
  var finalP1Score = document.getElementById("finalP1Score");
  var finalP2Score = document.getElementById("finalP2Score");
  var resultDetail = document.getElementById("resultDetail");
  var levelLabel = document.getElementById("levelLabel");
  var windLabel = document.getElementById("windLabel");
  var campaignProgress = document.getElementById("campaignProgress");

  var state = "menu";
  var mode = "two";
  var quality = readSetting("quality", "light");
  var soundEnabled = readSetting("sound", "on") !== "off";
  var scores = [0, 0];
  var shotsRemaining = [4, 4];
  var shotsUsed = [0, 0];
  var currentPlayer = 0;
  var levelIndex = 0;
  var maxUnlockedLevel = Math.max(0, Math.min(LEVELS.length - 1, parseInt(readSetting("maxUnlockedLevel", "0"), 10) || 0));
  var levelCleared = false;
  var scoreAtLevelStart = 0;
  var menuMode = "two";
  var aimAngle = 42;
  var aimPower = 72;
  var shotState = "aiming";
  var shotTimer = 0;
  var settleTimer = 0;
  var abilityUsed = false;
  var activeAmmoType = "pulse";
  var combo = 1;
  var comboTimer = 0;
  var frameHandle = 0;
  var lastFrameTime = performance.now();
  var toastTimer = 0;
  var messageTimer = 0;
  var keys = {};
  var actionQueue = { fire: false, ability: false };
  var previousPadButtons = {};
  var idlePreviousButtons = {};
  var audio = { context: null, hum: null, gain: null };

  function readSetting(key, fallback) {
    try {
      var value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : value;
    } catch (error) { return fallback; }
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
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = false;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x315c83);
  scene.fog = new THREE.FogExp2(0x507da0, quality === "high" ? 0.008 : 0.011);
  var camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 250);
  camera.position.set(0, 7.8, 31.5);
  camera.lookAt(0, 4.4, 0);

  var colors = {
    cyan: 0x2be8ff,
    cyanSoft: 0xa4f8ff,
    pink: 0xff62c9,
    violet: 0x9b82ff,
    mint: 0xc8ff65,
    orange: 0xffbd55,
    red: 0xff6480,
    blue: 0x3e8cff,
    white: 0xf6fcff,
    dark: 0x0a1730,
    ground: 0x214a67
  };

  scene.add(new THREE.HemisphereLight(0xe7fbff, 0x142942, 3.25));
  var sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
  sunLight.position.set(-10, 20, 15);
  scene.add(sunLight);
  var accentLight = new THREE.DirectionalLight(colors.pink, 0.92);
  accentLight.position.set(14, 7, 10);
  scene.add(accentLight);

  var shared = createSharedAssets();
  createWorld();
  var launcher = createLauncher();
  var forts = [createFort(0), createFort(1)];
  var projectiles = createProjectilePool();
  var trajectory = createTrajectory();
  var effects = createEffectPool();
  var sparks = createSparkSystem();
  createSky();

  function createSharedAssets() {
    var box = new THREE.BoxGeometry(1, 1, 1);
    return {
      box: box,
      cyan: new THREE.MeshBasicMaterial({ color: colors.cyan }),
      pink: new THREE.MeshBasicMaterial({ color: colors.pink }),
      mint: new THREE.MeshBasicMaterial({ color: colors.mint }),
      orange: new THREE.MeshBasicMaterial({ color: colors.orange }),
      white: new THREE.MeshBasicMaterial({ color: colors.white }),
      dark: new THREE.MeshStandardMaterial({ color: colors.dark, roughness: 0.4, metalness: 0.6 }),
      ground: new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 0.82, metalness: 0.15 })
    };
  }

  function createWorld() {
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(42, 12), shared.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    scene.add(ground);
    var neonEdge = new THREE.Mesh(shared.box, shared.cyan);
    neonEdge.scale.set(34, 0.05, 0.08);
    neonEdge.position.set(0, 0.09, 1.8);
    scene.add(neonEdge);
    var backEdge = new THREE.Mesh(shared.box, shared.pink);
    backEdge.scale.set(34, 0.04, 0.07);
    backEdge.position.set(0, 0.08, -2.1);
    scene.add(backEdge);

    for (var index = 0; index < 10; index += 1) {
      var columnMaterial = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x355f83 : 0x4c568a, emissive: index % 2 ? 0x0c2d3f : 0x28143e, emissiveIntensity: 0.25, roughness: 0.65, metalness: 0.18 });
      var column = new THREE.Mesh(shared.box, columnMaterial);
      var height = 2.5 + (index * 7) % 6;
      column.scale.set(1.6 + index % 3, height, 2.5);
      column.position.set(-18 + index * 4, height / 2 - 0.1, -7 - index % 3 * 2.5);
      column.userData.highOnly = index % 2 === 0;
      scene.add(column);
      var crown = new THREE.Mesh(shared.box, index % 2 ? shared.cyan : shared.pink);
      crown.scale.set(column.scale.x * 0.72, 0.08, 2.55);
      crown.position.set(column.position.x, height - 0.2, column.position.z);
      crown.userData.highOnly = true;
      scene.add(crown);
    }
  }

  function createLauncher() {
    var group = new THREE.Group();
    var baseMaterial = new THREE.MeshStandardMaterial({ color: 0x1f4560, emissive: 0x082537, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.54 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.12, 0.66, 16), baseMaterial);
    base.position.y = 0.34;
    group.add(base);
    var pivot = new THREE.Group();
    pivot.position.y = 0.7;
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.34, 2.7, 12), shared.dark);
    barrel.position.y = 1.15;
    pivot.add(barrel);
    var barrelGlow = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 7, 18), shared.cyan);
    barrelGlow.rotation.x = Math.PI / 2;
    barrelGlow.position.y = 2.45;
    pivot.add(barrelGlow);
    group.add(pivot);
    group.position.set(-12.5, 0, 0);
    scene.add(group);
    return { group: group, pivot: pivot, barrelGlow: barrelGlow, side: 1 };
  }

  function createFort(owner) {
    var fort = { owner: owner, side: owner === 0 ? 1 : -1, bodies: [], cores: [], visible: owner === 0 };
    var side = owner === 0 ? 1 : -1;
    function block(x, y, width, height, materialType, health, value) {
      var color = materialType === "glass" ? colors.cyan : materialType === "crystal" ? colors.violet : materialType === "metal" ? colors.orange : 0x6a8da1;
      var material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: materialType === "metal" ? 0.08 : 0.16, transparent: materialType === "glass", opacity: materialType === "glass" ? 0.78 : 1, roughness: materialType === "metal" ? 0.28 : 0.52, metalness: materialType === "metal" ? 0.72 : 0.25 });
      var mesh = new THREE.Mesh(shared.box, material);
      mesh.scale.set(width, height, 1.55);
      mesh.position.set(side * x, y, 0);
      scene.add(mesh);
      var body = {
        mesh: mesh,
        x: side * x,
        y: y,
        initialX: side * x,
        initialY: y,
        width: width,
        height: height,
        vx: 0,
        vy: 0,
        angle: 0,
        angular: 0,
        mass: Math.max(0.7, width * height * 0.7),
        health: health,
        maxHealth: health,
        value: value,
        materialType: materialType,
        active: true,
        sleeping: true
      };
      fort.bodies.push(body);
      return body;
    }

    block(6.8, 0.55, 5.1, 0.58, "metal", 120, 110);
    block(5.05, 1.85, 0.62, 2.2, "glass", 52, 150);
    block(8.55, 1.85, 0.62, 2.2, "glass", 52, 150);
    block(6.8, 3.08, 4.35, 0.55, "crystal", 72, 190);
    block(5.65, 4.35, 0.58, 2.05, "glass", 48, 150);
    block(7.95, 4.35, 0.58, 2.05, "glass", 48, 150);
    block(6.8, 5.52, 3.35, 0.5, "metal", 105, 170);
    block(9.65, 1.4, 0.72, 2.45, "metal", 110, 160);
    block(10.3, 2.8, 1.8, 0.5, "crystal", 68, 140);
    block(4.1, 0.95, 0.75, 1.55, "crystal", 64, 130);

    function coreNode(x, y, color) {
      var group = new THREE.Group();
      var material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 2.1, roughness: 0.14, metalness: 0.4 });
      var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), material);
      group.add(orb);
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.64, 22), new THREE.MeshBasicMaterial({ color: colors.white, transparent: true, opacity: 0.72, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(ring);
      group.position.set(side * x, y, 0.05);
      scene.add(group);
      fort.cores.push({ mesh: group, orb: orb, ring: ring, x: side * x, y: y, initialX: side * x, initialY: y, active: true, radius: 0.5 });
    }

    coreNode(6.8, 1.48, colors.mint);
    coreNode(6.8, 4.08, colors.pink);
    coreNode(9.65, 1.32, colors.cyan);
    setFortVisible(fort, owner === 0);
    return fort;
  }

  function applyLevelToFort(fort, nextLevelIndex) {
    var definition = LEVELS[nextLevelIndex];
    fort.bodies.forEach(function (body, index) {
      var config = definition.blocks[index];
      body.initialX = fort.side * config[0];
      body.initialY = config[1];
      body.width = config[2];
      body.height = config[3];
      body.mass = Math.max(0.7, body.width * body.height * 0.7);
      body.materialType = config[4];
      body.maxHealth = config[5];
      body.health = config[5];
      body.value = config[6];
      body.mesh.scale.set(body.width, body.height, 1.55);
      styleBody(body);
    });
    fort.cores.forEach(function (coreNode, index) {
      var config = definition.cores[index];
      coreNode.initialX = fort.side * config[0];
      coreNode.initialY = config[1];
    });
  }

  function styleBody(body) {
    var color = body.materialType === "glass" ? colors.cyan : body.materialType === "crystal" ? colors.violet : body.materialType === "metal" ? colors.orange : 0x6a8da1;
    var material = body.mesh.material;
    material.color.setHex(color);
    material.emissive.setHex(color);
    material.emissiveIntensity = body.materialType === "metal" ? 0.08 : 0.16;
    material.transparent = body.materialType === "glass";
    material.opacity = body.materialType === "glass" ? 0.78 : 1;
    material.roughness = body.materialType === "metal" ? 0.28 : 0.52;
    material.metalness = body.materialType === "metal" ? 0.72 : 0.25;
    material.needsUpdate = true;
  }

  function createProjectilePool() {
    var list = [];
    for (var index = 0; index < 7; index += 1) {
      var material = new THREE.MeshStandardMaterial({ color: colors.cyan, emissive: colors.cyan, emissiveIntensity: 2.2, roughness: 0.12, metalness: 0.42 });
      var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.47, 14, 10), material);
      sphere.visible = false;
      scene.add(sphere);
      list.push({ mesh: sphere, active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 0.47, type: "pulse", age: 0, bounces: 0, damage: 1, main: false });
    }
    return list;
  }

  function createTrajectory() {
    var positions = new Float32Array(27 * 3);
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: colors.cyanSoft, size: 0.13, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(points);
    return { mesh: points, geometry: geometry, positions: positions };
  }

  function createEffectPool() {
    var list = [];
    for (var index = 0; index < 5; index += 1) {
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.84, 38), new THREE.MeshBasicMaterial({ color: index % 2 ? colors.pink : colors.cyan, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.visible = false;
      scene.add(ring);
      list.push({ mesh: ring, life: 0, maxLife: 0.55, maxScale: 4 });
    }
    return list;
  }

  function createSparkSystem() {
    var count = 120;
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
        topColor: { value: new THREE.Color(0x10285a) },
        midColor: { value: new THREE.Color(0x4e94bb) },
        bottomColor: { value: new THREE.Color(0xf080ad) }
      },
      vertexShader: "varying float h; void main(){ h=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor; varying float h; void main(){ float y=clamp(h*.5+.5,0.0,1.0); vec3 c=mix(bottomColor,midColor,smoothstep(.18,.55,y)); c=mix(c,topColor,smoothstep(.5,.95,y)); gl_FragColor=vec4(c,1.0); }",
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    var dome = new THREE.Mesh(new THREE.SphereGeometry(190, quality === "high" ? 24 : 16, 12), material);
    dome.renderOrder = -100;
    scene.add(dome);
    var sun = new THREE.Mesh(new THREE.SphereGeometry(5.8, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffd598, transparent: true, opacity: 0.88 }));
    sun.position.set(-42, 35, -70);
    scene.add(sun);
  }

  function setFortVisible(fort, visible) {
    fort.visible = visible;
    fort.bodies.forEach(function (body) { body.mesh.visible = visible && body.active; });
    fort.cores.forEach(function (core) { core.mesh.visible = visible && core.active; });
  }

  function resetFort(fort) {
    fort.bodies.forEach(function (body) {
      body.x = body.initialX;
      body.y = body.initialY;
      body.vx = body.vy = body.angle = body.angular = 0;
      body.health = body.maxHealth;
      body.active = true;
      body.sleeping = true;
      body.mesh.position.set(body.x, body.y, 0);
      body.mesh.rotation.z = 0;
    });
    fort.cores.forEach(function (core) {
      core.x = core.initialX;
      core.y = core.initialY;
      core.active = true;
      core.mesh.position.set(core.x, core.y, 0.05);
    });
  }

  function resetProjectiles() {
    projectiles.forEach(function (projectile) { projectile.active = false; projectile.mesh.visible = false; });
  }

  function startGame(nextMode, requestedLevel, keepScores) {
    ensureAudio();
    mode = nextMode === "one" ? "one" : "two";
    levelIndex = typeof requestedLevel === "number" ? THREE.MathUtils.clamp(Math.round(requestedLevel), 0, LEVELS.length - 1) : maxUnlockedLevel;
    app.dataset.mode = mode;
    p2Name.textContent = mode === "one" ? "TARGET" : "PLAYER 2";
    scores = keepScores ? scores : [0, 0];
    shotsRemaining = mode === "one" ? [LEVELS[levelIndex].shots, 0] : [Math.max(4, LEVELS[levelIndex].shots - 1), Math.max(4, LEVELS[levelIndex].shots - 1)];
    shotsUsed = [0, 0];
    currentPlayer = 0;
    aimAngle = 42;
    aimPower = 72;
    shotState = "aiming";
    settleTimer = 0;
    combo = 1;
    comboTimer = 0;
    activeAmmoType = "pulse";
    levelCleared = false;
    scoreAtLevelStart = scores[0];
    applyLevelToFort(forts[0], levelIndex);
    applyLevelToFort(forts[1], levelIndex);
    resetFort(forts[0]);
    resetFort(forts[1]);
    resetProjectiles();
    prepareTurn();
    setState("playing");
    showBigMessage("المرحلة " + (levelIndex + 1) + " — " + LEVELS[levelIndex].name, 1200);
    lastFrameTime = performance.now();
    requestFrame();
  }

  function prepareTurn() {
    resetProjectiles();
    shotState = "aiming";
    shotTimer = 0;
    settleTimer = 0;
    abilityUsed = false;
    combo = 1;
    comboTimer = 0;
    actionQueue.fire = actionQueue.ability = false;
    aimAngle = 40 + (shotsUsed[currentPlayer] % 2) * 5;
    aimPower = 72;
    setFortVisible(forts[0], currentPlayer === 0);
    setFortVisible(forts[1], currentPlayer === 1 && mode === "two");
    updateLauncher();
    updateTrajectory();
    updateHud();
  }

  function setState(nextState) {
    state = nextState;
    app.dataset.state = nextState;
    menuPanel.hidden = nextState !== "menu";
    pausePanel.hidden = nextState !== "paused";
    resultPanel.hidden = nextState !== "result";
    pauseButton.textContent = nextState === "paused" ? "▶" : "Ⅱ";
  }

  function pauseGame() {
    if (state !== "playing") return;
    setState("paused");
    setHumVolume(0);
    renderScene();
  }

  function resumeGame() {
    if (state !== "paused") return;
    setState("playing");
    lastFrameTime = performance.now();
    requestFrame();
  }

  function togglePause() {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  }

  function requestFrame() {
    if (!frameHandle && state === "playing" && !document.hidden) frameHandle = requestAnimationFrame(frame);
  }

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
    var angleAxis = 0;
    var powerAxis = 0;
    if (keys.ArrowUp || keys.KeyW) angleAxis += 1;
    if (keys.ArrowDown || keys.KeyS) angleAxis -= 1;
    if (keys.ArrowRight || keys.KeyD) powerAxis += 1;
    if (keys.ArrowLeft || keys.KeyA) powerAxis -= 1;
    var pad = getPlayerPad(currentPlayer);
    if (pad) {
      var x = Math.abs(pad.axes[0] || 0) > 0.16 ? pad.axes[0] : 0;
      var y = Math.abs(pad.axes[1] || 0) > 0.16 ? pad.axes[1] : 0;
      if (pad.buttons[12] && pad.buttons[12].pressed) y = -1;
      if (pad.buttons[13] && pad.buttons[13].pressed) y = 1;
      if (pad.buttons[14] && pad.buttons[14].pressed) x = -1;
      if (pad.buttons[15] && pad.buttons[15].pressed) x = 1;
      angleAxis = -y;
      powerAxis = x;
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; });
      var padKey = String(pad.index);
      var before = previousPadButtons[padKey] || [];
      function justPressed(index) { return Boolean(pressed[index] && !before[index]); }
      if (justPressed(0) || justPressed(5) || justPressed(7)) actionQueue.fire = true;
      if (justPressed(1) || justPressed(2) || justPressed(3) || justPressed(4)) actionQueue.ability = true;
      if (justPressed(9)) togglePause();
      previousPadButtons[padKey] = pressed;
    }

    if (shotState === "aiming") {
      aimAngle = THREE.MathUtils.clamp(aimAngle + angleAxis * dt * 34, 15, 72);
      aimPower = THREE.MathUtils.clamp(aimPower + powerAxis * dt * 44, 35, 100);
      updateLauncher();
      updateTrajectory();
      if (actionQueue.fire) fireShot();
    } else if (shotState === "flying" && actionQueue.ability) activateAbility();
    actionQueue.fire = actionQueue.ability = false;
  }

  function updateGame(dt) {
    updateEffects(dt);
    updateFortVisuals(dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 1;
    }

    if (shotState === "flying" || shotState === "settling") {
      var substeps = 2;
      for (var step = 0; step < substeps; step += 1) updatePhysics(dt / substeps);
      shotTimer += dt;
      var hasActiveProjectile = projectiles.some(function (projectile) { return projectile.active; });
      if (shotState === "flying" && (!hasActiveProjectile || shotTimer > 11)) {
        projectiles.forEach(function (projectile) { projectile.active = false; projectile.mesh.visible = false; });
        shotState = "settling";
        settleTimer = 1.7;
      }
      if (shotState === "settling") {
        settleTimer -= dt;
        if (settleTimer <= 0 || fortIsCalm(forts[currentPlayer])) finishShot();
      }
    }
    updateHud();
  }

  function fireShot() {
    if (shotState !== "aiming" || shotsRemaining[currentPlayer] <= 0) return;
    var type = currentAmmoType();
    activeAmmoType = type;
    var side = currentPlayer === 0 ? 1 : -1;
    var radians = aimAngle * Math.PI / 180;
    var speed = 10.5 + aimPower / 100 * 12.5;
    var muzzle = launcherMuzzle();
    var projectile = getFreeProjectile();
    configureProjectile(projectile, type, muzzle.x, muzzle.y, side * Math.cos(radians) * speed, Math.sin(radians) * speed, true);
    shotsRemaining[currentPlayer] -= 1;
    shotsUsed[currentPlayer] += 1;
    shotState = "flying";
    shotTimer = 0;
    abilityUsed = false;
    trajectory.mesh.visible = false;
    showToast(type === "pulse" ? "فعّل موجة الصدمة في الوقت المناسب" : type === "split" ? "اضغط Ability لتقسيم الكرة" : "اضغط Ability لتفعيل الاختراق", 1100);
    playBeep(type === "drill" ? 180 : 240, 0.14, "sawtooth", 0.045);
  }

  function configureProjectile(projectile, type, x, y, vx, vy, main) {
    projectile.active = true;
    projectile.type = type;
    projectile.x = x;
    projectile.y = y;
    projectile.vx = vx;
    projectile.vy = vy;
    projectile.age = 0;
    projectile.bounces = 0;
    projectile.damage = type === "drill" ? 1.35 : 1;
    projectile.main = main;
    projectile.radius = main ? 0.47 : 0.31;
    projectile.mesh.scale.setScalar(main ? 1 : 0.66);
    var color = type === "pulse" ? colors.cyan : type === "split" ? colors.pink : colors.orange;
    projectile.mesh.material.color.setHex(color);
    projectile.mesh.material.emissive.setHex(color);
    projectile.mesh.position.set(x, y, 0);
    projectile.mesh.visible = true;
  }

  function getFreeProjectile() {
    return projectiles.find(function (projectile) { return !projectile.active; }) || projectiles[0];
  }

  function activateAbility() {
    if (abilityUsed) return;
    var main = projectiles.find(function (projectile) { return projectile.active && projectile.main; });
    if (!main) return;
    abilityUsed = true;
    if (main.type === "pulse") {
      createRingEffect(main.x, main.y, colors.cyan, 4.2);
      shockwave(main.x, main.y, 3.5, 9.5, 1.1);
      showToast("موجة صدمة!", 700);
      playBeep(105, 0.28, "sawtooth", 0.065);
    } else if (main.type === "split") {
      var speed = Math.sqrt(main.vx * main.vx + main.vy * main.vy) || 10;
      var angle = Math.atan2(main.vy, main.vx);
      [-0.25, 0.25].forEach(function (offset) {
        var child = getFreeProjectile();
        configureProjectile(child, "split", main.x, main.y, Math.cos(angle + offset) * speed * 0.92, Math.sin(angle + offset) * speed * 0.92, false);
      });
      createRingEffect(main.x, main.y, colors.pink, 2.1);
      showToast("انقسام ثلاثي!", 700);
      playBeep(620, 0.15, "triangle", 0.045);
    } else {
      main.vx *= 1.65;
      main.vy *= 1.28;
      main.damage = 2.2;
      createRingEffect(main.x, main.y, colors.orange, 2.7);
      showToast("وضع الاختراق!", 700);
      playBeep(330, 0.2, "square", 0.05);
    }
  }

  function shockwave(x, y, radius, force, damage) {
    var fort = forts[currentPlayer];
    fort.bodies.forEach(function (body) {
      if (!body.active) return;
      var dx = body.x - x;
      var dy = body.y - y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      if (distance < radius) {
        var strength = (1 - distance / radius) * force;
        body.sleeping = false;
        body.vx += dx / distance * strength / body.mass;
        body.vy += Math.max(0.25, dy / distance) * strength / body.mass;
        damageBody(body, strength * 10 * damage, x, y);
      }
    });
    fort.cores.forEach(function (coreNode) {
      if (!coreNode.active) return;
      var dx = coreNode.x - x;
      var dy = coreNode.y - y;
      if (dx * dx + dy * dy < radius * radius * 0.72) destroyCore(coreNode);
    });
  }

  function updatePhysics(dt) {
    var fort = forts[currentPlayer];
    projectiles.forEach(function (projectile) {
      if (!projectile.active) return;
      projectile.age += dt;
      projectile.vx += LEVELS[levelIndex].wind * (currentPlayer === 0 ? 1 : -1) * dt;
      projectile.vy += GRAVITY * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.y - projectile.radius < GROUND_Y) {
        projectile.y = GROUND_Y + projectile.radius;
        projectile.vy = Math.abs(projectile.vy) * 0.44;
        projectile.vx *= 0.72;
        projectile.bounces += 1;
      }
      collideProjectileWithFort(projectile, fort);
      collideProjectileWithCores(projectile, fort);
      if (projectile.age > 9 || projectile.x < -18 || projectile.x > 18 || projectile.y < -2 || projectile.y > 17 || (projectile.bounces > 3 && Math.abs(projectile.vx) + Math.abs(projectile.vy) < 2.2)) {
        projectile.active = false;
        projectile.mesh.visible = false;
      } else {
        projectile.mesh.position.set(projectile.x, projectile.y, 0);
        projectile.mesh.rotation.x += dt * 4;
        projectile.mesh.rotation.y += dt * 5;
      }
    });

    fort.bodies.forEach(function (body) {
      if (!body.active) return;
      if (!body.sleeping) {
        body.vy += GRAVITY * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.angular * dt;
        body.vx *= Math.max(0, 1 - dt * 0.42);
        body.angular *= Math.max(0, 1 - dt * 1.1);
      }
      if (body.y - body.height / 2 < GROUND_Y) {
        var impact = Math.abs(body.vy);
        body.y = GROUND_Y + body.height / 2;
        body.vy = impact > 2.5 ? impact * 0.18 : 0;
        body.vx *= 0.72;
        body.angular *= 0.68;
        if (impact > 5) damageBody(body, impact * 5, body.x, body.y - body.height / 2);
      }
    });
    resolveBodyCollisions(fort.bodies);
    checkBodiesAgainstCores(fort);
    fort.bodies.forEach(function (body) {
      if (!body.active) return;
      if (Math.abs(body.vx) + Math.abs(body.vy) + Math.abs(body.angular) < 0.12 && body.y - body.height / 2 <= GROUND_Y + 0.03) body.sleeping = true;
      body.mesh.position.set(body.x, body.y, 0);
      body.mesh.rotation.z = body.angle;
    });
  }

  function collideProjectileWithFort(projectile, fort) {
    fort.bodies.forEach(function (body) {
      if (!projectile.active || !body.active) return;
      var closestX = THREE.MathUtils.clamp(projectile.x, body.x - body.width / 2, body.x + body.width / 2);
      var closestY = THREE.MathUtils.clamp(projectile.y, body.y - body.height / 2, body.y + body.height / 2);
      var dx = projectile.x - closestX;
      var dy = projectile.y - closestY;
      var distanceSq = dx * dx + dy * dy;
      if (distanceSq > projectile.radius * projectile.radius) return;
      var distance = Math.sqrt(distanceSq) || 0.001;
      var nx = dx / distance;
      var ny = dy / distance;
      if (distanceSq < 0.0001) {
        nx = projectile.vx > 0 ? -1 : 1;
        ny = 0.2;
      }
      var speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
      var impulse = Math.max(2, speed * projectile.damage);
      body.sleeping = false;
      body.vx += projectile.vx * 0.28 * projectile.damage / body.mass;
      body.vy += Math.max(0.6, projectile.vy * 0.18) * projectile.damage / body.mass;
      body.angular += (projectile.y - body.y) * projectile.vx * 0.008 / body.mass;
      damageBody(body, impulse * 5.5, closestX, closestY);
      projectile.x += nx * (projectile.radius - distance + 0.04);
      projectile.y += ny * (projectile.radius - distance + 0.04);
      var dot = projectile.vx * nx + projectile.vy * ny;
      projectile.vx = (projectile.vx - 1.55 * dot * nx) * (projectile.type === "drill" && abilityUsed ? 0.9 : 0.58);
      projectile.vy = (projectile.vy - 1.55 * dot * ny) * (projectile.type === "drill" && abilityUsed ? 0.9 : 0.58);
      if (projectile.type === "drill" && abilityUsed) {
        projectile.vx *= 1.08;
        projectile.damage *= 0.92;
      } else {
        projectile.bounces += 1;
      }
      burstSparks(closestX, closestY, 0.2, projectile.mesh.material.color.getHex(), quality === "high" ? 16 : 10, 4);
      playBeep(body.materialType === "glass" ? 720 : body.materialType === "metal" ? 160 : 360, 0.07, "triangle", 0.018);
    });
  }

  function collideProjectileWithCores(projectile, fort) {
    fort.cores.forEach(function (coreNode) {
      if (!projectile.active || !coreNode.active) return;
      var dx = projectile.x - coreNode.x;
      var dy = projectile.y - coreNode.y;
      var radius = projectile.radius + coreNode.radius;
      if (dx * dx + dy * dy < radius * radius) {
        destroyCore(coreNode);
        projectile.vx *= 0.68;
        projectile.vy *= 0.68;
      }
    });
  }

  function resolveBodyCollisions(bodies) {
    for (var i = 0; i < bodies.length; i += 1) {
      var a = bodies[i];
      if (!a.active) continue;
      for (var j = i + 1; j < bodies.length; j += 1) {
        var b = bodies[j];
        if (!b.active) continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var overlapX = (a.width + b.width) / 2 - Math.abs(dx);
        var overlapY = (a.height + b.height) / 2 - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapY < overlapX) {
          var signY = dy >= 0 ? 1 : -1;
          var top = signY > 0 ? b : a;
          var bottom = signY > 0 ? a : b;
          top.y += overlapY + 0.001;
          if (top.vy < bottom.vy) top.vy = Math.max(0, bottom.vy) * 0.25;
          top.vx += bottom.vx * 0.06;
          if (Math.abs(top.vy) < 0.24) top.vy = 0;
        } else {
          var signX = dx >= 0 ? 1 : -1;
          var totalMass = a.mass + b.mass;
          a.x -= signX * overlapX * b.mass / totalMass;
          b.x += signX * overlapX * a.mass / totalMass;
          var relative = b.vx - a.vx;
          a.vx += relative * 0.28 * b.mass / totalMass;
          b.vx -= relative * 0.28 * a.mass / totalMass;
          a.sleeping = b.sleeping = false;
        }
      }
    }
  }

  function checkBodiesAgainstCores(fort) {
    fort.cores.forEach(function (coreNode) {
      if (!coreNode.active) return;
      fort.bodies.forEach(function (body) {
        if (!body.active || !coreNode.active) return;
        var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        if (speed < 2.2) return;
        if (Math.abs(coreNode.x - body.x) < body.width / 2 + coreNode.radius && Math.abs(coreNode.y - body.y) < body.height / 2 + coreNode.radius) destroyCore(coreNode);
      });
    });
  }

  function damageBody(body, damage, x, y) {
    if (!body.active || damage < 9) return;
    body.health -= damage;
    if (body.health <= 0) breakBody(body, x, y);
  }

  function breakBody(body, x, y) {
    body.active = false;
    body.mesh.visible = false;
    forts[currentPlayer].bodies.forEach(function (otherBody) {
      if (otherBody.active) otherBody.sleeping = false;
    });
    var multiplier = combo;
    scores[currentPlayer] += body.value * multiplier;
    combo = Math.min(6, combo + 1);
    comboTimer = 1.8;
    showToast("تحطيم ×" + multiplier + "  +" + body.value * multiplier, 700);
    var color = body.materialType === "glass" ? colors.cyan : body.materialType === "crystal" ? colors.violet : colors.orange;
    burstSparks(x || body.x, y || body.y, 0.2, color, quality === "high" ? 32 : 20, 5.5);
    playBeep(body.materialType === "glass" ? 840 : 240, 0.13, body.materialType === "metal" ? "square" : "triangle", 0.04);
  }

  function destroyCore(coreNode) {
    if (!coreNode.active) return;
    coreNode.active = false;
    coreNode.mesh.visible = false;
    scores[currentPlayer] += 1000 * combo;
    combo = Math.min(6, combo + 1);
    comboTimer = 2.2;
    createRingEffect(coreNode.x, coreNode.y, colors.mint, 3.4);
    burstSparks(coreNode.x, coreNode.y, 0.2, colors.mint, quality === "high" ? 52 : 32, 7);
    showBigMessage("CORE DOWN", 850);
    playBeep(520, 0.16, "triangle", 0.055);
    window.setTimeout(function () { playBeep(820, 0.22, "sine", 0.045); }, 100);
  }

  function fortIsCalm(fort) {
    return fort.bodies.every(function (body) { return !body.active || body.sleeping || Math.abs(body.vx) + Math.abs(body.vy) < 0.18; });
  }

  function finishShot() {
    if (shotState !== "settling") return;
    var currentFortCleared = coresRemaining(forts[currentPlayer]) === 0;
    if (mode === "one") {
      if (currentFortCleared || shotsRemaining[0] <= 0) finishGame();
      else prepareTurn();
      return;
    }

    var other = 1 - currentPlayer;
    var otherCanPlay = shotsRemaining[other] > 0 && coresRemaining(forts[other]) > 0;
    var currentCanPlay = shotsRemaining[currentPlayer] > 0 && !currentFortCleared;
    if (!otherCanPlay && !currentCanPlay) {
      finishGame();
      return;
    }
    if (otherCanPlay) currentPlayer = other;
    showBigMessage("دور اللاعب " + (currentPlayer + 1), 850);
    prepareTurn();
  }

  function coresRemaining(fort) {
    return fort.cores.filter(function (coreNode) { return coreNode.active; }).length;
  }

  function finishGame() {
    var p1Cores = coresRemaining(forts[0]);
    var p2Cores = coresRemaining(forts[1]);
    if (mode === "one") {
      levelCleared = p1Cores === 0;
      if (levelCleared && levelIndex < LEVELS.length - 1) {
        maxUnlockedLevel = Math.max(maxUnlockedLevel, levelIndex + 1);
        writeSetting("maxUnlockedLevel", maxUnlockedLevel);
      }
      winnerTitle.textContent = p1Cores === 0 ? "تم تدمير الحصن!" : "انتهت الطلقات";
      resultDetail.textContent = p1Cores === 0 ? (levelIndex === LEVELS.length - 1 ? "أنهيت الحملة وهزمت القلعة الحديدية" : "فُتحت المرحلة " + (levelIndex + 2) + " — " + LEVELS[levelIndex + 1].name) : "بقيت " + p1Cores + " نوى — جرّب زاوية وقدرة مختلفة";
      finalP1Score.textContent = String(scores[0].toLocaleString("en-US"));
      finalP2Score.textContent = String(3 - p1Cores);
      document.getElementById("playAgainButton").textContent = levelCleared && levelIndex < LEVELS.length - 1 ? "المرحلة التالية" : "إعادة المرحلة";
    } else {
      var destroyedP1 = 3 - p1Cores;
      var destroyedP2 = 3 - p2Cores;
      var winner = destroyedP1 === destroyedP2 ? (scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1) : destroyedP1 > destroyedP2 ? 0 : 1;
      winnerTitle.textContent = winner < 0 ? "تعادل قوي!" : "فاز اللاعب " + (winner + 1) + "!";
      resultDetail.textContent = "النوى المدمرة: " + (3 - p1Cores) + " مقابل " + (3 - p2Cores);
      finalP1Score.textContent = String(scores[0].toLocaleString("en-US"));
      finalP2Score.textContent = String(scores[1].toLocaleString("en-US"));
      document.getElementById("playAgainButton").textContent = levelIndex < LEVELS.length - 1 ? "جولة أصعب" : "إعادة القلعة";
    }
    updateCampaignProgress();
    setState("result");
    setHumVolume(0);
    playBeep(680, 0.18, "triangle", 0.05);
    renderScene();
  }

  function currentAmmoType() {
    return AMMO_SEQUENCE[shotsUsed[currentPlayer] % AMMO_SEQUENCE.length];
  }

  function updateLauncher() {
    var side = currentPlayer === 0 ? 1 : -1;
    launcher.side = side;
    launcher.group.position.x = side > 0 ? -12.5 : 12.5;
    var radians = aimAngle * Math.PI / 180;
    launcher.pivot.rotation.z = side > 0 ? radians - Math.PI / 2 : Math.PI / 2 - radians;
    launcher.barrelGlow.material = currentPlayer === 0 ? shared.cyan : shared.pink;
  }

  function launcherMuzzle() {
    var side = currentPlayer === 0 ? 1 : -1;
    var radians = aimAngle * Math.PI / 180;
    return { x: launcher.group.position.x + side * Math.cos(radians) * 2.6, y: 0.7 + Math.sin(radians) * 2.6 };
  }

  function updateTrajectory() {
    if (shotState !== "aiming") {
      trajectory.mesh.visible = false;
      return;
    }
    trajectory.mesh.visible = true;
    var side = currentPlayer === 0 ? 1 : -1;
    var radians = aimAngle * Math.PI / 180;
    var speed = 10.5 + aimPower / 100 * 12.5;
    var muzzle = launcherMuzzle();
    var vx = side * Math.cos(radians) * speed;
    var vy = Math.sin(radians) * speed;
    for (var index = 0; index < 27; index += 1) {
      var t = index * 0.09;
      trajectory.positions[index * 3] = muzzle.x + vx * t;
      trajectory.positions[index * 3 + 1] = Math.max(GROUND_Y + 0.1, muzzle.y + vy * t + 0.5 * GRAVITY * t * t);
      trajectory.positions[index * 3 + 2] = 0.2;
    }
    trajectory.geometry.attributes.position.needsUpdate = true;
    trajectory.mesh.material.color.setHex(currentPlayer === 0 ? colors.cyanSoft : colors.pink);
  }

  function updateFortVisuals(dt) {
    forts.forEach(function (fort) {
      fort.cores.forEach(function (coreNode, index) {
        if (!coreNode.active || !fort.visible) return;
        coreNode.orb.rotation.x += dt * 1.7;
        coreNode.orb.rotation.y += dt * 2;
        coreNode.ring.rotation.z += dt * (index % 2 ? -1.4 : 1.4);
      });
    });
  }

  function createRingEffect(x, y, color, maxScale) {
    var effect = effects.find(function (item) { return item.life <= 0; }) || effects[0];
    effect.life = effect.maxLife;
    effect.maxScale = maxScale;
    effect.mesh.position.set(x, y, 0.25);
    effect.mesh.scale.setScalar(0.15);
    effect.mesh.material.color.setHex(color);
    effect.mesh.material.opacity = 0.9;
    effect.mesh.visible = true;
  }

  function updateEffects(dt) {
    effects.forEach(function (effect) {
      if (effect.life <= 0) return;
      effect.life -= dt;
      var progress = 1 - Math.max(0, effect.life) / effect.maxLife;
      effect.mesh.scale.setScalar(0.15 + progress * effect.maxScale);
      effect.mesh.material.opacity = Math.max(0, (1 - progress) * 0.9);
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
      var force = (0.45 + Math.random() * 0.72) * power;
      particle.life = 0.4 + Math.random() * 0.58;
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.vx = Math.cos(angle) * force;
      particle.vy = Math.sin(angle) * force + 1.1;
      particle.vz = (Math.random() - 0.5) * power * 0.4;
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
        particle.vy += GRAVITY * 0.3 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
      } else particle.y = -100;
      sparks.positions[index * 3] = particle.x;
      sparks.positions[index * 3 + 1] = particle.y;
      sparks.positions[index * 3 + 2] = particle.z;
    });
    if (changed) sparks.geometry.attributes.position.needsUpdate = true;
  }

  function updateHud() {
    p1Score.textContent = scores[0].toLocaleString("en-US");
    p2Score.textContent = mode === "one" ? String(3 - coresRemaining(forts[0])) : scores[1].toLocaleString("en-US");
    p1Shots.textContent = shotsRemaining[0] + " SHOTS";
    p2Shots.textContent = mode === "one" ? "CORES DOWN" : shotsRemaining[1] + " SHOTS";
    modeLabel.textContent = mode === "one" ? "SOLO SIEGE" : "LOCAL DUEL";
    turnLabel.textContent = mode === "one" ? "YOUR TURN" : "PLAYER " + (currentPlayer + 1) + " TURN";
    coresLabel.textContent = coresRemaining(forts[currentPlayer]) + " CORES LEFT";
    levelLabel.textContent = "STAGE " + (levelIndex + 1) + "/" + LEVELS.length;
    var wind = LEVELS[levelIndex].wind;
    windLabel.textContent = Math.abs(wind) < 0.05 ? "NO WIND" : "WIND " + (wind > 0 ? "▶ " : "◀ ") + Math.round(Math.abs(wind) * 10);
    angleValue.textContent = Math.round(aimAngle) + "°";
    powerValue.textContent = Math.round(aimPower) + "%";
    angleFill.style.transform = "scaleX(" + ((aimAngle - 15) / 57).toFixed(3) + ")";
    powerFill.style.transform = "scaleX(" + ((aimPower - 35) / 65).toFixed(3) + ")";
    var type = shotState === "flying" ? activeAmmoType : currentAmmoType();
    ammoIcon.className = "ammo-icon " + type + "-ammo";
    ammoName.textContent = type === "pulse" ? "PULSE ORB" : type === "split" ? "TRINITY ORB" : "DRILL ORB";
    abilityHint.textContent = type === "pulse" ? "X / B: SHOCKWAVE" : type === "split" ? "X / B: SPLIT ×3" : "X / B: DRILL BOOST";
  }

  function updateCampaignProgress() {
    campaignProgress.textContent = "الحملة: المرحلة " + (maxUnlockedLevel + 1) + " من " + LEVELS.length + " — " + LEVELS[maxUnlockedLevel].name;
  }

  function showToast(message, duration) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () { statusToast.classList.remove("is-visible"); }, duration || 850);
  }

  function showBigMessage(message, duration) {
    window.clearTimeout(messageTimer);
    bigMessage.textContent = message;
    bigMessage.classList.add("is-visible");
    messageTimer = window.setTimeout(function () { bigMessage.classList.remove("is-visible"); }, duration || 800);
  }

  function setQuality(nextQuality, persist) {
    quality = nextQuality === "high" ? "high" : "light";
    if (persist) writeSetting("quality", quality);
    qualityButton.textContent = quality === "high" ? "عالي" : "خفيف";
    renderer.setPixelRatio(quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.35) : Math.min(window.devicePixelRatio || 1, 0.9));
    scene.fog.density = quality === "high" ? 0.008 : 0.011;
    renderer.toneMappingExposure = quality === "high" ? 1.34 : 1.26;
    scene.traverse(function (object) { if (object.userData && object.userData.highOnly) object.visible = quality === "high"; });
    if (sparks && sparks.points) sparks.points.material.size = quality === "high" ? 0.2 : 0.16;
    resize();
    renderScene();
  }

  function toggleQuality() {
    setQuality(quality === "high" ? "light" : "high", true);
    showToast(quality === "high" ? "جودة عالية" : "وضع خفيف للتلفاز", 800);
  }

  function updateSoundButton() { soundButton.textContent = soundEnabled ? "🔊" : "🔇"; }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    writeSetting("sound", soundEnabled ? "on" : "off");
    if (soundEnabled) ensureAudio(); else setHumVolume(0);
    updateSoundButton();
    showToast(soundEnabled ? "تم تشغيل الصوت" : "تم إيقاف الصوت", 700);
  }

  function ensureAudio() {
    if (!soundEnabled) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio.context) {
      audio.context = new AudioContext();
      audio.hum = audio.context.createOscillator();
      audio.hum.type = "sine";
      audio.hum.frequency.value = 44;
      audio.gain = audio.context.createGain();
      audio.gain.gain.value = 0;
      audio.hum.connect(audio.gain);
      audio.gain.connect(audio.context.destination);
      audio.hum.start();
    }
    if (audio.context.state === "suspended") audio.context.resume();
  }

  function updateAudio() {
    if (!audio.context || !audio.gain) return;
    var now = audio.context.currentTime;
    var flying = shotState === "flying";
    audio.hum.frequency.setTargetAtTime(flying ? 68 : 44, now, 0.08);
    audio.gain.gain.setTargetAtTime(soundEnabled && state === "playing" ? (flying ? 0.018 : 0.008) : 0, now, 0.08);
  }

  function setHumVolume(value) {
    if (audio.context && audio.gain) audio.gain.gain.setTargetAtTime(value, audio.context.currentTime, 0.06);
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

  function getGamepads() {
    if (!navigator.getGamepads) return [];
    return Array.prototype.filter.call(navigator.getGamepads(), Boolean);
  }

  function getPlayerPad(player) {
    var pads = getGamepads();
    return pads[player] || pads[0] || null;
  }

  function updateControllerStatus() {
    var pads = getGamepads();
    setControllerPill(controllerOne, pads[0], "P1");
    setControllerPill(controllerTwo, pads[1], "P2");
  }

  function setControllerPill(element, pad, label) {
    element.classList.toggle("is-connected", Boolean(pad));
    element.querySelector("span").textContent = pad ? label + " " + shortenName(pad.id || "Gamepad") : label + " بانتظار القبضة";
  }

  function shortenName(name) { return name.length > 30 ? name.slice(0, 27) + "…" : name; }

  function selectMenuMode(nextMode) {
    menuMode = nextMode === "one" ? "one" : "two";
    var oneButton = document.getElementById("onePlayerButton");
    var twoButton = document.getElementById("twoPlayerButton");
    oneButton.classList.toggle("is-selected", menuMode === "one");
    twoButton.classList.toggle("is-selected", menuMode === "two");
    (menuMode === "one" ? oneButton : twoButton).focus({ preventScroll: true });
  }

  function playAgain() {
    var nextLevel = levelIndex;
    var keepScores = false;
    if (mode === "one" && levelCleared && levelIndex < LEVELS.length - 1) {
      nextLevel = levelIndex + 1;
      keepScores = true;
    } else if (mode === "one" && !levelCleared) {
      scores[0] = scoreAtLevelStart;
      scores[1] = 0;
      keepScores = true;
    } else if (mode === "two" && levelIndex < LEVELS.length - 1) nextLevel = levelIndex + 1;
    startGame(mode, nextLevel, keepScores);
  }

  function pollIdleGamepads() {
    updateControllerStatus();
    if (state === "playing") return;
    var pads = getGamepads();
    pads.slice(0, 2).forEach(function (pad, index) {
      var pressed = Array.prototype.map.call(pad.buttons, function (button) { return button.pressed; });
      var before = idlePreviousButtons[String(pad.index)] || [];
      function justPressed(buttonIndex) { return Boolean(pressed[buttonIndex] && !before[buttonIndex]); }
      if (state === "menu" && (justPressed(14) || justPressed(15) || justPressed(12) || justPressed(13))) selectMenuMode(menuMode === "one" ? "two" : "one");
      if (state === "menu" && (justPressed(0) || justPressed(9))) {
        previousPadButtons[String(pad.index)] = pressed.slice();
        startGame(index === 1 ? "two" : menuMode);
      } else if (state === "paused" && (justPressed(0) || justPressed(9))) resumeGame();
      else if (state === "result" && (justPressed(0) || justPressed(9))) playAgain();
      else if ((state === "paused" || state === "result") && justPressed(1)) exitGame();
      idlePreviousButtons[String(pad.index)] = pressed;
    });
  }

  function resize() {
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  }

  function renderScene() { renderer.render(scene, camera); }

  function exitGame() {
    if (state === "playing") pauseGame();
    setHumVolume(0);
    var detail = { gameId: GAME_ID, mode: mode, scores: scores.slice(), shotsUsed: shotsUsed.slice() };
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
    button.addEventListener("pointerdown", function (event) { event.preventDefault(); actionQueue[action] = true; button.classList.add("is-active"); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (eventName) { button.addEventListener(eventName, function () { button.classList.remove("is-active"); }); });
  }

  bindTouchHold("touchAngleUp", "ArrowUp");
  bindTouchHold("touchAngleDown", "ArrowDown");
  bindTouchHold("touchPowerUp", "ArrowRight");
  bindTouchHold("touchPowerDown", "ArrowLeft");
  bindTouchAction("touchFire", "fire");
  bindTouchAction("touchAbility", "ability");

  document.getElementById("onePlayerButton").addEventListener("click", function () { selectMenuMode("one"); startGame("one"); });
  document.getElementById("twoPlayerButton").addEventListener("click", function () { selectMenuMode("two"); startGame("two"); });
  document.getElementById("resumeButton").addEventListener("click", resumeGame);
  document.getElementById("restartButton").addEventListener("click", function () { scores[0] = scoreAtLevelStart; scores[1] = 0; startGame(mode, levelIndex, true); });
  document.getElementById("playAgainButton").addEventListener("click", playAgain);
  document.getElementById("exitButton").addEventListener("click", exitGame);
  document.getElementById("resultExitButton").addEventListener("click", exitGame);
  pauseButton.addEventListener("click", togglePause);
  qualityButton.addEventListener("click", toggleQuality);
  soundButton.addEventListener("click", toggleSound);

  function normalizedKey(event) {
    var keyCode = event.keyCode || event.which || 0;
    var androidMap = { 4: "Escape", 19: "ArrowUp", 20: "ArrowDown", 21: "ArrowLeft", 22: "ArrowRight", 23: "Enter", 62: "Space", 66: "Enter", 96: "Enter" };
    return event.code || androidMap[keyCode] || event.key || "";
  }

  function isFireKey(code) { return code === "Space" || code === "Enter" || code === "NumpadEnter" || code === "KeyF" || code === "KeyZ"; }
  function isAbilityKey(code) { return code === "KeyE" || code === "KeyX" || code === "KeyC" || code === "Slash" || code === "ShiftLeft" || code === "ShiftRight"; }
  function isDirectionKey(code) { return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].indexOf(code) !== -1; }

  window.addEventListener("keydown", function (event) {
    var code = normalizedKey(event);
    if (isDirectionKey(code) || isFireKey(code)) event.preventDefault();
    if (state === "menu") {
      if (!event.repeat && (code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowUp" || code === "ArrowDown")) selectMenuMode(menuMode === "one" ? "two" : "one");
      else if (!event.repeat && code === "Digit1") { selectMenuMode("one"); startGame("one"); }
      else if (!event.repeat && code === "Digit2") { selectMenuMode("two"); startGame("two"); }
      else if (!event.repeat && isFireKey(code)) startGame(menuMode);
      return;
    }
    keys[code] = true;
    if (!event.repeat) {
      if (state === "playing" && isFireKey(code)) actionQueue.fire = true;
      if (state === "playing" && isAbilityKey(code)) actionQueue.ability = true;
      if (code === "Escape") togglePause();
      if (code === "KeyM") toggleSound();
      if (state === "paused" && isFireKey(code)) resumeGame();
      if (state === "result" && isFireKey(code)) playAgain();
    }
  }, { passive: false });
  window.addEventListener("keyup", function (event) { keys[normalizedKey(event)] = false; });
  window.addEventListener("gamepadconnected", function () { updateControllerStatus(); showToast("تم توصيل قبضة", 700); });
  window.addEventListener("gamepaddisconnected", function () { updateControllerStatus(); showToast("تم فصل قبضة", 700); });
  window.addEventListener("resize", function () { resize(); renderScene(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "playing") pauseGame();
    else if (!document.hidden) renderScene();
  });
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    fatalPanel.hidden = false;
  });
  window.setInterval(pollIdleGamepads, 150);

  window.OrbitSmash = {
    startOnePlayer: function () { startGame("one"); },
    startTwoPlayers: function () { startGame("two"); },
    pause: pauseGame,
    resume: resumeGame,
    exit: exitGame,
    setQuality: function (value) { setQuality(value, true); },
    getState: function () { return { gameId: GAME_ID, state: state, mode: mode, level: levelIndex + 1, levelName: LEVELS[levelIndex].name, scores: scores.slice(), shotsRemaining: shotsRemaining.slice(), currentPlayer: currentPlayer, ammo: currentAmmoType(), cores: [coresRemaining(forts[0]), coresRemaining(forts[1])] }; }
  };

  levelIndex = maxUnlockedLevel;
  applyLevelToFort(forts[0], levelIndex);
  applyLevelToFort(forts[1], levelIndex);
  resetFort(forts[0]);
  resetFort(forts[1]);
  setFortVisible(forts[0], true);
  setFortVisible(forts[1], false);
  updateLauncher();
  updateTrajectory();
  updateSoundButton();
  updateCampaignProgress();
  selectMenuMode("two");
  setQuality(quality, false);
  resize();
  updateHud();
  updateControllerStatus();
  renderScene();
})();
