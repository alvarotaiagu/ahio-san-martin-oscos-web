# Ahío San Martín · San Martín de Oscos, Asturias · «La linterna»

Web nueva para Ahío San Martín: **ocho apartamentos rurales dobles** (dos en planta baja, seis dúplex) en **el antiguo ayuntamiento de San Martín de Oscos**, una casona de pizarra de principios del siglo XX con una **linterna acristalada** en lo alto del tejado. La lleva **Ena Mateos**. Hoy tienen un WordPress con Elementor y el motor Redforts: es una propuesta que Álvaro les enseñará. En local, con `noindex, nofollow` en todas las páginas, sin publicar y sin commits.

- **Datos y fuentes:** `ref/DATOS-AHIO.md`; fotos: `ref/FOTOS.md`. Lo que no está ahí no se afirma: va a `PENDIENTES.md` o sale como «supuesto».
- **Encargo:** `ENCARGO.md` (cinco agentes: Web, Entrada, Fachada, Hilo y Ruta).
- **Una sola página** (`index.html`) más legales y 404. Solo castellano; los nombres propios como son (Ahío, Casa da Vila en el logo, Xuntanza de Filandeiras, Seimeira, Piorno). *Filandeira*, *xuntanza*, *escarpullado*, *roca* y *fuso* se explican la primera vez (por confirmar con Ena).

## Concepto

El logo de Ahío es el propio edificio dibujado a línea, con la linterna arriba. San Martín amanece muchas veces en niebla. La web empieza en la niebla, se enciende la linterna y la niebla se abre. **La luz ámbar de la linterna es el acento de toda la web**: el punto del enlace activo de la cabecera, el foco del teclado, el botón de reservar, las ventanas que se encienden. El edificio cuenta sus vidas, su fachada es el índice de los apartamentos, el hilo de lana de Ena cose la parte de las personas, el río Ahío recorre Los Oscos en 3D y reservar es firmar en el registro de entrada.

La historia, solo la que consta: fue el ayuntamiento; Turismo Asturias cuenta que también albergó centro social, biblioteca, centro médico y cárcel (sin orden ni fechas); se reformó «a principios de los noventa». El aire de registro municipal se usa para datos verdaderos de hoy (la placa con las cifras, la reserva).

### La página, de arriba abajo

| # | Sección | Quién | Qué lleva |
|---|---|---|---|
| — | **Cortina** | Entrada | La niebla de madrugada, el edificio del logo que se traza, la linterna que se enciende y la niebla que se abre (`partes/cortina.html`, `js/linterna.js`). El dibujo vuela al logo de la cabecera (`[data-logo-cortina]`). |
| 1 | **Portada** | Entrada + Web | Escritorio: columna de texto sobre niebla a la izquierda y la foto `niebla-fachada` a sangre a la derecha, con la niebla entrando en ella. Móvil: la foto arriba y el texto debajo. Encima de la foto, la niebla viva WebGL del módulo (y el gesto de abrirla). Respaldo de la web: la foto con dos capas de niebla en CSS. Titular, «Ver fechas», teléfono y `[data-tiempo-ahora]` (lo escribe Entrada con Open-Meteo). |
| 2 | **Ahío, como el río** | Web | El Ahío y el oro de los romanos, el edificio, y **la placa** con las cifras verdaderas (8 · 2 · 6 · hasta 2 supletorias · mascotas) en letra de placa. |
| — | *De un vistazo* | Web | Solo en la versión sobria. |
| 3 | **Las vidas del edificio** | Fachada | Respaldo de la web: la foto de la fachada, las cuatro placas (Ayuntamiento · Y también fue · Reformado · Apartamentos rurales Casa de la Villa) y la foto antigua (248 px, a su tamaño) con su pie literal. |
| 4 | **Los apartamentos** | Fachada | Respaldo: planta baja y dúplex con sus fotos, lo que hay en todos, supletorias y cunas, y «Ver fechas» con la preferencia. |
| 5 | **Dentro** (pizarra) | Web | Salón de arriba, butacas, recepción, el otro salón, escalera, jardín, plaza, el pueblo desde una ventana, la decoración; **lo práctico** (horarios, check-in automático, calefacción, sin humo, aparcamiento, lavandería y el regalo de 6 noches) y las mascotas. |
| 6 | **Ena** | Web | Su historia con sus palabras literales, «nuestro tiempo» y lo que ayuda a preparar; enlaza con la fachada (la puerta y las ventanas) y con la lana. |
| 7 | **La Xuntanza de Filandeiras** | Hilo | Respaldo: el texto de su web, los seis pasos (lavado, escarpullado, cardado, torcido, filado, calcetado), la frase y la foto `filandeira`. |
| 8 | **Los Oscos, siguiendo el agua** (3D del río Ahío) | Ruta | Respaldo: el plano (`<!--plano-ruta-->`, lo pone `construir.mjs` si existe `img/terreno/plano.*`) y los lugares con su distancia por carretera. |
| 9 | **Alrededor** | Web | Las rutas con página en su web (dificultad, duración, distancia, tipo y desnivel, solo si los da), fotos del paisaje, lugares cerca con los km de `ref/raw/rutas.json` y los servicios del pueblo (sin horarios). |
| 10 | **El registro de entrada** | Web | El motor de reservas de DEMOSTRACIÓN (`js/reserva.js`), en un libro de registro sobre la mesa de pizarra. |
| 11 | **Cómo llegar y preguntas** | Web | Dirección, accesos, carreteras, contacto, el mapa de Google solo al pedirlo y siete preguntas en acordeón. |
| 12 | **Pie: la calceta terminada** | Hilo + Web | La tira de punto que se teje con la lectura (respaldo de la web: la calceta ya terminada en SVG), el logo entero y el registro AR.32.AS. |

