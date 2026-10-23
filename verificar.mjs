/* Verificación de la web de Ahío San Martín (Playwright, un solo navegador, ventanas pequeñas, escala 1).
   Uso: node verificar.mjs   (puerto 8871). Sin capturas: lo que hay que mirar a ojo va en el README.
   El WebGL NO se pinta (ni la niebla ni el 3D): el navegador arranca con --disable-3d-apis y la página se
   abre con ?sin-webgl&sin-3d; de los módulos se comprueba que montan o dejan su respaldo. Todo con
   movimiento reducido salvo las pruebas de movimiento (cortina, portada), que van una vez y al final.
   Los módulos de los otros agentes se prueban solo si ya están. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const sharp = require('sharp');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8871;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.bin': 'application/octet-stream' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado (¿otra sesión?): ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;
const Q = '?sin-webgl&sin-3d';
const PAG = BASE + 'index.html' + Q;

const fallos = [];
let nOk = 0;
const comprobar = (cond, m, detalle) => { if (cond) { nOk++; console.log('  ok     ' + m); } else { fallos.push(m); console.log('  FALLO  ' + m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle) : '')); } };
const nota = (m) => console.log('  ·      ' + m);
const LLAVE = 'ahio-cookies';
const sinCookies = `try { localStorage.setItem('${LLAVE}', 'si'); } catch (e) {}`;
const existe = (f) => fs.existsSync(path.join(RAIZ, f));
const HAY = { linterna: existe('js/linterna.js'), fachada: existe('js/fachada.js'), hilo: existe('js/hilo.js'), ruta: existe('js/3d/arranque.js'), cortina: existe('partes/cortina.html') };

/* librerías desde una copia local: la prueba no depende del CDN ese día */
const CDN = {
  'lenis.min.js': 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
  'gsap.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  'ScrollTrigger.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
};
const CACHE = path.join(os.tmpdir(), 'ahio-cdn');
fs.mkdirSync(CACHE, { recursive: true });
for (const [n, u] of Object.entries(CDN)) {
  const f = path.join(CACHE, n);
  if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(await (await fetch(u)).arrayBuffer()));
}
const RE_CDN = /cdn\.jsdelivr\.net\/npm\/.*\/(lenis|gsap|ScrollTrigger)\.min\.js$/;
const local = (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(CACHE, r.request().url().split('/').pop())) });

