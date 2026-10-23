// «En plano»: el hilo del Ahío en 2D (sin WebGL). El relieve sombreado sobre la ortofoto del IGN, con los ríos en tenue
// (img/terreno/plano-base), y encima, en SVG, el hilo de oro que se enciende con el scroll y una «cámara» (el viewBox)
// que lo acompaña igual que el 3D: Los Oscos desde arriba, el Ahío río abajo, el agua remontada hasta la casa, la casa
// con su linterna y al final todo. Es el plan B (sin WebGL2, ahorro de datos, ?sin-3d) y el botón «En plano».
// Los rótulos son los mismos que en 3D (guion.js).
import { fase, marcas, enCamino, clamp, crearRotulos, listaRotulos, opRotulo } from './guion.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const mezcla = (a, b, k) => a + (b - a) * k;

/** caja: el contenedor (.ruta-plano; los rótulos van en su propia capa dentro), base: URL de img/terreno/ */
export function montarPlano(caja, T, { base, movimiento, v = '' }) {
  const PW = T.plano.w, PH = T.plano.h, R = T.rio, L = T.lugares, M = marcas(T);
  const aP = (x, z) => [(x / T.ancho + .5) * PW, (z / T.alto + .5) * PH];
  // el hilo en coordenadas del plano y una copia suavizada (≈600 m) para que la cámara no dé tirones en las curvas
  const n = R.x.length, PX = new Float32Array(n), PY = new Float32Array(n);
  for (let i = 0; i < n; i++) { const [x, y] = aP(R.x[i], R.z[i]); PX[i] = x; PY[i] = y; }
  const SX = new Float32Array(n), SY = new Float32Array(n), V = 50;
  for (let i = 0; i < n; i++) { let sx = 0, sy = 0, c = 0; for (let j = Math.max(0, i - V); j <= Math.min(n - 1, i + V); j++) { sx += PX[j]; sy += PY[j]; c++; } SX[i] = sx / c; SY[i] = sy / c; }
  const trazo = (a, b) => { let d = ''; for (let i = a; i <= b; i += 2) d += (d ? 'L' : 'M') + PX[i].toFixed(1) + ' ' + PY[i].toFixed(1); return d + 'L' + PX[b].toFixed(1) + ' ' + PY[b].toFixed(1); };
  const iA = R.partes[1];
  const dAhio = trazo(0, iA), dVuelta = trazo(iA, n - 1), dTodo = trazo(0, n - 1);
  const [cx, cy] = aP(...L.casa.xz);
  // la vista de arriba (intro): el Ahío entero y la casa
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < n; i += 10) { x0 = Math.min(x0, PX[i]); x1 = Math.max(x1, PX[i]); y0 = Math.min(y0, PY[i]); y1 = Math.max(y1, PY[i]); }
  for (const k of ['santa-eulalia', 'villanueva']) { const [x, y] = aP(...L[k].xz); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const caja0 = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: (x1 - x0) * 1.18, h: (y1 - y0) * 1.18 };

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ruta-plano-svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.innerHTML = `
    <defs><radialGradient id="ruta-p-brillo"><stop offset="0" stop-color="#FFE7B0" stop-opacity=".95"/><stop offset=".3" stop-color="#F2B84B" stop-opacity=".5"/><stop offset="1" stop-color="#F2B84B" stop-opacity="0"/></radialGradient></defs>
    <image href="${base}plano-base.webp${v}" x="0" y="0" width="${PW}" height="${PH}" preserveAspectRatio="none"/>
    <path class="ruta-p-agua" d="${dTodo}"/>
    <path class="ruta-p-borde" d="${dTodo}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1" data-borde/>
    <path class="ruta-p-oro" d="${dAhio}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1" data-ahio/>
    <path class="ruta-p-vuelta" d="${dVuelta}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1" data-vuelta/>
    <circle class="ruta-p-brillo" r="26" fill="url(#ruta-p-brillo)" cx="${PX[0].toFixed(1)}" cy="${PY[0].toFixed(1)}" data-cabeza/>
    <circle class="ruta-p-halo" r="22" fill="url(#ruta-p-brillo)" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" data-halo/>
    <circle class="ruta-p-punto casa" r="7" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}"/>`;
  // si el navegador no tiene WebP, la imagen JPG
  const img = svg.querySelector('image');
  const prueba = new Image(); prueba.onerror = () => img.setAttribute('href', `${base}plano-base.jpg${v}`); prueba.src = `${base}plano-base.webp${v}`;
  const lista = listaRotulos(T);
  // los puntos de los lugares (los ríos no llevan punto)
  for (const r of lista) {
    if (r.k === 'casa' || r.k.startsWith('r-') || L[r.k].fuera) continue;
    const [x, y] = aP(...L[r.k].xz), c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('class', 'ruta-p-punto'); c.setAttribute('r', '6'); c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.dataset.lugar = r.k;
    svg.appendChild(c);
  }
  caja.appendChild(svg);
  const capa = document.createElement('div'); capa.className = 'ruta-rotulos'; capa.setAttribute('aria-hidden', 'true'); caja.appendChild(capa);
  const borde = svg.querySelector('[data-borde]'), oro = svg.querySelector('[data-ahio]'), vuelta = svg.querySelector('[data-vuelta]');
  const cabeza = svg.querySelector('[data-cabeza]'), halo = svg.querySelector('[data-halo]');
  const puntosLugar = [...svg.querySelectorAll('.ruta-p-punto[data-lugar]')];

  const rotulos = crearRotulos(capa, lista);
  const puntos = lista.map(r => aP(...L[r.k].xz));

  // ---------- la cámara 2D: ancho visible (en px del plano) y centro según la fase ----------
  let cw = 0, ch = 0, vb = [0, 0, PW, PH], esc = 1;
  function camara(F) {
    const a = cw / ch;
    const c = enCamino(R, F.f), i = Math.round(c.i);
    const zoomViaje = a < 1 ? 520 : 640;
    // la vista de arriba: el Ahío entero y la casa, que quepan
    const wIntro = Math.max(caja0.w, caja0.h * a);
    let w = mezcla(zoomViaje, wIntro, F.intro), x = mezcla(SX[i], caja0.x, F.intro), y = mezcla(SY[i], caja0.y, F.intro);
    w = mezcla(w, a < 1 ? 300 : 380, F.llegada); x = mezcla(x, cx, F.llegada); y = mezcla(y, cy, F.llegada);
    // la vista de todo: el plano entero
    w = mezcla(w, PW * 1.02, F.vista); x = mezcla(x, PW / 2, F.vista); y = mezcla(y, PH / 2, F.vista);
    let h = w / a;
    if (h > PH && F.vista < .5) { h = PH; w = h * a; }
    // como en 3D: la cabeza del hilo, a la derecha del cuaderno (apaisado) o por encima de él (vertical)
    const e = cw / w, dx = a >= 1 && cw > 760 ? Math.min(190, cw * .13) : 0, dy = a < 1 || cw <= 760 ? Math.min(120, ch * .14) : 0;
    x -= dx / e * (1 - F.vista); y += dy / e * (1 - F.vista);
    // dentro de la imagen siempre que quepa
    x = w >= PW ? PW / 2 : clamp(x, w / 2, PW - w / 2); y = h >= PH ? PH / 2 : clamp(y, h / 2, PH - h / 2);
    return [x - w / 2, y - h / 2, w, h];
  }
  function medir() { cw = caja.clientWidth; ch = caja.clientHeight; rotulos.medir(); }

  let p = 0, pv = 0, raf = 0, ultimo = 0, activo = false;
  function pintar() {
    if (!cw || !ch) medir();
    if (!cw || !ch) return;
    const F = fase(pv, M.fa), fh = F.llegada > .5 ? 1 : F.f;
    vb = camara(F); esc = cw / vb[2];
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
    // el trazo, del mismo grosor en pantalla a cualquier zoom; el Ahío en oro y el agua remontada en oro pálido
    const kA = clamp(fh / M.fa), kV = clamp((fh - M.fa) / (1 - M.fa));
    oro.setAttribute('stroke-dashoffset', (1 - kA).toFixed(4));
    vuelta.setAttribute('stroke-dashoffset', (1 - kV).toFixed(4));
    borde.setAttribute('stroke-dashoffset', (1 - fh).toFixed(4));
    svg.style.setProperty('--z', esc.toFixed(3));
    const c = enCamino(R, fh), i = Math.round(c.i);
    cabeza.setAttribute('cx', PX[i].toFixed(1)); cabeza.setAttribute('cy', PY[i].toFixed(1));
    cabeza.setAttribute('r', (26 / Math.sqrt(esc)).toFixed(1));
    cabeza.style.opacity = fh > 0 && fh < 1 ? '1' : '0';
    // la linterna de la casa se enciende al llegar el hilo
    halo.style.opacity = Math.max(F.intro * .5, clamp((fh - .96) / .04), F.llegada).toFixed(2);
    halo.setAttribute('r', (30 / Math.sqrt(esc)).toFixed(1));
    puntosLugar.forEach(pt => { pt.style.opacity = Math.max(.15, opRotulo(pt.dataset.lugar, F, false, M)).toFixed(2); });
    rotulos.colocar(lista.map((r, k) => ({ x: (puntos[k][0] - vb[0]) * esc, y: (puntos[k][1] - vb[1]) * esc - 8, visible: true, op: opRotulo(r.k, F, false, M) })));
  }
  function cuadro(t) {
    raf = 0;
    if (!activo) return;
    const dt = ultimo ? Math.min(100, t - ultimo) : 16; ultimo = t;
    pv = movimiento ? pv + (p - pv) * (1 - Math.exp(-dt / 110)) : p;
    if (Math.abs(p - pv) < 1e-4) pv = p;
    pintar();
    if (pv !== p) raf = requestAnimationFrame(cuadro); else ultimo = 0;
  }
  const pedir = () => { if (!raf && activo) raf = requestAnimationFrame(cuadro); };
  // la barra del móvil cambia solo el alto: se vuelve a medir (el SVG no pesa), sin más
  const ro = new ResizeObserver(() => { const w = caja.clientWidth, h = caja.clientHeight; if (w !== cw || h !== ch) { medir(); pedir(); } });
  ro.observe(caja);

  return {
    svg, rotulos,
    get progreso() { return pv; },
    ponerProgreso(v, deGolpe) { p = clamp(v); if (deGolpe || !movimiento) pv = p; pedir(); },
    mostrar(si) { activo = si; caja.hidden = !si; if (si) { medir(); pv = p; pedir(); } else { cancelAnimationFrame(raf); raf = 0; rotulos.ocultar(); } },
    destruir() { activo = false; cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); capa.remove(); },
  };
}
