# «Los Oscos en 3D» (sección #oscos, módulo Ruta): datos del 3D, del plano y de las distancias por carretera.
#
# Fuentes (se descargan una vez a pruebas/3d-fuente/, que NO se publica; con un User-Agent propio, sin datos personales, y pausas):
#   - MDT05 del IGN por WCS (Elevacion4258_5) y ortofoto PNOA por WMS (OI.OrthoimageCoverage): © Instituto Geográfico
#     Nacional, CC BY 4.0. Dos parches finos: San Martín (la casa) y Mon (el palacio y el mazo, junto al Ahío).
#   - El curso de los ríos: red hidrográfica del IGN por WFS INSPIRE (hy-p:Watercourse, con nombre), © IGN, CC BY 4.0.
#     OpenStreetMap NO tiene el río Ahío (2026-10-23: ni por nombre ni ningún cauce junto al Mazo de Mon); el IGN sí.
#   - Los lugares: OpenStreetMap (ids abajo). Las distancias por carretera: OSRM (router.project-osrm.org, perfil coche),
#     datos © colaboradores de OpenStreetMap. Se guardan en ref/raw/rutas.json (las usa también la web en «Alrededor»).
#
# Lo que cuenta: el río Ahío NO pasa por el pueblo. Nace al norte del concejo, baja hacia el sur por el Mazo de Mon y
# se junta con el Agüeira. Por San Martín pasa el río San Martín, que también acaba en el Agüeira, unos kilómetros
# aguas arriba. El hilo de oro recorre el Ahío entero y después «remonta el agua»: Agüeira arriba hasta la boca del
# río San Martín y río San Martín arriba hasta la casa (a unos 60–90 m del cauce).
#
# Caja: lat 43,216–43,336, lon −7,072 – −6,838 (≈19 × 13 km): los tres Oscos, el Ahío entero, la Seimeira (Pumares),
#   Mazonovo, Mon, y al este la presa de Salime y el mirador de A Paicega.
#
# Salida en img/terreno/:
#   alturas-<nx>x<nz>.bin   Uint16 little-endian, decímetros, fila 0 = norte (móvil 384 / escritorio 576 de ancho)
#   orto-2048.*, orto-4096.* ortofoto (móvil / escritorio), fila 0 = norte
#   casa-1024.*, casa-1536.*, mon-1024.*, mon-1536.*  los parches finos (móvil / escritorio)
#   plano-base.*            relieve sombreado sobre la ortofoto con los ríos en tenue (el plano animado dibuja el hilo encima)
#   plano.*                 lo mismo con el hilo de oro, los puntos y los rótulos (respaldo de la web, sin JS)
#   terreno.json            caja, mallas, lugares, el hilo (x, z cada 12 m y la altura real), sus tramos y sus partes
# Y ref/raw/rutas.json (distancias por carretera desde la casa).
#
# Uso (desde la carpeta de la web): python -I scripts/terreno.py      (con «solo-bajar»: solo las descargas)
import json, math, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import date
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')   # la consola de Windows (cp1252) no sabe escribir «→»

R = pathlib.Path(__file__).resolve().parent.parent
FUENTE = R / 'pruebas' / '3d-fuente'
OUT = R / 'img' / 'terreno'
RUTAS = R / 'ref' / 'raw' / 'rutas.json'
FUENTE.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'AhioWebRuta/1.0 (web local de prueba; relieve y rutas de Los Oscos)'}

S, N, O, E = 43.216, 43.336, -7.072, -6.838
CASA = (43.2650908, -6.9616133)          # Turismo Asturias (DATOS); el nodo del pueblo en OSM (203834023) está a 50 m
EX = 1.5
lat0 = (S + N) / 2
KX, KZ = 111320 * math.cos(math.radians(lat0)), 110950       # metros por grado
ancho, alto = (E - O) * KX, (N - S) * KZ

