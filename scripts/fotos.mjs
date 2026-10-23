/* Prepara las fotos de la web desde las de su WordPress (ref/fotos/web). Tabla y criterios: ref/FOTOS.md.
   Uso: node scripts/fotos.mjs            → todas
        node scripts/fotos.mjs plaza bano → solo esas (las demás se conservan en fotos.json)
   - Lista, recortes y ajustes en scripts/fotos-lista.json.
   - `tipo: "movil"` (las de 2022, de móvil, con HDR y paredes muy amarillas): se baja el HDR
     (contraste local: se resta parte del detalle grueso), menos saturación, y en las de dentro
     (`interior`) aún menos en los amarillos de pared y medio balance de blancos «mundo gris».
   - `tipo: "dsc"` (las DSC* profesionales de 2026): casi tal cual (fuerza 0,25 si no se dice otra).
   - `fuerza` (0–1) mezcla la foto gradada con la original; 0 = sin tocar (la antigua en blanco y negro).
   - NUNCA amplía: anchos 480, 800, 1024, 1280 y 1600 solo si caben, más el ancho mayor
     (limitado por `maxAncho`). La `antiguo` (248 px) sale solo a 248.
   - Escribe img/fotos/<nombre>-<ancho>.{avif,webp,jpg} e img/fotos/fotos.json
     ([{ nombre, anchos, ancho, alto, origen }]). Los módulos piden las fotos por nombre. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(RAIZ, 'ref');
const SALIDA = path.join(RAIZ, 'img/fotos');
fs.mkdirSync(SALIDA, { recursive: true });

const FOTOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8'));
const ANCHOS = [480, 800, 1024, 1280, 1600];
const solo = process.argv.slice(2);

// peso suave de un tono alrededor de un centro (grados): 1 en el centro, 0 fuera de ±ancho
function peso(h, centro, ancho) {
  let d = Math.abs(h - centro); if (d > 180) d = 360 - d;
  return d >= ancho ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d / ancho);
}

function gradar(data, borroso, canales, f) {
  const fuerza = f.fuerza ?? (f.tipo === 'dsc' ? 0.25 : 1);
  if (fuerza <= 0) return data;
  const movil = f.tipo === 'movil';
  const n = data.length / canales;
  let gr = 1, gg = 1, gb = 1;
  if (f.interior) {
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < data.length; i += canales) { sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; }
    const mr = sr / n, mg = sg / n, mb = sb / n, mm = (mr + mg + mb) / 3;
    gr = 1 + 0.5 * (mm / mr - 1); gg = 1 + 0.5 * (mm / mg - 1); gb = 1 + 0.5 * (mm / mb - 1);
  }
  const DEHDR = movil ? 0.28 : 0;   // cuánto detalle grueso se quita (baja el «HDR» del móvil)
  const LEVANTE = 0.03;
  for (let i = 0; i < data.length; i += canales) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    if (DEHDR) { r -= DEHDR * (r - borroso[i]); g -= DEHDR * (g - borroso[i + 1]); b -= DEHDR * (b - borroso[i + 2]); }
    r = Math.min(1, Math.max(0, r * gr / 255)); g = Math.min(1, Math.max(0, g * gg / 255)); b = Math.min(1, Math.max(0, b * gb / 255));
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    let h = 0;
    if (c > 0) {
      if (max === r) h = 60 * (((g - b) / c) % 6);
      else if (max === g) h = 60 * ((b - r) / c + 2);
      else h = 60 * ((r - g) / c + 4);
      if (h < 0) h += 360;
    }
    let s = max === 0 ? 0 : c / max;
    let v = max;
    // menos saturación; en las de móvil, menos aún en los amarillos de pared (~48º) y naranjas (~28º),
    // y en el verde chillón del césped (~95º)
    s *= movil ? 0.86 : 0.95;
    if (movil) s *= 1 - (f.interior ? 0.32 : 0.15) * peso(h, 48, 22) - 0.12 * peso(h, 28, 18) - 0.15 * peso(h, 95, 40);
    // luces un pelo comprimidas (el HDR quema las ventanas)
    if (movil && v > 0.82) v = 0.82 + (v - 0.82) * 0.8;
    const cc = v * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), m0 = v - cc;
    let rr, gg2, bb;
    if (h < 60) [rr, gg2, bb] = [cc, x, 0];
    else if (h < 120) [rr, gg2, bb] = [x, cc, 0];
    else if (h < 180) [rr, gg2, bb] = [0, cc, x];
    else if (h < 240) [rr, gg2, bb] = [0, x, cc];
    else if (h < 300) [rr, gg2, bb] = [x, 0, cc];
    else [rr, gg2, bb] = [cc, 0, x];
    const curva = (t) => LEVANTE + (1 - LEVANTE - 0.015) * t;
    r = curva(rr + m0); g = curva(gg2 + m0); b = curva(bb + m0);
    const o0 = data[i], o1 = data[i + 1], o2 = data[i + 2];
    data[i] = Math.round(o0 + (r * 255 - o0) * fuerza);
    data[i + 1] = Math.round(o1 + (g * 255 - o1) * fuerza);
    data[i + 2] = Math.round(o2 + (b * 255 - o2) * fuerza);
  }
  return data;
}

const previo = fs.existsSync(path.join(SALIDA, 'fotos.json')) ? JSON.parse(fs.readFileSync(path.join(SALIDA, 'fotos.json'), 'utf8')) : [];
const salida = [];
for (const f of FOTOS) {
  if (solo.length && !solo.includes(f.nombre)) { const p = previo.find((x) => x.nombre === f.nombre); if (p) salida.push(p); continue; }
  const fuente = path.join(REF, f.ruta);
  if (!fs.existsSync(fuente)) throw new Error(`Falta ${fuente} (${f.nombre})`);
  let base = sharp(fuente).rotate();
  if (f.recorte) base = base.extract(f.recorte);
  const { data, info } = await base.removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let borroso = null;
  if (f.tipo === 'movil' && (f.fuerza ?? 1) > 0) {
    borroso = (await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: info.channels } })
      .blur(Math.max(4, W / 70)).raw().toBuffer());
  }
  gradar(data, borroso, info.channels, f);
  const buf = await sharp(data, { raw: { width: W, height: H, channels: info.channels } }).png().toBuffer();
  const tope = Math.min(W, f.maxAncho || W);
  const unicos = [...new Set([...ANCHOS.filter((w) => w < tope - 30), tope])];
  for (const w of unicos) {
    let p = sharp(buf).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' });
    if (!f.suave) p = p.sharpen({ sigma: 0.5, m1: 0.4, m2: 0.8 });
    const dst = path.join(SALIDA, `${f.nombre}-${w}`);
    await p.clone().avif({ quality: f.aq ?? 50, effort: 4 }).toFile(dst + '.avif');
    await p.clone().webp({ quality: f.wq ?? 74 }).toFile(dst + '.webp');
    await p.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(dst + '.jpg');
  }
  const alto = Math.round(H * tope / W);
  salida.push({ nombre: f.nombre, anchos: unicos, ancho: tope, alto, origen: f.ruta, recorte: f.recorte || null });
  console.log(f.nombre.padEnd(22), unicos.join(','), `${tope}x${alto}`);
}
// el orden de la lista manda
salida.sort((a, b) => FOTOS.findIndex((x) => x.nombre === a.nombre) - FOTOS.findIndex((x) => x.nombre === b.nombre));
fs.writeFileSync(path.join(SALIDA, 'fotos.json'), JSON.stringify(salida, null, 1));
console.log(salida.length + ' fotos');
