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

  // Validar código de invitación
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
      // Fallback demo local
      return new Promise(function(resolve, reject){
        var codigos = JSON.parse(localStorage.getItem('xuexi_demo_codes') || '["XUEXI2026", "MIEMBRO2026"]');
        var usados = JSON.parse(localStorage.getItem('xuexi_demo_codes_used') || '[]');
        if (codigos.indexOf(codigo) === -1) {
          reject(new Error("Código de invitación inválido. (Códigos demo válidos: XUEXI2026, MIEMBRO2026)"));
        } else if (usados.indexOf(codigo) !== -1) {
          reject(new Error("Este código de invitación ya ha sido utilizado."));
        } else {
          resolve({ codigo: codigo, creado: new Date() });
        }
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
          // Crear perfil de miembro
          batch.set(db.collection('miembros').doc(uid), {
            nombre: nombre,
            comision: comision || 'xuexi',
            email: email,
            rol: 'miembro',
            codigoUsado: codigo,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
          });
          // Marcar código como usado
          batch.update(db.collection('codigos_invitacion').doc(codigo), {
            usado: true,
            usadoPor: email,
            fechaUso: firebase.firestore.FieldValue.serverTimestamp()
          });
          return batch.commit();
        });
      } else {
        // Fallback demo local
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

  // Obtener calendario interno de miembros
  function obtenerCalendarioInterno() {
    if (firebaseReady && db) {
      return db.collection('calendario_interno').orderBy('fecha', 'asc').get().then(function(snap){
        var list = [];
        snap.forEach(function(doc){ list.push(Object.assign({ id: doc.id }, doc.data())); });
        return list;
      });
    } else {
      // Fallback demo local
      return new Promise(function(resolve){
        var demoEvents = JSON.parse(localStorage.getItem('xuexi_demo_calendar') || 'null');
        if (!demoEvents) {
          demoEvents = [
            {
              id: 'cal-1',
              titulo: 'Reunión General de Bienvenida a Miembros 2026',
              fecha: '2026-08-15',
              hora: '18:00',
              lugar: 'Sala A-12, Campus San Joaquín / Zoom',
              tipo: 'interna',
              comision: 'coordinacion',
              detalle: 'Primera asamblea general con nuevos integrantes. Presentación de líneas de trabajo y coordinación por comisiones.'
            },
            {
              id: 'cal-2',
              titulo: 'Taller Interno de Metodología de Investigación sobre China',
              fecha: '2026-08-22',
              hora: '17:30',
              lugar: 'Auditorio Facultad de Historia UC',
              tipo: 'capacitacion',
              comision: 'xuexi',
              detalle: 'Capacitación exclusiva para integrantes de la Comisión Xuexi sobre búsqueda en bases de datos académicas chinas (CNKI).'
            },
            {
              id: 'cal-3',
              titulo: 'Tándem de Idioma Mandarín Avanzado (Sesión Interna)',
              fecha: '2026-08-29',
              hora: '16:00',
              lugar: 'Patios de Humanidades CSJ',
              tipo: 'social',
              comision: 'wailian',
              detalle: 'Práctica conversacional para miembros del club previo al inicio de los talleres abiertos al público.'
            }
          ];
          localStorage.setItem('xuexi_demo_calendar', JSON.stringify(demoEvents));
        }
        resolve(demoEvents);
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