# Lugares de OpenStreetMap (consultados por Overpass el 2026-10-23; etiquetas comprobadas). «coche»: el punto al que se
# pide la ruta (si no es el propio lugar: la Seimeira se alcanza a pie desde Pumares; Mazonovo, desde su aparcamiento).
LUGARES = [
    # id,            nombre,                                   osm,              lat, lon,                coche (lat, lon) o None, en el 3D
    ('santa-eulalia', 'Santa Eulalia de Oscos',                'way/259918495',  43.25896, -7.02048, None, True),     # Ayuntamiento (amenity=townhall)
    ('villanueva',    'Villanueva de Oscos',                   'way/141471019',  43.31149, -6.98687, None, True),     # Ayuntamiento (amenity=townhall)
    ('seimeira',      'La Seimeira',                           'node/2052120514', 43.26937, -7.05605, (43.26192, -7.03284), True),  # waterway=waterfall; coche: Pumares (node/1137818573)
    ('mazonovo',      'Mazonovo',                              'node/9168136537', 43.23512, -7.01363, (43.23652, -7.01276), True),  # Conjunto Etnográfico (tourism=museum); coche: su aparcamiento (node/9168136538)
    ('mon',           'Palacio de Mon',                        'way/1436720740', 43.26983, -6.91493, None, True),     # historic=manor
    ('mazo-mon',      'Mazo de Mon',                           'node/1129322875', 43.27246, -6.89996, None, True),    # place=hamlet, junto al Ahío
    ('sargadelos',    'Casa natal del Marqués de Sargadelos',  'way/509506861',  43.24739, -7.01145, None, False),    # tourism=museum (Ferreirela de Baxo)
    ('casa-marco',    'Casa del Marco',                        'way/1432033670', 43.22364, -6.95172, None, False),    # building=house, en Villarquille
    ('salime',        'Presa de Salime',                       'way/89754799',   43.23649, -6.84694, None, False),    # man_made=dam
    ('paicega',       'Mirador de A Paicega',                  'way/1547746270', 43.24258, -6.84865, None, False),    # tourism=viewpoint (Miradoiro da Paicega)
    ('taramundi',     'Taramundi',                             'node/189180964', 43.36057, -7.10882, None, False),    # place=village (fuera de la caja)
]

def parche(c, lado):   # caja s, n, o, e de un cuadrado de «lado» metros centrado en c
    dl, do = lado / 2 / KZ, lado / 2 / KX
    return (c[0] - dl, c[0] + dl, c[1] - do, c[1] + do)
MON_C = (43.2711, -6.9075)               # entre el palacio de Mon y el Mazo de Mon (1,2 km), con el Ahío
P_CASA, P_MON = parche(CASA, 900), parche(MON_C, 1700)

