# «Los Oscos en 3D» · el 3D de Ahío San Martín

Una sola sección: `#oscos`, después de «El hilo» (nunca de portada). Con el scroll, **el río Ahío se enciende como un hilo de oro** desde su fuente, al norte del concejo, río abajo por el Mazo de Mon hasta el Agüeira (12,2 km de cauce real, pegado al relieve), y la cámara lo sigue de espaldas a la corriente, sin giros bruscos. **El Ahío no pasa por el pueblo**: al juntarse con el Agüeira, el hilo, más fino y más pálido, **remonta el agua** (Agüeira arriba y río San Martín arriba, 15 km) hasta la casa, donde la chincheta enciende su **linterna** (un punto ámbar con halo) y sale el rótulo «Ahío San Martín · el antiguo ayuntamiento». Al final, todo Los Oscos con los rótulos de los tres Oscos, la Seimeira, Mazonovo, el palacio de Mon, la presa de Salime y «hacia Taramundi», con sus **km por carretera** (OSRM). Después, el explorador libre. El cielo es el de ahora en San Martín (sol y luna reales, estrellas de noche); de noche el oro luce más.

Relieve MDT05, ortofoto PNOA y **red hidrográfica del IGN** (CC BY 4.0), altura ×1,5. **OpenStreetMap no tiene el río Ahío** (2026-10-23: ni por nombre ni ningún cauce junto al Mazo de Mon); el IGN sí, con nombre. Los lugares son de OpenStreetMap (ids en `scripts/terreno.py` y en `ref/raw/rutas.json`).

Texto honesto en el cuaderno: «Relieve, foto aérea y ríos del IGN (CC BY 4.0); el cielo es el de ahora». La única cita es de su web: «En el siglo I d. C. llegaron los romanos en busca del oro encontrado en el río Ahío.»

Parte de `../a-casa-da-tulla-gomesende-web/js/3d/` (motor, cielo, calidad automática, explorador, plano), **sin su camino de grano**: aquí el hilo es un río (sin granos; pepitas que brillan con el avance) y la escena empieza arriba, sobre Los Oscos.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `arranque.js` | Lo único que carga la web. Pone `window.Ahio.ruta.montar(el, opciones)` y lanza `ahio:listo` (`detail.modulo = 'ruta'`). Al montar: la pista fijada, el cuaderno, los botones, el progreso del scroll y la elección 3D / plano. Lleva `VERSION`. |
| `guion.js` | Sin Three.js. `fase(p, fa)` (del scroll a qué se ve), `marcas(T)`, el cuaderno (altura del agua, km, tramo, perfil), el recorrido en texto y los rótulos (sin choques, dentro del marco). |
| `plano.js` | Sin WebGL. El plano 2D: relieve sombreado + ortofoto con los ríos en tenue, y en SVG el hilo (oro el Ahío, oro pálido el agua remontada) que se enciende con el scroll y una «cámara» (el `viewBox`) que lo acompaña igual que el 3D. Es el plan B y el botón «En plano». |
| `sol.js` | Sol y luna (SunCalc) en la casa, hora de Madrid, el chip «Ahora en San Martín de Oscos · …». Acepta `?hora=` (como la portada) o `?ahora3d=`, y `opciones.hora`. Mismas fórmulas y coordenadas que `Ahio.sol` de `main.js`. |
| `escena.js` | El motor: un renderer, relieve con cantos, San Martín y Mon de cerca (parches de foto aérea fina), cúpula de cielo, estrellas, sombras, la chincheta de la casa con su linterna, calidad automática, proyección a pantalla. |
| `rio.js` | La cinta del río (shader propio: oro encendido hasta la «cabeza», agua tenue después, pepitas), el brillo de la cabeza, las poses de cámara mezcladas por la fase, los encuadres y el explorador (OrbitControls). |
| `vendor/` | Three.js r160 y `OrbitControls.js` (copiados de Tulla). |
| `../../css/3d.css` | Todo lo que mete el módulo, bajo `[data-modulo="ruta"]`. |
| `../../scripts/terreno.py` | Descarga (una vez) y prepara `img/terreno/` y `ref/raw/rutas.json`. |
| `../../pruebas/3d-*` | Banco (`3d-banco.html`), prueba sin pintar WebGL (`3d-probar.mjs`, puerto 8876) y su servidor (`3d-comun.mjs`). |

