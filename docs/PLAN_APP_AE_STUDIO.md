# Plan técnico — A&E Studio Maker

## Auditoría del proyecto actual

### Tecnología

- React.
- Vite.
- JavaScript con JSX.
- CSS propio.
- `lucide-react` para iconos.
- `@supabase/supabase-js` para autenticación y sincronización.
- PWA con manifiesto y service worker.
- Vercel como plataforma de publicación.

### Estructura actual

- `src/main.jsx`: estado global, navegación y todos los módulos actuales.
- `src/styles.css`: diseño general y adaptación móvil.
- `src/service.css`: estilos de materiales y cotizadores de servicio.
- `src/catalogData.js`: catálogo inicial.
- `src/cloud.js`: cliente de Supabase.
- `supabase/schema.sql`: estado JSON por usuario y políticas RLS.
- `public/manifest.webmanifest`: configuración PWA.
- `public/sw.js`: caché de la PWA.

La aplicación no usa un enrutador. La navegación se realiza con el estado `page` dentro de `App`.

### Almacenamiento actual

Los datos se guardan primero en `localStorage`. Cuando existe una sesión, el mismo estado se sincroniza con `public.business_state.payload` en Supabase. La sincronización es de documento completo y usa una estrategia de última escritura.

### Verificación realizada

- La copia local coincide con los archivos de `main`.
- La producción abre correctamente.
- Se recorrieron los doce módulos actuales.
- La sesión en la nube está conectada.
- No se encontraron errores ni advertencias en la consola.
- Se verificó una vista de 390 × 844 px.
- El menú móvil abre, navega y se cierra.
- No se detectó desbordamiento horizontal.

### Verificación pendiente por limitación del entorno

No fue posible instalar dependencias ni ejecutar `vite build` localmente porque el entorno de trabajo no tiene acceso al registro de npm. La aplicación actual sí tiene un despliegue de producción exitoso. La compilación completa deberá ejecutarse en un entorno con las dependencias disponibles o mediante el despliegue de vista previa de la rama.

## Riesgos identificados

1. `src/main.jsx` concentra demasiada lógica y JSX. Los módulos nuevos deben quedar separados sin hacer una refactorización general.
2. Las dependencias usan `latest` y no existe archivo de bloqueo; la compilación no es totalmente reproducible.
3. No hay linter ni pruebas automatizadas configuradas.
4. `README.txt` está desactualizado respecto a los módulos reales.
5. La sincronización usa un documento completo con última escritura; dos ediciones simultáneas pueden sobrescribirse.
6. El service worker puede conservar una versión anterior si no se renueva el nombre de caché al publicar.
7. Existen archivos heredados en la raíz que no participan en la compilación actual. No se eliminarán en esta etapa.

## Propuesta de integración

### Cambios mínimos en `App`

- Añadir dos opciones a la navegación.
- Añadir `creativeProjects` mediante `useLocal`.
- Añadir `creativeProjects` al estado de nube y a `applyCloudState`.
- Mantener las colecciones existentes sin migraciones.
- Añadir un estado temporal para enviar datos desde Diseño 3D al cotizador.

### Arquitectura nueva

```text
src/
  design3d/
    Design3DPage.jsx
    keychain.js
    design3d.css
  creative/
    CreativeProjectsPage.jsx
    creativeProject.js
    creative.css
```

Las utilidades de OpenSCAD, validación y nombres de archivo quedarán fuera del componente visual.

### Integración con el cotizador

`Design3DPage` enviará un objeto temporal a `App`. `App` abrirá el cotizador 3D existente. `Quote` copiará:

- nombre del proyecto;
- cantidad;
- largo;
- alto;
- grosor;
- tipo de producto.

Peso y tiempo quedarán en cero y se mostrará una indicación para capturarlos desde Bambu Studio. Las fórmulas permanecerán intactas.

### Integración de proyectos creativos

Cada proyecto guardará identificadores de cliente, material, producto y pedido existentes. Los selectores leerán directamente las colecciones actuales. No se creará un segundo directorio, inventario, catálogo ni sistema de pedidos.

## Etapas de implementación

### Etapa 1 — Auditoría y documentación

- [x] Verificar repositorio y producción.
- [x] Enumerar módulos.
- [x] Verificar almacenamiento.
- [x] Identificar riesgos.
- [x] Crear rama `feature/design-modules`.
- [x] Crear documentación inicial.

### Etapa 2 — Navegación y estructura

- [ ] Agregar Diseño 3D.
- [ ] Agregar Diseño creativo.
- [ ] Añadir almacenamiento de proyectos creativos.
- [ ] Confirmar sincronización sin cambiar el esquema.

### Etapa 3 — Generador paramétrico

- [ ] Formulario sencillo.
- [ ] Validaciones.
- [ ] Vista previa 2D.
- [ ] Resumen de medidas.

### Etapa 4 — OpenSCAD y cotizador

- [ ] Generar código OpenSCAD.
- [ ] Copiar código.
- [ ] Descargar `.scad`.
- [ ] Enviar datos al cotizador existente.

### Etapa 5 — Diseño creativo

- [ ] Crear, editar y eliminar proyectos.
- [ ] Seleccionar clientes.
- [ ] Seleccionar productos.
- [ ] Seleccionar materiales.
- [ ] Asociar pedidos.
- [ ] Guardar y abrir enlace de Canva.
- [ ] Registrar preparación Cricut y láser.

### Etapa 6 — Pruebas y documentación

- [ ] Probar escritorio.
- [ ] Probar celular.
- [ ] Revisar consola.
- [ ] Ejecutar build.
- [ ] Ejecutar pruebas y linter si existen.
- [ ] Actualizar README y changelog.

## Decisiones

- No cambiar de framework.
- No tocar fórmulas.
- No cambiar URL, Vercel ni variables de entorno.
- No cambiar la base de datos.
- No añadir servicios externos.
- No añadir inteligencia artificial.
- No añadir carga de imágenes.
- No publicar a producción ni hacer merge automático.

