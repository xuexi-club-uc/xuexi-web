# Sitio web · Xuexi Club UC

Sitio oficial del Club de Lengua, Cultura y Estudios sobre China de la Pontificia
Universidad Católica de Chile.

**Sitio en vivo:** https://xuexiclub.cl
**Contacto:** xuexiclub.uc@gmail.com · [@xuexiclub.uc](https://instagram.com/xuexiclub.uc)

> 我们一起学习，外联和信息

---

## Cómo agregar o editar una actividad

### Opción recomendada: el panel

Abre **[xuexiclub.cl/admin.html](https://xuexiclub.cl/admin.html)** y usa el formulario.
No hay que escribir código ni entender JSON: eliges tipo de actividad, comisión y estado
desde listas desplegables.

1. Completa el formulario y presiona **Agregar actividad**
2. Cuando termines, presiona **Copiar** en el recuadro "Publicar en el sitio"
3. Abre [`data/eventos.json`](../../edit/main/data/eventos.json) en GitHub
4. Selecciona todo (`Cmd + A`) y pega encima (`Cmd + V`)
5. Escribe qué cambiaste y presiona **Commit changes**

El sitio se actualiza solo en 1 o 2 minutos.

> El panel guarda tu trabajo en el navegador mientras no lo publiques, así que puedes
> cerrarlo y seguir después. El botón **Restaurar original** descarta los cambios sin publicar.

Los campos siguen los **Estatutos Xuexi 2026**: los tipos de actividad del Art. 2.1
(taller, charla, congreso, almuerzo, festival, stand), las comisiones de los Art. 5 a 7,
y los ciclos de mayo–junio y octubre–noviembre del Art. 6.3.

### Opción manual

También puedes editar **[`data/eventos.json`](data/eventos.json)** directamente con el
lápiz ✏️ de GitHub, copiando un bloque `{ … }` existente y cambiando sus datos.

### Campos de un evento

| Campo | Qué va | Ejemplo |
|---|---|---|
| `titulo` | Nombre de la actividad | `"Ceremonia del té 茶道"` |
| `fecha` | Año-mes-día | `"2026-05-14"` |
| `hora` | Hora de inicio | `"16:30"` |
| `lugar` | Dónde | `"Campus San Joaquín UC"` |
| `detalle` | Quién la imparte, sala, notas | `"Con Junzi Lan"` |
| `tipo` | Tipo de actividad (Art. 2.1) | `"taller"` |
| `comision` | Comisión responsable | `"wailian"` |
| `ciclo` | Ciclo del año (Art. 6.3) | `"primer-semestre"` |
| `areaEtiqueta` | Área académica, si aplica | `"Cultura y Lengua"` |
| `estado` | Estado de inscripción | `"abierto"` |
| `hanzi` | Carácter chino decorativo | `"茶"` |
| `cupos` | Cupo máximo (`0` = sin límite) | `20` |
| `imagen` | Foto en `assets/` (opcional) | `"te.jpg"` |

**`tipo`** — `taller` · `charla` · `congreso` · `almuerzo` · `festival` · `stand` ·
`jornada` · `voluntariado`

**`comision`** — `wailian` (gestiona las actividades, Art. 6.3) · `xuexi` (académicas,
Art. 5) · `xinxi` (difusión, Art. 7)

**`ciclo`** — `primer-semestre` (mayo–junio) · `segundo-semestre` (octubre–noviembre)

**`estado`** — `abierto` · `pronto` · `lleno` · `online` · `realizado`

### ⚠️ Cuidado con la puntuación

El archivo es JSON y es estricto:

- Cada valor de texto va **entre comillas dobles**: `"Taller de caligrafía"`
- Los números van **sin comillas**: `12`
- Cada línea termina en **coma**, excepto la última de cada bloque
- El último evento de la lista **no lleva coma** después de su `}`

Si algo queda mal escrito, GitHub te avisa con un ⚠️ antes de guardar.

---

## Cómo actualizar el equipo

El equipo vive en **[`data/equipo.json`](data/equipo.json)** y se edita igual que la agenda,
con el lápiz ✏️ de GitHub. Está dividido en:

- `coordinacion.mesa` — presidencia, vicepresidencia, secretaría y tesorería
- `coordinacion.coordinadores` — coordinaciones de comisión y del Club de lectura
- `comisiones` — los equipos de trabajo de Xuexi, Wailian y Xinxi
- `fundadores` e `historia` — la memoria del club

Cuando cambie la coordinación, basta con editar este archivo: la página se arma sola.

### Fotos de las personas

1. Sube el retrato a la carpeta **`assets/equipo/`**
2. En `equipo.json`, escribe el nombre del archivo en el campo `foto` de esa persona

```json
{ "nombre": "Andrea Díaz Inzunza", "foto": "andrea.jpg" }
```

Mientras el campo esté vacío se muestra un **monograma con las iniciales**, así que la
página nunca se ve rota aunque falten fotos. Formato cuadrado, 400 × 400 px y menos de
200 KB por foto.

---

## Cómo agregar una foto a un evento

1. Entra a la carpeta **`assets/`**
2. **Add file → Upload files** y arrastra la imagen
3. Nómbrala simple, sin espacios ni tildes: `taller-te.jpg`
4. En `eventos.json`, escribe ese nombre en el campo `imagen`

Recomendación: imágenes de menos de 500 KB para que el sitio cargue rápido.

---

## Para desarrollar localmente

```bash
git clone https://github.com/xuexi-club-uc/xuexi-web.git
cd xuexi-web
python3 -m http.server 8000
```

Luego abre http://localhost:8000

> ⚠️ **No abras `index.html` con doble clic.** La agenda se carga con `fetch()`
> desde `data/eventos.json`, y los navegadores bloquean esa petición bajo el
> protocolo `file://` (política CORS). Verías el sitio sin eventos.
> Con el servidor local anda bien.

No hay dependencias, ni build, ni framework: HTML, CSS y JavaScript sin
librerías. Lo que ves en el repositorio es exactamente lo que se publica.

---

## Estructura del proyecto

```
├── index.html          El sitio completo
├── admin.html          Panel para cargar actividades
├── data/
│   ├── eventos.json    ← La agenda. Esto es lo que se edita seguido.
│   └── equipo.json     ← El equipo y la coordinación.
├── assets/             Imágenes: logo, sello y fotos de actividades
│   └── equipo/         Retratos de las personas
├── CNAME               El dominio (no tocar)
└── .nojekyll           Config de GitHub Pages (no tocar)
```

---

## Para quien administre el sitio

### Dominio y hosting

- **Dominio:** `xuexiclub.cl`, registrado en [NIC Chile](https://www.nic.cl)
  a nombre de `xuexiclub.uc@gmail.com`
- **Hosting:** GitHub Pages (gratis), desde la rama `main`
- **HTTPS:** certificado automático de GitHub — verificar que
  *Settings → Pages → Enforce HTTPS* esté activado

### DNS — cómo está armado

NIC Chile **no permite crear registros `A`**, solo delegar a servidores de
nombre. Por eso el DNS lo administra **Cloudflare** (plan Free):

- **NIC Chile** → *Configuración Técnica* → *Servidores DNS*:
  `kaiser.ns.cloudflare.com` y `lina.ns.cloudflare.com`
- **Cloudflare** → *DNS → Records*:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A | `@` | 185.199.108.153 | DNS only |
| A | `@` | 185.199.109.153 | DNS only |
| A | `@` | 185.199.110.153 | DNS only |
| A | `@` | 185.199.111.153 | DNS only |
| CNAME | `www` | xuexi-club-uc.github.io | DNS only |

> ⚠️ **El proxy debe quedar en "DNS only" (nube gris).** Con la nube naranja,
> GitHub no puede emitir el certificado HTTPS y el sitio entra en un bucle de
> redirección.

La cuenta de Cloudflare también debe estar a nombre de `xuexiclub.uc@gmail.com`,
por la misma razón que el dominio y la organización de GitHub.

### 🔴 Renovación del dominio — no olvidar

El dominio `.cl` **se renueva cada año** ([~$9.990, exento de IVA](https://www.nic.cl/dominios/tarifas.html)).
Si vence, el sitio se cae y el dominio queda libre para que otro lo tome.

- Verificar que el contacto en NIC Chile sea `xuexiclub.uc@gmail.com`
- **Recomendado:** pagar varios años por adelantado (5 años ≈ $50.000) para que
  no dependa del recambio de directiva
- Dejar un recordatorio en el calendario compartido del club

### Continuidad de la directiva

Este repositorio vive en una **organización** de GitHub, no en una cuenta personal.
Cuando cambia la directiva:

1. *Settings → People → Invite member* → agregar a los nuevos como **Owner**
2. Quitar a quienes egresaron
3. Confirmar que siempre haya **al menos dos Owners** activos

---

## Diseño

La identidad visual y el sistema de diseño están documentados en los PDF que
mantiene la Comisión Xinxi (信息):

- `XUEXI-CLUB-moodboard.pdf` — dirección de arte, paleta, tipografía y componentes
- `XUEXI-CLUB-propuesta-web.pdf` — todas las pantallas

**Paleta:** granate `#4E0A0A` · bermellón `#A81E1E` · oro `#C9A24B` ·
crema `#F5EFE6` · jade `#2E7D6B` (solo para botones de acción)
