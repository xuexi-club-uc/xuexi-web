/* Rifa · Xuexi Club UC
 *
 * La rifa de la portada. Comprar no pide cuenta: el worker de pagos atiende
 * /rifa sin token. GET /rifa dice qué números están tomados; POST /rifa
 * reserva los elegidos (todos o ninguno) y devuelve el enlace de Mercado Pago.
 *
 * Que dos personas no compren el mismo número lo asegura el worker, no esta
 * página: aquí la grilla puede estar vieja por unos segundos, y si alguien
 * se adelanta, el worker responde "already taken" y se elige de nuevo.
 * Si quien compra tiene sesión, su nombre y correo se completan solos.
 */
(function(){
  'use strict';

  var WORKER = 'https://mp.xuexiclub.workers.dev';
  var REFRESCO_MS = 15000; // con la grilla abierta
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var TELEFONO = /^\+?[\d\s().-]+$/;

  // Lo que el worker responde en inglés, dicho para quien compra. "already
  // taken" se trata aparte. Lo que no está aquí se muestra tal cual.
  var ERRORES = {
    'a name is required': 'Escribe tu nombre.',
    'name is too long': 'El nombre es demasiado largo.',
    'invalid email': 'Revisa el correo.',
    'email is too long': 'Revisa el correo.',
    'invalid phone': 'Revisa el teléfono.',
    'phone is too long': 'Revisa el teléfono.',
    'an email or phone is required': 'Escribe un correo o un teléfono, para avisarte si ganas.',
    'pick at least one number': 'Elige al menos un número.'
  };

  // Al volver de pagar, Mercado Pago agrega a la URL el estado del pago y el
  // external_reference. Se lee una vez y se saca de la URL, para que recargar
  // no repita el aviso. Solo sirve para avisar: cualquiera puede escribir esa
  // URL. Los números vienen de sessionStorage, guardados antes de ir a pagar.
  var MP_PARAMS = ['collection_id', 'collection_status', 'payment_id', 'status',
    'external_reference', 'payment_type', 'merchant_order_id', 'preference_id',
    'site_id', 'processing_mode', 'merchant_account_id'];
  var GUARDADOS = 'xuexi_rifa_numeros';

  function leerRetorno(){
    var q = new URLSearchParams(location.search);
    if ((q.get('external_reference') || '').indexOf('xuexi-rifa-') !== 0) return null;
    // Sin pagar, Mercado Pago manda status=null, como texto.
    var estado = q.get('status') || q.get('collection_status') || '';
    MP_PARAMS.forEach(function(k){ q.delete(k); });
    var resto = q.toString();
    history.replaceState(null, '', location.pathname + (resto ? '?' + resto : '') + location.hash);
    var numeros = '';
    try { numeros = sessionStorage.getItem(GUARDADOS) || ''; } catch (e) {}
    var tuyos = numeros ? ' Tus números: ' + lista(numeros.split(',')) + '.' : '';
    if (estado === 'approved') return { clase: 'al-dia',
      texto: '¡Listo! Tu compra quedó pagada.' + tuyos + ' Te avisaremos si ganas.' };
    if (estado === 'pending' || estado === 'in_process') return { clase: 'pendiente',
      texto: 'Mercado Pago está procesando tu pago. Tus números quedan reservados mientras tanto.' + tuyos };
    if (estado === 'rejected' || estado === 'cancelled') return { clase: 'vencida',
      texto: 'Mercado Pago no aprobó el pago, así que no se cobró nada. Puedes intentarlo de nuevo.' };
    return null;
  }

  function clp(n){
    return '$' + Number(n).toLocaleString('es-CL');
  }

  // "7", "7 y 8", "7, 8 y 9".
  function lista(ns){
    ns = ns.map(String);
    return ns.length < 2 ? ns.join('') : ns.slice(0, -1).join(', ') + ' y ' + ns[ns.length - 1];
  }

  function pedir(metodo, cuerpo){
    return fetch(WORKER + '/rifa', {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function(r){
      return r.text().then(function(txt){
        var res = {};
        try { res = txt ? JSON.parse(txt) : {}; } catch (e) {}
        if (r.status === 429) throw new Error('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
        if (!r.ok) {
          var err = new Error(ERRORES[res.error] || res.error || 'No se pudo contactar el sistema de pagos.');
          var m = /^already taken: ([\d, ]+)$/.exec(res.error || '');
          if (m) err.tomados = m[1].split(',').map(Number);
          throw err;
        }
        return res;
      });
    }, function(){
      throw new Error('No se pudo contactar el sistema de pagos. Revisa tu conexión.');
    });
  }

  function iniciar(){
    var card = document.getElementById('rifa-card');
    if (!card) return;

    var nombre = document.getElementById('rifa-name');
    var correo = document.getElementById('rifa-email');
    var telefono = document.getElementById('rifa-phone');
    var elegidosBox = document.getElementById('rifa-elegidos');
    var abrir = document.getElementById('rifa-abrir');
    var comprar = document.getElementById('rifa-comprar');
    var salida = document.getElementById('rifa-result');
    var aviso = document.getElementById('rifa-return');
    var dialogo = document.getElementById('rifa-dialog');
    var grilla = document.getElementById('rifa-grid');
    var cuenta = document.getElementById('rifa-cuenta');
    var gridMsg = document.getElementById('rifa-grid-msg');

    var info = null;          // {total, price, max} de la última lectura
    var tomados = {};         // número -> true
    var elegidos = [];        // ordenados
    var celdas = [];          // botones de la grilla, por número
    var refresco = null;

    var retorno = leerRetorno();
    if (retorno) {
      card.className = card.className.replace(/\bpendiente\b/, retorno.clase);
      aviso.querySelector('b').textContent = retorno.texto;
      aviso.hidden = false;
      card.scrollIntoView({ block: 'center' });
    }

    function mensaje(el, msg, error){
      el.textContent = msg || '';
      el.className = 'pay-result' + (error ? ' pay-result-error' : '');
    }

    function construirGrilla(){
      grilla.innerHTML = '';
      celdas = [];
      for (var n = 1; n <= info.total; n++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rifa-n';
        b.textContent = n;
        b.setAttribute('data-n', n);
        celdas[n] = b;
        grilla.appendChild(b);
      }
    }

    // Todo lo que depende del estado: la grilla, el contador, los elegidos en
    // la tarjeta y el botón de compra.
    function dibujar(){
      if (!info) return;
      if (celdas.length !== info.total + 1) construirGrilla();
      for (var n = 1; n <= info.total; n++) {
        var tomado = Boolean(tomados[n]);
        var elegido = elegidos.indexOf(n) !== -1;
        celdas[n].disabled = tomado;
        celdas[n].setAttribute('aria-pressed', String(elegido));
        celdas[n].setAttribute('aria-label', n + (tomado ? ', tomado' : elegido ? ', elegido' : ', libre'));
      }
      var total = elegidos.length * info.price;
      cuenta.textContent = elegidos.length + ' de ' + info.max + ' · ' + clp(total);
      elegidosBox.innerHTML = elegidos.length
        ? elegidos.map(function(n){ return '<b>' + n + '</b>'; }).join('')
        : '<span>Aún no eliges números.</span>';
      comprar.textContent = elegidos.length
        ? 'Comprar ' + elegidos.length + (elegidos.length === 1 ? ' número' : ' números') + ' · ' + clp(total)
        : 'Comprar';
    }

    // Marca como tomados los que se adelantaron y los saca de lo elegido.
    // Devuelve los que se perdieron.
    function perder(ns){
      var perdidos = elegidos.filter(function(n){ return ns.indexOf(n) !== -1; });
      ns.forEach(function(n){ tomados[n] = true; });
      elegidos = elegidos.filter(function(n){ return !tomados[n]; });
      return perdidos;
    }

    function cargar(){
      return pedir('GET').then(function(res){
        info = { total: res.total, price: res.price, max: res.max };
        tomados = {};
        var perdidos = perder(res.taken || []);
        dibujar();
        if (perdidos.length) {
          var msg = perdidos.length === 1
            ? 'El ' + perdidos[0] + ' se acaba de tomar. Lo sacamos de tu selección.'
            : 'Los números ' + lista(perdidos) + ' se acaban de tomar. Los sacamos de tu selección.';
          mensaje(dialogo.open ? gridMsg : salida, msg, true);
        }
      }).catch(function(e){
        mensaje(dialogo.open ? gridMsg : salida, 'No se pudo cargar la rifa: ' + e.message, true);
      });
    }

    grilla.addEventListener('click', function(e){
      var b = e.target.closest('.rifa-n');
      if (!b || b.disabled) return;
      var n = Number(b.getAttribute('data-n'));
      var i = elegidos.indexOf(n);
      if (i !== -1) elegidos.splice(i, 1);
      else if (elegidos.length >= info.max) { mensaje(gridMsg, 'Puedes elegir hasta ' + info.max + ' números.', true); return; }
      else { elegidos.push(n); elegidos.sort(function(a, b){ return a - b; }); }
      mensaje(gridMsg, '');
      dibujar();
    });

    abrir.addEventListener('click', function(){
      mensaje(gridMsg, '');
      if (typeof dialogo.showModal === 'function') dialogo.showModal();
      else dialogo.setAttribute('open', '');
      cargar();
      clearInterval(refresco);
      refresco = setInterval(cargar, REFRESCO_MS);
    });
    dialogo.addEventListener('close', function(){
      clearInterval(refresco);
      mensaje(salida, '');
    });
    document.getElementById('rifa-listo').addEventListener('click', function(){ dialogo.close(); });
    document.getElementById('rifa-cerrar').addEventListener('click', function(){ dialogo.close(); });
    // Un clic fuera de la caja (en el fondo) también cierra.
    dialogo.addEventListener('click', function(e){ if (e.target === dialogo) dialogo.close(); });

    // El primer problema del formulario, con el campo que lo tiene.
    function problema(){
      if (!elegidos.length) return { campo: abrir, msg: 'Elige al menos un número.' };
      if (!nombre.value.trim()) return { campo: nombre, msg: 'Escribe tu nombre.' };
      var c = correo.value.trim();
      var t = telefono.value.trim();
      if (!c && !t) return { campo: correo, msg: 'Escribe un correo o un teléfono, para avisarte si ganas.' };
      if (c && !EMAIL.test(c)) return { campo: correo, msg: 'Revisa el correo.' };
      if (t && (!TELEFONO.test(t) || t.replace(/\D/g, '').length < 8))
        return { campo: telefono, msg: 'Revisa el teléfono.' };
      return null;
    }

    comprar.addEventListener('click', function(){
      var p = problema();
      if (p) { mensaje(salida, p.msg, true); p.campo.focus(); return; }
      comprar.disabled = true;
      mensaje(salida, 'Reservando tus números…');
      pedir('POST', {
        numbers: elegidos,
        name: nombre.value.trim(),
        email: correo.value.trim(),
        phone: telefono.value.trim()
      }).then(function(res){
        if (!res || !res.url) throw new Error('No se pudo contactar el sistema de pagos.');
        try { sessionStorage.setItem(GUARDADOS, (res.numbers || elegidos).join(',')); } catch (e) {}
        mensaje(salida, 'Abriendo Mercado Pago…');
        window.location.href = res.url;
      }).catch(function(e){
        comprar.disabled = false;
        if (e.tomados) {
          var perdidos = perder(e.tomados);
          dibujar();
          mensaje(salida, (perdidos.length === 1 ? 'El ' + perdidos[0] + ' se acaba de tomar.' :
            'Los números ' + lista(perdidos) + ' se acaban de tomar.') + ' Elige otro y vuelve a intentarlo.', true);
          return;
        }
        mensaje(salida, e.message, true);
      });
    });

    // Volver atrás desde Mercado Pago puede devolver la página tal como quedó
    // (bfcache): botón deshabilitado y "Abriendo Mercado Pago…" para siempre.
    // De paso se relee la grilla. Lo elegido ya quedó reservado por esa misma
    // compra, así que se suelta sin aviso: no es que alguien se adelantó.
    window.addEventListener('pageshow', function(e){
      if (!e.persisted) return;
      comprar.disabled = false;
      mensaje(salida, '');
      elegidos = [];
      cargar();
    });

    cargar();
    // Para el panel de coordinación (rifa-admin.js): tras una corrección, la
    // grilla pública se relee en vez de esperar al próximo refresco.
    window.XuexiRifa = { recargar: cargar };

    // Con sesión, el nombre y el correo vienen de la cuenta. Solo se llenan
    // los campos vacíos: lo que la persona ya escribió no se pisa.
    if (window.XuexiAuth && window.XuexiAuth.disponible()) {
      window.XuexiAuth.onAuth(function(user){
        if (!user) return;
        // Sin perfil, auth.js usa el correo como nombre; eso no es un nombre.
        if (!nombre.value && user.nombre && user.nombre !== user.email) nombre.value = user.nombre;
        if (!correo.value && user.email) correo.value = user.email;
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
