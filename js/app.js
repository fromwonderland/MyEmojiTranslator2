(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const T = window.Translator;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- stockage local (facultatif) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tm_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("tm_" + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- fond animé ---------- */
  const bgBox = $(".bg-floaters");
  const rand = (a, b) => a + Math.random() * (b - a);
  (function floaters() {
    ["b1", "b2", "b3", "b4", "b5"].forEach((c) => {
      const b = document.createElement("div");
      b.className = "blob " + c;
      bgBox.appendChild(b);
    });
    const set = shuffle(["😀", "🍕", "🐱", "✨", "🎉", "❤️", "🌈", "🤪", "🦄", "🍩", "🚀", "🌸", "🍉", "🦋", "🎈",
      "🍓", "🐸", "💜", "⭐", "🍭", "🐙", "🌻", "🧁", "🎨", "🥑", "🐳", "🔥", "💎", "🍒", "🌺", "🦊", "🪐",
      "🍋", "🐠", "🎁", "🍬", "💖", "🌵", "🎸", "🐝"]);
    const W = window.innerWidth;
    const n = W < 560 ? 18 : 40;
    // Sur grand écran, la carte centrale cache le milieu : on place surtout les emojis sur les côtés
    const side = W > 900 ? Math.max(6, ((W - 860) / 2 / W) * 100) : 0;   // largeur d'une marge en %
    const xFor = (i) => {
      if (!side || i % 4 === 3) return (i / n) * 100 + rand(-3, 3);       // 1 sur 4 n'importe où
      const left = i % 2 === 0;
      const p = rand(0, side + 4);
      return left ? p - 2 : 100 - p - 2;
    };
    // 4 types de mouvement : monter, tomber, traverser, flotter sur place
    const moves = ["rise", "rise", "rise", "fall", "cross", "bob"];
    for (let i = 0; i < n; i++) {
      const move = moves[i % moves.length];
      const s = document.createElement("span");
      s.className = "fl";
      const dur = move === "bob" ? rand(5, 9) : move === "cross" ? rand(28, 45) : rand(18, 34);
      s.style.setProperty("--x", move === "cross" ? "0%" : xFor(i).toFixed(1) + "%");
      s.style.setProperty("--y", rand(5, 85).toFixed(0) + "vh");
      s.style.setProperty("--move", move);
      s.style.setProperty("--dur", dur.toFixed(1) + "s");
      s.style.setProperty("--delay", (-rand(0, dur)).toFixed(1) + "s");
      const big = Math.random() < .25;
      s.style.setProperty("--size", (big ? rand(2.6, 3.6) : rand(1.3, 2.4)).toFixed(2) + "rem");
      s.style.setProperty("--op", (big ? rand(.35, .5) : rand(.55, .85)).toFixed(2));
      s.style.setProperty("--wiggle", ["sway", "sway", "spin", "pulse-pop"][Math.floor(Math.random() * 4)]);
      s.style.setProperty("--wdur", rand(2.5, 6).toFixed(1) + "s");
      const inner = document.createElement("i");
      inner.textContent = set[i % set.length];
      s.appendChild(inner);
      bgBox.appendChild(s);
    }
  })();

  // Les emojis d'une nouvelle traduction s'envolent dans le fond 🎈
  let lastBurst = "";
  function burst(text) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(text)].map((x) => x.segment) : Array.from(text);
    const emos = seg.filter((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g));
    const fresh = emos.filter((e) => !lastBurst.includes(e));
    lastBurst = text;
    if (!fresh.length || bgBox.querySelectorAll(".burst").length > 14) return;
    fresh.slice(-3).forEach((e, k) => {
      const s = document.createElement("span");
      s.className = "fl burst";
      s.style.setProperty("--x", rand(8, 88).toFixed(0) + "%");
      s.style.setProperty("--y", rand(70, 95).toFixed(0) + "vh");
      s.style.setProperty("--dx", rand(-12, 12).toFixed(0) + "vw");
      s.style.setProperty("--dur", rand(4, 7).toFixed(1) + "s");
      s.style.setProperty("--size", rand(2, 3.2).toFixed(1) + "rem");
      s.style.setProperty("--op", ".9");
      s.style.setProperty("--wiggle", "sway");
      s.style.setProperty("--wdur", "1.6s");
      s.style.animationDelay = k * 0.25 + "s";
      const inner = document.createElement("i");
      inner.textContent = e;
      s.appendChild(inner);
      s.addEventListener("animationend", (ev) => { if (ev.target === s) s.remove(); });
      bgBox.appendChild(s);
    });
  }

  const logos = ["🤪", "😎", "🥳", "🤩", "😜", "🦄", "👽", "🤖", "🐸"];
  $("#logoEmoji").addEventListener("click", (e) => { e.currentTarget.textContent = pick(logos); });

  /* =========================================================
     TRADUCTEUR
     ========================================================= */
  const fr = $("#frInput");
  const em = $("#emojiOutput");
  let mode = store.get("mode", "mix");

  function render() {
    const txt = fr.value;
    $("#frCount").textContent = txt.length + " / 1000";
    const r = T.toEmoji(txt, mode);
    em.value = r.text;
    burst(r.text);
    const pct = r.total ? Math.round((r.known / r.total) * 100) : 0;
    $("#meterFill").style.width = pct + "%";
    $("#meterLabel").textContent = "Emojification : " + pct + " %";
    const d = $("#details");
    d.innerHTML = "";
    const seen = new Set();
    r.details.forEach(({ src, e }) => {
      const key = src.toLowerCase() + e;
      if (seen.has(key)) return;
      seen.add(key);
      const s = document.createElement("span");
      s.className = "pair";
      s.innerHTML = "<b></b>";
      s.firstChild.textContent = e;
      s.append(src.replace(/'$/, ""));
      d.appendChild(s);
    });
  }

  let histoTimer;
  fr.addEventListener("input", () => {
    render();
    clearTimeout(histoTimer);
    histoTimer = setTimeout(saveHisto, 1500);
  });

  function setMode(m) {
    mode = m;
    store.set("mode", m);
    $$(".mode").forEach((b) => {
      const on = b.dataset.mode === m;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on);
    });
    if (fr.value) render();
  }
  $$(".mode").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  setMode(mode);

  function loadPhrase(p) {
    fr.value = p;
    render();
    saveHisto();
    fr.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("#randomBtn").addEventListener("click", () => loadPhrase(pick(window.SUGGESTIONS)));
  $("#clearFr").addEventListener("click", () => { fr.value = ""; render(); fr.focus(); });
  $("#clearEmoji").addEventListener("click", () => { em.value = ""; em.focus(); });

  /* ---------- dictée vocale (Web Speech API) ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = $("#micBtn");
  let rec = null, listening = false, base = "";

  function setListening(on) {
    listening = on;
    micBtn.classList.toggle("listening", on);
    micBtn.setAttribute("aria-pressed", on);
    micBtn.title = on ? "Arrêter la dictée" : "Dictée vocale";
    $("#micStatus").hidden = !on;
  }

  if (SR) {
    rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let finals = "", interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finals += t; else interim += t;
      }
      const spoken = (finals + interim).trim();
      fr.value = (base + (base && spoken ? " " : "") + spoken).slice(0, 1000);
      render();
    };
    rec.onerror = (ev) => {
      const msgs = {
        "not-allowed": "Accès au micro refusé 🙊 autorise-le dans ton navigateur",
        "service-not-allowed": "Dictée indisponible ici 🙊 essaie avec Chrome ou Edge",
        "no-speech": "Je n'ai rien entendu 👂 réessaie !",
        "audio-capture": "Aucun micro détecté 🎤❓",
        "network": "La dictée a besoin d'Internet 🌐",
      };
      toast(msgs[ev.error] || "Oups, la dictée a planté 😕");
    };
    rec.onend = () => { if (listening) { setListening(false); saveHisto(); } };
  }

  micBtn.addEventListener("click", () => {
    if (!rec) { toast("Ton navigateur ne gère pas la dictée 😢 essaie Chrome ou Edge"); return; }
    if (listening) { rec.stop(); return; }
    base = fr.value.trim();
    try { rec.start(); setListening(true); toast("Parle, je t'écoute 🎙️"); }
    catch { toast("La dictée est déjà en cours 🎙️"); }
  });

  $("#toFrBtn").addEventListener("click", () => {
    if (!em.value.trim()) { toast("Ajoute d'abord des emojis 😉"); em.focus(); return; }
    const res = T.toFrench(em.value);
    fr.value = res;
    $("#frCount").textContent = res.length + " / 1000";
    toast("Emojis décodés 🔄");
  });

  /* ---------- copie ---------- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  $$(".copy-btn").forEach((b) => b.addEventListener("click", async () => {
    const v = document.getElementById(b.dataset.copy).value;
    if (!v.trim()) { toast("Rien à copier pour l'instant 🫥"); return; }
    if (await copyText(v)) {
      toast("Copié ! 📋✨");
      const old = b.textContent;
      b.classList.add("done"); b.textContent = "✅ Copié";
      setTimeout(() => { b.classList.remove("done"); b.textContent = old; }, 1200);
    } else toast("Impossible de copier 😕");
  }));

  /* ---------- insertion depuis le dico ---------- */
  function insertEmoji(e) {
    const start = em.selectionStart ?? em.value.length;
    const end = em.selectionEnd ?? em.value.length;
    em.value = em.value.slice(0, start) + e + em.value.slice(end);
    const pos = start + e.length;
    em.setSelectionRange(pos, pos);
    toast(e + " ajouté !");
  }

  /* =========================================================
     ONGLETS
     ========================================================= */
  function showTab(id) {
    $$(".tab").forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("active", on); t.setAttribute("aria-selected", on); });
    $$(".panel").forEach((p) => { const on = p.id === "panel-" + id; p.classList.toggle("active", on); p.hidden = !on; });
    store.set("tab", id);
    if (id === "histo") renderHisto();
  }
  const isMobile = () => window.matchMedia("(max-width: 560px)").matches;
  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    showTab(t.dataset.tab);
    // sur mobile, la barre d'onglets est en bas : on amène le panneau à l'écran
    if (isMobile()) document.getElementById("panel-" + t.dataset.tab).scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  /* =========================================================
     DICTIONNAIRE
     ========================================================= */
  let currentCat = "all";
  const cats = $("#cats");
  const grid = $("#grid");
  [{ id: "all", nom: "Tout", icone: "🌟" }, ...window.EMOJI_DICT].forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.id === "all" ? " active" : "");
    b.dataset.cat = c.id;
    b.textContent = c.icone + " " + c.nom;
    b.addEventListener("click", () => {
      currentCat = c.id;
      $$("#cats .chip").forEach((x) => x.classList.toggle("active", x === b));
      renderGrid();
    });
    cats.appendChild(b);
  });

  const noAcc = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  // mots-clés à afficher, sans les variantes sans accent (« lèvres, levres » → « lèvres »)
  const shownKeys = (it) => it.keys.filter((k, i) => it.keys.findIndex((x) => noAcc(x) === noAcc(k)) === i);
  function renderGrid() {
    const q = noAcc($("#dicoSearch").value.trim());
    const list = T.all.filter((it) =>
      (currentCat === "all" || it.cat === currentCat) &&
      (!q || it.keys.some((k) => noAcc(k).includes(q)) || it.e === q));
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<p class="empty">Aucun emoji trouvé 🕵️ Essaie un autre mot !</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((it) => {
      const b = document.createElement("button");
      b.className = "emo";
      b.title = shownKeys(it).slice(0, 6).join(", ");
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = it.e;
      b.lastChild.textContent = it.label;
      b.addEventListener("click", () => insertEmoji(it.e));
      frag.appendChild(b);
    });
    grid.appendChild(frag);
  }
  $("#dicoSearch").addEventListener("input", renderGrid);
  renderGrid();

  /* =========================================================
     MINI-JEU 1 : RÉBUS
     ========================================================= */
  let rebusDeck = [], rebusCur = null, rebusScore = 0, rebusStreak = 0, rebusDone = false;
  function nextRebus() {
    if (!rebusDeck.length) rebusDeck = shuffle(window.REBUS);
    rebusCur = rebusDeck.pop();
    rebusDone = false;
    $("#rebusEmoji").textContent = rebusCur.e;
    $("#rebusFeedback").textContent = "";
    const box = $("#rebusChoices");
    box.innerHTML = "";
    shuffle(rebusCur.choix).forEach((c) => {
      const b = document.createElement("button");
      b.textContent = c;
      b.addEventListener("click", () => answerRebus(b, c));
      box.appendChild(b);
    });
  }
  function answerRebus(btn, c) {
    if (rebusDone) return;
    if (c === rebusCur.r) {
      rebusDone = true;
      btn.classList.add("good");
      rebusScore += 10 + rebusStreak * 2;
      rebusStreak++;
      $("#rebusFeedback").textContent = pick(["Bravo ! 🎉", "Trop fort·e ! 🤩", "Exactement ! 💯", "Bien vu ! 👀"]);
      $$("#rebusChoices button").forEach((b) => (b.disabled = true));
      setTimeout(nextRebus, 1300);
    } else {
      btn.classList.add("bad");
      btn.disabled = true;
      rebusStreak = 0;
      $("#rebusFeedback").textContent = pick(["Raté 😅 essaie encore", "Presque… 🤏", "Non ! 🙈"]);
    }
    $("#rebusScore").textContent = rebusScore;
    $("#rebusStreak").textContent = rebusStreak;
  }
  $("#rebusHint").addEventListener("click", () => { if (rebusCur) $("#rebusFeedback").textContent = "💡 " + rebusCur.indice; });
  $("#rebusNext").addEventListener("click", () => { rebusStreak = 0; $("#rebusStreak").textContent = 0; nextRebus(); });
  nextRebus();

  /* =========================================================
     MINI-JEU 2 : EMOJI EXPRESS
     ========================================================= */
  let expScore = 0, expTime = 30, expTimer = null, expCur = null;
  let expBest = store.get("best", 0);
  $("#expBest").textContent = expBest;
  // seulement des mots clairs (pas les pronoms / nombres)
  const expPool = T.all.filter((it) => !["nombres"].includes(it.cat) && it.label.length > 2 && !/['’]/.test(it.label));

  function expRound() {
    expCur = pick(expPool);
    const others = shuffle(expPool.filter((x) => x.e !== expCur.e && x.cat === expCur.cat)).slice(0, 3);
    while (others.length < 3) others.push(pick(expPool.filter((x) => x.e !== expCur.e)));
    $("#expWord").textContent = expCur.label;
    const box = $("#expChoices");
    box.innerHTML = "";
    shuffle([expCur, ...others]).forEach((it) => {
      const b = document.createElement("button");
      b.textContent = it.e;
      b.addEventListener("click", () => {
        if (!expTimer) return;
        if (it.e === expCur.e) {
          expScore++;
          b.classList.add("good");
          $("#expFeedback").textContent = "✅ +1";
          $("#expScore").textContent = expScore;
          setTimeout(expRound, 250);
        } else {
          b.classList.add("bad");
          b.disabled = true;
          expTime = Math.max(0, expTime - 2);
          $("#expTime").textContent = expTime;
          $("#expFeedback").textContent = "❌ −2 s";
        }
      });
      box.appendChild(b);
    });
  }
  function expEnd() {
    clearInterval(expTimer); expTimer = null;
    $$("#expChoices button").forEach((b) => (b.disabled = true));
    let msg = "Terminé ! " + expScore + " point" + (expScore > 1 ? "s" : "") + " 🏁";
    if (expScore > expBest) { expBest = expScore; store.set("best", expBest); $("#expBest").textContent = expBest; msg += " — nouveau record ! 🏆"; }
    $("#expWord").textContent = "⏰ Temps écoulé";
    $("#expFeedback").textContent = msg;
    $("#expStart").hidden = false;
    $("#expStart").textContent = "🔁 Rejouer";
  }
  $("#expStart").addEventListener("click", () => {
    expScore = 0; expTime = 30;
    $("#expScore").textContent = 0; $("#expTime").textContent = 30; $("#expFeedback").textContent = "";
    $("#expStart").hidden = true;
    expRound();
    expTimer = setInterval(() => {
      expTime--;
      $("#expTime").textContent = Math.max(0, expTime);
      if (expTime <= 0) expEnd();
    }, 1000);
  });

  $$(".game-btn").forEach((b) => b.addEventListener("click", () => {
    $$(".game-btn").forEach((x) => x.classList.toggle("active", x === b));
    $("#game-rebus").hidden = b.dataset.game !== "rebus";
    $("#game-express").hidden = b.dataset.game !== "express";
    if (b.dataset.game !== "express" && expTimer) expEnd();
  }));

  /* =========================================================
     IDÉES
     ========================================================= */
  (function daily() {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    const it = T.all[(seed * 7919) % T.all.length];
    $("#dailyEmoji").textContent = it.e;
    const others = shownKeys(it).slice(1, 4);
    $("#dailyText").textContent = "« " + it.label + " »" + (others.length ? " — aussi : " + others.join(", ") : "");
  })();
  const sug = $("#suggestions");
  window.SUGGESTIONS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = p;
    b.addEventListener("click", () => loadPhrase(p));
    sug.appendChild(b);
  });

  /* =========================================================
     HISTORIQUE (local uniquement)
     ========================================================= */
  function saveHisto() {
    const f = fr.value.trim();
    const e = em.value.trim();
    if (!f || !e) return;
    let h = store.get("histo", []).filter((x) => x.f !== f);
    h.unshift({ f, e });
    store.set("histo", h.slice(0, 20));
  }
  function renderHisto() {
    const h = store.get("histo", []);
    const ul = $("#histo");
    ul.innerHTML = "";
    $("#histoEmpty").hidden = h.length > 0;
    h.forEach(({ f, e }) => {
      const li = document.createElement("li");
      li.innerHTML = '<span class="h-em"></span><span class="h-fr"></span>';
      li.firstChild.textContent = e;
      li.lastChild.textContent = f;
      li.title = "Recharger cette phrase";
      li.addEventListener("click", () => loadPhrase(f));
      ul.appendChild(li);
    });
  }
  $("#clearHisto").addEventListener("click", () => { store.set("histo", []); renderHisto(); toast("Historique vidé 🧹"); });

  showTab(store.get("tab", "dico"));
  render();
})();
