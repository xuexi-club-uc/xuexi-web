/* Configuración de Firebase · Xuexi Club UC
 *
 * Estos valores son PÚBLICOS a propósito. A diferencia de una contraseña, la
 * clave web de Firebase está pensada para viajar dentro de la página: sirve
 * para identificar el proyecto, no para autorizar nada.
 *
 * Lo que realmente protege los datos son las reglas de Firestore
 * (ver firestore.rules) y la configuración de Firebase Authentication.
 * Por eso publicar este archivo no es un riesgo, pero dejar las reglas
 * abiertas sí lo sería.
 *
 * PARA COMPLETARLO:
 *   Firebase Console > Configuración del proyecto > Tus apps > App web
 *   Copia los valores que faltan y reemplázalos abajo.
 */
(function() {
  var firebaseConfig = {
    apiKey: "FALTA_API_KEY",
    authDomain: "xuexiclub-webpage.firebaseapp.com",
    projectId: "xuexiclub-webpage",
    storageBucket: "FALTA_STORAGE_BUCKET",
    messagingSenderId: "FALTA_MESSAGING_SENDER_ID",
    appId: "FALTA_APP_ID"
  };

  var incompleta = Object.keys(firebaseConfig).some(function(k){
    return String(firebaseConfig[k]).indexOf('FALTA_') === 0;
  });

  if (incompleta) {
    // Sin configuración no se inicializa nada: el acceso de miembros queda
    // cerrado en vez de caer a un modo inseguro.
    console.warn('Firebase sin configurar: el acceso de miembros está desactivado. ' +
                 'Completa assets/firebase-config.js');
  } else if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  window.XUEXI_FIREBASE_CONFIG = firebaseConfig;
})();
