# A&E Studio Maker — Especificación maestra

## Identidad

- Negocio: **A&E Studio Laser**
- Plataforma interna: **A&E Studio Maker**
- URL de producción: `https://ae-studio-laser-cotizador.vercel.app`
- Color principal: azul
- Uso previsto: celular, tableta y computadora

La plataforma ayuda a cotizar, organizar y administrar trabajos de impresión 3D, corte y grabado láser, Cricut, vinil, stickers, DTF, papelería creativa y productos personalizados.

## Principio de producto

> Si una tarea se repite varias veces, A&E Studio Maker debe ayudar a realizarla más rápido.

La interfaz debe seguir siendo clara, moderna, accesible y sencilla. No se deben duplicar módulos existentes ni modificar fórmulas de cotización sin autorización.

## Estado actual verificado

La aplicación existente está construida con React y Vite. Se verificó que la copia local coincide, por SHA de archivo, con la rama `main` del repositorio `AEStudioLaser/ae-studio-laser-cotizador`.

### Módulos existentes

1. Resumen o dashboard.
2. Cotizador de impresión 3D.
3. Cotizador de láser.
4. Cotizador de Cricut.
5. Catálogo de productos.
6. Pedidos.
7. Inventario.
8. Clientes.
9. Historial de cotizaciones.
10. Modelos 3D frecuentes.
11. Sincronización entre dispositivos.
12. Configuración de costos y materiales.

### Funciones transversales existentes

- Cotizaciones guardadas.
- Creación de pedidos desde una cotización.
- Alta automática de clientes desde una cotización.
- Productos del catálogo como precio mínimo.
- Materiales del inventario disponibles en el cotizador correspondiente.
- Envío de resumen por WhatsApp.
- Impresión o guardado como PDF.
- PWA instalable.
- Copia local mediante `localStorage`.
- Sincronización con Supabase por usuario.
- Actualización en tiempo real entre dispositivos.

## Fórmulas existentes que deben conservarse

### Impresión 3D

La fórmula actual considera:

- material por peso y precio por kilogramo;
- electricidad por horas, consumo y costo de kWh;
- desgaste por hora;
- reserva por riesgo de falla sobre costos repetibles;
- mano de obra;
- extras;
- porcentaje de ganancia;
- redondeo;
- precio de catálogo como mínimo, cuando aplica.

### Láser y Cricut

La fórmula actual considera:

- material por hoja/placa, metro lineal o pieza;
- merma;
- cantidad y acomodo aproximado;
- tiempo de máquina;
- diseño, mano de obra, armado y extras;
- porcentaje de ganancia;
- redondeo;
- precio de catálogo como mínimo, cuando aplica.

Los nuevos módulos no alterarán estas fórmulas.

## Almacenamiento

### Copia local

El hook `useLocal` guarda cada colección en `localStorage`:

- configuración;
- cotizaciones;
- pedidos;
- inventario;
- catálogo;
- clientes;
- modelos.

### Nube

Supabase guarda un documento JSON por usuario en `public.business_state`. El estado completo se sincroniza con protección RLS y actualización en tiempo real.

El módulo Diseño creativo agregará `creativeProjects` al mismo documento. Esto no requiere tablas nuevas ni cambios en el esquema de la base de datos.

## Nuevos módulos

## Diseño 3D

Primera herramienta: **Llavero personalizado con nombre**.

Parámetros:

- texto;
- largo total en milímetros;
- alto en milímetros;
- grosor de la base en milímetros;
- relieve del texto en milímetros;
- diámetro del orificio en milímetros;
- margen en milímetros;
- tamaño del texto en milímetros;
- cantidad.

Resultados:

- validaciones claras en español;
- vista previa 2D aproximada;
- resumen de medidas;
- código OpenSCAD editable;
- copiar código;
- descargar `.scad`;
- enviar los datos disponibles al cotizador 3D existente.

El envío al cotizador no inventará peso, tiempo, consumo ni precio. Estos datos seguirán capturándose a partir de Bambu Studio.

## Diseño creativo

El módulo organiza proyectos destinados a Canva, Cricut, LightBurn y otros flujos creativos. No genera diseños automáticamente.

Cada proyecto puede relacionarse con:

- un cliente existente;
- un producto existente;
- un material del inventario;
- un pedido existente.

Campos principales:

- nombre;
- cliente;
- tipo de trabajo;
- producto;
- técnica;
- ancho, alto y unidad;
- cantidad;
- material;
- color;
- enlace de Canva;
- referencia textual del archivo;
- notas;
- estado.

Campos de preparación:

- Cricut: tipo de material, impresión y corte o corte sencillo, offset, fondo transparente y formato;
- láser: corte o grabado, grosor, formato destinado a LightBurn y notas de producción.

## Integración con Canva

La integración actual será únicamente mediante enlaces:

1. Crear el proyecto en A&E Studio Maker.
2. Seleccionar cliente, producto, medidas y material.
3. Crear o abrir el diseño manualmente en Canva.
4. Guardar el enlace de Canva en el proyecto.
5. Exportar manualmente el archivo.
6. Prepararlo en Cricut Design Space o LightBurn.
7. Relacionarlo con el pedido o cotizador existente.
8. Fabricar.

No se usarán Canva Connect APIs, OAuth, tokens, importación ni exportación automática.

## Funciones excluidas de esta versión

- OpenAI API.
- Chatbot o prompts.
- Generación mediante inteligencia artificial.
- Análisis o conversión de imágenes.
- Carga de imágenes.
- Generación automática de SVG o STL a partir de imágenes.
- Almacenamiento externo de archivos.
- Integración avanzada con Canva.

## Funciones futuras

### Referencia visual del proyecto

En una versión posterior se podrán asociar fotografías, bocetos, logotipos y referencias. Antes se deberán definir almacenamiento, costos, límites, privacidad, seguridad y asociación con clientes y pedidos.

### Canva avanzado

Una integración futura podría evaluar OAuth, importación y exportación automáticas, siempre con autorización y análisis de costos y seguridad.

