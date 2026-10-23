// El hilo de oro en 3D: con el scroll, el río Ahío se enciende como un hilo de oro desde su fuente, río abajo, pegado
// al relieve («por su oro vinieron los romanos»), y la cámara lo sigue sin marear. El Ahío no pasa por el pueblo: al
// juntarse con el Agüeira, el hilo (más fino y más pálido) remonta el agua — Agüeira arriba y río San Martín arriba —
// hasta la casa, donde la linterna de la chincheta se enciende. Después, el explorador libre (OrbitControls; en táctil,
// tras «Mover el mapa») con los rótulos de los tres Oscos, la Seimeira, Mazonovo y Mon y sus distancias por carretera.
// No es el camino de grano de Tulla: aquí es agua (un cauce real del IGN), sin granos, con pepitas que brillan.
import { OrbitControls } from './vendor/OrbitControls.js';
import { fase, marcas, enCamino, clamp, suave, crearRotulos, listaRotulos, opRotulo } from './guion.js';

const $ = id => document.getElementById(id);
const TACTIL = matchMedia('(pointer: coarse)').matches;
const mezcla = (a, b, k) => a + (b - a) * k;
const mezclaAng = (a, b, k) => a + ((((b - a) % 360) + 540) % 360 - 180) * k;
const VIAJE = 1200;   // ms de la vuelta al hilo desde el explorador

