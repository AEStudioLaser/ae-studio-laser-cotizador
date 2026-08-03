# Changelog

## 22.0.0 — Compras sin doble captura

- Inventario se convirtió en el único lugar para registrar compras de materiales y productos.
- Al agregar un artículo con costo de compra, el movimiento aparece automáticamente en Finanzas.
- Cada artículo existente tiene la acción **Reabastecer** para aumentar existencias y registrar la salida de dinero en un solo paso.
- Finanzas conserva la captura de gastos y compras externas que no pertenecen al inventario.
- Los movimientos anteriores se conservan sin duplicarse ni modificar existencias históricas.

## 21.0.0 — Finanzas sencillas

- Se agregó un módulo de Finanzas con cobros, cuentas por cobrar, compras, gastos y flujo mensual.
- Los cobros se toman automáticamente de los pagos registrados en Pedidos.
- Las compras pueden aumentar las existencias y actualizar el costo promedio de un artículo del Inventario.
- Las compras y los gastos reducen el flujo de dinero, pero no alteran el historial de ventas.
- El resumen muestra utilidad estimada y valor del inventario para facilitar el control interno.

## 20.0.0 — Registro de pagos simplificado

- Se eliminó la selección obligatoria entre anticipo y pago completo.
- El anticipo o los abonos se activan únicamente cuando el pedido los necesita.
- La nueva acción **Entregado y pagado** registra automáticamente el saldo restante con su método de pago.
- Los pedidos liquidados pasan inmediatamente a **Finalizados** y conservan el historial completo de pagos.

## 19.0.0 — Pagos, pedidos finalizados y cotizaciones sin material

- Después de guardar un pedido se puede elegir **Anticipo y saldo al entregar** o **Pago completo al entregar**.
- Un pedido entregado con saldo pendiente permanece en **Activos** hasta quedar liquidado.
- Los pedidos entregados y pagados pasan automáticamente a **Finalizados** y quedan protegidos contra modificaciones.
- Los cotizadores de Láser y Cricut permiten elegir **Sin material** para no duplicar costos incluidos en un precio manual o de catálogo.
- Los productos, hojas, superficies y filamentos elegidos desde Inventario se descuentan al crear el pedido; el pedido muestra exactamente qué se descontó.

## 18.0.0 — Biblioteca de parámetros

- Los parámetros se retiraron de los tres cotizadores para conservar formularios sencillos.
- Se agregó la opción independiente **Parámetros** al menú principal.
- La nueva consulta separa los perfiles de Bambu Lab A1, Sculpfun 20 W y Cricut.
- Cada perfil muestra sus valores, unidades, recomendaciones y advertencias de seguridad.
- Consultar un perfil no modifica costos, inventario, cotizaciones ni pedidos.

## 17.0.0 — Parámetros sugeridos de producción

- Se añadieron perfiles editables para Bambu Lab A1, láser Sculpfun de 20 W y Cricut Maker.
- Los parámetros quedan ocultos en una sección opcional para mantener sencillos los cotizadores.
- Los perfiles se guardan dentro de la cotización y del pedido, pero no alteran automáticamente el precio.
- Los pedidos muestran el nombre del perfil de producción seleccionado.
- Se añadieron pruebas automáticas para los perfiles y su selección por tipo de trabajo.

Todos los cambios relevantes de A&E Studio Maker se documentan aquí.

## En desarrollo — `feature/design-modules`

### Documentación

- Se documentó el estado real de la aplicación existente.
- Se enumeraron los módulos, dependencias, navegación y almacenamiento.
- Se registraron las fórmulas que deben permanecer sin cambios.
- Se definió la arquitectura de Diseño 3D y Diseño creativo.
- Se documentó el flujo manual de Canva, Cricut y LightBurn.
- Se dejó constancia de que esta versión no incluye IA ni carga de imágenes.

### Verificación

- Se confirmó que la copia de trabajo coincide con `main`.
- Se recorrieron todos los módulos de producción.
- Se verificó la sincronización conectada.
- Se verificó la navegación móvil a 390 × 844 px.
- No se encontraron errores en consola.
- Se añadió el generador paramétrico de llaveros con exportación OpenSCAD.
- Se añadió la organización de proyectos para Canva, Cricut y LightBurn.
- Se conectó el diseño 3D con el cotizador existente sin alterar sus fórmulas.
- Se añadieron siete pruebas automáticas de validación y generación.
- La vista previa de Vercel compiló correctamente desde la rama de trabajo.
- Se comprobó que clientes, inventario y pedidos existentes aparecen en Diseño creativo.
- Los enlaces de Canva se convirtieron en enlaces HTTPS estándar y se verificó su apertura.
- Se verificaron la copia del código OpenSCAD y la confirmación de descarga del archivo `.scad`.
- Se añadieron pruebas de precio para confirmar que Cricut suma producto base, material y personalización.
- Se verificó por prueba que láser conserva el producto seleccionado como precio mínimo.
- Se añadieron pruebas de consumo de vinil por superficie y de stickers por hojas.

### Cotizador Cricut e inventario

- El precio de Cricut ahora suma el producto base al material y al trabajo de personalización.
- Los productos físicos del inventario pueden seleccionarse como producto base.
- Los materiales de Cricut del inventario pueden controlarse por superficie o por cantidad de hojas.
- El vinil se descuenta en centímetros cuadrados según ancho × alto × cantidad.
- Los stickers, el papel y la cartulina se descuentan por hojas necesarias.
- El inventario se descuenta únicamente al crear el pedido; guardar una cotización no altera existencias.
- Se simplificó el mensaje de WhatsApp y se eliminó el precio por pieza y el desglose interno.

### Impresión 3D multicolor

- Se mantuvo intacto el flujo sencillo de impresión de un solo material.
- Se añadió una opción “Impresión multicolor” que muestra los colores adicionales solo al activarla.
- Cada filamento permite seleccionar material y capturar sus gramos.
- El costo total suma todos los filamentos, incluida la purga o torre cuando se captura en los gramos de Bambu Studio.
- El inventario de filamento puede registrarse y mostrarse en gramos.
- Al crear el pedido se descuentan los gramos de cada rollo seleccionado; guardar una cotización no altera existencias.

### Anticipos y abonos

- Cada pedido conserva su total y un historial independiente de pagos.
- El primer pago se registra como anticipo y los siguientes como abonos.
- Cada movimiento incluye importe, fecha, método y una nota opcional.
- El saldo y el estado `Sin pago`, `Pago parcial` o `Pagado` se calculan automáticamente.
- Se puede indicar la fecha prometida de liquidación y la app marca los pagos vencidos.
- La app advierte antes de entregar un pedido con saldo pendiente.
- Los pagos forman parte del pedido existente y se sincronizan mediante el estado en la nube actual, sin cambios de base de datos.
- Los pedidos anteriores siguen funcionando y se consideran sin pago hasta registrar su primer movimiento.

### Limitaciones

- La instalación local de dependencias quedó bloqueada por falta de acceso al registro de npm en el entorno de trabajo.
