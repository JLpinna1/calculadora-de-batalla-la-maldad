# Configurar Supabase

Supabase es opcional.

La calculadora funciona sin Supabase, pero Supabase permite:

- Login real
- Escenarios en la nube
- Historial en la nube
- Favoritos
- Comunidad
- Estadísticas sincronizadas

## Pasos

1. Crea un proyecto en Supabase.
2. Entra a SQL Editor.
3. Ejecuta el archivo:

   `supabase/supabase_schema.sql`

4. En Supabase, copia:
   - Project URL
   - anon public key

5. Abre Battle Lab 1914.
6. Pulsa:
   - Iniciar sesión
   - Configurar Supabase
7. Pega los datos.
8. Pulsa Probar conexión.

## Seguridad

Nunca pegues la `service_role key` en la app.

Solo usa la `anon public key`.
