"""Ahío San Martín · alzado a línea de la fachada (agente Fachada).

Uso:
    python -I scripts/alzado.py                     -> img/fachada/alzado.svg
    python -I scripts/alzado.py --comprobar DIR     -> además, en DIR: las dos fotos
        enderezadas y el dibujo pintado encima, para mirar que calca (no va a la web)

De dónde sale cada medida
-------------------------
* Fachada principal: `ref/fotos/web/2792-DSC09756-scaled.jpg` (2560x1440, de frente
  y desde abajo: las verticales convergen hacia arriba). Se endereza con una homografía
  de cuatro puntos: las esquinas exteriores de los marcos de las dos ventanas de la
  izquierda y las dos de la derecha (simétricas respecto del eje de la puerta). Se
  conserva la fila de abajo y se abre la de arriba; 3 % de estiramiento vertical.
  Todas las medidas de abajo están en píxeles de esa foto enderezada, con x = 0 en la
  esquina izquierda del muro (x foto = x + 320) y el eje en x = 940.
* Fachada lateral: `ref/fotos/web/1161-fachada-1.jpg` (en diagonal, desde arriba).
  Homografía de las esquinas de las ventanas de los ejes 1 y 4, escalada para que las
  ventanas midan lo mismo que en la principal. Sale: mismas alturas de plantas (557-826
  arriba, 884-1072 abajo), cuatro ejes simétricos en 0,175 / 0,392 / 0,608 / 0,825 del
  ancho, y un ancho de 1795 px frente a 1880 de la principal: casi cuadrada, como dice
  DATOS («planta cuadrada»), así que se dibuja con el mismo ancho.
* Tejado y linterna: en la foto de frente no se ven (la cámara está abajo). Alturas
  aproximadas sacadas de `283-SIMPLE-fachada-principal.jpg` y `1161-fachada-1.jpg`.
  Es un dibujo, no un plano.

OJO (para el informe): la fachada principal tiene CINCO huecos de ventana (dos a cada
lado, uno por planta, y la puerta-balcón del centro), no ocho. Las ocho ventanas
iguales, cuatro ejes en dos plantas, están en la fachada lateral. Por eso el alzado es
«desplegado»: la lateral a la izquierda y la principal a la derecha, en la misma hoja.

Ventanas del índice (ids `ventana-1`…`ventana-8`, con `data-planta`):
  1-2 = lateral, planta baja, ejes 1 y 2   (los dos apartamentos de planta baja)
  3-6 = lateral, primera planta, ejes 1-4  (dúplex)
  7-8 = principal, primera planta, izquierda y derecha (dúplex)
Qué apartamento es cada ventana lo decide `ASIGNACION` en js/fachada.js; aquí solo se
cuidan las plantas (planta baja abajo, dúplex en la primera).
"""
import math
import os
import random
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'img', 'fachada', 'alzado.svg')

# ---------------------------------------------------------------- medidas (px de la foto enderezada)
ANCHO = 1880          # muro, esquina a esquina
EJE = 940
SUELO = 1185
ALERO = 274           # canto del alero (línea del tejado)
ALERO_B = 288         # bajo del alero
BANDA = (311, 421)    # cornisa blanca (crema en la foto)
DENTELLON = (352, 396)  # moldura con dentellones (solo la principal)
VUELO = 45            # vuelo del alero
CUM_TEJADO = 74       # donde arranca la linterna (aprox.)
LINT = dict(semi=185, base=74, alero=-46, cumbre=-96, banda=(20, -30), chim=(170, 201), chim_alto=-132)
VENT_ALTA = (557, 826)
VENT_BAJA = (884, 1072)
VENT_ANCHO = 133
DINTEL = 37           # dintel de lajas sobre cada ventana
CUERPO_CENTRAL = 135  # semiancho del cuerpo central de la principal (sin cornisa)
FRONTON = dict(cumbre=133, alero=277, semi=161, grueso=22, vidrio_cumbre=192, vidrio_base=294, vidrio_semi=117)
PLACA = dict(semi=92, y=(317, 386))
CHIMENEAS = [(739, 770), (1110, 1141)]   # se ven en la foto de frente (las de la linterna)
PUERTA = dict(semi=75, arranque=947, clave=902)
BALCON = dict(semi=213, losa=(829, 852), barandilla=(712, 820), postes=700)
VENT_P_IZQ = 312      # x de la ventana izquierda de la principal (la derecha, simétrica)
EJES_LATERAL = [0.175, 0.392, 0.608, 0.825]

# composición de la hoja
X_LAT = 330           # la lateral empieza aquí (a su izquierda, el jardín)
HUECO = 240           # entre las dos caras
X_PRI = X_LAT + ANCHO + HUECO
HOJA = dict(x=0, y=-170, w=X_PRI + ANCHO + 110, h=1440)

R = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')