# ---------- 0. Descargas (una vez; pausa entre peticiones) ----------
def baja(url, f, minimo=20000, espera=2):
    p = FUENTE / f
    if p.exists() and p.stat().st_size > minimo: return p
    print('pido', f, flush=True)
    for intento in range(4):   # el IGN y OSRM dan algún 5xx suelto: varios intentos, con calma
        try: d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read(); break
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if getattr(e, 'code', 500) < 500 or intento == 3: raise
            print('  ', getattr(e, 'code', e), 'otra vez en', 15 * (intento + 1), 's'); time.sleep(15 * (intento + 1))
    p.write_bytes(d); print('  ', f, len(d) // 1024, 'KB'); time.sleep(espera)
    return p
WMS = 'https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&FORMAT=image/jpeg'
# el WCS da como mucho 4096 px por lado (el MDT05 va a 4,5e-5°): dos hojas, oeste y este, que se cosen por sus tiepoints
MEDIO = (O + E) / 2
HOJAS = (('mdt5-oeste.tif', O, MEDIO + .002), ('mdt5-este.tif', MEDIO - .002, E))
for f, o, e in HOJAS:
    baja('https://servicios.idee.es/wcs-inspire/mdt?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=Elevacion4258_5'
         f'&SUBSET=Lat({S},{N})&SUBSET=Long({o},{e})&FORMAT=image/tiff', f, 1_000_000)
OW = 4096; OH = round(OW * alto / ancho)
baja(f'{WMS}&BBOX={S},{O},{N},{E}&WIDTH={OW}&HEIGHT={OH}', 'pnoa-4096.jpg')
# los ríos con nombre de la red hidrográfica del IGN (WFS INSPIRE), en la caja
baja('https://servicios.idee.es/wfs-inspire/hidrografia?service=WFS&version=2.0.0&request=GetFeature&typeNames=hy-p:Watercourse'
     f'&srsName=urn:ogc:def:crs:EPSG::4326&bbox={S},{O},{N},{E},urn:ogc:def:crs:EPSG::4326&count=1000', 'ign-rios.xml', 100000)
# los parches finos son un extra: si el WMS no responde, la escena va sin ellos (se piden la próxima vez)
for nombre, (s, n, o, e) in (('casa', P_CASA), ('mon', P_MON)):
    try: baja(f'{WMS}&BBOX={s},{o},{n},{e}&WIDTH=2048&HEIGHT=2048', f'{nombre}-pnoa.jpg')
    except Exception as er: print('  sin parche', nombre, er)
# las rutas por carretera desde la casa (OSRM, perfil coche), una a una con pausa
SIN_RUTA = {'mazo-mon'}   # su web: «de difícil acceso»; OSRM lo alcanza por pistas (18 km): no se da cifra
for lid, _, _, la, lo, coche, _ in LUGARES:
    if lid in SIN_RUTA: continue
    cla, clo = coche or (la, lo)
    baja(f'https://router.project-osrm.org/route/v1/driving/{CASA[1]},{CASA[0]};{clo},{cla}?overview=false', f'osrm-{lid}.json', 200, 1.2)

if __name__ == '__main__' and 'solo-bajar' in sys.argv:
    raise SystemExit

# ---------- 1. Relieve: las dos hojas cosidas en la rejilla del MDT05 y recortadas a la caja ----------
hojas = [Image.open(FUENTE / f) for f, _, _ in HOJAS]
px, py = hojas[0].tag_v2[33550][:2]
wD, hD = round((E - O) / px), round((N - S) / py)
dem = np.zeros((hD, wD), np.float32); hecho = np.zeros((hD, wD), bool)
for im in hojas:
    a = np.array(im, dtype=np.float32); x0 = round((im.tag_v2[33922][3] - O) / px); y0 = round((N - im.tag_v2[33922][4]) / py)
    xa, ya = max(0, x0), max(0, y0); xb, yb = min(wD, x0 + a.shape[1]), min(hD, y0 + a.shape[0])
    dem[ya:yb, xa:xb] = a[ya - y0:yb - y0, xa - x0:xb - x0]; hecho[ya:yb, xa:xb] = True
assert hecho.all(), 'faltan píxeles del MDT en la caja'
dem_bruto = dem.copy()
# el MDT05 del WCS viene en metros enteros: un desenfoque de 1,5 px (≈7 m) quita los escalones de las laderas suaves
dem = nd.gaussian_filter(dem, 1.5)
def local(lat, lon): return [round((lon - (O + E) / 2) * KX, 1), round(((S + N) / 2 - lat) * KZ, 1)]
def cota_xz(x, z, d=None):   # altura real (bilineal) en metros locales
    c = (x / ancho + .5) * (wD - 1); r = (z / alto + .5) * (hD - 1)
    return float(nd.map_coordinates(dem if d is None else d, [[r], [c]], order=1, mode='nearest')[0])
def cota(lat, lon, d=None): return cota_xz(*local(lat, lon), d)

# ---------- 2. Mallas (área media, sin escalones) ----------
MALLAS = []
for nx in (384, 576):
    nz = round(nx * alto / ancho)
    a = np.array(Image.fromarray(dem).resize((nx, nz), Image.BOX), dtype=np.float32)
    (OUT / f'alturas-{nx}x{nz}.bin').write_bytes(np.round(np.clip(a, 0, 6000) * 10).astype('<u2').tobytes())
    MALLAS.append([nx, nz])

# ---------- 3. Los ríos del IGN: el Ahío entero, y el agua que lleva hasta la casa ----------
xml = (FUENTE / 'ign-rios.xml').read_text(encoding='utf-8')
segs = {}   # nombre → [[(lat, lon), …], …]
for f in re.split(r'<hy-p:Watercourse ', xml)[1:]:
    nm = re.findall(r'<gn:text>([^<]*)</gn:text>', f)
    for pl in re.findall(r'<gml:posList[^>]*>([^<]*)</gml:posList>', f):
        v = list(map(float, pl.split()))
        segs.setdefault(nm[0] if nm else '', []).append(list(zip(v[0::2], v[1::2])))
print('ríos del IGN en la caja:', len(segs), '| Ahío', len(segs.get('Río Ahío', [])), 'tramos | Agüeira', len(segs.get('Río Agüeira', [])),
      '| San Martín', len(segs.get('Río San Martín', [])))
clave = lambda p: (round(p[0], 5), round(p[1], 5))
def grafo(lista):   # nodos = extremos de los tramos; aristas = los tramos (con sus puntos)
    g = {}
    for s in lista:
        a, b = clave(s[0]), clave(s[-1]); g.setdefault(a, []).append((b, s)); g.setdefault(b, []).append((a, s[::-1]))
    return g
def camino(g, a, b):   # el camino más corto (en metros) de a a b por el grafo
    largo = lambda s: sum(math.hypot((s[i + 1][0] - s[i][0]) * KZ, (s[i + 1][1] - s[i][1]) * KX) for i in range(len(s) - 1))
    dist, prev, pend = {a: 0}, {}, {a}
    while pend:
        u = min(pend, key=dist.get); pend.remove(u)
        if u == b: break
        for v, s in g[u]:
            d = dist[u] + largo(s)
            if d < dist.get(v, 1e18): dist[v] = d; prev[v] = (u, s); pend.add(v)
    assert b in dist, 'el río no llega'
    out, v, cadena = [], b, []   # de b hacia atrás, y después en orden
    while v != a: u, s = prev[v]; cadena.append(s); v = u
    for s in reversed(cadena): out += s if not out else s[1:]
    return out
def mas_cerca(g, p):
    return min(g, key=lambda q: math.hypot((q[0] - p[0]) * KZ, (q[1] - p[1]) * KX))
# el Ahío: de su extremo más alto (la fuente) al más bajo (la boca en el Agüeira)
gA = grafo(segs['Río Ahío'])
hojasA = [k for k, v in gA.items() if len(v) == 1]
fuente_ahio = max(hojasA, key=lambda k: cota(*k)); boca_ahio = min(hojasA, key=lambda k: cota(*k))
ahio = camino(gA, fuente_ahio, boca_ahio)
# el río San Martín: de su boca en el Agüeira hacia arriba, hasta el punto más cercano a la casa
gS = grafo(segs['Río San Martín'])
hojasS = [k for k, v in gS.items() if len(v) == 1]
boca_sm = min(hojasS, key=lambda k: cota(*k)); fuente_sm = max(hojasS, key=lambda k: cota(*k))
sm = camino(gS, boca_sm, fuente_sm)
dcasa = [math.hypot((p[0] - CASA[0]) * KZ, (p[1] - CASA[1]) * KX) for p in sm]
i_casa = int(np.argmin(dcasa)); sm = sm[:i_casa + 1]
print('la casa está a', round(dcasa[i_casa]), 'm del río San Martín (IGN)')
# el Agüeira: de la boca del Ahío a la del San Martín (aguas arriba); el IGN parte el Agüeira en varios nombres: se usan
# todos los tramos que se llamen «…Agüeira»
gG = grafo([s for k, v in segs.items() if 'Agüeira' in k for s in v])
a0, a1 = mas_cerca(gG, boca_ahio), mas_cerca(gG, boca_sm)
for p, q, t in ((boca_ahio, a0, 'Ahío'), (boca_sm, a1, 'San Martín')):
    dd = math.hypot((p[0] - q[0]) * KZ, (p[1] - q[1]) * KX); print(f'  boca del {t} → Agüeira: {dd:.0f} m'); assert dd < 60
ague = camino(gG, a0, a1)
partes_ll = [('ahio', ahio), ('agueira', ague), ('sanmartin', sm)]

# a metros locales, cada 12 m, con la altura real (el MDT sin suavizar, mínimo en 15 m alrededor: el fondo del cauce)
PASO = 12.0
dem_fondo = nd.minimum_filter(nd.gaussian_filter(dem_bruto, .8), size=3)
X, Z, H, PARTE = [], [], [], []
largos = {}
for k, (nombre, ll) in enumerate(partes_ll):
    xz = np.array([local(la, lo) for la, lo in ll], dtype=np.float64)
    seg = np.hypot(*np.diff(xz, axis=0).T); keep = np.concatenate([[True], seg > .01]); xz = xz[keep]
    s_ = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(xz, axis=0).T))])
    largos[nombre] = float(s_[-1])
    t = np.arange(0, s_[-1], PASO); t = np.append(t, s_[-1])
    if k: t = t[1:]   # el primer punto de cada parte es el último de la anterior
    rx, rz = np.interp(t, s_, xz[:, 0]), np.interp(t, s_, xz[:, 1])
    rh = [cota_xz(x, z, dem_fondo) for x, z in zip(rx, rz)]
    X += list(rx); Z += list(rz); H += rh; PARTE += [k] * len(rx)