function texturaBrillo(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.22, 'rgba(242,184,75,.6)'); g.addColorStop(1, 'rgba(242,184,75,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// la cinta del río: encendida hasta la «cabeza» (oro; el agua remontada, oro pálido y más fina), apagada después
// (un hilo de agua tenue para que se vea por dónde va). Pepitas: motas que brillan según el avance (sin reloj propio).
const cintaVert = `attribute float aS; attribute float aLado; attribute vec2 aNorm;
uniform float uAncho, uLimite, uCabeza; varying float vS, vLado;
#include <fog_pars_vertex>
void main(){ float w = (aS > uLimite ? uAncho * .62 : uAncho) * (aS > uCabeza ? .5 : 1.);   // el agua apagada, más fina
  vec3 p = position + vec3(aNorm.x, 0., aNorm.y) * aLado * w; p.y += w * .35;
  vS = aS; vLado = aLado;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const cintaFrag = `uniform vec3 uOro, uPalido, uAgua; uniform float uCabeza, uLimite, uOpacidad, uFase, uNoche, uAncho;
varying float vS, vLado;
#include <fog_pars_fragment>
float azar(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  float filo = 1. - smoothstep(.45, 1., abs(vLado));
  if (vS > uCabeza) { gl_FragColor = vec4(uAgua, .26 * filo * uOpacidad); }
  else {
    vec3 c = vS > uLimite ? uPalido : uOro;
    float alma = 1. + .45 * (1. - smoothstep(0., .5, abs(vLado)));            // el centro, más claro
    float celda = floor(vS / max(6., uAncho * .9));
    float pepita = step(.86, azar(celda * 1.7 + floor((vLado + 1.) * 1.5) * 13.1)) * (.55 + .45 * sin(uFase * 40. + celda * 2.3));
    float reciente = smoothstep(260., 0., uCabeza - vS);                      // los últimos metros, recién encendidos
    c *= alma * (1. + .55 * pepita + .8 * reciente) * (1. + uNoche * .35);
    gl_FragColor = vec4(c, filo * uOpacidad);
  }
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function montarRio(motor, { movimiento, quieto, alPrimerFotograma }) {
  const { THREE, D, AG } = motor, { EX, W, H, L, R, T, suelo } = D;
  const M = marcas(T);
  const marco = $('ruta-marco'), caja = $('ruta-lienzo'), capa = $('ruta-rotulos');
  const bMover = $('ruta-mover'), bVolver = $('ruta-volver');
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const camara = new THREE.PerspectiveCamera(42, 16 / 10, 20, 90000);
  const n = R.x.length, PASO = R.paso, LARGO = (n - 1) * PASO, S_LIM = R.partes[1] * PASO;
  const sup = (x, z) => suelo(x, z) * EX;

  // ---------- el hilo suavizado (≈720 m) para la cámara: sin tirones en las curvas del río ----------
  const CX = new Float32Array(n), CZ = new Float32Array(n), CY = new Float32Array(n);
  {
    const Vn = 60, pesos = []; for (let j = -Vn; j <= Vn; j++) pesos.push(Math.exp(-(j * j) / (2 * (Vn / 2.2) ** 2)));
    for (let i = 0; i < n; i++) {
      let sx = 0, sz = 0, sy = 0, sw = 0;
      for (let j = -Vn; j <= Vn; j++) { const k = Math.min(n - 1, Math.max(0, i + j)), w = pesos[j + Vn]; sx += R.x[k] * w; sz += R.z[k] * w; sy += sup(R.x[k], R.z[k]) * w; sw += w; }
      CX[i] = sx / sw; CZ[i] = sz / sw; CY[i] = sy / sw;
    }
  }
  const enSuave = f => { const i = clamp(f) * (n - 1), a = Math.floor(i), b = Math.min(n - 1, a + 1), k = i - a; return V3(mezcla(CX[a], CX[b], k), mezcla(CY[a], CY[b], k), mezcla(CZ[a], CZ[b], k)); };

  // ---------- la cinta ----------
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 2 * 3), aS = new Float32Array(n * 2), aLado = new Float32Array(n * 2), aNorm = new Float32Array(n * 2 * 2), ix = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let tx = R.x[b] - R.x[a], tz = R.z[b] - R.z[a]; const m = Math.hypot(tx, tz) || 1; tx /= m; tz /= m;
    const y = sup(R.x[i], R.z[i]) + 2.5;
    for (let l = 0; l < 2; l++) {
      const v = i * 2 + l;
      pos.set([R.x[i], y, R.z[i]], v * 3); aS[v] = i * PASO; aLado[v] = l ? -1 : 1; aNorm.set([-tz, tx], v * 2);
    }
    if (i < n - 1) { const v = i * 2; ix.push(v, v + 1, v + 2, v + 2, v + 1, v + 3); }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aLado', new THREE.BufferAttribute(aLado, 1)); geo.setAttribute('aNorm', new THREE.BufferAttribute(aNorm, 2)); geo.setIndex(ix);
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 200;
  const uCinta = { uOro: { value: new THREE.Color('#F2B84B') }, uPalido: { value: new THREE.Color('#F6D696') }, uAgua: { value: new THREE.Color('#D7DCDA') },
    uCabeza: { value: 0 }, uLimite: { value: S_LIM }, uOpacidad: { value: 1 }, uAncho: { value: 8 }, uFase: { value: 0 }, uNoche: { value: 0 },
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog) };
  const cinta = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: uCinta, vertexShader: cintaVert, fragmentShader: cintaFrag, transparent: true, depthWrite: false,
    toneMapped: false, fog: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  cinta.renderOrder = 3; motor.escena.add(cinta);
  // el brillo de la cabeza del hilo
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaBrillo(THREE), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  brillo.renderOrder = 5; motor.escena.add(brillo);
  // de noche el oro luce más
  motor.escucharHora(({ m }) => {
    uCinta.uNoche.value = m.noche;
    brillo.material.opacity = .6 + m.noche * .4;
  });

  // ---------- las poses: (mira a, rumbo de la cámara desde el punto, inclinación, distancia) que se mezclan ----------
  let aspecto = 1.6, Dvista = 14000, Tvista = V3(0, 0, 0), Bvista = 170, Dintro = 12000, Tintro = V3(0, 0, 0);
  const casaP = AG.casa.P;
  const Pose = (o, b, el, d) => ({ o, b, el, d });
  // el rumbo: río abajo por el Ahío (al sur) la cámara va detrás, al norte; al remontar (al oeste y al norte) se pone
  // al sudeste. Un solo giro, despacio, en la boca del Ahío.
  const rumbo = f => mezclaAng(12, 142, suave((f - (M.fa - .025)) / .11));
  const BINTRO = 18;
  const poseIntro = () => Pose(Tintro.clone(), BINTRO, aspecto < 1 ? 56 : 50, Dintro);
  const poseViaje = f => Pose(enSuave(f), rumbo(f), aspecto < 1 ? 40 : 36, aspecto < 1 ? 3300 : 2900);
  const poseCasa = () => Pose(casaP.clone().setY(casaP.y + 30), 150, 30, aspecto < 1 ? 1350 : 1080);
  const poseVista = () => Pose(Tvista.clone(), Bvista, aspecto < 1 ? 60 : 54, Dvista);
  function mezclarPose(A, B, k) {
    if (k <= 0) return A; if (k >= 1) return B;
    return Pose(A.o.clone().lerp(B.o, k), mezclaAng(A.b, B.b, k), mezcla(A.el, B.el, k), Math.exp(mezcla(Math.log(A.d), Math.log(B.d), k)));
  }
  const rad = Math.PI / 180;
  function colocar(P, cam = camara) {
    const ce = Math.cos(P.el * rad);
    cam.position.set(P.o.x + P.d * ce * Math.sin(P.b * rad), P.o.y + P.d * Math.sin(P.el * rad), P.o.z - P.d * ce * Math.cos(P.b * rad));
    const minY = sup(cam.position.x, cam.position.z) + 150; if (cam.position.y < minY) cam.position.y = minY;
    cam.lookAt(P.o); cam.updateMatrixWorld();
  }
  const poseDe = F => {
    let P = mezclarPose(poseViaje(F.f), poseIntro(), F.intro);
    P = mezclarPose(P, poseCasa(), F.llegada);
    return mezclarPose(P, poseVista(), F.vista);
  };

  // encuadres: que quepan los puntos con margen (búsqueda de la distancia)
  const prueba = new THREE.PerspectiveCamera();
  function encuadre(pts, b, el, centro) {
    const bb = new THREE.Box3().setFromPoints(pts); bb.getCenter(centro);
    prueba.copy(camara);
    const cabe = d => { colocar(Pose(centro, b, el, d), prueba); prueba.updateProjectionMatrix();
      return pts.every(p => { const v = p.clone().project(prueba); return Math.abs(v.x) < .84 && Math.abs(v.y) < .8 && v.z < 1; }); };
    let a = 2000, z = 70000; for (let i = 0; i < 22; i++) { const m = (a + z) / 2; if (cabe(m)) z = m; else a = m; }
    return z;
  }
  const hilo = []; for (let i = 0; i < n; i += 40) hilo.push(V3(R.x[i], sup(R.x[i], R.z[i]), R.z[i]));
  const sobre = k => { const l = L[k]; return V3(l.xz[0], sup(l.xz[0], l.xz[1]) + (l.alto || 140) * EX, l.xz[1]); };
  function encuadrar() {
    Bvista = aspecto < 1 ? 185 : 170;
    // la vista de todo: el hilo, la casa y los rótulos de alrededor
    Dvista = encuadre([...hilo, casaP.clone().setY(casaP.y + 220), ...['santa-eulalia', 'villanueva', 'seimeira', 'mazonovo', 'mon', 'salime', 'taramundi'].map(sobre)],
      Bvista, aspecto < 1 ? 60 : 54, Tvista);
    // la de arriba, al empezar: el Ahío entero, la casa y los otros dos Oscos
    Dintro = encuadre([...hilo, casaP.clone().setY(casaP.y + 220), sobre('santa-eulalia'), sobre('villanueva')], BINTRO, aspecto < 1 ? 56 : 50, Tintro);
  }

  // ---------- rótulos ----------
  const lista = listaRotulos(T);
  const rotulos = crearRotulos(capa, lista);
  const anclas = lista.map(r => {
    if (r.k === 'casa') return casaP.clone().setY(casaP.y + 80 + AG.casa.alto + 20);
    if (r.k.startsWith('r-')) { const l = L[r.k]; return V3(l.xz[0], sup(l.xz[0], l.xz[1]) + 60, l.xz[1]); }
    return sobre(r.k);
  });
  const pant = {};

  // ---------- estado ----------
  let p = quieto ? 1 : 0, pv = p, modo = 'camino', viaje = null, F = fase(pv, M.fa);
  colocar(poseDe(F));

  // ---------- el explorador ----------
  const ctl = new OrbitControls(camara, caja);
  // la rueda es del scroll de la página (el marco ocupa la pantalla): acercar con Ctrl + rueda (o el pellizco del trackpad),
  // con + y − del teclado y, en táctil con el mapa suelto, con dos dedos
  Object.assign(ctl, { enabled: false, enableDamping: true, dampingFactor: .08, minDistance: 300, maxDistance: 42000, maxPolarAngle: 1.42,
    screenSpacePanning: false, rotateSpeed: .6, enableZoom: TACTIL });
  ctl.addEventListener('change', () => {
    ctl.target.x = clamp(ctl.target.x, -W / 2, W / 2); ctl.target.z = clamp(ctl.target.z, -H / 2, H / 2);
    motor.pedir();
  });
  let moviendo = false;
  const esf = new THREE.Spherical(), off = V3(0, 0, 0);
  ctl.addEventListener('start', () => { moviendo = true; motor.pedir(); });
  ctl.addEventListener('end', () => { moviendo = false; });
  const alRueda = e => {
    if (!e.ctrlKey) return;
    e.preventDefault(); soltar();
    off.copy(camara.position).sub(ctl.target);
    off.setLength(clamp(off.length() * Math.exp(clamp(e.deltaY, -60, 60) * .01), ctl.minDistance, ctl.maxDistance));
    camara.position.copy(ctl.target).add(off); ctl.update(); motor.pedir();
  };
  caja.addEventListener('wheel', alRueda, { passive: false });
  // en táctil, el dedo hace scroll hasta que se pulsa «Mover el mapa» (OrbitControls pone touch-action: none al crearse)
  let suelto = !TACTIL;
  caja.style.touchAction = 'pan-y';
  function ponerMover(activo) {
    suelto = activo;
    caja.style.touchAction = activo ? 'none' : 'pan-y';
    bMover.textContent = activo ? 'Soltar el mapa' : 'Mover el mapa';
    bMover.setAttribute('aria-pressed', String(activo));
    marco.classList.toggle('mapa-suelto', activo);
    ctl.enabled = modo === 'libre' && suelto;
  }
  function ponerModo(m) {
    modo = m;
    marco.classList.toggle('libre', m === 'libre');
    bVolver.hidden = m !== 'libre';
    ctl.enabled = m === 'libre' && suelto;
    rotulos.medir();
  }
  /** al explorador desde donde esté la cámara */
  function soltar() {
    if (modo === 'libre') return;
    viaje = null;
    ctl.target.copy(poseDe(F).o); ponerModo('libre'); ctl.update(); motor.pedir();
  }
  function volver() {
    if (modo !== 'libre') return;
    if (TACTIL) ponerMover(false);
    if (!movimiento) { ponerModo('camino'); colocar(poseDe(F)); motor.pedir(); return; }
    viaje = { t0: -1, p0: camara.position.clone(), o0: ctl.target.clone() };
    ponerModo('camino'); motor.pedir();
  }
  if (TACTIL) {
    bMover.hidden = false; ponerMover(false);
    bMover.addEventListener('click', () => { if (!suelto) soltar(); ponerMover(!suelto); });
  } else bMover.hidden = true;
  bVolver.addEventListener('click', volver);
  // ratón: arrastrar suelta el mapa (en captura, antes que OrbitControls: el mismo arrastre ya gira)
  const alBajar = e => { if (e.pointerType === 'touch') return; if (modo !== 'libre') soltar(); };
  caja.addEventListener('pointerdown', alBajar, { capture: true });
  // teclado: flechas giran e inclinan, + y − acercan (sueltan el mapa); Escape vuelve al hilo
  caja.tabIndex = 0;
  caja.setAttribute('role', 'application');
  caja.setAttribute('aria-roledescription', 'relieve en 3D');
  caja.setAttribute('aria-label', 'Los Oscos en 3D: el río Ahío y el agua que llega a Ahío San Martín. Flechas: girar e inclinar. Más y menos: acercar y alejar. Escape: volver al río.');
  const alTeclear = e => {
    const k = e.key; let dTh = 0, dPh = 0, f = 1;
    if (k === 'Escape' && modo === 'libre') { e.preventDefault(); volver(); return; }
    if (k === 'ArrowLeft') dTh = -.12; else if (k === 'ArrowRight') dTh = .12;
    else if (k === 'ArrowUp') dPh = -.08; else if (k === 'ArrowDown') dPh = .08;
    else if (k === '+' || k === '=') f = .85; else if (k === '-' || k === '_') f = 1 / .85;
    else return;
    e.preventDefault(); soltar();
    off.copy(camara.position).sub(ctl.target); esf.setFromVector3(off);
    esf.theta += dTh; esf.phi = Math.max(.15, Math.min(ctl.maxPolarAngle, esf.phi + dPh));
    esf.radius = Math.max(ctl.minDistance, Math.min(ctl.maxDistance, esf.radius * f));
    camara.position.copy(ctl.target).add(off.setFromSpherical(esf)); ctl.update(); motor.pedir();
  };
  caja.addEventListener('keydown', alTeclear);
  bVolver.textContent = quieto ? 'Ver todo' : 'Volver al río';

  // ---------- el hilo en cada fotograma ----------
  function ponerHilo(Fh) {
    const fh = Fh.llegada > .5 ? 1 : Fh.f, sCab = fh * LARGO;
    const dCam = camara.position.distanceTo(enSuave(fh));
    const ancho = clamp(dCam * .0026, 6, 44);
    uCinta.uAncho.value = ancho; uCinta.uCabeza.value = fh >= .9999 ? LARGO + 50 : sCab;
    uCinta.uFase.value = Fh.p;
    const cab = enCamino(R, fh);
    brillo.position.set(cab.x, sup(cab.x, cab.z) + ancho * 2, cab.z);
    brillo.scale.setScalar(ancho * (cab.s > S_LIM ? 11 : 15));
    brillo.visible = fh > .0005 && fh < .9995;
    // la linterna de la casa se enciende cuando llega el hilo (y ya se ve, tenue, en la vista de arriba)
    AG.casa.encender(Math.max(Fh.intro * .45, clamp((fh - .965) / .035), Fh.llegada));
  }

  // ---------- la vista ----------
  const vista = motor.montar({
    caja, camara,
    ajustarCamara(w, h) {
      aspecto = w / h; camara.fov = motor.fovPara(aspecto);
      // el punto al que se mira, corrido: a la derecha del cuaderno (apaisado) o por encima (vertical)
      const dx = aspecto >= 1 && w > 760 ? Math.min(190, w * .13) : 0, dy = aspecto < 1 || w <= 760 ? Math.min(120, h * .14) : 0;
      // con setViewOffset, aspect es el de la imagen entera (la visible es un trozo)
      camara.aspect = (w + 2 * dx) / (h + 2 * dy);
      if (dx || dy) camara.setViewOffset(w + 2 * dx, h + 2 * dy, 0, 2 * dy, w, h); else camara.clearViewOffset();
      camara.updateProjectionMatrix();
      encuadrar(); rotulos.medir();
      if (modo === 'camino' && !viaje) colocar(poseDe(F));
    },
    cuadro(t, dt) {
      pv = movimiento ? pv + (p - pv) * (1 - Math.exp(-dt / 90)) : p;
      if (Math.abs(p - pv) < 1e-4) pv = p;
      let sigue = pv !== p;
      F = fase(pv, M.fa);
      if (modo === 'camino') {
        const dest = poseDe(F);
        if (viaje) {
          if (viaje.t0 < 0) viaje.t0 = t;
          const k = suave((t - viaje.t0) / VIAJE), c2 = prueba; c2.copy(camara); colocar(dest, c2);
          camara.position.lerpVectors(viaje.p0, c2.position, k); camara.lookAt(V3(0, 0, 0).lerpVectors(viaje.o0, dest.o, k)); camara.updateMatrixWorld();
          if (k >= 1) viaje = null; else sigue = true;
        } else colocar(dest);
      } else {
        const cambia = ctl.update();
        const c = camara.position, minY = sup(c.x, c.z) + 60; if (c.y < minY) c.y = minY;
        sigue = sigue || cambia || moviendo;
      }
      ponerHilo(F);
      return sigue;
    },
    trasPintar() {
      const libre = modo === 'libre';
      rotulos.colocar(anclas.map((a, i) => { motor.aPantalla(a, pant); return { x: pant.x, y: pant.y, visible: pant.visible, op: opRotulo(lista[i].k, F, libre, M) }; }));
    },
    alPrimerFotograma,
  });

  return {
    vista, camara, ctl, cinta,
    get modo() { return modo; }, get progreso() { return pv; }, get fase() { return F; },
    ponerProgreso(v, deGolpe) { p = quieto ? 1 : clamp(v); if (deGolpe || !movimiento) pv = p; motor.pedir(); },
    soltar, volver, poses: { intro: poseIntro, viaje: poseViaje, casa: poseCasa, vista: poseVista },
    destruir() {
      ctl.dispose();
      caja.removeEventListener('wheel', alRueda);
      caja.removeEventListener('pointerdown', alBajar, { capture: true }); caja.removeEventListener('keydown', alTeclear);
      capa.textContent = '';
    },
  };
}