**§5 bis:** sin pila sticky ni marquee; el gesto del hero (abrir la niebla, módulo Entrada); el objeto que se completa en el pie (la calceta, módulo Hilo); **el foco del teclado con forma propia**: contorno de 2 px (verde sobre crema, niebla y lana; de linterna sobre pizarra) y un halo ámbar de linterna (`--foco-halo`); LCP medido abajo. Sin cursor propio.

### Paleta y letras

| Token | Color | Uso |
|---|---|---|
| `--crema` / `--crema-2` | `#FAF6E1` / `#F2ECD2` | el papel del logo; bandas y el libro |
| `--verde` / `--verde-2` | `#023919` (el del logo) / `#1F5236` | titulares, la placa, el sello, botones verdes |
| `--pizarra` / `--pizarra-2` | `#2B3035` / `#3D444B` | «Dentro», «Los Oscos», «Reservar», el menú del móvil |
| `--niebla` / `--niebla-2` | `#D7DCDA` / `#A9B2B2` | la portada |
| `--linterna` | `#F2B84B` | **el acento**: botón «Ver fechas» (texto de tinta, 8,9:1), puntos de luz, halos, el foco; sobre pizarra, también texto (7,4:1) |
| `--linterna-texto` | `color-mix(linterna 40 %, tinta)` = `#725F31` | si el ámbar tiene que ser texto sobre crema (5,7:1) o lana (4,7:1) |
| `--lana` | `#EADFC8` | la sección de la lana y el pie |
| `--tinta` / `--tinta-2` | `#1D2420` / `#5F635A` | texto y texto secundario |

**Letras** (Google Fonts, `display=swap`; existen las tres con esos nombres): **Gilda Display** (titulares; no tiene cursiva, así que el énfasis va en color), **Castoro Titling** (la placa, cifras, rótulos, teléfonos, el sello) y **Wix Madefor Text** 400–600 (texto).

## Cómo se trabaja

- **Edita siempre `index.src.html` o las `partes/`** (cabeza, cabecera, reserva, llegar, pie y guiones; la cortina es de Entrada). `node construir.mjs` incluye las partes, convierte `<img data-foto>` en `<picture>` AVIF/WebP/JPG, pone el plano de la ruta en `<!--plano-ruta-->` si existe, rellena las distancias (`<span class="dist" data-dist="…">`) con los km de `ref/raw/rutas.json` (sin minutos: los de OSRM se quedan cortos en la montaña), **quita los `<link>`/`<script>` propios que aún no existan** y pone `?v=<huella>` (`versionar.mjs`). Si se publica, recordar «Ctrl+F5».
- **Fotos:** `scripts/fotos-lista.json` + `node scripts/fotos.mjs` (o `node scripts/fotos.mjs plaza bano`). Las de 2022 (`tipo: "movil"`): se baja el HDR (se resta parte del contraste local), menos saturación y aún menos en los amarillos de pared, medio balance de blancos en las de dentro, luces un pelo comprimidas. Las `DSC*` de 2026 (`tipo: "dsc"`): casi tal cual. **Nunca amplía**; la `antiguo` (248 px) solo a 248. `fachada-frente` no se endereza: sus verticales ya están rectas.
- **Marca:** `node scripts/marca.mjs` → el logo real **recortado, no redibujado**, con el papel vuelto transparente píxel a píxel (alfa entre el crema y el verde): `marca/simbolo-*.png` (la casa), `marca/nombre-*.png` («Ahío San Martín» con su letra), `marca/logo-*.png` (entero, para el pie y el 404), favicons, icono e `img/og.jpg`. La cabecera pone la casa y el nombre uno al lado del otro.
- **Legales y 404:** `node scripts/legales.mjs` y después `node construir.mjs`.
- **`node verificar.mjs`** (puerto 8871, una vez al terminar; sin capturas; navegador con `--disable-3d-apis` y la página con `?sin-webgl&sin-3d`: ni la niebla ni el 3D se pintan).
- **`node scripts/rendimiento.mjs`** (puerto 8872): móvil de gama media (Pixel 7, 4G lento, CPU ×4), sin WebGL.
- **`node scripts/probar-borrado-mando.mjs`**: comprueba la receta de borrado del mando (también lo llama `verificar.mjs`).