## Contrato con la web

**Marcado** (el que ya tiene `index.src.html`; en el hueco `<!--plano-ruta-->` va la imagen del plano):

```html
<section id="oscos" class="oscos" aria-labelledby="t-oscos">
  <div class="env oscos__cab">…eyebrow, <h2 id="t-oscos">, texto…</div>
  <div class="oscos__modulo" data-modulo="ruta">
    <div class="env oscos__respaldo">
      <picture>
        <source type="image/webp" srcset="img/terreno/plano.webp">
        <img class="oscos__plano" src="img/terreno/plano.jpg" width="1800" height="1264" loading="lazy" decoding="async" alt="…">
      </picture>
      <ul class="oscos__lista">…los lugares con sus km de ref/raw/rutas.json…</ul>
      <p class="oscos__fuente">Relieve, ortofoto y ríos: Instituto Geográfico Nacional (CC BY 4.0). Lugares y rutas: © colaboradores de OpenStreetMap (OSRM).</p>
    </div>
  </div>
</section>
```

- `css/3d.css` en el `<head>`; al final del `<body>`: `<script type="module" src="js/3d/arranque.js"></script>` (con la huella de `versionar.mjs`).
- `main.js` lo monta al acercarse (900 px), con `{ movimiento, densidad, hora, gl:false si ?sin-3d }`; si el módulo aún no estaba, reintenta con `ahio:listo`. `montar` es idempotente (dos llamadas devuelven la misma instancia) y `destruir()` deja el respaldo como estaba (para el mando de densidades).
- Al montar, el módulo mete **delante** del respaldo `.ruta-pista` (alto = la pantalla + 340svh; quieta, solo el marco) y esconde la imagen del plano del respaldo (cualquier `<img>` de `img/terreno/plano` dentro del módulo, o con clase `oscos__plano`); la lista y la fuente se quedan debajo. Llama a `ScrollTrigger.refresh()` si existe.
- **Sticky:** `.ruta-fijo` es `position: sticky; top: var(--cabecera)`. Ningún antepasado (`.oscos`, `.oscos__modulo`, `main`…) puede llevar `overflow: hidden/auto`, `transform`, `filter` ni `will-change`. `overflow: clip` sí vale. El marco ocupa todo el ancho del módulo: el `.env` del respaldo no debe envolver al módulo.
- Lee de la web: `--cabecera`, `--margen`, `--pizarra`, `--crema`, `--niebla`, `--niebla-2`, `--linterna`, `--tinta`, `--letra-titular`, `--letra-placa`, `--letra-texto`, `--foco-halo` (con respaldo si faltan). Espera la cortina (`Ahio.cortinaFuera`, `Ahio.cortina.fuera`, `#cortina` ausente o `[hidden]`, `ahio:fuera` o `ahio:cortina-fuera`; 6 s de red) antes de crear el motor.
- Ids propios: `ruta-marco`, `ruta-lienzo`, `ruta-rotulos`, `ruta-plano`, `ruta-chip`, `ruta-carga`, `ruta-3d`, `ruta-2d`, `ruta-mover`, `ruta-volver`, `ruta-ayuda`, `ruta-cuaderno`, `ruta-itinerario`, `ruta-poster`, `ruta-c-recorte`, `ruta-p-brillo`.
- Clases que pone en `#ruta-marco`: `con-3d` (primer fotograma), `sin-3d`, `en-plano`, `libre` (explorador), `mapa-suelto` (táctil). Eventos: `ahio:listo` (al cargar `arranque.js`) y `ahio:ruta-lista` (primer fotograma del 3D).
- Para las pruebas: `window.AHIO_3D` = `{ VERSION, estado: 'montando'|'cargando'|'listo'|'plano'|'sin-3d'|'respaldo', motivo, vista: '3d'|'plano', progreso, quieto, motor, rio, plano }`.
- **Distancias para «Alrededor»:** `ref/raw/rutas.json` → `lugares[]` con `id`, `nombre`, `osm`, `lat`, `lon`, `km`, `min`, `ajuste_m`, `recta_km` y, si la ruta no llega al sitio, `hasta` (la Seimeira: hasta Pumares, de donde sale la ruta a pie). Ids: `santa-eulalia`, `villanueva`, `seimeira`, `mazonovo`, `mon`, `sargadelos`, `casa-marco`, `salime`, `paicega`, `taramundi`. Mejor los **km** que los minutos (OSRM se queda corto en estas carreteras).

