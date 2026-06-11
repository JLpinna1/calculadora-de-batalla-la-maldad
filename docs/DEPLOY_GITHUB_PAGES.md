# Cómo subir Battle Lab 1914 a GitHub Pages

## Opción fácil desde la web de GitHub

1. Crea un repositorio nuevo en GitHub.
   - Nombre sugerido: `battle-lab-1914`
   - Puede ser Public o Private.
   - Marca `Add a README` si quieres, pero no es obligatorio.

2. Descomprime este ZIP en tu PC.

3. En GitHub, entra al repositorio y pulsa:
   - `Add file`
   - `Upload files`

4. Sube **el contenido de la carpeta**, no la carpeta completa.

   Debe quedar así en la raíz del repositorio:

   ```text
   index.html
   styles.css
   app.js
   units.js
   battleEngine.js
   supabaseClient.js
   .nojekyll
   README.md
   docs/
   supabase/
   ```

   Importante: `index.html` debe verse directamente en la primera pantalla del repositorio, no dentro de una subcarpeta.

5. Pulsa `Commit changes`.

6. Activa GitHub Pages:
   - Entra en `Settings`
   - Entra en `Pages`
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
   - Pulsa `Save`

7. Espera 1 a 3 minutos.

8. GitHub te dará un link parecido a:

   ```text
   https://TU_USUARIO.github.io/battle-lab-1914/
   ```

## Opción con Git

```bash
git init
git add .
git commit -m "Publicar Battle Lab 1914"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/battle-lab-1914.git
git push -u origin main
```

Luego activa Pages en:

```text
Settings → Pages → Deploy from a branch → main → /root → Save
```

## Error común

Si GitHub Pages abre una página vacía o 404, casi siempre es porque `index.html` quedó dentro de una carpeta.

Correcto:

```text
/repositorio/index.html
```

Incorrecto:

```text
/repositorio/battle_lab_1914_definitivo_github_pages/index.html
```
