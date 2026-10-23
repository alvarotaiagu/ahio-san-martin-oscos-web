/* ------------------------------------------------------------------
   Ahío San Martín · módulo «Fachada» (agente Fachada)

   D «Las vidas del edificio»  → montar en [data-modulo="vidas"]
   E «La fachada es el índice» → montar en [data-modulo="indice"]

   Contrato: window.Ahio.fachada.montar(el, { movimiento, densidad, fotos?, svg?, fotosJson? })
   mira el.dataset.modulo; también Ahio.fachada.vidas.montar y Ahio.fachada.indice.montar.
   Devuelve { destruir() }. El HTML de `el` es el respaldo: se oculta solo cuando el módulo
   ya está montado y vuelve con destruir() o si algo falla.

   El dibujo es img/fachada/alzado.svg (scripts/alzado.py): la fachada principal real,
   enderezada y calcada de la foto 2792-DSC09756, y la lateral (la de las ocho ventanas
   iguales, de 1161-fachada-1) en la misma hoja. La principal solo tiene cinco huecos;
   las ocho ventanas del índice son las seis de la primera planta (cuatro de la lateral y
   dos de la principal) y dos de la planta baja de la lateral. Ver ASIGNACION.

   D: fijado con CSS sticky (sin pin-spacer) en escritorio; la placa cambia de rótulo con
   el scroll: AYUNTAMIENTO → y también fue (CENTRO SOCIAL · BIBLIOTECA · CENTRO MÉDICO ·
   CÁRCEL, sin orden) → REFORMADO a principios de los noventa → APARTAMENTOS RURALES CASA
   DE LA VILLA. Ninguna fecha que no esté en ref/DATOS-AHIO.md.
   E: las ventanas son botones; la elegida se enciende con la luz de la linterna y abre su
   ficha. Puerta → recepción y Ena; linterna → salón de arriba; abeto → jardín.

   Con movimiento:false, movimiento reducido o densidad sobria: D en lista (todas las
   vidas con su placa) y E como índice normal (rejilla de botones), todo visible.
   El resize de la barra del móvil no rehace nada (checklist punto 10).
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var guion = document.currentScript && document.currentScript.src;
  var base = function (ruta) {
    try { return guion ? new URL(ruta, guion).href : ruta.replace(/^\.\.\//, ''); } catch (e) { return ruta.replace(/^\.\.\//, ''); }
  };

  /* SUPUESTO (a PENDIENTES.md): no consta qué apartamento da a cada ventana. Las ventanas
     1-2 son de la planta baja (los dos apartamentos sin escaleras) y las 3-8 de la primera
     planta (los seis dúplex). Si Ena dice otra cosa, se cambia SOLO aquí. */
  var ASIGNACION = {
    'ventana-1': { ap: 1, tipo: 'planta-baja' },
    'ventana-2': { ap: 2, tipo: 'planta-baja' },
    'ventana-3': { ap: 3, tipo: 'duplex' },
    'ventana-4': { ap: 4, tipo: 'duplex' },
    'ventana-5': { ap: 5, tipo: 'duplex' },
    'ventana-6': { ap: 6, tipo: 'duplex' },
    'ventana-7': { ap: 7, tipo: 'duplex' },
    'ventana-8': { ap: 8, tipo: 'duplex' }
  };

  // Todo de ref/DATOS-AHIO.md («Los apartamentos», «Zonas comunes y servicios»).
  var EN_TODOS = [
    'Cama de matrimonio, y hasta 2 supletorias en el salón-cocina',
    'Baño completo con bañera',
    'Cocina con horno, vitrocerámica, microondas, nevera, cafetera italiana y tostadora',
    'Televisión, ropa de cama y menaje',
    'Calefacción central; cuna de viaje si la pides'
  ];
  var TIPOS = {
    'planta-baja': {
      nombre: 'planta baja',
      titulo: 'En planta baja, sin escaleras',
      desc: 'Dos de los ocho apartamentos están en la planta baja: todo a un nivel, sin escaleras. Salón-cocina, un dormitorio con cama de matrimonio y baño completo con bañera.',
      fotos: ['ap-salon', 'ap-completo', 'ap-dormitorio', 'ap-ventana'],
      notaFotos: 'Las fotos son del apartamento 1.',
      reservar: 'planta-baja'
    },
    duplex: {
      nombre: 'dúplex',
      titulo: 'Dúplex, con el dormitorio arriba',
      desc: 'Seis de los ocho están en la primera planta y son dúplex: abajo el salón-cocina y arriba el dormitorio, con su baño en suite. Dos de los dúplex tienen cama de 1,80.',
      fotos: ['duplex-dormitorio', 'duplex-cama', 'duplex-velux', 'duplex-bajo-cubierta', 'bano'],
      notaFotos: 'Fotos de los dúplex; casi todas, del apartamento 7.',
      reservar: 'duplex',
      extra: { texto: 'Prefiero cama de 1,80', reservar: 'cama-180' }
    }
  };
  var ZONAS = {
    puerta: {
      etiqueta: 'La puerta: la recepción y Ena',
      titulo: 'La puerta: la recepción y Ena',
      desc: 'Detrás de la puerta de arco está la recepción, «para bienvenida y atención personalizada». Ahí te recibe Ena Mateos. Entrada desde las 16:00 y salida hasta las 12:00; si lo prefieres, check-in automático: recoges tú las llaves.',
      fotos: ['recepcion', 'ena-abre', 'ena-puerta'],
      enlace: { texto: 'Conoce a Ena', href: '#ena' }
    },
    linterna: {
      etiqueta: 'La linterna: el salón de arriba',
      titulo: 'La linterna: el salón de arriba',
      desc: 'Arriba, bajo la cubierta, hay un salón común: cerchas de madera a la vista, muros de pizarra, suelo de vidrio y butacas. En el salón de arriba hay juegos para los niños. Hay otro salón, con sofás rojos y una pared de piedra.',
      fotos: ['salon-alto', 'butacas', 'salon-piedra']
    },
    jardin: {
      etiqueta: 'El abeto: el jardín y la terraza',
      titulo: 'El abeto: el jardín y la terraza',
      desc: 'Alrededor de la casa, jardín con caminos de losa y árboles, y una terraza rodeada de árboles con mesas y sillas. Aparcamiento gratis al aire libre.',
      fotos: ['jardin', 'plaza']
    }
  };
  var ALT = {
    'ap-salon': 'Salón comedor del apartamento 1',
    'ap-completo': 'El apartamento 1 entero: la cocina, el salón y, al fondo, el dormitorio',
    'ap-dormitorio': 'Dormitorio del apartamento 1, con cama de matrimonio',
    'ap-ventana': 'Ventana abierta del dormitorio del apartamento 1, que da al jardín',
    'duplex-dormitorio': 'Dormitorio abuhardillado del apartamento 7, con la luz de la ventana',
    'duplex-cama': 'Dormitorio del apartamento 7, con el baño en suite',
    'duplex-velux': 'Dormitorio de un dúplex con una ventana en el tejado',
    'duplex-bajo-cubierta': 'Dormitorio de un dúplex bajo las vigas de madera',
    bano: 'Baño del apartamento 7',
    recepcion: 'La recepción: un mueble antiguo, el libro y un cuadro con el logo',
    'ena-abre': 'Ena Mateos abriendo la puerta de madera de la casa',
    'ena-puerta': 'Ena Mateos delante de la puerta, con un cuadro del logo',
    'salon-alto': 'Salón común bajo la cubierta: cerchas de madera, muros de pizarra, suelo de vidrio y una butaca roja',
    butacas: 'Butacas al sol contra el muro de pizarra',
    'salon-piedra': 'El otro salón común, con sofás rojos y una pared de piedra',
    jardin: 'El jardín, con caminos de losa y una farola',
    plaza: 'La fachada desde la plaza empedrada, con su dibujo circular y la farola',
    'fachada-frente': 'La fachada principal de frente: muros de pizarra, la cornisa clara, la placa «Apartamentos rurales Casa de la Villa», el balcón y la puerta de arco',
    antiguo: 'Foto antigua en blanco y negro: una calle mojada de San Martín de Oscos, una mujer que camina y, al fondo, el edificio'
  };

  /* Las vidas (D). Los rótulos son los de la placa; ninguna fecha. */
  var USOS = ['CENTRO SOCIAL', 'BIBLIOTECA', 'CENTRO MÉDICO', 'CÁRCEL'];
  var VIDAS = [
    { placa: ['AYUNTAMIENTO'], titulo: 'Fue el ayuntamiento',
      texto: 'Lo levantaron a principios del siglo XX, en pizarra y piedra, y fue el ayuntamiento de San Martín de Oscos. Tiene más de cien años.' },
    { placa: ['Y TAMBIÉN FUE'], titulo: 'Y también fue…', usos: true,
      texto: 'Turismo Asturias cuenta que el edificio también albergó el centro social, la biblioteca, el centro médico y la cárcel. En qué orden y en qué años, no consta.' },
    { placa: ['REFORMADO', 'A PRINCIPIOS DE LOS NOVENTA'], titulo: 'Reformado a principios de los noventa',
      texto: 'Se restauró por completo a principios de los noventa: piedra, madera y pizarra, y vigas de más de cien años.' },
    { placa: ['APARTAMENTOS RURALES', 'CASA DE LA VILLA'], titulo: 'Hoy, ocho apartamentos rurales', real: true,
      texto: 'Es la placa que tiene hoy la fachada. Desde 2022 los lleva Ena Mateos, de Santa Eulalia de Oscos: «Mi sueño se cumplió en 2022».' }
  ];
  // tramos del progreso (0..1) de la sección fijada
  var CORTES = [0.2, 0.58, 0.8];
  var TRAMO_USO = 0.095;
  var TEXTURA = [0.6, 0.76];
  var LUCES = [0.81, 0.97];

  var lim = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var tramo = function (v, a) { return lim((v - a[0]) / (a[1] - a[0])); };
  var escapar = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var cache = {};
  var pedir = function (url, tipo) {
    if (!cache[url]) {
      cache[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error(url + ' ' + r.status);
        return tipo === 'json' ? r.json() : r.text();
      });
      cache[url].catch(function () { delete cache[url]; });
    }
    return cache[url];
  };

  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var quietoDe = function (opc) {
    return opc.movimiento === false || reduceMq.matches || opc.densidad === 'sobria' || document.documentElement.classList.contains('densidad-sobria');
  };

  var stickyRoto = function (el) {
    if (document.documentElement.classList.contains('cortina-activa')) return false;
    var htmlVisible = getComputedStyle(document.documentElement).overflowY === 'visible';
    for (var n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      if (n === document.body && htmlVisible) continue;
      var cs = getComputedStyle(n);
      if (/(hidden|auto|scroll)/.test(cs.overflowX + ' ' + cs.overflowY)) return true;
    }
    return false;
  };

  /* ---------- el SVG: se clona con un prefijo en los ids (D y E pueden convivir) */
  var hacerSvg = function (texto, prefijo) {
    var cont = document.createElement('div');
    cont.innerHTML = texto.replace(/^[\s\S]*?(<svg)/, '$1');
    var svg = cont.querySelector('svg');
    if (!svg) throw new Error('alzado sin <svg>');
    if (prefijo) {
      Array.prototype.forEach.call(svg.querySelectorAll('[id]'), function (n) { n.id = prefijo + n.id; });
      Array.prototype.forEach.call(svg.querySelectorAll('[filter]'), function (n) { n.setAttribute('filter', n.getAttribute('filter').replace('#', '#' + prefijo)); });
    }
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('xmlns');
    var t = svg.querySelector('title');
    if (t) t.parentNode.removeChild(t);
    // el halo de las luces: filtro del propio SVG (más compatible que filter:blur en SVG)
    var idHalo = (prefijo || '') + 'fx-halo';
    Array.prototype.forEach.call(svg.querySelectorAll('.luz'), function (n) { n.setAttribute('filter', 'url(#' + idHalo + ')'); });
    return svg;
  };
  var hoja = function (svg) {
    return {
      xl: +svg.getAttribute('data-x-lateral'), xp: +svg.getAttribute('data-x-principal'),
      ancho: +svg.getAttribute('data-ancho-cara'), suelo: +svg.getAttribute('data-suelo'),
      vb: svg.getAttribute('data-hoja').split(' ').map(Number)
    };
  };

  /* ---------- fotos: opc.fotos (nombre → url), el respaldo (por nombre) o img/fotos/fotos.json */
  var buscarFoto = function (respaldo, nombre) {
    if (!respaldo) return null;
    var imgs = respaldo.querySelectorAll('img');
    var re = new RegExp('(^|/)' + nombre + '-\\d+\\.');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var src = (im.getAttribute('src') || '') + ' ' + (im.getAttribute('srcset') || '');
      if (re.test(src) || im.getAttribute('data-foto') === nombre) return im.closest('picture') || im;
    }
    return null;
  };
  var hacerFoto = function (nombre, sizes, ctx, carga) {
    var alt = ALT[nombre] || '';
    var img;
    if (ctx.opc.fotos && ctx.opc.fotos[nombre]) {
      img = document.createElement('img');
      img.src = ctx.opc.fotos[nombre];
      img.alt = alt; img.decoding = 'async'; img.loading = carga || 'lazy';
      img.setAttribute('data-foto', nombre);
      return img;
    }
    var info = null;
    if (ctx.fotosJson) for (var j = 0; j < ctx.fotosJson.length; j++) if (ctx.fotosJson[j].nombre === nombre) info = ctx.fotosJson[j];
    if (!info) {
      var del = buscarFoto(ctx.respaldo, nombre);
      if (del) {
        var cl = del.cloneNode(true);
        var im = cl.tagName === 'IMG' ? cl : cl.querySelector('img');
        if (im) { im.alt = alt; im.setAttribute('sizes', sizes); im.loading = carga || 'lazy'; im.removeAttribute('class'); im.setAttribute('data-foto', nombre); }
        Array.prototype.forEach.call(cl.querySelectorAll ? cl.querySelectorAll('source') : [], function (s) { s.setAttribute('sizes', sizes); });
        return cl;
      }
    }
    var dir = ctx.opc.base || base('../img/fotos/');
    var anchos = info ? info.anchos : [800];
    var set = function (ext) { return anchos.map(function (a) { return dir + nombre + '-' + a + '.' + ext + ' ' + a + 'w'; }).join(', '); };
    var pic = document.createElement('picture');
    if (info) {
      ['avif', 'webp'].forEach(function (ext) {
        var so = document.createElement('source');
        so.type = 'image/' + ext; so.srcset = set(ext); so.sizes = sizes;
        pic.appendChild(so);
      });
    }
    img = document.createElement('img');
    img.src = dir + nombre + '-' + anchos[Math.min(1, anchos.length - 1)] + '.jpg';
    if (info) {
      img.srcset = set('jpg'); img.sizes = sizes;
      img.width = info.ancho; img.height = info.alto;
    }
    img.alt = alt; img.loading = carga || 'lazy'; img.decoding = 'async';
    img.setAttribute('data-foto', nombre);
    pic.appendChild(img);
    return pic;
  };

  var reservar = function (pref, ev) {
    var A = window.Ahio;
    if (A && typeof A.reservar === 'function') {
      if (ev) ev.preventDefault();
      A.reservar(pref);
    }
  };

  /* ---------- montaje común: respaldo, carga y errores */
  var preparar = function (el, opciones, construir, nombre) {
    var opc = opciones || {};
    if (!el || el.dataset.montado === '1') return { destruir: function () {} };
    var ctx = { el: el, opc: opc, vivo: true, limpiar: [], respaldoNodos: [], nodo: null, respaldo: null, fotosJson: null };
    var svgUrl = opc.svg || base('../img/fachada/alzado.svg');
    var fotosUrl = opc.fotosJson || base('../img/fotos/fotos.json');
    Promise.all([pedir(svgUrl), pedir(fotosUrl, 'json').catch(function () { return null; })]).then(function (res) {
      if (!ctx.vivo) return;
      ctx.fotosJson = res[1];
      ctx.respaldo = document.createElement('div');
      Array.prototype.forEach.call(el.children, function (n) { ctx.respaldo.appendChild(n.cloneNode(true)); });
      construir(ctx, res[0]);
      ctx.respaldoNodos = Array.prototype.slice.call(el.children).filter(function (n) { return n !== ctx.nodo; }).map(function (n) { var h = n.hidden; n.hidden = true; return { n: n, h: h }; });
      el.dataset.montado = '1';
      if (ctx.alMontar) ctx.alMontar();
    }).catch(function (err) {
      if (ctx.nodo && ctx.nodo.parentNode) ctx.nodo.parentNode.removeChild(ctx.nodo);
      ctx.respaldoNodos.forEach(function (r) { r.n.hidden = r.h; });
      delete el.dataset.montado;
      if (window.console) console.warn('[fachada:' + nombre + '] se queda el respaldo:', err && err.message);
    });
    return {
      destruir: function () {
        ctx.vivo = false;
        ctx.limpiar.forEach(function (f) { try { f(); } catch (e) {} });
        if (ctx.nodo && ctx.nodo.parentNode) ctx.nodo.parentNode.removeChild(ctx.nodo);
        ctx.respaldoNodos.forEach(function (r) { r.n.hidden = r.h; });
        delete el.dataset.montado;
      }
    };
  };

  /* =================================================================== D · las vidas */
  function montarVidas(el, opciones) {
    return preparar(el, opciones, function (ctx, textoSvg) {
      var opc = ctx.opc;
      var raiz = document.documentElement;
      var modo = '', raf = 0, enVista = false;
      var anchoVista = innerWidth, altoVista = innerHeight;
      var ult = { vida: -1, rotulo: '', tx: '', luces: '' };

      var nodo = document.createElement('div');
      nodo.className = 'fx-vidas';
      var h = '<div class="fx-vidas-pista"><div class="fx-vidas-escena">';
      h += '<div class="fx-vidas-arte"><figure class="fx-vidas-lamina"><div class="fx-vidas-dibujo"></div>' +
        '<figcaption class="fx-pie">Alzado de la fachada principal, dibujado a partir de una foto suya.</figcaption></figure>';
      h += '<figure class="fx-vidas-foto"><div class="fx-vidas-foto-marco"></div><figcaption class="fx-pie">La fachada principal, hoy.</figcaption></figure></div>';
      h += '<div class="fx-vidas-texto">';
      h += '<div class="fx-placa fx-placa--grande" aria-hidden="true"><div class="fx-placa-cara es-activa"></div><div class="fx-placa-cara"></div><i class="fx-placa-brillo"></i></div>';
      h += '<ol class="fx-vidas-lista">';
      VIDAS.forEach(function (v, i) {
        h += '<li class="fx-vida" data-vida="' + i + '">';
        h += '<div class="fx-placa fx-placa--mini' + (v.real ? ' fx-placa--real' : '') + '" aria-hidden="true"><div class="fx-placa-cara es-activa">' + v.placa.map(function (l, k) { return '<span class="fx-placa-l' + (k + 1) + (v.usos ? ' fx-placa-ante' : '') + '">' + escapar(l) + '</span>'; }).join('') +
          (v.usos ? '<span class="fx-placa-uso fx-placa-uso--lista">' + USOS.map(escapar).join(' · ') + '</span>' : '') + '</div><i class="fx-placa-brillo"></i></div>';
        h += '<h3 class="fx-vida-titulo">' + escapar(v.titulo) + '</h3>';
        if (v.usos) h += '<ul class="fx-usos" aria-label="Otros usos, sin orden">' + USOS.map(function (u) { return '<li>' + escapar(u.charAt(0) + u.slice(1).toLowerCase()) + '</li>'; }).join('') + '</ul>';
        h += '<p class="fx-vida-texto">' + escapar(v.texto) + '</p>';
        if (i === 0) h += '<figure class="fx-antiguo"><div class="fx-antiguo-papel"></div><figcaption><q>Antiguo ayuntamiento. Al fondo de la imagen, se ve el edificio donde hoy en día se encuentra Ahío San Martín.</q> <span class="fx-antiguo-fuente">Pie de la foto en la web de Ahío; autor por confirmar.</span></figcaption></figure>';
        h += '</li>';
      });
      h += '</ol>';
      h += '<div class="fx-vidas-marcas" aria-hidden="true">' + VIDAS.map(function () { return '<i></i>'; }).join('') + '</div>';
      h += '</div></div></div>';
      nodo.innerHTML = h;
      ctx.nodo = nodo;

      // dibujo: solo la cara principal, recortada
      var svg = hacerSvg(textoSvg, 'vidas-');
      var H = hoja(svg);
      svg.querySelector('#vidas-cara-lateral').setAttribute('display', 'none');
      var vb = [H.xp - 95, -185, H.ancho + 190, H.suelo + 125 + 185];
      svg.setAttribute('viewBox', vb.join(' '));
      var papel = svg.querySelector('#vidas-papel');
      papel.setAttribute('x', vb[0]); papel.setAttribute('y', vb[1]); papel.setAttribute('width', vb[2]); papel.setAttribute('height', vb[3]);
      svg.classList.add('alzado--vidas');
      nodo.querySelector('.fx-vidas-dibujo').appendChild(svg);
      var placaSvg = svg.querySelector('#vidas-placa-texto');
      var luces = ['#vidas-ventana-7', '#vidas-ventana-p-baja-izq', '#vidas-ventana-balcon', '#vidas-ventana-p-baja-der', '#vidas-ventana-8', '#vidas-puerta']
        .map(function (s) { return svg.querySelector(s); }).filter(Boolean);
      var linterna = svg.querySelector('#vidas-linterna');

      // fotos
      nodo.querySelector('.fx-vidas-foto-marco').appendChild(hacerFoto('fachada-frente', '(min-width: 900px) 30vw, calc(100vw - 32px)', ctx));
      var ant = hacerFoto('antiguo', '248px', ctx);
      var antImg = ant.tagName === 'IMG' ? ant : ant.querySelector('img');
      if (antImg) { antImg.removeAttribute('sizes'); antImg.removeAttribute('srcset'); Array.prototype.forEach.call(ant.querySelectorAll ? ant.querySelectorAll('source') : [], function (s) { s.removeAttribute('sizes'); s.srcset = s.srcset.split(',')[0].split(' ')[0]; }); }
      nodo.querySelector('.fx-antiguo-papel').appendChild(ant);

      var pista = nodo.querySelector('.fx-vidas-pista');
      var escena = nodo.querySelector('.fx-vidas-escena');
      var placa = nodo.querySelector('.fx-placa--grande');
      var caras = placa.querySelectorAll('.fx-placa-cara');
      var items = nodo.querySelectorAll('.fx-vida');
      var marcas = nodo.querySelectorAll('.fx-vidas-marcas i');
      var usos = nodo.querySelectorAll('.fx-usos li');

      var ponerPlacaSvg = function (lineas) {
        if (!placaSvg) return;
        var ts = placaSvg.querySelectorAll('tspan');
        var dos = lineas.length > 1;
        ts[0].textContent = lineas[0];
        ts[1].textContent = dos ? lineas[1] : '';
        ts[0].setAttribute('dy', dos ? '-6' : '9');
        // que quepa en la placa (172 unidades de ancho útil)
        var largo = Math.max.apply(null, lineas.map(function (l) { return l.length; }));
        placaSvg.style.fontSize = Math.min(dos ? 21 : 26, 168 / (largo * 0.72)).toFixed(1) + 'px';
      };
      var brillo = function (p) {
        p.classList.remove('es-brillo');
        void p.offsetWidth; // reinicia la animación
        p.classList.add('es-brillo');
      };
      var caraActiva = 0;
      var ponerRotulo = function (lineas, real, uso) {
        var clave = lineas.join('|') + (uso != null ? '|' + uso : '');
        if (clave === ult.rotulo) return;
        var abajo = ult.rotulo !== '';
        ult.rotulo = clave;
        var html = lineas.map(function (l, k) { return '<span class="fx-placa-l' + (k + 1) + (uso != null ? ' fx-placa-ante' : '') + '">' + escapar(l) + '</span>'; }).join('');
        if (uso != null) html += '<span class="fx-placa-uso">' + escapar(USOS[uso]) + '</span>';
        var nueva = caras[1 - caraActiva], vieja = caras[caraActiva];
        nueva.innerHTML = html;
        nueva.classList.add('es-activa'); vieja.classList.remove('es-activa');
        caraActiva = 1 - caraActiva;
        placa.classList.toggle('fx-placa--real', !!real);
        svg.classList.toggle('placa-laton', !real);
        if (abajo && modo === 'fijo') brillo(placa);
        ponerPlacaSvg(uso != null ? [USOS[uso]] : lineas);
        nodo.dataset.rotulo = (uso != null ? USOS[uso] : lineas.join(' '));
      };

      var progreso = function () {
        var r = pista.getBoundingClientRect();
        var top = parseFloat(getComputedStyle(escena).top) || 0;
        var rec = pista.offsetHeight - escena.offsetHeight;
        return rec > 0 ? lim((top - r.top) / rec) : 0;
      };
      var pintar = function (p) {
        var vida = p < CORTES[0] ? 0 : p < CORTES[1] ? 1 : p < CORTES[2] ? 2 : 3;
        var uso = vida === 1 ? Math.min(USOS.length - 1, Math.floor((p - CORTES[0]) / TRAMO_USO)) : null;
        if (vida !== ult.vida || uso !== ult.uso) {
          ult.vida = vida; ult.uso = uso;
          for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle('es-activa', i === vida);
            marcas[i].classList.toggle('es-activa', i === vida);
            marcas[i].classList.toggle('es-pasada', i < vida);
          }
          for (var k = 0; k < usos.length; k++) usos[k].classList.toggle('es-activo', k === uso);
          ponerRotulo(VIDAS[vida].placa, VIDAS[vida].real, uso);
          nodo.dataset.vida = String(vida);
        }
        var tx = tramo(p, TEXTURA).toFixed(3);
        if (tx !== ult.tx) { ult.tx = tx; svg.style.setProperty('--tx', tx); }
        var l = tramo(p, LUCES);
        var n = Math.round(l * (luces.length + 1));
        var clave = String(n);
        if (clave !== ult.luces) {
          ult.luces = clave;
          if (linterna) linterna.classList.toggle('es-encendida', n > 0);
          for (var j = 0; j < luces.length; j++) luces[j].classList.toggle('es-encendida', n > j + 1);
          nodo.dataset.luces = clave;
        }
        nodo.dataset.progreso = p.toFixed(3);
      };
      var quieto = function () {
        ult = { vida: -1, rotulo: '', tx: '', luces: '' };
        for (var i = 0; i < items.length; i++) items[i].classList.add('es-activa');
        for (var k = 0; k < usos.length; k++) usos[k].classList.remove('es-activo');
        svg.style.setProperty('--tx', '1');
        if (linterna) linterna.classList.add('es-encendida');
        luces.forEach(function (x) { x.classList.remove('es-encendida'); });
        ponerPlacaSvg(VIDAS[3].placa);
        svg.classList.remove('placa-laton');
        nodo.dataset.vida = 'todas';
        nodo.dataset.rotulo = VIDAS[3].placa.join(' ');
        nodo.dataset.progreso = '1';
      };

      var alScroll = function () {
        if (modo !== 'fijo' || !enVista || raf) return;
        raf = requestAnimationFrame(function () { raf = 0; if (ctx.vivo && modo === 'fijo') pintar(progreso()); });
      };
      var ponerModo = function () {
        var q = quietoDe(opc);
        var nuevo = q ? 'quieto' : (innerWidth >= 900 && innerHeight >= 560 && !stickyRoto(nodo) ? 'fijo' : 'suelto');
        if (nuevo === modo) return;
        modo = nuevo;
        nodo.dataset.modo = nuevo;
        nodo.classList.toggle('fx-vidas--fijo', nuevo === 'fijo');
        nodo.classList.toggle('fx-vidas--suelto', nuevo === 'suelto');
        nodo.classList.toggle('fx-vidas--quieto', nuevo === 'quieto');
        if (nuevo === 'fijo') {
          for (var i = 0; i < items.length; i++) items[i].classList.remove('es-activa');
          ult = { vida: -1, rotulo: '', tx: '', luces: '' };
          pintar(progreso());
        } else quieto();
        if (window.ScrollTrigger) { try { window.ScrollTrigger.refresh(); } catch (e) {} }
      };
      var alResize = function () {
        if (innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160) return;
        anchoVista = innerWidth; altoVista = innerHeight;
        ponerModo(); alScroll();
      };

      el.appendChild(nodo);
      ctx.alMontar = function () {
        ponerModo();
        // en suelto (móvil), cada placa brilla una vez al entrar
        var ioPl = new IntersectionObserver(function (ent) {
          ent.forEach(function (e) {
            if (e.isIntersecting && modo === 'suelto') { brillo(e.target); ioPl.unobserve(e.target); }
          });
        }, { rootMargin: '0px 0px -25% 0px' });
        Array.prototype.forEach.call(nodo.querySelectorAll('.fx-placa--mini'), function (p) { ioPl.observe(p); });
        var io = new IntersectionObserver(function (ent) {
          ent.forEach(function (e) { enVista = e.isIntersecting; });
          if (enVista) alScroll();
        }, { rootMargin: '40% 0px 40% 0px' });
        io.observe(nodo);
        window.addEventListener('scroll', alScroll, { passive: true });
        window.addEventListener('resize', alResize);
        var mo = new MutationObserver(function () { ponerModo(); alScroll(); });
        mo.observe(raiz, { attributes: true, attributeFilter: ['class'] });
        var alMq = function () { ponerModo(); };
        if (reduceMq.addEventListener) reduceMq.addEventListener('change', alMq);
        ctx.limpiar.push(function () {
          io.disconnect(); ioPl.disconnect(); mo.disconnect();
          if (raf) cancelAnimationFrame(raf);
          window.removeEventListener('scroll', alScroll); window.removeEventListener('resize', alResize);
          if (reduceMq.removeEventListener) reduceMq.removeEventListener('change', alMq);
          if (window.ScrollTrigger) { try { window.ScrollTrigger.refresh(); } catch (e) {} }
        });
        alScroll();
      };
    }, 'vidas');
  }

  /* =================================================================== E · el índice */
  function montarIndice(el, opciones) {
    return preparar(el, opciones, function (ctx, textoSvg) {
      var opc = ctx.opc;
      var raiz = document.documentElement;
      var modo = '', forma = '';
      var anchoVista = innerWidth;
      var elegida = null;
      var tocado = false;
      var temporizadores = [];

      var nodo = document.createElement('div');
      nodo.className = 'fx-indice';
      var h = '';
      h += '<p class="fx-indice-guia">Cada ventana es un apartamento: tócala y se enciende. La puerta lleva a la recepción, la linterna al salón de arriba y el abeto al jardín.</p>';
      h += '<div class="fx-alzado"><div class="fx-botones"></div></div>';
      h += '<p class="fx-nota">Ocho apartamentos dobles: dos en planta baja y seis dúplex. Cada ventana es una forma de enseñarlos; Ena te asigna el que mejor encaje.</p>';
      h += '<ul class="fx-rejilla" aria-label="Apartamentos y zonas comunes"></ul>';
      h += '<p class="fx-estado" role="status" aria-live="polite"></p>';
      h += '<section class="fx-ficha" id="fx-ficha" tabindex="-1" aria-labelledby="fx-ficha-t"></section>';
      nodo.innerHTML = h;
      ctx.nodo = nodo;

      var svg = hacerSvg(textoSvg, '');
      var H = hoja(svg);
      svg.classList.add('alzado--indice');
      var alzado = nodo.querySelector('.fx-alzado');
      alzado.insertBefore(svg, alzado.firstChild);
      var capa = nodo.querySelector('.fx-botones');
      var rejilla = nodo.querySelector('.fx-rejilla');
      var ficha = nodo.querySelector('.fx-ficha');
      var estado = nodo.querySelector('.fx-estado');
      var caraL = svg.querySelector('#cara-lateral');
      var caraP = svg.querySelector('#cara-principal');
      var papel = svg.querySelector('#papel');
      var linterna = svg.querySelector('#linterna');
      if (linterna) linterna.classList.add('es-viva');

      // las piezas que se pueden tocar, en orden de lectura
      var PIEZAS = [];
      Object.keys(ASIGNACION).sort(function (a, b) { return ASIGNACION[a].ap - ASIGNACION[b].ap; }).forEach(function (id) {
        var a = ASIGNACION[id], t = TIPOS[a.tipo];
        PIEZAS.push({ id: id, clave: 'ap-' + a.ap, etiqueta: 'Apartamento ' + a.ap + ', ' + t.nombre, corta: 'Apartamento ' + a.ap, sub: t.nombre, ap: a.ap, tipo: a.tipo });
      });
      [['puerta', 'puerta'], ['linterna', 'linterna'], ['jardin', 'jardin']].forEach(function (z) {
        PIEZAS.push({ id: z[0], clave: z[1], etiqueta: ZONAS[z[1]].etiqueta, corta: ZONAS[z[1]].etiqueta.split(':')[0], sub: ZONAS[z[1]].etiqueta.split(': ')[1], zona: z[1] });
      });
      PIEZAS.forEach(function (p) {
        p.g = svg.querySelector('#' + p.id);
        p.cara = p.g ? p.g.closest('.cara') : null;
        var c = p.g ? (p.g.getAttribute('data-caja') || '0 0 0 0').split(' ').map(Number) : [0, 0, 0, 0];
        p.caja = c;
        // botón sobre el dibujo
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fx-hueco' + (p.zona ? ' fx-hueco--zona fx-hueco--' + p.zona : '');
        b.setAttribute('aria-label', p.etiqueta);
        b.setAttribute('aria-controls', 'fx-ficha');
        b.setAttribute('aria-pressed', 'false');
        b.dataset.pieza = p.clave;
        capa.appendChild(b);
        p.boton = b;
        // la misma pieza en la rejilla (índice normal sin movimiento)
        var li = document.createElement('li');
        var b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'fx-rejilla-boton';
        b2.setAttribute('aria-controls', 'fx-ficha');
        b2.setAttribute('aria-pressed', 'false');
        b2.dataset.pieza = p.clave;
        b2.innerHTML = '<span class="fx-rejilla-num">' + (p.ap ? p.ap : '·') + '</span><span class="fx-rejilla-nom">' + escapar(p.corta) + '</span><span class="fx-rejilla-sub">' + escapar(p.sub || '') + '</span>';
        li.appendChild(b2);
        rejilla.appendChild(li);
        p.boton2 = b2;
      });
      var porClave = {};
      PIEZAS.forEach(function (p) { porClave[p.clave] = p; });

      /* ---------- colocación de los botones (en % de la hoja) y forma de la hoja */
      var colocar = function () {
        var alto = alzado.clientWidth < 760;
        var nueva = alto ? 'alta' : 'ancha';
        if (nueva !== forma) {
          forma = nueva;
          var vb;
          if (alto) {
            // una cara debajo de la otra
            var dy = H.vb[3];
            caraL.setAttribute('transform', 'translate(' + H.xl + ' 0)');
            caraP.setAttribute('transform', 'translate(' + H.xl + ' ' + dy + ')');
            vb = [0, H.vb[1], H.xl + H.ancho + 110, H.vb[3] * 2];
          } else {
            caraL.setAttribute('transform', 'translate(' + H.xl + ' 0)');
            caraP.setAttribute('transform', 'translate(' + H.xp + ' 0)');
            vb = H.vb.slice();
          }
          svg.setAttribute('viewBox', vb.join(' '));
          papel.setAttribute('x', vb[0]); papel.setAttribute('y', vb[1]); papel.setAttribute('width', vb[2]); papel.setAttribute('height', vb[3]);
          alzado.style.aspectRatio = vb[2] + ' / ' + vb[3];
          svg.classList.toggle('alzado--alto', alto);
          nodo.dataset.forma = forma;
          PIEZAS.forEach(function (p) {
            if (!p.cara) return;
            var t = (p.cara.getAttribute('transform') || '').match(/-?\d+(\.\d+)?/g) || [0, 0];
            var tx = +t[0], ty = +(t[1] || 0);
            var pad = p.zona ? 10 : 34, padY = p.zona ? 10 : 22;
            var x = tx + p.caja[0] - pad - vb[0], y = ty + p.caja[1] - padY - vb[1];
            var w = p.caja[2] + 2 * pad, hh = p.caja[3] + 2 * padY;
            var s = p.boton.style;
            s.left = (x / vb[2] * 100).toFixed(3) + '%';
            s.top = (y / vb[3] * 100).toFixed(3) + '%';
            s.width = (w / vb[2] * 100).toFixed(3) + '%';
            s.height = (hh / vb[3] * 100).toFixed(3) + '%';
          });
        }
      };

      /* ---------- la ficha */
      var hacerFotos = function (lista, cont) {
        var grande = document.createElement('div');
        grande.className = 'fx-ficha-grande';
        var mini = document.createElement('ul');
        mini.className = 'fx-ficha-minis';
        var poner = function (nombre) {
          grande.innerHTML = '';
          var f = hacerFoto(nombre, '(min-width: 900px) 46vw, calc(100vw - 32px)', ctx, 'eager');
          grande.appendChild(f);
          grande.dataset.foto = nombre;
          Array.prototype.forEach.call(mini.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.foto === nombre ? 'true' : 'false'); });
        };
        lista.forEach(function (nombre) {
          var li = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'fx-ficha-mini';
          b.dataset.foto = nombre;
          b.setAttribute('aria-label', 'Ver foto: ' + (ALT[nombre] || nombre));
          var f = hacerFoto(nombre, '120px', ctx);
          var im = f.tagName === 'IMG' ? f : f.querySelector('img');
          if (im) im.alt = '';
          b.appendChild(f);
          b.addEventListener('click', function () { poner(nombre); });
          li.appendChild(b);
          mini.appendChild(li);
        });
        cont.appendChild(grande);
        if (lista.length > 1) cont.appendChild(mini);
        poner(lista[0]);
      };
      var accion = function (texto, pref, clase) {
        var a = document.createElement('a');
        a.href = '#reservar';
        a.className = 'fx-boton' + (clase ? ' ' + clase : '');
        a.textContent = texto;
        if (pref) a.dataset.reservar = pref;
        a.addEventListener('click', function (ev) { reservar(pref || undefined, ev); });
        return a;
      };
      var pintarFicha = function (p) {
        ficha.innerHTML = '';
        ficha.dataset.pieza = p ? p.clave : '';
        var txt = document.createElement('div');
        txt.className = 'fx-ficha-texto';
        var fotos = document.createElement('div');
        fotos.className = 'fx-ficha-fotos';
        var h3 = document.createElement('h3');
        h3.id = 'fx-ficha-t';
        h3.className = 'fx-ficha-titulo';
        var acc = document.createElement('div');
        acc.className = 'fx-ficha-acciones';
        if (!p) {
          ficha.dataset.tipo = '';
          h3.textContent = 'Ocho apartamentos dobles';
          txt.innerHTML = '<p class="fx-ficha-ante">La fachada es el índice</p>';
          txt.appendChild(h3);
          txt.insertAdjacentHTML('beforeend', '<p class="fx-ficha-desc">Dos en planta baja, sin escaleras, y seis dúplex en la primera planta, con el dormitorio y el baño arriba. Toca una ventana para ver cómo son por dentro.</p>' +
            '<ul class="fx-ficha-datos">' + EN_TODOS.map(function (d) { return '<li>' + escapar(d) + '</li>'; }).join('') + '</ul>');
          acc.appendChild(accion('Ver fechas', null));
          txt.appendChild(acc);
          ficha.appendChild(txt);
          ficha.classList.add('fx-ficha--inicio');
          return;
        }
        ficha.classList.remove('fx-ficha--inicio');
        if (p.ap) {
          var t = TIPOS[p.tipo];
          ficha.dataset.tipo = p.tipo;
          txt.innerHTML = '<p class="fx-ficha-ante"><span class="fx-ficha-num">' + p.ap + '</span> Apartamento ' + p.ap + ' · ' + escapar(t.nombre) + '</p>';
          h3.textContent = t.titulo;
          txt.appendChild(h3);
          txt.insertAdjacentHTML('beforeend', '<p class="fx-ficha-desc">' + escapar(t.desc) + '</p>' +
            '<ul class="fx-ficha-datos">' + EN_TODOS.map(function (d) { return '<li>' + escapar(d) + '</li>'; }).join('') + '</ul>');
          acc.appendChild(accion('Ver fechas', t.reservar));
          if (t.extra) acc.appendChild(accion(t.extra.texto, t.extra.reservar, 'fx-boton--claro'));
          txt.appendChild(acc);
          hacerFotos(t.fotos, fotos);
          fotos.insertAdjacentHTML('beforeend', '<p class="fx-pie">' + escapar(t.notaFotos) + '</p>');
        } else {
          var z = ZONAS[p.zona];
          ficha.dataset.tipo = p.zona;
          txt.innerHTML = '<p class="fx-ficha-ante">Zonas comunes</p>';
          h3.textContent = z.titulo;
          txt.appendChild(h3);
          txt.insertAdjacentHTML('beforeend', '<p class="fx-ficha-desc">' + escapar(z.desc) + '</p>');
          if (z.enlace) {
            var a = document.createElement('a');
            a.href = z.enlace.href; a.className = 'fx-boton fx-boton--claro'; a.textContent = z.enlace.texto;
            acc.appendChild(a);
          }
          acc.appendChild(accion('Ver fechas', null));
          txt.appendChild(acc);
          hacerFotos(z.fotos, fotos);
        }
        ficha.appendChild(txt);
        ficha.appendChild(fotos);
      };

      /* ---------- luces */
      var asomar = function (p, si) {
        if (!p || !p.g) return;
        p.g.classList.toggle('es-asomada', si);
      };
      var elegir = function (p, desdeTeclado) {
        tocado = true;
        temporizadores.forEach(clearTimeout); temporizadores = [];
        PIEZAS.forEach(function (q) {
          var si = q === p;
          if (q.g) q.g.classList.toggle('es-encendida', si);
          q.boton.setAttribute('aria-pressed', si ? 'true' : 'false');
          q.boton2.setAttribute('aria-pressed', si ? 'true' : 'false');
          if (q.g) q.g.classList.remove('es-asomada');
        });
        elegida = p;
        svg.classList.toggle('hay-elegida', !!p);
        nodo.dataset.elegida = p ? p.clave : '';
        pintarFicha(p);
        estado.textContent = p ? 'Mostrando: ' + p.etiqueta : '';
        // en el móvil, que se vea la ficha (sin robar el foco)
        if (p && !desdeTeclado) {
          var r = ficha.getBoundingClientRect();
          if (r.top > innerHeight * 0.8) {
            try { ficha.scrollIntoView({ block: 'nearest', behavior: quietoDe(opc) ? 'auto' : 'smooth' }); } catch (e) { ficha.scrollIntoView(false); }
          }
        }
      };
      var alClic = function (ev) {
        var b = ev.target.closest('.fx-hueco, .fx-rejilla-boton');
        if (!b || !nodo.contains(b)) return;
        var p = porClave[b.dataset.pieza];
        // un segundo toque en la misma la apaga
        elegir(elegida === p ? null : p, ev.detail === 0);
      };
      var alEntrar = function (ev) {
        var b = ev.target.closest && ev.target.closest('.fx-hueco');
        if (!b || (ev.pointerType && ev.pointerType !== 'mouse')) return;
        asomar(porClave[b.dataset.pieza], true);
      };
      var alSalir = function (ev) {
        var b = ev.target.closest && ev.target.closest('.fx-hueco');
        if (!b) return;
        asomar(porClave[b.dataset.pieza], false);
      };
      var alFoco = function (ev) {
        var b = ev.target.closest && ev.target.closest('.fx-hueco');
        if (b) asomar(porClave[b.dataset.pieza], ev.type === 'focusin');
      };
      nodo.addEventListener('click', alClic);
      capa.addEventListener('pointerover', alEntrar);
      capa.addEventListener('pointerout', alSalir);
      capa.addEventListener('focusin', alFoco);
      capa.addEventListener('focusout', alFoco);
      ctx.limpiar.push(function () {
        nodo.removeEventListener('click', alClic);
        temporizadores.forEach(clearTimeout);
      });

      /* ---------- la ronda de luz al llegar: la linterna y las ocho, una tras otra (solo con movimiento) */
      var ronda = function () {
        if (tocado || modo !== 'vivo') return;
        var aps = PIEZAS.filter(function (p) { return p.ap; });
        aps.forEach(function (p, i) {
          temporizadores.push(setTimeout(function () { if (!tocado && ctx.vivo) asomar(p, true); }, 500 + i * 140));
          temporizadores.push(setTimeout(function () { if (!tocado && ctx.vivo) asomar(p, false); }, 500 + i * 140 + 520));
        });
      };

      var ponerModo = function () {
        var nuevo = quietoDe(opc) ? 'quieto' : 'vivo';
        if (nuevo === modo) return;
        modo = nuevo;
        nodo.dataset.modo = nuevo;
        nodo.classList.toggle('fx-indice--quieto', nuevo === 'quieto');
        // sin movimiento, el índice es la rejilla; los huecos del dibujo siguen con el ratón, fuera del tabulador
        PIEZAS.forEach(function (p) {
          if (nuevo === 'quieto') { p.boton.setAttribute('tabindex', '-1'); p.boton.setAttribute('aria-hidden', 'true'); } else { p.boton.removeAttribute('tabindex'); p.boton.removeAttribute('aria-hidden'); }
        });
      };
      var alResize = function () {
        if (innerWidth === anchoVista) return; // solo cambia el alto: la barra del móvil
        anchoVista = innerWidth;
        colocar();
      };

      el.appendChild(nodo);
      ctx.alMontar = function () {
        ponerModo();
        colocar();
        pintarFicha(null);
        nodo.dataset.listo = '1';
        var io = new IntersectionObserver(function (ent) {
          ent.forEach(function (e) { if (e.isIntersecting) { ronda(); io.disconnect(); } });
        }, { threshold: 0.45 });
        io.observe(alzado);
        window.addEventListener('resize', alResize);
        var ro = window.ResizeObserver ? new ResizeObserver(function () { colocar(); }) : null;
        if (ro) ro.observe(alzado);
        var mo = new MutationObserver(function () { ponerModo(); });
        mo.observe(raiz, { attributes: true, attributeFilter: ['class'] });
        var alMq = function () { ponerModo(); };
        if (reduceMq.addEventListener) reduceMq.addEventListener('change', alMq);
        var alLinterna = function () { if (linterna) { linterna.classList.add('es-encendida'); setTimeout(function () { if (elegida !== porClave.linterna) linterna.classList.remove('es-encendida'); }, 1600); } };
        document.addEventListener('ahio:linterna', alLinterna);
        ctx.limpiar.push(function () {
          io.disconnect(); mo.disconnect(); if (ro) ro.disconnect();
          window.removeEventListener('resize', alResize);
          document.removeEventListener('ahio:linterna', alLinterna);
          if (reduceMq.removeEventListener) reduceMq.removeEventListener('change', alMq);
        });
      };
    }, 'indice');
  }

  function montar(el, opciones) {
    var m = el && el.dataset ? el.dataset.modulo : '';
    if (m === 'vidas') return montarVidas(el, opciones);
    if (m === 'indice') return montarIndice(el, opciones);
    if (window.console) console.warn('[fachada] data-modulo desconocido:', m);
    return { destruir: function () {} };
  }

  window.Ahio = window.Ahio || {};
  window.Ahio.fachada = {
    montar: montar,
    vidas: { montar: montarVidas },
    indice: { montar: montarIndice },
    ASIGNACION: ASIGNACION, TIPOS: TIPOS, ZONAS: ZONAS, VIDAS: VIDAS, USOS: USOS
  };
})();