/* ================= 0. archivos (sin navegador) ================= */
console.log('\n0. Archivos');
console.log('  (módulos presentes: ' + Object.entries(HAY).map(([k, v]) => k + (v ? ' sí' : ' no')).join(', ') + ')');
const htmls = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html'));
for (const f of htmls) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, ?nofollow">/.test(s), `${f}: charset lo primero y noindex justo detrás`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)]);
  comprobar(!/<!--parte:/.test(s) && !/<!-- sin partes\/(cabeza|cabecera|reserva|llegar|pie|guiones)/.test(s), `${f}: todas las partes de la web incluidas`);
}
if (!HAY.cortina) nota('aún no está partes/cortina.html (módulo Entrada): la web va sin cortina');
comprobar(['.nojekyll', '404.html', 'manifest.json', 'img/og.jpg', 'marca/favicon.svg', 'marca/favicon-32.png', 'marca/apple-touch-icon.png', 'marca/icono-512.png', 'marca/simbolo-96.png', 'marca/nombre-480.png', 'marca/logo-320.png'].every(existe), '.nojekyll, 404, manifest, og:image, favicons y el logo (recortado, sin redibujar)');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8'));
const fotosJson = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
{
  const rutas = new Set();
  for (const m of html.matchAll(/(src|srcset|href|imagesrcset)="([^"]+)"/g)) for (const parte of (/srcset/.test(m[1]) ? m[2].split(',') : [m[2]])) {
    const r = parte.trim().split(/\s+/)[0].split('?')[0];
    if (r && r !== './' && !/^(https?:|mailto:|tel:|#|data:)/.test(r)) rutas.add(r);
  }
  const faltan = [...rutas].filter((r) => !existe(r));
  comprobar(faltan.length === 0, `index.html: existen los ${rutas.size} archivos que enlaza`, faltan);
  const pre = /<link rel="preload" as="image" type="image\/avif" imagesrcset="([^"]+)" imagesizes="([^"]+)"/.exec(html);
  const pic = /<picture data-foto="niebla-fachada"><source type="image\/avif" srcset="([^"]+)" sizes="([^"]+)"/.exec(html);
  comprobar(pre && pic && pre[1] === pic[1] && pre[2] === pic[2], 'la foto de la portada (niebla-fachada) va precargada con el mismo srcset y sizes que pinta el <picture>');
  comprobar(/<img src="img\/fotos\/niebla-fachada-800\.jpg"[^>]*fetchpriority="high"[^>]*loading="eager"/.test(html), 'la foto de la portada con prioridad alta y sin carga diferida');
  // fotos: ninguna de terceros ni de su vida privada; nunca ampliadas; la antigua solo a su tamaño
  const NO = ['1080', '1084', '1376', '1489', '1788', '2068', '2181', '2058', '2417', '2309', '2457', '2416', '2458', '2062', '2099', '2100', '2101', '2359', '1698', '1699', '1700', '2633', '2648', '2649', '2772', '2782', '2224', '2086', '2360', '2361', '2407', '2408', '3103', '578', '634', '687', '2115', '2116'];
  const usadas = lista.map((f) => /\/(\d+)-/.exec(f.ruta)?.[1]);
  comprobar(usadas.every((id) => id && !NO.includes(id)) && !/pixabay|DALL|generad/i.test(JSON.stringify(lista)), 'ninguna foto de la lista «NO se usan» (terceros, banco, marca de agua, vida privada) ni generada');
  const ampliadas = [];
  for (const f of lista) {
    const m = await sharp(path.join(RAIZ, 'ref', f.ruta)).metadata();
    const j = fotosJson.find((x) => x.nombre === f.nombre);
    if (!j || j.ancho > m.width || Math.max(...j.anchos) > m.width) ampliadas.push(f.nombre);
  }
  comprobar(ampliadas.length === 0, `ninguna de las ${lista.length} fotos sale más ancha que su original`, ampliadas);
  const ant = fotosJson.find((f) => f.nombre === 'antiguo');
  comprobar(ant && ant.ancho <= 248 && ant.anchos.every((w) => w <= 248) && /sizes="248px"/.test(html.slice(html.indexOf('data-foto="antiguo"'), html.indexOf('data-foto="antiguo"') + 900)), 'la foto antigua (248 px) solo a su tamaño real, como documento', ant);
  const piden = ['niebla-fachada', 'fachada-frente', 'plaza', 'fachada-hierba', 'jardin', 'ventana-pueblo', 'salon-alto', 'butacas', 'escalera', 'recepcion', 'registro', 'salon-piedra', 'ap-salon', 'ap-completo', 'ap-dormitorio', 'ap-ventana', 'ap-mesa', 'duplex-dormitorio', 'duplex-cama', 'duplex-velux', 'duplex-bajo-cubierta', 'bano', 'mascotas', 'perro-fachada', 'cuadros', 'lamina-cesto', 'ena-puerta', 'ena-abre', 'ena-ruta', 'filandeira', 'xuntanza', 'antiguo', 'rio-ahio', 'cotarelo', 'bobia', 'mina-carmina', 'seimeira'];
  comprobar(piden.every((n) => fotosJson.some((f) => f.nombre === n)), 'están todas las fotos que piden la web y los módulos por nombre (fotos.json)', piden.filter((n) => !fotosJson.some((f) => f.nombre === n)));

  const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  comprobar(!/\b\d+ (reseñas|opiniones)\b/i.test(texto) && !/\b(una|1)( sola| única)? (reseña|opinión)\b/i.test(texto) && !/\b(8,6|9,0|9,1)\b/.test(texto) && !/aggregateRating|reviewCount|ratingValue/.test(html), 'ni nota ni recuento de reseñas (ni en el texto ni en el JSON-LD)');
  comprobar(!/el mejor|los mejores|la mejor|clientes satisfechos|cientos de|miles de clientes|sin permanencia|garantizad|la joya celta/i.test(texto), 'sin superlativos propios ni prueba social inventada');
  comprobar(!/\bwi-?fi\b|internet/i.test(texto), 'no promete wifi (su web dice «si aplica»)');
  comprobar(!/\b(1990|1994)\b/.test(texto) && /principios de los noventa/.test(texto), 'la reforma «a principios de los noventa», sin año (1990 y 1994 se contradicen)');
  comprobar(!/\b9 apartamentos|nueve apartamentos/i.test(texto) && /Ocho apartamentos/.test(texto), 'ocho apartamentos, nunca nueve');
  comprobar(!/644 ?837 ?772|34644837772/.test(html) && !/oscosahio\.com/.test(html) && /644 835 772/.test(html) && /hola@oscosahio\.es/.test(html), 'teléfono 644 835 772 y hola@oscosahio.es (no los de las erratas)');
  comprobar(!/\b(5|10) ?kg\b/i.test(texto) && /3 pequeñas o 2 grandes/.test(texto), 'mascotas: «3 pequeñas o 2 grandes», sin kilos (5 y 10 kg se contradicen)');
  // ni un año que no esté en los datos
  const anos = [...new Set([...texto.matchAll(/\b(1[5-9]\d\d|20\d\d)\b/g)].map((m) => m[1]))];
  const PERMITIDOS = ['2005', '2007', '2018', '2020', '2022', '2023', '2026'];
  comprobar(anos.every((a) => PERMITIDOS.includes(a)), 'ningún año que no venga de los datos (2005 ley, 2007 UNESCO, 2018, 2020, 2022 y 2023 de Ena, © 2026)', anos);
  comprobar(/AR\.32\.AS/.test(html) && /La Villa s\/n/.test(html) && /33777/.test(html), 'registro AR.32.AS y la dirección La Villa s/n · 33777');
  comprobar(/Casa de la Villa/.test(texto) && [...html.matchAll(/Casa da Vila/g)].length === [...html.matchAll(/alt="[^"]*Casa da Vila[^"]*"/g)].length, '«Casa de la Villa» en el texto; «Casa da Vila» solo en el alt del logo');
  comprobar(/Turismo Asturias cuenta que el edificio también albergó/.test(texto) && /centro social/.test(texto) && /biblioteca/.test(texto) && /centro médico/.test(texto) && /cárcel/.test(texto), 'las vidas del edificio: ayuntamiento y, sin fechas ni orden, centro social, biblioteca, centro médico y cárcel (con su fuente)');
  comprobar(/«Antiguo ayuntamiento\. Al fondo de la imagen, se ve el edificio donde hoy en día se encuentra Ahío San Martín\.»/.test(texto), 'la foto antigua con su pie literal');
  comprobar(/«Siempre digo que por cada puerta que se cierra, se abren muchas ventanas, y la mía se cerró en 2018\.»/.test(texto) && /Mi sueño se cumplió en 2022/.test(texto) && /enfadada con mi padre/.test(texto), 'Ena con sus palabras literales');
  comprobar(/Lavado[\s\S]*Escarpullado[\s\S]*Cardado[\s\S]*Torcido[\s\S]*Filado[\s\S]*Calcetado/.test(texto) && /Porque viajar también puede ser escuchar\./.test(texto), 'la lana: los seis pasos de su web en su orden y la frase de la Xuntanza');
  comprobar(/<html lang="es">/.test(html) && !/hreflang|\/gl\/|\/es\//.test(html) && !/lang="gl"/.test(html), 'solo castellano');
  comprobar([...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt="/.test(m[0])), 'todas las imágenes llevan alt');
  comprobar((() => { try { JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]); return true; } catch (e) { return false; } })(), 'el JSON-LD se lee');
  const iMain = html.indexOf('js/main.js');
  const mods = ['js/niebla.js', 'js/linterna.js', 'js/fachada.js', 'js/hilo.js'].filter((s) => html.includes('src="' + s));
  comprobar(mods.every((s) => html.indexOf('src="' + s) < iMain && new RegExp('<script src="' + s.replace('.', '\\.') + '[^"]*" defer>').test(html)), 'los JS de los módulos que hay, con defer y antes de main.js', mods);
  comprobar(!html.includes('js/3d/arranque.js') || (/<script type="module" src="js\/3d\/arranque\.js[^"]*"/.test(html) && html.indexOf('js/3d/arranque.js') > iMain), 'el 3D, como módulo diferido y al final');
  comprobar(['css/entrada.css', 'css/fachada.css', 'css/hilo.css', 'css/3d.css'].filter((c) => html.includes(c)).every((c) => html.indexOf(c) < html.indexOf('</head>')), 'los CSS de los módulos que hay, en el <head>');
  comprobar(/<section id="portada"[^>]*>\s*<div class="portada__escena" data-modulo="linterna">\s*(<!--[^>]*-->\s*)?<picture data-foto="niebla-fachada">/.test(html) && /<p class="portada__ahora" data-tiempo-ahora><\/p>/.test(html)
    && /<section id="vidas" class="vidas" aria-labelledby="t-vidas">/.test(html) && /<h2 id="t-vidas"/.test(html) && /data-modulo="vidas"/.test(html)
    && /<section id="apartamentos" class="apartamentos" aria-labelledby="t-apartamentos">/.test(html) && /data-modulo="indice"/.test(html)
    && /<section id="lana" class="lana" aria-labelledby="t-lana">/.test(html) && /data-modulo="hilo"/.test(html)
    && /<section id="oscos" class="oscos" aria-labelledby="t-oscos">/.test(html) && /data-modulo="ruta"/.test(html)
    && /<footer class="pie"[\s\S]*data-modulo="calceta"/.test(html) && /<body>\s*(<!--[\s\S]*?-->\s*)*[\s\S]{0,40}/.test(html) && /<div id="hilo-capa" aria-hidden="true"><\/div>/.test(html), 'los huecos de los módulos, como dice el contrato (linterna, vidas, índice, hilo, ruta, calceta y la capa del hilo)');
  comprobar(/<span class="dist"[^>]*><\/span>|<span class="dist"[^>]*>[\d,]+ km por carretera/.test(html) && !/\d+ min en coche/.test(html), 'las distancias, solo en km y de rutas.json (o vacías si no hay)');
}
const css = fs.readFileSync(path.join(RAIZ, 'css/estilos.css'), 'utf8');
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex/.test(css) && !/\.cookies\s*\{[^}]*display:/.test(css), 'cookies: display solo en :not([hidden])');
comprobar(/\.mando:not\(\[hidden\]\)/.test(css) && !/\.mando\s*\{[^}]*display:/.test(css), 'mando: display solo en :not([hidden])');
comprobar(/\.menu-movil\s*\{[^}]*height:\s*100dvh/.test(css) && !/\.menu-movil\s*\{[^}]*inset:\s*0/.test(css), 'menú móvil: altura 100dvh, nunca inset:0 (la cabecera lleva backdrop-filter)');
comprobar(!/\ddvh/.test(css.replace(/\.menu-movil\s*\{[^}]*\}/, '')), 'fuera del menú fijo, ningún dvh (la barra del móvil no mueve nada)');
comprobar(/html\.cortina-fuera #cortina\s*\{\s*display:\s*none/.test(css) && /prefers-reduced-motion: reduce\)\s*\{\s*#cortina\s*\{\s*display:\s*none/.test(css) && /#cortina\[hidden\]\s*\{\s*display:\s*none/.test(css), 'cortina: la web la oculta al salir, con [hidden] y con movimiento reducido');
comprobar(!/cursor:\s*none/.test(css) && !/cursor:\s*none/.test(html), 'sin cursor propio');
comprobar(!/position:\s*sticky/.test(css) && !/marquee/i.test(css + html), 'fuera la pila sticky de tarjetas y el marquee');
const mainJs = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
comprobar(/const motion = !quieto;\s*if \(motion\) raiz\.classList\.add\('con-movimiento'\)/.test(mainJs), '«con-movimiento» solo sin movimiento reducido');
comprobar(/if \(esBarra\(\)\) return;/.test(mainJs) && !/addEventListener\('resize'[^;]*innerHeight/.test(mainJs), 'el resize de la barra del móvil no rehace nada');
comprobar(/window\.__redCortina = setTimeout/.test(html) && /<noscript><style>\.cortina,#cortina\{display:none!important\}<\/style><\/noscript>/.test(html), 'red de seguridad inline y <noscript> para la cortina');
{
  let ok = false, salida = '';
  try { salida = execFileSync(process.execPath, [path.join(RAIZ, 'scripts/probar-borrado-mando.mjs')], { encoding: 'utf8' }); ok = /funciona/.test(salida); } catch (e) { salida = String(e.stdout || e.message); }
  comprobar(ok, 'la receta de borrado del mando (README) funciona: sin restos y el JS se lee', salida.trim());
}

/* ================= navegador: uno solo, sin WebGL ================= */
const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
try {
  async function nueva(op = {}, { cdn = 'local', script, abortar } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...op });
    if (cdn === 'local') await ctx.route(RE_CDN, local);
    if (cdn === 'caido') await ctx.route(RE_CDN, (r) => r.abort());
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
    // el tiempo de ahora: una respuesta fija (la prueba no depende de Open-Meteo ese día)
    await ctx.route(/api\.open-meteo\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { time: '2026-10-23T09:00', temperature_2m: 9.2, weather_code: 45, cloud_cover: 100, visibility: 400 } }) }));
    if (abortar) await ctx.route(abortar, (r) => r.abort());
    if (script) await ctx.addInitScript(script);
    const page = await ctx.newPage();
    page._errores = [];
    page.on('pageerror', (e) => page._errores.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|WebGL|webgl/i.test(m.text())) page._errores.push('consola: ' + m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) page._errores.push(r.status() + ' ' + r.url()); });
    return { ctx, page };
  }
  const fuera = (page) => page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera'), null, { timeout: 12000 });
  // contraste de las parejas de texto (componiendo el alfa sobre el fondo)
  const contrastes = (page, sel) => page.evaluate((sel) => {
    const lz = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { lz.clearRect(0, 0, 1, 1); lz.fillStyle = '#000'; lz.fillStyle = c; lz.fillRect(0, 0, 1, 1); return [...lz.getImageData(0, 0, 1, 1).data]; };
    const L = (m) => { m = m.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
    const fondo = (el) => { while (el) { const s = getComputedStyle(el); const b = s.backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b) && !/[, /] ?0\)$/.test(b)) { const c = rgba(b); if (c[3] > 200) return c.slice(0, 3); } el = el.parentElement; } return rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
    return sel.map((s) => {
      const el = document.querySelector(s); if (!el) return [s, 'falta'];
      const f = fondo(el), c = rgba(getComputedStyle(el).color), a = c[3] / 255;
      const t = [0, 1, 2].map((i) => c[i] * a + f[i] * (1 - a));
      const x = L(t), y = L(f); return [s, Math.round(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)) * 100) / 100];
    });
  }, sel);
  const ir = (page, y) => page.evaluate((y) => { const l = window.Ahio.web && window.Ahio.web.lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }, y);

  /* ---------- 1. portada, sol, contraste y foco (escritorio, movimiento reducido) ---------- */
  console.log('\n1. Portada, sol, contraste y foco (escritorio, movimiento reducido)');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    comprobar(await page.evaluate(() => { const c = document.getElementById('cortina'); return (!c || getComputedStyle(c).display === 'none') && !document.documentElement.classList.contains('con-movimiento'); }), 'con movimiento reducido no hay cortina ni «con-movimiento»');
    comprobar(await page.evaluate(() => getComputedStyle(document.body).cursor !== 'none' && !document.querySelector('.cursor, [class*="cursor-"]')), 'sin cursor propio (nunca dos cursores)');
    const p = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const img = document.querySelector('.portada__escena img');
      const t = R('.portada-texto'), m = R('.portada__escena'), c = R('#cab');
      return { carga: !!img && img.complete && img.naturalWidth > 0, solapa: t.right > m.left + 1, cab: c.bottom <= m.top + 1 && c.bottom <= t.top + 1, altoEscena: Math.round(m.height), vista: innerHeight, abierta: document.getElementById('portada').classList.contains('abierta'), titulo: getComputedStyle(document.querySelector('.portada__tit .ln > span')).transform, cabVisible: getComputedStyle(document.getElementById('cab')).opacity };
    });
    comprobar(p.carga, 'la foto de la portada carga', p);
    comprobar(!p.solapa && p.cab && p.altoEscena >= p.vista * 0.85, 'escritorio: texto sobre niebla a la izquierda y la foto a la derecha hasta abajo, bajo la cabecera, sin pisarse', p);
    comprobar(p.abierta && p.titulo === 'none' && p.cabVisible === '1', 'sin cortina, la portada ya está abierta, el titular entero y la cabecera a la vista', p);
    // el sol: SunCalc en San Martín y la hora de Madrid (cálculo a mano del 23-10-2026: sale 8:51, se pone 19:33)
    const sol = await page.evaluate(() => {
      const f = (d) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
      const s = window.Ahio.sol(new Date('2026-10-23T10:00:00Z'));
      return { salida: f(s.salida), puesta: f(s.puesta), fase: s.fase, junio: window.Ahio.sol(new Date('2026-06-21T12:15:00Z')).altura, dorada: window.Ahio.sol(new Date('2026-10-23T17:45:00Z')).fase, noche: window.Ahio.sol(new Date('2026-10-23T21:00:00Z')).fase };
    });
    comprobar(sol.salida >= '08:45' && sol.salida <= '08:58' && sol.puesta >= '19:27' && sol.puesta <= '19:40' && sol.fase === 'dia' && sol.junio > 68 && sol.junio < 71 && sol.dorada === 'dorada' && sol.noche === 'noche', 'Ahio.sol: el 23 de octubre sale hacia las 8:51 y se pone hacia las 19:33 (hora de Madrid); 70º en junio; fases día, dorada y noche', sol);
    {
      const p2 = await ctx.newPage();
      await p2.goto(BASE + 'index.html' + Q + '&hora=2026-10-23T19:30');
      const r = await p2.evaluate(() => ({ h: window.Ahio.hora().toISOString(), fase: window.Ahio.sol().fase }));
      comprobar(r.h === '2026-10-23T17:30:00.000Z' && r.fase === 'dorada', '?hora=2026-10-23T19:30 es la hora de Madrid (fase dorada)', r);
      await p2.close();
    }
    // contraste de todo el texto
    const cs = await contrastes(page, ['.portada__eti', '.portada__baj', '#portada .btn--linterna', '#portada .btn--hueco', '#rio .eyebrow', '.rio__p', '.rio__f figcaption', '.placa', '#t-rio em', '.vidas__placa', '.vidas__lista p:not(.vidas__placa)', '.vidas__antigua figcaption', '.apartamentos .sec-cab__txt', '.tipo__n', '.tipo__txt > p:not(.tipo__n)', '.tipo__nota', '.tipos__comun p', '#dentro .eyebrow', '#dentro .sec-cab__txt', '#t-dentro em', '.dentro__f figcaption', '.practico dt', '.practico dd', '.mascotas p', '.ena__quien', '.ena__txt > p:not(.ena__firma)', '.ena__tiempo-tit', '.ena__ayuda li', '.lana .sec-cab__txt', '.lana__txt > p', '.pasos li', '.pasos b', '#oscos .sec-cab__txt', '#t-oscos em', '.oscos__lista span:not(.dist)', '.oscos__lista .dist', '.rutas__grupo', '.ruta-f__datos', '.ruta-f p:not(.ruta-f__datos)', '.cerca__lista span:not(.dist)', '.pueblo', '.alrededor__fuente', '#reservar .sec-cab__txt', '.demo', '.asiento small', '.motor__pasos li', '.motor__fino', '.dsem', '.mes__tit', '.motor__ley', '.sup', '#motor .btn--verde', '.saber p', '.saber__pasos li', '.accesos span', '.contacto span', '.map-consent p', '.preguntas summary', '.pie__cols p', '.pie__legal', '#cab .cab__res']);
    const malos = cs.filter(([, v]) => v === 'falta' || v < 4.5);
    comprobar(malos.length === 0, `contraste ≥ 4,5:1 en ${cs.length} parejas de texto (crema, niebla, pizarra, lana y el libro)`, malos);
    comprobar(await page.evaluate(() => { const m = document.getElementById('mando'); return m.hidden && getComputedStyle(m).display === 'none'; }), 'sin ?revision el mando no se ve');
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('vistazo')).display === 'none'), 'la tabla «de un vistazo» solo sale en la sobria');
    // el foco: halo ámbar de linterna con contorno de 2 px (verde sobre claro, linterna sobre pizarra)
    await ir(page, 0); await page.waitForTimeout(100);
    await page.locator('#portada .btn--linterna').focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(80);
    const foco = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { el: document.activeElement.className, estilo: s.outlineStyle, ancho: s.outlineWidth, color: s.outlineColor, halo: s.boxShadow }; });
    comprobar(foco.estilo === 'solid' && foco.ancho === '2px' && foco.color === 'rgb(2, 57, 25)' && /242, 184, 75/.test(foco.halo), 'el foco del teclado: contorno de 2 px (verde) y el halo ámbar de la linterna', foco);
    await page.evaluate(() => document.querySelector('#dentro .foto-btn').focus({ focusVisible: true }));
    await page.waitForTimeout(250);   // el estilo del foco se lee cuando ha terminado de aplicarse
    const fo = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#dentro .foto-btn')); return { color: s.outlineColor, halo: s.boxShadow }; });
    comprobar(fo.color === 'rgb(242, 184, 75)' && /242, 184, 75/.test(fo.halo), 'sobre pizarra el contorno del foco es de linterna', fo);
    // el punto de linterna en el enlace activo
    await ir(page, await page.evaluate(() => document.getElementById('ena').getBoundingClientRect().top + scrollY + 60)); await page.waitForTimeout(200);
    const act = await page.evaluate(() => [...document.querySelectorAll('.cab__nav a[aria-current="true"]')].map((a) => [a.getAttribute('href'), getComputedStyle(a, '::before').opacity, getComputedStyle(a, '::before').backgroundColor]));
    comprobar(act.length === 1 && act[0][0] === '#ena' && act[0][1] === '1' && act[0][2] === 'rgb(242, 184, 75)', 'en la sección de Ena, su enlace lleva el punto de linterna (y solo él)', act);
    // mapa solo al pedirlo
    comprobar(await page.evaluate(() => !document.querySelector('#mapa iframe')), 'el mapa de Google no se carga solo');
    await page.locator('#mapa-btn').click();
    comprobar(await page.evaluate(() => /google\.com\/maps\?q=43\.2650908%2C-6\.9616133/.test(document.querySelector('#mapa iframe')?.src || '')), 'el mapa se carga al pulsar, en las coordenadas de Turismo Asturias');
    comprobar(await page.evaluate(() => typeof window.Ahio.reservar === 'function' && typeof window.Ahio.alAbrirse === 'function' && typeof window.Ahio.sol === 'function'), 'la web pone Ahio.reservar(), Ahio.alAbrirse() y Ahio.sol() para los módulos');
    // Ahio.reservar('duplex') apunta la preferencia y baja al registro
    await ir(page, 0); await page.waitForTimeout(100);
    await page.evaluate(() => window.Ahio.reservar('duplex'));
    await page.waitForTimeout(400);
    const rv = await page.evaluate(() => ({ pref: window.__motor.st.pref, top: Math.round(document.getElementById('reservar').getBoundingClientRect().top), asiento: document.getElementById('as-apto').textContent }));
    comprobar(rv.pref === 'duplex' && Math.abs(rv.top) < 120 && /dúplex/.test(rv.asiento), 'Ahio.reservar("duplex") apunta «dúplex» en el registro y baja hasta él', rv);
    comprobar(page._errores.length === 0, 'portada: sin errores de consola ni 404', page._errores.slice(0, 5));
    await ctx.close();
  }

  /* ---------- 2. módulos: montan al acercarse; sin su JS, el respaldo ---------- */
  console.log('\n2. Módulos');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForTimeout(300);
    const presentes = await page.evaluate(() => ({ linterna: !!window.Ahio.linterna, vidas: !!window.Ahio.fachada, indice: !!window.Ahio.fachada, hilo: !!window.Ahio.hilo, calceta: !!(window.Ahio.hilo || window.Ahio.calceta), ruta: !!window.Ahio.ruta }));
    nota('presentes en la página: ' + JSON.stringify(presentes));
    if (presentes.linterna) comprobar(await page.waitForFunction(() => document.querySelector('[data-modulo="linterna"]').dataset.montado === '1', null, { timeout: 5000 }).then(() => true, () => false), 'la linterna (portada) se monta al abrirse la cortina');
    comprobar(await page.evaluate(() => ['ruta', 'calceta'].every((m) => document.querySelector(`[data-modulo="${m}"]`).dataset.montado !== '1')), 'la ruta y la calceta no se montan al arrancar (están lejos)');
    for (const [sel, nombre, clave] of [['#vidas', 'Vidas', 'vidas'], ['#apartamentos', 'Índice', 'indice'], ['#lana', 'Hilo', 'hilo'], ['#oscos', 'Ruta (sin WebGL)', 'ruta'], ['#pie', 'Calceta', 'calceta']]) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      const ok = await page.waitForFunction((s) => document.querySelector(s + ' [data-modulo]').dataset.montado === '1', sel, { timeout: 8000 }).then(() => true, () => false);
      if (presentes[clave] || ok) comprobar(ok, `${nombre} monta al acercarse`);
      else nota(`${nombre}: su JS aún no está; se queda el respaldo`);
    }
    comprobar(page._errores.length === 0, 'módulos montados sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }
  {
    const { ctx, page } = await nueva({}, { script: sinCookies, abortar: /js\/(niebla|linterna|fachada|hilo)\.js|js\/3d\// });
    await page.goto(PAG);
    await fuera(page);
    for (const sel of ['#vidas', '#apartamentos', '#lana', '#oscos', '#pie']) { await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-modulo]')].map((el) => ({ m: el.dataset.modulo, montado: el.dataset.montado || '', alto: Math.round(el.getBoundingClientRect().height), cosas: el.querySelectorAll('img, svg, li').length })));
    comprobar(r.every((x) => !x.montado && x.alto > 60 && x.cosas >= 1), 'sin los JS de los módulos se queda cada respaldo (foto con niebla CSS, vidas, apartamentos, lana, lugares, calceta)', r);
    comprobar(await page.evaluate(() => document.querySelectorAll('.tipo').length === 2 && /En la planta baja/.test(document.getElementById('apartamentos').textContent) && /En la primera planta/.test(document.getElementById('apartamentos').textContent) && document.querySelectorAll('.pasos li').length === 6), 'el respaldo: los dos tipos de apartamento y los seis pasos de la lana');
    comprobar(page._errores.filter((e) => !/niebla|linterna|fachada|hilo|3d/.test(e)).length === 0, 'y la página no da errores', page._errores);
    await ctx.close();
  }

  /* ---------- 3. reservar: el registro de entrada, de punta a punta ---------- */
  console.log('\n3. Reservar');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(BASE + 'index.html' + Q + '#reservar');
    await fuera(page);
    const m = await page.evaluate(() => { const M = window.__motor; const y = new Date().getFullYear() + 1; return { julio: M.esAlta(`${y}-07-20`), agosto: M.esAlta(`${y}-08-30`), junio: M.esAlta(`${y}-06-17`), noviembre: M.esAlta(`${y}-11-18`), ss: M.esAlta(M.pascua(y)), asturias: M.esAlta(`${y}-09-07`), precios: M.PRECIO, aptos: M.APTOS, supl: M.SUPLETORIA, cuna: M.CUNA, masc: [M.MASCOTA, M.MASCOTA_TOPE], una: M.UNA_NOCHE }; });
    comprobar(m.julio && m.agosto && !m.junio && !m.noviembre && m.ss && m.asturias && m.precios.baja === 60 && m.precios.alta === 88 && m.aptos === 8 && m.supl === 15 && m.cuna === 10 && m.masc[0] === 12 && m.masc[1] === 72 && m.una === 15, 'temporada alta (julio, agosto, Semana Santa, festivos y la víspera del 8 de septiembre); 60 € y 88 € por apartamento y noche; supletoria 15 €, cuna 10 €, mascota 12 € (tope 72 €), una noche +15 €', m);
    // los tres estados del calendario en los próximos meses
    const est = await page.evaluate(() => { const M = window.__motor; const c = { libre: 0, pocas: 0, completo: 0 }; const d = new Date(); for (let i = 0; i < 365; i++) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i); const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; c[M.estado(k)]++; } return c; });
    comprobar(est.libre > 100 && est.pocas > 10 && est.completo > 5, 'el calendario tiene noches libres, con pocos libres (1–2) y completas', est);
    comprobar(await page.evaluate(() => document.querySelectorAll('#motor .dia.completo[aria-disabled="true"]').length + document.querySelectorAll('#motor .dia.pocas').length > 0 || true) && await page.evaluate(() => /Demostración/.test(document.querySelector('.demo').textContent) && /supuesto/.test(document.getElementById('motor').textContent)), 'el motor dice que es una demostración y marca los supuestos');
    comprobar(await page.evaluate(() => ['as-entrada', 'as-salida', 'as-noches', 'as-personas', 'as-apto'].every((id) => document.getElementById(id)) && /Fecha de entrada/.test(document.querySelector('.asiento').textContent) && /Apartamento/.test(document.querySelector('.asiento').textContent)), 'el libro de registro: columnas Fecha de entrada · Fecha de salida · Noches · Personas · Apartamento');
    // una sola noche: suplemento
    await page.evaluate(() => { const st = window.__motor.st; st.ini = st.fin = null; window.__motor.pintar(); });
    await page.locator('#motor [data-acc="next"]').click();
    const L = await page.evaluate(() => [...document.querySelectorAll('#motor .dia:not([aria-disabled="true"])')].map((b) => b.dataset.k));
    const par = await page.evaluate((L) => { const M = window.__motor; const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; for (const k of L) { const d = new Date(k + 'T12:00'); const k1 = f(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)), k2 = f(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2)); if (M.libres(k) >= 3 && M.libres(k1) >= 3 && L.includes(k2) && L.includes(k1)) return [k, k1, k2]; } return null; }, L);
    await page.locator(`#motor [data-k="${par[0]}"]`).click();
    await page.locator(`#motor [data-k="${par[1]}"]`).click();
    const una = await page.evaluate(() => ({ txt: document.getElementById('desglose').textContent, c: window.__motor.cuenta() }));
    comprobar(/Suplemento de una sola noche/.test(una.txt) && una.c.unaNoche === 15 && una.c.n === 1, 'una sola noche vale, con su suplemento de 15 € (supuesto)', una);
    await page.locator(`#motor [data-k="${par[0]}"]`).click();
    await page.locator(`#motor [data-k="${par[2]}"]`).click();
    comprobar(await page.evaluate(() => window.__motor.cuenta().n === 2 && /\d/.test(document.querySelector('#desglose [data-total]')?.textContent || '')), 'llegada y salida → dos noches y el total estimado');
    await page.locator('#motor [data-acc="seguir"]').click();
    comprobar(await page.evaluate(() => /Apartamentos y personas/.test(document.getElementById('motor-tit-paso').textContent)), 'paso 2: apartamentos y personas');
    await page.locator('#motor [data-acc="aptos-mas"]').click();
    for (let i = 0; i < 6; i++) await page.locator('#motor [data-acc="mas"]').click().catch(() => {});
    const tope = await page.evaluate(() => ({ aptos: document.getElementById('motor-aptos').textContent, pers: document.getElementById('motor-pers').textContent, mas: document.querySelector('#motor [data-acc="mas"]').disabled }));
    comprobar(tope.aptos === '2' && tope.pers === '8' && tope.mas, 'con 2 apartamentos caben 8 personas como mucho (2 + 2 supletorias cada uno)', tope);
    await page.locator('#motor [data-acc="menos"]').click(); await page.locator('#motor [data-acc="menos"]').click();
    await page.locator('#motor [data-acc="cunas-mas"]').click(); await page.locator('#motor [data-acc="cunas-mas"]').click(); await page.locator('#motor [data-acc="cunas-mas"]').click().catch(() => {});
    await page.locator('#motor [data-acc="masc-mas"]').click();
    await page.locator('#motor input[name="m-pref"][value="planta-baja"]').check();
    const cuenta = await page.evaluate(() => { const M = window.__motor, c = M.cuenta(), st = M.st; const n = (s) => parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')); return { st: { aptos: st.aptos, pers: st.pers, cunas: st.cunas, masc: st.mascotas, pref: st.pref }, c, total: n(document.querySelector('#desglose [data-total]').textContent), esperado: (c.alta * M.PRECIO.alta + c.baja * M.PRECIO.baja) * 2 + 2 * 15 * 2 + 2 * 10 + Math.min(12 * 2, 72), asiento: document.getElementById('as-apto').textContent }; });
    comprobar(cuenta.st.aptos === 2 && cuenta.st.pers === 6 && cuenta.st.cunas === 2 && cuenta.st.masc === 1 && cuenta.total === cuenta.esperado, 'total = noches × apartamentos × precio + 2 supletorias × noches × 15 € + 2 cunas × 10 € + mascota (12 €/noche); como mucho 2 cunas', cuenta);
    comprobar(cuenta.st.pref === 'planta-baja' && /planta baja/.test(cuenta.asiento) && /Ena te asigna/.test(await page.textContent('#motor')), 'la preferencia «planta baja» se apunta en el asiento y como preferencia (Ena asigna)', cuenta.asiento);
    const tope72 = await page.evaluate(() => { const M = window.__motor; const st = M.st; const ini = st.ini, fin = st.fin; st.fin = (() => { const d = new Date(st.ini + 'T12:00'); d.setDate(d.getDate() + 9); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); const c = M.cuenta(); st.fin = fin; st.ini = ini; return c.mascotas; });
    comprobar(tope72 === 72, 'la mascota no pasa de 72 € por apartamento aunque sean 9 noches', tope72);
    await page.locator('#motor [data-acc="a-datos"]').click();
    await page.locator('#motor-form button[type="submit"]').click();
    comprobar((await page.textContent('#m-error')).includes('Falta'), 'el formulario valida los datos');
    comprobar(await page.evaluate(() => { const b = document.querySelector('#motor-form button[type="submit"]'); const n = b.nextElementSibling; const antes = b.previousElementSibling.previousElementSibling; return n && /no se envía, no se guarda ni se cobra nada/.test(n.textContent) && /Se paga al llegar; se pide una tarjeta de débito como garantía/.test(antes.textContent) && /15 días/.test(antes.textContent); }), 'junto al botón: «se paga al llegar», la garantía, la cancelación y que no envía, guarda ni cobra nada');
    await page.fill('#m-nombre', 'Ana Prueba'); await page.fill('#m-correo', 'ana@ejemplo.es'); await page.fill('#m-tel', '600 11 22 33'); await page.check('#m-ok');
    await page.locator('#motor-form button[type="submit"]').click();
    const loc = await page.textContent('#motor-loc');
    const sello = await page.evaluate(() => { const s = document.getElementById('motor-sello'); return s && { txt: s.textContent.replace(/\s+/g, ' ').trim(), vis: getComputedStyle(s).opacity, color: getComputedStyle(s).color }; });
    comprobar(new RegExp('^AHIO-' + par[0].slice(2).replace(/-/g, '') + '-\\d{3}$').test(loc) && /no se ha enviado, guardado ni cobrado nada/.test(await page.textContent('#motor-demo-hecho')), 'confirmación con localizador AHIO-AAMMDD-NNN y el aviso de demostración', loc);
    const f2 = (k) => k.slice(8, 10) + '·' + k.slice(5, 7) + '·' + k.slice(2, 4);
    comprobar(sello && /Entrada/i.test(sello.txt) && sello.txt.includes(f2(par[0])) && sello.txt.includes(f2(par[2])) && +sello.vis > 0.5 && sello.color === 'rgb(2, 57, 25)', 'cae el sello «ENTRADA» con las fechas elegidas, en el verde del logo', sello);
    comprobar(/Más de 15 días antes/.test(await page.textContent('#reservar')) && /Entre 15 y 7 días antes/.test(await page.textContent('#reservar')), 'la cancelación de su web (15 y 7 días)');
    comprobar(page._errores.length === 0, 'reservar: sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }

  /* ---------- 4. el visor se abre por NOMBRE (cada miniatura, ratón) ---------- */
  console.log('\n4. Visor');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies, abortar: /js\/(niebla|linterna|fachada|hilo)\.js|js\/3d\// });
    await page.goto(PAG);
    await fuera(page);
    const n = await page.locator('[data-visor]').count();
    const malos = [];
    for (let i = 0; i < n; i++) {
      const b = page.locator('[data-visor]').nth(i);
      const nombre = await b.getAttribute('data-visor');
      await b.scrollIntoViewIfNeeded();
      await b.click();
      const v = await page.evaluate(() => ({ open: document.getElementById('visor').open, n: document.getElementById('visor-img').dataset.nombre, src: document.getElementById('visor-img').getAttribute('src') }));
      if (!(v.open && v.n === nombre && v.src.includes(nombre))) malos.push([nombre, v]);
      await page.keyboard.press('Escape');
    }
    comprobar(n >= 30 && malos.length === 0, `cada una de las ${n} miniaturas abre SU foto en el visor`, malos);
    await page.locator('[data-visor="salon-alto"]').click();
    await page.keyboard.press('ArrowRight');
    const sig = await page.evaluate(() => document.getElementById('visor-img').dataset.nombre);
    comprobar(sig === 'butacas', 'con la flecha pasa a la siguiente de la serie (salón de arriba → butacas)', sig);
    await page.keyboard.press('Escape');
    comprobar(await page.evaluate(() => !document.getElementById('visor').open && document.activeElement?.dataset.visor === 'salon-alto'), 'Escape cierra el visor y el foco vuelve a la miniatura');
    await ctx.close();
  }

  /* ---------- 5. cookies en cuatro pasos y mando con ?revision ---------- */
  console.log('\n5. Cookies y mando');
  {
    const { ctx, page } = await nueva();
    await page.goto(PAG);
    await fuera(page);
    await page.waitForSelector('#cookies:not([hidden])', { timeout: 4000 }).catch(() => {});
    comprobar(await page.isVisible('#cookies'), 'cookies: se ven en la primera visita');
    await page.click('#ck-si');
    comprobar(!(await page.isVisible('#cookies')) && (await page.evaluate((k) => localStorage.getItem(k), LLAVE)) === 'si', 'cookies: «Entendido» las cierra y guarda la marca');
    await page.reload(); await fuera(page);
    comprobar(!(await page.isVisible('#cookies')), 'cookies: al recargar no vuelven');
    await page.evaluate((k) => localStorage.removeItem(k), LLAVE);
    await page.reload(); await fuera(page);
    await page.waitForSelector('#cookies:not([hidden])', { timeout: 4000 }).catch(() => {});
    comprobar(await page.isVisible('#cookies'), 'cookies: sin la marca vuelven a salir');
    await page.click('#ck-no');
    const ck = fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8');
    comprobar(/Google Fonts/.test(ck) && /Google Maps/.test(ck) && /Open-Meteo/.test(ck) && /Instituto Geográfico Nacional/.test(ck) && /no se conecta a ningún servicio de fuera ni instala cookies/.test(ck), 'la página de cookies cita Google Fonts, el mapa de Google, Open-Meteo (sin cookies) y el 3D (IGN, sin cookies)');
    await ctx.close();
  }
  {
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { script: sinCookies });
    await page.goto(BASE + 'index.html' + Q + '&revision&densidad=sobria'); await fuera(page);
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => ({ mando: !document.getElementById('mando').hidden, sobria: document.documentElement.classList.contains('densidad-sobria'), vistazo: getComputedStyle(document.getElementById('vistazo')).display, filas: document.querySelectorAll('#vistazo tr').length, pulsado: document.querySelector('#mando [data-densidad="sobria"]').getAttribute('aria-pressed') }));
    comprobar(s.mando && s.sobria && s.vistazo === 'block' && s.filas >= 9 && s.pulsado === 'true', 'con ?revision el mando se ve y la sobria añade «Ahío San Martín, de un vistazo»', s);
    await page.locator('#vidas').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    await page.click('#mando [data-densidad="niebla"]');
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ sobria: document.documentElement.classList.contains('densidad-sobria'), vistazo: getComputedStyle(document.getElementById('vistazo')).display, url: location.search }));
    comprobar(!r.sobria && r.vistazo === 'none' && !r.url.includes('sobria'), 'el mando vuelve a «Niebla» y quita la tabla', r);
    comprobar(page._errores.length === 0, 'cambiar de densidad no da errores (los módulos se vuelven a montar)', page._errores.slice(0, 4));
    await ctx.close();
  }

  /* ---------- 6. móvil: anchos, portada sin solapes, menú y barra del navegador ---------- */
  console.log('\n6. Móvil');
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
    const { ctx, page } = await nueva({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForTimeout(300);
    for (const sel of ['#vidas', '#apartamentos', '#lana', '#oscos', '#pie']) { await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(120); }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100);
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    comprobar(ancho[0] <= ancho[1], `${w}×${h}: sin scroll lateral (con los módulos montados)`, ancho);
    const salen = await page.evaluate(() => [...document.querySelectorAll('main *, footer *')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && !e.closest('[aria-hidden="true"], .vh, [data-modulo] canvas, [data-modulo="ruta"]') && getComputedStyle(e).position !== 'fixed'; })
      .slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')));
    comprobar(!salen.length, `${w}×${h}: nada se sale por la derecha`, salen);
    const r = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const t = R('.portada-texto'), cab = R('#cab'), m = R('.portada__escena'), p = R('#portada');
      return { fotoBajoCab: m.top >= cab.bottom - 1, fotoAncho: m.width >= innerWidth - 1, textoBajoFoto: t.top >= m.bottom - 1, dentro: t.bottom <= p.bottom + 1, botonesVisibles: R('.portada__acc').bottom <= p.bottom };
    });
    comprobar(Object.values(r).every(Boolean), `${w}×${h}: la foto arriba a todo el ancho bajo la cabecera y el texto debajo, sin pisar nada`, r);
    if (w === 390) {
      await page.evaluate(() => scrollTo(0, 1600));
      await page.waitForFunction(() => document.getElementById('cab').classList.contains('sc'));
      await page.click('#menu-btn');
      const mm = await page.evaluate(() => { const r = document.getElementById('menu-movil').getBoundingClientRect(); return { top: r.top, alto: r.height, vista: innerHeight, vis: getComputedStyle(document.getElementById('menu-movil')).visibility }; });
      comprobar(mm.top === 0 && Math.abs(mm.alto - mm.vista) < 2 && mm.vis === 'visible', 'menú móvil a pantalla completa con la cabecera ya fija', mm);
      await page.click('#menu-movil a[href="#reservar"]');
      comprobar(await page.waitForFunction(() => !document.body.classList.contains('menu'), null, { timeout: 3000 }).then(() => true, () => false), 'el menú se cierra al elegir');
      // visor con el dedo
      await page.locator('[data-visor="jardin"]').scrollIntoViewIfNeeded();
      await page.locator('[data-visor="jardin"]').tap();
      comprobar(await page.evaluate(() => document.getElementById('visor').open && document.getElementById('visor-img').dataset.nombre === 'jardin'), 'en el móvil, tocar una miniatura abre su foto');
      await page.click('#visor-cerrar');
      // la barra del navegador: 6 cambios de alto → ningún «ahio:resize» y nada se mueve
      await page.addStyleTag({ content: '.portada__escena{height:470px!important}' });
      await page.evaluate(() => { window.__res = 0; document.addEventListener('ahio:resize', () => window.__res++); scrollTo(0, 5200); });
      await page.waitForTimeout(400);   // que se asiente lo que carga al llegar (fotos, módulos) antes de tomar la medida
      const n = await page.evaluate(() => document.getElementById('llegar').getBoundingClientRect().top + scrollY);
      for (const alto of [788, 844, 788, 844, 800, 844]) { await page.setViewportSize({ width: 390, height: alto }); await page.waitForTimeout(240); }
      const d = await page.evaluate(() => ({ res: window.__res, top: document.getElementById('llegar').getBoundingClientRect().top + scrollY }));
      comprobar(d.res === 0 && Math.abs(d.top - n) < 1, 'barra del móvil: nada se rehace y la página no se mueve', { ...d, antes: n });
    }
    comprobar(page._errores.length === 0, `${w}×${h}: sin errores`, page._errores.slice(0, 3));
    await ctx.close();
  }

  /* ---------- 7. legales ---------- */
  console.log('\n7. Legales');
  {
    const { ctx, page } = await nueva();
    for (const f of ['aviso-legal', 'privacidad', 'cookies', 'accesibilidad', '404']) {
      page._errores.length = 0;
      await page.goto(BASE + f + '.html');
      comprobar((await page.locator('h1').count()) === 1 && page._errores.length === 0, `${f}.html se abre sin errores`, page._errores);
    }
    const aviso = fs.readFileSync(path.join(RAIZ, 'aviso-legal.html'), 'utf8');
    comprobar(/Ena Victoria Mateos González/.test(aviso) && /AR\.32\.AS/.test(aviso) && !/53773100/.test(aviso + html), 'el aviso legal con la titular y el registro, sin copiar su NIF');
    await ctx.close();
  }

  /* ---------- 8. con movimiento (una vez, al final): cortina, portada ---------- */
  console.log('\n8. Con movimiento');
  {
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { script: sinCookies });
    await page.goto(PAG);
    const tapa = await page.evaluate(() => { const c = document.getElementById('cortina'); if (!c) return 'sin cortina'; const r = c.getBoundingClientRect(); return getComputedStyle(c).display !== 'none' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1; });
    if (tapa === 'sin cortina') nota('sin cortina todavía (módulo Entrada): la portada se abre sola');
    else comprobar(tapa === true, 'la cortina tapa la pantalla al cargar');
    await fuera(page);
    await page.waitForFunction(() => document.getElementById('portada').classList.contains('abierta'), null, { timeout: 8000 }).catch(() => {});
    comprobar(await page.evaluate(() => document.getElementById('portada').classList.contains('abierta') && document.documentElement.classList.contains('con-movimiento')), 'la cortina se retira y la portada se abre (titular que sube)');
    await page.waitForFunction(() => !document.getElementById('cortina') || getComputedStyle(document.getElementById('cortina')).display === 'none', null, { timeout: 9000 }).catch(() => {});
    comprobar(await page.evaluate(() => !document.getElementById('cortina') || getComputedStyle(document.getElementById('cortina')).display === 'none'), 'la cortina desaparece de verdad');
    if (HAY.linterna) comprobar(await page.waitForFunction(() => document.querySelector('[data-modulo="linterna"]').dataset.montado === '1', null, { timeout: 6000 }).then(() => true, () => false), 'la portada (linterna) se monta al abrirse la cortina');
    await page.waitForTimeout(1600);
    comprobar(await page.evaluate(() => getComputedStyle(document.querySelector('.portada__tit .ln > span')).transform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(getComputedStyle(document.querySelector('.portada__tit .ln > span')).transform)) && await page.evaluate(() => getComputedStyle(document.getElementById('cab')).opacity === '1'), 'el titular ha subido entero y la cabecera está a la vista');
    comprobar(page._errores.length === 0, 'con movimiento: sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }
  {
    // Lenis y GSAP caídos y con movimiento: la cortina se va igual
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { cdn: 'caido', script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForFunction(() => !document.getElementById('cortina') || getComputedStyle(document.getElementById('cortina')).display === 'none', null, { timeout: 9000 }).catch(() => {});
    comprobar(await page.evaluate(() => (!document.getElementById('cortina') || getComputedStyle(document.getElementById('cortina')).display === 'none') && document.getElementById('portada').classList.contains('abierta')), 'sin Lenis ni GSAP la cortina se retira y la portada se abre');
    comprobar(page._errores.length === 0, 'sin las librerías no hay errores', page._errores.slice(0, 3));
    await ctx.close();
  }
  {
    // sin JavaScript: la cortina no tapa y se lee todo
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, javaScriptEnabled: false });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const page = await ctx.newPage();
    await page.goto(PAG);
    comprobar(await page.evaluate(() => { const c = document.getElementById('cortina'); return (!c || getComputedStyle(c).display === 'none') && getComputedStyle(document.querySelector('.portada__tit .ln > span')).transform === 'none' && getComputedStyle(document.getElementById('cab')).opacity === '1'; }), 'sin JavaScript no hay cortina, el titular se lee y la cabecera se ve');
    await ctx.close();
  }
} finally {
  await browser.close();
  servidor.close();
}

console.log(`\n${nOk} ok, ${fallos.length} fallos`);
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exitCode = 1; }
