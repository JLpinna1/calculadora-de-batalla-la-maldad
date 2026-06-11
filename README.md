# Battle Lab 1914 - Etapa 17 Beta

## Qué se agregó

Esta etapa mejora la interfaz final.

Ahora incluye:

- Pestañas:
  - Campo de batalla.
  - Resultados.
  - Codex.
- Modo compacto.
- Advertencias tácticas automáticas.
- Exportar resultado como JSON.
- Limpiar reporte.
- Estado visual guardado en el navegador.

## Advertencias tácticas

El reporte ahora puede avisar sobre:

- Ejército por debajo de 25% de HP.
- Fortaleza crítica.
- Derrumbe de fortaleza.
- Batalla muy pareja en varianza.
- Favorito claro en simulaciones múltiples.
- Bombardeo activo.

## Exportar resultado

Después de simular, presiona:

`Exportar resultado`

Esto descarga un JSON con:

- escenario usado,
- configuración,
- resultado,
- rondas,
- alertas,
- probabilidades si usaste varianza.

## Modo compacto

Sirve para pantallas pequeñas o para ver más stacks sin tanto espacio vertical.

## Archivo recomendado

Abre:

`battle_lab_1914_etapa16_todo_en_uno.html`

## Siguiente etapa

Etapa 17: cierre beta.

Podemos agregar:

- revisión de bugs,
- pulido de cálculos,
- botón de reset limpio,
- exportar reporte HTML,
- ayuda interna,
- versión lista para compartir.


## Hotfix UI adicional

Se corrigieron dos problemas visuales reportados:

1. **Bordes que no se ajustaban con muchos datos**
   - Los paneles y `details` ahora permiten scroll horizontal interno.
   - Las tablas grandes ya no rompen el contenedor visual.
   - Se ajustó el grid de resultados para evitar recortes.

2. **Toggles de "Actualizar tropas" y "Varianza simple"**
   - Se reemplazó la apariencia nativa por un estilo personalizado.
   - Mejor alineación, espaciado y check visual.


# Etapa 17 Beta - Pulido final

## Qué se agregó

- Reset limpio total.
- Ayuda interna dentro de la app.
- Exportar reporte HTML.
- Mejoras de presentación en tablas.
- Panel de ayuda con reglas principales.
- Versión beta lista para compartir.

## Nuevos botones

- `Ayuda`: abre la guía interna.
- `Reset limpio`: deja un escenario mínimo 1 vs 1 desde cero.
- `Exportar HTML`: crea un reporte compartible después de simular.
- `Exportar resultado`: mantiene la exportación JSON completa.

## Archivo recomendado

Abre:

`battle_lab_1914_etapa17_beta_todo_en_uno.html`
