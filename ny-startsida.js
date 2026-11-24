// LAAS · förslag på ny startsida (förhandsvisning). The nav, the menu, the finish, the quantity, Buy (the live cart,
// cart-nav.js), the 360° turn (the same frames as the buy page), films that play when they are on screen, and the
// height of the cookie row so the hero can stay clear of it.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------ nav: clear over the hero photo, solid after it */
  const nav = $('#nav'), hero = $('#top');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => nav.classList.toggle('is-solid', !es[0].isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  }
  const menu = $('#nm-menu'), open = $('#nm-open');   // own ids: cart-nav.js binds #menu-open itself
  const setMenu = on => { menu.hidden = !on; open.setAttribute('aria-expanded', on); nav.classList.toggle('is-menu', on); document.body.style.overflow = on ? 'hidden' : ''; };
  open.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); open.focus(); } });

  /* ------------------------------------------------ the cookie row's height (consent.js adds and removes #laas-consent) */
  const root = document.documentElement;
  const consentH = () => {
    const box = $('#laas-consent');
    const docked = box && matchMedia('(max-width: 599px)').matches;
    root.style.setProperty('--consent-h', docked ? box.offsetHeight + 'px' : '0px');
  };
  new MutationObserver(consentH).observe(document.body, { childList: true });
  addEventListener('resize', consentH); addEventListener('laas-consent', consentH);
  document.addEventListener('click', e => { if (e.target.closest('#laas-consent')) setTimeout(consentH, 0); });
  consentH();

  /* ------------------------------------------------ finish, quantity, Buy */
  const NAME = { steel: 'Steel', copper: 'Copper', black: 'Black' };
  let finish = 'steel', qty = 1;
  const img = $('#spin-img'), btn = $('#buy-btn'), status = $('#buy-status'), qv = $('#qty-value');
  $$('.finishes [data-finish]').forEach(b => b.addEventListener('click', () => {
    finish = b.dataset.finish;
    $$('.finishes [data-finish]').forEach(o => o.setAttribute('aria-checked', o === b));
    img.alt = 'The LAAS Ring-Lock in ' + NAME[finish].toLowerCase();
    spin.show();
  }));
  $$('[data-qty]').forEach(b => b.addEventListener('click', () => { qty = Math.max(1, Math.min(15, qty + +b.dataset.qty)); qv.textContent = qty; }));
  // Buy: the mounting question, then the locks go in the cart right here and the card offers Check out (cart-nav.js)
  btn.addEventListener('click', () => {
    const C = window.LAAS_CART;
    if (!C) { location.href = 'buy.html?finish=' + finish + '&qty=' + qty; return; }
    C.buy(finish, qty, n => {
      if (n === 0) { status.textContent = 'Your cart already has 15 locks, the most in one order.'; return; }
      if (n === false) { status.textContent = 'Your browser blocked the cart. Allow site data for this page and try again.'; return; }
      status.textContent = (n === true ? qty : n) + ' × Ring-Lock, ' + NAME[finish] + ', added to your cart.';
      qty = 1; qv.textContent = 1;
      btn.classList.add('is-added'); btn.textContent = 'Added';
      setTimeout(() => { btn.classList.remove('is-added'); btn.textContent = 'Buy now'; }, 1600);
    });
  });

  /* ------------------------------------------------ the lock: a 360° turn (72 studio frames per finish, as on the buy page) */
  // Starts and rests on the front view; follows the hand; goes back to the front 3 s after the last touch.
  // Until someone touches it only every 30° is loaded.
  const spin = (() => {
    const stage = $('#spin'), N = 72, FRONT = 6, HOME_MS = 3000;
    const url = (f, i) => 'images/spin/' + f + '/1200/' + String(i).padStart(2, '0') + '.webp';
    const got = {}, asked = {};
    const fetchFrame = (f, i) => asked[f + i] || (asked[f + i] = new Promise(r => { const im = new Image(); im.onload = () => { got[f + i] = im; r(im); }; im.onerror = () => r(null); im.src = url(f, i); }));
    const wrap = i => ((i % N) + N) % N;
    const nearest = i => { for (let d = 0; d <= N / 2; d++) for (const j of [i + d, i - d]) if (got[finish + wrap(j)]) return wrap(j); return -1; };
    let pos = FRONT, vel = 0, raf = 0, down = null, homeT = 0, engaged = false, near = false;
    const draw = () => { const j = nearest(wrap(Math.round(pos))); if (j < 0) return; const s = url(finish, j); if (img.getAttribute('src') !== s) img.src = s; };
    const fill = f => {
      const step = engaged ? 1 : 6, list = [...Array(N).keys()].filter(i => i % step === 0).sort((a, b) => (a % 6 ? 1 : 0) - (b % 6 ? 1 : 0));
      Promise.all(list.map(i => fetchFrame(f, i))).then(() => { if (f === finish) draw(); });
    };
    const engage = () => { if (engaged) return; engaged = true; fill(finish); };
    const turnTo = (to, ms, inOut) => {
      cancelAnimationFrame(raf); vel = 0;
      const from = pos, t0 = performance.now(); ms = reduce ? 0 : ms;
      const ease = t => inOut ? (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) : 1 - Math.pow(1 - t, 3);
      const tick = now => { const t = ms ? Math.min(1, (now - t0) / ms) : 1; pos = from + (to - from) * ease(t); draw(); if (t < 1) raf = requestAnimationFrame(tick); else if (!inOut) home(); };
      raf = requestAnimationFrame(tick);
    };
    function home() {
      clearTimeout(homeT);
      homeT = setTimeout(() => { if (down) return; let d = wrap(FRONT - Math.round(pos)); if (d > N / 2) d -= N; if (d) turnTo(Math.round(pos) + d, Math.min(1400, 450 + Math.abs(d) * 25), true); }, HOME_MS);
    }
    const coast = () => { vel *= 0.93; pos += vel; draw(); if (Math.abs(vel) > 0.03) raf = requestAnimationFrame(coast); else { vel = 0; pos = Math.round(pos); draw(); home(); } };
    const glide = d => { engage(); clearTimeout(homeT); turnTo(Math.round(pos) + d * 9, 420); };
    let lastX = 0, lastT = 0;
    stage.addEventListener('pointerdown', e => { if (e.button > 0 || e.target.closest('button')) return; down = { x: e.clientX, y: e.clientY }; lastX = e.clientX; lastT = performance.now(); cancelAnimationFrame(raf); clearTimeout(homeT); vel = 0; engage(); });
    stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') engage(); });
    stage.addEventListener('pointermove', e => {
      if (!down) return;
      if (down !== true) {
        const dx = Math.abs(e.clientX - down.x), dy = Math.abs(e.clientY - down.y);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { down = null; return; }               // an up-and-down swipe scrolls the page
        down = true; stage.classList.add('is-drag'); try { stage.setPointerCapture(e.pointerId); } catch {}
      }
      const now = performance.now(), step = (e.clientX - lastX) * N / Math.max(240, stage.clientWidth * 1.3);
      pos += step; vel = step / Math.max(1, now - lastT) * 16; lastX = e.clientX; lastT = now; draw();
    });
    const end = () => { const was = down === true; down = null; stage.classList.remove('is-drag'); if (was && !reduce) coast(); else { vel = 0; if (was) home(); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stage.addEventListener(ev, end));
    stage.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); glide(e.key === 'ArrowRight' ? 1 : -1); });
    $$('[data-turn]', stage).forEach(b => b.addEventListener('click', () => glide(+b.dataset.turn)));
    // the frames start loading when the chapter is near
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { near = true; fill(finish); io.disconnect(); } }, { rootMargin: '900px 0px' });
      io.observe(stage);
    } else { near = true; fill(finish); }
    $$('.finishes [data-finish]').forEach(d => ['pointerenter', 'focus'].forEach(ev => d.addEventListener(ev, () => { if (near) fetchFrame(d.dataset.finish, FRONT); })));
    return { show: () => { cancelAnimationFrame(raf); clearTimeout(homeT); pos = FRONT; vel = 0; img.src = url(finish, FRONT); fetchFrame(finish, FRONT).then(draw); fill(finish); } };
  })();

  /* ------------------------------------------------ films: the file arrives when the film is near, and it plays while on screen */
  const autos = $$('video[data-auto]');
  if ('IntersectionObserver' in window) {
    const load = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const v = e.target; if (!reduce && !v.src) v.src = v.dataset.src; load.unobserve(v); }), { rootMargin: '600px 0px' });
    const play = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (reduce || !v.src) return; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .35 });
    autos.forEach(v => { load.observe(v); play.observe(v); v.addEventListener('loadeddata', () => { const r = v.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) v.play().catch(() => {}); }); });
  }
  // the lab test plays when asked, with sound controls
  const lab = $('#lab');
  if (lab) $('.proof__play', lab).addEventListener('click', () => { const v = $('video', lab); v.src = v.dataset.src; v.controls = true; lab.classList.add('is-playing'); v.play().catch(() => {}); v.focus(); });
})();
