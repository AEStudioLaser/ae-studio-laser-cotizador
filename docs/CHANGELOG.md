# Changelog

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
