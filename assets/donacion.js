/* Donaciones · Xuexi Club UC
 *
 * El formulario de donación de la portada. Donar no pide cuenta: el worker de
 * pagos atiende /donation sin token, y esta página solo le pasa lo que la
 * persona escribió. Si quien dona tiene sesión, su nombre y correo se
 * completan solos, nada más.
 *
 * Todo lo que se valida aquí se vuelve a validar en el worker (CONFIG.donation
 * en xuexi-mp). Aquí solo evita un viaje inútil; quien decide es el worker.
 */
(function(){
  'use strict';

  var WORKER = 'https://mp.xuexiclub.workers.dev';
  var MIN = 1000;
  var MAX = 20000;
  var MONTOS = [1000, 3000, 5000];
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var TELEFONO = /^\+?[\d\s().-]+$/;

  // Lo que el worker responde en inglés, dicho para quien dona. Lo que no
  // está aquí se muestra tal cual.
  var ERRORES = {
    'a name is required': 'Escribe tu nombre.',
    'name is too long': 'El nombre es demasiado largo.',
    'invalid email': 'Revisa el correo.',
    'email is too long': 'Revisa el correo.',
    'invalid phone': 'Revisa el teléfono.',
    'phone is too long': 'Revisa el teléfono.'
  };

  // Al volver de pagar, Mercado Pago agrega a la URL el estado del pago y el
  // external_reference. Si es una donación se lee una vez y se saca de la
  // URL, para que recargar no repita el aviso. Solo sirve para dar las
  // gracias: cualquiera puede escribir esa URL, así que no prueba nada.
  var MP_PARAMS = ['collection_id', 'collection_status', 'payment_id', 'status',
    'external_reference', 'payment_type', 'merchant_order_id', 'preference_id',
    'site_id', 'processing_mode', 'merchant_account_id'];

  function leerRetorno(){
    var q = new URLSearchParams(location.search);
    if ((q.get('external_reference') || '').indexOf('xuexi-don-') !== 0) return null;
    // Sin pagar, Mercado Pago manda status=null, como texto.
    var estado = q.get('status') || q.get('collection_status') || '';
    MP_PARAMS.forEach(function(k){ q.delete(k); });
    var resto = q.toString();
    history.replaceState(null, '', location.pathname + (resto ? '?' + resto : '') + location.hash);
    if (estado === 'approved') return { clase: 'al-dia',
      texto: 'Recibimos tu donación. Gracias por apoyar las actividades del club.' };
    if (estado === 'pending' || estado === 'in_process') return { clase: 'pendiente',
      texto: 'Mercado Pago está procesando tu donación. Te avisará por correo cuando se apruebe.' };
    if (estado === 'rejected' || estado === 'cancelled') return { clase: 'vencida',
      texto: 'Mercado Pago no aprobó el pago, así que no se cobró nada. Puedes intentarlo de nuevo.' };
    return null;
  }

  function clp(n){
    return '$' + Number(n).toLocaleString('es-CL');
  }

  function donar(datos){
    return fetch(WORKER + '/donation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    }).then(function(r){
      return r.text().then(function(txt){
        var cuerpo = {};
        try { cuerpo = txt ? JSON.parse(txt) : {}; } catch (e) {}
        if (r.status === 429) throw new Error('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
        if (!r.ok) throw new Error(ERRORES[cuerpo.error] || cuerpo.error || 'No se pudo contactar el sistema de pagos.');
        return cuerpo;
      });
    }, function(){
      throw new Error('No se pudo contactar el sistema de pagos. Revisa tu conexión.');
    });
  }

  function iniciar(){
    var card = document.getElementById('donation-card');
    if (!card) return;

    var nombre = document.getElementById('donation-name');
    var correo = document.getElementById('donation-email');
    var telefono = document.getElementById('donation-phone');
    var campoOtro = document.getElementById('donation-custom-field');
    var otro = document.getElementById('donation-custom');
    var boton = document.getElementById('donation-submit');
    var salida = document.getElementById('donation-result');
    var aviso = document.getElementById('donation-return');

    var retorno = leerRetorno();
    if (retorno) {
      card.className = card.className.replace(/\bpendiente\b/, retorno.clase);
      aviso.querySelector('b').textContent = retorno.texto;
      aviso.hidden = false;
      card.scrollIntoView({ block: 'center' });
    }

    function mensaje(msg, error){
      salida.textContent = msg || '';
      salida.className = 'pay-result' + (error ? ' pay-result-error' : '');
    }

    function elegido(){
      var el = card.querySelector('input[name="donation-amount"]:checked');
      return el ? el.value : String(MONTOS[0]);
    }

    // Devuelve el monto si es válido, o null. Solo pesos enteros dentro del
    // rango: lo de afuera se rechaza, no se ajusta en silencio.
    function montoValido(){
      var raw = elegido() === 'otro' ? otro.value.trim() : elegido();
      if (!/^\d+$/.test(raw)) return null;
      var n = Number(raw);
      return n >= MIN && n <= MAX ? n : null;
    }

    // El primer problema del formulario, con el campo que lo tiene; null si
    // no hay ninguno. completo: también lo que solo se avisa al enviar o al
    // salir del campo (el mínimo, porque escribir 2000 pasa por 2, 20 y 200).
    function problema(completo){
      var raw = otro.value.trim();
      if (elegido() === 'otro' && raw) {
        if (!/^\d+$/.test(raw)) return { campo: otro, msg: 'Ingresa un monto en pesos, sin puntos ni decimales.' };
        if (Number(raw) > MAX) return { campo: otro, msg: 'El monto máximo es ' + clp(MAX) + '.' };
      }
      if (!completo) return null;
      if (elegido() === 'otro' && !raw) return { campo: otro, msg: 'Ingresa un monto.' };
      if (montoValido() === null) return { campo: otro, msg: 'El monto mínimo es ' + clp(MIN) + '.' };
      if (!nombre.value.trim()) return { campo: nombre, msg: 'Escribe tu nombre.' };
      var c = correo.value.trim();
      if (c && !EMAIL.test(c)) return { campo: correo, msg: 'Revisa el correo.' };
      var t = telefono.value.trim();
      if (t && (!TELEFONO.test(t) || t.replace(/\D/g, '').length < 8))
        return { campo: telefono, msg: 'Revisa el teléfono.' };
      return null;
    }

    function actualizar(){
      // .pay-field fija display:flex, que le gana al atributo hidden.
      campoOtro.style.display = elegido() === 'otro' ? '' : 'none';
      var n = montoValido();
      boton.textContent = n === null ? 'Donar' : 'Donar ' + clp(n);
      var p = problema(false);
      mensaje(p && p.msg, Boolean(p));
    }

    [].forEach.call(card.querySelectorAll('input[name="donation-amount"]'), function(r){
      r.addEventListener('change', function(){
        actualizar();
        if (elegido() === 'otro') otro.focus();
      });
    });
    otro.addEventListener('input', actualizar);
    otro.addEventListener('blur', function(){
      var p = otro.value.trim() && montoValido() === null ? problema(true) : null;
      if (p && p.campo === otro) mensaje(p.msg, true);
    });

    boton.addEventListener('click', function(){
      var p = problema(true);
      if (p) { mensaje(p.msg, true); p.campo.focus(); return; }
      boton.disabled = true;
      mensaje('Preparando Mercado Pago…');
      donar({
        name: nombre.value.trim(),
        email: correo.value.trim(),
        phone: telefono.value.trim(),
        amount: montoValido()
      }).then(function(res){
        if (!res || !res.url) throw new Error('No se pudo contactar el sistema de pagos.');
        window.location.href = res.url;
      }).catch(function(e){
        boton.disabled = false;
        mensaje(e.message, true);
      });
    });

    actualizar();

    // Volver atrás desde Mercado Pago puede devolver la página tal como quedó
    // (bfcache): botón deshabilitado y "Preparando Mercado Pago…" para siempre.
    window.addEventListener('pageshow', function(e){
      if (!e.persisted) return;
      boton.disabled = false;
      actualizar();
    });

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
