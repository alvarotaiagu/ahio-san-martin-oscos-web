/* ------------------------------------------------------------------
   Ahío San Martín · la niebla viva de la portada            (agente Entrada)
   Motor WebGL1 de pantalla completa sobre la foto (la foto sigue siendo
   un <img> del DOM: el lienzo es transparente y solo pinta la niebla, así
   que no estorba al LCP). Lo usa js/linterna.js:
     Ahio.niebla.crear(canvas, op) → motor | null
       op = { img, caja, foto, movimiento, densidad, abrir, alListo, alPerder }
       motor = { densidad(d), levanta(p), puntero(x, y, activo), abrir(a), luz(v),
                 pausa(b), encajar(), destruir(), estado }
     Ahio.niebla.encaje(img, caja)  → cómo cae la foto (object-fit) en la caja
     Ahio.niebla.comprobar()        → compila los sombreadores en un lienzo de 4×4
                                      sin pintar nada (para las pruebas)
   La niebla: fbm de 5 octavas con deformación, deriva lenta; más densa abajo
   y lejos (máscara de la silueta de la casa en la foto), menos sobre la casa.
   La luz de la linterna es una fuente con dispersión (núcleo, halo y bruma
   proporcional a la niebla) y enciende el cristal de la linterna de la foto.
   El gesto pinta en un búfer de «despeje» de baja resolución (ping-pong a
   30 Hz) que se vuelve a cerrar solo en unos 4 s. El scroll del hero baja la
   densidad hasta 0. DPR ≤ 1,5 y búfer de niebla a ½; pausa fuera de pantalla
   y con la pestaña oculta; calidad automática si el aparato no llega.
   failIfMajorPerformanceCaveat: con WebGL por software (sin tarjeta) no se
   crea y la portada usa el respaldo CSS.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const A = (window.Ahio = window.Ahio || {});
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const suave = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const enOut3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ================= sombreadores ================= */
  const VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
  const CABEZA = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 vUv;',
  ].join('\n') + '\n';

  // el búfer de despeje: se difunde un poco, se cierra solo y el puntero lo abre (una cápsula por segmento)
  const FRAG_DESPEJE = CABEZA + `
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uDt;
uniform vec4 uSeg;
uniform float uRadio;
uniform float uFuerza;
uniform float uAspecto;
void main() {
  float v = texture2D(uPrev, vUv).r;
  float vec = texture2D(uPrev, vUv + vec2(uTexel.x, 0.)).r + texture2D(uPrev, vUv - vec2(uTexel.x, 0.)).r
            + texture2D(uPrev, vUv + vec2(0., uTexel.y)).r + texture2D(uPrev, vUv - vec2(0., uTexel.y)).r;
  v = mix(v, vec * .25, .3);
  v = max(0., v - uDt * (.15 + .3 * v));
  vec2 q = vec2(vUv.x * uAspecto, vUv.y);
  vec2 pa = q - uSeg.xy, ba = uSeg.zw - uSeg.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.);
  float d = length(pa - ba * h);
  v = max(v, (1. - smoothstep(uRadio * .3, uRadio, d)) * uFuerza);
  gl_FragColor = vec4(v, v, v, 1.);
}`;

  const FRAG_NIEBLA = CABEZA + `
uniform float uT;
uniform float uDens;
uniform float uLevanta;
uniform vec3 uAbre;
uniform float uLuz;
uniform vec2 uLuzPos;
uniform vec4 uImg;
uniform float uAspecto;
uniform float uOct;
uniform float uHayFoto;
uniform sampler2D uMascara;
uniform sampler2D uDespeje;

float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    if (float(i) >= uOct) break;
    v += a * ruido(p);
    p = m * p + vec2(3.1, 1.7);
    a *= .5;
  }
  return v;
}
void main() {
  vec2 s = vec2(vUv.x, 1. - vUv.y);
  vec2 q = vec2(s.x * uAspecto, s.y) * vec2(1.5, 2.7);
  float t = uT;
  float w = fbm(q * .7 + vec2(t * .011, t * .004));
  float n = fbm(q + vec2(t * .017, -uLevanta * .8) + w * 1.1);
  float n2 = fbm(q * 2.3 - vec2(t * .031, 0.) + 5.2 + w * .8);
  float banco = smoothstep(.28, .78, n * .82 + n2 * .3);

  vec2 iu = s * uImg.xy + uImg.zw;
  vec4 m = texture2D(uMascara, clamp(iu, 0., 1.));
  float lejos = mix(.55, m.r, uHayFoto);
  float ventana = m.g * uHayFoto;
  float abajo = smoothstep(.5, 1., s.y);
  float d = uDens * (.26 + .62 * lejos + .5 * abajo);
  d *= mix(.42, 1.32, banco);
  float c = texture2D(uDespeje, vUv).r;
  d *= 1. - .93 * smoothstep(0., .75, c);
  float lev = smoothstep(0., 1., uLevanta);
  d *= 1. - lev;
  float a = clamp(d, 0., .86);

  vec2 ca = vec2((s.x - uAbre.x) * uAspecto, s.y - uAbre.y);
  float espeso = smoothstep(uAbre.z - .34, uAbre.z, length(ca) + (n - .5) * .5);
  a = mix(a, .96, espeso);

  vec3 col = mix(vec3(.80, .845, .86), vec3(.945, .952, .948), clamp(n2 * 1.25 - .12, 0., 1.));
  col = mix(col, vec3(.40, .46, .51), espeso * .75);

  vec2 dl = vec2((s.x - uLuzPos.x) * uAspecto, s.y - uLuzPos.y);
  float r2 = dot(dl, dl);
  float nucleo = exp(-r2 * 900.);
  float halo = exp(-r2 * 26.);
  float bruma = exp(-sqrt(r2) * 3.1);
  vec3 ambar = vec3(.95, .72, .30);
  vec3 luz = ambar * uLuz * (nucleo * .5 + halo * .2 + bruma * a * .62 + ventana * .7) * (1. - lev * .75);
  gl_FragColor = vec4(min(col * a + luz, vec3(1.)), a);
}`;

  /* ================= utilidades GL ================= */
  function sombreador(gl, tipo, fuente) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fuente);
    gl.compileShader(s);
    return s;
  }
  function programa(gl, frag) {
    const p = gl.createProgram();
    const v = sombreador(gl, gl.VERTEX_SHADER, VERT), f = sombreador(gl, gl.FRAGMENT_SHADER, frag);
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    return { p, v, f };
  }
  function errores(gl, pr) {
    if (gl.getProgramParameter(pr.p, gl.LINK_STATUS)) return null;
    return [gl.getShaderInfoLog(pr.v), gl.getShaderInfoLog(pr.f), gl.getProgramInfoLog(pr.p)].filter(Boolean).join('\n') || 'no enlaza';
  }
  function uniformes(gl, p, nombres) {
    const u = {};
    nombres.forEach((n) => { u[n] = gl.getUniformLocation(p, n); });
    return u;
  }
  function textura(gl, w, h, datos) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (datos && datos.nodeName) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, datos);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, datos || null);
    return t;
  }

  /* ================= cómo cae la foto en la caja (object-fit / object-position) ================= */
  function encaje(img, caja) {
    const rc = caja.getBoundingClientRect();
    const ri = img ? img.getBoundingClientRect() : rc;
    const nw = (img && img.naturalWidth) || (img && +img.getAttribute('width')) || 4;
    const nh = (img && img.naturalHeight) || (img && +img.getAttribute('height')) || 3;
    const cs = img ? getComputedStyle(img) : null;
    const fit = cs ? cs.objectFit : 'fill';
    let sx, sy;
    if (fit === 'cover') sx = sy = Math.max(ri.width / nw, ri.height / nh);
    else if (fit === 'contain' || fit === 'scale-down') sx = sy = Math.min(ri.width / nw, ri.height / nh);
    else if (fit === 'none') sx = sy = 1;
    else { sx = ri.width / nw; sy = ri.height / nh; }
    const rw = nw * sx || 1, rh = nh * sy || 1;
    const pos = ((cs && cs.objectPosition) || '50% 50%').split(/\s+/);
    const lugar = (v, libre) => {
      if (!v || v === 'center') return libre / 2;
      if (v === 'left' || v === 'top') return 0;
      if (v === 'right' || v === 'bottom') return libre;
      if (v.endsWith('%')) return libre * parseFloat(v) / 100;
      return parseFloat(v) || 0;
    };
    const ix = ri.left + lugar(pos[0], ri.width - rw), iy = ri.top + lugar(pos[1] || pos[0], ri.height - rh);
    const W = rc.width || 1, H = rc.height || 1;
    return {
      // pantalla (uv de la caja, y hacia abajo) → foto (uv): uv_foto = s * (a, b) + (c, d)
      a: W / rw, b: H / rh, c: (rc.left - ix) / rw, d: (rc.top - iy) / rh,
      // foto (uv) → caja (uv)
      enCaja: (u, v) => [(ix + u * rw - rc.left) / W, (iy + v * rh - rc.top) / H],
      ancho: W, alto: H,
    };
  }

  /* ================= la máscara de la foto: R = lejos (fuera de la casa), G = cristales de la linterna ================= */
  function mascara(foto) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 192;
    const x = c.getContext('2d');
    x.fillStyle = '#f00';
    x.fillRect(0, 0, 256, 192);
    if (!foto) return c;
    const sx = 256 / foto.ancho, sy = 192 / foto.alto, fuera = 2000;
    const poli = (pts, dx) => { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px * sx + dx, py * sy) : x.moveTo(px * sx + dx, py * sy))); x.closePath(); x.fill(); };
    // la sombra desenfocada hace de difuminado (funciona en todos los navegadores, sin ctx.filter)
    x.save();
    x.shadowColor = '#000'; x.shadowBlur = 9; x.shadowOffsetX = fuera; x.fillStyle = '#000';
    poli(foto.silueta, -fuera);
    x.restore();
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.shadowColor = '#0f0'; x.shadowBlur = 1.5; x.shadowOffsetX = fuera; x.fillStyle = '#0f0';
    foto.ventanas.forEach((v) => poli(v, -fuera));
    x.restore();
    return c;
  }

  /* ================= el motor ================= */
  function crear(canvas, op) {
    op = op || {};
    const atr = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true };
    let gl = null;
    try { gl = canvas.getContext('webgl', atr) || canvas.getContext('experimental-webgl', atr); } catch (e) { gl = null; }
    if (!gl) return null;

    const paralelo = gl.getExtension('KHR_parallel_shader_compile');
    const prN = programa(gl, FRAG_NIEBLA), prD = programa(gl, FRAG_DESPEJE);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const texMascara = textura(gl, 0, 0, mascara(op.foto));

    let uN = null, uD = null, listo = false, perdido = false, destruido = false;
    // búfer de despeje (ping-pong)
    let bw = 0, bh = 0, desp = [], lado = 0;
    function prepararDespeje(w, h) {
      const nw = clamp(Math.round(w / 8), 48, 160), nh = clamp(Math.round(nw * h / Math.max(1, w)), 32, 200);
      if (nw === bw && nh === bh) return;
      desp.forEach((d) => { gl.deleteTexture(d.t); gl.deleteFramebuffer(d.f); });
      bw = nw; bh = nh;
      desp = [0, 1].map(() => {
        const t = textura(gl, bw, bh, new Uint8Array(bw * bh * 4));
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { t, f };
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // estado
    const est = {
      listo: false, calidad: 1, oct: 5, ancho: 0, alto: 0, cuadros: 0,
      densidad: clamp(op.densidad == null ? 0.5 : op.densidad, 0, 1), dens: 0, levanta: 0, luz: 0, luzObj: 0,
    };
    est.dens = est.densidad;
    let movimiento = op.movimiento !== false;
    let aspecto = 1, map = { a: 1, b: 1, c: 0, d: 0 }, luzPos = [0.5, 0.25], hayFoto = op.foto ? 1 : 0;
    let abre = op.abrir || null;          // { x, y (px de pantalla) | null, inicio, dur }
    let pausado = false, raf = 0, tiempo = 0, ultimo = 0, acum = 0;
    let punto = null, previo = null, nuevo = false;
    const tiempos = [];

    function encajar() {
      if (perdido || destruido) return;
      const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
      const esc = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5 * est.calidad;
      let w = Math.max(2, Math.round(cw * esc)), h = Math.max(2, Math.round(ch * esc));
      const tope = 1100000;                               // como mucho ~1,1 Mpx de niebla
      if (w * h > tope) { const k = Math.sqrt(tope / (w * h)); w = Math.round(w * k); h = Math.round(h * k); }
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      est.ancho = w; est.alto = h;
      aspecto = cw / ch;
      prepararDespeje(cw, ch);
      if (op.img || op.caja) {
        const e = encaje(op.img, op.caja || canvas);
        map = e;
        if (op.foto) luzPos = e.enCaja(op.foto.linterna[0] / op.foto.ancho, op.foto.linterna[1] / op.foto.alto);
      }
      pedir();
    }

    function pasoDespeje(dt) {
      gl.useProgram(prD.p);
      gl.viewport(0, 0, bw, bh);
      const de = desp[lado], a = desp[1 - lado];
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);          // nada atado que sea a la vez destino (bucle de realimentación)
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.f);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, de.t);
      gl.uniform1i(uD.uPrev, 0);
      gl.uniform2f(uD.uTexel, 1 / bw, 1 / bh);
      gl.uniform1f(uD.uDt, dt);
      gl.uniform1f(uD.uAspecto, aspecto);
      gl.uniform1f(uD.uRadio, 0.11);
      if (punto && nuevo) {
        const p0 = previo || punto;
        gl.uniform4f(uD.uSeg, p0[0], p0[1], punto[0], punto[1]);
        gl.uniform1f(uD.uFuerza, 1);
        previo = punto; nuevo = false;
      } else gl.uniform1f(uD.uFuerza, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      lado = 1 - lado;
    }

    function dibujar(ahora) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, est.ancho, est.alto);
      gl.useProgram(prN.p);
      // apertura: el eco de la cortina (o la propia, si no la hubo) desde la luz de la linterna
      let ax = luzPos[0], ay = luzPos[1], ar = 99;
      if (abre) {
        const r = canvas.getBoundingClientRect();
        if (abre.x != null) { ax = (abre.x - r.left) / (r.width || 1); ay = (abre.y - r.top) / (r.height || 1); }
        const b = clamp((ahora - abre.inicio) / abre.dur, 0, 1);
        const lejos = Math.hypot(Math.max(ax, 1 - ax) * aspecto, Math.max(ay, 1 - ay)) + 0.5;
        ar = b >= 1 ? 99 : enOut3(b) * lejos;
        if (b >= 1) abre = null;
      }
      gl.uniform1f(uN.uT, tiempo);
      gl.uniform1f(uN.uDens, est.dens);
      gl.uniform1f(uN.uLevanta, est.levanta);
      gl.uniform3f(uN.uAbre, ax, ay, ar);
      const respira = movimiento ? 1 + Math.sin(tiempo * 1.3) * 0.025 + Math.sin(tiempo * 3.7) * 0.01 : 1;
      gl.uniform1f(uN.uLuz, est.luz * respira);
      gl.uniform2f(uN.uLuzPos, luzPos[0], luzPos[1]);
      gl.uniform4f(uN.uImg, map.a, map.b, map.c, map.d);
      gl.uniform1f(uN.uAspecto, aspecto);
      gl.uniform1f(uN.uOct, est.oct);
      gl.uniform1f(uN.uHayFoto, hayFoto);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texMascara);
      gl.uniform1i(uN.uMascara, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, desp[lado].t);
      gl.uniform1i(uN.uDespeje, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      est.cuadros++;
    }

    function cuadro(ahora) {
      raf = 0;
      if (pausado || perdido || destruido || !listo) return;
      const dt = ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 1 / 60;
      ultimo = ahora;
      if (movimiento) tiempo += dt;
      // densidad y luz se acercan a su objetivo sin saltos
      const k = movimiento ? 1 - Math.exp(-dt * 1.6) : 1;
      est.dens += (est.densidad - est.dens) * k;
      est.luz += (est.luzObj - est.luz) * (movimiento ? 1 - Math.exp(-dt * 2.2) : 1);
      // el despeje a 30 Hz fijos (el cierre en 8 bits necesita pasos de al menos 1/255)
      if (movimiento) {
        acum += dt;
        let n = 0;
        while (acum >= 1 / 30 && n < 3) { pasoDespeje(1 / 30); acum -= 1 / 30; n++; }
        if (n === 3) acum = 0;
      }
      dibujar(ahora);
      // calidad automática: de los cuadros 30 a 90, si va lento se baja la resolución y las octavas
      if (movimiento && !abre) {
        if (est.cuadros > 30 && tiempos.length < 60) tiempos.push(dt);
        if (tiempos.length === 60) {
          const media = tiempos.reduce((a, b) => a + b, 0) / 60 * 1000;
          est.media = Math.round(media * 10) / 10;
          if (media > 24 && est.calidad > 0.5) {
            est.calidad = est.calidad > 0.8 ? 0.7 : 0.5;
            est.oct = est.calidad > 0.6 ? 4 : 3;
            tiempos.length = 0;
            encajar();
          } else tiempos.push(0);                   // (61: ya medido)
        }
      }
      const quieto = !movimiento && !abre && Math.abs(est.dens - est.densidad) < 0.002 && Math.abs(est.luz - est.luzObj) < 0.002;
      if (!quieto) raf = requestAnimationFrame(cuadro);
    }
    function pedir() { if (!raf && listo && !pausado && !perdido && !destruido) raf = requestAnimationFrame(cuadro); }

    function preparar() {
      if (destruido || perdido) return;
      if (paralelo && (!gl.getProgramParameter(prN.p, paralelo.COMPLETION_STATUS_KHR) || !gl.getProgramParameter(prD.p, paralelo.COMPLETION_STATUS_KHR))) {
        requestAnimationFrame(preparar);
        return;
      }
      const er = errores(gl, prN) || errores(gl, prD);
      if (er) { console.warn('Niebla: los sombreadores no compilan\n' + er); perdido = true; if (op.alPerder) op.alPerder('sombreador'); return; }
      uN = uniformes(gl, prN.p, ['uT', 'uDens', 'uLevanta', 'uAbre', 'uLuz', 'uLuzPos', 'uImg', 'uAspecto', 'uOct', 'uHayFoto', 'uMascara', 'uDespeje']);
      uD = uniformes(gl, prD.p, ['uPrev', 'uTexel', 'uDt', 'uSeg', 'uRadio', 'uFuerza', 'uAspecto']);
      gl.enableVertexAttribArray(0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
      listo = est.listo = true;
      ultimo = 0;
      encajar();                                    // (encajar pide el primer cuadro)
      requestAnimationFrame(() => { if (op.alListo && !perdido) op.alListo(); });
    }

    const alPerder = (e) => { e.preventDefault(); perdido = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (op.alPerder) op.alPerder('contexto'); };
    canvas.addEventListener('webglcontextlost', alPerder);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => encajar()) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', encajar);
    const alCargar = () => encajar();
    if (op.img && !op.img.complete) op.img.addEventListener('load', alCargar);

    // compilar fuera del fotograma en el que se monta (la cortina está empezando a abrirse)
    requestAnimationFrame(preparar);

    return {
      estado: est,
      densidad(d) { est.densidad = clamp(+d || 0, 0, 1); pedir(); },
      levanta(p) { const v = clamp(+p || 0, 0, 1); if (Math.abs(v - est.levanta) > 1e-4) { est.levanta = v; pedir(); } },
      puntero(x, y, activo) {
        if (!activo) { punto = null; previo = null; return; }
        const r = canvas.getBoundingClientRect();
        if (!r.width) return;
        const q = [((x - r.left) / r.width) * aspecto, 1 - (y - r.top) / r.height];
        if (!punto) previo = q;
        punto = q; nuevo = true;
        pedir();
      },
      abrir(a) { abre = a || null; pedir(); },
      luz(v) { est.luzObj = clamp(+v || 0, 0, 1.2); if (!movimiento) est.luz = est.luzObj; pedir(); },
      movimiento(v) { movimiento = !!v; pedir(); },
      pausa(b) { pausado = !!b; if (pausado && raf) { cancelAnimationFrame(raf); raf = 0; } if (!pausado) { ultimo = 0; pedir(); } },
      encajar,
      destruir() {
        destruido = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        canvas.removeEventListener('webglcontextlost', alPerder);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', encajar);
        if (op.img) op.img.removeEventListener('load', alCargar);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      },
    };
  }

  // solo compila (no pinta): para comprobar en las pruebas que los sombreadores son válidos
  function comprobar() {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return { ok: null, error: 'sin WebGL' };
    const er = [programa(gl, FRAG_NIEBLA), programa(gl, FRAG_DESPEJE)].map((p) => errores(gl, p)).filter(Boolean);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return { ok: er.length === 0, error: er.join('\n') };
  }

  A.niebla = { crear, encaje, comprobar, mascara };
})();
