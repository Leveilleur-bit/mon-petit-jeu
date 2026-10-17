/* Mon petit jeu — petits jeux éducatifs, consignes à l'oral, sans pub ni compte. */
'use strict';
(() => {
  // ---------- Outils ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const rand = n => Math.floor(Math.random() * n);
  const pick = a => a[rand(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('mpj.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mpj.' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : on continue */ } }
  };

  // ---------- Réglages ----------
  const DEFAULTS = {
    volume: 1, rate: 0.9, effects: true, name: '', names: [],
    countMax: 30, letters: 'simple', timeLimit: 0,
    games: { potager: true, compter: true, couleurs: true, lettres: true, animaux: true, memory: true, puzzle: true, lire: true, prenom: true, formes: true, tailles: true, ombres: true, coloriage: true, musique: true },
    homeMode: 'rotate', favs: ['memory']
  };
  const saved = store.get('settings', {});
  const settings = Object.assign({}, DEFAULTS, saved, { games: Object.assign({}, DEFAULTS.games, saved.games || {}) });
  const saveSettings = () => store.set('settings', settings);

  // ---------- Voix ----------
  const hasTTS = 'speechSynthesis' in window;
  let frVoice = null;
  function pickVoice() {
    if (!hasTTS) return;
    const vs = speechSynthesis.getVoices();
    frVoice = vs.find(v => /^fr[-_]FR/i.test(v.lang) && /google/i.test(v.name) && v.localService)
      || vs.find(v => /^fr[-_]FR/i.test(v.lang) && v.localService)
      || vs.find(v => /^fr[-_]FR/i.test(v.lang))
      || vs.find(v => /^fr/i.test(v.lang)) || null;
  }
  if (hasTTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  let sayId = 0;
  function say(text) {
    return new Promise(resolve => {
      const id = ++sayId;
      const btn = $('#btn-repeat');
      if (!hasTTS || !text) { resolve(); return; }
      speechSynthesis.cancel();
      // petit délai : sur Android, parler juste après cancel() est parfois ignoré
      setTimeout(() => {
        if (id !== sayId) { resolve(); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        if (frVoice) u.voice = frVoice;
        u.rate = settings.rate; u.pitch = 1.1; u.volume = settings.volume;
        let done = false;
        const fin = () => { if (done) return; done = true; if (id === sayId) btn.classList.remove('speaking'); resolve(); };
        u.onend = fin; u.onerror = fin;
        setTimeout(fin, 1500 + text.length * 110 / settings.rate);
        btn.classList.add('speaking');
        speechSynthesis.speak(u);
      }, 60);
    });
  }
  const hush = () => { sayId++; if (hasTTS) speechSynthesis.cancel(); };

  // ---------- Bruitages (synthétisés, aucun fichier) ----------
  let ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function note(freq, at, dur, type = 'triangle', vol = 0.16) {
    const a = audio(); if (!a || !settings.effects) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = a.currentTime + at;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * settings.volume + 0.0001, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    tap() { note(700, 0, 0.09, 'sine', 0.12); },
    good() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.08, 0.28)); },
    soft() { note(392, 0, 0.18, 'sine', 0.12); note(330, 0.13, 0.25, 'sine', 0.1); },
    count(k) { note(392 * Math.pow(2, Math.min(k, 24) / 24), 0, 0.13, 'triangle', 0.13); },
    fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => note(f, i * 0.13, 0.32, 'square', 0.06)); note(1047, 0.8, 0.6, 'triangle', 0.12); }
  };

  // ---------- Données ----------
  const POTAGER = [
    { e: '🥕', n: 'la carotte' }, { e: '🍅', n: 'la tomate' }, { e: '🫑', n: 'le poivron' },
    { e: '🥦', n: 'le brocoli' }, { e: '🍆', n: "l'aubergine" }, { e: '🌽', n: 'le maïs' },
    { e: '🥔', n: 'la pomme de terre' }, { e: '🥒', n: 'le concombre' }, { e: '🥬', n: 'la salade' },
    { e: '🧅', n: "l'oignon" }, { e: '🧄', n: "l'ail" }, { e: '🎃', n: 'la citrouille' },
    { e: '🍓', n: 'la fraise' }, { e: '🍎', n: 'la pomme' }, { e: '🍐', n: 'la poire' },
    { e: '🍌', n: 'la banane' }, { e: '🍒', n: 'les cerises', pl: true }, { e: '🍇', n: 'le raisin' },
    { e: '🍊', n: "l'orange" }, { e: '🍋', n: 'le citron' }, { e: '🍉', n: 'la pastèque' },
    { e: '🍍', n: "l'ananas" }, { e: '🥝', n: 'le kiwi' }, { e: '🫐', n: 'les myrtilles', pl: true }
  ];

  const COLORS = [
    { n: 'rouge', hex: '#E53935' }, { n: 'bleu', hex: '#1E63D6' }, { n: 'jaune', hex: '#FFD21F' },
    { n: 'vert', hex: '#2EAD4B' }, { n: 'orange', hex: '#FF8A1F' }, { n: 'violet', hex: '#8E44C9' },
    { n: 'rose', hex: '#FF7EB6' }, { n: 'marron', hex: '#8B5A2B' }, { n: 'noir', hex: '#1E1E24' },
    { n: 'blanc', hex: '#FFFFFF' }, { n: 'gris', hex: '#9AA0A6' }
  ];

  // say = nom de la lettre écrit pour que la voix le prononce bien
  const LETTERS = [
    { l: 'A', say: 'a', w: 'abeille', e: '🐝' }, { l: 'B', say: 'bé', w: 'ballon', e: '🎈' },
    { l: 'C', say: 'cé', w: 'cadeau', e: '🎁' }, { l: 'D', say: 'dé', w: 'dauphin', e: '🐬' },
    { l: 'E', say: 'euh', w: 'escargot', e: '🐌' }, { l: 'F', say: 'effe', w: 'fraise', e: '🍓' },
    { l: 'G', say: 'gé', w: 'gâteau', e: '🎂' }, { l: 'H', say: 'ache', w: 'hibou', e: '🦉' },
    { l: 'I', say: 'i', w: 'île', e: '🏝️' }, { l: 'J', say: 'ji', w: 'jus', e: '🧃' },
    { l: 'K', say: 'ka', w: 'koala', e: '🐨' }, { l: 'L', say: 'elle', w: 'lapin', e: '🐰' },
    { l: 'M', say: 'emme', w: 'maison', e: '🏠' }, { l: 'N', say: 'enne', w: 'nuage', e: '☁️' },
    { l: 'O', say: 'o', w: 'ours', e: '🐻' }, { l: 'P', say: 'pé', w: 'pomme', e: '🍎' },
    { l: 'Q', say: 'ku', w: 'quatre', e: '4️⃣' }, { l: 'R', say: 'erre', w: 'renard', e: '🦊' },
    { l: 'S', say: 'esse', w: 'soleil', e: '☀️' }, { l: 'T', say: 'té', w: 'tortue', e: '🐢' },
    { l: 'U', say: 'u', w: 'usine', e: '🏭' }, { l: 'V', say: 'vé', w: 'vache', e: '🐮' },
    { l: 'W', say: 'double vé', w: 'wagon', e: '🚃' }, { l: 'X', say: 'iksse', w: 'xylophone', e: '🎶' },
    { l: 'Y', say: 'i grec', w: 'yoyo', e: '🪀' }, { l: 'Z', say: 'zède', w: 'zèbre', e: '🦓' }
  ];
  const SIMPLE_LETTERS = ['A', 'E', 'I', 'O', 'U', 'B', 'L', 'M', 'P', 'S', 'T'];

  const ANIMALS = [
    { e: '🐮', n: 'la vache', cri: 'meuh' }, { e: '🐱', n: 'le chat', cri: 'miaou' },
    { e: '🐶', n: 'le chien', cri: 'ouaf ouaf' }, { e: '🐑', n: 'le mouton', cri: 'bêêh' },
    { e: '🐷', n: 'le cochon', cri: 'groin groin' }, { e: '🐔', n: 'la poule', cri: 'cot cot codet' },
    { e: '🦆', n: 'le canard', cri: 'coin coin' }, { e: '🐸', n: 'la grenouille', cri: 'croa croa' },
    { e: '🐭', n: 'la souris', cri: 'couic couic' }, { e: '🦉', n: 'le hibou', cri: 'hou hou' },
    { e: '🐓', n: 'le coq', cri: 'cocorico' }, { e: '🐺', n: 'le loup', cri: 'ahouuu' }
  ];

  const COUNT_ITEMS = [
    { e: '🍓', sg: 'fraise', pl: 'fraises', f: true }, { e: '🥕', sg: 'carotte', pl: 'carottes', f: true },
    { e: '🍅', sg: 'tomate', pl: 'tomates', f: true }, { e: '🍎', sg: 'pomme', pl: 'pommes', f: true },
    { e: '🐞', sg: 'coccinelle', pl: 'coccinelles', f: true }, { e: '🌸', sg: 'fleur', pl: 'fleurs', f: true },
    { e: '⭐', sg: 'étoile', pl: 'étoiles', f: true }, { e: '🐟', sg: 'poisson', pl: 'poissons' },
    { e: '🎈', sg: 'ballon', pl: 'ballons' }, { e: '🦋', sg: 'papillon', pl: 'papillons' },
    { e: '🐥', sg: 'poussin', pl: 'poussins' }, { e: '🐌', sg: 'escargot', pl: 'escargots' }
  ];
  const numWord = (k, fem) => {
    if (!fem) return String(k);
    if (k === 1) return 'une';
    if (k === 21) return 'vingt et une';
    return String(k);
  };

  const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Bien joué !', 'Oui !', 'Trop fort !', 'Youpi !'];
  const praise = () => {
    const p = pick(PRAISE);
    return settings.name && Math.random() < 0.35 ? p.replace(' !', ' ' + settings.name + ' !') : p;
  };

  // ---------- Construction des questions « trouve le bon » ----------
  function pickNew(pool, G, key) {
    const fresh = pool.filter(x => !G.used.has(key(x)));
    const t = pick(fresh.length ? fresh : pool);
    G.used.add(key(t));
    return t;
  }
  function others(pool, t, n, ok = () => true) { return shuffle(pool.filter(x => x !== t && ok(x))).slice(0, n); }

  const GAMES = {
    potager: {
      name: 'Fruits et légumes', intro: 'Les fruits et les légumes !', icon: '🥕', color: '#FF8A1F', rounds: 5,
      make(G) {
        const t = pickNew(POTAGER, G, x => x.n);
        const where = x => (x.pl ? 'Où sont ' : 'Où est ') + x.n + ' ?';
        const is = x => (x.pl ? 'ce sont ' : "c'est ") + x.n;
        return {
          prompt: where(t), success: cap(is(t)) + ' !',
          choices: shuffle([t, ...others(POTAGER, t, 2)]).map(o => ({
            html: `<span class="emo">${o.e}</span>`, label: o.n, correct: o === t,
            wrong: `Ça, ${is(o)}. ${where(t)}`
          }))
        };
      }
    },
    compter: {
      name: 'Compter', intro: 'On compte !', icon: '🍓', color: '#EF4F6C', rounds: 3, counting: true, full: true,
      make(G) { return { custom: countQuestion }; }
    },
    memory: {
      name: 'Memory', intro: 'Le memory !', icon: '👑', color: '#D85FA8', rounds: 1, full: true,
      make(G) { return { custom: memoryGame }; }
    },
    puzzle: {
      name: 'Puzzles', intro: 'Les puzzles !', icon: '🧩', color: '#2BA7A0', rounds: 1, full: true,
      make(G) { return { custom: puzzleGame }; }
    },
    formes: {
      name: 'Formes', intro: 'Les formes !', icon: '🔷', color: '#1E9BD6', rounds: 5,
      make(G) {
        const t = pickNew(SHAPES, G, x => x.n);
        const cols = shuffle(SHAPE_COLORS);
        return {
          prompt: `Où est ${t.n} ?`, success: `C'est ${t.n} !`,
          choices: shuffle([t, ...others(SHAPES, t, 2)]).map((o, i) => ({
            html: shapeSvg(o, cols[i]), label: o.n, correct: o === t,
            wrong: `Ça, c'est ${o.n}. Où est ${t.n} ?`
          }))
        };
      }
    },
    tailles: {
      name: 'Grand et petit', intro: 'Le plus grand, le plus petit !', icon: '🐘', color: '#7A5BD6', rounds: 5,
      make(G) {
        const e = pickNew(SIZE_ITEMS, G, x => x);
        const big = G.n % 2 === 0;
        const want = big ? 'le plus grand' : 'le plus petit';
        const target = big ? 'grand' : 'petit';
        const sizes = [{ s: 0.36, k: 'petit' }, { s: 0.64, k: 'moyen' }, { s: 1, k: 'grand' }];
        return {
          prompt: `Touche ${want} !`, success: `C'est ${want} !`, row: true, cls: 'sizes',
          choices: shuffle(sizes).map(z => ({
            html: `<span class="emo" style="transform:scale(${z.s})">${e}</span>`, label: z.k, correct: z.k === target,
            wrong: z.k === 'moyen' ? `Celui-là est moyen. Cherche ${want} !` : `Celui-là, c'est ${z.k === 'grand' ? 'le plus grand' : 'le plus petit'} ! Cherche ${want} !`
          }))
        };
      }
    },
    ombres: {
      name: 'Les ombres', intro: 'Les ombres !', icon: '🦒', color: '#4A5596', rounds: 5,
      make(G) {
        const t = pickNew(SHADOWS, G, x => x.n);
        const hint = el('button', 'hint big', `<span class="emo">${t.e}</span>`);
        hint.setAttribute('aria-label', 'Écouter encore');
        hint.onclick = repeat;
        return {
          visual: hint,
          prompt: `Où est l'ombre ${deN(t.n)} ?`, success: `C'est l'ombre ${deN(t.n)} !`,
          choices: shuffle([t, ...others(SHADOWS, t, 2)]).map(o => ({
            html: `<span class="emo shadow">${o.e}</span>`, label: "l'ombre " + deN(o.n), correct: o === t,
            wrong: `Ça, c'est l'ombre ${deN(o.n)}. Cherche l'ombre ${deN(t.n)} !`
          }))
        };
      }
    },
    coloriage: {
      name: 'Coloriage', intro: 'Le coloriage !', icon: '🖍️', color: '#E53935', rounds: 1, full: true,
      make(G) { return { custom: colorGame }; }
    },
    musique: {
      name: 'Musique', intro: 'La musique !', icon: '🎵', color: '#16A3A3', rounds: 1, full: true,
      make(G) { return { custom: musicGame }; }
    },
    prenom: {
      name: 'Mon prénom', intro: 'On écrit ton prénom !', icon: '✏️', color: '#2C7BE5', rounds: 1, full: true,
      make(G) { return { custom: nameGame }; }
    },
    lire: {
      name: 'Lire', intro: 'On lit les mots !', icon: '📖', color: '#E07A2E', rounds: 3, full: true,
      make(G) { return { custom: readGame }; }
    },
    couleurs: {
      name: 'Couleurs', intro: 'Les couleurs !', icon: '🎨', color: '#8E44C9', rounds: 5,
      make(G) {
        const t = pickNew(COLORS, G, x => x.n);
        return {
          prompt: `Où est le ${t.n} ?`, success: `C'est le ${t.n} !`,
          choices: shuffle([t, ...others(COLORS, t, 2)]).map(o => ({
            html: `<span class="splat" style="--paint:${o.hex}"></span>`, label: o.n, correct: o === t,
            wrong: `Ça, c'est le ${o.n}. Où est le ${t.n} ?`
          }))
        };
      }
    },
    lettres: {
      name: 'Lettres', intro: 'Les lettres !', icon: '🔤', color: '#1E63D6', rounds: 5,
      make(G) {
        const pool = letterPool();
        // les lettres du prénom d'abord
        const nameL = nameLetters().filter(l => !G.used.has(l.l));
        const t = nameL.length && Math.random() < 0.6 ? (G.used.add(nameL[0].l), nameL[0]) : pickNew(pool, G, x => x.l);
        const distract = others(pool.length >= 3 ? pool : LETTERS, t, 2);
        const hint = el('button', 'hint', `<span class="emo">${t.e}</span><span class="word"><b>${t.w.charAt(0).toUpperCase()}</b>${t.w.slice(1)}</span>`);
        hint.setAttribute('aria-label', 'Écouter encore');
        hint.onclick = repeat;
        return {
          visual: hint,
          prompt: `Où est la lettre ${t.say} ? ${t.say}, comme ${t.w} !`,
          success: `C'est la lettre ${t.say}, comme ${t.w} !`,
          caption: `Où est la lettre ${t.l} ?`,
          choices: shuffle([t, ...distract]).map(o => ({
            html: `<span class="letter">${o.l}</span>`, label: 'lettre ' + o.l, correct: o === t,
            wrong: `Ça, c'est la lettre ${o.say}. Cherche la lettre ${t.say} !`
          }))
        };
      }
    },
    animaux: {
      name: 'Animaux', intro: 'Les animaux !', icon: '🐮', color: '#3F9A43', rounds: 5,
      make(G) {
        const t = pickNew(ANIMALS, G, x => x.n);
        const bubble = el('button', 'bubble', `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path class="stroke" d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>${cap(t.cri)} !`);
        bubble.setAttribute('aria-label', 'Écouter encore');
        bubble.onclick = repeat;
        return {
          visual: bubble,
          prompt: `Qui fait ${t.cri} ?`, success: `${cap(t.n)} fait ${t.cri} !`,
          choices: shuffle([t, ...others(ANIMALS, t, 2)]).map(o => ({
            html: `<span class="emo">${o.e}</span>`, label: o.n, correct: o === t,
            wrong: `Ça, c'est ${o.n}, ${o.n.startsWith('l\'') ? 'elle' : (o.n.startsWith('la') ? 'elle' : 'il')} fait ${o.cri} ! Qui fait ${t.cri} ?`
          }))
        };
      }
    }
  };
  const ORDER = ['potager', 'compter', 'couleurs', 'lettres', 'animaux', 'memory', 'puzzle', 'lire', 'prenom', 'formes', 'tailles', 'ombres', 'coloriage', 'musique'];

  function letterPool() {
    const base = settings.letters === 'all' ? LETTERS : LETTERS.filter(x => SIMPLE_LETTERS.includes(x.l));
    const extra = nameLetters().filter(x => !base.includes(x));
    return base.concat(extra);
  }
  function nameLetters() {
    const n = (settings.name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const seen = new Set(); const out = [];
    for (const ch of n) { const L = LETTERS.find(x => x.l === ch); if (L && !seen.has(ch)) { seen.add(ch); out.push(L); } }
    return out;
  }

  // ---------- Compter ----------
  const countLevel = () => Math.min(store.get('countLevel', 5), settings.countMax);
  function countQuestion(G, f) {
    const lvl = countLevel();
    const lo = Math.max(1, Math.floor(lvl / 2));
    let n; let tries = 0;
    do { n = lo + rand(lvl - lo + 1); } while (G.usedN.has(n) && tries++ < 10);
    G.usedN.add(n);
    const it = pickNew(COUNT_ITEMS, G, x => x.pl);

    const stage = $('#stage'), ch = $('#choices');
    const counter = el('div', 'counter', '');
    const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : n <= 12 ? 4 : n <= 20 ? 5 : 6;
    const sz = n <= 4 ? 64 : n <= 9 ? 50 : n <= 16 ? 40 : n <= 25 ? 32 : 28;
    const grid = el('div', 'countgrid');
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--sz', sz + 'px');
    if (n <= 3) grid.style.maxWidth = (n * 130) + 'px';
    let k = 0;
    for (let i = 0; i < n; i++) {
      const b = el('button', 'item', it.e);
      b.style.animationDelay = Math.min(i * 25, 600) + 'ms';
      b.setAttribute('aria-label', it.sg);
      b.onclick = () => {
        if (f !== G.flow || b.classList.contains('done')) return;
        audio();
        k++;
        b.classList.add('done');
        b.append(el('span', 'badge', String(k)));
        counter.textContent = k;
        counter.classList.remove('bump'); void counter.offsetWidth; counter.classList.add('bump');
        sfx.count(k);
        say(numWord(k, it.f));
        if (k === n) phase2();
      };
      grid.append(b);
    }
    stage.append(counter, grid);
    G.prompt = `Compte les ${it.pl} ! Touche chaque ${it.sg}.`;
    $('#caption').textContent = `Compte les ${it.pl} !`;
    say(G.prompt);

    async function phase2() {
      await sleep(650);
      if (f !== G.flow) return;
      await say(`Il y a ${numWord(n, it.f)} ${n > 1 ? it.pl : it.sg} !`);
      if (f !== G.flow) return;
      const maxN = Math.max(lvl, n + 3);
      const cands = shuffle([n - 1, n + 1, n - 2, n + 2, n + 3, n - 3, n + 10, n - 10].filter(x => x >= 1 && x <= maxN && x !== n));
      const opts = shuffle([n, ...[...new Set(cands)].slice(0, 2)]);
      const q = {
        prompt: `Où est le ${n} ?`, success: `Il y a ${numWord(n, it.f)} ${n > 1 ? it.pl : it.sg} !`,
        choices: opts.map(o => ({
          html: `<span class="num">${o}</span>`, label: String(o), correct: o === n,
          wrong: `Ça, c'est le ${o}. Cherche le ${n} !`
        }))
      };
      renderChoices(q, f, true);
    }
  }

  // ---------- Petit outil : une manche gagnée (jeux sans choix multiples) ----------
  async function roundWon(f) {
    sfx.good();
    const dot = $$('.dot')[G.n];
    if (dot) { dot.classList.add('on'); dot.textContent = '⭐'; }
    await Promise.all([say(praise()), sleep(1000)]);
    if (f !== G.flow) return;
    G.n++;
    nextQ();
  }

  // ---------- Memory princesse ----------
  const PRINCESS = [
    { e: '👸', n: 'la princesse' }, { e: '👑', n: 'la couronne' }, { e: '🏰', n: 'le château' },
    { e: '🦄', n: 'la licorne' }, { e: '💎', n: 'le diamant' }, { e: '🧚', n: 'la fée' },
    { e: '🪄', n: 'la baguette magique' }, { e: '🌹', n: 'la rose' }, { e: '🎀', n: 'le nœud' },
    { e: '🐸', n: 'la grenouille' }, { e: '👗', n: 'la robe' }, { e: '🪞', n: 'le miroir' }
  ];
  const MEMORY_LEVELS = [3, 4, 5, 6];
  const memoryPairs = () => MEMORY_LEVELS[Math.min(store.get('memoryWins', 0), MEMORY_LEVELS.length - 1)];
  const MEMORY_THEMES = [
    { id: 'princesse', e: '👑', n: 'les princesses', bg: '#FFD6EC', b1: '#F48FC4', b2: '#B48BE8', bd: '#C9579A', items: PRINCESS },
    { id: 'animaux', e: '🐶', n: 'les animaux', bg: '#FFE9C7', b1: '#FFB458', b2: '#F07F3C', bd: '#C25E1F', items: [
      { e: '🐶', n: 'le chien' }, { e: '🐱', n: 'le chat' }, { e: '🐰', n: 'le lapin' }, { e: '🐼', n: 'le panda' }, { e: '🦁', n: 'le lion' },
      { e: '🐸', n: 'la grenouille' }, { e: '🐷', n: 'le cochon' }, { e: '🐨', n: 'le koala' }, { e: '🦊', n: 'le renard' }, { e: '🐵', n: 'le singe' }] },
    { id: 'mer', e: '🐠', n: 'la mer', bg: '#D7EEFF', b1: '#5BC0F0', b2: '#2D7FD3', bd: '#1D5FA6', items: [
      { e: '🐠', n: 'le poisson' }, { e: '🐙', n: 'la pieuvre' }, { e: '🐬', n: 'le dauphin' }, { e: '🐳', n: 'la baleine' }, { e: '🦀', n: 'le crabe' },
      { e: '🐢', n: 'la tortue' }, { e: '🐚', n: 'le coquillage' }, { e: '🦈', n: 'le requin' }, { e: '🧜‍♀️', n: 'la sirène' }, { e: '⛵', n: 'le bateau' }] },
    { id: 'fruits', e: '🍓', n: 'les fruits', bg: '#FFE0E0', b1: '#FF7A7A', b2: '#E8475B', bd: '#B5303F', items: [
      { e: '🍓', n: 'la fraise' }, { e: '🍎', n: 'la pomme' }, { e: '🍌', n: 'la banane' }, { e: '🍒', n: 'les cerises' }, { e: '🍇', n: 'le raisin' },
      { e: '🍊', n: "l'orange" }, { e: '🍉', n: 'la pastèque' }, { e: '🍐', n: 'la poire' }, { e: '🥝', n: 'le kiwi' }, { e: '🍍', n: "l'ananas" }] },
    { id: 'vehicules', e: '🚒', n: 'les véhicules', bg: '#DDE3FF', b1: '#7D8CF0', b2: '#4A5BD0', bd: '#33409E', items: [
      { e: '🚗', n: 'la voiture' }, { e: '🚒', n: 'le camion de pompiers' }, { e: '🚜', n: 'le tracteur' }, { e: '🚂', n: 'le train' }, { e: '✈️', n: "l'avion" },
      { e: '🚀', n: 'la fusée' }, { e: '🚁', n: "l'hélicoptère" }, { e: '🚲', n: 'le vélo' }, { e: '⛵', n: 'le bateau' }, { e: '🚌', n: 'le bus' }] },
    { id: 'douceurs', e: '🧁', n: 'les gourmandises', bg: '#FFF1CC', b1: '#FFCF5C', b2: '#F59BC0', bd: '#C98A1E', items: [
      { e: '🧁', n: 'le petit gâteau' }, { e: '🍭', n: 'la sucette' }, { e: '🍦', n: 'la glace' }, { e: '🍩', n: 'le beignet' }, { e: '🍪', n: 'le biscuit' },
      { e: '🍫', n: 'le chocolat' }, { e: '🎂', n: "le gâteau d'anniversaire" }, { e: '🍬', n: 'le bonbon' }, { e: '🥞', n: 'les crêpes' }, { e: '🍰', n: 'la part de gâteau' }] }
  ];
  function memoryGame(G, f) {
    const th = MEMORY_THEMES.find(t => t.id === G.opts.theme);
    if (th) { memoryBoard(G, f, th); return; }
    const stage = $('#stage');
    const grid = el('div', 'pzpick');
    MEMORY_THEMES.forEach((t, i) => {
      const b = el('button', 'pzthumb', t.e);
      b.style.setProperty('--bg', t.bg);
      b.style.animationDelay = (i * 50) + 'ms';
      b.setAttribute('aria-label', t.n);
      b.onclick = () => { if (f !== G.flow) return; audio(); sfx.tap(); stage.innerHTML = ''; memoryBoard(G, f, t); };
      grid.append(b);
    });
    stage.append(grid);
    $('#caption').textContent = 'Choisis tes cartes';
    G.prompt = 'Choisis tes cartes !';
    say(G.prompt);
  }
  function memoryBoard(G, f, theme) {
    G.memTheme = theme.id;
    const pairs = memoryPairs();
    const set = shuffle(theme.items).slice(0, pairs);
    const deck = shuffle([...set, ...set]);
    const grid = el('div', 'mgrid');
    grid.style.setProperty('--cols', pairs === 6 ? 3 : 2);
    grid.style.setProperty('--rows', pairs === 6 ? 4 : pairs);
    grid.style.setProperty('--mb1', theme.b1); grid.style.setProperty('--mb2', theme.b2); grid.style.setProperty('--mbd', theme.bd);
    let open = [], found = 0, busy = false;
    deck.forEach((it, i) => {
      const c = el('button', 'mcard', `<span class="mface mback"></span><span class="mface mfront">${it.e}</span>`);
      c.setAttribute('aria-label', 'carte');
      c.style.animationDelay = (i * 50) + 'ms';
      c.onclick = async () => {
        if (f !== G.flow || busy || c.classList.contains('open')) return;
        audio(); sfx.tap();
        c.classList.add('open');
        open.push({ c, it });
        say(cap(it.n));
        if (open.length < 2) return;
        busy = true;
        const [a, b] = open; open = [];
        if (a.it === b.it) {
          await sleep(500);
          a.c.classList.add('found'); b.c.classList.add('found');
          sfx.good(); found++;
          await say(`${praise()} Deux fois ${it.n} !`);
          busy = false;
          if (found === pairs && f === G.flow) { await sleep(300); G.n = G.total; nextQ(); }
        } else {
          await sleep(1400);
          a.c.classList.remove('open'); b.c.classList.remove('open');
          busy = false;
        }
      };
      grid.append(c);
    });
    $('#stage').append(grid);
    G.prompt = (G.opts.harder ? 'Encore plus de cartes ! ' : '') + 'Retourne les cartes, et trouve deux images pareilles !';
    $('#caption').textContent = 'Trouve les paires';
    say(G.prompt);
  }

  // ---------- Puzzles ----------
  const PUZZLES = [
    { e: '🏰', n: 'le château', bg: '#FFD6E8' }, { e: '🦄', n: 'la licorne', bg: '#E6DBFF' },
    { e: '🚜', n: 'le tracteur', bg: '#D8F3D0' }, { e: '🐱', n: 'le chat', bg: '#FFE9C7' },
    { e: '🦋', n: 'le papillon', bg: '#D7EEFF' }, { e: '🚀', n: 'la fusée', bg: '#DDE3FF' },
    { e: '🐢', n: 'la tortue', bg: '#D2F2EA' }, { e: '🍓', n: 'la fraise', bg: '#FFE0E0' }
  ];
  const PUZZLE_LEVELS = [[1, 2], [2, 2], [3, 2], [3, 3]];
  const puzzleGrid = () => PUZZLE_LEVELS[Math.min(store.get('puzzleWins', 0), PUZZLE_LEVELS.length - 1)];
  function puzzleGame(G, f) {
    const stage = $('#stage');
    if (G.opts.next) { // « Suivant » : image suivante, sans repasser par le choix
      const i = (store.get('lastPuzzle', -1) + 1) % PUZZLES.length;
      store.set('lastPuzzle', i);
      buildPuzzle(G, f, PUZZLES[i]);
      return;
    }
    const grid = el('div', 'pzpick');
    PUZZLES.forEach((p, i) => {
      const b = el('button', 'pzthumb', p.e);
      b.style.setProperty('--bg', p.bg);
      b.style.animationDelay = (i * 50) + 'ms';
      b.setAttribute('aria-label', p.n);
      b.onclick = () => {
        if (f !== G.flow) return;
        audio(); sfx.tap();
        stage.innerHTML = '';
        store.set('lastPuzzle', i);
        buildPuzzle(G, f, p);
      };
      grid.append(b);
    });
    stage.append(grid);
    G.prompt = 'Choisis ton puzzle !';
    $('#caption').textContent = 'Choisis ton puzzle';
    say(G.prompt);
  }
  function puzzleImage(p, S) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const x = cv.getContext('2d');
    x.fillStyle = p.bg; x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath(); x.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)';
    [[.12, .14, .03], [.86, .18, .025], [.1, .84, .02], [.88, .86, .03], [.5, .07, .015]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a * S, b * S, r * S, 0, Math.PI * 2); x.fill(); });
    x.font = `${Math.round(S * 0.6)}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(p.e, S / 2, S * 0.54);
    return cv.toDataURL('image/png');
  }
  function buildPuzzle(G, f, p) {
    const [cols, rows] = puzzleGrid();
    const n = cols * rows;
    const box = el('div', 'pz');
    $('#stage').append(box);
    const W = box.clientWidth, H = box.clientHeight;
    const B = Math.floor(Math.min(W, H * 0.56, 380));
    const pw = B / cols, ph = B / rows;
    const bx = Math.round((W - B) / 2), by = 0;
    const url = puzzleImage(p, 600);

    const board = el('div', 'pzboard');
    Object.assign(board.style, { left: bx + 'px', top: by + 'px', width: B + 'px', height: B + 'px' });
    board.style.setProperty('--img', `url(${url})`);
    box.append(board);
    for (let i = 0; i < n; i++) {
      const sl = el('div', 'pzslot');
      Object.assign(sl.style, { left: (i % cols) * pw + 'px', top: Math.floor(i / cols) * ph + 'px', width: pw + 'px', height: ph + 'px' });
      board.append(sl);
    }

    // le plateau du bas : les morceaux mélangés, réduits si besoin
    const trayTop = B + 18, trayH = Math.max(60, H - trayTop);
    const perLine = n <= 3 ? n : Math.ceil(n / 2), lines = n <= 3 ? 1 : 2, gap = 12;
    const s = Math.min(1, (W - gap * (perLine - 1)) / (perLine * pw), (trayH - gap * (lines - 1)) / (lines * ph));
    const offY = Math.max(0, (trayH - lines * ph * s - gap * (lines - 1)) / 2);
    const order = shuffle([...Array(n).keys()]);
    let placed = 0;

    const place = (P, pos, sc) => { P.el.style.left = pos.x + 'px'; P.el.style.top = pos.y + 'px'; P.el.style.transform = `scale(${sc})`; };

    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const pc = el('div', 'piece');
      Object.assign(pc.style, {
        width: pw + 'px', height: ph + 'px', backgroundImage: `url(${url})`,
        backgroundSize: `${B}px ${B}px`, backgroundPosition: `${-c * pw}px ${-r * ph}px`,
        animationDelay: (i * 80) + 'ms'
      });
      const k = order[i], line = Math.floor(k / perLine), col = k % perLine;
      const inLine = line === 0 ? Math.min(perLine, n) : n - perLine;
      const lineW = inLine * pw * s + gap * (inLine - 1);
      const P = {
        el: pc, done: false, misses: 0,
        home: { x: (W - lineW) / 2 + col * (pw * s + gap), y: trayTop + offY + line * (ph * s + gap) },
        target: { x: bx + c * pw, y: by + r * ph }
      };
      place(P, P.home, s);
      bindDrag(P);
      box.append(pc);
    }

    function bindDrag(P) {
      let ox = 0, oy = 0, rect = null, sx = 0, sy = 0, moved = false;
      P.el.addEventListener('pointerdown', e => {
        if (P.done || f !== G.flow) return;
        e.preventDefault(); audio();
        try { P.el.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
        rect = box.getBoundingClientRect();
        const pr = P.el.getBoundingClientRect();
        ox = (e.clientX - pr.left) / pr.width * pw;
        oy = (e.clientY - pr.top) / pr.height * ph;
        sx = e.clientX; sy = e.clientY; moved = false;
        P.el.classList.add('drag');
        move(e);
      });
      const move = e => {
        if (!P.el.classList.contains('drag')) return;
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) moved = true;
        place(P, { x: e.clientX - rect.left - ox, y: e.clientY - rect.top - oy }, 1);
      };
      P.el.addEventListener('pointermove', move);
      const up = () => {
        if (!P.el.classList.contains('drag')) return;
        P.el.classList.remove('drag');
        const x = parseFloat(P.el.style.left), y = parseFloat(P.el.style.top);
        if (Math.hypot(x - P.target.x, y - P.target.y) < Math.max(40, Math.min(pw, ph) * 0.42)) {
          P.done = true;
          place(P, P.target, 1);
          P.el.classList.add('placed');
          sfx.good(); placed++;
          if (placed === n) win(); else say(pick(['Oui !', 'Bravo !', 'Super !', 'Bien joué !']));
        } else {
          place(P, P.home, s);
          if (!moved) say('Fais glisser le morceau avec ton doigt !');
          else if (++P.misses >= 2) hint(P);
        }
      };
      P.el.addEventListener('pointerup', up);
      P.el.addEventListener('pointercancel', up);
    }
    function hint(P) {
      const g = el('div', 'pzhint');
      Object.assign(g.style, { left: P.target.x + 'px', top: P.target.y + 'px', width: pw + 'px', height: ph + 'px' });
      box.append(g);
      setTimeout(() => g.remove(), 1800);
      say('Regarde, il va ici !');
    }
    async function win() {
      board.classList.add('complete');
      await sleep(400);
      await say(`Bravo ! C'est ${p.n} !`);
      if (f === G.flow) { G.n = G.total; nextQ(); }
    }
    G.prompt = (G.opts.harder ? 'Encore plus de morceaux ! ' : '') + (n === 2 ? 'Remets les deux morceaux à leur place !' : 'Remets les morceaux à leur place !');
    $('#caption').textContent = 'Fais glisser les morceaux';
    say(G.prompt);
  }

  // ---------- Lire : les syllabes, une par une ----------
  // s = ce qui est écrit, say = ce que la voix prononce, word = le mot entier
  const WORDS = [
    { w: 'LAPIN', e: '🐰', s: ['LA', 'PIN'], say: ['la', 'pin'], word: 'lapin' },
    { w: 'MOTO', e: '🏍️', s: ['MO', 'TO'], say: ['mo', 'to'], word: 'moto' },
    { w: 'VÉLO', e: '🚲', s: ['VÉ', 'LO'], say: ['vé', 'lo'], word: 'vélo' },
    { w: 'LUNE', e: '🌙', s: ['LU', 'NE'], say: ['lu', 'neu'], word: 'lune' },
    { w: 'BANANE', e: '🍌', s: ['BA', 'NA', 'NE'], say: ['ba', 'na', 'neu'], word: 'banane' },
    { w: 'TOMATE', e: '🍅', s: ['TO', 'MA', 'TE'], say: ['to', 'ma', 'teu'], word: 'tomate' },
    { w: 'ROBOT', e: '🤖', s: ['RO', 'BOT'], say: ['ro', 'bo'], word: 'robot' },
    { w: 'CANARD', e: '🦆', s: ['CA', 'NARD'], say: ['ca', 'nar'], word: 'canard' },
    { w: 'SAPIN', e: '🎄', s: ['SA', 'PIN'], say: ['sa', 'pin'], word: 'sapin' },
    { w: 'BÉBÉ', e: '👶', s: ['BÉ', 'BÉ'], say: ['bé', 'bé'], word: 'bébé' },
    { w: 'LAMA', e: '🦙', s: ['LA', 'MA'], say: ['la', 'ma'], word: 'lama' },
    { w: 'KIWI', e: '🥝', s: ['KI', 'WI'], say: ['ki', 'oui'], word: 'kiwi' },
    { w: 'CADEAU', e: '🎁', s: ['CA', 'DEAU'], say: ['ca', 'do'], word: 'cadeau' },
    { w: 'TORTUE', e: '🐢', s: ['TOR', 'TUE'], say: ['tor', 'tu'], word: 'tortue' },
    { w: 'MAISON', e: '🏠', s: ['MAI', 'SON'], say: ['mè', 'zon'], word: 'maison' },
    { w: 'PIRATE', e: '🏴‍☠️', s: ['PI', 'RA', 'TE'], say: ['pi', 'ra', 'teu'], word: 'pirate' }
  ];
  function readGame(G, f) {
    const it = pickNew(WORDS, G, x => x.w);
    const pic = el('button', 'rpic', it.e);
    pic.setAttribute('aria-label', 'Écouter le mot');
    pic.onclick = () => { audio(); say(it.word); };
    const row = el('div', 'syl');
    let k = 0;
    const blocks = it.s.map((sy, i) => {
      const b = el('button', 'sy' + (i % 2 ? ' alt' : ''), sy);
      b.style.animationDelay = (i * 90) + 'ms';
      b.onclick = () => {
        if (f !== G.flow) return;
        audio();
        if (i < k) { say(it.say[i]); return; }
        if (i !== k) {
          const nb = blocks[k];
          nb.classList.remove('next'); void nb.offsetWidth; nb.classList.add('next');
          say(k === 0 ? 'On commence par ici !' : 'Celle-là, juste à côté !');
          return;
        }
        b.classList.remove('next'); b.classList.add('lit');
        sfx.count(k + 1);
        k++;
        say(it.say[i]);
        if (k < blocks.length) blocks[k].classList.add('next'); else done();
      };
      row.append(b);
      return b;
    });
    blocks[0].classList.add('next');
    $('#stage').append(pic, row);
    G.prompt = G.n === 0 ? 'Touche les morceaux du mot, un par un, pour le lire !' : 'Lis le mot, morceau par morceau !';
    $('#caption').textContent = 'Touche les morceaux du mot';
    say(G.prompt);
    async function done() {
      await sleep(700);
      if (f !== G.flow) return;
      row.classList.add('whole'); pic.classList.add('happy');
      await say(`${it.say.join(', ')} : ${it.word} !`);
      if (f !== G.flow) return;
      roundWon(f);
    }
  }

  // ---------- Mon prénom : remettre les lettres dans l'ordre, puis les tracer au doigt ----------
  const arc = (cx, cy, rx, ry, a0, a1, steps = 28) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return pts;
  };
  // Majuscules d'imprimerie dans une boîte 100 × 140, un tableau de points par trait (ordre des traits de l'école)
  const GLYPHS = (() => {
    const O = [arc(50, 70, 45, 70, -90, -450, 44)];
    const P = [[[15, 0], [15, 140]], [[15, 0], [55, 0], ...arc(55, 37, 32, 37, -90, 90), [15, 74]]];
    return {
      A: [[[50, 0], [5, 140]], [[50, 0], [95, 140]], [[25, 88], [75, 88]]],
      B: [[[15, 0], [15, 140]], [[15, 0], [55, 0], ...arc(55, 34, 32, 34, -90, 90), [15, 68]], [[15, 68], [58, 68], ...arc(58, 104, 34, 36, -90, 90), [15, 140]]],
      C: [arc(55, 70, 45, 70, -50, -310, 36)],
      D: [[[15, 0], [15, 140]], [[15, 0], [40, 0], ...arc(40, 70, 50, 70, -90, 90, 32), [15, 140]]],
      E: [[[15, 0], [15, 140]], [[15, 0], [85, 0]], [[15, 70], [70, 70]], [[15, 140], [85, 140]]],
      F: [[[15, 0], [15, 140]], [[15, 0], [85, 0]], [[15, 70], [70, 70]]],
      G: [[...arc(52, 70, 45, 70, -45, -360, 40), [55, 70]]],
      H: [[[15, 0], [15, 140]], [[85, 0], [85, 140]], [[15, 70], [85, 70]]],
      I: [[[50, 0], [50, 140]]],
      J: [[[70, 0], [70, 100], ...arc(42, 100, 28, 40, 0, 180)]],
      K: [[[15, 0], [15, 140]], [[85, 0], [15, 82]], [[40, 58], [85, 140]]],
      L: [[[15, 0], [15, 140], [85, 140]]],
      M: [[[10, 140], [10, 0], [50, 90], [90, 0], [90, 140]]],
      N: [[[15, 140], [15, 0], [85, 140], [85, 0]]],
      O,
      P,
      Q: [...O, [[60, 105], [95, 140]]],
      R: [...P, [[45, 74], [88, 140]]],
      S: [[...arc(50, 35, 38, 35, -25, -270, 26), ...arc(50, 105, 40, 35, -90, 150, 26)]],
      T: [[[5, 0], [95, 0]], [[50, 0], [50, 140]]],
      U: [[[15, 0], [15, 95], ...arc(50, 95, 35, 45, 180, 0), [85, 0]]],
      V: [[[5, 0], [50, 140], [95, 0]]],
      W: [[[0, 0], [25, 140], [50, 40], [75, 140], [100, 0]]],
      X: [[[10, 0], [90, 140]], [[90, 0], [10, 140]]],
      Y: [[[10, 0], [50, 70]], [[90, 0], [50, 70], [50, 140]]],
      Z: [[[10, 0], [90, 0], [10, 140], [90, 140]]]
    };
  })();
  function resample(pts, step) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(d / step));
      for (let j = 1; j <= n; j++) out.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]);
    }
    return out;
  }
  const letterSay = c => (LETTERS.find(x => x.l === c) || { say: c }).say;
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };

  // Liste des prénoms : celui de l'enfant d'abord, puis les autres du plus court au plus long (= les niveaux)
  const letterCount = n => [...n].filter(c => /\p{L}/u.test(c)).length;
  function nameList() {
    const own = (settings.name || '').trim();
    const others = (settings.names || []).filter(x => x && x.toLowerCase() !== own.toLowerCase());
    others.sort((a, b) => letterCount(a) - letterCount(b) || a.localeCompare(b, 'fr'));
    return (own ? [own] : []).concat(others);
  }
  function nameGame(G, f) {
    const stage = $('#stage');
    const list = nameList();
    if (!list.length) {
      stage.append(el('div', 'name-empty', '<span class="emo">✏️</span><p>Pour ce jeu, entrez le prénom de l\'enfant dans le coin des parents (appui long sur la roue de l\'écran d\'accueil).</p>'));
      G.prompt = "Demande à papa ou maman d'écrire ton prénom dans les réglages !";
      say(G.prompt);
      return;
    }
    if (G.opts.nameIdx != null || list.length === 1) { playName(G, f, list[(G.opts.nameIdx || 0) % list.length]); return; }
    // plusieurs prénoms : on choisit
    const done = store.get('namesDone', []);
    const grid = el('div', 'namepick');
    list.forEach((nm, i) => {
      const own = i === 0 && nm === (settings.name || '').trim();
      const b = el('button', 'npick' + (own ? ' own' : ''), `${own ? '<span class="crown">👑</span>' : ''}<span class="nm">${nm.toUpperCase()}</span>${done.includes(nm.toLowerCase()) ? '<span class="nstar">⭐</span>' : ''}`);
      b.setAttribute('aria-label', nm);
      b.style.animationDelay = (i * 60) + 'ms';
      b.onclick = () => {
        if (f !== G.flow) return;
        audio(); sfx.tap();
        stage.innerHTML = '';
        playName(G, f, nm);
      };
      grid.append(b);
    });
    stage.append(grid);
    $('#caption').textContent = 'Choisis un prénom';
    G.prompt = 'Quel prénom veux-tu écrire ?';
    say(G.prompt);
  }

  function playName(G, f, name) {
    const stage = $('#stage');
    G.nameIdx = nameList().indexOf(name);
    const own = name === (settings.name || '').trim();
    const shown = [...name.toUpperCase()].filter(c => /\p{L}/u.test(c));
    const base = shown.map(c => c.normalize('NFD').replace(/[̀-ͯ]/g, '')).map(c => GLYPHS[c] ? c : 'I');
    const n = shown.length;

    const chips = el('div', 'namechips');
    const chipEls = shown.map(c => { const s = el('span', 'nchip empty', c); chips.append(s); return s; });
    stage.append(chips);

    // Étape 1 : remettre les lettres dans l'ordre
    let k = 0;
    const ch = $('#choices');
    ch.className = 'choices row nameletters';
    ch.style.gridTemplateColumns = `repeat(${n <= 4 ? n : Math.min(4, Math.ceil(n / 2))}, 1fr)`;
    const tiles = shuffle(shown.map((c, i) => ({ c, b: base[i] }))).map((t, i) => {
      const b = el('button', 'choice ltile', `<span class="letter">${t.c}</span>`);
      b.style.animationDelay = (i * 70) + 'ms';
      b.setAttribute('aria-label', 'lettre ' + t.c);
      b.onclick = async () => {
        if (f !== G.flow || b.disabled) return;
        audio();
        if (t.b === base[k]) {
          b.disabled = true; b.classList.add('used');
          chipEls[k].classList.remove('empty', 'cur'); chipEls[k].classList.add('ok');
          sfx.count(k + 1);
          say(letterSay(base[k]));
          k++;
          if (k < n) chipEls[k].classList.add('cur');
          else {
            await sleep(500);
            if (f !== G.flow) return;
            sfx.good();
            await say(`${praise()} ${base.map(letterSay).join(', ')} : ${name} ! ${own ? "C'est ton prénom !" : 'Bravo !'}`);
            if (f === G.flow) tracePhase();
          }
        } else {
          sfx.soft();
          say(`Ça, c'est la lettre ${letterSay(t.b)}. Cherche la lettre ${letterSay(base[k])} !`);
          const good = tiles.find(x => !x.disabled && x.dataset.b === base[k]);
          if (good) { good.classList.remove('hinted'); void good.offsetWidth; good.classList.add('hinted'); }
        }
      };
      b.dataset.b = t.b;
      ch.append(b);
      return b;
    });
    chipEls[0].classList.add('cur');
    $('#caption').textContent = own ? 'Écris ton prénom' : 'Écris ' + name;
    G.prompt = own ? `${name}, écris ton prénom avec les lettres ! Ton prénom commence par la lettre ${letterSay(base[0])}.`
      : `Écris le prénom ${name} avec les lettres ! Il commence par la lettre ${letterSay(base[0])}.`;
    say(G.prompt);

    // Étape 2 : tracer chaque lettre
    async function tracePhase() {
      ch.innerHTML = ''; ch.style.gridTemplateColumns = ''; ch.className = 'choices';
      chipEls.forEach(c => c.classList.remove('ok'));
      const wrap = el('div', 'trace');
      stage.append(wrap);
      for (let i = 0; i < n; i++) {
        if (f !== G.flow) return;
        chipEls.forEach((c, j) => c.classList.toggle('cur', j === i));
        await traceLetter(wrap, base[i], i, f);
        if (f !== G.flow) return;
        chipEls[i].classList.remove('cur'); chipEls[i].classList.add('ok');
        sfx.good();
        await Promise.all([say(i < n - 1 ? pick(['Bravo !', 'Super !', 'Bien joué !', 'Oui !']) : 'Bravo !'), sleep(900)]);
      }
      if (f !== G.flow) return;
      G.replay = null;
      chips.classList.add('whole');
      const dn = store.get('namesDone', []);
      if (!dn.includes(name.toLowerCase())) store.set('namesDone', dn.concat(name.toLowerCase()));
      await say(own ? `Tu as écrit ton prénom ! ${base.map(letterSay).join(', ')} : ${name} !` : `Tu as écrit ${name} ! ${base.map(letterSay).join(', ')} : ${name} !`);
      if (f === G.flow) { G.n = G.total; nextQ(); }
    }
  }

  function traceLetter(wrap, L, idx, f) {
    return new Promise(resolve => {
      wrap.innerHTML = '';
      const cv = el('canvas');
      wrap.append(cv);
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const x = cv.getContext('2d');
      x.scale(dpr, dpr);
      const pad = 22;
      const k = Math.min(W / (100 + pad * 2), H / (140 + pad * 2));
      const ox = (W - 100 * k) / 2, oy = (H - 140 * k) / 2;
      const P = ([a, b]) => [ox + a * k, oy + b * k];
      const strokes = GLYPHS[L].map(s => { const pts = resample(s, 3).map(P); return { pts, hit: pts.map(() => false) }; });
      const tol = 17 * k, lw = 18 * k;
      const hue = (idx * 57 + 330) % 360;
      let ink = [], demo = null, finished = false;

      function draw() {
        x.clearRect(0, 0, W, H);
        x.lineCap = 'round'; x.lineJoin = 'round';
        strokes.forEach(s => { x.strokeStyle = '#DCE6F3'; x.lineWidth = lw; poly(s.pts); x.stroke(); });
        strokes.forEach(s => { x.strokeStyle = '#FFFFFF'; x.lineWidth = Math.max(2, 2.5 * k); x.setLineDash([2 * k, 7 * k]); poly(s.pts); x.stroke(); x.setLineDash([]); });
        // parties déjà tracées
        x.strokeStyle = `hsl(${hue} 80% 58%)`; x.lineWidth = lw * 0.92;
        strokes.forEach(s => { for (let i = 1; i < s.pts.length; i++) if (s.hit[i] && s.hit[i - 1]) { x.beginPath(); x.moveTo(...s.pts[i - 1]); x.lineTo(...s.pts[i]); x.stroke(); } });
        // points de départ numérotés
        strokes.forEach((s, i) => {
          // si deux traits partent du même point (E, F…), on décale le numéro le long du trait
          const shared = strokes.slice(0, i).some(o => Math.hypot(o.pts[0][0] - s.pts[0][0], o.pts[0][1] - s.pts[0][1]) < 15 * k);
          const [sx, sy] = s.pts[shared ? Math.min(s.pts.length - 1, Math.round(22 * k / (3 * k))) : 0];
          x.fillStyle = '#3F9A43'; x.beginPath(); x.arc(sx, sy, 11 * k, 0, Math.PI * 2); x.fill();
          if (strokes.length > 1) { x.fillStyle = '#fff'; x.font = `800 ${Math.round(12 * k)}px "Baloo 2", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), sx, sy + 1); }
        });
        // trace du doigt
        if (ink.length > 1) { x.strokeStyle = 'rgba(239,79,108,.45)'; x.lineWidth = 7 * k; poly(ink); x.stroke(); }
        if (demo) { x.fillStyle = '#FFC83D'; x.strokeStyle = '#D99A00'; x.lineWidth = 3; x.beginPath(); x.arc(demo[0], demo[1], 13 * k, 0, Math.PI * 2); x.fill(); x.stroke(); }
      }
      function poly(pts) { x.beginPath(); x.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) x.lineTo(...pts[i]); }

      function runDemo() { return new Promise(res => {
        const path = strokes.flatMap(s => s.pts.map(p => p));
        const starts = new Set(); let acc = 0; strokes.forEach(s => { starts.add(acc); acc += s.pts.length; });
        let i = 0, last = 0;
        demo = path[0];
        const step = t => {
          if (!demo || f !== G.flow || finished) { demo = null; draw(); res(); return; }
          if (t - last > (starts.has(i) && i ? 260 : 16)) { last = t; demo = path[i]; i++; draw(); }
          if (i < path.length) requestAnimationFrame(step); else { demo = null; draw(); res(); }
        };
        requestAnimationFrame(step);
      }); }
      G.replay = () => { audio(); say(`La lettre ${letterSay(L)}. Regarde bien, et suis le chemin avec ton doigt !`); runDemo(); };

      function covered() { return strokes.every(s => s.hit.filter(Boolean).length / s.hit.length >= 0.85 && (s.hit[0] || s.hit[1]) && (s.hit[s.hit.length - 1] || s.hit[s.hit.length - 2])); }
      function mark(a, b) {
        strokes.forEach(s => s.pts.forEach((p, i) => { if (!s.hit[i] && distSeg(p[0], p[1], a[0], a[1], b[0], b[1]) < tol) s.hit[i] = true; }));
      }
      let down = false, lastP = null, beepAt = 0;
      const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', e => {
        if (finished || f !== G.flow) return;
        e.preventDefault(); audio();
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
        demo = null; down = true; lastP = pos(e); ink = [lastP]; mark(lastP, lastP); draw();
      });
      cv.addEventListener('pointermove', e => {
        if (!down || finished) return;
        const p = pos(e);
        const before = strokes.reduce((a, s) => a + s.hit.filter(Boolean).length, 0);
        mark(lastP, p); lastP = p; ink.push(p);
        const after = strokes.reduce((a, s) => a + s.hit.filter(Boolean).length, 0);
        const now = performance.now();
        if (after > before && now - beepAt > 120) { beepAt = now; note(523 + after * 6, 0, 0.06, 'sine', 0.05); }
        draw();
        if (covered()) done();
      });
      const up = () => { if (!down) return; down = false; ink = []; draw(); if (covered()) done(); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      function done() { if (finished) return; finished = true; down = false; ink = []; strokes.forEach(s => s.hit.fill(true)); draw(); wrap.classList.add('lit'); setTimeout(() => wrap.classList.remove('lit'), 700); G.replay = null; resolve(); }

      draw();
      (async () => {
        await say(idx === 0 ? `Maintenant, on trace les lettres ! La lettre ${letterSay(L)}. Regarde !` : `La lettre ${letterSay(L)}. Regarde !`);
        if (f !== G.flow || finished) return;
        await runDemo();
        if (f !== G.flow || finished) return;
        say(idx === 0 ? 'À toi ! Pars du point vert et suis le chemin avec ton doigt.' : 'À toi !');
      })();
      G.prompt = `La lettre ${letterSay(L)}`;
      $('#caption').textContent = 'Suis le chemin avec ton doigt';
    });
  }

  // ---------- Formes ----------
  const starPts = (() => { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 19 : 46, a = -Math.PI / 2 + i * Math.PI / 5; p.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (53 + r * Math.sin(a)).toFixed(1)); } return p.join(' '); })();
  const SHAPES = [
    { n: 'le rond', svg: '<circle cx="50" cy="50" r="42"/>' },
    { n: 'le carré', svg: '<rect x="10" y="10" width="80" height="80" rx="4"/>' },
    { n: 'le triangle', svg: '<polygon points="50,6 95,90 5,90"/>' },
    { n: 'le rectangle', svg: '<rect x="3" y="26" width="94" height="48" rx="4"/>' },
    { n: "l'étoile", svg: `<polygon points="${starPts}"/>` },
    { n: 'le cœur', svg: '<path d="M50 90 C 20 68, 3 50, 12 29 C 20 11, 44 10, 50 30 C 56 10, 80 11, 88 29 C 97 50, 80 68, 50 90 Z"/>' },
    { n: 'le losange', svg: '<polygon points="50,3 93,50 50,97 7,50"/>' }
  ];
  const SHAPE_COLORS = ['#E53935', '#1E63D6', '#FFC21F', '#2EAD4B', '#FF8A1F', '#8E44C9', '#FF6FAE'];
  const shapeSvg = (s, col) => `<svg class="shape" viewBox="0 0 100 100" aria-hidden="true"><g fill="${col}" stroke="rgb(36 50 79 / .35)" stroke-width="3" stroke-linejoin="round">${s.svg}</g></svg>`;

  // ---------- Les ombres ----------
  const SHADOWS = [
    { e: '🐘', n: "l'éléphant" }, { e: '🦒', n: 'la girafe' }, { e: '🐰', n: 'le lapin' }, { e: '🐌', n: "l'escargot" },
    { e: '🦋', n: 'le papillon' }, { e: '🐢', n: 'la tortue' }, { e: '🦀', n: 'le crabe' }, { e: '🐙', n: 'la pieuvre' },
    { e: '🚲', n: 'le vélo' }, { e: '✈️', n: "l'avion" }, { e: '🎸', n: 'la guitare' }, { e: '🌵', n: 'le cactus' },
    { e: '🍐', n: 'la poire' }, { e: '🍌', n: 'la banane' }, { e: '🐓', n: 'le coq' }, { e: '🦕', n: 'le dinosaure' },
    { e: '🐬', n: 'le dauphin' }, { e: '☂️', n: 'le parapluie' }, { e: '🍄', n: 'le champignon' }, { e: '🦆', n: 'le canard' }
  ];
  const deN = n => n.startsWith('le ') ? 'du ' + n.slice(3) : n.startsWith('la ') ? 'de la ' + n.slice(3) : 'de ' + n;

  // ---------- Grand et petit ----------
  const SIZE_ITEMS = ['🐘', '🐻', '🎈', '🏠', '🍎', '🐳', '🌳', '🚗', '🐶', '⭐', '🌻', '🦁'];

  // ---------- Coloriage ----------
  const PAINT = [
    { n: 'rouge', hex: '#E53935' }, { n: 'orange', hex: '#FF8A1F' }, { n: 'jaune', hex: '#FFD21F' },
    { n: 'vert', hex: '#2EAD4B' }, { n: 'bleu', hex: '#1E63D6' }, { n: 'violet', hex: '#8E44C9' },
    { n: 'rose', hex: '#FF7EB6' }, { n: 'marron', hex: '#8B5A2B' }, { n: 'noir', hex: '#2A2A30' }, { n: 'blanc', hex: '#FFFFFF' }
  ];
  const DRAWINGS = [
    { n: 'la maison', svg: `
      <circle class="zone" cx="250" cy="50" r="28"/>
      <path class="zone" d="M40 80 a18 18 0 0 1 30 -15 a22 22 0 0 1 40 5 a16 16 0 0 1 5 30 h-70 a15 15 0 0 1 -5 -20 z"/>
      <rect class="zone" x="195" y="60" width="25" height="60"/>
      <rect class="zone" x="60" y="130" width="180" height="130"/>
      <polygon class="zone" points="40,135 150,45 260,135"/>
      <rect class="zone" x="130" y="190" width="45" height="70" rx="4"/>
      <rect class="zone" x="78" y="155" width="40" height="35"/>
      <rect class="zone" x="185" y="155" width="40" height="35"/>
      <path class="zone" d="M0 260 H300 V300 H0 Z"/>` },
    { n: 'la fleur', svg: `
      <polygon class="zone" points="105,232 195,232 182,296 118,296"/>
      <rect class="zone" x="145" y="125" width="10" height="107"/>
      <ellipse class="zone" cx="118" cy="190" rx="30" ry="12" transform="rotate(-30 118 190)"/>
      <ellipse class="zone" cx="182" cy="172" rx="30" ry="12" transform="rotate(30 182 172)"/>
      <circle class="zone" cx="150" cy="50" r="28"/>
      <circle class="zone" cx="191" cy="74" r="28"/>
      <circle class="zone" cx="191" cy="121" r="28"/>
      <circle class="zone" cx="150" cy="145" r="28"/>
      <circle class="zone" cx="109" cy="121" r="28"/>
      <circle class="zone" cx="109" cy="74" r="28"/>
      <circle class="zone" cx="150" cy="97" r="26"/>
      <circle class="zone" cx="255" cy="45" r="22"/>` },
    { n: 'le poisson', svg: `
      <path class="zone" d="M0 268 Q 37 252 75 268 T 150 268 T 225 268 T 300 268 V300 H0 Z"/>
      <polygon class="zone" points="62,150 14,102 14,198"/>
      <path class="zone" d="M118 100 Q150 42 195 102 Z"/>
      <ellipse class="zone" cx="148" cy="152" rx="95" ry="60"/>
      <circle class="zone" cx="118" cy="162" r="15"/>
      <circle class="zone" cx="158" cy="128" r="12"/>
      <circle class="zone" cx="166" cy="182" r="11"/>
      <circle class="zone" cx="207" cy="135" r="15"/>
      <circle class="zone" cx="211" cy="135" r="6"/>
      <circle class="zone" cx="262" cy="92" r="10"/>
      <circle class="zone" cx="278" cy="60" r="7"/>
      <circle class="zone" cx="258" cy="32" r="12"/>` },
    { n: 'le papillon', svg: `
      <path class="line" d="M145 58 Q128 26 112 20"/><path class="line" d="M155 58 Q172 26 188 20"/>
      <circle class="zone" cx="110" cy="19" r="8"/><circle class="zone" cx="190" cy="19" r="8"/>
      <ellipse class="zone" cx="98" cy="112" rx="62" ry="50" transform="rotate(-20 98 112)"/>
      <ellipse class="zone" cx="202" cy="112" rx="62" ry="50" transform="rotate(20 202 112)"/>
      <ellipse class="zone" cx="108" cy="205" rx="44" ry="40"/>
      <ellipse class="zone" cx="192" cy="205" rx="44" ry="40"/>
      <circle class="zone" cx="92" cy="106" r="18"/><circle class="zone" cx="208" cy="106" r="18"/>
      <circle class="zone" cx="106" cy="208" r="13"/><circle class="zone" cx="194" cy="208" r="13"/>
      <ellipse class="zone" cx="150" cy="158" rx="14" ry="78"/>
      <circle class="zone" cx="150" cy="70" r="18"/>` },
    { n: 'la voiture', svg: `
      <circle class="zone" cx="45" cy="50" r="26"/>
      <rect class="zone" x="0" y="256" width="300" height="44"/>
      <path class="zone" d="M88 150 L114 98 H202 L232 150 Z"/>
      <rect class="zone" x="36" y="145" width="234" height="72" rx="22"/>
      <polygon class="zone" points="102,146 122,108 152,108 152,146"/>
      <polygon class="zone" points="162,146 162,108 196,108 218,146"/>
      <circle class="zone" cx="262" cy="172" r="9"/>
      <circle class="zone" cx="95" cy="220" r="31"/><circle class="zone" cx="220" cy="220" r="31"/>
      <circle class="zone" cx="95" cy="220" r="12"/><circle class="zone" cx="220" cy="220" r="12"/>` }
  ];
  function colorGame(G, f) {
    const i = G.opts.next ? (store.get('lastDrawing', -1) + 1) % DRAWINGS.length : rand(DRAWINGS.length);
    store.set('lastDrawing', i);
    const d = DRAWINGS[i];
    const stage = $('#stage');
    const card = el('div', 'paint-card', `<svg viewBox="0 0 300 300" class="paint-svg" aria-label="Dessin : ${d.n}">${d.svg}</svg>`);
    const doneBtn = el('button', 'paint-done', '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="stroke" d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
    doneBtn.setAttribute('aria-label', "J'ai fini");
    doneBtn.hidden = true;
    card.append(doneBtn);
    stage.append(card);
    let cur = PAINT[rand(7)];
    const zones = $$('.zone', card);
    const filled = new Set();
    zones.forEach(z => z.addEventListener('pointerdown', e => {
      if (f !== G.flow) return;
      e.preventDefault(); audio();
      z.style.fill = cur.hex;
      z.classList.remove('pop'); void z.getBBox(); z.classList.add('pop');
      if (cur.n === 'blanc') filled.delete(z); else filled.add(z);
      note(660 + rand(6) * 80, 0, 0.12, 'sine', 0.12);
      if (filled.size >= Math.ceil(zones.length * 0.8) && doneBtn.hidden) { doneBtn.hidden = false; say("Quand tu as fini, touche le bouton vert !"); }
    }));
    doneBtn.onclick = async () => {
      if (f !== G.flow) return;
      audio(); sfx.good();
      await say(`Bravo ! Il est trop beau, ton dessin !`);
      if (f === G.flow) { G.n = G.total; nextQ(); }
    };
    const ch = $('#choices');
    ch.className = 'choices row palette';
    PAINT.forEach(p => {
      const b = el('button', 'swatch' + (p === cur ? ' on' : ''));
      b.style.setProperty('--paint', p.hex);
      b.setAttribute('aria-label', p.n);
      b.onclick = () => { audio(); cur = p; $$('.swatch', ch).forEach(x => x.classList.toggle('on', x === b)); sfx.tap(); say(cap(p.n)); };
      ch.append(b);
    });
    G.prompt = `On colorie ${d.n} ! Choisis une couleur en bas, puis touche le dessin.`;
    $('#caption').textContent = '';
    say(G.prompt);
  }

  // ---------- Musique : le xylophone ----------
  const BARS = [
    { n: 'do', f: 523.25, c: '#E53935' }, { n: 'ré', f: 587.33, c: '#FF8A1F' }, { n: 'mi', f: 659.25, c: '#FFC21F' },
    { n: 'fa', f: 698.46, c: '#2EAD4B' }, { n: 'sol', f: 783.99, c: '#16A3A3' }, { n: 'la', f: 880.0, c: '#1E63D6' },
    { n: 'si', f: 987.77, c: '#8E44C9' }, { n: 'do', f: 1046.5, c: '#FF6FAE' }
  ];
  const SONGS = [
    { n: 'Au clair de la lune', e: '🌙', notes: [0, 0, 0, 1, 2, 1, 0, 2, 1, 1, 0] },
    { n: 'Frère Jacques', e: '🔔', notes: [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4, 2, 3, 4] },
    { n: 'Ah, vous dirai-je maman', e: '⭐', notes: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0] }
  ];
  function mallet(freq) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime, v = 0.32 * settings.volume;
    [[freq, v, 1.4], [freq * 4.01, v * 0.18, 0.25], [freq * 2, v * 0.12, 0.6]].forEach(([fq, vol, dur]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol + 0.0001, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    });
  }
  function musicGame(G, f) {
    const stage = $('#stage');
    const songsRow = el('div', 'songs');
    const xylo = el('div', 'xylo');
    let song = null, pos = 0;
    const bars = BARS.map((b, i) => {
      const bt = el('button', 'xbar', `<span>${b.n}</span>`);
      bt.style.setProperty('--c', b.c);
      bt.style.setProperty('--w', (100 - i * 6.5) + '%');
      bt.setAttribute('aria-label', b.n);
      bt.addEventListener('pointerdown', e => {
        if (f !== G.flow) return;
        e.preventDefault();
        hush();
        mallet(b.f);
        bt.classList.remove('hit'); void bt.offsetWidth; bt.classList.add('hit');
        if (song && i === song.notes[pos]) {
          bt.classList.remove('next');
          pos++;
          if (pos < song.notes.length) bars[song.notes[pos]].classList.add('next');
          else songDone();
        }
      });
      xylo.append(bt);
      return bt;
    });
    SONGS.forEach(s => {
      const b = el('button', 'songbtn', s.e);
      b.setAttribute('aria-label', s.n);
      b.onclick = async () => {
        if (f !== G.flow) return;
        audio(); sfx.tap();
        bars.forEach(x => x.classList.remove('next'));
        $$('.songbtn', songsRow).forEach(x => x.classList.toggle('on', x === b));
        song = s; pos = 0;
        await say(`On joue ${s.n} ! Touche la barre qui brille.`);
        if (song === s && pos === 0) bars[s.notes[0]].classList.add('next');
      };
      songsRow.append(b);
    });
    async function songDone() {
      const s = song; song = null;
      $$('.songbtn', songsRow).forEach(x => x.classList.remove('on'));
      await sleep(500);
      sfx.good(); confetti();
      say(`Bravo ! Tu as joué ${s.n} !`);
    }
    stage.append(songsRow, xylo);
    G.prompt = 'Tape sur les barres pour faire de la musique ! Ou choisis une chanson en haut.';
    $('#caption').textContent = '';
    say(G.prompt);
  }

  // ---------- Album d'autocollants ----------
  const STICKERS = [
    { e: '🦄', n: 'la licorne' }, { e: '🐱', n: 'le chaton' }, { e: '🐶', n: 'le chiot' }, { e: '🐰', n: 'le lapin' },
    { e: '🐼', n: 'le panda' }, { e: '🐨', n: 'le koala' }, { e: '🦊', n: 'le renard' }, { e: '🦔', n: 'le hérisson' },
    { e: '🦋', n: 'le papillon' }, { e: '🐞', n: 'la coccinelle' }, { e: '🐝', n: "l'abeille" }, { e: '🐥', n: 'le poussin' },
    { e: '🐷', n: 'le cochon' }, { e: '🐮', n: 'la vache' }, { e: '🐴', n: 'le cheval' }, { e: '🐬', n: 'le dauphin' },
    { e: '🐳', n: 'la baleine' }, { e: '🐠', n: 'le poisson' }, { e: '🐙', n: 'la pieuvre' }, { e: '🐢', n: 'la tortue' },
    { e: '🦀', n: 'le crabe' }, { e: '🦩', n: 'le flamant rose' }, { e: '🦜', n: 'le perroquet' }, { e: '🦉', n: 'le hibou' },
    { e: '🐸', n: 'la grenouille' }, { e: '🦕', n: 'le dinosaure' }, { e: '🦒', n: 'la girafe' }, { e: '🐘', n: "l'éléphant" },
    { e: '🦁', n: 'le lion' }, { e: '🐵', n: 'le singe' }, { e: '🌸', n: 'la fleur' }, { e: '🌻', n: 'le tournesol' },
    { e: '🌈', n: "l'arc-en-ciel" }, { e: '🌳', n: "l'arbre" }, { e: '🍄', n: 'le champignon' }, { e: '⭐', n: "l'étoile" },
    { e: '🌙', n: 'la lune' }, { e: '☀️', n: 'le soleil' }, { e: '☁️', n: 'le nuage' }, { e: '🚀', n: 'la fusée' },
    { e: '🛸', n: 'la soucoupe volante' }, { e: '🪐', n: 'la planète' }, { e: '👑', n: 'la couronne' }, { e: '🏰', n: 'le château' },
    { e: '👸', n: 'la princesse' }, { e: '🧚', n: 'la fée' }, { e: '🧜‍♀️', n: 'la sirène' }, { e: '💎', n: 'le diamant' },
    { e: '🎂', n: 'le gâteau' }, { e: '🍦', n: 'la glace' }, { e: '🍭', n: 'la sucette' }, { e: '🍓', n: 'la fraise' },
    { e: '🎈', n: 'le ballon' }, { e: '🎁', n: 'le cadeau' }, { e: '🚗', n: 'la voiture' }, { e: '⛵', n: 'le bateau' },
    { e: '✈️', n: "l'avion" }, { e: '🚂', n: 'le train' }, { e: '🪁', n: 'le cerf-volant' }, { e: '🐚', n: 'le coquillage' }
  ];
  const SCENES = [
    { id: 'prairie', e: '🌳', n: 'la prairie', svg: `
      <defs><linearGradient id="sk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8FF"/><stop offset="1" stop-color="#E4F6FF"/></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sk1)"/>
      <circle cx="245" cy="62" r="34" fill="#FFD43B"/>
      <g fill="#fff"><ellipse cx="70" cy="70" rx="38" ry="15"/><ellipse cx="95" cy="60" rx="24" ry="15"/><ellipse cx="170" cy="120" rx="30" ry="11"/></g>
      <path d="M0 250 Q 90 205 170 240 T 300 228 V400 H0 Z" fill="#8BD17C"/>
      <path d="M0 300 Q 120 262 300 296 V400 H0 Z" fill="#6CC05E"/>` },
    { id: 'mer', e: '🌊', n: 'la mer', svg: `
      <defs><linearGradient id="sk2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3F5"/><stop offset="1" stop-color="#1E7FC4"/></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sk2)"/>
      <path d="M0 40 Q 25 30 50 40 T 100 40 T 150 40 T 200 40 T 250 40 T 300 40 V0 H0 Z" fill="#CFEFFF"/>
      <g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"><path d="M30 120 q15 -8 30 0"/><path d="M200 170 q15 -8 30 0"/><path d="M90 230 q15 -8 30 0"/></g>
      <g fill="#fff" fill-opacity=".5"><circle cx="250" cy="110" r="6"/><circle cx="262" cy="90" r="4"/><circle cx="60" cy="190" r="5"/></g>
      <path d="M0 340 Q 80 318 150 334 T 300 326 V400 H0 Z" fill="#F4D58D"/>
      <g fill="#2EAD4B"><path d="M40 345 q-10 -40 6 -70 q-4 35 4 70z"/><path d="M262 336 q10 -45 -4 -76 q12 36 10 76z"/></g>` },
    { id: 'chateau', e: '🏰', n: 'le château', svg: `
      <defs><linearGradient id="sk3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C6E8"/><stop offset="1" stop-color="#FFF0F8"/></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sk3)"/>
      <g fill="#fff" fill-opacity=".8"><circle cx="40" cy="50" r="3"/><circle cx="260" cy="40" r="4"/><circle cx="150" cy="30" r="2.5"/><circle cx="210" cy="90" r="2.5"/></g>
      <g fill="#E7B8F2"><rect x="60" y="190" width="180" height="130"/><rect x="40" y="150" width="44" height="170"/><rect x="216" y="150" width="44" height="170"/><rect x="128" y="140" width="44" height="60"/></g>
      <g fill="#C67AD8"><polygon points="36,152 62,100 88,152"/><polygon points="212,152 238,100 264,152"/><polygon points="124,142 150,92 176,142"/></g>
      <path d="M128 320 v-50 a22 22 0 0 1 44 0 v50 z" fill="#9B59B6"/>
      <path d="M0 312 Q 150 292 300 312 V400 H0 Z" fill="#9EDB8E"/>` },
    { id: 'espace', e: '🚀', n: "l'espace", svg: `
      <defs><radialGradient id="sk4" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#3A4A9A"/><stop offset="1" stop-color="#141B45"/></radialGradient></defs>
      <rect width="300" height="400" fill="url(#sk4)"/>
      <g fill="#fff">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 73) % 300}" cy="${(i * 131) % 330}" r="${(i % 3) * 0.7 + 0.8}" fill-opacity="${0.4 + (i % 4) * 0.15}"/>`).join('')}</g>
      <circle cx="230" cy="80" r="34" fill="#FF9F6B"/><ellipse cx="230" cy="80" rx="56" ry="11" fill="none" stroke="#FFD0A8" stroke-width="5"/>
      <path d="M-20 400 a170 90 0 0 1 340 0 z" fill="#B8C0D8"/>
      <g fill="#9AA3C2"><ellipse cx="80" cy="360" rx="20" ry="7"/><ellipse cx="200" cy="375" rx="14" ry="5"/><ellipse cx="150" cy="345" rx="10" ry="4"/></g>` }
  ];
  const stickerName = e => (STICKERS.find(s => s.e === e) || { n: 'cet autocollant' }).n;
  const loadStickers = () => store.get('stickers', []);
  const saveStickers = a => store.set('stickers', a);
  let albumScene = 0, newSticker = null;

  function awardSticker() {
    const all = loadStickers();
    const owned = new Set(all.map(s => s.e));
    const fresh = STICKERS.filter(s => !owned.has(s.e));
    const s = pick(fresh.length ? fresh : STICKERS);
    const item = { id: Date.now() + '-' + rand(1e6), e: s.e, scene: null, x: 0.5, y: 0.5 };
    all.push(item);
    saveStickers(all.slice(-300));
    newSticker = item.id;
    updateAlbumBadge();
    return s;
  }
  function updateAlbumBadge() {
    const n = loadStickers().filter(s => s.scene == null).length;
    const b = $('#album-badge');
    if (b) { b.textContent = n; b.hidden = n === 0; }
  }

  function openAlbum() {
    hush();
    if (G) G.flow++;
    let all = loadStickers();
    let intro = '';
    if (!store.get('albumWelcome', false)) {
      store.set('albumWelcome', true);
      shuffle(STICKERS.filter(s => !all.some(x => x.e === s.e))).slice(0, 3).forEach(s => all.push({ id: Date.now() + '-' + rand(1e6), e: s.e, scene: null, x: 0.5, y: 0.5 }));
      saveStickers(all);
      intro = 'Voici ton album, avec trois autocollants en cadeau ! Touche un autocollant en bas pour le coller, puis fais-le glisser où tu veux.';
    }
    show('album');
    pushState();
    renderAlbum();
    const free = all.filter(s => s.scene == null).length;
    say(intro || (free ? 'Touche un autocollant en bas pour le coller !' : (all.length ? 'Ton album ! Fais glisser les autocollants où tu veux.' : 'Joue pour gagner des autocollants !')));
  }

  function renderAlbum() {
    const tabs = $('#scene-tabs'); tabs.innerHTML = '';
    SCENES.forEach((sc, i) => {
      const b = el('button', 'scene-tab' + (i === albumScene ? ' on' : ''), sc.e);
      b.setAttribute('aria-label', sc.n);
      b.onclick = () => { audio(); sfx.tap(); albumScene = i; renderAlbum(); say(cap(sc.n)); };
      tabs.append(b);
    });
    const scene = $('#scene');
    scene.innerHTML = `<svg class="scene-bg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[albumScene].svg}</svg>`;
    const all = loadStickers();
    all.filter(s => s.scene === albumScene).forEach(s => scene.append(placedEl(s)));
    const tray = $('#tray'); tray.innerHTML = '';
    const free = all.filter(s => s.scene == null).reverse();
    if (!free.length) tray.append(el('p', 'tray-empty', all.length ? 'Tous tes autocollants sont collés ⭐' : 'Joue pour gagner des autocollants ⭐'));
    free.forEach(s => {
      const b = el('button', 'tray-st' + (s.id === newSticker ? ' new' : ''), s.e);
      b.setAttribute('aria-label', stickerName(s.e));
      b.onclick = () => placeFromTray(s.id);
      tray.append(b);
    });
    updateAlbumBadge();
  }

  function placedEl(s) {
    const d = el('div', 'st', s.e);
    d.style.left = (s.x * 100) + '%'; d.style.top = (s.y * 100) + '%';
    d.dataset.id = s.id;
    bindStickerDrag(d, s.id);
    return d;
  }

  function placeFromTray(id) {
    audio();
    const all = loadStickers();
    const s = all.find(x => x.id === id); if (!s) return;
    s.scene = albumScene;
    s.x = 0.18 + Math.random() * 0.64; s.y = 0.22 + Math.random() * 0.56;
    saveStickers(all);
    if (newSticker === id) newSticker = null;
    note(880, 0, 0.08, 'sine', 0.14); note(1320, 0.07, 0.12, 'sine', 0.1);
    renderAlbum();
    const d = $(`.st[data-id="${id}"]`); if (d) d.classList.add('landed');
    say(cap(stickerName(s.e)) + ' !');
  }

  function bindStickerDrag(d, id) {
    let start = null, moved = false;
    d.addEventListener('pointerdown', e => {
      e.preventDefault(); audio();
      try { d.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      start = [e.clientX, e.clientY]; moved = false;
      d.classList.add('drag');
    });
    d.addEventListener('pointermove', e => {
      if (!start) return;
      if (Math.abs(e.clientX - start[0]) + Math.abs(e.clientY - start[1]) > 8) moved = true;
      if (!moved) return;
      const r = $('#scene').getBoundingClientRect();
      d.style.left = ((e.clientX - r.left) / r.width * 100) + '%';
      d.style.top = ((e.clientY - r.top) / r.height * 100) + '%';
      $('#tray').classList.toggle('drop', e.clientY > $('#tray').getBoundingClientRect().top - 10);
    });
    const up = e => {
      if (!start) return;
      start = null; d.classList.remove('drag');
      $('#tray').classList.remove('drop');
      const all = loadStickers();
      const s = all.find(x => x.id === id); if (!s) return;
      if (!moved) { d.classList.remove('wiggle'); void d.offsetWidth; d.classList.add('wiggle'); say(cap(stickerName(s.e)) + ' !'); return; }
      const r = $('#scene').getBoundingClientRect();
      const tr = $('#tray').getBoundingClientRect();
      if (e.clientY > tr.top - 10) { s.scene = null; note(500, 0, 0.1, 'sine', 0.1); }
      else {
        s.x = Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width));
        s.y = Math.min(0.95, Math.max(0.05, (e.clientY - r.top) / r.height));
        note(780, 0, 0.07, 'sine', 0.12);
      }
      saveStickers(all);
      renderAlbum();
    };
    d.addEventListener('pointerup', up);
    d.addEventListener('pointercancel', up);
  }

  // ---------- Écrans ----------
  let screen = 'start';
  function show(id) {
    $$('.screen').forEach(s => { s.hidden = s.id !== id; });
    screen = id;
  }

  // 9 jeux à l'accueil, tirés à chaque ouverture : d'abord ceux qui n'étaient pas là la dernière fois
  const HOME_MAX = 9;
  let homeIds = null;
  function pickHome() {
    const enabled = ORDER.filter(id => settings.games[id]);
    if (settings.homeMode === 'all' || enabled.length <= HOME_MAX) { homeIds = enabled; return; }
    const last = store.get('lastHome', []);
    const favs = enabled.filter(id => (settings.favs || []).includes(id)).slice(0, HOME_MAX);
    const rest = enabled.filter(id => !favs.includes(id));
    const sel = favs.concat(shuffle(rest.filter(id => !last.includes(id))).concat(shuffle(rest.filter(id => last.includes(id))))).slice(0, HOME_MAX);
    homeIds = ORDER.filter(id => sel.includes(id));
    store.set('lastHome', homeIds);
  }
  function buildHome() {
    const tiles = $('#tiles'); tiles.innerHTML = '';
    if (!homeIds) pickHome();
    const list = homeIds.filter(id => settings.games[id]);
    tiles.classList.toggle('many', list.length > HOME_MAX);
    list.forEach((id, i) => {
      const g = GAMES[id];
      const b = el('button', 'tile', `<span class="emo">${g.icon}</span><span class="lbl">${g.name}</span>`);
      b.style.setProperty('--tc', g.color);
      b.style.animationDelay = (i * 60) + 'ms';
      if (list.length % 2 === 1 && i === list.length - 1) b.classList.add('wide');
      b.onclick = async () => {
        audio(); sfx.tap();
        await Promise.race([say(g.intro), sleep(1600)]);
        startGame(id);
      };
      tiles.append(b);
    });
    if (!list.length) tiles.append(el('p', 'muted', 'Aucun jeu choisi. Activez des jeux dans le coin des parents.'));
  }

  function goHome(speak = true) {
    hush();
    if (G) G.flow++;
    if (limitReached()) { goRest(); return; }
    buildHome();
    show('home');
    if (speak) say(settings.name ? `${settings.name}, choisis un jeu !` : 'Choisis un jeu !');
  }

  // ---------- Déroulement d'une partie ----------
  let G = null;
  function startGame(id, opts = {}) {
    const def = GAMES[id];
    G = { id, def, opts, n: 0, total: def.rounds, used: new Set(), usedN: new Set(), flow: 0, lock: false };
    $('#game').classList.toggle('counting', !!def.full);
    $('#game').classList.toggle('solo', def.rounds === 1);
    const prog = $('#progress'); prog.innerHTML = '';
    for (let i = 0; i < G.total; i++) prog.append(el('span', 'dot'));
    show('game');
    pushState();
    keepAwake();
    nextQ();
  }

  function nextQ() {
    const f = ++G.flow;
    $('#stage').innerHTML = ''; $('#choices').innerHTML = ''; $('#choices').style.gridTemplateColumns = ''; $('#caption').textContent = ''; G.replay = null;
    if (G.n >= G.total) { finish(); return; }
    const q = G.def.make(G);
    if (q.custom) { q.custom(G, f); return; }
    if (q.visual) $('#stage').append(q.visual);
    renderChoices(q, f, !!q.row);
  }

  function renderChoices(q, f, row) {
    G.q = q; G.prompt = q.prompt; G.lock = false;
    $('#caption').textContent = q.caption || q.prompt;
    const ch = $('#choices');
    ch.innerHTML = '';
    ch.className = 'choices' + (row ? ' row' : '') + (q.cls ? ' ' + q.cls : '');
    q.choices.forEach((c, i) => {
      const b = el('button', 'choice', c.html);
      b.setAttribute('aria-label', c.label);
      b.style.animationDelay = (i * 90) + 'ms';
      b.onclick = () => answer(b, c, q, f);
      ch.append(b);
    });
    say(q.prompt);
  }

  async function answer(b, c, q, f) {
    if (G.lock || f !== G.flow || b.classList.contains('no')) return;
    audio();
    if (c.correct) {
      G.lock = true;
      sfx.good();
      b.classList.add('yes');
      $$('.choice', $('#choices')).forEach(x => { if (x !== b) x.classList.add('dim'); });
      const dot = $$('.dot')[G.n];
      if (dot) { dot.classList.add('on'); dot.textContent = '⭐'; }
      await Promise.all([say(praise() + ' ' + q.success), sleep(1300)]);
      if (f !== G.flow) return;
      G.n++;
      nextQ();
    } else {
      sfx.soft();
      b.classList.add('no');
      say(c.wrong);
    }
  }

  function repeat() { audio(); if (G && G.replay) G.replay(); else if (G && G.prompt) say(G.prompt); }

  function finish() {
    if (G.def.counting) store.set('countLevel', Math.min(settings.countMax, countLevel() + 2));
    if (G.id === 'memory') { const w = store.get('memoryWins', 0); G.leveledUp = w < MEMORY_LEVELS.length - 1; store.set('memoryWins', w + 1); }
    if (G.id === 'puzzle') { const w = store.get('puzzleWins', 0); G.leveledUp = w < PUZZLE_LEVELS.length - 1; store.set('puzzleWins', w + 1); }
    releaseAwake();
    const won = awardSticker();
    if (pendingRest || limitReached()) { goRest(); return; }
    show('end');
    const es = $('#end-sticker');
    es.textContent = won.e;
    es.classList.remove('peel'); void es.offsetWidth; es.classList.add('peel');
    sfx.fanfare();
    confetti();
    const who = settings.name ? ' ' + settings.name : '';
    const solo = G.total === 1;
    $('#btn-next').hidden = !solo;
    $('#btn-again').hidden = solo;
    const gift = `Tu as gagné un autocollant : ${stickerName(won.e)} !`;
    say(G.id === 'prenom' ? `Bravo${who} ! ${gift} ${nameList().length > 1 ? 'On écrit le prénom suivant ?' : 'On recommence ?'}` : solo ? `Bravo${who} ! ${gift} On passe au suivant ?` : `Bravo${who} ! ${gift} On rejoue ?`);
  }

  // ---------- Confettis ----------
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const cols = ['#EF4F6C', '#FFC83D', '#74C66A', '#1E63D6', '#8E44C9', '#FF8A1F'];
    const ps = Array.from({ length: 110 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 7 + Math.random() * 7, h: 4 + Math.random() * 5, c: pick(cols)
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 3200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // ---------- Temps d'écran ----------
  const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  let usage = store.get('usage', null);
  const freshUsage = () => { if (!usage || usage.day !== dayKey()) usage = { day: dayKey(), sec: 0, extra: 0 }; };
  freshUsage();
  let pendingRest = false;
  const limitReached = () => { freshUsage(); return settings.timeLimit > 0 && usage.sec >= (settings.timeLimit + usage.extra) * 60; };
  setInterval(() => {
    if (document.hidden || !['home', 'game', 'end', 'album'].includes(screen)) return;
    freshUsage();
    usage.sec += 5;
    store.set('usage', usage);
    if (limitReached()) {
      if (screen === 'game') pendingRest = true; // on laisse finir la partie en cours
      else goRest();
    }
  }, 5000);
  function goRest() {
    hush(); pendingRest = false; releaseAwake();
    show('rest');
    say(`C'est l'heure de faire une pause${settings.name ? ' ' + settings.name : ''}. À tout à l'heure !`);
  }

  // ---------- Écran allumé pendant le jeu ----------
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
  function releaseAwake() { try { if (wake) wake.release(); } catch (e) { /* rien */ } wake = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hush();
    else if (screen === 'game') keepAwake();
  });

  // ---------- Bouton retour d'Android ----------
  function pushState() { try { history.pushState({ mpj: screen }, ''); } catch (e) { /* rien */ } }
  window.addEventListener('popstate', () => {
    if (['game', 'end', 'parent', 'album'].includes(screen)) { closeParentIfOpen(); goHome(false); }
  });
  function closeParentIfOpen() { if (screen === 'parent') saveSettings(); }

  // ---------- Coin des parents (appui long) ----------
  function bindHold(btn) {
    let timer = null, raf = null, t0 = 0;
    const HOLD = 2000;
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); btn.style.setProperty('--p', 0); };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      t0 = performance.now();
      const tick = () => { btn.style.setProperty('--p', Math.min(1, (performance.now() - t0) / HOLD)); raf = requestAnimationFrame(tick); };
      tick();
      timer = setTimeout(() => { stop(); openParent(); }, HOLD);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  $$('[data-hold]').forEach(bindHold);

  function openParent() {
    hush();
    fillParent();
    show('parent');
    pushState();
  }
  function fillParent() {
    $('#set-volume').value = settings.volume;
    $('#set-rate').value = settings.rate;
    $('#set-effects').checked = settings.effects;
    $('#set-name').value = settings.name;
    renderNames();
    $('#set-countmax').value = String(settings.countMax);
    $('#set-letters').value = settings.letters;
    $('#set-limit').value = String(settings.timeLimit);
    $('#set-home').value = settings.homeMode;
    const gl = $('#set-games'); gl.innerHTML = '';
    ORDER.forEach(id => {
      const row = el('div', 'grow');
      const lab = el('label', '', `<input type="checkbox" id="game-${id}"> ${GAMES[id].icon} ${GAMES[id].name}`);
      const cb = $('input', lab); cb.checked = !!settings.games[id];
      cb.onchange = () => { settings.games[id] = cb.checked; saveSettings(); homeIds = null; };
      const fav = el('button', 'fav', '');
      const paint = () => { const on = (settings.favs || []).includes(id); fav.textContent = on ? '⭐' : '☆'; fav.classList.toggle('on', on); fav.setAttribute('aria-label', (on ? 'Retirer des favoris : ' : 'Toujours à l\'accueil : ') + GAMES[id].name); };
      fav.onclick = () => { const fv = new Set(settings.favs || []); fv.has(id) ? fv.delete(id) : fv.add(id); settings.favs = [...fv]; saveSettings(); homeIds = null; paint(); };
      paint();
      row.append(lab, fav);
      gl.append(row);
    });
    refreshParentInfo();
  }
  function refreshParentInfo() {
    $('#voice-info').textContent = !hasTTS ? 'Voix indisponible sur ce navigateur'
      : frVoice ? `Voix : ${frVoice.name}` : 'Aucune voix française trouvée (voir l\'aide)';
    $('#count-level').textContent = `Niveau actuel : jusqu'à ${countLevel()}`;
    $('#album-info').textContent = `Album : ${loadStickers().length} autocollants`;
    const [pc, pr] = puzzleGrid();
    $('#levels-info').textContent = `Memory : ${memoryPairs()} paires · Puzzles : ${pc * pr} morceaux`;
    freshUsage();
    const min = Math.floor(usage.sec / 60);
    $('#usage-info').textContent = `Joué aujourd'hui : ${min} min` + (usage.extra ? ` (bonus +${usage.extra} min)` : '');
  }
  $('#set-volume').oninput = e => { settings.volume = +e.target.value; saveSettings(); };
  $('#set-rate').oninput = e => { settings.rate = +e.target.value; saveSettings(); };
  $('#set-effects').onchange = e => { settings.effects = e.target.checked; saveSettings(); };
  $('#set-name').oninput = e => { settings.name = e.target.value.trim(); saveSettings(); };
  function renderNames() {
    const box = $('#names-list'); box.innerHTML = '';
    const list = nameList().filter(n => n !== (settings.name || '').trim());
    if (!list.length) { box.append(el('p', 'muted', 'Aucun autre prénom pour l\'instant.')); return; }
    list.forEach((nm, i) => {
      const chip = el('span', 'name-chip', `<b>${i + 1}</b> ${nm}`);
      const x = el('button', 'name-x', '×');
      x.setAttribute('aria-label', 'Retirer ' + nm);
      x.onclick = () => { settings.names = settings.names.filter(v => v !== nm); saveSettings(); renderNames(); };
      chip.append(x); box.append(chip);
    });
  }
  function addNames() {
    const inp = $('#set-newname');
    const have = new Set([(settings.name || '').toLowerCase(), ...settings.names.map(v => v.toLowerCase())]);
    inp.value.split(/[,;\n]/).map(v => v.trim().replace(/\s+/g, ' ')).filter(v => letterCount(v) > 0).forEach(v => {
      const nice = v.charAt(0).toUpperCase() + v.slice(1);
      if (!have.has(nice.toLowerCase()) && settings.names.length < 20) { settings.names.push(nice); have.add(nice.toLowerCase()); }
    });
    inp.value = '';
    saveSettings(); renderNames();
  }
  $('#btn-addname').onclick = addNames;
  $('#set-newname').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addNames(); } });
  $('#set-countmax').onchange = e => { settings.countMax = +e.target.value; saveSettings(); refreshParentInfo(); };
  $('#set-letters').onchange = e => { settings.letters = e.target.value; saveSettings(); };
  $('#set-home').onchange = e => { settings.homeMode = e.target.value; saveSettings(); homeIds = null; };
  $('#set-limit').onchange = e => { settings.timeLimit = +e.target.value; saveSettings(); refreshParentInfo(); };
  $('#btn-test-voice').onclick = () => { audio(); sfx.good(); say(settings.name ? `Bonjour ${settings.name} ! Où est la carotte ?` : 'Bonjour ! Où est la carotte ?'); };
  $('#btn-count-reset').onclick = () => { store.set('countLevel', 5); refreshParentInfo(); };
  $('#btn-levels-reset').onclick = () => { store.set('memoryWins', 0); store.set('puzzleWins', 0); refreshParentInfo(); };
  $('#btn-extra').onclick = () => { freshUsage(); usage.extra += 10; store.set('usage', usage); refreshParentInfo(); };
  $('#btn-parent-close').onclick = () => { saveSettings(); goHome(false); };

  // ---------- Boutons ----------
  $('#btn-start').onclick = () => {
    audio(); sfx.good(); pickVoice(); pickHome();
    if (limitReached()) { goRest(); return; }
    buildHome(); updateAlbumBadge(); show('home');
    say(settings.name ? `Bonjour ${settings.name} ! Choisis un jeu !` : 'Bonjour ! Choisis un jeu !');
  };
  $('#btn-home').onclick = () => { sfx.tap(); goHome(); };
  $('#btn-repeat').onclick = repeat;
  $('#btn-again').onclick = () => { sfx.tap(); startGame(G.id); };
  $('#btn-album').onclick = () => { sfx.tap(); openAlbum(); };
  $('#btn-end-album').onclick = () => { sfx.tap(); openAlbum(); };
  $('#btn-album-home').onclick = () => { sfx.tap(); goHome(); };
  let resetArmed = 0;
  $('#btn-album-reset').onclick = e => {
    if (Date.now() - resetArmed > 3000) { resetArmed = Date.now(); e.target.textContent = 'Toucher encore pour vider'; setTimeout(() => { e.target.textContent = "Vider l'album"; }, 3000); return; }
    saveStickers([]); store.set('albumWelcome', false); resetArmed = 0; e.target.textContent = "Vider l'album"; refreshParentInfo();
  };
  $('#btn-next').onclick = () => { sfx.tap(); startGame(G.id, { next: true, harder: !!G.leveledUp, theme: G.memTheme, nameIdx: G.id === 'prenom' ? (G.nameIdx ?? -1) + 1 : undefined }); };
  $('#btn-end-home').onclick = () => { sfx.tap(); goHome(); };

  // ---------- Hors connexion ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.hostname)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
