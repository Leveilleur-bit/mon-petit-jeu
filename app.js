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
    volume: 1, rate: 0.9, effects: true, name: '',
    countMax: 30, letters: 'simple', timeLimit: 0,
    games: { potager: true, compter: true, couleurs: true, lettres: true, animaux: true }
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
      name: 'Compter', intro: 'On compte !', icon: '🍓', color: '#EF4F6C', rounds: 3, counting: true,
      make(G) { return { custom: countQuestion }; }
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
  const ORDER = ['potager', 'compter', 'couleurs', 'lettres', 'animaux'];

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

  // ---------- Écrans ----------
  let screen = 'start';
  function show(id) {
    $$('.screen').forEach(s => { s.hidden = s.id !== id; });
    screen = id;
  }

  function buildHome() {
    const tiles = $('#tiles'); tiles.innerHTML = '';
    const list = ORDER.filter(id => settings.games[id]);
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
  function startGame(id) {
    const def = GAMES[id];
    G = { id, def, n: 0, total: def.rounds, used: new Set(), usedN: new Set(), flow: 0, lock: false };
    $('#game').classList.toggle('counting', !!def.counting);
    const prog = $('#progress'); prog.innerHTML = '';
    for (let i = 0; i < G.total; i++) prog.append(el('span', 'dot'));
    show('game');
    pushState();
    keepAwake();
    nextQ();
  }

  function nextQ() {
    const f = ++G.flow;
    $('#stage').innerHTML = ''; $('#choices').innerHTML = ''; $('#caption').textContent = '';
    if (G.n >= G.total) { finish(); return; }
    const q = G.def.make(G);
    if (q.custom) { q.custom(G, f); return; }
    if (q.visual) $('#stage').append(q.visual);
    renderChoices(q, f, false);
  }

  function renderChoices(q, f, row) {
    G.q = q; G.prompt = q.prompt; G.lock = false;
    $('#caption').textContent = q.caption || q.prompt;
    const ch = $('#choices');
    ch.innerHTML = '';
    ch.className = 'choices' + (row ? ' row' : '');
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

  function repeat() { audio(); if (G && G.prompt) say(G.prompt); }

  function finish() {
    if (G.def.counting) store.set('countLevel', Math.min(settings.countMax, countLevel() + 2));
    releaseAwake();
    if (pendingRest || limitReached()) { goRest(); return; }
    show('end');
    sfx.fanfare();
    confetti();
    const who = settings.name ? ' ' + settings.name : '';
    say(`Bravo${who} ! Tu as gagné ${G.total} étoiles ! On rejoue ?`);
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
    if (document.hidden || !['home', 'game', 'end'].includes(screen)) return;
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
    if (['game', 'end', 'parent'].includes(screen)) { closeParentIfOpen(); goHome(false); }
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
    $('#set-countmax').value = String(settings.countMax);
    $('#set-letters').value = settings.letters;
    $('#set-limit').value = String(settings.timeLimit);
    const gl = $('#set-games'); gl.innerHTML = '';
    ORDER.forEach(id => {
      const lab = el('label', '', `<input type="checkbox" id="game-${id}"> ${GAMES[id].icon} ${GAMES[id].name}`);
      const cb = $('input', lab); cb.checked = !!settings.games[id];
      cb.onchange = () => { settings.games[id] = cb.checked; saveSettings(); };
      gl.append(lab);
    });
    refreshParentInfo();
  }
  function refreshParentInfo() {
    $('#voice-info').textContent = !hasTTS ? 'Voix indisponible sur ce navigateur'
      : frVoice ? `Voix : ${frVoice.name}` : 'Aucune voix française trouvée (voir l\'aide)';
    $('#count-level').textContent = `Niveau actuel : jusqu'à ${countLevel()}`;
    freshUsage();
    const min = Math.floor(usage.sec / 60);
    $('#usage-info').textContent = `Joué aujourd'hui : ${min} min` + (usage.extra ? ` (bonus +${usage.extra} min)` : '');
  }
  $('#set-volume').oninput = e => { settings.volume = +e.target.value; saveSettings(); };
  $('#set-rate').oninput = e => { settings.rate = +e.target.value; saveSettings(); };
  $('#set-effects').onchange = e => { settings.effects = e.target.checked; saveSettings(); };
  $('#set-name').oninput = e => { settings.name = e.target.value.trim(); saveSettings(); };
  $('#set-countmax').onchange = e => { settings.countMax = +e.target.value; saveSettings(); refreshParentInfo(); };
  $('#set-letters').onchange = e => { settings.letters = e.target.value; saveSettings(); };
  $('#set-limit').onchange = e => { settings.timeLimit = +e.target.value; saveSettings(); refreshParentInfo(); };
  $('#btn-test-voice').onclick = () => { audio(); sfx.good(); say(settings.name ? `Bonjour ${settings.name} ! Où est la carotte ?` : 'Bonjour ! Où est la carotte ?'); };
  $('#btn-count-reset').onclick = () => { store.set('countLevel', 5); refreshParentInfo(); };
  $('#btn-extra').onclick = () => { freshUsage(); usage.extra += 10; store.set('usage', usage); refreshParentInfo(); };
  $('#btn-parent-close').onclick = () => { saveSettings(); goHome(false); };

  // ---------- Boutons ----------
  $('#btn-start').onclick = () => {
    audio(); sfx.good(); pickVoice();
    if (limitReached()) { goRest(); return; }
    buildHome(); show('home');
    say(settings.name ? `Bonjour ${settings.name} ! Choisis un jeu !` : 'Bonjour ! Choisis un jeu !');
  };
  $('#btn-home').onclick = () => { sfx.tap(); goHome(); };
  $('#btn-repeat').onclick = repeat;
  $('#btn-again').onclick = () => { sfx.tap(); startGame(G.id); };
  $('#btn-end-home').onclick = () => { sfx.tap(); goHome(); };

  // ---------- Hors connexion ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.hostname)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