class Trazo:
    """Acumula segmentos y figuras de un grupo en un solo path (y para la comprobación)."""

    def __init__(self):
        self.d = []
        self.seg = []  # para pintar la comprobación: listas de puntos

    def linea(self, *pts):
        self.d.append('M' + 'L'.join(R(x) + ' ' + R(y) for x, y in pts))
        self.seg.append(list(pts))

    def rect(self, x0, y0, x1, y1):
        self.linea((x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0))

    def arco(self, cx, cy, r, a0, a1, n=24):
        pts = [(cx + r * math.cos(a), cy - r * math.sin(a)) for a in [a0 + (a1 - a0) * i / n for i in range(n + 1)]]
        self.linea(*pts)

    def __str__(self):
        return ''.join(self.d)


def ventana(t, x0, y0, x1, y1, filas, alta):
    """Marco, hojas, parteluz y cuarterones; dintel de lajas encima."""
    t.rect(x0, y0, x1, y1)
    i = 9
    t.rect(x0 + i, y0 + i, x1 - i, y1 - i)
    xm = (x0 + x1) / 2
    t.linea((xm - 3, y0 + i), (xm - 3, y1 - i))
    t.linea((xm + 3, y0 + i), (xm + 3, y1 - i))
    alto = (y1 - y0 - 2 * i) / filas
    for k in range(1, filas):
        y = y0 + i + alto * k
        t.linea((x0 + i, y), (xm - 3, y))
        t.linea((xm + 3, y), (x1 - i, y))
    return (x0 + i, y0 + i, x1 - i, y1 - i)


def dintel(t, x0, y0, x1):
    """Arco adintelado de lajas: un trapecio con las juntas en abanico."""
    a, b = x0 - 14, x1 + 14
    t.linea((a, y0), (a - 6, y0 - DINTEL), (b + 6, y0 - DINTEL), (b, y0))
    t.linea((a, y0), (b, y0))
    cx, cy = (x0 + x1) / 2, y0 + 160
    n = 13
    for k in range(1, n):
        f = k / n
        xb = a + (b - a) * f
        xt = (a - 6) + (b + 6 - (a - 6)) * f
        # recta hacia el centro del abanico, recortada a la altura del dintel
        dx, dy = xb - cx, y0 - cy
        s = (y0 - DINTEL - cy) / dy
        t.linea((xb, y0), (cx + dx * s, y0 - DINTEL))


def alfeizar(t, x0, x1, y):
    t.rect(x0 - 10, y, x1 + 10, y + 12)


def esquinales(t, x, lado, y0, y1, azar):
    """Sillares de esquina alternos (largo y corto) entre y0 y y1; lado = +1 hacia dentro."""
    y = y1
    k = 0
    while y - 40 > y0:
        h = 40 + azar.uniform(-3, 4)
        w = (96 if k % 2 == 0 else 58) + azar.uniform(-6, 6)
        t.rect(x, y - h, x + lado * w, y)
        y -= h + 2
        k += 1


def huecos_principal():
    v = []
    for x0 in (VENT_P_IZQ, ANCHO - VENT_P_IZQ - VENT_ANCHO):
        v.append((x0 - 20, VENT_ALTA[0] - DINTEL - 4, x0 + VENT_ANCHO + 20, VENT_ALTA[1] + 4))
        v.append((x0 - 20, VENT_BAJA[0] - DINTEL - 4, x0 + VENT_ANCHO + 20, VENT_BAJA[1] + 16))
    v.append((EJE - 64 - 20, VENT_ALTA[0] - DINTEL - 4, EJE + 64 + 20, BALCON['losa'][1] + 30))
    v.append((EJE - BALCON['semi'] - 6, BALCON['postes'] - 6, EJE + BALCON['semi'] + 6, BALCON['losa'][1] + 34))
    v.append((EJE - 125, 850, EJE + 125, SUELO))
    v.append((EJE - CUERPO_CENTRAL, BANDA[0], EJE + CUERPO_CENTRAL, BANDA[1] + 6))
    return v


def huecos_lateral():
    v = []
    for f in EJES_LATERAL:
        c = ANCHO * f
        x0 = c - VENT_ANCHO / 2
        v.append((x0 - 20, VENT_ALTA[0] - DINTEL - 4, x0 + VENT_ANCHO + 20, VENT_ALTA[1] + 4))
        v.append((x0 - 20, VENT_BAJA[0] - DINTEL - 4, x0 + VENT_ANCHO + 20, VENT_BAJA[1] + 16))
    return v


def piedra(azar, huecos):
    """Hiladas de pizarra: trazos cortos horizontales, ralos (no es un calco piedra a piedra)."""
    t = Trazo()
    y = BANDA[1] + 12
    while y < SUELO - 6:
        x = azar.uniform(0, 40) + 110
        while x < ANCHO - 110:
            largo = azar.uniform(26, 120)
            if azar.random() < 0.42:
                x1 = min(x + largo, ANCHO - 110)
                dentro = any(a - 4 <= x1 and x <= c + 4 and b - 4 <= y <= d + 4 for a, b, c, d in huecos)
                if not dentro:
                    yy = y + azar.uniform(-1.5, 1.5)
                    t.linea((x, yy), (x1, yy + azar.uniform(-1.2, 1.2)))
            x += largo + azar.uniform(5, 16)
        y += azar.uniform(13, 22)
    return t


