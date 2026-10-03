/* Planilla de actividades de la Comisión Wailian · Xuexi Club UC
 *
 * Wailian planifica en una planilla de Google ("Wailian_Actividades_2026").
 * Este archivo la lee directamente, tal como la escriben (fechas a mano
 * incluidas), para que ninguna actividad haya que copiarla dos veces:
 *
 *   · la agenda pública (eventos.html) muestra solo las Confirmadas o
 *     Realizadas que tienen un día escrito;
 *   · el calendario interno (miembro.html) las muestra todas, también las
 *     que siguen por confirmar.
 *
 * Cómo conectarla y qué columnas se leen: data/LEEME-planilla.md
 */
(function(){
  'use strict';

  // Enlace de "Publicar en la Web" en formato CSV. Empieza con
  //   https://docs.google.com/spreadsheets/d/e/2PACX-
  // y termina en output=csv
  //
  // NUNCA el enlace de edición (…/spreadsheets/d/<id>/edit). Este repositorio
  // es público, y con ese enlace cualquiera podría modificar la planilla y, a
  // través de ella, la agenda del sitio.
  //
  // Vacío = el sitio funciona como antes, solo con eventos.json y Firestore.
  var URL_PLANILLA = '';

  // Si Google tarda más que esto, la página sigue sin la planilla.
  var ESPERA_MS = 6000;

  // Para probar en el computador sin publicar el enlace: en localhost se puede
  // guardar uno con  localStorage.setItem('xuexi-planilla', '<enlace>')
  // En el sitio publicado se ignora, para que nadie pueda armar un enlace que
  // muestre otra agenda bajo nuestro dominio.
  function enlace(){
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)){
      try {
        var prueba = localStorage.getItem('xuexi-planilla');
        if (prueba) return prueba;
      } catch (e) {}
    }
    return URL_PLANILLA;
  }

  // Minúsculas, sin tildes, con un solo espacio y guiones simples: así
  // "Descripción  breve" y "descripcion breve" son lo mismo, y "17:00–18:20"
  // se lee igual que "17:00-18:20".
  function plano(s){
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2013\u2014]/g, '-').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function dos(n){ return ('0' + n).slice(-2); }

  function slug(s){ return plano(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  // ─────────────────────────────── CSV ───────────────────────────────

  // Texto CSV → lista de filas. Respeta comillas, comas y saltos de línea
  // dentro de una celda (las notas de la planilla los tienen).
  function filasCSV(texto){
    texto = String(texto).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    var filas = [], fila = [], campo = '', comillas = false;
    for (var i = 0; i < texto.length; i++){
      var c = texto[i];
      if (comillas){
        if (c === '"'){
          if (texto[i+1] === '"'){ campo += '"'; i++; }
          else comillas = false;
        } else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ','){ fila.push(campo); campo = ''; }
      else if (c === '\n'){ fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += c;
    }
    if (campo !== '' || fila.length){ fila.push(campo); filas.push(fila); }
    return filas;
  }

  // Cada dato se busca por cómo empieza el encabezado, sin tildes ni
  // mayúsculas: "Fecha tentativa" o "Descripción breve" sirven tal cual.
  // Lo que no está en esta lista (Nº, Pendientes, Notas, Voluntarios) no se
  // lee: ni la agenda pública ni el calendario interno lo muestran.
  var COLUMNAS = {
    titulo:      ['actividad', 'titulo'],
    descripcion: ['descripcion'],
    fechaTexto:  ['fecha'],
    hora:        ['hora'],
    lugar:       ['lugar', 'sala'],
    colaborador: ['colaborador'],
    responsable: ['encargad', 'responsable'],
    estado:      ['estado'],
    formulario:  ['formulario'],
    tipo:        ['tipo'],
    hanzi:       ['hanzi'],
    imagen:      ['imagen']
  };

  function ubicarColumnas(cabecera){
    var pos = {};
    cabecera.forEach(function(h, i){
      var p = plano(h);
      Object.keys(COLUMNAS).forEach(function(campo){
        if (pos[campo] !== undefined) return;
        if (COLUMNAS[campo].some(function(pref){ return p.indexOf(pref) === 0; })) pos[campo] = i;
      });
    });
    return pos;
  }

  // ────────────────────────── Fechas y horas ──────────────────────────

  var MESES = {enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8,
               septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12};
  var RE_DIA_DE_MES = new RegExp('\\b(\\d{1,2})(?: ?(?:-|al|a|y) ?(\\d{1,2}))? de (' +
    Object.keys(MESES).join('|') + ')(?: (?:de|del) (\\d{4}))?');

  // Día ISO, o '' si no existe (un 31/09 escrito por error).
  function dia(a, m, d){
    a = +a; m = +m; d = +d;
    var f = new Date(a, m - 1, d);
    if (f.getFullYear() !== a || f.getMonth() !== m - 1 || f.getDate() !== d) return '';
    return a + '-' + dos(m) + '-' + dos(d);
  }

  function elAnio(a, base){
    if (!a) return base;
    return a.length === 2 ? 2000 + +a : +a;
  }

  // Año para las fechas escritas sin año ("23/10"): el que más se repite entre
  // las que sí lo traen. La planilla es de un año a la vez.
  function anioDePlanilla(textos){
    var cuenta = {};
    textos.forEach(function(t){
      var m, re = /\b\d{1,2}\/\d{1,2}\/(\d{4})\b|\bde (\d{4})\b/g;
      t = plano(t);
      while ((m = re.exec(t))){ var a = m[1] || m[2]; cuenta[a] = (cuenta[a] || 0) + 1; }
    });
    var mejor = Object.keys(cuenta).sort(function(a, b){ return cuenta[b] - cuenta[a]; })[0];
    return mejor ? +mejor : new Date().getFullYear();
  }

  // Interpreta lo que se escribe en "Fecha tentativa":
  //   "04/09/2026 17:00-18:20"   "23/10"   "21-28/10"   "Martes 20 de octubre"
  // Si solo dice la semana o el mes ("primera semana de noviembre"), la fecha
  // queda vacía y se conserva el texto: inventar un día se leería como una
  // fecha confirmada.
  function leerFecha(texto, base){
    var t = plano(texto), m, r = {fecha:'', fechaFin:''};

    if ((m = t.match(/(?:^|[^\d:\/])(\d{1,2}) ?(?:-|al|a) ?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))){
      var a = elAnio(m[4], base);
      r.fecha = dia(a, m[3], m[1]);
      r.fechaFin = dia(a, m[3], m[2]);
    } else if ((m = t.match(/(?:^|[^\d:\/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\d\/])/))){
      r.fecha = dia(elAnio(m[3], base), m[2], m[1]);
    } else if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))){
      r.fecha = dia(m[1], m[2], m[3]);
    } else if ((m = t.match(RE_DIA_DE_MES))){
      var a2 = elAnio(m[4], base), mes = MESES[m[3]];
      r.fecha = dia(a2, mes, m[1]);
      if (m[2]) r.fechaFin = dia(a2, mes, m[2]);
    }
    if (!r.fecha || r.fechaFin <= r.fecha) r.fechaFin = '';
    return r;
  }

  // ¿Dice algo más que el día y la hora? "21/10 CONFIRMAR 5 pm o 13:30" sí;
  // "Martes 20 de octubre" no.
  var RE_PALABRAS_DE_FECHA = new RegExp('\\b(' + Object.keys(MESES).join('|') +
    '|lunes|martes|miercoles|jueves|viernes|sabado|domingo|de|del|al|a|y|hrs?)\\b', 'g');

  function tieneComentario(texto){
    return /[a-z]/.test(plano(texto).replace(RE_PALABRAS_DE_FECHA, ''));
  }

  function hhmm(h, m){
    h = +h; m = +m;
    return (h < 24 && m < 60) ? dos(h) + ':' + dos(m) : '';
  }

  // "17:00-18:20" o "13:30 a 14:50". Si hay alternativas ("5 pm o 13:30") no
  // se elige ninguna: es justamente lo que falta confirmar.
  function leerHora(texto){
    var t = plano(texto), m, r = {hora:'', horaFin:''};
    if (/\d ?(?:pm|am|hrs?|h)? o \d/.test(t)) return r;
    if ((m = t.match(/\b(\d{1,2}):(\d{2}) ?(?:-|a|al|hasta) ?(\d{1,2}):(\d{2})/))){
      var fin = +m[3];
      // "13:30-2:50" es 14:50: nadie termina antes de empezar.
      if (fin < +m[1] && fin < 12) fin += 12;
      r.hora = hhmm(m[1], m[2]);
      r.horaFin = hhmm(fin, m[4]);
    } else if ((m = t.match(/\b(\d{1,2}):(\d{2})\b/))){
      r.hora = hhmm(m[1], m[2]);
    }
    if (!r.hora || r.horaFin <= r.hora) r.horaFin = '';
    return r;
  }

  // ───────────────────────── Estado, tipo, hanzi ─────────────────────────

  function leerEstado(s){
    var p = plano(s);
    if (/cancel|suspend|descart/.test(p)) return 'cancelada';
    if (/^realizad/.test(p)) return 'realizada';
    if (/^confirmad/.test(p)) return 'confirmada';
    return 'por-confirmar';
  }

  // Los tipos de la agenda pública (Estatutos, Art. 2.1). Si la planilla no
  // trae columna "Tipo", se deduce del título; si no se puede, queda sin tipo
  // y la actividad aparece igual en "Todo".
  var TIPOS = ['taller','charla','congreso','almuerzo','festival','stand','jornada','voluntariado'];

  function leerTipo(escrito, titulo){
    var p = plano(escrito);
    if (TIPOS.indexOf(p) !== -1) return p;
    var t = plano(titulo);
    if (/\b(taller|clase|curso)\b/.test(t)) return 'taller';
    if (/\b(charla|conversatorio|webinar|seminario)\b/.test(t)) return 'charla';
    if (/\b(festival|feria)\b/.test(t)) return 'festival';
    return '';
  }

  // Cada tarjeta de la agenda lleva un carácter. Si la planilla no trae
  // columna "Hanzi", se elige uno por el tema del título.
  var HANZI = [
    [/caligraf/, '书'], [/pintura/, '画'], [/\bcine|pelicula/, '影'], [/teatro/, '戏'],
    [/\bte\b/, '茶'], [/tai ?chi/, '太'], [/danza|\bleon\b/, '狮'],
    [/pasteles de luna|medio otono/, '月'], [/jiaozi|dumpling|wantan|cocina/, '食'],
    [/idioma|mandarin|lengua china/, '语'], [/taois/, '道'], [/budis|templo/, '佛'],
    [/negocio|empresa/, '商'], [/maquillaje|makeup|douyin/, '妆'], [/medicina|acupuntura/, '医']
  ];

  function adivinarHanzi(titulo){
    var t = plano(titulo);
    for (var i = 0; i < HANZI.length; i++) if (HANZI[i][0].test(t)) return HANZI[i][1];
    return '学';
  }

  // ───────────────────────────── Lectura ─────────────────────────────

  function leerFilas(filas){
    var inicio = -1, pos = null;
    // El encabezado no siempre es la primera fila: arriba suele haber avisos
    // ("FYI: Puede haber más de un encargado…").
    for (var i = 0; i < Math.min(filas.length, 10); i++){
      var p = ubicarColumnas(filas[i]);
      if (p.titulo !== undefined && p.fechaTexto !== undefined){ pos = p; inicio = i; break; }
    }
    if (!pos) throw new Error('no encontré las columnas "Actividad" y "Fecha"');

    var datos = filas.slice(inicio + 1);
    function celda(f, campo){
      return pos[campo] === undefined ? '' : String(f[pos[campo]] || '').replace(/\s+/g, ' ').trim();
    }
    var base = anioDePlanilla(datos.map(function(f){ return celda(f, 'fechaTexto'); }));

    return datos.map(function(f){
      var titulo = celda(f, 'titulo');
      if (!titulo) return null;
      var fechaTexto = celda(f, 'fechaTexto');
      var cuando = leerFecha(fechaTexto, base);
      // Una columna "Hora" manda; si no hay, se busca la hora en la fecha.
      var horas = celda(f, 'hora') ? leerHora(celda(f, 'hora')) : leerHora(fechaTexto);
      var colaborador = celda(f, 'colaborador');
      var imagen = celda(f, 'imagen');
      return {
        id: slug(titulo) + (cuando.fecha ? '-' + cuando.fecha : ''),
        titulo: titulo,
        descripcion: celda(f, 'descripcion'),
        fecha: cuando.fecha,
        fechaFin: cuando.fechaFin,
        fechaTexto: fechaTexto,
        hora: horas.hora,
        horaFin: horas.horaFin,
        lugar: celda(f, 'lugar'),
        // "Interno" en esa columna significa que no hay colaborador externo.
        colaborador: /^intern/.test(plano(colaborador)) ? '' : colaborador,
        responsable: celda(f, 'responsable'),
        estado: leerEstado(celda(f, 'estado')),
        // "FORMULARIO Y POST: Realizado" = ya se abrió la inscripción.
        difundida: /^realizad/.test(plano(celda(f, 'formulario'))),
        tipo: leerTipo(celda(f, 'tipo'), titulo),
        hanzi: celda(f, 'hanzi').slice(0, 4) || adivinarHanzi(titulo),
        // Solo archivos de assets/, nunca imágenes de otros sitios: la planilla
        // la edita más gente que el repositorio.
        imagen: /^[\w.\/-]+$/.test(imagen) && imagen.indexOf('..') === -1 ? imagen : ''
      };
    }).filter(Boolean);
  }

  function conEspera(promesa, ms){
    return new Promise(function(ok, mal){
      var t = setTimeout(function(){ mal(new Error('Google tardó más de ' + ms / 1000 + ' s')); }, ms);
      promesa.then(function(v){ clearTimeout(t); ok(v); }, function(e){ clearTimeout(t); mal(e); });
    });
  }

  // Una sola lectura por página, aunque la pidan la agenda y el panel a la vez.
  var lectura = null;

  function leer(){
    if (lectura) return lectura;
    var url = enlace();
    if (!url) return (lectura = Promise.reject(new Error('planilla sin configurar')));
    lectura = conEspera(
      fetch(url, {cache:'no-cache'}).then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }), ESPERA_MS)
      .then(function(txt){
        // Si la planilla deja de estar publicada, Google responde con una
        // página de inicio de sesión en vez del CSV.
        if (/^\s*</.test(txt)) throw new Error('Google devolvió una página, no el CSV');
        var acts = leerFilas(filasCSV(txt))
          .filter(function(a){ return a.estado !== 'cancelada'; });
        if (!acts.length) throw new Error('la planilla no tiene actividades');
        return acts;
      });
    return lectura;
  }

  // ───────────────────── Lo que ve cada calendario ─────────────────────

  // La frontera entre la planificación interna y lo que ve cualquiera. Solo
  // pasan las Confirmadas o Realizadas con un día escrito, y solo con estos
  // campos: nunca encargados, voluntarios, pendientes ni notas.
  function esPublica(a){
    return (a.estado === 'confirmada' || a.estado === 'realizada') && !!a.fecha;
  }

  function comoEventoPublico(a){
    var detalle = a.descripcion;
    if (detalle && !/[.!?]$/.test(detalle)) detalle += '.';
    if (a.colaborador) detalle += (detalle ? ' ' : '') + 'Con ' + a.colaborador + '.';
    return {
      id: a.id,
      titulo: a.titulo,
      fecha: a.fecha,
      hora: a.hora + (a.horaFin ? '–' + a.horaFin : ''),
      lugar: a.lugar,
      detalle: detalle,
      tipo: a.tipo,
      comision: 'wailian',
      estado: a.estado === 'realizada' ? 'realizado' : (a.difundida ? 'abierto' : 'pronto'),
      hanzi: a.hanzi,
      imagen: a.imagen,
      cupos: 0,
      origen: 'planilla'
    };
  }

  // Mismo formato que los documentos de calendario_interno en Firestore, para
  // que miembro.html los dibuje igual.
  function comoActividadInterna(a){
    return {
      titulo: a.titulo,
      fecha: a.fecha,
      fechaFin: a.fechaFin,
      fechaTexto: a.fechaTexto,
      fechaConComentario: tieneComentario(a.fechaTexto),
      hora: a.hora,
      horaFin: a.horaFin,
      lugar: a.lugar,
      tipo: a.tipo === 'taller' ? 'capacitacion' : 'social',
      detalle: a.descripcion,
      responsable: a.responsable,
      colaborador: a.colaborador,
      confirmada: a.estado !== 'por-confirmar',
      comision: 'wailian',
      origen: 'planilla'
    };
  }

  function comparable(t){ return plano(t).replace(/[^a-z0-9]/g, ''); }

  window.XuexiPlanilla = {
    configurada: function(){ return !!enlace(); },
    leer: leer,
    eventosPublicos: function(){
      return leer().then(function(a){ return a.filter(esPublica).map(comoEventoPublico); });
    },
    actividadesInternas: function(){
      return leer().then(function(a){ return a.map(comoActividadInterna); });
    },
    // Misma actividad si cae el mismo día y un título contiene al otro
    // ("Taller de caligrafía" y "Taller de caligrafía china").
    mismaActividad: function(a, b){
      if (!a.fecha || a.fecha !== b.fecha) return false;
      var x = comparable(a.titulo), y = comparable(b.titulo);
      return !!x && !!y && (x.indexOf(y) !== -1 || y.indexOf(x) !== -1);
    }
  };
})();
