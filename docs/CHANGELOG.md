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

### Limitaciones

- La instalación local de dependencias quedó bloqueada por falta de acceso al registro de npm en el entorno de trabajo.
