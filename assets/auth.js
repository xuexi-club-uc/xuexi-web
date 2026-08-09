/* Autenticación y datos de miembros · Xuexi Club UC
 *
 * PRINCIPIO: este módulo falla cerrado.
 *
 * El sitio es estático y no tiene servidor propio, así que no puede verificar
 * nada por sí mismo. Toda la seguridad real la aporta Firebase: la identidad
 * (Firebase Auth) y las reglas de acceso a los datos (Firestore Rules).
 *
 * Si Firebase no está configurado, NO hay acceso de miembros. No existe un
 * "modo demo": guardar contraseñas en el navegador o aceptar códigos escritos
 * en el código fuente daría una falsa sensación de seguridad, porque cualquiera
 * puede leer estos archivos.
 *
 * Los códigos de invitación viven SOLO en Firestore, nunca en el repositorio:
 * todo lo que está aquí es público.
 */
(function(){
  'use strict';

  var db = null;
  var auth = null;
  var listo = false;

  var SIN_CONFIGURAR = 'El acceso de miembros todavía no está habilitado. ' +
    'Escríbenos por Instagram (@xuexiclub.uc) y te ayudamos.';

  function iniciar(){
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return false;
    try {
      auth = firebase.auth();
      db = firebase.firestore();
      listo = true;
    } catch (e) {
      listo = false;
    }
    return listo;
  }

  iniciar();

  function noDisponible(){
    return Promise.reject(new Error(SIN_CONFIGURAR));
  }

  // ─────────────────────────── Sesión ───────────────────────────

  function onAuth(callback){
    if (!listo && !iniciar()){ callback(null); return function(){}; }
    return auth.onAuthStateChanged(function(user){
      if (!user){ callback(null); return; }
      // Adjuntamos el perfil del miembro (nombre, comisión, rol) al usuario.
      db.collection('miembros').doc(user.uid).get()
        .then(function(doc){
          var perfil = doc.exists ? doc.data() : {};
          callback({
            uid: user.uid,
            email: user.email,
            nombre: perfil.nombre || user.email,
            comision: perfil.comision || '',
            rol: perfil.rol || 'miembro',
            estadoPago: perfil.estadoPago || 'pendiente',
            ultimoPago: perfil.ultimoPago || null
          });
        })
        .catch(function(){ callback({ uid: user.uid, email: user.email, rol: 'miembro' }); });
    });
  }

  function login(email, password){
    if (!listo && !iniciar()) return noDisponible();
    return auth.signInWithEmailAndPassword(email, password);
  }

  function logout(){
    if (!listo && !iniciar()) return Promise.resolve();
    return auth.signOut();
  }

  // ──────────────────── Códigos de invitación ────────────────────

  function normalizar(codigo){
    return String(codigo || '').trim().toUpperCase();
  }

  function validarCodigo(codigo){
    codigo = normalizar(codigo);
    if (!codigo) return Promise.reject(new Error('Ingresa un código de invitación.'));
    if (!listo && !iniciar()) return noDisponible();

    return db.collection('codigos_invitacion').doc(codigo).get().then(function(doc){
      if (!doc.exists) throw new Error('El código de invitación no existe o es inválido.');
      if (doc.data().usado){
        throw new Error('Este código ya fue utilizado. Pide uno nuevo a la coordinación.');
      }
      return doc.data();
    });
  }

  // ───────────────────────── Registro ─────────────────────────

  function registrar(codigo, nombre, comision, email, password){
    codigo = normalizar(codigo);
    if (!listo && !iniciar()) return noDisponible();

    return validarCodigo(codigo)
      .then(function(){ return auth.createUserWithEmailAndPassword(email, password); })
      .then(function(cred){
        var uid = cred.user.uid;
        var refCodigo = db.collection('codigos_invitacion').doc(codigo);
        var refMiembro = db.collection('miembros').doc(uid);

        // Transacción: si dos personas usan el mismo código a la vez, solo una
        // lo consigue. Comprobar y marcar por separado no daría esa garantía.
        return db.runTransaction(function(tx){
          return tx.get(refCodigo).then(function(doc){
            if (!doc.exists) throw new Error('El código de invitación ya no existe.');
            if (doc.data().usado) throw new Error('Ese código acaba de ser utilizado por otra persona.');

            tx.set(refMiembro, {
              nombre: nombre,
              comision: comision || 'xuexi',
              email: email,
              rol: 'miembro',
              estadoPago: 'pendiente',
              codigoUsado: codigo,
              fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
            tx.update(refCodigo, {
              usado: true,
              usadoPor: uid,
              fechaUso: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        }).catch(function(err){
          // La cuenta quedó creada pero el código no se pudo reclamar: la
          // borramos para no dejar usuarios sin perfil dando vueltas.
          return cred.user.delete()
            .catch(function(){})
            .then(function(){ throw err; });
        });
      });
  }

  // ─────────────────────── Datos del portal ───────────────────────

  // El calendario vive SOLO en Firestore. Antes existía una copia en
  // data/calendario_interno.json, pero ese archivo se servía públicamente:
  // de "interno" tenía únicamente el nombre.
  function obtenerCalendarioInterno(){
    if (!listo && !iniciar()) return Promise.resolve([]);
    return db.collection('calendario_interno').orderBy('fecha', 'asc').get()
      .then(function(snap){
        var lista = [];
        snap.forEach(function(doc){
          var e = doc.data(); e.id = doc.id; lista.push(e);
        });
        return lista;
      })
      .catch(function(){ return []; });
  }

  function obtenerConfigMembresia(){
    return fetch('data/membresias.json', {cache:'no-cache'})
      .then(function(r){ return r.ok ? r.json() : {}; })
      .catch(function(){ return {}; });
  }

  // El estado de pago NO se puede cambiar desde el navegador: lo confirma la
  // coordinación. Si alguien pudiera marcarse "al día" solo, no significaría
  // nada. Las reglas de Firestore también lo impiden del lado del servidor.

  // ──────────────────────── Enlace en el menú ────────────────────────

  function actualizarNav(){
    // La entrada ya viene escrita en el HTML de cada página, así que aparece
    // aunque el JavaScript tarde. Aquí solo cambia según haya sesión o no.
    var item = document.getElementById('nav-item-cuenta');
    if (!item) return;

    // La entrada se muestra siempre: es un enlace a login.html, que funciona en
    // cualquier página. Antes se ocultaba cuando Firebase no estaba iniciado,
    // pero el SDK solo se carga en login, registro y miembro — así que
    // desaparecía del resto del sitio.
    item.hidden = false;
    if (!listo && !iniciar()) return;

    onAuth(function(user){
      item.innerHTML = user
        ? '<a href="miembro.html" class="nav-member-link"><span class="zh">会员</span>Mi portal</a>'
        : '<a href="login.html"><span class="zh">登录</span>Miembros</a>';
    });
  }

  window.XuexiAuth = {
    disponible: function(){ return listo || iniciar(); },
    onAuth: onAuth,
    login: login,
    logout: logout,
    validarCodigo: validarCodigo,
    registrar: registrar,
    obtenerCalendarioInterno: obtenerCalendarioInterno,
    obtenerConfigMembresia: obtenerConfigMembresia,
    actualizarNav: actualizarNav
  };

  document.addEventListener('DOMContentLoaded', function(){
    iniciar();
    actualizarNav();
  });
})();
