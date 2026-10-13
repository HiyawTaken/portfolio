// Original 16x16 pixel-art item icons, drawn in code and auto-outlined.
// SPRITES.url(name) returns a PNG data URL; render it with image-rendering: pixelated.

(function () {
  const cache = {};

  function make(draw) {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const g = c.getContext("2d");
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const circle = (cx, cy, r, col) => {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
          if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) px(x, y, col);
    };
    const line = (x0, y0, x1, y1, col) => {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        px(x0, y0, col);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    // Rows of characters mapped through a palette; "." is transparent.
    const map = (rows, pal, ox = 0, oy = 0) =>
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(ox + x, oy + y, pal[ch]); }));

    draw({ px, rect, circle, line, map });
    outline(g);
    return c.toDataURL();
  }

  // Dark 1px outline around every opaque shape, like vanilla item art.
  function outline(g) {
    const img = g.getImageData(0, 0, 16, 16), d = img.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && d[(y * 16 + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)))
          edge.push([x, y]);
    g.fillStyle = "#1b1b1b";
    edge.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  }

  const DRAW = {
    coin: ({ circle, map }) => {
      circle(8, 8, 6.5, "#b8860b");
      circle(8, 8, 5.5, "#f2c230");
      circle(7, 7, 3, "#ffd95a");
      map([
        ".x.x.",
        "xxxx.",
        "x...x",
        "xxxx.",
        "x...x",
        "xxxx.",
        ".x.x.",
      ], { x: "#9a6a00" }, 6, 4);
    },
    digit: ({ rect, line }) => {
      rect(3, 1, 10, 14, "#ecebe4");
      rect(3, 1, 10, 1, "#ffffff");
      rect(12, 2, 1, 13, "#c9c7bc");
      line(5, 4, 10, 4, "#222");
      line(10, 4, 7, 12, "#222");
      line(6, 8, 9, 8, "#222");
    },
    quill: ({ rect, line, px }) => {
      rect(2, 5, 10, 9, "#6b3a1c");
      rect(2, 5, 10, 1, "#8a4f27");
      rect(10, 6, 2, 8, "#efe6c8");
      rect(4, 7, 4, 1, "#c9a05a");
      line(6, 11, 13, 2, "#f4f4f4");
      line(7, 11, 14, 3, "#d6d6d6");
      px(5, 12, "#333");
    },
    compass: ({ circle, line, px }) => {
      circle(8, 8, 6.5, "#8c8c8c");
      circle(8, 8, 5.5, "#4a4a4a");
      line(5, 11, 8, 8, "#e9e9e9");
      line(8, 8, 11, 5, "#e03030");
      line(9, 8, 11, 6, "#a01818");
      px(8, 8, "#ffffff");
      px(7, 3, "#bdbdbd");
    },
    potion: ({ rect, circle, px }) => {
      rect(7, 1, 3, 2, "#8b5a2b");
      rect(7, 3, 3, 3, "#cfe8f5");
      circle(8.5, 10.5, 4.6, "#cfe8f5");
      circle(8.5, 11, 3.8, "#d6336c");
      rect(5, 8, 7, 1, "#cfe8f5");
      px(6, 9, "#ffffff");
      px(6, 10, "#ffffff");
    },
    spyglass: ({ line, px }) => {
      line(2, 12, 10, 4, "#e09a55");
      line(2, 13, 11, 4, "#c87533");
      line(3, 13, 11, 5, "#9c5a24");
      line(10, 2, 14, 6, "#4aa8de");
      line(11, 2, 14, 5, "#7fd1ff");
      line(11, 3, 13, 5, "#b8e7ff");
      px(12, 2, "#b8e7ff");
    },
    map: ({ rect }) => {
      rect(2, 2, 12, 12, "#e7d9a8");
      rect(2, 2, 12, 1, "#f6ecc6");
      rect(4, 9, 2, 3, "#3fae4a");
      rect(7, 6, 2, 6, "#3a7bd5");
      rect(10, 4, 2, 8, "#d9453b");
      rect(3, 12, 10, 1, "#7a6a45");
    },
    server: ({ rect, px }) => {
      rect(2, 1, 12, 14, "#3b3f46");
      for (let r = 0; r < 4; r++) {
        rect(3, 2 + r * 3.25, 10, 2, "#262a30");
        px(4, 2 + Math.round(r * 3.25), "#55ffff");
        px(6, 2 + Math.round(r * 3.25), r % 2 ? "#55ff55" : "#55ffff");
      }
      rect(2, 1, 12, 1, "#5a606a");
    },
    book: ({ rect }) => {
      rect(3, 2, 10, 12, "#2f5fb0");
      rect(3, 2, 10, 1, "#4a7fd6");
      rect(11, 3, 2, 11, "#efe6c8");
      rect(5, 5, 4, 1, "#c9d8f5");
      rect(5, 7, 3, 1, "#c9d8f5");
    },
    gem: ({ map }) => {
      map([
        "...aaaaa...",
        "..abbbbba..",
        ".abbccbbba.",
        "abbccbbbbba",
        ".abbbbbbba.",
        "..abbbbba..",
        "...abbba...",
        "....aba....",
        ".....a.....",
      ], { a: "#1a9e8f", b: "#4ee6d4", c: "#d6fffa" }, 2, 3);
    },
    ingot: ({ map }) => {
      map([
        "....aaaaaaa..",
        "...abbbbbbba.",
        "..abccbbbbbba",
        ".abbbbbbbbba.",
        "aaaaaaaaaaa..",
        "addddddddda..",
      ], { a: "#6f6f6f", b: "#d8d8d8", c: "#ffffff", d: "#a9a9a9" }, 1, 5);
    },
    cloud: ({ circle, rect }) => {
      circle(6, 9, 3.6, "#e9f2ff");
      circle(10, 7.5, 4.2, "#ffffff");
      circle(12.5, 10, 2.6, "#e9f2ff");
      rect(4, 10, 10, 3, "#d5e4fb");
    },
    chest: ({ rect, px }) => {
      rect(2, 4, 12, 10, "#9b6a2f");
      rect(2, 4, 12, 4, "#b98345");
      rect(2, 8, 12, 1, "#5b3c17");
      rect(7, 7, 2, 3, "#c9c9c9");
      px(7, 9, "#555");
      rect(2, 13, 12, 1, "#6b4720");
    },
    paper: ({ rect }) => {
      rect(3, 2, 10, 12, "#efeee6");
      rect(5, 5, 6, 1, "#b9b7aa");
      rect(5, 7, 6, 1, "#b9b7aa");
      rect(5, 9, 4, 1, "#b9b7aa");
    },
    glove: ({ circle, rect }) => {
      circle(8.5, 7, 5, "#d42c2c");
      circle(4.5, 8.5, 2, "#d42c2c");
      circle(8, 5.5, 2.4, "#ef5b5b");
      rect(6, 11, 6, 3, "#f1f1f1");
    },
    dumbbell: ({ rect }) => {
      rect(5, 7, 6, 2, "#9d9d9d");
      rect(2, 4, 3, 8, "#3c3c3c");
      rect(11, 4, 3, 8, "#3c3c3c");
      rect(2, 4, 1, 8, "#5a5a5a");
      rect(11, 4, 1, 8, "#5a5a5a");
    },
    pawn: ({ circle, rect }) => {
      circle(8, 4.5, 2.6, "#f3f0e6");
      rect(6, 7, 4, 2, "#f3f0e6");
      rect(7, 9, 2, 2, "#f3f0e6");
      rect(5, 11, 6, 2, "#f3f0e6");
      rect(4, 13, 8, 1, "#c9c4b4");
    },
    guitar: ({ circle, line, px }) => {
      circle(5.5, 10.5, 3.8, "#b5651d");
      circle(8, 8, 2.8, "#b5651d");
      circle(5.5, 10.5, 1.2, "#3a2210");
      line(8, 7, 13, 2, "#5b3a1a");
      px(13, 1, "#2b2b2b"); px(14, 2, "#2b2b2b");
    },
    speaker: ({ rect, line }) => {
      rect(2, 6, 3, 4, "#f0f0f0");
      line(5, 6, 8, 3, "#f0f0f0"); line(5, 9, 8, 12, "#f0f0f0");
      rect(5, 5, 4, 6, "#f0f0f0"); rect(8, 3, 1, 10, "#f0f0f0");
      rect(6, 4, 2, 8, "#f0f0f0");
    },
  };

  window.SPRITES = {
    url(name) {
      if (!DRAW[name]) name = "paper";
      return cache[name] || (cache[name] = make(DRAW[name]));
    },
    img(name, size = 32, alt = "") {
      return `<img class="sprite" src="${this.url(name)}" width="${size}" height="${size}" alt="${alt}">`;
    },
  };
})();