## Cómo se comporta

- **Con movimiento y densidad «niebla»:** la pista se fija y el scroll es el río: 0–7 % Los Oscos desde arriba (con la casa y los otros dos Oscos) bajando a la fuente; 7–60 % el Ahío se enciende río abajo (rótulos «río Ahío», el Mazo de Mon y el palacio al pasar); 60–84 % el hilo remonta el Agüeira y el río San Martín (la cámara gira una sola vez, despacio, en la boca del Ahío); 84–92 % la casa de cerca con la linterna encendida; 92–100 % todo Los Oscos con los rótulos y sus km. El cuaderno (abajo a la izquierda; abajo a lo ancho en el móvil) lleva la altura del agua en letra de placa, los km, el tramo y el perfil del río (baja de 874 m a 141 m y el agua remontada sube hasta los 700 m de la casa).
- **Movimiento reducido o «sobria»:** no se fija; el marco se queda quieto con el hilo entero y la vista de todo, y el explorador.
- **Explorador:** arrastrar con el ratón suelta el mapa (gira; botón derecho mueve); Ctrl + rueda o el pellizco del trackpad acercan (la rueda sola sigue siendo el scroll de la página); en táctil, «Mover el mapa» (y dos dedos acercan); teclado en el lienzo: flechas, + y −, Escape. «Volver al río» lo devuelve al scroll. Una ayuda pequeña lo dice al final del recorrido.
- **Plano:** sin WebGL2, con ahorro de datos, con `?sin-3d` (u `opciones.gl === false`) o con el botón «En plano». Mismo guion, mismos rótulos, en 2D.

## Cómo se regenera

```
python -I scripts/terreno.py     # descarga a pruebas/3d-fuente/ (si falta) y genera img/terreno/ y ref/raw/rutas.json
node pruebas/3d-probar.mjs        # la prueba sin pintar WebGL (puerto 8876)
```
Después, **subir `VERSION` en `arranque.js`**. `pruebas/3d-fuente/` (MDT de 27 MB, ortofotos, ríos del IGN, las rutas de OSRM, dos letras de Google Fonts para rotular el plano) no se publica: va al `.gitignore`.

No hay póster pintado con WebGL (el 3D no se pinta en las pruebas automáticas): mientras carga, el relieve sombreado del plano cubre el hueco y el lienzo aparece encima con un fundido.

## Rendimiento

- Nada pesado antes de `load` + un rato libre + la cortina. `arranque.js` pesa 12 KB; `guion.js`, `sol.js` y `terreno.json` (44 KB), al montar; Three.js (166 KB gzip) y los datos, solo con WebGL2.
- Móvil (`pointer: coarse` o pantalla < 700 px): malla 384×270, ortofoto 2048 (361 KB WebP), parches 1024 (141 + 186 KB), sombras 1024, densidad ≤ 1,5, sin antialias. Escritorio: 576×404, 4096 (1,2 MB), 1536 (303 + 401 KB), sombras 2048, densidad ≤ 1,75.
- Pinta solo si se ve y algo se mueve (el scroll amortiguado, el explorador, la vuelta); fuera de pantalla, con la pestaña oculta o en plano, nada. Las pepitas brillan con el avance, no con un reloj: quieto, no gasta. La luz se rehace cada minuto.
- Calidad automática (media de 45 fotogramas > 30 ms): densidad −0,25 hasta 1 → sin sombras → densidad 0,75.
- La barra del móvil no rehace el búfer (cambio de alto < 160 px).

## No probado

El 3D no se ha pintado nunca en las pruebas (ni póster). Lo mira Álvaro en su Chrome y en un móvil real: la fluidez, que la cinta no se hunda en el fondo del valle del Ahío (muy encajado) o en las laderas, el giro de la cámara en la boca del Ahío, el tamaño del hilo de lejos, la linterna de la casa, la noche.