X, Z, H = np.array(X), np.array(Z), np.array(H)
# la altura del agua no sube río abajo: en el Ahío, mínimo acumulado; al remontar, máximo acumulado (sin dientes del MDT)
PARTE = np.array(PARTE)
iA = np.where(PARTE == 0)[0]; H[iA] = np.minimum.accumulate(H[iA])
iR = np.where(PARTE > 0)[0]; H[iR] = np.maximum.accumulate(H[iR])
H = nd.uniform_filter1d(H, 9, mode='nearest')
n = len(X); LARGO = (n - 1) * PASO
lim = [int(np.where(PARTE == k)[0][0]) for k in range(3)] + [n - 1]
print('el hilo:', n, 'puntos,', round(LARGO), 'm | Ahío', round(largos['ahio']), 'm · Agüeira', round(largos['agueira']), 'm · San Martín', round(largos['sanmartin']), 'm')

# tramos (lo que se lee en el cuaderno): solo hechos medibles
def idx_cerca(lat, lon, desde=0, hasta=None):
    p = local(lat, lon); hasta = n if hasta is None else hasta
    d = np.hypot(X[desde:hasta] - p[0], Z[desde:hasta] - p[1]); i = int(np.argmin(d)); return desde + i, float(d[i])
i_mazo, d_mazo = idx_cerca(43.27246, -6.89996, 0, lim[1])
i_mon, d_mon = idx_cerca(43.26983, -6.91493, 0, lim[1])
print('Mazo de Mon a', round(d_mazo), 'm del Ahío (i', i_mazo, ') · palacio de Mon a', round(d_mon), 'm')
km = lambda i: round(i * PASO / 1000, 1)
TRAMOS = [
    {'i': 0, 'k': 'nace', 't': f'El Ahío nace al norte del concejo, a {round(H[0])} m'},
    {'i': max(1, i_mazo - 150), 'k': 'baja', 't': 'Baja hacia el sur entre montes, cada vez más encajado'},
    {'i': i_mazo, 'k': 'mazo', 't': f'Pasa por el Mazo de Mon, a {round(H[i_mazo])} m'},
    {'i': lim[1], 'k': 'boca', 't': f'Se junta con el Agüeira, a {round(H[lim[1]])} m'},
    {'i': lim[1] + 1, 'k': 'remonta', 't': 'Desde ahí, el hilo remonta el agua: Agüeira arriba'},
    {'i': lim[2], 'k': 'sanmartin', 't': 'Y río San Martín arriba, hasta el pueblo'},
    {'i': n - 1, 'k': 'casa', 't': 'Ahío San Martín · el antiguo ayuntamiento'},
]
print('tramos', [(x['k'], x['i'], km(x['i'])) for x in TRAMOS])

