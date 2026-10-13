// Procedural voxel landscape behind every screen, rendered with three.js.
// Original textures and terrain, all generated here at load time.
import * as THREE from "three";

const canvas = document.getElementById("world");
const mobile = matchMedia("(max-width: 700px)").matches;

// ---------- seeded noise ----------
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20270101);
const grid = new Float32Array(64 * 64).map(() => rand());
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const g = (i, j) => grid[((j & 63) * 64 + (i & 63))];
  const tx = smooth(x - xi), ty = smooth(y - yi);
  return lerp(lerp(g(xi, yi), g(xi + 1, yi), tx), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), tx), ty);
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

// ---------- textures ----------
function tex(paint) {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d");
  const r = rng(paint.length * 7919 + 13);
  paint(g, r);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const speckle = (base, spread) => (g, r) => {
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const k = 1 + (r() - 0.5) * spread;
      g.fillStyle = `rgb(${base.map((v) => Math.min(255, v * k) | 0)})`;
      g.fillRect(x, y, 1, 1);
    }
};
const T = {
  grassTop: tex(speckle([96, 158, 64], 0.35)),
  dirt: tex(speckle([134, 96, 67], 0.4)),
  grassSide: tex((g, r) => {
    speckle([134, 96, 67], 0.4)(g, r);
    for (let x = 0; x < 16; x++) {
      const h = 3 + ((r() * 2.2) | 0);
      for (let y = 0; y < h; y++) {
        const k = 1 + (r() - 0.5) * 0.35;
        g.fillStyle = `rgb(${(96 * k) | 0},${(158 * k) | 0},${(64 * k) | 0})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  }),
  stone: tex(speckle([125, 125, 125], 0.3)),
  sand: tex(speckle([219, 207, 160], 0.15)),
  logSide: tex((g, r) => {
    for (let x = 0; x < 16; x++) {
      const k = x % 4 === 0 ? 0.7 : 1 + (r() - 0.5) * 0.2;
      for (let y = 0; y < 16; y++) {
        g.fillStyle = `rgb(${(104 * k) | 0},${(82 * k) | 0},${(50 * k) | 0})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  }),
  logTop: tex((g) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const ring = d > 6.5 ? 0.6 : (d | 0) % 2 ? 0.9 : 1;
        g.fillStyle = `rgb(${(176 * ring) | 0},${(141 * ring) | 0},${(87 * ring) | 0})`;
        g.fillRect(x, y, 1, 1);
      }
  }),
  leaves: tex((g, r) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (r() < 0.18) continue;
        const k = 0.75 + r() * 0.5;
        g.fillStyle = `rgb(${(58 * k) | 0},${(122 * k) | 0},${(40 * k) | 0})`;
        g.fillRect(x, y, 1, 1);
      }
  }),
  water: tex(speckle([52, 92, 196], 0.12)),
};
const lam = (map, extra = {}) => new THREE.MeshLambertMaterial({ map, ...extra });
const M = {
  grass: [lam(T.grassSide), lam(T.grassSide), lam(T.grassTop), lam(T.dirt), lam(T.grassSide), lam(T.grassSide)],
  dirt: lam(T.dirt),
  stone: lam(T.stone),
  sand: lam(T.sand),
  log: [lam(T.logSide), lam(T.logSide), lam(T.logTop), lam(T.logTop), lam(T.logSide), lam(T.logSide)],
  leaves: lam(T.leaves, { alphaTest: 0.5, side: THREE.DoubleSide }),
  water: lam(T.water, { transparent: true, opacity: 0.78 }),
  cloud: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
};

// ---------- terrain ----------
const SIZE = mobile ? 72 : 112;
const HALF = SIZE / 2;
const WATER = 7;
const heights = new Int16Array(SIZE * SIZE);
const H = (x, z) => heights[(Math.max(0, Math.min(SIZE - 1, z))) * SIZE + Math.max(0, Math.min(SIZE - 1, x))];
for (let z = 0; z < SIZE; z++)
  for (let x = 0; x < SIZE; x++) {
    const n = fbm(x / 22, z / 22);
    heights[z * SIZE + x] = Math.round(2 + n * 15 + Math.max(0, vnoise(x / 40 + 9, z / 40 + 3) - 0.6) * 25);
  }

