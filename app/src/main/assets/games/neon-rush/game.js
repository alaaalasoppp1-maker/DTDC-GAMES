(function () {
  "use strict";

  var GAME_ID = "neon-rush-evolution";
  var GAME_SECONDS = 75;
  var ROAD_LENGTH = 24;
  var ROAD_SEGMENTS = 26;
  var PLAYER_Z = 5;
  var LANES = [-4.35, 0, 4.35];
  var STORAGE_PREFIX = "dtdc.neonRush.";

  var app = document.getElementById("app");
  var canvas = document.getElementById("gameCanvas");
  var fatalPanel = document.getElementById("fatalPanel");
  var menuPanel = document.getElementById("menuPanel");
  var pausePanel = document.getElementById("pausePanel");
  var resultPanel = document.getElementById("resultPanel");
  var controllerState = document.getElementById("controllerState");
  var statusToast = document.getElementById("statusToast");
  var comboBadge = document.getElementById("comboBadge");
  var comboValue = document.getElementById("comboValue");
  var timeValue = document.getElementById("timeValue");
  var scoreValue = document.getElementById("scoreValue");
  var bestValue = document.getElementById("bestValue");
  var speedValue = document.getElementById("speedValue");
  var gearValue = document.getElementById("gearValue");
  var nitroFill = document.getElementById("nitroFill");
  var nitroValue = document.getElementById("nitroValue");
  var shieldFill = document.getElementById("shieldFill");
  var shieldValue = document.getElementById("shieldValue");
  var shieldRow = document.getElementById("shieldRow");
  var finalScoreValue = document.getElementById("finalScoreValue");
  var finalDistanceValue = document.getElementById("finalDistanceValue");
  var nearMissValue = document.getElementById("nearMissValue");
  var bestComboValue = document.getElementById("bestComboValue");
  var qualityButton = document.getElementById("qualityButton");
  var soundButton = document.getElementById("soundButton");

  var startButton = document.getElementById("startButton");
  var pauseButton = document.getElementById("pauseButton");
  var cameraButton = document.getElementById("cameraButton");
  var exitButton = document.getElementById("exitButton");
  var resumeButton = document.getElementById("resumeButton");
  var restartButton = document.getElementById("restartButton");
  var playAgainButton = document.getElementById("playAgainButton");
  var resultExitButton = document.getElementById("resultExitButton");

  var state = "menu";
  var quality = readSetting("quality", "light");
  var soundEnabled = readSetting("sound", "on") !== "off";
  var bestScore = parseInt(readSetting("best", "0"), 10) || 0;
  var cameraMode = 0;
  var gameTime = GAME_SECONDS;
  var score = 0;
  var distance = 0;
  var speed = 0;
  var nitro = 100;
  var shield = 0;
  var nearMisses = 0;
  var combo = 1;
  var topCombo = 1;
  var comboTimer = 0;
  var collisionCooldown = 0;
  var cameraShake = 0;
  var nextCheckpoint = 500;
  var checkpointCount = 0;
  var playerX = 0;
  var steerVelocity = 0;
  var frameHandle = 0;
  var lastFrameTime = performance.now();
  var toastTimer = 0;
  var raceSerial = 0;
  var input = { left: false, right: false, boost: false };
  var previousPadButtons = [];

  var audio = {
    context: null,
    oscillator: null,
    oscillator2: null,
    gain: null,
    filter: null
  };

  function readSetting(key, fallback) {
    try {
      var value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeSetting(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, String(value));
    } catch (error) {
      /* Storage is optional in private/file modes. */
    }
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
      powerPreference: quality === "high" ? "high-performance" : "low-power",
      precision: "mediump"
    });
  } catch (error) {
    fatalPanel.hidden = false;
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  renderer.shadowMap.enabled = false;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x102f4d);
  scene.fog = new THREE.FogExp2(0x1b4a63, quality === "high" ? 0.0076 : 0.0095);

  var camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 720);
  camera.position.set(0, 4.1, 12.2);

  scene.add(new THREE.HemisphereLight(0xb5efff, 0x102236, 3.05));
  var keyLight = new THREE.DirectionalLight(0xf2fbff, 2.75);
  keyLight.position.set(-7, 13, 8);
  scene.add(keyLight);
  var rimLight = new THREE.DirectionalLight(0xc280ff, 1.55);
  rimLight.position.set(8, 5, -10);
  scene.add(rimLight);
  var sunsetLight = new THREE.DirectionalLight(0xff87d7, 0.85);
  sunsetLight.position.set(12, 4, -25);
  scene.add(sunsetLight);

  var colors = {
    road: 0x1a2b3b,
    shoulder: 0x31516a,
    cyan: 0x1ee9ff,
    cyanSoft: 0xa5f7ff,
    mint: 0xc7ff63,
    violet: 0xa77bff,
    pink: 0xff5bd4,
    orange: 0xffbb52,
    red: 0xff557b,
    white: 0xf4fcff,
    dark: 0x09131e
  };

  var shared = createSharedAssets();
  var road = createRoad();
  var player = createCar(colors.cyan, true);
  player.position.set(0, 0.02, PLAYER_Z);
  scene.add(player);

  var traffic = createTraffic();
  var pickups = createPickups();
  var speedLines = createSpeedLines();
  var sparks = createSparkSystem();
  var skyline = createSkyline();
  createSky();

  function createSharedAssets() {
    var box = new THREE.BoxGeometry(1, 1, 1);
    var roadMaterial = new THREE.MeshStandardMaterial({ color: colors.road, roughness: 0.88, metalness: 0.1 });
    var shoulderMaterial = new THREE.MeshStandardMaterial({ color: colors.shoulder, roughness: 0.72, metalness: 0.18 });
    var cyanMaterial = new THREE.MeshBasicMaterial({ color: colors.cyan });
    var pinkMaterial = new THREE.MeshBasicMaterial({ color: colors.pink });
    var mintMaterial = new THREE.MeshBasicMaterial({ color: colors.mint });
    var whiteMaterial = new THREE.MeshBasicMaterial({ color: colors.white });
    var windowMaterial = new THREE.MeshBasicMaterial({ color: colors.cyanSoft, transparent: true, opacity: 0.78 });
    var darkMaterial = new THREE.MeshStandardMaterial({ color: colors.dark, roughness: 0.4, metalness: 0.58 });
    return {
      box: box,
      roadMaterial: roadMaterial,
      shoulderMaterial: shoulderMaterial,
      cyanMaterial: cyanMaterial,
      pinkMaterial: pinkMaterial,
      mintMaterial: mintMaterial,
      neonMaterials: [cyanMaterial, pinkMaterial, mintMaterial],
      whiteMaterial: whiteMaterial,
      windowMaterial: windowMaterial,
      darkMaterial: darkMaterial
    };
  }

  function createRoad() {
    var segments = [];
    for (var index = 0; index < ROAD_SEGMENTS; index += 1) {
      var group = new THREE.Group();
      group.userData.worldS = index * ROAD_LENGTH - ROAD_LENGTH;

      var surface = new THREE.Mesh(new THREE.PlaneGeometry(15.2, ROAD_LENGTH + 0.35), shared.roadMaterial);
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = 0;
      group.add(surface);

      [-7.72, 7.72].forEach(function (x, sideIndex) {
        var shoulder = new THREE.Mesh(shared.box, shared.shoulderMaterial);
        shoulder.scale.set(0.38, 0.08, ROAD_LENGTH);
        shoulder.position.set(x, 0.02, 0);
        group.add(shoulder);

        var neonEdge = new THREE.Mesh(shared.box, shared.neonMaterials[(index + sideIndex) % shared.neonMaterials.length]);
        neonEdge.scale.set(0.055, 0.045, ROAD_LENGTH);
        neonEdge.position.set(x - Math.sign(x) * 0.28, 0.08, 0);
        group.add(neonEdge);
      });

      [-2.55, 2.55].forEach(function (x) {
        [-7.2, 1.1, 9.4].forEach(function (z) {
          var dash = new THREE.Mesh(shared.box, shared.whiteMaterial);
          dash.scale.set(0.075, 0.025, 4.6);
          dash.position.set(x, 0.055, z);
          group.add(dash);
        });
      });

      addRoadside(group, -1, index, false);
      addRoadside(group, 1, index + 17, index % 2 === 0);
      if (index % 8 === 2) addRaceGate(group, index);
      scene.add(group);
      segments.push(group);
    }
    return segments;
  }

  function addRaceGate(group, seed) {
    var material = shared.neonMaterials[seed % shared.neonMaterials.length];
    [-8.25, 8.25].forEach(function (x) {
      var post = new THREE.Mesh(shared.box, material);
      post.scale.set(0.12, 4.6, 0.12);
      post.position.set(x, 2.3, 0);
      group.add(post);
    });
    var beam = new THREE.Mesh(shared.box, material);
    beam.scale.set(16.6, 0.12, 0.12);
    beam.position.set(0, 4.6, 0);
    group.add(beam);
    var inner = new THREE.Mesh(shared.box, shared.whiteMaterial);
    inner.scale.set(6.2, 0.035, 0.08);
    inner.position.set(0, 4.42, 0);
    inner.userData.highOnly = true;
    group.add(inner);
  }

  function addRoadside(group, side, seed, highOnly) {
    var height = 5 + ((seed * 7) % 14);
    var width = 3.5 + ((seed * 3) % 5);
    var depth = 4 + ((seed * 5) % 6);
    var hue = [0x1d4661, 0x32365f, 0x175567, 0x493164][seed % 4];
    var glowHue = [0x0d2c3d, 0x1f173c, 0x0a3440, 0x2a1236][seed % 4];
    var material = new THREE.MeshStandardMaterial({ color: hue, emissive: glowHue, emissiveIntensity: 0.34, roughness: 0.62, metalness: 0.2 });
    var building = new THREE.Mesh(shared.box, material);
    building.scale.set(width, height, depth);
    building.position.set(side * (11.8 + (seed % 5) * 1.5), height / 2 - 0.08, ((seed * 5) % 10) - 4);
    building.userData.highOnly = highOnly;
    group.add(building);

    var lightBand = new THREE.Mesh(shared.box, seed % 3 === 0 ? shared.windowMaterial : shared.neonMaterials[seed % shared.neonMaterials.length]);
    lightBand.scale.set(width * 0.74, 0.08, depth + 0.04);
    lightBand.position.set(building.position.x, Math.max(1.2, height * 0.62), building.position.z);
    lightBand.userData.highOnly = highOnly;
    group.add(lightBand);

    var sign = new THREE.Mesh(shared.box, shared.neonMaterials[(seed + 1) % shared.neonMaterials.length]);
    sign.scale.set(0.055, 0.48, Math.min(2.2, width * 0.5));
    sign.position.set(building.position.x - side * (width / 2 + 0.04), Math.max(2, height * 0.42), building.position.z - depth * 0.16);
    sign.userData.highOnly = highOnly;
    group.add(sign);

    if (seed % 3 === 0) {
      var post = new THREE.Mesh(shared.box, shared.whiteMaterial);
      post.scale.set(0.07, 3.2, 0.07);
      post.position.set(side * 8.55, 1.6, 6);
      post.userData.highOnly = true;
      group.add(post);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), shared.cyanMaterial);
      lamp.position.set(side * 8.55, 3.2, 6);
      lamp.userData.highOnly = true;
      group.add(lamp);
    }
  }

  function createCar(color, detailed) {
    var car = new THREE.Group();
    var bodyMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: detailed ? 0.12 : 0.06, roughness: 0.22, metalness: 0.79 });
    var glassMaterial = new THREE.MeshStandardMaterial({ color: 0x102b3c, emissive: 0x092131, emissiveIntensity: 0.34, roughness: 0.16, metalness: 0.66 });
    var body = new THREE.Mesh(shared.box, bodyMaterial);
    body.scale.set(1.76, 0.42, 3.48);
    body.position.y = 0.62;
    car.add(body);

    var nose = new THREE.Mesh(shared.box, bodyMaterial);
    nose.scale.set(1.62, 0.26, 1.08);
    nose.position.set(0, 0.8, -1.38);
    car.add(nose);

    var cabin = new THREE.Mesh(shared.box, glassMaterial);
    cabin.scale.set(1.32, 0.53, 1.46);
    cabin.position.set(0, 1.04, 0.12);
    cabin.rotation.x = -0.06;
    car.add(cabin);

    if (detailed) {
      var centerStripe = new THREE.Mesh(shared.box, shared.pinkMaterial);
      centerStripe.scale.set(0.12, 0.025, 2.86);
      centerStripe.position.set(0, 0.855, -0.18);
      car.add(centerStripe);
      [-0.87, 0.87].forEach(function (x) {
        var sideGlow = new THREE.Mesh(shared.box, shared.mintMaterial);
        sideGlow.scale.set(0.035, 0.055, 2.72);
        sideGlow.position.set(x, 0.45, 0.05);
        car.add(sideGlow);
      });
    }

    var spoiler = new THREE.Mesh(shared.box, bodyMaterial);
    spoiler.scale.set(1.78, 0.08, 0.32);
    spoiler.position.set(0, 0.98, 1.48);
    car.add(spoiler);

    var wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.23, detailed ? 12 : 8);
    var wheels = [];
    [[-0.95, 0.35, -1.02], [0.95, 0.35, -1.02], [-0.95, 0.35, 1.08], [0.95, 0.35, 1.08]].forEach(function (position) {
      var wheel = new THREE.Mesh(wheelGeometry, shared.darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(position[0], position[1], position[2]);
      car.add(wheel);
      wheels.push(wheel);
    });

    var tailMaterial = new THREE.MeshBasicMaterial({ color: colors.red });
    [-0.57, 0.57].forEach(function (x) {
      var tail = new THREE.Mesh(shared.box, tailMaterial);
      tail.scale.set(0.32, 0.11, 0.055);
      tail.position.set(x, 0.64, 1.76);
      car.add(tail);
      var headlight = new THREE.Mesh(shared.box, shared.whiteMaterial);
      headlight.scale.set(0.29, 0.1, 0.055);
      headlight.position.set(x, 0.72, -1.78);
      car.add(headlight);
    });

    if (detailed) {
      var underglowMaterial = new THREE.MeshBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
      var underglow = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.2), underglowMaterial);
      underglow.rotation.x = -Math.PI / 2;
      underglow.position.y = 0.05;
      car.add(underglow);
      car.userData.underglow = underglow;
    }

    car.userData.wheels = wheels;
    car.userData.bodyMaterial = bodyMaterial;
    return car;
  }

  function createTraffic() {
    var rivals = [];
    var palette = [colors.orange, colors.violet, colors.mint, colors.white, 0x3e78ff, 0xff4e98];
    for (var index = 0; index < 10; index += 1) {
      var car = createCar(palette[index % palette.length], false);
      car.scale.setScalar(0.88 + (index % 3) * 0.035);
      car.userData.worldS = 110 + index * 58;
      car.userData.lane = LANES[index % LANES.length];
      car.userData.cruise = 17 + (index % 5) * 2.3;
      car.userData.phase = index * 1.73;
      car.userData.collided = false;
      car.userData.checkedPass = false;
      scene.add(car);
      rivals.push(car);
    }
    return rivals;
  }

  function createPickups() {
    var items = [];
    for (var index = 0; index < 6; index += 1) {
      var type = index < 4 ? "nitro" : "shield";
      var group = new THREE.Group();
      var color = type === "nitro" ? colors.cyan : colors.violet;
      var material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.9, roughness: 0.2, metalness: 0.48 });
      var coreGeometry = type === "nitro" ? new THREE.OctahedronGeometry(0.47, 0) : new THREE.IcosahedronGeometry(0.5, 0);
      var core = new THREE.Mesh(coreGeometry, material);
      core.position.y = 0.95;
      group.add(core);
      var ringMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.72, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.78, 18), ringMaterial);
      ring.position.y = 0.95;
      group.add(ring);
      group.userData.type = type;
      group.userData.worldS = 180 + index * 155;
      group.userData.lane = LANES[(index * 2 + 1) % LANES.length];
      group.userData.core = core;
      group.userData.ring = ring;
      scene.add(group);
      items.push(group);
    }
    return items;
  }

  function createSpeedLines() {
    var points = [];
    for (var index = 0; index < 110; index += 1) {
      points.push((Math.random() - 0.5) * 17, 0.2 + Math.random() * 5.5, PLAYER_Z - Math.random() * 150);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    var material = new THREE.PointsMaterial({ color: colors.cyanSoft, size: 0.12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var particles = new THREE.Points(geometry, material);
    scene.add(particles);
    return particles;
  }

  function createSparkSystem() {
    var count = 64;
    var positions = new Float32Array(count * 3);
    var colorData = new Float32Array(count * 3);
    var particles = [];
    for (var index = 0; index < count; index += 1) {
      positions[index * 3 + 1] = -100;
      colorData[index * 3] = 1;
      colorData[index * 3 + 1] = 1;
      colorData[index * 3 + 2] = 1;
      particles.push({ life: 0, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0 });
    }
    var geometry = new THREE.BufferGeometry();
    var positionAttribute = new THREE.BufferAttribute(positions, 3);
    var colorAttribute = new THREE.BufferAttribute(colorData, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("color", colorAttribute);
    var material = new THREE.PointsMaterial({
      size: quality === "high" ? 0.2 : 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var points = new THREE.Points(geometry, material);
    scene.add(points);
    return { points: points, geometry: geometry, positions: positions, colors: colorData, particles: particles };
  }

  function burstSparks(x, y, z, color, amount, power) {
    var tint = new THREE.Color(color);
    var spawned = 0;
    for (var index = 0; index < sparks.particles.length && spawned < amount; index += 1) {
      var particle = sparks.particles[index];
      if (particle.life > 0) continue;
      var angle = Math.random() * Math.PI * 2;
      var force = (0.45 + Math.random() * 0.7) * power;
      particle.life = 0.42 + Math.random() * 0.5;
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.vx = Math.cos(angle) * force;
      particle.vy = 1.2 + Math.random() * power * 0.8;
      particle.vz = Math.sin(angle) * force;
      sparks.colors[index * 3] = tint.r;
      sparks.colors[index * 3 + 1] = tint.g;
      sparks.colors[index * 3 + 2] = tint.b;
      spawned += 1;
    }
    sparks.geometry.attributes.color.needsUpdate = true;
  }

  function updateSparks(dt) {
    var active = false;
    sparks.particles.forEach(function (particle, index) {
      if (particle.life > 0) {
        active = true;
        particle.life -= dt;
        particle.vy -= dt * 3.8;
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
    if (active) sparks.geometry.attributes.position.needsUpdate = true;
  }

  function createSkyline() {
    var group = new THREE.Group();
    for (var index = 0; index < 20; index += 1) {
      var tower = new THREE.Mesh(shared.box, new THREE.MeshBasicMaterial({ color: index % 3 === 0 ? 0x29506d : index % 3 === 1 ? 0x343f68 : 0x21475a }));
      var height = 12 + (index * 11) % 26;
      tower.scale.set(5 + (index % 4) * 2, height, 5);
      tower.position.set((index - 10) * 11, height / 2 - 1, -235 - (index % 4) * 13);
      group.add(tower);
      if (index % 2 === 0) {
        var crown = new THREE.Mesh(shared.box, shared.neonMaterials[index % shared.neonMaterials.length]);
        crown.scale.set(tower.scale.x * 0.72, 0.11, 5.05);
        crown.position.set(tower.position.x, height - 1.2, tower.position.z);
        group.add(crown);
      }
    }
    scene.add(group);
    return group;
  }

  function createSky() {
    var skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x071c42) },
        middleColor: { value: new THREE.Color(0x246d91) },
        bottomColor: { value: new THREE.Color(0xb84e91) },
        glowColor: { value: new THREE.Color(0xffbb6a) }
      },
      vertexShader: [
        "varying float vHeight;",
        "void main() {",
        "  vHeight = normalize(position).y;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 topColor;",
        "uniform vec3 middleColor;",
        "uniform vec3 bottomColor;",
        "uniform vec3 glowColor;",
        "varying float vHeight;",
        "void main() {",
        "  float h = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);",
        "  vec3 color = mix(bottomColor, middleColor, smoothstep(0.18, 0.55, h));",
        "  color = mix(color, topColor, smoothstep(0.52, 0.96, h));",
        "  float horizon = exp(-pow((h - 0.42) * 9.0, 2.0));",
        "  color += glowColor * horizon * 0.16;",
        "  gl_FragColor = vec4(color, 1.0);",
        "}"
      ].join("\n"),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    var skyDome = new THREE.Mesh(new THREE.SphereGeometry(660, quality === "high" ? 24 : 16, 12), skyMaterial);
    skyDome.renderOrder = -100;
    scene.add(skyDome);

    var starPoints = [];
    var count = quality === "high" ? 440 : 220;
    for (var index = 0; index < count; index += 1) {
      starPoints.push((Math.random() - 0.5) * 360, 18 + Math.random() * 110, -30 - Math.random() * 610);
    }
    var starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPoints, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc8f5ff, size: quality === "high" ? 0.14 : 0.18, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })));

    var moonMaterial = new THREE.MeshBasicMaterial({ color: 0xffd995, transparent: true, opacity: 0.92 });
    var moon = new THREE.Mesh(new THREE.SphereGeometry(7, 18, 12), moonMaterial);
    moon.position.set(-58, 58, -360);
    scene.add(moon);

    var haloMaterial = new THREE.MeshBasicMaterial({ color: 0xff8fcc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    var halo = new THREE.Mesh(new THREE.SphereGeometry(11, 14, 10), haloMaterial);
    halo.position.copy(moon.position);
    scene.add(halo);
  }

  function rawCurve(worldS) {
    return Math.sin(worldS * 0.0068) * 4.8 + Math.sin(worldS * 0.0021 + 1.6) * 3.1;
  }

  function roadCenterAt(worldS) {
    return rawCurve(worldS) - rawCurve(distance);
  }

  function roadYawAt(worldS) {
    var delta = rawCurve(worldS + 5) - rawCurve(worldS - 5);
    return -Math.atan2(delta, 10);
  }

  function respawnTraffic(car, offset) {
    car.userData.worldS = distance + 260 + Math.random() * 560 + (offset || 0);
    car.userData.lane = LANES[Math.floor(Math.random() * LANES.length)];
    car.userData.cruise = 16 + Math.random() * 12;
    car.userData.collided = false;
    car.userData.checkedPass = false;
    car.visible = true;
  }

  function respawnPickup(item, offset) {
    item.userData.worldS = distance + 310 + Math.random() * 650 + (offset || 0);
    item.userData.lane = LANES[Math.floor(Math.random() * LANES.length)];
    item.visible = true;
  }

  function resetRace() {
    raceSerial += 1;
    gameTime = GAME_SECONDS;
    score = 0;
    distance = 0;
    speed = 21;
    nitro = 100;
    shield = 0;
    nearMisses = 0;
    combo = 1;
    topCombo = 1;
    comboTimer = 0;
    collisionCooldown = 0;
    cameraShake = 0;
    nextCheckpoint = 500;
    checkpointCount = 0;
    playerX = 0;
    steerVelocity = 0;
    player.position.x = 0;
    player.rotation.set(0, 0, 0);
    road.forEach(function (segment, index) {
      segment.userData.worldS = index * ROAD_LENGTH - ROAD_LENGTH;
    });
    traffic.forEach(function (car, index) {
      respawnTraffic(car, index * 48);
    });
    pickups.forEach(function (item, index) {
      respawnPickup(item, index * 125);
    });
    sparks.particles.forEach(function (particle) {
      particle.life = 0;
      particle.y = -100;
    });
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

  function startRace() {
    ensureAudio();
    resetRace();
    setState("playing");
    showToast("انطلق!", false, 900);
    lastFrameTime = performance.now();
    requestFrame();
  }

  function pauseRace() {
    if (state !== "playing") return;
    setState("paused");
    setEngineVolume(0);
    renderScene();
  }

  function resumeRace() {
    if (state !== "paused") return;
    setState("playing");
    lastFrameTime = performance.now();
    requestFrame();
  }

  function togglePause() {
    if (state === "playing") pauseRace();
    else if (state === "paused") resumeRace();
  }

  function finishRace() {
    if (state !== "playing") return;
    score = Math.round(score);
    if (score > bestScore) {
      bestScore = score;
      writeSetting("best", bestScore);
    }
    finalScoreValue.textContent = formatNumber(score);
    finalDistanceValue.textContent = formatNumber(Math.round(distance)) + " م";
    nearMissValue.textContent = String(nearMisses);
    bestComboValue.textContent = "×" + topCombo;
    setState("result");
    setEngineVolume(0);
    updateHud();
    playBeep(720, 0.2, "sine", 0.055);
    window.setTimeout(function () { playBeep(940, 0.24, "sine", 0.045); }, 150);
    renderScene();
  }

  function requestFrame() {
    if (!frameHandle && state === "playing" && !document.hidden) {
      frameHandle = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    frameHandle = 0;
    if (state !== "playing" || document.hidden) return;
    var dt = Math.min(0.042, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    var controls = pollGamepad(false);
    updateGame(dt, controls);
    updateCamera(dt);
    updateAudio();
    renderScene();
    if (state === "playing") requestFrame();
  }

  function updateGame(dt, pad) {
    var digitalSteer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var steer = Math.abs(pad.steer) > 0.03 ? pad.steer : digitalSteer;
    var boosting = (input.boost || pad.boost) && nitro > 0.7;
    var offRoad = Math.abs(playerX) > 5.35;
    var raceProgress = 1 - gameTime / GAME_SECONDS;
    var cruiseTarget = 42 + raceProgress * 5.5;
    var targetSpeed = offRoad ? 28 : boosting ? 63 + raceProgress * 3 : cruiseTarget;
    var speedResponse = boosting ? 1.75 : speed > targetSpeed ? 1.85 : 0.82;
    speed += (targetSpeed - speed) * Math.min(1, dt * speedResponse);

    if (boosting) nitro = Math.max(0, nitro - dt * 25);
    else nitro = Math.min(100, nitro + dt * 7.5);
    shield = Math.max(0, shield - dt);
    collisionCooldown = Math.max(0, collisionCooldown - dt);
    cameraShake = Math.max(0, cameraShake - dt * 2.6);

    steerVelocity += (steer * (7.1 + speed * 0.055) - steerVelocity) * Math.min(1, dt * 8.2);
    if (Math.abs(steer) < 0.03) steerVelocity *= Math.max(0, 1 - dt * 2.2);
    playerX = THREE.MathUtils.clamp(playerX + steerVelocity * dt, -6.2, 6.2);
    player.position.x += (playerX - player.position.x) * Math.min(1, dt * 10);
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steer * 0.13, Math.min(1, dt * 8));
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, -steer * 0.085, Math.min(1, dt * 7));
    player.userData.wheels.forEach(function (wheel) { wheel.rotation.x -= speed * dt * 1.05; });

    distance += speed * dt;
    score += speed * dt * (boosting ? 0.7 : 0.48) * combo;
    if (distance >= nextCheckpoint) reachCheckpoint();
    gameTime = Math.max(0, gameTime - dt);
    if (gameTime <= 0) {
      finishRace();
      return;
    }

    updateRoad();
    updateTraffic(dt);
    updatePickups(dt);
    updateEffects(dt, boosting, offRoad);

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 1;
        comboBadge.classList.remove("is-visible");
      }
    }
    updateHud();
  }

  function updateRoad() {
    road.forEach(function (segment) {
      while (segment.userData.worldS < distance - ROAD_LENGTH * 1.4) {
        segment.userData.worldS += ROAD_LENGTH * ROAD_SEGMENTS;
      }
      var worldS = segment.userData.worldS;
      var relative = worldS - distance;
      segment.position.set(roadCenterAt(worldS), 0, PLAYER_Z - relative);
      segment.rotation.y = roadYawAt(worldS);
    });
    skyline.position.x = roadCenterAt(distance + 250) * 0.35;
  }

  function updateTraffic(dt) {
    traffic.forEach(function (car, index) {
      if (quality !== "high" && index >= 6) {
        car.visible = false;
        return;
      }
      car.userData.worldS += car.userData.cruise * dt;
      var relative = car.userData.worldS - distance;
      if (relative < -16) {
        if (!car.userData.checkedPass && !car.userData.collided) checkNearMiss(car);
        respawnTraffic(car, index * 11);
        relative = car.userData.worldS - distance;
      }
      var laneMotion = Math.sin(distance * 0.008 + car.userData.phase) * 0.16;
      car.position.x = roadCenterAt(car.userData.worldS) + car.userData.lane + laneMotion;
      car.position.z = PLAYER_Z - relative;
      car.position.y = 0.02;
      car.rotation.y = roadYawAt(car.userData.worldS);
      car.userData.wheels.forEach(function (wheel) { wheel.rotation.x -= car.userData.cruise * dt; });
      car.visible = relative < 720;

      if (
        collisionCooldown <= 0 &&
        Math.abs(relative) < 2.75 &&
        Math.abs(car.position.x - player.position.x) < 1.42
      ) {
        car.userData.collided = true;
        collide(car);
      }
    });
  }

  function checkNearMiss(car) {
    car.userData.checkedPass = true;
    var gap = Math.abs(car.position.x - player.position.x);
    if (gap >= 1.42 && gap < 2.85) {
      nearMisses += 1;
      combo = Math.min(6, combo + 1);
      topCombo = Math.max(topCombo, combo);
      comboTimer = 4.2;
      score += 140 * combo;
      comboValue.textContent = "×" + combo;
      comboBadge.classList.add("is-visible");
      showToast("تفادي قريب +" + (140 * combo), false, 900);
      playBeep(520 + combo * 65, 0.08, "triangle", 0.035);
    }
  }

  function reachCheckpoint() {
    checkpointCount += 1;
    var bonus = 350 + checkpointCount * 100;
    score += bonus;
    nitro = Math.min(100, nitro + 20);
    nextCheckpoint += 500;
    showToast("بوابة سرعة " + checkpointCount + "  +" + bonus, false, 1500);
    burstSparks(player.position.x, 1.25, PLAYER_Z - 1.2, colors.mint, quality === "high" ? 34 : 22, 4.6);
    playBeep(690, 0.12, "triangle", 0.045);
    window.setTimeout(function () { playBeep(890, 0.14, "triangle", 0.04); }, 90);
  }

  function collide(car) {
    var shielded = shield > 0;
    collisionCooldown = 1.05;
    cameraShake = 1;
    combo = 1;
    comboTimer = 0;
    comboBadge.classList.remove("is-visible");
    if (shielded) {
      shield = 0;
      speed *= 0.8;
      showToast("الدرع امتص الاصطدام", false, 1300);
      playBeep(360, 0.18, "sine", 0.05);
    } else {
      speed *= 0.4;
      score = Math.max(0, score - 120);
      showToast("اصطدام — عد إلى المسار", true, 1400);
      playBeep(105, 0.28, "sawtooth", 0.065);
    }
    if (canvas.animate) {
      canvas.animate([
        { filter: "brightness(1) saturate(1)" },
        { filter: "brightness(1.7) saturate(.25)" },
        { filter: "brightness(1) saturate(1)" }
      ], { duration: 280 });
    }
    burstSparks((car.position.x + player.position.x) * 0.5, 0.72, PLAYER_Z - 0.4, shielded ? colors.violet : colors.orange, quality === "high" ? 42 : 26, 5.8);
    car.position.x += car.position.x >= player.position.x ? 0.7 : -0.7;
  }

  function updatePickups(dt) {
    pickups.forEach(function (item, index) {
      var relative = item.userData.worldS - distance;
      if (relative < -12) {
        respawnPickup(item, index * 31);
        relative = item.userData.worldS - distance;
      }
      item.position.x = roadCenterAt(item.userData.worldS) + item.userData.lane;
      item.position.z = PLAYER_Z - relative;
      item.position.y = 0.06 + Math.sin((distance + index * 20) * 0.035) * 0.08;
      item.rotation.y += dt * 1.7;
      item.userData.ring.rotation.z += dt * 1.25;
      var pulse = 0.94 + Math.sin(distance * 0.035 + index) * 0.08;
      item.scale.setScalar(pulse);
      item.visible = relative < 650;

      if (Math.abs(relative) < 2.3 && Math.abs(item.position.x - player.position.x) < 1.35) {
        collectPickup(item);
        respawnPickup(item, 220 + index * 25);
      }
    });
  }

  function collectPickup(item) {
    burstSparks(item.position.x, item.position.y + 0.9, item.position.z, item.userData.type === "shield" ? colors.violet : colors.cyan, quality === "high" ? 30 : 18, 4.2);
    if (item.userData.type === "shield") {
      shield = 12;
      score += 120;
      showToast("درع حماية — 12 ثانية", false, 1200);
      playBeep(780, 0.2, "sine", 0.04);
    } else {
      nitro = Math.min(100, nitro + 38);
      score += 80;
      showToast("شحنة نيترو +38", false, 1000);
      playBeep(640, 0.12, "triangle", 0.04);
    }
  }

  function updateEffects(dt, boosting, offRoad) {
    speedLines.material.opacity += ((boosting ? 0.78 : 0) - speedLines.material.opacity) * Math.min(1, dt * 9);
    speedLines.position.z += speed * dt * 1.8;
    if (speedLines.position.z > 80) speedLines.position.z = 0;
    if (player.userData.underglow) {
      player.userData.underglow.material.opacity = boosting ? 0.92 : shield > 0 ? 0.82 : 0.48;
      player.userData.underglow.material.color.setHex(shield > 0 ? colors.violet : colors.cyan);
    }
    speedLines.material.color.setHex(shield > 0 ? colors.violet : colors.cyanSoft);
    updateSparks(dt);
    if (offRoad && Math.random() < dt * 3) showToast("ارجع إلى الطريق", true, 650);
  }

  function updateCamera(dt) {
    var curveAhead = roadCenterAt(distance + 34);
    var desired = new THREE.Vector3();
    var lookAt = new THREE.Vector3();
    if (cameraMode === 0) {
      player.visible = true;
      camera.fov += (62 - camera.fov) * Math.min(1, dt * 5);
      desired.set(player.position.x * 0.32, 4.15, 12.4);
      lookAt.set(player.position.x * 0.45 + curveAhead * 0.55, 0.82, -17);
    } else if (cameraMode === 1) {
      player.visible = false;
      camera.fov += (72 - camera.fov) * Math.min(1, dt * 5);
      desired.set(player.position.x, 1.58, 3.45);
      lookAt.set(player.position.x + curveAhead * 0.9, 0.92, -35);
    } else {
      player.visible = false;
      camera.fov += (79 - camera.fov) * Math.min(1, dt * 5);
      desired.set(player.position.x, 1.17, 4.72);
      lookAt.set(player.position.x + curveAhead, 0.78, -47);
    }
    if (cameraShake > 0) {
      desired.x += (Math.random() - 0.5) * cameraShake * 0.5;
      desired.y += (Math.random() - 0.5) * cameraShake * 0.28;
    }
    camera.position.lerp(desired, Math.min(1, dt * 5.7));
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
  }

  function updateHud() {
    timeValue.textContent = String(Math.ceil(gameTime));
    scoreValue.textContent = formatNumber(Math.round(score));
    bestValue.textContent = formatNumber(bestScore);
    speedValue.textContent = String(Math.round(speed * 4.15));
    gearValue.textContent = speed < 5 ? "N" : String(Math.min(6, Math.max(1, Math.ceil(speed / 10))));
    nitroFill.style.transform = "scaleX(" + (nitro / 100).toFixed(3) + ")";
    nitroValue.textContent = String(Math.round(nitro));
    shieldFill.style.transform = "scaleX(" + Math.min(1, shield / 12).toFixed(3) + ")";
    shieldValue.textContent = shield > 0 ? String(Math.ceil(shield)) : "—";
    shieldRow.classList.toggle("is-empty", shield <= 0);
  }

  function formatNumber(number) {
    return Math.max(0, number).toLocaleString("en-US");
  }

  function showToast(message, danger, duration) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.toggle("is-danger", Boolean(danger));
    statusToast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () {
      statusToast.classList.remove("is-visible");
    }, duration || 1000);
  }

  function changeCamera() {
    cameraMode = (cameraMode + 1) % 3;
    var labels = ["كاميرا خلفية", "كاميرا غطاء المحرك", "كاميرا السائق"];
    showToast(labels[cameraMode], false, 900);
    updateCamera(0.25);
    renderScene();
  }

  function setQuality(nextQuality, persist) {
    quality = nextQuality === "high" ? "high" : "light";
    if (persist) writeSetting("quality", quality);
    qualityButton.textContent = quality === "high" ? "عالي" : "خفيف";
    qualityButton.title = quality === "high" ? "جودة عالية — اضغط للوضع الخفيف" : "وضع خفيف — اضغط للجودة العالية";
    renderer.setPixelRatio(quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 0.72));
    scene.fog.density = quality === "high" ? 0.0076 : 0.0095;
    renderer.toneMappingExposure = quality === "high" ? 1.38 : 1.32;
    if (sparks && sparks.points) sparks.points.material.size = quality === "high" ? 0.2 : 0.16;
    scene.traverse(function (object) {
      if (object.userData && object.userData.highOnly) object.visible = quality === "high";
    });
    resize();
    renderScene();
  }

  function toggleQuality() {
    setQuality(quality === "high" ? "light" : "high", true);
    showToast(quality === "high" ? "جودة عرض عالية" : "وضع خفيف للتلفاز", false, 1100);
  }

  function updateSoundButton() {
    soundButton.textContent = soundEnabled ? "🔊" : "🔇";
    soundButton.title = soundEnabled ? "إيقاف الصوت (M)" : "تشغيل الصوت (M)";
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    writeSetting("sound", soundEnabled ? "on" : "off");
    if (soundEnabled) ensureAudio();
    else setEngineVolume(0);
    updateSoundButton();
    showToast(soundEnabled ? "تم تشغيل الصوت" : "تم إيقاف الصوت", false, 800);
  }

  function ensureAudio() {
    if (!soundEnabled) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio.context) {
      audio.context = new AudioContext();
      audio.gain = audio.context.createGain();
      audio.filter = audio.context.createBiquadFilter();
      audio.filter.type = "lowpass";
      audio.filter.frequency.value = 760;
      audio.gain.gain.value = 0;
      audio.oscillator = audio.context.createOscillator();
      audio.oscillator.type = "sawtooth";
      audio.oscillator.frequency.value = 64;
      audio.oscillator2 = audio.context.createOscillator();
      audio.oscillator2.type = "square";
      audio.oscillator2.frequency.value = 32;
      var secondGain = audio.context.createGain();
      secondGain.gain.value = 0.18;
      audio.oscillator.connect(audio.filter);
      audio.oscillator2.connect(secondGain);
      secondGain.connect(audio.filter);
      audio.filter.connect(audio.gain);
      audio.gain.connect(audio.context.destination);
      audio.oscillator.start();
      audio.oscillator2.start();
    }
    if (audio.context.state === "suspended") audio.context.resume();
  }

  function updateAudio() {
    if (!audio.context || !audio.gain) return;
    var now = audio.context.currentTime;
    var active = soundEnabled && state === "playing";
    var base = 46 + speed * 1.7;
    audio.oscillator.frequency.setTargetAtTime(base, now, 0.045);
    audio.oscillator2.frequency.setTargetAtTime(base * 0.51, now, 0.05);
    audio.filter.frequency.setTargetAtTime(520 + speed * 12, now, 0.08);
    audio.gain.gain.setTargetAtTime(active ? 0.022 : 0, now, 0.08);
  }

  function setEngineVolume(value) {
    if (!audio.context || !audio.gain) return;
    audio.gain.gain.setTargetAtTime(value, audio.context.currentTime, 0.06);
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

  function getGamepad() {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    for (var index = 0; index < pads.length; index += 1) {
      if (pads[index]) return pads[index];
    }
    return null;
  }

  function pollGamepad(idle) {
    var gamepad = getGamepad();
    if (!gamepad) return { steer: 0, boost: false };
    var axis = gamepad.axes.length ? gamepad.axes[0] || 0 : 0;
    var leftDpad = gamepad.buttons[14] && gamepad.buttons[14].pressed;
    var rightDpad = gamepad.buttons[15] && gamepad.buttons[15].pressed;
    if (leftDpad) axis = -1;
    if (rightDpad) axis = 1;
    if (Math.abs(axis) < 0.16) axis = 0;

    var pressed = gamepad.buttons.map(function (button) { return button.pressed; });
    function justPressed(index) {
      return Boolean(pressed[index] && !previousPadButtons[index]);
    }

    if (justPressed(3)) changeCamera();
    if (justPressed(9)) {
      if (state === "menu" || state === "result") startRace();
      else togglePause();
    }
    if (justPressed(0) && (state === "menu" || state === "result")) startRace();
    if (justPressed(1) && (state === "paused" || state === "result")) exitGame();
    previousPadButtons = pressed;

    if (idle) return { steer: 0, boost: false };
    return {
      steer: axis,
      boost: Boolean(
        (gamepad.buttons[0] && gamepad.buttons[0].pressed) ||
        (gamepad.buttons[2] && gamepad.buttons[2].pressed) ||
        (gamepad.buttons[7] && gamepad.buttons[7].pressed)
      )
    };
  }

  function updateControllerState(gamepad) {
    var label = controllerState.querySelector("span");
    if (gamepad) {
      controllerState.classList.add("is-connected");
      label.textContent = "قبضة متصلة: " + shortenControllerName(gamepad.id || "Gamepad");
    } else {
      controllerState.classList.remove("is-connected");
      label.textContent = "يمكنك توصيل قبضة اللعب الآن";
    }
  }

  function shortenControllerName(name) {
    return name.length > 38 ? name.slice(0, 35) + "…" : name;
  }

  function exitGame() {
    if (state === "playing") pauseRace();
    setEngineVolume(0);
    var detail = { gameId: GAME_ID, score: Math.round(score), bestScore: bestScore, raceSerial: raceSerial };
    try {
      window.dispatchEvent(new CustomEvent("dtdc-game-exit", { detail: detail }));
    } catch (error) {
      /* Older WebViews can still use the bridge/message routes below. */
    }
    try {
      if (window.DTDCGameBridge && typeof window.DTDCGameBridge.exitGame === "function") {
        window.DTDCGameBridge.exitGame(JSON.stringify(detail));
        return;
      }
    } catch (error) {
      /* Continue to the browser fallback. */
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "DTDC_GAME_EXIT", payload: detail }, "*");
      return;
    }
    try { window.close(); } catch (error) { /* Browser may block closing a user-opened tab. */ }
    window.setTimeout(function () {
      if (!window.closed) showToast("يمكنك إغلاق هذا التبويب والعودة للشاشة", false, 2200);
    }, 250);
  }

  function resize() {
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderScene() {
    renderer.render(scene, camera);
  }

  function bindHold(button, key) {
    function set(value, event) {
      if (event) event.preventDefault();
      input[key] = value;
      button.classList.toggle("is-active", value);
      if (value && button.setPointerCapture && event.pointerId !== undefined) {
        try { button.setPointerCapture(event.pointerId); } catch (error) { /* Ignore unsupported capture. */ }
      }
    }
    button.addEventListener("pointerdown", function (event) { set(true, event); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (eventName) {
      button.addEventListener(eventName, function (event) { set(false, event); });
    });
  }

  bindHold(document.getElementById("leftButton"), "left");
  bindHold(document.getElementById("rightButton"), "right");
  bindHold(document.getElementById("boostButton"), "boost");

  startButton.addEventListener("click", startRace);
  resumeButton.addEventListener("click", resumeRace);
  restartButton.addEventListener("click", startRace);
  playAgainButton.addEventListener("click", startRace);
  pauseButton.addEventListener("click", togglePause);
  cameraButton.addEventListener("click", changeCamera);
  qualityButton.addEventListener("click", toggleQuality);
  soundButton.addEventListener("click", toggleSound);
  exitButton.addEventListener("click", exitGame);
  resultExitButton.addEventListener("click", exitGame);

  window.addEventListener("keydown", function (event) {
    var code = event.code;
    if (["ArrowLeft", "ArrowRight", "Space"].indexOf(code) !== -1) event.preventDefault();
    if (code === "ArrowLeft" || code === "KeyA") input.left = true;
    if (code === "ArrowRight" || code === "KeyD") input.right = true;
    if (code === "Space" || code === "KeyX") input.boost = true;
    if ((code === "Enter" || code === "NumpadEnter") && (state === "menu" || state === "result")) startRace();
    if (code === "KeyC" && !event.repeat) changeCamera();
    if (code === "Escape" && !event.repeat) togglePause();
    if (code === "KeyM" && !event.repeat) toggleSound();
  }, { passive: false });

  window.addEventListener("keyup", function (event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
    if (event.code === "Space" || event.code === "KeyX") input.boost = false;
  });

  window.addEventListener("gamepadconnected", function (event) {
    updateControllerState(event.gamepad);
    showToast("تم توصيل قبضة اللعب", false, 1100);
  });
  window.addEventListener("gamepaddisconnected", function () {
    updateControllerState(getGamepad());
    showToast("تم فصل قبضة اللعب", true, 1000);
  });
  window.addEventListener("resize", function () { resize(); renderScene(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "playing") pauseRace();
    else if (!document.hidden) renderScene();
  });
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    fatalPanel.hidden = false;
  });

  window.setInterval(function () {
    var gamepad = getGamepad();
    updateControllerState(gamepad);
    if (state !== "playing") pollGamepad(true);
  }, 120);

  window.NeonRushEvolution = {
    start: startRace,
    pause: pauseRace,
    resume: resumeRace,
    exit: exitGame,
    setQuality: function (value) { setQuality(value, true); },
    getState: function () {
      return {
        gameId: GAME_ID,
        state: state,
        score: Math.round(score),
        bestScore: bestScore,
        distance: Math.round(distance),
        quality: quality,
        camera: cameraMode
      };
    }
  };

  bestValue.textContent = formatNumber(bestScore);
  updateSoundButton();
  setQuality(quality, false);
  resize();
  updateRoad();
  updateCamera(0.3);
  updateHud();
  updateControllerState(getGamepad());
  renderScene();
})();