# ---------- 4. Ortofoto (dos tamaños) y los parches finos ----------
orto = np.array(Image.open(FUENTE / 'pnoa-4096.jpg').convert('RGB'), dtype=np.float32)
# el PNOA puede traer dos vuelos con un corte vertical (un escalón que se repite en todas las filas): se busca y se iguala
paso_col = np.abs(np.median(orto[:, 4:] - orto[:, :-4], axis=0)).sum(1)
C0 = int(np.argmax(paso_col)) + 2
if paso_col[C0 - 2] > 12 and 120 < C0 < orto.shape[1] - 120:
    xx = np.arange(orto.shape[1]); peso = np.clip((xx - C0 + 70) / 140, 0, 1)
    for ch in range(3):
        g = np.median(orto[:, C0 - 90:C0 - 6, ch]) / max(1, np.median(orto[:, C0 + 6:C0 + 90, ch]))
        orto[:, :, ch] *= 1 + (g - 1) * peso
    print('corte del PNOA en la columna', C0)
orto = Image.fromarray(np.clip(orto, 0, 255).astype('uint8'))
orto = ImageEnhance.Color(ImageEnhance.Contrast(orto).enhance(1.07)).enhance(.9)
ortos = {}
for w, qj, qw in ((2048, 64, 52), (4096, 60, 46)):
    h = round(w * alto / ancho / 2) * 2
    o = orto.resize((w, h), Image.LANCZOS)
    o.save(OUT / f'orto-{w}.jpg', quality=qj, optimize=True, progressive=True)
    o.save(OUT / f'orto-{w}.webp', quality=qw, method=6)
    ortos[str(w)] = [w, h]
parches = {}
for nombre, (s, n_, o, e) in (('casa', P_CASA), ('mon', P_MON)):
    f = FUENTE / f'{nombre}-pnoa.jpg'
    if not f.exists(): continue
    im = ImageEnhance.Contrast(ImageEnhance.Color(Image.open(f).convert('RGB')).enhance(.92)).enhance(1.06)
    for w in (1024, 1536):
        iw = im.resize((w, w), Image.LANCZOS)
        iw.save(OUT / f'{nombre}-{w}.jpg', quality=72, optimize=True, progressive=True)
        iw.save(OUT / f'{nombre}-{w}.webp', quality=52, method=6)
    parches[nombre] = {'xz': local((s + n_) / 2, (o + e) / 2), 'ancho': round((e - o) * KX, 1), 'alto': round((n_ - s) * KZ, 1)}

