# Agenda desde la planilla de Wailian

La Comisión Wailian planifica sus actividades en una planilla de Google
(*Wailian_Actividades_2026*). El sitio la lee directamente, así que nadie tiene
que copiar las actividades a mano:

| Dónde | Qué actividades | Qué se muestra |
|---|---|---|
| **Agenda pública** (`eventos.html`) | Solo las de **Estado** `Confirmado` o `Realizado` que tengan un día escrito | Actividad, Descripción breve, fecha, hora y Colaborador/a externo |
| **Calendario interno** (`miembro.html`, con sesión) | Todas, también las `Por confirmar` (con borde punteado) | Lo anterior más Encargado/a |

Las columnas **Nº, Pendientes, Notas y Voluntarios no se leen**: no aparecen en
ninguna página.

El código está en `assets/planilla.js`.

---

## Conectarla (una sola vez)

1. Abre la planilla con la cuenta que es dueña de ella.
2. **Archivo > Compartir > Publicar en la Web**.
   - En la primera lista elige la **pestaña de las actividades** (no "Documento completo").
   - En la segunda elige **Valores separados por comas (.csv)**.
   - Presiona **Publicar** y copia el enlace. Empieza con
     `https://docs.google.com/spreadsheets/d/e/2PACX-` y termina en `output=csv`.
3. Pega ese enlace en `assets/planilla.js`, dentro de las comillas de
   `var URL_PLANILLA = '';`, y sube el cambio.

> ⚠️ **Nunca pegues el enlace de edición** (el que termina en `/edit`). Este
> repositorio es público y cualquiera podría leerlo.

### 🔴 Revisa quién puede editar la planilla

Hoy la planilla está compartida como **"Cualquier persona con el enlace: Editor"**.
Como ahora alimenta el sitio, quien tenga ese enlace podría cambiar la agenda
pública. Recomendado: **Compartir > Acceso general > Restringido** (o "Lector")
y agregar a cada integrante de Wailian como editor por su correo.

### Lo que deja visible el enlace publicado

El enlace de "Publicar en la Web" es de solo lectura, pero muestra **la pestaña
completa** a quien lo encuentre en el código del sitio, incluidas Encargado/a,
Pendientes, Notas y Voluntarios. Si eso no conviene, publica en su lugar una
pestaña aparte (por ejemplo, **Web**) que copie solo las columnas necesarias:

```
=QUERY('NOMBRE DE LA PESTAÑA'!A2:H; "select A, B, C, D, E, F, G, H"; 1)
```

Ajusta las letras para dejar fuera lo que no quieras exponer. Si quitas
Encargado/a, el calendario interno dejará de mostrar quién está a cargo.

---

## Cómo escribir en la planilla

No hay que cambiar la forma de trabajar: el sitio entiende lo que ya se escribe.

### Estado

| Si dice… | Agenda pública | Calendario interno |
|---|---|---|
| `Confirmado` | ✅ (si tiene día) | ✅ |
| `Realizado` | ✅ como "Ya realizado" | ✅ |
| `Por confirmar` o vacío | — | ✅ con "Por confirmar" |
| `Cancelado` / `Suspendido` | — | — |

Si **FORMULARIO Y POST** dice `Realizado`, la tarjeta pública dice
"Inscripción abierta"; si no, "Próximamente".

### Fecha tentativa

| Escrito así | Se entiende como |
|---|---|
| `04/09/2026` · `23/10` · `9/10` | ese día (sin año = el año de la planilla) |
| `21-28/10` · `13 al 15 de octubre` | un tramo de varios días |
| `Martes 20 de octubre` · `23 de noviembre` | ese día |
| `17:00-18:20` · `13:30 a 14:50` dentro de la celda | hora de inicio y término |
| `13:30-2:50` | 13:30 a 14:50 (se corrige solo) |
| `5 pm o 13:30` | sin hora: falta decidir |
| `primera semana de noviembre` · `Mover a septiembre` | **sin día**: solo en el calendario interno, en "Sin día definido" |

Una actividad solo llega a la agenda pública cuando tiene **Estado Confirmado y
un día escrito**. Nunca se inventa un día a partir de "primera semana de…".

### Columnas opcionales

Si se agregan, el sitio las usa. Se reconocen por el nombre del encabezado,
sin importar mayúsculas ni tildes:

| Columna | Para qué |
|---|---|
| `Lugar` | Sala o dirección en la tarjeta pública (hoy las tarjetas salen sin lugar) |
| `Hora` | Si se prefiere separar la hora de la fecha |
| `Tipo` | `taller`, `charla`, `festival`… Si falta, se deduce del título |
| `Hanzi` | El carácter de la tarjeta. Si falta, se elige uno por el tema |
| `Imagen` | Nombre de un archivo dentro de `assets/` |

No cambies los encabezados **Actividad**, **Fecha…** ni **Estado**: el sitio
los busca para saber qué es cada columna. Las filas de avisos sobre el
encabezado (como el "FYI" actual) no molestan.

---

## Cuándo se ve un cambio

Google actualiza el enlace publicado en unos **5 minutos**. Después, basta con
recargar la página.

## Relación con `eventos.json`

La agenda sigue leyendo `data/eventos.json` (el panel `admin.html` y los
reportajes de actividades anteriores). Si una actividad está en los dos lados
—mismo día y título parecido— **manda `eventos.json`**, que es donde se le
agregan foto, lugar y textos revisados.

**Fotos:** el panel de coordinación ya lista las actividades de la planilla en
"Fotografías y Galerías de Eventos". Cada una se identifica por su **título y
fecha**: si después se cambia cualquiera de los dos, las fotos subidas dejan de
aparecer en esa actividad.

## Calendario interno y Organizador Mensual

Mientras la planilla responda, el calendario interno **no muestra** las
actividades que se importaron con el botón del Organizador Mensual: son el
mismo plan de Wailian, pero congelado. Lo que la coordinación agrega a mano
desde el panel se sigue mostrando.

El panel de coordinación indica si la planilla está conectada y cuántas
actividades leyó.

## Probar antes de publicar

En el computador, con el servidor local (ver `README.md`), abre la consola del
navegador en `http://localhost:8000` y escribe:

```js
localStorage.setItem('xuexi-planilla', 'ENLACE PUBLICADO')
```

Recarga y el sitio local usará esa planilla. Esto solo funciona en
`localhost`: en el sitio publicado se ignora. Para volver atrás:
`localStorage.removeItem('xuexi-planilla')`.

## Si algo falla

El sitio no se rompe: si la planilla no responde en 6 segundos, deja de estar
publicada o no tiene las columnas esperadas, la agenda muestra solo
`eventos.json` y el calendario interno solo lo de Firestore. La consola del
navegador y el panel de coordinación muestran el motivo.
