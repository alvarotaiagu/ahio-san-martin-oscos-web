/* ------------------------------------------------------------------
   Ahío San Martín · «La linterna» · lo común de la página
   - El sol de San Martín (Ahio.sol) y la hora (Ahio.hora, acepta ?hora=).
   - Monta los módulos (linterna, vidas, índice, hilo, ruta, calceta) con su respaldo:
     la portada en cuanto la cortina EMPIEZA a abrirse; los demás al acercarse.
   - Ahio.reservar(preferencia) baja al registro de entrada (js/reserva.js).
   - Cabecera (el punto de linterna en el enlace activo), menú, cookies, mapa, visor y mando.
   - La cortina es del módulo Entrada; el puente con ella está en partes/cabeza.html
     (Ahio.abrir, Ahio.retirarCortina, Ahio.alAbrirse).
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  const raiz = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // «con-movimiento» solo sin movimiento reducido: si no, los titulares partidos se quedarían escondidos
  const motion = !quieto;
  if (motion) raiz.classList.add('con-movimiento');
  const sobria = () => raiz.classList.contains('densidad-sobria');
  const params = new URLSearchParams(location.search);
  const sin3d = params.has('sin-3d');
  const sinWebgl = params.has('sin-webgl');

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const A = (window.Ahio = window.Ahio || {});
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // el resize de la barra del móvil (mismo ancho, poca altura) no rehace NADA
  let anchoVista = innerWidth, altoVista = innerHeight;
  const esBarra = () => innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160;

  /* ============ 1. la hora y el sol de San Martín de Oscos (fórmulas de SunCalc) ============ */
  const LAT = 43.2650908, LNG = -6.9616133;   // Turismo Asturias
  const ZONA = 'Europe/Madrid';
  // desfase de Madrid (ms) en un instante dado
  function desfase(d) {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(d).forEach((x) => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(d.getTime() / 1000) * 1000;
  }
  // «2026-10-23T19:00» = las 19:00 de Madrid (si no lleva zona)
  function deMadrid(s) {
    if (!s) return null;
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) { const d = new Date(s); return isNaN(d) ? null : d; }
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2})(?::(\d{2}))?)?/.exec(s);
    if (!m) return null;
    const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0));
    let d = new Date(utc - desfase(new Date(utc)));
    d = new Date(utc - desfase(d)); // segunda pasada por si cae en el cambio de hora
    return d;
  }
  const horaFija = deMadrid(params.get('hora'));
  A.hora = () => (horaFija ? new Date(horaFija) : new Date());

  const rad = Math.PI / 180, DIA = 864e5, J1970 = 2440588, J2000 = 2451545, OBL = rad * 23.4397, J0 = 0.0009;
  const aJuliano = (d) => d.valueOf() / DIA - 0.5 + J1970;
  const deJuliano = (j) => new Date((j + 0.5 - J1970) * DIA);
  const aDias = (d) => aJuliano(d) - J2000;
  const declinacion = (l) => Math.asin(Math.sin(OBL) * Math.sin(l));
  const ascension = (l) => Math.atan2(Math.sin(l) * Math.cos(OBL), Math.cos(l));
  const anomalia = (d) => rad * (357.5291 + 0.98560028 * d);
  const longitud = (M) => M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  function altura(fecha) {
    const lw = rad * -LNG, phi = rad * LAT, d = aDias(fecha), L = longitud(anomalia(d));
    const dec = declinacion(L), H = rad * (280.16 + 360.9856235 * d) - lw - ascension(L);
    return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;
  }
  function salidaPuesta(fecha) {
    const lw = rad * -LNG, phi = rad * LAT, d = aDias(fecha);
    const n = Math.round(d - J0 - lw / (2 * Math.PI));
    const ds = J0 + lw / (2 * Math.PI) + n, M = anomalia(ds), L = longitud(M), dec = declinacion(L);
    const tr = (a) => J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const jMedio = tr(ds);
    const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const jPuesta = tr(J0 + (w + lw) / (2 * Math.PI) + n);
    return { salida: deJuliano(jMedio - (jPuesta - jMedio)), puesta: deJuliano(jPuesta) };
  }
  // fase: día (sol a más de 6º), dorada (entre 6º y −6º: hora dorada, ocaso y crepúsculo) o noche
  A.sol = (fecha) => {
    const f = fecha instanceof Date ? fecha : A.hora();
    const a = altura(f), sp = salidaPuesta(f);
    return { altura: Math.round(a * 100) / 100, salida: sp.salida, puesta: sp.puesta, fase: a > 6 ? 'dia' : a > -6 ? 'dorada' : 'noche' };
  };

  /* ============ 2. titulares partidos ============ */
  function partir(h) {
    if (h.classList.contains('es-partido')) return;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const envolver = (nodo) => {
      if (nodo.nodeType === 3) {
        const frag = document.createDocumentFragment();
        nodo.textContent.split(/([ \t\r\n]+)/).forEach((t) => {
          if (!t.trim()) { frag.appendChild(document.createTextNode(t)); return; }
          const pal = document.createElement('span');
          pal.className = 'pal';
          pal.setAttribute('aria-hidden', 'true');
          const i = document.createElement('i');
          i.textContent = t;
          i.style.setProperty('--n', n++);
          pal.appendChild(i);
          frag.appendChild(pal);
        });
        nodo.replaceWith(frag);
      } else if (nodo.nodeType === 1) Array.from(nodo.childNodes).forEach(envolver);
    };
    Array.from(h.childNodes).forEach(envolver);
    h.classList.add('es-partido');
  }
  if (motion && 'IntersectionObserver' in window) {
    const vistos = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('es-visto'); vistos.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-partir]').forEach((h) => { partir(h); vistos.observe(h); });
  }

  /* ============ 3. Lenis (y el ScrollTrigger de los módulos) ============ */
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !quieto) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.11 });
    if (G && ST) {
      lenis.on('scroll', ST.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
    } else {
      const bucle = (t) => { lenis.raf(t); requestAnimationFrame(bucle); };
      requestAnimationFrame(bucle);
    }
  }
  const cabAlto = () => { const c = $('#cab'); return c ? c.offsetHeight : 68; };
  const irA = (sel) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - cabAlto() - 8;
    if (lenis) lenis.scrollTo(y, { duration: 1.3 });
    else scrollTo({ top: y, behavior: quieto ? 'auto' : 'smooth' });
  };
  // los módulos llaman aquí para reservar: apunta la preferencia en el registro y baja hasta él
  const PREFS = ['planta-baja', 'duplex', 'cama-180'];
  A.reservar = (preferencia) => {
    if (preferencia && PREFS.includes(preferencia) && A.motor && typeof A.motor.preferir === 'function') A.motor.preferir(preferencia);
    irA('#reservar');
  };

  /* ============ 4. módulos: linterna (portada), vidas, índice, hilo, ruta y calceta ============ */
  // Se montan al acercarse (la linterna, cuando la cortina EMPIEZA a abrirse). Si su JS falla o no está,
  // se queda el respaldo del HTML. Se guarda el respaldo para volver a montar al cambiar de densidad.
  const montados = new Map();     // el → { inst, respaldo }
  const esperando = new Set();    // cerca de la pantalla, pero su JS aún no ha llegado (el 3D es un módulo diferido)
  const conMontar = (x) => (typeof x === 'function' ? { montar: x } : x && typeof x.montar === 'function' ? x : null);
  function modulo(nombre) {
    const F = A.fachada, H = A.hilo;
    switch (nombre) {
      case 'vidas': return (F && conMontar(F.vidas)) || conMontar(F);
      case 'indice': return (F && conMontar(F.indice)) || conMontar(F);
      case 'calceta': return (H && conMontar(H.calceta)) || conMontar(A.calceta) || conMontar(H);
      default: return conMontar(A[nombre]);
    }
  }
  const opciones = (el) => {
    const op = { movimiento: motion, densidad: sobria() ? 'sobria' : 'niebla', hora: A.hora() };
    if (el.dataset.modulo === 'ruta' && sin3d) { op.gl = false; op.sin3d = true; }
    if (el.dataset.modulo === 'linterna' && (sinWebgl || sin3d)) op.webgl = false;
    return op;
  };
  function montarModulo(el) {
    if (montados.has(el)) return;
    const mod = modulo(el.dataset.modulo);
    if (!mod) { esperando.add(el); return; }
    esperando.delete(el);
    const respaldo = el.innerHTML;
    try {
      const inst = mod.montar(el, opciones(el));
      montados.set(el, { inst, respaldo });
    } catch (er) {
      console.warn('Módulo ' + el.dataset.modulo + ': se queda el respaldo', er);
      montados.set(el, { inst: null, respaldo });
    }
  }
  const reintentar = () => { if (esperando.size) [...esperando].forEach(montarModulo); };
  addEventListener('load', reintentar);
  document.addEventListener('ahio:listo', reintentar);
  function remontarTodos() {
    // sobre una copia: montar otra vez mete la entrada de nuevo en el Map
    [...montados].forEach(([el, { inst, respaldo }]) => {
      try { inst && inst.destruir && inst.destruir(); } catch (er) { console.warn(er); }
      el.innerHTML = respaldo;
      delete el.dataset.montado;
      montados.delete(el);
      montarModulo(el);
    });
    if (ST) ST.refresh();
  }
  const portadaLinterna = $('#portada [data-modulo="linterna"]');
  if ('IntersectionObserver' in window) {
    const ioMod = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { ioMod.unobserve(e.target); montarModulo(e.target); }
    }), { rootMargin: '900px 0px' });
    $$('[data-modulo]').forEach((el) => { if (el !== portadaLinterna) ioMod.observe(el); });
  } else $$('[data-modulo]').forEach((el) => { if (el !== portadaLinterna) montarModulo(el); });

  /* ============ 5. la cortina (del módulo Entrada): alAbrirse() y su retirada ============ */
  const cortina = $('#cortina');
  A.alAbrirse(() => {
    $('#portada').classList.add('abierta');
    if (portadaLinterna) montarModulo(portadaLinterna);
  });
  let fuera = false;
  function alSalir() {
    if (fuera) return;
    fuera = true;
    if (cortina && !cortina.hidden && getComputedStyle(cortina).display !== 'none') cortina.hidden = true;
    if (lenis) lenis.start();
    if (G) G.ticker.lagSmoothing(0);      // al retirar la cortina, nunca antes
    if (ST) ST.refresh();
    mostrarCookies();
    requestAnimationFrame(() => alScroll());   // un fotograma después: la cortina puede salir antes de que se declare lo de la sección 10
  }
  document.addEventListener('ahio:fuera', alSalir);
  const retirarCortina = () => { A.retirarCortina(); alSalir(); };
  if (A.cortinaFuera) setTimeout(alSalir, 0);
  // si la cortina se esconde o desaparece por su cuenta, también cuenta como retirada
  if (cortina && 'MutationObserver' in window) {
    const mo = new MutationObserver(() => {
      if (!document.contains(cortina) || cortina.hidden || cortina.dataset.estado === 'fuera') { mo.disconnect(); retirarCortina(); }
    });
    mo.observe(document.body, { childList: true });
    mo.observe(cortina, { attributes: true, attributeFilter: ['hidden', 'data-estado'] });
  }

  /* ============ 6. cabecera, menú, anclas y el enlace activo ============ */
  const cab = $('#cab');
  const btnMenu = $('#menu-btn'), menu = $('#menu-movil');
  const cerrarMenu = () => {
    document.body.classList.remove('menu');
    btnMenu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  };
  btnMenu.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu');
    btnMenu.setAttribute('aria-expanded', String(abierto));
    menu.setAttribute('aria-hidden', String(!abierto));
    if (lenis) abierto ? lenis.stop() : lenis.start();
  });
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reservar]');
    if (r) {
      e.preventDefault();
      cerrarMenu();
      A.reservar(r.dataset.reservar || undefined);
      return;
    }
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const destino = a.getAttribute('href');
    if (destino.length < 2 || !$(destino)) return;
    e.preventDefault();
    cerrarMenu();
    irA(destino);
    setTimeout(() => {
      const t = $(destino);
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }, 1000);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu')) { cerrarMenu(); btnMenu.focus(); } });
  // el enlace activo (el punto de linterna): la última parada cuyo principio ya pasó el 40 % de la pantalla
  const PARADA = { vidas: 'vidas', apartamentos: 'apartamentos', dentro: 'apartamentos', ena: 'ena', lana: 'ena', oscos: 'oscos', alrededor: 'oscos', reservar: 'reservar', llegar: '' };
  const paradas = Object.keys(PARADA).map((id) => document.getElementById(id)).filter(Boolean);
  const enlaces = $$('.cab__nav a');
  let activa = null;
  function marcarActivo() {
    const linea = altoVista * 0.4;
    let id = '';
    for (const s of paradas) if (s.getBoundingClientRect().top <= linea) id = PARADA[s.id];
    if (id === activa) return;
    activa = id;
    enlaces.forEach((a) => { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }

  /* ============ 7. cookies (y el mando se aparta mientras están) ============ */
  const ck = $('#cookies');
  const LLAVE = 'ahio-cookies';
  const leer = () => { try { return localStorage.getItem(LLAVE); } catch (e) { return null; } };
  const guardar = (v) => { try { localStorage.setItem(LLAVE, v); } catch (e) {} };
  const mando = $('#mando');
  const verMando = () => { if (mando && raiz.classList.contains('revision')) mando.hidden = !ck.hidden; };
  let cookiesPendientes = !leer();
  function mostrarCookies() {
    if (!cookiesPendientes) { verMando(); return; }
    cookiesPendientes = false;
    ck.hidden = false;
    verMando();
  }
  const cerrarCk = (v) => { guardar(v); ck.hidden = true; verMando(); };
  $('#ck-si').addEventListener('click', () => cerrarCk('si'));
  $('#ck-no').addEventListener('click', () => cerrarCk('no'));
  $('#abrir-cookies').addEventListener('click', () => { ck.hidden = false; verMando(); $('#ck-si').focus(); });

  // La cortina la arranca su propio JS (Entrada) y avisa con Ahio.abrir / Ahio.retirarCortina (o con
  // ahio:cortina-abre / ahio:cortina-fuera). Si no hay cortina, si el movimiento está reducido o si su
  // JS no ha llegado, fuera ya.
  if (A.cortina && A.cortina.fuera) retirarCortina();
  if (A.cortina && typeof A.cortina.alAbrirse === 'function') A.cortina.alAbrirse(() => A.abrir());
  // (nunca mientras Ahio.cortina.enMarcha: la cortina se retira sola; la red de seguridad espera hasta 12 s)
  const enMarcha = () => !!(A.cortina && A.cortina.enMarcha && !A.cortina.fuera);
  if (!cortina || !motion || (!A.linterna && !enMarcha())) retirarCortina();
  const red = (t) => setTimeout(() => { if (enMarcha() && t < 12000) red(t + 1000); else retirarCortina(); }, t ? 1000 : 7000);
  red(0);

  /* ============ 8. mapa de Google solo al pedirlo ============ */
  $('#mapa-btn').addEventListener('click', () => {
    const marco = document.createElement('iframe');
    marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent(LAT + ',' + LNG) + '&z=16&output=embed';
    marco.loading = 'lazy';
    marco.title = 'Mapa con Ahío San Martín en San Martín de Oscos';
    marco.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mapa').appendChild(marco);
    $('#mapa-consent').remove();
  });

  /* ============ 9. visor de fotos: se abre por el NOMBRE de la foto ============ */
  const visor = $('#visor');
  const vImg = $('#visor-img'), vPie = $('#visor-pie'), vN = $('#visor-n');
  // la serie se hace de la MISMA lista de miniaturas, sin repetir nombres
  function serie() {
    const vistas = new Map();
    $$('[data-visor]').forEach((b) => {
      const n = b.dataset.visor;
      if (vistas.has(n)) return;
      const img = b.querySelector('img');
      if (!img) return;
      const anchos = (img.getAttribute('srcset') || '').split(',').map((x) => parseInt(x.trim().split(/\s+/)[1], 10)).filter(Boolean).sort((a, z) => a - z);
      const cap = b.closest('figure, article, li')?.querySelector('figcaption');
      vistas.set(n, { n, alt: img.alt, pie: cap ? cap.textContent.replace(/\s+/g, ' ').trim() : img.alt, anchos: anchos.length ? anchos : [800], ancho: +img.getAttribute('width') || 1024, alto: +img.getAttribute('height') || 768 });
    });
    return [...vistas.values()];
  }
  let lista = [], actual = 0, origen = null;
  function poner(i) {
    actual = (i + lista.length) % lista.length;
    const f = lista[actual];
    const peq = f.anchos.includes(800) ? 800 : f.anchos[0], gran = f.anchos[f.anchos.length - 1];
    // primero la de 800 (o la menor, ya en caché), y la grande al cargar
    vImg.src = `img/fotos/${f.n}-${peq}.jpg`;
    vImg.dataset.nombre = f.n;
    vImg.alt = f.alt;
    vImg.width = f.ancho; vImg.height = f.alto;
    vImg.style.setProperty('--nat', f.ancho + 'px');
    if (gran !== peq) {
      const grande = new Image();
      grande.onload = () => { if (vImg.dataset.nombre === f.n) vImg.src = grande.src; };
      grande.src = `img/fotos/${f.n}-${gran}.jpg`;
    }
    vPie.textContent = f.pie;
    vN.textContent = (actual + 1) + ' / ' + lista.length;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-visor]');
    if (!b || !visor || typeof visor.showModal !== 'function') return;
    lista = serie();
    const i = lista.findIndex((f) => f.n === b.dataset.visor);
    if (i < 0) return;
    origen = b;
    poner(i);
    visor.showModal();
    if (lenis) lenis.stop();
  });
  if (visor) {
    $('#visor-ant').addEventListener('click', () => poner(actual - 1));
    $('#visor-sig').addEventListener('click', () => poner(actual + 1));
    $('#visor-cerrar').addEventListener('click', () => visor.close());
    visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor__fig')) visor.close(); });
    visor.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') poner(actual - 1); else if (e.key === 'ArrowRight') poner(actual + 1); });
    visor.addEventListener('close', () => { if (lenis) lenis.start(); if (origen) origen.focus({ preventScroll: true }); });
  }

  /* ============ 10. con el scroll: cabecera, enlace activo y módulos que esperan ============ */
  let pend = 0;
  function alScroll() {
    pend = 0;
    cab.classList.toggle('sc', scrollY > 24);
    marcarActivo();
    reintentar();
  }
  addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(alScroll); }, { passive: true });
  alScroll();

  /* ============ 11. MANDO DE MAQUETA (no viaja al cliente) ============ */
  if (mando && raiz.classList.contains('revision')) {
    const botones = $$('button[data-densidad]', mando);
    const pintarMando = () => botones.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === sobria())));
    botones.forEach((b) => b.addEventListener('click', () => {
      const antes = sobria();
      raiz.classList.toggle('densidad-sobria', b.dataset.densidad === 'sobria');
      if (sobria()) raiz.setAttribute('data-densidad', 'sobria'); else raiz.removeAttribute('data-densidad');
      const u = new URL(location.href);
      if (b.dataset.densidad === 'sobria') u.searchParams.set('densidad', 'sobria'); else u.searchParams.delete('densidad');
      history.replaceState(null, '', u);
      pintarMando();
      if (antes === sobria()) return;
      remontarTodos();
      document.dispatchEvent(new CustomEvent('ahio:densidad', { detail: sobria() ? 'sobria' : 'niebla' }));
    }));
    pintarMando();
    verMando();
  }
  /* fin del MANDO DE MAQUETA */

  /* ============ 12. resize de verdad (no el de la barra del móvil) ============ */
  let tRes = 0;
  addEventListener('resize', () => {
    if (esBarra()) return;
    clearTimeout(tRes);
    tRes = setTimeout(() => {
      anchoVista = innerWidth; altoVista = innerHeight;
      document.dispatchEvent(new CustomEvent('ahio:resize'));
      activa = null; marcarActivo();
    }, 200);
  });

  // lo que pueden usar los módulos y las pruebas
  A.web = {
    motion, quieto, sobria, lenis, irA, montados,
    alAbrirse: A.alAbrirse, abrir: A.abrir, retirarCortina,
    get fuera() { return fuera; }, get altoVista() { return altoVista; },
  };
})();