def pizarra_tejado(azar, x0, x1, y0, y1, semi_arriba, hastial=None):
    """Hiladas de losa en el faldón (trapecio): líneas con cortes, en el ancho de cada altura.
    `hastial` = (cumbre, base, semiancho): triángulo delante del faldón (frontón o buharda) que tapa las hiladas."""
    t = Trazo()
    y = y0 - 16
    while y > y1 + 6:
        f = (y0 - y) / (y0 - y1)
        a = x0 + (EJE - semi_arriba - x0) * f
        b = x1 - (x1 - (EJE + semi_arriba)) * f
        hueco = None
        if hastial and hastial[0] - 4 < y < hastial[1] + 4:
            hs = hastial[2] * (y - hastial[0]) / (hastial[1] - hastial[0]) + 10
            hueco = (EJE - hs, EJE + hs)
        x = a + azar.uniform(4, 30)
        while x < b - 10:
            largo = azar.uniform(60, 220)
            xa, xb = x, min(x + largo, b - 6)
            if hueco and xb > hueco[0] and xa < hueco[1]:
                if xa < hueco[0]:
                    t.linea((xa, y), (hueco[0], y))
                if xb > hueco[1]:
                    t.linea((hueco[1], y), (xb, y))
            else:
                t.linea((xa, y), (xb, y))
            x += largo + azar.uniform(8, 20)
        y -= azar.uniform(15, 19)
    return t


def linterna(t, vid, chim, tex_piz, azar):
    L = LINT
    s = L['semi']
    # caja de piedra
    t.rect(EJE - s, L['alero'], EJE + s, L['base'])
    # banda de ventanas: cuatro huecos
    b0, b1 = L['banda']
    n = 4
    hueco = (2 * s - 40) / n
    vidrios = []
    for k in range(n):
        x0 = EJE - s + 20 + hueco * k + 7
        x1 = x0 + hueco - 14
        t.rect(x0, b1, x1, b0)
        t.linea(((x0 + x1) / 2, b1), ((x0 + x1) / 2, b0))
        vidrios.append((x0 + 4, b1 + 4, x1 - 4, b0 - 4))
    # alero y faldón de la linterna
    t.linea((EJE - s - 24, L['alero']), (EJE + s + 24, L['alero']))
    t.linea((EJE - s - 24, L['alero']), (EJE - s - 24, L['alero'] - 8), (EJE + s + 24, L['alero'] - 8), (EJE + s + 24, L['alero']))
    t.linea((EJE - s - 18, L['alero'] - 8), (EJE - 60, L['cumbre']), (EJE + 60, L['cumbre']), (EJE + s + 18, L['alero'] - 8))
    y = L['alero'] - 22
    while y > L['cumbre'] + 6:
        f = (L['alero'] - 8 - y) / (L['alero'] - 8 - L['cumbre'])
        a = EJE - s - 18 + (s + 18 - 60) * f
        tex_piz.linea((a + 6, y), (2 * EJE - a - 6, y))
        y -= 13
    # chimeneas en las esquinas
    for x0, x1 in ((EJE - L['chim'][1], EJE - L['chim'][0]), (EJE + L['chim'][0], EJE + L['chim'][1])):
        base = L['alero'] - 10
        chim.rect(x0, L['chim_alto'], x1, base)
        chim.rect(x0 - 5, L['chim_alto'] - 9, x1 + 5, L['chim_alto'])
    return vidrios


def tejado(t, tex, azar, x0, x1, hastial=None):
    """Alero con canecillos y faldón (a cuatro aguas visto de frente: un trapecio)."""
    t.linea((x0 - VUELO, ALERO), (x1 + VUELO, ALERO))
    t.linea((x0 - VUELO, ALERO), (x0 - VUELO, ALERO_B), (x1 + VUELO, ALERO_B), (x1 + VUELO, ALERO))
    semi = LINT['semi'] + 75
    t.linea((x0 - VUELO + 6, ALERO), (EJE - semi, CUM_TEJADO), (EJE + semi, CUM_TEJADO), (x1 + VUELO - 6, ALERO))
    return pizarra_tejado(azar, x0 - VUELO + 6, x1 + VUELO - 6, ALERO, CUM_TEJADO, semi, hastial)


def canecillos(t, x0, x1, salto=None):
    x = x0 - VUELO + 30
    while x < x1 + VUELO - 20:
        if not (salto and salto[0] - 8 < x < salto[1] + 8):
            t.rect(x - 6, ALERO_B, x + 6, BANDA[0])
        x += 73.6


class Cara:
    def __init__(self, nombre):
        self.nombre = nombre
        self.grupos = []  # (id, clases, trazo o texto, extra attrs)

    def g(self, id_, cls, contenido, **attrs):
        self.grupos.append((id_, cls, contenido, attrs))


def svg_grupo(id_, cls, contenido, attrs, sangria='    '):
    a = ''
    if id_:
        a += ' id="%s"' % id_
    if cls:
        a += ' class="%s"' % cls
    for k, v in attrs.items():
        a += ' %s="%s"' % (k.replace('_', '-'), v)
    if isinstance(contenido, Trazo):
        if not contenido.d:
            return ''
        return '%s<path%s d="%s"/>\n' % (sangria, a, contenido)
    return '%s<g%s>%s</g>\n' % (sangria, a, contenido)