# ---------- 5. Distancias por carretera (OSRM) → ref/raw/rutas.json ----------
rutas = []
for lid, nom, osm, la, lo, coche, en3d in LUGARES:
    if lid in SIN_RUTA: continue
    j = json.loads((FUENTE / f'osrm-{lid}.json').read_text(encoding='utf-8'))
    assert j.get('code') == 'Ok', (lid, j.get('code'))
    r0 = j['routes'][0]; w1 = j['waypoints'][1]
    rutas.append({'id': lid, 'nombre': nom, 'osm': osm, 'lat': la, 'lon': lo,
                  'hasta': ({'lat': coche[0], 'lon': coche[1], 'nota': {'seimeira': 'la ruta a pie sale de Pumares', 'mazonovo': 'aparcamiento del conjunto'}.get(lid, '')} if coche else None),
                  'km': round(r0['distance'] / 1000, 1), 'min': round(r0['duration'] / 60),
                  'ajuste_m': round(w1.get('distance', 0)), 'recta_km': round(math.hypot((la - CASA[0]) * KZ, (lo - CASA[1]) * KX) / 1000, 1)})
KMR = {r['id']: r for r in rutas}
RUTAS.write_text(json.dumps({
    'origen': {'nombre': 'Ahío San Martín (La Villa s/n, San Martín de Oscos)', 'lat': CASA[0], 'lon': CASA[1], 'fuente': 'Turismo Asturias (coordenadas de la ficha)'},
    'fecha': date.today().isoformat(),
    'fuente': 'OSRM (router.project-osrm.org, perfil coche) sobre datos © colaboradores de OpenStreetMap; lugares de OpenStreetMap (ids en «osm»)',
    'notas': ['km y min: la ruta más corta por carretera que da OSRM; los minutos de OSRM suelen quedarse cortos en carreteras de montaña: mejor usar los km.',
              'ajuste_m: lo que hay del lugar a la carretera más cercana (OSRM llega hasta ahí).',
              'Seimeira: la distancia es hasta Pumares, de donde sale la ruta a pie hasta la cascada.'],
    'lugares': rutas,
}, ensure_ascii=False, indent=2), encoding='utf-8')
for r in rutas: print(f"  {r['nombre']:40} {r['km']:5} km {r['min']:4} min  (ajuste {r['ajuste_m']} m, recta {r['recta_km']} km)")

