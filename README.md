# Puente Laboral

App web para pedir trabajos informales de confianza: gasfiteros, niñeras, meseros, mudanzas y más.

- **Al toque:** alguien va ahora, en minutos.
- **Programado:** eliges día y hora con anticipación, una vez o cada semana.
- **Mis trabajadores:** vuelves a contratar directo a quien te gustó.
- **Modo trabajador:** registro, pedidos al toque, agenda para otros días y ganancias.

Es una **demo**: los trabajadores, las ofertas y las calificaciones son de ejemplo, y los datos se guardan solo en el dispositivo de quien la usa. Los pedidos y registros reales se envían por WhatsApp.

## Qué editar

- `js/data.js`: número de WhatsApp, catálogo de oficios, precios referenciales y distritos.
- `SHEETS_URL` en `js/data.js`: URL de Apps Script para guardar pedidos y registros en Google Sheets.

## Estructura

- `index.html`: la página.
- `css/`: estilos (`app.css` base, `vistas.css` pantallas, `flujo.css` pedido y mapa).
- `js/`: `core.js` (estado y rutas), `cliente.js` (inicio, pedidos, mis trabajadores), `pedido.js` (pedir), `seguimiento.js` (ofertas, seguimiento, pago, calificación), `trabajador.js`, `cuenta.js`, `mapa.js`.

Sin dependencias ni compilación: se abre `index.html` y funciona.