def vidrio_rects(rs, cls='vidrio'):
    return ''.join('<rect class="%s" x="%s" y="%s" width="%s" height="%s"/>' % (cls, R(a), R(b), R(c - a), R(d - b)) for a, b, c, d in rs)


def pieza_ventana(id_, x0, alta, numero=None, planta='', indice=False):
    """Una ventana completa: luz (detrás), vidrio, carpintería y dintel. Devuelve (svg, trazo)."""
    y0, y1 = VENT_ALTA if alta else VENT_BAJA
    x1 = x0 + VENT_ANCHO
    t = Trazo()
    vid = ventana(t, x0, y0, x1, y1, 6 if alta else 4, alta)
    dintel(t, x0, y0, x1)
    if not alta:
        alfeizar(t, x0, x1, y1)
    caja = '%s %s %s %s' % (R(x0), R(y0), R(VENT_ANCHO), R(y1 - y0))
    cuerpo = '<rect class="luz" x="%s" y="%s" width="%s" height="%s" rx="6"/>' % (R(vid[0] - 22), R(vid[1] - 22), R(vid[2] - vid[0] + 44), R(vid[3] - vid[1] + 44))
    cuerpo += vidrio_rects([vid])
    cuerpo += '<path class="l" d="%s"/>' % t
    if numero is not None:
        cuerpo += '<text class="num" x="%s" y="%s" aria-hidden="true">%s</text>' % (R(x1 + 14), R(y1 - 4), numero)
    cls = 'ventana' + (' ventana--indice' if indice else '')
    extra = ' data-caja="%s" data-planta="%s"' % (caja, planta)
    return '<g id="%s" class="%s"%s>%s</g>' % (id_, cls, extra, cuerpo), t