# ---------- 6. El plano: relieve sombreado sobre la ortofoto; los ríos en tenue; y el respaldo con el hilo ----------
PW = 1800; PH = round(PW * alto / ancho)
d = np.array(Image.fromarray(dem).resize((PW, PH), Image.BOX), dtype=np.float32)
gy, gx = np.gradient(d * EX, ancho / PW)
az, al = math.radians(315), math.radians(40)
sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
hs = np.clip(math.sin(al) * np.cos(sl) + math.cos(al) * np.sin(sl) * np.cos(az - asp), 0, 1)
o = np.array(orto.resize((PW, PH), Image.LANCZOS), dtype=np.float32) / 255
base = Image.fromarray((np.clip(o * (0.34 + 0.86 * hs[..., None]), 0, 1) * 255).astype('uint8'))
K = 2
def a_plano(lat, lon): x, z = local(lat, lon); return ((x / ancho + .5) * PW * K, (z / alto + .5) * PH * K)
# los ríos con nombre del IGN, finos y del color de la niebla
big = base.resize((PW * K, PH * K), Image.LANCZOS); dr = ImageDraw.Draw(big, 'RGBA')
for nm, lista in segs.items():
    grande = bool(re.search(r'Agüeira|Navia|Ahío|San Martín', nm))
    for s in lista: dr.line([a_plano(*p) for p in s], fill=(215, 220, 218, 115 if grande else 70), width=(3 if grande else 2) * K // 2 * 2, joint='curve')
base = big.resize((PW, PH), Image.LANCZOS)
base.save(OUT / 'plano-base.jpg', quality=76, optimize=True, progressive=True); base.save(OUT / 'plano-base.webp', quality=72, method=6)
# el respaldo sin JS: el hilo en oro con un filo oscuro (el Ahío más grueso), los lugares y sus nombres
big = base.resize((PW * K, PH * K), Image.LANCZOS); dr = ImageDraw.Draw(big, 'RGBA')
pp = [((x / ancho + .5) * PW * K, (z / alto + .5) * PH * K) for x, z in zip(X, Z)]
dr.line(pp, fill=(29, 36, 32, 210), width=10 * K, joint='curve')
dr.line(pp[:lim[1] + 1], fill=(242, 184, 75), width=5 * K, joint='curve')
dr.line(pp[lim[1]:], fill=(246, 214, 150), width=3 * K, joint='curve')
try:
    F_TIT = ImageFont.truetype(str(FUENTE / 'GildaDisplay-Regular.ttf'), 25 * K)
    F_SUB = ImageFont.truetype(str(FUENTE / 'CastoroTitling-Regular.ttf'), 14 * K)
except OSError:
    F_TIT = ImageFont.truetype('georgia.ttf', 23 * K); F_SUB = ImageFont.truetype('georgia.ttf', 14 * K)
def rotulo(lat, lon, t, sub='', col=(250, 246, 225), punto=(250, 246, 225), lado='d'):
    cx, cy = a_plano(lat, lon)
    dr.ellipse([cx - 8 * K, cy - 8 * K, cx + 8 * K, cy + 8 * K], fill=(29, 36, 32)); dr.ellipse([cx - 5 * K, cy - 5 * K, cx + 5 * K, cy + 5 * K], fill=punto)
    tx = cx + 14 * K if lado == 'd' else cx - 14 * K; an = 'ls' if lado == 'd' else 'rs'
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        dr.text((tx + dx * K, cy - 2 * K + dy * K), t, font=F_TIT, fill=(29, 36, 32, 230), anchor=an)
        if sub: dr.text((tx + dx * K, cy + 18 * K + dy * K), sub, font=F_SUB, fill=(29, 36, 32, 230), anchor=an)
    dr.text((tx, cy - 2 * K), t, font=F_TIT, fill=col, anchor=an)
    if sub: dr.text((tx, cy + 18 * K), sub, font=F_SUB, fill=(215, 220, 218), anchor=an)
kmtxt = lambda lid: f"{str(KMR[lid]['km']).replace('.', ',')} KM POR CARRETERA"
rotulo(*CASA, 'Ahío San Martín', 'SAN MARTÍN DE OSCOS', col=(242, 184, 75), punto=(242, 184, 75))
rotulo(43.25896, -7.02048, 'Santa Eulalia de Oscos', kmtxt('santa-eulalia'), lado='i')
rotulo(43.31149, -6.98687, 'Villanueva de Oscos', kmtxt('villanueva'))
rotulo(43.26937, -7.05605, 'La Seimeira', 'DESDE PUMARES, ' + kmtxt('seimeira').lower().upper())
rotulo(43.23512, -7.01363, 'Mazonovo', kmtxt('mazonovo'))
rotulo(43.26983, -6.91493, 'Palacio de Mon', kmtxt('mon'), lado='i')
rotulo(43.27246, -6.89996, 'Mazo de Mon', 'JUNTO AL AHÍO')
# el nombre del río, junto a su curso (a media bajada)
im_ = (lim[0] + lim[1]) // 3
cx, cy = pp[im_]
for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)): dr.text((cx + 16 * K + dx * K, cy + dy * K), 'río Ahío', font=F_TIT, fill=(29, 36, 32, 230), anchor='lm')
dr.text((cx + 16 * K, cy), 'río Ahío', font=F_TIT, fill=(242, 184, 75), anchor='lm')
# escala (2 km) y norte, abajo a la derecha
m2 = 2000 / ancho * PW * K; bx, by = PW * K - 40 * K - m2, PH * K - 34 * K
dr.rectangle([bx - 12 * K, by - 30 * K, bx + m2 + 12 * K, by + 14 * K], fill=(29, 36, 32, 170))
dr.line([(bx, by), (bx + m2, by)], fill=(250, 246, 225), width=2 * K)
for xx in (bx, bx + m2 / 2, bx + m2): dr.line([(xx, by - 5 * K), (xx, by + 5 * K)], fill=(250, 246, 225), width=2 * K)
dr.text((bx + m2 / 2, by - 9 * K), '2 KM', font=F_SUB, fill=(250, 246, 225), anchor='ms')
nx_, ny_ = bx - 30 * K, by - 8 * K
dr.polygon([(nx_, ny_ - 14 * K), (nx_ - 6 * K, ny_ + 4 * K), (nx_, ny_), (nx_ + 6 * K, ny_ + 4 * K)], fill=(250, 246, 225))
dr.text((nx_, ny_ - 17 * K), 'N', font=F_SUB, fill=(250, 246, 225), anchor='ms')
plano = big.resize((PW, PH), Image.LANCZOS)
plano.save(OUT / 'plano.jpg', quality=78, optimize=True, progressive=True); plano.save(OUT / 'plano.webp', quality=74, method=6)

