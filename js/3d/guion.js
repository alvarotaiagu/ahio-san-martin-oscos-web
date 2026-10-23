// El guion de «Los Oscos en 3D», común al 3D y al plano (sin Three.js):
// - fase(p, fa): del progreso del scroll (0–1) a qué se ve. El hilo es el río Ahío entero (de la fuente a su boca en el
//   Agüeira) y después el agua que llega a la casa remontada: Agüeira arriba y río San Martín arriba. «fa» es la fracción
//   del hilo donde acaba el Ahío (terreno.json: rio.partes[1] / (n − 1)).
// - el cuaderno: la altura del agua, los km, el tramo y el perfil del río, con la letra de placa.
// - los rótulos: elementos HTML sobre el mapa que no chocan entre sí ni se salen del marco.
// Datos: relieve, ortofoto y ríos del IGN (CC BY 4.0); lugares y carreteras de OpenStreetMap (OSRM). Nada inventado:
// el río Ahío no pasa por el pueblo (corre por Mon); el texto lo dice.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const suave = t => (t = clamp(t), t * t * (3 - 2 * t));
export const coma = (v, d = 1) => v.toFixed(d).replace('.', ',');
/** km para leer: «7,8», pero «10» y no «10,0» */
export const kmTxt = v => (Math.abs(v - Math.round(v)) < .05 ? String(Math.round(v)) : coma(v));
const anda = t => .7 * t + .3 * (.5 - .5 * Math.cos(Math.PI * t));

// los cortes del scroll (fracción de la pista fijada)
export const CORTES = { intro: .07, junta: .60, llega: .84, vista: .92 };

/** p: progreso de la sección fijada; fa: fracción del hilo donde acaba el Ahío → { p, f, intro, llegada, vista } (0–1) */
export function fase(p, fa = .45) {
  p = clamp(p);
  const { intro, junta, llega, vista } = CORTES;
  const f = p < junta ? fa * anda(clamp((p - intro) / (junta - intro))) : fa + (1 - fa) * anda(clamp((p - junta) / (llega - junta)));
  return {
    p,
    intro: 1 - suave(p / intro),            // 0–7 %: Los Oscos desde arriba, y bajando a la fuente del Ahío
    f,                                       // 7–60 %: el Ahío se enciende río abajo; 60–84 %: el hilo remonta hasta la casa
    llegada: suave((p - llega) / (vista - llega)),   // 84–92 %: la casa de cerca, con la linterna encendida
    vista: suave((p - vista) / (1 - vista)),         // 92–100 %: todo Los Oscos, con los rótulos y sus distancias
  };
}

/** Marcas del hilo (fracciones): fa = fin del Ahío, fs = empieza el río San Martín, fm = el Mazo de Mon */
export function marcas(T) {
  const R = T.rio, n1 = R.n - 1, tr = k => R.tramos.find(t => t.k === k);
  return { fa: R.partes[1] / n1, fs: R.partes[2] / n1, fm: tr('mazo')?.f ?? R.partes[1] / n1 * .77 };
}

/** Punto del hilo en la fracción f: { i (índice con decimales), x, z, h (m reales del agua), s (m desde la fuente) } */
export function enCamino(R, f) {
  const n = R.x.length, i = clamp(f) * (n - 1), a = Math.floor(i), b = Math.min(n - 1, a + 1), k = i - a;
  return { i, x: R.x[a] + (R.x[b] - R.x[a]) * k, z: R.z[a] + (R.z[b] - R.z[a]) * k, h: R.h[a] + (R.h[b] - R.h[a]) * k, s: i * R.paso };
}

/** El tramo en que va la cabeza del hilo (el último cuyo inicio ya pasó; sin «casa», que es la llegada) */
export const tramoDe = (R, f) => R.tramos.filter(t => t.k !== 'casa').reduce((t, x) => (f >= x.f - 1e-6 ? x : t), R.tramos[0]);

