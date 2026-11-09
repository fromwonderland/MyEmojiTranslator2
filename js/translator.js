/* =========================================================
   Moteur de traduction Français ⇄ Emoji
   - expressions multi-mots (« je t'aime », « pomme de terre »)
   - verbes conjugués → infinitif (réguliers + irréguliers)
   - pluriels / féminins
   - mots vides ignorés, négation « ne … pas » → 🚫
   ========================================================= */
(function () {
  "use strict";

  const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = (s) => s.toLowerCase().replace(/[’`´]/g, "'");


  // Groupes : 1 emoji (dont drapeaux et touches 1️⃣) · 2 nombre décimal · 3 élision · 4 mot · 5 espaces
  //           6 ponctuation (les suites « ?! », « !!! », « ... » restent groupées)
  const TOKENS = new RegExp(
    "(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*|[0-9]\\uFE0F?\\u20E3|\\p{Regional_Indicator}{2})" +
    "|(\\d+(?:[.,]\\d+)+)" +
    "|(\\p{L}+')" +
    "|([\\p{L}\\p{N}]+(?:-[\\p{L}\\p{N}]+)*)" +
    "|(\\s+)" +
    "|([!?]+|\\.{2,}|[\\s\\S])", "gu");

  function tokenize(text) {
    const out = [];
    const t = norm(text);
    let m;
    TOKENS.lastIndex = 0;
    // On garde l'original pour l'affichage (norm conserve la longueur : apostrophes remplacées 1 pour 1)
    while ((m = TOKENS.exec(t))) {
      const raw = text.substr(m.index, m[0].length);
      if (m[1]) out.push({ type: "emoji", raw });
      else if (m[2] || m[3] || m[4]) out.push({ type: "word", raw, n: m[0] });
      else if (m[5]) out.push({ type: "space", raw });
      else out.push({ type: "punct", raw });
    }
    return out;
  }

  /* ---------- Assemblage avec la typographie française ----------
     - emojis collés entre eux, mots séparés par une espace
     - . , … ) ] collés au mot précédent
     - ( [ collés au mot suivant
     - ! ? : ; « » entourés d'espaces (règle française)
     - guillemets droits " : ouvrant collé à droite, fermant collé à gauche */
  const GLUE_BEFORE = /^[.,…)\]}]/;
  const GLUE_AFTER = /^[(\[{]$/;
  function assemble(pieces) {
    let out = "", prev = null, quoteOpen = false;
    for (const p of pieces) {
      if (p.kind === "br") { out = out.trimEnd() + "\n"; prev = null; continue; }
      let gb = false, ga = false;
      if (p.kind === "punct") {
        if (p.v === '"') { gb = quoteOpen; ga = !quoteOpen; quoteOpen = !quoteOpen; }
        else { gb = GLUE_BEFORE.test(p.v); ga = GLUE_AFTER.test(p.v); }
      }
      if (prev && !gb && !prev.glueAfter && !(prev.kind === "emoji" && p.kind === "emoji")) out += " ";
      out += p.v;
      prev = { kind: p.kind, glueAfter: ga };
    }
    return out.trim();
  }

  /* ---------- Construction des index ---------- */
  const exact = new Map();      // "pomme" → 🍎
  const loose = new Map();      // sans accents
  const phrases = new Map();    // "je t' aime" → ❤️ (clé = tokens joints par espace)
  let maxPhraseLen = 1;
  const reverse = new Map();    // 🍎 → "pomme"
  const all = [];               // [{e, label, keys, cat}]

  function addKey(key, emoji) {
    const toks = tokenize(key).filter((t) => t.type === "word").map((t) => t.n);
    if (!toks.length) return;
    if (toks.length === 1) {
      if (!exact.has(toks[0])) exact.set(toks[0], emoji);
      const l = stripAccents(toks[0]);
      if (!loose.has(l)) loose.set(l, emoji);
    } else {
      const k = toks.join(" ");
      if (!phrases.has(k)) phrases.set(k, emoji);
      const kl = stripAccents(k);
      if (!phrases.has(kl)) phrases.set(kl, emoji);
      maxPhraseLen = Math.max(maxPhraseLen, toks.length);
    }
  }

  window.EMOJI_DICT.forEach((cat) => {
    cat.items.forEach(([e, kw]) => {
      const keys = kw.split("|");
      all.push({ e, label: keys[0], keys, cat: cat.id });
      if (!reverse.has(e)) reverse.set(e, keys[0]);
      keys.forEach((k) => addKey(k, e));
    });
  });

  // Expressions bonus (pas dans le dico visuel)
  const EXTRA = {
    "je t'aime": "🙋❤️👉", "je vous aime": "🙋❤️👉", "je t'adore": "🙋😍👉",
    "bonne nuit": "🌙😴", "bon anniversaire": "🎂🥳", "joyeux anniversaire": "🎂🥳",
    "joyeux noël": "🎄🎅", "bonne année": "🥂🎆", "bon week-end": "😎🎉",
    "bonne journée": "☀️😊", "bonne soirée": "🌙😊", "à demain": "👋📅",
    "à bientôt": "👋⌛", "quelle heure": "❓⏰", "tout le monde": "👥🌍",
    "beaucoup": "➕➕", "un peu": "🤏", "pomme de terre": "🥔",
    "mort de rire": "😂", "coup de foudre": "⚡😍", "il fait beau": "☀️😎",
    "il fait froid": "🥶", "il fait chaud": "🥵", "j'ai faim": "🙋🍽️",
    "j'ai soif": "🙋🥤", "en retard": "⏰💨", "de tout mon coeur": "💯❤️",
    "de tout mon cœur": "💯❤️", "pas de souci": "👌", "pas de problème": "👌",
    "comment ça va": "👋❓", "ça va": "🆗", "n'importe quoi": "🤦",
    "c'est-à-dire": "🟰", "c'est-a-dire": "🟰",
  };
  Object.entries(EXTRA).forEach(([k, e]) => {
    const toks = tokenize(k).filter((t) => t.type === "word").map((t) => t.n);
    if (toks.length === 1) { exact.set(toks[0], e); loose.set(stripAccents(toks[0]), e); return; }
    phrases.set(toks.join(" "), e);
    phrases.set(stripAccents(toks.join(" ")), e);
    maxPhraseLen = Math.max(maxPhraseLen, toks.length);
  });

  /* ---------- Lemmatisation légère ---------- */
  const VERB_ER = ["eraient", "erions", "eriez", "erons", "eront", "erais", "erait", "erez", "erai", "eras", "era",
    "aient", "ions", "iez", "ais", "ait", "ant", "ons", "ent", "ées", "és", "ée", "ez", "es", "é", "e", "a"];
  const VERB_IR = ["issaient", "issons", "issez", "issent", "issais", "issait", "irai", "iras", "ira", "is", "it", "ie", "i"];
  const VERB_RE = ["ons", "ez", "ent", "ais", "ait", "u", "s", "t"];

  function lookupWord(w) {
    return exact.get(w) || loose.get(stripAccents(w));
  }

  function candidates(w) {
    const c = [];
    // pluriel / féminin
    if (/aux$/.test(w)) c.push(w.replace(/aux$/, "al"));
    if (/[sx]$/.test(w)) c.push(w.slice(0, -1));
    if (/euses?$/.test(w)) c.push(w.replace(/euses?$/, "eux"), w.replace(/euses?$/, "eur"));
    if (/ives?$/.test(w)) c.push(w.replace(/ives?$/, "if"));
    if (/ères?$/.test(w)) c.push(w.replace(/ères?$/, "er"));
    if (/es?$/.test(w)) c.push(w.replace(/es?$/, ""));
    if (/ment$/.test(w)) c.push(w.replace(/ement$/, "e"), w.replace(/ment$/, ""));
    // verbes
    for (const s of VERB_ER) if (w.endsWith(s) && w.length - s.length >= 2) {
      let stem = w.slice(0, -s.length);
      if (/ge$/.test(stem) && /^[ao]/.test(s)) stem = stem.slice(0, -1);   // mangeons → mang
      if (/ç$/.test(stem)) stem = stem.slice(0, -1) + "c";                   // commençons
      c.push(stem + "er");
    }
    for (const s of VERB_IR) if (w.endsWith(s) && w.length - s.length >= 2) c.push(w.slice(0, -s.length) + "ir");
    for (const s of VERB_RE) if (w.endsWith(s) && w.length - s.length >= 2) c.push(w.slice(0, -s.length) + "re");
    return c;
  }

  // Retourne { e: "emoji" } | { skip: true } | null
  function translateWord(w) {
    const S = window.STOPWORDS;
    if (S.has(w)) return { skip: true };
    let e = exact.get(w);
    if (e) return { e };
    if (w in window.VERBES_ALIAS) return window.VERBES_ALIAS[w] ? { e: window.VERBES_ALIAS[w] } : { skip: true };
    const irr = window.IRREGULIERS[w] || window.IRREGULIERS[stripAccents(w)];
    if (irr) {
      const A = window.VERBES_ALIAS;
      if (irr in A) return A[irr] ? { e: A[irr] } : { skip: true };
      e = lookupWord(irr);
      if (e) return { e };
    }
    e = loose.get(stripAccents(w));
    if (e) return { e };
    for (const c of candidates(w)) {
      e = lookupWord(c);
      if (e) return { e };
      if (c in window.VERBES_ALIAS) return window.VERBES_ALIAS[c] ? { e: window.VERBES_ALIAS[c] } : { skip: true };
    }
    // Nombres (entiers ou décimaux : 3,5 → 3️⃣,5️⃣)
    if (/^\d+(?:[.,]\d+)*$/.test(w)) {
      return { e: [...w].map((d) => (/\d/.test(d) ? d + "️⃣" : d)).join("") };
    }
    // Mot composé inconnu : on traduit chaque morceau (« grand-mère » déjà connu, « porte-clé » → 🚪🔑)
    if (w.includes("-")) {
      const parts = w.split("-").map(translateWord).filter((r) => r && r.e).map((r) => r.e);
      if (parts.length) return { e: [...new Set(parts)].join("") };
    }
    return null;
  }

  /* ---------- Traduction FR → Emoji ---------- */
  // mode: "mix" (garde les mots inconnus) | "pure" (100 % emoji)
  function toEmoji(text, mode = "mix") {
    const toks = tokenize(text);
    const pieces = [];   // {kind: "emoji"|"word"|"punct"|"br", v}
    const details = [];  // [{src, e}]
    let known = 0, total = 0;

    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.type === "space") { if (t.raw.includes("\n")) pieces.push({ kind: "br", v: "\n" }); continue; }
      if (t.type === "emoji") { pieces.push({ kind: "emoji", v: t.raw }); continue; }
      if (t.type === "punct") {
        const p = t.raw;
        if (mode === "pure") {
          // ? → ❓  ! → ❗ (sans doubler un ❓ déjà produit par « quoi », « qui »…)
          [...p].forEach((c, idx) => {
            const e = c === "?" ? "❓" : c === "!" ? "❗" : null;
            if (!e) return;
            const last = pieces[pieces.length - 1];
            if (idx === 0 && last && last.v === e) return;
            pieces.push({ kind: "emoji", v: e });
          });
        } else if (!/^['’\-]$/.test(p)) pieces.push({ kind: "punct", v: p });
        continue;
      }

      // Mot : on cherche d'abord la plus longue expression possible
      const words = [];
      for (let j = i; j < toks.length && words.length < maxPhraseLen; j++) {
        if (toks[j].type === "word") words.push({ j, n: toks[j].n, raw: toks[j].raw });
        else if (toks[j].type === "space" && !toks[j].raw.includes("\n")) continue;
        else break;
      }
      let matched = false;
      for (let len = words.length; len >= 2; len--) {
        const key = words.slice(0, len).map((w) => w.n).join(" ");
        const e = phrases.get(key) || phrases.get(stripAccents(key));
        if (e) {
          const src = text.slice(0, 0) + words.slice(0, len).map((w) => w.raw).join(" ").replace(/' /g, "'");
          const lastP = pieces[pieces.length - 1];
          if (!(lastP && lastP.v === e)) pieces.push({ kind: "emoji", v: e });
          details.push({ src, e });
          known += len; total += len;
          i = words[len - 1].j;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      total++;
      const r = translateWord(t.n);
      if (r && r.e) {
        known++;
        // évite les doublons consécutifs (« ne … pas » → 🚫🚫, « je reste à la maison » → 🏠🏠)
        const last = pieces[pieces.length - 1];
        if (!(last && last.v === r.e)) pieces.push({ kind: "emoji", v: r.e });
        details.push({ src: t.raw, e: r.e });
      } else if (r && r.skip) {
        total--;
      } else if (mode === "mix") {
        pieces.push({ kind: "word", v: t.raw.replace(/'$/, "") });
      }
    }

    return { text: assemble(pieces), details, known, total };
  }

  /* ---------- Traduction Emoji → FR ---------- */
  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("fr", { granularity: "grapheme" }) : null;
  function graphemes(s) {
    return segmenter ? [...segmenter.segment(s)].map((x) => x.segment) : Array.from(s);
  }
  const bare = (e) => e.replace(/️/g, "");
  const reverseBare = new Map([...reverse].map(([e, l]) => [bare(e), l]));

  function toFrench(text) {
    const pieces = [];
    let buf = "";
    const flush = () => { if (buf) { pieces.push({ kind: "word", v: buf }); buf = ""; } };
    for (const g of graphemes(text)) {
      if (g === "\n") { flush(); pieces.push({ kind: "br" }); continue; }
      if (/^\s+$/.test(g)) {
        flush();
        const last = pieces[pieces.length - 1];
        if (last) last.justAdded = false;
        continue;
      }
      const l = reverse.get(g) || reverseBare.get(bare(g));
      if (l) { flush(); pieces.push({ kind: "word", v: l }); }
      else if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) { flush(); pieces.push({ kind: "word", v: g }); }
      else if (/^[\p{P}]$/u.test(g) && !/['’\-]/.test(g)) {
        // ponctuation : les suites « ?! » ou « ... » restent groupées
        flush();
        const last = pieces[pieces.length - 1];
        if (last && last.kind === "punct" && /^[!?.]+$/.test(last.v + g) && last.justAdded) last.v += g;
        else pieces.push({ kind: "punct", v: g, justAdded: true });
        continue;
      }
      else buf += g;   // texte normal : on recolle les lettres
      const last = pieces[pieces.length - 1];
      if (last) last.justAdded = false;
    }
    flush();
    return assemble(pieces);
  }

  window.Translator = { toEmoji, toFrench, all, reverse, tokenize };
})();