# ---------- 7. Lugares (para los rótulos del 3D y del plano) y metadatos ----------
def al_borde(lat, lon, margen=500):   # fuera de la caja: rótulo en el borde, en la línea casa → lugar («hacia …»)
    c0 = np.array(local(*CASA)); c1 = np.array(local(lat, lon)); v = c1 - c0
    lim_x, lim_z = ancho / 2 - margen, alto / 2 - margen
    k = min([((lim_x if v[0] > 0 else -lim_x) - c0[0]) / v[0] if v[0] else 9, ((lim_z if v[1] > 0 else -lim_z) - c0[1]) / v[1] if v[1] else 9, 1])
    p = c0 + v * k; return [round(float(p[0]), 1), round(float(p[1]), 1)]
def lugar(t, la, lo, fuera=False, alto_r=140, **extra):
    p = al_borde(la, lo) if fuera else local(la, lo)
    return {'t': t, 'xz': p, 'h': round(cota_xz(*p), 1), 'uv': [round(p[0] / ancho + .5, 4), round(p[1] / alto + .5, 4)], 'fuera': fuera, 'alto': alto_r, **extra}
def con_km(lid): r = KMR[lid]; return {'km': r['km'], 'min': r['min']}
i_mitad = (lim[0] + lim[1]) // 2
L = {
    'casa': lugar('Ahío San Martín', *CASA, sub='el antiguo ayuntamiento', alto_r=120),
    'santa-eulalia': lugar('Santa Eulalia de Oscos', 43.25896, -7.02048, **con_km('santa-eulalia')),
    'villanueva': lugar('Villanueva de Oscos', 43.31149, -6.98687, **con_km('villanueva')),
    'seimeira': lugar('La Seimeira', 43.26937, -7.05605, desde='Pumares', **con_km('seimeira')),
    'mazonovo': lugar('Mazonovo', 43.23512, -7.01363, **con_km('mazonovo')),
    'mon': lugar('Palacio de Mon', 43.26983, -6.91493, **con_km('mon')),
    'mazo-mon': lugar('Mazo de Mon', 43.27246, -6.89996, alto_r=90),
    'taramundi': lugar('Taramundi', 43.36057, -7.10882, True, 200, **con_km('taramundi')),
    'salime': lugar('Presa de Salime', 43.23649, -6.84694, alto_r=120, **con_km('salime')),
    # los nombres de los ríos, sobre su curso (en el índice del hilo)
    'r-ahio': {'t': 'río Ahío', 'i': int(i_mitad), 'alto': 60},
    'r-agueira': {'t': 'río Agüeira', 'i': int((lim[1] + lim[2]) // 2), 'alto': 60},
    'r-sanmartin': {'t': 'río San Martín', 'i': int((lim[2] + n - 1) // 2), 'alto': 60},
}
for k, l in L.items():
    if 'i' in l: l.update({'xz': [round(float(X[l['i']]), 1), round(float(Z[l['i']]), 1)], 'h': round(float(H[l['i']]), 1),
                           'uv': [round(float(X[l['i']]) / ancho + .5, 4), round(float(Z[l['i']]) / alto + .5, 4)], 'fuera': False})
meta = {'caja': {'s': S, 'n': N, 'o': O, 'e': E}, 'ancho': round(ancho), 'alto': round(alto), 'mallas': MALLAS, 'exageracion': EX,
        'min': round(float(dem.min()), 1), 'max': round(float(dem.max()), 1), 'ortos': ortos, 'parches': parches,
        'plano': {'w': PW, 'h': PH}, 'lugares': L, 'casa_rio_m': round(dcasa[i_casa]),
        'rio': {'paso': PASO, 'largo': round(LARGO, 1), 'n': n, 'partes': lim,
                'km': {'ahio': round(largos['ahio'] / 1000, 1), 'agueira': round(largos['agueira'] / 1000, 1), 'sanmartin': round(largos['sanmartin'] / 1000, 1)},
                'x': [round(float(v), 1) for v in X], 'z': [round(float(v), 1) for v in Z], 'h': [round(float(v)) for v in H],
                'tramos': [{**x, 'f': round(x['i'] / (n - 1), 4)} for x in TRAMOS]},
        'fuente': 'Relieve MDT05, ortofoto PNOA y ríos: © Instituto Geográfico Nacional (CC BY 4.0) · Lugares y carreteras: © colaboradores de OpenStreetMap (OSRM)'}
(OUT / 'terreno.json').write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('caja km', round(ancho / 1000, 2), round(alto / 1000, 2), '| alturas', round(float(dem.min())), '->', round(float(dem.max())),
      '| casa', L['casa']['h'], 'm | río', int(H.min()), '->', int(H.max()), 'm | parches', list(parches))
for p in sorted(OUT.iterdir()): print(f'{p.name:28} {p.stat().st_size // 1024:6} KB')
