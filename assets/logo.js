// Draws the title logo in the style of a blocky game logo: chunky letters,
// a cracked stone face, a 3D extrusion below, and a thick black outline.
// Letterforms are original 7-row bitmaps; everything is rendered at load time.

(function () {
  const GLYPHS = {
    A: [".####.", "##..##", "##..##", "######", "##..##", "##..##", "##..##"],
    D: ["#####.", "##..##", "##..##", "##..##", "##..##", "##..##", "#####."],
    E: ["#####", "##...", "##...", "####.", "##...", "##...", "#####"],
    H: ["##..##", "##..##", "##..##", "######", "##..##", "##..##", "##..##"],
    I: ["######", "..##..", "..##..", "..##..", "..##..", "..##..", "######"],
    N: ["##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##"],
    O: [".####.", "##..##", "##..##", "##..##", "##..##", "##..##", ".####."],
    R: ["#####.", "##..##", "##..##", "#####.", "##.##.", "##..##", "##..##"],
    T: ["######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##.."],
    W: ["##...##", "##...##", "##.#.##", "##.#.##", "#######", "###.###", "##...##"],
    Y: ["##..##", "##..##", "##..##", ".####.", "..##..", "..##..", "..##.."],
    "&": [".###..", "##.##.", ".###..", ".###.#", "##.###", "##..##", ".###.#"],
  };
  const ROWS = 7;

  // Text -> list of filled cells [col, row] and total width in cells.
  function layout(text) {
    const cells = [];
    let x = 0;
    for (const ch of text) {
      if (ch === " ") { x += 3; continue; }
      const g = GLYPHS[ch];
      if (!g) continue;
      g.forEach((row, y) => [...row].forEach((c, i) => c === "#" && cells.push([x + i, y])));
      x += g[0].length + 1;
    }
    return { cells, width: x - 1 };
  }

  function rng(seed) {
    return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // s = cell size in px, depth = extrusion in cells.
  function render(text, s, depth, seed) {
    const { cells, width } = layout(text);
    const o = Math.round(s * 0.5);          // outline thickness
    const dz = Math.round(depth * s);       // extrusion height in px
    const W = width * s + o * 2, H = ROWS * s + dz + o * 2;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const filled = new Set(cells.map(([x, y]) => x + "," + y));
    const has = (x, y) => filled.has(x + "," + y);
    const X = (x) => o + x * s, Y = (y) => o + y * s;
    const r = rng(seed);

    // 1. Black outline around the face plus its extrusion.
    g.fillStyle = "#0d0d0d";
    cells.forEach(([x, y]) => g.fillRect(X(x) - o, Y(y) - o, s + o * 2, s + dz + o * 2));

    // 2. Extrusion: stacked copies, dark at the bottom, lighter near the face.
    for (let k = dz; k >= 1; k--) {
      const t = k / dz;
      const v = Math.round(118 - 58 * t);
      g.fillStyle = `rgb(${v + 4},${v},${v - 4})`;
      cells.forEach(([x, y]) => g.fillRect(X(x), Y(y) + k, s, s));
    }
    // Vertical seams on the extrusion where letter edges turn corners.
    g.fillStyle = "rgba(0,0,0,.35)";
    cells.forEach(([x, y]) => {
      if (!has(x, y + 1)) {
        if (!has(x - 1, y) || has(x - 1, y + 1)) g.fillRect(X(x), Y(y) + s, Math.max(1, s / 8), dz);
      }
    });

    // 3. Face: warm stone with blotchy texture.
    const face = new Path2D();
    cells.forEach(([x, y]) => face.rect(X(x), Y(y), s, s));
    g.save();
    g.clip(face);
    g.fillStyle = "#cbc3bd";
    g.fillRect(0, 0, W, H);
    const tx = Math.max(2, Math.round(s / 4));
    for (let y = 0; y < H; y += tx)
      for (let x = 0; x < W; x += tx) {
        const k = r();
        if (k < 0.35) continue;
        const v = Math.round(185 + (r() - 0.5) * 34);
        g.fillStyle = `rgb(${v + 10},${v + 3},${v - 3})`;
        g.fillRect(x, y, tx, tx);
      }
    // Cracks: short random walks in a darker tone.
    g.strokeStyle = "#857b74";
    g.lineWidth = Math.max(1.5, s / 7);
    g.lineCap = "square";
    const cracks = Math.round(cells.length / 5);
    for (let i = 0; i < cracks; i++) {
      const [cx, cy] = cells[(r() * cells.length) | 0];
      let px = X(cx) + r() * s, py = Y(cy) + r() * s;
      let a = r() * Math.PI * 2;
      g.beginPath();
      g.moveTo(px, py);
      const steps = 2 + ((r() * 4) | 0);
      for (let j = 0; j < steps; j++) {
        a += (r() - 0.5) * 1.6;
        px += Math.cos(a) * s * 0.45;
        py += Math.sin(a) * s * 0.45;
        g.lineTo(px, py);
      }
      g.stroke();
    }
    // Bevel: light top/left edges, dark bottom edges of the face.
    const b = Math.max(2, Math.round(s / 6));
    cells.forEach(([x, y]) => {
      if (!has(x, y - 1)) { g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(X(x), Y(y), s, b); }
      if (!has(x - 1, y)) { g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(X(x), Y(y), b, s); }
      if (!has(x, y + 1)) { g.fillStyle = "rgba(60,50,45,.55)"; g.fillRect(X(x), Y(y) + s - b, s, b); }
      if (!has(x + 1, y)) { g.fillStyle = "rgba(60,50,45,.35)"; g.fillRect(X(x) + s - b, Y(y), b, s); }
    });
    g.restore();
    return c;
  }

  // Two lines composed into one canvas: big name, smaller subtitle tucked under it.
  window.drawLogo = function (target, title, subtitle) {
    const big = render(title, 16, 2.3, 7);
    const small = render(subtitle, 10, 0.9, 11);
    const overlap = 10; // tuck the subtitle's outline under the name's outline
    const c = target;
    c.width = Math.max(big.width, small.width);
    c.height = big.height + small.height - overlap;
    const g = c.getContext("2d");
    g.drawImage(small, (c.width - small.width) / 2, big.height - overlap);
    g.drawImage(big, (c.width - big.width) / 2, 0);
  };
})();
