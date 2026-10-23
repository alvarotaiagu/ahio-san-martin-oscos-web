/* Genera las páginas a partir de sus fuentes *.src.html:
   1. <!--parte:partes/archivo.html--> → el contenido de ese archivo. Si no existe (la cortina mientras
      el módulo Entrada no la deje), deja un comentario y la web funciona sin ella.
   2. <img data-foto="nombre" ...> → <picture> con AVIF, WebP y JPG en todos los anchos de
      img/fotos/fotos.json (el <img> conserva sus demás atributos).
   3. <!--plano-ruta--> → el plano 2D de «Los Oscos» (img/terreno/plano.*) si el módulo Ruta ya lo ha
      dejado; si no, nada (el respaldo se queda con la lista de lugares).
   4. <span class="dist" data-dist="Lugar"></span> → «12 km por carretera» si ref/raw/rutas.json (lo escribe
      Ruta con OSRM) tiene ese lugar; si no, se queda vacío y no se ve. Nada de cifras inventadas.
   5. Los <link> y <script> de CSS/JS propios que aún no existen (los módulos de otros agentes
      mientras no estén) se quitan con un aviso: la web no pide archivos que no hay.
   6. Ejecuta versionar.mjs para poner ?v=<huella> a CSS y JS.
   Se edita SIEMPRE el *.src.html (o la parte); el .html generado se sobrescribe. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const FOTOS = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8')).map((f) => [f.nombre, f]));

function picture(atrs) {
  const nombre = /data-foto="([^"]+)"/.exec(atrs)[1];
  const f = FOTOS.get(nombre);
  if (!f) throw new Error('Foto desconocida: ' + nombre);
  const sizes = (/\bsizes="([^"]+)"/.exec(atrs) || [, '100vw'])[1];
  const set = (ext) => f.anchos.map((w) => `img/fotos/${nombre}-${w}.${ext} ${w}w`).join(', ');
  const base = f.anchos.includes(800) ? 800 : f.anchos[f.anchos.length - 1];
  let resto = atrs.replace(/\s*data-foto="[^"]+"/, '').replace(/\s*\bsizes="[^"]+"/, '');
  if (!/\bloading=/.test(resto) && !/fetchpriority="high"/.test(resto)) resto += ' loading="lazy"';
  if (!/\bdecoding=/.test(resto)) resto += ' decoding="async"';
  return `<picture data-foto="${nombre}">`
    + `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`
    + `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`
    + `<img src="img/fotos/${nombre}-${base}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${f.ancho}" height="${f.alto}"${resto}>`
    + `</picture>`;
}

const partes = (html, prof = 0) => html.replace(/<!--parte:([^\s>]+)\s*-->/g, (m, ruta) => {
  const f = path.join(RAIZ, ruta);
  if (!fs.existsSync(f)) { console.warn('  (falta ' + ruta + ')'); return `<!-- sin ${ruta} -->`; }
  if (prof > 3) throw new Error('Partes anidadas de más: ' + ruta);
  return partes(fs.readFileSync(f, 'utf8').trim(), prof + 1);
});

// tamaño de un PNG, WebP o JPEG leyendo su cabecera (sin dependencias)
function tamano(f) {
  const b = fs.readFileSync(f);
  if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.slice(0, 4).toString() === 'RIFF') {
    const t = b.slice(12, 16).toString();
    if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (t === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; }
  }
  return null;
}
function plano() {
  const dir = path.join(RAIZ, 'img/terreno');
  const hay = ['avif', 'webp', 'jpg', 'png'].filter((e) => fs.existsSync(path.join(dir, 'plano.' + e)));
  if (!hay.length) { console.warn('  (sin img/terreno/plano.*: el respaldo de Los Oscos va sin plano)'); return ''; }
  const base = hay.find((e) => e === 'jpg' || e === 'png') || hay[hay.length - 1];
  const t = tamano(path.join(dir, 'plano.' + base)) || [1600, 1000];
  const fuentes = hay.filter((e) => e !== base).map((e) => `<source type="image/${e}" srcset="img/terreno/plano.${e}">`).join('');
  return `<picture>${fuentes}<img class="oscos__plano" src="img/terreno/plano.${base}" width="${t[0]}" height="${t[1]}" alt="Plano de Los Oscos con el río Ahío sobre el relieve y la foto aérea, con San Martín de Oscos, Santa Eulalia y Villanueva de Oscos, la Seimeira, Mazonovo y el Palacio de Mon" loading="lazy" decoding="async"></picture>`;
}

/* las distancias por carretera que deja el módulo Ruta (OSRM) en ref/raw/rutas.json.
   Lector tolerante: busca en el JSON objetos con un nombre (nombre|name|lugar|destino|id) y una
   distancia (km|distancia_km|dist_km|metros|distancia_m|m) y, si hay, minutos (min|minutos|duracion_min|segundos|s). */
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function distancias() {
  const f = path.join(RAIZ, 'ref/raw/rutas.json');
  if (!fs.existsSync(f)) { console.warn('  (sin ref/raw/rutas.json: las distancias se quedan sin cifra)'); return []; }
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.warn('  (ref/raw/rutas.json no se lee)'); return []; }
  const out = [];
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && /^\d+([.,]\d+)?$/.test(v) ? parseFloat(v.replace(',', '.')) : null);
  const mirar = (o, clave) => {
    if (Array.isArray(o)) { o.forEach((x) => mirar(x)); return; }
    if (!o || typeof o !== 'object') return;
    const nombre = o.nombre || o.name || o.lugar || o.destino || o.id || clave;
    let km = num(o.km) ?? num(o.distancia_km) ?? num(o.dist_km);
    if (km == null) { const m = num(o.metros) ?? num(o.distancia_m) ?? num(o.m) ?? num(o.distance); if (m != null) km = m / 1000; }
    if (km == null && num(o.distancia) != null) { const d = num(o.distancia); km = d > 500 ? d / 1000 : d; }
    let min = num(o.min) ?? num(o.minutos) ?? num(o.duracion_min) ?? num(o.tiempo_min);
    if (min == null) { const s = num(o.segundos) ?? num(o.s) ?? num(o.duration); if (s != null) min = s / 60; }
    if (nombre && km != null && typeof nombre === 'string') out.push({ nombre, km, min });
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') mirar(v, k);
  };
  mirar(j);
  return out;
}
const DIST = distancias();
function rellenarDist(html) {
  let puestas = 0;
  // solo los km: Ruta avisa de que los minutos de OSRM se quedan cortos en carreteras de montaña
  const r = html.replace(/<span class="dist" data-dist="([^"]+)"((?: data-pie="[^"]*")?)><\/span>/g, (m, lugar, pie) => {
    const n = norm(lugar);
    const d = DIST.find((x) => norm(x.nombre) === n) || DIST.find((x) => norm(x.nombre).includes(n) || n.includes(norm(x.nombre)));
    if (!d) return m;
    puestas++;
    const km = d.km < 20 ? d.km.toFixed(1).replace('.', ',').replace(/,0$/, '') : String(Math.round(d.km));
    const extra = (/data-pie="([^"]*)"/.exec(pie) || [, ''])[1];
    return `<span class="dist" data-dist="${lugar}"${pie}>${km} km por carretera${extra ? ' ' + extra : ''}</span>`;
  });
  if (DIST.length) console.log(`  distancias: ${puestas} huecos rellenos con ${DIST.length} lugares de rutas.json`);
  return r;
}

