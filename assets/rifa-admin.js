/* Rifa · panel de coordinación · Xuexi Club UC
 *
 * Debajo de la rifa de la portada, solo para quien tiene rol 'admin'.
 * Esconderlo es solo para no estorbar: lo que protege es el worker, que
 * responde 403 a /rifa/admin y /rifa/admin/log sin ese rol.
 *
 * Muestra las compras con sus números y sus pagos, los problemas que el
 * worker encontró al revisar Mercado Pago, y el log. Permite corregir
 * (mover, liberar, venta manual, asignar). Nada se actualiza solo: el botón
 * Recargar lo relee todo. Cada cambio queda en el log con el correo de quien
 * lo hizo; esta página no guarda nada.
 */
(function(){
  'use strict';

  var WORKER = 'https://mp.xuexiclub.workers.dev';

  var ESTADOS = {
    reservado: ['Reservada', 'cuota-aviso'],
    pagado: ['Pagada', 'cuota-ok'],
    manual: ['Venta manual', 'cuota-ok'],
    expirada: ['Expirada', ''],
    fallida: ['Sin enlace de pago', 'cuota-mal']
  };

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  function hora(ms, conFecha){
    if (!ms) return '—';
    var d = new Date(ms);
    var h = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: conFecha ? undefined : '2-digit' });
    return conFecha ? d.toLocaleDateString('es-CL') + ' ' + h : h;
  }

  // Las negativas del worker vienen en inglés. Las que una corrección puede
  // provocar, en castellano; cualquier otra, tal cual.
  var ERRORES = [
    [/^already taken: (.+)$/, 'Ya tienen dueño: $1. Para reasignarlos, libéralos primero.'],
    [/^(\d+) is not taken$/, 'El $1 está libre: no hay compra que mover.'],
    [/^none of those numbers is taken$/, 'Ninguno de esos números está tomado.'],
    [/^numbers go from 1 to (\d+)$/, 'Los números van del 1 al $1.'],
    [/^pick at least one number$/, 'Escribe al menos un número.'],
    [/^repeated number$/, 'Hay un número repetido.'],
    [/^no such compra$|^compra required$/, 'Elige una compra.'],
    [/^a name is required$/, 'Si das correo o teléfono, escribe también un nombre.'],
    [/^invalid email$/, 'Revisa el correo.'],
    [/^invalid phone$/, 'Revisa el teléfono.']
  ];

  function traducir(msg){
    for (var i = 0; i < ERRORES.length; i++) {
      if (ERRORES[i][0].test(msg)) return msg.replace(ERRORES[i][0], ERRORES[i][1]);
    }
    return msg;
  }

  // "5, 7 9" -> [5, 7, 9]. Lo que no sea número se ignora; el worker valida.
  function numeros(texto){
    return (String(texto).match(/\d+/g) || []).map(Number);
  }

  function pedir(ruta, metodo, cuerpo){
    var actual = window.firebase && firebase.auth().currentUser;
    if (!actual) return Promise.reject(new Error('Necesitas iniciar sesión.'));
    return actual.getIdToken().then(function(token){
      var headers = { Authorization: 'Bearer ' + token };
      if (cuerpo) headers['Content-Type'] = 'application/json';
      return fetch(WORKER + ruta, {
        method: metodo || 'GET',
        headers: headers,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    }).then(function(r){
      return r.text().then(function(txt){
        var res = {};
        try { res = txt ? JSON.parse(txt) : {}; } catch (e) {}
        if (!r.ok) throw new Error(traducir(res.error || 'El worker respondió ' + r.status));
        return res;
      });
    });
  }

  function iniciar(){
    var host = document.getElementById('rifa-admin');
    if (!host) return;

    var resumen = document.getElementById('rifa-admin-resumen');
    var salida = document.getElementById('rifa-admin-msg');
    var tabla = document.getElementById('rifa-admin-compras');
    var filtroIn = document.getElementById('rifa-admin-filtro');
    var verExpiradas = document.getElementById('rifa-admin-expiradas');
    var selectCompra = document.getElementById('rifa-asignar-compra');
    var logBox = document.getElementById('rifa-admin-log');
    var grilla = document.getElementById('rifa-admin-grid');
    var detalle = document.getElementById('rifa-admin-detalle');
    var problemasBox = document.getElementById('rifa-admin-problemas');
    var actualizado = document.getElementById('rifa-admin-actualizado');

    var datos = null;   // la última respuesta de /rifa/admin
    var ultimo = null;  // el id del último registro del log que tenemos
    var activo = false;

    function mensaje(msg, error){
      salida.textContent = msg || '';
      salida.className = 'pay-result' + (error ? ' pay-result-error' : '');
    }

    function nombreDe(ref){
      var c = datos && datos.compras.filter(function(x){ return x.ref === ref; })[0];
      return c ? (c.nombre || 'Sin nombre') : '';
    }

    // Número -> la compra que lo tiene, según la última lectura.
    function porNumero(){
      var por = {};
      datos.compras.forEach(function(c){ c.numeros.forEach(function(n){ por[n] = c; }); });
      return por;
    }

    function describir(c){
      var e = ESTADOS[c.estado] || [c.estado];
      return (c.nombre || 'Sin nombre') + ' · ' + e[0] +
        ([c.email, c.telefono].filter(Boolean).length ? ' · ' + [c.email, c.telefono].filter(Boolean).join(' · ') : '');
    }

    // La grilla de coordinación: cada número con su estado. Al tocarlo se ve
    // quién lo tiene; las correcciones siguen siendo los formularios de arriba.
    function dibujarGrilla(){
      var por = porNumero();
      if (grilla.children.length !== datos.total) {
        grilla.innerHTML = '';
        for (var i = 1; i <= datos.total; i++) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'rifa-n';
          b.textContent = i;
          b.setAttribute('data-n', i);
          grilla.appendChild(b);
        }
      }
      for (var n = 1; n <= datos.total; n++) {
        var c = por[n];
        var cel = grilla.children[n - 1];
        cel.className = 'rifa-n' + (!c ? '' : c.estado === 'reservado' ? ' reservado' : ' vendido');
        var txt = n + ': ' + (c ? describir(c) : 'libre');
        cel.title = txt;
        cel.setAttribute('aria-label', txt);
      }
    }

    var PAGOS = { approved: 'aprobado', rejected: 'rechazado', devuelto: 'devuelto', cancelled: 'cancelado',
      pending: 'pendiente', in_process: 'en proceso', authorized: 'autorizado' };

    function dibujarProblemas(){
      var r = datos.revision || {};
      var aviso = r.error
        ? '<p class="coord-aviso coord-error">No se pudo revisar Mercado Pago: ' + esc(r.error) +
          '. Lo de abajo puede estar incompleto.</p>'
        : '';
      problemasBox.innerHTML = aviso + (datos.problemas.length
        ? '<ul class="rifa-admin-problemas">' + datos.problemas.map(function(p){
            return '<li><b>' + esc(p.texto) + '</b>' + (p.nombre ? ' · ' + esc(p.nombre) : '') +
              (p.pagos ? ' <span class="coord-sub">pago ' + esc(p.pagos.join(', ')) + '</span>' : '') +
              ' <span class="coord-sub">' + esc(p.compra) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="coord-ok">Sin problemas detectados.</p>');
    }

    function dibujarCompras(){
      dibujarGrilla();
      dibujarProblemas();
      var f = filtroIn.value.trim().toLowerCase();
      var vendidos = 0, reservados = 0;
      datos.compras.forEach(function(c){
        if (c.estado === 'reservado') reservados += c.numeros.length;
        else if (c.estado === 'pagado' || c.estado === 'manual') vendidos += c.numeros.length;
      });
      var libres = datos.total - datos.compras.reduce(function(t, c){ return t + c.numeros.length; }, 0);
      resumen.textContent = vendidos + ' vendidos · ' + reservados + ' reservados en pago · ' +
        libres + ' libres · ' + ('$' + (vendidos * datos.price).toLocaleString('es-CL')) + ' en números vendidos';

      var filas = datos.compras.filter(function(c){
        if (!verExpiradas.checked && !c.numeros.length && (c.estado === 'expirada' || c.estado === 'fallida')) return false;
        if (!f) return true;
        return [c.nombre, c.email, c.telefono, c.numeros.join(' '), c.ref,
          (c.pagos || []).map(function(p){ return p.id; }).join(' ')]
          .join(' ').toLowerCase().indexOf(f) !== -1;
      });
      tabla.innerHTML = filas.length ? '<table class="coord-tabla"><thead><tr>' +
        '<th>Números</th><th>Nombre</th><th>Contacto</th><th>Estado</th><th>Creada</th></tr></thead><tbody>' +
        filas.map(function(c){
          var e = ESTADOS[c.estado] || [c.estado, ''];
          return '<tr class="' + (c.numeros.length ? '' : 'coord-usado') + '">' +
            '<td>' + (c.numeros.length ? '<div class="rifa-admin-nums">' + c.numeros.map(function(n){ return '<b>' + n + '</b>'; }).join('') + '</div>' : '—') + '</td>' +
            '<td>' + esc(c.nombre || '—') + '</td>' +
            '<td>' + esc([c.email, c.telefono].filter(Boolean).join(' · ') || '—') + '</td>' +
            '<td><span class="' + e[1] + '">' + esc(e[0]) + '</span>' +
              (c.estado === 'reservado' && c.hasta ? '<br><span class="coord-sub">hasta ' + hora(c.hasta) + '</span>' : '') +
              (c.pagos || []).map(function(p){
                return '<br><span class="coord-sub">pago ' + esc(p.id) + ' · ' + esc(PAGOS[p.estado] || p.estado) + '</span>';
              }).join('') + '</td>' +
            '<td>' + hora(c.creado, true) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table>' : '<p class="coord-aviso">Sin compras que mostrar.</p>';

      // Para "asignar": cualquier compra, la elegida se conserva al redibujar.
      var antes = selectCompra.value;
      selectCompra.innerHTML = '<option value="">Elige una compra…</option>' + datos.compras.map(function(c){
        var e = ESTADOS[c.estado] || [c.estado];
        return '<option value="' + esc(c.ref) + '">' + esc((c.nombre || 'Sin nombre') + ' · ' + e[0] +
          (c.numeros.length ? ' · ' + c.numeros.join(', ') : '')) + '</option>';
      }).join('');
      selectCompra.value = antes;
    }

    function cargarCompras(){
      return pedir('/rifa/admin').then(function(res){
        datos = res;
        dibujarCompras();
      }).catch(function(e){
        tabla.innerHTML = '<p class="coord-aviso coord-error">No se pudieron leer las compras: ' + esc(e.message) + '</p>';
      });
    }

    function lineaLog(l){
      var nombre = nombreDe(l.compra);
      var li = document.createElement('li');
      li.innerHTML = '<span class="coord-sub">' + hora(l.en) + '</span> ' +
        '<b>' + esc(l.accion) + '</b>' +
        (l.numeros.length ? ' ' + esc(l.accion === 'movido' ? l.numeros.join(' → ') : l.numeros.join(', ')) : '') +
        (nombre ? ' · ' + esc(nombre) : '') +
        ' <span class="coord-sub">por ' + esc(l.quien) + '</span>';
      return li;
    }

    // Lo nuevo del log, arriba.
    function seguirLog(){
      return pedir('/rifa/admin/log' + (ultimo === null ? '' : '?after=' + ultimo)).then(function(res){
        ultimo = res.last;
        res.entries.forEach(function(l){ logBox.insertBefore(lineaLog(l), logBox.firstChild); });
        while (logBox.children.length > 200) logBox.removeChild(logBox.lastChild);
      }).catch(function(e){
        mensaje('No se pudo leer la actividad: ' + e.message, true);
      });
    }

    // Todo de nuevo: compras y problemas (que traen la revisión de Mercado
    // Pago), después el log (que usa las compras para los nombres) y la
    // grilla pública.
    function recargar(){
      actualizado.textContent = 'Cargando…';
      return cargarCompras().then(seguirLog).then(function(){
        if (window.XuexiRifa) window.XuexiRifa.recargar();
        actualizado.textContent = 'Actualizado a las ' + hora(Date.now());
      });
    }

    // Una corrección: se manda, se avisa, y se relee todo.
    function corregir(cuerpo, boton, confirmar){
      if (confirmar && !window.confirm(confirmar)) return;
      boton.disabled = true;
      mensaje('Guardando…');
      pedir('/rifa/admin', 'POST', cuerpo).then(function(res){
        mensaje('Listo.' + (res.numbers ? ' Números: ' + res.numbers.join(', ') + '.' : ''));
        return recargar();
      }).catch(function(e){
        mensaje(e.message, true);
      }).then(function(){ boton.disabled = false; });
    }

    function campo(id){ return document.getElementById(id); }

    campo('rifa-mover').addEventListener('click', function(){
      corregir({ accion: 'mover', de: Number(campo('rifa-mover-de').value), a: Number(campo('rifa-mover-a').value) }, this);
    });
    campo('rifa-liberar').addEventListener('click', function(){
      var ns = numeros(campo('rifa-liberar-nums').value);
      if (!ns.length) { mensaje('Escribe al menos un número.', true); return; }
      corregir({ accion: 'liberar', numbers: ns }, this,
        '¿Liberar ' + ns.join(', ') + '? Quien los tenga los pierde. Si alguien los está pagando ahora mismo, podrían venderse dos veces.');
    });
    campo('rifa-venta').addEventListener('click', function(){
      corregir({
        accion: 'venta',
        numbers: numeros(campo('rifa-venta-nums').value),
        name: campo('rifa-venta-nombre').value.trim(),
        email: campo('rifa-venta-email').value.trim(),
        phone: campo('rifa-venta-tel').value.trim()
      }, this);
    });
    campo('rifa-asignar').addEventListener('click', function(){
      corregir({ accion: 'asignar', compra: selectCompra.value, numbers: numeros(campo('rifa-asignar-nums').value) }, this);
    });
    grilla.addEventListener('click', function(e){
      var b = e.target.closest('.rifa-n');
      if (!b || !datos) return;
      var n = Number(b.getAttribute('data-n'));
      var c = porNumero()[n];
      detalle.textContent = c ? n + ' · ' + describir(c) : n + ' · Libre';
      // De paso, deja el número listo en "mover" o "asignar".
      if (c) campo('rifa-mover-de').value = n;
      else campo('rifa-asignar-nums').value = n;
    });
    filtroIn.addEventListener('input', function(){ if (datos) dibujarCompras(); });
    verExpiradas.addEventListener('change', function(){ if (datos) dibujarCompras(); });
    campo('rifa-admin-recargar').addEventListener('click', function(){
      var b = this;
      b.disabled = true;
      recargar().then(function(){ b.disabled = false; });
    });

    function encender(){
      if (activo) return;
      activo = true;
      host.hidden = false;
      recargar();
    }

    function apagar(){
      activo = false;
      host.hidden = true;
    }

    if (window.XuexiAuth && window.XuexiAuth.disponible()) {
      window.XuexiAuth.onAuth(function(user){
        if (user && user.rol === 'admin') encender();
        else apagar();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
