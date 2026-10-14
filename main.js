/**
 * ============================================================================
 * ARGON // Interaktive 3D-Partikel-Galaxie (Vanilla WebGL)
 * ============================================================================
 * Architektur & Features:
 * - Reines WebGL (WebGL2 mit WebGL1-Fallback), 0 externe Abhängigkeiten
 * - Bis zu 100.000 Partikel (Standard: 45.000) mit 60–120 FPS GPU-Differentialrotation
 * - Exakte Zentrierung des Galaxie-Ursprungs (0, 0, 0) in der Bildschirmmitte (50% / 50%)
 * - Intelligente Viewport-Erkennung (unterstützt sowohl reguläre Desktop-Browser als
 *   auch eingebettete IDE-Webviews mit virtuellem Layout-Viewport)
 * - Physikalisch inspirierte Spiralgalaxie-Morphologie:
 *     1. Dichtes galaktisches Zentrum (Bulge) exakt um (0, 0, 0)
 *     2. Logarithmische Spiralarme mit einstellbarer Armanzahl (2–8)
 *     3. Leuchtende H-II-Nebelknoten entlang der Armachsen
 *     4. Sphärischer Sternen-Halo & Tiefenraum-Hintergrundsterne
 * - 5 kuratierte Farbschemata mit Echtzeit-Shader-Interpolation
 * - Orbit-Kamera (Maus-Drag für Azimut/Elevation, Mausrad für Zoom)
 * - Tastatur- & Button-Steuerung:
 *     - Leertaste (Space): Pause / Weiter
 *     - Taste "R": Zufällige Galaxie
 *     - Taste "0" / Button "↺ Neu starten": Animation & Galaxie von vorne starten
 *     - Taste "H" oder "M" / Button "Menü weg": Menü oben rechts aus-/einblenden
 * ============================================================================
 */

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. Farbschemata-Definitionen (5 kosmische Paletten)
  // --------------------------------------------------------------------------
  const COLOR_SCHEMES = {
    1: {
      name: "Argon Prime",
      core: [1.0, 0.93, 0.82],      // Heißes Weiß-Gold im Bulge
      inner: [0.62, 0.38, 1.0],     // Elektrisches Argon-Violett
      outer: [0.0, 0.88, 1.0],      // Tiefes Cyan an den äußeren Spiralarmen
      dust: [0.98, 0.24, 0.72],     // Magenta H-II Nebelknoten
      hex: ["#ffedd1", "#9e61ff", "#00e0ff", "#fa3db8"]
    },
    2: {
      name: "Andromeda Deep",
      core: [1.0, 0.86, 0.58],      // Warmer Bernsteinkern
      inner: [0.42, 0.68, 1.0],     // Klassisches Saphirblau
      outer: [0.14, 0.36, 0.88],    // Kobalt-Außenarme
      dust: [1.0, 0.42, 0.58],      // Rosé-Sternentstehungsgebiete
      hex: ["#ffdb94", "#6badff", "#245ce0", "#ff6b94"]
    },
    3: {
      name: "Supernova Inferno",
      core: [1.0, 0.98, 0.86],      // Blendend weiß-gelber Kern
      inner: [1.0, 0.52, 0.12],     // Glühendes Solar-Orange
      outer: [0.78, 0.1, 0.24],     // Karminrot & dunkles Magma
      dust: [1.0, 0.8, 0.22],       // Goldene Eruptionsknoten
      hex: ["#fffad9", "#ff851f", "#c71a3d", "#ffcc38"]
    },
    4: {
      name: "Smaragd-Kosmos",
      core: [0.88, 1.0, 0.95],      // Heller Mint-Quasar-Kern
      inner: [0.0, 0.92, 0.64],     // Biolumineszentes Smaragdgrün
      outer: [0.04, 0.48, 0.72],    // Tiefsee-Petrolblau
      dust: [0.48, 1.0, 0.35],      // Leuchtende Limetten-Nebel
      hex: ["#e0fff2", "#00eba3", "#0a7ab8", "#7aff59"]
    },
    5: {
      name: "Cyberpunk Horizon",
      core: [1.0, 0.94, 1.0],       // Chrom-Weißer Kern
      inner: [1.0, 0.12, 0.66],     // Neon-Laser-Pink
      outer: [0.05, 0.95, 0.98],    // Reines Cyber-Cyan
      dust: [0.58, 0.2, 1.0],       // Ultravioletter Plasma-Staub
      hex: ["#fff0ff", "#ff1fa8", "#0df2fa", "#9433ff"]
    }
  };

  const MORPHOLOGY_CLASSES = [
    "Spiral-Typ Sa",
    "Spiral-Typ Sb",
    "Spiral-Typ Sc",
    "Balkenspirale SBb",
    "Grand-Design-Spirale",
    "Hyper-Luminanz-Quasar"
  ];

  // Standard-Ausgangswerte für "Von vorne starten" (Reset)
  const INITIAL_DEFAULTS = {
    particleCount: 45000,
    arms: 4,
    rotationSpeed: 1.0,
    colorScheme: 1,
    seed: 0xa4f29c,
    catalogNumber: 4096,
    morphologyLabel: "Spiral-Typ Sb",
    armTwist: 2.85,
    armScatter: 0.42,
    coreRatio: 0.20,
    diskThickness: 0.45,
    warpAmplitude: 0.18,
    yaw: 0.49,
    pitch: 0.59,
    distance: 15.5
  };

  // --------------------------------------------------------------------------
  // 2. Anwendungszustand (State)
  // --------------------------------------------------------------------------
  const state = {
    particleCount: INITIAL_DEFAULTS.particleCount,
    arms: INITIAL_DEFAULTS.arms,
    rotationSpeed: INITIAL_DEFAULTS.rotationSpeed,
    colorScheme: INITIAL_DEFAULTS.colorScheme,

    seed: INITIAL_DEFAULTS.seed,
    catalogNumber: INITIAL_DEFAULTS.catalogNumber,
    morphologyLabel: INITIAL_DEFAULTS.morphologyLabel,
    armTwist: INITIAL_DEFAULTS.armTwist,
    armScatter: INITIAL_DEFAULTS.armScatter,
    coreRatio: INITIAL_DEFAULTS.coreRatio,
    diskThickness: INITIAL_DEFAULTS.diskThickness,
    warpAmplitude: INITIAL_DEFAULTS.warpAmplitude,

    isPaused: false,
    uiHidden: false,
    simTime: 0.0,
    lastTimestamp: performance.now(),

    yaw: INITIAL_DEFAULTS.yaw,
    pitch: INITIAL_DEFAULTS.pitch,
    targetYaw: INITIAL_DEFAULTS.yaw,
    targetPitch: INITIAL_DEFAULTS.pitch,
    distance: INITIAL_DEFAULTS.distance,
    targetDistance: INITIAL_DEFAULTS.distance,
    baseDistance: INITIAL_DEFAULTS.distance,

    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,

    fps: 60,
    frameTimeMs: 16.6,
    frameDeltas: [],
    fpsLastUpdate: performance.now()
  };

  // --------------------------------------------------------------------------
  // 3. DOM-Referenzen
  // --------------------------------------------------------------------------
  const canvas = document.getElementById("galaxy-canvas");
  const controlPanelEl = document.getElementById("control-panel");
  const hudPanelEl = document.getElementById("hud-panel");

  const btnShowMenu = document.getElementById("btn-show-menu");
  const btnHideMenu = document.getElementById("btn-hide-menu");
  const btnToggleUi = document.getElementById("btn-toggle-ui");
  const btnReset = document.getElementById("btn-reset");

  const sliderParticles = document.getElementById("slider-particles");
  const sliderArms = document.getElementById("slider-arms");
  const sliderSpeed = document.getElementById("slider-speed");
  const sliderColor = document.getElementById("slider-color");

  const valParticles = document.getElementById("val-particles");
  const valArms = document.getElementById("val-arms");
  const valSpeed = document.getElementById("val-speed");
  const valColor = document.getElementById("val-color");

  const swatchCore = document.getElementById("swatch-core");
  const swatchInner = document.getElementById("swatch-inner");
  const swatchOuter = document.getElementById("swatch-outer");
  const swatchDust = document.getElementById("swatch-dust");

  const catalogNameEl = document.getElementById("catalog-name");
  const seedDisplayEl = document.getElementById("seed-display");
  const statePillEl = document.getElementById("state-pill");
  const toastEl = document.getElementById("CenterBanner");
  const toastIconEl = document.getElementById("toast-icon");
  const toastTextEl = document.getElementById("toast-text");

  const fpsDotEl = document.getElementById("fps-dot");
  const fpsValueEl = document.getElementById("fps-value");
  const frameTimeEl = document.getElementById("frame-time");
  const hudStatusEl = document.getElementById("hud-status");
  const hudParticlesEl = document.getElementById("hud-particles");
  const hudOrbitEl = document.getElementById("hud-orbit");
  const hudZoomEl = document.getElementById("hud-zoom");

  // --------------------------------------------------------------------------
  // 4. WebGL-Initialisierung & Shader-Pipeline
  // --------------------------------------------------------------------------
  const gl =
    canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" }) ||
    canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" });

  if (!gl) {
    alert("WebGL wird von diesem Browser leider nicht unterstützt.");
    return;
  }

  const vertexShaderSource = `
    attribute vec3 aPolar;      // x: Radius, y: Basiswinkel (rad), z: Vertikale Höhe (y-Achse)
    attribute vec3 aScatter;    // Statischer 3D-Streuungsoffset (x, y, z)
    attribute vec4 aMeta;       // x: Punktgröße, y: Farb-Mix (0..1), z: Partikeltyp (0=Stern, 1=Nebel, 2=Halo), w: Funkel-Phase

    uniform mat4 uViewProj;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uViewportHeight;
    uniform float uWarpAmp;

    uniform vec3 uColorCore;
    uniform vec3 uColorInner;
    uniform vec3 uColorOuter;
    uniform vec3 uColorDust;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vType;

    void main() {
      float radius = aPolar.x;
      float baseAngle = aPolar.y;
      float height = aPolar.z;
      float pSize = aMeta.x;
      float colorMix = aMeta.y;
      float pType = aMeta.z;
      float phase = aMeta.w;

      // Differentielle Winkelgeschwindigkeit: Zentrum dreht schneller als der Außenrand
      float angularVel = (pType > 1.5)
        ? 0.18
        : (0.42 + 1.15 / (1.0 + pow(radius, 0.72)));

      float currentAngle = baseAngle + uTime * angularVel;

      float cosA = cos(currentAngle);
      float sinA = sin(currentAngle);

      // Rotierender Streuungsvektor in der Galaxie-Ebene
      float sx = aScatter.x * cosA - aScatter.z * sinA;
      float sz = aScatter.x * sinA + aScatter.z * cosA;

      // Organischer S-förmiger Disk-Warp an den äußeren Rändern (im Zentrum exakt 0)
      float radialNorm = clamp(radius / 11.5, 0.0, 1.0);
      float diskWarp = sin(currentAngle * 2.0 + radius * 0.35) * uWarpAmp * pow(radialNorm, 2.2);

      // Weltposition symmetrisch um den Galaxie-Ursprung (0.0, 0.0, 0.0)
      vec3 worldPos = vec3(
        cosA * radius + sx,
        height + aScatter.y + diskWarp,
        sinA * radius + sz
      );

      vec4 clipPos = uViewProj * vec4(worldPos, 1.0);
      gl_Position = clipPos;

      // Perspektivische Punktgrößen-Skalierung
      float dist = max(clipPos.w, 0.5);
      float twinkle = 0.88 + 0.12 * sin(uTime * 2.4 + phase * 6.28318);
      float perspectiveSize = pSize * twinkle * uPixelRatio * (uViewportHeight / 900.0) * (16.5 / dist);
      gl_PointSize = clamp(perspectiveSize, 1.1, 48.0);

      // Mehrstufige Farbinterpolation: Kern -> Innere Spirale -> Äußere Spirale -> Nebelknoten
      vec3 spiralColor = mix(uColorInner, uColorOuter, smoothstep(0.12, 0.92, radialNorm));
      float coreWeight = exp(-radius * radius * 0.28);
      vec3 baseCol = mix(spiralColor, uColorCore, coreWeight);

      if (pType > 0.5 && pType < 1.5) {
        baseCol = mix(baseCol, uColorDust, 0.68);
      } else if (pType > 1.5) {
        baseCol = mix(uColorOuter, uColorCore, colorMix * 0.75);
      } else {
        baseCol = mix(baseCol, uColorCore, (colorMix - 0.5) * 0.28);
      }

      vColor = baseCol;
      vType = pType;

      float distFade = clamp(42.0 / (dist + 4.0), 0.25, 1.0);
      if (pType > 0.5 && pType < 1.5) {
        vAlpha = 0.24 * distFade;
      } else {
        vAlpha = (0.58 + 0.36 * coreWeight) * distFade;
      }
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vType;

    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float r2 = dot(uv, uv);
      if (r2 > 1.0) {
        discard;
      }

      float r = sqrt(r2);

      float glow;
      vec3 finalColor = vColor;

      if (vType > 0.5 && vType < 1.5) {
        glow = pow(1.0 - r, 2.2);
      } else {
        float core = exp(-r * r * 7.5);
        float halo = pow(1.0 - r, 1.85) * 0.55;
        glow = core + halo;
        finalColor = mix(vColor, vec3(1.0, 0.98, 0.95), core * 0.55);
      }

      gl_FragColor = vec4(finalColor * glow, vAlpha * glow);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader-Kompilierfehler:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program-Linkfehler:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const loc = {
    aPolar: gl.getAttribLocation(program, "aPolar"),
    aScatter: gl.getAttribLocation(program, "aScatter"),
    aMeta: gl.getAttribLocation(program, "aMeta"),
    uViewProj: gl.getUniformLocation(program, "uViewProj"),
    uTime: gl.getUniformLocation(program, "uTime"),
    uPixelRatio: gl.getUniformLocation(program, "uPixelRatio"),
    uViewportHeight: gl.getUniformLocation(program, "uViewportHeight"),
    uWarpAmp: gl.getUniformLocation(program, "uWarpAmp"),
    uColorCore: gl.getUniformLocation(program, "uColorCore"),
    uColorInner: gl.getUniformLocation(program, "uColorInner"),
    uColorOuter: gl.getUniformLocation(program, "uColorOuter"),
    uColorDust: gl.getUniformLocation(program, "uColorDust")
  };

  const particleBuffer = gl.createBuffer();
  const FLOATS_PER_PARTICLE = 10;
  const STRIDE = FLOATS_PER_PARTICLE * 4;

  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.enableVertexAttribArray(loc.aPolar);
  gl.vertexAttribPointer(loc.aPolar, 3, gl.FLOAT, false, STRIDE, 0);

  gl.enableVertexAttribArray(loc.aScatter);
  gl.vertexAttribPointer(loc.aScatter, 3, gl.FLOAT, false, STRIDE, 3 * 4);

  gl.enableVertexAttribArray(loc.aMeta);
  gl.vertexAttribPointer(loc.aMeta, 4, gl.FLOAT, false, STRIDE, 6 * 4);

  // --------------------------------------------------------------------------
  // 5. Deterministischer Zufallsgenerator (Mulberry32) & Gauß-Approximation
  // --------------------------------------------------------------------------
  function createPRNG(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussianRand(rand) {
    return (rand() + rand() + rand() - 1.5) * 0.9;
  }

  // --------------------------------------------------------------------------
  // 6. Prozeduraler 3D-Galaxie-Generator (exakt zentriert um [0, 0, 0])
  // --------------------------------------------------------------------------
  function buildGalaxyGeometry() {
    const count = state.particleCount;
    const arms = state.arms;
    const rand = createPRNG(state.seed);
    const data = new Float32Array(count * FLOATS_PER_PARTICLE);

    const maxRadius = 11.5;
    const coreCutoff = state.coreRatio;
    const haloCutoff = 0.92;

    for (let i = 0; i < count; i++) {
      const idx = i * FLOATS_PER_PARTICLE;
      const roleRoll = rand();

      let radius = 0;
      let baseAngle = 0;
      let height = 0;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let pSize = 2.0;
      let colorMix = rand();
      let pType = 0.0;
      const phase = rand();

      if (roleRoll < coreCutoff) {
        const u = rand();
        radius = Math.pow(u, 1.95) * 2.4;
        baseAngle = rand() * Math.PI * 2.0;
        const radialScale = radius / 2.4;
        const bulgeSpread = (1.0 - radialScale * 0.85) * 0.65 + 0.08;
        height = gaussianRand(rand) * bulgeSpread * radialScale;
        const jitterScale = 0.03 + 0.22 * radialScale;
        sx = gaussianRand(rand) * jitterScale;
        sy = gaussianRand(rand) * jitterScale * 0.7;
        sz = gaussianRand(rand) * jitterScale;
        pSize = 2.2 + Math.pow(rand(), 2.8) * 4.0;
        pType = 0.0;
      } else if (roleRoll < haloCutoff) {
        const armIndex = i % arms;
        const armBaseAngle = (armIndex / arms) * Math.PI * 2.0;

        const radialT = Math.pow(rand(), 0.78);
        radius = 0.45 + radialT * (maxRadius - 0.45);

        const spiralAngle = radius * state.armTwist * 0.42;
        baseAngle = armBaseAngle + spiralAngle;

        const spreadFactor = state.armScatter * (0.26 + 0.092 * radius);
        const angleJitter = gaussianRand(rand) * (0.32 / (1.0 + radius * 0.18));
        baseAngle += angleJitter;

        sx = gaussianRand(rand) * spreadFactor;
        sz = gaussianRand(rand) * spreadFactor;

        const verticalScale = state.diskThickness * Math.exp(-radius / 6.5) + 0.05;
        height = gaussianRand(rand) * verticalScale;
        sy = gaussianRand(rand) * 0.04;

        if (rand() < 0.062) {
          pType = 1.0;
          pSize = 9.5 + rand() * 11.0;
        } else {
          pType = 0.0;
          pSize = 1.4 + Math.pow(rand(), 4.0) * 4.2;
        }
      } else {
        radius = 1.5 + Math.pow(rand(), 0.55) * (maxRadius * 1.45);
        baseAngle = rand() * Math.PI * 2.0;
        height = gaussianRand(rand) * (2.5 + radius * 0.2);
        sx = gaussianRand(rand) * 0.75;
        sy = gaussianRand(rand) * 0.75;
        sz = gaussianRand(rand) * 0.75;
        pSize = 1.2 + Math.pow(rand(), 3.0) * 2.8;
        pType = 2.0;
      }

      data[idx + 0] = radius;
      data[idx + 1] = baseAngle;
      data[idx + 2] = height;
      data[idx + 3] = sx;
      data[idx + 4] = sy;
      data[idx + 5] = sz;
      data[idx + 6] = pSize;
      data[idx + 7] = colorMix;
      data[idx + 8] = pType;
      data[idx + 9] = phase;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  // --------------------------------------------------------------------------
  // 7. 4x4-Matrix-Mathematik (Column-Major für WebGL)
  // --------------------------------------------------------------------------
  const projMatrix = new Float32Array(16);
  const viewMatrix = new Float32Array(16);
  const viewProjMatrix = new Float32Array(16);

  function mat4Perspective(out, fovyRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovyRad * 0.5);
    const nf = 1.0 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1.0;
    out[14] = 2.0 * far * near * nf;
  }

  function mat4LookAt(out, eye, center, up) {
    let zx = eye[0] - center[0];
    let zy = eye[1] - center[1];
    let zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1.0;
    zx /= len;
    zy /= len;
    zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1.0;
    xx /= len;
    xy /= len;
    xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx;
    out[1] = yx;
    out[2] = zx;
    out[3] = 0;
    out[4] = xy;
    out[5] = yy;
    out[6] = zy;
    out[7] = 0;
    out[8] = xz;
    out[9] = yz;
    out[10] = zz;
    out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }

  function mat4Multiply(out, a, b) {
    for (let col = 0; col < 4; col++) {
      const b0 = b[col * 4 + 0];
      const b1 = b[col * 4 + 1];
      const b2 = b[col * 4 + 2];
      const b3 = b[col * 4 + 3];
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b0 +
          a[1 * 4 + row] * b1 +
          a[2 * 4 + row] * b2 +
          a[3 * 4 + row] * b3;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 8. UI-Synchronisation & Formatierung
  // --------------------------------------------------------------------------
  function formatGermanInt(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  let toastTimeout = null;
  function showToast(text, icon = "✦", isPersistentPause = false) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toastIconEl.textContent = icon;
    toastTextEl.textContent = text;

    if (isPersistentPause) {
      toastEl.className = "status-toast paused-banner";
    } else {
      toastEl.className = "status-toast visible";
      toastTimeout = setTimeout(() => {
        if (!state.isPaused) {
          toastEl.className = "status-toast";
        } else {
          toastIconEl.textContent = "⏸";
          toastTextEl.textContent = "SIMULATION PAUSIERT — LEERTASTE ZUM FORTSETZEN";
          toastEl.className = "status-toast paused-banner";
        }
      }, 2200);
    }
  }

  function updateUI() {
    const scheme = COLOR_SCHEMES[state.colorScheme] || COLOR_SCHEMES[1];

    sliderParticles.value = String(state.particleCount);
    sliderArms.value = String(state.arms);
    sliderSpeed.value = String(state.rotationSpeed);
    sliderColor.value = String(state.colorScheme);

    valParticles.textContent = formatGermanInt(state.particleCount);
    valArms.textContent = `${state.arms} Arme`;
    valSpeed.textContent = `${state.rotationSpeed.toFixed(2)}×`;
    valColor.textContent = `${state.colorScheme} · ${scheme.name}`;

    swatchCore.style.backgroundColor = scheme.hex[0];
    swatchCore.style.boxShadow = `0 0 8px ${scheme.hex[0]}`;
    swatchInner.style.backgroundColor = scheme.hex[1];
    swatchInner.style.boxShadow = `0 0 8px ${scheme.hex[1]}`;
    swatchOuter.style.backgroundColor = scheme.hex[2];
    swatchOuter.style.boxShadow = `0 0 8px ${scheme.hex[2]}`;
    swatchDust.style.backgroundColor = scheme.hex[3];
    swatchDust.style.boxShadow = `0 0 8px ${scheme.hex[3]}`;

    const hexSeed = (state.seed >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
    catalogNameEl.textContent = `NGC-${state.catalogNumber} // ${state.morphologyLabel}`;
    seedDisplayEl.textContent = `Seed #${hexSeed}`;

    if (state.isPaused) {
      statePillEl.textContent = "PAUSIERT";
      statePillEl.className = "state-pill state-paused";
      hudStatusEl.textContent = "PAUSIERT";
      hudStatusEl.className = "telemetry-val status-paused-text";
    } else {
      statePillEl.textContent = "LÄUFT";
      statePillEl.className = "state-pill state-running";
      hudStatusEl.textContent = "AKTIV";
      hudStatusEl.className = "telemetry-val status-active-text";
    }

    hudParticlesEl.textContent = formatGermanInt(state.particleCount);
    updateCameraHUD();
  }

  function updateCameraHUD() {
    const azDeg = Math.round((((state.yaw * 180) / Math.PI) % 360 + 360) % 360);
    const elDeg = Math.round((state.pitch * 180) / Math.PI);
    const zoomFactor = state.baseDistance / state.distance;
    hudOrbitEl.textContent = `${azDeg}° / ${elDeg}°`;
    hudZoomEl.textContent = `${zoomFactor.toFixed(2)}×`;
  }

  // --------------------------------------------------------------------------
  // 9. Zufällige Galaxie (Taste "R"), Neustart (Taste "0") & Menü-Toggle ("H"/"M")
  // --------------------------------------------------------------------------
  function randomizeGalaxy() {
    state.seed = ((Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
    const rand = createPRNG(state.seed);

    state.catalogNumber = 1000 + Math.floor(rand() * 8999);
    state.morphologyLabel = MORPHOLOGY_CLASSES[Math.floor(rand() * MORPHOLOGY_CLASSES.length)];

    let nextArms = 2 + Math.floor(rand() * 7);
    if (nextArms === state.arms) {
      nextArms = ((nextArms - 2 + 3) % 7) + 2;
    }
    state.arms = nextArms;

    let nextColor = 1 + Math.floor(rand() * 5);
    if (nextColor === state.colorScheme) {
      nextColor = (nextColor % 5) + 1;
    }
    state.colorScheme = nextColor;

    state.rotationSpeed = Math.round((0.45 + rand() * 2.15) * 20) / 20;
    state.armTwist = 1.8 + rand() * 2.4;
    state.armScatter = 0.26 + rand() * 0.34;
    state.coreRatio = 0.14 + rand() * 0.14;
    state.diskThickness = 0.32 + rand() * 0.32;
    state.warpAmplitude = 0.1 + rand() * 0.25;

    buildGalaxyGeometry();
    updateUI();

    const hexSeed = (state.seed >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
    showToast(
      `NEUE ZUFALLS-GALAXIE: NGC-${state.catalogNumber} (${state.arms} Arme · ${COLOR_SCHEMES[state.colorScheme].name} · #${hexSeed})`,
      "✦",
      false
    );
  }

  /**
   * Setzt die Animation (simTime = 0), die Kamera und die Galaxie-Parameter
   * komplett auf den sauberen Ausgangszustand zurück ("von vorne starten").
   */
  function resetSimulationToStart() {
    state.simTime = 0.0;
    state.isPaused = false;

    state.particleCount = INITIAL_DEFAULTS.particleCount;
    state.arms = INITIAL_DEFAULTS.arms;
    state.rotationSpeed = INITIAL_DEFAULTS.rotationSpeed;
    state.colorScheme = INITIAL_DEFAULTS.colorScheme;
    state.seed = INITIAL_DEFAULTS.seed;
    state.catalogNumber = INITIAL_DEFAULTS.catalogNumber;
    state.morphologyLabel = INITIAL_DEFAULTS.morphologyLabel;
    state.armTwist = INITIAL_DEFAULTS.armTwist;
    state.armScatter = INITIAL_DEFAULTS.armScatter;
    state.coreRatio = INITIAL_DEFAULTS.coreRatio;
    state.diskThickness = INITIAL_DEFAULTS.diskThickness;
    state.warpAmplitude = INITIAL_DEFAULTS.warpAmplitude;

    state.yaw = INITIAL_DEFAULTS.yaw;
    state.pitch = INITIAL_DEFAULTS.pitch;
    state.targetYaw = INITIAL_DEFAULTS.yaw;
    state.targetPitch = INITIAL_DEFAULTS.pitch;
    state.distance = INITIAL_DEFAULTS.distance;
    state.targetDistance = INITIAL_DEFAULTS.distance;

    buildGalaxyGeometry();
    updateUI();
    showToast("ANIMATION & GALAXIE VON VORNE GESTARTET", "↺", false);
  }

  /**
   * Blendet das Steuerungs-Menü oben rechts sanft aus oder wieder ein.
   */
  function toggleMenuVisibility(forceState) {
    state.uiHidden = typeof forceState === "boolean" ? forceState : !state.uiHidden;
    document.body.classList.toggle("ui-hidden", state.uiHidden);
    if (state.uiHidden) {
      showToast("MENÜ AUSGEBLENDET — TASTE [H] ODER BUTTON OBEN RECHTS ZUM EINBLENDEN", "☰", false);
    } else {
      showToast("MENÜ EINGEBLENDET", "✦", false);
    }
  }

  // --------------------------------------------------------------------------
  // 10. Event-Listener (Slider, Buttons, Maus-Orbit, Mausrad-Zoom, Tastatur)
  // --------------------------------------------------------------------------
  function onParticlesInput() {
    const val = parseInt(sliderParticles.value, 10);
    if (!Number.isNaN(val) && val !== state.particleCount) {
      state.particleCount = val;
      buildGalaxyGeometry();
      updateUI();
    }
  }

  function onArmsInput() {
    const val = parseInt(sliderArms.value, 10);
    if (!Number.isNaN(val) && val !== state.arms) {
      state.arms = val;
      buildGalaxyGeometry();
      updateUI();
    }
  }

  function onSpeedInput() {
    const val = parseFloat(sliderSpeed.value);
    if (!Number.isNaN(val)) {
      state.rotationSpeed = val;
      updateUI();
    }
  }

  function onColorInput() {
    const val = parseInt(sliderColor.value, 10);
    if (!Number.isNaN(val)) {
      state.colorScheme = Math.min(5, Math.max(1, val));
      updateUI();
    }
  }

  function bindSliderEvents(sliderEl, handler) {
    sliderEl.addEventListener("input", handler);
    sliderEl.addEventListener("change", handler);
    sliderEl.addEventListener("click", (e) => {
      if (typeof e.clientX === "number" && e.clientX > 0) {
        const rect = sliderEl.getBoundingClientRect();
        if (rect.width > 0) {
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const min = parseFloat(sliderEl.min);
          const max = parseFloat(sliderEl.max);
          const step = parseFloat(sliderEl.step) || 1;
          const raw = min + ratio * (max - min);
          const stepped = Math.round((raw - min) / step) * step + min;
          const clamped = Math.max(min, Math.min(max, Number(stepped.toFixed(4))));
          sliderEl.value = String(clamped);
          handler();
        }
      }
    });
  }

  bindSliderEvents(sliderParticles, onParticlesInput);
  bindSliderEvents(sliderArms, onArmsInput);
  bindSliderEvents(sliderSpeed, onSpeedInput);
  bindSliderEvents(sliderColor, onColorInput);

  // Buttons für Menü ein-/ausblenden & Neustart
  if (btnHideMenu) {
    btnHideMenu.addEventListener("click", () => toggleMenuVisibility(true));
  }
  if (btnToggleUi) {
    btnToggleUi.addEventListener("click", () => toggleMenuVisibility(true));
  }
  if (btnShowMenu) {
    btnShowMenu.addEventListener("click", () => toggleMenuVisibility(false));
  }
  if (btnReset) {
    btnReset.addEventListener("click", () => resetSimulationToStart());
  }

  // --- Maus-Steuerung: Drag zum Drehen der 3D-Kamera ---
  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.lastMouseX;
    const dy = e.clientY - state.lastMouseY;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;

    const sensitivity = 0.0068;
    state.targetYaw += dx * sensitivity;
    state.targetPitch = Math.max(-1.42, Math.min(1.42, state.targetPitch + dy * sensitivity));

    state.yaw += (state.targetYaw - state.yaw) * 0.65;
    state.pitch += (state.targetPitch - state.pitch) * 0.65;
    updateCameraHUD();
  });

  window.addEventListener("mouseup", () => {
    state.isDragging = false;
  });

  // --- Mausrad-Steuerung: Rein- und Rauszoomen ---
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.014;
      state.targetDistance = Math.max(4.5, Math.min(36.0, state.targetDistance + zoomDelta));
      state.distance += (state.targetDistance - state.distance) * 0.55;
      updateCameraHUD();
    },
    { passive: false }
  );

  // --- Tastatur-Steuerung ---
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      state.isPaused = !state.isPaused;
      updateUI();
      if (state.isPaused) {
        showToast("SIMULATION PAUSIERT — LEERTASTE ZUM FORTSETZEN", "⏸", true);
      } else {
        toastEl.className = "status-toast";
        showToast("SIMULATION FORTGESETZT", "▶", false);
      }
    } else if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
      e.preventDefault();
      randomizeGalaxy();
    } else if (e.code === "KeyH" || e.key === "h" || e.key === "H" || e.code === "KeyM" || e.key === "m" || e.key === "M") {
      e.preventDefault();
      toggleMenuVisibility();
    } else if (e.code === "Digit0" || e.code === "Numpad0" || e.key === "0" || e.code === "Backspace") {
      e.preventDefault();
      resetSimulationToStart();
    }
  });

  // --------------------------------------------------------------------------
  // 11. Intelligente Viewport-Bestimmung, Canvas-Resize & Render-Loop
  // --------------------------------------------------------------------------
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let lastCssWidth = 0;
  let lastCssHeight = 0;

  function getVisibleViewport() {
    let vw = document.documentElement.clientWidth || window.innerWidth || 1280;
    let vh = document.documentElement.clientHeight || window.innerHeight || 800;

    if (
      window.screen &&
      window.screen.width > 0 &&
      vw > window.screen.width * 1.2 &&
      window.outerWidth > 0 &&
      window.outerHeight > 0
    ) {
      const visibleW = Math.round(window.outerWidth * 1.3);
      const visibleH = Math.round(window.outerHeight * 1.3);
      vw = Math.min(vw, visibleW);
      vh = Math.min(vh, visibleH);
    }

    return {
      vw: Math.max(320, vw),
      vh: Math.max(240, vh)
    };
  }

  function syncViewportAndLayout() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const { vw, vh } = getVisibleViewport();

    if (vw !== lastCssWidth || vh !== lastCssHeight) {
      lastCssWidth = vw;
      lastCssHeight = vh;

      document.documentElement.style.setProperty("--vw", `${vw}px`);
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;

      // Explizite Positionierung für UI-Panel (oben rechts), Show-Menu-Button und FPS-HUD (unten links)
      const panelWidth = controlPanelEl.offsetWidth || 328;
      controlPanelEl.style.top = "20px";
      controlPanelEl.style.left = `${Math.max(20, vw - panelWidth - 20)}px`;
      controlPanelEl.style.right = "auto";

      if (btnShowMenu) {
        const showBtnWidth = btnShowMenu.offsetWidth || 104;
        btnShowMenu.style.top = "20px";
        btnShowMenu.style.left = `${Math.max(20, vw - showBtnWidth - 20)}px`;
        btnShowMenu.style.right = "auto";
      }

      const hudHeight = hudPanelEl.offsetHeight || 68;
      hudPanelEl.style.left = "20px";
      hudPanelEl.style.top = `${Math.max(20, vh - hudHeight - 20)}px`;
      hudPanelEl.style.bottom = "auto";
    }

    const bufferW = Math.floor(vw * pixelRatio);
    const bufferH = Math.floor(vh * pixelRatio);
    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      canvas.width = bufferW;
      canvas.height = bufferH;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", syncViewportAndLayout);
  syncViewportAndLayout();

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  function renderFrame(now) {
    const rawDtMs = now - state.lastTimestamp;
    state.lastTimestamp = now;

    const activeDtMs = rawDtMs > 1.0 && rawDtMs <= 100.0 ? rawDtMs : 16.67;
    const dtSec = activeDtMs * 0.001;

    state.frameDeltas.push(activeDtMs);
    if (state.frameDeltas.length > 30) {
      state.frameDeltas.shift();
    }

    if (now - state.fpsLastUpdate >= 200) {
      const avgDt =
        state.frameDeltas.reduce((acc, v) => acc + v, 0) / Math.max(1, state.frameDeltas.length);
      state.frameTimeMs = avgDt;
      state.fps = Math.min(120, Math.max(1, Math.round(1000 / avgDt)));
      state.fpsLastUpdate = now;

      fpsValueEl.textContent = String(state.fps);
      frameTimeEl.textContent = `${state.frameTimeMs.toFixed(1)} ms`;
      if (state.fps >= 50) {
        fpsDotEl.className = "fps-dot fps-good";
      } else {
        fpsDotEl.className = "fps-dot fps-warn";
      }
    }

    if (!state.isPaused) {
      state.simTime += dtSec * state.rotationSpeed;
    }

    const camDiffYaw = state.targetYaw - state.yaw;
    const camDiffPitch = state.targetPitch - state.pitch;
    const camDiffDist = state.targetDistance - state.distance;
    if (Math.abs(camDiffYaw) > 0.0001 || Math.abs(camDiffPitch) > 0.0001 || Math.abs(camDiffDist) > 0.0005) {
      state.yaw += camDiffYaw * 0.18;
      state.pitch += camDiffPitch * 0.18;
      state.distance += camDiffDist * 0.18;
      updateCameraHUD();
    }

    syncViewportAndLayout();

    gl.clearColor(0.012, 0.015, 0.038, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const cosPitch = Math.cos(state.pitch);
    const eyeX = state.distance * cosPitch * Math.sin(state.yaw);
    const eyeY = state.distance * Math.sin(state.pitch);
    const eyeZ = state.distance * cosPitch * Math.cos(state.yaw);

    const aspect = canvas.width / Math.max(1, canvas.height);
    mat4Perspective(projMatrix, (50 * Math.PI) / 180, aspect, 0.1, 150.0);
    mat4LookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    mat4Multiply(viewProjMatrix, projMatrix, viewMatrix);

    const palette = COLOR_SCHEMES[state.colorScheme] || COLOR_SCHEMES[1];

    gl.useProgram(program);
    gl.uniformMatrix4fv(loc.uViewProj, false, viewProjMatrix);
    gl.uniform1f(loc.uTime, state.simTime);
    gl.uniform1f(loc.uPixelRatio, pixelRatio);
    gl.uniform1f(loc.uViewportHeight, canvas.height);
    gl.uniform1f(loc.uWarpAmp, state.warpAmplitude);

    gl.uniform3fv(loc.uColorCore, palette.core);
    gl.uniform3fv(loc.uColorInner, palette.inner);
    gl.uniform3fv(loc.uColorOuter, palette.outer);
    gl.uniform3fv(loc.uColorDust, palette.dust);

    gl.drawArrays(gl.POINTS, 0, state.particleCount);

    requestAnimationFrame(renderFrame);
  }

  buildGalaxyGeometry();
  updateUI();
  syncViewportAndLayout();
  requestAnimationFrame(renderFrame);
})();