const quitarAusentes = (html) => html
  .replace(/[ \t]*<link rel="stylesheet" href="(css\/[^"?]+)"[^>]*>\r?\n?/g, (m, r) => (fs.existsSync(path.join(RAIZ, r)) ? m : (console.warn('  (sin ' + r + ': se quita su <link>)'), '')))
  .replace(/[ \t]*<script (?:type="module" )?src="(js\/[^"?]+)"[^>]*><\/script>\r?\n?/g, (m, r) => (fs.existsSync(path.join(RAIZ, r)) ? m : (console.warn('  (sin ' + r + ': se quita su <script>)'), '')));

const fuentes = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.src.html'));
for (const src of fuentes) {
  let html = quitarAusentes(partes(fs.readFileSync(path.join(RAIZ, src), 'utf8')));
  if (html.includes('<!--plano-ruta-->')) html = html.replace('<!--plano-ruta-->', plano());
  if (html.includes('class="dist"')) html = rellenarDist(html);
  html = html.replace(/<img\b([^>]*\bdata-foto="[^"]+"[^>]*)>/g, (m, a) => picture(a.replace(/\s*\/$/, '')));
  const destino = src.replace('.src.html', '.html');
  fs.writeFileSync(path.join(RAIZ, destino), html);
  console.log(`${src} → ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
}
execFileSync(process.execPath, [path.join(RAIZ, 'versionar.mjs')], { stdio: 'inherit' });
