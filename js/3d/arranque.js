// «Los Oscos en 3D» (módulo Ruta): lo único que carga la web, con <script type="module" src="js/3d/arranque.js"> (diferido).
// No importa nada al cargar: solo pone window.Ahio.ruta.montar(el, opciones) y avisa con «ahio:listo» (detail.modulo = 'ruta').
// main.js lo monta al acercarse [data-modulo="ruta"]. Al montar:
//   - mete delante del respaldo la pista fijada (sticky) con el marco, el cuaderno y los botones, y esconde la imagen
//     del plano del respaldo (cualquier <img> de img/terreno/plano dentro del módulo); la lista de lugares se queda;
//   - con WebGL2 (y sin ahorro de datos ni ?sin-3d / opciones.gl === false) carga el 3D (escena.js + rio.js),
//     después de `load`, de un rato libre y de la cortina; si no, o si falla, el plano 2D (plano.js) en el mismo hueco;
//   - el scroll por la pista enciende el hilo del Ahío (progreso 0–1); con movimiento reducido o «sobria», la pista no
//     se fija: el marco se queda quieto con el hilo entero, la vista de todo y el explorador.
// VERSION: súbela al cambiar cualquier fichero de js/3d/ o img/terreno/ (todo lo que se pide desde aquí lleva ?v=VERSION).
const VERSION = '2026-10-23.1', V = '?v=' + VERSION;
const IMG = new URL('../../img/terreno/', import.meta.url).href;
const Ahio = (window.Ahio = window.Ahio || {});
const $ = id => document.getElementById(id);
const TACTIL = matchMedia('(pointer: coarse)').matches;

function hayWebGL2() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch (e) { return false; }
}
const trasCarga = () => new Promise(res => {
  const libre = () => ('requestIdleCallback' in window ? requestIdleCallback(() => res(), { timeout: 2000 }) : setTimeout(res, 300));
  if (document.readyState === 'complete') libre(); else addEventListener('load', libre, { once: true });
});
// la cortina (si la hay) se ha retirado: nada de tareas largas que traben su trazo (6 s de red de seguridad)
const cortinaFuera = () => Promise.race([
  new Promise(r => {
    const c = $('cortina');
    if (Ahio.cortinaFuera || Ahio.cortina?.fuera || !c || c.hidden) r();
    else { document.addEventListener('ahio:fuera', r, { once: true }); document.addEventListener('ahio:cortina-fuera', r, { once: true }); }
  }),
  new Promise(r => setTimeout(r, 6000)),
]);

// Mientras carga el 3D (o si se queda quieto), el relieve sombreado del plano cubre el hueco: no hay póster pintado con
// WebGL (el 3D no se pinta en las pruebas automáticas; lo mira Álvaro en su Chrome).
const POSTER = `
      <picture class="ruta-poster">
        <source type="image/webp" srcset="${IMG}plano-base.webp${V}">
        <img id="ruta-poster" src="${IMG}plano-base.jpg${V}" alt="" width="1800" height="1264" decoding="async">
      </picture>`;
const MARCADO = (quieto, poster) => `
  <div class="ruta-fijo">
    <div class="ruta-marco" id="ruta-marco">${poster}
      <div class="ruta-plano" id="ruta-plano" hidden></div>
      <div class="ruta-lienzo" id="ruta-lienzo"></div>
      <div class="ruta-rotulos" id="ruta-rotulos" aria-hidden="true"></div>
      <p class="ruta-chip" id="ruta-chip" hidden></p>
      <p class="ruta-carga" id="ruta-carga" role="status">Cargando el relieve…</p>
      <div class="ruta-mandos" role="group" aria-label="Vista de Los Oscos">
        <button type="button" class="ruta-btn" id="ruta-3d" aria-pressed="true">En 3D</button>
        <button type="button" class="ruta-btn" id="ruta-2d" aria-pressed="false">En plano</button>
        <button type="button" class="ruta-btn" id="ruta-mover" aria-pressed="false" hidden>Mover el mapa</button>
        <button type="button" class="ruta-btn" id="ruta-volver" hidden>${quieto ? 'Ver todo' : 'Volver al río'}</button>
      </div>
      <p class="ruta-ayuda" id="ruta-ayuda" hidden>${TACTIL ? 'Pulsa «Mover el mapa» para girarlo; con dos dedos, acercas.' : 'Arrastra para girar el mapa · Ctrl + rueda para acercar'}</p>
      <div class="ruta-cuaderno" id="ruta-cuaderno" aria-hidden="true"></div>
    </div>
  </div>
  <div class="ruta-vh" id="ruta-itinerario"></div>`;