## Contrato con los módulos

- `window.Ahio.<mod>.montar(el, { movimiento, densidad: 'niebla'|'sobria', hora })` → `{ destruir() }`; el HTML de `el` es el respaldo. `main.js` monta **vidas, índice, hilo, ruta y calceta al acercarse** (900 px de margen) y **la linterna (portada) en `Ahio.alAbrirse`**. Vidas e índice: `Ahio.fachada.vidas` / `Ahio.fachada.indice` (función u objeto con `montar`) o `Ahio.fachada.montar`; la calceta: `Ahio.hilo.calceta`, `Ahio.calceta.montar` o `Ahio.hilo.montar`. Si el JS de un módulo aún no ha llegado (el 3D es un módulo diferido), se vuelve a intentar al `load`, con `ahio:listo` y con el scroll. Al cambiar de densidad: `destruir()`, el respaldo vuelve y se monta otra vez.
- **Ruta:** con `?sin-3d`, `op.gl = false` y `op.sin3d = true`. **Linterna:** con `?sin-webgl` o `?sin-3d`, `op.webgl = false` (el módulo también lo lee de la URL).
- **La cortina:** el puente está en `partes/cabeza.html` desde el primer momento: `Ahio.alAbrirse(fn)`, `Ahio.abrir()`, `Ahio.retirarCortina()`; escucha `ahio:cortina-abre` / `ahio:cortina-fuera` (los que lanza la cortina de Entrada) y avisa con `ahio:abierta` y `ahio:fuera`. La cabecera aparece cuando la cortina **empieza a abrirse** (`html.cortina-abriendo`), para que el dibujo vuele a su logo. Redes de seguridad: 6,5 s en la cabeza y 7 s en `main.js`, que **esperan mientras `Ahio.cortina.enMarcha`** (hasta 12 s), además de las de la propia cortina.
- `Ahio.reservar(preferencia?)` (`'planta-baja'|'duplex'|'cama-180'`) apunta la preferencia en el registro (`Ahio.motor.preferir`) y baja a `#reservar`. Cualquier enlace con `data-reservar="…"` hace lo mismo.
- `Ahio.sol(fecha)` → `{ altura, salida, puesta, fase: 'dia'|'dorada'|'noche' }` con SunCalc en 43.2650908, −6.9616133; `Ahio.hora()` es la de ahora o la de **`?hora=2026-10-23T19:30`** (hora de Madrid). Comprobado a mano para el 23-10-2026: sale a las 8:51 y se pone a las 19:33.
- `Ahio.web` (lenis, irA, motion, sobria…) para quien lo quiera; la densidad sobria también va como `html[data-densidad="sobria"]`.

## Reservar · «Registro de entrada» (DEMOSTRACIÓN)

Un libro de registro sobre la mesa de pizarra: papel crema con rayado fino y margen, y arriba **el asiento** con sus columnas (Fecha de entrada · Fecha de salida · Noches · Personas · Apartamento) que se van rellenando. La foto `registro` (la llave de madera) al lado del título. Pasos: fechas → apartamentos y personas → datos → confirmación, donde **cae el sello «ENTRADA»** con las fechas elegidas, en el verde del logo y con su imperfección (filtro de ruido `#tinta-sello`), y el localizador `AHIO-AAMMDD-NNN`.

- Calendario de 12 meses, dos a la vista: noches **libres**, **con 1 o 2 apartamentos libres** (una muesca) y **completas** (rayadas), siempre las mismas (semilla fija por año).
- **Uno o varios apartamentos** (hasta los que queden libres esas noches); **personas**: 2 por apartamento y hasta 2 supletorias (15 € por persona y noche); **cunas** de viaje (hay 2, 10 € una vez); **apartamentos con mascota** (12 € por noche, como mucho 72 €). **Preferencia**: planta baja / dúplex / cama de 1,80, que se apunta («Ena te asigna el que mejor encaje»), nunca una unidad concreta.
- Junto al botón: «Se paga al llegar; se pide una tarjeta de débito como garantía», la cancelación de su web (15 y 7 días) y «Demostración: no se envía, no se guarda ni se cobra nada».
- **Supuestos:** 60 € por noche y apartamento en temporada baja y 88 € en alta (la horquilla de Turismo Asturias); temporada alta = Semana Santa, puentes y festivos (nacionales y el 8 de septiembre), julio y agosto; **una sola noche: +15 € por apartamento** (su web dice que una noche cuesta más, no cuánto); la ocupación, de ejemplo. El bono de Turismo Asturias se menciona, no se descuenta.

