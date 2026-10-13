(function () {
  const C = window.CONTENT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const img = (name, size, alt) => SPRITES.img(name, size, alt);
  const root = document.documentElement;

  // ---------- preferences ----------
  const prefs = (() => {
    try { return JSON.parse(localStorage.getItem("prefs") || "{}"); } catch (e) { return {}; }
  })();
  const save = () => { try { localStorage.setItem("prefs", JSON.stringify(prefs)); } catch (e) {} };

  // ---------- generated textures for CSS ----------
  function noiseTex(base, spread, size = 16) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const k = 1 + (Math.random() - 0.5) * spread;
        g.fillStyle = `rgb(${base.map((v) => Math.min(255, v * k) | 0)})`;
        g.fillRect(x, y, 1, 1);
      }
    return `url(${c.toDataURL()})`;
  }
  root.style.setProperty("--stone-tex", noiseTex([122, 122, 122], 0.32));
  root.style.setProperty("--dirt-tex", noiseTex([52, 40, 30], 0.45));
  drawLogo($("#logoCanvas"), "HIYAW ERTIRO", "DATA & AI EDITION");

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.href = SPRITES.url("gem");
  document.head.appendChild(favicon);

  // ---------- tooltip ----------
  const tip = $("#tooltip");
  function showTip(el, x, y) {
    const t = el.dataset.tip;
    if (!t) return;
    tip.innerHTML = t;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - r.width - 8, x + 14) + "px";
    tip.style.top = Math.max(8, y - r.height - 10) + "px";
  }
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el && e.pointerType === "mouse") showTip(el, e.clientX, e.clientY);
    else tip.hidden = true;
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el && el.matches(":focus-visible")) { const r = el.getBoundingClientRect(); showTip(el, r.left, r.top); }
    else tip.hidden = true;
  });
  document.addEventListener("scroll", () => (tip.hidden = true), true);

  // ---------- toast ----------
  const toast = $("#toast");
  let toastTimer;
  function showToast(title, desc, icon = "book") {
    toast.innerHTML = `${img(icon, 40)}<div><div class="t">${esc(title)}</div><div class="d">${esc(desc)}</div></div>`;
    toast.classList.add("show");
    SOUND.pop();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ---------- sound ----------
  const muteBtn = $("#muteBtn");
  muteBtn.innerHTML = img("speaker", 24);
  SOUND.setMusic((prefs.music ?? 30) / 100);
  SOUND.setSfx((prefs.sfx ?? 80) / 100);
  SOUND.setTrack(prefs.track || 0);
  function setMuted(m) {
    SOUND.setMuted(m);
    muteBtn.classList.toggle("muted", m);
    muteBtn.setAttribute("aria-label", m ? "Turn sound on" : "Turn sound off");
    muteBtn.dataset.tip = m ? "Sound: off" : "Sound: on";
  }
  // Sound always starts off; browsers block audio before a click anyway.
  setMuted(true);
  muteBtn.addEventListener("click", () => { setMuted(!SOUND.muted); SOUND.click(); });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".mc-btn, .slot, .item, .recipe, .adv-tab, .filters button") && e.target.closest("#muteBtn") === null) SOUND.click();
  });

  // ---------- options ----------
  const opts = $("#options");
  const musicVol = $("#musicVol"), sfxVol = $("#sfxVol");
  musicVol.value = prefs.music ?? 30;
  sfxVol.value = prefs.sfx ?? 80;
  const labels = () => {
    $("#musicLabel").textContent = `Music: ${musicVol.value}%`;
    $("#sfxLabel").textContent = `Sounds: ${sfxVol.value}%`;
    $("#trackBtn").textContent = `Track: ${SOUND.trackName}`;
    $$("[data-motion]", opts).forEach((b) => b.classList.toggle("on", b.dataset.motion === root.dataset.motion));
  };
  $("#optionsBtn").addEventListener("click", () => { labels(); opts.showModal(); });
  musicVol.addEventListener("input", () => { prefs.music = +musicVol.value; SOUND.setMusic(prefs.music / 100); labels(); save(); });
  sfxVol.addEventListener("input", () => { prefs.sfx = +sfxVol.value; SOUND.setSfx(prefs.sfx / 100); labels(); save(); });
  $("#trackBtn").addEventListener("click", () => { SOUND.nextTrack(); prefs.track = (prefs.track || 0) + 1; save(); labels(); });
  $$("[data-motion]", opts).forEach((b) =>
    b.addEventListener("click", () => { root.dataset.motion = prefs.motion = b.dataset.motion; save(); labels(); })
  );

  // ---------- title ----------
  $("#roles").textContent = C.roles;
  $("#ghLink").href = C.github;
  $("#liLink").href = C.linkedin;
  const splash = $("#splash");
  let splashIdx = (Math.random() * C.splashes.length) | 0;
  const setSplash = () => (splash.textContent = C.splashes[splashIdx % C.splashes.length]);
  setSplash();
  splash.addEventListener("click", () => { splashIdx++; setSplash(); });

  // ---------- projects: crafting ----------
  const skillIcon = {};
  C.skills.forEach((cat) => cat.items.forEach((it) => (skillIcon[it.toLowerCase()] = cat.icon)));
  const iconFor = (tag) => skillIcon[tag.toLowerCase()] || "paper";

  let filter = "all", query = "", selected = C.projects[0].id;
  const filtersEl = $("#filters"), recipesEl = $("#recipes"), bench = $("#bench");
  filtersEl.innerHTML = C.filters
    .map((f) => `<button type="button" data-f="${f.id}" aria-pressed="${f.id === filter}">${esc(f.label)}</button>`)
    .join("");
  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    filter = b.dataset.f;
    $$("button", filtersEl).forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderRecipes();
  });
  $("#projectSearch").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); renderRecipes(); });

  function visibleProjects() {
    return C.projects.filter((p) => {
      if (filter !== "all" && !p.cats.includes(filter)) return false;
      if (!query) return true;
      return [p.name, p.title, p.org, p.desc, ...p.tags].join(" ").toLowerCase().includes(query);
    });
  }
  function renderRecipes() {
    const list = visibleProjects();
    recipesEl.innerHTML = list.length
      ? list.map((p) => `
        <button class="recipe" role="option" type="button" data-id="${p.id}" aria-selected="${p.id === selected}">
          <span class="slot">${img(p.icon, 32)}</span>
          <span class="name">${esc(p.name)}<span class="org">${esc(p.org)}${p.live ? ' · <span class="live"><i class="dot"></i>Live</span>' : ""}</span></span>
        </button>`).join("")
      : `<p style="padding:8px;margin:0;color:#333">No recipes found.</p>`;
  }
  recipesEl.addEventListener("click", (e) => {
    const r = e.target.closest(".recipe");
    if (!r) return;
    selected = r.dataset.id;
    $$(".recipe", recipesEl).forEach((x) => x.setAttribute("aria-selected", x === r));
    renderBench(true);
  });
  recipesEl.addEventListener("dblclick", (e) => { if (e.target.closest(".recipe")) openDetail(selected); });

  const arrowSvg = `<svg class="arrow" viewBox="0 0 22 15" shape-rendering="crispEdges" aria-hidden="true"><path fill="#8b8b8b" d="M0 5h13V0h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-5H0z"/></svg>`;
  function renderBench(animate) {
    const p = C.projects.find((x) => x.id === selected);
    const slots = Array.from({ length: 9 }, (_, i) => p.tags[i]);
    const primary = p.links[0];
    const gh = p.links.find((l) => /github\.com/.test(l.href) && l !== primary);
    bench.innerHTML = `
      <div class="label">Crafting</div>
      <div class="bench-row">
        <div class="grid3" aria-hidden="true">
          ${slots.map((t) => `<div class="slot" ${t ? `data-tip="${esc(t)}"` : ""}>${t ? img(iconFor(t), 32) : ""}</div>`).join("")}
        </div>
        ${arrowSvg}
        <div class="result">
          <div class="slot big" data-tip="${esc(p.name)}<span class='sub'>${esc(p.org)}</span>">${img(p.icon, 44, p.name)}</div>
          ${p.metric ? `<div class="metric"><div class="v">${esc(p.metric.value)}</div><div class="l">${esc(p.metric.label)}</div></div>` : ""}
        </div>
      </div>
      <div>
        <h3>${esc(p.title)}</h3>
        <div class="org">${esc(p.org)}${p.live ? ' · <span class="live"><i class="dot"></i>Live demo</span>' : ""}</div>
      </div>
      <p>${esc(p.desc)}</p>
      <div class="ingredients">Ingredients: ${p.tags.map(esc).join(", ")}</div>
      <div class="actions">
        <button class="mc-btn" type="button" id="readMore">Read more</button>
        ${primary ? `<a class="mc-btn" href="${primary.href}" target="_blank" rel="noopener">${esc(primary.label)}</a>` : ""}
        ${gh ? `<a class="mc-btn" href="${gh.href}" target="_blank" rel="noopener">GitHub</a>` : ""}
      </div>`;
    $("#readMore", bench).addEventListener("click", () => openDetail(p.id));
    const filled = $$(".grid3 .slot", bench).filter((s) => s.firstChild);
    const out = $(".result .slot", bench);
    if (!animate || root.dataset.motion === "reduced") { filled.forEach((s) => s.classList.add("filled")); return; }
    filled.forEach((s, i) => setTimeout(() => s.classList.add("filled"), 40 + i * 45));
    setTimeout(() => { out.classList.remove("pop"); void out.offsetWidth; out.classList.add("pop"); }, 60 + filled.length * 45);
  }

  // ---------- project detail (written book) ----------
  const detail = $("#detail");
  function openDetail(id) {
    const p = C.projects.find((x) => x.id === id);
    $("#detailBody").innerHTML = `
      <h3 id="detail-h">${esc(p.title)}</h3>
      <p class="by">${esc(p.detailMeta)}</p>
      ${p.intro ? `<p>${esc(p.intro)}</p>` : ""}
      <ul>${p.points.map((x) => `<li>${x}</li>`).join("")}</ul>
      ${p.links.length ? `<div class="links">${p.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>` : ""}
      <div class="close"><button class="mc-btn" type="button" id="detailDone">Done</button></div>`;
    $("#detailDone").addEventListener("click", () => detail.close());
    detail.showModal();
    $("#detailBody").scrollTop = 0;
  }
  detail.addEventListener("click", (e) => { if (e.target === detail) detail.close(); });

  // ---------- experience: advancements ----------
  const advTabs = $("#advTabs"), advPanel = $("#advPanel");
  let advSel = C.experience[0].id, toastShown = false;
  advTabs.innerHTML = C.experience.map((x) => `
    <button class="adv-tab" role="tab" type="button" id="tab-${x.id}" data-id="${x.id}" aria-selected="${x.id === advSel}" aria-controls="advPanel">
      ${img(x.icon, 24)}<span>${esc(x.tab)}</span>
    </button>`).join("");
  advTabs.addEventListener("click", (e) => {
    const t = e.target.closest(".adv-tab");
    if (t) selectAdv(t.dataset.id);
  });
  advTabs.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = C.experience.findIndex((x) => x.id === advSel);
    const n = C.experience[(i + (e.key === "ArrowRight" ? 1 : -1) + C.experience.length) % C.experience.length];
    selectAdv(n.id);
    $(`#tab-${n.id}`).focus();
  });
  function selectAdv(id) {
    advSel = id;
    $$(".adv-tab", advTabs).forEach((t) => {
      const on = t.dataset.id === id;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
    });
    renderAdv();
  }
  function renderAdv() {
    const x = C.experience.find((e) => e.id === advSel);
    advPanel.setAttribute("aria-labelledby", `tab-${x.id}`);
    advPanel.innerHTML = `
      <div class="adv-head"><h2>${esc(x.role)} <span style="color:#555">@ ${esc(x.org)}</span></h2><span class="meta">${esc(x.meta)}</span></div>
      <div class="adv-canvas">
        <div class="tree">
          <div class="root"><div class="frame challenge" data-tip="<span class='yellow'>${esc(x.role)}</span><span class='sub'>${esc(x.org)}</span>">${img(x.icon, 32, "")}</div><div class="spine"></div></div>
          ${x.points.map((pt) => `
            <div class="ach"><div class="frame">${img(x.icon, 32, "")}</div>
              <div class="card"><span class="done">Advancement made</span>${pt}</div></div>`).join("")}
        </div>
      </div>`;
    const items = $$(".ach", advPanel);
    if (root.dataset.motion === "reduced") items.forEach((a) => a.classList.add("show"));
    else items.forEach((a, i) => setTimeout(() => a.classList.add("show"), 60 + i * 90));
  }

  // ---------- about: book ----------
  const A = C.about;
  const rows = (list) => `<ul class="rows">${list.map((r) => `<li><span>${esc(r.title)}<span class="s">${esc(r.sub)}</span></span><span class="d">${esc(r.date)}</span></li>`).join("")}</ul>`;
  const pages = [
    `<figure><img src="${A.portrait}" alt="${esc(A.portraitAlt)}" width="880" height="1100" loading="lazy"><figcaption>${esc(A.caption)}</figcaption></figure>`,
    `<p class="quote">${esc(A.quote)}</p>${A.paragraphs.map((p) => `<p>${p}</p>`).join("")}
     <div class="book-actions"><a class="mc-btn" href="#/projects">See my work</a><a class="mc-btn" href="#/contact">Say hello</a></div>`,
    `<h3>Stats</h3>${A.stats.map((s) => `<div class="stat"><span class="v">${esc(s.value)}</span><span class="l">${esc(s.label)}</span></div>`).join("")}`,
    `<h3>Beyond the code</h3><div class="hobbies">${A.hobbies.map((h) => `<div class="hobby"><span class="slot">${img(h.icon, 32)}</span>${esc(h.label)}</div>`).join("")}</div>`,
    `<h3>Leadership &amp; community</h3>${rows(A.leadership)}`,
    `<h3>Education &amp; certifications</h3>${rows(A.education)}`,
  ];
  const book = $("#book");
  let spread = 0;
  const single = matchMedia("(max-width: 860px)");
  function renderBook() {
    const step = single.matches ? 1 : 2;
    spread = Math.floor(spread / step) * step;
    const shown = single.matches ? [spread] : [spread, spread + 1];
    book.innerHTML = shown.map((i, k) => `
      <article class="page" aria-label="Page ${i + 1} of ${pages.length}">
        <span class="num">Page ${i + 1} of ${pages.length}</span>
        ${pages[i] || ""}
        <div class="page-nav">
          ${k === 0 ? `<button class="page-btn" data-d="-1" aria-label="Previous page" ${spread === 0 ? "disabled" : ""}>◀</button>` : ""}
          ${k === shown.length - 1 ? `<button class="page-btn" data-d="1" aria-label="Next page" ${spread + step >= pages.length ? "disabled" : ""}>▶</button>` : ""}
        </div>
      </article>`).join("");
  }
  book.addEventListener("click", (e) => {
    const b = e.target.closest(".page-btn");
    if (!b) return;
    const step = single.matches ? 1 : 2;
    spread = Math.max(0, Math.min(pages.length - 1, spread + step * +b.dataset.d));
    SOUND.click();
    renderBook();
    const again = $(`.page-btn[data-d="${b.dataset.d}"]:not([disabled])`, book) || $(".page-btn:not([disabled])", book);
    if (again) again.focus();
  });
  single.addEventListener("change", renderBook);

  // ---------- skills: creative inventory ----------
  const corpus = C.projects.map((p) => ({ p, text: [p.title, p.desc, p.intro, ...p.tags, ...p.points].join(" ") }));
  const usedIn = (skill) => {
    const re = new RegExp(`(^|[^A-Za-z0-9+])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9+])`, "i");
    return corpus.filter((c) => re.test(c.text.replace(/<[^>]+>/g, ""))).map((c) => c.p);
  };
  const invTabs = $("#invTabs"), invGrid = $("#invGrid"), itemInfo = $("#itemInfo");
  let invSel = C.skills[0].id;
  invTabs.innerHTML = C.skills.map((s) => `
    <button class="adv-tab" role="tab" type="button" id="itab-${s.id}" data-id="${s.id}" aria-selected="${s.id === invSel}" aria-controls="invGrid">
      ${img(s.icon, 24)}<span>${esc(s.label)}</span>
    </button>`).join("");
  invTabs.addEventListener("click", (e) => {
    const t = e.target.closest(".adv-tab");
    if (!t) return;
    invSel = t.dataset.id;
    $$(".adv-tab", invTabs).forEach((x) => x.setAttribute("aria-selected", x === t));
    renderInv();
  });
  const infoHint = `<span class="hint">Select an item to see where I've used it. The number on an item is how many projects use it.</span>`;
  function renderInv() {
    const cat = C.skills.find((s) => s.id === invSel);
    $("#invLabel").textContent = cat.label;
    $("#invCount").textContent = `${cat.items.length} items`;
    invGrid.setAttribute("aria-labelledby", `itab-${cat.id}`);
    invGrid.innerHTML = cat.items.map((it) => {
      const n = usedIn(it).length;
      return `<button class="item" type="button" aria-pressed="false" data-skill="${esc(it)}"
        data-tip="${esc(it)}<span class='sub'>${n ? `Used in ${n} project${n > 1 ? "s" : ""}` : cat.label}</span>">
        ${img(cat.icon, 32)}${n > 1 ? `<span class="count">${n}</span>` : ""}<span class="n">${esc(it)}</span></button>`;
    }).join("");
    itemInfo.innerHTML = infoHint;
  }
  invGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".item");
    if (!b) return;
    $$(".item", invGrid).forEach((x) => x.setAttribute("aria-pressed", x === b));
    const s = b.dataset.skill, used = usedIn(s);
    itemInfo.innerHTML = `<span class="t">${esc(s)}</span><br>` + (used.length
      ? `Used in: ${used.map((p) => `<a data-open="${p.id}" role="button" tabindex="0">${esc(p.name)}</a>`).join(", ")}`
      : `<span class="hint">Part of my toolkit. Not featured in a project on this site yet.</span>`);
  });
  const openFromInfo = (e) => {
    const a = e.target.closest("[data-open]");
    if (!a || (e.type === "keydown" && e.key !== "Enter")) return;
    selected = a.dataset.open;
    filter = "all";
    location.hash = "#/projects";
  };
  itemInfo.addEventListener("click", openFromInfo);
  itemInfo.addEventListener("keydown", openFromInfo);

  // ---------- contact: chat ----------
  const log = $("#chatLog");
  const mailto = (body) => `mailto:${C.email}${body ? `?subject=${encodeURIComponent("Hello from your portfolio")}&body=${encodeURIComponent(body)}` : ""}`;
  $("#mailBtn").href = mailto();
  $("#liBtn").href = C.linkedin;
  $("#ghBtn").href = C.github;
  function say(html, cls = "") {
    const d = document.createElement("div");
    d.className = "line " + cls;
    d.innerHTML = html;
    log.appendChild(d);
    while (log.children.length > 12) log.firstChild.remove();
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(C.email); say("Email copied to clipboard.", "sys"); }
    catch (e) { say(`Copy failed. It's <a href="${mailto()}">${C.email}</a>`, "sys"); }
  }
  $("#copyBtn").addEventListener("click", copyEmail);
  let chatStarted = false;
  function startChat() {
    if (chatStarted) return;
    chatStarted = true;
    say(`${esc(C.name)} joined the game`, "sys");
    say(`<span class="who">&lt;Hiyaw&gt;</span> Would love to get to know you more.`);
    say(`<span class="who">&lt;Hiyaw&gt;</span> Email me at <a href="${mailto()}">${C.email}</a>, or type below.`);
  }
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#chatInput"), msg = inp.value.trim();
    if (!msg) return;
    inp.value = "";
    if (msg.startsWith("/")) {
      const cmd = msg.slice(1).toLowerCase();
      say(`<span class="cmd">${esc(msg)}</span>`);
      if (cmd === "help") say("Commands: /email, /copy, /github, /linkedin, /projects", "sys");
      else if (cmd === "email") location.href = mailto();
      else if (cmd === "copy") copyEmail();
      else if (cmd === "github") open(C.github, "_blank", "noopener");
      else if (cmd === "linkedin") open(C.linkedin, "_blank", "noopener");
      else if (cmd === "projects") location.hash = "#/projects";
      else say(`Unknown command. Type /help for help.`, "sys");
      return;
    }
    say(`<span class="who">&lt;You&gt;</span> ${esc(msg)}`);
    say("Opening your email app with that message...", "sys");
    location.href = mailto(msg);
  });

  // ---------- routing ----------
  const screens = $$(".screen");
  const bottomBar = $("#bottomBar");
  let current = null;
  function route() {
    const name = location.hash.replace(/^#\/?/, "");
    const target = screens.find((s) => s.dataset.route === name) || screens[0];
    if (target === current) return;
    screens.forEach((s) => (s.hidden = s !== target));
    target.classList.remove("enter");
    void target.offsetWidth;
    target.classList.add("enter");
    target.scrollTop = 0;
    current = target;
    tip.hidden = true;
    const sub = target.id !== "title";
    document.body.classList.toggle("sub", sub);
    bottomBar.hidden = !sub;
    document.title = sub ? `${$(".screen-title", target)?.textContent || "Contact"} · ${C.name}` : C.name;

    if (target.id === "projects") {
      $$("button", filtersEl).forEach((x) => x.setAttribute("aria-pressed", x.dataset.f === filter));
      renderRecipes();
      renderBench(true);
    }
    if (target.id === "experience") {
      renderAdv();
      if (!toastShown) {
        toastShown = true;
        const x = C.experience[0];
        setTimeout(() => showToast("Advancement Made!", `${x.role} @ ${x.org}`, x.icon), 450);
      }
    }
    if (target.id === "about") renderBook();
    if (target.id === "skills") renderInv();
    if (target.id === "contact") { startChat(); if (matchMedia("(pointer: fine)").matches) $("#chatInput").focus(); }
    if (sub) {
      const h = $(".screen-title", target) || $("#chatInput");
      if (h && !h.matches("input")) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }
  const goBack = () => { location.hash = "#/"; };
  $("#backBtn").addEventListener("click", goBack);
  addEventListener("hashchange", route);
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]")) return;
    const typing = e.target.matches("input, textarea");
    if (e.key === "Escape" && current && current.id !== "title") {
      if (typing) e.target.blur();
      goBack();
    }
    if (!typing && current?.id === "title" && (e.key === "t" || e.key === "T")) {
      e.preventDefault();
      location.hash = "#/contact";
    }
  });
  route();
})();
