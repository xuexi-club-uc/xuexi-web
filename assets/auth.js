/* Módulo de Autenticación y Datos de Miembros · Xuexi Club UC */
(function(){
  'use strict';

  var db = null;
  var auth = null;
  var firebaseReady = false;

  function initFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      auth = firebase.auth();
      db = firebase.firestore();
      firebaseReady = true;
    }
  }

  // Inicializar al cargar
  initFirebase();

  // Helper para verificar estado de autenticación
  function onAuth(callback) {
    if (firebaseReady && auth) {
      return auth.onAuthStateChanged(callback);
    } else {
      // Fallback local/demo
      var localUser = localStorage.getItem('xuexi_member_session');
      if (localUser) {
        try { callback(JSON.parse(localUser)); }
        catch(e) { callback(null); }
      } else {
        callback(null);
      }
      return function(){};
    }
  }

  // Iniciar sesión
  function login(email, password) {
    if (firebaseReady && auth) {
      return auth.signInWithEmailAndPassword(email, password);
    } else {
      // Fallback demo local
      return new Promise(function(resolve, reject) {
        var demoMembers = JSON.parse(localStorage.getItem('xuexi_demo_members') || '[]');
        var user = demoMembers.find(function(m){ return m.email.toLowerCase() === email.toLowerCase(); });
        if (user && user.password === password) {
          localStorage.setItem('xuexi_member_session', JSON.stringify(user));
          resolve({ user: user });
        } else if (email === "admin@xuexiclub.cl" && password === "demo123") {
          var adminUser = { uid: "admin-demo", email: email, nombre: "Administrador Demo", rol: "admin" };
          localStorage.setItem('xuexi_member_session', JSON.stringify(adminUser));
          resolve({ user: adminUser });
        } else {
          reject(new Error("Correo o contraseña incorrectos (Modo Demo: usa admin@xuexiclub.cl / demo123 o tu código de registro)"));
        }
      });
    }
  }

  // Cerrar sesión
  function logout() {
    if (firebaseReady && auth) {
      return auth.signOut();
    } else {
      localStorage.removeItem('xuexi_member_session');
      return Promise.resolve();
    }
  }

  // Validar código de invitación (lee primero Firestore, si no data/invitaciones.json)
  function validarCodigo(codigo) {
    codigo = (codigo || '').trim().toUpperCase();
    if (!codigo) return Promise.reject(new Error("Ingresa un código de invitación."));

    if (firebaseReady && db) {
      return db.collection('codigos_invitacion').doc(codigo).get().then(function(doc){
        if (!doc.exists) throw new Error("El código de invitación no existe o es inválido.");
        var data = doc.data();
        if (data.usado) throw new Error("Este código de invitación ya fue utilizado.");
        return data;
      });
    } else {
      // Leer data/invitaciones.json gestionado desde Decap CMS
      return fetch('data/invitaciones.json', {cache:'no-cache'})
        .then(function(r){ return r.ok ? r.json() : {codigos:[]}; })
        .then(function(d){
          var codigos = d.codigos || [];
          var localUsados = JSON.parse(localStorage.getItem('xuexi_demo_codes_used') || '[]');

          var encontrado = codigos.find(function(c){
            return String(c.codigo || '').trim().toUpperCase() === codigo;
          });

          if (!encontrado) {
            // Chequear fallback local
            var fallback = ['XUEXI2026', 'MIEMBRO2026'];
            if (fallback.indexOf(codigo) !== -1 && localUsados.indexOf(codigo) === -1) {
              return { codigo: codigo };
            }
            throw new Error("El código de invitación no existe o es inválido.");
          }

          if (encontrado.usado || localUsados.indexOf(codigo) !== -1) {
            throw new Error("Este código de invitación es de un solo uso y ya fue utilizado anteriormente. Solicita un nuevo código a la coordinación.");
          }

          return encontrado;
        });
    }
  }

  // Registrar miembro con código
  function registrar(codigo, nombre, comision, email, password) {
    codigo = (codigo || '').trim().toUpperCase();
    return validarCodigo(codigo).then(function(){
      if (firebaseReady && auth && db) {
        return auth.createUserWithEmailAndPassword(email, password).then(function(cred){
          var uid = cred.user.uid;
          var batch = db.batch();
          batch.set(db.collection('miembros').doc(uid), {
            nombre: nombre,
            comision: comision || 'xuexi',
            email: email,
            rol: 'miembro',
            codigoUsado: codigo,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
          });
          batch.update(db.collection('codigos_invitacion').doc(codigo), {
            usado: true,
            usadoPor: email,
            fechaUso: firebase.firestore.FieldValue.serverTimestamp()
          });
          return batch.commit();
        });
      } else {
        return new Promise(function(resolve){
          var demoMembers = JSON.parse(localStorage.getItem('xuexi_demo_members') || '[]');
          var newUser = {
            uid: 'user-' + Date.now(),
            nombre: nombre,
            comision: comision || 'xuexi',
            email: email,
            password: password,
            rol: 'miembro',
            fechaRegistro: new Date().toISOString()
          };
          demoMembers.push(newUser);
          localStorage.setItem('xuexi_demo_members', JSON.stringify(demoMembers));

          var usados = JSON.parse(localStorage.getItem('xuexi_demo_codes_used') || '[]');
          usados.push(codigo);
          localStorage.setItem('xuexi_demo_codes_used', JSON.stringify(usados));

          localStorage.setItem('xuexi_member_session', JSON.stringify(newUser));
          resolve(newUser);
        });
      }
    });
  }

  // Obtener calendario interno de miembros (Firestore o data/calendario_interno.json)
  function obtenerCalendarioInterno() {
    if (firebaseReady && db) {
      return db.collection('calendario_interno').orderBy('fecha', 'asc').get().then(function(snap){
        var list = [];
        snap.forEach(function(doc){ list.push(Object.assign({ id: doc.id }, doc.data())); });
        return list;
      });
    } else {
      return fetch('data/calendario_interno.json', {cache:'no-cache'})
        .then(function(r){ return r.ok ? r.json() : {eventos:[]}; })
        .then(function(d){
          var evs = d.eventos || [];
          var extraLocal = JSON.parse(localStorage.getItem('xuexi_demo_calendar') || '[]');
          return evs.concat(extraLocal);
        });
    }
  }

  // Actualizar enlace en la barra de navegación dinámicamente
  function actualizarNav() {
    var nav = document.getElementById('nav-menu');
    if (!nav) return;
    
    // Evitar duplicados
    var itemCuenta = document.getElementById('nav-item-cuenta');
    if (!itemCuenta) {
      itemCuenta = document.createElement('li');
      itemCuenta.id = 'nav-item-cuenta';
      nav.appendChild(itemCuenta);
    }

    onAuth(function(user){
      if (user) {
        itemCuenta.innerHTML = '<a href="miembro.html" class="nav-member-link"><span class="zh">会员</span>Mi Portal</a>';
      } else {
        itemCuenta.innerHTML = '<a href="login.html"><span class="zh">登录</span>Acceso Miembros</a>';
      }
    });
  }

  // Exponer API global
  window.XuexiAuth = {
    onAuth: onAuth,
    login: login,
    logout: logout,
    validarCodigo: validarCodigo,
    registrar: registrar,
    obtenerCalendarioInterno: obtenerCalendarioInterno,
    actualizarNav: actualizarNav
  };

  document.addEventListener('DOMContentLoaded', function(){
    initFirebase();
    actualizarNav();
  });
})();