/** Línea de distancias de los tres Oscos y alrededor (de ref/raw/rutas.json, vía terreno.json) */
function alrededor(L) {
  return {
    oscos: `Los tres Oscos: Santa Eulalia a ${kmTxt(L['santa-eulalia'].km)} km por carretera y Villanueva a ${kmTxt(L.villanueva.km)}.`,
    resto: `La Seimeira (la ruta sale de Pumares) a ${kmTxt(L.seimeira.km)} km, Mazonovo a ${kmTxt(L.mazonovo.km)} y el palacio de Mon a ${kmTxt(L.mon.km)}.`,
  };
}

// ---------- el cuaderno ----------
/** Escribe el cuaderno dentro de «el» y devuelve poner(fase) */
export function crearCuaderno(el, T) {
  const R = T.rio, L = T.lugares, M = marcas(T), A = alrededor(L);
  const N = 140, hs = [];
  for (let j = 0; j < N; j++) hs.push(R.h[Math.round(j / (N - 1) * (R.h.length - 1))]);
  const hMin = Math.min(...hs) - 30, hMax = Math.max(...hs) + 20, PW = 240, PH = 44;
  const px = j => (j / (N - 1) * PW).toFixed(1), py = h => (PH - (h - hMin) / (hMax - hMin) * PH).toFixed(1);
  const linea = hs.map((h, j) => `${j ? 'L' : 'M'}${px(j)} ${py(h)}`).join('');
  const xa = (M.fa * PW).toFixed(1);
  const cerca = Math.round(T.casa_rio_m / 10) * 10;
  el.innerHTML = `
    <p class="ruta-c-ceja">El hilo del Ahío</p>
    <p class="ruta-c-alto"><b data-alt>${Math.round(R.h[0])}</b><span>m sobre el mar<br><i data-donde>la fuente</i></span></p>
    <p class="ruta-c-km" data-km>km 0 de ${coma(R.km.ahio)} del Ahío</p>
    <p class="ruta-c-tramo" data-tramo>${R.tramos[0].t}</p>
    <svg class="ruta-c-perfil" viewBox="0 -4 ${PW} ${PH + 8}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><clipPath id="ruta-c-recorte"><rect x="0" y="-4" width="0" height="${PH + 8}" data-recorte/></clipPath></defs>
      <path class="ruta-c-fondo" d="${linea}L${PW} ${PH}L0 ${PH}Z"/>
      <path class="ruta-c-linea" d="${linea}"/>
      <path class="ruta-c-hecho" d="${linea}" clip-path="url(#ruta-c-recorte)"/>
      <line class="ruta-c-junta" x1="${xa}" x2="${xa}" y1="-4" y2="${PH}"/>
      <line class="ruta-c-cabeza" x1="0" x2="0" y1="-4" y2="${PH}" data-cabeza/>
    </svg>
    <p class="ruta-c-nota" data-nota></p>
    <p class="ruta-c-fuente">Relieve, foto aérea y ríos del IGN (CC BY 4.0); el cielo es el de ahora. Lugares y carreteras: © OpenStreetMap.</p>`;
  const q = s => el.querySelector(s);
  const eAlt = q('[data-alt]'), eDonde = q('[data-donde]'), eKm = q('[data-km]'), eTr = q('[data-tramo]'), eRec = q('[data-recorte]'), eCab = q('[data-cabeza]'), eNota = q('[data-nota]');
  const NOTA_ORO = '«En el siglo I d. C. llegaron los romanos en busca del oro encontrado en el río Ahío.» (de su web)';
  const NOTA_AGUA = 'El Ahío no pasa por el pueblo: corre por Mon. El hilo vuelve por el agua que sí pasa junto a la casa.';
  let ultimo = '';
  return function poner(F) {
    const llega = F.llegada > .5, todo = F.vista > .5, fh = llega ? 1 : F.f;
    const c = enCamino(R, fh), kmS = c.s / 1000;
    let alt, donde, km, tramo, nota;
    if (todo) {
      alt = Math.round(L.casa.h); donde = 'en la casa'; km = `${coma(R.km.ahio)} km de Ahío; ${coma(R.km.agueira + R.km.sanmartin)} km de agua remontada`;
      tramo = A.oscos; nota = A.resto;
    } else if (llega) {
      alt = Math.round(L.casa.h); donde = 'en la casa'; km = `A unos ${cerca} m del río San Martín`;
      tramo = `${L.casa.t} · ${L.casa.sub}`; nota = NOTA_AGUA;
    } else {
      alt = Math.round(c.h);
      if (fh <= M.fa + 1e-6) { donde = fh < .004 ? 'la fuente' : 'el agua del Ahío'; km = `km ${coma(Math.min(kmS, R.km.ahio))} de ${coma(R.km.ahio)} del Ahío`; nota = NOTA_ORO; }
      else if (fh < M.fs) { donde = 'el agua del Agüeira'; km = `Agüeira arriba · ${coma(kmS - R.km.ahio)} de ${coma(R.km.agueira)} km`; nota = NOTA_AGUA; }
      else { donde = 'el río San Martín'; km = `río San Martín arriba · ${coma(Math.max(0, kmS - R.km.ahio - R.km.agueira))} de ${coma(R.km.sanmartin)} km`; nota = NOTA_AGUA; }
      tramo = tramoDe(R, fh).t;
    }
    const clave = alt + km + tramo + donde;
    if (clave === ultimo) return;
    ultimo = clave;
    eAlt.textContent = alt; eDonde.textContent = donde; eKm.textContent = km; eTr.textContent = tramo;
    if (eNota.textContent !== nota) eNota.textContent = nota;
    const x = fh * PW;
    eRec.setAttribute('width', x.toFixed(1)); eCab.setAttribute('x1', x.toFixed(1)); eCab.setAttribute('x2', x.toFixed(1));
  };
}

