/* Genera los *.src.html de las páginas legales y el 404 con una plantilla común.
   Uso: node scripts/legales.mjs  (después, node construir.mjs)
   La titular sale del aviso legal de su web actual (Ena Victoria Mateos González). Su NIF no se copia
   (es un DNI): va como PENDIENTE visible. El correo del aviso legal de su web (.com) contradice al de
   contacto (.es): se usa el .es y va a PENDIENTES.md. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TITULAR = `<dl>
  <dt>Titular</dt><dd>Ena Victoria Mateos González</dd>
  <dt>NIF</dt><dd><span class="aviso-corto">PENDIENTE</span></dd>
  <dt>Nombre comercial</dt><dd>Ahío San Martín · Apartamentos rurales Casa de la Villa</dd>
  <dt>Dirección</dt><dd>La Villa s/n · 33777 San Martín de Oscos (Asturias)</dd>
  <dt>Teléfono</dt><dd><a href="tel:+34644835772">644 835 772</a></dd>
  <dt>Correo</dt><dd><a href="mailto:hola@oscosahio.es">hola@oscosahio.es</a></dd>
  <dt>Actividad</dt><dd>Apartamentos rurales</dd>
  <dt>Registro de turismo</dt><dd>AR.32.AS (Registro de Empresas y Actividades Turísticas del Principado de Asturias)</dd>
</dl>
<p class="aviso">PENDIENTE: confirmar el NIF y el correo de contacto (su aviso legal actual dice hola@oscosahio.com; la página de contacto, hola@oscosahio.es).</p>`;

const paginas = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    cuerpo: `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos de la titular de esta web:</p>
${TITULAR}
<p>El órgano competente para su supervisión es la consejería de turismo del Gobierno del Principado de Asturias.</p>
<h2>Uso de la web</h2>
<p>Esta web informa sobre Ahío San Martín, ocho apartamentos rurales en San Martín de Oscos (Asturias). Los precios y las condiciones pueden cambiar: los que valen son los que se confirman al reservar.</p>
<p>Por ahora, la reserva de esta web es una demostración: la ocupación es de ejemplo, los precios son supuestos y no se envía, se guarda ni se cobra nada.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos, el logotipo y las fotografías son de la titular o se usan con su permiso. Las letras Gilda Display, Castoro Titling y Wix Madefor Text se usan con su licencia libre (SIL Open Font License). El relieve y la ortofoto de «Los Oscos» son del Instituto Geográfico Nacional (CC BY 4.0) y los ríos y las carreteras, de OpenStreetMap (ODbL). El tiempo de ahora lo da Open-Meteo (CC BY 4.0).</p>
<p class="aviso">PENDIENTE: confirmar que todas las fotos son suyas y se pueden usar (vienen de su web), el autor y el permiso de la foto antigua en blanco y negro, y el permiso de las personas que salen en las fotos de la Xuntanza.</p>
<h2>Responsabilidad</h2>
<p>Los enlaces a otras webs (Google Maps, WhatsApp, Instagram, Facebook) llevan a servicios de terceros con sus propias condiciones.</p>
<h2>Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Para cualquier reclamación, escríbenos o llámanos: buscaremos siempre una solución amistosa.</p>`,
  },
  privacidad: {
    titulo: 'Política de privacidad',
    cuerpo: `
<h2>Responsable</h2>
${TITULAR}
<h2>Qué datos tratamos y para qué</h2>
<p>Los que nos das al reservar, al escribirnos o al llamarnos: nombre, teléfono, correo, las fechas, cuántos sois y lo que quieras contarnos. Los usamos para gestionar tu reserva y atenderte. Al reservar pedimos una tarjeta de débito como garantía; solo se cobra a la llegada.</p>
<p>Al alojarte, la ley obliga a registrar los datos de los viajeros y comunicarlos a las autoridades (Real Decreto 933/2021). Si eliges el check-in automático, el parte de viajeros te llega por correo.</p>
<p>La reserva de esta web es, por ahora, una demostración: lo que escribas en ella no sale de tu navegador ni se guarda.</p>
<h2>Base legal y plazos</h2>
<p>La base es tu consentimiento al reservar, la ejecución de la reserva y, para el registro de viajeros, una obligación legal. Los datos se conservan mientras dura la relación y, después, el tiempo que exige la ley.</p>
<h2>Con quién se comparten</h2>
<p>Con nadie, salvo obligación legal (el registro de viajeros) y siempre con lo imprescindible.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación o la portabilidad de tus datos escribiendo a <a href="mailto:hola@oscosahio.es">hola@oscosahio.es</a> o llamando al <a href="tel:+34644835772">644 835 772</a>. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</p>
<h2>Lo que guarda esta web en tu navegador</h2>
<p>Una sola cosa: <code>ahio-cookies</code> en el almacenamiento local, para recordar que ya has visto el aviso de cookies. Más detalles en <a href="cookies.html">cookies</a>.</p>`,
  },
  cookies: {
    titulo: 'Política de cookies',
    cuerpo: `
<p>Esta web no usa cookies propias de análisis ni de publicidad.</p>
<h2>Lo que se guarda en tu navegador</h2>
<ul>
  <li><b>ahio-cookies</b> (almacenamiento local): recuerda que has visto el aviso, para no enseñártelo en cada visita. Es técnica y no caduca sola; puedes borrarla desde tu navegador.</li>
</ul>
<h2>Servicios de terceros</h2>
<ul>
  <li><b>Google Fonts</b>: las letras de la web (Gilda Display, Castoro Titling y Wix Madefor Text) se cargan desde los servidores de Google, que reciben tu dirección IP.</li>
  <li><b>Google Maps</b>: el mapa de «Cómo llegar» solo se carga si pulsas «Ver el mapa». A partir de ese momento, Google puede instalar sus cookies.</li>
  <li><b>Open-Meteo</b>: la línea «Ahora en San Martín de Oscos» y la niebla de la portada piden el tiempo de ahora a Open-Meteo (api.open-meteo.com). La petición va sin cookies y sin decir de qué página viene, solo con las coordenadas del pueblo; Open-Meteo recibe tu dirección IP.</li>
  <li><b>jsDelivr</b>: las librerías que suavizan el desplazamiento y mueven las animaciones (Lenis y GSAP) se descargan de jsDelivr, que recibe tu dirección IP. No instalan cookies.</li>
</ul>
<h2>El 3D de «Los Oscos»</h2>
<p>El relieve en 3D se dibuja en tu navegador con datos del Instituto Geográfico Nacional (relieve MDT05 y ortofoto PNOA, CC BY 4.0) que van con esta misma web: no se conecta a ningún servicio de fuera ni instala cookies. La posición del sol y de la luna se calcula en tu navegador.</p>
<p>Puedes volver a ver el aviso desde «Preferencias de cookies», en el pie de la página.</p>`,
  },
  accesibilidad: {
    titulo: 'Declaración de accesibilidad',
    cuerpo: `
<p>La titular se compromete a que esta web sea accesible conforme a la norma UNE-EN 301 549 (nivel AA de las WCAG 2.1).</p>
<h2>Situación de cumplimiento</h2>
<p class="aviso">PENDIENTE: completar tras la revisión de accesibilidad previa a la publicación.</p>
<p>La web se ha construido para poder usarse entera con el teclado y con lector de pantalla: contrastes de al menos 4,5:1, un foco visible (un halo ámbar con contorno), textos alternativos en las fotos, formularios con etiquetas y animaciones que se desactivan si tu sistema pide reducir el movimiento. La niebla, el hilo y el 3D son un adorno: la información está también en el texto.</p>
<h2>El edificio</h2>
<p>Dos de los ocho apartamentos están en la planta baja, sin escaleras; los otros seis son dúplex, con el dormitorio arriba.</p>
<p class="aviso">PENDIENTE: confirmar el acceso desde la calle hasta la puerta, la entrada a los apartamentos de planta baja y sus baños.</p>
<h2>Contacto</h2>
<p>Si encuentras una barrera, escribe a <a href="mailto:hola@oscosahio.es">hola@oscosahio.es</a> o llama al <a href="tel:+34644835772">644 835 772</a>. Te responderemos y te daremos la información en un formato accesible.</p>`,
  },
};

const cabeza = (titulo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Ahío San Martín</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Castoro+Titling&family=Gilda+Display&family=Wix+Madefor+Text:wght@400..600&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<link rel="stylesheet" href="css/legal.css">
<link rel="icon" href="marca/favicon.svg" type="image/svg+xml">
<link rel="icon" href="marca/favicon-32.png" sizes="32x32" type="image/png">
</head>`;

const MARCA = `<a class="marca" href="./" aria-label="Ahío San Martín, a la portada"><img class="marca__casa" src="marca/simbolo-96.png" srcset="marca/simbolo-96.png 1x, marca/simbolo-192.png 2x" width="48" height="42" alt=""><img class="marca__nombre" src="marca/nombre-480.png" srcset="marca/nombre-480.png 1x, marca/nombre-960.png 2x" width="190" height="21" alt="Ahío San Martín"></a>`;

for (const [nombre, p] of Object.entries(paginas)) {
  const html = `${cabeza(p.titulo)}
<body>
<header class="legal-cab">
  <div class="env">
    ${MARCA}
    <a class="volver" href="./">Volver a la portada</a>
  </div>
</header>
<main class="legal">
  <div class="env">
    <h1>${p.titulo}</h1>
${p.cuerpo}
  </div>
</main>
<footer class="legal-pie">
  <div class="env">
    <a href="aviso-legal.html">Aviso legal</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="accesibilidad.html">Accesibilidad</a>
  </div>
</footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, `${nombre}.src.html`), html);
  console.log(`${nombre}.src.html`);
}

fs.writeFileSync(path.join(RAIZ, '404.src.html'), `${cabeza('Página no encontrada')}
<body class="no-hay">
<style>
  .no-hay { min-height: 100svh; display: grid; place-items: center; text-align: center; padding: 24px; background: var(--niebla); }
  .no { display: grid; gap: 22px; justify-items: center; max-width: 32em; }
  .no__logo img { width: 180px; height: auto; }
  .no h1 { font: 400 clamp(2.4rem, 7vw, 3.6rem)/1.04 var(--letra-titular); }
  .no p { color: #4C524F; }
  .no__luz { width: 9px; height: 9px; border-radius: 50%; background: var(--linterna); box-shadow: 0 0 0 4px rgb(242 184 75 / .25), 0 0 26px 8px rgb(242 184 75 / .6); }
</style>
  <main class="no">
    <p class="no__logo"><img src="marca/logo-640.png" alt="Ahío San Martín · Apartamentos rurales Casa da Vila" width="180" height="163"></p>
    <span class="no__luz" aria-hidden="true"></span>
    <h1>Esta página se ha perdido en la niebla</h1>
    <p>La que buscas no existe o ha cambiado de sitio. El edificio sigue donde estaba: en La Villa, San Martín de Oscos.</p>
    <a class="btn btn--linterna" href="./#reservar">Ver fechas</a>
    <a href="./">Volver a la portada</a>
  </main>
</body>
</html>
`);
console.log('404.src.html');