def cara_principal(azar, comprobar):
    piezas = []
    lineas = Trazo()          # muro, cornisa, cuerpo central
    tex_piedra_huecos = huecos_principal()
    # muro y esquinas
    lineas.linea((0, BANDA[1]), (0, SUELO))
    lineas.linea((ANCHO, BANDA[1]), (ANCHO, SUELO))
    esq = Trazo()
    esquinales(esq, 0, 1, BANDA[1], SUELO, azar)
    esquinales(esq, ANCHO, -1, BANDA[1], SUELO, azar)
    # cornisa a los lados del cuerpo central, con su moldura de dentellones
    c0, c1 = EJE - CUERPO_CENTRAL, EJE + CUERPO_CENTRAL
    corn = Trazo()
    for a, b in ((0, c0), (c1, ANCHO)):
        corn.rect(a, BANDA[0], b, BANDA[1])
        corn.linea((a, DENTELLON[0]), (b, DENTELLON[0]))
        corn.linea((a, DENTELLON[1]), (b, DENTELLON[1]))
        corn.linea((a, DENTELLON[0] + 8), (b, DENTELLON[0] + 8))
        x = a + 10
        while x < b - 14:
            corn.rect(x, DENTELLON[0] + 14, x + 9, DENTELLON[1] - 8)
            x += 19
    # cuerpo central (piedra hasta el frontón)
    lineas.linea((c0, ALERO_B), (c0, BANDA[1] + 8))
    lineas.linea((c1, ALERO_B), (c1, BANDA[1] + 8))
    # tejado, alero y canecillos
    tej = Trazo()
    tex_piz = tejado(tej, None, azar, 0, ANCHO, (FRONTON['cumbre'], FRONTON['alero'], FRONTON['semi']))
    madera = Trazo()
    canecillos(madera, 0, ANCHO, (EJE - FRONTON['semi'], EJE + FRONTON['semi']))
    # linterna (detrás) y chimeneas
    lin = Trazo()
    chim = Trazo()
    vid_lin = linterna(lin, None, chim, tex_piz, azar)
    # frontón con su vidriera triangular
    F = FRONTON
    fr = Trazo()
    fr.linea((EJE - F['semi'], F['alero']), (EJE, F['cumbre']), (EJE + F['semi'], F['alero']))
    g = F['grueso']
    fr.linea((EJE - F['semi'] + g * 1.6, F['alero'] + 2), (EJE, F['cumbre'] + g * 1.25), (EJE + F['semi'] - g * 1.6, F['alero'] + 2))
    fr.linea((EJE - F['semi'], F['alero']), (EJE - F['semi'], F['alero'] + 12), (EJE - F['semi'] + 16, F['alero'] + 12))
    fr.linea((EJE + F['semi'], F['alero']), (EJE + F['semi'], F['alero'] + 12), (EJE + F['semi'] - 16, F['alero'] + 12))
    vb, vc, vs = F['vidrio_base'], F['vidrio_cumbre'], F['vidrio_semi']
    fr.linea((EJE - vs, vb), (EJE, vc), (EJE + vs, vb), (EJE - vs, vb))
    fr.linea((EJE, vc), (EJE, vb))
    vid_fronton = '<path class="vidrio" d="M%s %sL%s %sL%s %sZ"/>' % (R(EJE - vs + 8), R(vb - 4), R(EJE), R(vc + 10), R(EJE + vs - 8), R(vb - 4))
    # placa
    P = PLACA
    pl = Trazo()
    pl.rect(EJE - P['semi'], P['y'][0], EJE + P['semi'], P['y'][1])
    pl.rect(EJE - P['semi'] + 6, P['y'][0] + 6, EJE + P['semi'] - 6, P['y'][1] - 6)
    ym = (P['y'][0] + P['y'][1]) / 2
    placa_txt = ('<text id="placa-texto" class="placa-texto" x="%s" y="%s" text-anchor="middle">'
                 '<tspan x="%s" dy="-6">APARTAMENTOS RURALES</tspan><tspan x="%s" dy="27">CASA DE LA VILLA</tspan></text>') % (R(EJE), R(ym - 4), R(EJE), R(EJE))
    # balcón
    B = BALCON
    bal = Trazo()
    a, b = EJE - B['semi'], EJE + B['semi']
    bal.rect(a, B['losa'][0], b, B['losa'][1])
    for xm in (EJE - 175, EJE + 175):  # dos ménsulas bajo la losa, como en la foto
        bal.linea((xm - 14, B['losa'][1]), (xm - 8, B['losa'][1] + 26), (xm + 8, B['losa'][1] + 26), (xm + 14, B['losa'][1]))
    bal.linea((a + 6, B['barandilla'][0]), (b - 6, B['barandilla'][0]))
    bal.linea((a + 6, B['barandilla'][0] + 7), (b - 6, B['barandilla'][0] + 7))
    bal.linea((a + 6, B['barandilla'][1]), (b - 6, B['barandilla'][1]))
    for xp in (a + 6, b - 6):
        bal.rect(xp - 5, B['postes'], xp + 5, B['losa'][0])
    x = a + 34
    while x < b - 20:
        bal.linea((x, B['barandilla'][0] + 7), (x, B['barandilla'][1]))
        x += 26
    for xm in (EJE - 112, EJE + 112):
        bal.rect(xm - 5, B['postes'] + 6, xm + 5, B['losa'][0])
    # puerta de arco con su recerco de sillería
    Pu = PUERTA
    pu = Trazo()
    s = Pu['semi']
    flecha = Pu['arranque'] - Pu['clave']
    r = (s * s + flecha * flecha) / (2 * flecha)
    cy = Pu['clave'] + r
    a0 = math.asin(s / r)
    pu.linea((EJE - s, SUELO), (EJE - s, Pu['arranque']))
    pu.arco(EJE, cy, r, math.pi / 2 + a0, math.pi / 2 - a0)
    pu.linea((EJE + s, Pu['arranque']), (EJE + s, SUELO))
    pu.linea((EJE, Pu['clave']), (EJE, SUELO))
    for lado in (-1, 1):
        xa, xb = EJE + lado * 12, EJE + lado * (s - 12)
        for (y0, y1) in ((Pu['arranque'] + 10, 1060), (1076, SUELO - 14)):
            pu.rect(min(xa, xb), y0, max(xa, xb), y1)
    # recerco: jambas de sillares y dovelas
    rec = Trazo()
    R2 = r + 46
    rec.arco(EJE, cy, R2, math.pi / 2 + math.asin(min(1, (s + 46) / R2)), math.pi / 2 - math.asin(min(1, (s + 46) / R2)))
    n = 9
    for k in range(n + 1):
        ang = math.pi / 2 + a0 - (2 * a0) * k / n
        rec.linea((EJE + r * math.cos(ang), cy - r * math.sin(ang)), (EJE + R2 * math.cos(ang), cy - R2 * math.sin(ang)))
    for lado in (-1, 1):
        xin, xout = EJE + lado * s, EJE + lado * (s + 46)
        rec.linea((xout, cy - math.sqrt(max(0, R2 * R2 - (s + 46) ** 2))), (xout, SUELO))
        y = Pu['arranque']
        k = 0
        while y < SUELO - 30:
            h = 46
            ancho = 46 if k % 2 == 0 else 30
            rec.linea((xin, y + h), (xin + lado * ancho, y + h))
            if k % 2 == 1:
                rec.linea((xin + lado * ancho, y), (xin + lado * ancho, y + h))
            y += h
            k += 1
    # suelo: plaza empedrada delante
    suelo = Trazo()
    suelo.linea((-60, SUELO), (ANCHO + 60, SUELO))
    for k, y in enumerate((SUELO + 18, SUELO + 40)):
        x = -40 + k * 30
        while x < ANCHO + 40:
            l = azar.uniform(40, 130)
            suelo.linea((x, y), (min(x + l, ANCHO + 40), y))
            x += l + azar.uniform(18, 40)
    suelo.linea((EJE - 110, SUELO), (EJE - 150, SUELO + 52))
    suelo.linea((EJE + 110, SUELO), (EJE + 150, SUELO + 52))
    # piedra
    tex_pie = piedra(azar, tex_piedra_huecos)

    # ventanas: 2 altas del índice (7 y 8), las demás de adorno, la del balcón
    vents = []
    vi, _ = pieza_ventana('ventana-7', VENT_P_IZQ, True, 7, 'primera', True)
    vd, _ = pieza_ventana('ventana-8', ANCHO - VENT_P_IZQ - VENT_ANCHO, True, 8, 'primera', True)
    bi, _ = pieza_ventana('ventana-p-baja-izq', VENT_P_IZQ, False, None, 'baja')
    bd, _ = pieza_ventana('ventana-p-baja-der', ANCHO - VENT_P_IZQ - VENT_ANCHO, False, None, 'baja')
    # puerta-balcón: 128 de ancho, hasta la losa
    tb = Trazo()
    xb0, xb1 = EJE - 64, EJE + 64
    vidb = ventana(tb, xb0, VENT_ALTA[0], xb1, BALCON['losa'][0], 7, True)
    dintel(tb, xb0, VENT_ALTA[0], xb1)
    balc = ('<g id="ventana-balcon" class="ventana" data-caja="%s %s %s %s" data-planta="primera">'
            '<rect class="luz" x="%s" y="%s" width="%s" height="%s" rx="6"/>%s<path class="l" d="%s"/></g>') % (
        R(xb0), R(VENT_ALTA[0]), R(128), R(BALCON['losa'][0] - VENT_ALTA[0]),
        R(vidb[0] - 22), R(vidb[1] - 22), R(vidb[2] - vidb[0] + 44), R(vidb[3] - vidb[1] + 44), vidrio_rects([vidb]), tb)

    out = []
    out.append('<g id="tejado" class="pieza" data-caja="%s %s %s %s">' % (R(-VUELO), R(CUM_TEJADO), R(ANCHO + 2 * VUELO), R(ALERO_B - CUM_TEJADO)))
    out.append('<path class="tx tx-pizarra" d="%s"/>' % tex_piz)
    out.append('<path class="l" d="%s"/>' % tej)
    out.append('<path class="l tx-madera-l" d="%s"/></g>' % madera)
    caja_lin = (EJE - LINT['semi'] - 24, LINT['chim_alto'] - 9, 2 * LINT['semi'] + 48, LINT['base'] - LINT['chim_alto'] + 9)
    out.append('<g id="linterna" class="pieza linterna" data-caja="%s %s %s %s">' % tuple(R(v) for v in caja_lin))
    out.append('<rect class="luz luz--linterna" x="%s" y="%s" width="%s" height="%s" rx="30"/>' % (R(EJE - LINT['semi'] - 30), R(LINT['banda'][1] - 40), R(2 * LINT['semi'] + 60), R(LINT['banda'][0] - LINT['banda'][1] + 80)))
    out.append(vidrio_rects(vid_lin))
    out.append('<path class="l" d="%s"/><path id="chimeneas" class="l" d="%s"/></g>' % (lin, chim))
    out.append('<g id="fronton" class="pieza" data-caja="%s %s %s %s">%s<path class="l" d="%s"/></g>' % (R(EJE - F['semi']), R(F['cumbre']), R(2 * F['semi']), R(F['vidrio_base'] - F['cumbre']), vid_fronton, fr))
    out.append('<g id="muro" class="pieza"><path class="tx tx-piedra" d="%s"/><path class="l" d="%s"/><path class="lf" d="%s"/></g>' % (tex_pie, lineas, esq))
    out.append('<g id="cornisa" class="pieza"><path class="lf" d="%s"/></g>' % corn)
    out.append('<g id="placa" class="pieza placa" data-caja="%s %s %s %s"><rect class="placa-fondo" x="%s" y="%s" width="%s" height="%s"/><path class="l" d="%s"/>%s</g>' % (
        R(EJE - P['semi']), R(P['y'][0]), R(2 * P['semi']), R(P['y'][1] - P['y'][0]),
        R(EJE - P['semi'] + 6), R(P['y'][0] + 6), R(2 * P['semi'] - 12), R(P['y'][1] - P['y'][0] - 12), pl, placa_txt))
    out.append(vi + vd + bi + bd + balc)
    out.append('<g id="balcon" class="pieza" data-caja="%s %s %s %s"><path class="l" d="%s"/></g>' % (R(EJE - B['semi']), R(B['postes']), R(2 * B['semi']), R(B['losa'][1] + 26 - B['postes']), bal))
    out.append('<g id="puerta" class="pieza puerta" data-caja="%s %s %s %s"><rect class="luz luz--puerta" x="%s" y="%s" width="%s" height="%s" rx="10"/><path class="lf" d="%s"/><path class="l" d="%s"/></g>' % (
        R(EJE - s - 46), R(Pu['clave'] - 46), R(2 * (s + 46)), R(SUELO - Pu['clave'] + 46),
        R(EJE - s + 6), R(Pu['clave'] + 10), R(2 * s - 12), R(SUELO - Pu['clave'] - 14), rec, pu))
    out.append('<g id="suelo-plaza" class="pieza"><path class="lf" d="%s"/></g>' % suelo)
    if comprobar is not None:
        comprobar.extend([tej, lin, chim, fr, lineas, esq, corn, pl, bal, pu, rec, tb])
        for idv, x0, alta in (('a', VENT_P_IZQ, True), ('b', ANCHO - VENT_P_IZQ - VENT_ANCHO, True), ('c', VENT_P_IZQ, False), ('d', ANCHO - VENT_P_IZQ - VENT_ANCHO, False)):
            comprobar.append(pieza_ventana('x', x0, alta)[1])
    return ''.join(out)


