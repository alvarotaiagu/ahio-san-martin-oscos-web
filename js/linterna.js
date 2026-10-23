/* ------------------------------------------------------------------
   Ahío San Martín · «La linterna en la niebla»                (agente Entrada)

   CORTINA (partes/cortina.html; Ahio.cortina lo pone el script de la parte)
     1. Niebla de madrugada (gris azulado frío) que deriva en un lienzo 2D.
     2. Se dibuja a línea la casa del logo real: muros → tejado → linterna
        (img/entrada/edificio.svg, medido del PNG por pruebas/entrada-edificio.py).
     3. La linterna se enciende (ámbar, con un par de titubeos) y su luz se
        difunde en la niebla; «ahio:linterna» en document. Debajo, «Ahío San
        Martín» y «Apartamentos rurales · San Martín de Oscos».
     4. La niebla se abre desde la luz hacia fuera (Ahio.cortina.abrir(): la
        portada se monta ahí) y el dibujo vuela al logo de la cabecera
        ([data-logo-cortina]) o se funde. Al acabar, Ahio.cortina.retirar().
     Unos 3,2 s. Topes desde que empezó a cargar la página: se abre como muy
     tarde a los 3,0 s y está fuera a los 4,2 s. Se salta si el JS llega pasados
     2 s, con la pestaña oculta o con movimiento reducido. Reloj que se traga los
     atascos (un fotograma de más de 100 ms cuenta 33 ms).

   PORTADA: Ahio.linterna.montar(el, { movimiento, densidad }) → { destruir }
     el = [data-modulo="linterna"], con la foto niebla-fachada dentro (respaldo).
     Encima, la niebla viva en WebGL (js/niebla.js) con la linterna de la foto
     encendida, el gesto de abrir la niebla con el puntero (sin bloquear el
     scroll) y la niebla que se levanta con el scroll. Sin WebGL, ?sin-webgl o
     ahorro de datos: dos capas de niebla en CSS y la luz en un degradado.

   TIEMPO REAL: Open-Meteo (sin clave, 3 s de espera, sin reintentos). La
     densidad base sale de ahí y la línea «Ahora en San Martín de Oscos: 9 °C ·
     niebla» va a [data-tiempo-ahora]. Si falla, la línea no sale y la niebla usa
     un valor medio. ?tiempo=niebla|nubes|despejado para probar (lo dice: «simulado»).
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const A = (window.Ahio = window.Ahio || {});
  const d = document, html = d.documentElement;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const tramo = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const suave = (t) => t * t * (3 - 2 * t);
  const salida = (t) => 1 - Math.pow(1 - t, 3);
  const dentroFuera = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const parametros = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
  const reducido = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= la foto de la portada (niebla-fachada = 1161-fachada-1.jpg, 1600×1200, sin recorte) =================
     Medido sobre la foto: el centro de los cristales de la linterna, la silueta de la casa (lo de fuera es «lejos»)
     y los cristales que se encienden. Si la web cambia la foto, la niebla sigue pero sin casa ni linterna. */
  const FOTO = {
    ancho: 1600, alto: 1200,
    linterna: [728, 248],
    silueta: [[150, 470], [88, 440], [300, 390], [360, 282], [470, 290], [555, 222], [560, 195], [630, 185], [640, 130], [690, 128],
      [700, 160], [760, 160], [775, 150], [800, 175], [895, 215], [900, 260], [955, 245], [1000, 240], [1075, 270], [1130, 380],
      [1335, 408], [1290, 425], [1280, 860], [1100, 870], [720, 1040], [178, 825]],
    ventanas: [
      [[600, 242], [706, 226], [706, 261], [600, 276]],
      [[752, 222], [808, 227], [808, 263], [752, 258]],
      [[848, 232], [864, 234], [864, 272], [848, 270]],
    ],
  };
  const ES_FOTO = /niebla-fachada|1161-fachada|1146-fachada/;
  // la casa del logo (coordenadas del PNG de 648×632; el viewBox del dibujo de la cortina)
  const CAJA_DIBUJO = [190, 30, 270, 240];
  const LUZ_DIBUJO = [325, 74];          // centro del cristal de la linterna en el dibujo
  const VERDE = [2, 57, 25], CREMA = [250, 246, 225];

  /* ================= el tiempo de ahora en San Martín de Oscos (Open-Meteo) ================= */
  const URL_TIEMPO = 'https://api.open-meteo.com/v1/forecast?latitude=43.2651&longitude=-6.9616&current=temperature_2m,weather_code,cloud_cover,visibility&timezone=Europe/Madrid';
  const WMO = {
    0: 'despejado', 1: 'casi despejado', 2: 'nubes y claros', 3: 'cubierto', 45: 'niebla', 48: 'niebla con escarcha',
    51: 'llovizna débil', 53: 'llovizna', 55: 'llovizna intensa', 56: 'llovizna helada', 57: 'llovizna helada',
    61: 'lluvia débil', 63: 'lluvia', 65: 'lluvia fuerte', 66: 'lluvia helada', 67: 'lluvia helada',
    71: 'nieve débil', 73: 'nieve', 75: 'nieve fuerte', 77: 'nieve granulada',
    80: 'chubascos débiles', 81: 'chubascos', 82: 'chubascos fuertes', 85: 'chubascos de nieve', 86: 'chubascos de nieve',
    95: 'tormenta', 96: 'tormenta con granizo', 99: 'tormenta con granizo',
  };
  const SIMULADO = {
    niebla: { texto: 'niebla', clave: 'niebla', densidad: 0.9 },
    nubes: { texto: 'nubes y claros', clave: 'nubes', densidad: 0.5 },
    despejado: { texto: 'despejado', clave: 'despejado', densidad: 0.22 },
  };
  const DENSIDAD_MEDIA = 0.5;
  function clave(c) {
    if (c === 45 || c === 48) return 'niebla';
    if (c <= 1) return 'despejado';
    if (c <= 3) return 'nubes';
    if (c >= 95) return 'tormenta';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'nieve';
    return 'lluvia';
  }
  function interpretar(j) {
    const c = j && j.current;
    if (!c || typeof c.weather_code !== 'number') return null;
    const cod = c.weather_code, k = clave(cod);
    let dens = { niebla: 0.9, despejado: cod === 0 ? 0.22 : 0.3, nubes: cod === 2 ? 0.42 : 0.55, lluvia: 0.62, nieve: 0.6, tormenta: 0.6 }[k];
    const vis = typeof c.visibility === 'number' ? c.visibility : null;
    if (vis != null) dens = Math.max(dens, vis < 1000 ? 0.85 : vis < 3000 ? 0.7 : vis < 8000 ? 0.55 : 0);
    if (typeof c.cloud_cover === 'number') dens += (c.cloud_cover / 100 - 0.5) * 0.1;
    return {
      codigo: cod, texto: WMO[cod] || 'tiempo variable', clave: k, densidad: clamp(dens, 0.15, 0.95),
      temp: typeof c.temperature_2m === 'number' ? c.temperature_2m : null, visibilidad: vis, nubes: c.cloud_cover, simulado: false,
    };
  }
  let promesaTiempo = null;
  function tiempo() {
    if (promesaTiempo) return promesaTiempo;
    const forzado = parametros.get('tiempo');
    if (forzado && SIMULADO[forzado]) return (promesaTiempo = Promise.resolve(Object.assign({ simulado: true, temp: null }, SIMULADO[forzado])));
    promesaTiempo = new Promise((res) => {
      let hecho = false;
      const fin = (v) => { if (!hecho) { hecho = true; res(v); } };
      if (!('fetch' in window)) { fin(null); return; }
      const ctl = 'AbortController' in window ? new AbortController() : null;
      const espera = setTimeout(() => { if (ctl) ctl.abort(); fin(null); }, 3000);
      fetch(URL_TIEMPO, { signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => fin(interpretar(j)))
        .catch(() => fin(null))
        .finally(() => clearTimeout(espera));
    });
    return promesaTiempo;
  }
  function linea(t) {
    if (!t) return '';
    let grados = '';
    if (t.temp != null) {
      const g = Math.round(t.temp);
      grados = (g < 0 ? '−' + Math.abs(g) : String(g)) + ' °C · ';
    }
    return 'Ahora en San Martín de Oscos: ' + grados + t.texto + (t.simulado ? ' (simulado)' : '');
  }
  function escribirTiempo(t) {
    d.querySelectorAll('[data-tiempo-ahora]').forEach((p) => {
      const texto = linea(t);
      p.textContent = texto;
      p.hidden = !texto;
      if (t) p.dataset.clave = t.clave; else delete p.dataset.clave;
    });
  }

  /* ================= CORTINA ================= */
  function cortina() {
    const C = A.cortina;
    const el = d.getElementById('cortina');
    if (!C || !el || C.fuera) return;
    const marcas = (C.marcas = C.marcas || {});
    marcas.inicio = performance.now();
    C.alAbrirse(() => { marcas.abre = performance.now(); });
    C.alRetirarse(() => { if (!marcas.fuera) marcas.fuera = performance.now(); });
    if (reducido() || d.hidden || marcas.inicio > 2000) { marcas.saltada = true; C.retirar(); return; }
    C.enMarcha = true;

    const TOPE_ABRE = 3000, TOPE_FUERA = 4200;
    const sobria = parametros.get('densidad') === 'sobria' || html.dataset.densidad === 'sobria';
    const tarde = marcas.inicio > 1250;                 // el respaldo CSS ya enseñó el dibujo hecho
    const k = Math.max(1, 2250 / Math.max(500, TOPE_ABRE - marcas.inicio));
    const directo = tarde || sobria || k > 1.9;
    marcas.k = Math.round(k * 100) / 100;
    marcas.modo = sobria ? 'sobria' : directo ? 'directo' : 'entero';
    el.dataset.modo = marcas.modo;

    const casa = el.querySelector('.cortina__casa');
    const trazos = Array.from(el.querySelectorAll('.cortina__trazo'));
    const cristal = el.querySelector('.cortina__cristal');
    const nombre = el.querySelector('.cortina__nombre'), lineaTxt = el.querySelector('.cortina__linea');
    const luzCss = el.querySelector('.cortina__luz');
    const cv = el.querySelector('.cortina__lienzo');
    if (!casa || trazos.length < 4) { C.retirar(); return; }

    // los tiempos (ms de la cortina). Lo de antes de abrir se comprime con k si el JS llegó tarde.
    const fase = (n) => trazos.filter((p) => p.dataset.fase === n);
    const PLAN = [
      { el: fase('muros')[0], a: 180, b: 920 },
      { el: fase('muros')[1], a: 330, b: 960 },
      { el: fase('tejado')[0], a: 900, b: 1270 },
      { el: fase('linterna')[0], a: 1240, b: 1660 },
    ].filter((p) => p.el);
    const ENCIENDE = [1660, 2060], NOMBRE = [1740, 2220], LINEA = [1900, 2340], ABRE = 2260;
    const T0 = sobria ? ABRE - 700 : directo ? 1660 : 0;   // directo: el dibujo ya está; sobria: también la luz y el texto
    // los titubeos de la luz al encenderse
    const CHISPA = [[0, 0], [0.12, 0.55], [0.2, 0.16], [0.32, 0.82], [0.4, 0.42], [0.56, 1], [1, 1]];
    const chispa = (u) => {
      for (let i = 1; i < CHISPA.length; i++) if (u <= CHISPA[i][0]) { const [a, va] = CHISPA[i - 1], [b, vb] = CHISPA[i]; return lerp(va, vb, (u - a) / (b - a)); }
      return 1;
    };

    // el primer estado, antes de tomar el mando (lo que aparece en un paso no está pintado en el anterior)
    const ponerTrazo = (p, v) => { p.style.strokeDashoffset = String(1 - v); p.style.opacity = v > 0.0005 ? '1' : '0'; };
    PLAN.forEach((p) => ponerTrazo(p.el, directo ? 1 : 0));
    el.classList.add('es-js');

    /* ---- el lienzo: niebla de madrugada a media resolución ---- */
    const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
    const ESC = 0.5;
    const cw = Math.max(2, Math.round(W * ESC)), ch = Math.max(2, Math.round(H * ESC));
    let ctx = null;
    try { cv.width = cw; cv.height = ch; ctx = cv.getContext('2d'); } catch (e) { ctx = null; }
    const lienzo = (w, h) => { const c = d.createElement('canvas'); c.width = w; c.height = h; return c; };
    let fondo = null, patBlanco = null, patAmbar = null, luzCv = null, luzCtx = null;
    const rnd = azar(43265);
    if (ctx) {
      // ruido periódico (se repite sin costura) para los jirones de niebla
      const N = 128, campo = new Float32Array(N * N);
      let amp = 1, tot = 0;
      for (const per of [4, 8, 16, 32]) {
        const g = new Float32Array(per * per);
        for (let i = 0; i < g.length; i++) g[i] = rnd();
        const cel = N / per;
        for (let y = 0; y < N; y++) {
          const gy = y / cel, y0 = Math.floor(gy), sy = suave(gy - y0), y1 = (y0 + 1) % per;
          for (let x = 0; x < N; x++) {
            const gx = x / cel, x0 = Math.floor(gx), sx = suave(gx - x0), x1 = (x0 + 1) % per;
            const a0 = lerp(g[y0 * per + x0], g[y0 * per + x1], sx), a1 = lerp(g[y1 * per + x0], g[y1 * per + x1], sx);
            campo[y * N + x] += amp * lerp(a0, a1, sy);
          }
        }
        tot += amp; amp *= 0.5;
      }
      const textura = (r, g, b, tope) => {
        const c = lienzo(N, N), x = c.getContext('2d'), im = x.createImageData(N, N);
        for (let i = 0; i < N * N; i++) {
          const v = clamp((campo[i] / tot - 0.36) / 0.4, 0, 1);
          im.data[i * 4] = r; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = Math.round(v * v * tope);
        }
        x.putImageData(im, 0, 0);
        return c;
      };
      luzCv = lienzo(cw, ch);
      luzCtx = luzCv.getContext('2d');
      patBlanco = ctx.createPattern(textura(214, 222, 226, 255), 'repeat');
      patAmbar = luzCtx.createPattern(textura(255, 196, 110, 255), 'repeat');   // (cada patrón, de su contexto)
      // el fondo fijo: degradado frío y viñeta
      fondo = lienzo(cw, ch);
      const f = fondo.getContext('2d');
      let g = f.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#36424B'); g.addColorStop(0.46, '#4C5A63'); g.addColorStop(1, '#68767E');
      f.fillStyle = g; f.fillRect(0, 0, cw, ch);
      g = f.createRadialGradient(cw / 2, ch * 0.4, 0, cw / 2, ch * 0.4, Math.max(cw, ch) * 0.62);
      g.addColorStop(0, 'rgba(122,136,146,.42)'); g.addColorStop(1, 'rgba(122,136,146,0)');
      f.fillStyle = g; f.fillRect(0, 0, cw, ch);
    } else el.classList.add('es-sin-lienzo');

    // dónde está la luz (el cristal de la linterna del dibujo), en px de pantalla
    // (se vuelve a medir en cada fotograma hasta abrir: si las letras cargan, el dibujo se mueve)
    let r0, luzX, luzY, lx, ly, lejos;
    const diag = Math.hypot(cw, ch);
    function medirLuz() {
      r0 = casa.getBoundingClientRect();
      luzX = r0.left + (LUZ_DIBUJO[0] - CAJA_DIBUJO[0]) / CAJA_DIBUJO[2] * r0.width;
      luzY = r0.top + (LUZ_DIBUJO[1] - CAJA_DIBUJO[1]) / CAJA_DIBUJO[3] * r0.height;
      lx = luzX * ESC; ly = luzY * ESC;
      lejos = Math.hypot(Math.max(lx, cw - lx), Math.max(ly, ch - ly));
      if (luzCss) { luzCss.style.setProperty('--lx', luzX + 'px'); luzCss.style.setProperty('--ly', luzY + 'px'); }
    }
    medirLuz();
    // las bocanadas que abren la niebla: alrededor de la luz, cada una a su ritmo
    const bocanadas = Array.from({ length: 11 }, (_, i) => {
      const ang = (i / 11) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      return { dx: Math.cos(ang), dy: Math.sin(ang) * 0.8, dist: 0.35 + rnd() * 0.5, r: 0.38 + rnd() * 0.3, retraso: rnd() * 0.12 };
    });

    function capa(c, pat, esx, esy, ox, oy, alfa) {
      c.save();
      c.globalAlpha = alfa;
      c.setTransform(esx, 0, 0, esy, ox, oy);
      c.fillStyle = pat;
      c.fillRect(-ox / esx, -oy / esy, cw / esx, ch / esy);
      c.restore();
    }
    function hueco(c, x, y, r) {
      if (r <= 0.5) return;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.52, 'rgba(0,0,0,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // un fotograma de la niebla: tl = reloj de la cortina (s), luz 0..1, radio del resplandor, apertura 0..1
    function pintarNiebla(seg, luz, radioLuz, ab) {
      const c = ctx;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.drawImage(fondo, 0, 0);
      const a1x = 5.2, a1y = 2.4, a2x = 2.6, a2y = 1.5;
      const o1 = [seg * 9, ch * 0.1], o2 = [-seg * 16 + 40, ch * 0.42];
      capa(c, patBlanco, a1x, a1y, o1[0], o1[1], 0.4);
      capa(c, patBlanco, a2x, a2y, o2[0], o2[1], 0.24);
      if (luz > 0.001) {
        // la luz atraviesa la bruma: los jirones cercanos se tiñen de ámbar (jirones × degradado radial)
        const R = radioLuz;
        luzCtx.globalCompositeOperation = 'source-over';
        luzCtx.clearRect(0, 0, cw, ch);
        let g = luzCtx.createRadialGradient(lx, ly, 0, lx, ly, R);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        luzCtx.fillStyle = g;
        luzCtx.fillRect(0, 0, cw, ch);
        luzCtx.globalCompositeOperation = 'source-in';
        capa(luzCtx, patAmbar, a1x, a1y, o1[0], o1[1], 1);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.85 * luz;
        c.drawImage(luzCv, 0, 0);
        // el resplandor: núcleo, halo y una bruma ancha (como una farola en la niebla)
        c.globalAlpha = 1;
        g = c.createRadialGradient(lx, ly, 0, lx, ly, R);
        g.addColorStop(0, `rgba(255,214,140,${0.85 * luz})`);
        g.addColorStop(0.05, `rgba(242,184,75,${0.5 * luz})`);
        g.addColorStop(0.22, `rgba(242,174,70,${0.17 * luz})`);
        g.addColorStop(0.6, `rgba(220,150,60,${0.05 * luz})`);
        g.addColorStop(1, 'rgba(220,150,60,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, cw, ch);
      }
      if (ab > 0) {
        // la niebla se abre desde la luz: un hueco que crece, bocanadas alrededor y la niebla que clarea en jirones
        c.globalCompositeOperation = 'destination-out';
        c.globalAlpha = 1;
        const Rb = dentroFuera(ab) * lejos * 1.9;
        hueco(c, lx, ly, Rb * 0.62);
        for (const b of bocanadas) {
          const e = dentroFuera(clamp((ab - b.retraso) / (1 - b.retraso), 0, 1)) * lejos * 1.9;
          hueco(c, lx + b.dx * e * b.dist, ly + b.dy * e * b.dist, e * b.r);
        }
        capa(c, patBlanco, a1x * 0.8, a1y * 0.8, -o1[0], o1[1], clamp(ab * 1.4, 0, 1));
        c.globalCompositeOperation = 'source-over';
      }
    }

    /* ---- el vuelo al logo de la cabecera ---- */
    function destino() {
      const e = d.querySelector('[data-logo-cortina]');
      if (!e) return null;
      if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: false })) return null;
      const r = e.getBoundingClientRect();
      if (r.width < 12 || r.height < 12 || r.bottom < 0 || r.top > innerHeight) return null;
      // qué trozo del logo de 648×632 enseña: el valor del atributo, o se deduce del archivo
      let caja = (e.getAttribute('data-logo-cortina') || '').trim().split(/[\s,]+/).map(Number);
      if (caja.length !== 4 || caja.some((v) => !isFinite(v))) {
        const src = (e.currentSrc || e.src || (e.querySelector && e.querySelector('img') && e.querySelector('img').currentSrc) || '');
        caja = /simbolo-/.test(src) ? [200, 40, 250, 220] : /logo-\d+\./.test(src) ? [4, 36, 636, 574] : [0, 0, 648, 632];
      }
      // ¿fondo claro u oscuro? (para que el trazo llegue del color del logo real)
      let n = e, claro = true;
      while (n && n !== d.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg && bg.match(/[\d.]+/g);
        if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0.5)) { claro = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 140; break; }
        n = n.parentElement;
      }
      return { el: e, caja, claro };
    }
    let vuelo = null;
    function volar(f) {
      const r = vuelo.el.getBoundingClientRect();         // se vuelve a medir en cada fotograma
      const [bx, by, bw, bh] = vuelo.caja;
      const sx = r.width / bw, sy = r.height / bh;
      const tx = r.left + (CAJA_DIBUJO[0] - bx) * sx, ty = r.top + (CAJA_DIBUJO[1] - by) * sy;
      const s = (CAJA_DIBUJO[2] * sx) / r0.width;
      const fx = dentroFuera(f), fy = salida(f);          // un arco: sube antes de llegar
      casa.style.transform = `translate(${(tx - r0.left) * fx}px, ${(ty - r0.top) * fy}px) scale(${lerp(1, s, fx)})`;
      if (vuelo.claro) {
        const k2 = suave(tramo(f, 0.35, 0.8));
        const col = CREMA.map((v, i) => Math.round(lerp(v, VERDE[i], k2)));
        trazos.forEach((p) => { p.style.stroke = `rgb(${col.join(',')})`; });
      }
      casa.style.opacity = String(1 - suave(tramo(f, 0.86, 1)));
      if (f >= 0.86) html.classList.remove('cortina-vuela');   // el logo real aparece debajo mientras el dibujo se funde
      el.dataset.aterriza = JSON.stringify([Math.round(tx), Math.round(ty), Math.round(CAJA_DIBUJO[2] * sx)]);
    }

    /* ---- el bucle ---- */
    let raf = 0, tl = T0, previo = performance.now(), abierto = false, tb = 0, durB = 950, avisoLuz = false;
    const avisarLuz = () => {
      if (avisoLuz) return;
      avisoLuz = true;
      marcas.linterna = performance.now();
      el.dataset.luz = '1';
      try { d.dispatchEvent(new CustomEvent('ahio:linterna', { detail: { origen: 'cortina' } })); } catch (e) {}
    };
    function estado(t) {
      // t en ms de la cortina (sin comprimir)
      PLAN.forEach((p) => ponerTrazo(p.el, directo ? 1 : dentroFuera(tramo(t, p.a, p.b))));
      const u = tramo(t, ENCIENDE[0], ENCIENDE[1]);
      const luz = sobria ? 1 : chispa(u);
      if (u >= 0.32 || sobria) avisarLuz();
      cristal.style.opacity = String(luz * 0.96);
      const tn = sobria ? 1 : salida(tramo(t, NOMBRE[0], NOMBRE[1])), tli = sobria ? 1 : salida(tramo(t, LINEA[0], LINEA[1]));
      nombre.style.opacity = String(tn); nombre.style.transform = `translateY(${(1 - tn) * 12}px)`;
      lineaTxt.style.opacity = String(tli); lineaTxt.style.transform = `translateY(${(1 - tli) * 10}px)`;
      if (luzCss && !ctx) luzCss.style.opacity = String(luz);
      el.dataset.fase = t < ENCIENDE[0] ? 'dibujo' : 'luz';
      return { luz, radio: lerp(0.06, 0.62, salida(tramo(t, ENCIENDE[0], ENCIENDE[0] + 950))) * diag };
    }
    function abrir(ahora) {
      abierto = true;
      tb = 0;
      durB = clamp(TOPE_FUERA - 160 - ahora, 550, sobria ? 650 : 1000);
      C.apertura = { x: luzX, y: luzY, inicio: ahora, dur: durB };
      el.classList.add('es-abriendo');
      el.dataset.fase = 'abre';
      if (!sobria) {
        const de = destino();
        if (de) { vuelo = de; html.classList.add('cortina-vuela'); el.dataset.destino = 'cabecera'; } else el.dataset.destino = 'fundido';
      } else el.dataset.destino = 'fundido';
      C.abrir();                                      // la portada se monta aquí (alAbrirse)
    }
    let ultimoEstado = { luz: 0, radio: 0 };
    function paso(ahora) {
      raf = 0;
      if (C.fuera) return;
      const dt = ahora - previo;
      previo = ahora;
      const avance = dt > 100 ? 33 : dt;              // reloj que se traga los atascos
      if (!abierto) {
        medirLuz();
        tl += avance * k;
        if (ahora >= TOPE_ABRE && tl < ABRE) { tl = ABRE; marcas.forzada = true; }
        ultimoEstado = estado(tl);
        if (tl >= ABRE) abrir(ahora);
      } else tb += avance;
      const b = abierto ? clamp(tb / durB, 0, 1) : 0;
      if (abierto) {
        // la luz sigue difundiéndose un poco mientras se abre
        ultimoEstado = { luz: ultimoEstado.luz, radio: Math.max(ultimoEstado.radio, lerp(0.06, 0.62, salida(tramo(ABRE + tb, ENCIENDE[0], ENCIENDE[0] + 950))) * diag) };
        const txt = 1 - salida(tramo(b, 0, 0.38));
        const op0 = (e) => { const v = parseFloat(e.style.opacity); return isNaN(v) ? 1 : v; };
        nombre.style.opacity = String(Math.min(op0(nombre), txt));
        lineaTxt.style.opacity = String(Math.min(op0(lineaTxt), txt));
        nombre.style.transform = `translateY(${-(1 - txt) * 14}px)`;
        lineaTxt.style.transform = `translateY(${-(1 - txt) * 12}px)`;
        if (vuelo) {
          volar(clamp(b / 0.94, 0, 1));
          cristal.style.opacity = String(0.96 * (1 - suave(tramo(b, 0.1, 0.6))));
        } else {
          const f = salida(tramo(b, 0, 0.62));
          casa.style.transform = `translateY(${-f * 10}px) scale(${1 + f * 0.1})`;
          casa.style.transformOrigin = '50% 30%';
          casa.style.opacity = String(1 - f);
        }
        if (ctx) cv.style.opacity = String(1 - suave(tramo(b, 0.8, 1)));
        else el.style.opacity = String(1 - suave(b));
      }
      if (ctx) pintarNiebla((ahora - marcas.inicio) / 1000, ultimoEstado.luz, ultimoEstado.radio, b);
      if (abierto && b >= 1) { terminar(); return; }
      raf = requestAnimationFrame(paso);
    }
    function terminar() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(tope);
      el.dataset.fase = 'fuera';
      C.retirar();
    }
    const tope = setTimeout(() => { marcas.tope = true; terminar(); }, Math.max(0, TOPE_FUERA - performance.now()));
    try {
      if (ctx) { pintarNiebla(0, 0, 0, 0); el.classList.add('es-lienzo'); }
      ultimoEstado = estado(tl);
      raf = requestAnimationFrame(paso);
    } catch (e) {
      console.warn('Cortina:', e);
      terminar();
    }
  }

  /* ================= PORTADA: montar ================= */
  function ahorroDeDatos() {
    try { return !!(navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches; } catch (e) { return false; }
  }
  function montar(el, op) {
    op = op || {};
    if (!el) return { destruir() {} };
    if (el.__linterna) return el.__linterna;
    const movimiento = op.movimiento !== false && !reducido();
    const sobria = op.densidad === 'sobria';
    const vivo = movimiento && !sobria;
    const img = el.querySelector('img');
    const foto = img && ES_FOTO.test(img.currentSrc || img.src || '') ? FOTO : null;
    const seccion = el.closest('section') || el;
    const limpiar = [];
    let motor = null, canvas = null, velos = null, densidad = DENSIDAD_MEDIA, destruido = false;
    let pendiente = false, levanta = 0;
    el.dataset.montado = '1';
    if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; limpiar.push(() => { el.style.position = ''; }); }

    const factorSobria = sobria ? 0.55 : 1;
    function apertura() {
      const C = A.cortina;
      // el eco de la cortina: la niebla de la portada también se abre desde la luz, un poco por detrás
      if (vivo && C && C.apertura && !C.fuera) return { x: C.apertura.x, y: C.apertura.y, inicio: C.apertura.inicio + 140, dur: C.apertura.dur * 1.15 };
      return null;                                     // sin cortina, la niebla aparece ya abierta
    }
    function respaldo(motivo) {
      if (destruido) return;
      if (motor) { motor.destruir(); motor = null; }
      if (canvas) { canvas.remove(); canvas = null; }
      el.dataset.motor = 'css';
      if (motivo) el.dataset.motivo = motivo;
      delete el.dataset.gesto;
      if (velos) return;
      velos = d.createElement('div');
      velos.className = 'linterna__velos';
      velos.setAttribute('aria-hidden', 'true');
      velos.innerHTML = '<div class="linterna__velo linterna__velo--a"></div><div class="linterna__velo linterna__velo--b"></div>' + (foto ? '<div class="linterna__luz"></div>' : '');
      el.appendChild(velos);
      if (!vivo) el.dataset.quieto = '1';
      colocarLuz();
      el.style.setProperty('--densidad', String(densidad * factorSobria));
      alScroll();
    }
    function colocarLuz() {
      if (!velos || !foto || !A.niebla || !A.niebla.encaje) return;
      const e = A.niebla.encaje(img, el);
      const [u, v] = e.enCaja(foto.linterna[0] / foto.ancho, foto.linterna[1] / foto.alto);
      velos.style.setProperty('--lx', (u * 100).toFixed(2) + '%');
      velos.style.setProperty('--ly', (v * 100).toFixed(2) + '%');
    }

    // 1. la niebla: WebGL si se puede
    const sinWebgl = parametros.has('sin-webgl') || ahorroDeDatos() || !A.niebla || !A.niebla.crear;
    if (!sinWebgl) {
      canvas = d.createElement('canvas');
      canvas.className = 'linterna__niebla';
      canvas.setAttribute('aria-hidden', 'true');
      el.appendChild(canvas);
      motor = A.niebla.crear(canvas, {
        img, caja: el, foto, movimiento: vivo, densidad: densidad * factorSobria, abrir: apertura(),
        alListo: () => { if (canvas) canvas.classList.add('es-lista'); },
        alPerder: (m) => respaldo('perdido-' + m),
      });
      if (motor) {
        el.dataset.motor = 'webgl';
        motor.luz(sobria ? 0.6 : 1);
      } else respaldo('webgl-no-disponible');
    } else respaldo(parametros.has('sin-webgl') ? 'sin-webgl' : ahorroDeDatos() ? 'ahorro-de-datos' : 'sin-motor');

    // la linterna de la portada se enciende: si la cortina no lo dijo ya, lo dice la portada
    const C = A.cortina;
    if (!(C && C.marcas && C.marcas.linterna)) {
      const t = setTimeout(() => { try { d.dispatchEvent(new CustomEvent('ahio:linterna', { detail: { origen: 'portada' } })); } catch (e) {} }, vivo ? 500 : 0);
      limpiar.push(() => clearTimeout(t));
    }

    // 2. el tiempo de ahora: la densidad base
    tiempo().then((t) => {
      if (destruido) return;
      densidad = t ? t.densidad : DENSIDAD_MEDIA;
      el.dataset.tiempo = t ? t.clave : 'sin-dato';
      el.dataset.niebla = (densidad * factorSobria).toFixed(2);
      if (motor) motor.densidad(densidad * factorSobria);
      el.style.setProperty('--densidad', String(densidad * factorSobria));
      escribirTiempo(t);
    });

    // 3. el scroll levanta la niebla (el respaldo CSS se desvanece)
    function medirScroll() {
      pendiente = false;
      if (destruido) return;
      const r = seccion.getBoundingClientRect();
      levanta = clamp(-r.top / Math.max(1, r.height * 0.8), 0, 1);
      el.dataset.levanta = levanta.toFixed(2);
      if (motor) motor.levanta(levanta);
      if (velos) velos.style.opacity = String(1 - levanta);
    }
    function alScroll() { if (!pendiente) { pendiente = true; requestAnimationFrame(medirScroll); } }
    addEventListener('scroll', alScroll, { passive: true });
    limpiar.push(() => removeEventListener('scroll', alScroll));
    alScroll();
    if (velos && foto && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => colocarLuz());
      ro.observe(el);
      limpiar.push(() => ro.disconnect());
    }

    // 4. el gesto: el puntero abre la niebla por donde pasa (oyentes pasivos: nunca bloquea el scroll)
    if (motor && vivo) {
      el.dataset.gesto = '1';
      let n = 0;
      const mover = (e) => {
        if (!motor) return;
        motor.puntero(e.clientX, e.clientY, true);
        n++;
        if (n % 4 === 1) el.dataset.trazos = String(n);
      };
      const soltar = (e) => { if (motor && (e.type !== 'pointerup' || e.pointerType !== 'mouse')) motor.puntero(0, 0, false); };
      seccion.addEventListener('pointermove', mover, { passive: true });
      seccion.addEventListener('pointerdown', mover, { passive: true });
      ['pointerleave', 'pointercancel', 'pointerup'].forEach((t) => seccion.addEventListener(t, soltar, { passive: true }));
      limpiar.push(() => {
        seccion.removeEventListener('pointermove', mover);
        seccion.removeEventListener('pointerdown', mover);
        ['pointerleave', 'pointercancel', 'pointerup'].forEach((t) => seccion.removeEventListener(t, soltar));
      });
    }

    // 5. pausa fuera de pantalla y con la pestaña oculta
    let visible = true;
    const aplicarPausa = () => { if (motor) motor.pausa(!visible || d.hidden); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; aplicarPausa(); }, { rootMargin: '80px 0px' });
      io.observe(el);
      limpiar.push(() => io.disconnect());
    }
    d.addEventListener('visibilitychange', aplicarPausa);
    limpiar.push(() => d.removeEventListener('visibilitychange', aplicarPausa));

    const inst = {
      destruir() {
        destruido = true;
        limpiar.splice(0).forEach((f) => { try { f(); } catch (e) {} });
        if (motor) motor.destruir();
        motor = null;
        if (canvas) canvas.remove();
        if (velos) velos.remove();
        canvas = velos = null;
        ['montado', 'motor', 'motivo', 'gesto', 'trazos', 'tiempo', 'niebla', 'levanta', 'quieto'].forEach((k) => { delete el.dataset[k]; });
        el.style.removeProperty('--densidad');
        delete el.__linterna;
      },
      get motor() { return motor; },
    };
    el.__linterna = inst;
    return inst;
  }

  A.linterna = { montar, tiempo, FOTO };

  // el tiempo se pide ya (en paralelo con la cortina) si la página tiene dónde usarlo
  if (d.querySelector('[data-modulo="linterna"], [data-tiempo-ahora]')) tiempo().then(escribirTiempo);
  cortina();
})();
