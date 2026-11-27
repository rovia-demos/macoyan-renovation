(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  // Hauteur d'écran mesurée une fois ; recalcul seulement si la largeur change (rotation)
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    root.style.setProperty('--vh', innerHeight / 100 + 'px');
    fillLastRow();
  });

  // En-tête
  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu mobile
  const burger = $('#burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Vidéo du hero
  const video = $('#heroVideo');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduce && !saveData) {
    video.src = innerWidth < 761 ? video.dataset.srcSm : video.dataset.srcLg;
    video.addEventListener('playing', () => video.classList.add('ready'), { once: true });
    video.play().catch(() => {});
    new IntersectionObserver(([en]) => { en.isIntersecting ? video.play().catch(() => {}) : video.pause(); }).observe(video.parentElement);
  }

  // Apparitions au défilement
  const io = new IntersectionObserver(ens => ens.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv-in, #map').forEach(el => io.observe(el));

  // Services : la « pancarte » suit le service lu
  const board = $('#svcBoard');
  const svcs = $$('.svc');
  if (board) {
    const figs = $$('figure', board), num = $('#svcNum'), name = $('#svcName');
    const setSvc = i => {
      svcs.forEach((s, k) => s.classList.toggle('on', k === i));
      figs.forEach((f, k) => {
        f.classList.toggle('on', k === i);
        if (k === i) { const im = $('img', f); im.loading = 'eager'; }
      });
      num.textContent = String(i + 1).padStart(2, '0');
      name.textContent = $('h3', svcs[i]).textContent;
    };
    const sio = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) setSvc(+en.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' });
    svcs.forEach(s => sio.observe(s));
  }

  // Avant / après
  const sl = $('#baSlider');
  if (sl) {
    const handle = $('#baHandle'), aft = $('#baAfter'), bef = $('#baBefore');
    let pos = 50, drag = false;
    const set = p => {
      pos = Math.max(0, Math.min(100, p));
      sl.style.setProperty('--pos', pos + '%');
      handle.setAttribute('aria-valuenow', Math.round(pos));
    };
    const fromX = x => { const r = sl.getBoundingClientRect(); set((x - r.left) / r.width * 100); };
    let startX = 0, startY = 0, decided = false;
    sl.addEventListener('pointerdown', e => {
      drag = true; decided = e.pointerType !== 'touch'; startX = e.clientX; startY = e.clientY;
      sl.classList.remove('hint');
      if (decided) { sl.setPointerCapture(e.pointerId); sl.classList.add('drag'); fromX(e.clientX); }
    });
    sl.addEventListener('pointermove', e => {
      if (!drag) return;
      if (!decided) {
        const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { drag = false; return; }
        decided = true; sl.setPointerCapture(e.pointerId); sl.classList.add('drag');
      }
      fromX(e.clientX);
    });
    const end = e => {
      if (drag && !decided && e.type === 'pointerup') fromX(e.clientX);
      drag = false; sl.classList.remove('drag');
    };
    sl.addEventListener('pointerup', end);
    sl.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(pos - step); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(pos + step); e.preventDefault(); }
      if (e.key === 'Home') { set(0); e.preventDefault(); }
      if (e.key === 'End') { set(100); e.preventDefault(); }
    });
    const tabs = $$('.ba-tabs .tab');
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-pressed', x === t));
      const k = t.dataset.k;
      [[aft, 'apres', 'Après'], [bef, 'avant', 'Avant']].forEach(([im, s, l]) => {
        im.srcset = `img/${k}-${s}-800.webp 800w, img/${k}-${s}-1600.webp 1600w`;
        im.src = `img/${k}-${s}-800.webp`;
        im.alt = `${l} : ${t.dataset.t}`;
      });
      $('#baTitle').textContent = t.dataset.t;
      $('#baDesc').textContent = t.dataset.d;
      $('#baCount').textContent = String(i + 1).padStart(2, '0') + '/' + String(tabs.length).padStart(2, '0');
      set(50);
    }));
  }

  // Réalisations : filtres, « voir tout », grille sans trou
  const grid = $('#grid');
  const tiles = $$('.tile', grid);
  const more = $('#galMore');
  let filter = 'all', expanded = false;
  const limit = () => innerWidth < 761 ? 4 : 8;
  function fillLastRow() {
    const vis = tiles.filter(t => !t.hidden);
    vis.forEach(t => { t.style.gridColumn = ''; t.style.aspectRatio = ''; t.classList.remove('wide'); });
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const rest = vis.length % cols;
    if (rest) { const last = vis[vis.length - 1]; last.style.gridColumn = `span ${cols - rest + 1}`; last.classList.add('wide'); if (rest === 1) last.style.aspectRatio = `${cols} / 1`; }
  }
  function renderGrid() {
    let n = 0;
    const match = tiles.filter(t => filter === 'all' || t.dataset.cat === filter);
    tiles.forEach(t => {
      const ok = match.includes(t);
      t.hidden = !ok || (!expanded && n >= limit());
      if (ok) n++;
    });
    more.hidden = expanded || match.length <= limit();
    fillLastRow();
  }
  $$('.filters .tab').forEach(b => b.addEventListener('click', () => {
    $$('.filters .tab').forEach(x => x.setAttribute('aria-pressed', x === b));
    filter = b.dataset.f; renderGrid();
  }));
  more.addEventListener('click', () => { expanded = true; renderGrid(); });
  renderGrid();

  // Visionneuse
  const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let cur = 0, lastFocus = null;
  const visTiles = () => tiles.filter(t => !t.hidden);
  const show = i => {
    const v = visTiles(); cur = (i + v.length) % v.length;
    lbImg.src = v[cur].dataset.full; lbImg.alt = v[cur].dataset.cap; lbCap.textContent = v[cur].dataset.cap;
  };
  const closeLb = () => { lb.classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  tiles.forEach(t => t.addEventListener('click', () => {
    lastFocus = t; show(visTiles().indexOf(t)); lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('#lbX').focus();
  }));
  $('#lbX').addEventListener('click', closeLb);
  $('#lbP').addEventListener('click', () => show(cur - 1));
  $('#lbN').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  // Frise du chantier
  const steps = $('#steps');
  if (steps) {
    const items = $$('.step', steps);
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      steps.style.setProperty('--p', 1);
      items.forEach((s, i) => setTimeout(() => s.classList.add('on'), reduce ? 0 : 250 + i * 260));
    }, { threshold: .35 }).observe(steps);
  }

  // Compteurs
  const stats = $('#stats');
  if (stats) new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    $$('[data-count]', stats).forEach(el => {
      const to = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = reduce ? 1 : 1600;
      const fmt = v => dec ? v.toFixed(dec).replace('.', ',') : Math.round(v);
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - k, 3));
        el.textContent = fmt(v);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .4 }).observe(stats);

  // Carte
  const pins = $$('.pin'), towns = $$('#towns button');
  const hi = slug => {
    pins.forEach(p => p.classList.toggle('on', p.dataset.town === slug));
    towns.forEach(b => b.classList.toggle('on', b.dataset.town === slug));
  };
  [...pins, ...towns].forEach(el => {
    el.addEventListener('mouseenter', () => hi(el.dataset.town));
    el.addEventListener('focus', () => hi(el.dataset.town));
    el.addEventListener('click', () => hi(el.dataset.town));
  });
  $('#map') && $('#map').addEventListener('mouseleave', () => hi(null));

  // Simulateur
  const sim = $('#sim');
  if (sim) {
    const OPTS = {
      dalle: ['Quelle surface environ ?', ['Moins de 20 m²', '20 à 50 m²', '50 à 100 m²', 'Plus de 100 m²']],
      terrasse: ['Quelle surface environ ?', ['Moins de 20 m²', '20 à 40 m²', '40 à 80 m²', 'Plus de 80 m²']],
      mur: ['Quelle longueur de mur ?', ['Moins de 10 m', '10 à 25 m', '25 à 50 m', 'Plus de 50 m']],
      ouverture: ["Quel type d'ouverture ?", ['Porte ou fenêtre', "Baie jusqu'à 3 m", 'Grande baie, plus de 3 m', 'Je ne sais pas encore']],
      garage: ['Quelle taille ?', ['Abri de jardin', 'Garage 1 voiture', 'Garage 2 voitures', 'Je ne sais pas encore']],
      renovation: ['Quelle ampleur ?', ['Une pièce', 'Une façade ou un mur', 'Plusieurs travaux', 'Je ne sais pas encore']]
    };
    const DELAI = ['Dès que possible', 'Dans 1 à 3 mois', 'Dans 3 à 6 mois', 'Je me renseigne'];
    const LABEL = { dalle: 'Dalle béton', mur: 'Mur de clôture', terrasse: 'Terrasse', ouverture: 'Ouverture dans un mur', garage: 'Garage', renovation: 'Rénovation' };
    const st = { type: null, size: null, when: null };
    const panels = $$('.sim-panel', sim);
    const go = n => {
      panels.forEach(p => p.classList.toggle('on', +p.dataset.step === n));
      $('#simBar').style.width = (n * 25) + '%';
      $('#simStep').textContent = n < 4 ? `Étape ${n} sur 3` : 'Terminé';
      const first = $(`.sim-panel[data-step="${n}"] button`, sim);
      if (first && n > 1) first.focus({ preventScroll: true });
    };
    const opts = (box, list, key, next) => {
      box.innerHTML = '';
      list.forEach(txt => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', st[key] === txt); b.textContent = txt;
        b.addEventListener('click', () => { st[key] = txt; next(); });
        box.appendChild(b);
      });
    };
    const toStep3 = () => { opts($('#simOpts3'), DELAI, 'when', done); go(3); };
    const done = () => {
      const rc = $('#simRecap'); rc.innerHTML = '';
      [LABEL[st.type], st.size, st.when].forEach(t => { const s = document.createElement('span'); s.textContent = t; rc.appendChild(s); });
      go(4);
    };
    $$('[data-type]', sim).forEach(b => b.addEventListener('click', () => {
      $$('[data-type]', sim).forEach(x => x.setAttribute('aria-pressed', x === b));
      st.type = b.dataset.type;
      $('#simQ2').textContent = OPTS[st.type][0];
      opts($('#simOpts2'), OPTS[st.type][1], 'size', toStep3);
      go(2);
    }));
    $$('[data-back]', sim).forEach(b => b.addEventListener('click', () => {
      const n = +b.closest('.sim-panel').dataset.step; go(n - 1);
    }));
    $('[data-restart]', sim).addEventListener('click', () => { st.type = st.size = st.when = null; $$('[data-type]', sim).forEach(x => x.setAttribute('aria-pressed', false)); go(1); });
    $('#simGo').addEventListener('click', () => {
      const sel = $('#f-type');
      const typeOpt = st.type === 'garage' && st.size === 'Abri de jardin' ? 'Abri de jardin' : LABEL[st.type];
      [...sel.options].forEach(o => { if (o.text === typeOpt) sel.value = o.value || o.text; });
      $('#f-msg').value = `Projet : ${LABEL[st.type]}\nTaille : ${st.size}\nDélai : ${st.when}\n\n`;
      setTimeout(() => { const f = $('#form'); f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); $('#f-nom').focus({ preventScroll: true }); }, 650);
    });
  }

  // Formulaire (démo : aucun envoi réel)
  const form = $('#form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = $$('[required]', form).find(f => !f.value.trim());
    if (bad) { bad.focus(); bad.reportValidity && bad.reportValidity(); return; }
    form.classList.add('sent');
    $('.form-ok', form).focus && form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  // Barre mobile : visible une fois passés les boutons du hero
  const mbar = $('#mbar'), ctas = $('#heroCtas');
  if (mbar && ctas) new IntersectionObserver(([en]) => {
    mbar.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top < 0);
  }).observe(ctas);

  // Parallax léger, souris uniquement
  if (fine && !reduce) {
    const media = $('.hero-media');
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        if (y < 1200) media.style.transform = `translate3d(0,${y * .25}px,0) scale(${1 + y * .00012})`;
        ticking = false;
      });
    }, { passive: true });
  }
})();
