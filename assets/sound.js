// Synthesized UI clicks and a generative ambient piano. No audio files.
// The AudioContext is created lazily on the first user gesture, as browsers require.

window.SOUND = (function () {
  let ctx, master, musicBus, sfxBus, reverb, timer;
  let musicVol = 0.3, sfxVol = 0.8, muted = true, track = 0;

  const TRACKS = [
    { name: "Sonoran Dawn", root: 57, scale: [0, 2, 4, 7, 9, 12, 14, 16], gap: [1.6, 3.4] },
    { name: "Saguaro", root: 52, scale: [0, 3, 5, 7, 10, 12, 15, 17], gap: [2.0, 4.0] },
    { name: "Monsoon", root: 55, scale: [0, 2, 5, 7, 9, 12, 14, 17], gap: [1.2, 2.8] },
  ];

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    musicBus.connect(master);
    musicBus.connect(reverb).connect(wet).connect(master);
    sfxBus.connect(master);
    apply();
  }

  function impulse(seconds) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return buf;
  }

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.05);
    musicBus.gain.setTargetAtTime(musicVol * 0.22, t, 0.1);
    sfxBus.gain.setTargetAtTime(sfxVol * 0.5, t, 0.02);
    if (muted) stopMusic(); else startMusic();
  }

  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function note(midi, when, vel = 1) {
    const f = freq(midi);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.5 * vel, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, when + 4.5);
    [[1, "sine", 1], [2, "triangle", 0.18], [3, "sine", 0.06]].forEach(([mul, type, amp]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type;
      o.frequency.value = f * mul;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(when);
      o.stop(when + 4.6);
    });
    g.connect(lp).connect(musicBus);
  }

  function startMusic() {
    if (timer || musicVol === 0) return;
    const step = () => {
      const tr = TRACKS[track];
      const t = ctx.currentTime + 0.05;
      const pick = () => tr.root + tr.scale[(Math.random() * tr.scale.length) | 0];
      note(pick(), t, 0.8 + Math.random() * 0.2);
      if (Math.random() < 0.35) note(pick() - 12, t + 0.02, 0.6);
      if (Math.random() < 0.25) note(pick(), t + 0.45, 0.5);
      const [a, b] = tr.gap;
      timer = setTimeout(step, (a + Math.random() * (b - a)) * 1000);
    };
    timer = setTimeout(step, 400);
  }
  function stopMusic() { clearTimeout(timer); timer = null; }

  return {
    get muted() { return muted; },
    get trackName() { return TRACKS[track].name; },
    setMuted(m) { muted = m; if (!m) init(); if (ctx && ctx.state === "suspended") ctx.resume(); apply(); },
    setMusic(v) { musicVol = v; if (ctx) { stopMusic(); apply(); } },
    setSfx(v) { sfxVol = v; apply(); },
    setTrack(i) { track = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length; },
    nextTrack() { this.setTrack(track + 1); if (ctx && !muted) { stopMusic(); startMusic(); } return TRACKS[track].name; },
    click() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(1100, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3000;
      o.connect(lp).connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.09);
    },
    pop() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [0, 0.07, 0.14].forEach((d, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = freq(76 + i * 4);
        g.gain.setValueAtTime(0.18, t + d);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25);
        o.connect(g).connect(sfxBus);
        o.start(t + d);
        o.stop(t + d + 0.3);
      });
    },
  };
})();