function montar(el, op = {}) {
  if (el.__ruta) return el.__ruta;
  const movimiento = op.movimiento ?? !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quieto = !movimiento || op.densidad === 'sobria';
  const params = new URLSearchParams(location.search);
  let motivo = '';
  if (params.has('sin-3d') || op.gl === false || op.sin3d) motivo = 'pedido';
  else if (navigator.connection?.saveData) motivo = 'Con el ahorro de datos activado, Los Oscos van en plano.';
  else if (!hayWebGL2()) motivo = 'Este navegador no puede mostrar el 3D: Los Oscos van en plano.';

  // ---------- el marcado ----------
  const pista = document.createElement('div');
  pista.className = 'ruta-pista' + (quieto ? ' ruta-quieta' : '');
  pista.innerHTML = MARCADO(quieto, motivo ? '' : POSTER);
  el.insertBefore(pista, el.firstChild);
  el.classList.add('ruta-montada');
  // el plano estático del respaldo (lo pone la web) se esconde: el módulo lo pinta animado en el mismo hueco
  const escondidos = [...el.querySelectorAll('img')].filter(i => !pista.contains(i) && (/img\/terreno\/plano/.test(i.getAttribute('src') || '') || i.matches('.ruta__plano, .oscos__plano')))
    .map(i => i.closest('picture') || i).filter(x => !x.hidden);
  escondidos.forEach(x => { x.hidden = true; });
  const marco = $('ruta-marco'), carga = $('ruta-carga'), chip = $('ruta-chip'), b3 = $('ruta-3d'), b2 = $('ruta-2d'), ayuda = $('ruta-ayuda');
  const poster = $('ruta-poster');
  poster?.addEventListener('error', () => { poster.closest('picture').hidden = true; }, { once: true });

  const estado = (window.AHIO_3D = { VERSION, estado: 'montando', motivo, vista: motivo ? 'plano' : '3d', progreso: quieto ? 1 : 0, quieto });
  let vivo = true, p = quieto ? 1 : 0, cuaderno = null, G = null, plano = null, rio = null, motor = null, T = null, fa = .45, preferido = '3d';
  const errores = e => { if (vivo) console.warn('[ruta]', e); };

  // ---------- el progreso: cuánto se ha bajado por la pista fijada ----------
  const fijo = pista.querySelector('.ruta-fijo');
  function leer() {
    if (quieto) return 1;
    const r = pista.getBoundingClientRect(), arriba = parseFloat(getComputedStyle(fijo).top) || 0;
    const recorrido = pista.offsetHeight - fijo.offsetHeight;
    return recorrido > 0 ? Math.min(1, Math.max(0, (arriba - r.top) / recorrido)) : 0;
  }
  // la ayuda del explorador: al final del recorrido (o siempre, quieto), solo con el 3D en marcha
  const ponerAyuda = () => { ayuda.hidden = !(estado.estado === 'listo' && estado.vista === '3d' && (quieto || p > .93)); };
  let rafCuaderno = 0;
  function alMover() {
    const v = leer();
    if (Math.abs(v - p) < 1e-5) return;
    p = v; estado.progreso = p;
    rio?.ponerProgreso(p); plano?.ponerProgreso(p);
    if (cuaderno && !rafCuaderno) rafCuaderno = requestAnimationFrame(() => { rafCuaderno = 0; cuaderno(G.fase(p, fa)); ponerAyuda(); });
  }
  addEventListener('scroll', alMover, { passive: true });
  addEventListener('resize', alMover, { passive: true });
  // la pista cambia el alto de la página: el ScrollTrigger de la web tiene que volver a medir
  requestAnimationFrame(() => { try { window.ScrollTrigger?.refresh(); } catch (e) { /* nada */ } });

  // ---------- En 3D / En plano ----------
  function asegurarPlano() {
    if (plano || !T) return plano;
    return import('./plano.js' + V).then(P => {
      if (!vivo) return null;
      plano ||= P.montarPlano($('ruta-plano'), T, { base: IMG, movimiento: movimiento && !quieto, v: V });
      estado.plano = plano;
      plano.ponerProgreso(p, true);
      return plano;
    });
  }
  async function ponerVista(v) {
    estado.vista = v;
    b3.setAttribute('aria-pressed', String(v === '3d')); b2.setAttribute('aria-pressed', String(v === 'plano'));
    marco.classList.toggle('en-plano', v === 'plano');
    chip.hidden = v === 'plano' || !motor;
    ponerAyuda();
    if (v === 'plano') {
      motor?.pausar(true);
      $('ruta-rotulos').hidden = true;
      const pl = await asegurarPlano();
      if (pl && estado.vista === 'plano') pl.mostrar(true);
    } else {
      plano?.mostrar(false);
      $('ruta-rotulos').hidden = false;
      motor?.pausar(false);
    }
  }
  b3.addEventListener('click', () => { preferido = '3d'; ponerVista('3d'); });
  b2.addEventListener('click', () => { preferido = 'plano'; ponerVista('plano'); });

  function sinTres(txt) {
    try { rio?.destruir(); motor?.destruir(); } catch (e) { /* nada */ }
    rio = motor = null;
    estado.estado = 'sin-3d'; estado.vista = 'plano';
    marco.classList.add('sin-3d'); marco.classList.remove('con-3d');
    const pp = pista.querySelector('.ruta-poster'); if (pp) pp.hidden = true;
    b3.hidden = b2.hidden = true;
    $('ruta-mover').hidden = $('ruta-volver').hidden = true;
    carga.hidden = !txt || txt === 'pedido'; carga.textContent = txt === 'pedido' ? '' : txt;
    ponerVista('plano');
  }

  // ---------- la carga ----------
  (async () => {
    const [S, Gm, Tj] = await Promise.all([import('./sol.js' + V), import('./guion.js' + V),
      fetch(IMG + 'terreno.json' + V, { priority: 'low' }).then(r => { if (!r.ok) throw new Error('terreno.json ' + r.status); return r.json(); })]);
    if (!vivo) return;
    G = Gm; T = Tj; fa = G.marcas(T).fa;
    if (op.hora instanceof Date && !params.has('hora') && !params.has('ahora3d')) S.fijarAhora(op.hora);
    cuaderno = G.crearCuaderno($('ruta-cuaderno'), T);
    $('ruta-itinerario').innerHTML = G.itinerario(T);
    p = leer(); estado.progreso = p; cuaderno(G.fase(p, fa));
    if (motivo) { sinTres(motivo); estado.estado = 'plano'; return; }

    await trasCarga();
    if (!vivo) return;
    const poner = () => { chip.textContent = S.textoChip(); };
    poner(); const reloj = setInterval(() => { if (!vivo) clearInterval(reloj); else poner(); }, 30000);
    estado.estado = 'cargando';
    const avisoLento = setTimeout(() => { if (vivo && estado.estado === 'cargando') carga.textContent = 'El relieve 3D está tardando; mientras, el plano.'; }, 15000);
    const [E, C] = await Promise.all([import('./escena.js' + V), import('./rio.js' + V)]);
    const D = await E.cargarDatos(T, V);
    await cortinaFuera();
    if (!vivo) return;
    motor = E.crearMotor(D, { S, alFallar: () => sinTres('El 3D se ha detenido en este equipo: Los Oscos van en plano.') });
    motor.ponerHora(S.ahora());
    await motor.listo;
    if (!vivo || estado.estado === 'sin-3d') return;
    rio = C.montarRio(motor, {
      movimiento, quieto,
      alPrimerFotograma() {
        marco.classList.add('con-3d'); carga.hidden = true; clearTimeout(avisoLento);
        estado.estado = 'listo';
        if (estado.vista === '3d') chip.hidden = false;
        ponerAyuda();
        document.dispatchEvent(new CustomEvent('ahio:ruta-lista'));
      },
    });
    rio.ponerProgreso(p, true);
    // la luz se rehace al cambiar el minuto (si la página se queda abierta)
    const reloj3d = setInterval(() => { if (!vivo || !motor) clearInterval(reloj3d); else { motor.ponerHora(S.ahora()); motor.pedir(); } }, 60000);
    Object.assign(estado, { motor, rio });
    if (preferido === 'plano') ponerVista('plano');
  })().catch(e => {
    errores(e);
    if (!vivo) return;
    // sin los datos no hay ni plano: fuera la pista, vuelve el respaldo entero
    if (!T) { pista.remove(); escondidos.forEach(x => { x.hidden = false; }); el.classList.remove('ruta-montada'); estado.estado = 'respaldo'; return; }
    sinTres('El 3D no ha podido cargar aquí: Los Oscos van en plano.');
  });

  el.dataset.montado = '1';
  const inst = {
    destruir() {
      vivo = false;
      removeEventListener('scroll', alMover); removeEventListener('resize', alMover);
      cancelAnimationFrame(rafCuaderno);
      try { rio?.destruir(); motor?.destruir(); plano?.destruir(); } catch (e) { /* nada */ }
      pista.remove(); escondidos.forEach(x => { x.hidden = false; });
      el.classList.remove('ruta-montada'); delete el.dataset.montado; delete el.__ruta;
      window.AHIO_3D = { estado: 'destruido' };
    },
  };
  el.__ruta = inst;
  return inst;
}

Ahio.ruta = { montar, VERSION };
document.dispatchEvent(new CustomEvent('ahio:listo', { detail: { modulo: 'ruta' } }));
