/* La marca de Ahío San Martín: su logo real (ref/marca/logo-ahio-648.png, 648×632, verde #023919 sobre
   crema #FAF6E1). NO se redibuja: se recorta y se reduce. Para poder ponerlo sobre crema, lana o una foto,
   el papel se vuelve transparente calculando el alfa de cada píxel entre el crema y el verde (el trazo y
   su antialias quedan tal cual, en su verde).
   Uso: node scripts/marca.mjs → marca/
     simbolo-96.png, simbolo-192.png  la casa con la linterna (cabecera)
     nombre-480.png, nombre-960.png   «Ahío San Martín» con su letra (cabecera, junto a la casa)
     logo-320.png, logo-640.png       el logo entero, transparente (pie, 404)
     favicon.svg, favicon-32.png, apple-touch-icon.png, icono-512.png  (la casa sobre crema)
   e img/og.jpg (1200×630). Necesita antes img/fotos/ (scripts/fotos.mjs). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = path.join(RAIZ, 'ref/marca/logo-ahio-648.png');
const CREMA = [250, 246, 225], VERDE = [2, 57, 25];
fs.mkdirSync(path.join(RAIZ, 'marca'), { recursive: true });

// 1. el logo con el papel transparente: alfa = cuánto se aleja del crema hacia el verde (canal verde, el de más recorrido)
const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const a0 = data[i * 4 + 3] / 255;
  const g = data[i * 4 + 1];
  let a = Math.min(1, Math.max(0, (CREMA[1] - g) / (CREMA[1] - VERDE[1])));
  if (a < 0.03) a = 0;
  out[i * 4] = VERDE[0]; out[i * 4 + 1] = VERDE[1]; out[i * 4 + 2] = VERDE[2];
  out[i * 4 + 3] = Math.round(a * a0 * 255);
}
const limpio = sharp(out, { raw: { width: W, height: H, channels: 4 } }).png();
const limpioBuf = await limpio.toBuffer();

// las piezas, con su caja medida en el PNG (bandas de tinta): casa 206–442 × 46–253, nombre 11–629 × 312–369
const pieza = (left, top, width, height) => sharp(limpioBuf).extract({ left, top, width, height }).png().toBuffer();
const casa = await pieza(200, 40, 250, 220);
const nombre = await pieza(6, 306, 630, 70);
const entero = await pieza(4, 36, 636, 574);
const guardar = async (buf, ancho, f) => sharp(buf).resize({ width: ancho, kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(RAIZ, 'marca', f));
await guardar(casa, 96, 'simbolo-96.png');
await guardar(casa, 192, 'simbolo-192.png');
await guardar(nombre, 480, 'nombre-480.png');
await guardar(nombre, 960, 'nombre-960.png');
await guardar(entero, 320, 'logo-320.png');
await guardar(entero, 640, 'logo-640.png');

// 2. iconos: la casa centrada sobre crema
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
async function icono(tam, radio = 0, marco = 0.14) {
  const lado = Math.round(tam * (1 - 2 * marco));
  const dib = await sharp(casa).resize({ width: lado, height: lado, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  const m = await sharp(dib).metadata();
  const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${radio}" fill="${hex(CREMA)}"/></svg>`);
  return sharp(fondo).composite([{ input: dib, left: Math.round((tam - m.width) / 2), top: Math.round((tam - m.height) / 2) }]).png().toBuffer();
}
await sharp(await icono(64, 12, 0.1)).resize(32, 32).png().toFile(path.join(RAIZ, 'marca/favicon-32.png'));
await sharp(await icono(180)).png().toFile(path.join(RAIZ, 'marca/apple-touch-icon.png'));
await sharp(await icono(512)).png().toFile(path.join(RAIZ, 'marca/icono-512.png'));
const b64 = (await icono(96, 18, 0.1)).toString('base64');
fs.writeFileSync(path.join(RAIZ, 'marca/favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 96 96"><image width="96" height="96" href="data:image/png;base64,${b64}"/></svg>\n`);

// 3. og:image 1200×630: la casa en la niebla a la derecha y el logo entero sobre crema a la izquierda
const logoOg = await sharp(entero).resize({ width: 360, kernel: 'lanczos3' }).png().toBuffer();
const lm = await sharp(logoOg).metadata();
const foto = await sharp(path.join(RAIZ, 'img/fotos/niebla-fachada-1024.jpg')).resize(700, 630, { fit: 'cover', position: 'centre' }).toBuffer();
const fundido = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${hex(CREMA)}" stop-opacity="1"/><stop offset=".28" stop-color="${hex(CREMA)}" stop-opacity="0"/></linearGradient></defs><rect width="700" height="630" fill="url(#g)"/></svg>`);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${hex(CREMA)}"/>
  <text x="70" y="560" font-family="Georgia, serif" font-size="25" fill="#1D2420">Ocho apartamentos en el antiguo ayuntamiento</text>
  <text x="70" y="594" font-family="Georgia, serif" font-size="25" fill="#1D2420">de San Martín de Oscos (Asturias)</text></svg>`;
await sharp(Buffer.from(og)).composite([
  { input: foto, left: 500, top: 0 },
  { input: fundido, left: 500, top: 0 },
  { input: logoOg, left: 90, top: Math.round((500 - lm.height) / 2) },
]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(RAIZ, 'img/og.jpg'));
console.log(`marca/ listo (logo ${lm.width}×${lm.height} en el og) e img/og.jpg`);
