/* ------------------------------------------------------------------
   Ahío San Martín · «El hilo» (F) y la calceta del pie          (agente Hilo)

   SECCIÓN F · [data-modulo="hilo"]
     Una hebra de lana con física de cuerda (Verlet) que baja por las seis
     estaciones de la Xuntanza de Filandeiras y se transforma al pasar por
     cada una: vellón sucio → lavado → escarpullado (abierto, esponjoso) →
     cardado (cinta peinada) → torcido (hebra gruesa, torcida) → filado (hilo
     fino en el fuso) → calcetado (acaba en las agujas), en el orden literal
     de su web. Cada estación es un dibujo a línea propio en dos capas (fondo
     debajo del hilo, frente encima), así que el hilo pasa DE VERDAD por el
     agua, entre las cardas, bajo la cinta de la roca, por el fuso y bajo las
     agujas.
     - Se pellizca y se tira con el ratón o el dedo; se suelta y vuelve.
       En táctil, `touch-action: pan-y` y ningún preventDefault en el toque:
       un gesto vertical es scroll siempre.
     - El hilo baja por delante del lector (se revela con el scroll) y cada
       dibujo se traza cuando el hilo llega a él.
     - En escritorio, si hay margen libre a la izquierda y existe #hilo-capa,
       el hilo entra por el borde en la sección de Ena y baja por ese margen.
     - Canvas 2D, DPR ≤ 1,5, lienzos ABSOLUTOS (el scroll no repinta nada si
       el hilo está quieto), sin rAF cuando duerme, pausa fuera de pantalla.
       Se mide cada fotograma (Ahio.hilo.estado(el).ms).
   CALCETA DEL PIE · [data-modulo="calceta"]
     Una tira de punto (jersey: filas de «V») que se teje con la lectura desde
     que se sale de la sección de la lana hasta el final de la página, donde
     está rematada.

   Contrato: window.Ahio.hilo.montar(el, { movimiento, densidad, fotos?, fotosJson?,
   ena?, capa? }) → { destruir() }; mira el.dataset.modulo ('hilo' | 'calceta').
   También Ahio.hilo.seccion / Ahio.hilo.calceta y Ahio.calceta.montar.
   El HTML de `el` es el respaldo: se oculta al montar y vuelve con destruir().
   Con movimiento:false, movimiento reducido o densidad sobria: hilo quieto,
   los pasos dibujados y la calceta terminada.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const A = (G.Ahio = G.Ahio || {});
  const DOC = typeof document !== 'undefined' ? document : null;
  const BASE = (function () {
    const s = DOC && DOC.currentScript && DOC.currentScript.src;
    try { return new URL('../', s || G.location.href).href; } catch (e) { return '../'; }
  })();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const n1 = (v) => Math.round(v * 10) / 10;
  const suave = (t) => t * t * (3 - 2 * t);
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

  /* ================= LOS DATOS (solo ref/DATOS-AHIO.md) =================
     ORDEN: el literal de su web («lavado, escarpullado, cardado, torcido, filado y calcetado»).
     Ojo (a PENDIENTES): su post de 2026 dice «hilado, torcido» y el cartel de la II Xuntanza pone el
     torcido después del fusado; que Ena confirme el orden. Para cambiarlo, solo este array (y el
     aspecto del hilo en ESTADOS, que va en este mismo orden).
     Glosario (escarpullar, filar, roca, fuso, fusado): «por confirmar con Ena» (data-por-confirmar). */
  const TEL_WA = '34644835772';
  const CORREO = 'hola@oscosahio.es';
  const PASOS = [
    { id: 'lavado', nombre: 'Lavado', texto: 'Primero, la lana se lava.' },
    { id: 'escarpullado', nombre: 'Escarpullado', texto: '<span data-por-confirmar>Escarpullar es abrir y limpiar la lana a mano antes de cardarla.</span>' },
    { id: 'cardado', nombre: 'Cardado', texto: 'Después, la lana se carda.' },
    { id: 'torcido', nombre: 'Torcido', texto: 'Luego se tuerce.' },
    { id: 'filado', nombre: 'Filado', texto: '<span data-por-confirmar>Filar es hilar: con la <i>roca</i> (la rueca) y el <i>fuso</i> (el huso). Lo que queda enrollado en el fuso es el <i>fusado</i>.</span>' },
    { id: 'calcetado', nombre: 'Calcetado', texto: 'Y por último, se calceta: se teje a punto con agujas.' },
  ];

  /* ================= LOS DIBUJOS (viewBox 240 × 240, a línea, propios) ================= */
  function nube(cx, cy, rx, ry, n, amp, sem) {
    const r = azar(sem);
    const pts = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + (r() - 0.5) * 0.25;
      const k = 0.88 + r() * 0.16;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, a]);
    }
    let d = 'M' + n1(pts[0][0]) + ' ' + n1(pts[0][1]);
    for (let j = 0; j < n; j++) {
      const p = pts[j], q = pts[(j + 1) % n];
      const aq = q[2] < p[2] ? q[2] + Math.PI * 2 : q[2];
      const am = (p[2] + aq) / 2, ka = 1 + amp * (0.75 + r() * 0.55);
      d += 'Q' + n1(cx + Math.cos(am) * rx * ka) + ' ' + n1(cy + Math.sin(am) * ry * ka) + ' ' + n1(q[0]) + ' ' + n1(q[1]);
    }
    return d + 'Z';
  }
  const elipseD = (cx, cy, rx, ry) => `M${n1(cx - rx)} ${n1(cy)}A${rx} ${ry} 0 1 1 ${n1(cx + rx)} ${n1(cy)}A${rx} ${ry} 0 1 1 ${n1(cx - rx)} ${n1(cy)}`;
  const arcoFrente = (cx, cy, rx, ry) => `M${n1(cx - rx)} ${n1(cy)}A${rx} ${ry} 0 0 0 ${n1(cx + rx)} ${n1(cy)}`;
  const gota = (x, y, s) => `M${x} ${n1(y - 7 * s)}C${n1(x + 2 * s)} ${n1(y - 3 * s)} ${n1(x + 4 * s)} ${n1(y - s)} ${n1(x + 4 * s)} ${n1(y + 1.5 * s)}A${n1(4 * s)} ${n1(4 * s)} 0 0 1 ${n1(x - 4 * s)} ${n1(y + 1.5 * s)}C${n1(x - 4 * s)} ${n1(y - s)} ${n1(x - 2 * s)} ${n1(y - 3 * s)} ${x} ${n1(y - 7 * s)}Z`;
  // un palo (roca, aguja, mango): contorno de dos líneas con los extremos redondos o en punta
  function palo(x1, y1, x2, y2, h, punta) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * h, ny = ux * h;
    const P = (x, y) => n1(x) + ' ' + n1(y);
    let d = 'M' + P(x1 + nx, y1 + ny) + 'L' + P(x2 + nx, y2 + ny);
    d += punta ? 'L' + P(x2 + ux * h * punta, y2 + uy * h * punta) + 'L' + P(x2 - nx, y2 - ny)
               : 'Q' + P(x2 + ux * h * 1.6, y2 + uy * h * 1.6) + ' ' + P(x2 - nx, y2 - ny);
    return d + 'L' + P(x1 - nx, y1 - ny) + 'Q' + P(x1 - ux * h * 1.6, y1 - uy * h * 1.6) + ' ' + P(x1 + nx, y1 + ny) + 'Z';
  }
  // rectángulo girado (las cardas): esquinas y un mapeo local → dibujo
  function placa(cx, cy, w, h, grados) {
    const a = grados * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    const p = (lx, ly) => [cx + ux * lx + vx * ly, cy + uy * lx + vy * ly];
    const c = [p(-w / 2, -h / 2), p(w / 2, -h / 2), p(w / 2, h / 2), p(-w / 2, h / 2)];
    const r = 5, q = (i) => c[i].map(n1).join(' ');
    // esquinas apenas redondeadas
    const en = (i, j, t) => [lerp(c[i][0], c[j][0], t), lerp(c[i][1], c[j][1], t)].map(n1).join(' ');
    const tw = r / w, th = r / h;
    const d = `M${en(0, 1, tw)}L${en(0, 1, 1 - tw)}Q${q(1)} ${en(1, 2, th)}L${en(1, 2, 1 - th)}Q${q(2)} ${en(2, 3, tw)}L${en(2, 3, 1 - tw)}Q${q(3)} ${en(3, 0, th)}L${en(3, 0, 1 - th)}Q${q(0)} ${en(0, 1, tw)}Z`;
    return { d, p, u: [ux, uy] };
  }
  // un punto de jersey: las dos patas de la «V» como medias elipses
  function pierna(xb, yb, xt, yt, b) {
    const a = Math.hypot(xt - xb, yt - yb) / 2, ang = Math.atan2(yt - yb, xt - xb) * 180 / Math.PI;
    return `M${n1(xb)} ${n1(yb)}A${n1(a)} ${n1(b)} ${n1(ang)} 0 1 ${n1(xt)} ${n1(yt)}A${n1(a)} ${n1(b)} ${n1(ang)} 0 1 ${n1(xb)} ${n1(yb)}Z`;
  }
  const puntoV = (cx, yb, sw, rh) => [
    pierna(cx - 0.05 * sw, yb - 0.06 * rh, cx - 0.46 * sw, yb - 1.36 * rh, 0.25 * sw),
    pierna(cx + 0.05 * sw, yb - 0.06 * rh, cx + 0.46 * sw, yb - 1.36 * rh, 0.25 * sw),
  ];
  // la mano izquierda que pellizca (solo M, L, C absolutos: así se refleja sin más)
  const MANO = [
    'M0 80C20 74 42 76 58 84C68 89 77 97 84 105C88 110 86 115 80 114C72 112 64 107 57 104',
    'M0 140C20 138 40 131 57 124C67 120 76 117 82 118C87 119 86 124 81 126C70 130 58 134 46 136',
    'M57 104C64 108 65 116 58 120M49 108C56 113 56 122 48 125',
    'M40 82C44 86 44 92 40 96',
    'M78 102C81 104 83 106 84 109M79 119C82 120 84 122 84 124',
  ];
  const espejo = (d) => d.replace(/([MLCQ])([^MLCQZ]*)/g, (m, c, args) => {
    const n = args.trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < n.length; i += 2) n[i] = n1(240 - n[i]);
    return c + n.join(' ');
  });

  // una flecha de giro alrededor del hilo: ¾ de elipse que pasa por delante, con su punta
  function flechaGiro(cx, cy, rx, ry) {
    const P = (g) => { const a = g * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
    const [x0, y0] = P(200), [x1, y1] = P(-20);
    const a = -20 * Math.PI / 180;
    let tx = rx * Math.sin(a), ty = -ry * Math.cos(a);
    const l = Math.hypot(tx, ty); tx /= l; ty /= l;
    const w = (s) => [x1 - tx * 5 + -ty * 3 * s, y1 - ty * 5 + tx * 3 * s].map(n1).join(' ');
    return `M${n1(x0)} ${n1(y0)}A${rx} ${ry} 0 1 0 ${n1(x1)} ${n1(y1)}M${n1(x1)} ${n1(y1)}L${w(1)}M${n1(x1)} ${n1(y1)}L${w(-1)}`;
  }
  function lapiz() {
    let k = 0;
    return {
      t: (d, cls, attrs) => `<path class="t${cls ? ' ' + cls : ''}" pathLength="1" style="--k:${Math.min(k++, 36)}" d="${d}"${attrs ? ' ' + attrs : ''}/>`,
      r: (d, cls) => `<path class="r ${cls}" style="--k:${Math.min(k++, 36)}" d="${d}"/>`,
      c: (x, y, rad, cls) => `<circle class="r ${cls || 'm'}" style="--k:${Math.min(k++, 36)}" cx="${x}" cy="${y}" r="${rad}"/>`,
    };
  }

  /* Cada estación: fondo (debajo del hilo), frente (encima) y los puntos por los que pasa el hilo
     (en el viewBox): p = clavado (el hilo pasa por ahí y no se suelta), a/b = empieza/acaba el
     cambio de aspecto, i = arranque cuando no viene del margen, c = solo si viene del margen,
     f = el final del hilo. */
  let _dib = null;
  function dibujos() {
    if (_dib) return _dib;
    const D = {};
    { // 1 · LAVADO: el vellón sucio y la tina con agua
      const L = lapiz(); let f = '', t = '';
      f += L.t(nube(58, 96, 40, 21, 9, 0.3, 11));
      f += L.t('M40 99c2-5 9-6 11-1s-3 6-6 3M62 88c3-4 10-3 10 2s-5 5-7 1M78 104c2-4 8-4 9 0M28 92c3-3 7-3 8 1', 'fino');
      f += L.t('M24 84l7-3M86 88l7 3M70 117l6 2', 'fino');
      [[44, 90], [52, 105], [70, 95], [84, 101], [36, 104], [66, 109], [90, 93]].forEach(([x, y]) => { f += L.c(x, y, 1.3); });
      f += L.t(elipseD(152, 150, 72, 16));
      f += L.t(elipseD(152, 150.5, 65, 12), 'fino');
      f += L.t('M80 150C82 176 86 198 94 214M224 150C222 176 218 198 210 214');
      f += L.t(arcoFrente(152, 214, 58, 11));
      f += L.t(arcoFrente(152, 171, 70.5, 15) + arcoFrente(152, 196, 63.5, 13), 'aro');
      let duelas = '';
      [108, 130, 152, 174, 196].forEach((x) => {
        const xb = 152 + (x - 152) * 0.8;
        const y1 = 150 + 16 * Math.sqrt(1 - Math.pow((x - 152) / 72, 2));
        const y2 = 214 + 11 * Math.sqrt(1 - Math.pow((xb - 152) / 58, 2));
        duelas += `M${n1(x)} ${n1(y1)}L${n1(xb)} ${n1(y2)}`;
      });
      f += L.t(duelas, 'fino');
      f += L.t(gota(146, 108, 1) + gota(170, 122, 0.8) + gota(132, 124, 0.6));
      t += `<ellipse class="r agua" style="--k:30" cx="152" cy="151" rx="64" ry="11.2"/>`;
      t += L.t('M104 151q7-3 14 0t14 0M150 146q7-3 14 0t14 0M172 157q6-2 12 0t12 0', 'fino');
      t += L.t(elipseD(124, 150, 8, 2.2) + elipseD(124, 150, 14, 3.8), 'fino');
      D.lavado = { fondo: f, frente: t, pts: [[14, 92, 'c'], [58, 96, 'pi'], [96, 112, ''], [124, 150, 'pa'], [178, 153, 'p'], [200, 162, 'pb'], [206, 200, ''], [204, 252, '']] };
    }
    { // 2 · ESCARPULLADO: dos manos abren la lana; caen pajas y un cadillo
      const L = lapiz(); let f = '', t = '';
      MANO.forEach((d, i) => { f += L.t(d, i > 2 ? 'fino' : ''); });
      MANO.forEach((d, i) => { f += L.t(espejo(d), i > 2 ? 'fino' : ''); });
      f += L.t(nube(120, 111, 30, 17, 9, 0.34, 21), 'fino');
      f += L.t('M85 110C98 100 108 116 120 108S144 100 155 110M85 113C100 122 112 104 126 116S146 120 155 112M87 107C100 94 120 96 132 100S150 104 154 108M88 116C104 130 124 128 138 122S150 118 153 114', 'fino');
      f += L.t('M98 160l7 3M141 172l-3 7M114 206l7-2M150 196l4 5', 'fino');
      f += L.t('M98 147v6M141 160v6M114 192v6', 'fino');
      let cad = elipseD(126, 188, 3.2, 3.2);
      for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; cad += `M${n1(126 + Math.cos(a) * 3.4)} ${n1(188 + Math.sin(a) * 3.4)}L${n1(126 + Math.cos(a) * 6.4)} ${n1(188 + Math.sin(a) * 6.4)}`; }
      f += L.t(cad, 'fino');
      [[106, 182], [152, 158], [132, 214]].forEach(([x, y]) => { f += L.c(x, y, 1.1); });
      t += L.t('M104 100C112 106 116 111 124 111M116 121C122 118 128 120 136 126M100 117C108 119 112 115 118 116', 'fino');
      D.escarpullado = { fondo: f, frente: t, pts: [[116, -16, ''], [112, 102, 'pa'], [128, 124, 'pb'], [124, 190, ''], [120, 252, '']] };
    }
    { // 3 · CARDADO: dos cardas (como las del cartel) y un cardo, la planta
      const L = lapiz(); let f = '', t = '';
      const atras = placa(112, 126, 146, 60, -8);
      f += L.t(atras.d);
      const mA = atras.p(73, 0), mA2 = atras.p(118, 0);
      f += L.t(palo(mA[0], mA[1], mA2[0], mA2[1], 6));
      let dientes = '';
      for (let i = 0; i < 16; i++) for (let j = 0; j < 6; j++) {
        const [x, y] = atras.p(-64 + i * 8.5, -22 + j * 8.8);
        dientes += `M${n1(x)} ${n1(y)}l1.8 -2.6`;
      }
      f += L.t(dientes, 'fino');
      // el cardo: tallo, cabeza con su trama y las brácteas
      f += L.t('M214 96C212 70 208 48 206 34M210 70C200 66 194 58 192 50C200 52 207 60 210 70Z');
      f += L.t(elipseD(205, 21, 8.5, 13));
      f += L.t('M199 12l12 10M198 19l14 11M199 27l10 8M211 12l-12 10M212 19l-14 11M211 27l-10 8', 'fino');
      f += L.t('M199 32C190 26 186 16 187 6M211 32C220 26 224 16 223 6M203 34C196 30 192 24 192 18', 'fino');
      const ante = placa(130, 190, 142, 54, 7);
      t += L.t(ante.d, 'tapa');
      const mB = ante.p(-71, 0), mB2 = ante.p(-116, 0);
      t += L.t(palo(mB[0], mB[1], mB2[0], mB2[1], 6), 'tapa');
      let veta = '';
      [-13, 1, 14].forEach((ly, k) => {
        let s = '';
        for (let lx = -60; lx <= 60; lx += 10) { const [x, y] = ante.p(lx, ly + Math.sin(lx / 13 + k) * 2.2); s += (s ? 'L' : 'M') + n1(x) + ' ' + n1(y); }
        veta += s;
      });
      t += L.t(veta, 'fino');
      D.cardado = { fondo: f, frente: t, pts: [[84, -14, ''], [98, 116, 'pa'], [116, 158, ''], [138, 226, 'pb'], [142, 252, '']] };
    }
    { // 5 · FILADO: la roca con la lana y el fuso con el fusado
      const L = lapiz(); let f = '', t = '';
      f += L.t(palo(40, 236, 112, 8, 2.6));
      f += L.t(nube(96, 54, 33, 27, 10, 0.3, 41));
      f += L.t('M80 46c3-5 10-5 11 0s-4 6-7 2M104 40c3-4 10-3 10 2s-5 5-7 1M108 68c2-4 9-4 10 0M78 70c2-3 7-3 8 1', 'fino');
      f += L.t('M176 104L178 238');
      f += L.t('M176 140C191 156 193 192 177 214C161 192 161 156 176 140Z');
      f += L.t(elipseD(178, 222, 6.5, 2.5));
      t += L.t('M64 60C84 50 108 44 130 48M66 68C86 58 110 52 131 56', 'fino');
      let vueltas = '';
      for (let y = 150; y <= 206; y += 5.5) {
        const hw = 14.2 * Math.sin(Math.PI * (y - 140) / 74);
        vueltas += `M${n1(176.5 - hw)} ${n1(y + 3)}L${n1(176.5 + hw)} ${n1(y - 3)}`;
      }
      t += L.t(vueltas, 'fino');
      D.filado = { fondo: f, frente: t, pts: [[78, -14, ''], [84, 32, 'p'], [102, 84, 'pa'], [142, 106, ''], [176, 140, 'pb'], [176, 178, ''], [177, 214, 'p'], [172, 252, '']] };
    }
    { // 4 · TORCIDO: dos manos tuercen la hebra (las flechas, el giro)
      const L = lapiz(); let f = '', t = '';
      MANO.forEach((d, i) => { f += L.t(d, i > 2 ? 'fino' : '', 'transform="translate(35 -26)"'); });
      MANO.forEach((d, i) => { f += L.t(espejo(d), i > 2 ? 'fino' : '', 'transform="translate(-35 66)"'); });
      f += L.t(flechaGiro(120, 118, 19, 6), 'fino');
      f += L.t(flechaGiro(120.5, 142, 17, 5.5), 'fino');
      D.torcido = { fondo: f, frente: t, pts: [[130, -14, ''], [122, 40, ''], [120, 84, 'pa'], [120, 130, ''], [120, 176, 'pb'], [121, 252, '']] };
    }
    { // 6 · CALCETADO: dos agujas cruzadas y el punto que cuelga
      const L = lapiz(); let f = '', t = '';
      const yAguja = (x) => 74 + (x - 14) * 19 / 146;
      for (let r = 0; r < 6; r++) {
        let iz = '', de = '';
        for (let c = 0; c < 8; c++) {
          const cx = 32.75 + c * 13.5;
          const yb = yAguja(cx) + 2 + (r + 1) * 9.5 + 3;
          const [a, b] = puntoV(cx, yb, 13.5, 9.5);
          iz += a; de += b;
        }
        f += L.r(iz, 'punto-iz') + L.r(de, 'punto-de');
      }
      let remate = '';
      for (let c = 0; c <= 16; c++) { const x = 26 + c * 6.75, y = yAguja(x) + 2 + 6 * 9.5 + 5; remate += (c ? 'L' : 'M') + n1(x) + ' ' + n1(y + (c % 2 ? 2.2 : 0)); }
      f += L.t(remate, 'fino');
      t += L.t(palo(14, 74, 160, 93, 2.2, 2.6));
      t += L.t(elipseD(8, 73, 6, 6));
      t += L.t(palo(228, 46, 92, 106, 2.2, 2.6));
      t += L.t(elipseD(233, 44, 6, 6));
      D.calcetado = { fondo: f, frente: t, pts: [[176, -14, ''], [170, 40, 'p'], [152, 74, ''], [136, 95, 'pf']] };
    }
    _dib = D;
    return D;
  }

  /* ================= LA CALCETA (SVG) =================
     K puntos × R filas, la fila 0 abajo (el montaje). Cada fila: dos paths (patas izquierdas y
     derechas) con su clipPath, que el módulo abre punto a punto, una fila de ida y la siguiente de
     vuelta, como se teje de verdad. Dos filas en el verde del logo. K sale del ancho del hueco
     (un punto ≈ 13 px): la tira cruza el pie entero, como el respaldo de la web. */
  const SW = 10, RH = 7, CX0 = 50, CR = 12;
  function geoCalceta(K, R) {
    K = K || 40; R = R || CR;
    const CW = K * SW, CYB = 16 + R * RH;          // ancho de la tira y base de la fila 0
    return { K, R, CW, CYB, CTOP: CYB - (R - 1) * RH - 1.36 * RH, bx: CX0 + CW + 28, by: CYB - 16, rayas: [R - 5, R - 4] };
  }
  function calcetaSVG(o) {
    o = o || {};
    const id = o.id || 'cl';
    const fijo = !!o.terminada;
    const g = geoCalceta(o.K, o.R);
    const { K, R, CW, CYB, CTOP, bx, by } = g;
    const vbW = CX0 + CW + CX0, vbH = CYB + 14;
    let defs = '', filas = '';
    for (let r = 0; r < R; r++) {
      const yb = CYB - r * RH;
      let iz = '', de = '';
      for (let c = 0; c < K; c++) { const [a, b] = puntoV(CX0 + c * SW + SW / 2, yb, SW, RH); iz += a; de += b; }
      const raya = g.rayas.indexOf(r) >= 0 ? ' es-raya' : '';
      if (!fijo) defs += `<clipPath id="${id}-c${r}"><rect x="${CX0 - 2}" y="${n1(yb - 1.55 * RH)}" width="0" height="${n1(1.75 * RH)}"/></clipPath>`;
      filas += `<g class="cl-fila${raya}" data-f="${r}"${fijo ? '' : ` clip-path="url(#${id}-c${r})"`}><path class="cl-iz" d="${iz}"/><path class="cl-de" d="${de}"/></g>`;
    }
    // el montaje (abajo) y el remate (arriba, cuando está terminada)
    let montaje = `M${CX0} ${CYB + 1.5}`;
    for (let c = 0; c < K; c++) montaje += `q${SW / 4} 2.6 ${SW / 2} 0t${SW / 2} 0`;
    let remate = `M${CX0} ${n1(CTOP + 1)}`;
    for (let c = 0; c < K; c++) remate += `c${n1(SW * 0.15)} -3.4 ${n1(SW * 0.85)} -3.4 ${SW} 0`;
    const ovillo = `<g class="cl-ovillo" transform="translate(${bx} ${by})${fijo ? ' scale(.68)' : ''}"><g class="cl-ovillo-giro"><circle r="15"/>` +
      `<path d="${elipseD(0, 0, 15, 6)}" transform="rotate(30)"/><path d="${elipseD(0, 0, 15, 9)}" transform="rotate(-35)"/><path d="${elipseD(0, 0, 14, 4)}" transform="rotate(80)"/></g></g>`;
    const estilo = o.estilo ? `<style>
      .cl-iz{fill:#F4ECDA}.cl-de{fill:#E2D4B6}.cl-fila path{stroke:rgba(84,62,34,.5);stroke-width:.7}
      .es-raya .cl-iz{fill:#1F5A3A}.es-raya .cl-de{fill:#0E4427}.es-raya path{stroke:rgba(0,20,8,.55)}
      .cl-montaje,.cl-remate{fill:none;stroke:rgba(84,62,34,.6);stroke-width:1.1;stroke-linecap:round}
      .cl-cola-b{fill:none;stroke:rgba(84,62,34,.7);stroke-width:3.2;stroke-linecap:round}.cl-cola{fill:none;stroke:#EFE5CD;stroke-width:1.9;stroke-linecap:round}
      .cl-ovillo circle{fill:#EFE5CD;stroke:rgba(84,62,34,.6)}.cl-ovillo path{fill:none;stroke:rgba(84,62,34,.45)}
    </style>` : '';
    const cola = `M${CX0 + 2} ${n1(CTOP + 2)}C${CX0 - 8} ${n1(CTOP - 2)} ${CX0 - 16} ${n1(CTOP + 8)} ${CX0 - 11} ${n1(CTOP + 20)}`;
    return `<svg class="cl-svg" viewBox="0 0 ${vbW} ${n1(vbH)}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${estilo}` +
      (defs ? `<defs>${defs}</defs>` : '') +
      `<path class="cl-montaje" d="${montaje}"/>${filas}` +
      `<path class="cl-remate" pathLength="1" d="${remate}"/>` +
      `<path class="cl-cola-b" d="${cola}"/><path class="cl-cola" d="${cola}"/>` + ovillo +
      (fijo ? ''
            : `<path class="cl-hebra-b" d=""/><path class="cl-hebra" d=""/>` +
              `<g class="cl-aguja"><path class="cl-aguja-palo" d="${palo(CX0 - 16, 0, CX0 + CW + 18, 0, 1.3, 2.4)}"/><circle class="cl-aguja-bola" cx="${CX0 - 20}" cy="0" r="3.4"/></g>`) +
      `</svg>`;
  }

  /* ================= FOTOS (del respaldo por nombre, de fotos.json o de op.fotos) ================= */
  const pedirJson = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  function buscarFoto(respaldo, nombre) {
    const re = new RegExp('(^|/)' + nombre + '-\\d+\\.');
    for (const im of respaldo.querySelectorAll('img')) {
      const src = (im.getAttribute('src') || '') + ' ' + (im.getAttribute('srcset') || '');
      if (im.getAttribute('data-foto') === nombre || re.test(src)) return im;
    }
    return null;
  }
  function ponerFoto(hueco, nombre, alt, sizes, op, respaldo) {
    const im0 = buscarFoto(respaldo, nombre);
    const listo = (nodo) => { hueco.textContent = ''; hueco.appendChild(nodo); };
    const deRespaldo = () => {
      const im = buscarFoto(respaldo, nombre);
      if (!im || !(im.getAttribute('src') || im.getAttribute('srcset'))) return false;
      const pic = im.closest('picture') || im;
      const cl = pic.cloneNode(true);
      const img = cl.tagName === 'IMG' ? cl : cl.querySelector('img');
      img.alt = alt; img.setAttribute('sizes', sizes); img.loading = 'lazy'; img.decoding = 'async';
      img.removeAttribute('class'); img.removeAttribute('style'); img.removeAttribute('hidden');
      cl.querySelectorAll && cl.querySelectorAll('source').forEach((s) => s.setAttribute('sizes', sizes));
      listo(cl);
      return true;
    };
    if (op.fotos && op.fotos[nombre]) {
      const img = DOC.createElement('img');
      img.src = op.fotos[nombre]; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
      listo(img); return;
    }
    if (deRespaldo()) return;
    // la web aún no ha puesto la foto en el respaldo: de fotos.json, y si no, esperar a que la ponga
    pedirJson(op.fotosJson || BASE + 'img/fotos/fotos.json').then((lista) => {
      const info = Array.isArray(lista) ? lista.find((f) => f.nombre === nombre) : null;
      if (!info) throw new Error('sin ' + nombre);
      const dir = op.dirFotos || BASE + 'img/fotos/';
      const set = (ext) => info.anchos.map((a) => `${dir}${nombre}-${a}.${ext} ${a}w`).join(', ');
      const pic = DOC.createElement('picture');
      ['avif', 'webp'].forEach((ext) => { const s = DOC.createElement('source'); s.type = 'image/' + ext; s.srcset = set(ext); s.sizes = sizes; pic.appendChild(s); });
      const img = DOC.createElement('img');
      img.src = `${dir}${nombre}-${info.anchos[Math.min(1, info.anchos.length - 1)]}.jpg`;
      img.srcset = set('jpg'); img.sizes = sizes; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
      if (info.ancho && info.alto) { img.width = info.ancho; img.height = info.alto; }
      pic.appendChild(img);
      listo(pic);
    }).catch(() => {
      if (!im0 || deRespaldo()) return;
      const mo = new MutationObserver(() => { if (deRespaldo()) mo.disconnect(); });
      mo.observe(im0, { attributes: true, attributeFilter: ['src', 'srcset'] });
      setTimeout(() => mo.disconnect(), 20000);
    });
  }

  /* ================= LA PLANTILLA DE LA SECCIÓN ================= */
  function plantilla(D) {
    const wa = `https://wa.me/${TEL_WA}?text=${encodeURIComponent('Hola, Ena. Me gustaría saber más de la Xuntanza de Filandeiras.')}`;
    const pasos = PASOS.map((p, i) => `
      <li class="hl-paso" data-paso="${p.id}">
        <div class="hl-dib" aria-hidden="true">
          <svg class="hl-dib-fondo" viewBox="0 0 240 240" focusable="false">${D[p.id].fondo}</svg>
          <svg class="hl-dib-frente" viewBox="0 0 240 240" focusable="false">${D[p.id].frente}</svg>
        </div>
        <div class="hl-texto">
          <p class="hl-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
          <h4 class="hl-nombre">${p.nombre}</h4>
          <p>${p.texto}</p>
        </div>
      </li>`).join('');
    return `
      <div class="hl-intro">
        <div class="hl-intro-texto">
          <p class="hl-lead">Vecinos y turistas, alrededor de la lana.</p>
          <p>En 2023, Ena organizó la primera Xuntanza de Filandeiras, y desde entonces vuelve cada año. Nació para mantener viva la tradición y para que las personas mayores de la zona tengan un espacio donde reunirse, recordar y compartir lo que saben.</p>
          <blockquote class="hl-cita"><p>«Son las propias personas que conocen estas técnicas quienes las muestran y explican.»</p></blockquote>
          <p>Es una jornada para aprender el proceso completo de la lana, de la oveja a la calceta.</p>
        </div>
        <div class="hl-fotos">
          <figure class="hl-foto hl-foto--filandeira"><div class="hl-foto-marco" data-hueco="filandeira"></div><figcaption>Hilando con la roca y el fuso.</figcaption></figure>
          <figure class="hl-foto hl-foto--xuntanza" data-permiso="pendiente"><div class="hl-foto-marco" data-hueco="xuntanza"></div><figcaption>La segunda Xuntanza.</figcaption></figure>
        </div>
      </div>
      <div class="hl-cabeza">
        <h3 class="hl-titulo">Los seis pasos de la lana</h3>
        <p class="hl-pista" aria-hidden="true"><span class="hl-pista-raton">El hilo se deja pellizcar: tira de él.</span><span class="hl-pista-dedo">Toca el hilo y tira hacia un lado.</span></p>
      </div>
      <ol class="hl-pasos">${pasos}</ol>
      <div class="hl-cierre">
        <p class="hl-frase">Porque viajar también puede ser escuchar.</p>
        <p class="hl-pregunta">¿Te gustaría saber más sobre este proceso? ¡No dudes en escribirnos!</p>
        <p class="hl-acciones"><a class="hl-boton" href="${wa}" rel="noopener" target="_blank">Escribir a Ena</a> <a class="hl-correo" href="mailto:${CORREO}?subject=${encodeURIComponent('Xuntanza de Filandeiras')}">${CORREO}</a></p>
      </div>`;
  }

  /* ================= EL ASPECTO DEL HILO SEGÚN EL PASO =================
     estado 0 vellón sucio · 1 lavado · 2 escarpullado · 3 cardado · 4 torcido (hebra gruesa, torcida) · 5 filado (hilo fino) */
  const ESTADOS = [
    { w: 10, c: [186, 172, 144], b: [80, 63, 38, 0.62], pelo: 1, pl: 9, osc: 1, halo: 0.75, peine: 0, giro: 0, plie: 0 },
    { w: 9.5, c: [241, 233, 214], b: [122, 100, 68, 0.55], pelo: 0.9, pl: 8, osc: 0, halo: 0.75, peine: 0, giro: 0, plie: 0 },
    { w: 14, c: [248, 243, 230], b: [128, 106, 74, 0.42], pelo: 1, pl: 13, osc: 0, halo: 1, peine: 0, giro: 0, plie: 0 },
    { w: 7.5, c: [249, 245, 235], b: [122, 100, 68, 0.5], pelo: 0.4, pl: 6, osc: 0, halo: 0.45, peine: 1, giro: 0, plie: 0 },
    { w: 4.6, c: [240, 232, 212], b: [92, 70, 42, 0.72], pelo: 0.3, pl: 3.5, osc: 0, halo: 0.15, peine: 0, giro: 0, plie: 1 },
    { w: 2.4, c: [238, 229, 208], b: [88, 66, 38, 0.8], pelo: 0.15, pl: 2.5, osc: 0, halo: 0, peine: 0, giro: 1, plie: 0 },
  ];
  const NQ = 8;                                     // escalones por estado (el cambio se cuantiza)
  const TABLA = [];
  for (let q = 0; q <= 5 * NQ; q++) {
    const s = q / NQ, i = Math.min(4, Math.floor(s)), f = s - i;
    const a = ESTADOS[i], b = ESTADOS[i + 1];
    const m = (k) => lerp(a[k], b[k], f);
    const col = [0, 1, 2].map((j) => Math.round(lerp(a.c[j], b.c[j], f)));
    const bor = [0, 1, 2].map((j) => Math.round(lerp(a.b[j], b.b[j], f)));
    const ba = lerp(a.b[3], b.b[3], f);
    TABLA.push({
      w: m('w'), core: `rgb(${col})`, borde: `rgba(${bor},${ba.toFixed(2)})`,
      halo: m('halo'), haloC: `rgba(${col},${(0.34 * m('halo')).toFixed(2)})`,
      pelo: m('pelo'), pl: m('pl'), osc: m('osc'), peine: m('peine'), giro: m('giro'), plie: m('plie'),
    });
  }
  const PELOS = 6;                                   // pelos por nodo (el vellón)

  /* ================= LA SECCIÓN ================= */
  const INST = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function seccion(el, op) {
    op = op || {};
    if (!el || el.dataset.montado === '1') return { destruir() {} };
    const reducido = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vivo = op.movimiento !== false && op.densidad !== 'sobria' && !reducido;
    // el respaldo se oculta (hidden y display:none por si su CSS pone display) y vuelve con destruir()
    const respaldo = Array.from(el.children).map((n) => ({ n, h: n.hidden, d: n.style.display }));
    const raiz = DOC.createElement('div');
    raiz.className = 'hl';
    raiz.dataset.modo = vivo ? 'vivo' : 'quieto';
    raiz.innerHTML = plantilla(dibujos());
    const sz = '(max-width: 759px) 46vw, 300px';
    ponerFoto(raiz.querySelector('[data-hueco="filandeira"]'), 'filandeira', 'Manos de una filandeira hilando: la lana atada en la roca y el hilo que baja hacia el fuso', sz, op, el);
    ponerFoto(raiz.querySelector('[data-hueco="xuntanza"]'), 'xuntanza', 'Mujeres de la zona reunidas con lana en la segunda Xuntanza de Filandeiras', '160px', op, el);
    el.appendChild(raiz);
    respaldo.forEach((r) => { r.n.hidden = true; r.n.style.display = 'none'; });
    el.dataset.montado = '1';
    let cuerda = null;
    try { cuerda = Cuerda(raiz, op, vivo); } catch (er) {
      console.warn('[hilo] el hilo no arranca; quedan los dibujos', er);
      raiz.dataset.modo = 'quieto';
      raiz.querySelectorAll('.hl-paso').forEach((li) => li.classList.add('es-llegado'));
    }
    const inst = {
      estado: () => (cuerda ? cuerda.estado() : null),
      destruir() {
        if (cuerda) cuerda.destruir();
        raiz.remove();
        respaldo.forEach((r) => { r.n.hidden = r.h; r.n.style.display = r.d; });
        delete el.dataset.montado;
        if (INST) INST.delete(el);
      },
    };
    if (INST) INST.set(el, inst);
    return inst;
  }

  /* ---------- curva por puntos (Catmull-Rom centrípeta), muestreada fina ---------- */
  function curva(wp, paso) {
    const X = [], Y = [], L = [], idx = [];
    const n = wp.length;
    const P = (i) => {
      if (i < 0) return { x: 2 * wp[0].x - wp[1].x, y: 2 * wp[0].y - wp[1].y };
      if (i >= n) return { x: 2 * wp[n - 1].x - wp[n - 2].x, y: 2 * wp[n - 1].y - wp[n - 2].y };
      return wp[i];
    };
    let l = 0;
    const push = (x, y) => {
      if (X.length) l += Math.hypot(x - X[X.length - 1], y - Y[Y.length - 1]);
      X.push(x); Y.push(y); L.push(l);
    };
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const t01 = Math.max(1e-3, Math.sqrt(Math.hypot(p1.x - p0.x, p1.y - p0.y)));
      const t12 = Math.max(1e-3, Math.sqrt(Math.hypot(p2.x - p1.x, p2.y - p1.y)));
      const t23 = Math.max(1e-3, Math.sqrt(Math.hypot(p3.x - p2.x, p3.y - p2.y)));
      const m1x = ((p1.x - p0.x) / t01 - (p2.x - p0.x) / (t01 + t12) + (p2.x - p1.x) / t12) * t12;
      const m1y = ((p1.y - p0.y) / t01 - (p2.y - p0.y) / (t01 + t12) + (p2.y - p1.y) / t12) * t12;
      const m2x = ((p2.x - p1.x) / t12 - (p3.x - p1.x) / (t12 + t23) + (p3.x - p2.x) / t23) * t12;
      const m2y = ((p2.y - p1.y) / t12 - (p3.y - p1.y) / (t12 + t23) + (p3.y - p2.y) / t23) * t12;
      const k = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / paso));
      idx[i] = X.length;
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        push(h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x, h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y);
      }
    }
    idx[n - 1] = X.length;
    push(wp[n - 1].x, wp[n - 1].y);
    return { X, Y, L, idx };
  }

  /* ---------- EL MOTOR: la cuerda de Verlet y su pintura ---------- */
  function Cuerda(raiz, op, vivo) {
    const ol = raiz.querySelector('.hl-pasos');
    const lis = Array.from(ol.querySelectorAll('.hl-paso'));
    const D = dibujos();
    const capaEl = DOC.getElementById('hilo-capa');
    const cv = DOC.createElement('canvas');
    cv.className = 'hl-cuerda';
    cv.setAttribute('aria-hidden', 'true');
    ol.appendChild(cv);
    const ctx = cv.getContext && cv.getContext('2d');
    const limpiar = [];
    const escuchar = (o, ev, fn, opc) => { o.addEventListener(ev, fn, opc); limpiar.push(() => o.removeEventListener(ev, fn, opc)); };
    if (!ctx) { raiz.dataset.modo = 'quieto'; lis.forEach((li) => li.classList.add('es-llegado')); return { estado: () => null, destruir() { cv.remove(); } }; }

    const M = { x0: 0, w: 0, h: 0, dpr: 1, ox: 0, oy: 0, cv, ctx };   // el lienzo de la sección (coords de la <ol>)
    let capa = null;                                                   // el del margen (coords de página)
    // los nodos
    let N = 0, X, Y, PX, PY, RX, RY, LL, SS, W8, SD, PIN, DR, SUB, QN, HA;
    let total = 0, J = 0, R = 0, Robj = 0, primera = true;
    let LT = [];                                   // longitud a la que el hilo llega a cada estación
    let esc = 1, movil = false, anchoVista = G.innerWidth;
    let dormida = true, raf = 0, ultimo = 0, acc = 0, quietos = 0, visible = false, enaVisible = false, vivoInst = true;
    let arrastre = null, pendBanda = false, idle = 0;
    let olPage = { x: 0, y: 0 };
    // muestras para pintar
    let MX, MY, MS, MTX, MTY, nm = 0;
    // medidas por fotograma
    const MSB = new Float32Array(600); let nMs = 0, iMs = 0, fotogramas = 0, pintadasEnteras = 0;
    const registrar = (ms) => { MSB[iMs] = ms; iMs = (iMs + 1) % 600; if (nMs < 600) nMs++; fotogramas++; };

    /* ---------- geometría: de los dibujos al recorrido del hilo ---------- */
    function construir() {
      const or = ol.getBoundingClientRect();
      if (or.width < 10 || !lis.length) return false;
      movil = G.innerWidth < 760;
      olPage = { x: or.left + G.scrollX, y: or.top + G.scrollY };
      const cajas = lis.map((li) => li.querySelector('.hl-dib').getBoundingClientRect());
      const dw = cajas[0].width;
      esc = dw / 240;
      const railC = cajas[0].left + dw / 2 - or.left;
      const margen = movil ? 54 : 96;
      M.x0 = Math.max(0, Math.floor(railC - dw / 2 - margen));
      M.w = Math.min(Math.ceil(or.width), Math.ceil(railC + dw / 2 + margen)) - M.x0;
      M.h = Math.ceil(or.height);
      M.dpr = Math.min(G.devicePixelRatio || 1, 1.5);
      if (M.h * M.dpr > 15000) M.dpr = 15000 / M.h;
      M.ox = -M.x0; M.oy = 0;
      cv.style.left = M.x0 + 'px'; cv.style.width = M.w + 'px'; cv.style.height = M.h + 'px';
      cv.width = Math.max(1, Math.round(M.w * M.dpr)); cv.height = Math.max(1, Math.round(M.h * M.dpr));

      // los puntos de cada estación, en coordenadas de la <ol>
      const wp = [];
      const trans = [];
      const ancho = Math.min(1, Math.max(0.55, esc * 1.25));      // en el móvil el hilo se estrecha algo menos que el dibujo
      const usarCapa = decidirCapa(or);
      lis.forEach((li, k) => {
        const id = li.dataset.paso, c = cajas[k];
        const bx = c.left - or.left, by = c.top - or.top;
        if (k > 0) {
          // entre estaciones: el hilo cuelga y se mece hacia un lado
          const a = wp[wp.length - 1];
          const p0 = D[id].pts.find((p) => p[2].indexOf('c') < 0);
          const yb = by + p0[1] * esc;
          const lado = k % 2 ? 1 : -1;
          wp.push({ x: railC + lado * (movil ? 16 : 42) * (0.6 + 0.4 * esc), y: (a.y + yb) / 2, f: '' });
        }
        D[id].pts.forEach(([x, y, fl]) => {
          if (fl.indexOf('c') >= 0 && !usarCapa) return;
          if (k === 0 && !usarCapa && wp.length === 0 && fl.indexOf('i') < 0) return;
          wp.push({ x: bx + x * esc, y: by + y * esc, f: fl, k });
        });
      });
      // con capa: el hilo entra por el borde en la sección de Ena y baja por el margen izquierdo
      if (usarCapa) {
        const h = wp[0];                 // el punto «c» del vellón (a su izquierda)
        const gx = usarCapa.gx - olPage.x;
        const ey = usarCapa.ey - olPage.y;
        const pre = [{ x: -olPage.x - 46, y: ey, f: 'p' }, { x: gx - 8, y: ey + 50, f: '' }];
        const bajada = h.y - 120 - (ey + 90);
        const tramos = Math.max(1, Math.round(bajada / 320));
        for (let i = 0; i <= tramos; i++) pre.push({ x: gx + (i % 2 ? 5 : -5), y: ey + 90 + bajada * (i / tramos), f: '' });
        pre.push({ x: gx + 18, y: h.y - 40, f: '' }, { x: (gx + h.x) / 2, y: h.y + 6, f: '' });
        wp.unshift(...pre);
      } else wp[0].f += 'p';
      // las transiciones de aspecto (a → b) de cada estación
      let tA = -1;
      // la curva fina y los nodos: clavados en los puntos «p», repartidos entre ellos
      const cu = curva(wp, 2);
      total = cu.L[cu.L.length - 1];
      const Lw = wp.map((_, i) => cu.L[cu.idx[i]]);
      wp.forEach((p, i) => {
        if (p.f.indexOf('a') >= 0) tA = Lw[i];
        if (p.f.indexOf('b') >= 0 && tA >= 0) { trans.push([tA, Lw[i], p.k, p.k + 1]); tA = -1; }
      });
      LT = lis.map((_, k) => { const i = wp.findIndex((p) => p.k === k && p.f.indexOf('p') >= 0); return i >= 0 ? Lw[i] : 0; });
      const pins = [];
      wp.forEach((p, i) => { if (p.f.indexOf('p') >= 0 || i === wp.length - 1) pins.push(Lw[i]); });
      const finMargen = usarCapa ? Lw[wp.findIndex((p) => p.f.indexOf('c') >= 0)] : -1;
      const esp = movil ? 13 : 20;
      const Ls = [], Lpin = [];
      for (let j = 0; j < pins.length - 1; j++) {
        const a = pins[j], b = pins[j + 1];
        const e = b <= finMargen ? 40 : esp;
        const n = Math.max(1, Math.round((b - a) / e));
        for (let i = 0; i < n; i++) { Ls.push(a + (b - a) * i / n); Lpin.push(i === 0); }
      }
      Ls.push(pins[pins.length - 1]); Lpin.push(true);
      N = Ls.length;
      X = new Float32Array(N); Y = new Float32Array(N); PX = new Float32Array(N); PY = new Float32Array(N);
      RX = new Float32Array(N); RY = new Float32Array(N); LL = new Float32Array(N); SS = new Float32Array(N);
      W8 = new Float32Array(N); SD = new Float32Array(N); PIN = new Uint8Array(N); DR = new Float32Array(N);
      SUB = new Uint8Array(N); QN = new Uint8Array(N); HA = new Float32Array(N * PELOS * 4);
      let j = 0;
      for (let i = 0; i < N; i++) {
        const l = Ls[i];
        while (j < cu.L.length - 2 && cu.L[j + 1] < l) j++;
        const f = cu.L[j + 1] > cu.L[j] ? clamp((l - cu.L[j]) / (cu.L[j + 1] - cu.L[j]), 0, 1) : 0;
        RX[i] = lerp(cu.X[j], cu.X[j + 1], f); RY[i] = lerp(cu.Y[j], cu.Y[j + 1], f);
        LL[i] = l; PIN[i] = Lpin[i] ? 1 : 0;
        let s = 0;
        for (const [a, b, de, a2] of trans) {
          if (l >= b) s = a2;
          else if (l > a) { s = de + (a2 - de) * suave((l - a) / (b - a)); break; }
          else break;
        }
        SS[i] = s;
        QN[i] = Math.round(s * NQ);
      }
      // el ancho: se guarda la escala para la pintura
      M.ancho = ancho;
      // vaivén: peso entre clavos y lado hacia el que se mece
      let pa = 0;
      for (let i = 1; i < N; i++) {
        if (!PIN[i]) continue;
        for (let k = pa + 1; k < i; k++) {
          const u = (LL[k] - LL[pa]) / (LL[i] - LL[pa]);
          W8[k] = Math.sin(Math.PI * u);
          const cx = (RX[i] - RX[pa]) * (RY[k] - RY[pa]) - (RY[i] - RY[pa]) * (RX[k] - RX[pa]);
          SD[k] = Math.abs(cx) > 30 ? Math.sign(cx) : (i % 2 ? 1 : -1);
        }
        pa = i;
      }
      for (let i = 0; i < N - 1; i++) {
        DR[i] = Math.hypot(RX[i + 1] - RX[i], RY[i + 1] - RY[i]);
        SUB[i] = clamp(Math.ceil(DR[i] / 5), 1, 10);
      }
      const rnd = azar(2023);
      for (let i = 0; i < N * PELOS; i++) {
        const o = i * 4;
        HA[o] = i % 2 ? 1 : -1;                 // lado
        HA[o + 1] = 0.2 + rnd() * 0.85;         // dónde nace (fracción del medio ancho)
        HA[o + 2] = (rnd() - 0.5) * 1.6;        // inclinación a lo largo del hilo
        HA[o + 3] = 0.5 + rnd() * 0.8;          // largo
      }
      for (let i = 0; i < N; i++) { X[i] = PX[i] = RX[i]; Y[i] = PY[i] = RY[i]; }
      let cap = 4;
      for (let i = 0; i < N - 1; i++) cap += SUB[i];
      MX = new Float32Array(cap); MY = new Float32Array(cap); MS = new Float32Array(cap); MTX = new Float32Array(cap); MTY = new Float32Array(cap);
      // el reparto entre lienzos: la capa pinta del 0 al J, la sección del J-1 al final
      J = 0;
      if (usarCapa) {
        while (J < N - 1 && !(RX[J] >= M.x0 + 4 && RY[J] >= -20)) J++;
        montarCapa(usarCapa);
      } else quitarCapa();
      raiz.dataset.capa = capa ? '1' : '0';
      // lo revelado: lo que ya ha pasado por arriba de la pantalla está; lo demás baja
      if (!vivo) R = Robj = total;
      else if (primera) { R = Robj = longitudHasta(-or.top); Robj = Math.max(Robj, objetivo(or)); }
      else { R = Math.min(R, total); Robj = Math.max(Robj, objetivo(or)); }
      primera = false;
      dormida = true;
      llegadas();
      pintarTodo();
      return true;
    }
    function longitudHasta(yv) {        // la longitud del hilo cuyo tramo inicial queda por encima de yv
      let j = 0;
      while (j < N && RY[j] <= yv) j++;
      if (j >= N) return total;
      if (j === 0) return 0;
      const f = clamp((yv - RY[j - 1]) / ((RY[j] - RY[j - 1]) || 1), 0, 1);
      return LL[j - 1] + (LL[j] - LL[j - 1]) * f;
    }
    const objetivo = (or) => longitudHasta(G.innerHeight * 0.86 - or.top);

    /* ---------- el margen izquierdo (capa) ---------- */
    function decidirCapa(or) {
      if (op.capa === false || !capaEl || G.innerWidth < 1024) return null;
      const lana = raiz.closest('section') || raiz;
      const ena = DOC.querySelector(op.ena || '#ena');
      // el margen libre: lo que queda a la izquierda del contenido de Ena y de la cabecera de la lana
      let min = Infinity;
      const mirar = (s) => s && s.querySelectorAll('h1,h2,h3,h4,h5,p,li,figure,img,picture,video,blockquote,a,button,table,form,dl,iframe,canvas,svg').forEach((e) => {
        if (ol.contains(e) || capaEl.contains(e)) return;
        const r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.left < min) min = r.left;
      });
      mirar(ena); mirar(lana);
      // con 40 px de margen (el de la web a 1280) ya cabe: el vellón mide unos 28 px con sus pelos
      if (!isFinite(min) || min < 38) return null;
      const gx = Math.max(18, min * (min < 80 ? 0.5 : 0.42)) + G.scrollX;
      const eTop = ena ? ena.getBoundingClientRect().top + G.scrollY : or.top + G.scrollY - 400;
      const eH = ena ? ena.offsetHeight : 400;
      const ey = eTop + Math.min(240, eH * 0.22);
      if (or.top + G.scrollY - ey < 260) return null;
      return { gx, ey, ena };
    }
    function montarCapa(info) {
      if (!capa) {
        const c = DOC.createElement('canvas');
        c.className = 'hl-capa-lienzo';
        c.setAttribute('aria-hidden', 'true');
        capaEl.appendChild(c);
        capa = { cv: c, ctx: c.getContext('2d'), info };
        if (!capa.ctx) { c.remove(); capa = null; return; }
      }
      capa.info = info;
      colocarCapa();
    }
    function colocarCapa() {
      if (!capa) return;
      let y0 = Infinity, y1 = -Infinity, x1 = 0;
      for (let i = 0; i <= J; i++) { if (RY[i] < y0) y0 = RY[i]; if (RY[i] > y1) y1 = RY[i]; if (RX[i] > x1) x1 = RX[i]; }
      const cr = capaEl.getBoundingClientRect();
      const oX = cr.left + G.scrollX, oY = cr.top + G.scrollY;
      const xPag = 0, yPag = Math.floor(olPage.y + y0 - 90);
      const w = Math.ceil(Math.max(olPage.x + M.x0 + 26, capa.info.gx + 220));
      const h = Math.ceil(olPage.y + y1 + 90 - yPag);
      capa.x = xPag; capa.y = yPag; capa.w = w; capa.h = h;
      capa.dpr = Math.min(G.devicePixelRatio || 1, 1.5);
      if (h * capa.dpr > 15000) capa.dpr = 15000 / h;
      const s = capa.cv.style;
      s.left = (xPag - oX) + 'px'; s.top = (yPag - oY) + 'px'; s.width = w + 'px'; s.height = h + 'px';
      capa.cv.width = Math.max(1, Math.round(w * capa.dpr)); capa.cv.height = Math.max(1, Math.round(h * capa.dpr));
      capa.ox = olPage.x - xPag; capa.oy = olPage.y - yPag;
    }
    function quitarCapa() { if (capa) { capa.cv.remove(); capa = null; } }

    /* ---------- la física ---------- */
    const AMORT = 0.955, MUELLE = 0.036, GRAV = 0, ITER = 6;   // sin gravedad: la forma de reposo ya cuelga (con ella nunca se dormía)
    function paso() {
      const g = arrastre ? arrastre.i : -1;
      for (let i = 0; i < N; i++) {
        if (PIN[i] || i === g) continue;
        const vx = (X[i] - PX[i]) * AMORT, vy = (Y[i] - PY[i]) * AMORT;
        PX[i] = X[i]; PY[i] = Y[i];
        X[i] += vx + (RX[i] - X[i]) * MUELLE;
        Y[i] += vy + (RY[i] - Y[i]) * MUELLE + GRAV;
      }
      if (g >= 0) {
        PX[g] = X[g]; PY[g] = Y[g];
        X[g] = lerp(X[g], arrastre.tx, 0.55); Y[g] = lerp(Y[g], arrastre.ty, 0.55);
      }
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < N - 1; i++) {
          const a = i, b = i + 1;
          const wa = PIN[a] || a === g ? 0 : 1, wb = PIN[b] || b === g ? 0 : 1;
          if (!(wa + wb)) continue;
          const dx = X[b] - X[a], dy = Y[b] - Y[a];
          const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
          const k = (d - DR[i]) / d / (wa + wb);
          X[a] += dx * k * wa; Y[a] += dy * k * wa;
          X[b] -= dx * k * wb; Y[b] -= dy * k * wb;
        }
      }
    }
    function comprobarSueno() {
      if (arrastre) { quietos = 0; return; }
      let mv = 0, dv = 0;
      for (let i = 0; i < N; i++) {
        const m = Math.abs(X[i] - PX[i]) + Math.abs(Y[i] - PY[i]);
        const d = Math.abs(X[i] - RX[i]) + Math.abs(Y[i] - RY[i]);
        if (m > mv) mv = m; if (d > dv) dv = d;
      }
      if (mv < 0.03 && dv < 0.35) {
        if (++quietos > 8) {
          for (let i = 0; i < N; i++) { X[i] = PX[i] = RX[i]; Y[i] = PY[i] = RY[i]; }
          dormida = true;
        }
      } else quietos = 0;
    }
    const despertar = () => { if (!raf && vivoInst && (visible || enaVisible || arrastre)) raf = G.requestAnimationFrame(bucle); };
    function bucle(ahora) {
      raf = 0;
      if (!vivoInst) return;
      const t0 = performance.now();
      let dt = ultimo ? (ahora - ultimo) / 1000 : 1 / 60;
      ultimo = ahora;
      if (dt > 0.05) dt = 0.05;
      if (R < Robj) { R = Math.min(Robj, R + Math.max(700, (Robj - R) * 3.2) * dt); llegadas(); }
      if (!dormida) {
        acc += dt;
        let n = 0;
        while (acc >= 1 / 60 && n < 3) { paso(); acc -= 1 / 60; n++; }
        if (n === 3) acc = 0;
        comprobarSueno();
      }
      pintarBanda();
      registrar(performance.now() - t0);
      if (arrastre || !dormida || R < Robj) raf = G.requestAnimationFrame(bucle);
      else { ultimo = 0; acc = 0; programarEntera(); }
    }
    // al dormirse, una pintura entera fuera del fotograma (lo que se movió fuera de la banda queda limpio)
    function programarEntera() {
      if (idle) return;
      const f = () => { idle = 0; if (vivoInst && dormida && !arrastre) pintarTodo(); };
      idle = G.requestIdleCallback ? G.requestIdleCallback(f, { timeout: 400 }) : G.setTimeout(f, 120);
    }

    /* ---------- la pintura ---------- */
    function muestras(a, b) {
      nm = 0;
      for (let i = a; i < b && i < N - 1; i++) {
        if (LL[i] > R) break;
        const i0 = i > 0 ? i - 1 : i, i3 = i + 2 < N ? i + 2 : i + 1;
        let fin = 1;
        if (LL[i + 1] > R) fin = (R - LL[i]) / ((LL[i + 1] - LL[i]) || 1);
        const sub = SUB[i];
        const pasos = fin >= 1 ? sub : Math.max(1, Math.ceil(sub * fin));
        const x0 = X[i0], x1 = X[i], x2 = X[i + 1], x3 = X[i3];
        const y0 = Y[i0], y1 = Y[i], y2 = Y[i + 1], y3 = Y[i3];
        for (let k = 0; k < pasos; k++) {
          const t = k / sub;
          if (t > fin) break;
          const t2 = t * t, t3 = t2 * t;
          MX[nm] = 0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3);
          MY[nm] = 0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3);
          MS[nm] = QN[i] === QN[i + 1] ? QN[i] : Math.round(lerp(SS[i], SS[i + 1], t) * NQ);
          nm++;
        }
        if (fin < 1) {
          MX[nm] = lerp(X[i], X[i + 1], fin); MY[nm] = lerp(Y[i], Y[i + 1], fin); MS[nm] = QN[i]; nm++;
          return true;                        // acaba en la punta (revelado parcial)
        }
      }
      const u = Math.min(b, N - 1);
      if (LL[u] <= R) { MX[nm] = X[u]; MY[nm] = Y[u]; MS[nm] = QN[u]; nm++; }
      return false;
    }
    function tangentes() {
      for (let k = 0; k < nm; k++) {
        const a = k > 0 ? k - 1 : k, b = k < nm - 1 ? k + 1 : k;
        let tx = MX[b] - MX[a], ty = MY[b] - MY[a];
        const l = Math.hypot(tx, ty) || 1;
        MTX[k] = tx / l; MTY[k] = ty / l;
      }
    }
    function camino(c, k0, k1, dx, dy) {
      c.beginPath(); c.moveTo(MX[k0] + dx, MY[k0] + dy);
      for (let k = k0 + 1; k <= k1; k++) c.lineTo(MX[k] + dx, MY[k] + dy);
    }
    function caminoN(c, k0, k1, off) {     // desplazado a lo largo de la normal
      c.beginPath(); c.moveTo(MX[k0] - MTY[k0] * off, MY[k0] + MTX[k0] * off);
      for (let k = k0 + 1; k <= k1; k++) c.lineTo(MX[k] - MTY[k] * off, MY[k] + MTX[k] * off);
    }
    function rayas(c, k0, k1, paso, hn, ht, desfase) {   // marcas cruzadas cada «paso» px
      c.beginPath();
      let acc2 = paso * desfase;
      for (let k = k0; k < k1; k++) {
        const sx = MX[k + 1] - MX[k], sy = MY[k + 1] - MY[k], sl = Math.hypot(sx, sy);
        while (acc2 <= sl) {
          const u = sl ? acc2 / sl : 0, x = MX[k] + sx * u, y = MY[k] + sy * u, tx = MTX[k], ty = MTY[k];
          c.moveTo(x - ty * hn - tx * ht, y + tx * hn - ty * ht);
          c.lineTo(x + ty * hn + tx * ht, y - tx * hn + ty * ht);
          acc2 += paso;
        }
        acc2 -= sl;
      }
    }
    function pintar(L, a, b, banda) {
      const c = L.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      let recorte = false;
      if (banda) {
        const y0 = clamp(Math.floor((banda[0] + L.oy) * L.dpr), 0, L.cv.height), y1 = clamp(Math.ceil((banda[1] + L.oy) * L.dpr), 0, L.cv.height);
        if (y1 <= y0) return;
        c.clearRect(0, y0, L.cv.width, y1 - y0);
        c.save(); recorte = true;
        c.beginPath(); c.rect(0, y0, L.cv.width, y1 - y0); c.clip();
      } else c.clearRect(0, 0, L.cv.width, L.cv.height);
      c.setTransform(L.dpr, 0, 0, L.dpr, L.ox * L.dpr, L.oy * L.dpr);
      if (banda) {     // solo los nodos que caen en la banda
        let ia = -1, ib = -1;
        for (let i = a; i <= b; i++) if (Y[i] >= banda[0] - 60 && Y[i] <= banda[1] + 60) { if (ia < 0) ia = i; ib = i; }
        if (ia < 0) { if (recorte) c.restore(); return; }
        a = Math.max(a, ia - 2); b = Math.min(b, ib + 2);
      }
      dibujarHilo(c, a, b);
      if (recorte) c.restore();
    }
    function dibujarHilo(c, a, b) {
      const punta = muestras(a, b);
      if (nm < 2) return;
      tangentes();
      const k = M.ancho;
      c.lineCap = 'round'; c.lineJoin = 'round';
      // tramos de aspecto igual
      let k0 = 0;
      while (k0 < nm - 1) {
        const q = MS[k0];
        let k1 = k0 + 1;
        while (k1 < nm - 1 && MS[k1] === q) k1++;
        const e = TABLA[q], w = e.w * k;
        // sombra
        camino(c, k0, k1, 1.3, 2.4); c.lineWidth = w + 1.4; c.strokeStyle = 'rgba(43,32,16,.14)'; c.stroke();
        if (e.halo > 0.02) { camino(c, k0, k1, 0, 0); c.lineWidth = w * 1.6; c.strokeStyle = e.haloC; c.stroke(); }
        else camino(c, k0, k1, 0, 0);
        c.lineWidth = w + 1.7; c.strokeStyle = e.borde; c.stroke();
        c.lineWidth = w; c.strokeStyle = e.core; c.stroke();
        if (w > 2.2) { caminoN(c, k0, k1, w * 0.22); c.lineWidth = Math.max(0.6, w * 0.26); c.strokeStyle = 'rgba(255,253,246,.5)'; c.stroke(); }
        if (e.peine > 0.05) {
          c.lineWidth = 0.6; c.strokeStyle = `rgba(122,100,68,${(0.42 * e.peine).toFixed(2)})`;
          caminoN(c, k0, k1, -w * 0.22); c.stroke(); caminoN(c, k0, k1, w * 0.06); c.stroke();
        }
        if (e.giro > 0.05) {
          rayas(c, k0, k1, 2.7, w * 0.55, w * 0.6, 0.5);
          c.lineWidth = 0.75; c.strokeStyle = `rgba(96,74,44,${(0.6 * e.giro).toFixed(2)})`; c.stroke();
        }
        if (e.plie > 0.05) {
          rayas(c, k0, k1, 3.4, w * 0.56, 1.5, 0.5);
          c.lineWidth = 1; c.strokeStyle = `rgba(86,64,36,${(0.62 * e.plie).toFixed(2)})`; c.stroke();
          rayas(c, k0, k1, 3.4, w * 0.3, 1.1, 0);
          c.lineWidth = 1.2; c.strokeStyle = `rgba(255,251,238,${(0.6 * e.plie).toFixed(2)})`; c.stroke();
        }
        k0 = k1;
      }
      // los pelos del vellón, por nodo
      pelos(c, a, b, k, true);
      pelos(c, a, b, k, false);
      // la punta, deshilachada
      if (punta) {
        const x = MX[nm - 1], y = MY[nm - 1], tx = MTX[nm - 1], ty = MTY[nm - 1];
        const e = TABLA[MS[nm - 1]], w = Math.max(2, e.w * k);
        c.beginPath();
        for (let j = -3; j <= 3; j++) {
          const ang = j * 0.22, ca = Math.cos(ang), sa = Math.sin(ang);
          const dx = tx * ca - ty * sa, dy = tx * sa + ty * ca;
          c.moveTo(x - ty * j * w * 0.12, y + tx * j * w * 0.12);
          c.quadraticCurveTo(x + dx * w * 0.6, y + dy * w * 0.6, x + dx * (w * 1.1 + 3), y + dy * (w * 1.1 + 3) + Math.abs(j) * 0.4);
        }
        c.lineWidth = 0.8; c.strokeStyle = 'rgba(110,90,60,.6)'; c.stroke();
      }
    }
    function pelos(c, a, b, k, oscuros) {
      let cubo = -1, abierto = false;
      const cerrar = () => { if (abierto) c.stroke(); abierto = false; };
      for (let i = a; i <= b; i++) {
        if (LL[i] > R) break;
        const e = TABLA[QN[i]];
        if (e.pelo < 0.05) { cerrar(); cubo = -1; continue; }
        const cb = Math.round(e.pelo * 4) * 10 + (e.osc > 0.5 ? 1 : 0);
        if (cb !== cubo) {
          cerrar(); cubo = cb;
          const al = (Math.round(e.pelo * 4) / 4) * (oscuros ? 0.55 : 0.8);
          c.strokeStyle = oscuros ? (e.osc > 0.5 ? `rgba(92,76,50,${al})` : `rgba(140,118,84,${al * 0.8})`) : `rgba(255,253,244,${al})`;
          c.lineWidth = oscuros ? 0.75 : 0.9;
          c.beginPath(); abierto = true;
        }
        const ia = i > 0 ? i - 1 : i, ib = i < N - 1 ? i + 1 : i;
        let tx = X[ib] - X[ia], ty = Y[ib] - Y[ia];
        const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const nx = -ty, ny = tx, w = e.w * k, pl = e.pl * k;
        for (let h = oscuros ? 0 : 1; h < PELOS; h += 2) {
          const o = (i * PELOS + h) * 4;
          const lado = HA[o] * (oscuros ? 1 : -1), off = HA[o + 1] * w * 0.5, inc = HA[o + 2], lg = HA[o + 3] * pl;
          const bx = X[i] + nx * lado * off, by = Y[i] + ny * lado * off;
          const dx = nx * lado * 0.8 + tx * inc, dy = ny * lado * 0.8 + ty * inc;
          const dl = Math.hypot(dx, dy) || 1;
          const ex = bx + dx / dl * lg, ey = by + dy / dl * lg;
          c.moveTo(bx, by);
          c.quadraticCurveTo(bx + dx / dl * lg * 0.5 + tx * lg * 0.35 * inc, by + dy / dl * lg * 0.5 + ty * lg * 0.35 * inc, ex, ey);
        }
      }
      cerrar();
    }
    function banda() {
      const or = ol.getBoundingClientRect();
      return [-or.top - 40, -or.top + G.innerHeight + 40];
    }
    function pintarBanda() {
      const bd = banda();
      if (visible) pintar(M, Math.max(0, J - 1), N - 1, bd);
      if (capa && (enaVisible || visible)) pintar(capa, 0, J, bd);
    }
    function pintarTodo() {
      if (!N) return;
      pintadasEnteras++;
      pintar(M, Math.max(0, J - 1), N - 1, null);
      if (capa) pintar(capa, 0, J, null);
    }

    /* ---------- las estaciones se dibujan cuando el hilo llega ---------- */
    function llegadas() {
      lis.forEach((li, k) => { if (!li.classList.contains('es-llegado') && R >= LT[k] - 40 * esc) li.classList.add('es-llegado'); });
    }

    /* ---------- el scroll: revela el hilo y lo mece un poco ---------- */
    let ultimoY = G.scrollY, pendScroll = false;
    function alScroll() {
      if (pendScroll) return;
      pendScroll = true;
      G.requestAnimationFrame(() => {
        pendScroll = false;
        if (!vivoInst || !N) return;
        const dy = G.scrollY - ultimoY;
        ultimoY = G.scrollY;
        Robj = Math.max(Robj, objetivo(ol.getBoundingClientRect()));
        if (vivo && (visible || enaVisible) && dy && !arrastre) {
          const a = clamp(dy * 0.045, -2.4, 2.4);
          for (let i = 0; i < N; i++) {
            if (PIN[i] || LL[i] > R) continue;
            PY[i] -= a * W8[i];
            PX[i] -= a * 0.55 * W8[i] * SD[i];
          }
          dormida = false; quietos = 0;
        }
        if (R < Robj || !dormida) despertar();
      });
    }

    /* ---------- pellizcar y tirar ---------- */
    function aLocal(cx, cy) { const or = ol.getBoundingClientRect(); return [cx - or.left, cy - or.top]; }
    function cercano(x, y, radio) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < N; i++) {
        if (LL[i] > R) break;
        const r = radio + TABLA[QN[i]].w * M.ancho * 0.5;
        const dx = X[i] - x, dy = Y[i] - y, d2 = dx * dx + dy * dy;
        if (d2 < r * r && d2 < bd) { bd = d2; best = i; }
      }
      // un clavo no se agarra: el vecino libre más cercano
      if (best >= 0 && PIN[best]) {
        const a = best > 0 && !PIN[best - 1] ? best - 1 : -1, b = best < N - 1 && !PIN[best + 1] ? best + 1 : -1;
        if (a < 0 && b < 0) return -1;
        if (a < 0) return b; if (b < 0) return a;
        return Math.hypot(X[a] - x, Y[a] - y) < Math.hypot(X[b] - x, Y[b] - y) ? a : b;
      }
      return best;
    }
    function soltar() {
      if (!arrastre) return;
      const i = arrastre.i;
      // la velocidad con la que se suelta, con tope
      const vx = clamp(X[i] - PX[i], -22, 22), vy = clamp(Y[i] - PY[i], -22, 22);
      PX[i] = X[i] - vx; PY[i] = Y[i] - vy;
      arrastre = null;
      raiz.classList.remove('es-arrastrando');
      cv.classList.remove('es-agarrado');
      if (capa) capa.cv.classList.remove('es-agarrado');
      dormida = false; quietos = 0;
      despertar();
    }
    function alBajar(e) {
      if (!vivo || !N || (e.button !== undefined && e.button > 0) || arrastre) return;
      const toque = e.pointerType !== 'mouse';
      if (toque && !ol.contains(e.target)) return;
      const [x, y] = aLocal(e.clientX, e.clientY);
      const i = cercano(x, y, toque ? 26 : 12);
      if (i < 0) return;
      arrastre = { id: e.pointerId, i, tx: x, ty: y, toque, x0: RX[i], y0: RY[i] };
      try { e.target.setPointerCapture(e.pointerId); } catch (er) { /* sin captura también vale */ }
      if (!toque) e.preventDefault();          // que no seleccione texto (en táctil, NADA: el scroll manda)
      raiz.classList.add('es-arrastrando');
      cv.classList.add('es-agarrado');
      if (capa) capa.cv.classList.add('es-agarrado');
      dormida = false; quietos = 0;
      despertar();
    }
    let hover = null, pendHover = false, ultimoP = null;
    function alMover(e) {
      if (arrastre && e.pointerId === arrastre.id) {
        const [x, y] = aLocal(e.clientX, e.clientY);
        const lim = movil ? 110 : 170;
        // se estira como lana: cuanto más lejos, más cuesta; y pasado el tope, se escapa
        const dx = x - arrastre.x0, dy = y - arrastre.y0, d = Math.hypot(dx, dy);
        if (d > lim * 1.15) { soltar(); return; }
        const f = d > 0 ? lim * (1 - Math.exp(-d / lim)) / d : 1;
        arrastre.tx = arrastre.x0 + dx * f; arrastre.ty = arrastre.y0 + dy * f;
        despertar();
        return;
      }
      if (e.pointerType !== 'mouse' || !vivo || !N) return;
      hover = e;
      if (pendHover) return;
      pendHover = true;
      G.requestAnimationFrame(rozar);
    }
    function rozar() {
      pendHover = false;
      const e = hover;
      if (!e || arrastre) return;
      const [x, y] = aLocal(e.clientX, e.clientY);
      const i = cercano(x, y, 12);
      const cerca = i >= 0;
      cv.classList.toggle('es-agarrable', cerca && i >= J - 1);
      if (capa) capa.cv.classList.toggle('es-agarrable', cerca && i <= J);
      // el ratón que pasa rozando empuja un poco el hilo
      if (ultimoP) {
        const vel = Math.min(1, Math.hypot(x - ultimoP[0], y - ultimoP[1]) / 10);
        if (vel > 0.05) {
          const RAD = 26;
          let toco = false;
          for (let k = 0; k < N; k++) {
            if (LL[k] > R) break;
            if (PIN[k]) continue;
            const dx = X[k] - x, dy = Y[k] - y;
            if (Math.abs(dx) > RAD || Math.abs(dy) > RAD) continue;
            const d = Math.hypot(dx, dy);
            if (d < RAD && d > 0.01) { const f = (RAD - d) / d * 0.22 * vel; X[k] += dx * f; Y[k] += dy * f; toco = true; }
          }
          if (toco) { dormida = false; quietos = 0; despertar(); }
        }
      }
      ultimoP = [x, y];
    }
    function alSubir(e) { if (arrastre && e.pointerId === arrastre.id) soltar(); }

    /* ---------- montaje, visibilidad y cambios de tamaño ---------- */
    let pendRe = 0;
    const reconstruir = () => {
      if (pendRe) return;
      pendRe = G.requestAnimationFrame(() => {
        pendRe = 0;
        if (!vivoInst) return;
        if (raf) { G.cancelAnimationFrame(raf); raf = 0; }
        arrastre = null; ultimo = 0;
        construir();
        previoCuerpo = posCuerpo();
      });
    };
    let medida = null, previoCuerpo = null;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      const r = ol.getBoundingClientRect();
      const m = [Math.round(r.width), Math.round(r.height)];
      if (medida && medida[0] === m[0] && Math.abs(medida[1] - m[1]) < 1) return;
      medida = m;
      reconstruir();
    }) : null;
    if (ro) { ro.observe(ol); limpiar.push(() => ro.disconnect()); }
    // la capa vive en coordenadas de página: si lo de arriba cambia de alto, se recoloca (o se rehace)
    let roCuerpo = null;
    if (capaEl && typeof ResizeObserver !== 'undefined') {
      roCuerpo = new ResizeObserver(() => G.requestAnimationFrame(() => {
        if (!vivoInst || !capa) return;
        const or = ol.getBoundingClientRect(), ena = capa.info.ena;
        const ahora = posCuerpo();
        const previo = previoCuerpo;
        if (previo && ahora[0] === previo[0] && ahora[1] === previo[1] && ahora[2] === previo[2]) return;
        const soloMovido = previo && ahora[0] === previo[0] && (ahora[1] - ahora[2]) === (previo[1] - previo[2]);
        previoCuerpo = ahora;
        if (soloMovido) { olPage = { x: ahora[0], y: ahora[1] }; colocarCapa(); pintarTodo(); }
        else reconstruir();
      }));
      roCuerpo.observe(DOC.body);
      limpiar.push(() => roCuerpo.disconnect());
    }
    // el resize de la barra del móvil (solo cambia el alto) no rehace nada
    escuchar(G, 'resize', () => { if (G.innerWidth === anchoVista) return; anchoVista = G.innerWidth; reconstruir(); });
    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.target === ol) visible = e.isIntersecting;
          else enaVisible = e.isIntersecting;
        });
        if (visible || enaVisible) { Robj = Math.max(Robj, objetivo(ol.getBoundingClientRect())); despertar(); }
        else if (raf) {   // fuera de pantalla: quieto, en su sitio
          G.cancelAnimationFrame(raf); raf = 0; ultimo = 0; arrastre = null;
          for (let i = 0; i < N; i++) { X[i] = PX[i] = RX[i]; Y[i] = PY[i] = RY[i]; }
          dormida = true; R = Robj; llegadas(); pintarTodo();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(ol);
      const ena = DOC.querySelector(op.ena || '#ena');
      if (ena && capaEl) io.observe(ena);
      limpiar.push(() => io.disconnect());
    } else visible = true;
    escuchar(DOC, 'visibilitychange', () => { if (DOC.hidden && raf) { G.cancelAnimationFrame(raf); raf = 0; ultimo = 0; } else if (!DOC.hidden) despertar(); });
    if (vivo) {
      escuchar(G, 'scroll', alScroll, { passive: true });
      escuchar(DOC, 'pointerdown', alBajar, { passive: false });
      escuchar(DOC, 'pointermove', alMover, { passive: true });
      escuchar(DOC, 'pointerup', alSubir, { passive: true });
      escuchar(DOC, 'pointercancel', alSubir, { passive: true });
      escuchar(DOC, 'lostpointercapture', alSubir, { passive: true });
    }
    function posCuerpo() {
      const or = ol.getBoundingClientRect(), ena = capa && capa.info.ena;
      return [Math.round(or.left + G.scrollX), Math.round(or.top + G.scrollY), ena ? Math.round(ena.getBoundingClientRect().top + G.scrollY) : 0];
    }
    construir();
    { const r = ol.getBoundingClientRect(); medida = [Math.round(r.width), Math.round(r.height)]; previoCuerpo = posCuerpo(); }
    if (!vivo) lis.forEach((li) => li.classList.add('es-llegado'));

    return {
      estado() {
        const or = ol.getBoundingClientRect();
        const n = [], r = [], libres = [];
        for (let i = 0; i < N; i++) {
          n.push([X[i] + or.left, Y[i] + or.top]); r.push([RX[i] + or.left, RY[i] + or.top]);
          if (!PIN[i] && W8[i] > 0.7) libres.push(i);
        }
        const ord = Array.from(MSB.subarray(0, nMs)).sort((p, q) => p - q);
        const media = nMs ? ord.reduce((s, v) => s + v, 0) / nMs : 0;
        return {
          n: N, total, revelado: R, objetivo: Robj, dormida, arrastrando: !!arrastre, capa: !!capa, J, visible,
          nodos: n, reposo: r, libres, estados: Array.from(SS), fotogramas, pintadasEnteras,
          ms: { media, p95: nMs ? ord[Math.min(nMs - 1, Math.floor(nMs * 0.95))] : 0, max: nMs ? ord[nMs - 1] : 0, n: nMs },
        };
      },
      reiniciarMedidas() { nMs = 0; iMs = 0; },
      destruir() {
        vivoInst = false;
        if (raf) G.cancelAnimationFrame(raf);
        if (pendRe) G.cancelAnimationFrame(pendRe);
        if (idle) (G.cancelIdleCallback || G.clearTimeout)(idle);
        limpiar.forEach((f) => { try { f(); } catch (er) { /* nada */ } });
        quitarCapa();
        cv.remove();
      },
    };
  }

  /* ================= LA CALCETA DEL PIE ================= */
  function calceta(el, op) {
    op = op || {};
    if (!el || el.dataset.montado === '1') return { destruir() {} };
    const reducido = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quieto = op.movimiento === false || op.densidad === 'sobria' || reducido;
    const respaldo = Array.from(el.children).map((n) => ({ n, h: n.hidden, d: n.style.display }));
    const logo = el.querySelector('img[data-logo], img[data-calceta-logo]');
    const id = 'cl' + Math.floor(Math.random() * 1e6).toString(36);
    const raiz = DOC.createElement('div');
    raiz.className = 'cl';
    if (logo) { const l = logo.cloneNode(true); l.classList.add('cl-logo'); raiz.appendChild(l); }
    const hueco = DOC.createElement('div');
    hueco.className = 'cl-tira';
    raiz.appendChild(hueco);
    el.appendChild(raiz);
    respaldo.forEach((r) => { r.n.hidden = true; r.n.style.display = 'none'; });
    el.dataset.montado = '1';
    let g, svg, rects, aguja, hebra, giro, ovillo, anchos;
    let meta = 0, visto = -1, raf = 0, previo = 0, visible = false, vivoInst = true, anchoHecho = G.innerWidth;

    // la tira, a la medida del hueco: un punto ≈ 13 px (entre 24 y 90 puntos)
    function tejerSVG() {
      const w = hueco.getBoundingClientRect().width || el.getBoundingClientRect().width || 600;
      const K = clamp(Math.round((w - 40) / 13), 24, 90);
      if (g && g.K === K) return;
      g = geoCalceta(K, CR);
      hueco.innerHTML = calcetaSVG({ id, terminada: false, K, R: CR });
      svg = hueco.querySelector('svg');
      rects = Array.from(svg.querySelectorAll('clipPath rect'));
      aguja = svg.querySelector('.cl-aguja');
      hebra = [svg.querySelector('.cl-hebra-b'), svg.querySelector('.cl-hebra')];
      giro = svg.querySelector('.cl-ovillo-giro');
      ovillo = svg.querySelector('.cl-ovillo');
      anchos = new Float32Array(CR).fill(-1);
      el.dataset.puntos = String(K);
      if (visto >= 0) pintar(visto);
    }
    function pintar(v) {
      const { CW, CYB, bx, by, R } = g;
      const filasF = v * R;
      for (let r = 0; r < R; r++) {
        const f = clamp(filasF - r, 0, 1);
        if (Math.abs(anchos[r] - f) < 0.002) continue;
        anchos[r] = f;
        const w = (CW + 4) * f;
        rects[r].setAttribute('width', n1(w));
        rects[r].setAttribute('x', n1(r % 2 ? CX0 - 2 + (CW + 4) - w : CX0 - 2));
      }
      const hechas = Math.min(R, Math.floor(filasF + 1e-6));
      const terminada = v >= 0.9995;
      el.dataset.filas = String(hechas);
      el.dataset.progreso = String(Math.round(v * 1000) / 10);
      raiz.classList.toggle('es-terminada', terminada);
      el.dataset.terminada = terminada ? '1' : '0';
      if (terminada) { ovillo.setAttribute('transform', `translate(${bx} ${by}) scale(.68)`); return; }
      // la aguja sobre la fila que se teje y la hebra del punto al ovillo
      const r = Math.min(R - 1, Math.floor(filasF));
      const f = clamp(filasF - r, 0, 1);
      const yTop = CYB - r * RH - 1.36 * RH - 0.6;
      // en las filas de vuelta la aguja se da la vuelta (la bola al otro lado)
      const cxA = CX0 + CW / 2;
      aguja.setAttribute('transform', `translate(0 ${n1(yTop)})` + (r % 2 ? ` translate(${cxA} 0) scale(-1 1) translate(${-cxA} 0)` : ''));
      const xk = r % 2 ? CX0 + CW * (1 - f) : CX0 + CW * f;
      const d = `M${n1(xk)} ${n1(yTop + 1)}C${n1(xk + 14)} ${n1(yTop + 26)} ${n1(bx - 30)} ${n1(by + 30)} ${n1(bx - 10)} ${n1(by + 8)}`;
      hebra[0].setAttribute('d', d); hebra[1].setAttribute('d', d);
      ovillo.setAttribute('transform', `translate(${bx} ${by}) scale(${Math.round((1 - v * 0.32) * 100) / 100})`);
      giro.setAttribute('transform', `rotate(${Math.round(v * 1440)})`);
    }
    function progreso() {
      if (quieto) return 1;
      const sale = DOC.querySelector(op.desde || '#lana');
      const raizDoc = DOC.documentElement;
      const fin = Math.max(raizDoc.scrollHeight, DOC.body ? DOC.body.scrollHeight : 0) - G.innerHeight;
      const ini = sale ? Math.max(0, sale.getBoundingClientRect().bottom + G.scrollY - G.innerHeight) : fin * 0.6;
      if (fin <= ini + 1) return G.scrollY >= fin - 2 ? 1 : 0;
      const p = clamp((G.scrollY - ini) / (fin - ini), 0, 1);
      // en el último 1,5 % ya rematada (la barra del móvil deja a veces unos píxeles sin bajar)
      return p >= 0.985 ? 1 : p / 0.985;
    }
    function bucle(ahora) {
      raf = 0;
      if (!vivoInst) return;
      const dt = previo ? Math.min(100, ahora - previo) : 16;
      previo = ahora;
      const v = visto + (meta - visto) * (1 - Math.exp(-dt / 220));
      visto = Math.abs(meta - v) < 0.0008 ? meta : v;
      pintar(visto);
      if (visto !== meta) raf = G.requestAnimationFrame(bucle); else previo = 0;
    }
    function actualizar() {
      const p = progreso();
      if (p > meta) meta = p;                         // lo tejido, tejido se queda
      if (visto < 0 || !visible || quieto) { visto = meta; pintar(visto); return; }
      if (meta !== visto && !raf) raf = G.requestAnimationFrame(bucle);
    }
    let pend = false;
    const alScroll = () => { if (pend) return; pend = true; G.requestAnimationFrame(() => { pend = false; if (vivoInst) actualizar(); }); };
    // el resize de la barra del móvil (solo cambia el alto) no rehace nada
    const alResize = () => { if (G.innerWidth === anchoHecho) return; anchoHecho = G.innerWidth; tejerSVG(); };
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; actualizar(); }) : null;
    tejerSVG();
    if (io) io.observe(el); else visible = true;
    if (!quieto) G.addEventListener('scroll', alScroll, { passive: true });
    G.addEventListener('resize', alResize);
    actualizar();
    const inst = {
      estado: () => ({ filas: +el.dataset.filas, total: g.R, puntos: g.K, progreso: visto, terminada: el.dataset.terminada === '1' }),
      destruir() {
        vivoInst = false;
        if (raf) G.cancelAnimationFrame(raf);
        if (io) io.disconnect();
        G.removeEventListener('scroll', alScroll);
        G.removeEventListener('resize', alResize);
        raiz.remove();
        respaldo.forEach((r) => { r.n.hidden = r.h; r.n.style.display = r.d; });
        ['montado', 'filas', 'progreso', 'terminada', 'puntos'].forEach((k) => { delete el.dataset[k]; });
        if (INST) INST.delete(el);
      },
    };
    if (INST) INST.set(el, inst);
    return inst;
  }

  /* ================= EXPORTAR ================= */
  function montar(el, op) {
    const m = el && el.dataset ? el.dataset.modulo : '';
    return m === 'calceta' ? calceta(el, op) : seccion(el, op);
  }
  A.hilo = {
    montar, seccion, calceta, calcetaSVG, PASOS,
    estado(el) {
      const e = el || (DOC && DOC.querySelector('[data-modulo="hilo"]'));
      const i = e && INST && INST.get(e);
      return i ? i.estado() : null;
    },
  };
  A.calceta = { montar: calceta };
})();