const blocks = { grass: [], dirt: [], stone: [], sand: [], log: [], leaves: [], water: [] };
const occupied = new Set();
const put = (type, x, y, z) => {
  const k = `${x},${y},${z}`;
  if (occupied.has(k)) return;
  occupied.add(k);
  blocks[type].push(x - HALF, y, z - HALF);
};

for (let z = 0; z < SIZE; z++)
  for (let x = 0; x < SIZE; x++) {
    const h = H(x, z);
    const low = Math.min(h, H(x - 1, z), H(x + 1, z), H(x, z - 1), H(x, z + 1));
    const beach = h <= WATER + 1 && Math.min(H(x - 2, z), H(x + 2, z), H(x, z - 2), H(x, z + 2)) <= WATER;
    for (let y = Math.max(0, low - 1); y <= h; y++) {
      let type = y === h ? "grass" : y > h - 3 ? "dirt" : "stone";
      if (beach && y >= h - 2) type = "sand";
      if (h > 17 && y === h) type = "stone";
      put(type, x, y, z);
    }
    for (let y = h + 1; y <= WATER; y++) if (y === WATER) put("water", x, y, z);
  }

// Trees, kept away from the camera at the center.
const trees = rng(4242);
for (let z = 3; z < SIZE - 3; z++)
  for (let x = 3; x < SIZE - 3; x++) {
    const h = H(x, z);
    if (h <= WATER + 1 || h > 16) continue;
    if (Math.hypot(x - HALF, z - HALF) < 5) continue;
    if (trees() > 0.022) continue;
    const top = h + 4 + ((trees() * 2) | 0);
    for (let y = h + 1; y <= top; y++) put("log", x, y, z);
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy >= 0 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || trees() < 0.5)) continue;
          put("leaves", x + dx, top + dy, z + dz);
        }
    }
  }

// ---------- scene ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "low-power" });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
  throw e;
}
const SKY = 0x8db8f0;
renderer.setClearColor(SKY);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(SKY, 22, SIZE * 0.55);
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

const box = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4();
for (const [type, list] of Object.entries(blocks)) {
  const count = list.length / 3;
  if (!count) continue;
  const mesh = new THREE.InstancedMesh(box, M[type], count);
  for (let i = 0; i < count; i++) {
    m4.makeTranslation(list[i * 3], list[i * 3 + 1], list[i * 3 + 2]);
    if (type === "water") m4.multiply(new THREE.Matrix4().makeScale(1, 0.85, 1));
    mesh.setMatrixAt(i, m4);
  }
  scene.add(mesh);
}

// Flat, blocky clouds drifting overhead.
const cloudCells = [];
for (let z = -40; z < 40; z++)
  for (let x = -40; x < 40; x++)
    if (vnoise(x / 6 + 30, z / 6 + 30) > 0.72) cloudCells.push(x, z);
const clouds = new THREE.InstancedMesh(box, M.cloud, cloudCells.length / 2);
for (let i = 0; i < cloudCells.length / 2; i++) {
  m4.makeScale(3, 1.2, 3).setPosition(cloudCells[i * 2] * 3, 34, cloudCells[i * 2 + 1] * 3);
  clouds.setMatrixAt(i, m4);
}
scene.add(clouds);

const camera = new THREE.PerspectiveCamera(80, 1, 0.1, 400);
const eyeY = Math.max(H(HALF, HALF), WATER) + 5.5;
camera.position.set(0, eyeY, 0);

function resize() {
  const w = innerWidth, h = innerHeight;
  // Render at reduced resolution: the canvas is blurred by CSS anyway.
  renderer.setPixelRatio(mobile ? 0.5 : 0.6);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

let yaw = 0.6, last = performance.now(), acc = 0;
const reduced = () => document.documentElement.dataset.motion === "reduced";
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  if (!reduced()) {
    yaw += dt * 0.03;
    clouds.position.x = ((clouds.position.x + dt * 0.6 + 120) % 240) - 120;
  }
  // ~30 fps is plenty for a slow pan and saves battery.
  if (acc >= 1 / 30) {
    acc = 0;
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(-0.1);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
canvas.classList.add("ready");
