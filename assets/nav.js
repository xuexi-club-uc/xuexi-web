(function(){
  var burger = document.querySelector('.nav-burger');
  var menu = document.getElementById('nav-menu');
  if (!burger || !menu) return;

  function cerrar(){
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('nav-open');
  }

  burger.addEventListener('click', function(){
    var abierto = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!abierto));
    menu.classList.toggle('nav-open', !abierto);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') cerrar();
  });

  // Cerrar el menú móvil al elegir un destino
  menu.addEventListener('click', function(e){
    if (e.target.closest('a') && window.matchMedia('(max-width: 880px)').matches) cerrar();
  });
})();
