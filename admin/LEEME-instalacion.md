# Activar el panel de edición

El panel vive en **xuexiclub.cl/admin/** y permite editar eventos, reportajes
y equipo con formularios, sin tocar código.

Esta instalación se hace **una sola vez**. Toma unos 15 minutos. Después,
editar el sitio no requiere nada de esto.

## Por qué hacen falta estos pasos

El sitio son archivos estáticos: no tiene un servidor propio que pueda
comprobar identidades. Para que el panel sepa quién eres y pueda guardar,
se apoya en GitHub. GitHub exige una clave secreta que **no puede estar en
el navegador**, porque cualquiera la vería en el código fuente. Por eso se
guarda en un pequeño conector alojado en Cloudflare, donde ya está el
dominio del club.

## Paso 1 — Crear el conector en Cloudflare

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) con la cuenta
   del club (la misma del dominio).
2. Menú lateral: **Workers y Pages** → **Crear** → **Empezar con Hello World**.
3. Ponle de nombre `xuexi-panel` y presiona **Desplegar**.
4. Presiona **Editar código**. Borra todo lo que aparece y pega el contenido
   completo del archivo `admin/oauth-worker.js` de este repositorio.
5. Presiona **Desplegar** otra vez.
6. Copia la dirección que quedó. Se ve así:
   `https://xuexi-panel.TU-CUENTA.workers.dev`

## Paso 2 — Registrar la aplicación en GitHub

1. Entra a la organización
   [xuexi-club-uc](https://github.com/organizations/xuexi-club-uc/settings/applications)
   → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Completa así:
   - **Application name:** `Panel Xuexi Club`
   - **Homepage URL:** `https://xuexiclub.cl`
   - **Authorization callback URL:** la dirección del Paso 1 seguida de
     `/callback`. Por ejemplo:
     `https://xuexi-panel.TU-CUENTA.workers.dev/callback`
3. Presiona **Register application**.
4. Quedan a la vista un **Client ID** y un botón para generar un
   **Client Secret**. Genera el secreto y deja la página abierta: el secreto
   se muestra una sola vez.

> El Client Secret es una contraseña. No lo pegues en el chat, en el código
> ni en ningún archivo del repositorio.

## Paso 3 — Guardar las claves en el conector

1. Vuelve a Cloudflare, al Worker `xuexi-panel`.
2. **Configuración** → **Variables y secretos** → **Añadir**.
3. Agrega estas dos, ambas de tipo **Secreto** (no "Texto"):

   | Nombre | Valor |
   |---|---|
   | `GITHUB_CLIENT_ID` | El Client ID del Paso 2 |
   | `GITHUB_CLIENT_SECRET` | El Client Secret del Paso 2 |

4. Presiona **Desplegar** para que tomen efecto.

## Paso 4 — Conectar el sitio con el conector

Edita el archivo `admin/config.yml` de este repositorio y reemplaza:

```yaml
  base_url: https://PEGAR-AQUI-LA-URL-DEL-WORKER
```

por la dirección del Paso 1, sin `/callback` al final:

```yaml
  base_url: https://xuexi-panel.TU-CUENTA.workers.dev
```

Guarda el cambio. En un par de minutos el panel queda activo.

## Paso 5 — Dar acceso a quienes editarán

Sólo quienes tengan permiso de escritura en el repositorio podrán guardar.
Esto lo controla GitHub, así que es un permiso real: alguien sin acceso
puede abrir el panel, pero no modificar nada.

Para cada persona de la coordinación:

1. Que se cree una cuenta en [github.com](https://github.com) si no tiene.
2. En
   [github.com/orgs/xuexi-club-uc/people](https://github.com/orgs/xuexi-club-uc/people)
   → **Invite member**, con permiso **Write** sobre `xuexi-web`.

Cuando alguien deja el club, se le quita el acceso desde esa misma página y
pierde la capacidad de editar de inmediato.

## Cómo se usa después

1. Entrar a **xuexiclub.cl/admin/**
2. **Login with GitHub**
3. Elegir Agenda, Investigación o Equipo, editar y presionar **Publish**

Los cambios aparecen en el sitio en uno o dos minutos. Cada edición queda
registrada con el nombre de quien la hizo, así que siempre se puede ver
qué cambió y volver atrás.

## Si algo no funciona

- **"Falta un paso para activarlo"** al entrar: el Paso 4 no se completó,
  o el archivo aún no se publica. Espera un minuto y recarga.
- **Se abre la ventana de GitHub pero vuelve con error:** revisa que la
  *Authorization callback URL* del Paso 2 termine exactamente en `/callback`
  y coincida con la dirección del Worker.
- **Entra pero no deja guardar:** esa cuenta no tiene permiso de escritura.
  Revisa el Paso 5.
- **El panel no carga:** se apoya en un archivo externo (`unpkg.com`). Si esa
  red falla, el sitio público sigue funcionando igual; sólo el panel queda
  temporalmente fuera.
