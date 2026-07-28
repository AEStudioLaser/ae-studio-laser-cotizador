# A&E Studio Maker

Herramienta interna de **A&E Studio Laser** para cotizaciones, pedidos, inventario, clientes, catálogo y organización del taller.

Producción: `https://ae-studio-laser-cotizador.vercel.app`

## Tecnología

- Node.js 20 o superior.
- React.
- Vite.
- Supabase.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Compilación

```bash
npm run build
```

Los archivos de producción se generan en `dist/`.

## Vista previa de producción

```bash
npm run preview
```

## Variables de entorno

Copia `.env.example` como `.env.local` y configura únicamente las claves públicas del proyecto:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca guardes contraseñas, tokens privados ni claves de servicio dentro del repositorio.

## Módulos actuales

- Resumen.
- Impresión 3D.
- Diseño 3D paramétrico.
- Láser.
- Cricut.
- Diseño creativo.
- Catálogo.
- Pedidos.
- Inventario.
- Clientes.
- Cotizaciones.
- Modelos 3D.
- Sincronización.
- Configuración.

## Datos

La aplicación conserva una copia local y sincroniza el estado del negocio mediante Supabase cuando el usuario inicia sesión.

## Despliegue

Vercel compila el proyecto desde GitHub. Los cambios de esta etapa se desarrollan en `feature/design-modules`. No deben mezclarse en `main` ni publicarse en producción sin revisión.

## Pruebas

Las validaciones del generador 3D y de los proyectos creativos se ejecutan con:

```bash
npm test
```

Antes de publicar también se debe:

1. recorrer los módulos actuales;
2. revisar la consola;
3. probar celular y computadora;
4. ejecutar `npm run build`;
5. probar las funciones nuevas.

Consulta [`docs/MASTER_PROJECT_SPEC.md`](docs/MASTER_PROJECT_SPEC.md) y [`docs/PLAN_APP_AE_STUDIO.md`](docs/PLAN_APP_AE_STUDIO.md) para conocer el alcance y el plan técnico.
