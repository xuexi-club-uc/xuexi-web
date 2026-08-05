# Publicar eventos desde una planilla de Google

Hoy la agenda se lee de `eventos.json`. Con estos pasos, cualquiera del equipo
podrá agregar un evento editando una planilla, sin tocar GitHub.

## Puesta en marcha (una sola vez)

1. Entra a [sheets.new](https://sheets.new) con la cuenta del club y ponle
   nombre: **Eventos Xuexi**.
2. Menú **Archivo > Importar > Subir**, y sube `eventos-para-sheets.csv`
   (está en esta misma carpeta). Elige **Reemplazar hoja de cálculo**.
3. Menú **Archivo > Compartir > Publicar en la Web**.
   - En la primera lista elige la hoja (no "Todo el documento").
   - En la segunda elige **Valores separados por comas (.csv)**.
   - Presiona **Publicar** y copia el enlace que aparece.
4. Pega ese enlace en `assets/datos.js`, dentro de las comillas de
   `var URL_PLANILLA = '';` y sube el cambio.

Listo. Desde ahí, editar la planilla actualiza el sitio.

## Cómo agregar un evento

Escribe una fila nueva. Solo `fecha` y `titulo` son obligatorios.

| Columna | Qué va | Ejemplo |
|---|---|---|
| `fecha` | Día del evento, en formato AAAA-MM-DD | `2026-09-14` |
| `hora` | Hora de inicio | `18:30` |
| `titulo` | Nombre de la actividad | `Taller de caligrafía` |
| `hanzi` | Un carácter chino, decorativo | `书` |
| `lugar` | Dónde es | `Sala K204, Campus San Joaquín UC` |
| `detalle` | Descripción breve | `Impartido por el Instituto Confucio.` |
| `tipo` | `taller`, `charla`, `congreso`, `festival`, `stand`, `jornada`, `almuerzo` o `voluntariado` | `taller` |
| `comision` | `xuexi`, `wailian` o `xinxi` | `wailian` |
| `estado` | `abierto`, `pronto`, `lleno`, `online` o `realizado` | `abierto` |
| `areaEtiqueta` | Área temática | `Cultura y Lengua` |
| `ciclo` | Semestre | `segundo-semestre` |
| `cupos` | Número de cupos; `0` si no aplica | `20` |
| `imagen` | Nombre de un archivo dentro de `assets/` | `cocina.jpg` |

Notas:

- Los eventos con fecha pasada se muestran solos bajo "Eventos anteriores".
  No hay que borrarlos ni cambiarles el estado.
- Para usar una imagen, el archivo tiene que existir en `assets/`. Si no
  pones ninguna, se muestra el carácter chino de la columna `hanzi`.
- No cambies los nombres de la fila de encabezado: el sitio los usa para
  saber qué es cada columna.
- El texto "Segundo semestre 2026" que aparece junto al título sigue
  saliendo de `eventos.json`, porque cambia una vez al año.

## Si algo falla

El sitio está hecho para no romperse: si la planilla no responde, tiene un
formato raro o queda vacía, vuelve solo a mostrar `eventos.json`. Eso sí,
ese archivo queda congelado en la última versión que se subió, así que
conviene revisar la consola del navegador para ver el aviso.