def cara_lateral(azar, comprobar):
    lineas = Trazo()
    lineas.linea((0, BANDA[1]), (0, SUELO))
    lineas.linea((ANCHO, BANDA[1]), (ANCHO, SUELO))
    esq = Trazo()
    esquinales(esq, 0, 1, BANDA[1], SUELO, azar)
    esquinales(esq, ANCHO, -1, BANDA[1], SUELO, azar)
    corn = Trazo()
    corn.rect(0, BANDA[0], ANCHO, BANDA[1])
    corn.linea((0, BANDA[0] + 22), (ANCHO, BANDA[0] + 22))
    corn.linea((0, BANDA[1] - 18), (ANCHO, BANDA[1] - 18))
    tej = Trazo()
    tex_piz = tejado(tej, None, azar, 0, ANCHO, (150, ALERO - 8, 150))
    madera = Trazo()
    # buharda en el faldón (en la foto lateral asoma una, con su vidriera triangular)
    bu = Trazo()
    bs, bc = 150, 150
    bu.linea((EJE - bs, ALERO - 8), (EJE, bc), (EJE + bs, ALERO - 8))
    bu.linea((EJE - bs + 30, ALERO - 8), (EJE, bc + 24), (EJE + bs - 30, ALERO - 8))
    bu.linea((EJE - bs + 44, ALERO - 10), (EJE, bc + 44), (EJE + bs - 44, ALERO - 10), (EJE - bs + 44, ALERO - 10))
    canecillos(madera, 0, ANCHO)
    lin = Trazo()
    chim = Trazo()
    vid_lin = linterna(lin, None, chim, tex_piz, azar)
    suelo = Trazo()
    suelo.linea((-60, SUELO), (ANCHO + 60, SUELO))
    # hierba: matas sueltas
    x = -40
    while x < ANCHO + 40:
        if azar.random() < 0.55:
            h = azar.uniform(10, 22)
            suelo.linea((x - 5, SUELO), (x - 9, SUELO - h * 0.7))
            suelo.linea((x, SUELO), (x + azar.uniform(-2, 2), SUELO - h))
            suelo.linea((x + 5, SUELO), (x + 10, SUELO - h * 0.6))
        x += azar.uniform(30, 70)
    tex_pie = piedra(azar, huecos_lateral())
    out = []
    out.append('<g class="pieza tejado-lateral"><path class="tx tx-pizarra" d="%s"/><path class="l" d="%s"/><path class="l tx-madera-l" d="%s"/></g>' % (tex_piz, tej, madera))
    out.append('<g class="pieza linterna linterna--lateral">%s<path class="l" d="%s"/><path class="l" d="%s"/></g>' % (vidrio_rects(vid_lin), lin, chim))
    out.append('<g class="pieza buharda"><path class="l" d="%s"/></g>' % bu)
    out.append('<g class="pieza muro-lateral"><path class="tx tx-piedra" d="%s"/><path class="l" d="%s"/><path class="lf" d="%s"/></g>' % (tex_pie, lineas, esq))
    out.append('<g class="pieza cornisa-lateral"><path class="lf" d="%s"/></g>' % corn)
    vents = []
    for k, f in enumerate(EJES_LATERAL):
        x0 = ANCHO * f - VENT_ANCHO / 2
        alta_id = 'ventana-%d' % (3 + k)
        if k < 2:
            baja_id, baja_num, baja_ind = 'ventana-%d' % (1 + k), 1 + k, True
        else:
            baja_id, baja_num, baja_ind = 'ventana-l-baja-%d' % (1 + k), None, False
        a, ta = pieza_ventana(alta_id, x0, True, 3 + k, 'primera', True)
        b, tb = pieza_ventana(baja_id, x0, False, baja_num, 'baja', baja_ind)
        vents.append(a + b)
        if comprobar is not None:
            comprobar.extend([ta, tb])
    out.append(''.join(vents))
    out.append('<g class="pieza suelo-hierba"><path class="lf" d="%s"/></g>' % suelo)
    # el jardín: un abeto y una farola de globo, a la izquierda (en las fotos hay abetos y farolas así)
    j = Trazo()
    cx, base, alto = -175, SUELO, 560
    j.linea((cx, base), (cx, base - alto))
    for k in range(13):
        f = k / 13
        y = base - 70 - (alto - 90) * f
        semi = 118 * (1 - f) + 14
        j.linea((cx - semi, y + 26 - f * 10), (cx, y - 18))
        j.linea((cx + semi, y + 26 - f * 10), (cx, y - 18))
    j.linea((cx - 26, base), (cx - 14, base - 26), (cx + 14, base - 26), (cx + 26, base))
    fx = -40
    j.linea((fx, base), (fx, base - 330))
    j.rect(fx - 9, base - 18, fx + 9, base)
    j.arco(fx, base - 352, 22, 0, 2 * math.pi, 28)
    caja_j = (cx - 140, base - alto - 30, 300, alto + 30)
    out.append('<g id="jardin" class="pieza jardin" data-caja="%s %s %s %s"><path class="l" d="%s"/></g>' % (tuple(R(v) for v in caja_j) + (j,)))
    if comprobar is not None:
        comprobar.extend([lineas, esq, corn])
    return ''.join(out)


