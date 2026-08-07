# Activar el panel de edición

El panel vive en **xuexiclub.cl/admin/** y permite editar eventos, reportajes
y equipo con formularios, sin tocar código.

## Estado actual

Ya está hecho:

- ✅ El conector está desplegado en la cuenta **XuexiClub** de Cloudflare, en
  `https://xuexi-panel.xuexiclub.workers.dev`
- ✅ El sitio ya apunta a esa dirección (`admin/config.yml`)

**Falta un solo paso: las claves de GitHub.** Son credenciales, así que
tienen que quedar en tus manos y no pasar por el chat.

## Paso único — Registrar la aplicación en GitHub

### 1. Crear la aplicación

Entra a
[github.com/organizations/xuexi-club-uc/settings/applications](https://github.com/organizations/xuexi-club-uc/settings/applications)
→ **New OAuth App**, y completa:

| Campo | Valor |
|---|---|
| Application name | `Panel Xuexi Club` |
| Homepage URL | `https://xuexiclub.cl` |
| Authorization callback URL | `https://xuexi-panel.xuexiclub.workers.dev/callback` |

> El callback tiene que terminar en `/callback`, exactamente como está arriba.

Presiona **Register application**. Verás un **Client ID**, y un botón para
generar un **Client Secret**. Genera el secreto y deja esa pestaña abierta:
el secreto se muestra una sola vez.

### 2. Guardar las claves en el conector

Abre la Terminal en la carpeta del proyecto y ejecuta estos dos comandos, uno
a la vez. Cada uno te va a pedir que pegues el valor correspondiente:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
```

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Si prefieres no usar la Terminal, se puede hacer igual desde
[el panel de Cloudflare](https://dash.cloudflare.com/d13c3276a03fc7a37985e2e4a1ea17c6/workers/services/view/xuexi-panel/production/settings):
**Settings** → **Variables and Secrets** → **Add**, eligiendo el tipo
**Secret** (no "Text") para ambas.

> El Client Secret es una contraseña. No lo pegues en el chat, en el código
> ni en ningún archivo del repositorio.

### 3. Dar acceso a quienes editarán

Sólo quienes tengan permiso de escritura en el repositorio podrán guardar.
Esto lo controla GitHub, así que es un permiso real: alguien sin acceso puede
abrir el panel, pero no modificar nada.

Para cada persona de la coordinación:

1. Que se cree una cuenta en [github.com](https://github.com) si no tiene.
2. En
   [github.com/orgs/xuexi-club-uc/people](https://github.com/orgs/xuexi-club-uc/people)
   → **Invite member**, con permiso **Write** sobre `xuexi-web`.

Cuando alguien deja el club, se le quita el acceso desde esa misma página y
pierde la capacidad de editar de inmediato.

## Cómo se usa

1. Entrar a **xuexiclub.cl/admin/**
2. **Login with GitHub**
3. Elegir Agenda, Investigación o Equipo, editar y presionar **Publish**

Los cambios aparecen en el sitio en uno o dos minutos. Cada edición queda
registrada con el nombre de quien la hizo, así que siempre se puede ver qué
cambió y volver atrás.

## Mantención

El código del conector está en `admin/oauth-worker.js` y su configuración en
`wrangler.toml`. Si alguna vez hay que actualizarlo:

```bash
npx wrangler deploy
```

Las claves guardadas como secretos no se pierden al volver a desplegar.

## Si algo no funciona

- **Se abre la ventana de GitHub pero vuelve con error:** revisa que la
  *Authorization callback URL* sea exactamente
  `https://xuexi-panel.xuexiclub.workers.dev/callback`.
- **Dice "Solicitud no válida":** vuelve a intentar desde cero, sin recargar
  la ventana emergente a medias.
- **Entra pero no deja guardar:** esa cuenta no tiene permiso de escritura.
  Revisa el punto 3.
- **El panel no carga:** se apoya en un archivo externo (`unpkg.com`). Si esa
  red falla, el sitio público sigue funcionando igual; sólo el panel queda
  temporalmente fuera.
- **Comprobar que el conector está vivo:** abre
  [xuexi-panel.xuexiclub.workers.dev](https://xuexi-panel.xuexiclub.workers.dev).
  Debe responder "Conector del panel de Xuexi Club UC."
