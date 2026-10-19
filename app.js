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
    countMax: 30, letters: 'simple', timeLimit: 0, memLimit: 5, levels: {}, memPeek: 0, memDelay: 'normal', memGroup: 2,
    games: { potager: true, compter: true, couleurs: true, lettres: true, animaux: true, memory: true, puzzle: true, lire: true, prenom: true, formes: true, tailles: true, ombres: true, coloriage: true, musique: true, fil: true, gouter: true, chiffres: true },
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
          choices: shuffle([t, ...others(POTAGER, t, nOthers('potager'))]).map(o => ({
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
      name: 'Formes et couleurs', intro: 'Les formes et les couleurs !', icon: '🔷', color: '#1E9BD6', rounds: 5,
      make(G) {
        const L = lvl('formes');
        if (L > 0) {
          // jumelé : « Où est le triangle rouge ? » — pièges : même forme autre couleur, autre forme même couleur
          const t = pickNew(SHAPES, G, x => x.n);
          const col = pick(SHAPE_COL);
          const other = pick(SHAPE_COL.filter(c => c !== col));
          const oshape = pick(SHAPES.filter(x => x !== t));
          const items = [{ s: t, c: col, ok: true }, { s: t, c: other }, { s: oshape, c: col }];
          if (L === 2) items.push({ s: pick(SHAPES.filter(x => x !== t && x !== oshape)), c: pick(SHAPE_COL.filter(c => c !== col && c !== other)) });
          const nm = o => `${o.s.n} ${o.s.g === 'f' ? o.c.f : o.c.m}`;
          return {
            prompt: `Où est ${nm(items[0])} ?`, success: `C'est ${nm(items[0])} !`,
            choices: shuffle(items).map(o => ({
              html: shapeSvg(o.s, o.c.hex), label: nm(o), correct: !!o.ok,
              wrong: `Ça, c'est ${nm(o)}. Cherche ${nm(items[0])} !`
            }))
          };
        }
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
      name: 'Grand, moyen, petit', intro: 'Grand, moyen, petit !', icon: '🐘', color: '#7A5BD6', rounds: 5,
      make(G) {
        const e = pickNew(SIZE_ITEMS, G, x => x);
        // grand, petit, moyen à tour de rôle (le moyen est le plus difficile, il arrive en 3e)
        const easy = lvl('tailles') === 0;
        const target = easy ? ['grand', 'petit'][G.n % 2] : ['grand', 'petit', 'moyen'][G.n % 3];
        const NAME = { grand: 'le plus grand', petit: 'le plus petit', moyen: 'le moyen' };
        const want = NAME[target];
        const sizes = easy ? [{ s: 0.4, k: 'petit' }, { s: 1, k: 'grand' }] : [{ s: 0.36, k: 'petit' }, { s: 0.64, k: 'moyen' }, { s: 1, k: 'grand' }];
        return {
          prompt: target === 'moyen' ? 'Touche le moyen ! Pas le plus grand, pas le plus petit : celui du milieu.' : `Touche ${want} !`,
          caption: `Touche ${want} !`, success: `C'est ${want} !`, row: true, cls: 'sizes',
          choices: shuffle(sizes).map(z => ({
            html: `<span class="emo" style="transform:scale(${z.s})">${e}</span>`, label: z.k, correct: z.k === target,
            wrong: `Celui-là, c'est ${NAME[z.k]} ! Cherche ${want} !`
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
          choices: shuffle([t, ...others(SHADOWS, t, nOthers('ombres'))]).map(o => ({
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
    chiffres: {
      name: 'Les chiffres', intro: 'On écrit les chiffres !', icon: '🔢', color: '#7A5BD6', rounds: 1, full: true,
      make(G) { return { custom: digitGame }; }
    },
    gouter: {
      name: 'Le goûter', intro: 'Le goûter des animaux !', icon: '🐰', color: '#F08A3C', rounds: 5,
      make(G) {
        const t = pickNew(MEALS, G, m => m.n);
        const ani = el('button', 'meal', `<span class="meal-a">${t.a}</span><span class="meal-bubble">?</span>`);
        ani.setAttribute('aria-label', 'Écouter encore');
        ani.onclick = repeat;
        const pr = pron(t.n);
        return {
          visual: ani,
          prompt: `${cap(t.n)} a faim ! Qu'est-ce qu'${pr} mange ?`,
          caption: `Qu'est-ce qu'${pr} mange ?`,
          success: `Miam ! ${cap(t.n)} adore ${t.like} !`,
          onCorrect: () => { $('.meal-bubble', ani).textContent = t.f; ani.classList.add('eat'); },
          choices: shuffle([t, ...others(MEALS, t, nOthers('gouter'))]).map(o => ({
            html: `<span class="emo">${o.f}</span>`, label: o.fn, correct: o === t,
            wrong: `Ça, c'est ${o.fn}. ${cap(t.n)} préfère autre chose !`
          }))
        };
      }
    },
    fil: {
      name: 'Le bon chemin', intro: 'Le bon chemin !', icon: '🛤️', color: '#2E8B57', rounds: 1, full: true,
      make(G) { return { custom: mazeGame }; }
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
        const pool = lvl('couleurs') === 0 ? COLORS.slice(0, 6) : COLORS;
        const t = pickNew(pool, G, x => x.n);
        return {
          prompt: `Où est le ${t.n} ?`, success: `C'est le ${t.n} !`,
          choices: shuffle([t, ...others(pool, t, lvl('couleurs') === 2 ? 3 : 2)]).map(o => ({
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
        const listen = () => { bubble.classList.remove('ring'); void bubble.offsetWidth; bubble.classList.add('ring'); return playCry(t); };
        bubble.onclick = () => { audio(); listen(); };
        G.replay = async () => { audio(); await say('Écoute bien !'); listen(); };
        return {
          visual: bubble,
          prompt: 'Écoute bien ! Qui fait ce bruit ?', caption: 'Qui fait ce bruit ?', success: `${cap(t.n)} fait ${t.cri} !`,
          after: listen, afterWrong: listen,
          onCorrect: () => listen(),
          choices: shuffle([t, ...others(ANIMALS, t, nOthers('animaux'))]).map(o => ({
            html: `<span class="emo">${o.e}</span>`, label: o.n, correct: o === t,
            wrong: `Ça, c'est ${o.n}. Écoute encore !`
          }))
        };
      }
    }
  };
  // Difficulté réglable jeu par jeu (coin des parents). Pour Memory, Puzzles et Le bon chemin,
  // le niveau monte aussi tout seul à chaque partie réussie.
  const LEVEL_CFG = {
    potager: { opts: ['2 images', '3 images', '4 images'], def: 1 },
    couleurs: { opts: ['6 couleurs', '11 couleurs', '11 couleurs, 4 choix'], def: 1 },
    animaux: { opts: ['2 choix', '3 choix', '4 choix'], def: 1 },
    formes: { opts: ['Formes seules', 'Forme + couleur', 'Forme + couleur, 4 choix'], def: 1 },
    gouter: { opts: ['2 choix', '3 choix', '4 choix'], def: 1 },
    tailles: { opts: ['Grand et petit', 'Grand, moyen, petit'], def: 1 },
    ombres: { opts: ['2 choix', '3 choix', '4 choix'], def: 1 },
    lire: { opts: ['Mots courts', 'Tous les mots'], def: 1 },
    chiffres: { opts: ['1 à 5', '1 à 10', '1 à 10, tracé précis'], def: 0 },
    prenom: { opts: ['Lettres seulement', 'Lettres + tracé facile', 'Lettres + tracé précis'], def: 1 },
    memory: { opts: ['3 paires', '4 paires', '5 paires', '6 paires', '8 paires', '10 paires'], key: 'memLevel' },
    puzzle: { opts: ['2 morceaux', '4 morceaux', '6 morceaux', '9 morceaux'], key: 'puzzleWins' },
    fil: { opts: ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile'], key: 'mazeWins' }
  };
  function lvl(id) {
    const c = LEVEL_CFG[id];
    if (c.key) return Math.min(store.get(c.key, 0), c.opts.length - 1);
    const v = (settings.levels || {})[id];
    return v == null ? c.def : Math.min(v, c.opts.length - 1);
  }
  function setLvl(id, v) {
    const c = LEVEL_CFG[id];
    if (c.key) store.set(c.key, v); else { settings.levels = Object.assign({}, settings.levels, { [id]: v }); saveSettings(); }
  }
  const nOthers = id => [1, 2, 3][lvl(id)];

  const ORDER = ['potager', 'compter', 'couleurs', 'lettres', 'animaux', 'memory', 'puzzle', 'lire', 'prenom', 'formes', 'tailles', 'ombres', 'coloriage', 'musique', 'fil', 'gouter', 'chiffres'];

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
  // 3 à 10 paires ; le niveau monte seul jusqu'à 6 paires, 8 et 10 se choisissent dans le coin des parents
  const MEMORY_LEVELS = [3, 4, 5, 6, 8, 10];
  const MEMORY_AUTO_MAX = 3;
  if (store.get('memLevel', null) == null) store.set('memLevel', Math.min(store.get('memoryWins', 0), MEMORY_AUTO_MAX));
  const memoryPairs = () => MEMORY_LEVELS[Math.min(store.get('memLevel', 0), MEMORY_LEVELS.length - 1)];
  const MEM_DELAYS = { long: 2400, normal: 1400, court: 800 };
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
  // Écran de choix (thèmes de memory, images de puzzle) : ce qui est déjà fait est marqué ✓
  // et ne peut pas être repris tant que tout n'a pas été fait.
  function picker(G, f, items, doneKey, keyOf, prompt, caption, onPick) {
    let done = store.get(doneKey, []);
    if (items.every(it => done.includes(keyOf(it)))) { done = []; store.set(doneKey, []); }
    const stage = $('#stage');
    const grid = el('div', 'pzpick');
    items.forEach((it, i) => {
      const isDone = done.includes(keyOf(it));
      const b = el('button', 'pzthumb' + (isDone ? ' done' : ''), it.e + (isDone ? '<span class="pz-ok">✓</span>' : ''));
      b.style.setProperty('--bg', it.bg);
      b.style.animationDelay = (i * 50) + 'ms';
      b.setAttribute('aria-label', it.n);
      b.onclick = () => {
        if (f !== G.flow) return;
        audio();
        if (isDone) { sfx.soft(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); say(`Celui-là, tu l'as déjà fait ! Choisis-en un autre.`); return; }
        sfx.tap(); stage.innerHTML = ''; onPick(it, i);
      };
      grid.append(b);
    });
    stage.append(grid);
    $('#caption').textContent = caption;
    G.prompt = (G.opts.harder ? 'Bravo ! Le prochain sera un peu plus difficile. ' : '') + (done.length ? prompt.replace(' !', ' ! Un que tu n\'as pas encore fait.') : prompt);
    say(G.prompt);
  }
  const markDone = (key, v) => { const d = store.get(key, []); if (!d.includes(v)) store.set(key, d.concat(v)); };

  function memoryGame(G, f) {
    picker(G, f, MEMORY_THEMES, 'memThemesDone', t => t.id, 'Choisis tes cartes !', 'Choisis tes cartes', t => memoryBoard(G, f, t));
  }
  function memoryBoard(G, f, theme) {
    G.memTheme = theme.id;
    const g = settings.memGroup === 3 ? 3 : 2;                 // paires ou trios
    const groups = g === 3 ? Math.min(memoryPairs(), 4) : memoryPairs();
    const set = shuffle(theme.items).slice(0, groups);
    const deck = shuffle(Array.from({ length: g }, () => set).flat());
    const n = deck.length;
    const cols = n <= 8 ? 2 : n <= 12 ? 3 : 4;
    const grid = el('div', 'mgrid');
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--rows', Math.ceil(n / cols));
    grid.style.setProperty('--msz', n <= 8 ? 'clamp(44px, 9vh, 80px)' : n <= 12 ? 'clamp(36px, 7vh, 64px)' : 'clamp(30px, 5.5vh, 48px)');
    grid.style.setProperty('--mb1', theme.b1); grid.style.setProperty('--mb2', theme.b2); grid.style.setProperty('--mbd', theme.bd);
    const delay = MEM_DELAYS[settings.memDelay] || 1400;
    const word = g === 3 ? 'Trois' : 'Deux';
    let open = [], found = 0, busy = true;
    const cards = deck.map((it, i) => {
      const c = el('button', 'mcard', `<span class="mface mback"></span><span class="mface mfront">${it.e}</span>`);
      c.setAttribute('aria-label', 'carte');
      c.style.animationDelay = (i * 40) + 'ms';
      c.onclick = async () => {
        if (f !== G.flow || busy || c.classList.contains('open')) return;
        audio(); sfx.tap();
        c.classList.add('open');
        open.push({ c, it });
        say(cap(it.n));
        const same = open.every(o => o.it === open[0].it);
        if (same && open.length < g) return;
        busy = true;
        const grp = open; open = [];
        if (same) {
          await sleep(500);
          grp.forEach(o => o.c.classList.add('found'));
          sfx.good(); found++;
          await say(`${praise()} ${word} fois ${it.n} !`);
          busy = false;
          if (found === groups && f === G.flow) { markDone('memThemesDone', theme.id); await sleep(300); G.n = G.total; nextQ(); }
        } else {
          await sleep(delay);
          grp.forEach(o => o.c.classList.remove('open'));
          busy = false;
        }
      };
      grid.append(c);
      return c;
    });
    $('#stage').append(grid);
    $('#caption').textContent = g === 3 ? 'Trouve les trios' : 'Trouve les paires';
    G.prompt = (G.opts.harder ? 'Encore plus de cartes ! ' : '') + `Retourne les cartes, et trouve ${g === 3 ? 'trois' : 'deux'} images pareilles !`;
    (async () => {
      if (settings.memPeek > 0) {
        await sleep(500);
        if (f !== G.flow) return;
        cards.forEach(c => c.classList.add('open'));
        await Promise.all([say('Regarde bien les cartes !'), sleep(settings.memPeek * 1000)]);
        if (f !== G.flow) return;
        cards.forEach(c => c.classList.remove('open'));
        await sleep(500);
      }
      busy = false;
      if (f === G.flow) say(G.prompt);
    })();
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
    picker(G, f, PUZZLES, 'puzzleDone', p => p.n, 'Choisis ton puzzle !', 'Choisis ton puzzle', p => buildPuzzle(G, f, p));
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
      markDone('puzzleDone', p.n);
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
    const it = pickNew(lvl('lire') === 0 ? WORDS.filter(w => w.s.length === 2) : WORDS, G, x => x.w);
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
            if (f !== G.flow) return;
            if (lvl('prenom') === 0) { const dn = store.get('namesDone', []); if (!dn.includes(name.toLowerCase())) store.set('namesDone', dn.concat(name.toLowerCase())); chips.classList.add('whole'); G.n = G.total; nextQ(); }
            else tracePhase();
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

  function traceLetter(wrap, L, idx, f, opt = {}) {
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
      const strokes = (opt.strokes || GLYPHS[L]).map(s => { const pts = resample(s, 3).map(P); return { pts, hit: pts.map(() => false) }; });
      const precise = opt.precise != null ? opt.precise : lvl('prenom') === 2;
      const label = opt.label || `La lettre ${letterSay(L)}`;
      const tol = (precise ? 11 : 17) * k, lw = 18 * k;
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
      G.replay = () => { audio(); say(`${label}. Regarde bien, et suis le chemin avec ton doigt !`); runDemo(); };

      function covered() { return strokes.every(s => s.hit.filter(Boolean).length / s.hit.length >= (precise ? 0.95 : 0.85) && (s.hit[0] || s.hit[1]) && (s.hit[s.hit.length - 1] || s.hit[s.hit.length - 2])); }
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
        await say(opt.first != null ? `${opt.first} ${label}. Regarde !` : idx === 0 ? `Maintenant, on trace les lettres ! ${label}. Regarde !` : `${label}. Regarde !`);
        if (f !== G.flow || finished) return;
        await runDemo();
        if (f !== G.flow || finished) return;
        say(idx === 0 ? 'À toi ! Pars du point vert et suis le chemin avec ton doigt.' : 'À toi !');
      })();
      G.prompt = label;
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
    { n: "l'étoile", g: 'f', svg: `<polygon points="${starPts}"/>` },
    { n: 'le cœur', svg: '<path d="M50 90 C 20 68, 3 50, 12 29 C 20 11, 44 10, 50 30 C 56 10, 80 11, 88 29 C 97 50, 80 68, 50 90 Z"/>' },
    { n: 'le losange', svg: '<polygon points="50,3 93,50 50,97 7,50"/>' }
  ];
  const SHAPE_COLORS = ['#E53935', '#1E63D6', '#FFC21F', '#2EAD4B', '#FF8A1F', '#8E44C9', '#FF6FAE'];
  const SHAPE_COL = [
    { hex: '#E53935', m: 'rouge', f: 'rouge' }, { hex: '#1E63D6', m: 'bleu', f: 'bleue' }, { hex: '#FFC21F', m: 'jaune', f: 'jaune' },
    { hex: '#2EAD4B', m: 'vert', f: 'verte' }, { hex: '#FF8A1F', m: 'orange', f: 'orange' }, { hex: '#8E44C9', m: 'violet', f: 'violette' },
    { hex: '#FF6FAE', m: 'rose', f: 'rose' }
  ];
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

  // ---------- Le goûter des animaux (animaux + fruits et légumes) ----------
  const MEALS = [
    { a: '🐰', n: 'le lapin', f: '🥕', fn: 'la carotte', like: 'les carottes' },
    { a: '🐵', n: 'le singe', f: '🍌', fn: 'la banane', like: 'les bananes' },
    { a: '🐻', n: "l'ours", f: '🍯', fn: 'le miel', like: 'le miel' },
    { a: '🐿️', n: "l'écureuil", f: '🌰', fn: 'la noisette', like: 'les noisettes' },
    { a: '🐭', n: 'la souris', f: '🧀', fn: 'le fromage', like: 'le fromage' },
    { a: '🐼', n: 'le panda', f: '🎋', fn: 'le bambou', like: 'le bambou' },
    { a: '🐔', n: 'la poule', f: '🌽', fn: 'le maïs', like: 'le maïs' },
    { a: '🐱', n: 'le chat', f: '🐟', fn: 'le poisson', like: 'le poisson' },
    { a: '🐶', n: 'le chien', f: '🦴', fn: "l'os", like: 'les os' },
    { a: '🐛', n: 'la chenille', f: '🥬', fn: 'la salade', like: 'la salade' },
    { a: '🐷', n: 'le cochon', f: '🍎', fn: 'la pomme', like: 'les pommes' },
    { a: '🐮', n: 'la vache', f: '🌿', fn: "l'herbe", like: "l'herbe" }
  ];
  const pron = n => /^la /.test(n) || ['la souris', 'la poule', 'la chenille', 'la vache'].includes(n) ? 'elle' : 'il';

  // ---------- Le bon chemin : on fait glisser l'animal le long d'un chemin jusqu'à son goûter ----------
  const DECOYS = [
    { e: '🌲', n: 'au sapin' }, { e: '⛄', n: 'au bonhomme de neige' }, { e: '🍄', n: 'au champignon' },
    { e: '🪨', n: 'au caillou' }, { e: '🌻', n: 'au tournesol' }, { e: '🏠', n: 'à la maison' }
  ];
  const FIL_COLORS = ['#E5484D', '#1E63D6', '#E8A400'];
  const FIL_SAME = '#2E8B57';
  const MAZE_LEVELS = [
    { mids: 1, colors: true, cross: false }, { mids: 1, colors: true, cross: true }, { mids: 2, colors: true, cross: true },
    { mids: 2, colors: false, cross: true }, { mids: 3, colors: false, cross: true }
  ];
  const mazeLevel = () => MAZE_LEVELS[Math.min(store.get('mazeWins', 0), MAZE_LEVELS.length - 1)];

  function catmull(pts, step) {
    const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    const res = [out[0]];
    let acc = 0;
    for (let i = 1; i < out.length; i++) {
      acc += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
      if (acc >= step) { res.push(out[i]); acc = 0; }
    }
    res.push(out[out.length - 1]);
    return res;
  }

  function mazeGame(G, f) {
    const L = mazeLevel();
    const wrap = el('div', 'maze');
    $('#stage').append(wrap);
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const cv = el('canvas');
    wrap.append(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);

    const meal = pickNew(MEALS, G, m => m.n);
    const ends = shuffle([{ e: meal.f, win: true, n: /^le /.test(meal.fn) ? 'au ' + meal.fn.slice(3) : 'à ' + meal.fn }, ...shuffle(DECOYS).slice(0, 2)]);
    let order = [0, 1, 2];
    if (L.cross) { order = shuffle(order); if (order.every((v, i) => v === i)) order.push(order.shift()); }
    const S = [W / 2, Math.min(70, H * 0.11)];
    const botY = H - Math.min(60, H * 0.09), y1 = botY - 40;
    const ex = [W * 0.17, W * 0.5, W * 0.83];
    const fan = [-0.24, 0, 0.24];
    const paths = [0, 1, 2].map(i => {
      const way = [S, [W / 2 + fan[i] * W, S[1] + Math.min(80, H * 0.12)]];
      const top = way[1][1];
      for (let k = 1; k <= L.mids; k++) {
        const yy = top + (y1 - top) * (k / (L.mids + 1)) + (Math.random() - 0.5) * (y1 - top) / (L.mids + 1) * 0.5;
        const xx = L.cross ? W * (0.1 + Math.random() * 0.8) : (way[1][0] * (1 - k / (L.mids + 1)) + ex[order[i]] * (k / (L.mids + 1))) + (Math.random() - 0.5) * W * 0.1;
        way.push([xx, yy]);
      }
      way.push([ex[order[i]], y1]);
      return { end: ends[order[i]], pts: catmull(way, 4), color: L.colors ? FIL_COLORS[i] : FIL_SAME, done: false };
    });
    const lw = Math.max(12, Math.min(18, W / 24));
    const tol = Math.max(34, lw * 2.6);
    let act = null, p = 0, pos = S, dragging = false, finished = false, busy = false, hand = null, lastTouch = performance.now();
    const fontE = s => `${s}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    const poly = pts => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); };

    function draw() {
      x.clearRect(0, 0, W, H);
      x.lineCap = 'round'; x.lineJoin = 'round';
      // les chemins : une route claire avec une bande de couleur
      paths.forEach(P => {
        x.globalAlpha = P.done ? 0.25 : 1;
        x.strokeStyle = '#E9EEF6'; x.lineWidth = lw * 2; poly(P.pts); x.stroke();
        x.strokeStyle = P.color; x.lineWidth = lw; poly(P.pts); x.stroke();
      });
      x.globalAlpha = 1;
      if (act && p > 0) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = lw * 0.4; x.setLineDash([2, 10]); poly(act.pts.slice(0, p + 1)); x.stroke(); x.setLineDash([]); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      // arrivées : le goûter brille, les autres sont plus petits
      ends.forEach((E, k) => {
        const P = paths.find(q => q.end === E);
        if (E.win) {
          const t = performance.now() / 500;
          x.fillStyle = `rgba(255,200,61,${0.35 + 0.15 * Math.sin(t)})`;
          x.beginPath(); x.arc(ex[k], botY, 38, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#000'; x.font = fontE(52); x.fillText(E.e, ex[k], botY + 4);
        } else {
          x.globalAlpha = P && P.done ? 0.35 : 0.9;
          x.fillStyle = '#000'; x.font = fontE(40); x.fillText(E.e, ex[k], botY + 4);
          x.globalAlpha = 1;
        }
      });
      // l'animal, avec un cercle qui invite à le toucher
      if (!finished && !dragging) {
        const t = performance.now() / 400;
        x.strokeStyle = 'rgba(63,154,67,.85)'; x.lineWidth = 5;
        x.beginPath(); x.arc(pos[0], pos[1], 34 + 4 * Math.sin(t), 0, Math.PI * 2); x.stroke();
      }
      x.fillStyle = '#000'; x.font = fontE(dragging ? 60 : 54); x.fillText(meal.a, pos[0], pos[1]);
      if (hand) { x.font = fontE(44); x.fillText('👆', hand[0] + 14, hand[1] + 30); }
    }
    let raf = 0;
    const loop = () => { if (f !== G.flow) return; draw(); raf = requestAnimationFrame(loop); };
    loop();

    // petite main qui montre le geste, au début et quand rien ne se passe
    function showHand() {
      if (finished || dragging || busy) return;
      const P = pick(paths.filter(q => !q.done));
      let k = 0;
      const pts = act && act === P ? P.pts.slice(p) : P.pts;
      const step = () => {
        if (f !== G.flow || dragging || finished) { hand = null; return; }
        hand = pts[Math.min(k, pts.length - 1)];
        k += 3;
        if (k < Math.min(pts.length, 70)) requestAnimationFrame(step); else setTimeout(() => { hand = null; }, 300);
      };
      step();
    }
    const idle = setInterval(() => {
      if (f !== G.flow) { clearInterval(idle); return; }
      if (!dragging && !finished && !busy && performance.now() - lastTouch > 7000) { lastTouch = performance.now(); showHand(); }
    }, 1000);

    const ptr = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      if (finished || busy || f !== G.flow) return;
      e.preventDefault(); audio();
      lastTouch = performance.now();
      const q = ptr(e);
      if (Math.hypot(q[0] - pos[0], q[1] - pos[1]) < 70) {
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
        dragging = true; hand = null;
      } else say(`Pose ton doigt sur ${meal.n}, et fais-${pron(meal.n) === 'elle' ? 'la' : 'le'} glisser sur un chemin !`);
    });
    cv.addEventListener('pointermove', e => {
      if (!dragging) return;
      lastTouch = performance.now();
      const q = ptr(e);
      if (!act) {
        // au départ : on choisit le chemin le plus proche du doigt
        let best = null, bd = tol, bi = 0;
        paths.forEach(P => { if (P.done) return; for (let i = 3; i < Math.min(P.pts.length, 40); i++) { const d = Math.hypot(P.pts[i][0] - q[0], P.pts[i][1] - q[1]); if (d < bd) { bd = d; best = P; bi = i; } } });
        if (best) { act = best; p = bi; pos = act.pts[p]; }
        return;
      }
      let bi = -1, bd = tol;
      for (let i = Math.max(0, p - 25); i <= Math.min(act.pts.length - 1, p + 25); i++) {
        const d = Math.hypot(act.pts[i][0] - q[0], act.pts[i][1] - q[1]);
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi < 0) return;
      if (Math.floor(bi / 12) > Math.floor(p / 12)) note(480 + bi * 2.5, 0, 0.05, 'sine', 0.05);
      p = bi; pos = act.pts[p];
      if (p < 3) { act = null; p = 0; pos = S; return; }   // revenu au départ : on peut changer de chemin
      if (p >= act.pts.length - 4) arrive();
    });
    const up = () => { dragging = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function slide(pts, dur) {
      return new Promise(res => {
        const t0 = performance.now();
        const step = t => {
          const k = Math.max(0, Math.min(1, (t - t0) / dur));
          pos = pts[Math.floor(k * (pts.length - 1))];
          if (k < 1 && f === G.flow) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    }
    async function arrive() {
      dragging = false; busy = true;
      const P = act;
      pos = P.pts[P.pts.length - 1];
      if (P.end.win) {
        finished = true;
        sfx.good(); confetti();
        await say(`Miam ! ${cap(meal.n)} a trouvé ${meal.fn} ! Bravo !`);
        cancelAnimationFrame(raf); clearInterval(idle);
        if (f === G.flow) { G.n = G.total; nextQ(); }
        return;
      }
      sfx.soft();
      await say(`Oh ! Ce chemin va ${P.end.n}. On retourne au départ, et on essaie un autre chemin !`);
      if (f !== G.flow) return;
      await slide(P.pts.slice().reverse(), 1200);
      P.done = true; act = null; p = 0; pos = S; busy = false;
      lastTouch = performance.now() - 5000;
    }

    if (location.hash === '#test') window.__maze = { paths, S, rect: () => cv.getBoundingClientRect() };
    $('#caption').textContent = `Fais glisser ${meal.n} jusqu'${ends.find(E => E.win).n}`;
    G.prompt = `${cap(meal.n)} a faim ! ${cap(meal.fn)} est en bas. Pose ton doigt sur ${meal.n}, et fais-${pron(meal.n) === 'elle' ? 'la' : 'le'} glisser sur le bon chemin !`;
    G.replay = () => { audio(); say(G.prompt); showHand(); };
    (async () => { await say(G.prompt); if (f === G.flow) showHand(); })();
  }

  // ---------- Cris d'animaux : fabriqués par l'appli, ou enregistrés par les parents ----------
  function tone(o) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + (o.at || 0);
    const vol = (o.vol || 0.4) * settings.volume;
    const out = a.createGain();
    const env = o.g || [[0, 0], [0.05, 1], [0.5, 0]];
    out.gain.setValueAtTime(0.0001, t0);
    env.forEach(([t, v]) => out.gain.linearRampToValueAtTime(Math.max(0.0001, v * vol), t0 + t));
    let src;
    if (o.type === 'noise') {
      const len = a.sampleRate * (env[env.length - 1][0] + 0.05);
      const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      src = a.createBufferSource(); src.buffer = buf;
    } else {
      src = a.createOscillator(); src.type = o.type || 'sawtooth';
      const fp = o.f || [[0, 220]];
      src.frequency.setValueAtTime(fp[0][1], t0);
      fp.slice(1).forEach(([t, v]) => src.frequency.linearRampToValueAtTime(v, t0 + t));
      if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(src.frequency); l.start(t0); l.stop(t0 + env[env.length - 1][0] + 0.1); }
    }
    let node = src;
    if (o.am) {
      const amg = a.createGain(); amg.gain.value = 1 - o.am[1] / 2;
      const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.am[0]; lg.gain.value = o.am[1] / 2;
      l.connect(lg); lg.connect(amg.gain); l.start(t0); l.stop(t0 + env[env.length - 1][0] + 0.1);
      node.connect(amg); node = amg;
    }
    if (o.filt) {
      const fl = a.createBiquadFilter(); fl.type = o.filt[0]; fl.Q.value = o.filt[2] || 1;
      const ff = o.filt[1];
      fl.frequency.setValueAtTime(ff[0][1], t0);
      ff.slice(1).forEach(([t, v]) => fl.frequency.linearRampToValueAtTime(v, t0 + t));
      node.connect(fl); node = fl;
    }
    node.connect(out); out.connect(a.destination);
    src.start(t0); src.stop(t0 + env[env.length - 1][0] + 0.1);
  }
  const CRIES = {
    'la vache': () => { tone({ f: [[0, 118], [0.25, 124], [1.1, 96]], g: [[0, 0], [0.2, 1], [0.95, 0.8], [1.3, 0]], filt: ['lowpass', [[0, 350], [0.35, 950], [1.2, 420]], 6], vol: 0.6 }); return 1400; },
    'le chat': () => { tone({ f: [[0, 520], [0.18, 780], [0.55, 610], [0.78, 430]], g: [[0, 0], [0.06, 1], [0.6, 0.8], [0.82, 0]], filt: ['bandpass', [[0, 700], [0.22, 1900], [0.8, 850]], 3], vol: 0.6 }); return 900; },
    'le chien': () => { [0, 0.3].forEach(at => { tone({ at, f: [[0, 430], [0.13, 260]], g: [[0, 0], [0.01, 1], [0.15, 0]], filt: ['bandpass', [[0, 900]], 1.5], vol: 0.7 }); tone({ at, type: 'noise', g: [[0, 0], [0.01, 1], [0.12, 0]], filt: ['bandpass', [[0, 1300]], 1.2], vol: 0.35 }); }); return 600; },
    'le mouton': () => { tone({ f: [[0, 300], [0.9, 275]], vib: [8, 24], g: [[0, 0], [0.08, 1], [0.8, 0.7], [1.05, 0]], filt: ['bandpass', [[0, 1100]], 2], vol: 0.6 }); return 1150; },
    'le cochon': () => { [0, 0.32].forEach(at => tone({ at, type: 'square', f: [[0, 165], [0.22, 110]], am: [32, 0.9], g: [[0, 0], [0.02, 1], [0.24, 0]], filt: ['lowpass', [[0, 700]], 4], vol: 0.5 })); return 650; },
    'la poule': () => { [0, 0.17, 0.34].forEach(at => tone({ at, type: 'triangle', f: [[0, 720], [0.08, 540]], g: [[0, 0], [0.01, 1], [0.09, 0]], filt: ['bandpass', [[0, 1200]], 2], vol: 0.6 })); tone({ at: 0.58, type: 'sawtooth', f: [[0, 900], [0.28, 600]], g: [[0, 0], [0.02, 1], [0.3, 0]], filt: ['bandpass', [[0, 1300]], 3], vol: 0.45 }); return 950; },
    'le canard': () => { [0, 0.26].forEach(at => tone({ at, f: [[0, 250], [0.18, 200]], g: [[0, 0], [0.02, 1], [0.19, 0]], filt: ['bandpass', [[0, 1300]], 7], vol: 0.8 })); return 500; },
    'la grenouille': () => { [0, 0.42].forEach(at => tone({ at, type: 'square', f: [[0, 96], [0.3, 84]], am: [45, 1], g: [[0, 0], [0.03, 1], [0.32, 0]], filt: ['lowpass', [[0, 650]], 5], vol: 0.55 })); return 800; },
    'la souris': () => { [0, 0.16, 0.32].forEach(at => tone({ at, type: 'sine', f: [[0, 2600], [0.09, 3300]], g: [[0, 0], [0.01, 1], [0.1, 0]], vol: 0.25 })); return 450; },
    'le hibou': () => { [0, 0.6].forEach(at => tone({ at, type: 'sine', f: [[0, 430], [0.45, 380]], vib: [5, 6], g: [[0, 0], [0.09, 1], [0.35, 0.6], [0.5, 0]], vol: 0.5 })); return 1150; },
    'le coq': () => { [[0, 520, 0.14], [0.16, 700, 0.14], [0.32, 880, 0.14], [0.5, 760, 0.65]].forEach(([at, fq, d]) => tone({ at, f: [[0, fq], [d, fq * 0.96]], vib: [9, 8], g: [[0, 0], [0.02, 1], [d - 0.03, 0.8], [d, 0]], filt: ['bandpass', [[0, 1500]], 2], vol: 0.5 })); return 1200; },
    'le loup': () => { tone({ type: 'triangle', f: [[0, 330], [0.5, 640], [1.6, 570], [2.2, 430]], vib: [6, 10], g: [[0, 0], [0.3, 1], [1.8, 0.8], [2.3, 0]], filt: ['lowpass', [[0, 1500]], 1], vol: 0.6 }); return 2300; }
  };
  const criKey = n => 'cri.' + n;
  function playCry(an) {
    return new Promise(res => {
      hush();
      const rec = store.get(criKey(an.n), null);
      if (rec) {
        try {
          const au = new Audio(rec); au.volume = settings.volume;
          au.onended = res; au.onerror = res; au.play().catch(res);
          setTimeout(res, 4000);
          return;
        } catch (e) { /* on retombe sur le cri fabriqué */ }
      }
      const fn = CRIES[an.n];
      if (!fn || !audio()) { res(); return; }
      setTimeout(res, fn() + 150);
    });
  }

  // ---------- Les chiffres : tracer 1 à 10 au doigt ----------
  const DIGITS = (() => {
    const O = [arc(50, 70, 42, 68, -90, -450, 44)];
    return {
      0: O,
      1: [[[22, 34], [58, 0], [58, 140]]],
      2: [[...arc(50, 40, 40, 40, -165, 25, 22), [10, 140], [92, 140]]],
      3: [[...arc(48, 36, 38, 36, -160, 90, 22), ...arc(48, 104, 42, 36, -90, 160, 22)]],
      4: [[[66, 0], [8, 96], [95, 96]], [[66, 44], [66, 140]]],
      5: [[[86, 0], [22, 0], [17, 64], ...arc(48, 98, 40, 40, -130, 155, 26)]],
      6: [[...arc(70, 95, 58, 90, -105, -180, 16), ...arc(50, 100, 38, 38, 180, 540, 40)]],
      7: [[[8, 0], [92, 0], [36, 140]]],
      8: [[...arc(50, 105, 40, 35, -90, 270, 40), ...arc(50, 35, 32, 35, 90, -270, 40)]],
      9: [[...arc(50, 40, 38, 40, 0, -360, 36), [88, 40], [86, 140]]]
    };
  })();
  const DIGIT_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  const DIGIT_ITEMS = ['🍓', '⭐', '🐞', '🎈', '🌸', '🍎', '🐟', '🦋'];
  function digitGame(G, f) {
    const L = lvl('chiffres');
    const max = L === 0 ? 5 : 10;
    let next = store.get('digitNext', 1);
    if (next > max) next = 1;
    const nums = [next, next + 1, next + 2].map(n => ((n - 1) % max) + 1);
    store.set('digitNext', nums[2] + 1);
    const stage = $('#stage');
    const row = el('div', 'digit-row');
    const wrap = el('div', 'trace');
    stage.append(row, wrap);
    $('#caption').textContent = 'Suis le chemin avec ton doigt';
    (async () => {
      for (let i = 0; i < nums.length; i++) {
        if (f !== G.flow) return;
        const n = nums[i], item = pick(DIGIT_ITEMS);
        row.innerHTML = `<span class="digit-big">${n}</span><span class="digit-items">${`<i>${item}</i>`.repeat(n)}</span>`;
        const parts = String(n).split('');
        for (let k = 0; k < parts.length; k++) {
          if (f !== G.flow) return;
          await traceLetter(wrap, parts[k], i + k, f, {
            strokes: DIGITS[parts[k]], precise: L === 2,
            label: parts.length > 1 ? `Le chiffre ${DIGIT_WORDS[n]}. ${k === 0 ? 'D\'abord le un' : 'Puis le zéro'}` : `Le chiffre ${DIGIT_WORDS[n]}`,
            first: i === 0 && k === 0 ? 'On écrit les chiffres !' : ''
          });
        }
        if (f !== G.flow) return;
        sfx.good();
        await Promise.all([say(`Bravo ! Tu as écrit ${DIGIT_WORDS[n]} !`), sleep(900)]);
      }
      if (f === G.flow) { G.n = G.total; nextQ(); }
    })();
  }

  // ---------- Bilan pour les parents ----------
  const loadStats = () => store.get('stats', {});
  function statFor(all, id) { return all[id] || (all[id] = { plays: 0, q: 0, first: 0, conf: {}, last: '' }); }
  function statAnswer(id, firstTry, confKey) {
    const all = loadStats(), s = statFor(all, id);
    if (confKey) s.conf[confKey] = (s.conf[confKey] || 0) + 1;
    else { s.q++; if (firstTry) s.first++; }
    store.set('stats', all);
  }
  function statPlay(id) {
    const all = loadStats(), s = statFor(all, id);
    s.plays++; s.last = dayKey();
    store.set('stats', all);
  }
  function renderBilan() {
    const box = $('#bilan'); if (!box) return;
    box.innerHTML = '';
    const all = loadStats();
    const ids = ORDER.filter(id => all[id] && all[id].plays > 0).sort((a, b) => all[b].plays - all[a].plays);
    if (!ids.length) { box.append(el('p', 'muted', 'Pas encore de partie terminée.')); return; }
    const today = dayKey();
    ids.forEach(id => {
      const s = all[id];
      const rowEl = el('div', 'bilan-row');
      const pct = s.q >= 5 ? Math.round(100 * s.first / s.q) : null;
      let tag = '';
      if (pct != null && LEVEL_CFG[id] && !LEVEL_CFG[id].key) {
        if (pct >= 90 && lvl(id) < LEVEL_CFG[id].opts.length - 1) tag = '<span class="tag up">Facile : vous pouvez augmenter</span>';
        else if (pct < 55 && lvl(id) > 0) tag = '<span class="tag down">Difficile : baisser d\'un niveau ?</span>';
      }
      const confs = Object.entries(s.conf).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ×${v}`).join(', ');
      rowEl.innerHTML = `<div class="bilan-head"><b>${GAMES[id].icon} ${GAMES[id].name}</b><span>${s.plays} partie${s.plays > 1 ? 's' : ''}${s.last === today ? ' · aujourd\'hui' : ''}</span></div>`
        + (pct != null ? `<div class="bar-wrap"><span class="bar-fill" style="width:${pct}%"></span></div><div class="muted">${pct} % trouvé du premier coup${tag ? ' ' + tag : ''}</div>` : '')
        + (confs ? `<div class="muted">À la place de… a touché : ${confs}</div>` : '');
      box.append(rowEl);
    });
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
      const lock = id === 'memory' ? store.get('memLock', 0) : 0;
      if (lock > 0) {
        b.classList.add('locked');
        b.append(el('span', 'zz', '💤'), el('span', 'lockdots', '<i></i><i></i><i></i>'.replace(/<i>/g, (m, k) => m)));
        $$('.lockdots i', b).forEach((d, k) => d.classList.toggle('on', k < 3 - lock));
      }
      b.onclick = async () => {
        audio();
        if (id === 'memory' && store.get('memLock', 0) > 0) {
          const n = store.get('memLock', 0);
          sfx.soft(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          say(`Le memory se repose ! Fais encore ${n === 1 ? 'un autre jeu' : n + ' autres jeux'}, et il reviendra.`);
          return;
        }
        sfx.tap();
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
    ch.className = 'choices' + (row ? ' row' : '') + (q.cls ? ' ' + q.cls : '') + (!row && q.choices.length === 4 ? ' four' : '');
    q.choices.forEach((c, i) => {
      const b = el('button', 'choice', c.html);
      b.setAttribute('aria-label', c.label);
      b.style.animationDelay = (i * 90) + 'ms';
      b.onclick = () => answer(b, c, q, f);
      ch.append(b);
    });
    G.qMiss = 0;
    say(q.prompt).then(() => { if (q.after && f === G.flow && !G.lock) q.after(); });
  }

  async function answer(b, c, q, f) {
    if (G.lock || f !== G.flow || b.classList.contains('no')) return;
    audio();
    if (c.correct) {
      G.lock = true;
      sfx.good();
      b.classList.add('yes');
      statAnswer(G.id, !G.qMiss);
      if (q.onCorrect) await q.onCorrect(c);
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
      G.qMiss = (G.qMiss || 0) + 1;
      const target = q.choices.find(x => x.correct);
      if (target) statAnswer(G.id, false, `${target.label.replace(/^(le |la |l'|les )/, '')} → ${c.label.replace(/^(le |la |l'|les )/, '')}`);
      say(c.wrong).then(() => { if (q.afterWrong && f === G.flow && !G.lock) q.afterWrong(); });
    }
  }

  function repeat() { audio(); if (G && G.replay) G.replay(); else if (G && G.prompt) say(G.prompt); }

  function finish() {
    statPlay(G.id);
    if (G.def.counting) store.set('countLevel', Math.min(settings.countMax, countLevel() + 2));
    if (G.id === 'memory') { const w = store.get('memLevel', 0); G.leveledUp = w < MEMORY_AUTO_MAX; if (G.leveledUp) store.set('memLevel', w + 1); }
    if (G.id === 'fil') { const w = store.get('mazeWins', 0); G.leveledUp = w < MAZE_LEVELS.length - 1; store.set('mazeWins', w + 1); }
    G.memLocked = false;
    if (G.id === 'memory' && settings.memLimit > 0) {
      const n = store.get('memPlays', 0) + 1;
      if (n >= settings.memLimit) { store.set('memPlays', 0); store.set('memLock', 3); G.memLocked = true; homeIds = null; }
      else store.set('memPlays', n);
    } else if (G.id !== 'memory' && store.get('memLock', 0) > 0) store.set('memLock', store.get('memLock', 0) - 1);
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
    $('#btn-next').hidden = !solo || G.memLocked;
    $('#btn-again').hidden = solo;
    const gift = `Tu as gagné un autocollant : ${stickerName(won.e)} !`;
    if (G.memLocked) { say(`Bravo${who} ! ${gift} Tu as beaucoup joué au memory. Maintenant, va faire trois autres jeux, et le memory reviendra !`); return; }
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
  // Temps d'écran : on compte le temps réellement écoulé (horloge), seulement quand l'appli est
  // visible et hors coin des parents. Chaque utilisation de la journée est notée (heure + durée).
  let lastTick = 0;
  setInterval(() => {
    const now = Date.now();
    const counting = !document.hidden && ['home', 'game', 'end', 'album'].includes(screen);
    if (!counting) { lastTick = 0; return; }
    const stored = store.get('usage', null);                 // relit : une autre fenêtre a pu compter aussi
    if (stored && stored.day === dayKey() && stored.sec > (usage?.sec || 0)) usage = stored;
    freshUsage();
    const delta = lastTick ? Math.min(now - lastTick, 6000) / 1000 : 0;
    const gap = usage.lastAt ? now - usage.lastAt : Infinity;
    usage.log = usage.log || [];
    if (gap > 120000 || !usage.log.length) {
      const d = new Date(now);
      usage.log.push({ at: `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`, sec: 0 });
      if (usage.log.length > 30) usage.log.shift();
    }
    usage.sec += delta;
    usage.log[usage.log.length - 1].sec += delta;
    usage.lastAt = now;
    lastTick = now;
    store.set('usage', usage);
    const left = (settings.timeLimit + usage.extra) * 60 - usage.sec;
    if (settings.timeLimit > 0 && left > 0 && left <= 120 && !usage.warned) {
      usage.warned = true; store.set('usage', usage);
      if (screen !== 'game') say('Encore deux minutes, et ce sera la pause !');
      else setTimeout(() => say('Encore deux minutes de jeu !'), 2500);
    }
    if (limitReached()) {
      if (screen === 'game') pendingRest = true; // on laisse finir la partie en cours
      else if (screen === 'album') {          // après la limite, l'album reste ouvert 5 minutes
        usage.albumSec = (usage.albumSec || 0) + delta; store.set('usage', usage);
        if (usage.albumSec >= ALBUM_AFTER) goRest();
      } else goRest();
    }
  }, 2000);
  const ALBUM_AFTER = 300;
  function goRest() {
    hush(); pendingRest = false; releaseAwake();
    show('rest');
    const nm = settings.name ? ' ' + settings.name : '';
    freshUsage();
    const albumLeft = (usage.albumSec || 0) < ALBUM_AFTER;
    $('#btn-rest-album').hidden = !albumLeft;
    say(albumLeft ? `C'est l'heure de faire une pause${nm}. Tu peux encore regarder ton album, si tu veux !` : `C'est l'heure de faire une pause${nm}. L'album aussi se repose. À tout à l'heure !`);
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
    $('#set-memlimit').value = String(settings.memLimit);
    const ml = store.get('memLock', 0);
    $('#mem-info').textContent = ml > 0 ? `Memory en pause : encore ${ml} autre(s) jeu(x)` : `Parties de memory d'affilée : ${store.get('memPlays', 0)}`;
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
    const ml2 = store.get('memLock', 0);
    if ($('#mem-info')) $('#mem-info').textContent = ml2 > 0 ? `Memory en pause : encore ${ml2} autre(s) jeu(x)` : `Parties de memory d'affilée : ${store.get('memPlays', 0)}`;
    $('#album-info').textContent = `Album : ${loadStickers().length} autocollants`;
    renderLevels();
    renderBilan();
    renderCries();
    freshUsage();
    const min = Math.floor(usage.sec / 60);
    let info = `Joué aujourd'hui : ${min} min`;
    if (usage.extra) info += ` · ${usage.extra > 0 ? '+' : '−'}${Math.abs(usage.extra)} min aujourd'hui`;
    if (settings.timeLimit > 0) info += ` · reste ${Math.max(0, settings.timeLimit + usage.extra - min)} min`;
    $('#usage-info').textContent = info;
    const lg = $('#usage-log'); lg.innerHTML = '';
    (usage.log || []).filter(e => e.sec >= 30).forEach(e => lg.append(el('span', 'log-chip', `${e.at} · ${Math.round(e.sec / 60)} min`)));
    if (!lg.children.length) lg.append(el('span', 'muted', 'Pas encore joué aujourd\'hui.'));
    $('#btn-less').disabled = settings.timeLimit > 0 && settings.timeLimit + usage.extra <= 0;
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
  $('#set-mempeek').onchange = e => { settings.memPeek = +e.target.value; saveSettings(); };
  $('#set-memdelay').onchange = e => { settings.memDelay = e.target.value; saveSettings(); };
  $('#set-memgroup').onchange = e => { settings.memGroup = +e.target.value; saveSettings(); };
  $('#set-memlimit').onchange = e => { settings.memLimit = +e.target.value; saveSettings(); };
  $('#btn-mem-unlock').onclick = () => { store.set('memLock', 0); store.set('memPlays', 0); homeIds = null; refreshParentInfo(); };
  $('#set-limit').onchange = e => { settings.timeLimit = +e.target.value; saveSettings(); refreshParentInfo(); };
  $('#btn-test-voice').onclick = () => { audio(); sfx.good(); say(settings.name ? `Bonjour ${settings.name} ! Où est la carotte ?` : 'Bonjour ! Où est la carotte ?'); };
  $('#btn-count-reset').onclick = () => { store.set('countLevel', 5); refreshParentInfo(); };
  // enregistrement des cris au micro
  let recording = null;
  function renderCries() {
    const box = $('#cries'); if (!box) return;
    box.innerHTML = '';
    ANIMALS.forEach(an => {
      const has = !!store.get(criKey(an.n), null);
      const row = el('div', 'row cry-row');
      row.append(el('span', '', `${an.e} ${cap(an.n)} ${has ? '<small class="rec-ok">(votre enregistrement)</small>' : ''}`));
      const btns = el('span', 'tb');
      const play = el('button', 'pill-text', '▶'); play.setAttribute('aria-label', 'Écouter'); play.onclick = () => { audio(); playCry(an); };
      const rec = el('button', 'pill-text rec', recording && recording.n === an.n ? '■ Stop' : '● Enreg.');
      rec.onclick = () => toggleRecord(an, rec);
      btns.append(play, rec);
      if (has) { const del = el('button', 'pill-text', '✕'); del.setAttribute('aria-label', 'Revenir au cri de l\'appli'); del.onclick = () => { try { localStorage.removeItem('mpj.' + criKey(an.n)); } catch (e) { /* rien */ } renderCries(); }; btns.append(del); }
      row.append(btns);
      box.append(row);
    });
  }
  async function toggleRecord(an, btn) {
    if (recording) { recording.stop(); return; }
    const msg = $('#cry-msg');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearTimeout(mr._t); recording = null;
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const fr = new FileReader();
        fr.onload = () => {
          try { localStorage.setItem('mpj.' + criKey(an.n), JSON.stringify(fr.result)); msg.textContent = `Enregistré : ${an.n}.`; }
          catch (e) { msg.textContent = 'Plus de place pour enregistrer. Effacez un autre cri (✕) et réessayez.'; }
          renderCries();
        };
        fr.readAsDataURL(blob);
      };
      recording = { n: an.n, stop: () => mr.state !== 'inactive' && mr.stop() };
      mr.start();
      mr._t = setTimeout(() => recording && recording.stop(), 4000);
      msg.textContent = `Enregistrement du cri ${an.n === 'la vache' ? 'de la vache' : 'de ' + an.n}… (4 secondes maximum, touchez « Stop » pour finir)`;
      renderCries();
    } catch (e) {
      msg.textContent = 'Le micro n\'est pas disponible. Autorisez le micro pour ce site dans Chrome, puis réessayez.';
    }
  }
  $('#btn-bilan-reset').onclick = e => {
    if (e.target.dataset.armed !== '1') { e.target.dataset.armed = '1'; e.target.textContent = 'Toucher encore'; setTimeout(() => { e.target.dataset.armed = ''; e.target.textContent = 'Effacer le bilan'; }, 3000); return; }
    store.set('stats', {}); e.target.dataset.armed = ''; e.target.textContent = 'Effacer le bilan'; renderBilan();
  };
  // rubriques repliables, état retenu
  $$('#parent details.pgroup').forEach(d => {
    const k = 'open.' + d.dataset.k;
    d.open = !!store.get(k, false);
    d.addEventListener('toggle', () => store.set(k, d.open));
  });

  function renderLevels() {
    $('#set-mempeek').value = String(settings.memPeek);
    $('#set-memdelay').value = settings.memDelay;
    $('#set-memgroup').value = String(settings.memGroup);
    const box = $('#set-levels'); if (!box) return;
    box.innerHTML = '';
    ORDER.filter(id => LEVEL_CFG[id]).forEach(id => {
      const c = LEVEL_CFG[id];
      const row = el('label', 'row lvl-row');
      row.setAttribute('for', 'lvl-' + id);
      row.append(el('span', '', `${GAMES[id].icon} ${GAMES[id].name}${c.key ? ' <small>(monte seul)</small>' : ''}`));
      const sel = el('select');
      sel.id = 'lvl-' + id;
      c.opts.forEach((o, i) => { const op = el('option', '', `${i + 1}. ${o}`); op.value = i; sel.append(op); });
      sel.value = lvl(id);
      sel.onchange = () => setLvl(id, +sel.value);
      row.append(sel);
      box.append(row);
    });
  }
  $('#btn-extra').onclick = () => { freshUsage(); usage.extra += 10; store.set('usage', usage); refreshParentInfo(); };
  $('#btn-reset-time').onclick = e => {
    if (e.target.dataset.armed !== '1') { e.target.dataset.armed = '1'; e.target.textContent = 'Toucher encore'; setTimeout(() => { e.target.dataset.armed = ''; e.target.textContent = 'Remettre à zéro'; }, 3000); return; }
    usage = { day: dayKey(), sec: 0, extra: 0 }; store.set('usage', usage); e.target.dataset.armed = ''; e.target.textContent = 'Remettre à zéro'; refreshParentInfo();
  };
  $('#btn-less').onclick = () => { freshUsage(); usage.extra = Math.max(-settings.timeLimit, usage.extra - 10); store.set('usage', usage); refreshParentInfo(); };
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
  $('#btn-rest-album').onclick = () => { sfx.tap(); openAlbum(); };
  let resetArmed = 0;
  $('#btn-album-reset').onclick = e => {
    if (Date.now() - resetArmed > 3000) { resetArmed = Date.now(); e.target.textContent = 'Toucher encore pour vider'; setTimeout(() => { e.target.textContent = "Vider l'album"; }, 3000); return; }
    saveStickers([]); store.set('albumWelcome', false); resetArmed = 0; e.target.textContent = "Vider l'album"; refreshParentInfo();
  };
  $('#btn-next').onclick = () => { sfx.tap(); startGame(G.id, { next: true, harder: !!G.leveledUp, nameIdx: G.id === 'prenom' ? (G.nameIdx ?? -1) + 1 : undefined }); };
  $('#btn-end-home').onclick = () => { sfx.tap(); goHome(); };

  // ---------- Hors connexion ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.hostname)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
