/* ------------------------------------------------------------------
   Ahío San Martín · reserva.js · «Registro de entrada»
   Motor de reservas de DEMOSTRACIÓN (el de Casa da Tulla y Casa de Agosto llevado a 8 apartamentos).
   Pasos: fechas → apartamentos y personas → datos → confirmación (cae el sello «ENTRADA»).
   Cada noche tiene cuántos apartamentos quedan libres (0 a 8), inventado pero siempre igual
   (semilla fija por año). No hay servidor: no se envía, se guarda ni se cobra nada.
   DATOS VERDADEROS (su web): 2 personas por apartamento + hasta 2 supletorias a 15 € por persona y noche;
   2 cunas de viaje a 10 € una vez; mascotas 12 € por noche y apartamento, como mucho 72 €; se paga al
   llegar (tarjeta de débito como garantía); cancelación: más de 15 días sin gastos, de 15 a 7 la mitad,
   menos de 7 el total. La preferencia (planta baja, dúplex, cama de 1,80) se apunta: Ena asigna.
   SUPUESTOS (marcados también en la página y en el README):
   - 60 € por noche y apartamento en temporada baja y 88 € en alta (la horquilla de Turismo Asturias);
   - temporada alta = Semana Santa, puentes y festivos nacionales y de Asturias, julio y agosto;
   - una sola noche: +15 € por apartamento (su web dice que una noche cuesta más, no cuánto);
   - las noches completas o con pocos libres, de ejemplo.
   Al conectar el motor real, solo cambian libres() y la confirmación.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const raiz = document.getElementById('motor');
  if (!raiz) return;
  const A = (window.Ahio = window.Ahio || {});

  /* ---------- fechas ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const clave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deClave = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const mas = (k, n) => { const d = deClave(k); d.setDate(d.getDate() + n); return clave(d); };
  const entre = (a, b) => Math.round((deClave(b) - deClave(a)) / 864e5);
  const hoy = clave(new Date());
  const fCorta = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fEur = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const corta = (k) => fCorta.format(deClave(k));
  const larga = (k) => fLarga.format(deClave(k));
  const sello = (k) => k.slice(8, 10) + '·' + k.slice(5, 7) + '·' + k.slice(2, 4);
  const eur = (n) => fEur.format(Math.round(n * 100) / 100) + ' €';

  // Domingo de Pascua (algoritmo anónimo gregoriano)
  function pascua(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return clave(new Date(y, mes - 1, dia));
  }

  /* ---------- tarifas y temporada ---------- */
  const PRECIO = { baja: 60, alta: 88 };          // por noche y apartamento (SUPUESTO dentro de la horquilla de TA)
  const SUPLETORIA = 15, CUNA = 10, MASCOTA = 12, MASCOTA_TOPE = 72, UNA_NOCHE = 15;
  const APTOS = 8, POR_APTO = 2, SUPL_POR_APTO = 2, CUNAS = 2, VENTANA = 12;
  // festivos nacionales y de Asturias (8 de septiembre), con el Jueves y el Viernes Santo;
  // un puente: el lunes o el viernes pegado a un festivo en martes o jueves
  const festivos = new Map();
  function festivosDe(y) {
    if (festivos.has(y)) return festivos.get(y);
    const s = new Set(['01-01', '01-06', '05-01', '08-15', '09-08', '10-12', '11-01', '12-06', '12-08', '12-25'].map((md) => `${y}-${md}`));
    s.add(mas(pascua(y), -3)); s.add(mas(pascua(y), -2));
    [...s].forEach((k) => { const w = deClave(k).getDay(); if (w === 2) s.add(mas(k, -1)); if (w === 4) s.add(mas(k, 1)); });
    festivos.set(y, s);
    return s;
  }
  const cacheAlta = new Map();
  // una noche es de temporada alta si cae en Semana Santa, en julio o agosto, o si esa noche o el día siguiente es festivo o puente
  function esAlta(k) {
    if (cacheAlta.has(k)) return cacheAlta.get(k);
    const y = +k.slice(0, 4), md = k.slice(5), p = pascua(y);
    const sig = mas(k, 1);
    const v = (k >= mas(p, -7) && k <= p) || (md >= '07-01' && md <= '08-31') || festivosDe(y).has(k) || festivosDe(+sig.slice(0, 4)).has(sig);
    cacheAlta.set(k, v);
    return v;
  }

  /* ---------- apartamentos libres de ejemplo (siempre los mismos) ---------- */
  function azar(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const ocupados = (function generar() {
    const m = new Map();
    const anios = new Set();
    for (let k = mas(hoy, -40), fin = mas(hoy, 400); k <= fin; k = mas(k, 1)) anios.add(+k.slice(0, 4));
    anios.forEach((y) => {
      const r = azar(y * 33777);
      for (let k = `${y}-01-01`; k <= `${y}-12-31`; k = mas(k, 1)) {
        const w = deClave(k).getDay();
        const finde = w === 5 || w === 6;
        let n = esAlta(k) ? 5 + Math.floor(r() * 4) : finde ? 3 + Math.floor(r() * 5) : Math.floor(r() * 4);
        if (finde && esAlta(k) && r() < 0.6) n = APTOS;            // fines de semana de temporada alta: completos a menudo
        if (!finde && !esAlta(k) && r() < 0.05) n = 6 + Math.floor(r() * 2); // algún grupo entre semana
        m.set(k, Math.min(APTOS, n));
      }
      // Semana Santa y el puente de agosto, completos
      for (let i = -4; i < 0; i++) m.set(mas(pascua(y), i), APTOS);
      for (let i = 13; i <= 15; i++) m.set(`${y}-08-${pad(i)}`, APTOS);
    });
    return m;
  })();
  const libres = (k) => APTOS - (ocupados.get(k) ?? 0);
  const estado = (k) => { const l = libres(k); return l <= 0 ? 'completo' : l <= 2 ? 'pocas' : 'libre'; };
  const minLibresEntre = (a, b) => { let m = APTOS; for (let k = a; k < b; k = mas(k, 1)) m = Math.min(m, libres(k)); return m; };

  /* ---------- estado ---------- */
  const b0 = deClave(hoy);
  const st = { y: b0.getFullYear(), m: b0.getMonth(), ini: null, fin: null, aptos: 1, pers: 2, cunas: 0, mascotas: 0, pref: '', paso: 'fechas', msg: '', datos: {}, loc: '' };
  const minMes = st.y * 12 + st.m, maxMes = minMes + VENTANA - 1;
  const limite = clave(new Date(b0.getFullYear(), b0.getMonth() + VENTANA, 0));
  const noches = () => { if (!st.ini || !st.fin) return []; const r = []; for (let k = st.ini; k < st.fin; k = mas(k, 1)) r.push(k); return r; };
  const maxAptos = () => (st.ini && st.fin ? Math.max(1, minLibresEntre(st.ini, st.fin)) : APTOS);
  const maxPers = () => st.aptos * (POR_APTO + SUPL_POR_APTO);
  function cuenta() {
    const n = noches(), alta = n.filter(esAlta).length, baja = n.length - alta;
    const aloj = (alta * PRECIO.alta + baja * PRECIO.baja) * st.aptos;
    const supl = Math.max(0, st.pers - POR_APTO * st.aptos);
    const suplementos = supl * SUPLETORIA * n.length;
    const unaNoche = n.length === 1 ? UNA_NOCHE * st.aptos : 0;
    const cunas = st.cunas * CUNA;
    const mascotas = st.mascotas * Math.min(MASCOTA * n.length, MASCOTA_TOPE);
    return { n: n.length, alta, baja, aloj, supl, suplementos, unaNoche, cunas, mascotas, total: aloj + suplementos + unaNoche + cunas + mascotas };
  }
  // las cifras siempre dentro de lo que cabe
  function ajustar() {
    st.aptos = Math.min(Math.max(1, st.aptos), maxAptos());
    st.pers = Math.min(Math.max(1, st.pers), maxPers());
    st.mascotas = Math.min(Math.max(0, st.mascotas), st.aptos);
    st.cunas = Math.min(Math.max(0, st.cunas), CUNAS);
  }

  /* ---------- pintar ---------- */
  const DSEM = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const PASOS = [['fechas', 'Fechas'], ['apartamentos', 'Apartamentos y personas'], ['datos', 'Tus datos'], ['hecho', 'Confirmación']];
  const PREF = { '': 'Sin preferencia', 'planta-baja': 'Planta baja, sin escaleras', duplex: 'Dúplex', 'cama-180': 'Cama de 1,80' };
  const SUP = '<span class="sup">supuesto</span>';
  const AVISO = '<p class="motor__fino motor__aviso">Demostración: no se envía, no se guarda ni se cobra nada.</p>';
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

  function mesHTML(y, m) {
    const primero = new Date(y, m, 1), dias = new Date(y, m + 1, 0).getDate();
    const off = (primero.getDay() + 6) % 7;
    const nombre = primero.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    let h = `<div class="mes"><h4 class="mes__tit">${nombre[0].toUpperCase() + nombre.slice(1)}</h4><div class="dias" role="group" aria-label="${nombre}">`;
    h += DSEM.map((d) => `<span class="dsem" aria-hidden="true">${d}</span>`).join('');
    for (let i = 0; i < off; i++) h += '<span class="vacio"></span>';
    for (let d = 1; d <= dias; d++) {
      const k = `${y}-${pad(m + 1)}-${pad(d)}`;
      const c = ['dia'];
      let dis = false, et = larga(k);
      const e = estado(k);
      if (k < hoy || k > limite) { c.push('pasado'); dis = true; }
      else if (e === 'completo') {
        if (st.ini && !st.fin && k > st.ini && minLibresEntre(st.ini, k) > 0) { c.push('solo-salida'); et += ', libre para salir'; }
        else { c.push('completo'); dis = true; et += ', completo'; }
      } else if (e === 'pocas') { c.push('pocas'); et += libres(k) === 1 ? ', queda 1 apartamento' : ', quedan 2 apartamentos'; }
      else et += ', libre';
      if (esAlta(k) && !dis) { c.push('alta'); et += ', temporada alta'; }
      if (st.ini && k === st.ini) { c.push('ini'); et += ', llegada'; }
      if (st.fin && k === st.fin) { c.push('fin'); et += ', salida'; }
      if (st.ini && st.fin && k > st.ini && k < st.fin) c.push('rango');
      h += `<button type="button" class="${c.join(' ')}" data-k="${k}" aria-label="${et}"${dis ? ' aria-disabled="true" tabindex="-1"' : ''}${(k === st.ini || k === st.fin) ? ' aria-pressed="true"' : ''}>${d}</button>`;
    }
    return h + '</div></div>';
  }

  // el asiento del libro: las cinco columnas que se van rellenando
  function asiento() {
    const n = noches().length;
    const apto = st.paso === 'fechas' && !st.fin ? '—' : (st.aptos === 1 ? '1' : st.aptos) + (st.pref ? ' · ' + PREF[st.pref].toLowerCase() : '');
    const col = (t, v, id) => `<div><small>${t}</small><b${id ? ` id="${id}"` : ''}>${v}</b></div>`;
    return `<div class="asiento" aria-label="Tu asiento en el registro">
      ${col('Fecha de entrada', st.ini ? corta(st.ini) : '—', 'as-entrada')}${col('Fecha de salida', st.fin ? corta(st.fin) : '—', 'as-salida')}${col('Noches', n || '—', 'as-noches')}${col('Personas', st.fin ? st.pers : '—', 'as-personas')}${col(st.aptos > 1 ? 'Apartamentos' : 'Apartamento', apto, 'as-apto')}
    </div>`;
  }

  function desglose() {
    const c = cuenta();
    let d = '<div class="desglose" id="desglose">';
    if (!c.n) d += `<div class="nada">${st.ini ? 'Ahora, el día de salida.' : 'Elige el día de llegada en el calendario.'}</div>`;
    else {
      const ap = plural(st.aptos, 'apartamento', 'apartamentos');
      if (c.baja) d += `<div><span>${plural(c.baja, 'noche', 'noches')} × ${ap} × ${eur(PRECIO.baja)}</span><span>${eur(c.baja * PRECIO.baja * st.aptos)}</span></div>`;
      if (c.alta) d += `<div><span>${plural(c.alta, 'noche', 'noches')} de temporada alta × ${ap} × ${eur(PRECIO.alta)}</span><span>${eur(c.alta * PRECIO.alta * st.aptos)}</span></div>`;
      if (c.unaNoche) d += `<div><span>Suplemento de una sola noche</span><span>${eur(c.unaNoche)}</span></div>`;
      if (c.supl) d += `<div><span>${plural(c.supl, 'supletoria', 'supletorias')} × ${plural(c.n, 'noche', 'noches')} × ${eur(SUPLETORIA)}</span><span>${eur(c.suplementos)}</span></div>`;
      if (st.cunas) d += `<div><span>${plural(st.cunas, 'cuna de viaje', 'cunas de viaje')}</span><span>${eur(c.cunas)}</span></div>`;
      if (st.mascotas) d += `<div><span>Mascotas en ${plural(st.mascotas, 'apartamento', 'apartamentos')}</span><span>${eur(c.mascotas)}</span></div>`;
      d += `<div class="tot"><span>Total estimado</span><span data-total>${eur(c.total)}</span></div>`;
    }
    return d + '</div>';
  }

  function panelFechas() {
    const listo = cuenta().n >= 1;
    return `<h3 id="motor-tit-paso" tabindex="-1">Tus noches</h3>
      ${desglose()}
      <button type="button" class="btn btn--verde" data-acc="seguir" aria-disabled="${!listo}">Seguir: apartamentos y personas</button>
      <p class="motor__fino">Por noche y apartamento: ${eur(PRECIO.baja)} en temporada baja y ${eur(PRECIO.alta)} en alta ${SUP}. Una sola noche lleva un suplemento de ${eur(UNA_NOCHE)} por apartamento ${SUP}.</p>`;
  }
  function selector(etiq, id, valor, accMenos, accMas, minimo, maximo, nota) {
    return `<div class="cifra-sel"><div><small>${etiq}</small><b aria-live="polite" id="${id}">${valor}</b>${nota ? `<small>${nota}</small>` : ''}</div>
      <button type="button" data-acc="${accMenos}" aria-label="${etiq}: uno menos"${valor <= minimo ? ' disabled' : ''}>−</button>
      <button type="button" data-acc="${accMas}" aria-label="${etiq}: uno más"${valor >= maximo ? ' disabled' : ''}>+</button></div>`;
  }
  function panelApartamentos() {
    const max = maxAptos();
    const avisoPref = st.pref === 'planta-baja' && st.aptos > 2 ? '<p class="motor__fino">En planta baja hay dos: Ena te dirá cómo repartiros.</p>'
      : st.pref === 'cama-180' && st.aptos > 2 ? '<p class="motor__fino">Hay dos con cama de 1,80: Ena te dirá cómo repartiros.</p>' : '';
    return `<h3 id="motor-tit-paso" tabindex="-1">Apartamentos y personas</h3>
      ${selector('Apartamentos', 'motor-aptos', st.aptos, 'aptos-menos', 'aptos-mas', 1, max, max < APTOS ? `quedan ${max} libres esas noches` : '')}
      ${selector('Personas', 'motor-pers', st.pers, 'menos', 'mas', 1, maxPers(), `2 por apartamento y hasta 2 supletorias (${eur(SUPLETORIA)} por persona y noche)`)}
      ${st.pers >= maxPers() ? `<p class="motor__fino">Con ${plural(st.aptos, 'apartamento', 'apartamentos')} caben ${maxPers()} personas como mucho.</p>` : ''}
      ${selector('Cunas de viaje', 'motor-cunas', st.cunas, 'cunas-menos', 'cunas-mas', 0, CUNAS, `hay 2 · ${eur(CUNA)} una vez`)}
      ${selector('Apartamentos con mascota', 'motor-mascotas', st.mascotas, 'masc-menos', 'masc-mas', 0, st.aptos, `hasta 3 pequeñas o 2 grandes · ${eur(MASCOTA)} por noche, como mucho ${eur(MASCOTA_TOPE)}`)}
      <fieldset class="preferencia"><legend>Prefiero</legend>
        ${Object.entries(PREF).map(([v, t]) => `<label class="check"><input type="radio" name="m-pref" value="${v}"${st.pref === v ? ' checked' : ''}><span>${t}</span></label>`).join('')}
        <p class="motor__fino">Se apunta como preferencia: Ena te asigna el apartamento que mejor encaje.</p>
        ${avisoPref}
      </fieldset>
      ${desglose()}
      <button type="button" class="btn btn--verde" data-acc="a-datos">Seguir: tus datos</button>
      <button type="button" class="btn btn--linea" data-acc="volver">Cambiar fechas</button>`;
  }
  function panelDatos() {
    const c = cuenta(), v = st.datos;
    const e = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<h3 id="motor-tit-paso" tabindex="-1">Tus datos</h3>
      <p class="motor__fino">${corta(st.ini)} → ${corta(st.fin)} · ${plural(c.n, 'noche', 'noches')} · ${plural(st.aptos, 'apartamento', 'apartamentos')} · ${plural(st.pers, 'persona', 'personas')} · <b>${eur(c.total)}</b></p>
      <form class="form" id="motor-form" novalidate>
        <label for="m-nombre">Nombre y apellidos<input type="text" id="m-nombre" autocomplete="name" required value="${e(v.nombre)}"></label>
        <label for="m-correo">Correo<input type="email" id="m-correo" autocomplete="email" required value="${e(v.correo)}"></label>
        <label for="m-tel">Teléfono<input type="tel" id="m-tel" autocomplete="tel" inputmode="tel" required value="${e(v.tel)}"></label>
        <label for="m-nota">¿Algo que Ena deba saber? <span>(opcional)</span><textarea id="m-nota" rows="2">${e(v.nota)}</textarea></label>
        <label class="check" for="m-ok"><input type="checkbox" id="m-ok" required${v.ok ? ' checked' : ''}><span>He leído la <a class="enlace" href="privacidad.html">política de privacidad</a> y las condiciones de cancelación.</span></label>
        <p class="motor__fino">Se paga al llegar; se pide una tarjeta de débito como garantía. Cancelación: con más de 15 días, sin gastos; entre 15 y 7 días, la mitad; con menos de 7, el importe entero.</p>
        <p class="motor__msg" id="m-error" aria-live="assertive"></p>
        <button type="submit" class="btn btn--verde">Firmar el registro</button>
        ${AVISO}
        <button type="button" class="btn btn--linea" data-acc="volver-apts">Volver</button>
      </form>`;
  }
  function panelHecho() {
    const c = cuenta();
    return `<div class="confirmacion">
      <h3 id="motor-tit-paso" tabindex="-1">Reserva pedida <small>(de demostración)</small></h3>
      <div class="sello${motion ? ' cae' : ''}" id="motor-sello" aria-label="Sello de entrada: del ${larga(st.ini)} al ${larga(st.fin)}"><span class="sello__t">Entrada</span><span class="sello__f">${sello(st.ini)} — ${sello(st.fin)}</span></div>
      <p class="confirmacion__loc" id="motor-loc">${st.loc}</p>
      <p>${larga(st.ini)} → ${larga(st.fin)}<br>${plural(c.n, 'noche', 'noches')} · ${plural(st.aptos, 'apartamento', 'apartamentos')} · ${plural(st.pers, 'persona', 'personas')}${st.cunas ? ' · ' + plural(st.cunas, 'cuna', 'cunas') : ''}${st.mascotas ? ' · con mascota' : ''} · ${eur(c.total)}</p>
      ${st.pref ? `<p>Preferencia apuntada: ${PREF[st.pref].toLowerCase()}. Ena te asigna el que mejor encaje.</p>` : ''}
      <p>Ena te escribiría para confirmarla. Se paga al llegar.</p>
      <p class="motor__fino" id="motor-demo-hecho">Demostración: no se ha enviado, guardado ni cobrado nada. En la web de verdad te llegaría la confirmación por correo.</p>
      <button type="button" class="btn btn--linea" data-acc="otra">Hacer otra reserva</button>
    </div>`;
  }
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pintar(foco) {
    ajustar();
    const y2 = st.m === 11 ? st.y + 1 : st.y, m2 = (st.m + 1) % 12, actual = st.y * 12 + st.m;
    const iPaso = PASOS.findIndex((p) => p[0] === st.paso);
    const pasos = '<ol class="motor__pasos" aria-label="Pasos">' + PASOS.map(([k, t], i) => `<li${i === iPaso ? ' aria-current="step"' : ''}${i < iPaso ? ' class="hecho"' : ''}>${t}</li>`).join('') + '</ol>';
    const panel = { fechas: panelFechas, apartamentos: panelApartamentos, datos: panelDatos, hecho: panelHecho }[st.paso]();
    raiz.innerHTML = asiento() + pasos + `<div class="motor__in">
      <div class="motor__cal"${st.paso !== 'fechas' ? ' inert' : ''}>
        <div class="motor__top"><h3>Noches libres</h3>
          <button type="button" class="motor__nav" data-acc="prev" aria-label="Mes anterior"${actual <= minMes ? ' disabled' : ''}>‹</button>
          <button type="button" class="motor__nav" data-acc="next" aria-label="Mes siguiente"${actual + 1 >= maxMes ? ' disabled' : ''}>›</button></div>
        <div class="motor__meses">${mesHTML(st.y, st.m)}${mesHTML(y2, m2)}</div>
        <div class="motor__ley"><span><i style="background:var(--verde)"></i>Tu estancia</span><span><i class="ley-pocas" style="background:#FFFDF4;box-shadow:inset 0 -3px 0 #FFFDF4,inset 0 -6px 0 var(--linterna-texto)"></i>Quedan 1 o 2</span><span><i style="background:repeating-linear-gradient(135deg,#EDE6CC 0 4px,#DDD5B8 4px 6px)"></i>Completo (de ejemplo)</span><span><i style="background:var(--verde);border-radius:50%;width:6px;height:6px"></i>Temporada alta</span></div>
        <p class="motor__msg" aria-live="polite">${st.msg}</p>
      </div>
      <div class="motor__res">${panel}</div></div>`;
    if (foco) {
      const el = raiz.querySelector(foco);
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* ---------- acciones ---------- */
  raiz.addEventListener('change', (e) => {
    if (e.target.name === 'm-pref') { st.pref = e.target.value; pintar(`input[name="m-pref"][value="${st.pref}"]`); }
  });
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !raiz.contains(b)) return;
    if (b.dataset.k) {
      if (b.getAttribute('aria-disabled') === 'true' || st.paso !== 'fechas') return;
      const k = b.dataset.k;
      st.msg = '';
      if (!st.ini || st.fin || k <= st.ini) {
        if (libres(k) <= 0) return;
        st.ini = k; st.fin = null;
      } else if (minLibresEntre(st.ini, k) <= 0) {
        st.msg = 'Hay noches completas entre medias: elige otra salida.';
        if (libres(k) > 0) { st.ini = k; st.fin = null; }
      } else st.fin = k;
      pintar(`[data-k="${k}"]`);
      return;
    }
    const a = b.dataset.acc;
    if (!a) return;
    let foco = `[data-acc="${a}"]:not(:disabled)`;
    const sube = { 'aptos-mas': ['aptos', 1], 'aptos-menos': ['aptos', -1], mas: ['pers', 1], menos: ['pers', -1], 'cunas-mas': ['cunas', 1], 'cunas-menos': ['cunas', -1], 'masc-mas': ['mascotas', 1], 'masc-menos': ['mascotas', -1] };
    if (sube[a]) {
      const [campo, d] = sube[a];
      st[campo] += d;
      // al añadir un apartamento, sus dos personas también
      if (campo === 'aptos' && d > 0 && st.pers < st.aptos * POR_APTO) st.pers = Math.min(st.pers + POR_APTO, st.aptos * POR_APTO);
    }
    else if (a === 'prev') { if (st.y * 12 + st.m <= minMes) return; if (st.m === 0) { st.m = 11; st.y--; } else st.m--; }
    else if (a === 'next') { if (st.y * 12 + st.m + 1 >= maxMes) return; if (st.m === 11) { st.m = 0; st.y++; } else st.m++; }
    else if (a === 'seguir') {
      if (cuenta().n < 1) { st.msg = st.ini ? 'Falta el día de salida.' : 'Elige primero el día de llegada.'; foco = null; }
      else { st.paso = 'apartamentos'; st.msg = ''; foco = '#motor-tit-paso'; }
    }
    else if (a === 'a-datos') { st.paso = 'datos'; foco = '#motor-tit-paso'; }
    else if (a === 'volver') { st.paso = 'fechas'; foco = '#motor-tit-paso'; }
    else if (a === 'volver-apts') { guardarDatos(); st.paso = 'apartamentos'; foco = '#motor-tit-paso'; }
    else if (a === 'otra') { st.paso = 'fechas'; st.ini = st.fin = null; st.datos = {}; st.cunas = 0; st.mascotas = 0; st.aptos = 1; st.pers = 2; foco = '#motor-tit-paso'; }
    else return;
    pintar(foco);
    if (['seguir', 'a-datos', 'volver', 'volver-apts', 'otra'].includes(a) && A.web && A.web.irA) {
      const r = raiz.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * 0.5) A.web.irA(raiz);
    }
  });

  function guardarDatos() {
    const v = (id) => { const el = raiz.querySelector('#' + id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    if (!raiz.querySelector('#m-nombre')) return;
    st.datos = { nombre: v('m-nombre'), correo: v('m-correo'), tel: v('m-tel'), nota: v('m-nota'), ok: v('m-ok') };
  }

  raiz.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, err = f.querySelector('#m-error');
    guardarDatos();
    const campos = ['m-nombre', 'm-correo', 'm-tel'].map((id) => f.querySelector('#' + id));
    campos.forEach((c) => c.removeAttribute('aria-invalid'));
    const falta = [];
    if (!st.datos.nombre.trim()) falta.push([campos[0], 'el nombre']);
    if (!/^\S+@\S+\.\S{2,}$/.test(st.datos.correo.trim())) falta.push([campos[1], 'un correo válido']);
    if (st.datos.tel.replace(/\D/g, '').length < 9) falta.push([campos[2], 'un teléfono de al menos 9 cifras']);
    if (falta.length) {
      falta.forEach(([c]) => c.setAttribute('aria-invalid', 'true'));
      err.textContent = 'Falta ' + falta.map((x) => x[1]).join(', ') + '.';
      falta[0][0].focus();
      return;
    }
    if (!st.datos.ok) { err.textContent = 'Falta aceptar la política de privacidad.'; f.querySelector('#m-ok').focus(); return; }
    // localizador AHIO-AAMMDD-NNN (de la llegada); en la demostración no se guarda en ningún sitio
    st.loc = 'AHIO-' + st.ini.slice(2).replace(/-/g, '') + '-' + String((entre(st.ini, st.fin) * 37 + st.pers * 11 + st.aptos * 5 + st.datos.nombre.length * 7) % 1000).padStart(3, '0');
    st.paso = 'hecho';
    pintar('#motor-tit-paso');
  });

  // estado inicial de ejemplo: el próximo fin de semana con algún apartamento libre, para dos
  for (let k = mas(hoy, 1), i = 0; i < 150; k = mas(k, 1), i++) {
    if (deClave(k).getDay() === 5 && minLibresEntre(k, mas(k, 2)) >= 1) {
      st.ini = k; st.fin = mas(k, 2);
      const d = deClave(k); st.y = d.getFullYear(); st.m = d.getMonth();
      if (st.y * 12 + st.m + 1 > maxMes) { st.y = b0.getFullYear(); st.m = b0.getMonth(); }
      break;
    }
  }
  pintar();

  // para los módulos (Ahio.reservar('planta-baja'|'duplex'|'cama-180') → apunta la preferencia)
  A.motor = {
    preferir(p) {
      if (!(p in PREF)) return;
      st.pref = p;
      st.msg = '';
      if (st.paso === 'hecho') st.paso = 'fechas';
      pintar();
    },
    get estado() { return { ...st }; },
  };
  // para las pruebas
  window.__motor = { st, libres, estado, esAlta, cuenta, pascua, PRECIO, APTOS, SUPLETORIA, CUNA, MASCOTA, MASCOTA_TOPE, UNA_NOCHE, pintar };
})();
