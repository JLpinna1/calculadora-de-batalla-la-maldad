# Battle Lab 1914

Simulador táctico para **Supremacy 1914**.

## Archivo principal

GitHub Pages debe abrir:

`index.html`

## Archivos necesarios

- `index.html`
- `styles.css`
- `app.js`
- `units.js`
- `battleEngine.js`
- `supabaseClient.js`
- `.nojekyll`

## Supabase

La app funciona sin Supabase en modo local/demo.

Para nube real, ejecuta el SQL en:

`supabase/supabase_schema.sql`

Luego abre la app, entra en **Iniciar sesión → Configurar Supabase** y pega:

- Project URL
- anon public key

Nunca uses `service_role key` en el navegador.

## Publicación rápida

Lee:

`docs/DEPLOY_GITHUB_PAGES.md`


## Mejora incluida: HP inteligente

Esta versión mejora la entrada de unidades:

- Icono visible de la unidad seleccionada.
- HP por unidad visible en cada fila.
- Vida máxima total calculada automáticamente.
- Campo de HP actual.
- Campo de porcentaje de vida.
- Conversión automática HP ↔ porcentaje.
- Barra visual de vida.
- Validación en vivo si el HP excede el máximo.
- Resumen de HP total del stack.
