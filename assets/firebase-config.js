/* Configuración de Firebase para Xuexi Club UC.
   Reemplaza los valores con las credenciales de tu proyecto en Firebase Console.
   https://console.firebase.google.com */
(function() {
  var firebaseConfig = {
    apiKey: "PEGAR_AQUI_API_KEY",
    authDomain: "xuexi-club-uc.firebaseapp.com",
    projectId: "xuexi-club-uc",
    storageBucket: "xuexi-club-uc.appspot.com",
    messagingSenderId: "PEGAR_AQUI_MESSAGING_SENDER_ID",
    appId: "PEGAR_AQUI_APP_ID"
  };

  // Inicializar Firebase si los SDKs están cargados y aún no se ha inicializado
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    // Si la API key aún no está configurada, usar mock local para pruebas de desarrollo
    if (firebaseConfig.apiKey === "PEGAR_AQUI_API_KEY") {
      console.warn("Firebase: utilizando credenciales de plantilla. Recuerda configurar tus claves en assets/firebase-config.js");
    } else {
      firebase.initializeApp(firebaseConfig);
    }
  }

  window.XUEXI_FIREBASE_CONFIG = firebaseConfig;
})();