## Mando de densidades (solo con `?revision`)

- **«Niebla»:** la niebla viva, la linterna que se enciende, la placa que cambia, las ventanas que se iluminan, el hilo que se mueve y la calceta que crece.
- **«Sobria»:** la niebla quieta y leve, el dibujo ya hecho, las vidas en lista, las ventanas como índice normal, el hilo quieto y la calceta terminada; **añade** la tabla «Ahío San Martín, de un vistazo» (apartamentos, plantas, camas, supletorias, cunas, mascotas, horarios, servicios, distancias, registro).

### Receta de borrado del mando

1. En `partes/cabeza.html`, en el script, el `try { … }` de `// MANDO DE MAQUETA`.
2. En `partes/pie.html`, el bloque `<!-- MANDO DE MAQUETA` … `<!-- fin del MANDO DE MAQUETA -->`.
3. En `js/main.js`, el bloque `11. MANDO DE MAQUETA` hasta `fin del MANDO DE MAQUETA`.
4. Opcional: `.mando` y `.vistazo` en `css/estilos.css` y la sección `#vistazo` de `index.src.html`.
5. `node construir.mjs`. (`node scripts/probar-borrado-mando.mjs` lo comprueba en memoria.)

## Comprobaciones

- **`verificar.mjs`:** archivos, noindex, ids, partes, fotos (ninguna de la lista «NO», ninguna ampliada, la antigua a 248 px, la portada precargada con el mismo srcset), textos (ni reseñas ni notas, sin superlativos, sin wifi, sin 1990/1994, ocho y no nueve, las erratas de teléfono y correo, sin kilos de mascota, **ningún año que no venga de los datos**, «Casa da Vila» solo en el logo, las vidas con su fuente, Ena y la lana literales, solo castellano), huecos de los módulos según el contrato, CSS de cookies/mando/menú/dvh/cortina, el sol, el contraste de 60 parejas de texto, el foco (2 px y el halo; de linterna sobre pizarra), el punto de linterna del enlace activo, el mapa, `Ahio.reservar('duplex')`, módulos que montan al acercarse y respaldos sin sus JS, el registro de punta a punta (temporadas, precios, estados, una noche, supletorias, cunas, mascota con tope, preferencia, validación, condiciones junto al botón, localizador y sello), el visor por nombre (cada miniatura), cookies en 4 pasos, el mando y la sobria, móvil a 360/375/390/768 (sin scroll lateral, foto arriba, menú con la cabecera fija, barra del navegador sin rehacer nada), legales y, al final y con movimiento, la cortina, la linterna montada al abrirse, sin Lenis ni GSAP y sin JavaScript.
- **Resultado y LCP:** ver la última pasada en el informe del agente Web (se apuntan aquí al cerrar).

## Qué mirar en Chrome

- **La portada** en escritorio y en el móvil: el fundido de la columna de niebla con la foto, y cómo encaja la niebla WebGL de Entrada (que no quede un corte duro en el borde izquierdo de la foto).
- **La cabecera** (la casa y el nombre del logo uno al lado del otro): si se lee bien a 360 px; y el punto de linterna sobre el enlace activo al bajar.
- **La placa** de «Ahío, como el río» y las **placas** de las vidas (respaldo).
- **Las fotos de dentro**, corregidas de color (HDR y amarillos): si alguna se ve fría o rara, sobre todo `recepcion` y `ap-salon`.
- **El registro de entrada:** el papel rayado con su margen, el asiento que se rellena, la muesca de «quedan 1 o 2», el sello al confirmar (con y sin movimiento reducido) y el móvil.
- **El foco** (Tab): el halo ámbar sobre crema, niebla, pizarra y lana.
- **El mando** con `?revision`: las dos versiones.
- **Los módulos** (cortina, niebla, fachada, hilo y 3D) en sus bancos de prueba de `pruebas/` (ver los informes de cada agente) y en la página con `?hora=` y `?tiempo=niebla|nubes|despejado`.

## Para publicar

Repo propio y GitHub Pages sobre la rama real. Antes, `PENDIENTES.md` (reforma, por qué Ahío, qué apartamentos son de planta baja, camas de 1,80, wifi, mascotas, precios y temporadas, suplemento de una noche, glosario de la lana, permisos de caras y de la foto antigua, reseñas, fotos nuevas, el motor Redforts que ya tienen) y la receta de borrado del mando si se entrega. Quitar el `noindex` solo si se vende.