def svg(comprobar_p=None, comprobar_l=None):
    azar = random.Random(1990)  # semilla fija: el dibujo sale siempre igual
    lat = cara_lateral(random.Random(32), comprobar_l)
    pri = cara_principal(azar, comprobar_p)
    H = HOJA
    rot = lambda x, t: '<text class="rotulo-cara" x="%s" y="%s" text-anchor="middle">%s</text>' % (R(x), R(SUELO + 110), t)
    defs = ('<defs><filter id="fx-halo" x="-60%" y="-60%" width="220%" height="220%">'
            '<feGaussianBlur stdDeviation="14"/></filter></defs>')
    s = []
    s.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" class="alzado" '
             'data-x-lateral="%s" data-x-principal="%s" data-ancho-cara="%s" data-suelo="%s" data-hoja="%s %s %s %s">\n' % (
                 H['x'], H['y'], H['w'], H['h'], X_LAT, X_PRI, ANCHO, SUELO, H['x'], H['y'], H['w'], H['h']))
    s.append('  <title>Alzado de Ahío San Martín: fachada lateral y fachada principal</title>\n')
    s.append('  ' + defs + '\n')
    s.append('  <rect id="papel" class="papel" x="%s" y="%s" width="%s" height="%s"/>\n' % (H['x'], H['y'], H['w'], H['h']))
    s.append('  <g id="cara-lateral" class="cara" data-cara="lateral" transform="translate(%s 0)">\n    %s\n    %s\n  </g>\n' % (X_LAT, lat, rot(EJE, 'FACHADA LATERAL')))
    s.append('  <g id="cara-principal" class="cara" data-cara="principal" transform="translate(%s 0)">\n    %s\n    %s\n  </g>\n' % (X_PRI, pri, rot(EJE, 'FACHADA PRINCIPAL')))
    s.append('</svg>\n')
    return ''.join(s)