/** El recorrido en texto (para lectores de pantalla y sin la escena): una lista ordenada y las distancias */
export function itinerario(T) {
  const R = T.rio, L = T.lugares, A = alrededor(L), li = [];
  for (const t of R.tramos) {
    if (t.k === 'casa') continue;
    const c = enCamino(R, t.f);
    li.push(`<li>Km ${coma(c.s / 1000)} · ${t.t} (agua a ${Math.round(c.h)} m).</li>`);
  }
  li.push(`<li>Km ${coma(R.largo / 1000)} · ${L.casa.t}, ${L.casa.sub} (${Math.round(L.casa.h)} m), a unos ${Math.round(T.casa_rio_m / 10) * 10} m del río San Martín.</li>`);
  return `<p>El río Ahío, de la fuente al Agüeira (${coma(R.km.ahio)} km), y el agua remontada hasta la casa:</p><ol>${li.join('')}</ol><p>${A.oscos} ${A.resto}</p>`;
}

// ---------- los rótulos ----------
/** lista: [{ k, t, sub, clase }] → { els, colocar(pos) } con pos[i] = { x, y, visible, op? } en px del marco */
export function crearRotulos(capa, lista) {
  capa.textContent = '';
  const rot = lista.map(r => {
    const d = document.createElement('div');
    d.className = 'ruta-rotulo' + (r.clase ? ' ' + r.clase : ''); d.dataset.lugar = r.k;
    d.innerHTML = `${r.t}${r.sub ? `<small>${r.sub}</small>` : ''}`;
    d.style.display = 'none';
    capa.appendChild(d); return { ...r, d, w: 0, h: 0 };
  });
  return {
    rot,
    medir() { rot.forEach(r => { r.w = 0; }); },
    /** en orden de la lista: el que choca con uno anterior o no cabe entero en el marco no se pone */
    colocar(pos) {
      const puestos = [], cw = capa.clientWidth, ch = capa.clientHeight;
      rot.forEach((r, i) => {
        const p = pos[i];
        if (!p || !p.visible || (p.op ?? 1) <= .01) { r.d.style.display = 'none'; return; }
        if (r.d.style.display === 'none') r.d.style.display = '';
        if (!r.w) { r.w = r.d.offsetWidth || 120; r.h = r.d.offsetHeight || 34; }
        // si el punto está dentro pero el rótulo se sale por un lado, el rótulo se corre hacia dentro
        let x = p.x;
        if (p.x >= 4 && p.x <= cw - 4) x = Math.min(cw - 4 - r.w / 2, Math.max(4 + r.w / 2, p.x));
        const c = { x0: x - r.w / 2, x1: x + r.w / 2, y0: p.y - r.h - 12, y1: p.y };
        const cabe = c.x0 >= 4 && c.x1 <= cw - 4 && c.y0 >= 4 && c.y1 <= ch - 4 && !puestos.some(o => c.x0 < o.x1 + 4 && c.x1 > o.x0 - 4 && c.y0 < o.y1 && c.y1 > o.y0);
        if (!cabe) { r.d.style.display = 'none'; return; }
        puestos.push(c);
        r.d.style.opacity = (p.op ?? 1) < 1 ? (p.op).toFixed(2) : '';
        r.d.style.transform = `translate(${x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
        r.d.style.setProperty('--guia', `${(p.x - x + r.w / 2).toFixed(1)}px`);   // la rayita sigue apuntando al sitio
      });
    },
    ocultar() { rot.forEach(r => { r.d.style.display = 'none'; }); },
  };
}

/** Los rótulos de la escena (los mismos en 3D y en plano), en orden de prioridad (el primero gana si chocan) */
export function listaRotulos(T) {
  const L = T.lugares, por = l => `${kmTxt(l.km)} km por carretera`;
  return [
    { k: 'casa', t: L.casa.t, sub: `${L.casa.sub} · ${Math.round(L.casa.h)} m`, clase: 'casa' },
    { k: 'r-ahio', t: L['r-ahio'].t, clase: 'rio' },
    { k: 'mazo-mon', t: L['mazo-mon'].t, sub: 'junto al Ahío' },
    { k: 'r-agueira', t: L['r-agueira'].t, clase: 'rio rio-otro' },
    { k: 'r-sanmartin', t: L['r-sanmartin'].t, clase: 'rio rio-otro' },
    { k: 'santa-eulalia', t: L['santa-eulalia'].t, sub: por(L['santa-eulalia']), clase: 'osco' },
    { k: 'villanueva', t: L.villanueva.t, sub: por(L.villanueva), clase: 'osco' },
    { k: 'mon', t: L.mon.t, sub: por(L.mon) },
    { k: 'seimeira', t: L.seimeira.t, sub: `desde Pumares · ${por(L.seimeira)}` },
    { k: 'mazonovo', t: L.mazonovo.t, sub: por(L.mazonovo) },
    { k: 'salime', t: L.salime.t, sub: por(L.salime) },
    { k: 'taramundi', t: `hacia ${L.taramundi.t}`, sub: por(L.taramundi), clase: 'fuera' },
  ];
}
const ventana = (f, a, b, borde = .025) => Math.min(suave((f - a) / borde), 1 - suave((f - b) / borde));
/** Opacidad de cada rótulo según la fase (libre = el explorador: todos). M = marcas(T) */
export function opRotulo(k, F, libre, M) {
  if (libre) return 1;
  const viaje = (1 - F.llegada) * (1 - F.intro);
  switch (k) {
    case 'casa': return Math.max(F.intro, suave((F.f - .93) / .05), F.llegada);
    case 'santa-eulalia': case 'villanueva': return Math.max(F.intro, F.vista);
    case 'r-ahio': return Math.max(F.intro * .9, ventana(F.f, .01, M.fa - .03) * viaje);
    case 'mazo-mon': return Math.max(ventana(F.f, M.fm - .09, M.fm + .07) * viaje, F.vista);
    case 'mon': return Math.max(ventana(F.f, M.fm - .07, M.fm + .06) * viaje, F.vista);
    case 'r-agueira': return ventana(F.f, M.fa + .005, M.fs - .01) * viaje;
    case 'r-sanmartin': return ventana(F.f, M.fs + .005, .95) * viaje;
    default: return F.vista;
  }
}