def comprobar(dir_):
    """Endereza las dos fotos y pinta el dibujo encima (solo para mirar; no va a la web)."""
    import cv2
    import numpy as np
    os.makedirs(dir_, exist_ok=True)
    fotos = os.path.join(RAIZ, 'ref', 'fotos', 'web')
    # principal
    im = cv2.imread(os.path.join(fotos, '2792-DSC09756-scaled.jpg'))
    src = np.float32([[674, 574], [1849.5, 574], [1880, 1064.5], [639, 1064.5]])
    alto = 490.5 * 1.03
    dst = np.float32([[639, 1064.5 - alto], [1880, 1064.5 - alto], [1880, 1064.5], [639, 1064.5]])
    M = cv2.getPerspectiveTransform(src, dst)
    recta = cv2.warpPerspective(im, M, (2560, 1440), flags=cv2.INTER_CUBIC)
    cv2.imwrite(os.path.join(dir_, 'principal-enderezada.jpg'), recta)
    trazos = []
    svg(comprobar_p=trazos)
    ov = recta.copy()
    for t in trazos:
        for pts in t.seg:
            p = np.int32([[x + 320, y] for x, y in pts])
            cv2.polylines(ov, [p], False, (40, 255, 120), 2, cv2.LINE_AA)
    cv2.imwrite(os.path.join(dir_, 'principal-calco.jpg'), ov)
    # lateral: homografía de las ventanas de los ejes 1 y 4 a su sitio en el dibujo
    im2 = cv2.imread(os.path.join(fotos, '1161-fachada-1.jpg'))
    c1 = ANCHO * EJES_LATERAL[0] - VENT_ANCHO / 2
    c4 = ANCHO * EJES_LATERAL[3] + VENT_ANCHO / 2
    src2 = np.float32([[206, 555], [608, 583], [616, 932], [222, 800]])
    dst2 = np.float32([[c1 + 100, VENT_ALTA[0]], [c4 + 100, VENT_ALTA[0]], [c4 + 100, VENT_BAJA[1]], [c1 + 100, VENT_BAJA[1]]])
    M2 = cv2.getPerspectiveTransform(src2, dst2)
    recta2 = cv2.warpPerspective(im2, M2, (ANCHO + 200, 1300), flags=cv2.INTER_CUBIC)
    trazos2 = []
    svg(comprobar_l=trazos2)
    for t in trazos2:
        for pts in t.seg:
            p = np.int32([[x + 100, y] for x, y in pts])
            cv2.polylines(recta2, [p], False, (40, 255, 120), 2, cv2.LINE_AA)
    cv2.imwrite(os.path.join(dir_, 'lateral-calco.jpg'), recta2)


if __name__ == '__main__':
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    texto = svg()
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)
    print('escrito', os.path.relpath(SALIDA, RAIZ), len(texto) // 1024, 'KB')
    if '--comprobar' in sys.argv:
        d = sys.argv[sys.argv.index('--comprobar') + 1]
        comprobar(d)
        print('comprobación en', d)
